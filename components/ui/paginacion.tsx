type PaginacionProps = {
  pagina: number;
  totalPaginas: number;
  onCambiar: (pagina: number) => void;
  deshabilitado?: boolean;
  etiqueta?: string;
  className?: string;
};

const BOTON =
  "inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-full border border-zinc-700 px-3 text-sm text-zinc-100 transition-colors hover:border-[#FF7A1A] hover:text-[#FF7A1A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600 disabled:hover:border-zinc-800 disabled:hover:text-zinc-600 sm:px-4";

// Anterior / Siguiente con "Página X de Y"; con una sola página no se muestra
export function Paginacion({
  pagina,
  totalPaginas,
  onCambiar,
  deshabilitado = false,
  etiqueta = "Paginación",
  className = "",
}: PaginacionProps) {
  if (totalPaginas <= 1) return null;

  return (
    <nav
      aria-label={etiqueta}
      className={`flex items-center justify-between gap-2 ${className}`}
    >
      <button
        type="button"
        className={BOTON}
        disabled={deshabilitado || pagina <= 1}
        onClick={() => onCambiar(pagina - 1)}
      >
        <span aria-hidden="true">‹</span> Anterior
      </button>
      <span
        aria-live="polite"
        className="whitespace-nowrap text-sm text-zinc-400"
      >
        Página {pagina} de {totalPaginas}
      </span>
      <button
        type="button"
        className={BOTON}
        disabled={deshabilitado || pagina >= totalPaginas}
        onClick={() => onCambiar(pagina + 1)}
      >
        Siguiente <span aria-hidden="true">›</span>
      </button>
    </nav>
  );
}
