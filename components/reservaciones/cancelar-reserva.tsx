"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { cancelarReservacion } from "@/app/actions/cancelacion-reserva";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { puedeModificarReserva } from "@/lib/edicion-reserva";
import { formatoFecha, formatoHora } from "@/lib/reservaciones";
import type { Reservacion } from "@/lib/confirmacion-reserva";

export function CancelarReserva({
  reserva,
  onCancelada,
}: {
  reserva: Reservacion;
  onCancelada: (reserva: Reservacion) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<{
    error?: string;
    sinSesion?: boolean;
  }>({});
  const enviando = useRef(false);

  async function confirmar() {
    if (enviando.current || resultado.sinSesion) return;
    if (!puedeModificarReserva(reserva)) {
      setResultado({
        error: "Solo podés cancelar reservaciones confirmadas y futuras.",
      });
      return;
    }
    enviando.current = true;
    setCargando(true);
    setResultado({});
    try {
      const respuesta = await cancelarReservacion(reserva.reservacionId);
      if (respuesta.reserva) {
        setAbierto(false);
        onCancelada(respuesta.reserva);
      } else setResultado(respuesta);
    } catch {
      setResultado({
        error:
          "No pudimos confirmar la cancelación. Revisá Mis reservaciones antes de reintentar.",
      });
    } finally {
      enviando.current = false;
      setCargando(false);
    }
  }
  return (
    <>
      <Button
        className="mt-4"
        onClick={() => {
          setResultado({});
          setAbierto(true);
        }}
      >
        Cancelar reservación
      </Button>
      {abierto && <Modal
        abierto={abierto}
        onCerrar={() => {
          if (!enviando.current) setAbierto(false);
        }}
        titulo="¿Cancelar esta reservación?"
        descripcion="La mesa quedará disponible para otros clientes."
      >
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <dt>Reservación</dt>
          <dd>{reserva.reservacionId}</dd>
          <dt>Sucursal</dt>
          <dd>{reserva.sucursal}</dd>
          <dt>Mesa</dt>
          <dd>{reserva.mesa}</dd>
          <dt>Fecha</dt>
          <dd>{formatoFecha(reserva.fecha)}</dd>
          <dt>Hora</dt>
          <dd>{formatoHora(reserva.hora)}</dd>
          <dt>Personas</dt>
          <dd>{reserva.personas}</dd>
        </dl>
        {resultado.error && (
          <p role="alert" className="mt-4 text-red-300">
            {resultado.error}
          </p>
        )}
        {resultado.sinSesion && (
          <Link
            className="mt-4 block text-orange-300"
            href="/login?next=%2Fperfil%2Freservaciones"
          >
            Iniciar sesión
          </Link>
        )}
        {cargando && (
          <p role="status" className="mt-4">
            Cancelando reservación…
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button disabled={cargando} onClick={() => setAbierto(false)}>
            Conservar reservación
          </Button>
          <Button
            disabled={cargando || resultado.sinSesion}
            onClick={() => void confirmar()}
          >
            Confirmar cancelación
          </Button>
        </div>
      </Modal>}
    </>
  );
}
