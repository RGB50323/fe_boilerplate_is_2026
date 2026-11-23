"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  consultarRegla,
  deshabilitarRegla,
  guardarRegla,
} from "@/app/actions/lealtad";
import { ErrorLealtad } from "@/components/lealtad/error-lealtad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Resultado } from "@/lib/api";
import { ejecutarLealtad, type ReglaPuntos } from "@/lib/lealtad";

export function EditorRegla({
  inicial,
}: {
  inicial: Resultado<ReglaPuntos | null>;
}) {
  const [regla, setRegla] = useState(inicial);
  const [borrador, setBorrador] = useState<string | null>(null);
  const [fallo, setFallo] =
    useState<Extract<Resultado<ReglaPuntos>, { ok: false }>>();
  const [ocupado, setOcupado] = useState(false);
  const [guardada, setGuardada] = useState(false);
  const [aviso, setAviso] = useState<string>();
  const [confirmandoBaja, setConfirmandoBaja] = useState(false);
  const bloqueo = useRef(false);
  const vigente = regla.ok ? regla.datos?.puntosPorDolar : undefined;
  const texto = borrador ?? (vigente === undefined ? "" : String(vigente));
  const valor = Number(texto);
  const valido = /^([1-9]|10)$/.test(texto);
  const cambio = valido && valor !== vigente;

  function editar(valor: string) {
    setGuardada(false);
    setAviso(undefined);
    setFallo(undefined);
    setBorrador(valor);
  }

  async function consultar() {
    if (bloqueo.current) return;
    bloqueo.current = true;
    setOcupado(true);
    setRegla(await ejecutarLealtad(consultarRegla()));
    setOcupado(false);
    bloqueo.current = false;
  }

  async function confirmar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (bloqueo.current || !regla.ok || !cambio) return;
    bloqueo.current = true;
    setOcupado(true);
    setFallo(undefined);
    const resultado = await ejecutarLealtad(guardarRegla(valor));
    if (resultado.ok) {
      setRegla(resultado);
      setBorrador(null);
      setGuardada(true);
      setAviso(undefined);
    } else setFallo(resultado);
    setOcupado(false);
    bloqueo.current = false;
  }

  // H20: sin regla las compras no acumulan puntos
  async function darDeBaja() {
    if (bloqueo.current) return;
    bloqueo.current = true;
    setOcupado(true);
    setFallo(undefined);
    setGuardada(false);
    const resultado = await ejecutarLealtad(deshabilitarRegla());
    if (resultado.ok) {
      setRegla({ ok: true, datos: null });
      setBorrador(null);
      setAviso("Regla deshabilitada. Las compras ya no acumulan puntos.");
    } else setFallo(resultado);
    setConfirmandoBaja(false);
    setOcupado(false);
    bloqueo.current = false;
  }

  return (
    <section
      aria-labelledby="titulo-regla"
      className="grid gap-4 rounded-2xl border border-zinc-800 bg-[#18181b] p-5 sm:p-7"
    >
      <h2 id="titulo-regla" className="text-2xl font-semibold">
        Regla de acumulación
      </h2>
      {!regla.ok ? (
        <>
          <ErrorLealtad
            fallo={regla}
            reintentar={ocupado ? undefined : consultar}
          />
          {ocupado && <p role="status">Cargando regla…</p>}
        </>
      ) : (
        <form className="grid gap-4" onSubmit={confirmar}>
          <label htmlFor="puntos-por-dolar">Puntos por dólar</label>
          {vigente === undefined && (
            <p className="text-sm text-zinc-400">
              Todavía no hay una regla vigente.
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button
              aria-label="Restar un punto"
              disabled={ocupado || !valido || valor <= 1}
              onClick={() => editar(String(valor - 1))}
            >
              −
            </Button>
            <Input
              id="puntos-por-dolar"
              className="max-w-24 text-center"
              type="number"
              min={1}
              max={10}
              step={1}
              value={texto}
              required
              disabled={ocupado}
              onChange={(evento) => editar(evento.target.value)}
            />
            <Button
              aria-label="Sumar un punto"
              disabled={ocupado || (valido && valor >= 10)}
              onClick={() => editar(String(valido ? valor + 1 : 1))}
            >
              +
            </Button>
          </div>
          {fallo && <ErrorLealtad fallo={fallo} />}
          {guardada && (
            <p role="status" className="text-green-300">
              Regla actualizada.
            </p>
          )}
          {aviso && (
            <p role="status" className="text-green-300">
              {aviso}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={ocupado || !cambio}>
              {ocupado ? "Guardando…" : "Confirmar"}
            </Button>
            <Button
              className="border border-zinc-600 bg-transparent text-zinc-100 hover:bg-zinc-800"
              disabled={
                ocupado || borrador === null || texto === String(vigente ?? "")
              }
              onClick={() => {
                setBorrador(null);
                setFallo(undefined);
              }}
            >
              Deshacer
            </Button>
            {vigente !== undefined && (
              <Button
                className="border border-red-800 bg-transparent text-red-200 hover:bg-red-950"
                disabled={ocupado}
                onClick={() =>
                  confirmandoBaja ? void darDeBaja() : setConfirmandoBaja(true)
                }
              >
                {confirmandoBaja
                  ? "Sí, deshabilitar regla"
                  : "Deshabilitar regla"}
              </Button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
