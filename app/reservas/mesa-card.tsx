import { Button } from "@/components/ui/button";
import type { MesaDisponible } from "@/lib/reservaciones";
import { MesaIcon } from "./mesa-icon";

type MesaCardProps = {
  mesa: MesaDisponible;
  seleccionada: boolean;
  onSeleccionar: () => void;
};

export function MesaCard({ mesa, seleccionada, onSeleccionar }: MesaCardProps) {
  return (
    <article
      className={`flex flex-col items-center rounded-2xl border bg-gradient-to-b from-[#242427] to-[#1b1b1e] px-6 py-7 text-center transition-colors ${seleccionada ? "border-[#FF7A1A]" : "border-white/5"}`}
    >
      <div
        className={`grid size-24 place-items-center rounded-full ${seleccionada ? "bg-[#FF7A1A]/15 text-orange-300" : "bg-white/5 text-zinc-100"}`}
      >
        <MesaIcon className="size-20" />
      </div>
      <h3 className="mt-4 text-3xl [font-family:var(--font-reservas)]">
        Mesa {mesa.numero}
      </h3>
      <p className="mt-2 text-zinc-200">Capacidad: {mesa.capacidad} personas</p>
      <p className="mt-1 min-h-6 text-sm text-zinc-400">{mesa.zona ?? ""}</p>
      <Button
        onClick={onSeleccionar}
        aria-pressed={seleccionada}
        className="mt-6 w-full"
      >
        {seleccionada ? "Mesa seleccionada ✓" : "Seleccionar mesa"}
      </Button>
    </article>
  );
}
