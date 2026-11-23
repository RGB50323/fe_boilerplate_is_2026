import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MenuView } from "@/app/menu/menu-view";
import { SUCURSALES } from "@/lib/sucursales";

// H01. Consultar el menú digital de una sucursal (frontend).
// AC1, AC2, AC3 y AC6 se prueban en el backend: src/menu/services/h01-menu.spec.ts.

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn(), push: vi.fn() },
  params: { current: new URLSearchParams() },
  consultarMenu: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
  useSearchParams: () => mocks.params.current,
}));
vi.mock("next/font/google", () => ({ Fraunces: () => ({ className: "f" }) }));
vi.mock("@/app/actions/menu", () => ({ consultarMenu: mocks.consultarMenu }));
vi.mock("@/app/actions/auth", () => ({ logout: vi.fn() }));
vi.mock("@/app/actions/alertas-inventario", () => ({
  listarAlertas: vi.fn().mockResolvedValue({ alertas: [] }),
}));
vi.mock("@/components/notificaciones/campana-notificaciones", () => ({
  CampanaNotificaciones: () => null,
}));

const menu = {
  sucursalId: 1,
  categorias: [
    {
      id: 2,
      nombre: "Platillos principales",
      platillos: [
        {
          id: 5,
          nombre: "Pupusa revuelta",
          descripcion: "Maíz con queso",
          precio: 1.25,
          imagenUrl: null,
          disponibilidad: 40,
        },
      ],
    },
  ],
};

describe("H01. Consultar el menú digital de una sucursal", () => {
  beforeEach(() => {
    mocks.consultarMenu.mockReset();
    mocks.router.replace.mockClear();
  });

  it("AC4: combina categoría y rango de precio en la consulta y muestra los filtros activos", async () => {
    mocks.params.current = new URLSearchParams(
      "sucursal=1&categoriaId=2&precioMin=1&precioMax=5",
    );
    mocks.consultarMenu.mockResolvedValue({ menu });
    render(<MenuView autenticado={false} sucursales={SUCURSALES} />);
    await screen.findByText("Pupusa revuelta");

    expect(mocks.consultarMenu).toHaveBeenCalledWith(1, {
      q: "",
      categoriaId: "2",
      precioMin: "1",
      precioMax: "5",
    });
    expect(
      screen.getByRole("button", { name: /Quitar filtro Sección:/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Quitar filtro Precio mínimo: $1.00" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Quitar filtro Precio máximo: $5.00" }),
    ).toBeInTheDocument();
  });

  it("AC5: si ningún platillo cumple los filtros muestra el mensaje", async () => {
    mocks.params.current = new URLSearchParams("sucursal=1&q=zzz");
    mocks.consultarMenu.mockResolvedValue({
      menu: { sucursalId: 1, categorias: [] },
    });
    render(<MenuView autenticado={false} sucursales={SUCURSALES} />);

    expect(
      await screen.findByText("No hay platillos que coincidan con tu búsqueda"),
    ).toBeInTheDocument();
  });
});
