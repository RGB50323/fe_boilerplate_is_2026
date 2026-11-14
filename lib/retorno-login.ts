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
      !["/reservas/nueva", "/perfil/reservaciones", "/reservas"].includes(
        url.pathname,
      )
    )
      return "/menu";
    return url.pathname + url.search;
  } catch {
    return "/menu";
  }
}
