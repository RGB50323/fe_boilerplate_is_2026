const RUTA =
  "M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z";

// Estrellas de solo lectura con relleno parcial (4.5 = cuatro y media)
export function Estrellas({
  valor,
  className = "size-4",
}: {
  valor: number;
  className?: string;
}) {
  return (
    <span aria-hidden="true" className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const relleno = Math.max(0, Math.min(1, valor - (n - 1)));
        return (
          <span key={n} className={`relative inline-block ${className}`}>
            <svg
              viewBox="0 0 20 20"
              className="absolute inset-0 size-full fill-zinc-700"
            >
              <path d={RUTA} />
            </svg>
            <span
              className="absolute inset-y-0 left-0 overflow-hidden"
              style={{ width: `${relleno * 100}%` }}
            >
              <svg
                viewBox="0 0 20 20"
                className={`${className} fill-[#FF7A1A]`}
              >
                <path d={RUTA} />
              </svg>
            </span>
          </span>
        );
      })}
    </span>
  );
}
