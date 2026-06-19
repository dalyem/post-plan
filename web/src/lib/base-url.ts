import { headers } from 'next/headers';

/**
 * Resolve the public-facing base URL used to build shareable plan links.
 *
 * Prefers PUBLIC_BASE_URL (strongly recommended in any reverse-proxy setup).
 * Falls back to the forwarded host headers that Caddy / Tailscale set — NOT the
 * raw Host — so generated links don't come out as `localhost`.
 */
export async function getBaseUrl(): Promise<string> {
  const env = process.env.PUBLIC_BASE_URL?.trim();
  if (env) return env.replace(/\/+$/, '');

  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}

/** Build the canonical viewer URL for a plan (optionally pinned to a version). */
export function planUrl(base: string, id: string, version?: number): string {
  const url = `${base}/p/${id}`;
  return version ? `${url}?v=${version}` : url;
}
