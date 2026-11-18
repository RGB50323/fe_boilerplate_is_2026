import { describe, expect, it } from "vitest";
import {
  alternarSucursal,
  calcularComparativo,
  comparativoAQuery,
  comparativoDesdeParams,
  COMPARATIVO_INICIAL,
  formatoDiferencia,
  mensajeAtencion,
} from "@/lib/comparativo";

const IDS = [1, 2, 3];
// ticketPromedio lo envía el backend; aquí se usa el mismo redondeo.
const s = (sucursalId: number, nombre: string, ventas: number, pedidos: number) => ({
  sucursalId,
  nombre,
  ventas,
  pedidos,
  ticketPromedio: pedidos ? Math.round((ventas * 100) / pedidos) / 100 : 0,
});

describe("calcularComparativo", () => {
  // Datos del mockup de H29.
  const comparativo = calcularComparativo([
    s(1, "Centro", 8120, 640),
    s(2, "Escalón", 4310.25, 330),
    s(3, "Santa Tecla", 2800.25, 210),
  ]);

  it("usa el promedio de ventas de las sucursales comparadas como referencia", () => {
    expect(comparativo.promedio).toBe(5076.83);
    expect(comparativo.umbral).toBe(4061.47);
  });

  it("usa el ticket promedio que calcula el backend (mismo cálculo que H28)", () => {
    expect(comparativo.filas.map((f) => f.ticketPromedio)).toEqual([12.69, 13.06, 13.33]);
    const delBackend = calcularComparativo([
      { ...s(1, "A", 100, 3), ticketPromedio: 33.34 },
      s(2, "B", 100, 4),
    ]);
    expect(delBackend.filas[0].ticketPromedio).toBe(33.34);
  });

  it("calcula la diferencia porcentual respecto al promedio", () => {
    expect(comparativo.filas.map((f) => formatoDiferencia(f.diferencia))).toEqual([
      "+59.9 %",
      "−15.1 %",
      "−44.8 %",
    ]);
  });

  it("marca solo las sucursales más de 20 % por debajo del promedio", () => {
    expect(comparativo.enAtencion.map((f) => f.nombre)).toEqual(["Santa Tecla"]);
    expect(mensajeAtencion(comparativo.enAtencion)).toBe(
      "Santa Tecla tiene ventas 44.8 % por debajo del promedio",
    );
  });

  it("exactamente 20 % por debajo no requiere atención; un centavo menos sí", () => {
    const justo = calcularComparativo([s(1, "A", 80, 8), s(2, "B", 110, 11), s(3, "C", 110, 11)]);
    expect(justo.promedio).toBe(100);
    expect(justo.enAtencion).toEqual([]);

    const debajo = calcularComparativo([
      s(1, "A", 79.99, 8),
      s(2, "B", 110, 11),
      s(3, "C", 110.01, 11),
    ]);
    expect(debajo.enAtencion.map((f) => f.nombre)).toEqual(["A"]);
  });

  it("sin ventas: todas en $0.00, ninguna marcada y diferencia 0", () => {
    const vacio = calcularComparativo([s(1, "A", 0, 0), s(2, "B", 0, 0)]);
    expect(vacio.sinVentas).toBe(true);
    expect(vacio.promedio).toBe(0);
    expect(vacio.enAtencion).toEqual([]);
    expect(vacio.filas.map((f) => formatoDiferencia(f.diferencia))).toEqual(["0.0 %", "0.0 %"]);
  });

  it("una sucursal sin ventas frente a otras con ventas sí requiere atención", () => {
    const r = calcularComparativo([s(1, "A", 0, 0), s(2, "B", 500, 40)]);
    expect(r.sinVentas).toBe(false);
    expect(r.enAtencion.map((f) => f.nombre)).toEqual(["A"]);
    expect(formatoDiferencia(r.filas[0].diferencia)).toBe("−100.0 %");
  });
});

describe("filtros del comparativo en la URL", () => {
  it("por defecto compara todas las sucursales", () => {
    expect(comparativoDesdeParams({}, IDS)).toEqual(COMPARATIVO_INICIAL);
  });

  it("lee las sucursales elegidas e ignora ids desconocidos", () => {
    expect(comparativoDesdeParams({ sucursales: "3,1,99,abc" }, IDS).sucursales).toEqual([1, 3]);
    expect(comparativoDesdeParams({ sucursales: "" }, IDS).sucursales).toEqual([]);
  });

  it("solo escribe las sucursales cuando no son todas", () => {
    expect(comparativoAQuery(COMPARATIVO_INICIAL)).toBe("periodo=mes");
    expect(comparativoAQuery({ ...COMPARATIVO_INICIAL, sucursales: [1, 3] })).toBe(
      "periodo=mes&sucursales=1%2C3",
    );
  });

  it("al desmarcar y volver a marcar regresa a todas", () => {
    const sinDos = alternarSucursal(COMPARATIVO_INICIAL, 2, IDS);
    expect(sinDos.sucursales).toEqual([1, 3]);
    expect(alternarSucursal(sinDos, 2, IDS).sucursales).toBeNull();
  });
});
