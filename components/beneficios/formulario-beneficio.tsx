"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/error";
import { Input } from "@/components/ui/input";
import type { Resultado } from "@/lib/api";
import {
  MAXIMO_PUNTOS,
  validarBeneficio,
  type Beneficio,
  type DatosBeneficio,
  type ErroresBeneficio,
} from "@/lib/beneficios";
import { LOGIN_BENEFICIOS } from "@/lib/roles";
import { SelectorPlatillo } from "./selector-platillo";

type Fallo = Extract<Resultado<never>, { ok: false }>;
type Props = {
  beneficio?: Beneficio;
  onCerrar: () => void;
  onGuardar: (datos: DatosBeneficio) => Promise<Fallo | undefined>;
};

const CAMPOS = [
  { nombre: "costoPuntos", etiqueta: "Costo en puntos", tipo: "number" },
  { nombre: "vigenteDesde", etiqueta: "Vigencia desde", tipo: "date" },
  { nombre: "vigenteHasta", etiqueta: "Vigencia hasta", tipo: "date" },
] as const;

export function FormularioBeneficio({ beneficio, onCerrar, onGuardar }: Props) {
  const [platillo, setPlatillo] = useState(beneficio?.platillo ?? null);
  const [campos, setCampos] = useState({
    costoPuntos: beneficio ? String(beneficio.costoPuntos) : "",
    vigenteDesde: beneficio?.vigenteDesde ?? "",
    vigenteHasta: beneficio?.vigenteHasta ?? "",
  });
  const [errores, setErrores] = useState<ErroresBeneficio>({});
  const [fallo, setFallo] = useState<Fallo>();
  const [guardando, setGuardando] = useState(false);
  const envio = useRef(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (envio.current) return;
    const datos = {
      ...campos,
      costoPuntos: Number(campos.costoPuntos),
      platilloId: platillo?.id ?? 0,
    };
    const validacion = validarBeneficio(datos);
    setFallo(undefined);
    setErrores(validacion);
    const primerError = Object.keys(validacion)[0];
    if (primerError) {
      document
        .getElementById(
          primerError === "platilloId"
            ? "beneficio-buscar-platillo"
            : `beneficio-${primerError}`,
        )
        ?.focus();
      return;
    }
    envio.current = true;
    setGuardando(true);
    try {
      const respuesta = await onGuardar(datos);
      if (respuesta) {
        setFallo(respuesta);
        setErrores(respuesta.errores ?? {});
      }
    } catch {
      setFallo({
        ok: false,
        error: "No se pudo conectar con el servidor. Intenta de nuevo.",
      });
    } finally {
      envio.current = false;
      setGuardando(false);
    }
  }

  function cerrar() {
    if (!envio.current) onCerrar();
  }

  return (
    <form noValidate className="grid gap-5" onSubmit={enviar}>
      <SelectorPlatillo
        platillo={platillo}
        onElegir={(seleccion) => {
          setPlatillo(seleccion);
          setErrores((actual) => ({ ...actual, platilloId: undefined }));
        }}
        error={errores.platilloId}
        deshabilitado={guardando}
      />
      {CAMPOS.map(({ nombre, etiqueta, tipo }) => (
        <div className="grid min-w-0 gap-1" key={nombre}>
          <label
            htmlFor={`beneficio-${nombre}`}
            className="text-sm font-medium text-orange-200"
          >
            {etiqueta} *
          </label>
          <Input
            id={`beneficio-${nombre}`}
            type={tipo}
            required
            value={campos[nombre]}
            onChange={(e) => {
              const valor = e.target.value;
              setCampos((actual) => ({ ...actual, [nombre]: valor }));
              setErrores((actual) => ({ ...actual, [nombre]: undefined }));
            }}
            min={tipo === "number" ? 1 : "0001-01-01"}
            max={tipo === "number" ? MAXIMO_PUNTOS : "9999-12-31"}
            step={tipo === "number" ? 1 : undefined}
            disabled={guardando}
            aria-invalid={Boolean(errores[nombre])}
            aria-describedby={
              errores[nombre]
                ? `beneficio-${nombre}-error`
                : nombre === "vigenteHasta"
                  ? "beneficio-fin-ayuda"
                  : undefined
            }
          />
          {nombre === "vigenteHasta" && (
            <p id="beneficio-fin-ayuda" className="text-sm text-zinc-400">
              Incluye todo el último día.
            </p>
          )}
          <FieldError
            id={`beneficio-${nombre}-error`}
            message={errores[nombre]}
          />
        </div>
      ))}
      {fallo && (
        <div role="alert" className="text-sm text-red-200">
          <p>{fallo.error}</p>
          {fallo.sinSesion && (
            <Link href={LOGIN_BENEFICIOS} className="underline">
              Iniciar sesión
            </Link>
          )}
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <Button
          className="bg-zinc-200 hover:bg-white"
          disabled={guardando}
          onClick={cerrar}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar beneficio"}
        </Button>
      </div>
    </form>
  );
}
