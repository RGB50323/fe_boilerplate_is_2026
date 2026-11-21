import { beforeEach, describe, expect, it, vi } from "vitest";
import { soloClientes } from "@/lib/solo-clientes";

const mocks = vi.hoisted(() => ({
  obtenerUsuarioActual: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/usuario", () => ({ obtenerUsuarioActual: mocks.obtenerUsuarioActual }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

const usuario = (rol: string) => ({ id: "1", email: "u@example.com", rol, sucursalId: null });

describe("soloClientes", () => {
  beforeEach(() => {
    mocks.obtenerUsuarioActual.mockReset();
    mocks.redirect.mockReset();
  });

  it("deja pasar al cliente", async () => {
    mocks.obtenerUsuarioActual.mockResolvedValue(usuario("CLIENTE"));
    await soloClientes();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("deja pasar al invitado: la página decide si pide sesión", async () => {
    mocks.obtenerUsuarioActual.mockResolvedValue(null);
    await soloClientes();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it.each(["MESERO", "COCINA", "GERENTE", "GERENTE_GENERAL"])(
    "manda al menú al rol %s",
    async (rol) => {
      mocks.obtenerUsuarioActual.mockResolvedValue(usuario(rol));
      await soloClientes();
      expect(mocks.redirect).toHaveBeenCalledWith("/menu");
    },
  );
});
