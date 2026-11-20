import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { procesarPago } from "@/app/actions/pagos";
import type { SolicitudPago } from "@/lib/pagos";

vi.mock("@/lib/session", () => ({ getSession: async () => "sesion-de-prueba" }));

const fetchApi = vi.fn();
const solicitud: SolicitudPago = {
  solicitudId: "solicitud",
  ticket: { id: 87, total: 17.5, items: [] },
  metodo: "EFECTIVO",
  montoRecibido: "20",
  correoLealtad: "cliente@example.test",
};

beforeEach(() => {
  fetchApi.mockReset();
  vi.stubEnv("API_URL", "http://localhost:3000/api/v1");
  vi.stubGlobal("fetch", fetchApi);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it.each([
  "El correo no corresponde a un cliente registrado.",
  "El cliente no está habilitado para acumular puntos.",
])("conserva el mensaje de lealtad de la API: %s", async (message) => {
  fetchApi.mockResolvedValue(Response.json({ statusCode: 400, message }, { status: 400 }));
  await expect(procesarPago(solicitud)).resolves.toMatchObject({
    ok: false, estado: 400, error: message,
  });
  expect(fetchApi).toHaveBeenCalledWith(
    new URL("http://localhost:3000/api/v1/pagos/procesar"),
    expect.objectContaining({ method: "POST", body: JSON.stringify(solicitud) }),
  );
});

it("mantiene el mensaje de cobro para otros errores de validación", async () => {
  fetchApi.mockResolvedValue(Response.json({ message: "Otro error" }, { status: 400 }));
  await expect(procesarPago(solicitud)).resolves.toMatchObject({
    ok: false, estado: 400, error: "Revisa el importe, los datos del pago y el detalle del pedido.",
  });
});
