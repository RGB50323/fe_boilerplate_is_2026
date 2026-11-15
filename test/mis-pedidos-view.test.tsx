import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listarMisPedidos } from "@/app/actions/pedidos";
import { MisPedidosView } from "@/components/pedidos/mis-pedidos-view";
import type { PedidoResumen } from "@/lib/seguimiento";

vi.mock("@/app/actions/pedidos", () => ({ listarMisPedidos: vi.fn() }));

const pedido: PedidoResumen = {
  pedidoId: 121,
  numero: "S1-000121",
  estado: "RECIBIDO",
  sucursal: "Centro",
  total: 17.98,
  creadoEn: "2026-11-14T18:00:00.000Z",
};
const pagina = (
  datos: PedidoResumen[],
  extra: { pagina?: number; totalPaginas?: number; total?: number } = {},
) => ({
  ok: true as const,
  datos: { datos, pagina: 1, totalPaginas: 1, total: datos.length, ...extra },
});

beforeEach(() => {
  vi.mocked(listarMisPedidos).mockReset();
});

describe("MisPedidosView", () => {
  it("muestra carga y después la lista con enlace al seguimiento", async () => {
    let resolver!: (r: Awaited<ReturnType<typeof listarMisPedidos>>) => void;
    vi.mocked(listarMisPedidos).mockImplementation(
      () => new Promise((r) => { resolver = r; }),
    );
    render(<MisPedidosView />);
    expect(screen.getByText("Cargando tus pedidos…")).toBeVisible();
    await act(async () => resolver(pagina([pedido])));
    expect(screen.getByRole("link", { name: /S1-000121/ })).toHaveAttribute(
      "href",
      "/pedidos/121",
    );
    expect(screen.getByText("Recibido")).toBeVisible();
    expect(screen.getByText("$17.98")).toBeVisible();
  });

  it("identifica por id un pedido que aún no tiene número", async () => {
    vi.mocked(listarMisPedidos).mockResolvedValue(
      pagina([{ ...pedido, pedidoId: 7, numero: null, estado: "PENDIENTE_PAGO" }]),
    );
    render(<MisPedidosView />);
    expect(await screen.findByText("Pedido #7")).toBeVisible();
    expect(screen.getByText("Pendiente de pago")).toBeVisible();
  });

  it("invita a pedir cuando no hay pedidos", async () => {
    vi.mocked(listarMisPedidos).mockResolvedValue(pagina([], { totalPaginas: 0 }));
    render(<MisPedidosView />);
    expect(await screen.findByRole("link", { name: "Ver el menú" })).toHaveAttribute(
      "href",
      "/menu",
    );
  });

  it("una sesión vencida lleva a iniciar sesión", async () => {
    vi.mocked(listarMisPedidos).mockResolvedValue({
      ok: false,
      error: "Tu sesión expiró. Inicia sesión de nuevo.",
      sinSesion: true,
    });
    render(<MisPedidosView />);
    expect(await screen.findByRole("link", { name: "Iniciar sesión" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("un error del servidor permite reintentar", async () => {
    vi.mocked(listarMisPedidos)
      .mockResolvedValueOnce({ ok: false, error: "No pudimos completar la operación." })
      .mockResolvedValueOnce(pagina([pedido]));
    render(<MisPedidosView />);
    fireEvent.click(await screen.findByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("S1-000121")).toBeVisible();
    expect(listarMisPedidos).toHaveBeenCalledTimes(2);
  });

  it("un rechazo de red muestra Reintentar y se recupera", async () => {
    vi.mocked(listarMisPedidos)
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(pagina([pedido]));
    render(<MisPedidosView />);
    fireEvent.click(await screen.findByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("S1-000121")).toBeVisible();
  });

  it("cambia de página con la paginación común", async () => {
    vi.mocked(listarMisPedidos)
      .mockResolvedValueOnce(pagina([pedido], { total: 11, totalPaginas: 2 }))
      .mockResolvedValueOnce(
        pagina([{ ...pedido, pedidoId: 122, numero: "S1-000122" }], {
          pagina: 2,
          total: 11,
          totalPaginas: 2,
        }),
      );
    render(<MisPedidosView />);
    fireEvent.click(await screen.findByRole("button", { name: "Página siguiente" }));
    expect(await screen.findByText("S1-000122")).toBeVisible();
    expect(listarMisPedidos).toHaveBeenLastCalledWith(2);
  });
});