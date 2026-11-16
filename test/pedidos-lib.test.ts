import { describe, expect, it } from "vitest";
import {
  formatearPrecio,
  itemsParaEnviar,
  normalizarTexto,
  totalPedido,
  type LineaPedido,
} from "@/lib/pedidos";
import type { Platillo } from "@/lib/platillos";

function platillo(id: number, precio: number): Platillo {
  return {
    id,
    nombre: `Platillo ${id}`,
    descripcion: null,
    imagenUrl: null,
    imagenSrc: null,
    categoriaId: 1,
    categoriaNombre: "Principales",
    precio,
    disponibilidad: 10,
    activo: true,
  };
}

describe("totalPedido", () => {
  it("es 0 sin líneas", () => {
    expect(totalPedido([])).toBe(0);
  });

  it("suma precio por cantidad", () => {
    const lineas: LineaPedido[] = [
      { platillo: platillo(1, 8.99), cantidad: 2, nota: "" },
      { platillo: platillo(2, 2.5), cantidad: 1, nota: "" },
    ];
    expect(totalPedido(lineas)).toBe(20.48);
  });

  it("evita errores de punto flotante", () => {
    const lineas: LineaPedido[] = [
      { platillo: platillo(1, 1.1), cantidad: 3, nota: "" },
    ];
    expect(totalPedido(lineas)).toBe(3.3);
  });
});

describe("formatearPrecio", () => {
  it("usa dos decimales", () => {
    expect(formatearPrecio(5)).toBe("$ 5.00");
    expect(formatearPrecio(1.25)).toBe("$ 1.25");
  });
});

describe("itemsParaEnviar", () => {
  it("recorta la nota y usa null si queda vacía", () => {
    const lineas: LineaPedido[] = [
      { platillo: platillo(1, 3), cantidad: 2, nota: "  sin cebolla  " },
      { platillo: platillo(2, 4), cantidad: 1, nota: "   " },
    ];
    expect(itemsParaEnviar(lineas)).toEqual([
      { platilloId: 1, cantidad: 2, nota: "sin cebolla" },
      { platilloId: 2, cantidad: 1, nota: null },
    ]);
  });
});

describe("normalizarTexto", () => {
  it("quita tildes y pasa a minúsculas", () => {
    expect(normalizarTexto("Hamburguesa CLÁSICA")).toBe("hamburguesa clasica");
  });
});