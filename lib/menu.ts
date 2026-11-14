export type Sucursal = { id: number; nombre: string };

export type Platillo = {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  imagenUrl: string | null;
  disponibilidad: number;
  promedio?: number | null;
  totalResenas?: number;
};

export type CategoriaMenu = { id: number; nombre: string; platillos: Platillo[] };

export type MenuRespuesta = { sucursalId: number; categorias: CategoriaMenu[] };

export type FiltrosMenu = {
  q: string;
  categoriaId: string; 
  precioMin: string;
  precioMax: string;
};

export const FILTROS_VACIOS: FiltrosMenu = {
  q: "",
  categoriaId: "",
  precioMin: "",
  precioMax: "",
};

export type ErroresFiltros = Partial<Record<"precioMin" | "precioMax", string>>;

export function validarFiltros(f: FiltrosMenu): ErroresFiltros {
  const errores: ErroresFiltros = {};
  const min = f.precioMin.trim() === "" ? null : Number(f.precioMin);
  const max = f.precioMax.trim() === "" ? null : Number(f.precioMax);

  if (min !== null && (!Number.isFinite(min) || min < 0)) {
    errores.precioMin = "Ingresá un precio válido, mayor o igual a 0.";
  }
  if (max !== null && (!Number.isFinite(max) || max < 0)) {
    errores.precioMax = "Ingresá un precio válido, mayor o igual a 0.";
  }
  if (
    !errores.precioMin &&
    !errores.precioMax &&
    min !== null &&
    max !== null &&
    min > max
  ) {
    errores.precioMin = "El precio mínimo no puede ser mayor que el máximo.";
  }
  return errores;
}

type Params = Record<string, string | string[] | undefined>;

const uno = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";

export function filtrosDesdeParams(p: Params): FiltrosMenu {
  return {
    q: uno(p.q),
    categoriaId: uno(p.categoriaId),
    precioMin: uno(p.precioMin),
    precioMax: uno(p.precioMax),
  };
}

export function filtrosAQuery(f: FiltrosMenu, sucursalId?: number): string {
  const qs = new URLSearchParams();
  if (sucursalId) qs.set("sucursal", String(sucursalId));
  (Object.entries(f) as [keyof FiltrosMenu, string][]).forEach(([k, v]) => {
    if (v.trim() !== "") qs.set(k, v.trim());
  });
  return qs.toString();
}

export function formatoPrecio(n: number): string {
  return `$${n.toFixed(2)}`;
}