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
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { logout } from "@/app/actions/auth";
import {
  consultarDashboard,
  consultarVentas,
  type ResultadoDashboard,
  type ResultadoVentas,
} from "@/app/actions/dashboard";
import { CampanaNotificaciones } from "@/components/notificaciones/campana-notificaciones";
import { Button } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/ui/dashboard/dashboard-skeleton";
import { GraficoFranjas } from "@/components/ui/dashboard/grafico-franjas";
import { GraficoPlatillos } from "@/components/ui/dashboard/grafico-platillos";
import { TablaVentas } from "@/components/ui/dashboard/tabla-ventas";
import { Dropdown } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageLoading } from "@/components/ui/page-loading";
import { Toast } from "@/components/ui/toast";
import {
  DIAS_SEMANA,
  FILTROS_INICIALES,
  PERIODOS,
  filtrosAQuery,
  filtrosDesdeParams,
  formatoEntero,
  formatoFechaCorta,
  formatoMoneda,
  nombreArchivoCsv,
  ordenarPlatillos,
  rangoDelPeriodo,
  resumenGeneral,
  validarRango,
  type DashboardRespuesta,
  type ErroresRango,
  type FiltrosDashboard,
  type Periodo,
} from "@/lib/dashboard";
import { SUCURSALES } from "@/lib/sucursales";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: "600",
  display: "swap",
});

const LIMITE_PLATILLOS = 10;

const chip =
  "cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-orange-400";
const chipInactivo = `${chip} border-transparent bg-[#101012] text-zinc-200 hover:border-zinc-600`;
const chipActivo = `${chip} border-[#FF7A1A] bg-[#FF7A1A]/15 text-orange-100`;

const botonSecundario =
  "cursor-pointer rounded-full border border-[#FF7A1A]/50 bg-[#FF7A1A]/10 px-4 py-2 text-sm text-orange-200 transition-colors hover:bg-[#FF7A1A]/20 focus-visible:outline-2 focus-visible:outline-orange-400";

type Resultado = { clave: string; respuesta: ResultadoDashboard };
type ResultadoLista = { clave: string; respuesta: ResultadoVentas };
type Aviso = { texto: string; variante: "success" | "error"; n: number };

function filtrosDe(qs: string): FiltrosDashboard {
  return filtrosDesdeParams(Object.fromEntries(new URLSearchParams(qs)));
}

function IconoBarras({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-10 w-12 shrink-0 sm:h-12 sm:w-14 ${className}`}
    >
      <path d="M4 4v32h40" />
      <rect x="11" y="20" width="6" height="12" rx="1" />
      <rect x="21" y="12" width="6" height="20" rx="1" />
      <rect x="31" y="22" width="6" height="10" rx="1" />
    </svg>
  );
}

function Dashboard() {
  const router = useRouter();
  const qs = useSearchParams().toString();
  const filtros = useMemo(() => filtrosDe(qs), [qs]);

  const [mostrarRango, setMostrarRango] = useState(filtros.periodo === "rango");
  const [rangoEntrada, setRangoEntrada] = useState(() => rangoDelPeriodo(filtros));
  const [erroresRango, setErroresRango] = useState<ErroresRango>({});
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [lista, setLista] = useState<ResultadoLista | null>(null);
  const [reintento, setReintento] = useState(0);
  const [paginaEn, setPaginaEn] = useState<{ qs: string; pagina: number } | null>(null);
  const [verTodosEn, setVerTodosEn] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [exportando, setExportando] = useState(false);
  const [cerrandoSesion, cerrarSesion] = useTransition();

  const pagina = paginaEn?.qs === qs ? paginaEn.pagina : 1;
  const clave = `${qs}#${reintento}`;
  const claveLista = `${clave}#${pagina}`;
  const cargando = resultado?.clave !== clave;
  const respuesta = cargando ? null : resultado.respuesta;
  const dashboard = respuesta?.dashboard;
  const cargandoLista = lista?.clave !== claveLista;
  const respuestaLista = cargandoLista ? null : lista.respuesta;

  useEffect(() => {
    let activo = true;
    consultarDashboard(filtrosDe(qs)).then((respuesta) => {
      if (activo) setResultado({ clave: `${qs}#${reintento}`, respuesta });
    });
    return () => {
      activo = false;
    };
  }, [qs, reintento]);

  useEffect(() => {
    let activo = true;
    consultarVentas(filtrosDe(qs), pagina).then((respuesta) => {
      if (activo) setLista({ clave: `${qs}#${reintento}#${pagina}`, respuesta });
    });
    return () => {
      activo = false;
    };
  }, [qs, reintento, pagina]);

  function navegar(siguiente: FiltrosDashboard) {
    router.replace(`/dashboard?${filtrosAQuery(siguiente)}`, { scroll: false });
  }

  function elegirPeriodo(periodo: Periodo) {
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
    setMostrarRango(false);
    navegar({ ...filtros, periodo: "rango", ...rangoEntrada });
  }

  function limpiarFiltros() {
    setMostrarRango(false);
    setErroresRango({});
    navegar(FILTROS_INICIALES);
  }

  function avisar(texto: string, variante: Aviso["variante"]) {
    setAviso((a) => ({ texto, variante, n: (a?.n ?? 0) + 1 }));
  }

  // Criterio 14: descarga cada venta confirmada del periodo y sucursal elegidos.
  async function exportar() {
    setExportando(true);
    try {
      const res = await fetch(`/dashboard/exportar?${filtrosAQuery(filtros)}`, {
        cache: "no-store",
      });
      const tipo = res.headers.get("Content-Type") ?? "";
      if (!res.ok || !tipo.includes("text/csv")) {
        const data = tipo.includes("json") ? await res.json().catch(() => null) : null;
        throw new Error(data?.error ?? "No pudimos generar el archivo CSV.");
      }
      const blob = await res.blob();
      const nombre =
        /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ??
        nombreArchivoCsv(rangoDelPeriodo(filtros));
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = nombre;
      document.body.append(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
      avisar("Descargaste las ventas confirmadas en CSV.", "success");
    } catch (error) {
      console.error("Error al exportar CSV:", error);
      avisar(
        error instanceof Error ? error.message : "No pudimos generar el archivo CSV.",
        "error",
      );
    } finally {
      setExportando(false);
    }
  }

  function salir() {
    cerrarSesion(async () => {
      await logout();
      router.replace("/login");
    });
  }

  const rango = rangoDelPeriodo(filtros);
  const periodoActivo: Periodo = mostrarRango ? "rango" : filtros.periodo;
  const hayVentas = Boolean(dashboard && resumenGeneral(dashboard.sucursales).pedidos > 0);

  return (
    <div className="mx-auto max-w-7xl">
      {cerrandoSesion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101012]/80 backdrop-blur-sm">
          <PageLoading mensaje="Cerrando sesión..." pantallaCompleta={false} />
        </div>
      )}

      {/* Encabezado con navegación */}
      <header className="flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-zinc-700">
        <p className="py-4 text-2xl text-[#FF7A1A] sm:text-3xl">Los Burle</p>
        <nav aria-label="Principal" className="flex self-stretch font-sans text-sm sm:text-base">
          <Link
            href="/menu"
            className="flex items-center border-b-2 border-transparent px-4 text-zinc-400 transition-colors hover:text-zinc-100"
          >
            Menú
          </Link>
          <Link
            href="/dashboard"
            aria-current="page"
            className="flex items-center border-b-2 border-[#FF7A1A] px-4 font-semibold text-zinc-100"
          >
            Dashboard
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3 py-3">
          <CampanaNotificaciones enLinea />
          <Button
            type="button"
            disabled={cerrandoSesion}
            onClick={salir}
            className="whitespace-nowrap px-4 py-2 text-sm"
          >
            {cerrandoSesion ? "Cerrando sesión..." : "Cerrar sesión"}
          </Button>
        </div>
      </header>

      {/* Vista general / comparativa */}
      <div className="mt-6 flex items-center gap-3 font-sans text-sm">
        <span className="text-zinc-400">Vista</span>
        <div role="group" aria-label="Vista" className="flex rounded-xl bg-[#2b2b2f] p-1">
          <button
            type="button"
            aria-pressed="true"
            className="rounded-lg bg-[#FF7A1A] px-4 py-1.5 font-semibold text-[#101012]"
          >
            General
          </button>
          <button
            type="button"
            disabled
            title="Disponible con la H29"
            className="cursor-not-allowed rounded-lg px-4 py-1.5 text-zinc-500"
          >
            Comparativo
          </button>
        </div>
      </div>

      {/* Título */}
      <div className="my-8 flex items-center justify-center gap-4 sm:gap-8">
        <IconoBarras className="hidden sm:block" />
        <h1 className="text-4xl sm:text-5xl lg:text-6xl">Dashboard</h1>
        <IconoBarras className="hidden sm:block" />
      </div>

      {/* Filtros */}
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
                onClick={() => elegirPeriodo(p.value)}
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
            onClick={() => (mostrarRango ? setMostrarRango(false) : elegirPeriodo("rango"))}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-700 bg-[#262626] px-4 py-2 text-sm tabular-nums text-zinc-100 focus-visible:outline-2 focus-visible:outline-orange-400"
          >
            <span className="sr-only">Rango de fechas: </span>
            {formatoFechaCorta(rango.desde)} – {formatoFechaCorta(rango.hasta)}
            <span aria-hidden="true">▾</span>
          </button>

          <Dropdown
            id="sucursal"
            className="min-w-36 py-2 text-sm"
            label="Sucursal"
            labelClassName="ml-1 text-sm text-zinc-400"
            value={filtros.sucursalId}
            placeholder="Todas"
            onChange={(sucursalId) => navegar({ ...filtros, sucursalId })}
            opciones={SUCURSALES.map((s) => ({ value: s.id, label: s.nombre }))}
          />

          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <button
              type="button"
              onClick={limpiarFiltros}
              className={`${chipInactivo} whitespace-nowrap`}
            >
              Limpiar filtros
            </button>
            <Button
              type="button"
              disabled={!hayVentas || exportando}
              onClick={exportar}
              className="whitespace-nowrap px-5 py-2 text-sm"
            >
              <span aria-hidden="true">⬇ </span>
              {exportando ? "Exportando..." : "Exportar CSV"}
            </Button>
          </div>
        </div>

        {mostrarRango && (
          <form
            id="panel-rango"
            onSubmit={aplicarRango}
            noValidate
            aria-label="Rango personalizado"
            className="mt-4 flex flex-wrap items-start gap-4 border-t border-zinc-700 pt-4"
          >
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
                className="py-2"
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
                className="py-2"
              />
              {erroresRango.hasta && (
                <p id="hasta-error" className="mt-1 max-w-64 text-sm text-red-300">
                  {erroresRango.hasta}
                </p>
              )}
            </div>
            <div className="mt-6 flex gap-2">
              <Button type="submit" className="px-5 py-2 text-sm">
                Aplicar
              </Button>
              <button
                type="button"
                onClick={() => {
                  setMostrarRango(false);
                  setErroresRango({});
                }}
                className={chipInactivo}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Resultados */}
      <section aria-busy={cargando} aria-label="Indicadores de ventas" className="mt-8">
        {cargando && <DashboardSkeleton />}

        {respuesta?.error && respuesta.motivo === "sin-acceso" && (
          <EmptyState mensaje={respuesta.error} variante="error" />
        )}

        {respuesta?.error && respuesta.motivo === "sin-sesion" && (
          <EmptyState mensaje={respuesta.error} variante="error">
            <Button onClick={salir}>Iniciar sesión</Button>
          </EmptyState>
        )}

        {respuesta?.error && respuesta.motivo === "rango-invalido" && (
          <EmptyState mensaje={respuesta.error} variante="error" />
        )}

        {respuesta?.error && respuesta.motivo === "error" && (
          <EmptyState mensaje={respuesta.error} variante="error">
            <Button onClick={() => setReintento((n) => n + 1)}>Reintentar</Button>
          </EmptyState>
        )}

        {dashboard && (
          <Contenido
            dashboard={dashboard}
            lista={
              <SeccionVentas
                respuesta={respuestaLista}
                cargando={cargandoLista}
                mostrarSucursal={!filtros.sucursalId}
                onPagina={(p) => setPaginaEn({ qs, pagina: p })}
                onReintentar={() => setReintento((n) => n + 1)}
              />
            }
            dia={filtros.dia}
            onCambiarDia={(dia) => navegar({ ...filtros, dia })}
            verTodos={verTodosEn === clave}
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

function Indicador({
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

function EncabezadoSeccion({
  id,
  titulo,
  detalle,
  children,
}: {
  id: string;
  titulo: string;
  detalle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 id={id} className="text-2xl text-zinc-100 sm:text-3xl">
          {titulo}
        </h2>
        {detalle && <p className="font-sans text-sm text-zinc-400">{detalle}</p>}
      </div>
      {children}
    </div>
  );
}

function SeccionVentas({
  respuesta,
  cargando,
  mostrarSucursal,
  onPagina,
  onReintentar,
}: {
  respuesta: ResultadoVentas | null;
  cargando: boolean;
  mostrarSucursal: boolean;
  onPagina: (pagina: number) => void;
  onReintentar: () => void;
}) {
  return (
    <section aria-labelledby="titulo-ventas">
      <EncabezadoSeccion
        id="titulo-ventas"
        titulo="Ventas confirmadas"
        detalle="Cada pedido con pago confirmado y sin reembolso · subtotal menos descuentos, sin IVA ni propina"
      />
      <div className="rounded-2xl bg-[#2b2b2f] p-4 font-sans sm:p-6">
        {respuesta?.error ? (
          <EmptyState mensaje="No pudimos cargar las ventas" variante="error">
            <Button onClick={onReintentar}>Reintentar</Button>
          </EmptyState>
        ) : (
          <TablaVentas
            ventas={respuesta?.ventas ?? null}
            cargando={cargando}
            mostrarSucursal={mostrarSucursal}
            onPagina={onPagina}
          />
        )}
      </div>
    </section>
  );
}

const th = "py-3 pr-4 font-normal";
const thNum = "py-3 pl-4 text-right font-normal";
const td = "py-3 pr-4";
const tdNum = "py-3 pl-4 text-right tabular-nums";

function Contenido({
  dashboard,
  lista,
  dia,
  onCambiarDia,
  verTodos,
  onVerTodos,
}: {
  dashboard: DashboardRespuesta;
  lista: ReactNode;
  dia: string;
  onCambiarDia: (dia: string) => void;
  verTodos: boolean;
  onVerTodos: (v: boolean) => void;
}) {
  const total = resumenGeneral(dashboard.sucursales);
  const platillos = ordenarPlatillos(dashboard.platillos);
  const visibles = verTodos ? platillos : platillos.slice(0, LIMITE_PLATILLOS);

  return (
    <div className="space-y-12">
      {/* Indicadores generales (criterio 1) */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Indicador
          titulo="Ventas totales"
          valor={formatoMoneda(total.ventas)}
          detalle="Sin IVA ni propina"
        />
        <Indicador
          titulo="Pedidos"
          valor={formatoEntero(total.pedidos)}
          detalle="Con pago confirmado"
        />
        <Indicador
          titulo="Ticket promedio"
          valor={formatoMoneda(total.ticket)}
          detalle="Ventas ÷ pedidos"
        />
      </div>

      {total.pedidos === 0 ? (
        <EmptyState mensaje="Sin ventas en el periodo seleccionado" />
      ) : (
        <>
          {lista}

          {/* Platillos más vendidos (criterios 8 y 9) */}
          <section aria-labelledby="titulo-platillos">
            <EncabezadoSeccion
              id="titulo-platillos"
              titulo="Platillos más vendidos"
              detalle={`${verTodos ? "Todos" : "Top 10"} · ordenado por cantidad; si empatan, primero el de mayor monto`}
            >
              {platillos.length > LIMITE_PLATILLOS && (
                <button
                  type="button"
                  onClick={() => onVerTodos(!verTodos)}
                  aria-expanded={verTodos}
                  className={`${botonSecundario} font-sans`}
                >
                  {verTodos ? "Ver solo los 10 primeros" : `Ver todos (${platillos.length})`}
                </button>
              )}
            </EncabezadoSeccion>
            <div className="grid gap-6 font-sans lg:grid-cols-2 lg:items-start">
              <div className="rounded-2xl bg-[#2b2b2f] p-4 sm:p-6">
                <GraficoPlatillos platillos={visibles} />
              </div>
              <div className="overflow-x-auto rounded-2xl bg-[#2b2b2f] p-4 sm:p-6">
                <table className="w-full text-left" aria-labelledby="titulo-platillos">
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
            </div>
          </section>

          {/* Horarios pico (criterios 10, 11 y 12) */}
          <section aria-labelledby="titulo-horarios">
            <EncabezadoSeccion
              id="titulo-horarios"
              titulo="Horarios pico"
              detalle="Ventas por franja de 1 hora · se marcan las 3 franjas con más ventas"
            >
              <div className="font-sans">
                <Dropdown
                  id="dia"
                  label="Día de la semana"
                  labelClassName="text-sm text-zinc-400"
                  className="py-2 text-sm"
                  value={dia}
                  placeholder="Todos"
                  onChange={onCambiarDia}
                  opciones={DIAS_SEMANA}
                />
              </div>
            </EncabezadoSeccion>
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
      className={`${fraunces.className} min-h-dvh bg-[#101012] px-4 pb-16 pt-2 text-zinc-100 scheme-dark sm:px-8 lg:px-15`}
    >
      <Suspense fallback={<PageLoading mensaje="Cargando dashboard..." />}>
        <Dashboard />
      </Suspense>
    </main>
  );
}
