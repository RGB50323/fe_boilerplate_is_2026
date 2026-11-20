"use client";

import { useRef, useState, type FormEvent } from "react";
import { consultarRegla, guardarRegla } from "@/app/actions/lealtad";
import { ErrorLealtad } from "@/components/lealtad/error-lealtad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Resultado } from "@/lib/api";
import { ejecutarLealtad, type ReglaPuntos } from "@/lib/lealtad";

export function EditorRegla({ inicial }: { inicial: Resultado<ReglaPuntos | null> }) {
  const [regla, setRegla] = useState(inicial);
  const [borrador, setBorrador] = useState<string | null>(null);
  const [fallo, setFallo] = useState<Extract<Resultado<ReglaPuntos>, { ok: false }>>();
  const [ocupado, setOcupado] = useState(false);
  const [guardada, setGuardada] = useState(false);
  const bloqueo = useRef(false);
  const vigente = regla.ok ? regla.datos?.puntosPorDolar : undefined;
  const texto = borrador ?? (vigente === undefined ? "" : String(vigente));
  const valor = Number(texto);
  const valido = /^([1-9]|10)$/.test(texto);
  const cambio = valido && valor !== vigente;

  function editar(valor: string) {
    setGuardada(false);
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
    } else setFallo(resultado);
    setOcupado(false);
    bloqueo.current = false;
  }

  return (
    <section aria-labelledby="titulo-regla" className="grid gap-4 rounded-2xl border border-zinc-800 bg-[#18181b] p-5 sm:p-7">
      <h2 id="titulo-regla" className="text-2xl font-semibold">Regla de acumulación</h2>
      {!regla.ok ? (
        <>
          <ErrorLealtad fallo={regla} reintentar={ocupado ? undefined : consultar} />
          {ocupado && <p role="status">Cargando regla…</p>}
        </>
      ) : (
        <form className="grid gap-4" onSubmit={confirmar}>
          <label htmlFor="puntos-por-dolar">Puntos por dólar</label>
          {vigente === undefined && <p className="text-sm text-zinc-400">Todavía no hay una regla vigente.</p>}
          <div className="flex items-center gap-3">
            <Button aria-label="Restar un punto" disabled={ocupado || !valido || valor <= 1} onClick={() => editar(String(valor - 1))}>−</Button>
            <Input id="puntos-por-dolar" className="max-w-24 text-center" type="number" min={1} max={10} step={1}
              value={texto} required disabled={ocupado} onChange={(evento) => editar(evento.target.value)} />
            <Button aria-label="Sumar un punto" disabled={ocupado || (valido && valor >= 10)}
              onClick={() => editar(String(valido ? valor + 1 : 1))}>+</Button>
          </div>
          {fallo && <ErrorLealtad fallo={fallo} />}
          {guardada && <p role="status" className="text-green-300">Regla actualizada.</p>}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={ocupado || !cambio}>{ocupado ? "Guardando…" : "Confirmar"}</Button>
            <Button className="border border-zinc-600 bg-transparent text-zinc-100 hover:bg-zinc-800" disabled={ocupado || borrador === null || texto === String(vigente ?? "")}
              onClick={() => { setBorrador(null); setFallo(undefined); }}>Deshacer</Button>
          </div>
        </form>
      )}
    </section>
  );
}

