import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CampanaNotificaciones } from "@/components/notificaciones/campana-notificaciones";
import { NotificacionesProvider } from "@/components/notificaciones/notificaciones-provider";
import {
  listarNotificaciones,
  marcarNotificacionLeida,
  type ListaNotificacionesResultado,
} from "@/app/actions/notificaciones";

const navegar = vi.fn();
let rutaActual = "/";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navegar }),
  usePathname: () => rutaActual,
}));
vi.mock("@/app/actions/notificaciones", () => ({
  listarNotificaciones: vi.fn(),
  marcarNotificacionLeida: vi.fn(),
}));

const listar = vi.mocked(listarNotificaciones);
const marcar = vi.mocked(marcarNotificacionLeida);
const aviso = {
  id: 1,
  titulo: "Reservación confirmada",
  mensaje: "Tu mesa estará lista a las 7:00 p. m.",
  moduloOrigen: "RESERVACIONES",
  referencia: { tipo: "RESERVA", id: 8 },
  leida: false,
  creadaEn: "2026-11-07T15:30:00.000Z",
};

function lista(
  datos = [aviso],
  opciones: Partial<{
    total: number;
    pagina: number;
    noLeidas: number;
  }> = {},
): Extract<ListaNotificacionesResultado, { datos: unknown[] }> {
  return {
    datos,
    total: opciones.total ?? datos.length,
    pagina: opciones.pagina ?? 1,
    noLeidas: opciones.noLeidas ?? datos.filter((item) => !item.leida).length,
  };
}

function montar() {
  return render(
    <NotificacionesProvider>
      <CampanaNotificaciones />
    </NotificacionesProvider>,
  );
}

async function abrirPanel() {
  await act(async () => vi.advanceTimersByTimeAsync(0));
  fireEvent.click(screen.getByRole("button", { name: /Notificaciones,/i }));
  await act(async () => vi.advanceTimersByTimeAsync(0));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-07T16:00:00.000Z"));
  listar.mockReset();
  marcar.mockReset();
  navegar.mockReset();
  rutaActual = "/";
  listar.mockResolvedValue(lista());
  marcar.mockResolvedValue({
    id: 1,
    leida: true,
    leidaEn: "2026-11-07T16:01:00.000Z",
  });
});

describe("campana de notificaciones", () => {
  it("muestra el estado de carga y luego la lista completa", async () => {
    let resolver!: (resultado: ListaNotificacionesResultado) => void;
    montar();
    await act(async () => vi.advanceTimersByTimeAsync(0));
    listar.mockReturnValueOnce(
      new Promise((resolve) => {
        resolver = resolve;
      }),
    );
    await abrirPanel();

    expect(screen.getByLabelText("Cargando notificaciones")).toBeVisible();
    await act(async () => resolver(lista()));
    expect(screen.getByText(aviso.titulo)).toBeVisible();
    expect(screen.getByText(aviso.mensaje)).toBeVisible();
    expect(screen.getByText("Reservaciones")).toBeVisible();
    expect(screen.getByRole("time")).toHaveAttribute(
      "datetime",
      aviso.creadaEn,
    );
  });

  it("presenta la lista vacía", async () => {
    listar.mockResolvedValue(lista([], { noLeidas: 0 }));
    montar();
    await abrirPanel();
    expect(screen.getByText("No tienes notificaciones")).toBeVisible();
  });

  it("permite reintentar después de un error", async () => {
    listar.mockResolvedValue({ error: "No pudimos cargar tus notificaciones" });
    montar();
    await abrirPanel();
    expect(
      screen.getByText("No pudimos cargar tus notificaciones"),
    ).toBeVisible();

    listar.mockResolvedValue(lista());
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Reintentar" })),
    );
    expect(screen.getByText(aviso.titulo)).toBeVisible();
  });

  it("oculta cero y limita el contador visible a 9+", async () => {
    listar.mockResolvedValue(lista([], { noLeidas: 0 }));
    const vista = montar();
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    vista.unmount();

    listar.mockResolvedValue(lista([], { noLeidas: 12 }));
    montar();
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByText("9+")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /12 notificaciones sin leer/i }),
    ).toBeVisible();
  });

  it("marca al abrir, descuenta y navega a la referencia", async () => {
    montar();
    await act(async () => vi.advanceTimersByTimeAsync(0));
    await abrirPanel();
    const item = screen.getByRole("button", { name: /Reservación confirmada/ });
    await act(async () => fireEvent.click(item));

    expect(marcar).toHaveBeenCalledWith(1);
    expect(screen.queryByText("1")).not.toBeInTheDocument();
    expect(navegar).toHaveBeenCalledWith("/reservas");
  });

  it("anexa la segunda página con Ver más", async () => {
    const segundo = { ...aviso, id: 2, titulo: "Pedido listo", leida: true };
    listar
      .mockResolvedValueOnce(lista([aviso], { total: 2 }))
      .mockResolvedValueOnce(lista([aviso], { total: 2 }))
      .mockResolvedValueOnce(lista([segundo], { total: 2, pagina: 2 }));
    montar();
    await act(async () => vi.advanceTimersByTimeAsync(0));
    await abrirPanel();
    expect(screen.getByText(aviso.titulo)).toBeVisible();
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Ver más" })),
    );
    expect(screen.getByText(aviso.titulo)).toBeVisible();
    expect(screen.getByText(segundo.titulo)).toBeVisible();
    expect(listar).toHaveBeenLastCalledWith(2);
  });

  it("incorpora una notificación nueva al sondear a los 30 segundos", async () => {
    const nueva = { ...aviso, id: 3, titulo: "Nuevo pedido" };
    listar
      .mockResolvedValueOnce(lista())
      .mockResolvedValueOnce(lista())
      .mockResolvedValue(lista([nueva, aviso], { total: 2, noLeidas: 2 }));
    montar();
    await act(async () => vi.advanceTimersByTimeAsync(0));
    await abrirPanel();
    expect(screen.getByText(aviso.titulo)).toBeVisible();
    await act(async () => vi.advanceTimersByTimeAsync(30_000));
    expect(screen.getByText(nueva.titulo)).toBeVisible();
  });

  it("no renderiza la campana cuando no hay sesión", async () => {
    listar.mockResolvedValue({ sinSesion: true });
    montar();
    expect(
      screen.queryByRole("button", { name: /Notificaciones,/i }),
    ).not.toBeInTheDocument();
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(
      screen.queryByRole("button", { name: /Notificaciones,/i }),
    ).not.toBeInTheDocument();
  });

  it("aparece al navegar tras iniciar sesión sin esperar el sondeo", async () => {
    rutaActual = "/login";
    listar.mockResolvedValue({ sinSesion: true });
    const { rerender } = montar();
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(
      screen.queryByRole("button", { name: /Notificaciones,/i }),
    ).not.toBeInTheDocument();

    listar.mockResolvedValue(lista());
    rutaActual = "/";
    rerender(
      <NotificacionesProvider>
        <CampanaNotificaciones />
      </NotificacionesProvider>,
    );
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(
      screen.getByRole("button", { name: /Notificaciones, 1 notificación/i }),
    ).toBeVisible();
  });

  it("oculta la campana flotante mientras una pantalla tiene su campana en línea", async () => {
    const { rerender } = render(
      <NotificacionesProvider>
        <CampanaNotificaciones />
        <header data-testid="encabezado">
          <CampanaNotificaciones enLinea />
        </header>
      </NotificacionesProvider>,
    );
    await act(async () => vi.advanceTimersByTimeAsync(0));
    const campanas = screen.getAllByRole("button", {
      name: /Notificaciones,/i,
    });
    expect(campanas).toHaveLength(1);
    expect(screen.getByTestId("encabezado")).toContainElement(campanas[0]);

    // Al cerrar sesión la pantalla quita su campana sin cambiar de ruta.
    listar.mockResolvedValue({ sinSesion: true });
    rerender(
      <NotificacionesProvider>
        <CampanaNotificaciones />
        <header data-testid="encabezado" />
      </NotificacionesProvider>,
    );
    expect(
      screen.queryByRole("button", { name: /Notificaciones,/i }),
    ).not.toBeInTheDocument();
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(
      screen.queryByRole("button", { name: /Notificaciones,/i }),
    ).not.toBeInTheDocument();
  });

  it("vuelve a mostrar la flotante si sigue la sesión al salir de la pantalla con campana en línea", async () => {
    const { rerender } = render(
      <NotificacionesProvider>
        <CampanaNotificaciones />
        <CampanaNotificaciones enLinea />
      </NotificacionesProvider>,
    );
    await act(async () => vi.advanceTimersByTimeAsync(0));
    rerender(
      <NotificacionesProvider>
        <CampanaNotificaciones />
      </NotificacionesProvider>,
    );
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(
      screen.getByRole("button", { name: /Notificaciones,/i }),
    ).toBeVisible();
  });

  it("ignora una respuesta vieja que llega después de cerrar sesión", async () => {
    let resolverVieja!: (resultado: ListaNotificacionesResultado) => void;
    listar.mockReturnValueOnce(
      new Promise((resolver) => {
        resolverVieja = resolver;
      }),
    );
    listar.mockResolvedValue({ sinSesion: true });
    const { rerender } = render(
      <NotificacionesProvider>
        <CampanaNotificaciones />
        <CampanaNotificaciones enLinea />
      </NotificacionesProvider>,
    );
    await act(async () => vi.advanceTimersByTimeAsync(0));

    rerender(
      <NotificacionesProvider>
        <CampanaNotificaciones />
      </NotificacionesProvider>,
    );
    await act(async () => vi.advanceTimersByTimeAsync(0));
    await act(async () => resolverVieja(lista()));

    expect(
      screen.queryByRole("button", { name: /Notificaciones,/i }),
    ).not.toBeInTheDocument();
  });

  it("no sondea sin sesión hasta el siguiente cambio de ruta", async () => {
    listar.mockResolvedValue({ sinSesion: true });
    montar();
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(listar).toHaveBeenCalledTimes(1);

    await act(async () => vi.advanceTimersByTimeAsync(90_000));
    expect(listar).toHaveBeenCalledTimes(1);
  });

  it("con el panel abierto solo sondea el panel", async () => {
    montar();
    await abrirPanel();
    const llamadas = listar.mock.calls.length;

    await act(async () => vi.advanceTimersByTimeAsync(30_000));
    expect(listar).toHaveBeenCalledTimes(llamadas + 1);
  });

  it("muestra una etiqueta genérica para un módulo desconocido", async () => {
    listar.mockResolvedValue(lista([{ ...aviso, moduloOrigen: "NUEVO" }]));
    montar();
    await abrirPanel();
    expect(screen.getByText("General")).toBeVisible();
  });
});
