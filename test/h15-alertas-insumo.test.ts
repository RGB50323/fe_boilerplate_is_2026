import { describe, expect, it } from "vitest";
import {
  contarActivas,
  formatoContadorAlertas,
  type AlertaInsumo,
} from "@/lib/alertas-inventario";

// H15. Recibir una alerta cuando un insumo esté por agotarse (frontend).
// La generación, el cierre y el filtro por sucursal se prueban en el backend:
// src/inventario/services/h15-alertas-insumo.spec.ts.

const alerta = (id: number, estado: AlertaInsumo["estado"]): AlertaInsumo => ({
  id,
  insumoId: id,
  insumo: `Insumo ${id}`,
  cantidad: 1,
  minimo: 5,
  unidad: "lb",
  estado,
  creadaEn: "2026-11-21T18:00:00Z",
});

describe("H15. Recibir una alerta cuando un insumo esté por agotarse", () => {
  it("AC2: el contador del menú cuenta solo las alertas nuevas (activas)", () => {
    const alertas = [alerta(1, "ACTIVA"), alerta(2, "VISTA"), alerta(3, "ACTIVA")];

    expect(contarActivas(alertas)).toBe(2);
    expect(formatoContadorAlertas(120)).toBe("99+");
  });

  it("AC5: una alerta vista deja de contar como nueva pero sigue en la lista", () => {
    const alertas = [alerta(1, "VISTA")];

    expect(contarActivas(alertas)).toBe(0);
    expect(alertas).toHaveLength(1);
  });
});
