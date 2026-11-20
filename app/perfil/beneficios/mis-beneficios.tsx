"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { adquirirCupon, consultarCatalogo, consultarPuntos } from "@/app/actions/lealtad";
import { ErrorLealtad } from "@/components/lealtad/error-lealtad";
import { ModalCupon } from "@/components/lealtad/modal-cupon";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { Resultado } from "@/lib/api";
import { ejecutarLealtad, fechaLealtad, type Beneficio, type Cupon, type Puntos } from "@/lib/lealtad";

const tipos = { ACUMULACION: "Acumulación", CANJE: "Canje", AJUSTE: "Ajuste" };

export function MisBeneficios({ correo, puntosIniciales, catalogoInicial }: {
  correo: string;
  puntosIniciales: Resultado<Puntos>;
  catalogoInicial: Resultado<Beneficio[]>;
}) {
  const [puntos, setPuntos] = useState(puntosIniciales);
  const [catalogo, setCatalogo] = useState(catalogoInicial);
  const [mostrarCatalogo, setMostrarCatalogo] = useState(false);
  const [cupon, setCupon] = useState<Cupon | null>(null);
  const [modal, setModal] = useState(false);
  const [enCurso, setEnCurso] = useState<number | "actualizar" | null>(null);
  const [falloCompra, setFalloCompra] = useState<Extract<Resultado<Cupon>, { ok: false }>>();
  const bloqueo = useRef(false);
  const [claves, setClaves] = useState(() => new Map<number, string>());

  async function actualizar() {
    if (bloqueo.current) return;
    bloqueo.current = true;
    setEnCurso("actualizar");
    const [saldo, beneficios] = await Promise.all([
      ejecutarLealtad(consultarPuntos()),
      ejecutarLealtad(consultarCatalogo()),
    ]);
    setPuntos(saldo);
    setCatalogo(beneficios);
    setEnCurso(null);
    bloqueo.current = false;
  }

  async function comprar(beneficio: Beneficio) {
    if (bloqueo.current || !puntos.ok ||
        (!claves.has(beneficio.id) && puntos.datos.saldoDisponible < beneficio.costoPuntos)) return;

    bloqueo.current = true;
    setEnCurso(beneficio.id);
    setFalloCompra(undefined);
    const clave = claves.get(beneficio.id) ?? crypto.randomUUID();
    const pendientes = new Map(claves).set(beneficio.id, clave);
    setClaves(pendientes);
    const resultado = await ejecutarLealtad(adquirirCupon(beneficio.id, clave));
    const rechazo = !resultado.ok && [400, 404, 409].includes(resultado.estado ?? 0);
    if (resultado.ok || rechazo) {
      const siguientes = new Map(pendientes);
      siguientes.delete(beneficio.id);
      setClaves(siguientes);
    }
    if (resultado.ok) {
      setCupon(resultado.datos);
      setModal(true);
      setPuntos(await ejecutarLealtad(consultarPuntos()));
    } else {
      setFalloCompra(resultado);
      if (rechazo) {
        const [saldo, beneficios] = await Promise.all([
          ejecutarLealtad(consultarPuntos()),
          ejecutarLealtad(consultarCatalogo()),
        ]);
        setPuntos(saldo);
        setCatalogo(beneficios);
      }
    }
    setEnCurso(null);
    bloqueo.current = false;
  }

  return (
    <main className="min-h-dvh bg-[#101012] px-4 pb-16 pt-6 text-zinc-100 sm:px-8">
      <div className="mx-auto grid max-w-5xl gap-8">
        <nav aria-label="Mi perfil" className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-700 pb-4">
          <Link href="/menu" className="text-2xl font-semibold text-[#FF7A1A] hover:text-orange-300">Los Burle</Link>
          <Link href="/perfil/reservaciones" className="text-sm text-zinc-300 underline underline-offset-4">Mis reservaciones</Link>
        </nav>
        <h1 className="text-3xl font-semibold sm:text-4xl">Mis beneficios</h1>
        <section aria-label="Saldo de puntos" className="grid gap-5 rounded-2xl border border-zinc-800 bg-[#18181b] p-5 sm:p-7">
          {puntos.ok ? (
            <div className="flex flex-wrap items-center justify-between gap-5">
              <dl className="flex flex-wrap gap-x-10 gap-y-4">
                <div>
                  <dt className="text-sm text-zinc-300">Saldo disponible</dt>
                  <dd className="mt-1 text-3xl font-semibold tabular-nums text-orange-300">{puntos.datos.saldoDisponible} puntos</dd>
                </div>
                <div>
                  <dt className="text-sm text-zinc-300">Puntos pendientes</dt>
                  <dd className="mt-1 text-3xl font-semibold tabular-nums">{puntos.datos.puntosPendientes} puntos</dd>
                </div>
              </dl>
              <Button aria-expanded={mostrarCatalogo} aria-controls="catalogo-beneficios" onClick={() => setMostrarCatalogo(!mostrarCatalogo)}>
                Comprar beneficios
              </Button>
            </div>
          ) : <ErrorLealtad fallo={puntos} reintentar={enCurso ? undefined : actualizar} />}
          {enCurso === "actualizar" && <p role="status">Actualizando beneficios y saldo…</p>}
          <p className="text-sm text-zinc-400">Los puntos obtenidos por pagos confirmados quedan bloqueados durante 24 horas.</p>
          {cupon && <div><Button onClick={() => setModal(true)}>Ver último cupón</Button></div>}
        </section>

        <section id="catalogo-beneficios" hidden={!mostrarCatalogo} aria-labelledby="catalogo-titulo" className="space-y-4">
          <h2 id="catalogo-titulo" className="text-2xl font-semibold">Beneficios disponibles</h2>
          {falloCompra && <ErrorLealtad fallo={falloCompra} />}
          {!catalogo.ok ? <ErrorLealtad fallo={catalogo} reintentar={enCurso ? undefined : actualizar} /> :
            catalogo.datos.length === 0 ? <EmptyState mensaje="No hay beneficios disponibles." /> : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {catalogo.datos.map((beneficio) => {
                const reintento = claves.has(beneficio.id);
                const insuficiente = puntos.ok && puntos.datos.saldoDisponible < beneficio.costoPuntos && !reintento;
                return (
                  <li key={beneficio.id} className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-[#18181b] p-5">
                    <div className="flex-1 space-y-2">
                      <h3 className="break-words text-xl font-semibold">{beneficio.nombre}</h3>
                      {beneficio.descripcion && <p className="break-words text-sm text-zinc-300">{beneficio.descripcion}</p>}
                      <p className="font-semibold text-orange-300">{beneficio.costoPuntos} puntos</p>
                    </div>
                    <Button
                      aria-label={`${reintento ? "Reintentar compra de" : "Comprar"} ${beneficio.nombre}`}
                      disabled={enCurso !== null || !puntos.ok || insuficiente}
                      onClick={() => void comprar(beneficio)}
                    >
                      {enCurso === beneficio.id ? "Comprando…" : insuficiente ? "Saldo insuficiente" : reintento ? "Reintentar compra" : "Comprar"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="historial-titulo" className="space-y-4">
          <h2 id="historial-titulo" className="text-2xl font-semibold">Historial de movimientos</h2>
          {puntos.ok && (puntos.datos.movimientos.length === 0 ? (
            <EmptyState mensaje="Aún no tienes movimientos de puntos." />
          ) : (
            <ul className="divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-[#18181b]">
              {puntos.datos.movimientos.map((movimiento) => (
                <li key={movimiento.id} className="flex flex-wrap items-start justify-between gap-3 p-5">
                  <div>
                    <p className="font-semibold">{tipos[movimiento.tipo]}</p>
                    <time dateTime={movimiento.fecha} className="text-sm text-zinc-400">{fechaLealtad.format(new Date(movimiento.fecha))}</time>
                    {movimiento.motivo && <p className="mt-1 text-sm text-zinc-300">{movimiento.motivo}</p>}
                  </div>
                  <div className="text-right tabular-nums">
                    <p className={movimiento.puntos > 0 ? "font-semibold text-green-300" : "font-semibold text-zinc-200"}>
                      {movimiento.puntos > 0 ? "+" : ""}{movimiento.puntos} puntos
                    </p>
                    <p className="text-sm text-zinc-400">Saldo contable: {movimiento.saldoResultante}</p>
                  </div>
                </li>
              ))}
            </ul>
          ))}
        </section>
      </div>
      {modal && cupon && <ModalCupon key={cupon.id} cupon={cupon} correo={correo} onCerrar={() => setModal(false)} />}
    </main>
  );
}

