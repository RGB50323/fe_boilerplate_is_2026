import { describe, expect, it } from "vitest";
import {
  agregarAlCarrito,
  cambiarCantidad,
  cambiarNota,
  cantidadDe,
  itemsParaEnviar,
  quitarDelCarrito,
  subtotalLinea,
  totalCarrito,
  validarCarrito,
  type LineaCarrito,
} from "@/lib/carrito-llevar";
import type { Platillo } from "@/lib/menu";

const hamburguesa: Platillo = {
  id: 10,
  nombre: "Hamburguesa",
  descripcion: null,
  precio: 8.99,
  imagenUrl: null,
  disponibilidad: 2,
};
const horchata: Platillo = { ...hamburguesa, id: 11, nombre: "Horchata", precio: 1.1, disponibilidad: 10 };

describe("carrito para llevar", () => {
  it("agrega un platillo nuevo con cantidad 1", () => {
    expect(agregarAlCarrito([], hamburguesa)).toEqual([
      { platillo: hamburguesa, cantidad: 1, nota: "" },
    ]);
  });

  it("suma al agregar el mismo platillo y no supera la disponibilidad", () => {
    let lineas: LineaCarrito[] = [];
    for (let i = 0; i < 5; i++) lineas = agregarAlCarrito(lineas, hamburguesa);
    expect(cantidadDe(lineas, 10)).toBe(2);
  });

  it("no agrega un platillo agotado", () => {
    expect(agregarAlCarrito([], { ...hamburguesa, disponibilidad: 0 })).toEqual([]);
  });

  it("cambiar la cantidad respeta el tope y quita al bajar de 1", () => {
    const lineas = agregarAlCarrito([], hamburguesa);
    expect(cantidadDe(cambiarCantidad(lineas, 10, 99), 10)).toBe(2);
    expect(cambiarCantidad(lineas, 10, 0)).toEqual([]);
  });

  it("cambia la nota y quita un platillo sin tocar los demás", () => {
    const lineas = agregarAlCarrito(agregarAlCarrito([], hamburguesa), horchata);
    const conNota = cambiarNota(lineas, 10, "sin cebolla");
    expect(conNota[0].nota).toBe("sin cebolla");
    expect(conNota[1].nota).toBe("");
    expect(quitarDelCarrito(conNota, 10).map((l) => l.platillo.id)).toEqual([11]);
  });

  it("calcula subtotales y total sin errores de decimales", () => {
    const lineas: LineaCarrito[] = [
      { platillo: horchata, cantidad: 3, nota: "" },
      { platillo: hamburguesa, cantidad: 2, nota: "" },
    ];
    expect(subtotalLinea(lineas[0])).toBe(3.3);
    expect(totalCarrito(lineas)).toBe(21.28);
    expect(totalCarrito([])).toBe(0);
  });

  it("exige platillos y nombre completo", () => {
    const lineas = agregarAlCarrito([], hamburguesa);
    expect(validarCarrito(lineas, "Ana López")).toEqual({});
    expect(validarCarrito([], "Ana López")).toHaveProperty("carrito");
    for (const nombre of ["", "   ", "Ana"]) {
      expect(validarCarrito(lineas, nombre)).toHaveProperty("nombre");
    }
  });

  it("prepara los items para enviar con la nota recortada o nula", () => {
    const lineas: LineaCarrito[] = [
      { platillo: hamburguesa, cantidad: 2, nota: "  sin cebolla " },
      { platillo: horchata, cantidad: 1, nota: "   " },
    ];
    expect(itemsParaEnviar(lineas)).toEqual([
      { platilloId: 10, cantidad: 2, nota: "sin cebolla" },
      { platilloId: 11, cantidad: 1, nota: null },
    ]);
  });
});