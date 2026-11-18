"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PERIODOS,
  formatoFechaCorta,
  rangoDelPeriodo,
  validarRango,
  type ErroresRango,
  type FiltrosPeriodo,
  type Periodo,
} from "@/lib/dashboard";

const chip =
  "cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-orange-400";
export const chipInactivo = `${chip} border-transparent bg-[#101012] text-zinc-200 hover:border-zinc-600`;
export const chipActivo = `${chip} border-[#FF7A1A] bg-[#FF7A1A]/15 text-orange-100`;

// Barra de filtros común: Hoy / Semana / Mes / Personalizado, el rango de
// fechas (se aplica con "Aplicar", criterio de rango inválido) y Limpiar
// filtros. `controles` va después del rango y `acciones` al final.
export function BarraPeriodo({
  periodo,
  onCambiar,
  onLimpiar,
  controles,
  acciones,
}: {
  periodo: FiltrosPeriodo;
  onCambiar: (periodo: FiltrosPeriodo) => void;
  onLimpiar: () => void;
  controles?: ReactNode;
  acciones?: ReactNode;
}) {
  const [mostrarRango, setMostrarRango] = useState(false);
  const [rangoEntrada, setRangoEntrada] = useState(() => rangoDelPeriodo(periodo));
  const [errores, setErrores] = useState<ErroresRango>({});

  const rango = rangoDelPeriodo(periodo);
  const periodoActivo: Periodo = mostrarRango ? "rango" : periodo.periodo;

  function elegir(p: Periodo) {
    setErrores({});
    if (p === "rango") {
      setRangoEntrada(rangoDelPeriodo(periodo));
      setMostrarRango(true);
      return;
    }
    setMostrarRango(false);
    onCambiar({ periodo: p, desde: "", hasta: "" });
  }

  function aplicar(e: FormEvent) {
    e.preventDefault();
    const nuevos = validarRango(rangoEntrada.desde, rangoEntrada.hasta);
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;
    setMostrarRango(false);
    onCambiar({ periodo: "rango", ...rangoEntrada });
  }

  function cerrar() {
    setMostrarRango(false);
    setErrores({});
  }

  return (
    <section
      aria-label="Filtros del dashboard"
      className="rounded-2xl bg-[#2b2b2f] p-4 font-sans sm:px-6"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
        <div role="group" aria-label="Periodo" className="flex flex-wrap items-center gap-2">
          <span aria-hidden="true" className="mr-1 text-sm text-zinc-400">Periodo</span>
          {PERIODOS.map((p) => (
            <button
              key={p.value}
              type="button"
              aria-pressed={periodoActivo === p.value}
              onClick={() => elegir(p.value)}
              className={periodoActivo === p.value ? chipActivo : chipInactivo}
            >
              {p.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          aria-expanded={mostrarRango}
          aria-controls="panel-rango"
          onClick={() => (mostrarRango ? cerrar() : elegir("rango"))}
          className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-700 bg-[#262626] px-4 py-2 text-sm tabular-nums text-zinc-100 focus-visible:outline-2 focus-visible:outline-orange-400"
        >
          <span className="sr-only">Rango de fechas: </span>
          {formatoFechaCorta(rango.desde)} – {formatoFechaCorta(rango.hasta)}
          <span aria-hidden="true">▾</span>
        </button>

        {controles}

        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <button
            type="button"
            onClick={() => {
              cerrar();
              onLimpiar();
            }}
            className={`${chipInactivo} whitespace-nowrap`}
          >
            Limpiar filtros
          </button>
          {acciones}
        </div>
      </div>

      {mostrarRango && (
        <form
          id="panel-rango"
          onSubmit={aplicar}
          noValidate
          aria-label="Rango personalizado"
          className="mt-4 flex flex-wrap items-start gap-4 border-t border-zinc-700 pt-4"
        >
          {(["desde", "hasta"] as const).map((campo) => (
            <div key={campo} className="min-w-40">
              <label htmlFor={campo} className="mb-1 block text-sm font-medium text-orange-200">
                {campo === "desde" ? "Desde" : "Hasta"}
              </label>
              <Input
                id={campo}
                type="date"
                value={rangoEntrada[campo]}
                onChange={(e) => setRangoEntrada((r) => ({ ...r, [campo]: e.target.value }))}
                aria-invalid={Boolean(errores[campo])}
                aria-describedby={errores[campo] ? `${campo}-error` : undefined}
                className="py-2"
              />
              {errores[campo] && (
                <p id={`${campo}-error`} className="mt-1 max-w-64 text-sm text-red-300">
                  {errores[campo]}
                </p>
              )}
            </div>
          ))}
          <div className="mt-6 flex gap-2">
            <Button type="submit" className="px-5 py-2 text-sm">
              Aplicar
            </Button>
            <button type="button" onClick={cerrar} className={chipInactivo}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
