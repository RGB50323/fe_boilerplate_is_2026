import { describe, expect, it } from "vitest";
import {
  contarActivas,
  formatoContadorAlertas,
  formatoFechaAlerta,
  leerAlerta,
  leerAlertas,
  ordenarAlertas,
  textoActivas,
  type AlertaInsumo,
} from "@/lib/alertas-inventario";

const MASA = {
  id: 9,
  insumoId: 5,
  insumo: "Masa de maíz",
  cantidad: 18,
  minimo: 20,
  unidad: "lb",
  estado: "ACTIVA",
  creadaEn: "2026-11-12T12:40:00-06:00",
};

describe("lectura de alertas", () => {
  it("acepta el contrato, decimales como texto y unidad en mayúsculas", () => {
    expect(leerAlerta(MASA)).toEqual(MASA);
    expect(leerAlerta({ ...MASA, cantidad: "18.000", minimo: "20.000", unidad: "LB" })).toEqual(MASA);
    expect(leerAlerta({ ...MASA, unidad: undefined })?.unidad).toBeNull();
  });

  it("rechaza datos inválidos y descarta las resueltas", () => {
    expect(leerAlerta({ ...MASA, estado: "OTRA" })).toBeNull();
    expect(leerAlerta({ ...MASA, insumoId: 0 })).toBeNull();
    expect(leerAlerta({ ...MASA, creadaEn: "ayer" })).toBeNull();
    expect(leerAlertas([MASA, { ...MASA, id: 10, estado: "RESUELTA" }])).toEqual([MASA]);
    expect(leerAlertas([MASA, { id: "x" }])).toBeNull();
    expect(leerAlertas({ datos: [] })).toBeNull();
  });
});

describe("contador y orden", () => {
  const alertas = [
    { ...MASA, id: 1, estado: "VISTA", creadaEn: "2026-11-12T10:00:00-06:00" },
    { ...MASA, id: 2, creadaEn: "2026-11-12T09:00:00-06:00" },
    { ...MASA, id: 3, creadaEn: "2026-11-12T11:00:00-06:00" },
  ] as AlertaInsumo[];

  it("cuenta solo las ACTIVAS", () => {
    expect(contarActivas(alertas)).toBe(2);
    expect(contarActivas([])).toBe(0);
  });

  it("muestra primero las activas y luego las más recientes", () => {
    expect(ordenarAlertas(alertas).map((a) => a.id)).toEqual([3, 2, 1]);
  });

  it("formatos", () => {
    expect(formatoContadorAlertas(3)).toBe("3");
    expect(formatoContadorAlertas(120)).toBe("99+");
    expect(textoActivas(1)).toBe("1 alerta activa");
    expect(textoActivas(0)).toBe("0 alertas activas");
    expect(formatoFechaAlerta("2026-11-12T12:40:00-06:00")).toBe("12/11/2026 12:40");
  });
});
