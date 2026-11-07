import { logout } from "@/app/actions/auth";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-semibold">Bienvenido al sistema de gestión de restaurantes</h1>
      <form action={logout}>
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
