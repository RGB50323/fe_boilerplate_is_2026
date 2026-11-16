import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TableroCocina } from "@/app/cocina/tablero-cocina";
import type { PedidosCocinaResultado } from "@/app/actions/cocina";
import {
  crearPedido,
  crearSocketFalso,
  rechazarHandshake,
  type SocketFalso,
} from "./cocina-helpers";

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn() },
  listar: vi.fn<() => Promise<PedidosCocinaResultado>>(),
  logout: vi.fn(async () => {}),
  io: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("@/app/actions/cocina", () => ({ listarPedidosCocina: mocks.listar }));
vi.mock("@/app/actions/auth", () => ({ logout: mocks.logout }));
vi.mock("socket.io-client", () => ({ io: mocks.io }));
vi.mock("@/components/notificaciones/campana-notificaciones", () => ({
  CampanaNotificaciones: () => null,
}));

let socket: SocketFalso;

function montar() {
  return render(
    <TableroCocina
      socketUrl="http://localhost:3000/cocina"
      token="token-123"
      sucursal="Centro"
    />,
  );
}

async function conectar() {
  await act(async () => {
    socket.emitir("connect");
    await vi.advanceTimersByTimeAsync(0);
  });
}

function tarjetas() {
  return within(screen.getByRole("list", { name: "Comandas en orden de llegada" }))
    .getAllByRole("article")
    .map((tarjeta) => tarjeta.getAttribute("aria-label"));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-06T15:30:00.000Z"));
  socket = crearSocketFalso();
  mocks.io.mockReset().mockReturnValue(socket);
  mocks.listar.mockReset();
  mocks.logout.mockClear();
  mocks.router.replace.mockReset();
});

describe("tablero de cocina", () => {
  it("abre el socket del namespace con el token y lo cierra al desmontar", async () => {
    mocks.listar.mockResolvedValue({ pedidos: [] });
    const { unmount } = montar();

    expect(mocks.io).toHaveBeenCalledWith(
      "http://localhost:3000/cocina",
      expect.objectContaining({ auth: { token: "token-123" }, transports: ["websocket"] }),
    );
    expect(socket.conexiones).toBe(1);
    unmount();
    expect(socket.desconexiones).toBe(1);
  });

  it("muestra las comandas en orden de llegada con número, destino, hora, platillos y notas", async () => {
    mocks.listar.mockResolvedValue({
      pedidos: [
        crearPedido({ id: 2, numero: "C-0002", tipo: "LLEVAR", destino: "Para llevar", mesaNumero: null, creadoEn: new Date(2026, 10, 6, 9, 21).toISOString(), minutosEspera: 9 }),
        crearPedido({
          id: 1,
          numero: "C-0001",
          destino: "Mesa 3",
          mesaNumero: 3,
          creadoEn: new Date(2026, 10, 6, 9, 8).toISOString(),
          minutosEspera: 12,
          items: [
            { id: 1, platillo: "Pupusa revuelta", cantidad: 2, nota: "sin curtido", estado: "PENDIENTE" },
            { id: 2, platillo: "Tamal de elote", cantidad: 1, nota: null, estado: "LISTO" },
          ],
        }),
      ],
    });
    montar();
    expect(screen.getByText("Cargando pedidos...")).toBeInTheDocument();
    await conectar();

    expect(tarjetas()).toEqual(["Pedido C-0001, Mesa 3", "Pedido C-0002, Para llevar"]);
    const primera = screen.getByRole("article", { name: "Pedido C-0001, Mesa 3" });
    expect(within(primera).getByText("09:08")).toBeInTheDocument();
    expect(within(primera).getByText(/12 min/)).toBeInTheDocument();
    expect(within(primera).getByText(/Pupusa revuelta/)).toBeInTheDocument();
    expect(within(primera).getByText("sin curtido")).toBeInTheDocument();
    expect(within(primera).getByText(/Tamal de elote/).closest("li")).toHaveAttribute("data-estado", "LISTO");
    expect(screen.getByText(/Para llevar · llegó/)).toBeInTheDocument();
    expect(screen.getByText("2 pedidos pendientes")).toBeInTheDocument();
    expect(screen.getByText("en vivo")).toBeInTheDocument();
  });

  it("agrega al final un pedido nuevo sin recargar y lo avisa", async () => {
    mocks.listar.mockResolvedValue({ pedidos: [crearPedido({ id: 1, numero: "C-0001" })] });
    montar();
    await conectar();

    act(() => {
      socket.emitir("pedido:nuevo", crearPedido({ id: 9, numero: "C-0009", destino: "Mesa 4", creadoEn: "2026-11-06T15:29:00.000Z" }));
    });
    expect(tarjetas()).toEqual(["Pedido C-0001, Mesa 1", "Pedido C-0009, Mesa 4"]);
    expect(screen.getByText("Nuevo pedido C-0009 · Mesa 4")).toBeInTheDocument();

    act(() => socket.emitir("pedido:retirado", { id: 1 }));
    expect(tarjetas()).toEqual(["Pedido C-0009, Mesa 4"]);
  });

  it("resalta una comanda al cruzar los 15 min", async () => {
    mocks.listar.mockResolvedValue({ pedidos: [crearPedido({ id: 1, numero: "C-0001", minutosEspera: 15 })] });
    montar();
    await conectar();

    const tarjeta = () => screen.getByRole("article");
    expect(tarjeta()).toHaveAttribute("data-retrasado", "false");

    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(tarjeta()).toHaveAttribute("data-retrasado", "true");
    expect(tarjeta()).toHaveAccessibleName("Pedido C-0001, Mesa 1, retrasado");
    expect(screen.getByText("Pedido con más de 15 min de espera: C-0001 · Mesa 1")).toBeInTheDocument();
  });

  it("marca como Nuevo un platillo agregado a un pedido del tablero", async () => {
    mocks.listar.mockResolvedValue({ pedidos: [crearPedido({ id: 1 })] });
    montar();
    await conectar();

    act(() => {
      socket.emitir(
        "pedido:actualizado",
        crearPedido({
          id: 1,
          items: [
            { id: 10, platillo: "Pupusa revuelta", cantidad: 2, nota: null, estado: "PENDIENTE" },
            { id: 11, platillo: "Horchata", cantidad: 1, nota: null, estado: "PENDIENTE" },
          ],
        }),
      );
    });
    const item = screen.getByText(/Horchata/).closest("li")!;
    expect(within(item).getByText("Nuevo")).toBeInTheDocument();
  });

  it("muestra el estado vacío", async () => {
    mocks.listar.mockResolvedValue({ pedidos: [] });
    montar();
    await conectar();
    expect(screen.getByText("No hay pedidos pendientes")).toBeInTheDocument();
    expect(screen.getByText("Los pedidos nuevos aparecerán aquí automáticamente")).toBeInTheDocument();
  });

  it("muestra error con reintentar", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.listar
      .mockResolvedValueOnce({ error: "No pudimos cargar los pedidos" })
      .mockResolvedValue({ pedidos: [crearPedido({ id: 1, numero: "C-0001" })] });
    montar();
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos cargar los pedidos");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(tarjetas()).toEqual(["Pedido C-0001, Mesa 1"]);
  });

  it("muestra Reconectando al perder la conexión", async () => {
    mocks.listar.mockResolvedValue({ pedidos: [] });
    montar();
    await conectar();

    act(() => socket.emitir("disconnect", "transport close"));
    expect(screen.getByText("reconectando…")).toBeInTheDocument();
    expect(screen.getByText("Reconectando… el tablero se actualizará al volver")).toBeInTheDocument();
  });

  it("cierra la sesión y va al login si el socket rechaza el token", async () => {
    mocks.listar.mockResolvedValue({ pedidos: [] });
    montar();

    await act(async () => {
      rechazarHandshake(socket, "Token de acceso inválido o expirado.");
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(mocks.logout).toHaveBeenCalledTimes(1);
    expect(mocks.router.replace).toHaveBeenCalledWith("/login");
  });

  it("cierra la sesión si el HTTP responde 401", async () => {
    mocks.listar.mockResolvedValue({ sinSesion: true });
    montar();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(mocks.logout).toHaveBeenCalledTimes(1);
    expect(mocks.router.replace).toHaveBeenCalledWith("/login");
  });

  it("explica el motivo si el usuario no tiene sucursal", async () => {
    mocks.listar.mockResolvedValue({ sinAcceso: "El usuario no tiene una sucursal asignada." });
    montar();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByRole("alert")).toHaveTextContent("El usuario no tiene una sucursal asignada.");
    expect(mocks.logout).not.toHaveBeenCalled();
  });
});
