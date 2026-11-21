export function MesaIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 80 80"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M25 39h30v5H25zM40 44v20M32 64h16M17 27l4 23h8v5H17l-5-26c-.6-4 4-6 5-2ZM17 55l-3 12M29 55l2 12M63 27l-4 23h-8v5h12l5-26c.6-4-4-6-5-2ZM63 55l3 12M51 55l-2 12M36 29h8v10h-8zM39 24c-5-4 3-6 0-10M45 23c4-4-3-5-1-9" />
    </svg>
  );
}
