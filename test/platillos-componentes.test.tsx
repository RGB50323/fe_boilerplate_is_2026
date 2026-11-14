import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DialogoDeshabilitarPlatillo } from "@/components/platillos/dialogo-deshabilitar-platillo";
import { FormularioPlatillo } from "@/components/platillos/formulario-platillo";
import { TablaPlatillos } from "@/components/platillos/tabla-platillos";
import { PlatillosView } from "@/app/admin/platillos/platillos-view";
import type { Platillo } from "@/lib/platillos";
import { paginaVacia, type Pagina } from "@/lib/paginacion";

const m = vi.hoisted(() => ({
  router: { push: vi.fn(), replace: vi.fn() },
  crearPlatillo: vi.fn(),
  editarPlatillo: vi.fn(),
  subirImagenPlatillo: vi.fn(),
  deshabilitarPlatillo: vi.fn(),
  habilitarPlatillo: vi.fn(),
  listarPlatillos: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => m.router }));
vi.mock("@/app/actions/platillos", () => ({
  crearPlatillo: m.crearPlatillo,
  editarPlatillo: m.editarPlatillo,
  subirImagenPlatillo: m.subirImagenPlatillo,
  deshabilitarPlatillo: m.deshabilitarPlatillo,
  habilitarPlatillo: m.habilitarPlatillo,
  listarPlatillos: m.listarPlatillos,
}));
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

const platillo: Platillo = {
  id: 10,
  nombre: "Pupusa revuelta",
  descripcion: "Con queso",
  imagenUrl: "/uploads/platillos/p.png",
  imagenSrc: null,
  categoriaId: 2,
  categoriaNombre: "Platos típicos",
  precio: 1.25,
  disponibilidad: 40,
  activo: true,
};

const categorias = [
  { id: 2, nombre: "Platos típicos" },
  { id: 3, nombre: "Bebidas" },
];

beforeEach(() => {
  m.router.push.mockReset();
  m.router.replace.mockReset();
  m.crearPlatillo.mockReset();
  m.editarPlatillo.mockReset();
  m.subirImagenPlatillo.mockReset();
  m.deshabilitarPlatillo.mockReset();
  m.habilitarPlatillo.mockReset();
  m.listarPlatillos.mockReset();
});

afterEach(() => {
  cleanup();
});

function archivo(tipo = "image/png") {
  return new File(["x"], "foto.png", { type: tipo });
}

function subirArchivo(file: File) {
  const input = screen.getByLabelText(/Imagen/) as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

describe("FormularioPlatillo", () => {
  it("muestra los errores y no guarda si el formulario está vacío", () => {
    render(<FormularioPlatillo sucursalId={1} categorias={categorias} />);

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(
      screen.getByText("El nombre del platillo es obligatorio."),
    ).toBeTruthy();
    expect(screen.getByText("La descripción es obligatoria.")).toBeTruthy();
    expect(screen.getByText("Selecciona una categoría.")).toBeTruthy();
    expect(screen.getByText("El precio es obligatorio.")).toBeTruthy();
    expect(screen.getByText("La disponibilidad es obligatoria.")).toBeTruthy();
    expect(screen.getByText("La imagen es obligatoria.")).toBeTruthy();
    expect(m.crearPlatillo).not.toHaveBeenCalled();
  });

  it("crea el platillo y vuelve a la tabla", async () => {
    m.subirImagenPlatillo.mockResolvedValue({
      ok: true,
      datos: {
        imagenUrl: "/uploads/platillos/n.png",
        imagenSrc: "http://api.test/uploads/platillos/n.png",
      },
    });
    m.crearPlatillo.mockResolvedValue({ ok: true, datos: platillo });
    render(<FormularioPlatillo sucursalId={1} categorias={categorias} />);

    fireEvent.change(screen.getByLabelText(/^Nombre/), {
      target: { value: "Taco" },
    });
    fireEvent.change(screen.getByLabelText(/^Descripción/), {
      target: { value: "Rico" },
    });
    fireEvent.change(screen.getByLabelText(/^Categoría/), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText(/^Precio/), {
      target: { value: "2.5" },
    });
    fireEvent.change(screen.getByLabelText(/^Disponibilidad/), {
      target: { value: "10" },
    });
    subirArchivo(archivo());
    await waitFor(() => expect(m.subirImagenPlatillo).toHaveBeenCalled());
    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: "Guardar" }) as HTMLButtonElement)
          .disabled,
      ).toBe(false),
    );

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(m.crearPlatillo).toHaveBeenCalledWith(1, {
        nombre: "Taco",
        descripcion: "Rico",
        precio: "2.5",
        categoriaId: "3",
        disponibilidad: "10",
        imagenUrl: "/uploads/platillos/n.png",
      }),
    );
    await waitFor(() =>
      expect(m.router.push).toHaveBeenCalledWith("/admin/platillos?guardado=1"),
    );
  });

  it("precarga los datos y edita el platillo", async () => {
    m.editarPlatillo.mockResolvedValue({ ok: true, datos: platillo });
    render(
      <FormularioPlatillo
        sucursalId={1}
        categorias={categorias}
        platillo={platillo}
      />,
    );

    expect(screen.getByText("Editar platillo")).toBeTruthy();
    expect((screen.getByLabelText(/^Nombre/) as HTMLInputElement).value).toBe(
      "Pupusa revuelta",
    );

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(m.editarPlatillo).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          nombre: "Pupusa revuelta",
          precio: "1.25",
          categoriaId: "2",
        }),
      ),
    );
    await waitFor(() => expect(m.router.push).toHaveBeenCalled());
  });

  it("muestra «Guardando...» y bloquea el botón mientras guarda", async () => {
    m.editarPlatillo.mockReturnValue(new Promise(() => undefined));
    render(
      <FormularioPlatillo
        sucursalId={1}
        categorias={categorias}
        platillo={platillo}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    const boton = await screen.findByRole("button", { name: "Guardando..." });
    expect((boton as HTMLButtonElement).disabled).toBe(true);
  });

  it("muestra el error del servidor y deja volver a intentar", async () => {
    m.editarPlatillo.mockResolvedValue({
      ok: false,
      error: "Ya existe un platillo con ese nombre.",
    });
    render(
      <FormularioPlatillo
        sucursalId={1}
        categorias={categorias}
        platillo={platillo}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Ya existe un platillo con ese nombre.",
    );
    expect(m.router.push).not.toHaveBeenCalled();
    expect(
      (screen.getByRole("button", { name: "Guardar" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("redirige al login si la sesión expiró al guardar", async () => {
    m.editarPlatillo.mockResolvedValue({
      ok: false,
      error: "Tu sesión expiró. Inicia sesión de nuevo.",
      sinSesion: true,
    });
    render(
      <FormularioPlatillo
        sucursalId={1}
        categorias={categorias}
        platillo={platillo}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(m.router.replace).toHaveBeenCalledWith("/login"),
    );
  });

  it("rechaza una imagen que no es JPG ni PNG sin subirla", () => {
    render(<FormularioPlatillo sucursalId={1} categorias={categorias} />);

    subirArchivo(archivo("image/gif"));

    expect(screen.getByText("La imagen debe ser JPG o PNG.")).toBeTruthy();
    expect(m.subirImagenPlatillo).not.toHaveBeenCalled();
  });

  it("muestra «Subiendo imagen...» mientras sube", async () => {
    m.subirImagenPlatillo.mockReturnValue(new Promise(() => undefined));
    render(<FormularioPlatillo sucursalId={1} categorias={categorias} />);

    subirArchivo(archivo());

    expect(await screen.findByText("Subiendo imagen...")).toBeTruthy();
  });

  it("muestra el error si el backend rechaza la imagen", async () => {
    m.subirImagenPlatillo.mockResolvedValue({
      ok: false,
      error: "La imagen no puede superar los 2 MB.",
    });
    render(<FormularioPlatillo sucursalId={1} categorias={categorias} />);

    subirArchivo(archivo());

    expect(
      await screen.findByText("La imagen no puede superar los 2 MB."),
    ).toBeTruthy();
  });

  it("redirige al login si la sesión expiró al subir la imagen", async () => {
    m.subirImagenPlatillo.mockResolvedValue({
      ok: false,
      error: "Tu sesión expiró. Inicia sesión de nuevo.",
      sinSesion: true,
    });
    render(<FormularioPlatillo sucursalId={1} categorias={categorias} />);

    subirArchivo(archivo());

    await waitFor(() =>
      expect(m.router.replace).toHaveBeenCalledWith("/login"),
    );
  });
});

describe("TablaPlatillos", () => {
  const inactivo: Platillo = {
    ...platillo,
    id: 11,
    nombre: "Tamal",
    activo: false,
  };

  function pintar(habilitando: number | null = null) {
    const onDeshabilitar = vi.fn();
    const onHabilitar = vi.fn();
    render(
      <TablaPlatillos
        platillos={[platillo, inactivo]}
        habilitando={habilitando}
        onDeshabilitar={onDeshabilitar}
        onHabilitar={onHabilitar}
      />,
    );
    return { onDeshabilitar, onHabilitar };
  }

  it("lista los platillos con su categoría, precio y estado", () => {
    pintar();

    expect(screen.getAllByText("Pupusa revuelta").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$1.25").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Disponible").length).toBeGreaterThan(0);
    expect(screen.getAllByText("No disponible").length).toBeGreaterThan(0);
  });

  it("enlaza Editar con la página del platillo", () => {
    pintar();

    const enlace = screen.getByRole("link", {
      name: "Editar Pupusa revuelta",
    });
    expect(enlace.getAttribute("href")).toBe("/admin/platillos/10/editar");
  });

  it("muestra Deshabilitar solo en los activos y Habilitar solo en los inactivos", () => {
    pintar();

    expect(
      screen.getByRole("button", { name: "Deshabilitar Pupusa revuelta" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Deshabilitar Tamal" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Habilitar Tamal" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Habilitar Pupusa revuelta" }),
    ).toBeNull();
  });

  it("avisa con el platillo elegido al deshabilitar y al habilitar", () => {
    const { onDeshabilitar, onHabilitar } = pintar();

    fireEvent.click(
      screen.getByRole("button", { name: "Deshabilitar Pupusa revuelta" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Habilitar Tamal" }));

    expect(onDeshabilitar).toHaveBeenCalledWith(platillo);
    expect(onHabilitar).toHaveBeenCalledWith(inactivo);
  });

  it("bloquea el botón Habilitar del platillo que se está habilitando", () => {
    pintar(11);

    expect(
      (
        screen.getByRole("button", {
          name: "Habilitar Tamal",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});

describe("DialogoDeshabilitarPlatillo", () => {
  it("no muestra nada sin platillo", () => {
    render(
      <DialogoDeshabilitarPlatillo
        platillo={null}
        onCerrar={vi.fn()}
        onConfirmar={vi.fn()}
      />,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("pide confirmación con el nombre del platillo", () => {
    render(
      <DialogoDeshabilitarPlatillo
        platillo={{ id: 10, nombre: "Pupusa revuelta" }}
        onCerrar={vi.fn()}
        onConfirmar={vi.fn()}
      />,
    );

    expect(screen.getByText("¿Deshabilitar este platillo?")).toBeTruthy();
    expect(screen.getByText(/Pupusa revuelta/)).toBeTruthy();
  });

  it("confirma al pulsar Aceptar", async () => {
    const onConfirmar = vi.fn().mockResolvedValue(undefined);
    render(
      <DialogoDeshabilitarPlatillo
        platillo={{ id: 10, nombre: "Pupusa revuelta" }}
        onCerrar={vi.fn()}
        onConfirmar={onConfirmar}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Aceptar" }));

    await waitFor(() => expect(onConfirmar).toHaveBeenCalledTimes(1));
  });

  it("cierra al pulsar Cancelar sin confirmar", () => {
    const onCerrar = vi.fn();
    const onConfirmar = vi.fn();
    render(
      <DialogoDeshabilitarPlatillo
        platillo={{ id: 10, nombre: "Pupusa revuelta" }}
        onCerrar={onCerrar}
        onConfirmar={onConfirmar}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onCerrar).toHaveBeenCalled();
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it("muestra «Deshabilitando...» y bloquea los botones mientras procesa", async () => {
    render(
      <DialogoDeshabilitarPlatillo
        platillo={{ id: 10, nombre: "Pupusa revuelta" }}
        onCerrar={vi.fn()}
        onConfirmar={() => new Promise(() => undefined)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Aceptar" }));

    const boton = await screen.findByRole("button", {
      name: "Deshabilitando...",
    });
    expect((boton as HTMLButtonElement).disabled).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Cancelar" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("muestra el error y permite reintentar", async () => {
    render(
      <DialogoDeshabilitarPlatillo
        platillo={{ id: 10, nombre: "Pupusa revuelta" }}
        onCerrar={vi.fn()}
        onConfirmar={vi.fn().mockResolvedValue("El platillo no existe.")}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Aceptar" }));

    expect(await screen.findByText("El platillo no existe.")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Aceptar" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
});

describe("PlatillosView", () => {
  const inactivo: Platillo = {
    ...platillo,
    id: 11,
    nombre: "Tamal",
    activo: false,
  };
  const otro: Platillo = { ...platillo, id: 12, nombre: "Sopa de res" };

  function paginaDe(
    datos: Platillo[],
    extra: Partial<Pagina<Platillo>> = {},
  ): Pagina<Platillo> {
    return { pagina: 1, totalPaginas: 1, total: datos.length, datos, ...extra };
  }

  function pintar(inicial: Pagina<Platillo> = paginaDe([platillo, inactivo])) {
    render(<PlatillosView sucursalId={1} inicial={inicial} guardado={false} />);
  }

  it("habilita un platillo sin recargar y avisa con un mensaje", async () => {
    m.habilitarPlatillo.mockResolvedValue({
      ok: true,
      datos: { id: 11, activo: true },
    });
    pintar();

    fireEvent.click(screen.getByRole("button", { name: "Habilitar Tamal" }));

    expect(
      await screen.findByText("Platillo habilitado correctamente"),
    ).toBeTruthy();
    expect(m.habilitarPlatillo).toHaveBeenCalledWith(11);
    expect(
      screen.getByRole("button", { name: "Deshabilitar Tamal" }),
    ).toBeTruthy();
  });

  it("muestra el error si no se puede habilitar", async () => {
    m.habilitarPlatillo.mockResolvedValue({
      ok: false,
      error:
        "La categoría del platillo está deshabilitada. Habilítala primero.",
    });
    pintar();

    fireEvent.click(screen.getByRole("button", { name: "Habilitar Tamal" }));

    expect(
      await screen.findByText(
        "La categoría del platillo está deshabilitada. Habilítala primero.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Habilitar Tamal" }),
    ).toBeTruthy();
  });

  it("redirige al login si la sesión expiró al habilitar", async () => {
    m.habilitarPlatillo.mockResolvedValue({
      ok: false,
      error: "Tu sesión expiró. Inicia sesión de nuevo.",
      sinSesion: true,
    });
    pintar();

    fireEvent.click(screen.getByRole("button", { name: "Habilitar Tamal" }));

    await waitFor(() =>
      expect(m.router.replace).toHaveBeenCalledWith("/login"),
    );
  });

  it("deshabilita un platillo tras confirmar", async () => {
    m.deshabilitarPlatillo.mockResolvedValue({
      ok: true,
      datos: { id: 10, activo: false },
    });
    pintar();

    fireEvent.click(
      screen.getByRole("button", { name: "Deshabilitar Pupusa revuelta" }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Aceptar" }));

    expect(
      await screen.findByText("Platillo deshabilitado correctamente"),
    ).toBeTruthy();
    expect(m.deshabilitarPlatillo).toHaveBeenCalledWith(10);
  });

  it("busca en el servidor y limpia los filtros con el botón", async () => {
    m.listarPlatillos.mockResolvedValueOnce({
      ok: true,
      datos: paginaDe([], { totalPaginas: 0 }),
    });
    pintar();
    const buscador = screen.getByPlaceholderText(
      "Buscar por nombre de platillo...",
    ) as HTMLInputElement;
    expect(
      screen.queryByRole("button", { name: "Limpiar filtros" }),
    ).toBeNull();

    fireEvent.change(buscador, { target: { value: "zzz" } });

    expect(m.listarPlatillos).not.toHaveBeenCalled();
    expect(await screen.findByText("Sin resultados")).toBeTruthy();
    expect(m.listarPlatillos).toHaveBeenCalledWith(1, 1, "zzz");

    m.listarPlatillos.mockResolvedValueOnce({
      ok: true,
      datos: paginaDe([platillo, inactivo]),
    });
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    await waitFor(() =>
      expect(m.listarPlatillos).toHaveBeenLastCalledWith(1, 1, ""),
    );
    await waitFor(() => expect(screen.queryByText("Sin resultados")).toBeNull());
    expect(buscador.value).toBe("");
    expect(
      screen.queryByRole("button", { name: "Limpiar filtros" }),
    ).toBeNull();
  });

  it("muestra el estado vacío cuando no hay platillos", () => {
    pintar(paginaVacia<Platillo>());

    expect(screen.getByText("Aún no hay platillos")).toBeTruthy();
  });

  it("no muestra el paginador con una sola página", () => {
    pintar();

    expect(
      screen.queryByRole("navigation", { name: "Paginación de platillos" }),
    ).toBeNull();
  });

  it("cambia de página con el paginador", async () => {
    m.listarPlatillos.mockResolvedValue({
      ok: true,
      datos: paginaDe([otro], { pagina: 2, totalPaginas: 2, total: 11 }),
    });
    pintar(paginaDe([platillo, inactivo], { totalPaginas: 2, total: 11 }));

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));

    await waitFor(() =>
      expect(m.listarPlatillos).toHaveBeenCalledWith(1, 2, ""),
    );
    expect((await screen.findAllByText("Sopa de res")).length).toBeGreaterThan(
      0,
    );
    expect(screen.getByRole("button", { name: "Página anterior" })).toBeEnabled();
  });

  it("si la página ya no existe salta a la última", async () => {
    m.listarPlatillos
      .mockResolvedValueOnce({
        ok: true,
        datos: paginaDe([], { pagina: 2, totalPaginas: 1, total: 0 }),
      })
      .mockResolvedValueOnce({ ok: true, datos: paginaDe([otro]) });
    pintar(paginaDe([platillo, inactivo], { totalPaginas: 3, total: 25 }));

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));

    await waitFor(() =>
      expect(m.listarPlatillos).toHaveBeenLastCalledWith(1, 1, ""),
    );
    expect((await screen.findAllByText("Sopa de res")).length).toBeGreaterThan(
      0,
    );
  });

  it("muestra el error inicial y reintenta", async () => {
    m.listarPlatillos.mockResolvedValue({
      ok: true,
      datos: paginaDe([platillo]),
    });
    render(
      <PlatillosView
        sucursalId={1}
        inicial={paginaVacia<Platillo>()}
        errorInicial="No pudimos completar la operación. Intenta de nuevo."
        guardado={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() =>
      expect(m.listarPlatillos).toHaveBeenCalledWith(1, 1, ""),
    );
    expect(
      (await screen.findAllByText("Pupusa revuelta")).length,
    ).toBeGreaterThan(0);
  });
});
