import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as acciones from "@/app/actions/lealtad";
import { AdminBeneficios } from "@/app/admin/beneficios/admin-beneficios";
import { EditorRegla } from "@/app/admin/beneficios/editor-regla";
import { MisBeneficios } from "@/app/perfil/beneficios/mis-beneficios";
import { ModalCupon } from "@/components/lealtad/modal-cupon";
import { VerificarCupon } from "@/components/lealtad/verificar-cupon";
import type { BeneficioAdministrativo, Cupon, Puntos } from "@/lib/lealtad";

vi.mock("@/app/actions/lealtad", () => ({
  adquirirCupon: vi.fn(),
  consultarMisCupones: vi.fn(),
  deshabilitarRegla: vi.fn(),
  consultarPuntos: vi.fn(),
  consultarCatalogo: vi.fn(),
  consultarCupon: vi.fn(),
  utilizarCupon: vi.fn(),
  consultarRegla: vi.fn(),
  guardarRegla: vi.fn(),
  consultarBeneficiosAdministrativos: vi.fn(),
  guardarBeneficio: vi.fn(),
  deshabilitarBeneficio: vi.fn(),
}));

beforeEach(() => vi.resetAllMocks());

const beneficio: BeneficioAdministrativo = {
  id: 1,
  nombre: "Limonada",
  descripcion: "Bebida de cortesía",
  costoPuntos: 30,
  activo: true,
  vigenteDesde: "2026-11-19T00:00:00.000Z",
  vigenteHasta: "2026-11-30T00:00:00.000Z",
  deshabilitadoEn: null,
  estado: "ACTIVO",
};
const puntos: Puntos = {
  saldoDisponible: 35,
  puntosPendientes: 10,
  movimientos: [
    {
      id: 1,
      fecha: beneficio.vigenteDesde,
      tipo: "ACUMULACION",
      motivo: null,
      puntos: 10,
      saldoAnterior: 35,
      saldoResultante: 45,
    },
  ],
};
const cupon = (): Cupon => ({
  id: 1,
  codigo: "abc123",
  beneficio: { id: 1, nombre: "Limonada" },
  puntosUsados: 30,
  creadoEn: "2026-11-20T18:00:00.000Z",
  expiraEn: "2026-11-30T05:59:59.999Z",
  utilizadoEn: null,
  estado: "PENDIENTE",
});
const catalogo = {
  ok: true as const,
  datos: [
    beneficio,
    { ...beneficio, id: 2, nombre: "Postre", costoPuntos: 50 },
  ],
};

function renderMisBeneficios(cupones: Cupon[] = []) {
  return render(
    <MisBeneficios
      correo="cliente@example.test"
      puntosIniciales={{ ok: true, datos: puntos }}
      catalogoInicial={catalogo}
      cuponesIniciales={{ ok: true, datos: cupones }}
    />,
  );
}

function refrescoTrasCanje() {
  vi.mocked(acciones.consultarPuntos).mockResolvedValue({
    ok: true,
    datos: { ...puntos, saldoDisponible: 5 },
  });
  vi.mocked(acciones.consultarCatalogo).mockResolvedValue(catalogo);
  vi.mocked(acciones.consultarMisCupones).mockResolvedValue({
    ok: true,
    datos: [cupon()],
  });
}

describe("H18 y H19", () => {
  it("muestra saldo, pendientes e historial y bloquea el saldo insuficiente", () => {
    renderMisBeneficios();
    expect(screen.getByText("35 puntos")).toBeInTheDocument();
    expect(screen.getByText("10 puntos")).toBeInTheDocument();
    expect(screen.getByText("Acumulación")).toBeInTheDocument();
    expect(screen.getByText(/24 horas/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Canjear puntos" }));
    expect(
      screen.getByRole("button", { name: "Canjear Postre" }),
    ).toBeDisabled();
    expect(
      screen.getByText("Todavía no has canjeado beneficios."),
    ).toBeInTheDocument();
  });

  it("canjea solo al confirmar el resumen con costo y saldos", async () => {
    refrescoTrasCanje();
    vi.mocked(acciones.adquirirCupon).mockResolvedValue({
      ok: true,
      datos: cupon(),
    });
    renderMisBeneficios();
    fireEvent.click(screen.getByRole("button", { name: "Canjear puntos" }));
    fireEvent.click(screen.getByRole("button", { name: "Canjear Limonada" }));

    const resumen = screen.getByRole("dialog", { name: "Canjear Limonada" });
    expect(within(resumen).getByText("30 puntos")).toBeInTheDocument();
    expect(within(resumen).getByText("35 puntos")).toBeInTheDocument();
    expect(within(resumen).getByText("5 puntos")).toBeInTheDocument();
    expect(acciones.adquirirCupon).not.toHaveBeenCalled();

    const confirmar = within(resumen).getByRole("button", {
      name: "Confirmar",
    });
    fireEvent.click(confirmar);
    fireEvent.click(confirmar);
    const modal = await screen.findByRole("dialog", { name: "Limonada" });
    expect(within(modal).getByText("abc123")).toBeInTheDocument();
    expect(within(modal).getByText(/cliente@example.test/)).toBeInTheDocument();
    // Un doble clic en Confirmar hace un solo canje
    expect(acciones.adquirirCupon).toHaveBeenCalledTimes(1);
    // Al cerrar, el cupón queda en Mis cupones
    await waitFor(() =>
      expect(acciones.consultarMisCupones).toHaveBeenCalled(),
    );
    fireEvent.click(within(modal).getByRole("button", { name: "Cerrar" }));
    expect(
      await screen.findByRole("button", { name: "Ver código de Limonada" }),
    ).toBeInTheDocument();
  });

  it("cancelar el resumen no canjea", () => {
    renderMisBeneficios();
    fireEvent.click(screen.getByRole("button", { name: "Canjear puntos" }));
    fireEvent.click(screen.getByRole("button", { name: "Canjear Limonada" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(acciones.adquirirCupon).not.toHaveBeenCalled();
  });

  it("reusa la misma clave al reintentar tras un fallo de conexión", async () => {
    refrescoTrasCanje();
    vi.mocked(acciones.adquirirCupon)
      .mockResolvedValueOnce({ ok: false, error: "Error de conexión" })
      .mockResolvedValueOnce({ ok: true, datos: cupon() });
    renderMisBeneficios();
    fireEvent.click(screen.getByRole("button", { name: "Canjear puntos" }));
    fireEvent.click(screen.getByRole("button", { name: "Canjear Limonada" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByText("Error de conexión")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Canjear Limonada" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await screen.findByRole("dialog", { name: "Limonada" });
    const llamadas = vi.mocked(acciones.adquirirCupon).mock.calls;
    expect(llamadas).toHaveLength(2);
    expect(llamadas[0]).toEqual(llamadas[1]);
  });

  it("Mis cupones muestra el estado y deja volver a ver el código pendiente", () => {
    renderMisBeneficios([
      cupon(),
      {
        ...cupon(),
        id: 2,
        beneficio: { id: 2, nombre: "Postre" },
        utilizadoEn: "2026-11-21T18:00:00.000Z",
        estado: "UTILIZADO",
      },
    ]);
    expect(screen.getByText("Por usar")).toBeInTheDocument();
    expect(screen.getByText("Utilizado")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Ver código de Postre" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Ver código de Limonada" }),
    );
    const modal = screen.getByRole("dialog", { name: "Limonada" });
    expect(within(modal).getByText("abc123")).toBeInTheDocument();
    expect(within(modal).getByText(/Vence el/)).toBeInTheDocument();
  });

  it("un cupón expirado no muestra el código", () => {
    render(
      <ModalCupon
        cupon={{ ...cupon(), estado: "EXPIRADO" }}
        correo="cliente@example.test"
        onCerrar={() => {}}
      />,
    );
    expect(screen.getByText("El cupón ha expirado.")).toBeInTheDocument();
    expect(screen.queryByText("abc123")).not.toBeInTheDocument();
  });

  it("verifica y evita confirmar dos veces durante y después de la entrega", async () => {
    const datos = cupon();
    vi.mocked(acciones.consultarCupon).mockResolvedValue({ ok: true, datos });
    let entregar!: () => void;
    vi.mocked(acciones.utilizarCupon).mockImplementation(
      () =>
        new Promise((resolver) => {
          entregar = () =>
            resolver({
              ok: true,
              datos: {
                ...datos,
                utilizadoEn: beneficio.vigenteDesde,
                estado: "UTILIZADO",
              },
            });
        }),
    );
    render(<VerificarCupon />);
    fireEvent.change(screen.getByLabelText("Código del cupón"), {
      target: { value: " abc123 " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verificar cupón" }));
    const confirmar = await screen.findByRole("button", {
      name: "Confirmar uso",
    });
    expect(acciones.consultarCupon).toHaveBeenCalledWith("abc123");
    expect(
      screen.getByRole("heading", { name: "Limonada" }),
    ).toBeInTheDocument();
    fireEvent.click(confirmar);
    fireEvent.click(confirmar);
    expect(acciones.utilizarCupon).toHaveBeenCalledExactlyOnceWith("abc123");
    entregar();
    expect(await screen.findByText("Entrega confirmada")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Confirmar uso" }),
    ).not.toBeInTheDocument();
  });

  it("retira la confirmación si el cupón expiró en el servidor", async () => {
    vi.mocked(acciones.consultarCupon).mockResolvedValue({
      ok: true,
      datos: cupon(),
    });
    vi.mocked(acciones.utilizarCupon).mockResolvedValue({
      ok: false,
      estado: 410,
      error: "El cupón ha expirado.",
    });
    render(<VerificarCupon />);
    fireEvent.change(screen.getByLabelText("Código del cupón"), {
      target: { value: "abc123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verificar cupón" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Confirmar uso" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El cupón ha expirado.",
    );
    expect(
      screen.queryByRole("button", { name: "Confirmar uso" }),
    ).not.toBeInTheDocument();
  });
});

describe("H20", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-26T03:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it.each(["2026-11-25", "2026-11-30"])(
    "crea un beneficio del 25 de noviembre al %s",
    async (fin) => {
      vi.mocked(acciones.guardarBeneficio).mockResolvedValue({
        ok: true,
        datos: beneficio,
      });
      vi.mocked(acciones.consultarBeneficiosAdministrativos).mockResolvedValue({
        ok: true,
        datos: [beneficio],
      });
      render(<AdminBeneficios inicial={{ ok: true, datos: [] }} />);
      fireEvent.click(screen.getByRole("button", { name: "Crear beneficio" }));
      const modal = await screen.findByRole("dialog", {
        name: "Crear beneficio",
      });
      const formulario = within(modal);
      const inicio = formulario.getByLabelText("Inicio de vigencia");
      expect(inicio).toHaveAttribute("type", "date");
      expect(inicio).toHaveAttribute("min", "2026-11-25");
      expect(formulario.getByLabelText("Fin de vigencia")).toHaveAttribute(
        "type",
        "date",
      );
      for (const [campo, value] of [
        ["Nombre", "Limonada"],
        ["Descripción", "Bebida de cortesía"],
        ["Costo en puntos", "30"],
        ["Fin de vigencia", "2026-11-24"],
      ])
        fireEvent.change(formulario.getByLabelText(campo), {
          target: { value },
        });
      fireEvent.change(inicio, { target: { value: "2026-11-24" } });
      expect(formulario.getByRole("alert")).toHaveTextContent(
        /hoy o posterior/,
      );
      expect(
        formulario.getByRole("button", { name: "Guardar beneficio" }),
      ).toBeDisabled();
      fireEvent.change(inicio, { target: { value: "2026-11-25" } });
      expect(formulario.getByLabelText("Fin de vigencia")).toHaveAttribute(
        "min",
        "2026-11-25",
      );
      expect(formulario.getByRole("alert")).toHaveTextContent(
        /igual o posterior/,
      );
      expect(acciones.guardarBeneficio).not.toHaveBeenCalled();
      fireEvent.change(formulario.getByLabelText("Fin de vigencia"), {
        target: { value: fin },
      });
      fireEvent.click(
        formulario.getByRole("button", { name: "Guardar beneficio" }),
      );
      expect(
        await screen.findByText("Beneficio guardado."),
      ).toBeInTheDocument();
      expect(acciones.guardarBeneficio).toHaveBeenCalledExactlyOnceWith(
        {
          nombre: "Limonada",
          descripcion: "Bebida de cortesía",
          costoPuntos: 30,
          activo: true,
          vigenteDesde: "2026-11-25T00:00:00.000-06:00",
          vigenteHasta: `${fin}T23:59:59.999-06:00`,
        },
        undefined,
      );
    },
  );

  it("edita la regla en memoria, deshace y guarda únicamente al confirmar el cambio", async () => {
    vi.mocked(acciones.guardarRegla).mockResolvedValue({
      ok: true,
      datos: { puntosPorDolar: 3 },
    });
    render(
      <EditorRegla inicial={{ ok: true, datos: { puntosPorDolar: 2 } }} />,
    );
    const confirmar = screen.getByRole("button", { name: "Confirmar" });
    const valor = screen.getByRole("spinbutton", { name: "Puntos por dólar" });
    expect(confirmar).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Sumar un punto" }));
    expect(valor).toHaveValue(3);
    expect(acciones.guardarRegla).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(valor).toHaveValue(2);
    expect(confirmar).toBeDisabled();
    fireEvent.change(valor, { target: { value: "2.5" } });
    expect(confirmar).toBeDisabled();
    fireEvent.change(valor, { target: { value: "10" } });
    expect(
      screen.getByRole("button", { name: "Sumar un punto" }),
    ).toBeDisabled();
    fireEvent.change(valor, { target: { value: "3" } });
    fireEvent.click(confirmar);
    expect(await screen.findByText("Regla actualizada.")).toBeInTheDocument();
    expect(acciones.guardarRegla).toHaveBeenCalledExactlyOnceWith(3);
    expect(confirmar).toBeDisabled();
  });

  it("al editar usa el día de El Salvador y guarda los límites de cada fecha", async () => {
    vi.mocked(acciones.guardarBeneficio).mockResolvedValue({
      ok: true,
      datos: beneficio,
    });
    vi.mocked(acciones.consultarBeneficiosAdministrativos).mockResolvedValue({
      ok: true,
      datos: [beneficio],
    });
    render(<AdminBeneficios inicial={{ ok: true, datos: [beneficio] }} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar Limonada" }));
    const modal = await screen.findByRole("dialog", {
      name: "Editar beneficio",
    });
    expect(within(modal).getByLabelText("Inicio de vigencia")).toHaveValue(
      "2026-11-18",
    );
    expect(within(modal).getByLabelText("Fin de vigencia")).toHaveValue(
      "2026-11-29",
    );
    fireEvent.change(within(modal).getByLabelText("Nombre"), {
      target: { value: "Limonada con soda" },
    });
    fireEvent.click(
      within(modal).getByRole("button", { name: "Cambiar fecha de inicio" }),
    );
    fireEvent.change(within(modal).getByLabelText("Inicio de vigencia"), {
      target: { value: "2026-11-25" },
    });
    fireEvent.click(
      within(modal).getByRole("button", { name: "Guardar beneficio" }),
    );
    expect(await screen.findByText("Beneficio guardado.")).toBeInTheDocument();
    expect(acciones.guardarBeneficio).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        nombre: "Limonada con soda",
        vigenteDesde: "2026-11-25T00:00:00.000-06:00",
        vigenteHasta: beneficio.vigenteHasta,
      }),
      beneficio.id,
    );
  });

  it("conserva los instantes históricos y rechaza cambiar el inicio por otro día pasado", async () => {
    vi.mocked(acciones.guardarBeneficio).mockResolvedValue({
      ok: true,
      datos: beneficio,
    });
    vi.mocked(acciones.consultarBeneficiosAdministrativos).mockResolvedValue({
      ok: true,
      datos: [beneficio],
    });
    render(<AdminBeneficios inicial={{ ok: true, datos: [beneficio] }} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar Limonada" }));
    const modal = within(
      await screen.findByRole("dialog", { name: "Editar beneficio" }),
    );
    const inicio = modal.getByLabelText("Inicio de vigencia");
    const guardar = modal.getByRole("button", { name: "Guardar beneficio" });
    expect(inicio).toHaveAttribute("readonly");
    fireEvent.click(
      modal.getByRole("button", { name: "Cambiar fecha de inicio" }),
    );
    fireEvent.change(inicio, { target: { value: "2026-11-20" } });
    expect(inicio).toHaveAttribute("min", "2026-11-25");
    expect(modal.getByRole("alert")).toHaveTextContent(/hoy o posterior/);
    expect(guardar).toBeDisabled();
    fireEvent.click(
      modal.getByRole("button", { name: "Conservar inicio guardado" }),
    );
    fireEvent.click(guardar);
    expect(await screen.findByText("Beneficio guardado.")).toBeInTheDocument();
    expect(acciones.guardarBeneficio).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        vigenteDesde: beneficio.vigenteDesde,
        vigenteHasta: beneficio.vigenteHasta,
      }),
      beneficio.id,
    );
  });

  it("exige confirmación para deshabilitar y retira las acciones de edición", async () => {
    const baja: BeneficioAdministrativo = {
      ...beneficio,
      activo: false,
      estado: "DESHABILITADO",
      deshabilitadoEn: beneficio.vigenteDesde,
    };
    vi.mocked(acciones.deshabilitarBeneficio).mockResolvedValue({
      ok: true,
      datos: baja,
    });
    vi.mocked(acciones.consultarBeneficiosAdministrativos).mockResolvedValue({
      ok: true,
      datos: [baja],
    });
    render(<AdminBeneficios inicial={{ ok: true, datos: [beneficio] }} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Deshabilitar Limonada" }),
    );
    expect(acciones.deshabilitarBeneficio).not.toHaveBeenCalled();
    const modal = await screen.findByRole("dialog", {
      name: "Deshabilitar beneficio",
    });
    fireEvent.click(
      within(modal).getByRole("button", { name: "Confirmar deshabilitación" }),
    );
    await waitFor(() =>
      expect(screen.getByText("DESHABILITADO")).toBeInTheDocument(),
    );
    expect(acciones.deshabilitarBeneficio).toHaveBeenCalledExactlyOnceWith(1);
    expect(
      screen.queryByRole("button", { name: "Editar Limonada" }),
    ).not.toBeInTheDocument();
  });
  it("deshabilita la regla solo después de confirmar", async () => {
    vi.mocked(acciones.deshabilitarRegla).mockResolvedValue({
      ok: true,
      datos: { puntosPorDolar: 2 },
    });
    render(
      <EditorRegla inicial={{ ok: true, datos: { puntosPorDolar: 2 } }} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Deshabilitar regla" }));
    expect(acciones.deshabilitarRegla).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Sí, deshabilitar regla" }),
    );
    expect(
      await screen.findByText(
        "Regla deshabilitada. Las compras ya no acumulan puntos.",
      ),
    ).toBeInTheDocument();
    expect(acciones.deshabilitarRegla).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText("Todavía no hay una regla vigente."),
    ).toBeInTheDocument();
  });
});
