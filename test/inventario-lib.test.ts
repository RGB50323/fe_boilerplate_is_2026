import { describe, expect, it } from "vitest";
import {
  actualizarCantidad,
  agregarInsumo,
  estadoDe,
  formatoCantidad,
  formatoFecha,
  leerInsumo,
  leerInsumos,
  leerMovimiento,
  leerPaginaMovimientos,
  mensajeExcedeExistencia,
  nuevoInsumo,
  nuevoMovimiento,
  ordenarInsumos,
  validarInsumo,
  validarMovimiento,
  type Insumo,
} from "@/lib/inventario";

const QUESO: Insumo = { id: 5, nombre: "Queso con loroco", unidad: "lb", cantidad: 12.5, minimo: 10, estado: "NORMAL" };
const MASA: Insumo = { id: 6, nombre: "Masa de maíz", unidad: "lb", cantidad: 18, minimo: 20, estado: "BAJO" };
const HUEVOS: Insumo = { id: 7, nombre: "Huevos", unidad: "unidad", cantidad: 90, minimo: 36, estado: "NORMAL" };

describe("lectura de insumos", () => {
  it("acepta el contrato y decimales como texto o unidad en mayúsculas", () => {
    expect(leerInsumo({ ...QUESO })).toEqual(QUESO);
    expect(leerInsumo({ ...QUESO, unidad: "LB", cantidad: "12.500", minimo: "10.000" })).toEqual(QUESO);
  });

  it("calcula el estado si no viene: Bajo cuando la cantidad es menor o igual al mínimo", () => {
    expect(estadoDe(10, 10)).toBe("BAJO");
    expect(estadoDe(10.01, 10)).toBe("NORMAL");
    expect(leerInsumo({ ...MASA, estado: undefined })?.estado).toBe("BAJO");
  });

  it("rechaza respuestas inválidas", () => {
    expect(leerInsumo({ ...QUESO, unidad: "toneladas" })).toBeNull();
    expect(leerInsumo({ ...QUESO, nombre: " " })).toBeNull();
    expect(leerInsumo({ ...QUESO, minimo: "abc" })).toBeNull();
    expect(leerInsumos([QUESO, { id: "x" }])).toBeNull();
    expect(leerInsumos({ datos: [] })).toBeNull();
  });
});

describe("orden y actualización de la lista", () => {
  it("muestra primero los bajos y conserva el orden del servidor dentro de cada grupo", () => {
    expect(ordenarInsumos([QUESO, HUEVOS, MASA]).map((i) => i.id)).toEqual([6, 5, 7]);
  });

  it("agrega un insumo nuevo y lo ubica según su estado", () => {
    const nuevo: Insumo = { id: 9, nombre: "Aceite", unidad: "l", cantidad: 0, minimo: 5, estado: "BAJO" };
    expect(agregarInsumo([MASA, QUESO], nuevo).map((i) => i.id)).toEqual([9, 6, 5]);
  });

  it("actualiza cantidad, estado y orden tras un movimiento", () => {
    const lista = actualizarCantidad([MASA, QUESO], 5, 9.5);
    expect(lista.map((i) => [i.id, i.cantidad, i.estado])).toEqual([
      [6, 18, "BAJO"],
      [5, 9.5, "BAJO"],
    ]);
    expect(actualizarCantidad([MASA, QUESO], 6, 30).map((i) => i.id)).toEqual([6, 5]);
    expect(actualizarCantidad([MASA, QUESO], 6, 30)[0].estado).toBe("NORMAL");
  });
});

describe("validación local", () => {
  it("insumo: nombre obligatorio, unidad de la lista y mínimo mayor o igual a 0", () => {
    expect(validarInsumo({ nombre: " ", unidad: "", minimo: "" })).toEqual({
      nombre: "El nombre del insumo es obligatorio.",
      unidad: "Selecciona una unidad: lb, kg, l o unidad.",
      minimo: "La cantidad mínima es obligatoria.",
    });
    expect(validarInsumo({ nombre: "Sal", unidad: "g", minimo: "-1" })).toEqual({
      unidad: "Selecciona una unidad: lb, kg, l o unidad.",
      minimo: "La cantidad mínima debe ser un número mayor o igual a 0.",
    });
    expect(validarInsumo({ nombre: "Sal", unidad: "kg", minimo: "0" })).toEqual({});
    expect(nuevoInsumo({ nombre: " Sal ", unidad: "kg", minimo: "2,5" })).toEqual({ nombre: "Sal", unidad: "kg", minimo: 2.5 });
  });

  it("movimiento: cantidad mayor a 0 y motivo obligatorio", () => {
    for (const cantidad of ["", "0", "-3", "abc"]) {
      expect(validarMovimiento({ tipo: "SALIDA", cantidad, motivo: "Uso" }).cantidad).toBe(
        "Ingresa una cantidad mayor a 0.",
      );
    }
    expect(validarMovimiento({ tipo: "SALIDA", cantidad: "3", motivo: "  " })).toEqual({
      motivo: "El motivo es obligatorio.",
    });
    expect(nuevoMovimiento({ tipo: "SALIDA", cantidad: "3", motivo: " Uso en cocina " })).toEqual({
      tipo: "SALIDA",
      cantidad: 3,
      motivo: "Uso en cocina",
    });
  });
});

describe("formato", () => {
  it("muestra dos decimales, salvo unidades enteras", () => {
    expect(formatoCantidad(9.5, "lb")).toBe("9.50");
    expect(formatoCantidad(90, "unidad")).toBe("90");
    expect(formatoCantidad(1.125, "kg")).toBe("1.125");
  });

  it("mensaje de salida mayor a la existencia con cantidad y unidad", () => {
    expect(mensajeExcedeExistencia({ cantidad: 9.5, unidad: "lb" })).toBe(
      "La salida supera la existencia actual (9.5 lb).",
    );
  });

  it("muestra la fecha local del backend como día/mes/año", () => {
    expect(formatoFecha("2026-11-12")).toBe("12/11/2026");
  });
});

describe("historial", () => {
  const MOV = { id: 88, fecha: "2026-11-12", hora: "12:40", usuario: "Ana Gómez", tipo: "SALIDA", cantidad: 3, motivo: "Uso en cocina" };

  it("lee el movimiento tal como lo envía el backend", () => {
    expect(leerMovimiento(MOV)).toEqual(MOV);
    expect(leerMovimiento({ ...MOV, usuario: null })?.usuario).toBeNull();
    expect(leerMovimiento({ ...MOV, tipo: "AJUSTE" })).toBeNull();
    expect(leerMovimiento({ ...MOV, fecha: "2026-11-12T18:40:00Z" })).toBeNull();
    expect(leerMovimiento({ ...MOV, hora: "12:40:00" })).toBeNull();
  });

  it("lee la página del historial", () => {
    expect(leerPaginaMovimientos({ pagina: 2, totalPaginas: 3, total: 21, datos: [MOV] })).toEqual({
      pagina: 2,
      totalPaginas: 3,
      total: 21,
      datos: [MOV],
    });
    expect(leerPaginaMovimientos({ pagina: 1, totalPaginas: 0, total: 0, datos: [] })).toEqual({
      pagina: 1,
      totalPaginas: 0,
      total: 0,
      datos: [],
    });
    expect(leerPaginaMovimientos([MOV])).toBeNull();
    expect(leerPaginaMovimientos({ datos: [MOV] })).toBeNull();
  });
});
