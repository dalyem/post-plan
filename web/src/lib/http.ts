/** Max accepted size of a submitted HTML plan (guards against a runaway body). */
export const MAX_HTML_BYTES = 4 * 1024 * 1024; // 4 MB

export function jsonError(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

export async function readJsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export function intParam(value: string | null): number | undefined {
  if (value == null) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : undefined;
}

/** Shared hardening headers for the HTML document endpoint (themed + source). */
export function documentHeaders(): HeadersInit {
  return {
    'Content-Type': 'text/html; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "frame-ancestors 'self'; base-uri 'none'; form-action 'none'",
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store',
  };
}

export function htmlNotFound(): Response {
  return new Response(
    '<!doctype html><meta charset="utf-8"><title>Not found</title><h1>404 — plan not found</h1>',
    { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}
