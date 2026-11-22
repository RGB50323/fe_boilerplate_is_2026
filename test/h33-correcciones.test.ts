// @vitest-environment node
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { proxy } from "@/proxy";
import { rutaConSucursal } from "@/lib/navegacion-sucursal";
import { tokenVencido } from "@/lib/roles";

// H33. Correcciones finales de calidad y seguridad (frontend).
// AC1, AC3, AC4, AC7 y AC8 se prueban en el backend:
// src/auth/services/h33-correcciones.spec.ts.

const token = (payload: Record<string, unknown>) =>
  `x.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.y`;
const ahora = Math.floor(Date.now() / 1000);

describe("H33. Correcciones finales de calidad y seguridad", () => {
  it("AC2: con la sesión vencida se puede volver a iniciar sesión", () => {
    const vencido = token({ rol: "CLIENTE", exp: ahora - 60 });
    expect(tokenVencido(vencido)).toBe(true);
    expect(tokenVencido(token({ rol: "CLIENTE", exp: ahora + 600 }))).toBe(false);

    const respuesta = proxy(
      new NextRequest("http://localhost/login", { headers: { cookie: `session=${vencido}` } }),
    );
    expect(respuesta.headers.get("location")).toBeNull();
    expect(respuesta.headers.get("set-cookie")).toMatch(/session=;/);
  });

  it("AC5: las sucursales del menú y de la administración se consultan al backend", async () => {
    for (const pagina of ["app/menu/page.tsx", "app/admin/platillos/page.tsx"]) {
      const fuente = readFileSync(pagina, "utf8");
      expect(fuente, pagina).toContain("listarSucursales");
      expect(fuente, pagina).not.toContain("SUCURSALES");
    }
    vi.stubEnv("API_URL", "http://api.local/api/v1");
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ id: 3, nombre: "Santa Tecla", horarios: [] }])),
    );
    vi.stubGlobal("fetch", fetch);
    const { listarSucursales } = await import("@/app/actions/reservaciones");

    const { sucursales } = await listarSucursales();
    expect(String(fetch.mock.calls[0][0])).toBe("http://api.local/api/v1/sucursales");
    expect(sucursales.map((s) => s.nombre)).toEqual(["Santa Tecla"]);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("AC6: se conserva la sucursal al navegar entre el menú y la administración", () => {
    expect(rutaConSucursal("/admin/platillos", "sucursal=2")).toBe("/admin/platillos?sucursal=2");
    expect(rutaConSucursal("/menu", "sucursal=2&q=pupu")).toBe("/menu?sucursal=2");
    expect(rutaConSucursal("/cocina", "sucursal=2")).toBe("/cocina");
  });
});
