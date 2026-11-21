import { describe, expect, it } from "vitest";
import {
  ROLES_COCINA,
  ROLES_GERENTE,
  ROLES_MESERO,
  obtenerRoles,
  obtenerSucursalId,
  rolesRequeridosPara,
  tieneRolPermitido,
  tokenVencido,
} from "@/lib/roles";
import { jwt } from "./cocina-helpers";

describe("roles del JWT", () => {
  it("lee el claim rol del backend", () => {
    expect(
      obtenerRoles(jwt({ sub: "u1", rol: "COCINA", sucursalId: 1 })),
    ).toEqual(["COCINA"]);
    expect(obtenerRoles("no-es-un-jwt")).toEqual([]);
  });

  it("lee la sucursal del usuario", () => {
    expect(obtenerSucursalId(jwt({ rol: "COCINA", sucursalId: 2 }))).toBe(2);
    expect(
      obtenerSucursalId(jwt({ rol: "GERENTE_GENERAL", sucursalId: null })),
    ).toBeNull();
  });

  it("solo permite COCINA, GERENTE y GERENTE_GENERAL en /cocina", () => {
    expect(rolesRequeridosPara("/cocina")).toEqual(ROLES_COCINA);
    expect(rolesRequeridosPara("/menu")).toBeNull();
    for (const rol of ["COCINA", "GERENTE", "GERENTE_GENERAL"]) {
      expect(tieneRolPermitido(jwt({ rol }), ROLES_COCINA)).toBe(true);
    }
    expect(tieneRolPermitido(jwt({ rol: "MESERO" }), ROLES_COCINA)).toBe(false);
    expect(tieneRolPermitido(jwt({ rol: "CLIENTE" }), ROLES_COCINA)).toBe(
      false,
    );
  });

  it("solo permite GERENTE en /admin/inventario", () => {
    expect(rolesRequeridosPara("/admin/inventario")).toEqual(ROLES_GERENTE);
    expect(rolesRequeridosPara("/admin/platillos")).toBeNull();
    expect(tieneRolPermitido(jwt({ rol: "GERENTE" }), ROLES_GERENTE)).toBe(true);
    for (const rol of ["GERENTE_GENERAL", "COCINA", "MESERO", "CLIENTE"]) {
      expect(tieneRolPermitido(jwt({ rol }), ROLES_GERENTE)).toBe(false);
    }
  });

  it("solo permite MESERO en /mesero/entregas", () => {
    expect(rolesRequeridosPara("/mesero/entregas")).toEqual(ROLES_MESERO);
    expect(rolesRequeridosPara("/mesero/pedidos")).toBeNull();
    expect(tieneRolPermitido(jwt({ rol: "MESERO" }), ROLES_MESERO)).toBe(true);
    for (const rol of ["COCINA", "GERENTE", "CLIENTE"]) {
      expect(tieneRolPermitido(jwt({ rol }), ROLES_MESERO)).toBe(false);
    }
  });
});

describe("tokenVencido", () => {
  const jwt = (exp: number) => `x.${btoa(JSON.stringify({ exp }))}.y`;
  it("detecta un token vencido", () => {
    expect(tokenVencido(jwt(Math.floor(Date.now() / 1000) - 10))).toBe(true);
  });
  it("acepta un token vigente", () => {
    expect(tokenVencido(jwt(Math.floor(Date.now() / 1000) + 600))).toBe(false);
  });
  it("trata un token malformado o sin exp como vencido", () => {
    expect(tokenVencido("basura")).toBe(true);
    expect(tokenVencido(`x.${btoa(JSON.stringify({}))}.y`)).toBe(true);
  });
});
