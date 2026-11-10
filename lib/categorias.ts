export type Categoria = {
  id: number;
  nombre: string;
  activa: boolean;
  deshabilitadaEn: string | null;
  platillosActivos: number;
};

export type CategoriaGuardada = { id: number; nombre: string; activa: boolean };

export type PlatilloDeCategoria = { id: number; nombre: string };

export const NOMBRE_MAX = 50;

export function validarNombre(nombre: string): string | undefined {
  const limpio = nombre.trim();
  if (!limpio) return "El nombre de la categoría es obligatorio.";
  if (limpio.length > NOMBRE_MAX) {
    return `El nombre no puede superar los ${NOMBRE_MAX} caracteres.`;
  }
  return undefined;
}