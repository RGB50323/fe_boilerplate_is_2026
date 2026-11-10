import { describe, expect, it } from "vitest";
import { NOMBRE_MAX, validarNombre } from "@/lib/categorias";

describe("validarNombre", () => {
  it("acepta un nombre válido", () => {
    expect(validarNombre("Típicos")).toBeUndefined();
  });

  it("acepta un nombre de exactamente 50 caracteres", () => {
    expect(validarNombre("x".repeat(NOMBRE_MAX))).toBeUndefined();
  });

  it("recorta los espacios antes de contar", () => {
    expect(validarNombre(`  ${"x".repeat(NOMBRE_MAX)}  `)).toBeUndefined();
  });

  it.each([
    ["vacío", ""],
    ["solo espacios", "   "],
  ])("rechaza un nombre %s", (_descripcion, nombre) => {
    expect(validarNombre(nombre)).toBe(
      "El nombre de la categoría es obligatorio.",
    );
  });

  it("rechaza un nombre de más de 50 caracteres", () => {
    expect(validarNombre("x".repeat(NOMBRE_MAX + 1))).toContain("50");
  });
});
