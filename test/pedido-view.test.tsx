import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Pagina } from "@/lib/paginacion";
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
const tamal: Platillo = { ...base, id: 2, nombre: "Tamal", disponibilidad: 0 };
const sopa: Platillo = {
  ...base,
  id: 4,
  nombre: "Sopa de res",
  precio: 5,
};
const platillos: Platillo[] = [base, tamal];
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

function paginaDe(
  datos: Platillo[],
  extra: Partial<Pagina<Platillo>> = {},
): Pagina<Platillo> {
  return { pagina: 1, totalPaginas: 1, total: datos.length, datos, ...extra };
}

function renderizar(inicial: Pagina<Platillo> = paginaDe(platillos)) {
  render(
    <PedidoView
      sucursalId={1}
      platillosIniciales={inicial}
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
  mocks.listarPlatillos.mockResolvedValue({
    ok: true,
    datos: paginaDe(platillos),
  });
});

describe("PedidoView", () => {
  it("muestra los platillos y marca los agotados", () => {
    renderizar();

    expect(
      screen.getByRole("button", { name: "Agregar Hamburguesa" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tamal agotado" }),
    ).toBeDisabled();
  });

  it("busca los platillos en el servidor", async () => {
    mocks.listarPlatillos.mockResolvedValue({
      ok: true,
      datos: paginaDe([tamal]),
    });
    renderizar();

    fireEvent.change(screen.getByLabelText("Buscar por nombre de platillo"), {
      target: { value: "  TAMAL " },
    });

    await waitFor(() =>
      expect(mocks.listarPlatillos).toHaveBeenCalledWith(1, 1, "TAMAL"),
    );
    await waitFor(() =>
      expect(screen.queryByText("Hamburguesa")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Tamal")).toBeInTheDocument();
  });

  it("conserva el pedido al cambiar de página", async () => {
    mocks.listarPlatillos.mockResolvedValue({
      ok: true,
      datos: paginaDe([sopa], { pagina: 2, totalPaginas: 2, total: 3 }),
    });
    renderizar(paginaDe(platillos, { totalPaginas: 2, total: 3 }));

    fireEvent.click(
      screen.getByRole("button", { name: "Agregar Hamburguesa" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));

    await waitFor(() =>
      expect(mocks.listarPlatillos).toHaveBeenCalledWith(1, 2, ""),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Agregar Sopa de res" }),
    );

    expect(screen.getByText("Total: $ 13.99")).toBeInTheDocument();
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
    await waitFor(() =>
      expect(mocks.listarPlatillos).toHaveBeenCalledWith(1, 1, ""),
    );
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
