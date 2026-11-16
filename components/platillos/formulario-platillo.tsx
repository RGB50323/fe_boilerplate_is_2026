"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SelectorImagen } from "@/components/platillos/selector-imagen";
import { FieldError } from "@/components/ui/error";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  VALORES_VACIOS,
  validarImagen,
  validarPlatillo,
  valoresDe,
  type ErroresPlatillo,
  type Platillo,
  type ValoresPlatillo,
} from "@/lib/platillos";
import { VistaPreviaPlatillo } from "./vista-previa-platillo";
import { crearPlatillo, editarPlatillo, subirImagenPlatillo } from "@/app/actions/platillos";

type Props = {
  sucursalId: number;
  categorias: { id: number; nombre: string }[];
  platillo?: Platillo;
};

const ETIQUETA = "text-sm font-medium text-orange-200";

export function FormularioPlatillo({
  sucursalId,
  categorias,
  platillo,
}: Props) {
  const router = useRouter();
  const [valores, setValores] = useState<ValoresPlatillo>(
    platillo ? valoresDe(platillo) : VALORES_VACIOS,
  );
  const [imagenSrc, setImagenSrc] = useState<string | null>(
    platillo?.imagenSrc ?? null,
  );
  const [errores, setErrores] = useState<ErroresPlatillo>({});
  const [errorImagen, setErrorImagen] = useState<string>();
  const [errorGeneral, setErrorGeneral] = useState<string>();
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const ocupado = subiendo || guardando;

  function cambiar(campo: keyof ValoresPlatillo, valor: string) {
    setValores((actuales) => ({ ...actuales, [campo]: valor }));
    setErrores((actuales) => ({ ...actuales, [campo]: undefined }));
  }

  async function seleccionarImagen(archivo: File) {
    const invalido = validarImagen(archivo);
    if (invalido) {
      setErrorImagen(invalido);
      return;
    }
    setErrorImagen(undefined);
    setSubiendo(true);
    const datos = new FormData();
    datos.append("imagen", archivo);
    const resultado = await subirImagenPlatillo(datos);
    setSubiendo(false);

    if (!resultado.ok) {
      if (resultado.sinSesion) {
        router.replace("/login");
        return;
      }
      setErrorImagen(resultado.error);
      return;
    }
    cambiar("imagenUrl", resultado.datos.imagenUrl);
    setImagenSrc(resultado.datos.imagenSrc);
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (ocupado) return;

    const invalidos = validarPlatillo(valores);
    setErrores(invalidos);
    setErrorGeneral(undefined);
    if (Object.keys(invalidos).length > 0) return;

    setGuardando(true);
    const resultado = platillo
      ? await editarPlatillo(platillo.id, valores)
      : await crearPlatillo(sucursalId, valores);

    if (resultado.ok) {
      router.push("/admin/platillos?guardado=1");
      return;
    }
    setGuardando(false);
    if (resultado.sinSesion) {
      router.replace("/login");
      return;
    }
    setErrorGeneral(resultado.error);
  }

  return (
    <div className="grid gap-6">
      <h1 className="text-3xl sm:text-4xl">
        {platillo ? "Editar platillo" : "Nuevo platillo"}
      </h1>

      <form
        onSubmit={enviar}
        noValidate
        className="grid gap-8 rounded-2xl border-2 border-zinc-500 bg-black p-6 sm:p-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
      >
        <div className="grid content-start gap-5">
          <h2 className="text-2xl">Información general del platillo</h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid content-start gap-1">
              <label htmlFor="nombre-platillo" className={ETIQUETA}>
                Nombre *
              </label>
              <Input
                id="nombre-platillo"
                value={valores.nombre}
                onChange={(e) => cambiar("nombre", e.target.value)}
                placeholder="Nombre del platillo"
                aria-invalid={Boolean(errores.nombre)}
                aria-describedby={
                  errores.nombre ? "nombre-platillo-error" : undefined
                }
                disabled={guardando}
              />
              <FieldError id="nombre-platillo-error" message={errores.nombre} />
            </div>

            <div className="grid content-start gap-1 sm:row-span-2">
              <label htmlFor="descripcion-platillo" className={ETIQUETA}>
                Descripción *
              </label>
              <textarea
                id="descripcion-platillo"
                value={valores.descripcion}
                onChange={(e) => cambiar("descripcion", e.target.value)}
                placeholder="Descripción del platillo"
                rows={4}
                aria-invalid={Boolean(errores.descripcion)}
                aria-describedby={
                  errores.descripcion ? "descripcion-platillo-error" : undefined
                }
                disabled={guardando}
                className="h-full min-h-28 w-full resize-none rounded-lg border border-zinc-700 bg-[#262626] px-4 py-3 text-base text-zinc-100 outline-none placeholder:text-zinc-400 focus:border-[#FF7A1A] focus:ring-1 focus:ring-[#FF7A1A] disabled:opacity-50"
              />
              <FieldError
                id="descripcion-platillo-error"
                message={errores.descripcion}
              />
            </div>

            <div className="grid content-start gap-1">
              <label htmlFor="categoria-platillo" className={ETIQUETA}>
                Categoría *
              </label>
              <Select
                id="categoria-platillo"
                value={valores.categoriaId}
                onChange={(e) => cambiar("categoriaId", e.target.value)}
                aria-invalid={Boolean(errores.categoriaId)}
                aria-describedby={
                  errores.categoriaId ? "categoria-platillo-error" : undefined
                }
                disabled={guardando}
              >
                <option value="">Categoría del platillo</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </option>
                ))}
              </Select>
              <FieldError
                id="categoria-platillo-error"
                message={errores.categoriaId}
              />
            </div>

            <div className="grid content-start gap-1">
              <label htmlFor="precio-platillo" className={ETIQUETA}>
                Precio *
              </label>
              <Input
                id="precio-platillo"
                inputMode="decimal"
                value={valores.precio}
                onChange={(e) => cambiar("precio", e.target.value)}
                placeholder="Precio del platillo"
                aria-invalid={Boolean(errores.precio)}
                aria-describedby={
                  errores.precio ? "precio-platillo-error" : undefined
                }
                disabled={guardando}
              />
              <FieldError id="precio-platillo-error" message={errores.precio} />
            </div>

            <div className="grid content-start gap-1">
              <label htmlFor="disponibilidad-platillo" className={ETIQUETA}>
                Disponibilidad *
              </label>
              <Input
                id="disponibilidad-platillo"
                inputMode="numeric"
                value={valores.disponibilidad}
                onChange={(e) => cambiar("disponibilidad", e.target.value)}
                placeholder="Disponibilidad del platillo"
                aria-invalid={Boolean(errores.disponibilidad)}
                aria-describedby={
                  errores.disponibilidad
                    ? "disponibilidad-platillo-error"
                    : undefined
                }
                disabled={guardando}
              />
              <FieldError
                id="disponibilidad-platillo-error"
                message={errores.disponibilidad}
              />
            </div>
          </div>

          <SelectorImagen
            subiendo={subiendo}
            error={errorImagen ?? errores.imagenUrl}
            onSeleccionar={seleccionarImagen}
          />
        </div>

        <div className="grid content-between gap-6">
          <VistaPreviaPlatillo
            nombre={valores.nombre}
            descripcion={valores.descripcion}
            precio={valores.precio}
            disponibilidad={valores.disponibilidad}
            imagenSrc={imagenSrc}
          />

          <div className="grid gap-3">
            {errorGeneral && (
              <p
                role="alert"
                className="rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-200"
              >
                {errorGeneral}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <Link
                href="/admin/platillos"
                className="cursor-pointer rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#101012] transition-colors hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={ocupado}
                className="cursor-pointer rounded-full bg-[#FF7A1A] px-5 py-2 text-sm font-semibold text-[#101012] transition-colors hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
