import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  AccionesHeader,
  enlacesDelHeader,
} from "@/components/menu/acciones-header";

const textos = (p: Parameters<typeof enlacesDelHeader>[0]) =>
  enlacesDelHeader(p).map((e) => e.texto);

describe("enlacesDelHeader", () => {
  it("invitado: solo Reservar mesa", () => {
    expect(
      textos({ autenticado: false, esGerente: false, esMesero: false }),
    ).toEqual(["Reservar mesa"]);
  });

  it("cliente: reservar, pedidos y perfil", () => {
    expect(
      textos({ autenticado: true, esGerente: false, esMesero: false }),
    ).toEqual(["Reservar mesa", "Mis pedidos", "Mi perfil"]);
  });

  it("mesero: sin Reservar mesa ni Mis pedidos", () => {
    expect(
      textos({ autenticado: true, esGerente: false, esMesero: true }),
    ).toEqual(["Mi perfil", "Por entregar", "Registrar pedido"]);
  });

  it("gerente: sin Reservar mesa ni Mis pedidos", () => {
    expect(
      textos({ autenticado: true, esGerente: true, esMesero: false }),
    ).toEqual([
      "Mi perfil",
      "Calificaciones",
      "Moderar reseñas",
      "Gestionar platillos",
    ]);
  });
});

describe("AccionesHeader", () => {
  const props = {
    autenticado: true,
    esGerente: false,
    esMesero: false,
    cerrandoSesion: false,
    onCerrarSesion: vi.fn(),
    onIniciarSesion: vi.fn(),
  };

  it("el menú móvil se abre y se cierra con el botón y con Escape", () => {
    render(<AccionesHeader {...props} />);
    const boton = screen.getByRole("button", { name: "Menú" });
    expect(boton.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(boton);
    expect(boton.getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById("menu-movil")).not.toBeNull();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.getElementById("menu-movil")).toBeNull();
  });

  it("cerrar sesión llama al callback", () => {
    render(<AccionesHeader {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(props.onCerrarSesion).toHaveBeenCalledTimes(1);
  });

  it("invitado: Iniciar sesión llama al callback", () => {
    render(<AccionesHeader {...props} autenticado={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(props.onIniciarSesion).toHaveBeenCalledTimes(1);
  });
});
