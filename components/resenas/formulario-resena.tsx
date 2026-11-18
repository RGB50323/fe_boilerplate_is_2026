"use client";

import { useState, type FormEvent } from "react";
import { publicarResena } from "@/app/actions/resenas";
import { FieldError } from "@/components/ui/error";
import { Modal } from "@/components/ui/modal";
import { MAX_COMENTARIO, type PlatilloPendienteResena } from "@/lib/resenas";
import { SelectorEstrellas } from "./selector-estrellas";

type Props = {
  platillo: PlatilloPendienteResena | null;
  onCerrar: () => void;
  // Se llama al publicar o si el backend dice que ya estaba reseñado
  onPublicada: (platillo: PlatilloPendienteResena, mensaje: string) => void;
  onSinSesion: () => void;
};

export function FormularioResena({ platillo, ...props }: Props) {
  if (!platillo) return null;
  // key: el formulario arranca limpio para cada platillo
  return (
    <Contenido
      key={`${platillo.pedidoId}-${platillo.platilloId}`}
      platillo={platillo}
      {...props}
    />
  );
}

function Contenido({
  platillo,
  onCerrar,
  onPublicada,
  onSinSesion,
}: Props & { platillo: PlatilloPendienteResena }) {
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  const largo = comentario.trim().length;
  const excedido = largo > MAX_COMENTARIO;
  const puedeEnviar = estrellas >= 1 && !excedido && !enviando;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!puedeEnviar) return;
    setEnviando(true);
    setError(undefined);
    const resultado = await publicarResena({
      pedidoId: platillo.pedidoId,
      platilloId: platillo.platilloId,
      estrellas,
      comentario,
    }).catch(() => ({
      ok: false as const,
      error: "No pudimos publicar la reseña. Intenta de nuevo.",
    }));
    setEnviando(false);

    if (resultado.ok) {
      onPublicada(platillo, resultado.mensaje);
    } else if ("sinSesion" in resultado && resultado.sinSesion) {
      onSinSesion();
    } else if ("yaResenado" in resultado && resultado.yaResenado) {
      onPublicada(platillo, resultado.error);
    } else {
      setError(resultado.error);
    }
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={`Calificar ${platillo.nombre}`}
      descripcion={`Pedido ${platillo.numero ?? `#${platillo.pedidoId}`} · ${platillo.sucursal}`}
    >
      <form onSubmit={enviar} className="grid gap-5" noValidate>
        <SelectorEstrellas
          valor={estrellas}
          onCambiar={setEstrellas}
          disabled={enviando}
        />

        <div className="grid gap-1">
          <label htmlFor="comentario-resena" className="text-sm text-zinc-300">
            Comentario (opcional)
          </label>
          <textarea
            id="comentario-resena"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={4}
            disabled={enviando}
            aria-invalid={excedido}
            aria-describedby="contador-resena"
            placeholder="Cuéntanos qué te pareció"
            className="w-full resize-none rounded-lg border border-zinc-700 bg-[#262626] px-4 py-3 text-base text-zinc-100 outline-none placeholder:text-zinc-400 focus:border-[#FF7A1A] focus:ring-1 focus:ring-[#FF7A1A] disabled:opacity-50 aria-invalid:border-red-500"
          />
          <p
            id="contador-resena"
            aria-live="polite"
            className={`text-right text-sm tabular-nums ${excedido ? "text-red-300" : "text-zinc-400"}`}
          >
            {largo}/{MAX_COMENTARIO}
            {excedido &&
              " · El comentario no puede superar los 500 caracteres."}
          </p>
        </div>

        <FieldError id="error-resena" message={error} />

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
            disabled={!puedeEnviar}
            className="cursor-pointer rounded-full bg-[#FF7A1A] px-5 py-2 text-sm font-semibold text-[#101012] transition-colors hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? "Publicando..." : "Publicar reseña"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
