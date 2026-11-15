import { describe, expect, it } from "vitest";
import { etiquetaEstado, puedeCancelar, subtotalItem } from "@/lib/seguimiento";

describe("seguimiento del pedido", () => {
  it("traduce los estados visibles", () => {
    expect(etiquetaEstado("RECIBIDO")).toBe("Recibido");
    expect(etiquetaEstado("EN_PREPARACION")).toBe("En preparación");
    expect(etiquetaEstado("LISTO")).toBe("Listo");
    expect(etiquetaEstado("CANCELADO")).toBe("Cancelado");
    expect(etiquetaEstado("PENDIENTE_PAGO")).toBe("Pendiente de pago");
  });

  it("deja un estado desconocido tal cual", () => {
    expect(etiquetaEstado("OTRO")).toBe("OTRO");
  });

  it("solo se puede cancelar en RECIBIDO", () => {
    expect(puedeCancelar("RECIBIDO")).toBe(true);
    for (const estado of [
      "PENDIENTE_PAGO",
      "EN_PREPARACION",
      "LISTO",
      "ENTREGADO",
      "CANCELADO",
    ]) {
      expect(puedeCancelar(estado)).toBe(false);
    }
  });

  it("calcula el subtotal sin errores de decimales", () => {
    expect(
      subtotalItem({
        itemId: 1,
        platilloId: 10,
        nombre: "Horchata",
        cantidad: 3,
        precioUnitario: 1.1,
        nota: null,
        estado: "PENDIENTE",
      }),
    ).toBe(3.3);
  });
});
