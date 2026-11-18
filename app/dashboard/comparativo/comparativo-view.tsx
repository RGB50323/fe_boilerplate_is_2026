"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Fraunces } from "next/font/google";
import { useRouter, useSearchParams } from "next/navigation";
import { logout } from "@/app/actions/auth";
import {
  consultarComparativo,
  type ResultadoComparativo,
} from "@/app/actions/dashboard";
import { Button } from "@/components/ui/button";
import { BarraPeriodo, chipActivo, chipInactivo } from "@/components/ui/dashboard/barra-periodo";
import { EncabezadoDashboard } from "@/components/ui/dashboard/encabezado-dashboard";
import { EtiquetaEstado, IconoAlerta } from "@/components/ui/dashboard/etiqueta-estado";
import { GraficoComparativo } from "@/components/ui/dashboard/grafico-comparativo";
import { colorDiferencia, TablaComparativo } from "@/components/ui/dashboard/tabla-comparativo";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoading } from "@/components/ui/page-loading";
import { Skeleton } from "@/components/ui/skeleton";
import {
  COMPARATIVO_INICIAL,
  MINIMO_SUCURSALES,
  UMBRAL_ATENCION,
  alternarSucursal,
  calcularComparativo,
  comparativoAQuery,
  comparativoDesdeParams,
  formatoDiferencia,
  mensajeAtencion,
  sucursalesElegidas,
  type Comparativo,
  type FiltrosComparativo,
} from "@/lib/comparativo";
import { formatoEntero, formatoMoneda, periodoAQuery } from "@/lib/dashboard";
import { SUCURSALES } from "@/lib/sucursales";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: "600",
  display: "swap",
});

const IDS = SUCURSALES.map((s) => s.id);
const MENSAJE_MINIMO = "Selecciona al menos dos sucursales para comparar";

type Resultado = { clave: string; respuesta: ResultadoComparativo };

function filtrosDe(qs: string): FiltrosComparativo {
  return comparativoDesdeParams(Object.fromEntries(new URLSearchParams(qs)), IDS);
}

function Comparar() {
  const router = useRouter();
  const qs = useSearchParams().toString();
  const filtros = useMemo(() => filtrosDe(qs), [qs]);
  const elegidas = sucursalesElegidas(filtros, IDS);
  const suficientes = elegidas.length >= MINIMO_SUCURSALES;

  // Las sucursales elegidas no cambian la consulta: se piden todas y se
  // filtran aquí, así marcar o desmarcar es instantáneo.
  const consultaPeriodo = periodoAQuery(filtros);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [reintento, setReintento] = useState(0);
  const clave = `${consultaPeriodo}#${reintento}`;
  const cargando = suficientes && resultado?.clave !== clave;
  const respuesta = cargando || !suficientes ? null : resultado?.respuesta ?? null;

  useEffect(() => {
    // Criterio: con menos de dos sucursales no se genera el comparativo.
    if (!suficientes) return;
    let activo = true;
    const { periodo, desde, hasta } = filtrosDe(qs);
    consultarComparativo({ periodo, desde, hasta }).then((r) => {
      if (activo) setResultado({ clave: `${periodoAQuery({ periodo, desde, hasta })}#${reintento}`, respuesta: r });
    });
    return () => {
      activo = false;
    };
  }, [qs, reintento, suficientes]);

  function navegar(siguiente: FiltrosComparativo) {
    router.replace(`/dashboard/comparativo?${comparativoAQuery(siguiente)}`, { scroll: false });
  }

  const comparativo = useMemo(() => {
    if (!respuesta?.sucursales) return null;
    return calcularComparativo(
      respuesta.sucursales.filter((s) => elegidas.includes(s.sucursalId)),
    );
  }, [respuesta, elegidas]);

  return (
    <div className="mx-auto max-w-7xl">
      <EncabezadoDashboard
        vista="comparativo"
        titulo="Comparativo"
        consultaPeriodo={consultaPeriodo}
      />

      <BarraPeriodo
        periodo={filtros}
        onCambiar={(p) => navegar({ ...filtros, ...p })}
        onLimpiar={() => navegar(COMPARATIVO_INICIAL)}
      />

      {/* Sucursales a comparar */}
      <fieldset className="mt-4 rounded-2xl bg-[#2b2b2f] p-4 font-sans sm:px-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
          <legend className="float-left mr-1 text-sm text-zinc-400">Sucursales a comparar</legend>
          {SUCURSALES.map((s) => {
            const marcada = elegidas.includes(s.id);
            return (
              <label
                key={s.id}
                className={`${marcada ? chipActivo : chipInactivo} flex items-center gap-2 has-focus-visible:outline-2 has-focus-visible:outline-orange-400`}
              >
                <input
                  type="checkbox"
                  checked={marcada}
                  onChange={() => navegar(alternarSucursal(filtros, s.id, IDS))}
                  className="size-4 cursor-pointer accent-[#FF7A1A] focus-visible:outline-none"
                />
                {s.nombre}
              </label>
            );
          })}
          <p className={`text-sm ${suficientes ? "text-zinc-400" : "text-orange-200"}`}>
            Selecciona al menos dos sucursales
          </p>
        </div>
      </fieldset>

      <section aria-busy={cargando} aria-label="Comparativo de sucursales" className="mt-8">
        {!suficientes && <EmptyState mensaje={MENSAJE_MINIMO} />}

        {cargando && <ComparativoSkeleton />}

        {respuesta?.error && (
          <EmptyState
            mensaje={respuesta.error}
            variante="error"
          >
            {respuesta.motivo === "error" && (
              <Button onClick={() => setReintento((n) => n + 1)}>Reintentar</Button>
            )}
            {respuesta.motivo === "sin-sesion" && (
              <Button
                onClick={async () => {
                  await logout();
                  router.replace("/login");
                }}
              >
                Iniciar sesión
              </Button>
            )}
          </EmptyState>
        )}

        {comparativo && <Contenido comparativo={comparativo} />}
      </section>
    </div>
  );
}

function ComparativoSkeleton() {
  return (
    <div className="space-y-6">
      <p role="status" className="sr-only">Cargando comparativo...</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
      <Skeleton className="h-14 rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-60 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function Tarjeta({
  titulo,
  valor,
  detalle,
}: {
  titulo: string;
  valor: string;
  detalle: string;
}) {
  return (
    <div className="rounded-2xl bg-[#2b2b2f] p-5 sm:p-6">
      <p className="font-sans text-sm text-zinc-400">{titulo}</p>
      <p className="mt-2 text-3xl tabular-nums text-zinc-100 sm:text-4xl">{valor}</p>
      <p className="mt-1 font-sans text-xs text-zinc-400">{detalle}</p>
    </div>
  );
}

function Contenido({ comparativo }: { comparativo: Comparativo }) {
  const { promedio, filas, enAtencion, sinVentas } = comparativo;
  const porcentaje = Math.round(UMBRAL_ATENCION * 100);

  return (
    <div className="space-y-10">
      {/* Promedio de referencia y umbral */}
      <div className="grid gap-4 md:grid-cols-2">
        <Tarjeta
          titulo="Promedio de ventas (referencia)"
          valor={formatoMoneda(promedio)}
          detalle={`Promedio de las ${filas.length} sucursales comparadas`}
        />
        <Tarjeta
          titulo="Umbral de atención"
          valor={`${porcentaje} %`}
          detalle="Por debajo del promedio de ventas"
        />
      </div>

      {/* Resultado general */}
      {sinVentas ? (
        <EmptyState mensaje="Sin ventas en el periodo seleccionado" />
      ) : enAtencion.length > 0 ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-red-500/70 bg-red-950/40 px-5 py-4 font-sans text-zinc-100"
        >
          <IconoAlerta className="mt-0.5 size-5 shrink-0 text-red-300" />
          <p>
            <strong className="font-semibold">
              {enAtencion.length === 1
                ? "1 sucursal requiere atención:"
                : `${enAtencion.length} sucursales requieren atención:`}
            </strong>{" "}
            {mensajeAtencion(enAtencion)}.
          </p>
        </div>
      ) : (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-green-800 bg-green-950/30 px-5 py-4 font-sans text-green-100"
        >
          <span aria-hidden="true" className="text-lg leading-none">✓</span>
          Ninguna sucursal requiere atención en este periodo
        </div>
      )}

      {/* Tarjetas por sucursal, lado a lado */}
      <ul
        aria-label="Sucursales comparadas"
        className={`grid gap-4 ${filas.length >= 3 ? "md:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-2"}`}
      >
        {filas.map((f) => (
          <li
            key={f.sucursalId}
            aria-labelledby={`sucursal-${f.sucursalId}`}
            className={`rounded-2xl border-2 bg-[#2b2b2f] p-5 sm:p-6 ${
              f.requiereAtencion ? "border-red-500/80" : "border-transparent"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id={`sucursal-${f.sucursalId}`} className="text-2xl text-zinc-100">
                {f.nombre}
              </h3>
              {f.requiereAtencion && (
                <span className="font-sans">
                  <EtiquetaEstado requiereAtencion />
                </span>
              )}
            </div>
            <p className="mt-3 text-3xl tabular-nums text-zinc-100 sm:text-4xl">
              {formatoMoneda(f.ventas)}
            </p>
            <p className="font-sans text-sm text-zinc-400">Ventas</p>
            <dl className="mt-4 divide-y divide-zinc-700 font-sans text-sm">
              <div className="flex justify-between py-2.5">
                <dt className="text-zinc-400">Pedidos</dt>
                <dd className="font-semibold tabular-nums">{formatoEntero(f.pedidos)}</dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-zinc-400">Ticket promedio</dt>
                <dd className="font-semibold tabular-nums">{formatoMoneda(f.ticketPromedio)}</dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-zinc-400">Diferencia vs. promedio</dt>
                <dd className={`font-semibold tabular-nums ${colorDiferencia(f.diferencia)}`}>
                  {formatoDiferencia(f.diferencia)}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      {!sinVentas && (
        <section aria-labelledby="titulo-grafico">
          <h2 id="titulo-grafico" className="mb-4 text-2xl text-zinc-100 sm:text-3xl">
            Ventas por sucursal vs. promedio
          </h2>
          <div className="rounded-2xl bg-[#2b2b2f] p-4 sm:p-8">
            <GraficoComparativo comparativo={comparativo} />
          </div>
        </section>
      )}

      <section aria-labelledby="titulo-detalle">
        <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 id="titulo-detalle" className="text-2xl text-zinc-100 sm:text-3xl">
            Detalle
          </h2>
          <p className="font-sans text-sm text-zinc-400">
            Clic en el encabezado de una columna para ordenar
          </p>
        </div>
        <div className="rounded-2xl bg-[#2b2b2f] p-4 font-sans sm:p-6">
          <TablaComparativo filas={filas} />
        </div>
      </section>
    </div>
  );
}

export function ComparativoView() {
  return (
    <main
      className={`${fraunces.className} min-h-dvh bg-[#101012] px-4 pb-16 pt-2 text-zinc-100 scheme-dark sm:px-8 lg:px-15`}
    >
      <Suspense fallback={<PageLoading mensaje="Cargando comparativo..." />}>
        <Comparar />
      </Suspense>
    </main>
  );
}
