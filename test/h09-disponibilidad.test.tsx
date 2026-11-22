import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DisponibilidadForm } from "@/app/reservas/disponibilidad-form";
import { consultarDisponibilidad } from "@/app/actions/reservaciones";

// H09. Consultar la disponibilidad de mesas (frontend).
// AC1, AC2 y AC3 se prueban en el backend:
// src/reservaciones/services/h09-disponibilidad.spec.ts.

vi.mock("@/app/actions/reservaciones", () => ({ consultarDisponibilidad: vi.fn() }));
const consultar = vi.mocked(consultarDisponibilidad);

const sucursales = [
  { id: 8, nombre: "Centro", horarios: [{ diaSemana: 1, apertura: "08:00", cierre: "21:00" }] },
];

function montar() {
  render(
    <DisponibilidadForm
      sucursales={sucursales}
      fechaInicial="2026-11-23"
      horasIniciales={["08:00", "19:00"]}
    />,
  );
}

async function buscar() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Buscar mesas" }));
  });
}

describe("H09. Consultar la disponibilidad de mesas", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-21T12:00:00Z"));
    consultar.mockReset();
  });

  afterEach(() => vi.useRealTimers());

  it("AC4: sin mesas para los criterios muestra el mensaje", async () => {
    consultar.mockResolvedValue({ mesas: [] });
    montar();
    await buscar();

    expect(
      screen.getByText(
        "No hay mesas disponibles para la fecha, hora y cantidad de personas seleccionadas",
      ),
    ).toBeVisible();
  });

  it("AC5: al cambiar los datos de búsqueda se vuelve a consultar y se actualizan las opciones", async () => {
    consultar.mockResolvedValueOnce({
      mesas: [{ mesaId: 3, numero: 3, capacidad: 4, zona: "Salón" }],
    });
    montar();
    await buscar();
    expect(screen.getByRole("heading", { name: "Mesa 3" })).toBeVisible();

    consultar.mockResolvedValueOnce({
      mesas: [{ mesaId: 7, numero: 7, capacidad: 8, zona: "Terraza" }],
    });
    fireEvent.change(screen.getByLabelText("Personas", { exact: true }), {
      target: { value: "6" },
    });
    await act(async () => vi.advanceTimersByTimeAsync(400));

    expect(consultar).toHaveBeenCalledTimes(2);
    expect(consultar.mock.calls[1][0].get("personas")).toBe("6");
    expect(screen.getByRole("heading", { name: "Mesa 7" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Mesa 3" })).not.toBeInTheDocument();
  });
});
