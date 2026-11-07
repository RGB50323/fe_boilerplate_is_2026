import type { FiltrosMenu, MenuRespuesta, Sucursal } from "@/lib/menu";

export const SUCURSALES_MOCK: Sucursal[] = [
  { id: 1, nombre: "Centro" },
  { id: 2, nombre: "Escalón" },
];

const CATEGORIAS = [
  { id: 1, nombre: "Entradas", activa: true },
  { id: 2, nombre: "Platillos principales", activa: true },
  { id: 3, nombre: "Bebidas", activa: true },
  { id: 4, nombre: "Postres", activa: true },
  { id: 5, nombre: "Temporada", activa: false },
];

type Fila = {
  id: number;
  categoriaId: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
  s1: [number, number];
  s2: [number, number];
};

const PLATILLOS: Fila[] = [
  { id: 1, categoriaId: 1, nombre: "Nachos con queso", descripcion: "Tortilla crujiente con queso fundido", activo: true, s1: [6.5, 12], s2: [6.75, 10] },
  { id: 2, categoriaId: 1, nombre: "Yuca frita", descripcion: "Yuca dorada con chicharrón y curtido", activo: true, s1: [5.25, 15], s2: [5.5, 0] },
  { id: 3, categoriaId: 1, nombre: "Alitas BBQ", descripcion: "Seis alitas en salsa BBQ con aderezo ranch", activo: true, s1: [7.99, 8], s2: [8.25, 8] },
  { id: 4, categoriaId: 2, nombre: "Hamburguesa", descripcion: "Carne de res con queso, tocino crujiente, aros de cebolla y salsa BBQ.", activo: true, s1: [8.99, 20], s2: [9.25, 15] },
  { id: 5, categoriaId: 2, nombre: "Pupusa revuelta", descripcion: "Maíz con queso, frijol y chicharrón, con curtido y salsa", activo: true, s1: [1.25, 40], s2: [1.5, 40] },
  { id: 6, categoriaId: 2, nombre: "Pollo a la plancha", descripcion: "Pechuga con arroz, ensalada y plátano frito", activo: true, s1: [9.5, 10], s2: [9.75, 0] },
  { id: 7, categoriaId: 2, nombre: "Costillas BBQ", descripcion: "Media costilla en salsa BBQ con papas", activo: true, s1: [12.99, 6], s2: [13.25, 6] },
  { id: 8, categoriaId: 3, nombre: "Limonada con soda", descripcion: "Limón natural con soda y hielo", activo: true, s1: [2.25, 50], s2: [2.25, 50] },
  { id: 9, categoriaId: 3, nombre: "Horchata", descripcion: "Horchata de morro con canela", activo: true, s1: [2.5, 30], s2: [2.75, 30] },
  { id: 10, categoriaId: 4, nombre: "Flan de caramelo", descripcion: "Flan casero con caramelo", activo: true, s1: [3.5, 10], s2: [3.75, 10] },
  { id: 11, categoriaId: 4, nombre: "Pastel de chocolate", descripcion: "Porción de pastel con crema", activo: false, s1: [4.25, 5], s2: [4.25, 5] },
  { id: 12, categoriaId: 5, nombre: "Sopa de temporada", descripcion: "Sopa del día", activo: true, s1: [5, 5], s2: [5, 5] },
  
];

const normalizar = (t: string) =>
  t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function obtenerMenuMock(
  sucursalId: number,
  f: FiltrosMenu,
): Promise<MenuRespuesta> {
  await esperar(400);
  if (!SUCURSALES_MOCK.some((s) => s.id === sucursalId)) {
    throw new Error("404 sucursal inexistente");
  }
  if (f.q.trim() === "error500") throw new Error("500 simulado");

  const q = normalizar(f.q.trim());
  const min = f.precioMin.trim() === "" ? null : Number(f.precioMin);
  const max = f.precioMax.trim() === "" ? null : Number(f.precioMax);
  const catId = f.categoriaId === "" ? null : Number(f.categoriaId);

  const categorias = CATEGORIAS.filter((c) => c.activa && (catId === null || c.id === catId))
    .map((c) => ({
      id: c.id,
      nombre: c.nombre,
      platillos: PLATILLOS.filter((p) => p.categoriaId === c.id && p.activo)
        .map((p) => {
          const [precio, disponibilidad] = sucursalId === 1 ? p.s1 : p.s2;
          return {
            id: p.id,
            nombre: p.nombre,
            descripcion: p.descripcion,
            precio,
            imagenUrl: `https://placehold.co/400x400?text=${encodeURIComponent(p.nombre)}`,
            disponibilidad,
          };
        })
        .filter(
          (p) =>
            p.disponibilidad > 0 &&
            (q === "" || normalizar(p.nombre).includes(q)) &&
            (min === null || p.precio >= min) &&
            (max === null || p.precio <= max),
        )
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    }))
    .filter((c) => c.platillos.length > 0);

  return { sucursalId, categorias };
}