"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { crearPedidoLlevar } from "@/app/actions/pedidos";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/error";
import { Input } from "@/components/ui/input";
import {
  itemsParaEnviar,
  subtotalLinea,
  totalCarrito,
  validarCarrito,
  type ErroresCarrito,
  type LineaCarrito,
} from "@/lib/carrito-llevar";
import { formatoPrecio } from "@/lib/menu";
import { NOTA_MAX } from "@/lib/pedidos";

const ERROR_RED = "No pudimos completar tu pedido. Intenta de nuevo.";

export function CarritoLlevar({
  sucursalId,
  lineas,
  onCambiarCantidad,
  onCambiarNota,
  onQuitar,
}: {
  sucursalId: number;
  lineas: LineaCarrito[];
  onCambiarCantidad: (platilloId: number, cantidad: number) => void;
  onCambiarNota: (platilloId: number, nota: string) => void;
  onQuitar: (platilloId: number) => void;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [errores, setErrores] = useState<ErroresCarrito>({});
  const [error, setError] = useState<string | null>(null);
  const [sinSesion, setSinSesion] = useState(false);
  const [pendiente, setPendiente] = useState(false);
  const enviando = useRef(false);

  if (lineas.length === 0) return null;

  const total = totalCarrito(lineas);
  const cantidad = lineas.reduce((suma, l) => suma + l.cantidad, 0);

  async function confirmar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviando.current) return;
    const nuevos = validarCarrito(lineas, nombre);
    setErrores(nuevos);
    setError(null);
    setSinSesion(false);
    if (Object.keys(nuevos).length) return;

    enviando.current = true;
    setPendiente(true);
    try {
      const respuesta = await crearPedidoLlevar(
        sucursalId,
        nombre,
        itemsParaEnviar(lineas),
      );
      if (respuesta.ok) {
        router.push(`/pedidos/${respuesta.datos.pedidoId}`);
        return;
      }
      setError(respuesta.error);
      setSinSesion(Boolean(respuesta.sinSesion));
    } catch {
      setError(ERROR_RED);
    }
    enviando.current = false;
    setPendiente(false);
  }

  return (
    <aside
      aria-label="Tu pedido para llevar"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-700 bg-[#18181b] shadow-2xl"
    >
      <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => setAbierto((a) => !a)}
          aria-expanded={abierto}
          className="flex w-full cursor-pointer items-center justify-between gap-4 text-left"
        >
          <span>
            Tu pedido para llevar · {cantidad}{" "}
            {cantidad === 1 ? "platillo" : "platillos"}
          </span>
          <span className="flex items-center gap-3">
            <span aria-live="polite" className="font-semibold text-[#FF7A1A]">
              Total {formatoPrecio(total)}
            </span>
            <span className="flex items-center gap-1 text-sm text-zinc-300">
              {abierto ? "Ocultar" : "Ver pedido"}
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`size-4 transition-transform ${abierto ? "rotate-180" : ""}`}
              >
                <path d="M5 12l5-5 5 5" />
              </svg>
            </span>
          </span>
        </button>

        {abierto && (
          <form
            onSubmit={confirmar}
            noValidate
            aria-label="Confirmar pedido para llevar"
            aria-busy={pendiente}
            className="mt-4 grid max-h-[70dvh] gap-4 overflow-y-auto pb-2"
          >
            <ul className="grid gap-3">
              {lineas.map((l) => (
                <li
                  key={l.platillo.id}
                  className="grid gap-2 rounded-xl border border-zinc-800 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p>{l.platillo.nombre}</p>
                    <p className="tabular-nums">
                      {formatoPrecio(subtotalLinea(l))}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label={`Quitar una unidad de ${l.platillo.nombre}`}
                      onClick={() =>
                        onCambiarCantidad(l.platillo.id, l.cantidad - 1)
                      }
                      className="size-8 cursor-pointer rounded-full border border-zinc-600"
                    >
                      −
                    </button>
                    <span
                      aria-label={`Cantidad de ${l.platillo.nombre}`}
                      className="min-w-6 text-center tabular-nums"
                    >
                      {l.cantidad}
                    </span>
                    <button
                      type="button"
                      aria-label={`Agregar una unidad de ${l.platillo.nombre}`}
                      disabled={l.cantidad >= l.platillo.disponibilidad}
                      onClick={() =>
                        onCambiarCantidad(l.platillo.id, l.cantidad + 1)
                      }
                      className="size-8 cursor-pointer rounded-full border border-zinc-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      aria-label={`Quitar ${l.platillo.nombre} del pedido`}
                      onClick={() => onQuitar(l.platillo.id)}
                      className="ml-auto cursor-pointer text-sm text-red-300 underline"
                    >
                      Quitar
                    </button>
                  </div>
                  <Input
                    aria-label={`Nota para ${l.platillo.nombre}`}
                    placeholder="Nota (opcional)"
                    maxLength={NOTA_MAX}
                    value={l.nota}
                    onChange={(e) =>
                      onCambiarNota(l.platillo.id, e.target.value)
                    }
                  />
                </li>
              ))}
            </ul>

            <div className="grid gap-2">
              <label htmlFor="nombre-cliente" className="text-sm text-zinc-200">
                Nombre completo
              </label>
              <Input
                id="nombre-cliente"
                name="nombreCliente"
                autoComplete="name"
                maxLength={120}
                placeholder="Ana López"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  setErrores((previos) => ({ ...previos, nombre: undefined }));
                }}
                aria-invalid={!!errores.nombre}
                aria-describedby={errores.nombre ? "nombre-error" : undefined}
              />
              <FieldError id="nombre-error" message={errores.nombre} />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-900/60 bg-red-950/20 p-4 text-sm text-red-200"
              >
                <p>{error}</p>
                {sinSesion && (
                  <Link
                    href="/login"
                    className="mt-3 inline-block text-orange-300 underline"
                  >
                    Iniciar sesión para continuar
                  </Link>
                )}
              </div>
            )}

            <Button type="submit" disabled={pendiente} className="w-full">
              {pendiente ? "Confirmando…" : "Confirmar y pagar"}
            </Button>
          </form>
        )}
      </div>
    </aside>
  );
}
