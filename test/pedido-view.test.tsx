import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mesa } from "@/lib/pedidos";
import type { Platillo } from "@/lib/platillos";
import { PedidoView } from "@/app/mesero/pedidos/pedido-view";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  crearPedido: vi.fn(),
  listarMesas: vi.fn(),
  listarPlatillos: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock("@/app/actions/pedidos", () => ({
  crearPedido: mocks.crearPedido,
  listarMesas: mocks.listarMesas,
}));
vi.mock("@/app/actions/platillos", () => ({
  listarPlatillos: mocks.listarPlatillos,
}));

const base: Platillo = {
  id: 1,
  nombre: "Hamburguesa",
  descripcion: null,
  imagenUrl: null,
  imagenSrc: null,
  categoriaId: 1,
  categoriaNombre: "Platos principales",
  precio: 8.99,
  disponibilidad: 19,
  activo: true,
};
const platillos: Platillo[] = [
  base,
  { ...base, id: 2, nombre: "Tamal", disponibilidad: 0 },
  { ...base, id: 3, nombre: "Pupusa vieja", activo: false },
];
const mesas: Mesa[] = [
  {
    id: 3,
    numero: 3,
    capacidad: 4,
    zona: null,
    activa: true,
    pedidoAbiertoId: null,
  },
  {
    id: 4,
    numero: 4,
    capacidad: 4,
    zona: null,
    activa: true,
    pedidoAbiertoId: 120,
  },
];

function renderizar() {
  render(
    <PedidoView
      sucursalId={1}
      platillosIniciales={platillos}
      mesasIniciales={mesas}
    />,
  );
}

async function armarPedidoConMesa() {
  fireEvent.click(screen.getByRole("button", { name: "Agregar Hamburguesa" }));
  fireEvent.click(screen.getByRole("button", { name: "Seleccionar mesa" }));
  fireEvent.click(await screen.findByRole("button", { name: /Mesa 3/ }));
}

beforeEach(() => {
  mocks.replace.mockReset();
  mocks.crearPedido.mockReset();
  mocks.listarMesas.mockReset();
  mocks.listarPlatillos.mockReset();
  mocks.listarMesas.mockResolvedValue({ ok: true, datos: mesas });
  mocks.listarPlatillos.mockResolvedValue({ ok: true, datos: platillos });
});

describe("PedidoView", () => {
  it("muestra solo los platillos activos y marca los agotados", () => {
    renderizar();

    expect(
      screen.getByRole("button", { name: "Agregar Hamburguesa" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tamal agotado" }),
    ).toBeDisabled();
    expect(screen.queryByText("Pupusa vieja")).not.toBeInTheDocument();
  });

  it("filtra los platillos por nombre", () => {
    renderizar();

    fireEvent.change(screen.getByLabelText("Buscar por nombre de platillo"), {
      target: { value: "TAMAL" },
    });

    expect(screen.queryByText("Hamburguesa")).not.toBeInTheDocument();
    expect(screen.getByText("Tamal")).toBeInTheDocument();
  });

  it("arma el resumen con el total", () => {
    renderizar();

    fireEvent.click(
      screen.getByRole("button", { name: "Agregar Hamburguesa" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Agregar Hamburguesa" }),
    );

    expect(screen.getByText("Total: $ 17.98")).toBeInTheDocument();
  });

  it("pide seleccionar una mesa si se envía sin mesa", async () => {
    renderizar();

    fireEvent.click(
      screen.getByRole("button", { name: "Agregar Hamburguesa" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Enviar a cocina" }));

    expect(
      await screen.findByText("Selecciona una mesa para el pedido."),
    ).toBeInTheDocument();
    expect(mocks.crearPedido).not.toHaveBeenCalled();
  });

  it("envía el pedido, confirma y limpia el resumen", async () => {
    mocks.crearPedido.mockResolvedValue({
      ok: true,
      datos: { pedidoId: 120, numero: "S1-000120" },
    });
    renderizar();
    await armarPedidoConMesa();

    fireEvent.click(
      await screen.findByRole("button", { name: "Enviar a cocina" }),
    );

    await waitFor(() =>
      expect(mocks.crearPedido).toHaveBeenCalledWith(3, [
        { platilloId: 1, cantidad: 1, nota: null },
      ]),
    );
    expect(
      await screen.findByText("Pedido S1-000120 enviado a cocina"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Agrega platillos para armar el pedido."),
    ).toBeInTheDocument();
    await waitFor(() => expect(mocks.listarMesas).toHaveBeenCalledWith(1));
  });

  it("muestra el error del servidor y conserva el pedido", async () => {
    mocks.crearPedido.mockResolvedValue({
      ok: false,
      error: "Revisa los platillos: alguno no está disponible o se agotó.",
    });
    renderizar();
    await armarPedidoConMesa();

    fireEvent.click(
      await screen.findByRole("button", { name: "Enviar a cocina" }),
    );

    expect(
      await screen.findByText(
        "Revisa los platillos: alguno no está disponible o se agotó.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Total: $ 8.99")).toBeInTheDocument();
  });

  it("redirige al login si la sesión expiró", async () => {
    mocks.crearPedido.mockResolvedValue({
      ok: false,
      error: "Tu sesión expiró. Inicia sesión de nuevo.",
      sinSesion: true,
    });
    renderizar();
    await armarPedidoConMesa();

    fireEvent.click(
      await screen.findByRole("button", { name: "Enviar a cocina" }),
    );

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login"));
  });

  it("bloquea el botón mientras se envía", async () => {
    mocks.crearPedido.mockReturnValue(new Promise(() => {}));
    renderizar();
    await armarPedidoConMesa();

    fireEvent.click(
      await screen.findByRole("button", { name: "Enviar a cocina" }),
    );

    expect(
      await screen.findByRole("button", { name: "Enviando..." }),
    ).toBeDisabled();
    expect(mocks.crearPedido).toHaveBeenCalledTimes(1);
  });
});
