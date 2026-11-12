"use client";

import { useState } from "react";
import Link from "next/link";
import { Fraunces } from "next/font/google";
import { useRouter } from "next/navigation";
import {
  crearCategoria,
  deshabilitarCategoria,
  listarCategorias,
  renombrarCategoria,
} from "@/app/actions/categorias";
import { DialogoDeshabilitar } from "@/components/categorias/dialogo-deshabilitar";
import { FormularioCategoria } from "@/components/categorias/formulario-categoria";
import { PanelPlatillos } from "@/components/categorias/panel-platillos";
import { TablaCategorias } from "@/components/categorias/tabla-categorias";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Toast } from "@/components/ui/toast";
import type { Categoria } from "@/lib/categorias";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: "600",
  display: "swap",
});

type Aviso = { id: number; texto: string; variante: "success" | "error" };

export function CategoriasView({
  inicial,
  errorInicial,
}: {
  inicial: Categoria[];
  errorInicial?: string;
}) {
  const router = useRouter();
  const [categorias, setCategorias] = useState(inicial);
  const [error, setError] = useState(errorInicial);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [formulario, setFormulario] = useState<{
    categoria: Categoria | null;
  } | null>(null);
  const [aDeshabilitar, setADeshabilitar] = useState<Categoria | null>(null);
  const [verPlatillos, setVerPlatillos] = useState<Categoria | null>(null);

  function mostrar(texto: string, variante: Aviso["variante"]) {
    setAviso({ id: Date.now(), texto, variante });
  }

  async function refrescar() {
    const resultado = await listarCategorias();
    if (resultado.ok) {
      setCategorias(resultado.datos);
      setError(undefined);
      return;
    }
    if (resultado.sinSesion) router.replace("/login");
    setError(resultado.error);
  }

  async function guardar(nombre: string) {
    const resultado = formulario?.categoria
      ? await renombrarCategoria(formulario.categoria.id, nombre)
      : await crearCategoria(nombre);
    if (!resultado.ok) {
      if (resultado.sinSesion) router.replace("/login");
      return resultado.error;
    }
    setFormulario(null);
    mostrar("Categoría guardada correctamente", "success");
    await refrescar();
    return undefined;
  }

  async function deshabilitar() {
    if (!aDeshabilitar) return undefined;
    const resultado = await deshabilitarCategoria(aDeshabilitar.id);
    if (!resultado.ok) {
      if (resultado.sinSesion) router.replace("/login");
      return resultado.error;
    }
    setADeshabilitar(null);
    mostrar("Categoría deshabilitada correctamente", "success");
    await refrescar();
    return undefined;
  }

  return (
    <main
      className={`${fraunces.className} min-h-dvh bg-[#101012] px-4 pb-16 pt-6 text-zinc-100 scheme-dark sm:px-8 lg:px-15`}
    >
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-zinc-700 pb-4">
          <div className="flex items-baseline gap-4">
            <p className="text-2xl text-[#FF7A1A] sm:text-3xl">Los Burle</p>
            <p className="text-lg text-zinc-400 sm:text-2xl">
              Panel de gerente
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/admin/platillos"
              className="text-sm text-zinc-300 underline underline-offset-4 hover:text-white"
            >
              Platillos
            </Link>
            <Link
              href="/menu"
              className="text-sm text-zinc-300 underline underline-offset-4 hover:text-white"
            >
              Ver menú
            </Link>
          </div>
        </header>

        <div className="my-8 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl sm:text-5xl">
            Gestión de categorías del menú
          </h1>
          <Button
            onClick={() => setFormulario({ categoria: null })}
            className="px-5 py-2 text-sm"
          >
            Agregar categoría
          </Button>
        </div>

        {error ? (
          <EmptyState mensaje={error} variante="error">
            <Button onClick={() => void refrescar()}>Reintentar</Button>
          </EmptyState>
        ) : categorias.length === 0 ? (
          <EmptyState
            mensaje="Aún no hay categorías"
            descripcion="Agrega la primera con el botón Agregar categoría."
          />
        ) : (
          <TablaCategorias
            categorias={categorias}
            onVer={setVerPlatillos}
            onRenombrar={(categoria) => setFormulario({ categoria })}
            onDeshabilitar={setADeshabilitar}
          />
        )}
      </div>

      <FormularioCategoria
        abierto={formulario !== null}
        categoria={formulario?.categoria ?? null}
        onCerrar={() => setFormulario(null)}
        onGuardar={guardar}
      />
      <DialogoDeshabilitar
        categoria={aDeshabilitar}
        onCerrar={() => setADeshabilitar(null)}
        onConfirmar={deshabilitar}
      />
      <PanelPlatillos
        categoria={verPlatillos}
        destinos={categorias.filter((categoria) => categoria.activa)}
        onCerrar={() => setVerPlatillos(null)}
        onCambio={() => void refrescar()}
      />

      <Toast key={aviso?.id} variant={aviso?.variante}>
        {aviso?.texto}
      </Toast>
    </main>
  );
}
