import {
  INTERVALO_RECONEXION_MS,
  INTERVALO_RELOJ_MS,
  UMBRAL_RETRASO_MIN,
  agregarPedido,
  conRecepcion,
  estaRetrasado,
  prepararLista,
  quitarPedido,
  reemplazarPedido,
} from "./pedidos";
import type { PedidoCocina, PedidoEnTablero } from "./tipos";

export type EstadoCarga = "cargando" | "listo" | "error" | "sin-acceso";
export type EstadoConexion = "conectando" | "en-vivo" | "reconectando";

export type EstadoTablero = {
  carga: EstadoCarga;
  conexion: EstadoConexion;
  pedidos: PedidoEnTablero[];
  ahora: number;
  mensaje: string | null;
};

export type AvisoTablero = {
  tipo: "nuevo" | "retrasado";
  pedido: PedidoEnTablero;
};

export interface SocketCocina {
  on(evento: string, oyente: (...args: never[]) => void): unknown;
  connect(): unknown;
  disconnect(): unknown;
  readonly active: boolean;
}

export class NoAutorizadoError extends Error {
  constructor(message = "Sesión no válida") {
    super(message);
    this.name = "NoAutorizadoError";
  }
}

export class SinAccesoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SinAccesoError";
  }
}

export type OpcionesTablero = {
  crearSocket: () => SocketCocina;
  obtenerPedidos: () => Promise<PedidoCocina[]>;
  alNoAutorizado: () => void;
  alAvisar?: (aviso: AvisoTablero) => void;
  ahora?: () => number;
  umbralRetrasoMin?: number;
  intervaloRelojMs?: number;
  esperaReconexionMs?: number;
};

export type Tablero = {
  obtenerEstado: () => EstadoTablero;
  suscribir: (oyente: (estado: EstadoTablero) => void) => () => void;
  iniciar: () => void;
  detener: () => void;
  reintentar: () => void;
};

const PATRON_SIN_ACCESO = /permiso|sucursal/i;

export function esRechazoDeAcceso(mensaje: string): boolean {
  return PATRON_SIN_ACCESO.test(mensaje);
}

export function estadoInicial(ahora: number): EstadoTablero {
  return {
    carga: "cargando",
    conexion: "conectando",
    pedidos: [],
    ahora,
    mensaje: null,
  };
}

type Cambio = (lista: PedidoEnTablero[]) => PedidoEnTablero[];

export function crearTablero(opciones: OpcionesTablero): Tablero {
  const ahora = opciones.ahora ?? Date.now;
  const umbral = opciones.umbralRetrasoMin ?? UMBRAL_RETRASO_MIN;
  const intervaloRelojMs = opciones.intervaloRelojMs ?? INTERVALO_RELOJ_MS;
  const esperaReconexionMs = opciones.esperaReconexionMs ?? INTERVALO_RECONEXION_MS;

  let estado = estadoInicial(ahora());
  const oyentes = new Set<(estado: EstadoTablero) => void>();

  let activo = false;
  let finalizado = false;
  let socket: SocketCocina | null = null;
  let reloj: ReturnType<typeof setInterval> | null = null;
  let reconexion: ReturnType<typeof setTimeout> | null = null;

  let ultimaSolicitud = 0;
  let cambiosDuranteSync: Cambio[] | null = null;

  function actualizar(parcial: Partial<EstadoTablero>) {
    estado = { ...estado, ...parcial };
    oyentes.forEach((oyente) => oyente(estado));
  }

  function aplicar(cambio: Cambio) {
    cambiosDuranteSync?.push(cambio);
    const pedidos = cambio(estado.pedidos);
    if (pedidos !== estado.pedidos) actualizar({ pedidos });
  }

  function cerrarSesion() {
    if (finalizado) return;
    finalizado = true;
    detener();
    opciones.alNoAutorizado();
  }

  function sinAcceso(mensaje: string) {
    if (finalizado) return;
    finalizado = true;
    detener();
    actualizar({ carga: "sin-acceso", pedidos: [], mensaje });
  }

  function tic() {
    const anterior = estado.ahora;
    const momento = ahora();
    actualizar({ ahora: momento });
    for (const pedido of estado.pedidos) {
      if (!estaRetrasado(pedido, anterior, umbral) && estaRetrasado(pedido, momento, umbral)) {
        opciones.alAvisar?.({ tipo: "retrasado", pedido });
      }
    }
  }

  async function sincronizar() {
    const solicitud = ++ultimaSolicitud;
    const cambios: Cambio[] = [];
    cambiosDuranteSync = cambios;

    let datos: PedidoCocina[];
    try {
      datos = await opciones.obtenerPedidos();
    } catch (error) {
      if (!activo || solicitud !== ultimaSolicitud) return;
      cambiosDuranteSync = null;
      if (error instanceof NoAutorizadoError) return cerrarSesion();
      if (error instanceof SinAccesoError) return sinAcceso(error.message);
      console.error("Error al obtener los pedidos de cocina:", error);
      if (estado.carga !== "listo") actualizar({ carga: "error" });
      return;
    }

    if (!activo || solicitud !== ultimaSolicitud) return;
    cambiosDuranteSync = null;
    const momento = ahora();
    const pedidos = cambios.reduce(
      (lista, cambio) => cambio(lista),
      prepararLista(datos, momento, estado.pedidos),
    );
    actualizar({ carga: "listo", pedidos, ahora: momento });
  }

  function programarReconexion() {
    if (reconexion || !activo) return;
    reconexion = setTimeout(() => {
      reconexion = null;
      if (activo && socket && !socket.active) socket.connect();
    }, esperaReconexionMs);
  }

  function conectarSocket() {
    const nuevo = opciones.crearSocket();
    socket = nuevo;

    const siVigente =
      <A extends unknown[]>(fn: (...args: A) => void) =>
      (...args: A) => {
        if (activo && socket === nuevo) fn(...args);
      };

    nuevo.on(
      "connect",
      siVigente(() => {
        actualizar({ conexion: "en-vivo" });
        void sincronizar();
      }),
    );
    nuevo.on(
      "disconnect",
      siVigente((motivo: string) => {
        actualizar({ conexion: "reconectando" });
        if (motivo === "io server disconnect") programarReconexion();
      }),
    );
    nuevo.on(
      "connect_error",
      siVigente((error: Error) => {
        if (nuevo.active) {
          actualizar({ conexion: "reconectando" });
          return;
        }
        if (esRechazoDeAcceso(error.message)) sinAcceso(error.message);
        else cerrarSesion();
      }),
    );
    nuevo.on(
      "pedido:nuevo",
      siVigente((pedido: PedidoCocina) => {
        const entrante = conRecepcion(pedido, ahora());
        const yaEstaba = estado.pedidos.some((p) => p.id === pedido.id);
        aplicar((lista) => agregarPedido(lista, entrante));
        if (!yaEstaba && estado.pedidos.some((p) => p.id === pedido.id)) {
          opciones.alAvisar?.({ tipo: "nuevo", pedido: entrante });
        }
      }),
    );
    nuevo.on(
      "pedido:actualizado",
      siVigente((pedido: PedidoCocina) => {
        const momento = ahora();
        aplicar((lista) => reemplazarPedido(lista, pedido, momento));
      }),
    );
    nuevo.on(
      "pedido:retirado",
      siVigente(({ id }: { id: number }) => {
        aplicar((lista) => quitarPedido(lista, id));
      }),
    );

    nuevo.connect();
  }

  function iniciar() {
    if (activo || finalizado) return;
    activo = true;
    actualizar(estadoInicial(ahora()));
    reloj = setInterval(tic, intervaloRelojMs);
    void sincronizar();
    conectarSocket();
  }

  function detener() {
    activo = false;
    cambiosDuranteSync = null;
    if (reloj) clearInterval(reloj);
    if (reconexion) clearTimeout(reconexion);
    reloj = null;
    reconexion = null;
    const anterior = socket;
    socket = null;
    anterior?.disconnect();
  }

  function reintentar() {
    if (!activo) return;
    actualizar({ carga: "cargando" });
    void sincronizar();
    if (socket && !socket.active) socket.connect();
  }

  return {
    obtenerEstado: () => estado,
    suscribir(oyente) {
      oyentes.add(oyente);
      return () => {
        oyentes.delete(oyente);
      };
    },
    iniciar,
    detener,
    reintentar,
  };
}
