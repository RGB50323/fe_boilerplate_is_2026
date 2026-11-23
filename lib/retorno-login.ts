import { esRutaEdicion } from "@/lib/edicion-reserva";
// Lista explícita: nunca redirigimos a una URL externa proporcionada por el navegador.
export function retornoLogin(valor: unknown): string {
  if (
    typeof valor !== "string" ||
    !valor.startsWith("/") ||
    valor.startsWith("//") ||
    /[\\\r\n]/.test(valor)
  )
    return "/menu";
  try {
    const url = new URL(valor, "https://losburle.local");
    if (
      url.origin !== "https://losburle.local" ||
      (!["/reservas/nueva", "/perfil/reservaciones", "/reservas",
        "/perfil/beneficios", "/mesero/canjes", "/admin/beneficios", "/admin/beneficios/canjes"].includes(
        url.pathname,
      ) &&
        !esRutaEdicion(url.pathname))
    )
      return "/menu";
    return url.pathname + url.search;
  } catch {
    return "/menu";
  }
}

// Retorno al login, conservando la reservación a resaltar
export function rutaRetorno(destacada?: string): string {
  const ruta = destacada
    ? `/perfil/reservaciones?reservacion=${destacada}`
    : "/perfil/reservaciones";
  return encodeURIComponent(ruta);
}
