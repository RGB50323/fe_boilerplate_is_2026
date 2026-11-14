import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { consultarResenas, type ResenasResultado } from "@/app/actions/resenas";
import { CardPlatillo } from "@/components/menu/card-platillo";
import { CalificacionPlatillo } from "@/components/resenas/calificacion-platillo";
import { DrawerResenas } from "@/components/resenas/drawer-resenas";

vi.mock("@/app/actions/resenas", () => ({ consultarResenas: vi.fn() }));
const consultar = vi.mocked(consultarResenas);

const resena = (id: number) => ({
  id,
  estrellas: 4,
  comentario: `Comentario ${id}`,
  fecha: "2026-10-28",
  cliente: "Ana L.",
});

const pagina = (n: number, totalPaginas = 3): ResenasResultado => ({
  datos: {
    promedio: 4.6,
    total: 23,
    pagina: n,
    totalPaginas,
    resenas: [resena(n)],
  },
});

const platillo = { id: 7, nombre: "Pupusa revuelta" };

describe("CalificacionPlatillo", () => {
  it("muestra el promedio con un decimal y el total", () => {
    render(<CalificacionPlatillo promedio={4} total={23} />);
    expect(screen.getByText("4.0 (23)")).toBeInTheDocument();
  });

  it("sin reseñas lo indica", () => {
    render(<CalificacionPlatillo promedio={null} total={0} />);
    expect(screen.getByText("Sin reseñas")).toBeInTheDocument();
  });
});

describe("CardPlatillo", () => {
  const base = {
    id: 7,
    nombre: "Pupusa revuelta",
    descripcion: null,
    precio: 1.25,
    imagenUrl: null,
    disponibilidad: 4,
  };

  it("muestra la calificación y abre las reseñas", () => {
    const onVerResenas = vi.fn();
    render(
      <CardPlatillo
        platillo={{ ...base, promedio: 4.6, totalResenas: 23 }}
        onVerResenas={onVerResenas}
      />,
    );
    expect(screen.getByText("4.6 (23)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver reseñas" }));
    expect(onVerResenas).toHaveBeenCalled();
  });

  it("sin datos de reseñas no muestra calificación ni botón", () => {
    render(<CardPlatillo platillo={base} />);
    expect(screen.queryByText("Sin reseñas")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Ver reseñas" }),
    ).not.toBeInTheDocument();
  });
});

describe("DrawerResenas", () => {
  beforeEach(() => {
    consultar.mockReset();
  });

  it("muestra el estado de carga y luego las reseñas", async () => {
    consultar.mockResolvedValue(pagina(1));
    render(<DrawerResenas platillo={platillo} onCerrar={() => {}} />);

    expect(screen.getByLabelText("Reseñas")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(await screen.findByText("Comentario 1")).toBeInTheDocument();
    expect(screen.getByText("Ana L.")).toBeInTheDocument();
    expect(screen.getByText("28/10/2026")).toBeInTheDocument();
    expect(screen.getByText("4.6 (23)")).toBeInTheDocument();
    expect(consultar).toHaveBeenCalledWith(7, 1);
  });

  it("pagina y deshabilita Anterior/Siguiente en los extremos", async () => {
    consultar.mockImplementation(async (_id, n) => pagina(n));
    render(<DrawerResenas platillo={platillo} onCerrar={() => {}} />);

    expect(await screen.findByText("Página 1 de 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(await screen.findByText("Página 2 de 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(await screen.findByText("Página 3 de 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
    expect(consultar).toHaveBeenLastCalledWith(7, 3);
  });

  it("no muestra paginación con una sola página", async () => {
    consultar.mockResolvedValue(pagina(1, 1));
    render(<DrawerResenas platillo={platillo} onCerrar={() => {}} />);
    await screen.findByText("Comentario 1");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("sin reseñas muestra el mensaje vacío", async () => {
    consultar.mockResolvedValue({
      datos: {
        promedio: null,
        total: 0,
        pagina: 1,
        totalPaginas: 0,
        resenas: [],
      },
    });
    render(<DrawerResenas platillo={platillo} onCerrar={() => {}} />);
    expect(
      await screen.findByText("Este platillo aún no tiene reseñas"),
    ).toBeInTheDocument();
  });

  it.each([
    "No pudimos cargar las reseñas",
    "Este platillo ya no está disponible.",
  ])("muestra el error '%s' y permite reintentar", async (mensaje) => {
    consultar
      .mockResolvedValueOnce({ error: mensaje })
      .mockResolvedValueOnce(pagina(1));
    render(<DrawerResenas platillo={platillo} onCerrar={() => {}} />);

    expect(await screen.findByText(mensaje)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Comentario 1")).toBeInTheDocument();
    expect(consultar).toHaveBeenCalledTimes(2);
  });

  it("cerrado no consulta", () => {
    render(<DrawerResenas platillo={null} onCerrar={() => {}} />);
    expect(consultar).not.toHaveBeenCalled();
  });

  it("al cambiar de platillo vuelve a la página 1", async () => {
    consultar.mockImplementation(async (_id, n) => pagina(n));
    const { rerender } = render(
      <DrawerResenas platillo={platillo} onCerrar={() => {}} />,
    );
    await screen.findByText("Página 1 de 3");
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    await screen.findByText("Página 2 de 3");

    rerender(
      <DrawerResenas
        platillo={{ id: 9, nombre: "Horchata" }}
        onCerrar={() => {}}
      />,
    );
    expect(await screen.findByText("Página 1 de 3")).toBeInTheDocument();
    expect(consultar).toHaveBeenLastCalledWith(9, 1);
  });
});
