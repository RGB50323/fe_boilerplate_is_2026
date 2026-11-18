import { Badge } from "@/components/ui/badge";

export function IconoAlerta({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.5 1.5 21h21L12 2.5Zm-1 7h2v6h-2v-6Zm0 8h2v2h-2v-2Z" />
    </svg>
  );
}

export function EtiquetaEstado({ requiereAtencion }: { requiereAtencion: boolean }) {
  if (!requiereAtencion) {
    return (
      <Badge variant="success" className="px-2.5 py-0.5 text-xs font-semibold">
        En rango
      </Badge>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-red-500/70 bg-red-950/60 px-2.5 py-0.5 text-xs font-semibold text-red-200">
      <IconoAlerta />
      Requiere atención
    </span>
  );
}
