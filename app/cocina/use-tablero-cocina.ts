"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { logout } from "@/app/actions/auth";
import { listarPedidosCocina } from "@/app/actions/cocina";
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

export type AvisoCocina = AvisoTablero & { id: number };

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
      alAvisar: (aviso) => {
        const id = ++siguienteAviso.current;
        setAvisos((actuales) => [...actuales, { ...aviso, id }].slice(-3));
      },
    });
    tableroRef.current = tablero;
    const desuscribir = tablero.suscribir(setEstado);
    tablero.iniciar();

    return () => {
      desuscribir();
      tablero.detener();
      tableroRef.current = null;
    };
  }, [socketUrl, token, router]);

  const reintentar = useCallback(() => tableroRef.current?.reintentar(), []);
  const descartarAviso = useCallback(
    (id: number) => setAvisos((actuales) => actuales.filter((a) => a.id !== id)),
    [],
  );

  return { ...estado, avisos, reintentar, descartarAviso };
}
