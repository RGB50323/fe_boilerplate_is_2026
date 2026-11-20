import { describe, expect, it } from "vitest";
import { inicioParaRoles } from "@/lib/roles";

describe("H37. Acceso por rol", () => {
  it.each([
    [["CLIENTE"], "/menu"],
    [["MESERO"], "/mesero/pedidos"],
    [["COCINA"], "/cocina"],
    [["GERENTE"], "/dashboard"],
    [["GERENTE_GENERAL"], "/dashboard"],
    [["MESERO", "GERENTE"], "/dashboard"],
    [[], "/menu"],
  ])("AC1: el rol %j inicia en %s", (roles, esperado) => {
    expect(inicioParaRoles(roles)).toBe(esperado);
  });
});