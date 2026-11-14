type PaginacionProps = {
  pagina: number;
  totalPaginas: number;
  onCambiar: (pagina: number) => void;
  deshabilitado?: boolean;
  etiqueta?: string;
  className?: string;
};

const BOTON =
  "flex size-11 cursor-pointer items-center justify-center rounded-xl border border-zinc-800 bg-[#18181b] text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:text-zinc-700 disabled:hover:border-zinc-800";

function Chevron({ direccion }: { direccion: "izquierda" | "derecha" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="size-4 fill-none stroke-current stroke-2"
    >
      <path
        d={direccion === "izquierda" ? "M12 5l-5 5 5 5" : "M8 5l5 5-5 5"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Flechas con "X de Y" al centro; con una sola página no se muestra
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
      className={`flex items-center justify-center gap-5 ${className}`}
    >
      <button
        type="button"
        aria-label="Página anterior"
        className={BOTON}
        disabled={deshabilitado || pagina <= 1}
        onClick={() => onCambiar(pagina - 1)}
      >
        <Chevron direccion="izquierda" />
      </button>

      <span
        aria-hidden="true"
        className="min-w-14 text-center text-sm tabular-nums text-zinc-200"
      >
        {pagina} de {totalPaginas}
      </span>
      <span aria-live="polite" className="sr-only">
        Página {pagina} de {totalPaginas}
      </span>

      <button
        type="button"
        aria-label="Página siguiente"
        className={BOTON}
        disabled={deshabilitado || pagina >= totalPaginas}
        onClick={() => onCambiar(pagina + 1)}
      >
        <Chevron direccion="derecha" />
      </button>
    </nav>
  );
}
