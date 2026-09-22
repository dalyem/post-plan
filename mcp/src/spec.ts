// Single source of truth for how agents should author plans and documents. Fed
// into three channels: the always-on server `instructions`, the compact
// publish_plan description, and the on-demand `plan` prompt + `post-plan-format`
// resource.

export const FORMAT_RESOURCE_URI = 'post-plan://format';

/** Tier 1 — tiny, always-on. Injected into the client at connect time. */
export const PLAN_INSTRUCTIONS = [
  'post-plan turns plans, research, and design/review documents into shareable, themed HTML pages.',
  'Whenever you produce a substantial document for the user to read or review — an implementation plan, research findings, a design doc, an audit, an investigation —',
  'publish it to post-plan as semantic HTML with `publish_plan` and give the user the returned URL, instead of (or alongside) a local markdown file.',
  'If you drafted it under a plan/approval flow that writes a local file (e.g. plan mode), publish it to post-plan as soon as the user approves it.',
  'To build on existing work, find it with `list_plans` / `get_plan` and publish revisions with `update_plan` (a new version under the same URL).',
  "After publishing or updating, record the document's title, URL, id, and version in a `postplan.md` manifest at the project root (newest first; update the entry in place on a revision),",
  'and read `postplan.md` first when reviewing or building on prior work for this project.',
  'The app applies a consistent baseline theme, so a <style> block is optional.',
  'All tools accept a plan id or a full plan URL.',
].join(' ');

/** Compact description shown on the publish_plan tool itself. */
export const PUBLISH_DESCRIPTION = [
  'Publish a plan, research write-up, or design/review document as an HTML page and get back a stable, shareable URL.',
  'Provide the content as semantic HTML (headings, lists, code blocks) — a full <!doctype html> document or a bare fragment.',
  'post-plan applies a consistent baseline theme, so a <style> block is optional (add one only to customize; your styles override the theme).',
  'Diagrams: put Mermaid source in <pre class="mermaid"> and it is rendered for the reader.',
  'For the full house format and a skeleton, load the `post-plan-format` resource or the `plan` prompt.',
].join(' ');

/** Canonical HTML skeleton agents should follow. */
export const PLAN_SKELETON = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Plan: short descriptive title</title>
</head>
<body>
  <h1>Plan title</h1>

  <section>
    <h2>Context</h2>
    <p>Why this work is being done — the problem or need, what prompted it, and the intended outcome.</p>
  </section>

  <section>
    <h2>Approach</h2>
    <p>The recommended approach at a high level, plus key decisions and trade-offs.</p>
  </section>

  <section>
    <h2>Steps</h2>
    <ol>
      <li>First concrete step, naming the files or areas involved.</li>
      <li>Next step…</li>
    </ol>
  </section>

  <section>
    <h2>Verification</h2>
    <p>How to confirm the change works end-to-end — commands to run and what to observe.</p>
  </section>
</body>
</html>`;

/** Tier 2 — the deep authoring spec, loaded only on demand. */
export const PLAN_SPEC = `# post-plan — HTML authoring format

Author the document as **semantic HTML** — whether it's an implementation plan,
research findings, or a design/review doc. post-plan renders it with a consistent
baseline theme (typography, colors, light/dark mode, code blocks, tables), so you
usually do **not** need to write any CSS.

## Rules
- Output valid HTML. A full \`<!doctype html>\` document is preferred; a bare fragment is also accepted and will be wrapped automatically.
- Include a descriptive \`<title>\` when you send a full document.
- Use one \`<h1>\` for the title, then \`<section>\`s introduced by \`<h2>\` headings.
- For an implementation plan, recommended sections are **Context**, **Approach**, **Steps** (an ordered list), **Verification** — add others as the work warrants (Risks, Out of scope, Open questions). Research and design docs may use whatever sections fit (e.g. Summary, Findings, Options, Recommendation).
- Use \`<pre><code>\` for code and commands, \`<ul>\`/\`<ol>\` for lists, \`<table>\` for comparisons.
- Diagrams: write Mermaid inside \`<pre class="mermaid">…</pre>\` (flowchart, sequence, state, ER, gantt). post-plan renders it client-side in the reader's light/dark scheme; inline \`<svg>\` also works.
- Keep it **self-contained**: do not depend on external assets (scripts, styles, fonts, or images referenced by URL). Inline \`<style>\`/\`<script>\` are fine if you want custom styling or interactivity — your styles override the baseline theme.

## Skeleton
\`\`\`html
${PLAN_SKELETON}
\`\`\`

After publishing, share the returned URL with the user.

## Manifest (\`postplan.md\`)
Keep a repo-local index of what you've published so you (and other agents) can find prior work for this project later.

- After a successful \`publish_plan\` or \`update_plan\`, record the entry in a \`postplan.md\` file at the project root. Create it if it doesn't exist.
- Prepend new entries (newest first). On a revision, update the existing entry in place (bump the version and date) instead of adding a duplicate.
- When asked to review or build on prior plans for this project, read \`postplan.md\` first, then use \`get_plan\` / \`list_plans\`.

Format:
\`\`\`markdown
# post-plan manifest
Project: <project name> — plans published for this repo (newest first). Maintained by agents.

- **<plan title>** — <url> (\`<id>\`, v<version>, <YYYY-MM-DD>)
\`\`\`
The \`Project:\` header records the post-plan \`project\` name so you know what to pass to \`list_plans\`.`;
