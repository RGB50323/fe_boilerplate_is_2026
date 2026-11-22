import { describe, expect, it } from "vitest";
import { totalPedido, type LineaPedido } from "@/lib/pedidos";

// H04. Registrar el pedido de una mesa (frontend).
// AC1, AC3, AC4, AC5 y AC6 se prueban en el backend:
// src/pedidos/services/h04-pedido-mesa.spec.ts.

const linea = (id: number, precio: number, cantidad: number): LineaPedido =>
  ({
    platillo: { id, nombre: `Platillo ${id}`, precio },
    cantidad,
    nota: "",
  }) as unknown as LineaPedido;

describe("H04. Registrar el pedido de una mesa", () => {
  it("AC2: el total se actualiza al agregar, quitar o cambiar cantidades antes de confirmar", () => {
    const inicial = [linea(1, 3.5, 2), linea(2, 1.25, 1)];
    expect(totalPedido(inicial)).toBe(8.25);

    const conOtro = [...inicial, linea(3, 0.1, 3)];
    expect(totalPedido(conOtro)).toBe(8.55);

    const sinUno = conOtro.filter((l) => l.platillo.id !== 2);
    expect(totalPedido(sinUno)).toBe(7.3);

    const cambiado = sinUno.map((l) => (l.platillo.id === 1 ? { ...l, cantidad: 4 } : l));
    expect(totalPedido(cambiado)).toBe(14.3);
  });
});
