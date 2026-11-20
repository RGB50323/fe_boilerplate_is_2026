"use client";

import { useRef, useState } from "react";
import { consultarBeneficiosAdministrativos, deshabilitarBeneficio, guardarBeneficio } from "@/app/actions/lealtad";
import { ErrorLealtad } from "@/components/lealtad/error-lealtad";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import type { Resultado } from "@/lib/api";
import { ejecutarLealtad, type BeneficioAdministrativo, type DatosBeneficio } from "@/lib/lealtad";
import { fechaVigencia } from "./fechas-vigencia";
import { FormularioBeneficio } from "./formulario-beneficio";

type Dialogo = { tipo: "formulario"; beneficio: BeneficioAdministrativo | null } |
  { tipo: "deshabilitar"; beneficio: BeneficioAdministrativo };

export function AdminBeneficios({ inicial }: { inicial: Resultado<BeneficioAdministrativo[]> }) {
  const [lista, setLista] = useState(inicial);
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const [fallo, setFallo] = useState<Extract<Resultado<unknown>, { ok: false }>>();
  const [mensaje, setMensaje] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const bloqueo = useRef(false);

  function abrir(siguiente: Dialogo) {
    setMensaje("");
    setFallo(undefined);
    setDialogo(siguiente);
  }

  function cerrar() {
    if (!bloqueo.current) setDialogo(null);
  }

  async function actualizar() {
    if (bloqueo.current) return;
    bloqueo.current = true;
    setOcupado(true);
    setLista(await ejecutarLealtad(consultarBeneficiosAdministrativos()));
    setOcupado(false);
    bloqueo.current = false;
  }

  async function mutar(datos?: DatosBeneficio) {
    if (!dialogo || bloqueo.current || (dialogo.tipo === "formulario" && !datos)) return;
    bloqueo.current = true;
    setOcupado(true);
    setFallo(undefined);
    const resultado = await ejecutarLealtad(
      dialogo.tipo === "deshabilitar"
        ? deshabilitarBeneficio(dialogo.beneficio.id)
        : guardarBeneficio(datos!, dialogo.beneficio?.id),
    );
    if (resultado.ok) {
      setDialogo(null);
      setMensaje(dialogo.tipo === "deshabilitar" ? "Beneficio deshabilitado." : "Beneficio guardado.");
      setLista(await ejecutarLealtad(consultarBeneficiosAdministrativos()));
    } else {
      setFallo(resultado);
      if (resultado.estado === 404 || resultado.estado === 409) {
        setDialogo(null);
        setLista(await ejecutarLealtad(consultarBeneficiosAdministrativos()));
      }
    }
    setOcupado(false);
    bloqueo.current = false;
  }

  return (
    <section aria-labelledby="titulo-catalogo-admin" className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="titulo-catalogo-admin" className="text-2xl font-semibold">Catálogo de beneficios</h2>
        <Button disabled={ocupado || !lista.ok} onClick={() => abrir({ tipo: "formulario", beneficio: null })}>Crear beneficio</Button>
      </div>
      {mensaje && <p role="status" className="text-green-300">{mensaje}</p>}
      {fallo && !dialogo && <ErrorLealtad fallo={fallo} />}
      {ocupado && !dialogo && <p role="status">Actualizando catálogo…</p>}
      {!lista.ok ? <ErrorLealtad fallo={lista} reintentar={ocupado ? undefined : actualizar} /> :
        lista.datos.length === 0 ? <EmptyState mensaje="Todavía no hay beneficios." /> : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lista.datos.map((beneficio) => (
            <li key={beneficio.id} className="grid content-start gap-3 rounded-2xl border border-zinc-800 bg-[#18181b] p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="break-words text-xl font-semibold [overflow-wrap:anywhere]">{beneficio.nombre}</h3>
                <Badge variant={beneficio.estado === "ACTIVO" ? "success" : beneficio.estado === "DESHABILITADO" ? "danger" : "neutral"}>{beneficio.estado}</Badge>
              </div>
              {beneficio.descripcion && <p className="break-words text-zinc-300">{beneficio.descripcion}</p>}
              <p className="font-semibold text-orange-300">{beneficio.costoPuntos} puntos</p>
              <dl className="grid gap-1 text-sm text-zinc-400">
                <div><dt className="inline">Inicio: </dt><dd className="inline">{fechaVigencia.format(new Date(beneficio.vigenteDesde))}</dd></div>
                <div><dt className="inline">Fin: </dt><dd className="inline">{fechaVigencia.format(new Date(beneficio.vigenteHasta))}</dd></div>
              </dl>
              {!beneficio.deshabilitadoEn && beneficio.estado !== "DESHABILITADO" && (
                <div className="flex flex-wrap gap-2">
                  <Button className="px-4 py-2 text-sm" disabled={ocupado} aria-label={`Editar ${beneficio.nombre}`}
                    onClick={() => abrir({ tipo: "formulario", beneficio })}>Editar</Button>
                  <Button className="border border-red-800 bg-transparent px-4 py-2 text-sm text-red-200 hover:bg-red-950" disabled={ocupado}
                    aria-label={`Deshabilitar ${beneficio.nombre}`} onClick={() => abrir({ tipo: "deshabilitar", beneficio })}>Deshabilitar</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {dialogo?.tipo === "formulario" && (
        <FormularioBeneficio beneficio={dialogo.beneficio} ocupado={ocupado} fallo={fallo} onCerrar={cerrar} onGuardar={(datos) => void mutar(datos)} />
      )}
      {dialogo?.tipo === "deshabilitar" && (
        <Modal abierto titulo="Deshabilitar beneficio" descripcion={`Se deshabilitará ${dialogo.beneficio.nombre} de forma definitiva.`} onCerrar={cerrar}>
          <div className="grid gap-4">
            {fallo && <ErrorLealtad fallo={fallo} />}
            <div className="flex flex-wrap gap-3">
              <Button disabled={ocupado} onClick={() => void mutar()}>{ocupado ? "Deshabilitando…" : "Confirmar deshabilitación"}</Button>
              <Button className="border border-zinc-600 bg-transparent text-zinc-100 hover:bg-zinc-800" disabled={ocupado} onClick={cerrar}>Cancelar</Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

