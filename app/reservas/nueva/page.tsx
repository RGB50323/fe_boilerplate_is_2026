import type { Metadata } from "next";
import Link from "next/link";
import {
  consultarDisponibilidad,
  listarSucursales,
} from "@/app/actions/reservaciones";
import { MarcoReservas } from "@/components/reservaciones/marco-reservas";
import { rutaDisponibilidad } from "@/lib/confirmacion-reserva";
import { ReservaForm } from "./reserva-form";

export const metadata: Metadata = {
  title: "Confirmar reservación | Los Burle",
};
export default async function NuevaReservaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const texto = (campo: string) =>
    typeof params[campo] === "string" ? (params[campo] as string) : "";
  const filtros = {
    sucursalId: texto("sucursalId"),
    fecha: texto("fecha"),
    hora: texto("hora"),
    personas: texto("personas"),
  };
  const datos = {
    ...filtros,
    mesaId: texto("mesaId"),
    nombre: "",
    telefono: "",
    correo: "",
  };
  const form = new FormData();
  Object.entries(filtros).forEach(([k, v]) => form.set(k, v));
  const [sucursales, disponibilidad] = await Promise.all([
    listarSucursales(),
    consultarDisponibilidad(form),
  ]);
  const sucursal = sucursales.sucursales.find(
    (s) => String(s.id) === filtros.sucursalId,
  );
  const mesa = disponibilidad.mesas.find(
    (m) => String(m.mesaId) === datos.mesaId,
  );
  const error =
    sucursales.error ??
    disponibilidad.error ??
    (disponibilidad.errores
      ? "Revisá la fecha, hora y cantidad de personas de tu búsqueda."
      : undefined);
  return (
    <MarcoReservas
      titulo="Confirmá tu reservación"
      descripcion="Completá tus datos de contacto. La mesa se asegura al confirmar."
    >
      {error || !sucursal || !mesa ? (
        <div
          role="alert"
          className="rounded-2xl border border-zinc-800 bg-[#18181b] p-8"
        >
          <p>
            {error ??
              "La mesa seleccionada ya no está disponible. Elegí otra para continuar."}
          </p>
          <Link
            href={rutaDisponibilidad(filtros)}
            className="mt-5 inline-block text-orange-300 underline"
          >
            Volver a buscar mesas
          </Link>
        </div>
      ) : (
        <ReservaForm inicial={datos} mesa={mesa} sucursal={sucursal} />
      )}
    </MarcoReservas>
  );
}
