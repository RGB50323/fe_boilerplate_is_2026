import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { DashboardView } from "@/app/dashboard/dashboard-view";
import type { DashboardRespuesta } from "@/lib/dashboard";

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn(), push: vi.fn(), refresh: vi.fn() },
  params: { current: new URLSearchParams() },
  consultarDashboard: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
  useSearchParams: () => mocks.params.current,
}));
vi.mock("next/font/google", () => ({
  Fraunces: () => ({ className: "font-test" }),
}));
vi.mock("@/app/actions/dashboard", () => ({
  consultarDashboard: mocks.consultarDashboard,
}));
vi.mock("@/app/actions/auth", () => ({ logout: mocks.logout }));
vi.mock("@/components/notificaciones/campana-notificaciones", () => ({
  CampanaNotificaciones: () => null,
}));
vi.mock("@/lib/sucursales", () => ({
  SUCURSALES: [
    { id: 1, nombre: "Escalón" },
    { id: 2, nombre: "Santa Tecla" },
  ],
}));

const platillos = Array.from({ length: 12 }, (_, i) => ({
  platilloId: i + 1,
  nombre: `Platillo ${i + 1}`,
  cantidad: 100 - i * 5,
  monto: 500 - i * 20,
}));
// Empate en cantidad con el primero: debe ir después por generar menos dinero.
platillos.push({ platilloId: 99, nombre: "Empate barato", cantidad: 100, monto: 100 });

const dashboard: DashboardRespuesta = {
  desde: "2026-11-01",
  hasta: "2026-11-08",
  sucursales: [
    { sucursalId: 1, nombre: "Escalón", ventas: 8120, pedidos: 640 },
    { sucursalId: 2, nombre: "Santa Tecla", ventas: 0, pedidos: 0 },
  ],
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
  sucursales: dashboard.sucursales.map((s) => ({ ...s, ventas: 0, pedidos: 0 })),
  platillos: [],
  horariosPico: [],
};

async function elegir(combo: string, opcion: string) {
  fireEvent.click(screen.getByRole("combobox", { name: combo }));
  fireEvent.click(await screen.findByRole("option", { name: opcion }));
}

describe("dashboard de ventas", () => {
  beforeEach(() => {
    mocks.router.replace.mockClear();
    mocks.router.push.mockClear();
    mocks.consultarDashboard.mockReset();
    mocks.logout.mockReset();
    mocks.params.current = new URLSearchParams();
  });

  it("muestra el estado de carga mientras espera al backend", () => {
    mocks.consultarDashboard.mockReturnValue(new Promise(() => {}));
    render(<DashboardView />);
    expect(screen.getByText("Cargando dashboard...")).toBeInTheDocument();
  });

  it("muestra ventas totales, pedidos y ticket promedio", async () => {
    mocks.consultarDashboard.mockResolvedValue({ dashboard });
    render(<DashboardView />);

    const ventas = (await screen.findByText("Ventas totales")).parentElement!;
    expect(within(ventas).getByText("$8,120.00")).toBeInTheDocument();
    expect(within(screen.getByText("Pedidos", { selector: "p" }).parentElement!).getByText("640")).toBeInTheDocument();
    expect(
      within(screen.getByText("Ticket promedio", { selector: "p" }).parentElement!).getByText("$12.69"),
    ).toBeInTheDocument();
  });

  it("muestra la tabla por sucursal con $0.00 de ticket si no hubo pedidos", async () => {
    mocks.consultarDashboard.mockResolvedValue({ dashboard });
    render(<DashboardView />);

    const tabla = within(
      (await screen.findByRole("heading", { name: "Ventas por sucursal" })).closest("section")!,
    );
    const escalon = within(tabla.getByRole("rowheader", { name: "Escalón" }).closest("tr")!);
    expect(escalon.getByText("$12.69")).toBeInTheDocument();
    const tecla = within(tabla.getByRole("rowheader", { name: "Santa Tecla" }).closest("tr")!);
    expect(tecla.getAllByText("$0.00")).toHaveLength(2);
  });

  it("consulta con los filtros de la URL", async () => {
    mocks.params.current = new URLSearchParams("periodo=semana&sucursal=2&dia=5");
    mocks.consultarDashboard.mockResolvedValue({ dashboard });
    render(<DashboardView />);
    await screen.findByText("Ventas totales");

    expect(mocks.consultarDashboard).toHaveBeenCalledWith({
      periodo: "semana",
      desde: "",
      hasta: "",
      sucursalId: "2",
      dia: "5",
    });
  });

  it("muestra los 10 platillos más vendidos y permite ver todos", async () => {
    mocks.consultarDashboard.mockResolvedValue({ dashboard });
    render(<DashboardView />);

    const seccion = within(
      (await screen.findByRole("heading", { name: "Platillos más vendidos" })).closest("section")!,
    );
    const filas = () => seccion.getAllByRole("row").slice(1);
    expect(filas()).toHaveLength(10);
    expect(within(filas()[0]).getByText("Platillo 1")).toBeInTheDocument();
    expect(within(filas()[1]).getByText("Empate barato")).toBeInTheDocument();

    fireEvent.click(seccion.getByRole("button", { name: "Ver todos (13)" }));
    expect(filas()).toHaveLength(13);
  });

  it("numera las 3 franjas pico prefiriendo la más temprana en un empate", async () => {
    mocks.consultarDashboard.mockResolvedValue({ dashboard });
    render(<DashboardView />);

    const lista = await screen.findByText("Franjas con más ventas");
    const items = within(lista.nextElementSibling as HTMLElement).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      "112:00 a 13:00$900.00",
      "213:00 a 14:00$400.00",
      "319:00 a 20:00$400.00",
    ]);
  });

  it("al elegir un día actualiza la URL", async () => {
    mocks.params.current = new URLSearchParams("periodo=mes");
    mocks.consultarDashboard.mockResolvedValue({ dashboard });
    render(<DashboardView />);
    await screen.findByText("Franjas con más ventas");

    await elegir("Día", "Viernes");
    expect(mocks.router.replace).toHaveBeenCalledWith("/dashboard?periodo=mes&dia=5", {
      scroll: false,
    });
  });

  it("al elegir una sucursal actualiza la URL", async () => {
    mocks.params.current = new URLSearchParams("periodo=hoy");
    mocks.consultarDashboard.mockResolvedValue({ dashboard });
    render(<DashboardView />);
    await screen.findByText("Ventas totales");

    await elegir("Sucursal", "Santa Tecla");
    expect(mocks.router.replace).toHaveBeenCalledWith("/dashboard?periodo=hoy&sucursal=2", {
      scroll: false,
    });
  });

  it("no aplica un rango con fecha final anterior a la inicial", async () => {
    mocks.consultarDashboard.mockResolvedValue({ dashboard });
    render(<DashboardView />);
    await screen.findByText("Ventas totales");

    await elegir("Periodo", "Personalizado");
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-11-08" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-11-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(
      await screen.findByText("Rango no válido: la fecha final no puede ser anterior a la inicial."),
    ).toBeInTheDocument();
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });

  it("aplica un rango válido", async () => {
    mocks.consultarDashboard.mockResolvedValue({ dashboard });
    render(<DashboardView />);
    await screen.findByText("Ventas totales");

    await elegir("Periodo", "Personalizado");
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-10-01" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-10-31" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(mocks.router.replace).toHaveBeenCalledWith(
      "/dashboard?periodo=rango&desde=2026-10-01&hasta=2026-10-31",
      { scroll: false },
    );
  });

  it("sin ventas muestra el mensaje y un total de $0.00", async () => {
    mocks.consultarDashboard.mockResolvedValue({ dashboard: sinVentas });
    render(<DashboardView />);

    expect(
      await screen.findByText("Sin ventas en el periodo seleccionado"),
    ).toBeInTheDocument();
    const ventas = screen.getByText("Ventas totales").parentElement!;
    expect(within(ventas).getByText("$0.00")).toBeInTheDocument();
  });

  it("muestra el error y permite reintentar", async () => {
    mocks.consultarDashboard.mockResolvedValue({
      error: "No pudimos cargar el dashboard",
      motivo: "error",
    });
    render(<DashboardView />);
    expect(await screen.findByText("No pudimos cargar el dashboard")).toBeInTheDocument();

    mocks.consultarDashboard.mockResolvedValue({ dashboard });
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Ventas totales")).toBeInTheDocument();
  });

  it("si el backend niega el acceso no muestra datos ni reintento", async () => {
    mocks.consultarDashboard.mockResolvedValue({
      error: "No tenés acceso al dashboard de ventas.",
      motivo: "sin-acceso",
    });
    render(<DashboardView />);
    expect(
      await screen.findByText("No tenés acceso al dashboard de ventas."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Ventas totales")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
  });

  it("al exportar descarga un CSV con las ventas por sucursal", async () => {
    const crear = vi.fn<(b: Blob) => string>(() => "blob:csv");
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: crear, revokeObjectURL: vi.fn() }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    mocks.consultarDashboard.mockResolvedValue({ dashboard });
    render(<DashboardView />);
    await screen.findByText("Ventas totales");

    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));

    expect(click).toHaveBeenCalledTimes(1);
    const csv = await crear.mock.calls[0][0].text();
    expect(csv).toContain("Escalón,8120.00,640,12.69");
    expect(csv).toContain("Santa Tecla,0.00,0,0.00");
    expect(
      await screen.findByText("Descargaste las ventas por sucursal en CSV."),
    ).toBeInTheDocument();
  });

  it("al cerrar sesión llama a logout y va al login", async () => {
    mocks.consultarDashboard.mockResolvedValue({ dashboard });
    mocks.logout.mockResolvedValue(undefined);
    render(<DashboardView />);
    await screen.findByText("Ventas totales");

    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await waitFor(() => expect(mocks.logout).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith("/login"));
  });
});
