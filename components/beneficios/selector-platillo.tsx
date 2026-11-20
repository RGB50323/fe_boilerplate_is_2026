"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buscarPlatillosBeneficio } from "@/app/actions/beneficios";
import { FieldError } from "@/components/ui/error";
import { Input } from "@/components/ui/input";
import { Paginacion } from "@/components/ui/paginacion";
import type { Resultado } from "@/lib/api";
import type { PlatilloBeneficio } from "@/lib/beneficios";
import type { Pagina } from "@/lib/paginacion";
import { LOGIN_BENEFICIOS } from "@/lib/roles";

type Props = {
  platillo: PlatilloBeneficio | null;
  onElegir: (platillo: PlatilloBeneficio) => void;
  deshabilitado: boolean;
  error?: string;
};

export function SelectorPlatillo({
  platillo,
  onElegir,
  deshabilitado,
  error,
}: Props) {
  const [buscar, setBuscar] = useState("");
  const [pagina, setPagina] = useState(1);
  const [intento, setIntento] = useState(0);
  const [respuesta, setRespuesta] = useState<{
    clave: string;
    resultado: Resultado<Pagina<PlatilloBeneficio>>;
  }>();
  const termino = buscar.trim();
  const clave = JSON.stringify([termino, pagina, intento]);
  const resultado =
    respuesta?.clave === clave ? respuesta.resultado : undefined;

  useEffect(() => {
    let vigente = true;
    const temporizador = setTimeout(
      async () => {
        try {
          const resultado = await buscarPlatillosBeneficio(pagina, termino);
          if (vigente) setRespuesta({ clave, resultado });
        } catch {
          if (vigente)
            setRespuesta({
              clave,
              resultado: {
                ok: false,
                error: "No se pudo cargar el selector de platillos.",
              },
            });
        }
      },
      termino && pagina === 1 ? 250 : 0,
    );
    return () => {
      vigente = false;
      clearTimeout(temporizador);
    };
  }, [clave, pagina, termino]);

  return (
    <fieldset disabled={deshabilitado} className="grid min-w-0 gap-2">
      <legend className="mb-2 text-sm font-medium text-orange-200">
        Platillo *
      </legend>
      {platillo ? (
        <div className="break-words rounded-lg border border-orange-400/40 px-3 py-2">
          <p className="text-sm font-semibold">
            Seleccionado: {platillo.nombre}
          </p>
          {platillo.descripcion && (
            <p className="text-sm text-zinc-300">{platillo.descripcion}</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-zinc-400">
          Selecciona un platillo del catálogo.
        </p>
      )}
      <label htmlFor="beneficio-buscar-platillo" className="text-sm">
        Buscar platillos
      </label>
      <Input
        id="beneficio-buscar-platillo"
        type="search"
        maxLength={120}
        value={buscar}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "beneficio-platillo-error" : undefined}
        onChange={(e) => {
          setBuscar(e.target.value);
          setPagina(1);
        }}
      />
      <FieldError id="beneficio-platillo-error" message={error} />
      {!resultado ? (
        <p role="status" className="text-sm text-zinc-400">
          Cargando platillos…
        </p>
      ) : !resultado.ok ? (
        <div role="alert" className="text-sm text-red-200">
          <p>{resultado.error}</p>
          {resultado.sinSesion ? (
            <Link className="underline" href={LOGIN_BENEFICIOS}>
              Iniciar sesión
            </Link>
          ) : (
            <button
              type="button"
              className="underline"
              onClick={() => setIntento(intento + 1)}
            >
              Reintentar búsqueda
            </button>
          )}
        </div>
      ) : (
        <>
          {resultado.datos.datos.length ? (
            <ul
              aria-label="Resultados de platillos"
              className="grid max-h-44 gap-1 overflow-y-auto rounded-lg border border-zinc-700 p-1"
            >
              {resultado.datos.datos.map((opcion) => (
                <li key={opcion.id}>
                  <button
                    type="button"
                    aria-label={opcion.nombre}
                    aria-describedby={
                      opcion.descripcion
                        ? `beneficio-opcion-${opcion.id}`
                        : undefined
                    }
                    aria-pressed={platillo?.id === opcion.id}
                    className="w-full break-words rounded-md px-3 py-2 text-left hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-orange-400 aria-pressed:bg-zinc-800"
                    onClick={() => onElegir(opcion)}
                  >
                    <span className="block text-sm font-medium">
                      {opcion.nombre}
                    </span>
                    {opcion.descripcion && (
                      <span
                        id={`beneficio-opcion-${opcion.id}`}
                        className="block text-sm text-zinc-300"
                      >
                        {opcion.descripcion}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p role="status" className="text-sm text-zinc-400">
              No hay platillos que coincidan.
            </p>
          )}
          <Paginacion
            etiqueta="Paginación de platillos"
            pagina={resultado.datos.pagina}
            totalPaginas={resultado.datos.totalPaginas}
            deshabilitado={deshabilitado}
            onCambiar={setPagina}
          />
        </>
      )}
    </fieldset>
  );
}
