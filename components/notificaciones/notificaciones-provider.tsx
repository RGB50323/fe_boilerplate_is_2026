"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { listarNotificaciones } from "@/app/actions/notificaciones";

type EstadoSesion = "desconocida" | "autenticada" | "error" | "sin-sesion";

type NotificacionesContexto = {
  noLeidas: number;
  estadoSesion: EstadoSesion;
  actualizarNoLeidas: (cantidad: number) => void;
  decrementarNoLeidas: () => void;
  registrarSinSesion: () => void;
  // Campanas dentro de un header
  campanasEnLinea: number;
  registrarCampanaEnLinea: () => () => void;
  // El panel abierto ya sondea por su cuenta
  marcarPanelAbierto: (abierto: boolean) => void;
};

const NotificacionesContext = createContext<NotificacionesContexto | null>(
  null,
);

export function NotificacionesProvider({ children }: { children: ReactNode }) {
  const [noLeidas, setNoLeidas] = useState(0);
  const [estadoSesion, setEstadoSesion] = useState<EstadoSesion>("desconocida");
  // Solo aplica la respuesta más reciente
  const ultimaSolicitud = useRef(0);
  const estadoRef = useRef(estadoSesion);
  const panelAbierto = useRef(false);
  // Reconsulta al cambiar de ruta
  const pathname = usePathname();

  const consultarContador = useCallback(async () => {
    const solicitud = ++ultimaSolicitud.current;
    try {
      const resultado = await listarNotificaciones(1);
      if (solicitud !== ultimaSolicitud.current) return;
      if ("sinSesion" in resultado) {
        setEstadoSesion("sin-sesion");
        setNoLeidas(0);
      } else if ("datos" in resultado) {
        setEstadoSesion("autenticada");
        setNoLeidas(resultado.noLeidas);
      } else {
        setEstadoSesion("error");
      }
    } catch {
      // Un error no cierra la sesión
      if (solicitud === ultimaSolicitud.current) setEstadoSesion("error");
    }
  }, []);

  useEffect(() => {
    estadoRef.current = estadoSesion;
  }, [estadoSesion]);

  const marcarPanelAbierto = useCallback((abierto: boolean) => {
    panelAbierto.current = abierto;
  }, []);

  const actualizarNoLeidas = useCallback((cantidad: number) => {
    setNoLeidas(Math.max(0, cantidad));
  }, []);
  const decrementarNoLeidas = useCallback(() => {
    setNoLeidas((cantidad) => Math.max(0, cantidad - 1));
  }, []);
  const [campanasEnLinea, setCampanasEnLinea] = useState(0);
  const registrarCampanaEnLinea = useCallback(() => {
    setCampanasEnLinea((cantidad) => cantidad + 1);
    return () => {
      setCampanasEnLinea((cantidad) => Math.max(0, cantidad - 1));
      // Revisa la sesión al quitar la campana del header
      setEstadoSesion("desconocida");
      void consultarContador();
    };
  }, [consultarContador]);
  const registrarSinSesion = useCallback(() => {
    ultimaSolicitud.current += 1;
    setEstadoSesion("sin-sesion");
    setNoLeidas(0);
  }, []);

  useEffect(() => {
    const inicio = window.setTimeout(() => void consultarContador(), 0);
    const intervalo = window.setInterval(() => {
      // Sin sesión espera al siguiente cambio de ruta
      if (
        document.visibilityState === "visible" &&
        estadoRef.current !== "sin-sesion" &&
        !panelAbierto.current
      )
        void consultarContador();
    }, 30_000);
    return () => {
      window.clearTimeout(inicio);
      window.clearInterval(intervalo);
    };
  }, [consultarContador, pathname]);

  return (
    <NotificacionesContext.Provider
      value={{
        noLeidas,
        estadoSesion,
        actualizarNoLeidas,
        decrementarNoLeidas,
        registrarSinSesion,
        campanasEnLinea,
        registrarCampanaEnLinea,
        marcarPanelAbierto,
      }}
    >
      {children}
    </NotificacionesContext.Provider>
  );
}

export function useNotificaciones() {
  const contexto = useContext(NotificacionesContext);
  if (!contexto)
    throw new Error(
      "useNotificaciones debe usarse dentro de NotificacionesProvider.",
    );
  return contexto;
}
