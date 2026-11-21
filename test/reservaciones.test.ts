import { describe, expect, it } from "vitest";
import {
  fechaLocal,
  fechaValida,
  horasDisponibles,
  validarFiltros,
} from "@/lib/reservaciones";
const ahora = new Date("2026-11-07T12:00:00Z");
const horarios = Array.from({ length: 7 }, (_, diaSemana) => ({
  diaSemana,
  apertura: "08:00",
  cierre: diaSemana === 0 ? "18:00" : diaSemana >= 5 ? "23:00" : "21:00",
}));
const filtros = {
  sucursalId: "1",
  fecha: "2026-11-09",
  hora: "19:00",
  personas: "4",
};
describe("validación de H09", () => {
  it("acepta filtros válidos", () =>
    expect(validarFiltros(filtros, horarios, ahora)).toEqual({}));
  it.each([
    ["sucursalId", ""],
    ["sucursalId", "0"],
    ["sucursalId", "2147483648"],
    ["fecha", ""],
    ["fecha", "2026-02-30"],
    ["fecha", "2026-11-06"],
    ["hora", ""],
    ["hora", "19:15"],
    ["hora", "19:30"],
    ["personas", ""],
    ["personas", "0"],
    ["personas", "-1"],
    ["personas", "1.5"],
    ["personas", "2147483648"],
  ])("rechaza %s=%s", (campo, valor) => {
    expect(
      validarFiltros({ ...filtros, [campo]: valor }, horarios, ahora),
    ).toHaveProperty(campo);
  });
  it("incluye Horario no válido para horas pasadas del mismo día", () => {
    expect(
      validarFiltros(
        { ...filtros, fecha: "2026-11-07", hora: "08:00" },
        horarios,
        new Date("2026-11-07T15:00:00Z"),
      ).hora,
    ).toContain("Horario no válido");
  });
  it("sin horario del día no permite consultar", () =>
    expect(validarFiltros(filtros, [], ahora).hora).toBeDefined());
  it("la fecha local utiliza El Salvador, no UTC", () =>
    expect(fechaLocal(new Date("2026-11-08T02:00:00Z"))).toBe("2026-11-07"));
  it("distingue fechas bisiestas", () => {
    expect(fechaValida("2028-02-29")).toBe(true);
    expect(fechaValida("2026-02-29")).toBe(false);
  });
});
describe("horarios reales de sucursal", () => {
  it.each([
    ["2026-11-08", "16:00"],
    ["2026-11-09", "19:00"],
    ["2026-11-13", "21:00"],
  ])("respeta cierre y duración: %s", (fecha, ultima) => {
    const horas = horasDisponibles(fecha, horarios, ahora);
    expect(horas[0]).toBe("08:00");
    expect(horas[1]).toBe("08:30");
    expect(horas.at(-1)).toBe(ultima);
  });
  it("usa horarios de la sucursal elegida y redondea al siguiente intervalo", () => {
    expect(
      horasDisponibles(
        "2026-11-09",
        [{ diaSemana: 1, apertura: "10:10", cierre: "13:00" }],
        ahora,
      ),
    ).toEqual(["10:30", "11:00"]);
  });
  it("elimina horas pasadas", () =>
    expect(
      horasDisponibles(
        "2026-11-07",
        horarios,
        new Date("2026-11-07T14:01:00Z"),
      )[0],
    ).toBe("08:30"));
  it("no inventa opciones sin horario o fecha válida", () => {
    expect(horasDisponibles("2026-11-09", [], ahora)).toEqual([]);
    expect(horasDisponibles("", horarios, ahora)).toEqual([]);
  });
});
