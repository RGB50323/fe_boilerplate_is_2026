import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/login/page";
import { LoginForm } from "@/app/login/login-form";
import { login } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// H31. Login con diseño del sitio.

vi.mock("next/font/google", () => ({ Fraunces: () => ({ className: "font-fraunces" }) }));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: Record<string, unknown>) => <img src={String(props.src)} alt="" />,
}));
vi.mock("@/app/actions/auth", () => ({ login: vi.fn() }));

async function abrirLogin() {
  render(await LoginPage({ searchParams: Promise.resolve({}) }));
}

describe("H31. Login con diseño del sitio", () => {
  beforeEach(() => vi.mocked(login).mockReset());

  it("AC1: usa los colores, la tipografía y el logo “Los Burle” del sitio", async () => {
    await abrirLogin();

    const logo = screen.getByText("Los Burle");
    expect(logo).toHaveClass("text-[#FF7A1A]");
    expect(logo.closest("section")).toHaveClass("font-fraunces");
    expect(screen.getByRole("main")).toHaveClass("bg-[#101012]");
  });

  it("AC2: los campos y el botón son los mismos controles del resto del sitio", async () => {
    await abrirLogin();
    const correo = screen.getByLabelText("Correo electrónico");
    const boton = screen.getByRole("button", { name: "Iniciar sesión" });

    const { container } = render(
      <>
        <Input id="x" />
        <Button type="submit">x</Button>
      </>,
    );
    expect(correo.className).toBe(container.querySelector("input")!.className);
    expect(boton.className).toContain(container.querySelector("button")!.className.split(" ")[0]);
  });

  it("AC3: con credenciales incorrectas muestra el error con el estilo del sitio y conserva el correo", async () => {
    vi.mocked(login).mockResolvedValue({
      error: "Correo o contraseña incorrectos.",
      email: "ana@example.com",
    });
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText("Correo electrónico"), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "mala" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    });

    const error = await screen.findByText("Correo o contraseña incorrectos.");
    expect(error).toHaveClass("text-red-400");
    expect(screen.getByLabelText("Correo electrónico")).toHaveValue("ana@example.com");
  });

  it("AC4: mientras espera la respuesta el botón muestra que procesa y no se puede reenviar", async () => {
    let responder!: (estado: Awaited<ReturnType<typeof login>>) => void;
    vi.mocked(login).mockReturnValue(new Promise((r) => (responder = r)));
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText("Correo electrónico"), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "Demo1234!" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    const boton = await screen.findByRole("button", { name: "Ingresando..." });
    expect(boton).toBeDisabled();
    fireEvent.click(boton);
    expect(login).toHaveBeenCalledTimes(1);
    await act(async () => responder({}));
  });

  it("AC5: el formulario se adapta a celular, tablet y computadora", async () => {
    await abrirLogin();

    const tarjeta = screen.getByRole("main").firstElementChild!;
    expect(tarjeta).toHaveClass("w-full", "max-w-md", "lg:max-w-5xl", "lg:grid-cols-2");
    expect(screen.getByRole("main")).toHaveClass("px-4", "sm:px-6", "min-h-dvh");
    expect(tarjeta.lastElementChild).toHaveClass("hidden", "lg:block");
  });
});
