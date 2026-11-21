"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { io, type Socket } from "socket.io-client";
import { consultarOcupacion } from "@/app/actions/ocupacion";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/error";
import { Input } from "@/components/ui/input";
import { PageLoading } from "@/components/ui/page-loading";
import {
  fechaHoyElSalvador,
  formatoFechaBonita,
  SIN_HORARIO_ATENCION,
  SIN_MESAS_ACTIVAS,
  type BloqueOcupacion,
  type OcupacionProyectada,
} from "@/lib/ocupacion";

interface Props {
  token: string;
  socketUrl: string;
  sucursalId: number;
}

export function OcupacionView({ token, socketUrl, sucursalId }: Props) {
  const router = useRouter();
  const [fecha, setFecha] = useState(() => fechaHoyElSalvador());
  const [fechaConsultada, setFechaConsultada] = useState(() => fechaHoyElSalvador());
  const [numeroConsulta, setNumeroConsulta] = useState(0);
  const [ocupacion, setOcupacion] = useState<OcupacionProyectada>();
  const [error, setError] = useState<string>();
  const [errorFecha, setErrorFecha] = useState<string>();
  const [cargando, setCargando] = useState(true);
  const [sinSesion, setSinSesion] = useState(false);

  const fechaConsultadaRef = useRef(fechaConsultada);
  fechaConsultadaRef.current = fechaConsultada;
  const solicitudActualRef = useRef(0);

  // Sesión vencida: redirige al login
  useEffect(() => {
    if (sinSesion) router.replace("/login");
  }, [sinSesion, router]);

  const cargarOcupacion = useCallback(
    async (fechaAConsultar: string, mostrarSpinner = true) => {
      const solicitud = ++solicitudActualRef.current;
      if (mostrarSpinner) setCargando(true);
      try {
        const resultado = await consultarOcupacion(fechaAConsultar);
        if (solicitud !== solicitudActualRef.current) return;

        if ("ocupacion" in resultado) {
          setOcupacion(resultado.ocupacion);
          setError(undefined);
        } else if ("sinSesion" in resultado) {
          setSinSesion(true);
        } else {
          setOcupacion(undefined);
          setError(resultado.error);
        }
      } catch {
        if (solicitud === solicitudActualRef.current) {
          setError("No pudimos cargar la ocupación proyectada. Intenta de nuevo.");
        }
      } finally {
        if (solicitud === solicitudActualRef.current) setCargando(false);
      }
    },
    [],
  );

  // Carga inicial y cada consulta, incluso si se repite la misma fecha
  useEffect(() => {
    void cargarOcupacion(fechaConsultada);
  }, [fechaConsultada, numeroConsulta, cargarOcupacion]);

  // WebSocket para actualización en tiempo real ante creación, edición o cancelación (CA5)
  useEffect(() => {
    if (!token || !socketUrl) return;

    let socket: Socket | null = null;
    try {
      socket = io(socketUrl, {
        auth: { token },
        transports: ["websocket"],
        reconnection: true,
      });

      socket.on(
        "ocupacion:actualizada",
        (payload?: { sucursalId?: number; fecha?: string }) => {
          if (
            !payload ||
            payload.sucursalId === undefined ||
            payload.sucursalId === sucursalId
          ) {
            // Si la fecha del evento coincide o no viene especificada, actualiza
            if (!payload?.fecha || payload.fecha === fechaConsultadaRef.current) {
              void cargarOcupacion(fechaConsultadaRef.current, false);
            }
          }
        },
      );
    } catch {
      // Si la conexión falla, la consulta manual sigue disponible
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [token, socketUrl, sucursalId, cargarOcupacion]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      setErrorFecha("Ingresa una fecha válida en formato YYYY-MM-DD.");
      return;
    }
    setErrorFecha(undefined);
    setFechaConsultada(fecha);
    setNumeroConsulta((numero) => numero + 1);
  }

  return (
    <main className="py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-5xl">
            Ocupación proyectada
            {ocupacion ? ` — ${ocupacion.sucursal}` : ""}
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Monitorea la proyección de ocupación del salón por bloques de una hora para planificar el personal.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        aria-label="Seleccionar fecha"
        className="mt-6 flex flex-wrap items-end gap-4 rounded-2xl border border-zinc-800 bg-[#18181b] p-5"
      >
        <div>
          <label htmlFor="fecha" className="mb-2 block text-sm font-medium text-zinc-300">
            Fecha de proyección
          </label>
          <Input
            id="fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            aria-describedby="fecha-error"
          />
        </div>
        <Button type="submit" disabled={cargando}>
          Consultar
        </Button>
        <div className="basis-full">
          <FieldError id="fecha-error" message={errorFecha} />
        </div>
      </form>

      <section
        aria-label="Proyección de ocupación"
        aria-busy={cargando}
        className="mt-8"
      >
        {cargando ? (
          <PageLoading mensaje="Cargando proyección de ocupación…" />
        ) : error ? (
          <p
            role="alert"
            className="rounded-2xl border border-red-900/60 bg-red-950/20 p-7 text-red-200"
          >
            {error}
          </p>
        ) : ocupacion ? (
          <div className="space-y-6">
            {/* Encabezado con datos generales */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-[#18181b] p-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-400">
                  Fecha seleccionada
                </p>
                <p className="text-lg font-semibold text-zinc-100 capitalize">
                  {formatoFechaBonita(ocupacion.fecha)}
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xs uppercase tracking-wider text-zinc-400">
                    Mesas activas
                  </p>
                  <p className="text-2xl font-bold text-[#FF7A1A]">
                    {ocupacion.mesasActivas}
                  </p>
                </div>
              </div>
            </div>

            {/* Aviso si la sucursal no tiene mesas activas (CA4) */}
            {!ocupacion.calculable && (
              <div
                role="alert"
                className="rounded-2xl border border-amber-900/60 bg-amber-950/30 p-6 text-amber-200"
              >
                <p className="font-medium">{SIN_MESAS_ACTIVAS}</p>
              </div>
            )}

            {/* Aviso si la sucursal está cerrada en esa fecha */}
            {ocupacion.bloques.length === 0 ? (
              <p
                role="status"
                className="rounded-2xl border border-dashed border-zinc-700 px-6 py-12 text-center text-zinc-300"
              >
                {SIN_HORARIO_ATENCION}
              </p>
            ) : (
              /* Lista de bloques horarios (CA1, CA2, CA4) */
              <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#18181b]">
                <div className="border-b border-zinc-800 px-6 py-4">
                  <h2 className="text-lg font-semibold text-zinc-100">
                    Bloques horarios del salón
                  </h2>
                </div>

                <div className="divide-y divide-zinc-800/80">
                  {ocupacion.bloques.map((bloque) => (
                    <TarjetaBloque
                      key={`${bloque.horaInicio}-${bloque.horaFin}`}
                      bloque={bloque}
                      calculable={ocupacion.calculable}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function TarjetaBloque({
  bloque,
  calculable,
}: {
  bloque: BloqueOcupacion;
  calculable: boolean;
}) {
  const porcentaje = bloque.porcentajeOcupacion;

  return (
    <article
      aria-label={`Bloque ${bloque.horaInicio} a ${bloque.horaFin}`}
      className="p-5 sm:p-6 transition-colors hover:bg-zinc-900/40"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Horario */}
        <div className="min-w-32">
          <p className="text-xs uppercase tracking-wider text-zinc-400">
            Horario
          </p>
          <p className="text-xl font-bold text-zinc-100">
            {bloque.horaInicio} – {bloque.horaFin}
          </p>
        </div>

        {/* Mesas */}
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="block text-xs uppercase tracking-wider text-zinc-400">
              Reservadas
            </span>
            <span className="font-semibold text-zinc-200">
              {bloque.mesasReservadas} {bloque.mesasReservadas === 1 ? "mesa" : "mesas"}
            </span>
          </div>

          <div>
            <span className="block text-xs uppercase tracking-wider text-zinc-400">
              Disponibles
            </span>
            <span className="font-semibold text-emerald-400">
              {bloque.mesasDisponibles} {bloque.mesasDisponibles === 1 ? "mesa" : "mesas"}
            </span>
          </div>
        </div>

        {/* Porcentaje y barra de progreso */}
        <div className="w-full sm:w-56">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="uppercase tracking-wider text-zinc-400">
              Ocupación
            </span>
            <span
              className={`font-bold ${
                porcentaje === null
                  ? "text-zinc-500"
                  : porcentaje >= 80
                    ? "text-red-400"
                    : porcentaje >= 50
                      ? "text-orange-400"
                      : "text-zinc-200"
              }`}
            >
              {calculable && porcentaje !== null ? `${porcentaje} %` : "No disponible"}
            </span>
          </div>

          {calculable && porcentaje !== null ? (
            <div
              role="progressbar"
              aria-valuenow={porcentaje}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Ocupación de ${bloque.horaInicio} a ${bloque.horaFin}: ${porcentaje} %`}
              className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800"
            >
              <div
                className={`h-full transition-all duration-300 ${
                  porcentaje >= 80
                    ? "bg-red-500"
                    : porcentaje >= 50
                      ? "bg-[#FF7A1A]"
                      : porcentaje > 0
                        ? "bg-emerald-500"
                        : "bg-zinc-700"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, porcentaje))}%` }}
              />
            </div>
          ) : (
            <div className="h-2.5 w-full rounded-full bg-zinc-800" />
          )}
        </div>
      </div>
    </article>
  );
}
