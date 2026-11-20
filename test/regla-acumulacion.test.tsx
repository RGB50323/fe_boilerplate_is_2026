import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { confirmarReglaPuntos } from "@/app/actions/beneficios";
import { ReglaAcumulacion } from "@/components/beneficios/regla-acumulacion";

vi.mock("@/app/actions/beneficios", () => ({ confirmarReglaPuntos: vi.fn() }));
const confirmar = vi.mocked(confirmarReglaPuntos);
const regla = (puntosPorDolar: number) => ({ id: 1, puntosPorDolar, vigenteDesde: "2026-11-20T00:00:00.000Z" });
const campo = () => screen.getByRole("spinbutton", { name: "Puntos por dólar" });
const boton = (name: string) => screen.getByRole("button", { name });
const escribir = (value: string) => fireEvent.change(campo(), { target: { value } });

beforeEach(() => {
  confirmar.mockReset();
});

it("edita en local, respeta los límites y restaura el valor confirmado", () => {
  render(<ReglaAcumulacion inicial={{ ok: true, datos: { regla: regla(1) } }} />);
  expect(boton("Disminuir puntos")).toBeDisabled();
  expect(boton("Deshacer")).toBeDisabled();
  expect(boton("Confirmar")).toBeDisabled();
  fireEvent.click(boton("Aumentar puntos"));
  expect(campo()).toHaveValue(2);
  escribir("10");
  expect(boton("Aumentar puntos")).toBeDisabled();
  fireEvent.click(boton("Disminuir puntos"));
  expect(campo()).toHaveValue(9);
  for (const invalido of ["0", "11", "4.5"]) {
    escribir(invalido);
    expect(boton("Confirmar")).toBeDisabled();
  }
  fireEvent.click(boton("Deshacer"));
  expect(campo()).toHaveValue(1);
  expect(confirmar).not.toHaveBeenCalled();
});

it("permite configurar la primera regla y bloquea el envío duplicado", async () => {
  let resolver!: (respuesta: Awaited<ReturnType<typeof confirmar>>) => void;
  confirmar.mockImplementation(() => new Promise((resolve) => { resolver = resolve; }));
  render(<ReglaAcumulacion inicial={{ ok: true, datos: { regla: null } }} />);
  expect(screen.getByText("Aún no hay una regla vigente.")).toBeInTheDocument();
  expect(campo()).toHaveValue(null);
  escribir("6");
  fireEvent.click(boton("Confirmar"));
  expect(boton("Confirmando…")).toBeDisabled();
  fireEvent.submit(campo().closest("form")!);
  expect(confirmar).toHaveBeenCalledExactlyOnceWith(6);

  await act(async () => resolver({ ok: true, datos: { regla: regla(6) } }));
  expect(screen.getByText("Valor vigente: 6 puntos por dólar.")).toBeInTheDocument();
  expect(boton("Confirmar")).toBeDisabled();
  expect(boton("Deshacer")).toBeDisabled();
});

it("conserva la regla vigente y el borrador ante un error del backend", async () => {
  confirmar.mockResolvedValue({ ok: false, error: "Intenta de nuevo." });
  render(<ReglaAcumulacion inicial={{ ok: true, datos: { regla: regla(3) } }} />);
  escribir("7");
  fireEvent.click(boton("Confirmar"));
  expect(await screen.findByRole("alert")).toHaveTextContent("Intenta de nuevo.");
  expect(screen.getByText("Valor vigente: 3 puntos por dólar.")).toBeInTheDocument();
  expect(campo()).toHaveValue(7);
  expect(boton("Confirmar")).toBeEnabled();
});
