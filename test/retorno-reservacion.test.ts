import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

describe("retorno al reservar después del login", () => {
  it("conserva selección y destino cuando no hay sesión", () => {
    const ruta =
      "/reservas/nueva?mesaId=3&sucursalId=1&fecha=2030-11-09&hora=19%3A00&personas=4";
    const respuesta = proxy(new NextRequest("https://losburle.test" + ruta));
    const destino = new URL(respuesta.headers.get("location")!);
    expect(destino.pathname).toBe("/login");
    expect(destino.searchParams.get("next")).toBe(ruta);
  });
  it("permite volver a autenticarse con cookie vencida y destino de H10", () => {
    const respuesta = proxy(
      new NextRequest(
        "https://losburle.test/login?next=%2Freservas%2Fnueva%3FmesaId%3D3",
        { headers: { cookie: "session=vencida" } },
      ),
    );
    expect(respuesta.headers.get("location")).toBeNull();
  });
  it("mantiene la búsqueda de disponibilidad pública", () => {
    expect(
      proxy(new NextRequest("https://losburle.test/reservas")).headers.get(
        "location",
      ),
    ).toBeNull();
  });
  it("protege el perfil y conserva su destino", () => {
    const respuesta = proxy(
      new NextRequest("https://losburle.test/perfil/reservaciones"),
    );
    expect(
      new URL(respuesta.headers.get("location")!).searchParams.get("next"),
    ).toBe("/perfil/reservaciones");
  });
});
