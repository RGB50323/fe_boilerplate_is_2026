"use client";
import { useRouter } from "next/navigation";
import type { DisponibilidadResultado } from "@/app/actions/reservaciones";
import { DisponibilidadForm } from "./disponibilidad-form";
import { rutaReserva } from "@/lib/confirmacion-reserva";
import type { FiltrosDisponibilidad, Sucursal } from "@/lib/reservaciones";

export function DisponibilidadView(props: {
  sucursales: Sucursal[];
  fechaInicial: string;
  horasIniciales: string[];
  filtrosIniciales?: FiltrosDisponibilidad;
  resultadoInicial?: DisponibilidadResultado;
}) {
  const router = useRouter();
  return (
    <DisponibilidadForm
      {...props}
      onReservar={(datos) => router.push(rutaReserva(datos))}
    />
  );
}
