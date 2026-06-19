import { getContent, getPlanMeta } from '@/lib/plans';
import { renderThemed } from '@/lib/render';
import { isValidId } from '@/lib/ids';
import { documentHeaders, htmlNotFound } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Serve the plan document.
 *   ?v=N    select a specific version (default: current)
 *   ?raw=1  return the original submitted source (default: themed render)
 *
 * `raw=0` (default) feeds the viewer iframe + fullscreen; `raw=1` is what an
 * agent fetches via get_plan to refine an existing plan.
 */
export async function GET(req: Request, ctx: Ctx): Promise<Response> {
  const { id } = await ctx.params;
  if (!isValidId(id)) return htmlNotFound();

  const params = new URL(req.url).searchParams;
  let version: number | undefined;
  const vRaw = params.get('v');
  if (vRaw != null) {
    version = Number.parseInt(vRaw, 10);
    if (!Number.isFinite(version) || version < 1) return htmlNotFound();
  }
  const raw = params.get('raw') === '1';

  const content = getContent(id, version);
  if (!content) return htmlNotFound();

  const title = getPlanMeta(id)?.title ?? content.title ?? 'Plan';
  const html = raw ? content.html : renderThemed(content.html, title);

  return new Response(html, { status: 200, headers: documentHeaders() });
}
