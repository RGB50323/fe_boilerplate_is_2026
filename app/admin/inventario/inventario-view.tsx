"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  crearInsumo,
  listarInsumos,
  registrarMovimiento,
  type CrearInsumoResultado,
  type InsumosResultado,
  type MovimientoResultado,
} from "@/app/actions/inventario";
import { DialogoMovimiento, type RespuestaMovimiento } from "@/components/inventario/dialogo-movimiento";
import { EncabezadoInventario, EsqueletoInventario } from "@/components/inventario/esqueleto-inventario";
import { FormularioInsumo, type RespuestaFormulario } from "@/components/inventario/formulario-insumo";
import { PanelHistorial } from "@/components/inventario/panel-historial";
import { IconoHistorial, IconoMovimiento, TablaInsumos } from "@/components/inventario/tabla-insumos";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBar } from "@/components/ui/search-bar";
import { Toast } from "@/components/ui/toast";
import {
  actualizarCantidad,
  agregarInsumo,
  MENSAJE_MAXIMO,
  mensajeExcedeExistencia,
  ordenarInsumos,
  type Insumo,
  type ValoresInsumo,
  type ValoresMovimiento,
} from "@/lib/inventario";

type Carga = "cargando" | "listo" | "error";
type Aviso = { id: number; texto: string; variante: "success" | "error" };

const ESPERA_BUSQUEDA_MS = 300;
const ERROR_CARGA = "No pudimos cargar el inventario";
const ERROR_CREAR = "No pudimos guardar el insumo. Intenta de nuevo.";
const ERROR_MOVIMIENTO = "No pudimos registrar el movimiento. Intenta de nuevo.";

async function pedir<T>(accion: () => Promise<T>, error: T, contexto: string): Promise<T> {
  try {
    return await accion();
  } catch (causa) {
    console.error(contexto, causa);
    return error;
  }
}

export function InventarioView({ sucursalNombre }: { sucursalNombre?: string }) {
  const router = useRouter();
  const [carga, setCarga] = useState<Carga>("cargando");
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [consulta, setConsulta] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [creando, setCreando] = useState(false);
  const [aMover, setAMover] = useState<Insumo | null>(null);
  const [historialDe, setHistorialDe] = useState<Insumo | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const ultimaConsulta = useRef(0);
  const siguienteAviso = useRef(0);
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const avisar = useCallback((texto: string, variante: Aviso["variante"]) => {
    setAviso({ id: ++siguienteAviso.current, texto, variante });
  }, []);

  const irALogin = useCallback(() => router.replace("/login"), [router]);

  const cargar = useCallback(
    (texto: string) => {
      const id = ++ultimaConsulta.current;
      return pedir<InsumosResultado>(
        () => listarInsumos(texto),
        { error: ERROR_CARGA },
        "Error al cargar el inventario:",
      ).then((resultado) => {
        if (id !== ultimaConsulta.current) return;
        setBuscando(false);
        if ("insumos" in resultado) {
          setInsumos(ordenarInsumos(resultado.insumos));
          setConsulta(texto);
          setCarga("listo");
        } else if ("sinSesion" in resultado) {
          irALogin();
        } else {
          setConsulta(texto);
          setCarga("error");
        }
      });
    },
    [irALogin],
  );

  useEffect(() => {
    void cargar("");
    return () => clearTimeout(temporizador.current);
  }, [cargar]);

  function buscar(texto: string) {
    setBusqueda(texto);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      setBuscando(true);
      void cargar(texto.trim());
    }, ESPERA_BUSQUEDA_MS);
  }

  function limpiar() {
    clearTimeout(temporizador.current);
    setBusqueda("");
    setBuscando(true);
    void cargar("");
  }

  function reintentar() {
    setCarga("cargando");
    void cargar(consulta);
  }

  async function guardarInsumo(valores: ValoresInsumo): Promise<RespuestaFormulario> {
    const resultado = await pedir<CrearInsumoResultado>(
      () => crearInsumo(valores),
      { error: ERROR_CREAR },
      "Error al crear el insumo:",
    );
    if ("insumo" in resultado) {
      setInsumos((actuales) => agregarInsumo(actuales, resultado.insumo));
      setCreando(false);
      avisar("Insumo guardado correctamente", "success");
      return undefined;
    }
    if ("sinSesion" in resultado) {
      irALogin();
      return {};
    }
    return resultado;
  }

  async function guardarMovimiento(
    insumo: Insumo,
    valores: ValoresMovimiento,
  ): Promise<RespuestaMovimiento> {
    const resultado = await pedir<MovimientoResultado>(
      () => registrarMovimiento(insumo.id, valores),
      { error: ERROR_MOVIMIENTO },
      "Error al registrar el movimiento:",
    );
    if ("movimiento" in resultado) {
      setInsumos((actuales) =>
        actualizarCantidad(actuales, insumo.id, resultado.movimiento.cantidadActual),
      );
      setAMover(null);
      avisar("Movimiento registrado", "success");
      return undefined;
    }
    if ("limiteExcedido" in resultado) {
      const mensaje = valores.tipo === "SALIDA" ? mensajeExcedeExistencia(insumo) : MENSAJE_MAXIMO;
      return { errores: { cantidad: mensaje } };
    }
    if ("sinSesion" in resultado) {
      irALogin();
      return {};
    }
    return resultado;
  }

  return (
    <main className="pb-8">
      <EncabezadoInventario sucursalNombre={sucursalNombre}>
        <Button onClick={() => setCreando(true)} className="min-h-11 px-6 py-2 text-base">
          Nuevo insumo
        </Button>
      </EncabezadoInventario>

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl bg-[#2b2b2f] p-4">
        <SearchBar
          id="buscar-insumo"
          label="Buscar insumo por nombre"
          placeholder="Buscar insumo por nombre..."
          value={busqueda}
          onChange={(e) => buscar(e.target.value)}
          autoComplete="off"
          className="min-w-0 flex-1 sm:max-w-sm"
        />
        {busqueda && (
          <button
            type="button"
            onClick={limpiar}
            className="ml-auto min-h-11 cursor-pointer rounded-full bg-[#101012] px-5 text-sm font-semibold text-zinc-100 transition-colors hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <section aria-label="Insumos" aria-busy={carga === "cargando" || buscando}>
        {carga === "cargando" && <EsqueletoInventario />}

        {carga === "error" && (
          <EmptyState mensaje={ERROR_CARGA} variante="error">
            <Button onClick={reintentar} className="min-h-11 px-8">
              Reintentar
            </Button>
          </EmptyState>
        )}

        {carga === "listo" && insumos.length === 0 && (
          <EmptyState
            mensaje={consulta ? "Sin resultados" : "Aún no hay insumos"}
            descripcion={
              consulta
                ? `Ningún insumo coincide con «${consulta}».`
                : "Registra el primero con el botón Nuevo insumo."
            }
          />
        )}

        {carga === "listo" && insumos.length > 0 && (
          <div
            className={`transition-opacity duration-200 motion-reduce:transition-none ${buscando ? "opacity-40" : ""}`}
          >
            <TablaInsumos insumos={insumos} onMovimiento={setAMover} onHistorial={setHistorialDe} />
            <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-400">
              <span>Los insumos en estado «Bajo» se muestran primero</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <IconoMovimiento className="size-4" /> registrar entrada/salida
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <IconoHistorial className="size-4" /> ver historial
              </span>
            </p>
          </div>
        )}
      </section>

      <FormularioInsumo abierto={creando} onCerrar={() => setCreando(false)} onGuardar={guardarInsumo} />
      <DialogoMovimiento insumo={aMover} onCerrar={() => setAMover(null)} onRegistrar={guardarMovimiento} />
      <PanelHistorial insumo={historialDe} onCerrar={() => setHistorialDe(null)} onSinSesion={irALogin} />

      <Toast key={aviso?.id} variant={aviso?.variante}>
        {aviso?.texto}
      </Toast>
    </main>
  );
}
