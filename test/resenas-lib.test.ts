import { describe, expect, it } from "vitest";
import {
  esResenasPlatillo,
  formatoFecha,
  formatoPromedio,
  textoTotal,
} from "@/lib/resenas";

describe("lib/resenas", () => {
  it.each([
    [4.6, "4.6"],
    [4, "4.0"],
    [5, "5.0"],
  ])("formatoPromedio(%s) = %s", (valor, esperado) => {
    expect(formatoPromedio(valor)).toBe(esperado);
  });

  it("formatea la fecha con el mes abreviado", () => {
    expect(formatoFecha("2026-10-28")).toBe("28 oct 2026");
    expect(formatoFecha("x")).toBe("x");
  });

  it("textoTotal usa singular y plural", () => {
    expect(textoTotal(1)).toBe("1 reseña");
    expect(textoTotal(11)).toBe("11 reseñas");
  });

  it("valida la forma de la respuesta", () => {
    const ok = {
      promedio: null,
      total: 0,
      distribucion: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      pagina: 1,
      totalPaginas: 0,
      resenas: [],
    };
    expect(esResenasPlatillo(ok)).toBe(true);
    expect(esResenasPlatillo({ ...ok, resenas: null })).toBe(false);
    expect(esResenasPlatillo({ ...ok, promedio: "4" })).toBe(false);
    expect(esResenasPlatillo({ ...ok, distribucion: { 1: 0 } })).toBe(false);
    expect(esResenasPlatillo(null)).toBe(false);
  });
});
