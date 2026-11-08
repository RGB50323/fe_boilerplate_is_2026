import { describe, expect, it } from "vitest";
import {
  etiquetaModulo,
  formatoContador,
  rutaDeReferencia,
} from "@/lib/notificaciones";

describe("helpers de notificaciones", () => {
  it.each([
    [0, "0"],
    [1, "1"],
    [9, "9"],
    [10, "9+"],
    [38, "9+"],
  ])("formatea el contador %i", (cantidad, esperado) => {
    expect(formatoContador(cantidad)).toBe(esperado);
  });

  it("presenta los módulos con etiquetas en español", () => {
    expect(etiquetaModulo("MENU")).toBe("Menú");
    expect(etiquetaModulo("RESENAS")).toBe("Reseñas");
    expect(etiquetaModulo("RESERVACIONES")).toBe("Reservaciones");
  });

  it("resuelve las referencias conocidas", () => {
    expect(rutaDeReferencia({ tipo: "PEDIDO", id: 42 })).toBe("/pedidos/42");
    expect(rutaDeReferencia({ tipo: "PEDIDO_ENTREGA", id: "A/B" })).toBe(
      "/pedidos/A%2FB",
    );
    expect(rutaDeReferencia({ tipo: "RESERVACION", id: 5 })).toBe("/reservas");
  });

  it("no crea rutas para referencias desconocidas", () => {
    expect(rutaDeReferencia({ tipo: "PAGO", id: 2 })).toBeNull();
    expect(rutaDeReferencia(null)).toBeNull();
  });
});
