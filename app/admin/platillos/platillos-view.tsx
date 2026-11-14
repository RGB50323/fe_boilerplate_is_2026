"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  deshabilitarPlatillo,
  habilitarPlatillo,
  listarPlatillos,
} from "@/app/actions/platillos";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Paginacion } from "@/components/ui/paginacion";
import { Toast } from "@/components/ui/toast";
import type { Pagina } from "@/lib/paginacion";
import type { Platillo } from "@/lib/platillos";
import { TablaPlatillos } from "@/components/platillos/tabla-platillos";
import { DialogoDeshabilitarPlatillo } from "@/components/platillos/dialogo-deshabilitar-platillo";

type Aviso = { id: number; texto: string; variante: "success" | "error" };

const ESPERA_BUSQUEDA_MS = 300;

const BOTON_PRIMARIO =
  "cursor-pointer rounded-full bg-[#FF7A1A] px-5 py-2 text-sm font-semibold text-[#101012] transition-colors hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400";
const BOTON_SECUNDARIO =
  "cursor-pointer rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#101012] transition-colors hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400";

export function PlatillosView({
  sucursalId,
  inicial,
  errorInicial,
  guardado,
}: {
  sucursalId: number;
  inicial: Pagina<Platillo>;
  errorInicial?: string;
  guardado: boolean;
}) {
  const router = useRouter();
  const [lista, setLista] = useState(inicial);
  const [consulta, setConsulta] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(errorInicial);
  const [aviso, setAviso] = useState<Aviso | null>(
    guardado
      ? { id: 0, texto: "Platillo guardado correctamente", variante: "success" }
      : null,
  );
  const [aDeshabilitar, setADeshabilitar] = useState<Platillo | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [habilitando, setHabilitando] = useState<number | null>(null);
  const solicitud = useRef(0);
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    if (guardado) router.replace("/admin/platillos");
  }, [guardado, router]);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  async function cargar(pagina: number, texto: string) {
    const id = ++solicitud.current;
    setCargando(true);
    const resultado = await listarPlatillos(sucursalId, pagina, texto);
    if (id !== solicitud.current) return;
    setCargando(false);
    if (!resultado.ok) {
      if (resultado.sinSesion) router.replace("/login");
      setError(resultado.error);
      return;
    }
    const { totalPaginas } = resultado.datos;
    if (totalPaginas > 0 && pagina > totalPaginas) {
      await cargar(totalPaginas, texto);
      return;
    }
    setLista(resultado.datos);
    setConsulta(texto);
    setError(undefined);
  }

  function buscar(texto: string) {
    setBusqueda(texto);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(
      () => void cargar(1, texto.trim()),
      ESPERA_BUSQUEDA_MS,
    );
  }

  function limpiar() {
    clearTimeout(temporizador.current);
    setBusqueda("");
    void cargar(1, "");
  }

  function actualizarActivo(id: number, activo: boolean) {
    setLista((actual) => ({
      ...actual,
      datos: actual.datos.map((p) => (p.id === id ? { ...p, activo } : p)),
    }));
  }

  async function deshabilitar() {
    if (!aDeshabilitar) return undefined;
    const resultado = await deshabilitarPlatillo(aDeshabilitar.id);
    if (!resultado.ok) {
      if (resultado.sinSesion) router.replace("/login");
      return resultado.error;
    }
    actualizarActivo(aDeshabilitar.id, false);
    setADeshabilitar(null);
    setAviso({
      id: Date.now(),
      texto: "Platillo deshabilitado correctamente",
      variante: "success",
    });
    return undefined;
  }

  async function habilitar(platillo: Platillo) {
    if (habilitando !== null) return;
    setHabilitando(platillo.id);
    const resultado = await habilitarPlatillo(platillo.id);
    setHabilitando(null);
    if (!resultado.ok) {
      if (resultado.sinSesion) router.replace("/login");
      setAviso({ id: Date.now(), texto: resultado.error, variante: "error" });
      return;
    }
    actualizarActivo(platillo.id, true);
    setAviso({
      id: Date.now(),
      texto: "Platillo habilitado correctamente",
      variante: "success",
    });
  }

  return (
    <main className="py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl sm:text-5xl">Administración de platillos</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/categorias" className={BOTON_SECUNDARIO}>
            Gestionar categorías
          </Link>
          <Link href="/admin/platillos/nuevo" className={BOTON_PRIMARIO}>
            Agregar platillo
          </Link>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl bg-[#2b2b2f] p-4">
        <div className="min-w-0 flex-1 sm:max-w-sm">
          <label htmlFor="buscar-platillo" className="sr-only">
            Buscar por nombre de platillo
          </label>
          <Input
            id="buscar-platillo"
            type="search"
            value={busqueda}
            onChange={(e) => buscar(e.target.value)}
            placeholder="Buscar por nombre de platillo..."
          />
        </div>
        {busqueda && (
          <button type="button" onClick={limpiar} className={BOTON_PRIMARIO}>
            Limpiar filtros
          </button>
        )}
      </div>

      {error ? (
        <EmptyState mensaje={error} variante="error">
          <Button onClick={() => void cargar(lista.pagina, consulta)}>
            Reintentar
          </Button>
        </EmptyState>
      ) : lista.total === 0 && consulta === "" ? (
        <EmptyState
          mensaje="Aún no hay platillos"
          descripcion="Agrega el primero con el botón Agregar platillo."
        />
      ) : lista.datos.length === 0 ? (
        <EmptyState
          mensaje="Sin resultados"
          descripcion="Ningún platillo coincide con la búsqueda."
        />
      ) : (
        <div
          aria-busy={cargando}
          className={`transition-opacity duration-200 motion-reduce:transition-none ${cargando ? "opacity-40" : ""}`}
        >
          <TablaPlatillos
            platillos={lista.datos}
            habilitando={habilitando}
            onDeshabilitar={setADeshabilitar}
            onHabilitar={(p) => void habilitar(p)}
          />
          <Paginacion
            pagina={lista.pagina}
            totalPaginas={lista.totalPaginas}
            onCambiar={(pagina) => void cargar(pagina, consulta)}
            deshabilitado={cargando}
            etiqueta="Paginación de platillos"
            className="mt-6"
          />
        </div>
      )}

      <DialogoDeshabilitarPlatillo
        platillo={aDeshabilitar}
        onCerrar={() => setADeshabilitar(null)}
        onConfirmar={deshabilitar}
      />

      <Toast key={aviso?.id} variant={aviso?.variante}>
        {aviso?.texto}
      </Toast>
    </main>
  );
}
