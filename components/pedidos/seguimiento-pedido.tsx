"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  cancelarPedidoLlevar,
  obtenerSeguimiento,
} from "@/app/actions/pedidos";
import { PagoPedido } from "@/components/pagos/pago-pedido";
import { Button } from "@/components/ui/button";
import { formatoPrecio } from "@/lib/menu";
import {
  PASOS,
  etiquetaEstado,
  puedeCancelar,
  subtotalItem,
  type PedidoSeguimiento,
} from "@/lib/seguimiento";

const ERROR_RED = "No pudimos completar la operación. Intenta de nuevo.";

export function SeguimientoPedido({ inicial }: { inicial: PedidoSeguimiento }) {
  const [pedido, setPedido] = useState(inicial);
  const [confirmando, setConfirmando] = useState(false);
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sinSesion, setSinSesion] = useState(false);
  const ocupado = useRef(false);

  async function actualizar() {
    if (ocupado.current) return;
    ocupado.current = true;
    setPendiente(true);
    setError(null);
    setSinSesion(false);
    try {
      const respuesta = await obtenerSeguimiento(pedido.pedidoId);
      if (respuesta.ok) {
        setPedido(respuesta.datos);
      } else {
        setError(respuesta.error);
        setSinSesion(Boolean(respuesta.sinSesion));
      }
    } catch {
      setError(ERROR_RED);
    }
    ocupado.current = false;
    setPendiente(false);
  }

  async function cancelar() {
    if (ocupado.current) return;
    ocupado.current = true;
    setPendiente(true);
    setError(null);
    setSinSesion(false);
    try {
      const respuesta = await cancelarPedidoLlevar(pedido.pedidoId);
      if (respuesta.ok) {
        const { estado, pago } = respuesta.datos;
        setPedido((previo) => ({ ...previo, estado, pago }));
      } else {
        setError(respuesta.error);
        setSinSesion(Boolean(respuesta.sinSesion));
        if (respuesta.estado === 409) {
          const fresco = await obtenerSeguimiento(pedido.pedidoId);
          if (fresco.ok) setPedido(fresco.datos);
        }
      }
    } catch {
      setError(ERROR_RED);
    }
    setConfirmando(false);
    ocupado.current = false;
    setPendiente(false);
  }

  const cancelado = pedido.estado === "CANCELADO";
  const enCurso = PASOS.some((paso) => paso === pedido.estado);

  return (
    <div className="grid gap-6">
      <section
        aria-label="Estado del pedido"
        className="rounded-2xl border border-zinc-800 bg-[#18181b] p-6 sm:p-8"
      >
        <p className="text-sm text-zinc-400">{pedido.numero ? "Número de pedido" : "ID de pedido"}</p>
        <h2 className="mt-1 text-3xl font-semibold tabular-nums">
          {pedido.numero ?? `#${pedido.pedidoId}`}
        </h2>

        <p
          role="status"
          className="mt-5 inline-block rounded-full border border-[#FF7A1A]/50 bg-[#FF7A1A]/10 px-4 py-1 text-orange-200"
        >
          {etiquetaEstado(pedido.estado)}
        </p>
        {pedido.estado === "PENDIENTE_PAGO" && pedido.pago !== "CONFIRMADO" && (
          <p className="mt-3 text-sm text-zinc-300">
            Tu pedido llegará a cocina cuando se confirme tu pago.
          </p>
        )}

        {enCurso && (
          <ol
            aria-label="Progreso del pedido"
            className="mt-5 flex flex-wrap gap-2 text-sm"
          >
            {PASOS.map((paso) => (
              <li
                key={paso}
                aria-current={paso === pedido.estado ? "step" : undefined}
                className={
                  paso === pedido.estado
                    ? "rounded-full bg-[#FF7A1A] px-3 py-1 font-semibold text-[#101012]"
                    : "rounded-full border border-zinc-700 px-3 py-1 text-zinc-400"
                }
              >
                {etiquetaEstado(paso)}
              </li>
            ))}
          </ol>
        )}

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-zinc-400">Sucursal</dt>
            <dd className="mt-1">{pedido.sucursal}</dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-400">A nombre de</dt>
            <dd className="mt-1">{pedido.nombreCliente ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section
        aria-label="Platillos del pedido"
        className="rounded-2xl border border-zinc-800 bg-[#18181b] p-6 sm:p-8"
      >
        <ul className="grid gap-4">
          {pedido.items.map((item) => (
            <li
              key={item.itemId}
              className="flex items-start justify-between gap-4"
            >
              <div>
                <p>{`${item.cantidad} × ${item.nombre}`}</p>
                {item.nota && (
                  <p className="text-sm text-zinc-400">{item.nota}</p>
                )}
              </div>
              <p className="tabular-nums">{formatoPrecio(subtotalItem(item))}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 border-t border-zinc-800 pt-4 text-xl font-semibold tabular-nums">
          {`Total ${formatoPrecio(pedido.total)}`}
        </p>
      </section>

      <PagoPedido
        key={pedido.pedidoId}
        tipo="LLEVAR"
        pedido={pedido}
        estadoPedido={pedido.estado}
        pago={pedido.pago}
        comprobanteId={pedido.comprobanteId}
        actualizarPago={() => obtenerSeguimiento(pedido.pedidoId)}
        onSeguimiento={setPedido}
      />

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-900/60 bg-red-950/20 p-4 text-sm text-red-200"
        >
          <p>{error}</p>
          {sinSesion && (
            <Link
              href="/login"
              className="mt-3 inline-block text-orange-300 underline"
            >
              Iniciar sesión para continuar
            </Link>
          )}
        </div>
      )}

      {puedeCancelar(pedido.estado) &&
        (confirmando ? (
          <div
            role="group"
            aria-label="Confirmar cancelación"
            className="grid gap-4 rounded-2xl border border-zinc-700 p-6"
          >
            <p>¿Seguro que quieres cancelar tu pedido? Te reembolsaremos el pago.</p>
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={cancelar} disabled={pendiente}>
                {pendiente ? "Cancelando…" : "Sí, cancelar pedido"}
              </Button>
              <Button
                type="button"
                onClick={() => setConfirmando(false)}
                disabled={pendiente}
              >
                No, mantener pedido
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            onClick={() => {
              setConfirmando(true);
              setError(null);
            }}
          >
            Cancelar pedido
          </Button>
        ))}

      {!cancelado && pedido.estado !== "ENTREGADO" && pedido.pago !== "PENDIENTE" && (pedido.estado !== "PENDIENTE_PAGO" || pedido.pago === "CONFIRMADO") && (
        <button
          type="button"
          onClick={actualizar}
          disabled={pendiente}
          className="cursor-pointer text-left text-sm text-orange-300 underline disabled:opacity-50"
        >
          Actualizar estado
        </button>
      )}
    </div>
  );
}