# post-plan

A tiny, self-hosted web app where AI agents publish their implementation plans as
**HTML pages** and get back a **stable, shareable URL** — instead of leaving plans
buried in chat or scratch markdown files.

One agent writes a plan and publishes it → you get a link → you review the rendered
plan in a browser → you can hand that link to a *second* agent to verify or refine
it, which publishes a **new version** under the same URL. The result is one
centralized, organized, versioned home for your plans, viewable from any device on
your network.

Agents talk to it through a bundled **MCP server**, so tools like Claude Code can
publish/fetch/refine plans natively.

---

## How it works

```
agent ──(MCP: publish_plan)──▶ post-plan ──▶ https://planned.example.dev/p/k3f9qm2p
                                   │
you open the URL ◀─────────────────┘   (rendered with a consistent theme)
   │
   └─ hand the URL to another agent ──(MCP: get_plan → update_plan)──▶ new version, same URL
```

- **Publish** — agent sends HTML; the app stores it and returns a short URL.
- **View** — the app renders the plan with a consistent baseline theme (the agent's
  own styles still win), shown in a sandboxed iframe with a version switcher.
- **Refine** — a second agent fetches the original source, edits it, and publishes a
  new version. Old versions are kept.

## Features

- Publish HTML plans, get a stable short URL (`/p/<id>`).
- **Versioning** — every refinement is a new version under the same URL, with history.
- **Auto-theming** — plans look consistent without each agent shipping CSS; agents can
  still style their own sections (their styles override the baseline).
- Dashboard listing with optional **project** grouping/filter and title search.
- **MCP server** with `publish_plan`, `get_plan`, `list_plans`, `update_plan`, a
  `plan` prompt, and a format resource.
- No accounts, no database server — a single SQLite file. Built to sit behind a
  reverse proxy on your Tailscale network.

---

## Quick start (development)

Requires **Node ≥ 20** and **pnpm**.

```bash
pnpm install
pnpm dev          # web app on http://localhost:3000
```

Open http://localhost:3000 — you'll see an empty dashboard. Publish a test plan:

```bash
curl -X POST http://localhost:3000/api/plans \
  -H 'content-type: application/json' \
  -d '{"title":"Hello","project":"demo","html":"<h1>Hello</h1><p>my first plan</p>"}'
# → {"id":"...","url":"http://localhost:3000/p/...","version":1, ...}
```

Visit the returned URL to see it rendered.

## Production

The app is a long-running Node server (not serverless).

**Docker (recommended):**

```bash
docker build -t post-plan .
docker run -d --name post-plan \
  -p 127.0.0.1:3000:3000 \
  -v post-plan-data:/data \
  -e PUBLIC_BASE_URL=https://planned.example.dev \
  post-plan
```

Publishing to `127.0.0.1:3000` keeps it off public interfaces — only your reverse
proxy reaches it.

**Without Docker:**

```bash
pnpm --filter ./web build
# standalone server lands at web/.next/standalone/web/server.js
cp -r web/.next/static web/.next/standalone/web/.next/static
PUBLIC_BASE_URL=https://planned.example.dev \
DATABASE_PATH=/srv/post-plan/data.db \
HOSTNAME=127.0.0.1 PORT=3000 \
node web/.next/standalone/web/server.js
```

(For a quick start you can also just run `pnpm --filter ./web start` after a build.)

### Run as a systemd service

`scripts/install-service.sh` builds both packages and installs a systemd unit that
runs the app bound to `127.0.0.1` (front it with nginx — see below). It defaults to a
**user** service (no sudo) with lingering, so it survives logout/reboot:

```bash
./scripts/install-service.sh            # user service (no sudo) + linger
./scripts/install-service.sh --system   # system service (sudo), runs as you, boot start
```

Configure with env vars, e.g. a different port and your public URL:

```bash
PORT=3000 PUBLIC_BASE_URL=https://planned.example.dev ./scripts/install-service.sh
```

Manage it: `systemctl --user status post-plan`, `journalctl --user -u post-plan -f`.
Re-run the script to rebuild + restart after a `git pull`; remove it with
`./scripts/install-service.sh --uninstall`. (It resolves a stable fnm `default`-alias
node path, so the unit keeps working across reboots.)

### Configuration

| Variable | Default | Purpose |
|---|---|---|
| `PUBLIC_BASE_URL` | (request host) | Public URL used to build the links the app returns. **Set this** behind a proxy, or links come out as `localhost`. |
| `DATABASE_PATH` | `./data/post-plan.db` | SQLite file location (created on boot). |
| `PORT` | `3000` | Port to bind. |
| `HOSTNAME` | `0.0.0.0` (Docker) | Interface to bind. Use `127.0.0.1` for bare-metal so only the proxy reaches it. |

---

## Connect your agents (MCP)

Build the MCP server once:

```bash
pnpm --filter ./mcp build
```

Then register it with your agent. For **Claude Code**, add a `.mcp.json` (project or
user scope):

```json
{
  "mcpServers": {
    "post-plan": {
      "command": "node",
      "args": ["/absolute/path/to/post-plan/mcp/dist/index.js"],
      "env": { "POST_PLAN_API_BASE_URL": "http://localhost:3000" }
    }
  }
}
```

`POST_PLAN_API_BASE_URL` is how the MCP server *reaches* the app (localhost, a
`*.ts.net` host, or your domain). It can differ from `PUBLIC_BASE_URL` (which is
what humans see in the returned links).

### Tools, prompt, and resource

| Surface | What it does |
|---|---|
| `publish_plan` | Publish a plan as HTML → returns the shareable URL. |
| `get_plan` | Fetch a plan's original source HTML (by id or URL) to read/verify/refine. |
| `update_plan` | Publish a new version of an existing plan (same URL). |
| `list_plans` | List plans, optionally filtered by project. |
| `plan` prompt | `/mcp__post-plan__plan` — loads the full HTML authoring spec + skeleton on demand. |
| `post-plan://format` resource | The same authoring spec as a fetchable document. |

### How agents are steered (context-conscious)

- **Always-on, tiny:** the server advertises short `instructions` at connect time —
  "publish plans to post-plan as semantic HTML, return the URL" — plus a compact
  `publish_plan` description. This is all that's loaded every turn.
- **On demand, deep:** the full authoring format + skeleton live in the `plan` prompt
  and the `post-plan://format` resource, pulled in only when you're actually planning.
- Because the app auto-themes, the small always-on footprint still yields consistent
  plans.

**Optional fallback** — if you want post-plan to be the *automatic* default (not just
when asked), drop this into your project or global `CLAUDE.md` / `AGENTS.md`:

```md
## Plans
When you create an implementation plan, publish it to post-plan with the
`publish_plan` MCP tool and give me the returned URL, instead of writing a
markdown plan file. Write the plan as semantic HTML (the app themes it).
To revise an existing plan, use `get_plan` then `update_plan`.
```

### Authoring format

Agents author plans as semantic HTML; the app supplies the theme, so a `<style>`
block is optional. See [`templates/plan.html`](templates/plan.html) for the canonical
skeleton (Context / Approach / Steps / Verification). The same spec is served to
agents via the `plan` prompt and the format resource.

---

## Exposing it over Tailscale

The app stays bound to `127.0.0.1`; reverse-proxy it onto your tailnet. Two ways:

**nginx (recommended)** — a ready-made server block ships in
[`deploy/post-plan.nginx.conf`](deploy/post-plan.nginx.conf); edit `server_name` + the
proxied port, then:

```bash
sudo cp deploy/post-plan.nginx.conf /etc/nginx/sites-available/post-plan
sudo ln -s ../sites-available/post-plan /etc/nginx/sites-enabled/post-plan
sudo nginx -t && sudo systemctl reload nginx
```

It forwards `X-Forwarded-Host`/`-Proto` so share links come out right. For HTTPS,
issue a cert with `tailscale cert <name>` and use the `443` block in that file (then
set `PUBLIC_BASE_URL=https://<name>`).

**Tailscale Serve (zero-config alternative)** — no nginx, instant HTTPS at your
`*.ts.net` name:

```bash
tailscale serve 3000   # → https://<machine>.<tailnet>.ts.net
```

For a custom domain like `planned.dalem.dev`, point its DNS at the node's tailnet IP
(split-DNS / MagicDNS) and use the nginx block above. Either way, set
`PUBLIC_BASE_URL` to the public URL so returned links match.

---

## HTTP API

| Method · Path | Purpose |
|---|---|
| `POST /api/plans` | Create a plan. Body `{title, html, project?, note?}` → `{id, url, version}`. |
| `GET /api/plans` | List plans. `?project=&q=&limit=&offset=`. Metadata only. |
| `GET /api/plans/:id` | Plan metadata + version list. |
| `POST /api/plans/:id/versions` | Add a version. Body `{html, note?, title?}`. |
| `GET /api/plans/:id/versions` | Version history. |
| `GET /api/plans/:id/html?v=&raw=` | The plan document. `raw=0` (default) = themed; `raw=1` = original source; `v` = version. |

## Security model

There is **no authentication** — the security boundary is your network (Tailscale).
Run it behind a reverse proxy bound to localhost; do not expose it to the public
internet. Anyone who can reach it can publish and view plans. Plan HTML is rendered in
a sandboxed, opaque-origin iframe (`allow-scripts`, no `allow-same-origin`), and there
are no app cookies or sessions to steal.

## Project layout

```
web/   Next.js app — dashboard, viewer, JSON + HTML API, SQLite access
mcp/   MCP server (stdio) — a thin HTTP client over the web API
templates/plan.html   canonical plan skeleton
```

## License

MIT
