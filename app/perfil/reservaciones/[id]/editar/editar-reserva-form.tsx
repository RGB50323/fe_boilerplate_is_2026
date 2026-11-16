"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { modificarReservacion } from "@/app/actions/edicion-reserva";
import type { DetalleReserva, ResultadoEdicion } from "@/lib/edicion-reserva";
import {
  fechaLocal,
  formatoHora,
  horasDisponibles,
  validarFiltros,
  type MesaDisponible,
} from "@/lib/reservaciones";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ResumenReserva } from "@/components/reservaciones/resumen-reserva";

export function EditarReservaForm({ reserva }: { reserva: DetalleReserva }) {
  const [fecha, setFecha] = useState(reserva.fecha);
  const [hora, setHora] = useState(reserva.hora);
  const [personas, setPersonas] = useState(String(reserva.personas));
  const [mesa, setMesa] = useState<MesaDisponible>({
    mesaId: reserva.mesaId,
    numero: reserva.mesa,
    capacidad: reserva.capacidad,
    zona: null,
  });
  const [resultado, setResultado] = useState<ResultadoEdicion>({});
  const [cargando, setCargando] = useState(false);
  const enviando = useRef(false);
  const horas = horasDisponibles(fecha, reserva.horarios);
  const campoError = (campo: string) =>
    resultado.errores?.[campo] ? (
      <p
        id={campo + "-error"}
        className="mt-2 text-sm text-red-300"
        role="alert"
      >
        {resultado.errores[campo]}
      </p>
    ) : null;
  function limpiar() {
    setResultado({});
    setMesa({
      mesaId: reserva.mesaId,
      numero: reserva.mesa,
      capacidad: reserva.capacidad,
      zona: null,
    });
  }
  async function guardar() {
    if (enviando.current) return;
    const errores = validarFiltros(
      { sucursalId: String(reserva.sucursalId), fecha, hora, personas },
      reserva.horarios,
    );
    if (Number(personas) > mesa.capacidad)
      errores.personas = `Esta mesa admite hasta ${mesa.capacidad} personas.`;
    if (Object.keys(errores).length) {
      setResultado({ errores });
      return;
    }
    enviando.current = true;
    setCargando(true);
    setResultado({});
    try {
      setResultado(
        await modificarReservacion(reserva.reservacionId, {
          fecha,
          hora,
          personas,
          mesaId: mesa.mesaId,
          version: reserva.version,
        }),
      );
    } catch {
      setResultado({
        error:
          "No pudimos completar la solicitud. Revisá Mis reservaciones antes de intentar de nuevo.",
      });
    } finally {
      enviando.current = false;
      setCargando(false);
    }
  }
  if (resultado.reserva)
    return (
      <div className="space-y-6">
        <p
          role="status"
          className="rounded-xl border border-green-800 bg-green-950/40 p-4 text-green-200"
        >
          Tu reservación se modificó correctamente. Podés consultar el aviso con
          los datos actualizados en tus notificaciones.
        </p>
        <ResumenReserva reserva={resultado.reserva} />
        <Link
          className="inline-block text-orange-300"
          href="/perfil/reservaciones"
        >
          Volver a mis reservaciones
        </Link>
      </div>
    );
  return (
    <div className="space-y-6">
      <section aria-label="Datos actuales">
        <h2 className="mb-3 text-xl">Tu reservación actual</h2>
        <ResumenReserva reserva={reserva} />
      </section>
      {reserva.estado !== "CONFIRMADA" ? (
        <p role="alert">Solo podés modificar una reservación confirmada.</p>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void guardar();
          }}
          aria-label="Modificar reservación"
          className="rounded-2xl border border-zinc-800 bg-[#18181b] p-6 sm:p-8"
          noValidate
        >
          <fieldset
            disabled={cargando || resultado.recargar}
            className="space-y-6"
          >
            <legend className="mb-5 text-2xl">Nuevos datos</legend>
            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <label htmlFor="fecha" className="mb-2 block">
                  Fecha
                </label>
                <Input
                  id="fecha"
                  type="date"
                  min={fechaLocal()}
                  value={fecha}
                  onChange={(e) => {
                    setFecha(e.target.value);
                    limpiar();
                  }}
                  aria-invalid={!!resultado.errores?.fecha}
                  aria-describedby={
                    resultado.errores?.fecha ? "fecha-error" : undefined
                  }
                />
                {campoError("fecha")}
              </div>
              <div>
                <label htmlFor="hora" className="mb-2 block">
                  Hora
                </label>
                <Select
                  id="hora"
                  value={hora}
                  onChange={(e) => {
                    setHora(e.target.value);
                    limpiar();
                  }}
                  aria-invalid={!!resultado.errores?.hora}
                  aria-describedby={
                    resultado.errores?.hora ? "hora-error" : undefined
                  }
                >
                  <option value="">Seleccioná una hora</option>
                  {!horas.includes(hora) && hora && (
                    <option value={hora} disabled>
                      {formatoHora(hora)} (no válida)
                    </option>
                  )}
                  {horas.map((h) => (
                    <option key={h} value={h}>
                      {formatoHora(h)}
                    </option>
                  ))}
                </Select>
                {campoError("hora")}
              </div>
              <div>
                <label htmlFor="personas" className="mb-2 block">
                  Personas
                </label>
                <Input
                  id="personas"
                  type="number"
                  min={1}
                  step={1}
                  value={personas}
                  onChange={(e) => {
                    setPersonas(e.target.value);
                    limpiar();
                  }}
                  aria-invalid={!!resultado.errores?.personas}
                  aria-describedby={
                    resultado.errores?.personas ? "personas-error" : undefined
                  }
                />
                {campoError("personas")}
              </div>
            </div>
            <p className="text-sm text-zinc-300">
              Mesa seleccionada: {mesa.numero} · Capacidad: {mesa.capacidad}{" "}
              personas · Duración: 2 horas.
            </p>
            {campoError("mesaId")}
            {resultado.alternativas && (
              <section aria-label="Mesas alternativas" className="space-y-3">
                <h3 className="text-xl">Elegí otra mesa disponible</h3>
                {resultado.alternativas.length === 0 ? (
                  <p>
                    No hay mesas disponibles para esos datos. Probá otra fecha u
                    hora.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {resultado.alternativas.map((m) => (
                      <Button
                        key={m.mesaId}
                        aria-pressed={mesa.mesaId === m.mesaId}
                        onClick={() => setMesa(m)}
                        className={
                          mesa.mesaId === m.mesaId
                            ? "ring-2 ring-orange-200 ring-offset-2 ring-offset-zinc-900"
                            : ""
                        }
                      >
                        Mesa {m.numero} · {m.capacidad} personas
                        {mesa.mesaId === m.mesaId ? " · Seleccionada" : ""}
                      </Button>
                    ))}
                  </div>
                )}
                <p className="text-sm text-zinc-400">
                  La disponibilidad se comprobará nuevamente al guardar.
                </p>
              </section>
            )}
            <Button
              type="submit"
              disabled={cargando || !fecha || !hora || !personas}
            >
              {cargando ? "Guardando cambios…" : "Guardar cambios"}
            </Button>
          </fieldset>
          {cargando && (
            <p role="status" className="mt-4 text-zinc-300">
              Comprobando disponibilidad y guardando…
            </p>
          )}
          {resultado.error && (
            <p role="alert" className="mt-4 text-red-300">
              {resultado.error}
            </p>
          )}
          {resultado.sinSesion && (
            <Link
              className="mt-4 inline-block text-orange-300"
              href={
                "/login?next=" +
                encodeURIComponent(
                  `/perfil/reservaciones/${reserva.reservacionId}/editar`,
                )
              }
            >
              Iniciar sesión
            </Link>
          )}
          {resultado.recargar && (
            <a
              className="mt-4 inline-block text-orange-300"
              href={`/perfil/reservaciones/${reserva.reservacionId}/editar`}
            >
              Recargar datos actuales
            </a>
          )}
        </form>
      )}
    </div>
  );
}
