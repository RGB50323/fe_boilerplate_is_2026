import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import BeneficiosPage from "@/app/admin/beneficios/page";
import { BeneficiosView } from "@/app/admin/beneficios/beneficios-view";
import type { Resultado } from "@/lib/api";
import type { Beneficio, PlatilloBeneficio } from "@/lib/beneficios";
import type { Pagina } from "@/lib/paginacion";

const acciones = vi.hoisted(() => ({
  listarBeneficios: vi.fn(),
  obtenerBeneficio: vi.fn(),
  buscarPlatillosBeneficio: vi.fn(),
  guardarBeneficio: vi.fn(),
  deshabilitarBeneficio: vi.fn(),
}));
const { getUsuarioActual, redirect } = vi.hoisted(() => ({
  getUsuarioActual: vi.fn(),
  redirect: vi.fn((ruta: string) => {
    throw new Error(ruta);
  }),
}));
vi.mock("@/app/actions/beneficios", () => acciones);
vi.mock("@/lib/session", () => ({ getUsuarioActual }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/components/admin/panel-gerente", () => ({
  PanelGerente: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

const plato = {
  id: 15,
  nombre: "Hamburguesa clásica",
  descripcion: "Con salsa",
};
const otro = { id: 20, nombre: "Ensalada", descripcion: "Con vegetales" };
const vigente: Beneficio = {
  id: 9,
  platilloId: plato.id,
  nombre: plato.nombre,
  descripcion: plato.descripcion,
  platillo: plato,
  costoPuntos: 150,
  vigenteDesde: "2026-11-25",
  vigenteHasta: "2026-11-30",
  creadoEn: "2026-11-20T16:00:00.000Z",
  modificadoEn: null,
  deshabilitadoEn: null,
  estado: "VIGENTE",
};
const historico = {
  ...vigente,
  estado: "DESHABILITADO",
  deshabilitadoEn: "2026-11-29T12:00:00.000Z",
} satisfies Beneficio;
const sinPlatillo = {
  ...vigente,
  id: 8,
  estado: "SIN_PLATILLO",
  platilloId: null,
  platillo: null,
  nombre: null,
  descripcion: null,
} satisfies Beneficio;
const conflicto = {
  ok: false,
  estado: 409,
  error: "Este beneficio ya fue deshabilitado y no puede modificarse.",
};
const pagina = <T,>(
  datos: T[],
  numero = 1,
  totalPaginas = datos.length ? 1 : 0,
): Resultado<Pagina<T>> => ({
  ok: true,
  datos: { datos, pagina: numero, totalPaginas, total: datos.length },
});
const dialogo = () => within(screen.getByRole("dialog"));
const boton = (nombre: string) =>
  dialogo().getByRole("button", { name: nombre });
const campo = (nombre: RegExp) => dialogo().getByLabelText(nombre);

beforeEach(() => {
  vi.setSystemTime(new Date("2026-11-26T05:59:59Z"));
  vi.resetAllMocks();
  redirect.mockImplementation((ruta) => {
    throw new Error(ruta);
  });
  acciones.listarBeneficios.mockResolvedValue(pagina([vigente]));
  acciones.obtenerBeneficio.mockResolvedValue({ ok: true, datos: vigente });
  acciones.buscarPlatillosBeneficio.mockResolvedValue(pagina([plato]));
  acciones.guardarBeneficio.mockResolvedValue({ ok: true, datos: vigente });
  acciones.deshabilitarBeneficio.mockResolvedValue({
    ok: true,
    datos: historico,
  });
});

afterEach(() => vi.useRealTimers());

it("aplica los mínimos de alta y valida el orden incluso si se eluden los atributos HTML", async () => {
  render(<BeneficiosView inicial={pagina([])} />);
  fireEvent.click(screen.getByRole("button", { name: "Agregar beneficio" }));
  fireEvent.click(
    await dialogo().findByRole("button", { name: /Hamburguesa clásica/ }),
  );
  const inicio = campo(/Vigencia desde/);
  const fin = campo(/Vigencia hasta/);
  expect(inicio).toHaveAttribute("min", "2026-11-25");
  expect(fin).toHaveAttribute("min", "2026-11-25");
  fireEvent.change(campo(/Costo en puntos/), { target: { value: "150" } });
  fireEvent.change(inicio, { target: { value: "2026-11-24" } });
  fireEvent.change(fin, { target: { value: "2026-11-25" } });
  fireEvent.click(boton("Guardar beneficio"));
  expect(inicio).toHaveAccessibleDescription(
    /anterior al día actual de El Salvador/,
  );
  expect(acciones.guardarBeneficio).not.toHaveBeenCalled();
  fireEvent.change(inicio, { target: { value: "2026-11-27" } });
  expect(fin).toHaveAttribute("min", "2026-11-27");
  fireEvent.click(boton("Guardar beneficio"));
  expect(fin).toHaveAccessibleDescription(
    "La fecha final no puede ser anterior a la inicial.",
  );
  expect(acciones.guardarBeneficio).not.toHaveBeenCalled();
  fireEvent.change(fin, { target: { value: "2026-11-27" } });
  fireEvent.click(boton("Guardar beneficio"));
  await waitFor(() =>
    expect(acciones.guardarBeneficio).toHaveBeenCalledWith(
      expect.objectContaining({
        vigenteDesde: "2026-11-27",
        vigenteHasta: "2026-11-27",
      }),
      undefined,
    ),
  );
});

it("permite cambiar costo y platillo de un beneficio que inició en el pasado", async () => {
  const iniciado = { ...vigente, vigenteDesde: "2026-11-24" };
  acciones.obtenerBeneficio.mockResolvedValue({ ok: true, datos: iniciado });
  acciones.buscarPlatillosBeneficio.mockResolvedValue(pagina([otro]));
  render(<BeneficiosView inicial={pagina([iniciado])} />);
  fireEvent.click(screen.getByRole("button", { name: "Editar" }));
  fireEvent.click(await dialogo().findByRole("button", { name: "Ensalada" }));
  expect(campo(/Vigencia hasta/)).toHaveAttribute("min", "2026-11-24");
  fireEvent.change(campo(/Costo en puntos/), { target: { value: "200" } });
  fireEvent.click(boton("Guardar beneficio"));
  await waitFor(() =>
    expect(acciones.guardarBeneficio).toHaveBeenCalledWith(
      expect.objectContaining({
        platilloId: 20,
        costoPuntos: 200,
        vigenteDesde: "2026-11-24",
      }),
      9,
    ),
  );
});

it.each(["GERENTE", "GERENTE_GENERAL"])(
  "da acceso a %s a la misma página y acciones",
  async (rol) => {
    getUsuarioActual.mockResolvedValue({ estado: "ok", usuario: { rol } });
    render(await BeneficiosPage());
    expect(
      screen.getByRole("heading", { name: "Gestión de beneficios" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Agregar beneficio" }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: "Editar" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Deshabilitar" })).toBeEnabled();
  },
);

it("protege el acceso directo y evita consultar el catálogo sin autorización", async () => {
  getUsuarioActual
    .mockResolvedValueOnce({ estado: "sin-sesion" })
    .mockResolvedValueOnce({ estado: "ok", usuario: { rol: "MESERO" } })
    .mockResolvedValueOnce({ estado: "ok", usuario: { rol: "CLIENTE" } });
  await expect(BeneficiosPage()).rejects.toThrow("/login?next=");
  await expect(BeneficiosPage()).rejects.toThrow("/menu");
  await expect(BeneficiosPage()).rejects.toThrow("/menu");
  expect(acciones.listarBeneficios).not.toHaveBeenCalled();
});

it("filtra y pagina en el servidor, conserva los históricos y muestra el detalle de un platillo eliminado", async () => {
  acciones.listarBeneficios
    .mockResolvedValueOnce(pagina([historico], 1, 2))
    .mockResolvedValueOnce(pagina([{ ...historico, id: 10 }], 2, 2))
    .mockResolvedValueOnce(pagina([sinPlatillo]));
  acciones.obtenerBeneficio.mockResolvedValueOnce({
    ok: true,
    datos: sinPlatillo,
  });
  render(<BeneficiosView inicial={pagina([vigente])} />);
  fireEvent.change(screen.getByLabelText("Estado"), {
    target: { value: "DESHABILITADO" },
  });
  expect(screen.getByText("Cargando beneficios…")).toBeVisible();
  expect(await screen.findByText("Deshabilitado")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
  expect(await screen.findByText("10")).toBeVisible();
  expect(acciones.listarBeneficios.mock.calls).toEqual([
    [1, "DESHABILITADO"],
    [2, "DESHABILITADO"],
  ]);
  fireEvent.change(screen.getByLabelText("Estado"), {
    target: { value: "SIN_PLATILLO" },
  });
  expect(await screen.findByText("Platillo eliminado")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Ver detalle" }));
  expect(
    await screen.findByText(/Se conserva este registro por motivos históricos/),
  ).toBeVisible();
  expect(acciones.obtenerBeneficio).toHaveBeenCalledWith(8);
});

it("distingue catálogo vacío, filtro sin coincidencias y errores recuperables", async () => {
  acciones.listarBeneficios
    .mockResolvedValueOnce(pagina([]))
    .mockResolvedValueOnce({
      ok: false,
      error: "No se pudo conectar con el servidor.",
    })
    .mockResolvedValueOnce({
      ok: false,
      error: "No tienes permiso para realizar esta acción.",
    });
  render(<BeneficiosView inicial={pagina([])} />);
  expect(screen.getByText("No hay beneficios registrados.")).toBeVisible();
  fireEvent.change(screen.getByLabelText("Estado"), {
    target: { value: "VENCIDO" },
  });
  expect(
    await screen.findByText("No hay beneficios para este estado."),
  ).toBeVisible();
  fireEvent.change(screen.getByLabelText("Estado"), {
    target: { value: "PROGRAMADO" },
  });
  expect(
    await screen.findByText("No se pudo conectar con el servidor."),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  expect(
    await screen.findByText("No tienes permiso para realizar esta acción."),
  ).toBeVisible();
});

it("crea con días iguales, aplica búsqueda paginada y mantiene el platillo seleccionado", async () => {
  acciones.buscarPlatillosBeneficio
    .mockResolvedValueOnce(pagina([plato]))
    .mockResolvedValueOnce(pagina([otro], 1, 2))
    .mockResolvedValueOnce(
      pagina([{ ...otro, id: 40, nombre: "Ensalada de fruta" }], 2, 2),
    );
  render(<BeneficiosView inicial={pagina([])} />);
  fireEvent.click(screen.getByRole("button", { name: "Agregar beneficio" }));
  const sugerido = await dialogo().findByRole("button", {
    name: /Hamburguesa clásica/,
  });
  expect(sugerido).toHaveAttribute("aria-pressed", "false");
  fireEvent.click(sugerido);
  fireEvent.click(boton("Guardar beneficio"));
  expect(
    dialogo().getByText(
      "Ingresa una cantidad de puntos válida y mayor que cero.",
    ),
  ).toBeVisible();
  expect(
    dialogo().getByText("Ingresa una fecha de inicio válida."),
  ).toBeVisible();
  expect(acciones.guardarBeneficio).not.toHaveBeenCalled();
  fireEvent.change(campo(/Buscar platillos/), {
    target: { value: "Ensalada" },
  });
  const resultado = await dialogo().findByRole("button", { name: "Ensalada" });
  expect(resultado).toHaveAccessibleDescription("Con vegetales");
  fireEvent.click(boton("Página siguiente"));
  await dialogo().findByRole("button", { name: /Ensalada de fruta/ });
  expect(
    dialogo().getByText("Seleccionado: Hamburguesa clásica"),
  ).toBeVisible();
  expect(acciones.buscarPlatillosBeneficio).toHaveBeenLastCalledWith(
    2,
    "Ensalada",
  );
  fireEvent.change(campo(/Costo en puntos/), { target: { value: "150" } });
  fireEvent.change(campo(/Vigencia desde/), {
    target: { value: "2026-11-25" },
  });
  fireEvent.change(campo(/Vigencia hasta/), {
    target: { value: "2026-11-25" },
  });
  fireEvent.click(boton("Guardar beneficio"));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(acciones.guardarBeneficio).toHaveBeenCalledWith(
    {
      platilloId: 15,
      costoPuntos: 150,
      vigenteDesde: "2026-11-25",
      vigenteHasta: "2026-11-25",
    },
    undefined,
  );
  expect(acciones.listarBeneficios).toHaveBeenCalledWith(1, undefined);
  expect(await screen.findByText("Beneficio creado.")).toBeVisible();
});

it("descarta una respuesta obsoleta y muestra búsquedas sin coincidencias", async () => {
  let resolver!: (valor: Resultado<Pagina<PlatilloBeneficio>>) => void;
  const anterior = new Promise<Resultado<Pagina<PlatilloBeneficio>>>(
    (resolve) => {
      resolver = resolve;
    },
  );
  acciones.buscarPlatillosBeneficio
    .mockReturnValueOnce(anterior)
    .mockResolvedValueOnce(pagina([]));
  render(<BeneficiosView inicial={pagina([])} />);
  fireEvent.click(screen.getByRole("button", { name: "Agregar beneficio" }));
  await waitFor(() =>
    expect(acciones.buscarPlatillosBeneficio).toHaveBeenCalledWith(1, ""),
  );
  fireEvent.change(campo(/Buscar platillos/), {
    target: { value: "Sin coincidencia" },
  });
  expect(
    await dialogo().findByText("No hay platillos que coincidan."),
  ).toBeVisible();
  await act(async () => resolver(pagina([plato])));
  expect(
    dialogo().queryByRole("button", { name: /Hamburguesa clásica/ }),
  ).toBeNull();
});

it.each(["VIGENTE", "VENCIDO"] as const)(
  "edita un beneficio %s usando el detalle actualizado",
  async (estado) => {
    const elemento = { ...vigente, estado };
    acciones.obtenerBeneficio.mockResolvedValue({ ok: true, datos: elemento });
    acciones.buscarPlatillosBeneficio.mockResolvedValue(pagina([otro]));
    render(<BeneficiosView inicial={pagina([elemento])} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.click(await dialogo().findByRole("button", { name: /Ensalada/ }));
    expect(dialogo().getByText("Seleccionado: Ensalada")).toBeVisible();
    fireEvent.change(campo(/Costo en puntos/), { target: { value: "200" } });
    fireEvent.change(campo(/Vigencia desde/), {
      target: { value: "2026-11-26" },
    });
    fireEvent.change(campo(/Vigencia hasta/), {
      target: { value: "2026-12-01" },
    });
    fireEvent.click(boton("Guardar beneficio"));
    await waitFor(() =>
      expect(acciones.guardarBeneficio).toHaveBeenCalledWith(
        {
          platilloId: 20,
          costoPuntos: 200,
          vigenteDesde: "2026-11-26",
          vigenteHasta: "2026-12-01",
        },
        9,
      ),
    );
    expect(await screen.findByText("Beneficio actualizado.")).toBeVisible();
  },
);

it("mantiene los datos cuando el servidor rechaza un campo y cierra ante conflicto concurrente", async () => {
  acciones.guardarBeneficio
    .mockResolvedValueOnce({
      ok: false,
      estado: 400,
      error: "Revisa los datos de la solicitud.",
      errores: { vigenteHasta: "Fecha rechazada." },
    })
    .mockResolvedValueOnce(conflicto);
  acciones.listarBeneficios.mockResolvedValue(pagina([historico]));
  render(<BeneficiosView inicial={pagina([vigente])} />);
  fireEvent.click(screen.getByRole("button", { name: "Editar" }));
  await dialogo().findByRole("button", { name: "Guardar beneficio" });
  fireEvent.click(boton("Guardar beneficio"));
  expect(await dialogo().findByText("Fecha rechazada.")).toBeVisible();
  expect(campo(/Vigencia hasta/)).toHaveAccessibleDescription(
    "Fecha rechazada.",
  );
  expect(campo(/Costo en puntos/)).toHaveValue(150);
  fireEvent.click(boton("Guardar beneficio"));
  expect(await screen.findByText(conflicto.error)).toBeVisible();
  expect(screen.queryByRole("dialog")).toBeNull();
  await waitFor(() => expect(screen.getByText("Deshabilitado")).toBeVisible());
  expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
});

it.each([false, true])(
  "confirma baja definitiva y actualiza el listado si hubo conflicto=%s",
  async (hayConflicto) => {
    if (hayConflicto)
      acciones.deshabilitarBeneficio.mockResolvedValueOnce(conflicto);
    acciones.listarBeneficios.mockResolvedValue(pagina([historico]));
    render(<BeneficiosView inicial={pagina([vigente])} />);
    fireEvent.click(screen.getByRole("button", { name: "Deshabilitar" }));
    expect(
      dialogo().getByText(/Hamburguesa clásica · 150 puntos/),
    ).toBeVisible();
    fireEvent.click(boton("Cancelar"));
    expect(acciones.deshabilitarBeneficio).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Deshabilitar" }));
    fireEvent.click(boton("Deshabilitar definitivamente"));
    expect(acciones.deshabilitarBeneficio).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText(
        hayConflicto
          ? conflicto.error
          : "Beneficio deshabilitado definitivamente.",
      ),
    ).toBeVisible();
    expect(await screen.findByText("Deshabilitado")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /Editar|Deshabilitar|Reactivar/ }),
    ).toBeNull();
  },
);

it("bloquea un segundo guardado mientras espera y ofrece volver a iniciar sesión ante 401", async () => {
  let resolver!: (valor: Resultado<Beneficio>) => void;
  const pendiente = new Promise<Resultado<Beneficio>>((resolve) => {
    resolver = resolve;
  });
  acciones.guardarBeneficio.mockReturnValueOnce(pendiente);
  render(<BeneficiosView inicial={pagina([vigente])} />);
  fireEvent.click(screen.getByRole("button", { name: "Editar" }));
  fireEvent.click(
    await dialogo().findByRole("button", { name: "Guardar beneficio" }),
  );
  const guardando = boton("Guardando…");
  expect(guardando).toBeDisabled();
  expect(boton("Cancelar")).toBeDisabled();
  fireEvent.click(guardando);
  expect(acciones.guardarBeneficio).toHaveBeenCalledTimes(1);
  await act(async () =>
    resolver({ ok: false, sinSesion: true, error: "Tu sesión expiró." }),
  );
  expect(dialogo().getByRole("alert")).toHaveTextContent("Tu sesión expiró.");
  expect(
    dialogo().getByRole("link", { name: "Iniciar sesión" }),
  ).toHaveAttribute("href", "/login?next=%2Fadmin%2Fbeneficios");
});
