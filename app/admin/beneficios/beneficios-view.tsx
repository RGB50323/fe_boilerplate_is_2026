"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  deshabilitarBeneficio,
  guardarBeneficio,
  listarBeneficios,
  obtenerBeneficio,
} from "@/app/actions/beneficios";
import { FormularioBeneficio } from "@/components/beneficios/formulario-beneficio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Paginacion } from "@/components/ui/paginacion";
import { Select } from "@/components/ui/select";
import { Toast } from "@/components/ui/toast";
import type { Resultado } from "@/lib/api";
import {
  ESTADOS_BENEFICIO,
  type Beneficio,
  type DatosBeneficio,
  type EstadoBeneficio,
} from "@/lib/beneficios";
import type { Pagina } from "@/lib/paginacion";
import { LOGIN_BENEFICIOS } from "@/lib/roles";

type Fallo = Extract<Resultado<never>, { ok: false }>;
type Filtro = EstadoBeneficio | "";
type Dialogo =
  | { tipo: "nuevo" }
  | { tipo: "detalle" | "editar"; id: number; resultado?: Resultado<Beneficio> }
  | { tipo: "baja"; beneficio: Beneficio; error?: Fallo };

const ACCION =
  "rounded px-2 py-2 text-sm underline underline-offset-4 hover:text-orange-300 focus-visible:outline-2 focus-visible:outline-orange-400";
const CANCELAR = "bg-zinc-200 hover:bg-white";
const NOMBRE_AUSENTE = "Platillo eliminado";
const FORMATO_INSTANTE = new Intl.DateTimeFormat("es-SV", {
  timeZone: "America/El_Salvador",
  dateStyle: "medium",
  timeStyle: "short",
});

async function ejecutar<T>(
  operacion: Promise<Resultado<T>>,
): Promise<Resultado<T>> {
  try {
    return await operacion;
  } catch {
    return {
      ok: false,
      error: "No se pudo conectar con el servidor. Intenta de nuevo.",
    };
  }
}

function Estado({ estado }: { estado: EstadoBeneficio }) {
  const { etiqueta, variante } = ESTADOS_BENEFICIO[estado];
  return <Badge variant={variante}>{etiqueta}</Badge>;
}

function AccesoSesion() {
  return (
    <Link href={LOGIN_BENEFICIOS} className="font-medium underline">
      Iniciar sesión
    </Link>
  );
}

function MensajeError({ fallo }: { fallo: Fallo }) {
  return (
    <div role="alert" className="text-sm text-red-200">
      <p>{fallo.error}</p>
      {fallo.sinSesion && <AccesoSesion />}
    </div>
  );
}

function Detalle({ beneficio }: { beneficio: Beneficio }) {
  const mostrarInstante = (fecha: string | null) =>
    fecha ? FORMATO_INSTANTE.format(new Date(fecha)) : "—";
  const filas = [
    ["ID", beneficio.id],
    [
      "Platillo",
      beneficio.platillo
        ? `#${beneficio.platillo.id} · ${beneficio.platillo.nombre}`
        : NOMBRE_AUSENTE,
    ],
    ["Nombre", beneficio.nombre ?? "—"],
    ["Descripción", beneficio.descripcion ?? "—"],
    ["Costo", `${beneficio.costoPuntos} puntos`],
    ["Vigencia desde", beneficio.vigenteDesde],
    ["Vigencia hasta", beneficio.vigenteHasta],
    ["Estado", <Estado key="estado" estado={beneficio.estado} />],
    ["Fecha de creación", mostrarInstante(beneficio.creadoEn)],
    ["Última modificación", mostrarInstante(beneficio.modificadoEn)],
    ["Fecha de deshabilitación", mostrarInstante(beneficio.deshabilitadoEn)],
  ] as const;
  return (
    <>
      {!beneficio.platillo && (
        <p className="mb-3 text-sm text-zinc-300">
          El platillo asociado fue eliminado. Se conserva este registro por
          motivos históricos.
        </p>
      )}
      <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 text-sm">
        {filas.map(([etiqueta, valor]) => (
          <div key={etiqueta} className="contents">
            <dt className="text-zinc-400">{etiqueta}</dt>
            <dd className="break-words">{valor}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

export function BeneficiosView({
  reglaAcumulacion,
  inicial,
}: {
  reglaAcumulacion?: React.ReactNode;
  inicial: Resultado<Pagina<Beneficio>>;
}) {
  const [resultado, setResultado] = useState(inicial);
  const [filtro, setFiltro] = useState<Filtro>("");
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [dialogo, setDialogo] = useState<Dialogo>();
  const [bajando, setBajando] = useState(false);
  const [aviso, setAviso] = useState<{
    mensaje: string;
    variante: "success" | "error";
  }>();
  const solicitudLista = useRef(0);
  const solicitudDetalle = useRef(0);
  const operacionEnCurso = useRef(false);

  async function cargar(paginaPedida: number, estado: Filtro) {
    const actual = ++solicitudLista.current;
    setCargando(true);
    setPagina(paginaPedida);
    const respuesta = await ejecutar(
      listarBeneficios(paginaPedida, estado || undefined),
    );
    if (actual !== solicitudLista.current) return;
    if (
      respuesta.ok &&
      respuesta.datos.totalPaginas > 0 &&
      paginaPedida > respuesta.datos.totalPaginas
    ) {
      await cargar(respuesta.datos.totalPaginas, estado);
      return;
    }
    setResultado(respuesta);
    setCargando(false);
  }

  function cerrar() {
    if (operacionEnCurso.current) return;
    solicitudDetalle.current++;
    setDialogo(undefined);
  }

  async function abrirRegistro(tipo: "detalle" | "editar", id: number) {
    const actual = ++solicitudDetalle.current;
    setDialogo({ tipo, id });
    const respuesta = await ejecutar(obtenerBeneficio(id));
    if (actual !== solicitudDetalle.current) return;
    if (
      tipo === "editar" &&
      respuesta.ok &&
      respuesta.datos.estado === "DESHABILITADO"
    ) {
      setDialogo({ tipo: "detalle", id, resultado: respuesta });
      setAviso({
        mensaje: "Este beneficio ya está deshabilitado y no puede editarse.",
        variante: "error",
      });
      void cargar(pagina, filtro);
      return;
    }
    setDialogo({ tipo, id, resultado: respuesta });
  }

  function terminar(
    mensaje: string,
    variante: "success" | "error",
    paginaDestino = pagina,
  ) {
    cerrar();
    setAviso({ mensaje, variante });
    void cargar(paginaDestino, filtro);
  }

  async function guardar(
    datos: DatosBeneficio,
    id?: number,
  ): Promise<Fallo | undefined> {
    operacionEnCurso.current = true;
    const respuesta = await ejecutar(guardarBeneficio(datos, id)).finally(
      () => {
        operacionEnCurso.current = false;
      },
    );
    if (respuesta.ok) {
      terminar(
        id === undefined ? "Beneficio creado." : "Beneficio actualizado.",
        "success",
        id === undefined ? 1 : pagina,
      );
    } else if (respuesta.estado === 409) {
      terminar(respuesta.error, "error");
    } else {
      return respuesta;
    }
  }

  async function darDeBaja(beneficio: Beneficio) {
    if (operacionEnCurso.current) return;
    operacionEnCurso.current = true;
    setBajando(true);
    setDialogo({ tipo: "baja", beneficio });
    const respuesta = await ejecutar(deshabilitarBeneficio(beneficio.id));
    operacionEnCurso.current = false;
    setBajando(false);
    if (respuesta.ok)
      terminar("Beneficio deshabilitado definitivamente.", "success");
    else if (respuesta.estado === 409) terminar(respuesta.error, "error");
    else setDialogo({ tipo: "baja", beneficio, error: respuesta });
  }

  return (
    <main className="grid gap-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Gestión de beneficios</h1>
          <p className="mt-2 text-zinc-400">
            Administra las recompensas disponibles para el programa de puntos.
          </p>
        </div>
        <Button onClick={() => setDialogo({ tipo: "nuevo" })}>
          Agregar beneficio
        </Button>
      </div>
      {reglaAcumulacion}
      <div className="grid w-full gap-1 sm:max-w-xs">
        <label htmlFor="beneficios-estado" className="text-sm text-zinc-300">
          Estado
        </label>
        <Select
          id="beneficios-estado"
          value={filtro}
          onChange={(e) => {
            const estado = e.target.value as Filtro;
            setFiltro(estado);
            void cargar(1, estado);
          }}
        >
          <option value="">Todos</option>
          {Object.entries(ESTADOS_BENEFICIO).map(([estado, { filtro }]) => (
            <option key={estado} value={estado}>
              {filtro}
            </option>
          ))}
        </Select>
      </div>
      <section aria-label="Catálogo de beneficios" aria-busy={cargando}>
        {cargando ? (
          <p
            role="status"
            className="rounded-xl border border-zinc-800 p-6 text-zinc-300"
          >
            Cargando beneficios…
          </p>
        ) : !resultado.ok ? (
          <EmptyState mensaje={resultado.error} variante="error">
            {resultado.sinSesion ? (
              <AccesoSesion />
            ) : (
              <Button onClick={() => void cargar(pagina, filtro)}>
                Reintentar
              </Button>
            )}
          </EmptyState>
        ) : resultado.datos.datos.length === 0 ? (
          <EmptyState
            mensaje={
              filtro
                ? "No hay beneficios para este estado."
                : "No hay beneficios registrados."
            }
          />
        ) : (
          <>
            <div
              role="region"
              aria-label="Tabla de beneficios"
              tabIndex={0}
              className="overflow-x-auto rounded-xl border border-zinc-800 bg-[#18181b] focus-visible:outline-2 focus-visible:outline-orange-400"
            >
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  Beneficios del programa de puntos
                </caption>
                <thead className="bg-zinc-900 text-zinc-300">
                  <tr>
                    {[
                      "ID",
                      "Platillo",
                      "Costo",
                      "Inicio",
                      "Fin",
                      "Estado",
                      "Acciones",
                    ].map((texto) => (
                      <th
                        key={texto}
                        scope="col"
                        className="px-4 py-3 font-medium"
                      >
                        {texto}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {resultado.datos.datos.map((beneficio) => (
                    <tr key={beneficio.id}>
                      <td className="px-4 py-3 tabular-nums">{beneficio.id}</td>
                      <th
                        scope="row"
                        className="min-w-36 px-4 py-3 text-left font-medium"
                      >
                        {beneficio.nombre ?? NOMBRE_AUSENTE}
                      </th>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                        {beneficio.costoPuntos} puntos
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                        {beneficio.vigenteDesde}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                        {beneficio.vigenteHasta}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Estado estado={beneficio.estado} />
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex flex-wrap">
                          <button
                            type="button"
                            className={ACCION}
                            onClick={() =>
                              void abrirRegistro("detalle", beneficio.id)
                            }
                          >
                            Ver detalle
                          </button>
                          {beneficio.estado !== "DESHABILITADO" && (
                            <>
                              <button
                                type="button"
                                className={ACCION}
                                onClick={() =>
                                  void abrirRegistro("editar", beneficio.id)
                                }
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className={ACCION}
                                onClick={() =>
                                  setDialogo({ tipo: "baja", beneficio })
                                }
                              >
                                Deshabilitar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacion
              className="mt-5"
              pagina={resultado.datos.pagina}
              totalPaginas={resultado.datos.totalPaginas}
              onCambiar={(nueva) => void cargar(nueva, filtro)}
            />
          </>
        )}
      </section>
      {dialogo && dialogo.tipo !== "baja" && (
        <Modal
          abierto
          onCerrar={cerrar}
          titulo={
            dialogo.tipo === "nuevo"
              ? "Agregar beneficio"
              : dialogo.tipo === "detalle"
                ? "Detalle del beneficio"
                : "Editar beneficio"
          }
        >
          {dialogo.tipo === "nuevo" ? (
            <FormularioBeneficio
              key="nuevo"
              onCerrar={cerrar}
              onGuardar={guardar}
            />
          ) : dialogo.tipo === "editar" && dialogo.resultado?.ok ? (
            <FormularioBeneficio
              key={dialogo.id}
              beneficio={dialogo.resultado.datos}
              onCerrar={cerrar}
              onGuardar={(datos) => guardar(datos, dialogo.id)}
            />
          ) : (
            <>
              {!dialogo.resultado ? (
                <p role="status">Cargando beneficio…</p>
              ) : dialogo.resultado.ok ? (
                <Detalle beneficio={dialogo.resultado.datos} />
              ) : (
                <MensajeError fallo={dialogo.resultado} />
              )}
              <div className="mt-5 flex flex-wrap justify-end gap-3">
                {dialogo.resultado &&
                  !dialogo.resultado.ok &&
                  !dialogo.resultado.sinSesion && (
                    <Button
                      onClick={() =>
                        void abrirRegistro(dialogo.tipo, dialogo.id)
                      }
                    >
                      Reintentar
                    </Button>
                  )}
                <Button className={CANCELAR} onClick={cerrar}>
                  Cerrar
                </Button>
              </div>
            </>
          )}
        </Modal>
      )}
      {dialogo?.tipo === "baja" && (
        <Modal
          abierto
          onCerrar={cerrar}
          titulo="Deshabilitar beneficio"
          descripcion="¿Estás seguro de que deseas deshabilitar este beneficio? Esta acción es permanente y no se podrá reactivar."
        >
          <p className="break-words font-semibold">
            {dialogo.beneficio.nombre ?? NOMBRE_AUSENTE} ·{" "}
            {dialogo.beneficio.costoPuntos} puntos
          </p>
          {dialogo.error && <MensajeError fallo={dialogo.error} />}
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <Button className={CANCELAR} onClick={cerrar} disabled={bajando}>
              Cancelar
            </Button>
            <Button
              onClick={() => void darDeBaja(dialogo.beneficio)}
              disabled={bajando}
            >
              {bajando ? "Deshabilitando…" : "Deshabilitar definitivamente"}
            </Button>
          </div>
        </Modal>
      )}
      {aviso && (
        <Toast key={aviso.mensaje} variant={aviso.variante}>
          {aviso.mensaje}
        </Toast>
      )}
    </main>
  );
}
