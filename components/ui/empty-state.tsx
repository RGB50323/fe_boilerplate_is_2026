import type { ReactNode } from "react";

type EmptyStateProps = {
  mensaje: string;
  descripcion?: string;
  variante?: "vacio" | "error";
  icono?: ReactNode;
  children?: ReactNode;
  className?: string;
};

function IconoVacio() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-14"
    >
      <path d="M3 13h5l1.5 3h5L16 13h5" />
      <path d="M5.5 5h13L21 13v6H3v-6Z" />
    </svg>
  );
}

function IconoError() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-14"
    >
      <path d="M12 3 2.5 20h19Z" />
      <path d="M12 10v4M12 17.2v.1" />
    </svg>
  );
}

export function EmptyState({
  mensaje,
  descripcion,
  variante = "vacio",
  icono,
  children,
  className = "",
}: EmptyStateProps) {
  const esError = variante === "error";

  return (
    <div
      role={esError ? "alert" : "status"}
      className={`rounded-2xl border px-6 py-12 text-center ${
        esError
          ? "border-red-900/60 bg-red-950/20"
          : "border-zinc-800 bg-[#18181b]"
      } ${className}`}
    >
      <div
        className={`mb-4 flex justify-center ${esError ? "text-red-400/70" : "text-zinc-500"}`}
      >
        {icono ?? (esError ? <IconoError /> : <IconoVacio />)}
      </div>

      <p
        className={`mx-auto max-w-xl text-lg ${esError ? "text-red-200" : "text-zinc-200"}`}
      >
        {mensaje}
      </p>

      {descripcion && (
        <p className="mt-2 text-sm text-zinc-400">{descripcion}</p>
      )}

      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
