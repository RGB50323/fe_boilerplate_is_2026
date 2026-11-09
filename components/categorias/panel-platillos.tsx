"use client";

import { useEffect, useState } from "react";
import {
  cambiarCategoriaDePlatillo,
  listarPlatillosDeCategoria,
} from "@/app/actions/categorias";
import { FieldError } from "@/components/ui/error";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import type { Categoria, PlatilloDeCategoria } from "@/lib/categorias";

type Props = {
  categoria: Categoria | null;
  destinos: Categoria[];
  onCerrar: () => void;
  onCambio: () => void;
};

export function PanelPlatillos({ categoria, ...resto }: Props) {
  if (!categoria) return null;
  return <Contenido key={categoria.id} categoria={categoria} {...resto} />;
}

function Contenido({
  categoria,
  destinos,
  onCerrar,
  onCambio,
}: Props & { categoria: Categoria }) {
  const [platillos, setPlatillos] = useState<PlatilloDeCategoria[] | null>(
    null,
  );
  const [error, setError] = useState<string>();
  const [moviendo, setMoviendo] = useState<number | null>(null);

  useEffect(() => {
    let activo = true;
    void listarPlatillosDeCategoria(categoria.id).then((resultado) => {
      if (!activo) return;
      if (resultado.ok) setPlatillos(resultado.datos);
      else setError(resultado.error);
    });
    return () => {
      activo = false;
    };
  }, [categoria.id]);

  async function mover(platillo: PlatilloDeCategoria, destinoId: number) {
    setMoviendo(platillo.id);
    setError(undefined);
    const resultado = await cambiarCategoriaDePlatillo(platillo.id, destinoId);
    setMoviendo(null);
    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    setPlatillos(
      (actuales) => actuales?.filter((p) => p.id !== platillo.id) ?? null,
    );
    onCambio();
  }

  const opciones = destinos.filter((d) => d.id !== categoria.id);

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={`Platillos de ${categoria.nombre}`}
      descripcion="Mueve un platillo a otra categoría activa."
    >
      <div className="grid gap-4">
        {platillos === null && !error && (
          <p role="status" className="text-zinc-400">
            Cargando platillos...
          </p>
        )}

        {platillos?.length === 0 && (
          <p role="status" className="text-zinc-400">
            Esta categoría no tiene platillos activos.
          </p>
        )}

        {platillos && platillos.length > 0 && (
          <ul className="grid gap-2">
            {platillos.map((platillo) => (
              <li
                key={platillo.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#2b2b2f] px-4 py-3"
              >
                <span>{platillo.nombre}</span>
                <div className="w-full sm:w-56">
                  <Select
                    aria-label={`Mover ${platillo.nombre} a otra categoría`}
                    value=""
                    disabled={moviendo === platillo.id || opciones.length === 0}
                    onChange={(e) => {
                      if (e.target.value) {
                        void mover(platillo, Number(e.target.value));
                      }
                    }}
                  >
                    <option value="">
                      {moviendo === platillo.id ? "Moviendo..." : "Mover a..."}
                    </option>
                    {opciones.map((destino) => (
                      <option key={destino.id} value={destino.id}>
                        {destino.nombre}
                      </option>
                    ))}
                  </Select>
                </div>
              </li>
            ))}
          </ul>
        )}

        <FieldError id="platillos-error" message={error} />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onCerrar}
            className="cursor-pointer rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#101012] transition-colors hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}
