import type { Platillo } from "@/lib/menu";
import type { ItemNuevo } from "@/lib/pedidos";

export const ERROR_NOMBRE = "Ingresa tu nombre completo.";
export const ERROR_CARRITO = "Agrega al menos un platillo a tu pedido.";

export type LineaCarrito = {
  platillo: Platillo;
  cantidad: number;
  nota: string;
};

export type ErroresCarrito = { carrito?: string; nombre?: string };

export function cantidadDe(lineas: LineaCarrito[], platilloId: number): number {
  return lineas.find((l) => l.platillo.id === platilloId)?.cantidad ?? 0;
}

export function quitarDelCarrito(
  lineas: LineaCarrito[],
  platilloId: number,
): LineaCarrito[] {
  return lineas.filter((l) => l.platillo.id !== platilloId);
}

export function cambiarCantidad(
  lineas: LineaCarrito[],
  platilloId: number,
  cantidad: number,
): LineaCarrito[] {
  if (cantidad < 1) return quitarDelCarrito(lineas, platilloId);
  return lineas.map((l) =>
    l.platillo.id === platilloId
      ? { ...l, cantidad: Math.min(cantidad, l.platillo.disponibilidad) }
      : l,
  );
}

export function agregarAlCarrito(
  lineas: LineaCarrito[],
  platillo: Platillo,
): LineaCarrito[] {
  if (platillo.disponibilidad < 1) return lineas;
  const actual = cantidadDe(lineas, platillo.id);
  if (actual === 0) return [...lineas, { platillo, cantidad: 1, nota: "" }];
  return cambiarCantidad(lineas, platillo.id, actual + 1);
}

export function cambiarNota(
  lineas: LineaCarrito[],
  platilloId: number,
  nota: string,
): LineaCarrito[] {
  return lineas.map((l) =>
    l.platillo.id === platilloId ? { ...l, nota } : l,
  );
}

export function subtotalLinea(linea: LineaCarrito): number {
  return (Math.round(linea.platillo.precio * 100) * linea.cantidad) / 100;
}

export function totalCarrito(lineas: LineaCarrito[]): number {
  const centavos = lineas.reduce(
    (suma, l) => suma + Math.round(l.platillo.precio * 100) * l.cantidad,
    0,
  );
  return centavos / 100;
}

export function validarCarrito(
  lineas: LineaCarrito[],
  nombre: string,
): ErroresCarrito {
  const errores: ErroresCarrito = {};
  if (lineas.length === 0) errores.carrito = ERROR_CARRITO;
  if (!/^\S+(\s+\S+)+$/.test(nombre.trim())) errores.nombre = ERROR_NOMBRE;
  return errores;
}

export function itemsParaEnviar(lineas: LineaCarrito[]): ItemNuevo[] {
  return lineas.map((l) => ({
    platilloId: l.platillo.id,
    cantidad: l.cantidad,
    nota: l.nota.trim() || null,
  }));
}