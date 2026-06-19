// Thin HTTP client over the post-plan web API. No DB access, no auth (the
// security boundary is the Tailscale network). Uses Node's global fetch.

const BASE = (process.env.POST_PLAN_API_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

export interface PlanMetaDTO {
  id: string;
  title: string;
  project: string | null;
  currentVersion: number;
  versionCount: number;
  createdAt: string;
  updatedAt: string;
  url: string;
}
export interface CreateResult extends PlanMetaDTO {
  version: number;
}
export interface VersionMetaDTO {
  version: number;
  title: string | null;
  note: string | null;
  createdAt: string;
}
export interface MetaResult extends PlanMetaDTO {
  versions: VersionMetaDTO[];
}
export interface AddVersionResult {
  id: string;
  version: number;
  currentVersion: number;
  url: string;
  versionUrl: string;
}
export interface ListResult {
  plans: PlanMetaDTO[];
  total: number;
}

async function jsonReq<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = await res.text();
  let data: unknown = null;
  if (body) {
    try {
      data = JSON.parse(body);
    } catch {
      data = body;
    }
  }
  if (!res.ok) {
    const msg =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : typeof data === 'string' && data
          ? data
          : res.statusText;
    throw new Error(`post-plan API ${res.status}: ${msg}`);
  }
  return data as T;
}

export const api = {
  baseUrl: BASE,

  createPlan(body: {
    title: string;
    html: string;
    project?: string;
    note?: string;
  }): Promise<CreateResult> {
    return jsonReq('/api/plans', { method: 'POST', body: JSON.stringify(body) });
  },

  addVersion(
    id: string,
    body: { html: string; note?: string; title?: string },
  ): Promise<AddVersionResult> {
    return jsonReq(`/api/plans/${encodeURIComponent(id)}/versions`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  getMeta(id: string): Promise<MetaResult> {
    return jsonReq(`/api/plans/${encodeURIComponent(id)}`);
  },

  listPlans(opts: { project?: string; limit?: number } = {}): Promise<ListResult> {
    const q = new URLSearchParams();
    if (opts.project) q.set('project', opts.project);
    if (opts.limit) q.set('limit', String(opts.limit));
    const qs = q.toString();
    return jsonReq(`/api/plans${qs ? `?${qs}` : ''}`);
  },

  /** Fetch the original (un-themed) source HTML for an agent to read/refine. */
  async getSource(id: string, version?: number): Promise<string> {
    const q = new URLSearchParams({ raw: '1' });
    if (version) q.set('v', String(version));
    const res = await fetch(`${BASE}/api/plans/${encodeURIComponent(id)}/html?${q.toString()}`);
    if (!res.ok) throw new Error(`post-plan API ${res.status}: ${res.statusText}`);
    return res.text();
  },
};
