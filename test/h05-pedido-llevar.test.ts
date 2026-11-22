import { describe, expect, it } from "vitest";
import {
  ERROR_CARRITO,
  ERROR_NOMBRE,
  agregarAlCarrito,
  cambiarCantidad,
  quitarDelCarrito,
  totalCarrito,
  validarCarrito,
} from "@/lib/carrito-llevar";
import type { Platillo } from "@/lib/menu";

// H05. Hacer un pedido para llevar (frontend).
// AC1, AC3, AC5 y AC6 se prueban en el backend:
// src/pedidos/services/h05-pedido-llevar.spec.ts.

const platillo = (id: number, precio: number, disponibilidad: number) =>
  ({ id, nombre: `Platillo ${id}`, precio, disponibilidad }) as unknown as Platillo;

describe("H05. Hacer un pedido para llevar", () => {
  it("AC2: el total se actualiza y la cantidad no excede la disponibilidad", () => {
    const pupusa = platillo(1, 1.25, 3);
    let carrito = agregarAlCarrito([], pupusa);
    carrito = agregarAlCarrito(carrito, platillo(2, 2.5, 10));
    expect(totalCarrito(carrito)).toBe(3.75);

    carrito = cambiarCantidad(carrito, 1, 10);
    expect(carrito.find((l) => l.platillo.id === 1)?.cantidad).toBe(3);
    expect(totalCarrito(carrito)).toBe(6.25);

    carrito = quitarDelCarrito(carrito, 2);
    expect(totalCarrito(carrito)).toBe(3.75);
    expect(agregarAlCarrito([], platillo(3, 1, 0))).toEqual([]);
  });

  it("AC4: sin platillos o sin nombre completo indica lo que falta", () => {
    expect(validarCarrito([], "Ana")).toEqual({
      carrito: ERROR_CARRITO,
      nombre: ERROR_NOMBRE,
    });
    const carrito = agregarAlCarrito([], platillo(1, 1.25, 3));
    expect(validarCarrito(carrito, "Ana López")).toEqual({});
  });
});
