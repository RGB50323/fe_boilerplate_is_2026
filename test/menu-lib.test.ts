import { describe, expect, it } from "vitest";
import {
  FILTROS_VACIOS,
  filtrosAQuery,
  filtrosDesdeParams,
  formatoPrecio,
  validarFiltros,
} from "@/lib/menu";

describe("validarFiltros del menú", () => {
  it("acepta filtros vacíos", () => {
    expect(validarFiltros(FILTROS_VACIOS)).toEqual({});
  });

  it("acepta un rango válido y un rango con mínimo igual al máximo", () => {
    expect(validarFiltros({ ...FILTROS_VACIOS, precioMin: "1", precioMax: "5" })).toEqual({});
    expect(validarFiltros({ ...FILTROS_VACIOS, precioMin: "3", precioMax: "3" })).toEqual({});
  });

  it("rechaza un precio mínimo mayor que el máximo", () => {
    const errores = validarFiltros({ ...FILTROS_VACIOS, precioMin: "10", precioMax: "5" });
    expect(errores.precioMin).toContain("mínimo");
  });

  it.each([
    ["precioMin", "-1"],
    ["precioMax", "-0.5"],
    ["precioMin", "abc"],
    ["precioMax", "abc"],
  ])("rechaza %s=%s", (campo, valor) => {
    expect(validarFiltros({ ...FILTROS_VACIOS, [campo]: valor })).toHaveProperty(campo);
  });
});

describe("filtros y URL del menú", () => {
  it("lee los filtros desde los parámetros y usa el primer valor de un arreglo", () => {
    expect(
      filtrosDesdeParams({ q: ["pupu", "otro"], categoriaId: "2", precioMax: "5" }),
    ).toEqual({ q: "pupu", categoriaId: "2", precioMin: "", precioMax: "5" });
  });

  it("devuelve vacío cuando faltan parámetros", () => {
    expect(filtrosDesdeParams({})).toEqual(FILTROS_VACIOS);
  });

  it("arma la query con la sucursal y solo los filtros con valor", () => {
    expect(
      filtrosAQuery({ ...FILTROS_VACIOS, q: "pupu", precioMax: "5" }, 1),
    ).toBe("sucursal=1&q=pupu&precioMax=5");
  });

  it("recorta espacios y omite los filtros en blanco", () => {
    expect(filtrosAQuery({ ...FILTROS_VACIOS, q: "  pupu  ", categoriaId: "  " }, 2)).toBe(
      "sucursal=2&q=pupu",
    );
  });

  it("sin filtros ni sucursal devuelve una query vacía", () => {
    expect(filtrosAQuery(FILTROS_VACIOS)).toBe("");
  });
});

describe("formatoPrecio", () => {
  it.each([
    [1.25, "$1.25"],
    [2.5, "$2.50"],
    [3, "$3.00"],
  ])("formatea %s como %s", (valor, esperado) => {
    expect(formatoPrecio(valor)).toBe(esperado);
  });
});