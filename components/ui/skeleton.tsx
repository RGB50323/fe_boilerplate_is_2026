export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-[#2b2b2f] motion-reduce:animate-none ${className}`}
    />
  );
}