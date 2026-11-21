import { redirect } from "next/navigation";
import { obtenerUsuarioActual } from "@/lib/usuario";

// Páginas de cliente (pedidos para llevar, reservas y perfil): el personal vuelve al menú
export async function soloClientes() {
  const usuario = await obtenerUsuarioActual();
  if (usuario && usuario.rol !== "CLIENTE") redirect("/menu");
}
