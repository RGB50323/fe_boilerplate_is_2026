import { describe, expect, it } from "vitest";
import {
  etiquetaFranja,
  filtrosAQuery,
  filtrosDesdeParams,
  formatoMoneda,
  franjasPico,
  fechaHoraLocal,
  formatoFechaCorta,
  generarCsvVentas,
  ordenarPlatillos,
  rangoDelPeriodo,
  resumenGeneral,
  ticketPromedio,
  validarRango,
  FILTROS_INICIALES,
} from "@/lib/dashboard";

// Domingo 8 de noviembre de 2026, 3:00 p. m. hora de El Salvador.
const AHORA = new Date("2026-11-08T21:00:00Z");

describe("ticket promedio", () => {
  it("divide ventas entre pedidos y redondea a dos decimales", () => {
    expect(ticketPromedio(8120, 640)).toBe(12.69);
  });

  it("es 0 cuando la sucursal no tiene pedidos", () => {
    expect(ticketPromedio(0, 0)).toBe(0);
    expect(formatoMoneda(ticketPromedio(0, 0))).toBe("$0.00");
  });

  it("el resumen general usa el total de ventas entre el total de pedidos", () => {
    expect(
      resumenGeneral([
        { sucursalId: 1, nombre: "A", ventas: 8120, pedidos: 640 },
        { sucursalId: 2, nombre: "B", ventas: 0, pedidos: 0 },
        { sucursalId: 3, nombre: "C", ventas: 1880, pedidos: 160 },
      ]),
    ).toEqual({ ventas: 10000, pedidos: 800, ticket: 12.5 });
  });
});

describe("formato de moneda", () => {
  it("usa dólares con separador de miles", () => {
    expect(formatoMoneda(8120)).toBe("$8,120.00");
    expect(formatoMoneda(0)).toBe("$0.00");
  });
});

describe("platillos más vendidos", () => {
  it("ordena por cantidad y, si empatan, primero el que generó más dinero", () => {
    const orden = ordenarPlatillos([
      { platilloId: 1, nombre: "Papas", cantidad: 50, monto: 162.5 },
      { platilloId: 2, nombre: "Burle", cantidad: 80, monto: 680 },
      { platilloId: 3, nombre: "Alitas", cantidad: 50, monto: 375 },
    ]).map((p) => p.nombre);
    expect(orden).toEqual(["Burle", "Alitas", "Papas"]);
  });
});

describe("horarios pico", () => {
  it("marca las 3 franjas con más ventas y en empate prefiere la más temprana", () => {
    expect(
      franjasPico([
        { hora: 11, ventas: 100 },
        { hora: 12, ventas: 500 },
        { hora: 13, ventas: 300 },
        { hora: 19, ventas: 300 },
        { hora: 20, ventas: 300 },
      ]),
    ).toEqual([12, 13, 19]);
  });

  it("no marca franjas sin ventas", () => {
    expect(franjasPico([{ hora: 10, ventas: 0 }, { hora: 11, ventas: 5 }])).toEqual([11]);
  });

  it("muestra la franja como rango de 1 hora", () => {
    expect(etiquetaFranja(12)).toBe("12:00 a 13:00");
    expect(etiquetaFranja(9)).toBe("09:00 a 10:00");
  });
});

describe("rango de fechas", () => {
  it("rechaza una fecha final anterior a la inicial", () => {
    expect(validarRango("2026-11-08", "2026-11-01")).toEqual({
      hasta: "Rango no válido: la fecha final no puede ser anterior a la inicial.",
    });
  });

  it("acepta un rango de un solo día", () => {
    expect(validarRango("2026-11-08", "2026-11-08")).toEqual({});
  });

  it("pide fechas válidas", () => {
    expect(validarRango("", "2026-02-30")).toEqual({
      desde: "Ingresá una fecha inicial válida.",
      hasta: "Ingresá una fecha final válida.",
    });
  });

  it("traduce hoy, esta semana (desde el lunes) y este mes a fechas", () => {
    const f = FILTROS_INICIALES;
    expect(rangoDelPeriodo({ ...f, periodo: "hoy" }, AHORA)).toEqual({
      desde: "2026-11-08",
      hasta: "2026-11-08",
    });
    expect(rangoDelPeriodo({ ...f, periodo: "semana" }, AHORA)).toEqual({
      desde: "2026-11-02",
      hasta: "2026-11-08",
    });
    expect(rangoDelPeriodo({ ...f, periodo: "mes" }, AHORA)).toEqual({
      desde: "2026-11-01",
      hasta: "2026-11-08",
    });
  });
});

describe("filtros en la URL", () => {
  it("ignora valores no válidos", () => {
    expect(
      filtrosDesdeParams({ periodo: "año", sucursal: "abc", dia: "9" }),
    ).toEqual(FILTROS_INICIALES);
  });

  it("solo incluye las fechas cuando el periodo es personalizado", () => {
    expect(
      filtrosAQuery({ periodo: "mes", desde: "2026-01-01", hasta: "2026-01-31", sucursalId: "2", dia: "" }),
    ).toBe("periodo=mes&sucursal=2");
    expect(
      filtrosAQuery({ periodo: "rango", desde: "2026-01-01", hasta: "2026-01-31", sucursalId: "", dia: "5" }),
    ).toBe("periodo=rango&desde=2026-01-01&hasta=2026-01-31&dia=5");
  });
});

describe("fechas en hora de El Salvador", () => {
  it("convierte la fecha UTC del pago a fecha y hora local", () => {
    expect(fechaHoraLocal("2026-11-09T02:35:00Z")).toEqual({
      fecha: "08/11/2026",
      hora: "20:35",
    });
  });

  it("muestra el rango como dd/mm/aaaa", () => {
    expect(formatoFechaCorta("2026-11-01")).toBe("01/11/2026");
  });
});

describe("CSV de ventas confirmadas", () => {
  it("tiene una fila por venta con fecha y hora locales", () => {
    const csv = generarCsvVentas([
      {
        pedidoId: 15,
        numero: "CEN-0015",
        sucursalId: 1,
        sucursal: "Centro",
        fecha: "2026-11-08T18:05:00Z",
        tipo: "MESA",
        articulos: 3,
        subtotal: 25,
        descuentos: 2.5,
        venta: 22.5,
      },
      {
        pedidoId: 16,
        numero: null,
        sucursalId: 2,
        sucursal: 'Plaza "Norte", local 3',
        fecha: "2026-11-08T19:00:00Z",
        tipo: "LLEVAR",
        articulos: 1,
        subtotal: 8.99,
        descuentos: 0,
        venta: 8.99,
      },
    ]);
    expect(csv.split("\r\n")).toEqual([
      "Fecha,Hora,Pedido,Sucursal,Tipo,Artículos,Subtotal,Descuentos,Venta",
      "08/11/2026,12:05,CEN-0015,Centro,Mesa,3,25.00,2.50,22.50",
      '08/11/2026,13:00,#16,"Plaza ""Norte"", local 3",Para llevar,1,8.99,0.00,8.99',
    ]);
  });

  it("sin ventas solo tiene el encabezado", () => {
    expect(generarCsvVentas([])).toBe(
      "Fecha,Hora,Pedido,Sucursal,Tipo,Artículos,Subtotal,Descuentos,Venta",
    );
  });
});
