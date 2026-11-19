"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { listarModeracion } from "@/app/actions/resenas";
import { Estrellas } from "@/components/resenas/estrellas";
import { Badge } from "@/components/ui/badge";
import { PageLoading } from "@/components/ui/page-loading";
import { Paginacion } from "@/components/ui/paginacion";
import { Toast } from "@/components/ui/toast";
import type { Pagina } from "@/lib/paginacion";
import {
  RESENA_OCULTADA,
  formatoFecha,
  textoMotivo,
  type EstadoResena,
  type ResenaModeracion,
} from "@/lib/resenas";
import { OcultarModal } from "./ocultar-modal";

const FILTROS: { valor?: EstadoResena; texto: string }[] = [
  { texto: "Todas" },
  { valor: "VISIBLE", texto: "Visibles" },
  { valor: "OCULTA", texto: "Ocultas" },
];

type Consulta = { pagina: number; estado?: EstadoResena; vuelta: number };

export function ModeracionView() {
  const router = useRouter();
  const [consulta, setConsulta] = useState<Consulta>({ pagina: 1, vuelta: 0 });
  const [datos, setDatos] = useState<Pagina<ResenaModeracion>>();
  const [error, setError] = useState<string>();
  const [cargando, setCargando] = useState(true);
  const [sinSesion, setSinSesion] = useState(false);
  const [seleccionada, setSeleccionada] = useState<ResenaModeracion | null>(
    null,
  );
  const [aviso, setAviso] = useState<{
    id: number;
    texto: string;
    variante: "success" | "error";
  }>();

  // Sesión vencida: al login (separado para no repetir la consulta)
  useEffect(() => {
    if (sinSesion) router.replace("/login?next=%2Fadmin%2Fresenas");
  }, [sinSesion, router]);

  useEffect(() => {
    let vigente = true;
    listarModeracion(consulta.pagina, consulta.estado)
      .then((r) => {
        if (!vigente) return;
        if ("pagina" in r) {
          setDatos(r.pagina);
          setError(undefined);
        } else if ("sinSesion" in r) {
          setSinSesion(true);
        } else {
          setDatos(undefined);
          setError(r.error);
        }
      })
      .catch(() => {
        if (vigente)
          setError("No pudimos cargar las reseñas. Intenta de nuevo.");
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [consulta]);

  function cambiar(cambios: Partial<Consulta>) {
    setCargando(true);
    setConsulta((c) => ({ ...c, ...cambios, vuelta: c.vuelta + 1 }));
  }

  function avisar(texto: string, variante: "success" | "error") {
    setAviso((a) => ({ id: (a?.id ?? 0) + 1, texto, variante }));
  }

  function ocultada(resena: ResenaModeracion) {
    setSeleccionada(null);
    avisar(RESENA_OCULTADA, "success");
    // En "Visibles" sale de la lista; en las demás se actualiza en su lugar
    if (consulta.estado === "VISIBLE") {
      cambiar({});
    } else {
      setDatos(
        (d) =>
          d && {
            ...d,
            datos: d.datos.map((r) => (r.id === resena.id ? resena : r)),
          },
      );
    }
  }

  function yaOculta(mensaje: string) {
    setSeleccionada(null);
    avisar(mensaje, "error");
    cambiar({});
  }

  return (
    <main className="py-8">
      <h1 className="text-3xl sm:text-5xl">Moderar reseñas</h1>
      <p className="mt-2 text-zinc-400">
        Las reseñas ocultas no se ven en el menú ni cuentan en el promedio.
      </p>

      <div
        role="group"
        aria-label="Filtrar por estado"
        className="mt-6 flex flex-wrap gap-2"
      >
        {FILTROS.map((f) => {
          const activo = consulta.estado === f.valor;
          return (
            <button
              key={f.texto}
              type="button"
              aria-pressed={activo}
              disabled={cargando}
              onClick={() => cambiar({ estado: f.valor, pagina: 1 })}
              className={`min-h-11 cursor-pointer rounded-full border px-5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400 disabled:cursor-not-allowed ${
                activo
                  ? "border-[#FF7A1A] bg-[#FF7A1A] text-[#101012]"
                  : "border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white"
              }`}
            >
              {f.texto}
            </button>
          );
        })}
      </div>

      <section aria-label="Reseñas" aria-busy={cargando} className="mt-6">
        {cargando ? (
          <PageLoading mensaje="Cargando reseñas…" />
        ) : error ? (
          <p
            role="alert"
            className="rounded-2xl border border-red-900/60 bg-red-950/20 p-7 text-red-200"
          >
            {error}
          </p>
        ) : datos && datos.datos.length === 0 ? (
          <p
            role="status"
            className="rounded-2xl border border-dashed border-zinc-700 px-6 py-12 text-center text-zinc-300"
          >
            {consulta.estado === "OCULTA"
              ? "No hay reseñas ocultas."
              : "No hay reseñas para mostrar."}
          </p>
        ) : datos ? (
          <>
            <ul className="grid gap-3">
              {datos.datos.map((r) => (
                <FilaResena
                  key={r.id}
                  resena={r}
                  onOcultar={() => setSeleccionada(r)}
                />
              ))}
            </ul>
            <Paginacion
              pagina={datos.pagina}
              totalPaginas={datos.totalPaginas}
              onCambiar={(pagina) => cambiar({ pagina })}
              etiqueta="Páginas de reseñas"
              className="mt-6"
            />
          </>
        ) : null}
      </section>

      <OcultarModal
        resena={seleccionada}
        onCerrar={() => setSeleccionada(null)}
        onOcultada={ocultada}
        onYaOculta={yaOculta}
        onSinSesion={() => setSinSesion(true)}
      />

      <Toast key={aviso?.id} variant={aviso?.variante}>
        {aviso?.texto}
      </Toast>
    </main>
  );
}

function FilaResena({
  resena,
  onOcultar,
}: {
  resena: ResenaModeracion;
  onOcultar: () => void;
}) {
  const oculta = resena.estado === "OCULTA";
  return (
    <li
      aria-label={`Reseña de ${resena.platillo}`}
      className={`rounded-2xl border p-5 ${oculta ? "border-zinc-800 bg-[#141416]" : "border-zinc-800 bg-[#18181b]"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-semibold">{resena.platillo}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-400">
            <Estrellas valor={resena.estrellas} />
            <span className="sr-only">{`${resena.estrellas} de 5 estrellas`}</span>
            <span>{formatoFecha(resena.fecha)}</span>
            <span>{resena.cliente}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={oculta ? "danger" : "success"}>
            {oculta ? "Oculta" : "Visible"}
          </Badge>
          {!oculta && (
            <button
              type="button"
              onClick={onOcultar}
              aria-label={`Ocultar reseña de ${resena.platillo} de ${resena.cliente}`}
              className="min-h-11 cursor-pointer rounded-full border border-zinc-600 px-5 text-sm font-semibold text-zinc-100 transition-colors hover:border-red-400 hover:text-red-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400"
            >
              Ocultar
            </button>
          )}
        </div>
      </div>
      <p
        className={`mt-3 ${resena.comentario ? "text-zinc-200" : "italic text-zinc-500"}`}
      >
        {resena.comentario ?? "Sin comentario"}
      </p>
      {resena.ocultacion && (
        <p className="mt-3 rounded-xl bg-red-950/20 px-4 py-3 text-sm text-red-200">
          {`Ocultada por ${resena.ocultacion.por} el ${formatoFecha(resena.ocultacion.fecha)} a las ${resena.ocultacion.hora} · Motivo: ${textoMotivo(resena.ocultacion.motivo)}`}
        </p>
      )}
    </li>
  );
}
