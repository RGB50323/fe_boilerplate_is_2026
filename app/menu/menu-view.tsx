"use client";

import { Suspense, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { Fraunces } from "next/font/google";
import { useRouter, useSearchParams } from "next/navigation";
import { consultarMenu } from "@/app/actions/menu";
import { CampanaNotificaciones } from "@/components/notificaciones/campana-notificaciones";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoading } from "@/components/ui/page-loading";
import { SearchBar } from "@/components/ui/search-bar";
import { CardPlatillo } from "@/components/menu/card-platillo";
import { PlatillosSkeleton } from "@/components/menu/platillos-skeleton";
import { RangoPrecio } from "@/components/menu/rango-precio";
import {
  FILTROS_VACIOS,
  filtrosAQuery,
  filtrosDesdeParams,
  formatoPrecio,
  validarFiltros,
  type FiltrosMenu,
  type MenuRespuesta,
} from "@/lib/menu";
import { SUCURSALES } from "@/lib/sucursales";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: "600",
  display: "swap",
});

function sucursalDe(qs: string): number {
  const id = Number(new URLSearchParams(qs).get("sucursal"));
  return SUCURSALES.some((s) => s.id === id) ? id : SUCURSALES[0].id;
}

type Resultado = { clave: string; menu?: MenuRespuesta };

function Menu({
  autenticado,
  esGerente,
  esMesero,
}: {
  autenticado: boolean;
  esGerente: boolean;
  esMesero: boolean;
}) {
  const router = useRouter();
  const qs = useSearchParams().toString();
  const sucursalId = sucursalDe(qs);
  const filtros = useMemo(
    () => filtrosDesdeParams(Object.fromEntries(new URLSearchParams(qs))),
    [qs],
  );

  const [entrada, setEntrada] = useState<FiltrosMenu>(filtros);
  const [categorias, setCategorias] = useState<
    { id: number; nombre: string }[]
  >([]);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [reintento, setReintento] = useState(0);
  const [cerrandoSesion, cerrarSesion] = useTransition();

  const errores = validarFiltros(entrada);
  const clave = `${qs}#${reintento}`;
  const cargando = resultado?.clave !== clave;
  const listo = cargando ? null : resultado;

  useEffect(() => {
    if (Object.keys(validarFiltros(entrada)).length) return;
    const siguiente = filtrosAQuery(entrada, sucursalId);
    if (siguiente === qs) return;
    const escribiendo =
      entrada.q !== filtros.q ||
      entrada.precioMin !== filtros.precioMin ||
      entrada.precioMax !== filtros.precioMax;
    const t = setTimeout(
      () => router.replace(`/menu?${siguiente}`, { scroll: false }),
      escribiendo ? 300 : 0,
    );
    return () => clearTimeout(t);
  }, [entrada, filtros, qs, sucursalId, router]);

  useEffect(() => {
    let activo = true;
    consultarMenu(
      sucursalDe(qs),
      filtrosDesdeParams(Object.fromEntries(new URLSearchParams(qs))),
    ).then((r) => {
      if (activo) setResultado({ clave: `${qs}#${reintento}`, menu: r.menu });
    });
    return () => {
      activo = false;
    };
  }, [qs, reintento]);

  useEffect(() => {
    let activo = true;
    consultarMenu(sucursalId, FILTROS_VACIOS).then((r) => {
      if (activo && r.menu) {
        setCategorias(
          r.menu.categorias.map(({ id, nombre }) => ({ id, nombre })),
        );
      }
    });
    return () => {
      activo = false;
    };
  }, [sucursalId]);

  function cambiarSucursal(id: string) {
    router.replace(`/menu?${filtrosAQuery(filtros, Number(id))}`, {
      scroll: false,
    });
  }

  const chips: { campo: keyof FiltrosMenu; texto: string }[] = [];
  if (filtros.q.trim()) {
    chips.push({ campo: "q", texto: `Búsqueda: “${filtros.q.trim()}”` });
  }
  if (filtros.categoriaId) {
    const nombre = categorias.find(
      (c) => String(c.id) === filtros.categoriaId,
    )?.nombre;
    chips.push({
      campo: "categoriaId",
      texto: `Sección: ${nombre ?? filtros.categoriaId}`,
    });
  }
  if (filtros.precioMin.trim()) {
    chips.push({
      campo: "precioMin",
      texto: `Precio mínimo: ${formatoPrecio(Number(filtros.precioMin))}`,
    });
  }
  if (filtros.precioMax.trim()) {
    chips.push({
      campo: "precioMax",
      texto: `Precio máximo: ${formatoPrecio(Number(filtros.precioMax))}`,
    });
  }

  const burger = (
    <svg
      aria-hidden="true"
      viewBox="0 0 80 80"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="hidden size-16 shrink-0 md:block"
    >
      <path d="M12 38c0-12 12-20 28-20s28 8 28 20Z" />
      <path d="M10 48h60M14 56c6 4 10-4 16 0s10-4 16 0 10-4 16 0" />
      <path d="M12 64h56v2a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6Z" />
    </svg>
  );

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
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Dropdown
            id="sucursal"
            className="max-sm:min-w-28"
            label="Sucursal"
            labelClassName="sr-only text-sm text-zinc-400 sm:not-sr-only"
            value={sucursalId}
            onChange={cambiarSucursal}
            opciones={SUCURSALES.map((s) => ({
              value: s.id,
              label: s.nombre,
            }))}
          />
          {autenticado && <CampanaNotificaciones enLinea />}
          {esGerente && (
            <Link
              href="/admin/platillos"
              className="whitespace-nowrap rounded-full bg-[#FF7A1A] px-4 py-2 text-sm font-semibold text-[#101012] transition-colors hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400 sm:px-5 sm:py-3"
            >
              Gestionar platillos
            </Link>
          )}
          {esMesero && (
            <Link
              href="/mesero/pedidos"
              className="whitespace-nowrap rounded-full bg-[#FF7A1A] px-4 py-2 text-sm font-semibold text-[#101012] transition-colors hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400 sm:px-5 sm:py-3"
            >
              Registrar pedido
            </Link>
          )}
          {autenticado ? (
            <Button
              type="button"
              disabled={cerrandoSesion}
              onClick={() =>
                cerrarSesion(async () => {
                  await logout();
                })
              }
              className="whitespace-nowrap px-4 py-2 text-sm sm:px-5 sm:py-3"
            >
              {cerrandoSesion ? "Cerrando sesión..." : "Cerrar sesión"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => router.push("/login")}
              className="whitespace-nowrap px-4 py-2 text-sm sm:px-5 sm:py-3"
            >
              Iniciar sesión
            </Button>
          )}
        </div>
      </header>

      <div className="my-8 flex items-center justify-between gap-3">
        {/* Título */}
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="hidden sm:inline-flex">{burger}</span>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl">Platillos</h1>
        </div>

        {/* Sección (categoría) */}
        <Dropdown
          id="seccion"
          label="Categoría"
          labelClassName="sr-only md:not-sr-only md:text-sm md:text-zinc-400"
          value={entrada.categoriaId}
          onChange={(categoriaId) =>
            setEntrada((prev) => ({ ...prev, categoriaId }))
          }
          placeholder="Todas"
          opciones={categorias.map((categoria) => ({
            value: categoria.id,
            label: categoria.nombre,
          }))}
        />
      </div>

      {/* Búsqueda y filtros */}
      <form
        role="search"
        onSubmit={(e) => e.preventDefault()}
        noValidate
        className="rounded-2xl bg-[#2b2b2f] p-4 sm:p-6"
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:gap-6">
          <div className="min-w-0">
            <span
              aria-hidden="true"
              className="mb-1 block text-sm font-medium text-orange-200"
            >
              Buscar platillo
            </span>

            <SearchBar
              id="q"
              label="Buscar por nombre de platillo"
              value={entrada.q}
              onChange={(e) => setEntrada((p) => ({ ...p, q: e.target.value }))}
              placeholder="Buscar por nombre..."
              className="w-full"
            />
          </div>

          <div className="min-w-0 border-t border-zinc-700 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <RangoPrecio
              min={entrada.precioMin}
              max={entrada.precioMax}
              onChange={(campo, valor) =>
                setEntrada((p) => ({ ...p, [campo]: valor }))
              }
              errorMin={errores.precioMin}
              errorMax={errores.precioMax}
            />
          </div>

          <div className="border-t border-zinc-700 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-6">
            <Button
              type="button"
              onClick={() => setEntrada(FILTROS_VACIOS)}
              className="w-full whitespace-nowrap text-sm lg:w-auto"
            >
              Limpiar filtros
            </Button>
          </div>
        </div>
      </form>

      {/* Filtros activos */}
      {chips.length > 0 && (
        <ul aria-label="Filtros activos" className="mt-4 flex flex-wrap gap-2">
          {chips.map((c) => (
            <li key={c.campo}>
              <button
                type="button"
                onClick={() => setEntrada((p) => ({ ...p, [c.campo]: "" }))}
                aria-label={`Quitar filtro ${c.texto}`}
                className="flex cursor-pointer items-center gap-2 rounded-full border border-[#FF7A1A]/50 bg-[#FF7A1A]/10 px-3 py-1 text-sm text-orange-200 transition-colors hover:bg-[#FF7A1A]/20 focus-visible:outline-2 focus-visible:outline-orange-400"
              >
                {c.texto}
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Resultados */}
      <section aria-busy={cargando} aria-label="Menú" className="mt-10">
        {cargando && <PlatillosSkeleton />}

        {listo && !listo.menu && (
          <EmptyState mensaje="No pudimos cargar el menú" variante="error">
            <Button onClick={() => setReintento((n) => n + 1)}>
              Reintentar
            </Button>
          </EmptyState>
        )}

        {listo?.menu && listo.menu.categorias.length === 0 && (
          <EmptyState mensaje="No hay platillos que coincidan con tu búsqueda" />
        )}

        {listo?.menu?.categorias.map((cat) => (
          <div key={cat.id} className="mb-12">
            <h2 className="mb-6 border-b-2 border-[#FF7A1A]/30 pb-3 text-3xl text-[#FF7A1A]">
              {cat.nombre}
            </h2>
            <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {cat.platillos.map((p) => (
                <li key={p.id}>
                  <CardPlatillo platillo={p} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}

export function MenuView({
  autenticado,
  esGerente = false,
  esMesero = false,
}: {
  autenticado: boolean;
  esGerente?: boolean;
  esMesero?: boolean;
}) {
  return (
    <main
      className={`${fraunces.className} min-h-dvh bg-[#101012] px-4 pb-16 pt-6 text-zinc-100 scheme-dark sm:px-8 lg:px-15`}
    >
      <Suspense fallback={<PageLoading mensaje="Cargando menú..." />}>
        <Menu
          autenticado={autenticado}
          esGerente={esGerente}
          esMesero={esMesero}  
        />
      </Suspense>
    </main>
  );
}
