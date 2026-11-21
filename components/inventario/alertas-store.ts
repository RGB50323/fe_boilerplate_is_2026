import { useSyncExternalStore } from "react";
import { listarAlertas, type AlertasResultado } from "@/app/actions/alertas-inventario";
import {
  INTERVALO_ALERTAS_MS,
  ordenarAlertas,
  type AlertaInsumo,
} from "@/lib/alertas-inventario";

export type EstadoAlertas = {
  carga: "cargando" | "listo" | "error" | "sin-sesion";
  alertas: AlertaInsumo[];
};

const INICIAL: EstadoAlertas = { carga: "cargando", alertas: [] };

let estado = INICIAL;
const oyentes = new Set<() => void>();
let intervalo: ReturnType<typeof setInterval> | undefined;
let ultimaConsulta = 0;

function emitir(siguiente: EstadoAlertas) {
  estado = siguiente;
  for (const oyente of oyentes) oyente();
}

function detener() {
  clearInterval(intervalo);
  intervalo = undefined;
  ultimaConsulta += 1;
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  if (oyentes.size === 1) {
    intervalo = setInterval(() => {
      if (document.visibilityState === "visible") void refrescarAlertas();
    }, INTERVALO_ALERTAS_MS);
    void refrescarAlertas();
  }
  return () => {
    oyentes.delete(oyente);
    if (oyentes.size === 0) {
      detener();
      estado = INICIAL;
    }
  };
}

export async function refrescarAlertas(): Promise<void> {
  if (oyentes.size === 0) return;
  const consulta = ++ultimaConsulta;
  let resultado: AlertasResultado;
  try {
    resultado = await listarAlertas();
  } catch (causa) {
    console.error("Error al consultar las alertas de inventario:", causa);
    resultado = { error: "No pudimos cargar las alertas" };
  }
  if (consulta !== ultimaConsulta) return;
  if ("alertas" in resultado) {
    emitir({ carga: "listo", alertas: ordenarAlertas(resultado.alertas) });
  } else if ("sinSesion" in resultado) {
    detener();
    emitir({ carga: "sin-sesion", alertas: [] });
  } else if (estado.carga !== "listo") {
    emitir({ ...estado, carga: "error" });
  }
}

export function reintentarAlertas() {
  emitir({ ...estado, carga: "cargando" });
  return refrescarAlertas();
}

export function marcarVistaLocal(id: number) {
  ultimaConsulta += 1;
  emitir({
    ...estado,
    alertas: ordenarAlertas(
      estado.alertas.map((alerta) => (alerta.id === id ? { ...alerta, estado: "VISTA" } : alerta)),
    ),
  });
}

export function quitarAlertaLocal(id: number) {
  ultimaConsulta += 1;
  emitir({ ...estado, alertas: estado.alertas.filter((alerta) => alerta.id !== id) });
}

export function useAlertasInventario(): EstadoAlertas {
  return useSyncExternalStore(suscribir, () => estado, () => INICIAL);
}
