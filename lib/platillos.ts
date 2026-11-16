export const NOMBRE_MAX = 120;
export const IMAGEN_MAX_BYTES = 2 * 1024 * 1024;
export const PLATILLO_NO_EXISTE = "El platillo no existe.";
const TIPOS_IMAGEN = ["image/jpeg", "image/png"];

export type Platillo = {
  id: number;
  nombre: string;
  descripcion: string | null;
  imagenUrl: string | null;
  imagenSrc: string | null;
  categoriaId: number;
  categoriaNombre: string;
  precio: number;
  disponibilidad: number;
  activo: boolean;
};

export type PlatilloDeshabilitado = { id: number; activo: boolean };
export type ImagenSubida = { imagenUrl: string; imagenSrc: string | null };

export type ValoresPlatillo = {
  nombre: string;
  descripcion: string;
  precio: string;
  categoriaId: string;
  disponibilidad: string;
  imagenUrl: string;
};

export type CampoPlatillo =
  | "nombre"
  | "descripcion"
  | "precio"
  | "categoriaId"
  | "disponibilidad"
  | "imagenUrl";
export type ErroresPlatillo = Partial<Record<CampoPlatillo, string>>;

export const VALORES_VACIOS: ValoresPlatillo = {
  nombre: "",
  descripcion: "",
  precio: "",
  categoriaId: "",
  disponibilidad: "",
  imagenUrl: "",
};

export function valoresDe(platillo: Platillo): ValoresPlatillo {
  return {
    nombre: platillo.nombre,
    descripcion: platillo.descripcion ?? "",
    precio: platillo.precio.toFixed(2),
    categoriaId: String(platillo.categoriaId),
    disponibilidad: String(platillo.disponibilidad),
    imagenUrl: platillo.imagenUrl ?? "",
  };
}

export function validarPlatillo(valores: ValoresPlatillo): ErroresPlatillo {
  const errores: ErroresPlatillo = {};

  const nombre = valores.nombre.trim();
  if (!nombre) errores.nombre = "El nombre del platillo es obligatorio.";
  else if (nombre.length > NOMBRE_MAX) {
    errores.nombre = `El nombre no puede superar los ${NOMBRE_MAX} caracteres.`;
  }

  if (!valores.descripcion.trim()) {
    errores.descripcion = "La descripción es obligatoria.";
  }

  const precio = valores.precio.trim().replace(",", ".");
  const numero = Number(precio);
  if (!precio) errores.precio = "El precio es obligatorio.";
  else if (!Number.isFinite(numero)) {
    errores.precio = "El precio debe ser un número.";
  } else if (numero <= 0) errores.precio = "El precio debe ser mayor a 0.";
  else if (!/^\d+(\.\d{1,2})?$/.test(precio)) {
    errores.precio = "El precio admite máximo dos decimales.";
  }

  const disponibilidad = valores.disponibilidad.trim();
  if (!disponibilidad) {
    errores.disponibilidad = "La disponibilidad es obligatoria.";
  } else if (!/^\d+$/.test(disponibilidad)) {
    errores.disponibilidad =
      "La disponibilidad debe ser un número entero mayor o igual a 0.";
  }

  if (!valores.categoriaId) errores.categoriaId = "Selecciona una categoría.";

  if (!valores.imagenUrl) errores.imagenUrl = "La imagen es obligatoria.";

  return errores;
}

export function validarImagen(archivo: {
  type: string;
  size: number;
}): string | undefined {
  if (!TIPOS_IMAGEN.includes(archivo.type)) {
    return "La imagen debe ser JPG o PNG.";
  }
  if (archivo.size > IMAGEN_MAX_BYTES) {
    return "La imagen no puede superar los 2 MB.";
  }
  return undefined;
}

export function cuerpoPlatillo(valores: ValoresPlatillo) {
  return {
    nombre: valores.nombre.trim(),
    descripcion: valores.descripcion.trim(),
    precio: Number(valores.precio.trim().replace(",", ".")),
    categoriaId: Number(valores.categoriaId),
    disponibilidad: Number(valores.disponibilidad.trim()),
    imagenUrl: valores.imagenUrl,
  };
}
