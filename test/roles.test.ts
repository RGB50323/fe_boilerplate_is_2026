import { describe, expect, it } from "vitest";
import {
  ROLES_COCINA,
  obtenerRoles,
  obtenerSucursalId,
  rolesRequeridosPara,
  tieneRolPermitido,
} from "@/lib/roles";
import { jwt } from "./cocina-helpers";

describe("roles del JWT", () => {
  it("lee el claim rol del backend", () => {
    expect(obtenerRoles(jwt({ sub: "u1", rol: "COCINA", sucursalId: 1 }))).toEqual(["COCINA"]);
    expect(obtenerRoles("no-es-un-jwt")).toEqual([]);
  });

  it("lee la sucursal del usuario", () => {
    expect(obtenerSucursalId(jwt({ rol: "COCINA", sucursalId: 2 }))).toBe(2);
    expect(obtenerSucursalId(jwt({ rol: "GERENTE_GENERAL", sucursalId: null }))).toBeNull();
  });

  it("solo permite COCINA, GERENTE y GERENTE_GENERAL en /cocina", () => {
    expect(rolesRequeridosPara("/cocina")).toEqual(ROLES_COCINA);
    expect(rolesRequeridosPara("/menu")).toBeNull();
    for (const rol of ["COCINA", "GERENTE", "GERENTE_GENERAL"]) {
      expect(tieneRolPermitido(jwt({ rol }), ROLES_COCINA)).toBe(true);
    }
    expect(tieneRolPermitido(jwt({ rol: "MESERO" }), ROLES_COCINA)).toBe(false);
    expect(tieneRolPermitido(jwt({ rol: "CLIENTE" }), ROLES_COCINA)).toBe(false);
  });
});
