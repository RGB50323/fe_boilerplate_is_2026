"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { consultarReporteCalificaciones } from "@/app/actions/resenas";
import { ResumenResenas } from "@/components/resenas/resumen-resenas";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/error";
import { Input } from "@/components/ui/input";
import { PageLoading } from "@/components/ui/page-loading";
import {
  SIN_RESENAS_PERIODO,
  errorRango,
  formatoFecha,
  type ReporteCalificaciones,
} from "@/lib/resenas";

type Filtro = { desde: string; hasta: string };

export function ReporteCalificacionesView() {
  const router = useRouter();
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [aplicado, setAplicado] = useState<Filtro>({ desde: "", hasta: "" });
  const [reporte, setReporte] = useState<ReporteCalificaciones>();
  const [error, setError] = useState<string>();
  const [errorFiltro, setErrorFiltro] = useState<string>();
  const [cargando, setCargando] = useState(true);
  const [sinSesion, setSinSesion] = useState(false);

  // Sesión vencida: al login (separado para no repetir la consulta)
  useEffect(() => {
    if (sinSesion) router.replace("/login");
  }, [sinSesion, router]);

  useEffect(() => {
    let vigente = true;
    consultarReporteCalificaciones(aplicado.desde, aplicado.hasta)
      .then((r) => {
        if (!vigente) return;
        if ("reporte" in r) {
          setReporte(r.reporte);
          setError(undefined);
        } else if ("sinSesion" in r) {
          setSinSesion(true);
        } else {
          setReporte(undefined);
          setError(r.error);
        }
      })
      .catch(() => {
        if (vigente)
          setError("No pudimos cargar el reporte. Intenta de nuevo.");
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [aplicado]);

  function aplicar(e: FormEvent) {
    e.preventDefault();
    // Con la fecha final anterior a la inicial no se genera el reporte
    const rango = errorRango(desde, hasta);
    setErrorFiltro(rango ?? undefined);
    if (rango) return;
    setCargando(true);
    setAplicado({ desde, hasta });
  }

  function quitarFiltro() {
    setDesde("");
    setHasta("");
    setErrorFiltro(undefined);
    setCargando(true);
    setAplicado({ desde: "", hasta: "" });
  }

  const periodo =
    aplicado.desde || aplicado.hasta
      ? `${aplicado.desde ? formatoFecha(aplicado.desde) : "el inicio"} al ${aplicado.hasta ? formatoFecha(aplicado.hasta) : "hoy"}`
      : "Desde el inicio";

  return (
    <main className="py-8">
      <h1 className="text-3xl sm:text-5xl">
        Calificaciones{reporte ? ` — ${reporte.sucursal}` : ""}
      </h1>

      <form
        onSubmit={aplicar}
        noValidate
        aria-label="Filtrar por fechas"
        className="mt-6 flex flex-wrap items-end gap-4 rounded-2xl border border-zinc-800 bg-[#18181b] p-5"
      >
        <div>
          <label htmlFor="desde" className="mb-2 block text-sm text-zinc-300">
            Desde
          </label>
          <Input
            id="desde"
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            aria-describedby="rango-error"
          />
        </div>
        <div>
          <label htmlFor="hasta" className="mb-2 block text-sm text-zinc-300">
            Hasta
          </label>
          <Input
            id="hasta"
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            aria-invalid={Boolean(errorFiltro)}
            aria-describedby="rango-error"
          />
        </div>
        <Button type="submit" disabled={cargando}>
          Aplicar
        </Button>
        {(aplicado.desde || aplicado.hasta) && (
          <button
            type="button"
            onClick={quitarFiltro}
            className="cursor-pointer py-3 text-sm text-zinc-300 underline underline-offset-4 hover:text-white"
          >
            Quitar filtro
          </button>
        )}
        <div className="basis-full">
          <FieldError id="rango-error" message={errorFiltro} />
        </div>
      </form>

      <section
        aria-label="Reporte de calificaciones"
        aria-busy={cargando}
        className="mt-8"
      >
        {cargando ? (
          <PageLoading mensaje="Cargando el reporte…" />
        ) : error ? (
          <p
            role="alert"
            className="rounded-2xl border border-red-900/60 bg-red-950/20 p-7 text-red-200"
          >
            {error}
          </p>
        ) : reporte && reporte.total === 0 ? (
          <p
            role="status"
            className="rounded-2xl border border-dashed border-zinc-700 px-6 py-12 text-center text-zinc-300"
          >
            {SIN_RESENAS_PERIODO}
          </p>
        ) : reporte && reporte.promedio !== null ? (
          <div className="rounded-2xl border border-zinc-800 bg-[#18181b] p-6 sm:p-8">
            <p className="mb-5 text-sm text-zinc-400">{periodo}</p>
            <ResumenResenas
              promedio={reporte.promedio}
              total={reporte.total}
              distribucion={reporte.distribucion}
              nota="Solo cuentan las reseñas visibles de tu sucursal."
            />
          </div>
        ) : null}
      </section>
    </main>
  );
}
