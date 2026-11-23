import { act, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { procesarPago, consultarPago } from "@/app/actions/pagos";
import { PedidosPendientesDeCobro } from "@/app/mesero/entregas/pedidos-pendientes-de-cobro";
import { llamar } from "@/lib/api";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/api", () => ({ llamar: vi.fn() }));
const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

it("enlaza el pedido sin pago al cobro existente y ofrece solo consulta con un pago activo", async () => {
  vi.mocked(llamar).mockResolvedValueOnce({
    ok: true,
    datos: [
      { pedidoId: 18, numero: "S1-000018", mesa: 2, puedeCobrar: true, pagoBloqueante: null, comprobanteId: null },
      { pedidoId: 19, numero: null, mesa: 3, puedeCobrar: false, pagoBloqueante: "PENDIENTE", comprobanteId: null },
      { pedidoId: 20, numero: null, mesa: 4, puedeCobrar: false, pagoBloqueante: null, comprobanteId: 12 },
    ],
  });
  vi.useFakeTimers();
  try {
    const { unmount } = render(await PedidosPendientesDeCobro());

    const lista = screen.getByRole("region", { name: "Pedidos pendientes de cobro" });
    expect(within(lista).getByText("Mesa 2")).toBeInTheDocument();
    expect(within(lista).getByText("S1-000018")).toBeInTheDocument();
    expect(within(lista).getByRole("link", { name: "Cobrar" })).toHaveAttribute("href", "/mesero/pedidos/18/cobro");
    expect(within(lista).getByText("Pago pendiente")).toBeInTheDocument();
    expect(within(lista).getByRole("link", { name: "Consultar pago" })).toHaveAttribute("href", "/mesero/pedidos/19/cobro");
    expect(within(lista).getByRole("link", { name: "Ver comprobante" })).toHaveAttribute("href", "/mesero/pedidos/20/cobro");

    await act(() => vi.advanceTimersByTimeAsync(4000));
    expect(router.refresh).toHaveBeenCalledTimes(1);
    unmount();
    await act(() => vi.advanceTimersByTimeAsync(4000));
    expect(router.refresh).toHaveBeenCalledTimes(1);
  } finally {
    vi.useRealTimers();
  }
});

it("invalida la lista tras confirmar efectivo y tras detectar la confirmación de una tarjeta", async () => {
  vi.mocked(revalidatePath).mockClear();
  const datos = { estado: "CONFIRMADO", transaccionId: "pago", comprobanteId: 12 };
  vi.mocked(llamar).mockResolvedValueOnce({ ok: true, datos });
  await procesarPago({
    solicitudId: "solicitud",
    ticket: { id: 18, total: 10, items: [] },
    metodo: "EFECTIVO",
    montoRecibido: "10.00",
  });
  expect(revalidatePath).toHaveBeenCalledExactlyOnceWith("/mesero/entregas");

  vi.mocked(revalidatePath).mockClear();
  vi.mocked(llamar).mockResolvedValueOnce({ ok: true, datos: { ...datos, estado: "PENDIENTE" } });
  await consultarPago("pago");
  expect(revalidatePath).not.toHaveBeenCalled();

  vi.mocked(llamar).mockResolvedValueOnce({ ok: true, datos });
  await consultarPago("pago");
  expect(revalidatePath).toHaveBeenCalledExactlyOnceWith("/mesero/entregas");

  vi.mocked(llamar).mockResolvedValueOnce({ ok: true, datos: [] });
  render(await PedidosPendientesDeCobro());
  expect(screen.queryByRole("link", { name: "Cobrar" })).not.toBeInTheDocument();
  expect(screen.getByText("No hay pedidos pendientes de cobro")).toBeInTheDocument();
});
