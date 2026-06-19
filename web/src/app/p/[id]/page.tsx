import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPlanMeta, getVersions } from '@/lib/plans';
import { getBaseUrl, planUrl } from '@/lib/base-url';
import { isValidId } from '@/lib/ids';
import { ViewerClient } from './ViewerClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const meta = isValidId(id) ? getPlanMeta(id) : null;
  return { title: meta ? `${meta.title} · post-plan` : 'Not found · post-plan' };
}

export default async function ViewerPage({ params }: Props) {
  const { id } = await params;
  if (!isValidId(id)) notFound();

  const meta = getPlanMeta(id);
  if (!meta) notFound();

  const versions = getVersions(id);
  const base = await getBaseUrl();

  return (
    <ViewerClient
      id={id}
      title={meta.title}
      project={meta.project}
      versions={versions}
      currentVersion={meta.currentVersion}
      shareUrl={planUrl(base, id)}
    />
  );
}
