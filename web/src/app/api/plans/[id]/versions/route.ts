import { addVersion, getPlanMeta, getVersions } from '@/lib/plans';
import { getBaseUrl, planUrl } from '@/lib/base-url';
import { isValidId } from '@/lib/ids';
import { jsonError, readJsonBody, MAX_HTML_BYTES } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx): Promise<Response> {
  const { id } = await ctx.params;
  if (!isValidId(id)) return jsonError('Not found', 404);

  const meta = getPlanMeta(id);
  if (!meta) return jsonError('Not found', 404);

  return Response.json({ id, currentVersion: meta.currentVersion, versions: getVersions(id) });
}

export async function POST(req: Request, ctx: Ctx): Promise<Response> {
  const { id } = await ctx.params;
  if (!isValidId(id)) return jsonError('Not found', 404);

  const body = await readJsonBody(req);
  if (!body || typeof body !== 'object') return jsonError('Request body must be JSON');

  const { html, note, title } = body as Record<string, unknown>;
  if (typeof html !== 'string' || !html.trim()) return jsonError('`html` is required');
  if (Buffer.byteLength(html, 'utf8') > MAX_HTML_BYTES) {
    return jsonError('`html` exceeds the size limit', 413);
  }
  if (note != null && typeof note !== 'string') return jsonError('`note` must be a string');
  if (title != null && typeof title !== 'string') return jsonError('`title` must be a string');

  const meta = addVersion(id, {
    html,
    note: typeof note === 'string' ? note : null,
    title: typeof title === 'string' && title.trim() ? title.trim() : null,
  });
  if (!meta) return jsonError('Not found', 404);

  const base = await getBaseUrl();
  return Response.json(
    {
      id,
      version: meta.currentVersion,
      currentVersion: meta.currentVersion,
      url: planUrl(base, id),
      versionUrl: planUrl(base, id, meta.currentVersion),
    },
    { status: 201 },
  );
}
