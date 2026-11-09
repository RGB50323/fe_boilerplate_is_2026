export const ROLES_COCINA = ["COCINA", "GERENTE", "GERENTE_GENERAL"] as const;

export const ROLES_POR_RUTA: Record<string, readonly string[]> = {
  "/cocina": ROLES_COCINA,
};

type Payload = Record<string, unknown>;

function esObjeto(valor: unknown): valor is Payload {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

export function leerPayload(token: string): Payload | null {
  const partes = token.split(".");
  if (partes.length !== 3) return null;
  try {
    const base64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
    const binario = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
    const json = new TextDecoder().decode(
      Uint8Array.from(binario, (c) => c.charCodeAt(0)),
    );
    const payload: unknown = JSON.parse(json);
    return esObjeto(payload) ? payload : null;
  } catch {
    return null;
  }
}

function nombresDeRol(valor: unknown): string[] {
  if (typeof valor === "string") return [valor];
  if (Array.isArray(valor)) return valor.flatMap(nombresDeRol);
  if (esObjeto(valor)) return nombresDeRol(valor.nombre ?? valor.name);
  return [];
}

export function obtenerRoles(token: string): string[] {
  const payload = leerPayload(token);
  if (!payload) return [];
  const fuentes = [payload, payload.usuario, payload.user].filter(esObjeto);
  const roles = fuentes.flatMap((fuente) =>
    [fuente.rol, fuente.role, fuente.roles].flatMap(nombresDeRol),
  );
  return [...new Set(roles.map((rol) => rol.toUpperCase()))];
}

export function obtenerSucursalId(token: string): number | null {
  const sucursalId = leerPayload(token)?.sucursalId;
  return Number.isInteger(sucursalId) ? (sucursalId as number) : null;
}

export function tieneRolPermitido(
  token: string,
  permitidos: readonly string[],
): boolean {
  return obtenerRoles(token).some((rol) => permitidos.includes(rol));
}

export function rolesRequeridosPara(pathname: string): readonly string[] | null {
  const ruta = Object.keys(ROLES_POR_RUTA).find(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
  return ruta ? ROLES_POR_RUTA[ruta] : null;
}
