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
    expect(etiquetaModulo("NUEVO")).toBe("General");
  });

  it("resuelve las referencias conocidas", () => {
    expect(rutaDeReferencia({ tipo: "PEDIDO", id: 42 })).toBe("/pedidos/42");
    expect(rutaDeReferencia({ tipo: "PEDIDO_ENTREGA", id: "A/B" })).toBe(
      "/pedidos/A%2FB",
    );
    expect(rutaDeReferencia({ tipo: "RESERVACION", id: 5 })).toBe(
      "/perfil/reservaciones",
    );
  });

  it("la alerta de insumo lleva al panel de alertas del gerente", () => {
    expect(rutaDeReferencia({ tipo: "ALERTA_INSUMO", id: "9" })).toBe(
      "/admin/inventario/alertas",
    );
  });

  it("los avisos de H26 llevan a la reservación en Mis reservaciones", () => {
    expect(
      rutaDeReferencia({ tipo: "RESERVA_CONFIRMADA", id: "R-000012" }),
    ).toBe("/perfil/reservaciones?reservacion=R-000012");
    // Modificación y recordatorio traen una marca después de ":"
    expect(
      rutaDeReferencia({
        tipo: "RESERVA_MODIFICADA",
        id: "R-000012:1794787975843",
      }),
    ).toBe("/perfil/reservaciones?reservacion=R-000012");
    expect(
      rutaDeReferencia({
        tipo: "RESERVA_RECORDATORIO",
        id: "R-000012:1794788000000",
      }),
    ).toBe("/perfil/reservaciones?reservacion=R-000012");
  });

  it("no crea rutas para referencias desconocidas", () => {
    expect(rutaDeReferencia({ tipo: "PAGO", id: 2 })).toBeNull();
    expect(rutaDeReferencia(null)).toBeNull();
  });
});
