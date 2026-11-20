import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Resultado } from "@/lib/api";

export function ErrorLealtad({ fallo, reintentar }: {
  fallo: Extract<Resultado<unknown>, { ok: false }>;
  reintentar?: () => void;
}) {
  return (
    <div role="alert" className="rounded-xl border border-red-900/60 bg-red-950/20 p-4 text-sm text-red-200">
      <p>{fallo.error}</p>
      {fallo.sinSesion ? (
        <Link href="/login" className="mt-2 inline-block underline">Iniciar sesión</Link>
      ) : reintentar && (
        <Button onClick={reintentar} className="mt-3 px-4 py-2 text-sm">Reintentar</Button>
      )}
    </div>
  );
}

