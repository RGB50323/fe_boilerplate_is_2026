import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ComparativoView } from "@/app/dashboard/comparativo/comparativo-view";
import { motivoSinAcceso } from "@/lib/dashboard-acceso";
import { ROL_GERENTE_GENERAL } from "@/lib/session";

// Suite de componente de la historia H29 (plan de pruebas).
// las ventas, los pedidos y el ticket vienen calculados por el backend.

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn(), push: vi.fn(), refresh: vi.fn() },
  params: { current: new URLSearchParams() },
  consultarComparativo: vi.fn(),
  getUsuarioActual: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
  useSearchParams: () => mocks.params.current,
}));
vi.mock("next/font/google", () => ({ Fraunces: () => ({ className: "font-test" }) }));
vi.mock("@/app/actions/dashboard", () => ({
  consultarComparativo: mocks.consultarComparativo,
}));
vi.mock("@/app/actions/auth", () => ({ logout: vi.fn() }));
vi.mock("@/components/notificaciones/campana-notificaciones", () => ({
  CampanaNotificaciones: () => null,
}));
vi.mock("@/lib/session", async (original) => ({
  ...(await original<typeof import("@/lib/session")>()),
  getUsuarioActual: mocks.getUsuarioActual,
}));

const sucursalesBackend = [
  { id: 1, nombre: "Centro" },
  { id: 2, nombre: "Escalón" },
  { id: 3, nombre: "Santa Tecla" },
];

// Respuesta de GET /dashboard/ventas (H28): el ticket ya viene calculado.
const ventas = [
  { sucursalId: 1, nombre: "Centro", ventas: 8120, pedidos: 640, ticketPromedio: 12.69 },
  { sucursalId: 2, nombre: "Escalón", ventas: 4310.25, pedidos: 330, ticketPromedio: 13.06 },
  { sucursalId: 3, nombre: "Santa Tecla", ventas: 2800.25, pedidos: 210, ticketPromedio: 13.33 },
];

const tarjeta = async (nombre: string) =>
  within((await screen.findByRole("heading", { level: 3, name: nombre })).closest("li")!);

const valorDe = (t: ReturnType<typeof within>, etiqueta: string) =>
  t.getByText(etiqueta).nextElementSibling?.textContent;

function abrir(query = "") {
  mocks.params.current = new URLSearchParams(query);
  return render(<ComparativoView sucursales={sucursalesBackend} />);
}

describe("H29. Comparativo de desempeño entre sucursales", () => {
  beforeEach(() => {
    mocks.router.replace.mockClear();
    mocks.consultarComparativo.mockReset().mockResolvedValue({ sucursales: ventas });
    mocks.getUsuarioActual.mockReset();
  });

  it("AC1: muestra lado a lado las ventas, los pedidos y el ticket de cada sucursal para el periodo elegido", async () => {
    abrir("periodo=rango&desde=2026-10-01&hasta=2026-10-31");
    const centro = await tarjeta("Centro");

    expect(mocks.consultarComparativo).toHaveBeenCalledWith({
      periodo: "rango",
      desde: "2026-10-01",
      hasta: "2026-10-31",
    });
    expect(centro.getByText("$8,120.00")).toBeInTheDocument();
    expect(valorDe(centro, "Pedidos")).toBe("640");
    expect(valorDe(centro, "Ticket promedio")).toBe("$12.69");
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
  });

  it("AC2: usa las ventas, los pedidos y el ticket tal como los calcula el dashboard de H28", async () => {
    abrir();
    for (const v of ventas) {
      const t = await tarjeta(v.nombre);
      expect(valorDe(t, "Pedidos")).toBe(String(v.pedidos));
      expect(valorDe(t, "Ticket promedio")).toBe(`$${v.ticketPromedio.toFixed(2)}`);
    }
  });

  it("AC3: por defecto compara todas; si se eligen algunas, solo muestra y compara esas", async () => {
    const { unmount } = abrir();
    await tarjeta("Centro");
    for (const s of sucursalesBackend) {
      expect(screen.getByRole("checkbox", { name: s.nombre })).toBeChecked();
    }
    unmount();

    abrir("periodo=mes&sucursales=1,2");
    await tarjeta("Centro");
    expect(screen.queryByRole("heading", { level: 3, name: "Santa Tecla" })).not.toBeInTheDocument();
    expect(screen.getByText("Promedio de las 2 sucursales comparadas")).toBeInTheDocument();
  });

  it("AC4: con menos de dos sucursales pide elegir al menos dos y no genera el comparativo", () => {
    abrir("periodo=mes&sucursales=2");
    expect(screen.getByText("Selecciona al menos dos sucursales para comparar")).toBeInTheDocument();
    expect(mocks.consultarComparativo).not.toHaveBeenCalled();
    expect(screen.queryByText("Promedio de ventas (referencia)")).not.toBeInTheDocument();
  });

  it("AC5: marca “Requiere atención” a la sucursal más de 20 % por debajo del promedio, con su diferencia", async () => {
    abrir();
    const tecla = await tarjeta("Santa Tecla");
    expect(tecla.getByText("Requiere atención")).toBeInTheDocument();
    expect(valorDe(tecla, "Diferencia vs. promedio")).toBe("−44.8 %");
    expect((await tarjeta("Escalón")).queryByText("Requiere atención")).not.toBeInTheDocument();
  });

  it("AC6: si ninguna está más de 20 % por debajo, muestra “Ninguna sucursal requiere atención en este periodo”", async () => {
    mocks.consultarComparativo.mockResolvedValue({
      sucursales: ventas.map((v) => ({ ...v, ventas: 5000 })),
    });
    abrir();
    expect(
      await screen.findByText("Ninguna sucursal requiere atención en este periodo"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Requiere atención")).not.toBeInTheDocument();
  });

  it("AC7: muestra el promedio de ventas como referencia de la comparación", async () => {
    abrir();
    const promedio = (await screen.findByText("Promedio de ventas (referencia)")).parentElement!;
    expect(within(promedio).getByText("$5,076.83")).toBeInTheDocument();
    expect(within(promedio).getByText("Promedio de las 3 sucursales comparadas")).toBeInTheDocument();
  });

  it("AC8: un rango con fecha final anterior a la inicial muestra el error y no genera el comparativo", async () => {
    abrir();
    await tarjeta("Centro");
    const consultas = mocks.consultarComparativo.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Personalizado" }));
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-11-08" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-11-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(
      await screen.findByText("Rango no válido: la fecha final no puede ser anterior a la inicial."),
    ).toBeInTheDocument();
    expect(mocks.router.replace).not.toHaveBeenCalled();
    expect(mocks.consultarComparativo).toHaveBeenCalledTimes(consultas);
  });

  it("AC9: sin ventas, cada sucursal aparece en $0.00, ninguna se marca y se ve “Sin ventas en el periodo seleccionado”", async () => {
    mocks.consultarComparativo.mockResolvedValue({
      sucursales: ventas.map((v) => ({ ...v, ventas: 0, pedidos: 0, ticketPromedio: 0 })),
    });
    abrir();

    expect(await screen.findByText("Sin ventas en el periodo seleccionado")).toBeInTheDocument();
    for (const { nombre } of sucursalesBackend) {
      expect((await tarjeta(nombre)).getByText("$0.00", { selector: "p" })).toBeInTheDocument();
    }
    expect(screen.queryByText("Requiere atención")).not.toBeInTheDocument();
  });

  it("AC10: solo el gerente general tiene acceso; el gerente de sucursal y los demás roles no", async () => {
    const soloGerenteGeneral = [ROL_GERENTE_GENERAL];
    for (const rol of ["GERENTE", "CLIENTE", "MESERO", "COCINA"]) {
      mocks.getUsuarioActual.mockResolvedValue({ estado: "ok", usuario: { rol } });
      expect(await motivoSinAcceso(soloGerenteGeneral)).toBe("sin-acceso");
    }
    mocks.getUsuarioActual.mockResolvedValue({ estado: "ok", usuario: { rol: "GERENTE_GENERAL" } });
    expect(await motivoSinAcceso(soloGerenteGeneral)).toBeNull();
  });
});
