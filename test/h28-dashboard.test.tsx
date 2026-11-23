import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { DashboardView } from "@/app/dashboard/dashboard-view";
import { motivoSinAcceso } from "@/lib/dashboard-acceso";
import { franjasPico, ordenarPlatillos } from "@/lib/dashboard";
import type { DashboardRespuesta, VentasPagina } from "@/lib/dashboard";

// Suite de componente de la historia H28 (plan de pruebas), lado frontend.
// Los cálculos del backend (ventas, ticket, CSV) están en src/dashboard/services/dashboard-h28.spec.ts del repositorio del backend.

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn(), push: vi.fn(), refresh: vi.fn() },
  params: { current: new URLSearchParams() },
  consultarDashboard: vi.fn(),
  consultarVentas: vi.fn(),
  getUsuarioActual: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
  useSearchParams: () => mocks.params.current,
}));
vi.mock("next/font/google", () => ({ Fraunces: () => ({ className: "font-test" }) }));
vi.mock("@/app/actions/dashboard", () => ({
  consultarDashboard: mocks.consultarDashboard,
  consultarVentas: mocks.consultarVentas,
}));
vi.mock("@/app/actions/auth", () => ({ logout: vi.fn() }));
vi.mock("@/components/notificaciones/campana-notificaciones", () => ({
  CampanaNotificaciones: () => null,
}));
vi.mock("@/lib/session", async (original) => ({
  ...(await original<typeof import("@/lib/session")>()),
  getUsuarioActual: mocks.getUsuarioActual,
}));

const platillos = Array.from({ length: 12 }, (_, i) => ({
  platilloId: i + 1,
  nombre: `Platillo ${i + 1}`,
  cantidad: 100 - i * 5,
  monto: 500 - i * 20,
}));
platillos.push({ platilloId: 99, nombre: "Empate barato", cantidad: 100, monto: 100 });

const dashboard: DashboardRespuesta = {
  desde: "2026-11-01",
  hasta: "2026-11-08",
  sucursales: [
    { sucursalId: 1, nombre: "Escalón", ventas: 8120, pedidos: 640, ticketPromedio: 12.69 },
    { sucursalId: 2, nombre: "Santa Tecla", ventas: 0, pedidos: 0, ticketPromedio: 0 },
  ],
  totalGeneral: { ventas: 8120, pedidos: 640, ticketPromedio: 12.69 },
  platillos,
  horariosPico: [
    {
      sucursalId: 1,
      nombre: "Escalón",
      franjas: [
        { hora: 11, ventas: 100 },
        { hora: 12, ventas: 900 },
        { hora: 13, ventas: 400 },
        { hora: 19, ventas: 400 },
        { hora: 20, ventas: 400 },
      ],
    },
  ],
};

const sinVentas: DashboardRespuesta = {
  ...dashboard,
  sucursales: dashboard.sucursales.map((s) => ({ ...s, ventas: 0, pedidos: 0, ticketPromedio: 0 })),
  totalGeneral: { ventas: 0, pedidos: 0, ticketPromedio: 0 },
  platillos: [],
  horariosPico: [],
};

const pagina: VentasPagina = {
  items: [
    {
      pedidoId: 1,
      numero: "ESC-0001",
      sucursalId: 1,
      sucursal: "Escalón",
      fecha: "2026-11-08T18:05:00Z",
      tipo: "MESA",
      articulos: 3,
      subtotal: 25,
      descuentos: 2.5,
      venta: 22.5,
    },
  ],
  total: 1,
  pagina: 1,
  porPagina: 20,
};

const sucursales = [
  { id: 1, nombre: "Escalón" },
  { id: 2, nombre: "Santa Tecla" },
];

const indicador = (titulo: string) =>
  within(screen.getByText(titulo, { selector: "p" }).parentElement!);

const seccion = async (titulo: string) =>
  within((await screen.findByRole("heading", { name: titulo })).closest("section")!);

async function elegir(combo: string, opcion: string) {
  fireEvent.click(screen.getByRole("combobox", { name: combo }));
  fireEvent.click(await screen.findByRole("option", { name: opcion }));
}

async function abrir(query = "") {
  mocks.params.current = new URLSearchParams(query);
  const vista = render(<DashboardView sucursales={sucursales} />);
  await screen.findByText("Ventas totales");
  return vista;
}

describe("H28. Dashboard de ventas por sucursal", () => {
  beforeEach(() => {
    mocks.router.replace.mockClear();
    mocks.consultarDashboard.mockReset().mockResolvedValue({ dashboard });
    mocks.consultarVentas.mockReset().mockResolvedValue({ ventas: pagina });
    mocks.getUsuarioActual.mockReset();
  });

  it("AC1: muestra el total general, los pedidos y el ticket promedio, y la tabla por sucursal", async () => {
    await abrir();
    expect(indicador("Ventas totales").getByText("$8,120.00")).toBeInTheDocument();
    expect(indicador("Pedidos").getByText("640")).toBeInTheDocument();
    expect(indicador("Ticket promedio").getByText("$12.69")).toBeInTheDocument();

    const filas = (await seccion("Ventas por sucursal")).getAllByRole("row").slice(1);
    expect(filas.map((f) => within(f).getByRole("rowheader").textContent)).toEqual([
      "Escalón",
      "Santa Tecla",
      "Total general",
    ]);
  });

  it("AC2: cada venta confirmada se muestra como subtotal menos descuentos", async () => {
    await abrir();
    const fila = (await seccion("Ventas confirmadas")).getAllByRole("row")[1];
    expect(within(fila).getByText("$25.00")).toBeInTheDocument();
    expect(within(fila).getByText("−$2.50")).toBeInTheDocument();
    expect(within(fila).getByText("$22.50")).toBeInTheDocument();
  });

  it("AC3: muestra el ticket promedio de la sucursal que calcula el backend ($8,120.00 / 640 = $12.69)", async () => {
    await abrir();
    const fila = (await seccion("Ventas por sucursal")).getAllByRole("row")[1];
    expect(within(fila).getByText("$12.69")).toBeInTheDocument();
  });

  it("AC4: una sucursal sin pedidos muestra un ticket promedio de $0.00", async () => {
    await abrir();
    const fila = (await seccion("Ventas por sucursal")).getAllByRole("row")[2];
    expect(within(fila).getByRole("rowheader")).toHaveTextContent("Santa Tecla");
    expect(within(fila).getAllByText("$0.00")).toHaveLength(2);
  });

  it("AC5: al elegir Hoy, Semana, Mes o un rango, vuelve a consultar con ese periodo", async () => {
    const { unmount } = await abrir();
    fireEvent.click(screen.getByRole("button", { name: "Hoy" }));
    expect(mocks.router.replace).toHaveBeenCalledWith("/dashboard?periodo=hoy", { scroll: false });
    unmount();

    await abrir("periodo=rango&desde=2026-10-01&hasta=2026-10-31");
    const filtros = { periodo: "rango", desde: "2026-10-01", hasta: "2026-10-31", sucursalId: "", dia: "" };
    expect(mocks.consultarDashboard).toHaveBeenLastCalledWith(filtros);
    expect(mocks.consultarVentas).toHaveBeenLastCalledWith(filtros, 1);
  });

  it("AC6: al elegir una sucursal o Todas, vuelve a consultar para esa selección", async () => {
    const { unmount } = await abrir("periodo=hoy");
    await elegir("Sucursal", "Santa Tecla");
    expect(mocks.router.replace).toHaveBeenCalledWith("/dashboard?periodo=hoy&sucursal=2", {
      scroll: false,
    });
    unmount();

    await abrir("periodo=hoy&sucursal=2");
    expect(mocks.consultarDashboard).toHaveBeenLastCalledWith(
      expect.objectContaining({ sucursalId: "2" }),
    );
  });

  it("AC7: un rango con fecha final anterior a la inicial muestra el error y no actualiza los datos", async () => {
    await abrir();
    const consultas = mocks.consultarDashboard.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Personalizado" }));
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-11-08" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-11-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(
      await screen.findByText("Rango no válido: la fecha final no puede ser anterior a la inicial."),
    ).toBeInTheDocument();
    expect(mocks.router.replace).not.toHaveBeenCalled();
    expect(mocks.consultarDashboard).toHaveBeenCalledTimes(consultas);
  });

  it("AC8: muestra los 10 platillos más vendidos con cantidad y monto, y permite Ver todos", async () => {
    await abrir();
    const platillosSeccion = await seccion("Platillos más vendidos");
    const filas = () => platillosSeccion.getAllByRole("row").slice(1);

    expect(filas()).toHaveLength(10);
    expect(within(filas()[0]).getByText("Platillo 1")).toBeInTheDocument();
    expect(within(filas()[0]).getByText("100")).toBeInTheDocument();
    expect(within(filas()[0]).getByText("$500.00")).toBeInTheDocument();

    fireEvent.click(platillosSeccion.getByRole("button", { name: "Ver todos (13)" }));
    expect(filas()).toHaveLength(13);
  });

  it("AC9: con la misma cantidad vendida, aparece primero el platillo que generó más dinero", async () => {
    expect(
      ordenarPlatillos([
        { platilloId: 2, nombre: "Barato", cantidad: 10, monto: 50 },
        { platilloId: 1, nombre: "Caro", cantidad: 10, monto: 90 },
      ]).map((p) => p.nombre),
    ).toEqual(["Caro", "Barato"]);

    await abrir();
    const filas = (await seccion("Platillos más vendidos")).getAllByRole("row").slice(1);
    expect(within(filas[0]).getByText("Platillo 1")).toBeInTheDocument();
    expect(within(filas[1]).getByText("Empate barato")).toBeInTheDocument();
  });

  it("AC10: muestra las ventas por franja de 1 hora de cada sucursal y marca las 3 con más ventas", async () => {
    await abrir();
    const lista = await screen.findByText("Franjas con más ventas");
    const items = within(lista.nextElementSibling as HTMLElement).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("12:00 a 13:00");
    expect(items[0]).toHaveTextContent("$900.00");
  });

  it("AC11: en un empate de ventas se marca primero la franja más temprana", async () => {
    expect(
      franjasPico([
        { hora: 20, ventas: 400 },
        { hora: 13, ventas: 400 },
        { hora: 19, ventas: 400 },
        { hora: 12, ventas: 900 },
      ]),
    ).toEqual([12, 13, 19]);

    await abrir();
    const lista = await screen.findByText("Franjas con más ventas");
    const items = within(lista.nextElementSibling as HTMLElement).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      "112:00 a 13:00$900.00",
      "213:00 a 14:00$400.00",
      "319:00 a 20:00$400.00",
    ]);
  });

  it("AC12: al filtrar por día de la semana, vuelve a consultar solo con ese día", async () => {
    const { unmount } = await abrir("periodo=mes");
    await elegir("Día de la semana", "Viernes");
    expect(mocks.router.replace).toHaveBeenCalledWith("/dashboard?periodo=mes&dia=5", {
      scroll: false,
    });
    unmount();

    await abrir("periodo=mes&dia=5");
    expect(mocks.consultarDashboard).toHaveBeenLastCalledWith(
      expect.objectContaining({ dia: "5" }),
    );
  });

  it("AC13: un periodo sin ventas muestra “Sin ventas en el periodo seleccionado” y un total de $0.00", async () => {
    mocks.consultarDashboard.mockResolvedValue({ dashboard: sinVentas });
    render(<DashboardView sucursales={sucursales} />);

    expect(await screen.findByText("Sin ventas en el periodo seleccionado")).toBeInTheDocument();
    expect(indicador("Ventas totales").getByText("$0.00")).toBeInTheDocument();
  });

  it("AC14: Exportar CSV descarga las ventas por sucursal del periodo seleccionado", async () => {
    const crear = vi.fn<(b: Blob) => string>(() => "blob:csv");
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: crear, revokeObjectURL: vi.fn() }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("Sucursal,Ventas,Pedidos,Ticket promedio\r\nEscalón,8120.00,640,12.69", {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="ventas-por-sucursal_x.csv"',
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await abrir("periodo=semana&sucursal=1");

    fireEvent.click(screen.getByRole("button", { name: /Exportar CSV/ }));

    expect(await screen.findByText("Descargaste las ventas por sucursal en CSV.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/dashboard/exportar?periodo=semana&sucursal=1", {
      cache: "no-store",
    });
    expect(click).toHaveBeenCalledTimes(1);
    expect(await crear.mock.calls[0][0].text()).toContain("Escalón,8120.00,640,12.69");
    vi.unstubAllGlobals();
  });

  it("AC15: un cliente, mesero o cocina no tiene acceso; el gerente general sí", async () => {
    for (const rol of ["CLIENTE", "MESERO", "COCINA"]) {
      mocks.getUsuarioActual.mockResolvedValue({ estado: "ok", usuario: { rol } });
      expect(await motivoSinAcceso()).toBe("sin-acceso");
    }
    mocks.getUsuarioActual.mockResolvedValue({ estado: "ok", usuario: { rol: "GERENTE_GENERAL" } });
    expect(await motivoSinAcceso()).toBeNull();
    mocks.getUsuarioActual.mockResolvedValue({ estado: "sin-sesion" });
    expect(await motivoSinAcceso()).toBe("sin-sesion");
  });
});
