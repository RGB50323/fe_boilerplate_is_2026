import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { crearPedidoLlevar } from "@/app/actions/pedidos";
import { CardPlatillo } from "@/components/menu/card-platillo";
import { CarritoLlevar } from "@/components/menu/carrito-llevar";
import type { LineaCarrito } from "@/lib/carrito-llevar";
import type { Platillo } from "@/lib/menu";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/app/actions/pedidos", () => ({ crearPedidoLlevar: vi.fn() }));

const platillo: Platillo = {
  id: 10,
  nombre: "Hamburguesa",
  descripcion: null,
  precio: 8.99,
  imagenUrl: null,
  disponibilidad: 3,
};
const linea: LineaCarrito = { platillo, cantidad: 2, nota: "" };
const creado = { pedidoId: 121, estado: "PENDIENTE_PAGO", total: 17.98 };

function montar(lineas: LineaCarrito[] = [linea]) {
  const props = {
    onCambiarCantidad: vi.fn(),
    onCambiarNota: vi.fn(),
    onQuitar: vi.fn(),
  };
  const vista = render(<CarritoLlevar sucursalId={1} lineas={lineas} {...props} />);
  return { ...props, ...vista };
}
const abrir = () =>
  fireEvent.click(screen.getByRole("button", { name: /Tu pedido para llevar/ }));
const escribirNombre = (valor: string) =>
  fireEvent.change(screen.getByLabelText("Nombre completo"), {
    target: { value: valor },
  });
const confirmar = () =>
  fireEvent.click(screen.getByRole("button", { name: "Confirmar y pagar" }));

beforeEach(() => {
  vi.mocked(crearPedidoLlevar).mockReset();
  push.mockReset();
});

describe("CardPlatillo con carrito", () => {
  it("no muestra el botón si no se puede pedir", () => {
    render(<CardPlatillo platillo={platillo} />);
    expect(screen.queryByRole("button", { name: /Agregar/ })).not.toBeInTheDocument();
  });

  it("agrega al hacer clic", () => {
    const onAgregar = vi.fn();
    render(<CardPlatillo platillo={platillo} onAgregar={onAgregar} />);
    fireEvent.click(screen.getByRole("button", { name: "Agregar Hamburguesa al pedido" }));
    expect(onAgregar).toHaveBeenCalledTimes(1);
  });

  it("muestra la cantidad ya agregada", () => {
    render(<CardPlatillo platillo={platillo} enCarrito={1} onAgregar={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Agregar Hamburguesa al pedido" })).toHaveTextContent("Agregar otro (1)");
  });

  it("se bloquea al llegar a la disponibilidad", () => {
    render(<CardPlatillo platillo={platillo} enCarrito={3} onAgregar={vi.fn()} />);
    const boton = screen.getByRole("button", { name: "Agregar Hamburguesa al pedido" });
    expect(boton).toBeDisabled();
    expect(boton).toHaveTextContent("Máximo disponible");
  });

  it("indica cuando está agotado", () => {
    render(<CardPlatillo platillo={{ ...platillo, disponibilidad: 0 }} onAgregar={vi.fn()} />);
    const boton = screen.getByRole("button", { name: "Agregar Hamburguesa al pedido" });
    expect(boton).toBeDisabled();
    expect(boton).toHaveTextContent("Agotado");
  });
});

describe("CarritoLlevar", () => {
  it("no se muestra con el carrito vacío", () => {
    const { container } = montar([]);
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra la cantidad de platillos y el total sin abrir", () => {
    montar();
    expect(screen.getByText("Total $17.98")).toBeVisible();
    expect(screen.getByRole("button", { name: /2 platillos/ })).toBeVisible();
  });

  it("pasa los cambios de cantidad, nota y quitar al padre", () => {
    const { onCambiarCantidad, onCambiarNota, onQuitar } = montar();
    abrir();
    fireEvent.click(screen.getByRole("button", { name: "Agregar una unidad de Hamburguesa" }));
    expect(onCambiarCantidad).toHaveBeenCalledWith(10, 3);
    fireEvent.click(screen.getByRole("button", { name: "Quitar una unidad de Hamburguesa" }));
    expect(onCambiarCantidad).toHaveBeenCalledWith(10, 1);
    fireEvent.change(screen.getByLabelText("Nota para Hamburguesa"), {
      target: { value: "sin cebolla" },
    });
    expect(onCambiarNota).toHaveBeenCalledWith(10, "sin cebolla");
    fireEvent.click(screen.getByRole("button", { name: "Quitar Hamburguesa del pedido" }));
    expect(onQuitar).toHaveBeenCalledWith(10);
  });

  it("no deja subir más allá de la disponibilidad", () => {
    montar([{ ...linea, cantidad: 3 }]);
    abrir();
    expect(screen.getByRole("button", { name: "Agregar una unidad de Hamburguesa" })).toBeDisabled();
  });

  it.each(["", "Ana"])("no confirma con el nombre «%s»", async (nombre) => {
    montar();
    abrir();
    escribirNombre(nombre);
    confirmar();
    expect(await screen.findByText("Ingresa tu nombre completo.")).toBeVisible();
    expect(crearPedidoLlevar).not.toHaveBeenCalled();
  });

  it("confirma, envía los datos y va al seguimiento", async () => {
    vi.mocked(crearPedidoLlevar).mockResolvedValue({ ok: true, datos: creado });
    montar();
    abrir();
    escribirNombre("Ana López");
    confirmar();
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/pedidos/121"));
    expect(crearPedidoLlevar).toHaveBeenCalledWith(1, "Ana López", [
      { platilloId: 10, cantidad: 2, nota: null },
    ]);
  });

  it("muestra el estado de carga y evita envíos repetidos", async () => {
    let resolver!: (r: Awaited<ReturnType<typeof crearPedidoLlevar>>) => void;
    vi.mocked(crearPedidoLlevar).mockImplementation(
      () => new Promise((r) => { resolver = r; }),
    );
    montar();
    abrir();
    escribirNombre("Ana López");
    const formulario = screen.getByRole("form", { name: "Confirmar pedido para llevar" });
    fireEvent.submit(formulario);
    fireEvent.submit(formulario);
    expect(crearPedidoLlevar).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Confirmando…" })).toBeDisabled();
    await act(async () => resolver({ ok: true, datos: creado }));
    expect(push).toHaveBeenCalledWith("/pedidos/121");
  });

  it("muestra el error de platillos no disponibles y deja reintentar", async () => {
    vi.mocked(crearPedidoLlevar).mockResolvedValue({
      ok: false,
      error: "Algunos platillos ya no están disponibles.",
    });
    montar();
    abrir();
    escribirNombre("Ana López");
    confirmar();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Algunos platillos ya no están disponibles.",
    );
    expect(screen.getByRole("button", { name: "Confirmar y pagar" })).toBeEnabled();
    expect(push).not.toHaveBeenCalled();
  });

  it("ante sesión vencida ofrece iniciar sesión", async () => {
    vi.mocked(crearPedidoLlevar).mockResolvedValue({
      ok: false,
      error: "Tu sesión expiró. Inicia sesión de nuevo.",
      sinSesion: true,
    });
    montar();
    abrir();
    escribirNombre("Ana López");
    confirmar();
    expect(
      await screen.findByRole("link", { name: "Iniciar sesión para continuar" }),
    ).toHaveAttribute("href", "/login");
  });

  it("un rechazo de red muestra un mensaje y termina la carga", async () => {
    vi.mocked(crearPedidoLlevar).mockRejectedValue(new TypeError("Failed to fetch"));
    montar();
    abrir();
    escribirNombre("Ana López");
    confirmar();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos completar tu pedido. Intenta de nuevo.",
    );
    expect(screen.getByRole("button", { name: "Confirmar y pagar" })).toBeEnabled();
  });
});