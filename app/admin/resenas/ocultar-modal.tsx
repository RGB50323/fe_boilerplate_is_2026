"use client";

import { useState, type FormEvent } from "react";
import { ocultarResena } from "@/app/actions/resenas";
import { FieldError } from "@/components/ui/error";
import { Modal } from "@/components/ui/modal";
import {
  MOTIVOS,
  type MotivoOcultacion,
  type ResenaModeracion,
} from "@/lib/resenas";

type Props = {
  resena: ResenaModeracion | null;
  onCerrar: () => void;
  onOcultada: (resena: ResenaModeracion) => void;
  onYaOculta: (mensaje: string) => void;
  onSinSesion: () => void;
};

export function OcultarModal({ resena, ...props }: Props) {
  if (!resena) return null;
  // key: el motivo arranca vacío para cada reseña
  return <Contenido key={resena.id} resena={resena} {...props} />;
}

function Contenido({
  resena,
  onCerrar,
  onOcultada,
  onYaOculta,
  onSinSesion,
}: Props & { resena: ResenaModeracion }) {
  const [motivo, setMotivo] = useState<MotivoOcultacion>();
  const [error, setError] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  async function confirmar(e: FormEvent) {
    e.preventDefault();
    if (!motivo || enviando) return;
    setEnviando(true);
    setError(undefined);
    const r = await ocultarResena(resena.id, motivo).catch(() => ({
      ok: false as const,
      error: "No pudimos ocultar la reseña. Intenta de nuevo.",
    }));
    setEnviando(false);

    if (r.ok) onOcultada(r.resena);
    else if ("sinSesion" in r && r.sinSesion) onSinSesion();
    else if ("yaOculta" in r && r.yaOculta) onYaOculta(r.error);
    else setError(r.error);
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo="Ocultar reseña"
      descripcion={`${resena.platillo} · ${resena.cliente}. Dejará de verse en el menú y no contará en el promedio.`}
    >
      <form onSubmit={confirmar} className="grid gap-5" noValidate>
        <fieldset disabled={enviando} className="grid gap-2">
          <legend className="mb-2 text-sm text-zinc-300">Motivo</legend>
          {MOTIVOS.map((m) => (
            <label
              key={m.valor}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-zinc-700 px-4 has-checked:border-[#FF7A1A] has-checked:bg-[#FF7A1A]/10"
            >
              <input
                type="radio"
                name="motivo"
                value={m.valor}
                checked={motivo === m.valor}
                onChange={() => setMotivo(m.valor)}
                className="accent-[#FF7A1A]"
              />
              {m.texto}
            </label>
          ))}
        </fieldset>

        <FieldError id="error-ocultar" message={error} />

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCerrar}
            disabled={enviando}
            className="cursor-pointer rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#101012] transition-colors hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!motivo || enviando}
            className="cursor-pointer rounded-full bg-[#FF7A1A] px-5 py-2 text-sm font-semibold text-[#101012] transition-colors hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? "Ocultando..." : "Confirmar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
