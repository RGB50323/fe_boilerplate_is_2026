import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MenuView } from "@/app/menu/menu-view";

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn(), push: vi.fn() },
  params: { current: new URLSearchParams() },
  consultarMenu: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
  useSearchParams: () => mocks.params.current,
}));
vi.mock("next/font/google", () => ({
  Fraunces: () => ({ className: "font-test" }),
}));
vi.mock("@/app/actions/menu", () => ({ consultarMenu: mocks.consultarMenu }));
vi.mock("@/app/actions/auth", () => ({ logout: mocks.logout }));
vi.mock("@/components/notificaciones/campana-notificaciones", () => ({
  CampanaNotificaciones: () => null,
}));

const menu = {
  sucursalId: 1,
  categorias: [
    {
      id: 3,
      nombre: "Bebidas",
      platillos: [
        {
          id: 9,
          nombre: "Horchata",
          descripcion: "Horchata de morro",
          precio: 2.5,
          imagenUrl: null,
          disponibilidad: 30,
        },
      ],
    },
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

describe("pantalla del menú", () => {
  beforeEach(() => {
    mocks.router.replace.mockClear();
    mocks.router.push.mockClear();
    mocks.consultarMenu.mockReset();
    mocks.logout.mockReset();
    mocks.params.current = new URLSearchParams();
  });

  it("muestra el estado de carga mientras espera al backend", () => {
    mocks.consultarMenu.mockReturnValue(new Promise(() => {}));
    render(<MenuView autenticado={false} />);
    expect(screen.getByText("Cargando menú...")).toBeInTheDocument();
  });

  it("muestra los platillos agrupados por categoría con nombre, descripción y precio", async () => {
    mocks.consultarMenu.mockResolvedValue({ menu });
    render(<MenuView autenticado={false} />);

    expect(
      await screen.findByRole("heading", { name: "Bebidas" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Platillos principales" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Horchata")).toBeInTheDocument();
    expect(screen.getByText("$2.50")).toBeInTheDocument();
    expect(screen.getByText("Pupusa revuelta")).toBeInTheDocument();
    expect(screen.getByText("$1.25")).toBeInTheDocument();
  });

  it("muestra el mensaje cuando ningún platillo coincide", async () => {
    mocks.consultarMenu.mockResolvedValue({
      menu: { sucursalId: 1, categorias: [] },
    });
    render(<MenuView autenticado={false} />);
    expect(
      await screen.findByText("No hay platillos que coincidan con tu búsqueda"),
    ).toBeInTheDocument();
  });

  it("muestra el error y permite reintentar", async () => {
    mocks.consultarMenu.mockResolvedValue({
      error: "No pudimos cargar el menú",
    });
    render(<MenuView autenticado={false} />);
    expect(
      await screen.findByText("No pudimos cargar el menú"),
    ).toBeInTheDocument();

    mocks.consultarMenu.mockResolvedValue({ menu });
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Horchata")).toBeInTheDocument();
  });

  it("muestra el error bajo el campo si el precio mínimo es mayor que el máximo", async () => {
    mocks.consultarMenu.mockResolvedValue({ menu });
    render(<MenuView autenticado={false} />);
    await screen.findByText("Horchata");

    fireEvent.change(screen.getByLabelText("Precio mín."), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Precio máx."), {
      target: { value: "5" },
    });

    expect(
      await screen.findByText(
        "El precio mínimo no puede ser mayor que el máximo.",
      ),
    ).toBeInTheDocument();
    expect(mocks.router.replace).not.toHaveBeenCalledWith(
      expect.stringContaining("precio"),
      expect.anything(),
    );
  });

  it("consulta con los filtros de la URL y los muestra como etiquetas", async () => {
    mocks.params.current = new URLSearchParams("sucursal=1&q=pupu&precioMax=5");
    mocks.consultarMenu.mockResolvedValue({ menu });
    render(<MenuView autenticado={false} />);
    await screen.findByText("Horchata");

    expect(mocks.consultarMenu).toHaveBeenCalledWith(1, {
      q: "pupu",
      categoriaId: "",
      precioMin: "",
      precioMax: "5",
    });
    expect(
      screen.getByRole("button", { name: "Quitar filtro Búsqueda: “pupu”" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Quitar filtro Precio máximo: $5.00",
      }),
    ).toBeInTheDocument();
  });

  it("al escribir en la búsqueda actualiza la URL", async () => {
    mocks.consultarMenu.mockResolvedValue({ menu });
    render(<MenuView autenticado={false} />);
    await screen.findByText("Horchata");

    fireEvent.change(screen.getByLabelText("Buscar por nombre de platillo"), {
      target: { value: "pupu" },
    });

    await waitFor(() =>
      expect(mocks.router.replace).toHaveBeenCalledWith(
        "/menu?sucursal=1&q=pupu",
        {
          scroll: false,
        },
      ),
    );
  });

  it("al quitar una etiqueta se elimina ese filtro de la URL", async () => {
    mocks.params.current = new URLSearchParams("sucursal=1&q=pupu");
    mocks.consultarMenu.mockResolvedValue({ menu });
    render(<MenuView autenticado={false} />);
    await screen.findByText("Horchata");

    fireEvent.click(
      screen.getByRole("button", { name: "Quitar filtro Búsqueda: “pupu”" }),
    );

    await waitFor(() =>
      expect(mocks.router.replace).toHaveBeenCalledWith("/menu?sucursal=1", {
        scroll: false,
      }),
    );
  });
  it("sin sesión muestra Iniciar sesión", async () => {
    mocks.consultarMenu.mockResolvedValue({ menu });
    render(<MenuView autenticado={false} />);
    await screen.findByText("Horchata");

    expect(
      screen.getByRole("button", { name: "Iniciar sesión" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cerrar sesión" }),
    ).not.toBeInTheDocument();
  });

  it("con sesión muestra Cerrar sesión desde el primer render", () => {
    mocks.consultarMenu.mockReturnValue(new Promise(() => {}));
    render(<MenuView autenticado />);

    expect(
      screen.getByRole("button", { name: "Cerrar sesión" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Iniciar sesión" }),
    ).not.toBeInTheDocument();
  });

  it("al cerrar sesión llama a logout", async () => {
    mocks.consultarMenu.mockResolvedValue({ menu });
    mocks.logout.mockResolvedValue(undefined);
    render(<MenuView autenticado />);
    await screen.findByText("Horchata");

    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    await waitFor(() => expect(mocks.logout).toHaveBeenCalledTimes(1));
  });

  it("muestra el acceso a Categorías al gerente y navega al panel", async () => {
    mocks.consultarMenu.mockResolvedValue({ menu });
    render(<MenuView autenticado esGerente />);
    await screen.findByText("Horchata");

    fireEvent.click(screen.getByRole("button", { name: "Categorías" }));

    expect(mocks.router.push).toHaveBeenCalledWith("/admin/categorias");
  });

  it("no muestra el acceso a Categorías si no es gerente", async () => {
    mocks.consultarMenu.mockResolvedValue({ menu });
    render(<MenuView autenticado />);
    await screen.findByText("Horchata");

    expect(
      screen.queryByRole("button", { name: "Categorías" }),
    ).not.toBeInTheDocument();
  });
});
