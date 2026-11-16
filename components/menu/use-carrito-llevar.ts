import { useState } from "react";
import {
  agregarAlCarrito,
  cambiarCantidad,
  cambiarNota,
  quitarDelCarrito,
  type LineaCarrito,
} from "@/lib/carrito-llevar";
import type { Platillo } from "@/lib/menu";

type Estado = { sucursalId: number; lineas: LineaCarrito[] };

export function useCarritoLlevar(sucursalId: number) {
  const [estado, setEstado] = useState<Estado>({ sucursalId, lineas: [] });
  const vigente = estado.sucursalId === sucursalId;
  const lineas = vigente ? estado.lineas : [];
  const vaciado = !vigente && estado.lineas.length > 0;

  function actualizar(cambio: (l: LineaCarrito[]) => LineaCarrito[]) {
    setEstado((previo) => ({
      sucursalId,
      lineas: cambio(previo.sucursalId === sucursalId ? previo.lineas : []),
    }));
  }

  return {
    lineas,
    vaciado,
    agregar: (platillo: Platillo) =>
      actualizar((l) => agregarAlCarrito(l, platillo)),
    cambiarCantidad: (id: number, cantidad: number) =>
      actualizar((l) => cambiarCantidad(l, id, cantidad)),
    cambiarNota: (id: number, nota: string) =>
      actualizar((l) => cambiarNota(l, id, nota)),
    quitar: (id: number) => actualizar((l) => quitarDelCarrito(l, id)),
    descartarAviso: () => setEstado({ sucursalId, lineas: [] }),
  };
}
