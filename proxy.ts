import { NextResponse, type NextRequest } from "next/server";
import { rolesRequeridosPara, tieneRolPermitido } from "@/lib/roles";
import { SESSION_COOKIE } from "@/lib/session";
import { retornoLogin } from "@/lib/retorno-login";

const publicRoutes = ["/menu", "/reservas"];
const guestOnlyRoutes = ["/login"];

// Chequeo optimista: solo verifica que exista la cookie de sesión.
// Si el backend expone un token verificable (p. ej. JWT), validarlo aquí.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicRoute = publicRoutes.includes(pathname);
  const isGuestOnlyRoute = guestOnlyRoutes.includes(pathname);
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const hasSession = Boolean(token);

  if (!isPublicRoute && !isGuestOnlyRoute && !hasSession) {
    const login = new URL("/login", request.nextUrl);
    const siguiente = retornoLogin(pathname + request.nextUrl.search);
    if (siguiente !== "/menu") login.searchParams.set("next", siguiente);
    return NextResponse.redirect(login);
  }

  if (
    isGuestOnlyRoute &&
    hasSession &&
    retornoLogin(request.nextUrl.searchParams.get("next")) === "/menu"
  ) {
    return NextResponse.redirect(new URL("/menu", request.nextUrl));
  }

  const requiredRoles = rolesRequeridosPara(pathname);
  if (token && requiredRoles && !tieneRolPermitido(token, requiredRoles)) {
    return NextResponse.redirect(new URL("/menu", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
