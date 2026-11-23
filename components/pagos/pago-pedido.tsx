"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useId, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { consultarPago, consultarPagoPedido, procesarPago } from "@/app/actions/pagos";
import { obtenerPedido } from "@/app/actions/pedidos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DescargarComprobante } from "@/components/pagos/descargar-comprobante";
import { TarjetaSimulada, leerTarjetaSimulada } from "@/components/pagos/tarjeta-simulada";
import { subtotalItem, type PedidoSeguimiento } from "@/lib/seguimiento";
import type { PedidoDetalle } from "@/lib/pedidos";
import { formatoPrecio } from "@/lib/menu";
import { calcularCambio, construirTicket, type MetodoPago, type PedidoParaPago, type ResultadoPago, type SolicitudPago } from "@/lib/pagos";
import type { Resultado } from "@/lib/api";

type Operacion = { solicitud: SolicitudPago; resultado?: ResultadoPago };
type Props = {
  pedido: PedidoParaPago;
  estadoPedido: string;
} & (
  | { tipo: "MESA"; usuarioId: string; pagoInicial: Resultado<ResultadoPago | null> }
  | {
      tipo: "LLEVAR";
      pago: string | null;
      comprobanteId?: number | null;
      actualizarPago: () => Promise<Resultado<PedidoSeguimiento>>;
      onSeguimiento: (pedido: PedidoSeguimiento) => void;
    }
);

const estados: Record<string, string> = {
  PENDIENTE: "Pago pendiente",
  CONFIRMADO: "Pago confirmado",
  RECHAZADO: "Pago rechazado",
  REEMBOLSADO: "Pago reembolsado",
};
const intervaloConsulta = 4000;
const montoEditable = /^(?:[0-9]{1,8}(?:\.[0-9]{0,2})?)?$/;
const campo = "mt-1 w-full rounded-lg border border-zinc-600 bg-[#101012] px-3 py-2 text-zinc-100";
const sinAlmacen = () => null;
const suscribir = () => () => {};
const errorRed = "No pudimos completar la operación. Intenta de nuevo.";

function leerOperacion(valor: string | null): Operacion | null {
  try {
    if (!valor) return null;
    const guardada = JSON.parse(valor) as Operacion;
    return guardada?.solicitud && !guardada.resultado ? { solicitud: guardada.solicitud } : null;
  } catch {
    return null;
  }
}

export function PagoPedido(props: Props) {
  const { tipo } = props;
  const [pedidoActual, setPedidoActual] = useState<PedidoDetalle>();
  const [pagoActual, setPagoActual] = useState<Resultado<ResultadoPago | null>>();
  const [reconciliacionPendiente, setReconciliacionPendiente] = useState(false);
  const pedido = pedidoActual ?? props.pedido;
  const estadoPedido = pedidoActual?.estado ?? props.estadoPedido;
  const consultaMesa = tipo === "MESA" ? pagoActual ?? props.pagoInicial : undefined;
  const falloInicial = consultaMesa && !consultaMesa.ok ? consultaMesa : null;
  const clave = `los-burle:pago:${tipo}:${tipo === "MESA" ? props.usuarioId : "cliente"}:${pedido.pedidoId}`;
  const valorGuardado = useSyncExternalStore(suscribir, () => {
    try {
      return sessionStorage.getItem(clave);
    } catch {
      return null;
    }
  }, sinAlmacen);
  const [local, setLocal] = useState<Operacion | null>();
  const [mostrar, setMostrar] = useState(tipo === "MESA");
  const [metodo, setMetodo] = useState<MetodoPago>(tipo === "MESA" ? "EFECTIVO" : "TARJETA");
  const [monto, setMonto] = useState("");
  const [correoLealtad, setCorreoLealtad] = useState("");
  const montoId = useId();
  const correoId = useId();
  const [correo, setCorreo] = useState("");
  const consultaEnCurso = useRef(false);
  const conflicto = useRef(false);
  const [ocupado, setOcupado] = useState(false);
  const bloqueo = useRef(false);
  const [error, setError] = useState("");
  const [sinSesion, setSinSesion] = useState(false);

  const operacion = local === undefined ? leerOperacion(valorGuardado) : local;
  const resultado = tipo === "MESA"
    ? consultaMesa?.ok ? consultaMesa.datos : null
    : local?.resultado;
  const pagoH05 = tipo === "LLEVAR" ? props.pago : null;
  const pagoFinalH05 = pagoH05 === "CONFIRMADO" || pagoH05 === "REEMBOLSADO";
  const estado = tipo === "MESA"
    ? resultado?.estado
    : pagoFinalH05 || local === undefined ? pagoH05 ?? resultado?.estado : resultado?.estado ?? pagoH05;
  const comprobanteId = (tipo === "LLEVAR" ? props.comprobanteId : null) ?? resultado?.comprobanteId;
  const reintento = operacion && !operacion.resultado && (!estado || (estado === "RECHAZADO" && local !== undefined))
    ? operacion.solicitud : null;
  const metodoActual = reintento?.metodo ?? metodo;
  const recibido = reintento?.metodo === "EFECTIVO" ? reintento.montoRecibido : monto;
  const cambio = calcularCambio(recibido, pedido.total);
  const admitePago = !reconciliacionPendiente && (tipo === "MESA" ? consultaMesa?.ok && estadoPedido === "ENTREGADO" : estadoPedido === "PENDIENTE_PAGO")
    && (!estado || estado === "RECHAZADO");
  const transaccionId = resultado?.transaccionId;
  const consultarPendiente = estado === "PENDIENTE" && !reconciliacionPendiente;

  function guardar(siguiente: Operacion | null) {
    setLocal(siguiente);
    try {
      if (siguiente && !siguiente.resultado) sessionStorage.setItem(clave, JSON.stringify({ solicitud: siguiente.solicitud }));
      else sessionStorage.removeItem(clave);
    } catch {
      // El reintento sigue disponible mientras el componente permanezca montado.
    }
  }

  async function ejecutar(accion: () => Promise<void>) {
    if (bloqueo.current) return;
    bloqueo.current = true;
    setOcupado(true);
    setError("");
    setSinSesion(false);
    try {
      await accion();
    } catch {
      setError(errorRed);
    } finally {
      bloqueo.current = false;
      setOcupado(false);
    }
  }

  async function reconciliar() {
    setReconciliacionPendiente(true);
    let permiteCorregir = false;
    if (props.tipo === "MESA") {
      const [detalle, pago] = await Promise.all([
        obtenerPedido(pedido.pedidoId),
        consultarPagoPedido(pedido.pedidoId),
      ]);
      setPagoActual(pago);
      const fallo = !detalle.ok ? detalle : !pago.ok ? pago : null;
      if (fallo) {
        setError(fallo.error);
        setSinSesion(Boolean(fallo.sinSesion));
        return;
      }
      if (detalle.ok && pago.ok) {
        setPedidoActual(detalle.datos);
        permiteCorregir = detalle.datos.estado === "ENTREGADO"
          && (!pago.datos || pago.datos.estado === "RECHAZADO");
      }
    } else {
      const seguimiento = await props.actualizarPago();
      if (!seguimiento.ok) {
        setError(seguimiento.error);
        setSinSesion(Boolean(seguimiento.sinSesion));
        return;
      }
      props.onSeguimiento(seguimiento.datos);
      permiteCorregir = seguimiento.datos.estado === "PENDIENTE_PAGO"
        && (!seguimiento.datos.pago || seguimiento.datos.pago === "RECHAZADO");
    }
    if (conflicto.current) {
      guardar(null);
      conflicto.current = false;
      if (permiteCorregir) setError("Revisa el pedido actualizado antes de volver a cobrar.");
    }
    setReconciliacionPendiente(false);
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!admitePago || bloqueo.current) return;
    if (!reintento && metodoActual === "EFECTIVO" && (cambio === null || cambio < 0)) {
      setError("El importe recibido debe cubrir el total.");
      return;
    }

    const tarjeta = !reintento && metodoActual === "TARJETA"
      ? leerTarjetaSimulada(evento.currentTarget)
      : null;
    if (tarjeta && !tarjeta.ok) {
      setError(tarjeta.error);
      return;
    }

    await ejecutar(async () => {
      const correo = tipo === "MESA" ? correoLealtad.trim() : "";
      const solicitud: SolicitudPago = reintento ?? {
        solicitudId: crypto.randomUUID(),
        ticket: construirTicket(pedido),
        ...(correo ? { correoLealtad: correo } : {}),
        ...(tarjeta?.ok
          ? { metodo: "TARJETA", ...tarjeta.datos }
          : { metodo: "EFECTIVO", montoRecibido: monto }),
      };
      if (tipo === "MESA") setCorreoLealtad(solicitud.correoLealtad ?? "");
      guardar({ solicitud });
      const respuesta = await procesarPago(solicitud);
      if (!respuesta.ok) {
        if (respuesta.estado === 409) {
          conflicto.current = true;
          await reconciliar();
          return;
        }
        if (respuesta.estado === 400 || respuesta.estado === 404) guardar(null);
        setError(respuesta.errores?.correoLealtad ?? respuesta.error);
        setSinSesion(Boolean(respuesta.sinSesion));
        return;
      }
      if (tipo === "MESA") {
        setPagoActual(respuesta);
        guardar(null);
      } else guardar({ solicitud, resultado: respuesta.datos });
    });
  }

  function registrarConsulta(respuesta: Resultado<unknown>) {
    setSinSesion(!respuesta.ok && Boolean(respuesta.sinSesion));
    setError(respuesta.ok ? "" : respuesta.error + " Consultaremos el estado nuevamente.");
  }

  const consultar = useEffectEvent(async (vigente: () => boolean) => {
    if (consultaEnCurso.current) return;
    consultaEnCurso.current = true;
    try {
      if (props.tipo === "LLEVAR") {
        const respuesta = await props.actualizarPago();
        if (!vigente()) return;
        if (respuesta.ok) {
          props.onSeguimiento(respuesta.datos);
          if (respuesta.datos.pago === "RECHAZADO") {
            guardar(null);
            setMostrar(false);
          }
        }
        registrarConsulta(respuesta);
      } else {
        const respuesta = transaccionId ? await consultarPago(transaccionId) : await consultarPagoPedido(pedido.pedidoId);
        if (!vigente()) return;
        if (respuesta.ok) setPagoActual(respuesta);
        registrarConsulta(respuesta);
      }
    } catch {
      if (vigente()) setError(errorRed + " Consultaremos el estado nuevamente.");
    } finally {
      consultaEnCurso.current = false;
    }
  });

  useEffect(() => {
    if (!consultarPendiente) return;
    let activo = true;
    let ejecutando = false;
    let timer: number | undefined;

    function programar() {
      window.clearTimeout(timer);
      if (activo && !document.hidden && !ejecutando) {
        timer = window.setTimeout(actualizar, intervaloConsulta);
      }
    }

    async function actualizar() {
      window.clearTimeout(timer);
      if (!activo || document.hidden || ejecutando) return;
      ejecutando = true;
      try {
        await consultar(() => activo);
      } finally {
        ejecutando = false;
        programar();
      }
    }

    function cambiarVisibilidad() {
      window.clearTimeout(timer);
      if (!document.hidden) void actualizar();
    }

    document.addEventListener("visibilitychange", cambiarVisibilidad);
    programar();
    return () => {
      activo = false;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", cambiarVisibilidad);
    };
  }, [consultarPendiente, transaccionId, pedido.pedidoId]);

  if (tipo === "LLEVAR" && !admitePago && !estado && !comprobanteId && !reconciliacionPendiente) return null;

  return (
    <>
    {tipo === "MESA" && (
      <section aria-label="Detalle del pedido" className="rounded-2xl border border-zinc-800 bg-[#18181b] p-6 sm:p-8">
        <ul className="grid gap-4">
          {pedido.items.map((item) => (
            <li key={item.itemId} className="flex justify-between gap-4">
              <span>{item.cantidad} × {item.nombre}</span>
              <span className="tabular-nums">{formatoPrecio(subtotalItem(item))}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 border-t border-zinc-800 pt-4 text-xl font-semibold">Total {formatoPrecio(pedido.total)}</p>
      </section>
    )}
    <section aria-label="Pago del pedido" className="grid gap-4 rounded-2xl border border-zinc-800 bg-[#18181b] p-6 sm:p-8">
      <h2 className="text-xl font-semibold">Pago del pedido</h2>
      {estado && estados[estado] && <p aria-live="polite" className="text-orange-200">{estados[estado]}</p>}
      {tipo === "MESA" && consultaMesa?.ok && !reconciliacionPendiente && !estado && !admitePago && (
        <p className="text-zinc-300">{estadoPedido === "CERRADO" ? "Este pedido ya está cerrado." : "El pedido debe estar entregado para cobrarlo."}</p>
      )}
      {admitePago && !mostrar && !reintento && (
        <Button onClick={() => setMostrar(true)}>{estado === "RECHAZADO" ? "Volver a intentar" : "Pagar"}</Button>
      )}
      {admitePago && (mostrar || reintento) && (
        <form onSubmit={enviar} className="grid gap-4">
          <fieldset disabled={ocupado || Boolean(reintento)} className="grid gap-4">
            {tipo === "MESA" && (
              <label htmlFor={correoId} className="grid gap-1">
                Correo de lealtad (opcional)
                <Input id={correoId} type="email" maxLength={254} autoComplete="off"
                  value={reintento ? reintento.correoLealtad ?? "" : correo}
                  onChange={(evento) => setCorreo(evento.target.value)}
                  aria-describedby={`${correoId}-ayuda`} />
                <span id={`${correoId}-ayuda`} className="text-sm text-zinc-400">
                  Usa el correo registrado del cliente para atribuir los puntos del pago.
                </span>
              </label>
            )}
            {tipo === "MESA" && (
              <label>
                Correo del cliente (opcional)
                <input
                  className={campo}
                  type="email"
                  maxLength={254}
                  value={reintento ? reintento.correoLealtad ?? "" : correoLealtad}
                  onChange={(evento) => setCorreoLealtad(evento.currentTarget.value)}
                />
              </label>
            )}
            {tipo === "MESA" && (
              <label>
                Método de pago
                <select className={campo} value={metodoActual} onChange={(e) => setMetodo(e.target.value === "EFECTIVO" ? "EFECTIVO" : "TARJETA")}>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TARJETA">Tarjeta simulada</option>
                </select>
              </label>
            )}
            {metodoActual === "EFECTIVO" ? (
              <div>
                <label htmlFor={montoId}>Monto recibido</label>
                <span className="relative block">
                  <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center pt-1 text-zinc-400">
                    $
                  </span>
                  <input
                    id={montoId}
                    className={campo + " pl-7"}
                    type="text"
                    inputMode="decimal"
                    value={recibido}
                    onChange={({ currentTarget }) => {
                      if (montoEditable.test(currentTarget.value)) setMonto(currentTarget.value);
                    }}
                    onPaste={(evento) => {
                      const { value, selectionStart, selectionEnd } = evento.currentTarget;
                      const texto = evento.clipboardData.getData("text");
                      const siguiente = value.slice(0, selectionStart ?? value.length)
                        + texto + value.slice(selectionEnd ?? value.length);
                      if (!montoEditable.test(siguiente)) evento.preventDefault();
                    }}
                    required
                  />
                </span>
              </div>
            ) : reintento?.metodo === "TARJETA" ? (
              <p>Tarjeta simulada {reintento.marca} terminada en {reintento.ultimosCuatro}</p>
            ) : (
              <TarjetaSimulada claseCampo={campo} />
            )}
          </fieldset>
          {metodoActual === "EFECTIVO" && cambio !== null && (
            <p>{cambio < 0 ? "El importe recibido debe cubrir el total." : `Cambio: ${formatoPrecio(cambio)}`}</p>
          )}
          <Button type="submit" disabled={ocupado || (metodoActual === "EFECTIVO" && (cambio === null || cambio < 0))}>
            {ocupado ? "Procesando…" : reintento ? "Reintentar el mismo pago" : metodoActual === "TARJETA" ? "Pagar con tarjeta" : "Confirmar pago"}
          </Button>
        </form>
      )}
      {consultarPendiente && <p className="text-sm text-zinc-300">Actualizando el estado del pago automáticamente.</p>}
      {comprobanteId != null && <DescargarComprobante id={comprobanteId} />}
      {tipo === "MESA" && estado === "CONFIRMADO" && (
        <Link href="/mesero/entregas" prefetch={false} className="text-orange-300 underline">Volver a pedidos pendientes de cobro</Link>
      )}
      {(falloInicial || reconciliacionPendiente) && (
        <Button onClick={() => ejecutar(reconciliar)} disabled={ocupado}>Actualizar estado del cobro</Button>
      )}
      {(error || falloInicial) && (
        <div role="alert" className="text-sm text-red-300">
          {error || falloInicial?.error}
          {(sinSesion || falloInicial?.sinSesion) && <Link href="/login" className="ml-2 underline">Iniciar sesión</Link>}
        </div>
      )}
    </section>
    </>
  );
}
