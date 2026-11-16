import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TableroCocina } from "@/app/cocina/tablero-cocina";
import type { MarcarListoResultado, PedidosCocinaResultado } from "@/app/actions/cocina";
import { crearPedido, crearSocketFalso, type SocketFalso } from "./cocina-helpers";

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn() },
  listar: vi.fn<() => Promise<PedidosCocinaResultado>>(),
  marcar: vi.fn<(itemId: number) => Promise<MarcarListoResultado>>(),
  logout: vi.fn(async () => {}),
  io: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("@/app/actions/cocina", () => ({
  listarPedidosCocina: mocks.listar,
  marcarItemListo: mocks.marcar,
}));
vi.mock("@/app/actions/auth", () => ({ logout: mocks.logout }));
vi.mock("socket.io-client", () => ({ io: mocks.io }));
vi.mock("@/components/notificaciones/campana-notificaciones", () => ({
  CampanaNotificaciones: () => null,
}));

let socket: SocketFalso;

const PEDIDO = crearPedido({
  id: 120,
  numero: "SI-000120",
  destino: "Mesa 7",
  mesaNumero: 7,
  items: [
    { id: 301, platillo: "Pupusa revuelta", cantidad: 3, nota: "bien doradas", estado: "PENDIENTE" },
    { id: 302, platillo: "Limonada natural", cantidad: 2, nota: null, estado: "PENDIENTE" },
  ],
});

const PEDIDO_CON_PUPUSA_LISTA = {
  ...PEDIDO,
  items: [{ ...PEDIDO.items[0], estado: "LISTO" as const, listoEn: "12:17" }, PEDIDO.items[1]],
};

const OTRO = crearPedido({ id: 121, numero: "SI-000121", creadoEn: "2026-11-06T15:10:00.000Z" });

function diferido<T>() {
  let resolver!: (valor: T) => void;
  const promesa = new Promise<T>((r) => {
    resolver = r;
  });
  return { promesa, resolver };
}

async function vaciar() {
  await act(() => vi.advanceTimersByTimeAsync(0));
}

async function montar(pedidos = [PEDIDO, OTRO]) {
  mocks.listar.mockResolvedValue({ pedidos });
  render(<TableroCocina socketUrl="http://localhost:3000/cocina" token="token-123" sucursal="Centro" />);
  await act(async () => {
    socket.emitir("connect");
    await vi.advanceTimersByTimeAsync(0);
  });
}

const tarjeta = () => screen.getByRole("article", { name: "Pedido SI-000120, Mesa 7" });
const fila = (platillo: RegExp) => within(tarjeta()).getByText(platillo).closest("li")!;
const botonPupusa = () => screen.getByRole("button", { name: "Marcar 3 × Pupusa revuelta como listo" });

async function pulsar(boton: HTMLElement) {
  fireEvent.click(boton);
  await vaciar();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-06T15:30:00.000Z"));
  socket = crearSocketFalso();
  mocks.io.mockReset().mockReturnValue(socket);
  mocks.listar.mockReset();
  mocks.marcar.mockReset();
  mocks.logout.mockClear();
  mocks.router.replace.mockReset();
});

describe("acción Listo en el tablero de cocina (FE-7.1)", () => {
  it("muestra un botón Listo de al menos 44 px por cada platillo pendiente", async () => {
    await montar();
    const botones = within(tarjeta()).getAllByRole("button", { name: /como listo$/ });
    expect(botones).toHaveLength(2);
    expect(botonPupusa()).toHaveTextContent("Listo");
    expect(botonPupusa().className).toMatch(/\bmin-h-11\b/);
  });

  it("deshabilita el botón mientras la solicitud está en curso", async () => {
    const { promesa, resolver } = diferido<MarcarListoResultado>();
    mocks.marcar.mockReturnValue(promesa);
    await montar();

    await pulsar(botonPupusa());
    expect(botonPupusa()).toBeDisabled();
    expect(botonPupusa()).toHaveAttribute("aria-busy", "true");
    fireEvent.click(botonPupusa());
    expect(mocks.marcar).toHaveBeenCalledTimes(1);
    expect(mocks.marcar).toHaveBeenCalledWith(301);

    await act(async () => {
      resolver({ item: { itemId: 301, pedidoId: 120, listoEn: "12:18", pedidoEstado: "EN_PREPARACION" } });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(within(tarjeta()).queryByRole("button", { name: /Pupusa revuelta/ })).not.toBeInTheDocument();
  });

  it("éxito: tacha el platillo, muestra la hora y ya no se puede volver a pulsar", async () => {
    mocks.marcar.mockResolvedValue({
      item: { itemId: 301, pedidoId: 120, listoEn: "12:18", pedidoEstado: "EN_PREPARACION" },
    });
    await montar();

    await pulsar(botonPupusa());

    const item = fila(/Pupusa revuelta/);
    expect(item).toHaveAttribute("data-estado", "LISTO");
    expect(within(item).getByText(/Pupusa revuelta/)).toHaveClass("line-through");
    expect(within(item).getByText(/^Listo/)).toHaveTextContent("Listo 12:18");
    expect(within(item).queryByRole("button")).not.toBeInTheDocument();
    expect(fila(/Limonada natural/)).toHaveAttribute("data-estado", "PENDIENTE");
    expect(screen.getByText("2 pedidos pendientes")).toBeInTheDocument();
    expect(screen.queryByText(/No pudimos/)).not.toBeInTheDocument();
  });

  it("éxito con pedido completo: la tarjeta sale del tablero y avisa", async () => {
    mocks.marcar.mockResolvedValue({
      item: { itemId: 301, pedidoId: 120, listoEn: "2026-11-06T15:18:00.000Z", pedidoEstado: "LISTO" },
    });
    await montar();

    await pulsar(botonPupusa());

    expect(screen.queryByRole("article", { name: /SI-000120/ })).not.toBeInTheDocument();
    expect(screen.getByRole("article", { name: /SI-000121/ })).toBeInTheDocument();
    expect(screen.getByText("Pedido SI-000120 listo para entregar")).toBeInTheDocument();
    expect(screen.getByText("1 pedido pendiente")).toBeInTheDocument();

    socket.emitir("pedido.listo", { pedidoId: 120 });
    await vaciar();
    expect(screen.getAllByText("Pedido SI-000120 listo para entregar")).toHaveLength(1);
  });

  it("409: no muestra error, deja el platillo listo y refresca el tablero", async () => {
    mocks.marcar.mockResolvedValue({ yaListo: true });
    await montar();
    mocks.listar.mockResolvedValue({ pedidos: [PEDIDO_CON_PUPUSA_LISTA, OTRO] });
    const consultas = mocks.listar.mock.calls.length;

    await pulsar(botonPupusa());

    expect(fila(/Pupusa revuelta/)).toHaveAttribute("data-estado", "LISTO");
    expect(within(fila(/Pupusa revuelta/)).queryByRole("button")).not.toBeInTheDocument();
    expect(mocks.listar).toHaveBeenCalledTimes(consultas + 1);
    expect(within(fila(/Pupusa revuelta/)).getByText(/^Listo/)).toHaveTextContent("Listo 12:17");
    expect(screen.queryByText(/No pudimos/)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Este platillo ya fue marcado como listo")).toBeInTheDocument();
  });

  it("error genérico: mensaje breve y el botón vuelve a habilitarse", async () => {
    mocks.marcar.mockResolvedValue({ error: "No pudimos marcar el platillo. Intenta de nuevo" });
    await montar();

    await pulsar(botonPupusa());

    expect(screen.getByText("No pudimos marcar el platillo. Intenta de nuevo")).toBeInTheDocument();
    expect(botonPupusa()).toBeEnabled();
    expect(fila(/Pupusa revuelta/)).toHaveAttribute("data-estado", "PENDIENTE");

    await act(() => vi.advanceTimersByTimeAsync(6_000));
    expect(screen.queryByText(/No pudimos marcar/)).not.toBeInTheDocument();
  });

  it("error de red al llamar a la acción: mensaje breve y el botón vuelve a habilitarse", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.marcar.mockRejectedValue(new TypeError("Failed to fetch"));
    await montar();

    await pulsar(botonPupusa());

    expect(screen.getByText("No pudimos marcar el platillo. Intenta de nuevo")).toBeInTheDocument();
    expect(botonPupusa()).toBeEnabled();
  });

  it("403 y 404 muestran su mensaje sin bloquear el tablero", async () => {
    mocks.marcar
      .mockResolvedValueOnce({ error: "No tienes permiso para marcar este platillo." })
      .mockResolvedValueOnce({ error: "Este platillo ya no existe en la comanda." });
    await montar();

    await pulsar(botonPupusa());
    await pulsar(botonPupusa());

    expect(screen.getByText("No tienes permiso para marcar este platillo.")).toBeInTheDocument();
    expect(screen.getByText("Este platillo ya no existe en la comanda.")).toBeInTheDocument();
    expect(botonPupusa()).toBeEnabled();
  });

  it("401: cierra la sesión y va al login", async () => {
    mocks.marcar.mockResolvedValue({ sinSesion: true });
    await montar();

    await pulsar(botonPupusa());

    expect(mocks.logout).toHaveBeenCalledTimes(1);
    expect(mocks.router.replace).toHaveBeenCalledWith("/login");
  });

  it("aplica item:listo de otro cocinero aunque la solicitud propia siga en curso, sin duplicar", async () => {
    const { promesa, resolver } = diferido<MarcarListoResultado>();
    mocks.marcar.mockReturnValue(promesa);
    await montar();
    mocks.listar.mockResolvedValue({ pedidos: [PEDIDO_CON_PUPUSA_LISTA, OTRO] });

    await pulsar(botonPupusa());
    act(() => {
      socket.emitir("item:listo", { ...PEDIDO_CON_PUPUSA_LISTA, items: [{ ...PEDIDO_CON_PUPUSA_LISTA.items[0], listoEn: undefined }, PEDIDO.items[1]] });
    });
    expect(fila(/Pupusa revuelta/)).toHaveAttribute("data-estado", "LISTO");
    expect(within(fila(/Pupusa revuelta/)).queryByRole("button")).not.toBeInTheDocument();

    await act(async () => {
      resolver({ yaListo: true });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(within(tarjeta()).getAllByRole("listitem")).toHaveLength(2);
    expect(within(fila(/Pupusa revuelta/)).getByText(/^Listo/)).toHaveTextContent("Listo 12:17");
  });

  it("pedido:listo por WebSocket quita la tarjeta", async () => {
    await montar();
    act(() => socket.emitir("pedido:listo", { ...PEDIDO, items: PEDIDO.items.map((i) => ({ ...i, estado: "LISTO" as const })) }));
    expect(screen.queryByRole("article", { name: /SI-000120/ })).not.toBeInTheDocument();
    expect(screen.getByText("Pedido SI-000120 listo para entregar")).toBeInTheDocument();
  });
});
