import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InventarioView } from "@/app/admin/inventario/inventario-view";
import type {
  CrearInsumoResultado,
  HistorialResultado,
  InsumosResultado,
  MovimientoResultado,
} from "@/app/actions/inventario";
import type { Insumo, Movimiento } from "@/lib/inventario";

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn() },
  listarInsumos: vi.fn<(q?: string) => Promise<InsumosResultado>>(),
  crearInsumo: vi.fn<(valores: unknown) => Promise<CrearInsumoResultado>>(),
  registrarMovimiento: vi.fn<(id: number, valores: unknown) => Promise<MovimientoResultado>>(),
  listarMovimientos: vi.fn<(id: number, pagina?: number) => Promise<HistorialResultado>>(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("@/app/actions/inventario", () => ({
  listarInsumos: mocks.listarInsumos,
  crearInsumo: mocks.crearInsumo,
  registrarMovimiento: mocks.registrarMovimiento,
  listarMovimientos: mocks.listarMovimientos,
}));

const QUESO: Insumo = { id: 5, nombre: "Queso con loroco", unidad: "lb", cantidad: 12.5, minimo: 10, estado: "NORMAL" };
const MASA: Insumo = { id: 6, nombre: "Masa de maíz", unidad: "lb", cantidad: 18, minimo: 20, estado: "BAJO" };
const HUEVOS: Insumo = { id: 7, nombre: "Huevos", unidad: "unidad", cantidad: 90, minimo: 36, estado: "NORMAL" };
const INSUMOS = [QUESO, HUEVOS, MASA];

const MOVIMIENTOS: Movimiento[] = [
  { id: 2, fecha: "2026-11-12", hora: "12:40", usuario: "Luis Pérez", tipo: "SALIDA", cantidad: 3, motivo: "Uso en cocina" },
  { id: 1, fecha: "2026-11-11", hora: "08:30", usuario: null, tipo: "ENTRADA", cantidad: 15, motivo: "Compra a proveedor" },
];

function diferido<T>() {
  let resolver!: (valor: T) => void;
  const promesa = new Promise<T>((r) => {
    resolver = r;
  });
  return { promesa, resolver };
}

async function montar(insumos: Insumo[] = INSUMOS) {
  mocks.listarInsumos.mockResolvedValue({ insumos });
  render(<InventarioView sucursalNombre="Sucursal Centro" />);
  await screen.findByRole("table", { name: "Insumos de la sucursal" });
}

const filas = () =>
  within(screen.getByRole("table", { hidden: true }))
    .getAllByRole("rowheader", { hidden: true })
    .map((celda) => celda.querySelector("span")?.textContent);
const fila = (nombre: string) =>
  screen.getByRole("rowheader", { hidden: true, name: new RegExp(nombre) }).closest("tr")!;
const celdas = (nombre: string) => within(fila(nombre)).getAllByRole("cell", { hidden: true });
const dialogo = () => screen.getByRole("dialog");

function escribir(etiqueta: RegExp | string, valor: string) {
  fireEvent.change(within(dialogo()).getByLabelText(etiqueta), { target: { value: valor } });
}

beforeEach(() => {
  mocks.router.replace.mockReset();
  mocks.listarInsumos.mockReset();
  mocks.crearInsumo.mockReset();
  mocks.registrarMovimiento.mockReset();
  mocks.listarMovimientos.mockReset();
});

describe("inventario de insumos (FE-14.1)", () => {
  it("muestra el esqueleto mientras carga", async () => {
    const { promesa, resolver } = diferido<InsumosResultado>();
    mocks.listarInsumos.mockReturnValue(promesa);
    render(<InventarioView />);

    expect(screen.getByRole("status", { name: "Cargando inventario" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Insumos" })).toHaveAttribute("aria-busy", "true");

    await act(async () => resolver({ insumos: INSUMOS }));
    expect(screen.queryByRole("status", { name: "Cargando inventario" })).not.toBeInTheDocument();
  });

  it("lista nombre, unidad, cantidad, mínimo y estado, con los bajos primero", async () => {
    await montar();

    expect(screen.getByText("Sucursal Centro")).toBeInTheDocument();
    expect(filas()).toEqual(["Masa de maíz", "Queso con loroco", "Huevos"]);
    expect(celdas("Queso con loroco").map((c) => c.textContent)).toEqual(["lb", "12.50", "10.00", "Normal", ""]);
    expect(within(fila("Masa de maíz")).getAllByText("Bajo")[0]).toBeInTheDocument();
    expect(celdas("Huevos")[1]).toHaveTextContent("90");
    expect(mocks.listarInsumos).toHaveBeenCalledWith("");
  });

  it("muestra el estado vacío", async () => {
    mocks.listarInsumos.mockResolvedValue({ insumos: [] });
    render(<InventarioView />);

    expect(await screen.findByText("Aún no hay insumos")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("muestra error con Reintentar y vuelve a cargar", async () => {
    mocks.listarInsumos
      .mockResolvedValueOnce({ error: "No pudimos cargar el inventario" })
      .mockResolvedValue({ insumos: INSUMOS });
    render(<InventarioView />);

    expect(await screen.findByText("No pudimos cargar el inventario")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(screen.getByRole("status", { name: "Cargando inventario" })).toBeInTheDocument();

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(mocks.listarInsumos).toHaveBeenCalledTimes(2);
  });

  it("sin sesión al cargar: va al login", async () => {
    mocks.listarInsumos.mockResolvedValue({ sinSesion: true });
    render(<InventarioView />);
    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith("/login"));
  });

  it("busca mientras se escribe, esperando 300 ms desde la última tecla", async () => {
    vi.useFakeTimers();
    mocks.listarInsumos.mockResolvedValue({ insumos: INSUMOS });
    render(<InventarioView />);
    await act(() => vi.advanceTimersByTimeAsync(0));

    mocks.listarInsumos.mockResolvedValue({ insumos: [QUESO] });
    const buscador = screen.getByRole("searchbox", { name: "Buscar insumo por nombre" });
    fireEvent.change(buscador, { target: { value: "que" } });
    await act(() => vi.advanceTimersByTimeAsync(200));
    fireEvent.change(buscador, { target: { value: "queso" } });
    await act(() => vi.advanceTimersByTimeAsync(299));
    expect(mocks.listarInsumos).toHaveBeenCalledTimes(1);

    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(mocks.listarInsumos).toHaveBeenCalledTimes(2);
    expect(mocks.listarInsumos).toHaveBeenLastCalledWith("queso");
    expect(filas()).toEqual(["Queso con loroco"]);

    mocks.listarInsumos.mockResolvedValue({ insumos: [] });
    fireEvent.change(buscador, { target: { value: "zanahoria" } });
    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
    expect(screen.getByText("Ningún insumo coincide con «zanahoria».")).toBeInTheDocument();

    mocks.listarInsumos.mockResolvedValue({ insumos: INSUMOS });
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(buscador).toHaveValue("");
    expect(mocks.listarInsumos).toHaveBeenLastCalledWith("");
    expect(filas()).toHaveLength(3);
  });

  it("ignora la respuesta de una búsqueda anterior que llega tarde", async () => {
    vi.useFakeTimers();
    mocks.listarInsumos.mockResolvedValue({ insumos: INSUMOS });
    render(<InventarioView />);
    await act(() => vi.advanceTimersByTimeAsync(0));

    const lenta = diferido<InsumosResultado>();
    mocks.listarInsumos.mockReturnValueOnce(lenta.promesa).mockResolvedValueOnce({ insumos: [HUEVOS] });
    const buscador = screen.getByRole("searchbox", { name: "Buscar insumo por nombre" });
    fireEvent.change(buscador, { target: { value: "q" } });
    await act(() => vi.advanceTimersByTimeAsync(300));
    fireEvent.change(buscador, { target: { value: "hue" } });
    await act(() => vi.advanceTimersByTimeAsync(300));
    await act(async () => lenta.resolver({ insumos: [QUESO] }));

    expect(filas()).toEqual(["Huevos"]);
  });
});

describe("nuevo insumo (FE-14.1)", () => {
  async function abrirFormulario() {
    await montar();
    fireEvent.click(screen.getByRole("button", { name: "Nuevo insumo" }));
    return screen.findByRole("dialog", { name: "Nuevo insumo" });
  }

  function llenar() {
    escribir(/Nombre/, "Aceite");
    escribir(/Unidad/, "l");
    escribir(/Cantidad mínima/, "5");
  }

  it("valida localmente nombre, unidad y mínimo sin llamar al backend", async () => {
    await abrirFormulario();
    fireEvent.click(within(dialogo()).getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("El nombre del insumo es obligatorio.")).toBeInTheDocument();
    expect(screen.getByText("Selecciona una unidad: lb, kg, l o unidad.")).toBeInTheDocument();
    expect(screen.getByText("La cantidad mínima es obligatoria.")).toBeInTheDocument();
    expect(within(dialogo()).getByLabelText(/Nombre/)).toHaveAttribute("aria-invalid", "true");

    escribir(/Cantidad mínima/, "-2");
    fireEvent.click(within(dialogo()).getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("La cantidad mínima debe ser un número mayor o igual a 0.")).toBeInTheDocument();
    expect(within(dialogo()).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "lb, kg, l o unidad",
      "lb",
      "kg",
      "l",
      "unidad",
    ]);
    expect(mocks.crearInsumo).not.toHaveBeenCalled();
  });

  it("éxito: el insumo aparece en la tabla sin recargar", async () => {
    const respuesta = diferido<CrearInsumoResultado>();
    mocks.crearInsumo.mockReturnValue(respuesta.promesa);
    await abrirFormulario();
    llenar();
    fireEvent.click(within(dialogo()).getByRole("button", { name: "Guardar" }));

    expect(await within(dialogo()).findByRole("button", { name: "Guardando..." })).toBeDisabled();
    expect(mocks.crearInsumo).toHaveBeenCalledWith({ nombre: "Aceite", unidad: "l", minimo: "5" });

    await act(async () =>
      respuesta.resolver({
        insumo: { id: 9, nombre: "Aceite", unidad: "l", cantidad: 0, minimo: 5, estado: "BAJO" },
      }),
    );

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(filas()).toEqual(["Aceite", "Masa de maíz", "Queso con loroco", "Huevos"]);
    expect(screen.getByText("Insumo guardado correctamente")).toBeInTheDocument();
    expect(mocks.listarInsumos).toHaveBeenCalledTimes(1);
  });

  it("400: muestra el error junto al campo que indicó el servidor", async () => {
    mocks.crearInsumo.mockResolvedValue({ errores: { unidad: "La unidad no es válida" } });
    await abrirFormulario();
    llenar();
    fireEvent.click(within(dialogo()).getByRole("button", { name: "Guardar" }));

    expect(await within(dialogo()).findByText("La unidad no es válida")).toBeInTheDocument();
    expect(within(dialogo()).getByLabelText(/Unidad/)).toHaveAttribute("aria-invalid", "true");
    expect(within(dialogo()).getByRole("button", { name: "Guardar" })).toBeEnabled();
  });

  it("409: avisa que ya existe un insumo con ese nombre y no lo agrega", async () => {
    mocks.crearInsumo.mockResolvedValue({ errores: { nombre: "Ya existe un insumo con ese nombre en la sucursal" } });
    await abrirFormulario();
    llenar();
    fireEvent.click(within(dialogo()).getByRole("button", { name: "Guardar" }));

    expect(
      await within(dialogo()).findByText("Ya existe un insumo con ese nombre en la sucursal"),
    ).toBeInTheDocument();
    expect(within(dialogo()).getByLabelText(/Nombre/)).toHaveAttribute("aria-invalid", "true");
    expect(filas()).toHaveLength(3);
  });

  it("otros errores se muestran en el formulario", async () => {
    mocks.crearInsumo.mockResolvedValue({ error: "No tienes permiso para realizar esta acción." });
    await abrirFormulario();
    llenar();
    fireEvent.click(within(dialogo()).getByRole("button", { name: "Guardar" }));

    expect(await within(dialogo()).findByText("No tienes permiso para realizar esta acción.")).toBeInTheDocument();
  });
});

describe("registrar movimiento (FE-14.2)", () => {
  async function abrirMovimiento(nombre = "Queso con loroco", insumos = INSUMOS) {
    await montar(insumos);
    fireEvent.click(screen.getByRole("button", { name: `Registrar movimiento de ${nombre}` }));
    return screen.findByRole("dialog", { name: "Registrar movimiento" });
  }

  function llenar(cantidad = "3", motivo = "Uso en cocina") {
    fireEvent.click(within(dialogo()).getByRole("radio", { name: "Salida" }));
    escribir(/Cantidad/, cantidad);
    escribir(/Motivo/, motivo);
  }

  const registrar = () => fireEvent.click(within(dialogo()).getByRole("button", { name: /Registrar/ }));

  it("muestra la existencia actual y valida cantidad > 0 y motivo", async () => {
    await abrirMovimiento();
    expect(screen.getByText("Queso con loroco · existencia actual 12.50 lb")).toBeInTheDocument();
    expect(within(dialogo()).getByRole("radio", { name: "Entrada" })).toBeChecked();

    llenar("0", " ");
    registrar();

    expect(await within(dialogo()).findByText("Ingresa una cantidad mayor a 0.")).toBeInTheDocument();
    expect(within(dialogo()).getByText("El motivo es obligatorio.")).toBeInTheDocument();
    expect(mocks.registrarMovimiento).not.toHaveBeenCalled();
  });

  it("201: deshabilita mientras envía y actualiza cantidad, estado y orden sin recargar", async () => {
    const respuesta = diferido<MovimientoResultado>();
    mocks.registrarMovimiento.mockReturnValue(respuesta.promesa);
    await abrirMovimiento();
    llenar();
    registrar();

    const enviando = await within(dialogo()).findByRole("button", { name: "Registrando..." });
    expect(enviando).toBeDisabled();
    fireEvent.click(enviando);
    expect(mocks.registrarMovimiento).toHaveBeenCalledTimes(1);
    expect(mocks.registrarMovimiento).toHaveBeenCalledWith(5, {
      tipo: "SALIDA",
      cantidad: "3",
      motivo: "Uso en cocina",
    });

    await act(async () =>
      respuesta.resolver({ movimiento: { movimientoId: 88, cantidadAnterior: 12.5, cantidadActual: 9.5 } }),
    );

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("Movimiento registrado")).toBeInTheDocument();
    expect(celdas("Queso con loroco")[1]).toHaveTextContent("9.50");
    expect(celdas("Queso con loroco")[3]).toHaveTextContent("Bajo");
    expect(filas()).toEqual(["Masa de maíz", "Queso con loroco", "Huevos"]);
    expect(mocks.listarInsumos).toHaveBeenCalledTimes(1);
  });

  it("una entrada que supera el mínimo deja el insumo en Normal y lo mueve después de los bajos", async () => {
    mocks.registrarMovimiento.mockResolvedValue({
      movimiento: { movimientoId: 89, cantidadAnterior: 18, cantidadActual: 28 },
    });
    const aceite: Insumo = { id: 8, nombre: "Aceite", unidad: "l", cantidad: 2, minimo: 5, estado: "BAJO" };
    await abrirMovimiento("Masa de maíz", [...INSUMOS, aceite]);
    expect(filas()).toEqual(["Masa de maíz", "Aceite", "Queso con loroco", "Huevos"]);
    escribir(/Cantidad/, "10");
    escribir(/Motivo/, "Compra a proveedor");
    registrar();

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(celdas("Masa de maíz")[3]).toHaveTextContent("Normal");
    expect(filas()).toEqual(["Aceite", "Masa de maíz", "Queso con loroco", "Huevos"]);
  });

  it("422: la salida supera la existencia actual, con cantidad y unidad", async () => {
    mocks.registrarMovimiento.mockResolvedValue({ limiteExcedido: true });
    await abrirMovimiento();
    llenar("20");
    registrar();

    expect(
      await within(dialogo()).findByText("La salida supera la existencia actual (12.5 lb)."),
    ).toBeInTheDocument();
    expect(within(dialogo()).getByRole("button", { name: "Registrar" })).toBeEnabled();
    expect(celdas("Queso con loroco")[1]).toHaveTextContent("12.50");
  });

  it("422 en una entrada: supera la cantidad máxima permitida", async () => {
    mocks.registrarMovimiento.mockResolvedValue({ limiteExcedido: true });
    await abrirMovimiento();
    escribir(/Cantidad/, "999999999");
    escribir(/Motivo/, "Compra");
    registrar();

    expect(
      await within(dialogo()).findByText("La entrada supera la cantidad máxima permitida."),
    ).toBeInTheDocument();
  });

  it("400: pide una cantidad mayor a 0", async () => {
    mocks.registrarMovimiento.mockResolvedValue({ errores: { cantidad: "Ingresa una cantidad mayor a 0." } });
    await abrirMovimiento();
    llenar();
    registrar();

    expect(await within(dialogo()).findByText("Ingresa una cantidad mayor a 0.")).toBeInTheDocument();
    expect(within(dialogo()).getByLabelText(/Cantidad/)).toHaveAttribute("aria-invalid", "true");
  });

  it("error de red: mensaje breve y el botón vuelve a habilitarse", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.registrarMovimiento.mockRejectedValue(new TypeError("Failed to fetch"));
    await abrirMovimiento();
    llenar();
    registrar();

    expect(
      await within(dialogo()).findByText("No pudimos registrar el movimiento. Intenta de nuevo."),
    ).toBeInTheDocument();
    expect(within(dialogo()).getByRole("button", { name: "Registrar" })).toBeEnabled();
  });

  it("sin sesión al registrar: va al login", async () => {
    mocks.registrarMovimiento.mockResolvedValue({ sinSesion: true });
    await abrirMovimiento();
    llenar();
    registrar();
    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith("/login"));
  });
});

describe("historial de movimientos (FE-14.2)", () => {
  async function abrirHistorial() {
    await montar();
    fireEvent.click(screen.getByRole("button", { name: "Ver historial de Queso con loroco" }));
    return screen.findByRole("dialog", { name: "Historial" });
  }

  it("muestra fecha, hora, usuario, tipo, cantidad y motivo, del más reciente al más antiguo", async () => {
    mocks.listarMovimientos.mockResolvedValue({
      historial: { pagina: 1, totalPaginas: 1, total: 2, datos: MOVIMIENTOS },
    });
    await abrirHistorial();

    const lista = await screen.findByRole("list", { name: "Movimientos de Queso con loroco" });
    const items = within(lista).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("12/11/2026 · 12:40");
    expect(items[0]).toHaveTextContent("Salida");
    expect(items[0]).toHaveTextContent("−3.00 lb");
    expect(items[0]).toHaveTextContent("Uso en cocina");
    expect(items[0]).toHaveTextContent("Por Luis Pérez");
    expect(items[1]).toHaveTextContent("11/11/2026 · 08:30");
    expect(items[1]).toHaveTextContent("Entrada");
    expect(items[1]).toHaveTextContent("+15.00 lb");
    expect(items[1]).toHaveTextContent("Usuario no disponible");
    expect(screen.getByText("Queso con loroco · del más reciente al más antiguo")).toBeInTheDocument();
    expect(mocks.listarMovimientos).toHaveBeenCalledWith(5, 1);
  });

  it("muestra el indicador de carga y pagina", async () => {
    const primera = diferido<HistorialResultado>();
    mocks.listarMovimientos.mockReturnValueOnce(primera.promesa).mockResolvedValueOnce({
      historial: { pagina: 2, totalPaginas: 2, total: 3, datos: [{ ...MOVIMIENTOS[0], id: 3, motivo: "Merma" }] },
    });
    await abrirHistorial();

    expect(screen.getByRole("status", { name: "Cargando historial" })).toBeInTheDocument();
    await act(async () =>
      primera.resolver({ historial: { pagina: 1, totalPaginas: 2, total: 3, datos: MOVIMIENTOS } }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(await screen.findByText("Merma")).toBeInTheDocument();
    expect(mocks.listarMovimientos).toHaveBeenLastCalledWith(5, 2);
    expect(screen.getByRole("button", { name: "Página siguiente" })).toBeDisabled();
  });

  it("muestra Sin movimientos cuando no hay registros", async () => {
    mocks.listarMovimientos.mockResolvedValue({
      historial: { pagina: 1, totalPaginas: 0, total: 0, datos: [] },
    });
    await abrirHistorial();
    expect(await within(dialogo()).findByText("Sin movimientos")).toBeInTheDocument();
  });

  it("muestra el error con Reintentar", async () => {
    mocks.listarMovimientos
      .mockResolvedValueOnce({ error: "No pudimos cargar el historial" })
      .mockResolvedValue({ historial: { pagina: 1, totalPaginas: 1, total: 2, datos: MOVIMIENTOS } });
    await abrirHistorial();

    expect(await within(dialogo()).findByText("No pudimos cargar el historial")).toBeInTheDocument();
    fireEvent.click(within(dialogo()).getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("list", { name: "Movimientos de Queso con loroco" })).toBeInTheDocument();
    expect(mocks.listarMovimientos).toHaveBeenCalledTimes(2);
  });
});
