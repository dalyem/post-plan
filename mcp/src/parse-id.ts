const BARE_ID = /^[a-z0-9]{4,24}$/i;
// Pull the id out of a viewer URL (/p/<id>) or an API URL (/.../plans/<id>/...).
const PATH_ID = /\/(?:p|plans)\/([a-z0-9]{4,24})/i;

/**
 * Accept a bare plan id (e.g. "k3f9qm2p") or any post-plan URL
 * (https://host/p/k3f9qm2p?v=2, https://host/api/plans/k3f9qm2p/html, …) and
 * return the id. Throws if no id can be extracted.
 */
export function parseId(input: string): string {
  const s = String(input ?? '').trim();
  if (!s) throw new Error('No plan id or URL provided');
  if (BARE_ID.test(s)) return s.toLowerCase();

  let pathname = s;
  try {
    pathname = new URL(s).pathname;
  } catch {
    /* not a URL — fall through to matching against the raw string */
  }
  const match = pathname.match(PATH_ID) ?? s.match(PATH_ID);
  if (match) return match[1].toLowerCase();

  throw new Error(`Could not parse a plan id from: ${input}`);
}
