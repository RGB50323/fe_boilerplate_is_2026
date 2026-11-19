"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const mensajes: Record<number, string> = {
  401: "Inicia sesión para descargar el comprobante.",
  403: "No tienes permiso para descargar este comprobante.",
  404: "No encontramos el comprobante.",
  409: "El comprobante no está disponible en PDF.",
};

export function DescargarComprobante({ id }: { id: number }) {
  const ocupado = useRef(false);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState("");

  async function descargar() {
    if (ocupado.current) return;
    ocupado.current = true;
    setDescargando(true);
    setError("");
    try {
      const respuesta = await fetch(`/api/comprobantes/${id}/pdf`, { cache: "no-store" });
      if (!respuesta.ok) {
        setError(mensajes[respuesta.status] ?? "No pudimos descargar el PDF. Intenta de nuevo.");
        return;
      }
      const url = URL.createObjectURL(await respuesta.blob());
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = respuesta.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1]
        ?? `comprobante-${id}.pdf`;
      document.body.append(enlace);
      enlace.click();
      enlace.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("No pudimos descargar el PDF. Intenta de nuevo.");
    } finally {
      ocupado.current = false;
      setDescargando(false);
    }
  }

  return (
    <div>
      <Button type="button" onClick={descargar} disabled={descargando}>
        {descargando ? "Descargando…" : "Descargar comprobante PDF"}
      </Button>
      {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}
