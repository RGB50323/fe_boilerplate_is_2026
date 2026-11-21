"use client";

import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ErrorLealtad } from "@/components/lealtad/error-lealtad";
import type { Resultado } from "@/lib/api";
import type { BeneficioAdministrativo, DatosBeneficio } from "@/lib/lealtad";
import { fechaParaSelector, limitesVigencia } from "./fechas-vigencia";

export function FormularioBeneficio({
  beneficio,
  ocupado,
  fallo,
  onCerrar,
  onGuardar,
}: {
  beneficio: BeneficioAdministrativo | null;
  ocupado: boolean;
  fallo?: Extract<Resultado<unknown>, { ok: false }>;
  onCerrar: () => void;
  onGuardar: (datos: DatosBeneficio) => void;
}) {
  const [error, setError] = useState("");
  const inicioGuardado = fechaParaSelector(beneficio?.vigenteDesde);
  const finGuardado = fechaParaSelector(beneficio?.vigenteHasta);
  const [inicio, setInicio] = useState(inicioGuardado);
  const [fin, setFin] = useState(finGuardado);
  const [hoy, setHoy] = useState(() => fechaParaSelector(new Date()));
  const inicioHistorico = Boolean(inicioGuardado && inicioGuardado < hoy);
  const conservaInicioHistorico = inicioHistorico && inicio === inicioGuardado;
  const inicioInvalido = Boolean(
    inicio && inicio !== inicioGuardado && inicio < hoy,
  );
  const finInvalido = Boolean(inicio && fin && fin < inicio);
  const mensajeInicio =
    "La fecha de inicio debe ser hoy o posterior en El Salvador.";
  const mensajeFin =
    "La fecha de fin debe ser igual o posterior a la de inicio.";

  function actualizarHoy() {
    setHoy(fechaParaSelector(new Date()));
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const campos = new FormData(evento.currentTarget);
    const nombre = String(campos.get("nombre")).trim();
    const descripcion = String(campos.get("descripcion")).trim();
    const costoPuntos = Number(campos.get("costoPuntos"));
    const diaActual = fechaParaSelector(new Date());
    setHoy(diaActual);
    const vigencia = limitesVigencia(inicio, fin);
    if (
      !nombre ||
      !Number.isInteger(costoPuntos) ||
      costoPuntos < 1 ||
      costoPuntos > 2147483647
    ) {
      setError("Escribe un nombre y un costo entero mayor que cero.");
      return;
    }
    if (!vigencia || (inicio !== inicioGuardado && inicio < diaActual)) {
      if (!inicio || !fin) setError("Elige ambas fechas de vigencia.");
      return;
    }
    setError("");
    onGuardar({
      nombre,
      descripcion: descripcion || null,
      costoPuntos,
      activo: campos.has("activo"),
      vigenteDesde:
        beneficio && inicio === inicioGuardado
          ? beneficio.vigenteDesde
          : vigencia.vigenteDesde,
      vigenteHasta:
        beneficio && fin === finGuardado
          ? beneficio.vigenteHasta
          : vigencia.vigenteHasta,
    });
  }

  return (
    <Modal
      abierto
      titulo={beneficio ? "Editar beneficio" : "Crear beneficio"}
      onCerrar={onCerrar}
    >
      {beneficio && <Badge className="mb-4">{beneficio.estado}</Badge>}
      <form onSubmit={enviar} className="grid gap-4">
        <fieldset disabled={ocupado} className="grid gap-4">
          <label className="grid gap-1">
            Nombre
            <Input
              name="nombre"
              required
              maxLength={80}
              defaultValue={beneficio?.nombre}
            />
          </label>
          <label className="grid gap-1">
            Descripción
            <textarea
              name="descripcion"
              maxLength={200}
              rows={2}
              defaultValue={beneficio?.descripcion ?? ""}
              className="rounded-lg border border-zinc-700 bg-[#262626] px-4 py-3 outline-none focus:border-orange-400"
            />
          </label>
          <label className="grid gap-1">
            Costo en puntos
            <Input
              name="costoPuntos"
              type="number"
              min={1}
              max={2147483647}
              step={1}
              required
              defaultValue={beneficio?.costoPuntos}
            />
          </label>
          <p className="text-sm text-zinc-400">
            Las fechas se interpretan en hora de El Salvador. Al elegir una
            nueva fecha, se aplica el inicio o el cierre de ese día.
          </p>
          <label className="grid gap-1">
            Inicio de vigencia
            <Input
              name="vigenteDesde"
              type="date"
              required
              value={inicio}
              min={hoy}
              readOnly={conservaInicioHistorico}
              onFocus={actualizarHoy}
              onChange={(evento) => {
                actualizarHoy();
                setInicio(evento.target.value);
              }}
              aria-invalid={inicioInvalido}
              aria-describedby={
                inicioInvalido ? "vigencia-error-inicio" : undefined
              }
            />
          </label>
          {inicioHistorico && (
            <div>
              <Button
                onClick={() => {
                  actualizarHoy();
                  setInicio(conservaInicioHistorico ? "" : inicioGuardado);
                }}
              >
                {conservaInicioHistorico
                  ? "Cambiar fecha de inicio"
                  : "Conservar inicio guardado"}
              </Button>
            </div>
          )}
          {inicioInvalido && (
            <p id="vigencia-error-inicio" role="alert" className="text-red-300">
              {mensajeInicio}
            </p>
          )}
          <label className="grid gap-1">
            Fin de vigencia
            <Input
              name="vigenteHasta"
              type="date"
              required
              value={fin}
              min={inicio || undefined}
              onFocus={actualizarHoy}
              onChange={(evento) => setFin(evento.target.value)}
              aria-invalid={finInvalido}
              aria-describedby={finInvalido ? "vigencia-error-fin" : undefined}
            />
          </label>
          {finInvalido && (
            <p id="vigencia-error-fin" role="alert" className="text-red-300">
              {mensajeFin}
            </p>
          )}
          <label className="flex items-center gap-2">
            <input
              name="activo"
              type="checkbox"
              defaultChecked={beneficio?.activo ?? true}
              className="size-4 accent-orange-400"
            />{" "}
            Activo
          </label>
        </fieldset>
        {error && (
          <p role="alert" className="text-red-300">
            {error}
          </p>
        )}
        {fallo && (
          <ErrorLealtad
            fallo={{
              ...fallo,
              error:
                fallo.errores?.vigenteDesde ??
                fallo.errores?.vigenteHasta ??
                fallo.error,
            }}
          />
        )}
        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            disabled={ocupado || inicioInvalido || finInvalido}
          >
            {ocupado ? "Guardando…" : "Guardar beneficio"}
          </Button>
          <Button
            className="border border-zinc-600 bg-transparent text-zinc-100 hover:bg-zinc-800"
            disabled={ocupado}
            onClick={onCerrar}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
