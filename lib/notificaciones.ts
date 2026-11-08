export const MODULOS_NOTIFICACION = [
  "MENU",
  "PEDIDOS",
  "COCINA",
  "RESERVACIONES",
  "INVENTARIO",
  "PAGOS",
  "LEALTAD",
  "RESENAS",
  "REPORTES",
] as const;

export type ModuloNotificacion = (typeof MODULOS_NOTIFICACION)[number];

export type ReferenciaNotificacion = {
  tipo: string;
  id: string | number;
};

export type Notificacion = {
  id: string | number;
  titulo: string;
  mensaje: string;
  moduloOrigen: ModuloNotificacion;
  referencia: ReferenciaNotificacion | null;
  leida: boolean;
  creadaEn: string;
};

const ETIQUETAS_MODULO: Record<ModuloNotificacion, string> = {
  MENU: "Menú",
  PEDIDOS: "Pedidos",
  COCINA: "Cocina",
  RESERVACIONES: "Reservaciones",
  INVENTARIO: "Inventario",
  PAGOS: "Pagos",
  LEALTAD: "Lealtad",
  RESENAS: "Reseñas",
  REPORTES: "Reportes",
};

export function etiquetaModulo(modulo: ModuloNotificacion): string {
  return ETIQUETAS_MODULO[modulo];
}

export function formatoContador(noLeidas: number): string {
  return noLeidas > 9 ? "9+" : String(Math.max(0, noLeidas));
}

export function formatoFechaNotificacion(fecha: string | Date): string {
  const valor = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(valor.getTime())) return "Fecha desconocida";

  return new Intl.DateTimeFormat("es-SV", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(valor);
}

export function rutaDeReferencia(
  referencia: ReferenciaNotificacion | null,
): string | null {
  if (!referencia) return null;
  const tipo = referencia.tipo.toUpperCase();

  // Estas rutas pueden incorporarse en historias posteriores del frontend.
  if (tipo.startsWith("PEDIDO"))
    return `/pedidos/${encodeURIComponent(String(referencia.id))}`;
  if (tipo.startsWith("RESERVA")) return "/reservas";
  return null;
}
