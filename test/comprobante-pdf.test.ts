import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/comprobantes/[id]/pdf/route";
import { getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));
const pedir = (id = "25") => GET(new Request("http://localhost/api/comprobantes/" + id + "/pdf"), { params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.stubEnv("API_URL", "http://localhost:3001/api/v1");
  vi.mocked(getSession).mockResolvedValue("fixture");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("PDF del comprobante", () => {
  it("reenvía la sesión y conserva el PDF y su nombre", async () => {
    const fetchPdf = vi.fn().mockResolvedValue(new Response("%PDF-ficticio", {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="comprobante-25.pdf"' },
    }));
    vi.stubGlobal("fetch", fetchPdf);
    const respuesta = await pedir();
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("Content-Disposition")).toBe('attachment; filename="comprobante-25.pdf"');
    expect(await respuesta.text()).toBe("%PDF-ficticio");
    expect(fetchPdf).toHaveBeenCalledWith(new URL("http://localhost:3001/api/v1/comprobantes/25/pdf"),
      expect.objectContaining({ headers: { Authorization: "Bearer fixture", Accept: "application/pdf" } }));
  });

  it.each([403, 404, 409])("conserva HTTP %i", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status })));
    expect((await pedir()).status).toBe(status);
  });

  it("requiere sesión antes de solicitar el PDF", async () => {
    vi.mocked(getSession).mockResolvedValue(undefined);
    const peticion = vi.fn();
    vi.stubGlobal("fetch", peticion);
    expect((await pedir()).status).toBe(401);
    expect(peticion).not.toHaveBeenCalled();
  });
});
