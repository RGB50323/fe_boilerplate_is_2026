import { describe, expect, it } from "vitest";
import {
  agruparPorMesa,
  esItemPorEntregar,
  leerItemEntregado,
  quitarItem,
  textoPorEntregar,
  type ItemPorEntregar,
} from "@/lib/entregas";

const item = (parcial: Partial<ItemPorEntregar> & { itemId: number }): ItemPorEntregar => ({
  pedidoId: 120,
  mesa: 7,
  platillo: "Pupusa revuelta",
  cantidad: 1,
  listoEn: "12:18",
  ...parcial,
});

describe("agruparPorMesa", () => {
  it("agrupa por mesa respetando el orden en que llegan", () => {
    const grupos = agruparPorMesa([
      item({ itemId: 1, mesa: 2 }),
      item({ itemId: 2, mesa: 7 }),
      item({ itemId: 3, mesa: 2 }),
    ]);
    expect(grupos.map((g) => [g.mesa, g.items.map((i) => i.itemId)])).toEqual([
      [2, [1, 3]],
      [7, [2]],
    ]);
    expect(agruparPorMesa([])).toEqual([]);
  });
});

describe("quitarItem", () => {
  it("quita el platillo y devuelve la misma lista si no estaba", () => {
    const lista = [item({ itemId: 1 }), item({ itemId: 2 })];
    expect(quitarItem(lista, 1).map((i) => i.itemId)).toEqual([2]);
    expect(quitarItem(lista, 99)).toBe(lista);
  });
});

describe("validación", () => {
  it("acepta el contrato de GET /mesero/items-listos", () => {
    expect(
      esItemPorEntregar({ itemId: 301, pedidoId: 120, mesa: 7, platillo: "Pupusa revuelta", cantidad: 3, listoEn: "12:18" }),
    ).toBe(true);
    expect(esItemPorEntregar({ ...item({ itemId: 1 }), listoEn: null })).toBe(true);
    expect(esItemPorEntregar({ ...item({ itemId: 1 }), mesa: "7" })).toBe(false);
    expect(esItemPorEntregar({ ...item({ itemId: 1 }), cantidad: 0 })).toBe(false);
    expect(esItemPorEntregar(null)).toBe(false);
  });

  it("lee la respuesta del PATCH …/entregado", () => {
    expect(
      leerItemEntregado({ itemId: 301, estado: "ENTREGADO", entregadoEn: "12:25", pedidoEstado: "ENTREGADO" }),
    ).toEqual({ itemId: 301, entregadoEn: "12:25", pedidoEstado: "ENTREGADO" });
    expect(leerItemEntregado({ itemId: 301 })).toEqual({ itemId: 301, entregadoEn: null, pedidoEstado: null });
    expect(leerItemEntregado({ itemId: 301, estado: "LISTO" })).toBeNull();
    expect(leerItemEntregado({ id: 301 })).toBeNull();
  });

  it("formatea el contador de la mesa", () => {
    expect(textoPorEntregar(2)).toBe("2 por entregar");
  });
});
