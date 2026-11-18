import { Skeleton } from "@/components/ui/skeleton";

export function IconoBurger({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 80 80"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 38c0-12 12-20 28-20s28 8 28 20Z" />
      <path d="M10 48h60M14 56c6 4 10-4 16 0s10-4 16 0 10-4 16 0" />
      <path d="M12 64h56v2a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6Z" />
    </svg>
  );
}

export function EncabezadoEntregas() {
  return (
    <div className="my-8 flex items-center gap-3 sm:gap-4">
      <IconoBurger className="size-12 shrink-0 sm:size-14" />
      <h1 className="text-4xl sm:text-5xl">Platillos por entregar</h1>
    </div>
  );
}

export function EsqueletoEntregas() {
  return (
    <div
      role="status"
      aria-label="Cargando platillos por entregar"
      className="grid grid-cols-1 items-start gap-6 sm:grid-cols-2 xl:grid-cols-3"
    >
      {[2, 1, 2].map((filas, i) => (
        <div key={i} className="rounded-2xl border-4 border-zinc-800 bg-black p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-4">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {Array.from({ length: filas }, (_, j) => (
              <Skeleton key={j} className="h-17 rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
