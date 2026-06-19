import { getPlanMeta, getVersions } from '@/lib/plans';
import { getBaseUrl, planUrl } from '@/lib/base-url';
import { isValidId } from '@/lib/ids';
import { jsonError } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx): Promise<Response> {
  const { id } = await ctx.params;
  if (!isValidId(id)) return jsonError('Not found', 404);

  const meta = getPlanMeta(id);
  if (!meta) return jsonError('Not found', 404);

  const base = await getBaseUrl();
  return Response.json({ ...meta, url: planUrl(base, meta.id), versions: getVersions(id) });
}
