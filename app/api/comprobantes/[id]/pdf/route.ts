import { getSession } from "@/lib/session";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || Number(id) < 1 || Number(id) > 2147483647) {
    return new Response(null, { status: 404 });
  }

  try {
    const token = await getSession();
    if (!token) return new Response(null, { status: 401 });
    const base = process.env.API_URL;
    if (!base) return new Response(null, { status: 502 });

    const upstream = await fetch(new URL(`comprobantes/${id}/pdf`, base.replace(/\/?$/, "/")), {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/pdf" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!upstream.ok) return new Response(null, { status: upstream.status });
    if (!upstream.body || !upstream.headers.get("Content-Type")?.startsWith("application/pdf")) {
      return new Response(null, { status: 502 });
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": upstream.headers.get("Content-Disposition") ?? `attachment; filename="comprobante-${id}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
