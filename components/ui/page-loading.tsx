type PageLoadingProps = {
  mensaje?: string;
  pantallaCompleta?: boolean;
};

export function PageLoading({
  mensaje = "Cargando...",
  pantallaCompleta = false,
}: PageLoadingProps) {
  return (
    <div
      role="status"
      className={`grid place-items-center ${pantallaCompleta ? "min-h-dvh" : "min-h-[50dvh]"}`}
    >
      <div className="flex flex-col items-center gap-4 text-zinc-300">
        <span
          aria-hidden="true"
          className="size-10 animate-spin rounded-full border-4 border-zinc-700 border-t-[#FF7A1A] motion-reduce:animate-none"
        />
        <p>{mensaje}</p>
      </div>
    </div>
  );
}
