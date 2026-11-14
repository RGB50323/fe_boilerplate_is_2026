import { Badge } from "@/components/ui/badge";
import { formatoFecha, formatoHora } from "@/lib/reservaciones";
import type { Reservacion } from "@/lib/confirmacion-reserva";

export function ResumenReserva({ reserva }: { reserva: Reservacion }) {
  const detalles = [
    ["Sucursal", reserva.sucursal],
    ["Mesa", String(reserva.mesa)],
    ["Fecha", formatoFecha(reserva.fecha)],
    ["Hora", formatoHora(reserva.hora)],
    ["Personas", String(reserva.personas)],
  ];
  return (
    <article className="rounded-2xl border border-zinc-800 bg-[#18181b] p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{reserva.reservacionId}</h2>
        <Badge
          variant={reserva.estado === "CONFIRMADA" ? "success" : "neutral"}
        >
          {reserva.estado === "CONFIRMADA" ? "Confirmada" : "Cancelada"}
        </Badge>
      </div>
      <dl className="grid gap-5 sm:grid-cols-2">
        {detalles.map(([titulo, valor]) => (
          <div key={titulo}>
            <dt className="text-sm text-zinc-400">{titulo}</dt>
            <dd className="mt-1 text-lg text-zinc-100">{valor}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 border-t border-zinc-800 pt-4 text-xs text-zinc-400">
        Duración: 2 horas · Horario de El Salvador
      </p>
    </article>
  );
}
