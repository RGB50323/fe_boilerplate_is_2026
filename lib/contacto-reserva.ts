"use client";
import { useSyncExternalStore } from "react";
import type { CamposReserva } from "@/lib/confirmacion-reserva";
const CLAVE = "losburle:contacto-reserva";
const EVENTO = "contacto-reserva";
type Contacto = Pick<CamposReserva, "nombre" | "telefono" | "correo">;
function leer() {
  try {
    const texto = sessionStorage.getItem(CLAVE);
    if (!texto) return null;
    const { expira } = JSON.parse(texto);
    return typeof expira === "number" && expira > Date.now() ? texto : null;
  } catch {
    return null;
  }
}
function suscribir(actualizar: () => void) {
  window.addEventListener(EVENTO, actualizar);
  return () => window.removeEventListener(EVENTO, actualizar);
}
const servidor = () => null;
export function useContactoReserva(contexto: string): Partial<Contacto> {
  const texto = useSyncExternalStore(suscribir, leer, servidor);
  try {
    const borrador = texto ? JSON.parse(texto) : null;
    if (!borrador || borrador.contexto !== contexto) return {};
    const contacto = borrador.contacto;
    if (
      !contacto ||
      typeof contacto.nombre !== "string" ||
      typeof contacto.telefono !== "string" ||
      typeof contacto.correo !== "string"
    )
      return {};
    return {
      nombre: contacto.nombre,
      telefono: contacto.telefono,
      correo: contacto.correo,
    };
  } catch {
    return {};
  }
}
export function guardarContactoReserva(
  contexto: string,
  datos: Contacto,
): boolean {
  try {
    sessionStorage.setItem(
      CLAVE,
      JSON.stringify({
        contexto,
        expira: Date.now() + 30 * 60_000,
        contacto: {
          nombre: datos.nombre,
          telefono: datos.telefono,
          correo: datos.correo,
        },
      }),
    );
    window.dispatchEvent(new Event(EVENTO));
    return true;
  } catch {
    return false;
  }
}
export function borrarContactoReserva() {
  try {
    sessionStorage.removeItem(CLAVE);
    window.dispatchEvent(new Event(EVENTO));
  } catch {
    /* Almacenamiento no disponible. */
  }
}
