import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import CobroMesaPage from "@/app/mesero/pedidos/[id]/cobro/page";
import { listarMesas, obtenerPedido } from "@/app/actions/pedidos";
import { consultarPagoPedido } from "@/app/actions/pagos";
import { obtenerUsuarioActual } from "@/lib/usuario";

vi.mock("next/navigation", () => ({
  redirect: (ruta: string) => { throw new Error("redirect " + ruta); },
  notFound: () => { throw new Error("not found"); },
}));
vi.mock("@/app/actions/pedidos", () => ({ listarMesas: vi.fn(), obtenerPedido: vi.fn() }));
vi.mock("@/lib/usuario", () => ({ obtenerUsuarioActual: vi.fn() }));
vi.mock("@/app/actions/pagos", () => ({ consultarPago: vi.fn(), consultarPagoPedido: vi.fn(), procesarPago: vi.fn() }));

const usuario = { id: "mesero", rol: "MESERO", sucursalId: 1, email: "mesero@example.test" };
const abrir = (id = "87") => CobroMesaPage({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  vi.mocked(obtenerUsuarioActual).mockResolvedValue(usuario);
  vi.mocked(consultarPagoPedido).mockResolvedValue({ ok: true, datos: null });
});

it("redirige al login sin sesión y al menú si el rol no es mesero", async () => {
  vi.mocked(obtenerUsuarioActual).mockResolvedValueOnce(null)
    .mockResolvedValueOnce({ ...usuario, rol: "CLIENTE" })
    .mockResolvedValueOnce({ ...usuario, sucursalId: null });
  await expect(abrir()).rejects.toThrow("redirect /login");
  await expect(abrir()).rejects.toThrow("redirect /menu");
  await expect(abrir()).rejects.toThrow("redirect /menu");
  expect(obtenerPedido).not.toHaveBeenCalled();
  expect(consultarPagoPedido).not.toHaveBeenCalled();
});

it("valida el ID y rechaza pedidos sin mesa", async () => {
  await expect(abrir("87e0")).rejects.toThrow("not found");
  vi.mocked(obtenerPedido).mockResolvedValue({ ok: true, datos: {
    pedidoId: 87, mesaId: null, creadoEn: "", numero: null, estado: "PENDIENTE_PAGO", total: 5, items: [],
  } });
  await expect(abrir()).rejects.toThrow("not found");
});

it("carga el pedido por ID y muestra la mesa y su total", async () => {
  vi.mocked(obtenerPedido).mockResolvedValue({ ok: true, datos: {
    pedidoId: 87, mesaId: 12, creadoEn: "", numero: null, estado: "ENTREGADO", total: 5, items: [],
  } });
  vi.mocked(listarMesas).mockResolvedValue({ ok: true, datos: [{
    id: 12, numero: 4, capacidad: 4, zona: "Terraza", activa: true, pedidoAbiertoId: null,
  }] });
  render(await abrir());
  expect(obtenerPedido).toHaveBeenCalledWith(87);
  expect(consultarPagoPedido).toHaveBeenCalledWith(87);
  expect(listarMesas).toHaveBeenCalledWith(1);
  expect(screen.getByText("Mesa 4 · Pedido #87")).toBeVisible();
  expect(screen.getByText("Total $5.00")).toBeVisible();
});
