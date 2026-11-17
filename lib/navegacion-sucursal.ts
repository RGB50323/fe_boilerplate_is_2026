export function rutaConSucursal(
  destino: string,
  consultaActual: string,
): string {
  const ruta = destino.split(/[?#]/)[0];
  const corresponde =
    ruta === "/menu" ||
    ruta === "/admin/categorias" ||
    ruta === "/admin/platillos" ||
    ruta.startsWith("/admin/platillos/");

  if (!corresponde) return destino;

  const sucursal = new URLSearchParams(consultaActual).get("sucursal");

  if (!sucursal || !/^[1-9]\d*$/.test(sucursal)) return destino;
  if (!Number.isSafeInteger(Number(sucursal))) return destino;

  const url = new URL(destino, "http://navegacion.local");

  if (!url.searchParams.has("sucursal")) {
    url.searchParams.set("sucursal", sucursal);
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
