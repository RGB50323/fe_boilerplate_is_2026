"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { listarPendientesResena } from "@/app/actions/resenas";
import { Toast } from "@/components/ui/toast";
import { formatoLimite, type PlatilloPendienteResena } from "@/lib/resenas";
import { FormularioResena } from "./formulario-resena";

const clave = (p: PlatilloPendienteResena) => `${p.pedidoId}-${p.platilloId}`;

// H21: platillos de mis pedidos pagados que todavía puedo calificar
export function PendientesResena() {
  const router = useRouter();
  const [pendientes, setPendientes] = useState<PlatilloPendienteResena[]>([]);
  const [seleccionado, setSeleccionado] =
    useState<PlatilloPendienteResena | null>(null);
  const [aviso, setAviso] = useState<{ id: number; texto: string }>();

  useEffect(() => {
    let vigente = true;
    listarPendientesResena()
      .then((r) => {
        // Sin sesión o error: Mis pedidos ya muestra su propio mensaje
        if (vigente && "pendientes" in r) setPendientes(r.pendientes);
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, []);

  function publicada(platillo: PlatilloPendienteResena, mensaje: string) {
    setPendientes((actuales) =>
      actuales.filter((p) => clave(p) !== clave(platillo)),
    );
    setSeleccionado(null);
    setAviso((a) => ({ id: (a?.id ?? 0) + 1, texto: mensaje }));
  }

  return (
    <>
      {pendientes.length > 0 && (
        <section
          aria-labelledby="titulo-pendientes-resena"
          className="mb-8 rounded-2xl border border-[#FF7A1A]/40 bg-[#1f1a17] p-5 sm:p-6"
        >
          <h2 id="titulo-pendientes-resena" className="text-xl sm:text-2xl">
            Califica lo que pediste
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Tienes 7 días después del pago para dejar tu reseña.
          </p>
          <ul className="mt-4 grid gap-3">
            {pendientes.map((p) => (
              <li
                key={clave(p)}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#18181b] p-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{p.nombre}</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {`${p.numero ?? `Pedido #${p.pedidoId}`} · ${p.sucursal} · hasta ${formatoLimite(p.disponibleHasta)}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSeleccionado(p)}
                  aria-label={`Calificar ${p.nombre}`}
                  className="min-h-11 cursor-pointer rounded-full bg-[#FF7A1A] px-5 text-sm font-semibold text-[#101012] transition-colors hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400"
                >
                  Calificar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <FormularioResena
        platillo={seleccionado}
        onCerrar={() => setSeleccionado(null)}
        onPublicada={publicada}
        onSinSesion={() => router.replace("/login?next=%2Fpedidos")}
      />

      <Toast key={aviso?.id} variant="success">
        {aviso?.texto}
      </Toast>
    </>
  );
}
