import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { DashboardView } from "@/app/dashboard/dashboard-view";
import type { DashboardRespuesta, VentaConfirmada, VentasPagina } from "@/lib/dashboard";

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn(), push: vi.fn(), refresh: vi.fn() },
  params: { current: new URLSearchParams() },
  consultarDashboard: vi.fn(),
  consultarVentas: vi.fn(),
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
  consultarVentas: mocks.consultarVentas,
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

const venta = (i: number, extra: Partial<VentaConfirmada> = {}): VentaConfirmada => ({
  pedidoId: i,
  numero: `ESC-${String(i).padStart(4, "0")}`,
  sucursalId: 1,
  sucursal: "Escalón",
  fecha: "2026-11-08T18:05:00Z",
  tipo: "MESA",
  articulos: 3,
  subtotal: 25,
  descuentos: 2.5,
  venta: 22.5,
  ...extra,
});

const pagina1: VentasPagina = {
  items: [venta(1), venta(2, { numero: null, tipo: "LLEVAR", descuentos: 0, venta: 25 })],
  total: 45,
  pagina: 1,
  porPagina: 20,
};

async function elegir(combo: string, opcion: string) {
  fireEvent.click(screen.getByRole("combobox", { name: combo }));
  fireEvent.click(await screen.findByRole("option", { name: opcion }));
}

const indicador = (titulo: string) =>
  within(screen.getByText(titulo, { selector: "p" }).parentElement!);

const tablaVentas = async () =>
  within(
    (await screen.findByRole("heading", { name: "Ventas confirmadas" })).closest("section")!,
  );

describe("dashboard de ventas", () => {
  beforeEach(() => {
    mocks.router.replace.mockClear();
    mocks.router.push.mockClear();
    mocks.consultarDashboard.mockReset().mockResolvedValue({ dashboard });
    mocks.consultarVentas.mockReset().mockResolvedValue({ ventas: pagina1 });
    mocks.logout.mockReset();
    mocks.params.current = new URLSearchParams();
  });

  it("muestra el estado de carga mientras espera al backend", () => {
    mocks.consultarDashboard.mockReturnValue(new Promise(() => {}));
    render(<DashboardView />);
    expect(screen.getByText("Cargando dashboard...")).toBeInTheDocument();
  });

  it("muestra ventas totales, pedidos y ticket promedio", async () => {
    render(<DashboardView />);
    await screen.findByText("Ventas totales");
    expect(indicador("Ventas totales").getByText("$8,120.00")).toBeInTheDocument();
    expect(indicador("Pedidos").getByText("640")).toBeInTheDocument();
    expect(indicador("Ticket promedio").getByText("$12.69")).toBeInTheDocument();
  });

  it("consulta con los filtros de la URL", async () => {
    mocks.params.current = new URLSearchParams("periodo=semana&sucursal=2&dia=5");
    render(<DashboardView />);
    await screen.findByText("Ventas totales");

    const filtros = { periodo: "semana", desde: "", hasta: "", sucursalId: "2", dia: "5" };
    expect(mocks.consultarDashboard).toHaveBeenCalledWith(filtros);
    expect(mocks.consultarVentas).toHaveBeenCalledWith(filtros, 1);
    expect(screen.getByRole("button", { name: "Semana" })).toHaveAttribute("aria-pressed", "true");
  });

  describe("ventas confirmadas", () => {
    it("lista cada venta con fecha y hora local, pedido, tipo y montos", async () => {
      render(<DashboardView />);
      const seccion = await tablaVentas();
      const filas = seccion.getAllByRole("row").slice(1);
      expect(filas).toHaveLength(2);

      const primera = within(filas[0]);
      expect(primera.getByText("08/11/2026")).toBeInTheDocument();
      expect(primera.getByText("12:05")).toBeInTheDocument();
      expect(primera.getByRole("rowheader", { name: "ESC-0001" })).toBeInTheDocument();
      expect(primera.getByText("Mesa")).toBeInTheDocument();
      expect(primera.getByText("−$2.50")).toBeInTheDocument();
      expect(primera.getByText("$22.50")).toBeInTheDocument();

      const segunda = within(filas[1]);
      expect(segunda.getByRole("rowheader", { name: "#2" })).toBeInTheDocument();
      expect(segunda.getByText("Para llevar")).toBeInTheDocument();
      expect(seccion.getByText("Mostrando 1–20 de 45 ventas")).toBeInTheDocument();
    });

    it("con todas las sucursales muestra la columna Sucursal", async () => {
      render(<DashboardView />);
      const seccion = await tablaVentas();
      expect(seccion.getByRole("columnheader", { name: "Sucursal" })).toBeInTheDocument();
    });

    it("con una sucursal elegida oculta la columna Sucursal", async () => {
      mocks.params.current = new URLSearchParams("periodo=mes&sucursal=1");
      render(<DashboardView />);
      const seccion = await tablaVentas();
      await seccion.findByText("ESC-0001");
      expect(seccion.queryByRole("columnheader", { name: "Sucursal" })).not.toBeInTheDocument();
    });

    it("pasa a la página siguiente", async () => {
      render(<DashboardView />);
      const seccion = await tablaVentas();
      await seccion.findByText("ESC-0001");

      mocks.consultarVentas.mockResolvedValue({
        ventas: { ...pagina1, items: [venta(21)], pagina: 2 },
      });
      fireEvent.click(seccion.getByRole("button", { name: "Siguiente" }));

      expect(await seccion.findByText("ESC-0021")).toBeInTheDocument();
      expect(mocks.consultarVentas).toHaveBeenLastCalledWith(expect.anything(), 2);
      expect(seccion.getByText("Página 2 de 3")).toBeInTheDocument();
    });

    it("si falla la lista permite reintentar", async () => {
      mocks.consultarVentas.mockResolvedValue({ error: "x", motivo: "error" });
      render(<DashboardView />);
      expect(await screen.findByText("No pudimos cargar las ventas")).toBeInTheDocument();
    });
  });

  describe("filtros", () => {
    it("al elegir un periodo actualiza la URL", async () => {
      render(<DashboardView />);
      await screen.findByText("Ventas totales");

      fireEvent.click(screen.getByRole("button", { name: "Hoy" }));
      expect(mocks.router.replace).toHaveBeenCalledWith("/dashboard?periodo=hoy", {
        scroll: false,
      });
    });

    it("al elegir una sucursal actualiza la URL", async () => {
      mocks.params.current = new URLSearchParams("periodo=hoy");
      render(<DashboardView />);
      await screen.findByText("Ventas totales");

      await elegir("Sucursal", "Santa Tecla");
      expect(mocks.router.replace).toHaveBeenCalledWith("/dashboard?periodo=hoy&sucursal=2", {
        scroll: false,
      });
    });

    it("limpiar filtros vuelve a Mes y Todas", async () => {
      mocks.params.current = new URLSearchParams("periodo=hoy&sucursal=2&dia=5");
      render(<DashboardView />);
      await screen.findByText("Ventas totales");

      fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
      expect(mocks.router.replace).toHaveBeenCalledWith("/dashboard?periodo=mes", {
        scroll: false,
      });
    });

    it("no aplica un rango con fecha final anterior a la inicial", async () => {
      render(<DashboardView />);
      await screen.findByText("Ventas totales");

      fireEvent.click(screen.getByRole("button", { name: "Personalizado" }));
      fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-11-08" } });
      fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-11-01" } });
      fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

      expect(
        await screen.findByText("Rango no válido: la fecha final no puede ser anterior a la inicial."),
      ).toBeInTheDocument();
      expect(mocks.router.replace).not.toHaveBeenCalled();
    });

    it("aplica un rango válido", async () => {
      render(<DashboardView />);
      await screen.findByText("Ventas totales");

      fireEvent.click(screen.getByRole("button", { name: /Rango de fechas/ }));
      fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-10-01" } });
      fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-10-31" } });
      fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

      expect(mocks.router.replace).toHaveBeenCalledWith(
        "/dashboard?periodo=rango&desde=2026-10-01&hasta=2026-10-31",
        { scroll: false },
      );
    });

    it("muestra el rango del periodo en el botón de fechas", async () => {
      mocks.params.current = new URLSearchParams("periodo=rango&desde=2026-10-01&hasta=2026-10-31");
      render(<DashboardView />);
      expect(
        screen.getByRole("button", { name: /01\/10\/2026 – 31\/10\/2026/ }),
      ).toBeInTheDocument();
    });
  });

  describe("platillos más vendidos", () => {
    it("muestra el top 10 en gráfica y tabla, y permite ver todos", async () => {
      render(<DashboardView />);
      const seccion = within(
        (await screen.findByRole("heading", { name: "Platillos más vendidos" })).closest("section")!,
      );
      const grafica = () =>
        within(seccion.getByRole("list", { name: "Cantidad vendida por platillo" })).getAllByRole(
          "listitem",
        );
      const filas = () => seccion.getAllByRole("row").slice(1);

      expect(grafica()).toHaveLength(10);
      expect(filas()).toHaveLength(10);
      expect(grafica()[0]).toHaveTextContent("1. Platillo 1");
      expect(within(filas()[1]).getByText("Empate barato")).toBeInTheDocument();

      fireEvent.click(seccion.getByRole("button", { name: "Ver todos (13)" }));
      expect(grafica()).toHaveLength(13);
      expect(filas()).toHaveLength(13);
    });
  });

  describe("horarios pico", () => {
    it("numera las 3 franjas pico prefiriendo la más temprana en un empate", async () => {
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
      render(<DashboardView />);
      await screen.findByText("Franjas con más ventas");

      await elegir("Día de la semana", "Viernes");
      expect(mocks.router.replace).toHaveBeenCalledWith("/dashboard?periodo=mes&dia=5", {
        scroll: false,
      });
    });
  });

  it("sin ventas muestra el mensaje, un total de $0.00 y no permite exportar", async () => {
    mocks.consultarDashboard.mockResolvedValue({ dashboard: sinVentas });
    render(<DashboardView />);

    expect(await screen.findByText("Sin ventas en el periodo seleccionado")).toBeInTheDocument();
    expect(indicador("Ventas totales").getByText("$0.00")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Ventas confirmadas" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exportar CSV/ })).toBeDisabled();
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
    expect(await screen.findByText("No tenés acceso al dashboard de ventas.")).toBeInTheDocument();
    expect(screen.queryByText("Ventas totales")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
  });

  describe("exportar", () => {
    it("descarga el CSV de ventas confirmadas con los filtros actuales", async () => {
      mocks.params.current = new URLSearchParams("periodo=semana&sucursal=1");
      const crear = vi.fn<(b: Blob) => string>(() => "blob:csv");
      vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: crear, revokeObjectURL: vi.fn() }));
      const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
      const fetchMock = vi.fn().mockResolvedValue(
        new Response("Fecha,Hora\r\n08/11/2026,12:05", {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="ventas-confirmadas_x.csv"',
          },
        }),
      );
      vi.stubGlobal("fetch", fetchMock);
      render(<DashboardView />);
      await screen.findByText("Ventas totales");

      fireEvent.click(screen.getByRole("button", { name: /Exportar CSV/ }));

      expect(
        await screen.findByText("Descargaste las ventas confirmadas en CSV."),
      ).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledWith("/dashboard/exportar?periodo=semana&sucursal=1", {
        cache: "no-store",
      });
      expect(click).toHaveBeenCalledTimes(1);
      expect(await crear.mock.calls[0][0].text()).toContain("08/11/2026,12:05");
    });

    it("si el servidor niega la descarga muestra el motivo", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          Response.json(
            { error: "No tenés acceso al dashboard de ventas.", motivo: "sin-acceso" },
            { status: 403 },
          ),
        ),
      );
      render(<DashboardView />);
      await screen.findByText("Ventas totales");

      fireEvent.click(screen.getByRole("button", { name: /Exportar CSV/ }));
      expect(
        await screen.findByText("No tenés acceso al dashboard de ventas."),
      ).toBeInTheDocument();
    });
  });

  it("al cerrar sesión llama a logout y va al login", async () => {
    mocks.logout.mockResolvedValue(undefined);
    render(<DashboardView />);
    await screen.findByText("Ventas totales");

    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await waitFor(() => expect(mocks.logout).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith("/login"));
  });
});
