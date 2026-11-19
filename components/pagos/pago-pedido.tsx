"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useId, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { consultarPago, procesarPago } from "@/app/actions/pagos";
import { Button } from "@/components/ui/button";
import { DescargarComprobante } from "@/components/pagos/descargar-comprobante";
import { TarjetaSimulada, leerTarjetaSimulada } from "@/components/pagos/tarjeta-simulada";
import type { PedidoSeguimiento } from "@/lib/seguimiento";
import { formatoPrecio } from "@/lib/menu";
import { calcularCambio, construirTicket, type MetodoPago, type PedidoParaPago, type ResultadoPago, type SolicitudPago } from "@/lib/pagos";
import type { Resultado } from "@/lib/api";

type Operacion = { solicitud: SolicitudPago; resultado?: ResultadoPago };
type Props = {
  pedido: PedidoParaPago;
  estadoPedido: string;
} & (
  | { tipo: "MESA"; usuarioId: string }
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
    return valor ? JSON.parse(valor) as Operacion : null;
  } catch {
    return null;
  }
}

export function PagoPedido(props: Props) {
  const { pedido, estadoPedido, tipo } = props;
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
  const montoId = useId();
  const consultaEnCurso = useRef(false);
  const [ocupado, setOcupado] = useState(false);
  const bloqueo = useRef(false);
  const [error, setError] = useState("");
  const [sinSesion, setSinSesion] = useState(false);

  const operacion = local === undefined ? leerOperacion(valorGuardado) : local;
  const resultado = operacion?.resultado;
  const pagoH05 = tipo === "LLEVAR" ? props.pago : null;
  const pagoFinalH05 = pagoH05 === "CONFIRMADO" || pagoH05 === "REEMBOLSADO";
  const estado = tipo === "MESA"
    ? resultado?.estado
    : pagoFinalH05 || local === undefined ? pagoH05 ?? resultado?.estado : resultado?.estado ?? pagoH05;
  const comprobanteId = (tipo === "LLEVAR" ? props.comprobanteId : null) ?? resultado?.comprobanteId;
  const reintento = operacion && !resultado ? operacion.solicitud : null;
  const metodoActual = reintento?.metodo ?? metodo;
  const recibido = reintento?.metodo === "EFECTIVO" ? reintento.montoRecibido : monto;
  const cambio = calcularCambio(recibido, pedido.total);
  const admitePago = (tipo === "MESA" ? (estadoPedido === "ENTREGADO" || (estadoPedido === "CERRADO" && Boolean(reintento))) : estadoPedido === "PENDIENTE_PAGO")
    && (!estado || estado === "RECHAZADO");
  const transaccionId = resultado?.transaccionId;
  const consultarPendiente = estado === "PENDIENTE" && (tipo === "LLEVAR" || Boolean(transaccionId));

  function guardar(siguiente: Operacion | null) {
    setLocal(siguiente);
    try {
      if (siguiente) sessionStorage.setItem(clave, JSON.stringify(siguiente));
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
      const solicitud: SolicitudPago = reintento ?? {
        solicitudId: crypto.randomUUID(),
        ticket: construirTicket(pedido),
        ...(tarjeta?.ok
          ? { metodo: "TARJETA", ...tarjeta.datos }
          : { metodo: "EFECTIVO", montoRecibido: monto }),
      };
      guardar({ solicitud });
      const respuesta = await procesarPago(solicitud);
      if (!respuesta.ok) {
        if (respuesta.estado === 400 || respuesta.estado === 404) guardar(null);
        setError(respuesta.error);
        setSinSesion(Boolean(respuesta.sinSesion));
        return;
      }
      guardar({ solicitud, resultado: respuesta.datos });
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
      } else if (operacion && transaccionId) {
        const respuesta = await consultarPago(transaccionId);
        if (!vigente()) return;
        if (respuesta.ok) guardar({ solicitud: operacion.solicitud, resultado: respuesta.datos });
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

  if (tipo === "LLEVAR" && !admitePago && !estado && !comprobanteId) return null;

  return (
    <section aria-label="Pago del pedido" className="grid gap-4 rounded-2xl border border-zinc-800 bg-[#18181b] p-6 sm:p-8">
      <h2 className="text-xl font-semibold">Pago del pedido</h2>
      {estado && estados[estado] && <p aria-live="polite" className="text-orange-200">{estados[estado]}</p>}
      {tipo === "MESA" && !estado && !admitePago && (
        <p className="text-zinc-300">{estadoPedido === "CERRADO" ? "Este pedido ya está cerrado." : "El pedido debe estar entregado para cobrarlo."}</p>
      )}
      {admitePago && !mostrar && !reintento && (
        <Button onClick={() => setMostrar(true)}>{estado === "RECHAZADO" ? "Volver a intentar" : "Pagar"}</Button>
      )}
      {admitePago && (mostrar || reintento) && (
        <form onSubmit={enviar} className="grid gap-4">
          <fieldset disabled={ocupado || Boolean(reintento)} className="grid gap-4">
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
        <Link href="/menu" className="text-orange-300 underline">Volver al menú principal</Link>
      )}
      {error && (
        <div role="alert" className="text-sm text-red-300">
          {error}
          {sinSesion && <Link href="/login" className="ml-2 underline">Iniciar sesión</Link>}
        </div>
      )}
    </section>
  );
}
