"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import {
  confirmarReservacion,
  type ConfirmacionResultado,
} from "@/app/actions/confirmacion-reserva";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FieldError } from "@/components/ui/error";
import { ResumenReserva } from "@/components/reservaciones/resumen-reserva";
import {
  fechaLocal,
  formatoHora,
  horasDisponibles,
  type MesaDisponible,
  type Sucursal,
} from "@/lib/reservaciones";
import {
  rutaDisponibilidad,
  rutaReserva,
  validarReserva,
  type CamposReserva,
  type ErroresReserva,
} from "@/lib/confirmacion-reserva";

export function ReservaForm({
  inicial,
  mesa,
  sucursal,
}: {
  inicial: CamposReserva;
  mesa: MesaDisponible;
  sucursal: Sucursal;
}) {
  const [datos, setDatos] = useState(inicial);
  const [errores, setErrores] = useState<ErroresReserva>({});
  const [resultado, setResultado] = useState<ConfirmacionResultado>({});
  const [pendiente, setPendiente] = useState(false);
  const enviando = useRef(false);
  const horas = horasDisponibles(datos.fecha, sucursal.horarios);
  const volver = rutaDisponibilidad(datos);
  const siguiente = rutaReserva({
    mesaId: mesa.mesaId,
    sucursalId: sucursal.id,
    fecha: datos.fecha,
    hora: datos.hora,
    personas: Number(datos.personas),
  });

  function cambiar(campo: keyof CamposReserva, valor: string) {
    const nuevos = { ...datos, [campo]: valor };
    if (campo === "fecha") {
      const disponibles = horasDisponibles(valor, sucursal.horarios);
      if (!disponibles.includes(nuevos.hora))
        nuevos.hora = disponibles[0] ?? "";
    }
    setDatos(nuevos);
    setErrores({});
    setResultado({});
  }

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviando.current) return;
    const errores = validarReserva(datos, mesa.capacidad, sucursal.horarios);
    setErrores(errores);
    setResultado({});
    if (Object.keys(errores).length) return;
    enviando.current = true;
    setPendiente(true);
    try {
      const form = new FormData();
      Object.entries(datos).forEach(([k, v]) => form.set(k, v));
      const respuesta = await confirmarReservacion(form);
      setResultado(respuesta);
      setErrores(respuesta.errores ?? {});
    } catch {
      setResultado({
        error:
          "No pudimos recibir la respuesta. Revisá Mis reservaciones antes de volver a confirmar.",
      });
    } finally {
      enviando.current = false;
      setPendiente(false);
    }
  }

  if (resultado.reserva)
    return (
      <div>
        <p
          role="status"
          className="mb-6 rounded-xl border border-green-900 bg-green-950/30 p-4 text-green-200"
        >
          ¡Tu reservación está confirmada! Guardamos estos datos en tu cuenta.
        </p>
        <ResumenReserva reserva={resultado.reserva} />
        <div className="mt-6 flex flex-wrap gap-5">
          <Link
            href="/perfil/reservaciones"
            className="rounded-full bg-[#FF7A1A] px-5 py-3 font-semibold text-[#101012]"
          >
            Ver mis reservaciones
          </Link>
          <Link href="/menu" className="px-3 py-3 text-zinc-300">
            Explorar el menú
          </Link>
        </div>
      </div>
    );

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
      <aside className="h-fit rounded-2xl border border-zinc-800 bg-[#18181b] p-6">
        <p className="text-sm text-orange-300">Tu selección</p>
        <h2 className="mt-2 text-2xl font-semibold">Mesa {mesa.numero}</h2>
        <p className="mt-2 text-zinc-300">Sucursal {sucursal.nombre}</p>
        <p className="mt-2 text-sm text-zinc-400">
          Hasta {mesa.capacidad} personas{mesa.zona ? ` · ${mesa.zona}` : ""}
        </p>
        <p className="mt-6 border-t border-zinc-800 pt-4 text-sm text-zinc-400">
          Reservación por 2 horas.
          <br />
          Horarios de El Salvador.
        </p>
        <Link
          href={volver}
          className="mt-5 inline-block text-sm text-orange-300 underline"
        >
          Elegir otra mesa
        </Link>
      </aside>
      <form
        onSubmit={enviar}
        noValidate
        aria-label="Confirmar reservación"
        aria-busy={pendiente}
        className="rounded-2xl border border-zinc-800 bg-[#18181b] p-6 sm:p-8"
      >
        <fieldset disabled={pendiente} className="grid gap-5">
          <legend className="mb-6 text-xl font-semibold">
            Datos de tu visita
          </legend>
          {(
            [
              {
                campo: "nombre",
                etiqueta: "Nombre completo",
                tipo: "text",
                auto: "name",
                max: 120,
                placeholder: "Ana López",
              },
              {
                campo: "telefono",
                etiqueta: "Teléfono",
                tipo: "tel",
                auto: "tel-national",
                max: 9,
                placeholder: "7123-4567",
              },
              {
                campo: "correo",
                etiqueta: "Correo electrónico",
                tipo: "email",
                auto: "email",
                max: 160,
                placeholder: "ana@correo.com",
              },
            ] as const
          ).map(({ campo, etiqueta, tipo, auto, max, placeholder }) => (
            <div key={campo} className="grid gap-2">
              <label htmlFor={campo} className="text-sm text-zinc-200">
                {etiqueta}
              </label>
              <Input
                id={campo}
                name={campo}
                type={tipo}
                autoComplete={auto}
                maxLength={max}
                placeholder={placeholder}
                required
                value={datos[campo]}
                onChange={(e) => cambiar(campo, e.target.value)}
                aria-invalid={!!errores[campo]}
                aria-describedby={errores[campo] ? `${campo}-error` : undefined}
              />
              <FieldError id={`${campo}-error`} message={errores[campo]} />
            </div>
          ))}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="fecha" className="text-sm">
                Fecha
              </label>
              <Input
                id="fecha"
                name="fecha"
                type="date"
                required
                min={fechaLocal()}
                value={datos.fecha}
                onChange={(e) => cambiar("fecha", e.target.value)}
                aria-invalid={!!errores.fecha}
                aria-describedby={errores.fecha ? "fecha-error" : undefined}
              />
              <FieldError id="fecha-error" message={errores.fecha} />
            </div>
            <div className="grid gap-2">
              <label htmlFor="hora" className="text-sm">
                Hora
              </label>
              <Select
                id="hora"
                name="hora"
                required
                value={datos.hora}
                onChange={(e) => cambiar("hora", e.target.value)}
                aria-invalid={!!errores.hora}
                aria-describedby={errores.hora ? "hora-error" : undefined}
              >
                <option value="">Elegí una hora</option>
                {horas.map((h) => (
                  <option key={h} value={h}>
                    {formatoHora(h)}
                  </option>
                ))}
              </Select>
              <FieldError id="hora-error" message={errores.hora} />
              {!horas.length && (
                <p className="text-sm text-zinc-400">
                  No quedan horarios para esta fecha. Elegí otro día.
                </p>
              )}
            </div>
          </div>
          <div className="grid gap-2">
            <label htmlFor="personas" className="text-sm">
              Personas
            </label>
            <Input
              id="personas"
              name="personas"
              type="number"
              min={1}
              max={mesa.capacidad}
              step={1}
              required
              value={datos.personas}
              onChange={(e) => cambiar("personas", e.target.value)}
              aria-invalid={!!errores.personas}
              aria-describedby={errores.personas ? "personas-error" : undefined}
            />
            <FieldError id="personas-error" message={errores.personas} />
          </div>
          <FieldError
            id="mesa-error"
            message={errores.mesaId ?? errores.sucursalId}
          />
          {resultado.error && (
            <div
              role="alert"
              className="rounded-xl border border-red-900/60 bg-red-950/20 p-4 text-sm text-red-200"
            >
              <p>{resultado.error}</p>
              {resultado.sinDisponibilidad && (
                <Link
                  href={volver}
                  className="mt-3 inline-block text-orange-300 underline"
                >
                  Elegir otra mesa disponible
                </Link>
              )}
              {resultado.sinSesion && (
                <Link
                  href={`/login?next=${encodeURIComponent(siguiente)}`}
                  className="mt-3 inline-block text-orange-300 underline"
                >
                  Iniciar sesión para continuar
                </Link>
              )}
            </div>
          )}
          <Button
            type="submit"
            disabled={pendiente || resultado.sinSesion}
            className="w-full"
          >
            {pendiente ? "Confirmando…" : "Confirmar reservación"}
          </Button>
        </fieldset>
        <p className="mt-4 text-xs leading-relaxed text-zinc-400">
          La disponibilidad se verifica nuevamente al confirmar. Podés consultar
          el resultado en{" "}
          <Link
            href="/perfil/reservaciones"
            className="text-orange-300 underline"
          >
            Mis reservaciones
          </Link>
          .
        </p>
      </form>
    </div>
  );
}
