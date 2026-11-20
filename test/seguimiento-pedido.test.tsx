import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelarPedidoLlevar,
  obtenerSeguimiento,
} from "@/app/actions/pedidos";
import { SeguimientoPedido } from "@/components/pedidos/seguimiento-pedido";
import type { PedidoSeguimiento } from "@/lib/seguimiento";

vi.mock("@/app/actions/pedidos", () => ({
  cancelarPedidoLlevar: vi.fn(),
  obtenerSeguimiento: vi.fn(),
}));

const recibido: PedidoSeguimiento = {
  pedidoId: 121,
  numero: "S1-000121",
  estado: "RECIBIDO",
  sucursal: "Centro",
  nombreCliente: "Ana López",
  total: 17.98,
  creadoEn: "2026-11-14T18:00:00.000Z",
  pago: "CONFIRMADO",
  items: [
    {
      itemId: 1,
      platilloId: 10,
      nombre: "Hamburguesa",
      cantidad: 2,
      precioUnitario: 8.99,
      nota: "sin cebolla",
      estado: "PENDIENTE",
    },
  ],
};
const cancelado = { pedidoId: 121, estado: "CANCELADO", pago: "REEMBOLSADO" };

const montar = (pedido: PedidoSeguimiento = recibido) =>
  render(<SeguimientoPedido inicial={pedido} />);
const abrirConfirmacion = () =>
  fireEvent.click(screen.getByRole("button", { name: "Cancelar pedido" }));

beforeEach(() => {
  vi.mocked(cancelarPedidoLlevar).mockReset();
  vi.mocked(obtenerSeguimiento).mockReset();
});

describe("SeguimientoPedido", () => {
  it("muestra número, estado, sucursal, platillos y total", () => {
    montar();
    expect(screen.getByText("S1-000121")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Recibido");
    expect(screen.getByText("Centro")).toBeVisible();
    expect(screen.getByText("2 × Hamburguesa")).toBeVisible();
    expect(screen.getByText("sin cebolla")).toBeVisible();
    expect(screen.getByText("Total $17.98")).toBeVisible();
  });

  it("avisa que falta el pago cuando está pendiente", () => {
    montar({ ...recibido, estado: "PENDIENTE_PAGO", numero: null, pago: null });
    expect(screen.getByRole("heading", { name: "#121" })).toBeVisible();
    expect(screen.getByText("ID de pedido")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Pendiente de pago");
    expect(
      screen.getByText("Tu pedido llegará a cocina cuando se confirme tu pago."),
    ).toBeVisible();
  });

  it.each(["CONFIRMADO", "REEMBOLSADO"])("actualiza el seguimiento y detiene el sondeo al recibir %s", async (pago) => {
    vi.useFakeTimers();
    try {
      vi.mocked(obtenerSeguimiento).mockResolvedValue({
        ok: true, datos: { ...recibido, pago, comprobanteId: 24 },
      });
      const vista = montar({ ...recibido, estado: "PENDIENTE_PAGO", numero: null, pago: "PENDIENTE" });
      expect(screen.getByRole("heading", { name: "#121" })).toBeVisible();
      await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
      expect(obtenerSeguimiento).toHaveBeenCalledWith(121);
      expect(screen.getByRole("heading", { name: "S1-000121" })).toBeVisible();
      expect(screen.getByRole("button", { name: "Descargar comprobante PDF" })).toBeVisible();
      await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
      expect(obtenerSeguimiento).toHaveBeenCalledOnce();
      vista.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it.each(["PENDIENTE_PAGO", "EN_PREPARACION", "LISTO", "CANCELADO"])(
    "no ofrece cancelar en estado %s",
    (estado) => {
      montar({ ...recibido, estado });
      expect(
        screen.queryByRole("button", { name: "Cancelar pedido" }),
      ).not.toBeInTheDocument();
    },
  );

  it("pide confirmación y permite volver sin cancelar", () => {
    montar();
    abrirConfirmacion();
    expect(screen.getByText(/¿Seguro que quieres cancelar tu pedido\?/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "No, mantener pedido" }));
    expect(cancelarPedidoLlevar).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Cancelar pedido" })).toBeVisible();
  });

  it("al confirmar muestra Cancelado y Pago reembolsado", async () => {
    vi.mocked(cancelarPedidoLlevar).mockResolvedValue({ ok: true, datos: cancelado });
    montar();
    abrirConfirmacion();
    fireEvent.click(screen.getByRole("button", { name: "Sí, cancelar pedido" }));
    expect(await screen.findByText("Pago reembolsado")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Cancelado");
    expect(cancelarPedidoLlevar).toHaveBeenCalledWith(121);
    expect(
      screen.queryByRole("button", { name: "Cancelar pedido" }),
    ).not.toBeInTheDocument();
  });

  it("el 409 muestra el mensaje y refresca el estado real", async () => {
    vi.mocked(cancelarPedidoLlevar).mockResolvedValue({
      ok: false,
      error: "Tu pedido ya está en preparación y no se puede cancelar.",
      estado: 409,
    });
    vi.mocked(obtenerSeguimiento).mockResolvedValue({
      ok: true,
      datos: { ...recibido, estado: "EN_PREPARACION" },
    });
    montar();
    abrirConfirmacion();
    fireEvent.click(screen.getByRole("button", { name: "Sí, cancelar pedido" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Tu pedido ya está en preparación y no se puede cancelar.",
    );
    expect(await screen.findByText("En preparación", { selector: "[role=status]" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Cancelar pedido" }),
    ).not.toBeInTheDocument();
  });

  it("muestra la carga y evita cancelar dos veces", async () => {
    let resolver!: (r: Awaited<ReturnType<typeof cancelarPedidoLlevar>>) => void;
    vi.mocked(cancelarPedidoLlevar).mockImplementation(
      () => new Promise((r) => { resolver = r; }),
    );
    montar();
    abrirConfirmacion();
    const boton = screen.getByRole("button", { name: "Sí, cancelar pedido" });
    fireEvent.click(boton);
    fireEvent.click(boton);
    expect(cancelarPedidoLlevar).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Cancelando…" })).toBeDisabled();
    await act(async () => resolver({ ok: true, datos: cancelado }));
    expect(screen.getByRole("status")).toHaveTextContent("Cancelado");
  });

  it("un rechazo de red muestra el error y deja reintentar", async () => {
    vi.mocked(cancelarPedidoLlevar).mockRejectedValue(new TypeError("Failed to fetch"));
    montar();
    abrirConfirmacion();
    fireEvent.click(screen.getByRole("button", { name: "Sí, cancelar pedido" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos completar la operación. Intenta de nuevo.",
    );
    expect(screen.getByRole("button", { name: "Cancelar pedido" })).toBeEnabled();
  });

  it("ante sesión vencida ofrece iniciar sesión", async () => {
    vi.mocked(cancelarPedidoLlevar).mockResolvedValue({
      ok: false,
      error: "Tu sesión expiró. Inicia sesión de nuevo.",
      sinSesion: true,
    });
    montar();
    abrirConfirmacion();
    fireEvent.click(screen.getByRole("button", { name: "Sí, cancelar pedido" }));
    expect(
      await screen.findByRole("link", { name: "Iniciar sesión para continuar" }),
    ).toHaveAttribute("href", "/login");
  });

  it("actualiza el estado desde el servidor", async () => {
    vi.mocked(obtenerSeguimiento).mockResolvedValue({
      ok: true,
      datos: { ...recibido, estado: "LISTO" },
    });
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Actualizar estado" }));
    expect(await screen.findByText("Listo", { selector: "[role=status]" })).toBeVisible();
    expect(obtenerSeguimiento).toHaveBeenCalledWith(121);
  });
});