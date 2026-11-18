"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Fraunces } from "next/font/google";
import { useRouter, useSearchParams } from "next/navigation";
import { logout } from "@/app/actions/auth";
import {
  consultarDashboard,
  consultarVentas,
  type ResultadoDashboard,
  type ResultadoVentas,
} from "@/app/actions/dashboard";
import { Button } from "@/components/ui/button";
import { BarraPeriodo } from "@/components/ui/dashboard/barra-periodo";
import { DashboardSkeleton } from "@/components/ui/dashboard/dashboard-skeleton";
import { EncabezadoDashboard } from "@/components/ui/dashboard/encabezado-dashboard";
import { GraficoFranjas } from "@/components/ui/dashboard/grafico-franjas";
import { GraficoPlatillos } from "@/components/ui/dashboard/grafico-platillos";
import { TablaVentas } from "@/components/ui/dashboard/tabla-ventas";
import { Dropdown } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoading } from "@/components/ui/page-loading";
import { Toast } from "@/components/ui/toast";
import {
  DIAS_SEMANA,
  FILTROS_INICIALES,
  filtrosAQuery,
  periodoAQuery,
  filtrosDesdeParams,
  formatoEntero,
  formatoMoneda,
  nombreArchivoCsv,
  ordenarPlatillos,
  rangoDelPeriodo,
  type DashboardRespuesta,
  type FiltrosDashboard,
} from "@/lib/dashboard";
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
type ResultadoLista = { clave: string; respuesta: ResultadoVentas };
type Aviso = { texto: string; variante: "success" | "error"; n: number };

function filtrosDe(qs: string): FiltrosDashboard {
  return filtrosDesdeParams(Object.fromEntries(new URLSearchParams(qs)));
}

function Dashboard() {
  const router = useRouter();
  const qs = useSearchParams().toString();
  const filtros = useMemo(() => filtrosDe(qs), [qs]);

  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [lista, setLista] = useState<ResultadoLista | null>(null);
  const [reintento, setReintento] = useState(0);
  const [paginaEn, setPaginaEn] = useState<{ qs: string; pagina: number } | null>(null);
  const [verTodosEn, setVerTodosEn] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [exportando, setExportando] = useState(false);

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

  function limpiarFiltros() {
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
      avisar("Descargaste las ventas por sucursal en CSV.", "success");
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

  const hayVentas = Boolean(dashboard && dashboard.totalGeneral.pedidos > 0);

  return (
    <div className="mx-auto max-w-7xl">
      <EncabezadoDashboard
        vista="general"
        titulo="Dashboard"
        consultaPeriodo={periodoAQuery(filtros)}
      />

      <BarraPeriodo
        periodo={filtros}
        onCambiar={(p) => navegar({ ...filtros, ...p })}
        onLimpiar={limpiarFiltros}
        controles={
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
        }
        acciones={
          <Button
            type="button"
            disabled={!hayVentas || exportando}
            onClick={exportar}
            className="whitespace-nowrap px-5 py-2 text-sm"
          >
            <span aria-hidden="true">⬇ </span>
            {exportando ? "Exportando..." : "Exportar CSV"}
          </Button>
        }
      />

      {/* Resultados */}
      <section aria-busy={cargando} aria-label="Indicadores de ventas" className="mt-8">
        {cargando && <DashboardSkeleton />}

        {respuesta?.error && respuesta.motivo === "sin-acceso" && (
          <EmptyState mensaje={respuesta.error} variante="error" />
        )}

        {respuesta?.error && respuesta.motivo === "sin-sesion" && (
          <EmptyState mensaje={respuesta.error} variante="error">
            <Button
              onClick={async () => {
                await logout();
                router.replace("/login");
              }}
            >
              Iniciar sesión
            </Button>
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
  // Totales y tickets vienen calculados del backend (mismo cálculo que H29).
  const total = dashboard.totalGeneral;
  // Mismo orden que el CSV del backend: mayor venta primero; en empate, por nombre.
  const sucursales = [...dashboard.sucursales].sort(
    (a, b) => b.ventas - a.ventas || a.nombre.localeCompare(b.nombre, "es"),
  );
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
          valor={formatoMoneda(total.ticketPromedio)}
          detalle="Ventas ÷ pedidos"
        />
      </div>

      {total.pedidos === 0 ? (
        <EmptyState mensaje="Sin ventas en el periodo seleccionado" />
      ) : (
        <>
          {/* Ventas por sucursal (criterio 1); el CSV exporta esta misma tabla */}
          <section aria-labelledby="titulo-sucursales">
            <EncabezadoSeccion
              id="titulo-sucursales"
              titulo="Ventas por sucursal"
              detalle="Es lo que descarga Exportar CSV"
            />
            <div className="overflow-x-auto rounded-2xl bg-[#2b2b2f] p-4 font-sans sm:p-6">
              <table className="w-full text-left" aria-labelledby="titulo-sucursales">
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
                      <td className={tdNum}>{formatoMoneda(s.ticketPromedio)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#18181b] font-semibold">
                    <th scope="row" className="rounded-l-lg px-3 py-3 font-semibold">Total general</th>
                    <td className={tdNum}>{formatoMoneda(total.ventas)}</td>
                    <td className={tdNum}>{formatoEntero(total.pedidos)}</td>
                    <td className={`${tdNum} rounded-r-lg pr-3`}>{formatoMoneda(total.ticketPromedio)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

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
