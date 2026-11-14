import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { consultarResenas, type ResenasResultado } from "@/app/actions/resenas";
import { CardPlatillo } from "@/components/menu/card-platillo";
import { CalificacionPlatillo } from "@/components/resenas/calificacion-platillo";
import { DrawerResenas } from "@/components/resenas/drawer-resenas";
import { Estrellas } from "@/components/resenas/estrellas";

vi.mock("@/app/actions/resenas", () => ({ consultarResenas: vi.fn() }));
const consultar = vi.mocked(consultarResenas);

const distribucion = { 1: 0, 2: 1, 3: 2, 4: 5, 5: 15 };

const resena = (
  id: number,
  comentario: string | null = `Comentario ${id}`,
) => ({
  id,
  estrellas: 4,
  comentario,
  fecha: "2026-10-28",
  cliente: "Ana L.",
});

const pagina = (n: number, totalPaginas = 3): ResenasResultado => ({
  datos: {
    promedio: 4.6,
    total: 23,
    distribucion,
    pagina: n,
    totalPaginas,
    resenas: [resena(n)],
  },
});

const platillo = { id: 7, nombre: "Pupusa revuelta" };

describe("Estrellas", () => {
  it("rellena parcialmente la estrella del medio punto", () => {
    const { container } = render(<Estrellas valor={4.5} />);
    const rellenos = [
      ...container.querySelectorAll<HTMLElement>("[style]"),
    ].map((e) => e.style.width);
    expect(rellenos).toEqual(["100%", "100%", "100%", "100%", "50%"]);
  });
});

describe("CalificacionPlatillo", () => {
  it("muestra el promedio con un decimal y el total", () => {
    render(<CalificacionPlatillo promedio={4} total={23} />);
    expect(screen.getByText("4.0")).toBeInTheDocument();
    expect(screen.getByText("· 23 reseñas")).toBeInTheDocument();
  });

  it("sin reseñas lo indica", () => {
    render(<CalificacionPlatillo promedio={null} total={0} />);
    expect(screen.getByText("Sin reseñas aún")).toBeInTheDocument();
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

  it("la calificación abre las reseñas", () => {
    const onVerResenas = vi.fn();
    render(
      <CardPlatillo
        platillo={{ ...base, promedio: 4.6, totalResenas: 23 }}
        onVerResenas={onVerResenas}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Calificación 4.6 de 5, ver 23 reseñas",
      }),
    );
    expect(onVerResenas).toHaveBeenCalled();
  });

  it("sin datos de reseñas no muestra calificación", () => {
    render(<CardPlatillo platillo={base} />);
    expect(screen.queryByText("Sin reseñas aún")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("DrawerResenas", () => {
  beforeEach(() => {
    consultar.mockReset();
  });

  it("muestra la carga y luego el resumen con distribución y la lista", async () => {
    consultar.mockResolvedValue(pagina(1));
    render(<DrawerResenas platillo={platillo} onCerrar={() => {}} />);

    expect(screen.getByLabelText("Reseñas")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(await screen.findByText("Comentario 1")).toBeInTheDocument();
    expect(screen.getByText("4.6")).toBeInTheDocument();
    expect(screen.getByText("23 reseñas")).toBeInTheDocument();
    expect(screen.getByLabelText("5 estrellas: 15")).toBeInTheDocument();
    expect(screen.getByLabelText("1 estrella: 0")).toBeInTheDocument();
    expect(screen.getByText("Ana L.")).toBeInTheDocument();
    expect(screen.getByText("28 oct 2026")).toBeInTheDocument();
    expect(consultar).toHaveBeenCalledWith(7, 1);
  });

  it("indica cuando una reseña no tiene comentario", async () => {
    consultar.mockResolvedValue({
      datos: { ...pagina(1).datos!, resenas: [resena(1, null)] },
    });
    render(<DrawerResenas platillo={platillo} onCerrar={() => {}} />);
    expect(
      await screen.findByText("Calificó sin comentario."),
    ).toBeInTheDocument();
  });

  it("pagina y deshabilita Anterior/Siguiente en los extremos", async () => {
    consultar.mockImplementation(async (_id, n) => pagina(n));
    render(<DrawerResenas platillo={platillo} onCerrar={() => {}} />);

    expect(await screen.findByText("Página 1 de 3")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Página anterior" }),
    ).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(await screen.findByText("Comentario 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(await screen.findByText("Comentario 3")).toBeInTheDocument();
    expect(screen.getByText("Página 3 de 3")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Página siguiente" }),
    ).toBeDisabled();
    expect(consultar).toHaveBeenLastCalledWith(7, 3);
  });

  it("mientras carga otra página mantiene el resumen visible", async () => {
    let resolver: (r: ResenasResultado) => void = () => {};
    consultar
      .mockResolvedValueOnce(pagina(1))
      .mockImplementationOnce(() => new Promise((r) => (resolver = r)));
    render(<DrawerResenas platillo={platillo} onCerrar={() => {}} />);
    await screen.findByText("Comentario 1");

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(screen.getByLabelText("Reseñas")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.getByText("4.6")).toBeInTheDocument();
    expect(screen.getByText("Página 2 de 3")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Página siguiente" }),
    ).toBeDisabled();

    resolver(pagina(2));
    expect(await screen.findByText("Comentario 2")).toBeInTheDocument();
  });

  it("si la página ya no existe salta a la última", async () => {
    consultar.mockImplementation(async (_id, n) => pagina(n));
    render(<DrawerResenas platillo={platillo} onCerrar={() => {}} />);
    await screen.findByText("Comentario 1");
    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    await screen.findByText("Comentario 2");

    // Se ocultaron reseñas: ahora solo hay 2 páginas
    consultar.mockImplementation(async (_id, n) => pagina(n, 2));
    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));

    expect(await screen.findByText("Página 2 de 2")).toBeInTheDocument();
    expect(consultar).toHaveBeenLastCalledWith(7, 2);
    expect(screen.queryByText("Comentario 3")).not.toBeInTheDocument();
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
        distribucion: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
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
    await screen.findByText("Comentario 1");
    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    await screen.findByText("Comentario 2");

    rerender(
      <DrawerResenas
        platillo={{ id: 9, nombre: "Horchata" }}
        onCerrar={() => {}}
      />,
    );
    expect(await screen.findByText("Comentario 1")).toBeInTheDocument();
    expect(consultar).toHaveBeenLastCalledWith(9, 1);
  });
});
