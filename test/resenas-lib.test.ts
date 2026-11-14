import { describe, expect, it } from "vitest";
import {
  esResenasPlatillo,
  formatoFecha,
  formatoPromedio,
} from "@/lib/resenas";

describe("lib/resenas", () => {
  it.each([
    [4.6, "4.6"],
    [4, "4.0"],
    [5, "5.0"],
  ])("formatoPromedio(%s) = %s", (valor, esperado) => {
    expect(formatoPromedio(valor)).toBe(esperado);
  });

  it("formatea la fecha como dd/mm/aaaa", () => {
    expect(formatoFecha("2026-10-28")).toBe("28/10/2026");
  });

  it("valida la forma de la respuesta", () => {
    const ok = {
      promedio: null,
      total: 0,
      pagina: 1,
      totalPaginas: 0,
      resenas: [],
    };
    expect(esResenasPlatillo(ok)).toBe(true);
    expect(esResenasPlatillo({ ...ok, resenas: null })).toBe(false);
    expect(esResenasPlatillo({ ...ok, promedio: "4" })).toBe(false);
    expect(esResenasPlatillo(null)).toBe(false);
  });
});
