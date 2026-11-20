import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InventarioView } from "@/app/admin/inventario/inventario-view";
import type { AlertasResultado, MarcarVistaResultado } from "@/app/actions/alertas-inventario";
import type { InsumosResultado, MovimientoResultado } from "@/app/actions/inventario";
import { ContadorAlertas } from "@/components/inventario/contador-alertas";
import { PanelAlertas } from "@/components/inventario/panel-alertas";
import type { AlertaInsumo } from "@/lib/alertas-inventario";
import type { Insumo } from "@/lib/inventario";

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn(), push: vi.fn() },
  listarAlertas: vi.fn<() => Promise<AlertasResultado>>(),
  marcarAlertaVista: vi.fn<(id: number) => Promise<MarcarVistaResultado>>(),
  listarInsumos: vi.fn<(q?: string) => Promise<InsumosResultado>>(),
  registrarMovimiento: vi.fn<(id: number, valores: unknown) => Promise<MovimientoResultado>>(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/app/actions/alertas-inventario", () => ({
  listarAlertas: mocks.listarAlertas,
  marcarAlertaVista: mocks.marcarAlertaVista,
}));
vi.mock("@/app/actions/inventario", () => ({
  listarInsumos: mocks.listarInsumos,
  registrarMovimiento: mocks.registrarMovimiento,
  crearInsumo: vi.fn(),
  listarMovimientos: vi.fn(),
}));

const MASA: AlertaInsumo = {
  id: 9,
  insumoId: 6,
  insumo: "Masa de maíz",
  cantidad: 18,
  minimo: 20,
  unidad: "lb",
  estado: "ACTIVA",
  creadaEn: "2026-11-12T12:40:00-06:00",
};
const QUESO: AlertaInsumo = {
  ...MASA,
  id: 10,
  insumoId: 5,
  insumo: "Queso con loroco",
  cantidad: 9.5,
  minimo: 10,
  creadaEn: "2026-11-12T12:05:00-06:00",
};
const CREMA: AlertaInsumo = {
  ...MASA,
  id: 11,
  insumoId: 7,
  insumo: "Crema",
  cantidad: 1.5,
  minimo: 2,
  unidad: "l",
  estado: "VISTA",
  creadaEn: "2026-11-11T17:20:00-06:00",
};

function diferido<T>() {
  let resolver!: (valor: T) => void;
  const promesa = new Promise<T>((r) => {
    resolver = r;
  });
  return { promesa, resolver };
}

const contador = () => screen.getByRole("link", { name: /^Alertas de inventario/ });
const fila = (insumo: string) =>
  screen.getByRole("rowheader", { name: new RegExp(insumo) }).closest("tr")!;

beforeEach(() => {
  mocks.router.replace.mockReset();
  mocks.listarAlertas.mockReset();
  mocks.marcarAlertaVista.mockReset();
  mocks.listarInsumos.mockReset();
  mocks.registrarMovimiento.mockReset();
});

describe("contador de alertas en el menú (FE-15.1)", () => {
  it("con 0 alertas activas no muestra número", async () => {
    mocks.listarAlertas.mockResolvedValue({ alertas: [] });
    render(<ContadorAlertas />);

    expect(
      await screen.findByRole("link", { name: "Alertas de inventario, sin alertas activas" }),
    ).toHaveAttribute("href", "/admin/inventario/alertas");
    expect(contador()).not.toHaveTextContent(/\d/);
  });

  it("con varias activas muestra la cantidad", async () => {
    mocks.listarAlertas.mockResolvedValue({ alertas: [MASA, QUESO] });
    render(<ContadorAlertas />);

    expect(
      await screen.findByRole("link", { name: "Alertas de inventario, 2 alertas activas" }),
    ).toHaveTextContent("2");
  });

  it("con ACTIVAS y VISTAS cuenta solo las activas", async () => {
    mocks.listarAlertas.mockResolvedValue({ alertas: [MASA, CREMA] });
    render(<ContadorAlertas />);

    expect(
      await screen.findByRole("link", { name: "Alertas de inventario, 1 alerta activa" }),
    ).toHaveTextContent("1");
  });

  it("se actualiza cada 60 s y deja de consultar al salir de la vista", async () => {
    vi.useFakeTimers();
    mocks.listarAlertas.mockResolvedValue({ alertas: [MASA] });
    const { unmount } = render(<ContadorAlertas />);
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(contador()).toHaveTextContent("1");

    mocks.listarAlertas.mockResolvedValue({ alertas: [MASA, QUESO] });
    await act(() => vi.advanceTimersByTimeAsync(59_999));
    expect(mocks.listarAlertas).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(mocks.listarAlertas).toHaveBeenCalledTimes(2);
    expect(contador()).toHaveTextContent("2");

    unmount();
    await act(() => vi.advanceTimersByTimeAsync(180_000));
    expect(mocks.listarAlertas).toHaveBeenCalledTimes(2);
  });

  it("sin sesión se oculta y deja de consultar", async () => {
    vi.useFakeTimers();
    mocks.listarAlertas.mockResolvedValue({ sinSesion: true });
    render(<ContadorAlertas />);
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(screen.queryByRole("link", { name: /Alertas de inventario/ })).not.toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(120_000));
    expect(mocks.listarAlertas).toHaveBeenCalledTimes(1);
  });

  it("se refresca justo después de registrar un movimiento en el inventario", async () => {
    const queso: Insumo = { id: 5, nombre: "Queso con loroco", unidad: "lb", cantidad: 12.5, minimo: 10, estado: "NORMAL" };
    mocks.listarInsumos.mockResolvedValue({ insumos: [queso] });
    mocks.listarAlertas.mockResolvedValue({ alertas: [] });
    mocks.registrarMovimiento.mockResolvedValue({
      movimiento: { movimientoId: 88, cantidadAnterior: 12.5, cantidadActual: 9.5 },
    });
    render(
      <>
        <ContadorAlertas />
        <InventarioView />
      </>,
    );
    await screen.findByRole("link", { name: "Alertas de inventario, sin alertas activas" });
    await screen.findByRole("table", { name: "Insumos de la sucursal" });

    mocks.listarAlertas.mockResolvedValue({ alertas: [QUESO] });
    fireEvent.click(screen.getByRole("button", { name: "Registrar movimiento de Queso con loroco" }));
    const dialogo = await screen.findByRole("dialog", { name: "Registrar movimiento" });
    fireEvent.click(within(dialogo).getByRole("radio", { name: "Salida" }));
    fireEvent.change(within(dialogo).getByLabelText(/Cantidad/), { target: { value: "3" } });
    fireEvent.change(within(dialogo).getByLabelText(/Motivo/), { target: { value: "Uso en cocina" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Registrar" }));

    expect(
      await screen.findByRole("link", {
        hidden: true,
        name: "Alertas de inventario, 1 alerta activa",
      }),
    ).toBeInTheDocument();
    expect(mocks.listarAlertas).toHaveBeenCalledTimes(2);
  });
});

describe("panel de alertas (FE-15.1)", () => {
  it("muestra el esqueleto y luego insumo, cantidad, mínimo, unidad y fecha; activas en negrita", async () => {
    const respuesta = diferido<AlertasResultado>();
    mocks.listarAlertas.mockReturnValue(respuesta.promesa);
    render(<PanelAlertas />);
    expect(screen.getByRole("status", { name: "Cargando alertas" })).toBeInTheDocument();

    await act(async () => respuesta.resolver({ alertas: [CREMA, QUESO, MASA] }));

    expect(screen.getByText("2 alertas activas · se actualiza cada 60 s")).toBeInTheDocument();
    const filas = screen.getAllByRole("rowheader").map((c) => c.querySelector("span")?.textContent);
    expect(filas).toEqual(["Masa de maíz", "Queso con loroco", "Crema"]);

    const celdas = within(fila("Masa de maíz")).getAllByRole("cell");
    expect(celdas[0]).toHaveTextContent("18.00 lb");
    expect(celdas[1]).toHaveTextContent("20.00 lb");
    expect(celdas[2]).toHaveTextContent("Activa");
    expect(celdas[3]).toHaveTextContent("12/11/2026 12:40");
    expect(screen.getByRole("rowheader", { name: /Masa de maíz/ })).toHaveClass("font-bold");

    expect(within(fila("Crema")).getAllByRole("cell")[0]).toHaveTextContent("1.50 l");
    expect(screen.getByRole("rowheader", { name: /Crema/ })).toHaveClass("font-normal");
    expect(within(fila("Crema")).queryByRole("button", { name: /Marcar como vista/ })).not.toBeInTheDocument();
  });

  it("muestra el estado vacío", async () => {
    mocks.listarAlertas.mockResolvedValue({ alertas: [] });
    render(<PanelAlertas />);
    expect(await screen.findByText("No hay insumos por agotarse")).toBeInTheDocument();
  });

  it("muestra error con Reintentar y vuelve a cargar", async () => {
    mocks.listarAlertas
      .mockResolvedValueOnce({ error: "No pudimos cargar las alertas" })
      .mockResolvedValue({ alertas: [MASA] });
    render(<PanelAlertas />);

    expect(await screen.findByText("No pudimos cargar las alertas")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(screen.getByRole("status", { name: "Cargando alertas" })).toBeInTheDocument();
    expect(await screen.findByRole("rowheader", { name: /Masa de maíz/ })).toBeInTheDocument();
  });

  it("sin sesión va al login", async () => {
    mocks.listarAlertas.mockResolvedValue({ sinSesion: true });
    render(<PanelAlertas />);
    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith("/login"));
  });

  it("marcar como vista: deshabilita mientras envía, pasa a texto normal y baja el contador", async () => {
    mocks.listarAlertas.mockResolvedValue({ alertas: [MASA, QUESO] });
    const respuesta = diferido<MarcarVistaResultado>();
    mocks.marcarAlertaVista.mockReturnValue(respuesta.promesa);
    render(
      <>
        <ContadorAlertas />
        <PanelAlertas />
      </>,
    );
    await screen.findByRole("link", { name: "Alertas de inventario, 2 alertas activas" });

    fireEvent.click(screen.getByRole("button", { name: "Marcar como vista la alerta de Masa de maíz" }));
    const boton = screen.getByRole("button", { name: "Marcar como vista la alerta de Masa de maíz" });
    expect(boton).toBeDisabled();
    expect(boton).toHaveAttribute("aria-busy", "true");
    fireEvent.click(boton);
    expect(mocks.marcarAlertaVista).toHaveBeenCalledTimes(1);
    expect(mocks.marcarAlertaVista).toHaveBeenCalledWith(9);

    await act(async () => respuesta.resolver({ vista: true }));

    expect(screen.getByRole("rowheader", { name: /Masa de maíz/ })).toHaveClass("font-normal");
    expect(within(fila("Masa de maíz")).getAllByRole("cell")[2]).toHaveTextContent("Vista");
    expect(screen.queryByRole("button", { name: /Masa de maíz/ })).not.toBeInTheDocument();
    expect(contador()).toHaveAccessibleName("Alertas de inventario, 1 alerta activa");
    expect(screen.getByText("1 alerta activa · se actualiza cada 60 s")).toBeInTheDocument();
    expect(screen.getByText("Alerta marcada como vista")).toBeInTheDocument();
  });

  it("409 (ya resuelta): la quita de la lista sin mostrar error", async () => {
    mocks.listarAlertas.mockResolvedValue({ alertas: [MASA, QUESO] });
    mocks.marcarAlertaVista.mockResolvedValue({ resuelta: true });
    render(<PanelAlertas />);

    fireEvent.click(await screen.findByRole("button", { name: "Marcar como vista la alerta de Masa de maíz" }));

    await waitFor(() =>
      expect(screen.queryByRole("rowheader", { name: /Masa de maíz/ })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("rowheader", { name: /Queso con loroco/ })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
  });

  it("otro error: mensaje breve y el botón vuelve a habilitarse", async () => {
    mocks.listarAlertas.mockResolvedValue({ alertas: [MASA] });
    mocks.marcarAlertaVista.mockResolvedValue({ error: "No tienes permiso para realizar esta acción." });
    render(<PanelAlertas />);

    fireEvent.click(await screen.findByRole("button", { name: "Marcar como vista la alerta de Masa de maíz" }));

    expect(await screen.findByText("No tienes permiso para realizar esta acción.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Marcar como vista la alerta de Masa de maíz" })).toBeEnabled();
    expect(screen.getByRole("rowheader", { name: /Masa de maíz/ })).toHaveClass("font-bold");
  });

  it("Ver insumo abre la pantalla de inventario con ese insumo", async () => {
    mocks.listarAlertas.mockResolvedValue({ alertas: [MASA, CREMA] });
    render(<PanelAlertas />);

    expect(await screen.findByRole("link", { name: "Ver insumo Masa de maíz" })).toHaveAttribute(
      "href",
      "/admin/inventario?insumo=6",
    );
    expect(screen.getByRole("link", { name: "Ver insumo Crema" })).toHaveAttribute(
      "href",
      "/admin/inventario?insumo=7",
    );
  });

  it("los botones tienen área táctil de 44 px", async () => {
    mocks.listarAlertas.mockResolvedValue({ alertas: [MASA] });
    render(<PanelAlertas />);

    expect(await screen.findByRole("button", { name: /Marcar como vista/ })).toHaveClass("min-h-11");
    expect(screen.getByRole("link", { name: "Ver insumo Masa de maíz" })).toHaveClass("min-h-11");
  });
});

describe("enlace al insumo en la pantalla de inventario (FE-15.1)", () => {
  it("resalta el insumo de la alerta", async () => {
    const insumos: Insumo[] = [
      { id: 6, nombre: "Masa de maíz", unidad: "lb", cantidad: 18, minimo: 20, estado: "BAJO" },
      { id: 5, nombre: "Queso con loroco", unidad: "lb", cantidad: 12.5, minimo: 10, estado: "NORMAL" },
    ];
    mocks.listarInsumos.mockResolvedValue({ insumos });
    render(<InventarioView insumoResaltado={6} />);

    const resaltada = (await screen.findByRole("rowheader", { name: /Masa de maíz/ })).closest("tr");
    expect(resaltada).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("rowheader", { name: /Masa de maíz/ })).toHaveTextContent("(insumo de la alerta)");
    expect(screen.getByRole("rowheader", { name: /Queso con loroco/ }).closest("tr")).not.toHaveAttribute(
      "aria-current",
    );
  });
});
