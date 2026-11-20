"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { confirmarReglaPuntos, type ReglaPuntos } from "@/app/actions/beneficios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Resultado } from "@/lib/api";

export function ReglaAcumulacion({
  inicial,
}: {
  inicial: Resultado<{ regla: ReglaPuntos | null }>;
}) {
  const tituloId = useId();
  const campoId = useId();
  const errorId = useId();
  const [vigente, setVigente] = useState(inicial.ok ? inicial.datos.regla : null);
  const confirmado = vigente ? String(vigente.puntosPorDolar) : "";
  const [borrador, setBorrador] = useState(confirmado);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const enCurso = useRef(false);
  const valor = Number(borrador);
  const valido = Number.isInteger(valor) && valor >= 1 && valor <= 10;
  const cambio = valido ? valor !== vigente?.puntosPorDolar : borrador !== confirmado;
  const errorCampo = borrador !== "" && !valido;

  function editar(nuevo: string) {
    setBorrador(nuevo);
    setError("");
  }

  async function confirmar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!valido || !cambio || enCurso.current) return;
    enCurso.current = true;
    setGuardando(true);
    setError("");
    try {
      const respuesta = await confirmarReglaPuntos(valor);
      if (!respuesta.ok) {
        setError(respuesta.error);
        return;
      }
      setVigente(respuesta.datos.regla);
      setBorrador(String(respuesta.datos.regla.puntosPorDolar));
    } catch {
      setError("No se pudo confirmar la regla. Intenta de nuevo.");
    } finally {
      enCurso.current = false;
      setGuardando(false);
    }
  }

  return (
    <section aria-labelledby={tituloId} className="grid gap-4 rounded-xl border border-zinc-800 bg-[#18181b] p-5">
      <div>
        <h2 id={tituloId} className="text-xl font-semibold">Regla de acumulación</h2>
        <p className="mt-1 text-zinc-400">
          Configura cuántos puntos reciben los clientes por cada dólar gastado.
        </p>
      </div>
      {inicial.ok ? (
        <>
          <p aria-live="polite" className="text-sm text-zinc-300">
            {vigente ? `Valor vigente: ${vigente.puntosPorDolar} puntos por dólar.` : "Aún no hay una regla vigente."}
          </p>
          <form className="grid gap-3" onSubmit={confirmar} noValidate aria-busy={guardando}>
            <label htmlFor={campoId} className="text-sm text-zinc-300">Puntos por dólar</label>
            <div className="flex items-center gap-2">
              <Button aria-label="Disminuir puntos" disabled={guardando || !valido || valor === 1} onClick={() => editar(String(valor - 1))}>−</Button>
              <Input
                id={campoId}
                className="max-w-28 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                type="number"
                min={1}
                max={10}
                step={1}
                value={borrador}
                disabled={guardando}
                aria-invalid={errorCampo}
                aria-describedby={errorCampo ? errorId : undefined}
                onChange={(evento) => editar(evento.target.value)}
              />
              <Button aria-label="Aumentar puntos" disabled={guardando || !valido || valor === 10} onClick={() => editar(String(valor + 1))}>+</Button>
            </div>
            {errorCampo && <p id={errorId} className="text-sm text-rose-300">Ingresa un número entero del 1 al 10.</p>}
            {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <Button disabled={guardando || !cambio} onClick={() => editar(confirmado)}>Deshacer</Button>
              <Button type="submit" disabled={guardando || !cambio || !valido}>
                {guardando ? "Confirmando…" : "Confirmar"}
              </Button>
            </div>
          </form>
        </>
      ) : (
        <p role="alert" className="text-sm text-rose-300">{inicial.error}</p>
      )}
    </section>
  );
}
