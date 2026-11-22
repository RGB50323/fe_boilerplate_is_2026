import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { consultarResenas, type ResenasResultado } from "@/app/actions/resenas";
import { DrawerResenas } from "@/components/resenas/drawer-resenas";

// H22. Consultar las reseñas de los platillos (frontend).
// AC1, AC2 y AC5 se prueban en el backend:
// src/resenas/services/h22-consultar-resenas.spec.ts.

vi.mock("@/app/actions/resenas", () => ({ consultarResenas: vi.fn() }));
const consultar = vi.mocked(consultarResenas);

const pagina = (n: number, totalPaginas = 3): ResenasResultado => ({
  datos: {
    promedio: 4.6,
    total: 23,
    distribucion: { 1: 0, 2: 1, 3: 2, 4: 5, 5: 15 },
    pagina: n,
    totalPaginas,
    resenas: [
      {
        id: n,
        estrellas: 4,
        comentario: `Comentario ${n}`,
        fecha: "2026-10-28",
        cliente: "Ana L.",
      },
    ],
  },
});
const platillo = { id: 7, nombre: "Pupusa revuelta" };

describe("H22. Consultar las reseñas de los platillos", () => {
  beforeEach(() => consultar.mockReset());

  it("AC3: al navegar entre páginas muestra el número de la página actual", async () => {
    consultar.mockImplementation(async (_id, n) => pagina(n));
    render(<DrawerResenas platillo={platillo} onCerrar={() => {}} />);

    expect(await screen.findByText("Página 1 de 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(await screen.findByText("Página 2 de 3")).toBeInTheDocument();
    expect(consultar).toHaveBeenLastCalledWith(7, 2);
  });

  it("AC4: un platillo sin reseñas muestra el mensaje", async () => {
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
});
