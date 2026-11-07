"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { consultarDisponibilidad } from "@/app/actions/reservaciones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FieldError } from "@/components/ui/error";
import {
  formatoFecha,
  formatoHora,
  horasDisponibles,
  validarFiltros,
  type DatosReservacion,
  type ErroresDisponibilidad,
  type FiltrosDisponibilidad,
  type MesaDisponible,
  type Sucursal,
} from "@/lib/reservaciones";
import { MesaCard } from "./mesa-card";
import { MesaIcon } from "./mesa-icon";

type Resultado = {
  estado: "inicial" | "cargando" | "listo" | "error";
  mesas: MesaDisponible[];
  mensaje?: string;
  consulta?: FiltrosDisponibilidad;
};

export function DisponibilidadForm({
  sucursales,
  fechaInicial,
  horasIniciales,
  onReservar,
}: {
  sucursales: Sucursal[];
  fechaInicial: string;
  horasIniciales: string[];
  onReservar?: (datos: DatosReservacion) => void;
}) {
  const [filtros, setFiltros] = useState<FiltrosDisponibilidad>({
    sucursalId: String(sucursales[0].id),
    fecha: fechaInicial,
    hora: horasIniciales[0] ?? "",
    personas: "4",
  });
  const [horas, setHoras] = useState(horasIniciales);
  const [errores, setErrores] = useState<ErroresDisponibilidad>({});
  const [consultado, setConsultado] = useState(false);
  const [resultado, setResultado] = useState<Resultado>({
    estado: "inicial",
    mesas: [],
  });
  const solicitud = useRef(0);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
      solicitud.current += 1;
    },
    [],
  );

  async function buscar(criterios: FiltrosDisponibilidad) {
    if (temporizador.current) clearTimeout(temporizador.current);
    const numeroSolicitud = ++solicitud.current;
    const erroresActuales = validarFiltros(
      criterios,
      sucursales.find((item) => String(item.id) === criterios.sucursalId)
        ?.horarios ?? [],
    );
    setErrores(erroresActuales);
    if (Object.keys(erroresActuales).length) {
      setResultado({ estado: "inicial", mesas: [] });
      return;
    }
    setResultado({ estado: "cargando", mesas: [] });
    const datos = new FormData();
    Object.entries(criterios).forEach(([campo, valor]) =>
      datos.set(campo, valor),
    );
    try {
      const respuesta = await consultarDisponibilidad(datos);
      // Una búsqueda anterior nunca reemplaza los resultados de filtros nuevos.
      if (solicitud.current !== numeroSolicitud) return;
      if (respuesta.errores && Object.keys(respuesta.errores).length) {
        setErrores(respuesta.errores);
        setResultado({ estado: "inicial", mesas: [] });
        return;
      }
      if (respuesta.error) {
        setErrores(respuesta.errores ?? {});
        setResultado({
          estado: "error",
          mesas: [],
          mensaje:
            respuesta.error ?? "Revisá los campos indicados para continuar.",
        });
        return;
      }
      setResultado({
        estado: "listo",
        mesas: respuesta.mesas,
        consulta: criterios,
      });
    } catch {
      if (solicitud.current === numeroSolicitud) {
        setResultado({
          estado: "error",
          mesas: [],
          mensaje:
            "No pudimos consultar la disponibilidad. Intentá nuevamente.",
        });
      }
    }
  }

  function cambiar(campo: keyof FiltrosDisponibilidad, valor: string) {
    const siguientes = { ...filtros, [campo]: valor };
    if (campo === "fecha" || campo === "sucursalId") {
      const horarios =
        sucursales.find((item) => String(item.id) === siguientes.sucursalId)
          ?.horarios ?? [];
      const nuevasHoras = horasDisponibles(siguientes.fecha, horarios);
      setHoras(nuevasHoras);
      if (!nuevasHoras.includes(siguientes.hora))
        siguientes.hora = nuevasHoras[0] ?? "";
    }
    setFiltros(siguientes);
    solicitud.current += 1;
    if (temporizador.current) clearTimeout(temporizador.current);
    const nuevosErrores = validarFiltros(
      siguientes,
      sucursales.find((item) => String(item.id) === siguientes.sucursalId)
        ?.horarios ?? [],
    );
    setErrores(nuevosErrores);
    if (!consultado) return;
    if (Object.keys(nuevosErrores).length) {
      setResultado({ estado: "inicial", mesas: [] });
      return;
    }
    setResultado({ estado: "cargando", mesas: [] });
    temporizador.current = setTimeout(() => {
      void buscar(siguientes);
    }, 350);
  }

  function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConsultado(true);
    void buscar(filtros);
  }

  const cargando = resultado.estado === "cargando";
  const consulta = resultado.consulta;
  const sucursal = sucursales.find(
    (item) => String(item.id) === consulta?.sucursalId,
  );
  const filtrosInvalidos =
    Object.keys(
      validarFiltros(
        filtros,
        sucursales.find((item) => String(item.id) === filtros.sucursalId)
          ?.horarios ?? [],
      ),
    ).length > 0;

  return (
    <>
      <form
        onSubmit={enviar}
        noValidate
        aria-label="Buscar mesas"
        className="rounded-2xl border border-white/5 bg-[#242427] p-5 sm:p-7"
      >
        <div className="grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-[1.3fr_1.3fr_1fr_.7fr_auto]">
          <div className="grid gap-2">
            <label
              htmlFor="sucursalId"
              className="text-sm font-medium text-zinc-200"
            >
              Sucursal
            </label>
            <Select
              id="sucursalId"
              name="sucursalId"
              value={filtros.sucursalId}
              onChange={(event) => cambiar("sucursalId", event.target.value)}
              aria-invalid={Boolean(errores.sucursalId)}
              aria-describedby={
                errores.sucursalId ? "sucursal-error" : undefined
              }
            >
              {sucursales.map((item) => (
                <option key={item.id} value={item.id}>
                  Sucursal {item.nombre}
                </option>
              ))}
            </Select>
            <FieldError id="sucursal-error" message={errores.sucursalId} />
          </div>
          <div className="grid gap-2">
            <label
              htmlFor="fecha"
              className="text-sm font-medium text-zinc-200"
            >
              Fecha
            </label>
            <Input
              id="fecha"
              name="fecha"
              type="date"
              required
              min={fechaInicial}
              value={filtros.fecha}
              onChange={(event) => cambiar("fecha", event.target.value)}
              aria-invalid={Boolean(errores.fecha)}
              aria-describedby={errores.fecha ? "fecha-error" : undefined}
            />
            <FieldError id="fecha-error" message={errores.fecha} />
          </div>
          <div className="grid gap-2">
            <label htmlFor="hora" className="text-sm font-medium text-zinc-200">
              Hora
            </label>
            <Select
              id="hora"
              name="hora"
              required
              value={filtros.hora}
              onChange={(event) => cambiar("hora", event.target.value)}
              aria-invalid={Boolean(errores.hora)}
              aria-describedby={errores.hora ? "hora-error" : undefined}
            >
              <option value="" disabled>
                Elegí una hora
              </option>
              {horas.map((hora) => (
                <option key={hora} value={hora}>
                  {formatoHora(hora)}
                </option>
              ))}
            </Select>
            <FieldError id="hora-error" message={errores.hora} />
            {!horas.length && (
              <p className="text-xs text-zinc-400">
                No hay horarios disponibles para esta sucursal y fecha. Elegí
                otro día o sucursal.
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <label
              htmlFor="personas"
              className="text-sm font-medium text-zinc-200"
            >
              Personas
            </label>
            <Input
              id="personas"
              name="personas"
              type="number"
              inputMode="numeric"
              required
              min={1}
              step={1}
              value={filtros.personas}
              onChange={(event) => cambiar("personas", event.target.value)}
              aria-invalid={Boolean(errores.personas)}
              aria-describedby={errores.personas ? "personas-error" : undefined}
            />
            <FieldError id="personas-error" message={errores.personas} />
          </div>
          <Button
            type="submit"
            disabled={cargando || filtrosInvalidos}
            className="min-w-36 sm:col-span-2 lg:col-span-1 lg:mt-7"
          >
            {cargando ? "Buscando…" : "Buscar mesas"}
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-white/5 pt-4 text-xs leading-relaxed text-zinc-400">
          <p>Mesas por 2 horas · Horarios de El Salvador</p>
          <p>Después de consultar, tus cambios actualizan los resultados.</p>
        </div>
      </form>

      {consulta && resultado.estado === "listo" && (
        <dl className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-zinc-300">
          <div className="flex gap-2">
            <dt className="text-zinc-500">Sucursal</dt>
            <dd>{sucursal?.nombre}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-zinc-500">Fecha</dt>
            <dd>{formatoFecha(consulta.fecha)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-zinc-500">Hora</dt>
            <dd>{formatoHora(consulta.hora)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-zinc-500">Personas</dt>
            <dd>{consulta.personas}</dd>
          </div>
        </dl>
      )}

      <section
        aria-labelledby="mesas-title"
        aria-busy={cargando}
        className="mt-12"
      >
        <div className="mb-7 text-center">
          <h2
            id="mesas-title"
            className="text-3xl [font-family:var(--font-reservas)] sm:text-4xl"
          >
            Mesas disponibles
          </h2>
          <p role="status" className="mt-2 min-h-5 text-sm text-zinc-400">
            {cargando
              ? "Buscando tu próxima mesa…"
              : resultado.estado === "listo" && resultado.mesas.length > 0
                ? `${resultado.mesas.length} ${resultado.mesas.length === 1 ? "mesa disponible" : "mesas disponibles"} para tu visita`
                : ""}
          </p>
        </div>

        {resultado.estado === "inicial" && (
          <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-12 text-center">
            <MesaIcon className="mx-auto mb-3 size-16 text-zinc-500" />
            <p className="text-lg text-zinc-200">
              {consultado
                ? "Ajustá los datos de tu búsqueda"
                : "Encontrá el lugar para tu próxima visita"}
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              {consultado
                ? "Revisá los campos indicados para ver las mesas disponibles."
                : "Elegí sucursal, fecha, hora y personas. Nosotros buscamos tu mesa."}
            </p>
          </div>
        )}
        {cargando && (
          <div
            aria-hidden="true"
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {[1, 2, 3].map((id) => (
              <div
                key={id}
                className="h-80 animate-pulse rounded-2xl bg-[#202023] motion-reduce:animate-none"
              />
            ))}
          </div>
        )}
        {resultado.estado === "error" && (
          <div
            role="alert"
            className="rounded-2xl border border-red-900/60 bg-red-950/20 p-7 text-center"
          >
            <p className="text-red-200">{resultado.mensaje}</p>
            <Button onClick={() => void buscar(filtros)} className="mt-5">
              Intentar de nuevo
            </Button>
          </div>
        )}
        {resultado.estado === "listo" && resultado.mesas.length === 0 && (
          <div
            role="status"
            className="rounded-2xl border border-zinc-800 bg-[#18181b] px-6 py-12 text-center"
          >
            <MesaIcon className="mx-auto mb-4 size-16 text-zinc-500" />
            <p className="mx-auto max-w-xl text-lg text-zinc-200">
              No hay mesas disponibles para la fecha, hora y cantidad de
              personas seleccionadas
            </p>
            <p className="mt-3 text-sm text-zinc-400">
              Probá otra hora, fecha o sucursal.
            </p>
          </div>
        )}
        {resultado.estado === "listo" && resultado.mesas.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {resultado.mesas.map((mesa) => (
              <MesaCard
                key={mesa.mesaId}
                mesa={mesa}
                onReservar={
                  onReservar && consulta
                    ? () =>
                        onReservar({
                          mesaId: mesa.mesaId,
                          sucursalId: Number(consulta.sucursalId),
                          fecha: consulta.fecha,
                          hora: consulta.hora,
                          personas: Number(consulta.personas),
                        })
                    : undefined
                }
              />
            ))}
          </div>
        )}
        {resultado.estado === "listo" &&
          resultado.mesas.length > 0 &&
          !onReservar && (
            <p role="status" className="mt-6 text-center text-sm text-zinc-400">
              La confirmación de reservaciones todavía no está disponible.
            </p>
          )}
      </section>
    </>
  );
}
