import { describe, expect, it } from "vitest";
import { agruparPorMesa, quitarItem, type ItemPorEntregar } from "@/lib/entregas";

// H08. Entrega de platillos a la mesa (frontend).
// AC2, AC3 y AC4 se prueban en el backend: src/mesero/services/h08-entregas.spec.ts.

const item = (itemId: number, mesa: number): ItemPorEntregar => ({
  itemId,
  pedidoId: 100 + mesa,
  mesa,
  platillo: `Platillo ${itemId}`,
  cantidad: 1,
  listoEn: "12:10",
});

describe("H08. Entrega de platillos a la mesa", () => {
  it("AC1: muestra los platillos listos agrupados por mesa", () => {
    const grupos = agruparPorMesa([item(1, 3), item(2, 5), item(3, 3)]);

    expect(grupos.map((g) => g.mesa)).toEqual([3, 5]);
    expect(grupos[0].items.map((i) => i.itemId)).toEqual([1, 3]);
  });

  it("AC2: al marcar un platillo entregado desaparece de la lista", () => {
    const lista = [item(1, 3), item(2, 5)];
    expect(quitarItem(lista, 1).map((i) => i.itemId)).toEqual([2]);
  });
});
