"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { Fraunces } from "next/font/google";
import { useRouter, useSearchParams } from "next/navigation";
import { logout } from "@/app/actions/auth";
import {
  consultarDashboard,
  type ResultadoDashboard,
} from "@/app/actions/dashboard";
import { CampanaNotificaciones } from "@/components/notificaciones/campana-notificaciones";
import { Button } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/ui/dashboard/dashboard-skeleton";
import { GraficoFranjas } from "@/components/ui/dashboard/grafico-franjas";
import { Dropdown } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageLoading } from "@/components/ui/page-loading";
import { Toast } from "@/components/ui/toast";
import {
  DIAS_SEMANA,
  PERIODOS,
  filtrosAQuery,
  filtrosDesdeParams,
  formatoEntero,
  formatoMoneda,
  generarCsv,
  nombreArchivoCsv,
  ordenarPlatillos,
  rangoDelPeriodo,
  resumenGeneral,
  ticketPromedio,
  validarRango,
  type DashboardRespuesta,
  type ErroresRango,
  type FiltrosDashboard,
  type Periodo,
} from "@/lib/dashboard";
import { formatoFecha } from "@/lib/reservaciones";
import { SUCURSALES } from "@/lib/sucursales";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: "600",
  display: "swap",
});

const LIMITE_PLATILLOS = 10;

const botonSecundario =
  "cursor-pointer rounded-full border border-[#FF7A1A]/50 bg-[#FF7A1A]/10 px-4 py-2 text-sm text-orange-200 transition-colors hover:bg-[#FF7A1A]/20 focus-visible:outline-2 focus-visible:outline-orange-400";

type Resultado = { clave: string; respuesta: ResultadoDashboard };
type Aviso = { texto: string; variante: "success" | "error"; n: number };

function filtrosDe(qs: string): FiltrosDashboard {
  return filtrosDesdeParams(Object.fromEntries(new URLSearchParams(qs)));
}

function Dashboard() {
  const router = useRouter();
  const qs = useSearchParams().toString();
  const filtros = useMemo(() => filtrosDe(qs), [qs]);

  const [mostrarRango, setMostrarRango] = useState(filtros.periodo === "rango");
  const [rangoEntrada, setRangoEntrada] = useState(() => rangoDelPeriodo(filtros));
  const [erroresRango, setErroresRango] = useState<ErroresRango>({});
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [reintento, setReintento] = useState(0);
  const [verTodosEn, setVerTodosEn] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [cerrandoSesion, cerrarSesion] = useTransition();

  const clave = `${qs}#${reintento}`;
  const cargando = resultado?.clave !== clave;
  const respuesta = cargando ? null : resultado.respuesta;
  const dashboard = respuesta?.dashboard;
  const verTodos = verTodosEn === clave;

  useEffect(() => {
    let activo = true;
    consultarDashboard(filtrosDe(qs)).then((respuesta) => {
      if (activo) setResultado({ clave: `${qs}#${reintento}`, respuesta });
    });
    return () => {
      activo = false;
    };
  }, [qs, reintento]);

  function navegar(siguiente: FiltrosDashboard) {
    router.replace(`/dashboard?${filtrosAQuery(siguiente)}`, { scroll: false });
  }

  function cambiarPeriodo(valor: string) {
    const periodo = valor as Periodo;
    setErroresRango({});
    if (periodo === "rango") {
      setRangoEntrada(rangoDelPeriodo(filtros));
      setMostrarRango(true);
      return;
    }
    setMostrarRango(false);
    navegar({ ...filtros, periodo, desde: "", hasta: "" });
  }

  function aplicarRango(e: FormEvent) {
    e.preventDefault();
    const errores = validarRango(rangoEntrada.desde, rangoEntrada.hasta);
    setErroresRango(errores);
    if (Object.keys(errores).length) return;
    navegar({ ...filtros, periodo: "rango", ...rangoEntrada });
  }

  function exportar(datos: DashboardRespuesta) {
    try {
      const csv = generarCsv(datos.sucursales, datos);
      // BOM para que Excel respete las tildes.
      const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = nombreArchivoCsv(datos);
      document.body.append(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
      setAviso((a) => ({
        texto: "Descargaste las ventas por sucursal en CSV.",
        variante: "success",
        n: (a?.n ?? 0) + 1,
      }));
    } catch (error) {
      console.error("Error al exportar CSV:", error);
      setAviso((a) => ({
        texto: "No pudimos generar el archivo CSV.",
        variante: "error",
        n: (a?.n ?? 0) + 1,
      }));
    }
  }

  function salir() {
    cerrarSesion(async () => {
      await logout();
      router.replace("/login");
    });
  }

  const rango = rangoDelPeriodo(filtros);
  const textoRango =
    rango.desde === rango.hasta
      ? formatoFecha(rango.desde)
      : `Del ${formatoFecha(rango.desde)} al ${formatoFecha(rango.hasta)}`;

  return (
    <div className="mx-auto max-w-7xl">
      {cerrandoSesion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101012]/80 backdrop-blur-sm">
          <PageLoading mensaje="Cerrando sesión..." pantallaCompleta={false} />
        </div>
      )}

      {/* Encabezado */}
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-zinc-700 pb-4">
        <p className="text-2xl text-[#FF7A1A] sm:text-3xl">Los Burle</p>
        <div className="ml-auto flex items-center gap-3">
          <Dropdown
            id="sucursal"
            className="max-sm:min-w-28"
            label="Sucursal"
            labelClassName="sr-only text-sm text-zinc-400 sm:not-sr-only"
            value={filtros.sucursalId}
            placeholder="Todas"
            onChange={(sucursalId) => navegar({ ...filtros, sucursalId })}
            opciones={SUCURSALES.map((s) => ({ value: s.id, label: s.nombre }))}
          />
          <CampanaNotificaciones enLinea />
          <Button
            type="button"
            disabled={cerrandoSesion}
            onClick={salir}
            className="whitespace-nowrap px-4 py-2 text-sm sm:px-5 sm:py-3"
          >
            {cerrandoSesion ? "Cerrando sesión..." : "Cerrar sesión"}
          </Button>
        </div>
      </header>

      {/* Título */}
      <div className="my-8 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <svg
            aria-hidden="true"
            viewBox="0 0 80 80"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="hidden size-16 shrink-0 sm:block"
          >
            <path d="M12 68h56" />
            <path d="M20 60V40M34 60V24M48 60V34M62 60V16" />
          </svg>
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl">Dashboard de ventas</h1>
            <p className="mt-2 text-sm text-zinc-400 sm:text-base">{textoRango}</p>
          </div>
        </div>
        <Button
          type="button"
          disabled={!dashboard}
          onClick={() => dashboard && exportar(dashboard)}
          className="whitespace-nowrap text-sm"
        >
          Exportar
        </Button>
      </div>

      {/* Filtros */}
      <form
        onSubmit={aplicarRango}
        noValidate
        aria-label="Filtros del dashboard"
        className="rounded-2xl bg-[#2b2b2f] p-4 sm:p-6"
      >
        <div className="flex flex-wrap items-start gap-5 lg:gap-6">
          <div>
            <span aria-hidden="true" className="mb-1 block text-sm font-medium text-orange-200">
              Periodo
            </span>
            <Dropdown
              id="periodo"
              label="Periodo"
              labelClassName="sr-only"
              value={mostrarRango ? "rango" : filtros.periodo}
              onChange={cambiarPeriodo}
              opciones={PERIODOS}
            />
          </div>

          {mostrarRango && (
            <div className="flex flex-wrap items-start gap-4 border-t border-zinc-700 pt-4 max-lg:w-full lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <div className="min-w-40">
                <label htmlFor="desde" className="mb-1 block text-sm font-medium text-orange-200">
                  Desde
                </label>
                <Input
                  id="desde"
                  type="date"
                  value={rangoEntrada.desde}
                  onChange={(e) => setRangoEntrada((r) => ({ ...r, desde: e.target.value }))}
                  aria-invalid={Boolean(erroresRango.desde)}
                  aria-describedby={erroresRango.desde ? "desde-error" : undefined}
                  className="py-2.5"
                />
                {erroresRango.desde && (
                  <p id="desde-error" className="mt-1 max-w-64 text-sm text-red-300">
                    {erroresRango.desde}
                  </p>
                )}
              </div>
              <div className="min-w-40">
                <label htmlFor="hasta" className="mb-1 block text-sm font-medium text-orange-200">
                  Hasta
                </label>
                <Input
                  id="hasta"
                  type="date"
                  value={rangoEntrada.hasta}
                  onChange={(e) => setRangoEntrada((r) => ({ ...r, hasta: e.target.value }))}
                  aria-invalid={Boolean(erroresRango.hasta)}
                  aria-describedby={erroresRango.hasta ? "hasta-error" : undefined}
                  className="py-2.5"
                />
                {erroresRango.hasta && (
                  <p id="hasta-error" className="mt-1 max-w-64 text-sm text-red-300">
                    {erroresRango.hasta}
                  </p>
                )}
              </div>
              <Button type="submit" className="mt-6 whitespace-nowrap px-5 py-2.5 text-sm">
                Aplicar
              </Button>
            </div>
          )}
        </div>
      </form>

      {/* Resultados */}
      <section aria-busy={cargando} aria-label="Indicadores de ventas" className="mt-10">
        {cargando && <DashboardSkeleton />}

        {respuesta?.error && respuesta.motivo === "sin-acceso" && (
          <EmptyState mensaje={respuesta.error} variante="error" />
        )}

        {respuesta?.error && respuesta.motivo === "sin-sesion" && (
          <EmptyState mensaje={respuesta.error} variante="error">
            <Button onClick={salir}>Iniciar sesión</Button>
          </EmptyState>
        )}

        {respuesta?.error && respuesta.motivo === "error" && (
          <EmptyState mensaje={respuesta.error} variante="error">
            <Button onClick={() => setReintento((n) => n + 1)}>Reintentar</Button>
          </EmptyState>
        )}

        {dashboard && (
          <Contenido
            dashboard={dashboard}
            dia={filtros.dia}
            onCambiarDia={(dia) => navegar({ ...filtros, dia })}
            verTodos={verTodos}
            onVerTodos={(v) => setVerTodosEn(v ? clave : null)}
          />
        )}
      </section>

      {aviso && (
        <Toast key={aviso.n} variant={aviso.variante}>
          {aviso.texto}
        </Toast>
      )}
    </div>
  );
}

function Indicador({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-[#2b2b2f] p-5 sm:p-6">
      <p className="text-sm font-medium text-orange-200">{titulo}</p>
      <p className="mt-2 text-3xl tabular-nums text-zinc-100 sm:text-4xl">{valor}</p>
    </div>
  );
}

function TituloSeccion({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-2xl text-[#FF7A1A] sm:text-3xl">
      {children}
    </h2>
  );
}

const th = "py-3 pr-4 font-normal";
const thNum = "py-3 pl-4 text-right font-normal";
const td = "py-3 pr-4";
const tdNum = "py-3 pl-4 text-right tabular-nums";

function Contenido({
  dashboard,
  dia,
  onCambiarDia,
  verTodos,
  onVerTodos,
}: {
  dashboard: DashboardRespuesta;
  dia: string;
  onCambiarDia: (dia: string) => void;
  verTodos: boolean;
  onVerTodos: (v: boolean) => void;
}) {
  const total = resumenGeneral(dashboard.sucursales);
  const sucursales = [...dashboard.sucursales].sort((a, b) => b.ventas - a.ventas);
  const platillos = ordenarPlatillos(dashboard.platillos);
  const visibles = verTodos ? platillos : platillos.slice(0, LIMITE_PLATILLOS);

  return (
    <div className="space-y-10">
      {/* Indicadores generales (criterio 1) */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Indicador titulo="Ventas totales" valor={formatoMoneda(total.ventas)} />
        <Indicador titulo="Pedidos" valor={formatoEntero(total.pedidos)} />
        <Indicador titulo="Ticket promedio" valor={formatoMoneda(total.ticket)} />
      </div>

      {total.pedidos === 0 ? (
        <EmptyState mensaje="Sin ventas en el periodo seleccionado" />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            {/* Ventas por sucursal */}
            <section
              aria-labelledby="titulo-sucursales"
              className="rounded-2xl bg-[#2b2b2f] p-4 sm:p-6"
            >
              <TituloSeccion id="titulo-sucursales">Ventas por sucursal</TituloSeccion>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-zinc-700 text-sm text-zinc-400">
                    <tr>
                      <th scope="col" className={th}>Sucursal</th>
                      <th scope="col" className={thNum}>Ventas</th>
                      <th scope="col" className={thNum}>Pedidos</th>
                      <th scope="col" className={thNum}>Ticket promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sucursales.map((s) => (
                      <tr key={s.sucursalId} className="border-b border-zinc-800">
                        <th scope="row" className={`${td} font-normal`}>{s.nombre}</th>
                        <td className={tdNum}>{formatoMoneda(s.ventas)}</td>
                        <td className={tdNum}>{formatoEntero(s.pedidos)}</td>
                        <td className={tdNum}>
                          {formatoMoneda(ticketPromedio(s.ventas, s.pedidos))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {sucursales.length > 1 && (
                    <tfoot className="text-orange-200">
                      <tr>
                        <th scope="row" className={`${td} font-normal`}>Total</th>
                        <td className={tdNum}>{formatoMoneda(total.ventas)}</td>
                        <td className={tdNum}>{formatoEntero(total.pedidos)}</td>
                        <td className={tdNum}>{formatoMoneda(total.ticket)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </section>

            {/* Platillos más vendidos (criterios 8 y 9) */}
            <section
              aria-labelledby="titulo-platillos"
              className="rounded-2xl bg-[#2b2b2f] p-4 sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <TituloSeccion id="titulo-platillos">Platillos más vendidos</TituloSeccion>
                {platillos.length > LIMITE_PLATILLOS && (
                  <button
                    type="button"
                    onClick={() => onVerTodos(!verTodos)}
                    aria-expanded={verTodos}
                    className={botonSecundario}
                  >
                    {verTodos ? "Ver solo los 10 primeros" : `Ver todos (${platillos.length})`}
                  </button>
                )}
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-zinc-700 text-sm text-zinc-400">
                    <tr>
                      <th scope="col" className="w-10 py-3 pr-2 font-normal">#</th>
                      <th scope="col" className={th}>Platillo</th>
                      <th scope="col" className={thNum}>Cantidad</th>
                      <th scope="col" className={thNum}>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.map((p, i) => (
                      <tr key={p.platilloId} className="border-b border-zinc-800">
                        <td className="py-3 pr-2 tabular-nums text-zinc-400">{i + 1}</td>
                        <th scope="row" className={`${td} font-normal`}>{p.nombre}</th>
                        <td className={tdNum}>{formatoEntero(p.cantidad)}</td>
                        <td className={tdNum}>{formatoMoneda(p.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Horarios pico (criterios 10, 11 y 12) */}
          <section aria-labelledby="titulo-horarios">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#FF7A1A]/30 pb-3">
              <div>
                <TituloSeccion id="titulo-horarios">Horarios pico</TituloSeccion>
                <p className="mt-1 text-sm text-zinc-400">
                  Ventas por franja de 1 hora. Las 3 franjas con más ventas aparecen numeradas.
                </p>
              </div>
              <Dropdown
                id="dia"
                label="Día"
                labelClassName="text-sm text-zinc-400"
                value={dia}
                placeholder="Todos los días"
                onChange={onCambiarDia}
                opciones={DIAS_SEMANA}
              />
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {dashboard.horariosPico.map((s) => (
                <GraficoFranjas key={s.sucursalId} sucursal={s} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export function DashboardView() {
  return (
    <main
      className={`${fraunces.className} min-h-dvh bg-[#101012] px-4 pb-16 pt-6 text-zinc-100 scheme-dark sm:px-8 lg:px-15`}
    >
      <Suspense fallback={<PageLoading mensaje="Cargando dashboard..." />}>
        <Dashboard />
      </Suspense>
    </main>
  );
}
