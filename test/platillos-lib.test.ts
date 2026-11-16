import { describe, expect, it } from "vitest";
import {
  IMAGEN_MAX_BYTES,
  VALORES_VACIOS,
  cuerpoPlatillo,
  validarImagen,
  validarPlatillo,
  valoresDe,
  type Platillo,
  type ValoresPlatillo,
} from "@/lib/platillos";

const valido: ValoresPlatillo = {
  nombre: "Pupusa revuelta",
  descripcion: "Con queso",
  precio: "1.25",
  categoriaId: "2",
  disponibilidad: "40",
  imagenUrl: "/uploads/platillos/p.png",
};

describe("validarPlatillo", () => {
  it("no reporta errores con valores válidos", () => {
    expect(validarPlatillo(valido)).toEqual({});
  });

  it("pide todos los campos cuando el formulario está vacío", () => {
    expect(Object.keys(validarPlatillo(VALORES_VACIOS)).sort()).toEqual([
      "categoriaId",
      "descripcion",
      "disponibilidad",
      "imagenUrl",
      "nombre",
      "precio",
    ]);
  });

  it("rechaza un nombre de solo espacios o de más de 120 caracteres", () => {
    expect(validarPlatillo({ ...valido, nombre: "   " }).nombre).toBe(
      "El nombre del platillo es obligatorio.",
    );
    expect(validarPlatillo({ ...valido, nombre: "a".repeat(121) }).nombre).toBe(
      "El nombre no puede superar los 120 caracteres.",
    );
  });

  it("rechaza una descripción de solo espacios", () => {
    expect(validarPlatillo({ ...valido, descripcion: "  " }).descripcion).toBe(
      "La descripción es obligatoria.",
    );
  });

  it("valida el precio: vacío, no numérico, cero o negativo y más de dos decimales", () => {
    const errorDe = (precio: string) =>
      validarPlatillo({ ...valido, precio }).precio;

    expect(errorDe("")).toBe("El precio es obligatorio.");
    expect(errorDe("abc")).toBe("El precio debe ser un número.");
    expect(errorDe("0")).toBe("El precio debe ser mayor a 0.");
    expect(errorDe("-3")).toBe("El precio debe ser mayor a 0.");
    expect(errorDe("1.234")).toBe("El precio admite máximo dos decimales.");
  });

  it("acepta precios con uno o dos decimales y con coma", () => {
    for (const precio of ["1", "1.5", "1.25", "1,5"]) {
      expect(validarPlatillo({ ...valido, precio }).precio).toBeUndefined();
    }
  });

  it("valida la disponibilidad: obligatoria y entero mayor o igual a 0", () => {
    const errorDe = (disponibilidad: string) =>
      validarPlatillo({ ...valido, disponibilidad }).disponibilidad;

    expect(errorDe("")).toBe("La disponibilidad es obligatoria.");
    expect(errorDe("-1")).toBe(
      "La disponibilidad debe ser un número entero mayor o igual a 0.",
    );
    expect(errorDe("1.5")).toBe(
      "La disponibilidad debe ser un número entero mayor o igual a 0.",
    );
    expect(errorDe("0")).toBeUndefined();
  });

  it("exige elegir una categoría y subir una imagen", () => {
    const errores = validarPlatillo({
      ...valido,
      categoriaId: "",
      imagenUrl: "",
    });
    expect(errores.categoriaId).toBe("Selecciona una categoría.");
    expect(errores.imagenUrl).toBe("La imagen es obligatoria.");
  });
});

describe("validarImagen", () => {
  it("acepta JPG y PNG de hasta 2 MB", () => {
    expect(validarImagen({ type: "image/png", size: 1000 })).toBeUndefined();
    expect(validarImagen({ type: "image/jpeg", size: 1000 })).toBeUndefined();
    expect(
      validarImagen({ type: "image/png", size: IMAGEN_MAX_BYTES }),
    ).toBeUndefined();
  });

  it("rechaza otros formatos", () => {
    expect(validarImagen({ type: "image/gif", size: 1000 })).toBe(
      "La imagen debe ser JPG o PNG.",
    );
    expect(validarImagen({ type: "text/plain", size: 10 })).toBe(
      "La imagen debe ser JPG o PNG.",
    );
  });

  it("rechaza imágenes de más de 2 MB", () => {
    expect(
      validarImagen({ type: "image/png", size: IMAGEN_MAX_BYTES + 1 }),
    ).toBe("La imagen no puede superar los 2 MB.");
  });
});

describe("cuerpoPlatillo", () => {
  it("recorta los textos y convierte los números", () => {
    expect(
      cuerpoPlatillo({
        ...valido,
        nombre: "  Pupusa  ",
        descripcion: " Con queso ",
        precio: "1,25",
        disponibilidad: " 40 ",
      }),
    ).toEqual({
      nombre: "Pupusa",
      descripcion: "Con queso",
      precio: 1.25,
      categoriaId: 2,
      disponibilidad: 40,
      imagenUrl: "/uploads/platillos/p.png",
    });
  });
});

describe("valoresDe", () => {
  it("convierte un platillo en los valores del formulario", () => {
    const platillo: Platillo = {
      id: 10,
      nombre: "Pupusa revuelta",
      descripcion: null,
      imagenUrl: "/uploads/platillos/p.png",
      imagenSrc: "http://localhost:3000/uploads/platillos/p.png",
      categoriaId: 2,
      categoriaNombre: "Platos típicos",
      precio: 1.25,
      disponibilidad: 40,
      activo: true,
    };

    expect(valoresDe(platillo)).toEqual({
      nombre: "Pupusa revuelta",
      descripcion: "",
      precio: "1.25",
      categoriaId: "2",
      disponibilidad: "40",
      imagenUrl: "/uploads/platillos/p.png",
    });
  });
});
