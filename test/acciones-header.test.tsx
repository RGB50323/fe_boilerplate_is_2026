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
    ).toEqual(["Reservar mesa", "Mis pedidos", "Mi perfil", "Mis beneficios"]);
  });

  it("mesero: sin Reservar mesa, Mis pedidos ni Mi perfil", () => {
    expect(
      textos({ autenticado: true, esGerente: false, esMesero: true }),
    ).toEqual(["Por entregar", "Registrar pedido", "Canje de puntos"]);
  });

  it("gerente: sin Reservar mesa, Mis pedidos ni Mi perfil", () => {
    expect(
      textos({ autenticado: true, esGerente: true, esMesero: false }),
    ).toEqual([
      "Ocupación",
      "Calificaciones",
      "Moderar reseñas",
      "Inventario",
      "Cocina",
      "Dashboard",
      "Gestionar platillos",
      "Administrar beneficios",
      "Canje de puntos",
    ]);
  });

  it("cocina: solo el tablero de cocina", () => {
    expect(
      enlacesDelHeader({
        autenticado: true,
        esGerente: false,
        esMesero: false,
        esCocina: true,
      }),
    ).toEqual([{ href: "/cocina", texto: "Tablero de cocina", destacado: true }]);
  });

  it("gerente general: dashboard, administración de beneficios y canje", () => {
    expect(
      enlacesDelHeader({
        autenticado: true,
        esGerente: false,
        esMesero: false,
        esGerenteGeneral: true,
      }),
    ).toEqual([
      { href: "/admin/beneficios", texto: "Administrar beneficios" },
      { href: "/admin/beneficios/canjes", texto: "Canje de puntos" },
      { href: "/dashboard", texto: "Dashboard", destacado: true },
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
