'use client';

import { useState } from 'react';
import type { VersionMeta } from '@/lib/plans';

type Props = {
  id: string;
  title: string;
  project: string | null;
  versions: VersionMeta[];
  currentVersion: number;
  /** Canonical public viewer URL for the plan (current version). */
  shareUrl: string;
};

export function ViewerClient({ id, title, project, versions, currentVersion, shareUrl }: Props) {
  const [v, setV] = useState(currentVersion);

  const src = `/api/plans/${id}/html?v=${v}`;
  const copyUrl = v === currentVersion ? shareUrl : `${shareUrl}?v=${v}`;

  return (
    <div className="viewer">
      <header className="bar">
        <div className="bar-left">
          <a href="/" className="back">
            ← Plans
          </a>
          <span className="title">{title}</span>
          {project ? <span className="badge">{project}</span> : null}
        </div>
        <div className="bar-right">
          {versions.length > 1 ? (
            <label className="vsel">
              version
              <select value={v} onChange={(e) => setV(Number(e.target.value))}>
                {versions.map((ver) => (
                  <option key={ver.version} value={ver.version}>
                    v{ver.version}
                    {ver.version === currentVersion ? ' (current)' : ''}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <CopyButton url={copyUrl} />
          <a className="btn" href={src} target="_blank" rel="noreferrer">
            Open ↗
          </a>
        </div>
      </header>

      <iframe
        key={src}
        className="frame"
        src={src}
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        title={title}
      />
    </div>
  );
}

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          /* clipboard unavailable (e.g. non-secure context) — ignore */
        }
      }}
    >
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  );
}
