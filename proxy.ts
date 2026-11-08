import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

const publicRoutes = ["/menu", "/reservas"];
const guestOnlyRoutes = ["/login"];

// Chequeo optimista: solo verifica que exista la cookie de sesión.
// Si el backend expone un token verificable (p. ej. JWT), validarlo aquí.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicRoute = publicRoutes.includes(pathname);
  const isGuestOnlyRoute = guestOnlyRoutes.includes(pathname);
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!isPublicRoute && !isGuestOnlyRoute && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  if (isGuestOnlyRoute && hasSession) {
    return NextResponse.redirect(new URL("/menu", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
