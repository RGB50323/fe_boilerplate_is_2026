import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EntregasView } from "@/app/mesero/entregas/entregas-view";
import type { ItemsListosResultado, MarcarEntregadoResultado } from "@/app/actions/entregas";
import type { ItemPorEntregar } from "@/lib/entregas";

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn(), refresh: vi.fn() },
  listar: vi.fn<() => Promise<ItemsListosResultado>>(),
  entregar: vi.fn<(itemId: number) => Promise<MarcarEntregadoResultado>>(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("@/app/actions/entregas", () => ({
  listarItemsListos: mocks.listar,
  marcarItemEntregado: mocks.entregar,
}));

const PUPUSA: ItemPorEntregar = { itemId: 201, pedidoId: 118, mesa: 2, platillo: "Pupusa revuelta", cantidad: 2, listoEn: "12:15" };
const TAMAL: ItemPorEntregar = { itemId: 202, pedidoId: 118, mesa: 2, platillo: "Tamal de elote", cantidad: 1, listoEn: "12:18" };
const LIMONADA: ItemPorEntregar = { itemId: 301, pedidoId: 120, mesa: 7, platillo: "Limonada natural", cantidad: 2, listoEn: "12:14" };
const ITEMS = [LIMONADA, PUPUSA, TAMAL];

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

async function montar(items: ItemPorEntregar[] = ITEMS) {
  mocks.listar.mockResolvedValue({ items });
  render(<EntregasView />);
  await vaciar();
}

const mesas = () =>
  within(screen.getByRole("list", { name: "Mesas con platillos por entregar" }))
    .getAllByRole("article")
    .map((mesa) => mesa.getAttribute("aria-label"));
const mesa = (numero: number) => screen.getByRole("article", { name: `Mesa ${numero}` });
const boton = (texto: string) => screen.getByRole("button", { name: `Marcar ${texto} como entregado` });

async function pulsar(texto: string) {
  fireEvent.click(boton(texto));
  await vaciar();
}

beforeEach(() => {
  vi.useFakeTimers();
  mocks.router.replace.mockReset();
  mocks.router.refresh.mockReset();
  mocks.listar.mockReset();
  mocks.entregar.mockReset();
});

describe("platillos por entregar (FE-8.1)", () => {
  it("muestra el esqueleto mientras carga", async () => {
    const { promesa, resolver } = diferido<ItemsListosResultado>();
    mocks.listar.mockReturnValue(promesa);
    render(<EntregasView />);

    expect(screen.getByRole("status", { name: "Cargando platillos por entregar" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Platillos por entregar" })).toHaveAttribute("aria-busy", "true");

    await act(async () => {
      resolver({ items: ITEMS });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.queryByRole("status", { name: "Cargando platillos por entregar" })).not.toBeInTheDocument();
  });

  it("agrupa por mesa con cantidad, nombre, hora de listo y botón Entregado de 44 px", async () => {
    await montar();

    expect(mesas()).toEqual(["Mesa 7", "Mesa 2"]);
    expect(within(mesa(2)).getByText("2 por entregar")).toBeInTheDocument();
    expect(within(mesa(7)).getByText("1 por entregar")).toBeInTheDocument();

    const fila = within(mesa(2)).getByText(/Pupusa revuelta/).closest("li")!;
    expect(fila).toHaveTextContent("2 × Pupusa revuelta");
    expect(fila).toHaveTextContent("Listo 12:15");
    expect(boton("2 × Pupusa revuelta")).toHaveTextContent("Entregado");
    expect(boton("2 × Pupusa revuelta").className).toMatch(/\bmin-h-11\b/);
  });

  it("muestra el estado vacío", async () => {
    await montar([]);
    expect(screen.getByText("No hay platillos por entregar")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Mesas con platillos por entregar" })).not.toBeInTheDocument();
  });

  it("muestra error con Reintentar y vuelve a cargar", async () => {
    mocks.listar
      .mockResolvedValueOnce({ error: "No pudimos cargar los platillos" })
      .mockResolvedValue({ items: ITEMS });
    render(<EntregasView />);
    await vaciar();

    expect(screen.getByText("No pudimos cargar los platillos")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(screen.getByRole("status", { name: "Cargando platillos por entregar" })).toBeInTheDocument();
    await vaciar();

    expect(mesas()).toEqual(["Mesa 7", "Mesa 2"]);
    expect(mocks.listar).toHaveBeenCalledTimes(2);
  });

  it("deshabilita el botón con indicador de carga mientras se envía", async () => {
    const { promesa, resolver } = diferido<MarcarEntregadoResultado>();
    mocks.entregar.mockReturnValue(promesa);
    await montar();

    await pulsar("2 × Pupusa revuelta");
    expect(boton("2 × Pupusa revuelta")).toBeDisabled();
    expect(boton("2 × Pupusa revuelta")).toHaveAttribute("aria-busy", "true");
    fireEvent.click(boton("2 × Pupusa revuelta"));
    expect(mocks.entregar).toHaveBeenCalledTimes(1);
    expect(mocks.entregar).toHaveBeenCalledWith(201);
    expect(boton("1 × Tamal de elote")).toBeEnabled();

    await act(async () => {
      resolver({ entregado: { itemId: 201, entregadoEn: "12:25", pedidoEstado: "LISTO" } });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.queryByRole("button", { name: /Pupusa revuelta/ })).not.toBeInTheDocument();
  });

  it("entrega exitosa: el platillo desaparece sin recargar y la mesa sigue con el resto", async () => {
    mocks.entregar.mockResolvedValue({ entregado: { itemId: 201, entregadoEn: "12:25", pedidoEstado: "LISTO" } });
    await montar();

    await pulsar("2 × Pupusa revuelta");

    expect(within(mesa(2)).queryByText(/Pupusa revuelta/)).not.toBeInTheDocument();
    expect(within(mesa(2)).getByText(/Tamal de elote/)).toBeInTheDocument();
    expect(within(mesa(2)).getByText("1 por entregar")).toBeInTheDocument();
    expect(screen.getByText("Platillo entregado · Mesa 2")).toBeInTheDocument();
    expect(mocks.listar).toHaveBeenCalledTimes(1);
  });

  it("entrega exitosa del último platillo: desaparece el grupo de la mesa", async () => {
    mocks.entregar.mockResolvedValue({ entregado: { itemId: 301, entregadoEn: "12:25", pedidoEstado: "ENTREGADO" } });
    await montar();

    await pulsar("2 × Limonada natural");

    expect(mesas()).toEqual(["Mesa 2"]);
    expect(screen.getByText("Pedido de la Mesa 7 entregado completo")).toBeInTheDocument();
    expect(mocks.listar).toHaveBeenCalledTimes(1);
    expect(mocks.router.refresh).toHaveBeenCalledTimes(1);
  });

  it("al entregar todo queda el estado vacío", async () => {
    mocks.entregar.mockResolvedValue({ entregado: { itemId: 301, entregadoEn: "12:25", pedidoEstado: "ENTREGADO" } });
    await montar([LIMONADA]);

    await pulsar("2 × Limonada natural");
    expect(screen.getByText("No hay platillos por entregar")).toBeInTheDocument();
  });

  it.each([
    [409, "ya entregado"],
    [422, "aún no está listo"],
  ])("%i (%s): no muestra error y refresca la lista con el GET", async () => {
    mocks.entregar.mockResolvedValue({ refrescar: true });
    await montar();
    mocks.listar.mockResolvedValue({ items: [LIMONADA, TAMAL] });

    await pulsar("2 × Pupusa revuelta");

    expect(mocks.listar).toHaveBeenCalledTimes(2);
    expect(within(mesa(2)).queryByText(/Pupusa revuelta/)).not.toBeInTheDocument();
    expect(within(mesa(2)).getByText(/Tamal de elote/)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
    expect(screen.queryByText(/No pudimos/)).not.toBeInTheDocument();
  });

  it("error genérico: mensaje breve y el botón vuelve a habilitarse", async () => {
    mocks.entregar.mockResolvedValue({ error: "No pudimos marcar el platillo como entregado. Intenta de nuevo." });
    await montar();

    await pulsar("2 × Pupusa revuelta");

    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos marcar el platillo como entregado. Intenta de nuevo.");
    expect(boton("2 × Pupusa revuelta")).toBeEnabled();
    expect(within(mesa(2)).getByText("2 por entregar")).toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(3_000));
    expect(screen.queryByRole("alert")).toBeEmptyDOMElement();
  });

  it("error de red al llamar a la acción: mensaje breve y el botón vuelve a habilitarse", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.entregar.mockRejectedValue(new TypeError("Failed to fetch"));
    await montar();

    await pulsar("2 × Pupusa revuelta");

    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos marcar el platillo como entregado");
    expect(boton("2 × Pupusa revuelta")).toBeEnabled();
  });

  it("403 y 404 muestran su mensaje sin bloquear la pantalla", async () => {
    mocks.entregar
      .mockResolvedValueOnce({ error: "No tienes permiso para realizar esta acción." })
      .mockResolvedValueOnce({ error: "Este platillo ya no existe en el pedido." });
    await montar();

    await pulsar("2 × Pupusa revuelta");
    expect(screen.getByRole("alert")).toHaveTextContent("No tienes permiso para realizar esta acción.");
    await pulsar("1 × Tamal de elote");
    expect(screen.getByRole("alert")).toHaveTextContent("Este platillo ya no existe en el pedido.");
    expect(boton("1 × Tamal de elote")).toBeEnabled();
  });

  it("sin sesión al cargar o al entregar: va al login", async () => {
    mocks.listar.mockResolvedValue({ sinSesion: true });
    const { unmount } = render(<EntregasView />);
    await vaciar();
    expect(mocks.router.replace).toHaveBeenCalledWith("/login");
    unmount();

    mocks.router.replace.mockReset();
    mocks.entregar.mockResolvedValue({ sinSesion: true });
    await montar();
    await pulsar("2 × Pupusa revuelta");
    expect(mocks.router.replace).toHaveBeenCalledWith("/login");
  });
});
