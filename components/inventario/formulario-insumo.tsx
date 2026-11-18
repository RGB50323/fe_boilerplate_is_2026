"use client";

import { useState, type FormEvent } from "react";
import { FieldError } from "@/components/ui/error";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import {
  NOMBRE_MAX,
  UNIDADES,
  validarInsumo,
  type ErroresInsumo,
  type ValoresInsumo,
} from "@/lib/inventario";

export type RespuestaFormulario = { errores?: ErroresInsumo; error?: string } | undefined;

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  onGuardar: (valores: ValoresInsumo) => Promise<RespuestaFormulario>;
};

const ETIQUETA = "text-sm font-medium text-orange-200";
const VACIO: ValoresInsumo = { nombre: "", unidad: "", minimo: "" };

export function FormularioInsumo(props: Props) {
  if (!props.abierto) return null;
  return <Contenido {...props} />;
}

function Contenido({ onCerrar, onGuardar }: Props) {
  const [valores, setValores] = useState(VACIO);
  const [errores, setErrores] = useState<ErroresInsumo>({});
  const [error, setError] = useState<string>();
  const [guardando, setGuardando] = useState(false);

  function cambiar(campo: keyof ValoresInsumo, valor: string) {
    setValores((actuales) => ({ ...actuales, [campo]: valor }));
    setErrores((actuales) => ({ ...actuales, [campo]: undefined }));
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (guardando) return;
    const invalidos = validarInsumo(valores);
    setErrores(invalidos);
    setError(undefined);
    if (Object.keys(invalidos).length > 0) return;

    setGuardando(true);
    const respuesta = await onGuardar(valores);
    if (!respuesta) return;
    setGuardando(false);
    setErrores(respuesta.errores ?? {});
    setError(respuesta.error);
  }

  const descrito = (campo: keyof ValoresInsumo) =>
    errores[campo] ? `${campo}-insumo-error` : undefined;

  return (
    <Modal abierto onCerrar={() => !guardando && onCerrar()} titulo="Nuevo insumo" className="sm:max-w-2xl">
      <form onSubmit={enviar} noValidate className="grid gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid content-start gap-1">
            <label htmlFor="nombre-insumo" className={ETIQUETA}>
              Nombre *
            </label>
            <Input
              id="nombre-insumo"
              value={valores.nombre}
              maxLength={NOMBRE_MAX}
              autoComplete="off"
              onChange={(e) => cambiar("nombre", e.target.value)}
              placeholder="Nombre del insumo"
              aria-invalid={Boolean(errores.nombre)}
              aria-describedby={descrito("nombre")}
              disabled={guardando}
            />
            <FieldError id="nombre-insumo-error" message={errores.nombre} />
          </div>

          <div className="grid content-start gap-1">
            <label htmlFor="unidad-insumo" className={ETIQUETA}>
              Unidad *
            </label>
            <Select
              id="unidad-insumo"
              value={valores.unidad}
              onChange={(e) => cambiar("unidad", e.target.value)}
              aria-invalid={Boolean(errores.unidad)}
              aria-describedby={descrito("unidad")}
              disabled={guardando}
            >
              <option value="">lb, kg, l o unidad</option>
              {UNIDADES.map((unidad) => (
                <option key={unidad} value={unidad}>
                  {unidad}
                </option>
              ))}
            </Select>
            <FieldError id="unidad-insumo-error" message={errores.unidad} />
          </div>

          <div className="grid content-start gap-1">
            <label htmlFor="minimo-insumo" className={ETIQUETA}>
              Cantidad mínima *
            </label>
            <Input
              id="minimo-insumo"
              inputMode="decimal"
              autoComplete="off"
              value={valores.minimo}
              onChange={(e) => cambiar("minimo", e.target.value)}
              placeholder="Mayor o igual a 0"
              aria-invalid={Boolean(errores.minimo)}
              aria-describedby={descrito("minimo")}
              disabled={guardando}
            />
            <FieldError id="minimo-insumo-error" message={errores.minimo} />
          </div>
        </div>

        <div role="alert">{error && <p className="text-sm text-red-400">{error}</p>}</div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            className="min-h-11 cursor-pointer rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#101012] transition-colors hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            aria-busy={guardando}
            className="min-h-11 cursor-pointer rounded-full bg-[#FF7A1A] px-5 py-2 text-sm font-semibold text-[#101012] transition-colors hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
