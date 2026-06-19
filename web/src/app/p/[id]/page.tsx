import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPlanMeta } from '@/lib/plans';
import { isValidId } from '@/lib/ids';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const meta = isValidId(id) ? getPlanMeta(id) : null;
  return { title: meta ? meta.title : 'Not found · post-plan' };
}

/**
 * The shared plan link IS the plan — no chrome. It renders full-viewport in a
 * sandboxed, opaque-origin iframe (keeps untrusted plan HTML isolated from the
 * app). Browse/manage lives on the dashboard (`/`), not on this page.
 * `?v=N` pins a specific version.
 */
export default async function PlanPage({ params, searchParams }: Props) {
  const { id } = await params;
  if (!isValidId(id)) notFound();

  const meta = getPlanMeta(id);
  if (!meta) notFound();

  const sp = await searchParams;
  const vRaw = Array.isArray(sp.v) ? sp.v[0] : sp.v;
  const version = vRaw && /^\d+$/.test(vRaw) ? `?v=${vRaw}` : '';

  return (
    <iframe
      src={`/api/plans/${id}/html${version}`}
      title={meta.title}
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      style={{ display: 'block', width: '100%', height: '100vh', border: 'none' }}
    />
  );
}
