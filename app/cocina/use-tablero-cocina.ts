"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { logout } from "@/app/actions/auth";
import { listarPedidosCocina, marcarItemListo } from "@/app/actions/cocina";
import { INTERVALO_RECONEXION_MS } from "@/lib/cocina/pedidos";
import {
  NoAutorizadoError,
  SinAccesoError,
  crearTablero,
  estadoInicial,
  type AvisoTablero,
  type EstadoTablero,
  type Tablero,
} from "@/lib/cocina/tablero";
import type { PedidoCocina } from "@/lib/cocina/tipos";

type Opciones = {
  socketUrl: string;
  token: string;
};

export type AvisoMensaje = { tipo: "error" | "info"; mensaje: string };

export type AvisoCocina = (AvisoTablero | AvisoMensaje) & { id: number };

const MENSAJE_YA_LISTO = "Este platillo ya fue marcado como listo";
const MENSAJE_FUERA_DE_COCINA = "Este pedido ya no está en cocina";
const MENSAJE_ERROR_LISTO = "No pudimos marcar el platillo. Intenta de nuevo";

async function pedirListo(itemId: number) {
  try {
    return await marcarItemListo(itemId);
  } catch (error) {
    console.error("Error al marcar el platillo como listo:", error);
    return { error: MENSAJE_ERROR_LISTO };
  }
}

async function obtenerPedidos(): Promise<PedidoCocina[]> {
  const resultado = await listarPedidosCocina();
  if ("pedidos" in resultado) return resultado.pedidos;
  if ("sinSesion" in resultado) throw new NoAutorizadoError();
  if ("sinAcceso" in resultado) throw new SinAccesoError(resultado.sinAcceso);
  throw new Error(resultado.error);
}

export function useTableroCocina({ socketUrl, token }: Opciones) {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoTablero>(() =>
    estadoInicial(Date.now()),
  );
  const [avisos, setAvisos] = useState<AvisoCocina[]>([]);
  const tableroRef = useRef<Tablero | null>(null);
  const siguienteAviso = useRef(0);

  const avisar = useCallback((aviso: AvisoTablero | AvisoMensaje) => {
    const id = ++siguienteAviso.current;
    setAvisos((actuales) => [...actuales, { ...aviso, id }].slice(-3));
  }, []);

  useEffect(() => {
    const tablero = crearTablero({
      crearSocket: () =>
        io(socketUrl, {
          auth: { token },
          autoConnect: false,
          transports: ["websocket"],
          reconnectionDelay: INTERVALO_RECONEXION_MS,
          reconnectionDelayMax: INTERVALO_RECONEXION_MS,
          randomizationFactor: 0,
        }),
      obtenerPedidos,
      alNoAutorizado: () => {
        void logout().finally(() => router.replace("/login"));
      },
      alAvisar: avisar,
    });
    tableroRef.current = tablero;
    const desuscribir = tablero.suscribir(setEstado);
    tablero.iniciar();

    return () => {
      desuscribir();
      tablero.detener();
      tableroRef.current = null;
    };
  }, [socketUrl, token, router, avisar]);

  const reintentar = useCallback(() => tableroRef.current?.reintentar(), []);
  const descartarAviso = useCallback(
    (id: number) => setAvisos((actuales) => actuales.filter((a) => a.id !== id)),
    [],
  );

  const marcarListo = useCallback(
    async (itemId: number, pedidoId: number) => {
      const resultado = await pedirListo(itemId);
      const tablero = tableroRef.current;
      if (!tablero) return;

      if ("item" in resultado) {
        tablero.marcarItemListo({ pedidoId, ...resultado.item });
      } else if ("conflicto" in resultado) {
        await tablero.refrescar();
        const pedido = tablero.obtenerEstado().pedidos.find((p) => p.id === pedidoId);
        const item = pedido?.items.find((i) => i.id === itemId);
        if (!item) {
          avisar({ tipo: "info", mensaje: MENSAJE_FUERA_DE_COCINA });
        } else if (item.estado !== "PENDIENTE") {
          avisar({ tipo: "info", mensaje: MENSAJE_YA_LISTO });
        } else {
          avisar({ tipo: "error", mensaje: MENSAJE_ERROR_LISTO });
        }
      } else if ("sinSesion" in resultado) {
        tablero.cerrarSesion();
      } else {
        avisar({ tipo: "error", mensaje: resultado.error });
      }
    },
    [avisar],
  );

  return { ...estado, avisos, reintentar, descartarAviso, marcarListo };
}
