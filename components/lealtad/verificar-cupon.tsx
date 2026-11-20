"use client";

import { useRef, useState, type FormEvent } from "react";
import { consultarCupon, utilizarCupon } from "@/app/actions/lealtad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Resultado } from "@/lib/api";
import { ejecutarLealtad, fechaLealtad, type Cupon } from "@/lib/lealtad";
import { ErrorLealtad } from "./error-lealtad";

export function VerificarCupon() {
  const [codigo, setCodigo] = useState("");
  const [cupon, setCupon] = useState<Cupon | null>(null);
  const [fallo, setFallo] = useState<Extract<Resultado<Cupon>, { ok: false }>>();
  const [ocupado, setOcupado] = useState<"consulta" | "entrega" | null>(null);
  const bloqueo = useRef(false);

  async function consultar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const valor = codigo.trim();
    if (bloqueo.current || !valor) return;
    bloqueo.current = true;
    setOcupado("consulta");
    setCupon(null);
    setFallo(undefined);
    const respuesta = await ejecutarLealtad(consultarCupon(valor));
    if (respuesta.ok) setCupon(respuesta.datos);
    else setFallo(respuesta);
    setOcupado(null);
    bloqueo.current = false;
  }

  async function confirmar() {
    if (bloqueo.current || !cupon || cupon.utilizadoEn) return;
    bloqueo.current = true;
    setOcupado("entrega");
    setFallo(undefined);
    const respuesta = await ejecutarLealtad(utilizarCupon(cupon.codigo));
    if (respuesta.ok) setCupon(respuesta.datos);
    else {
      setFallo(respuesta);
      if (respuesta.estado || respuesta.sinSesion) setCupon(null);
    }
    setOcupado(null);
    bloqueo.current = false;
  }

  return (
    <main className="mx-auto grid max-w-2xl gap-6 py-8">
      <header>
        <h1 className="text-3xl font-semibold sm:text-4xl">Canje de puntos</h1>
        <p className="mt-2 text-zinc-300">Ingresa el código que te presenta el cliente para verificar el beneficio.</p>
      </header>
      <form onSubmit={consultar} className="grid gap-4 rounded-2xl border border-zinc-800 bg-[#18181b] p-5 sm:p-7">
        <label htmlFor="codigo-cupon">Código del cupón</label>
        <Input id="codigo-cupon" value={codigo} required disabled={ocupado !== null}
          autoComplete="off" autoCapitalize="off" spellCheck={false}
          onChange={(evento) => {
            setCodigo(evento.target.value);
            setCupon(null);
            setFallo(undefined);
          }} />
        <div><Button type="submit" disabled={ocupado !== null || !codigo.trim()}>
          {ocupado === "consulta" ? "Verificando…" : "Verificar cupón"}
        </Button></div>
      </form>
      {fallo && <ErrorLealtad fallo={fallo} />}
      {cupon && (
        <section aria-label="Beneficio asociado" className="grid gap-4 rounded-2xl border border-zinc-800 bg-[#18181b] p-5 sm:p-7">
          <h2 className="text-2xl font-semibold">{cupon.beneficio.nombre}</h2>
          {cupon.utilizadoEn ? (
            <p role="status"><Badge variant="success">Entrega confirmada</Badge></p>
          ) : (
            <>
              <p className="text-sm text-zinc-300">Vence el {fechaLealtad.format(new Date(cupon.expiraEn))}.</p>
              <div><Button disabled={ocupado !== null} onClick={() => void confirmar()}>
                {ocupado === "entrega" ? "Confirmando…" : "Confirmar uso"}
              </Button></div>
            </>
          )}
        </section>
      )}
    </main>
  );
}

