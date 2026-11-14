// Estrellas de solo lectura, redondeadas a la más cercana
export function Estrellas({
  valor,
  className = "size-4",
}: {
  valor: number;
  className?: string;
}) {
  const llenas = Math.round(valor);
  return (
    <span aria-hidden="true" className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          viewBox="0 0 20 20"
          className={`${className} ${n <= llenas ? "fill-[#FF7A1A]" : "fill-zinc-700"}`}
        >
          <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z" />
        </svg>
      ))}
    </span>
  );
}
