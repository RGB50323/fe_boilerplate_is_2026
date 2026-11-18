import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ComparativoView } from "@/app/dashboard/comparativo/comparativo-view";

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn(), push: vi.fn(), refresh: vi.fn() },
  params: { current: new URLSearchParams() },
  consultarComparativo: vi.fn(),
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
  consultarComparativo: mocks.consultarComparativo,
}));
vi.mock("@/app/actions/auth", () => ({ logout: mocks.logout }));
vi.mock("@/components/notificaciones/campana-notificaciones", () => ({
  CampanaNotificaciones: () => null,
}));
vi.mock("@/lib/sucursales", () => ({
  SUCURSALES: [
    { id: 1, nombre: "Centro" },
    { id: 2, nombre: "Escalón" },
    { id: 3, nombre: "Santa Tecla" },
  ],
}));

// Datos del mockup.
const sucursales = [
  { sucursalId: 1, nombre: "Centro", ventas: 8120, pedidos: 640, ticketPromedio: 12.69 },
  { sucursalId: 2, nombre: "Escalón", ventas: 4310.25, pedidos: 330, ticketPromedio: 13.06 },
  { sucursalId: 3, nombre: "Santa Tecla", ventas: 2800.25, pedidos: 210, ticketPromedio: 13.33 },
];

const tarjeta = async (nombre: string) =>
  within(
    (await screen.findByRole("heading", { level: 3, name: nombre })).closest("li")!,
  );

const valorDe = (t: ReturnType<typeof within>, etiqueta: string) =>
  t.getByText(etiqueta).nextElementSibling?.textContent;

describe("comparativo de sucursales", () => {
  beforeEach(() => {
    mocks.router.replace.mockClear();
    mocks.consultarComparativo.mockReset().mockResolvedValue({ sucursales });
    mocks.params.current = new URLSearchParams();
  });

  it("muestra el estado de carga mientras espera al backend", () => {
    mocks.consultarComparativo.mockReturnValue(new Promise(() => {}));
    render(<ComparativoView />);
    expect(screen.getByText("Cargando comparativo...")).toBeInTheDocument();
  });

  it("consulta el periodo de la URL", async () => {
    mocks.params.current = new URLSearchParams(
      "periodo=rango&desde=2026-10-01&hasta=2026-10-31",
    );
    render(<ComparativoView />);
    await screen.findByText("Promedio de ventas (referencia)");
    expect(mocks.consultarComparativo).toHaveBeenCalledWith({
      periodo: "rango",
      desde: "2026-10-01",
      hasta: "2026-10-31",
    });
  });

  it("muestra lado a lado ventas, pedidos y ticket promedio de cada sucursal", async () => {
    render(<ComparativoView />);
    const centro = await tarjeta("Centro");
    expect(centro.getByText("$8,120.00")).toBeInTheDocument();
    expect(valorDe(centro, "Pedidos")).toBe("640");
    expect(valorDe(centro, "Ticket promedio")).toBe("$12.69");
    expect(valorDe(centro, "Diferencia vs. promedio")).toBe("+59.9 %");
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
  });

  it("muestra el promedio de ventas como referencia", async () => {
    render(<ComparativoView />);
    const tarjetaPromedio = (await screen.findByText("Promedio de ventas (referencia)"))
      .parentElement!;
    expect(within(tarjetaPromedio).getByText("$5,076.83")).toBeInTheDocument();
    expect(
      within(tarjetaPromedio).getByText("Promedio de las 3 sucursales comparadas"),
    ).toBeInTheDocument();
  });

  it("marca la sucursal más de 20 % por debajo del promedio con su diferencia", async () => {
    render(<ComparativoView />);
    expect(
      await screen.findByText(/1 sucursal requiere atención:/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Santa Tecla tiene ventas 44\.8 % por debajo del promedio/),
    ).toBeInTheDocument();

    const tecla = await tarjeta("Santa Tecla");
    expect(tecla.getByText("Requiere atención")).toBeInTheDocument();
    expect(valorDe(tecla, "Diferencia vs. promedio")).toBe("−44.8 %");
    expect((await tarjeta("Escalón")).queryByText("Requiere atención")).not.toBeInTheDocument();
  });

  it("si ninguna está más de 20 % por debajo, lo indica", async () => {
    mocks.consultarComparativo.mockResolvedValue({
      sucursales: sucursales.map((s) => ({ ...s, ventas: 5000 })),
    });
    render(<ComparativoView />);
    expect(
      await screen.findByText("Ninguna sucursal requiere atención en este periodo"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Requiere atención")).not.toBeInTheDocument();
  });

  it("solo compara las sucursales elegidas", async () => {
    mocks.params.current = new URLSearchParams("periodo=mes&sucursales=1,2");
    render(<ComparativoView />);
    await tarjeta("Centro");

    expect(screen.queryByRole("heading", { level: 3, name: "Santa Tecla" })).not.toBeInTheDocument();
    expect(screen.getByText("Promedio de las 2 sucursales comparadas")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Santa Tecla" })).not.toBeChecked();
    // Entre Centro y Escalón, Escalón queda 30.6 % por debajo.
    expect(screen.getByText(/Escalón tiene ventas 30\.6 % por debajo/)).toBeInTheDocument();
  });

  it("por defecto están todas marcadas y al desmarcar una actualiza la URL", async () => {
    render(<ComparativoView />);
    await tarjeta("Centro");
    for (const nombre of ["Centro", "Escalón", "Santa Tecla"]) {
      expect(screen.getByRole("checkbox", { name: nombre })).toBeChecked();
    }

    fireEvent.click(screen.getByRole("checkbox", { name: "Escalón" }));
    expect(mocks.router.replace).toHaveBeenCalledWith(
      "/dashboard/comparativo?periodo=mes&sucursales=1%2C3",
      { scroll: false },
    );
  });

  it("con menos de dos sucursales pide elegir más y no genera el comparativo", () => {
    mocks.params.current = new URLSearchParams("periodo=mes&sucursales=2");
    render(<ComparativoView />);

    expect(
      screen.getByText("Selecciona al menos dos sucursales para comparar"),
    ).toBeInTheDocument();
    expect(mocks.consultarComparativo).not.toHaveBeenCalled();
    expect(screen.queryByText("Promedio de ventas (referencia)")).not.toBeInTheDocument();
  });

  it("no genera el comparativo con un rango con fecha final anterior a la inicial", async () => {
    render(<ComparativoView />);
    await tarjeta("Centro");

    fireEvent.click(screen.getByRole("button", { name: "Personalizado" }));
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-11-08" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-11-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(
      await screen.findByText("Rango no válido: la fecha final no puede ser anterior a la inicial."),
    ).toBeInTheDocument();
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });

  it("al cambiar el periodo conserva las sucursales elegidas", async () => {
    mocks.params.current = new URLSearchParams("periodo=mes&sucursales=1,3");
    render(<ComparativoView />);
    await tarjeta("Centro");

    fireEvent.click(screen.getByRole("button", { name: "Semana" }));
    expect(mocks.router.replace).toHaveBeenCalledWith(
      "/dashboard/comparativo?periodo=semana&sucursales=1%2C3",
      { scroll: false },
    );
  });

  it("sin ventas: cada sucursal en $0.00, ninguna marcada y el mensaje", async () => {
    mocks.consultarComparativo.mockResolvedValue({
      sucursales: sucursales.map((s) => ({ ...s, ventas: 0, pedidos: 0, ticketPromedio: 0 })),
    });
    render(<ComparativoView />);

    expect(await screen.findByText("Sin ventas en el periodo seleccionado")).toBeInTheDocument();
    for (const nombre of ["Centro", "Escalón", "Santa Tecla"]) {
      expect((await tarjeta(nombre)).getByText("$0.00", { selector: "p" })).toBeInTheDocument();
    }
    expect(screen.queryByText("Requiere atención")).not.toBeInTheDocument();
    expect(screen.queryByText(/requiere atención:/)).not.toBeInTheDocument();
  });

  it("la tabla de detalle se ordena al hacer clic en un encabezado", async () => {
    render(<ComparativoView />);
    const detalle = within(
      (await screen.findByRole("heading", { name: "Detalle" })).closest("section")!,
    );
    const nombres = () =>
      detalle.getAllByRole("rowheader").map((th) => th.textContent);

    expect(nombres()).toEqual(["Centro", "Escalón", "Santa Tecla"]);
    expect(detalle.getByRole("columnheader", { name: /Ventas/ })).toHaveAttribute(
      "aria-sort",
      "descending",
    );

    fireEvent.click(detalle.getByRole("button", { name: /Ticket promedio/ }));
    expect(nombres()).toEqual(["Santa Tecla", "Escalón", "Centro"]);

    fireEvent.click(detalle.getByRole("button", { name: /Ticket promedio/ }));
    expect(nombres()).toEqual(["Centro", "Escalón", "Santa Tecla"]);
  });

  it("el selector de vista lleva a la vista general con el mismo periodo", async () => {
    mocks.params.current = new URLSearchParams("periodo=semana&sucursales=1,2");
    render(<ComparativoView />);
    await tarjeta("Centro");
    expect(screen.getByRole("link", { name: "General" })).toHaveAttribute(
      "href",
      "/dashboard?periodo=semana",
    );
  });

  it("muestra el error y permite reintentar", async () => {
    mocks.consultarComparativo.mockResolvedValue({
      error: "No pudimos cargar el dashboard",
      motivo: "error",
    });
    render(<ComparativoView />);
    expect(await screen.findByText("No pudimos cargar el dashboard")).toBeInTheDocument();

    mocks.consultarComparativo.mockResolvedValue({ sucursales });
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await tarjeta("Centro")).toBeTruthy();
  });

  it("si el backend niega el acceso no muestra datos", async () => {
    mocks.consultarComparativo.mockResolvedValue({
      error: "No tenés acceso al dashboard de ventas.",
      motivo: "sin-acceso",
    });
    render(<ComparativoView />);
    expect(
      await screen.findByText("No tenés acceso al dashboard de ventas."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Promedio de ventas (referencia)")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
  });
});
