import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DrawerMesas } from "@/components/pedidos/drawer-mesas";
import { ListaPlatillos } from "@/components/pedidos/lista-platillos";
import { ResumenPedido } from "@/components/pedidos/resumen-pedido";
import type { LineaPedido, Mesa } from "@/lib/pedidos";
import type { Platillo } from "@/lib/platillos";

const hamburguesa: Platillo = {
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
const tamal: Platillo = {
  ...hamburguesa,
  id: 2,
  nombre: "Tamal",
  disponibilidad: 0,
};

const libre: Mesa = {
  id: 3,
  numero: 3,
  capacidad: 4,
  zona: null,
  activa: true,
  pedidoAbiertoId: null,
};
const ocupada: Mesa = { ...libre, id: 4, numero: 4, pedidoAbiertoId: 120 };
const fuera: Mesa = { ...libre, id: 5, numero: 5, activa: false };

describe("DrawerMesas", () => {
  it("muestra el estado de cada mesa", () => {
    render(
      <DrawerMesas
        abierto
        mesas={[libre, ocupada, fuera]}
        seleccionada={null}
        onCerrar={vi.fn()}
        onElegir={vi.fn()}
      />,
    );

    expect(screen.getByText("Seleccionar mesa")).toBeInTheDocument();
    expect(screen.getByText("Libre")).toBeInTheDocument();
    expect(screen.getByText("Ocupada")).toBeInTheDocument();
    expect(screen.getByText("Fuera de servicio")).toBeInTheDocument();
  });

  it("permite elegir una mesa libre", () => {
    const onElegir = vi.fn();
    render(
      <DrawerMesas
        abierto
        mesas={[libre, ocupada]}
        seleccionada={null}
        onCerrar={vi.fn()}
        onElegir={onElegir}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Mesa 3/ }));

    expect(onElegir).toHaveBeenCalledWith(libre);
  });

  it("no permite elegir mesas ocupadas ni fuera de servicio", () => {
    render(
      <DrawerMesas
        abierto
        mesas={[ocupada, fuera]}
        seleccionada={null}
        onCerrar={vi.fn()}
        onElegir={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /Mesa 4/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Mesa 5/ })).toBeDisabled();
  });

  it("marca la mesa seleccionada", () => {
    render(
      <DrawerMesas
        abierto
        mesas={[libre]}
        seleccionada={3}
        onCerrar={vi.fn()}
        onElegir={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /Mesa 3/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("avisa cuando no hay mesas", () => {
    render(
      <DrawerMesas
        abierto
        mesas={[]}
        seleccionada={null}
        onCerrar={vi.fn()}
        onElegir={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Esta sucursal no tiene mesas registradas."),
    ).toBeInTheDocument();
  });

  it("se cierra con la X", () => {
    const onCerrar = vi.fn();
    render(
      <DrawerMesas
        abierto
        mesas={[libre]}
        seleccionada={null}
        onCerrar={onCerrar}
        onElegir={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(onCerrar).toHaveBeenCalled();
  });
});

describe("ListaPlatillos", () => {
  it("permite agregar los disponibles y bloquea los agotados", () => {
    const onAgregar = vi.fn();
    render(
      <ListaPlatillos
        platillos={[hamburguesa, tamal]}
        busqueda=""
        onBuscar={vi.fn()}
        onAgregar={onAgregar}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Agregar Hamburguesa" }),
    );

    expect(onAgregar).toHaveBeenCalledWith(hamburguesa);
    expect(
      screen.getByRole("button", { name: "Tamal agotado" }),
    ).toBeDisabled();
    expect(screen.getByText("Agotado")).toBeInTheDocument();
  });

  it("avisa cuando se escribe en la búsqueda", () => {
    const onBuscar = vi.fn();
    render(
      <ListaPlatillos
        platillos={[hamburguesa]}
        busqueda=""
        onBuscar={onBuscar}
        onAgregar={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Buscar por nombre de platillo"), {
      target: { value: "ham" },
    });

    expect(onBuscar).toHaveBeenCalledWith("ham");
  });

  it("muestra el estado vacío sin resultados", () => {
    render(
      <ListaPlatillos
        platillos={[]}
        busqueda="xyz"
        onBuscar={vi.fn()}
        onAgregar={vi.fn()}
      />,
    );

    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
  });
});

describe("ResumenPedido", () => {
  const lineas: LineaPedido[] = [
    { platillo: hamburguesa, cantidad: 2, nota: "" },
  ];

  function renderizar(
    props: Partial<Parameters<typeof ResumenPedido>[0]> = {},
  ) {
    const manejadores = {
      onMas: vi.fn(),
      onMenos: vi.fn(),
      onQuitar: vi.fn(),
      onNota: vi.fn(),
      onEnviar: vi.fn(),
    };
    render(
      <ResumenPedido
        mesa={libre}
        lineas={lineas}
        enviando={false}
        {...manejadores}
        {...props}
      />,
    );
    return manejadores;
  }

  it("muestra la mesa, las líneas y el total", () => {
    renderizar();

    expect(screen.getByText("Mesa 3")).toBeInTheDocument();
    expect(screen.getByText("Total: $ 17.98")).toBeInTheDocument();
  });

  it("indica cuando no hay mesa ni platillos y bloquea el envío", () => {
    renderizar({ mesa: null, lineas: [] });

    expect(screen.getByText("Sin mesa seleccionada")).toBeInTheDocument();
    expect(
      screen.getByText("Agrega platillos para armar el pedido."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Enviar a cocina" }),
    ).toBeDisabled();
  });

  it("cambia la cantidad, quita el platillo y envía", () => {
    const m = renderizar();

    fireEvent.click(
      screen.getByRole("button", { name: "Agregar una unidad de Hamburguesa" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Quitar una unidad de Hamburguesa" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Quitar Hamburguesa" }));
    fireEvent.click(screen.getByRole("button", { name: "Enviar a cocina" }));

    expect(m.onMas).toHaveBeenCalledWith(1);
    expect(m.onMenos).toHaveBeenCalledWith(1);
    expect(m.onQuitar).toHaveBeenCalledWith(1);
    expect(m.onEnviar).toHaveBeenCalledTimes(1);
  });

  it("bloquea + al llegar a la disponibilidad y - en 1", () => {
    renderizar({
      lineas: [{ platillo: hamburguesa, cantidad: 19, nota: "" }],
    });
    expect(
      screen.getByRole("button", { name: "Agregar una unidad de Hamburguesa" }),
    ).toBeDisabled();
  });

  it("no deja bajar de 1 unidad", () => {
    renderizar({ lineas: [{ platillo: hamburguesa, cantidad: 1, nota: "" }] });
    expect(
      screen.getByRole("button", { name: "Quitar una unidad de Hamburguesa" }),
    ).toBeDisabled();
  });

  it("limita la nota a 200 caracteres y la reporta", () => {
    const m = renderizar();
    const nota = screen.getByRole("textbox", { name: "Nota para Hamburguesa" });

    expect(nota).toHaveAttribute("maxlength", "200");
    fireEvent.change(nota, { target: { value: "sin cebolla" } });

    expect(m.onNota).toHaveBeenCalledWith(1, "sin cebolla");
  });

  it("muestra el estado de carga y bloquea el botón mientras envía", () => {
    renderizar({ enviando: true });

    expect(screen.getByRole("button", { name: "Enviando..." })).toBeDisabled();
  });
});
