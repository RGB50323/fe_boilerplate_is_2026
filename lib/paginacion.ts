export type Pagina<T> = {
  pagina: number;
  totalPaginas: number;
  total: number;
  datos: T[];
};

export function paginaVacia<T>(): Pagina<T> {
  return { pagina: 1, totalPaginas: 0, total: 0, datos: [] };
}
