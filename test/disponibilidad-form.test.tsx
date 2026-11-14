import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DisponibilidadForm } from "@/app/reservas/disponibilidad-form";
import {
  consultarDisponibilidad,
  type DisponibilidadResultado,
} from "@/app/actions/reservaciones";
vi.mock("@/app/actions/reservaciones", () => ({
  consultarDisponibilidad: vi.fn(),
}));
const consultar = vi.mocked(consultarDisponibilidad);
const sucursales = [
  {
    id: 8,
    nombre: "Centro",
    horarios: [
      { diaSemana: 1, apertura: "08:00", cierre: "21:00" },
      { diaSemana: 0, apertura: "08:00", cierre: "18:00" },
    ],
  },
  {
    id: 15,
    nombre: "Escalón",
    horarios: [{ diaSemana: 1, apertura: "10:00", cierre: "18:00" }],
  },
];
const mesa = { mesaId: 3, numero: 3, capacidad: 4, zona: "Salón" };
function montar(
  onReservar?: Parameters<typeof DisponibilidadForm>[0]["onReservar"],
) {
  return render(
    <DisponibilidadForm
      sucursales={sucursales}
      fechaInicial="2026-11-09"
      horasIniciales={["08:00", "08:30", "19:00"]}
      onReservar={onReservar}
    />,
  );
}
function pendiente() {
  let resolver!: (value: DisponibilidadResultado) => void;
  const promesa = new Promise<DisponibilidadResultado>((resolve) => {
    resolver = resolve;
  });
  return { promesa, resolver };
}
async function buscar() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Buscar mesas" }));
  });
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-07T12:00:00Z"));
  consultar.mockReset();
  consultar.mockResolvedValue({ mesas: [mesa] });
});
describe("formulario H09", () => {
  it("no consulta al montar y presenta Buscar mesas", () => {
    montar();
    expect(consultar).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Buscar mesas" })).toBeEnabled();
  });
  it.each([
    ["Personas", ""],
    ["Personas", "0"],
    ["Personas", "1.5"],
    ["Fecha", ""],
    ["Fecha", "2026-11-06"],
  ])("deshabilita al invalidar %s=%s y explica el error", (campo, value) => {
    montar();
    fireEvent.change(screen.getByLabelText(campo, { exact: true }), {
      target: { value },
    });
    expect(screen.getByRole("button", { name: "Buscar mesas" })).toBeDisabled();
    expect(screen.getByLabelText(campo, { exact: true })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(consultar).not.toHaveBeenCalled();
  });
  it("deshabilita sin horarios disponibles", () => {
    montar();
    fireEvent.change(screen.getByLabelText("Fecha", { exact: true }), {
      target: { value: "2026-11-10" },
    });
    expect(screen.getByRole("button", { name: "Buscar mesas" })).toBeDisabled();
    expect(screen.getByText(/No hay horarios disponibles/)).toBeVisible();
  });
  it("muestra loading y luego las mesas", async () => {
    const solicitud = pendiente();
    consultar.mockReturnValue(solicitud.promesa);
    montar();
    await buscar();
    expect(screen.getByRole("button", { name: "Buscando…" })).toBeDisabled();
    expect(screen.getByText("Buscando tu próxima mesa…")).toBeVisible();
    await act(async () => solicitud.resolver({ mesas: [mesa] }));
    expect(screen.getByRole("heading", { name: "Mesa 3" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Buscar mesas" })).toBeEnabled();
  });
  it("presenta el mensaje de lista vacía", async () => {
    consultar.mockResolvedValue({ mesas: [] });
    montar();
    await buscar();
    expect(
      screen.getByText(
        "No hay mesas disponibles para la fecha, hora y cantidad de personas seleccionadas",
      ),
    ).toBeVisible();
  });
  it.each([
    ["fecha", "Fecha"],
    ["hora", "Hora"],
    ["personas", "Personas"],
    ["sucursalId", "Sucursal"],
  ])(
    "muestra error del backend bajo %s sin alerta general",
    async (campo, label) => {
      consultar.mockResolvedValue({
        mesas: [],
        errores: { [campo]: "Corregí este campo" },
      });
      montar();
      await buscar();
      expect(
        screen.getByLabelText(label, { exact: true }),
      ).toHaveAccessibleDescription("Corregí este campo");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("heading", { name: "Mesa 3" }),
      ).not.toBeInTheDocument();
    },
  );
  it("muestra error general y permite reintentar", async () => {
    consultar.mockResolvedValueOnce({
      mesas: [],
      error: "No pudimos conectar",
    });
    montar();
    await buscar();
    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos conectar");
    await act(async () =>
      fireEvent.click(
        screen.getByRole("button", { name: "Intentar de nuevo" }),
      ),
    );
    expect(screen.getByRole("heading", { name: "Mesa 3" })).toBeVisible();
  });
  it("maneja excepciones de la acción", async () => {
    consultar.mockRejectedValue(new Error("Network"));
    montar();
    await buscar();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "No pudimos consultar la disponibilidad",
    );
  });
  it("espera 350 ms y agrupa cambios antes de consultar", async () => {
    montar();
    await buscar();
    fireEvent.change(screen.getByLabelText("Personas", { exact: true }), {
      target: { value: "2" },
    });
    await act(async () => vi.advanceTimersByTimeAsync(200));
    fireEvent.change(screen.getByLabelText("Personas", { exact: true }), {
      target: { value: "3" },
    });
    await act(async () => vi.advanceTimersByTimeAsync(349));
    expect(consultar).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(consultar).toHaveBeenCalledTimes(2);
    expect(consultar.mock.calls[1][0].get("personas")).toBe("3");
  });
  it("una respuesta antigua no reemplaza la consulta nueva", async () => {
    const vieja = pendiente(),
      nueva = pendiente();
    consultar
      .mockReturnValueOnce(vieja.promesa)
      .mockReturnValueOnce(nueva.promesa);
    montar();
    await buscar();
    fireEvent.change(screen.getByLabelText("Personas", { exact: true }), {
      target: { value: "2" },
    });
    await act(async () => vi.advanceTimersByTimeAsync(350));
    await act(async () =>
      nueva.resolver({ mesas: [{ ...mesa, mesaId: 5, numero: 5 }] }),
    );
    await act(async () => vieja.resolver({ mesas: [mesa] }));
    expect(screen.getByRole("heading", { name: "Mesa 5" })).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Mesa 3" }),
    ).not.toBeInTheDocument();
  });
  it("una respuesta pendiente no muestra mesas tras invalidar filtros", async () => {
    const solicitud = pendiente();
    consultar.mockReturnValue(solicitud.promesa);
    montar();
    await buscar();
    fireEvent.change(screen.getByLabelText("Personas", { exact: true }), {
      target: { value: "0" },
    });
    await act(async () => solicitud.resolver({ mesas: [mesa] }));
    expect(
      screen.queryByRole("heading", { name: "Mesa 3" }),
    ).not.toBeInTheDocument();
  });
  it("cambia las horas según la sucursal y envía su ID real", async () => {
    montar();
    fireEvent.change(screen.getByLabelText("Sucursal", { exact: true }), {
      target: { value: "15" },
    });
    const select = screen.getByLabelText("Hora", { exact: true });
    expect(select).toHaveValue("10:00");
    expect(
      within(select).queryByRole("option", { name: "7:00 p. m." }),
    ).not.toBeInTheDocument();
    await buscar();
    expect(consultar.mock.calls[0][0].get("sucursalId")).toBe("15");
  });
  it("no ofrece navegación rota mientras H10 está pendiente", async () => {
    montar();
    await buscar();
    expect(screen.getByRole("button", { name: "Reservar" })).toBeDisabled();
    expect(
      screen.getByText(
        "La confirmación de reservaciones todavía no está disponible.",
      ),
    ).toBeVisible();
  });
  it("entrega a H10 los datos del resultado, sin clienteId", async () => {
    const reservar = vi.fn();
    montar(reservar);
    await buscar();
    fireEvent.click(screen.getByRole("button", { name: "Reservar" }));
    expect(reservar).toHaveBeenCalledWith({
      mesaId: 3,
      sucursalId: 8,
      fecha: "2026-11-09",
      hora: "08:00",
      personas: 4,
    });
    fireEvent.change(screen.getByLabelText("Personas", { exact: true }), {
      target: { value: "2" },
    });
    expect(
      screen.queryByRole("button", { name: "Reservar" }),
    ).not.toBeInTheDocument();
  });
  it("cancela el debounce al desmontar", async () => {
    const vista = montar();
    await buscar();
    fireEvent.change(screen.getByLabelText("Personas", { exact: true }), {
      target: { value: "2" },
    });
    vista.unmount();
    await act(async () => vi.advanceTimersByTimeAsync(350));
    expect(consultar).toHaveBeenCalledTimes(1);
  });
});
