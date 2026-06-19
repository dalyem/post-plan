// Single source of truth for how agents should author plans. Fed into three
// channels: the always-on server `instructions`, the compact publish_plan
// description, and the on-demand `plan` prompt + `post-plan-format` resource.

export const FORMAT_RESOURCE_URI = 'post-plan://format';

/** Tier 1 — tiny, always-on. Injected into the client at connect time. */
export const PLAN_INSTRUCTIONS = [
  'post-plan stores implementation plans as shareable HTML pages.',
  'When the user asks for an implementation plan, publish it to post-plan instead of (or alongside) a markdown plan file:',
  'write the plan as semantic HTML and call `publish_plan`, then give the user the returned URL.',
  'The app applies a consistent baseline theme, so a <style> block is optional.',
  'To revise an existing plan, fetch it with `get_plan` and publish the revision with `update_plan` (a new version under the same URL).',
  'All tools accept a plan id or a full plan URL.',
].join(' ');

/** Compact description shown on the publish_plan tool itself. */
export const PUBLISH_DESCRIPTION = [
  'Publish an implementation plan as an HTML page and get back a stable, shareable URL.',
  'Provide the plan as semantic HTML (headings, lists, code blocks) — a full <!doctype html> document or a bare fragment.',
  'post-plan applies a consistent baseline theme, so a <style> block is optional (add one only to customize; your styles override the theme).',
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
export const PLAN_SPEC = `# post-plan — HTML plan authoring format

Author the plan as **semantic HTML**. post-plan renders it with a consistent
baseline theme (typography, colors, light/dark mode, code blocks, tables), so you
usually do **not** need to write any CSS.

## Rules
- Output valid HTML. A full \`<!doctype html>\` document is preferred; a bare fragment is also accepted and will be wrapped automatically.
- Include a descriptive \`<title>\` when you send a full document.
- Use one \`<h1>\` for the plan title, then \`<section>\`s introduced by \`<h2>\` headings.
- Recommended sections: **Context**, **Approach**, **Steps** (an ordered list), **Verification**. Add others as the work warrants (Risks, Out of scope, Open questions).
- Use \`<pre><code>\` for code and commands, \`<ul>\`/\`<ol>\` for lists, \`<table>\` for comparisons.
- Keep it **self-contained**: do not depend on external assets (scripts, styles, fonts, or images referenced by URL). Inline \`<style>\`/\`<script>\` are fine if you want custom styling or interactivity — your styles override the baseline theme.

## Skeleton
\`\`\`html
${PLAN_SKELETON}
\`\`\`

After writing the plan, publish it with the \`publish_plan\` tool and share the
returned URL with the user.`;
