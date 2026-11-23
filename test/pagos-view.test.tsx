import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consultarPago, consultarPagoPedido, procesarPago } from "@/app/actions/pagos";
import { obtenerPedido } from "@/app/actions/pedidos";
import { DescargarComprobante } from "@/components/pagos/descargar-comprobante";
import { PagoPedido } from "@/components/pagos/pago-pedido";
import { useState } from "react";
import type { PedidoSeguimiento } from "@/lib/seguimiento";
import type { ResultadoPago } from "@/lib/pagos";

vi.mock("@/app/actions/pagos", () => ({ consultarPago: vi.fn(), consultarPagoPedido: vi.fn(), procesarPago: vi.fn() }));
vi.mock("@/app/actions/pedidos", () => ({ obtenerPedido: vi.fn() }));

const pedido = {
  pedidoId: 87,
  total: 17.5,
  items: [{ itemId: 1, platilloId: 2, nombre: "Limonada", cantidad: 1, precioUnitario: 17.5, nota: null, estado: "ENTREGADO" }],
};

function resultado(estado: ResultadoPago["estado"], comprobanteId: number | null = null) {
  return { estado, comprobanteId, transaccionId: "simulada-1", pagoId: 31, ticketId: 87 };
}

const mesa = () => render(<PagoPedido tipo="MESA" usuarioId="mesero" estadoPedido="ENTREGADO" pedido={pedido} pagoInicial={{ ok: true, datos: null }} />);

function completarTarjeta() {
  fireEvent.change(screen.getByLabelText("Número de tarjeta ficticia"), { target: { value: "4242424242424242" } });
  fireEvent.change(screen.getByLabelText("Nombre ficticio del titular"), { target: { value: "Ana Demo" } });
  fireEvent.change(screen.getByLabelText("Vencimiento (MM/AA)"), { target: { value: "1230" } });
  fireEvent.change(screen.getByLabelText("Código de seguridad ficticio"), { target: { value: "123" } });
}

const avanzar = async (ms = 4000) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

function cliente(actualizarPago: () => Promise<{ ok: true; datos: PedidoSeguimiento }>) {
  function Vista() {
    const [actual, setActual] = useState<PedidoSeguimiento>({
      ...pedido, estado: "PENDIENTE_PAGO", numero: null, sucursal: "Centro",
      nombreCliente: "Ana Demo", creadoEn: "", pago: null,
    });
    return <PagoPedido tipo="LLEVAR" pedido={actual} estadoPedido={actual.estado}
      pago={actual.pago} comprobanteId={actual.comprobanteId}
      actualizarPago={actualizarPago} onSeguimiento={setActual} />;
  }
  return render(<Vista />);
}

beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("PagoPedido", () => {
  it.each(["", "cliente@example.test"])("cobra MESA con correo opcional %j y conserva la solicitud al reintentar", async (correo) => {
    vi.mocked(procesarPago).mockResolvedValueOnce({ ok: false, error: "Sin conexión" })
      .mockResolvedValueOnce({ ok: true, datos: resultado("CONFIRMADO") });
    mesa();
    fireEvent.change(screen.getByLabelText(/Correo de lealtad/), { target: { value: correo } });
    fireEvent.change(screen.getByLabelText("Monto recibido"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pago" }));
    const reintentar = await screen.findByRole("button", { name: "Reintentar el mismo pago" });
    const [solicitud] = vi.mocked(procesarPago).mock.calls[0];
    if (correo) expect(solicitud.correoLealtad).toBe(correo);
    else expect(solicitud).not.toHaveProperty("correoLealtad");
    expect(screen.getByLabelText(/Correo de lealtad/)).toBeDisabled();
    fireEvent.click(reintentar);
    expect(await screen.findByText("Pago confirmado")).toBeInTheDocument();
    expect(procesarPago).toHaveBeenNthCalledWith(2, solicitud);
  });

  it("recupera un pago de otro mesero y descarga el comprobante en una nueva visita sin almacenamiento", async () => {
    vi.useFakeTimers();
    vi.mocked(consultarPago).mockResolvedValue({ ok: true, datos: resultado("CONFIRMADO", 25) });
    const primera = render(<PagoPedido tipo="MESA" usuarioId="mesero" estadoPedido="ENTREGADO"
      pedido={pedido} pagoInicial={{ ok: true, datos: resultado("PENDIENTE") }} />);
    expect(screen.queryByLabelText("Monto recibido")).not.toBeInTheDocument();
    await avanzar();
    expect(consultarPago).toHaveBeenCalledWith("simulada-1");
    expect(screen.getByRole("button", { name: "Descargar comprobante PDF" })).toBeVisible();
    primera.unmount();
    expect(sessionStorage.length).toBe(0);
    render(<PagoPedido tipo="MESA" usuarioId="otro" estadoPedido="CERRADO"
      pedido={pedido} pagoInicial={{ ok: true, datos: resultado("CONFIRMADO", 25) }} />);
    expect(screen.getByRole("button", { name: "Descargar comprobante PDF" })).toBeVisible();
    expect(procesarPago).not.toHaveBeenCalled();
  });

  it("al recibir 409 recupera el pago pendiente y bloquea un segundo cobro", async () => {
    vi.mocked(procesarPago).mockResolvedValue({ ok: false, estado: 409, error: "Conflicto" });
    vi.mocked(consultarPagoPedido).mockResolvedValue({
      ok: true, datos: { ...resultado("PENDIENTE"), pedidoId: 87, metodo: "TARJETA" },
    });
    vi.mocked(obtenerPedido).mockResolvedValue({
      ok: true, datos: { ...pedido, estado: "ENTREGADO", mesaId: 1, numero: null, creadoEn: "" },
    });
    mesa();
    fireEvent.change(screen.getByLabelText("Monto recibido"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pago" }));
    expect(await screen.findByText("Pago pendiente")).toBeVisible();
    expect(consultarPagoPedido).toHaveBeenCalledWith(87);
    expect(obtenerPedido).toHaveBeenCalledWith(87);
    expect(screen.queryByLabelText("Monto recibido")).not.toBeInTheDocument();
    expect(procesarPago).toHaveBeenCalledOnce();
  });

  it("al recibir 409 sin pago bloqueante actualiza el total y permite corregir con una clave nueva", async () => {
    vi.mocked(procesarPago).mockResolvedValueOnce({ ok: false, estado: 409, error: "Conflicto" })
      .mockResolvedValueOnce({ ok: true, datos: resultado("CONFIRMADO", 24) });
    vi.mocked(consultarPagoPedido).mockResolvedValue({ ok: true, datos: null });
    vi.mocked(obtenerPedido).mockResolvedValue({
      ok: true, datos: { ...pedido, total: 19, estado: "ENTREGADO", mesaId: 1, numero: null, creadoEn: "" },
    });
    mesa();
    fireEvent.change(screen.getByLabelText("Monto recibido"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pago" }));
    expect(await screen.findByText("Total $19.00")).toBeVisible();
    expect(screen.getByLabelText("Monto recibido")).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pago" }));
    expect(await screen.findByText("Pago confirmado")).toBeVisible();
    const [primero, segundo] = vi.mocked(procesarPago).mock.calls;
    expect(segundo[0].solicitudId).not.toBe(primero[0].solicitudId);
    expect(segundo[0].ticket.total).toBe(19);
  });

  it("impide cobrar al expirar la sesión durante la consulta inicial", () => {
    render(<PagoPedido tipo="MESA" usuarioId="mesero" estadoPedido="ENTREGADO" pedido={pedido}
      pagoInicial={{ ok: false, sinSesion: true, error: "Tu sesión expiró" }} />);
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("button", { name: "Confirmar pago" })).not.toBeInTheDocument();
  });

  it("recupera el comprobante ante 409 y abre el siguiente pedido sin ese resultado", async () => {
    vi.mocked(procesarPago).mockResolvedValue({ ok: false, estado: 409, error: "Conflicto" });
    vi.mocked(consultarPagoPedido).mockResolvedValue({
      ok: true, datos: { ...resultado("CONFIRMADO", 25), pedidoId: 87, metodo: "EFECTIVO" },
    });
    vi.mocked(obtenerPedido).mockResolvedValue({
      ok: true, datos: { ...pedido, estado: "CERRADO", mesaId: 1, numero: null, creadoEn: "" },
    });
    const vista = mesa();
    fireEvent.change(screen.getByLabelText("Monto recibido"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pago" }));
    expect(await screen.findByRole("button", { name: "Descargar comprobante PDF" })).toBeVisible();
    vista.rerender(<PagoPedido key={88} tipo="MESA" usuarioId="mesero" estadoPedido="ENTREGADO"
      pedido={{ ...pedido, pedidoId: 88 }} pagoInicial={{ ok: true, datos: null }} />);
    expect(screen.queryByRole("button", { name: "Descargar comprobante PDF" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Monto recibido")).toHaveValue("");
  });

  it.each(["RECHAZADO", "REEMBOLSADO"] as const)("habilita un nuevo cobro solo si %s admite otro intento", (estado) => {
    render(<PagoPedido tipo="MESA" usuarioId="mesero" estadoPedido="ENTREGADO" pedido={pedido}
      pagoInicial={{ ok: true, datos: resultado(estado) }} />);
    expect(Boolean(screen.queryByLabelText("Monto recibido"))).toBe(estado === "RECHAZADO");
  });
  it("permite editar el importe con hasta dos decimales y conserva el prefijo visual", () => {
    mesa();
    const monto = screen.getByRole("textbox", { name: "Monto recibido" });
    expect(monto).toHaveAttribute("inputmode", "decimal");
    expect(monto.parentElement).toHaveTextContent("$");
    for (const valor of ["30", "30.5", "30.50", "0.99", "30.", ""]) {
      fireEvent.change(monto, { target: { value: valor } });
      expect(monto).toHaveValue(valor);
    }
    fireEvent.change(monto, { target: { value: "30." } });
    expect(screen.getByRole("button", { name: "Confirmar pago" })).toBeDisabled();
  });

  it("rechaza importes mal formados sin modificar el valor anterior", () => {
    mesa();
    const monto = screen.getByRole("textbox", { name: "Monto recibido" });
    fireEvent.change(monto, { target: { value: "30.50" } });
    for (const valor of ["30.000005", "-342.00", "abc", "30..50", "%%30", "1e2", "+30"]) {
      fireEvent.change(monto, { target: { value: valor } });
      expect(monto).toHaveValue("30.50");
    }
  });

  it("comprueba el texto pegado junto con la selección actual", () => {
    mesa();
    const monto = screen.getByRole<HTMLInputElement>("textbox", { name: "Monto recibido" });
    fireEvent.change(monto, { target: { value: "30.50" } });
    monto.setSelectionRange(3, 5);
    const pegar = (texto: string) =>
      fireEvent.paste(monto, { clipboardData: { getData: () => texto } });

    expect(pegar("000005")).toBe(false);
    expect(pegar("-5")).toBe(false);
    expect(pegar("abc")).toBe(false);
    expect(monto).toHaveValue("30.50");
    expect(pegar("75")).toBe(true);
    // JSDOM no inserta el portapapeles al emitir el evento.
    fireEvent.input(monto, { target: { value: "30.75" } });
    expect(monto).toHaveValue("30.75");
    expect(screen.getByText("Cambio: $13.25")).toBeVisible();
  });

  it("valida el efectivo, envía el DTO real y muestra confirmación y descarga", async () => {
    vi.mocked(procesarPago).mockResolvedValue({ ok: true, datos: resultado("CONFIRMADO", 24) });
    mesa();
    const monto = screen.getByLabelText("Monto recibido");
    fireEvent.change(monto, { target: { value: "17.49" } });
    expect(screen.getByRole("button", { name: "Confirmar pago" })).toBeDisabled();
    fireEvent.change(monto, { target: { value: "20.00" } });
    expect(screen.getByText("Cambio: $2.50")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pago" }));
    expect(await screen.findByText("Pago confirmado")).toBeVisible();
    expect(screen.getByRole("button", { name: "Descargar comprobante PDF" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Volver a pedidos pendientes de cobro" })).toHaveAttribute("href", "/mesero/entregas");
    expect(procesarPago).toHaveBeenCalledWith({
      metodo: "EFECTIVO", montoRecibido: "20.00", solicitudId: expect.any(String),
      ticket: { id: 87, total: 17.5, items: [{ nombre: "Limonada", cantidad: 1, precio_unitario: 17.5, subtotal: 17.5 }] },
    });
  });

  it("envía el correo opcional en efectivo y lo conserva si H18 lo rechaza", async () => {
    vi.mocked(procesarPago).mockResolvedValue({
      ok: false, estado: 400, error: "Datos inválidos",
      errores: { correoLealtad: "Cliente no habilitado" },
    });
    mesa();
    const correo = screen.getByLabelText("Correo del cliente (opcional)");
    fireEvent.change(correo, { target: { value: "cliente@example.com" } });
    fireEvent.change(screen.getByLabelText("Monto recibido"), { target: { value: "20.00" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pago" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Cliente no habilitado");
    expect(correo).toHaveValue("cliente@example.com");
    expect(procesarPago).toHaveBeenCalledWith(expect.objectContaining({
      metodo: "EFECTIVO", correoLealtad: "cliente@example.com",
    }));
  });

  it("consulta MESA en segundo plano y termina al confirmar", async () => {
    vi.useFakeTimers();
    vi.mocked(procesarPago).mockResolvedValue({ ok: true, datos: resultado("PENDIENTE") });
    vi.mocked(consultarPago)
      .mockResolvedValueOnce({ ok: false, error: "Sin conexión" })
      .mockResolvedValueOnce({ ok: true, datos: resultado("CONFIRMADO", 25) });
    mesa();
    fireEvent.change(screen.getByLabelText("Método de pago"), { target: { value: "TARJETA" } });
    fireEvent.change(screen.getByLabelText("Correo del cliente (opcional)"), { target: { value: "cliente@example.com" } });
    completarTarjeta();
    expect(screen.getByLabelText("Número de tarjeta ficticia")).toHaveValue("4242 4242 4242 4242");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Pagar con tarjeta" })); });
    expect(screen.getByText("Pago pendiente")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Consultar estado del pago" })).not.toBeInTheDocument();
    const [solicitud] = vi.mocked(procesarPago).mock.calls[0];
    expect(solicitud).toEqual({
      solicitudId: expect.any(String), ticket: expect.any(Object),
      metodo: "TARJETA", marca: "VISA", ultimosCuatro: "4242", correoLealtad: "cliente@example.com",
    });
    const guardado = sessionStorage.getItem("los-burle:pago:MESA:mesero:87") ?? "";
    for (const dato of ["4242424242424242", "4242 4242 4242 4242", "Ana Demo", "12/30", '"codigo"']) {
      expect(guardado).not.toContain(dato);
    }
    await avanzar();
    expect(screen.getByRole("alert")).toHaveTextContent("Consultaremos el estado nuevamente");
    await avanzar();
    expect(screen.getByText("Pago confirmado")).toBeVisible();
    expect(screen.getByRole("button", { name: "Descargar comprobante PDF" })).toBeVisible();
    expect(consultarPago).toHaveBeenCalledWith("simulada-1");
    await avanzar(12000);
    expect(consultarPago).toHaveBeenCalledTimes(2);
    expect(procesarPago).toHaveBeenCalledOnce();
  });

  it("valida los cuatro datos ficticios antes de enviar", () => {
    cliente(vi.fn());
    fireEvent.click(screen.getByRole("button", { name: "Pagar" }));
    const pagar = () => fireEvent.click(screen.getByRole("button", { name: "Pagar con tarjeta" }));
    completarTarjeta();
    fireEvent.change(screen.getByLabelText("Número de tarjeta ficticia"), { target: { value: "1111222233334444" } });
    pagar();
    expect(screen.getByRole("alert")).toHaveTextContent("números ficticios indicados");
    completarTarjeta();
    fireEvent.change(screen.getByLabelText("Nombre ficticio del titular"), { target: { value: "12" } });
    pagar();
    expect(screen.getByRole("alert")).toHaveTextContent("nombre ficticio del titular");
    completarTarjeta();
    fireEvent.change(screen.getByLabelText("Vencimiento (MM/AA)"), { target: { value: "1330" } });
    pagar();
    expect(screen.getByRole("alert")).toHaveTextContent("MM/AA");
    completarTarjeta();
    fireEvent.change(screen.getByLabelText("Código de seguridad ficticio"), { target: { value: "12" } });
    pagar();
    expect(screen.getByRole("alert")).toHaveTextContent("tres dígitos");
    expect(procesarPago).not.toHaveBeenCalled();
  });

  it("pausa MESA oculta, consulta al volver y nunca solapa ni reprograma tras desmontar", async () => {
    vi.useFakeTimers();
    let oculta = true;
    vi.spyOn(document, "hidden", "get").mockImplementation(() => oculta);
    vi.mocked(procesarPago).mockResolvedValue({ ok: true, datos: resultado("PENDIENTE") });
    let resolver!: (r: Awaited<ReturnType<typeof consultarPago>>) => void;
    vi.mocked(consultarPago).mockImplementation(() => new Promise((r) => { resolver = r; }));
    const vista = mesa();
    fireEvent.change(screen.getByLabelText("Método de pago"), { target: { value: "TARJETA" } });
    completarTarjeta();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Pagar con tarjeta" })); });
    await avanzar(8000);
    expect(consultarPago).not.toHaveBeenCalled();
    oculta = false;
    fireEvent(document, new Event("visibilitychange"));
    fireEvent(document, new Event("visibilitychange"));
    await avanzar(12000);
    expect(consultarPago).toHaveBeenCalledOnce();
    vista.unmount();
    await act(async () => resolver({ ok: true, datos: resultado("PENDIENTE") }));
    await avanzar(12000);
    expect(consultarPago).toHaveBeenCalledOnce();
    expect(procesarPago).toHaveBeenCalledOnce();
  });

  it("ignora un envío duplicado y conserva la solicitud al reintentar después de un error", async () => {
    let responder!: (r: Awaited<ReturnType<typeof procesarPago>>) => void;
    vi.mocked(procesarPago).mockImplementationOnce(() => new Promise((r) => { responder = r; }));
    vi.mocked(procesarPago).mockResolvedValueOnce({ ok: true, datos: resultado("CONFIRMADO", 24) });
    const vista = mesa();
    fireEvent.change(screen.getByLabelText("Monto recibido"), { target: { value: "20" } });
    const form = screen.getByRole("button", { name: "Confirmar pago" }).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(procesarPago).toHaveBeenCalledTimes(1);
    await act(async () => responder({ ok: false, error: "Sin conexión" }));
    vista.unmount();
    mesa();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar el mismo pago" }));
    await waitFor(() => expect(procesarPago).toHaveBeenCalledTimes(2));
    expect(vi.mocked(procesarPago).mock.calls[1]).toEqual(vi.mocked(procesarPago).mock.calls[0]);
  });

  it("detecta rechazo LLEVAR por seguimiento y permite un nuevo intento", async () => {
    vi.useFakeTimers();
    vi.mocked(procesarPago).mockResolvedValue({ ok: true, datos: resultado("PENDIENTE") });
    const actualizarPago = vi.fn().mockResolvedValue({ ok: true, datos: {
      ...pedido, estado: "PENDIENTE_PAGO", pago: "RECHAZADO",
    } });
    cliente(actualizarPago);
    fireEvent.click(screen.getByRole("button", { name: "Pagar" }));
    completarTarjeta();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Pagar con tarjeta" })); });
    expect(screen.getByText("Pago pendiente")).toBeVisible();
    await avanzar();
    expect(screen.getByText("Pago rechazado")).toBeVisible();
    await avanzar(8000);
    expect(actualizarPago).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Volver a intentar" }));
    completarTarjeta();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Pagar con tarjeta" })); });
    expect(procesarPago).toHaveBeenCalledTimes(2);
    expect(vi.mocked(procesarPago).mock.calls[0][0].solicitudId)
      .not.toBe(vi.mocked(procesarPago).mock.calls[1][0].solicitudId);
    expect(consultarPago).not.toHaveBeenCalled();
  });

  it("protege LLEVAR confirmado aunque el pedido siga pendiente", () => {
    render(<PagoPedido tipo="LLEVAR" pedido={pedido} estadoPedido="PENDIENTE_PAGO" pago="CONFIRMADO"
      comprobanteId={25} actualizarPago={vi.fn()} onSeguimiento={vi.fn()} />);
    expect(screen.getByText("Pago confirmado")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Pagar" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Descargar comprobante PDF" })).toBeVisible();
  });
});

it("descarga el blob con el nombre del servidor sin navegar", async () => {
  const fetchPdf = vi.fn().mockResolvedValue(new Response("%PDF-ficticio", {
    headers: { "Content-Disposition": 'attachment; filename="comprobante-24.pdf"' },
  }));
  vi.stubGlobal("fetch", fetchPdf);
  const crearUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:comprobante");
  const revocarUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  const ruta = window.location.href;
  const iniciar = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    expect(this.download).toBe("comprobante-24.pdf");
    expect(this.href).toBe("blob:comprobante");
  });
  try {
    render(<DescargarComprobante id={24} />);
    fireEvent.click(screen.getByRole("button", { name: "Descargar comprobante PDF" }));
    await waitFor(() => expect(iniciar).toHaveBeenCalledOnce());
    expect(fetchPdf).toHaveBeenCalledWith("/api/comprobantes/24/pdf", { cache: "no-store" });
    expect(crearUrl).toHaveBeenCalledOnce();
    expect(window.location.href).toBe(ruta);
  } finally {
    iniciar.mockRestore();
    crearUrl.mockRestore();
    revocarUrl.mockRestore();
    vi.unstubAllGlobals();
  }
});
