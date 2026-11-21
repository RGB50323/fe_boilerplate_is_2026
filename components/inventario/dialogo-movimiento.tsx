"use client";

import { useState, type FormEvent } from "react";
import { FieldError } from "@/components/ui/error";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  MOTIVO_MAX,
  formatoCantidad,
  validarMovimiento,
  type ErroresMovimiento,
  type Insumo,
  type TipoMovimiento,
  type ValoresMovimiento,
} from "@/lib/inventario";

export type RespuestaMovimiento = { errores?: ErroresMovimiento; error?: string } | undefined;

type Props = {
  insumo: Insumo | null;
  onCerrar: () => void;
  onRegistrar: (insumo: Insumo, valores: ValoresMovimiento) => Promise<RespuestaMovimiento>;
};

const ETIQUETA = "text-sm font-medium text-orange-200";
const TIPOS: { valor: TipoMovimiento; texto: string; activo: string }[] = [
  { valor: "ENTRADA", texto: "Entrada", activo: "peer-checked:bg-green-900 peer-checked:text-green-50" },
  { valor: "SALIDA", texto: "Salida", activo: "peer-checked:bg-red-900 peer-checked:text-red-50" },
];

export function DialogoMovimiento({ insumo, ...resto }: Props) {
  if (!insumo) return null;
  return <Contenido key={insumo.id} insumo={insumo} {...resto} />;
}

function Contenido({ insumo, onCerrar, onRegistrar }: Props & { insumo: Insumo }) {
  const [valores, setValores] = useState<ValoresMovimiento>({
    tipo: "ENTRADA",
    cantidad: "",
    motivo: "",
  });
  const [errores, setErrores] = useState<ErroresMovimiento>({});
  const [error, setError] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  function cambiar<K extends keyof ValoresMovimiento>(campo: K, valor: ValoresMovimiento[K]) {
    setValores((actuales) => ({ ...actuales, [campo]: valor }));
    const conError = campo === "motivo" ? "motivo" : "cantidad";
    setErrores((actuales) => ({ ...actuales, [conError]: undefined }));
    setError(undefined);
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    const invalidos = validarMovimiento(valores);
    setErrores(invalidos);
    setError(undefined);
    if (Object.keys(invalidos).length > 0) return;

    setEnviando(true);
    const respuesta = await onRegistrar(insumo, valores);
    if (!respuesta) return;
    setEnviando(false);
    setErrores(respuesta.errores ?? {});
    setError(respuesta.error);
  }

  return (
    <Modal
      abierto
      onCerrar={() => !enviando && onCerrar()}
      titulo="Registrar movimiento"
      descripcion={`${insumo.nombre} · existencia actual ${formatoCantidad(insumo.cantidad, insumo.unidad)} ${insumo.unidad}`}
      className="sm:max-w-2xl"
    >
      <form onSubmit={enviar} noValidate className="grid gap-5">
        <fieldset className="grid gap-2" disabled={enviando}>
          <legend className={`${ETIQUETA} mb-2`}>Tipo *</legend>
          <div className="flex flex-wrap gap-3">
            {TIPOS.map((tipo) => (
              <label key={tipo.valor} className="cursor-pointer">
                <input
                  type="radio"
                  name="tipo-movimiento"
                  value={tipo.valor}
                  checked={valores.tipo === tipo.valor}
                  onChange={() => cambiar("tipo", tipo.valor)}
                  className="peer sr-only"
                />
                <span
                  className={`inline-flex min-h-11 items-center rounded-full bg-zinc-700 px-6 text-base text-zinc-100 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-orange-400 ${tipo.activo}`}
                >
                  {tipo.texto}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid content-start gap-1">
            <label htmlFor="cantidad-movimiento" className={ETIQUETA}>
              Cantidad ({insumo.unidad}) *
            </label>
            <Input
              id="cantidad-movimiento"
              inputMode="decimal"
              autoComplete="off"
              value={valores.cantidad}
              onChange={(e) => cambiar("cantidad", e.target.value)}
              placeholder="Mayor a 0"
              aria-invalid={Boolean(errores.cantidad)}
              aria-describedby={errores.cantidad ? "cantidad-movimiento-error" : undefined}
              disabled={enviando}
            />
            <FieldError id="cantidad-movimiento-error" message={errores.cantidad} />
          </div>

          <div className="grid content-start gap-1">
            <label htmlFor="motivo-movimiento" className={ETIQUETA}>
              Motivo *
            </label>
            <Input
              id="motivo-movimiento"
              autoComplete="off"
              maxLength={MOTIVO_MAX}
              value={valores.motivo}
              onChange={(e) => cambiar("motivo", e.target.value)}
              placeholder="Ej. compra a proveedor"
              aria-invalid={Boolean(errores.motivo)}
              aria-describedby={errores.motivo ? "motivo-movimiento-error" : undefined}
              disabled={enviando}
            />
            <FieldError id="motivo-movimiento-error" message={errores.motivo} />
          </div>
        </div>

        <div role="alert">{error && <p className="text-sm text-red-400">{error}</p>}</div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCerrar}
            disabled={enviando}
            className="min-h-11 cursor-pointer rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#101012] transition-colors hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando}
            aria-busy={enviando}
            className="min-h-11 cursor-pointer rounded-full bg-[#FF7A1A] px-5 py-2 text-sm font-semibold text-[#101012] transition-colors hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? "Registrando..." : "Registrar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
