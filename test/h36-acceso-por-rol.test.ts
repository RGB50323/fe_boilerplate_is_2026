// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "@/proxy";
import { inicioDelToken, inicioParaRoles } from "@/lib/roles";
import { retornoLogin } from "@/lib/retorno-login";

// H36. Acceso por rol.
// Nota: test/inicio-por-rol.test.ts cubre el AC1 con el título "H37. Acceso por rol",
// pero en Jira esta historia es H36 (H37 es Imágenes de platillos en Supabase Storage).

const token = (payload: Record<string, unknown>) =>
  `x.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 600, ...payload })).toString("base64url")}.y`;

const visitar = (ruta: string, sesion?: string) =>
  proxy(
    new NextRequest(`http://localhost${ruta}`, {
      headers: sesion ? { cookie: `session=${sesion}` } : {},
    }),
  );

const destino = (respuesta: Response) => {
  const location = respuesta.headers.get("location");
  return location ? new URL(location).pathname + new URL(location).search : null;
};

describe("H36. Acceso por rol", () => {
  it("AC1: al iniciar sesión cada rol aterriza en su pantalla", () => {
    expect(inicioParaRoles(["CLIENTE"])).toBe("/menu");
    expect(inicioParaRoles(["MESERO"])).toBe("/mesero/pedidos");
    expect(inicioParaRoles(["COCINA"])).toBe("/cocina");
    expect(inicioParaRoles(["GERENTE"])).toBe("/dashboard");
    expect(inicioParaRoles(["GERENTE_GENERAL"])).toBe("/dashboard");
  });

  it("AC2: si viene de una ruta válida guardada en next, vuelve a esa ruta", () => {
    expect(retornoLogin("/reservas/nueva?mesa=3")).toBe("/reservas/nueva?mesa=3");
    expect(retornoLogin("https://otro-sitio.com")).toBe("/menu");
    expect(destino(visitar("/perfil/reservaciones"))).toBe("/login?next=%2Fperfil%2Freservaciones");
  });

  it("AC3: con sesión activa, /login lleva a su pantalla sin mostrar el formulario", () => {
    expect(destino(visitar("/login", token({ rol: "COCINA" })))).toBe("/cocina");
  });

  it("AC4: en una ruta que no es de su rol va a su pantalla y no a /menu", () => {
    expect(destino(visitar("/cocina", token({ rol: "MESERO" })))).toBe("/mesero/pedidos");
  });

  it("AC5: con varios roles prevalece el de mayor jerarquía", () => {
    expect(inicioDelToken(token({ roles: ["COCINA", "MESERO"] }))).toBe("/mesero/pedidos");
    expect(inicioDelToken(token({ roles: ["MESERO", "GERENTE", "GERENTE_GENERAL"] }))).toBe("/dashboard");
  });

  it("AC6: un token sin rol reconocido o inválido termina en /menu", () => {
    expect(inicioDelToken(token({ rol: "INVITADO" }))).toBe("/menu");
    expect(inicioDelToken("no-es-un-jwt")).toBe("/menu");
  });
});
