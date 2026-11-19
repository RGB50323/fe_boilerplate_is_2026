import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { consultarOcupacion } from "@/app/actions/ocupacion";
import { OcupacionView } from "@/app/admin/ocupacion/ocupacion-view";
import { SIN_HORARIO_ATENCION, SIN_MESAS_ACTIVAS } from "@/lib/ocupacion";

vi.mock("@/app/actions/ocupacion", () => ({
  consultarOcupacion: vi.fn(),
}));

const reemplazar = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: reemplazar, push: vi.fn() }),
}));

type CallbackEvento = (payload?: unknown) => void;
const eventosSocket: Record<string, CallbackEvento> = {};
const mockSocket = {
  on: vi.fn((evento: string, cb: CallbackEvento) => {
    eventosSocket[evento] = cb;
    return mockSocket;
  }),
  disconnect: vi.fn(),
};

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => mockSocket),
}));

const ocupacion = {
  fecha: "2026-11-20",
  sucursalId: 1,
  sucursal: "Centro",
  mesasActivas: 8,
  calculable: true,
  bloques: [
    {
      horaInicio: "08:00",
      horaFin: "09:00",
      mesasReservadas: 2,
      mesasDisponibles: 6,
      porcentajeOcupacion: 25,
    },
    {
      horaInicio: "09:00",
      horaFin: "10:00",
      mesasReservadas: 0,
      mesasDisponibles: 8,
      porcentajeOcupacion: 0,
    },
  ],
};

beforeEach(() => {
  vi.mocked(consultarOcupacion).mockReset();
  reemplazar.mockReset();
  mockSocket.on.mockClear();
  mockSocket.disconnect.mockClear();
  for (const key of Object.keys(eventosSocket)) delete eventosSocket[key];
  vi.mocked(consultarOcupacion).mockResolvedValue({ ocupacion });
});

describe("OcupacionView (H13)", () => {
  it("muestra de la sucursal las mesas activas, bloques horarios, reservadas, disponibles y porcentaje", async () => {
    render(
      <OcupacionView
        token="token-gerente"
        socketUrl="http://localhost:3000/ocupacion"
        sucursalId={1}
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Ocupación proyectada — Centro",
      }),
    ).toBeVisible();

    expect(screen.getByText("8")).toBeVisible(); // Mesas activas
    expect(screen.getByText("08:00 – 09:00")).toBeVisible();
    expect(screen.getByText("2 mesas")).toBeVisible();
    expect(screen.getByText("6 mesas")).toBeVisible();
    expect(screen.getByText("25 %")).toBeVisible();

    // Bloque sin reservaciones muestra 0 % (CA4)
    expect(screen.getByText("09:00 – 10:00")).toBeVisible();
    expect(screen.getByText("0 %")).toBeVisible();
  });

  it("si la sucursal no tiene mesas activas indica que no es posible calcularla (CA4)", async () => {
    vi.mocked(consultarOcupacion).mockResolvedValue({
      ocupacion: {
        ...ocupacion,
        mesasActivas: 0,
        calculable: false,
        bloques: [
          {
            horaInicio: "08:00",
            horaFin: "09:00",
            mesasReservadas: 0,
            mesasDisponibles: 0,
            porcentajeOcupacion: null,
          },
        ],
      },
    });

    render(
      <OcupacionView
        token="token-gerente"
        socketUrl="http://localhost:3000/ocupacion"
        sucursalId={1}
      />,
    );

    expect(await screen.findByText(SIN_MESAS_ACTIVAS)).toBeVisible();
    expect(screen.getByText("No disponible")).toBeVisible();
  });

  it("si la sucursal está cerrada ese día muestra el aviso de horario", async () => {
    vi.mocked(consultarOcupacion).mockResolvedValue({
      ocupacion: {
        ...ocupacion,
        bloques: [],
      },
    });

    render(
      <OcupacionView
        token="token-gerente"
        socketUrl="http://localhost:3000/ocupacion"
        sucursalId={1}
      />,
    );

    expect(await screen.findByText(SIN_HORARIO_ATENCION)).toBeVisible();
  });

  it("actualiza la ocupación automáticamente cuando el WebSocket emite ocupacion:actualizada (CA5)", async () => {
    render(
      <OcupacionView
        token="token-gerente"
        socketUrl="http://localhost:3000/ocupacion"
        sucursalId={1}
      />,
    );

    await screen.findByText("25 %");
    expect(consultarOcupacion).toHaveBeenCalledTimes(1);

    // Mock segunda llamada con nueva ocupación (tras crear/editar/cancelar una reserva)
    vi.mocked(consultarOcupacion).mockResolvedValue({
      ocupacion: {
        ...ocupacion,
        bloques: [
          {
            horaInicio: "08:00",
            horaFin: "09:00",
            mesasReservadas: 3,
            mesasDisponibles: 5,
            porcentajeOcupacion: 37.5,
          },
        ],
      },
    });

    // Simulamos evento del WebSocket para la fecha actual
    await act(async () => {
      eventosSocket["ocupacion:actualizada"]?.({
        sucursalId: 1,
      });
    });

    expect(await screen.findByText("37.5 %")).toBeVisible();
    expect(consultarOcupacion).toHaveBeenCalledTimes(2);
  });

  it("permite seleccionar otra fecha y consultar", async () => {
    render(
      <OcupacionView
        token="token-gerente"
        socketUrl="http://localhost:3000/ocupacion"
        sucursalId={1}
      />,
    );

    await screen.findByText("25 %");

    fireEvent.change(screen.getByLabelText("Fecha de proyección"), {
      target: { value: "2026-11-25" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Consultar" }));
    });

    expect(consultarOcupacion).toHaveBeenLastCalledWith("2026-11-25");
  });

  it("sin sesión redirige al login", async () => {
    vi.mocked(consultarOcupacion).mockResolvedValue({ sinSesion: true });

    render(
      <OcupacionView
        token="token-gerente"
        socketUrl="http://localhost:3000/ocupacion"
        sucursalId={1}
      />,
    );

    await act(async () => undefined);
    expect(reemplazar).toHaveBeenCalledWith("/login");
  });
});
