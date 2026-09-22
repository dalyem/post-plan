/**
 * Baseline house theme injected into every rendered plan.
 *
 * Written at LOW specificity (bare element selectors + :root variables, no
 * !important) and inserted as the FIRST <style> in <head>, so anything the
 * authoring agent defines later overrides it. This gives every plan a uniform
 * look while still letting an agent style its own sections.
 */
export const BASE_THEME_CSS = `
:root {
  color-scheme: light dark;
  --pp-bg: #ffffff;
  --pp-fg: #1f2328;
  --pp-muted: #656d76;
  --pp-border: #d0d7de;
  --pp-accent: #0969da;
  --pp-code-bg: #f6f8fa;
  --pp-max-width: 820px;
  --pp-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --pp-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}
@media (prefers-color-scheme: dark) {
  :root {
    --pp-bg: #0d1117;
    --pp-fg: #e6edf3;
    --pp-muted: #9198a1;
    --pp-border: #30363d;
    --pp-accent: #4493f8;
    --pp-code-bg: #161b22;
  }
}
html { box-sizing: border-box; -webkit-text-size-adjust: 100%; }
*, *::before, *::after { box-sizing: inherit; }
body {
  margin: 0 auto;
  max-width: var(--pp-max-width);
  padding: 2.5rem 1.25rem 6rem;
  font-family: var(--pp-font);
  font-size: 16px;
  line-height: 1.65;
  color: var(--pp-fg);
  background: var(--pp-bg);
}
h1, h2, h3, h4, h5, h6 { line-height: 1.25; font-weight: 600; margin: 2rem 0 0.75rem; }
h1 { font-size: 1.9rem; margin-top: 0; }
h2 { font-size: 1.4rem; padding-bottom: 0.3rem; border-bottom: 1px solid var(--pp-border); }
h3 { font-size: 1.15rem; }
p, ul, ol, blockquote, table, pre, dl { margin: 0 0 1rem; }
a { color: var(--pp-accent); text-decoration: none; }
a:hover { text-decoration: underline; }
strong { font-weight: 600; }
code { font-family: var(--pp-mono); font-size: 0.9em; background: var(--pp-code-bg); padding: 0.15em 0.4em; border-radius: 6px; }
pre { background: var(--pp-code-bg); padding: 1rem; border-radius: 8px; overflow: auto; border: 1px solid var(--pp-border); }
pre code { background: none; padding: 0; font-size: 0.85em; }
blockquote { margin-left: 0; padding: 0.25rem 1rem; color: var(--pp-muted); border-left: 3px solid var(--pp-border); }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid var(--pp-border); padding: 0.5rem 0.75rem; text-align: left; vertical-align: top; }
th { background: var(--pp-code-bg); }
hr { border: none; border-top: 1px solid var(--pp-border); margin: 2rem 0; }
img { max-width: 100%; height: auto; }
ul, ol { padding-left: 1.5rem; }
li { margin: 0.25rem 0; }
li > ul, li > ol { margin-bottom: 0; }
pre.mermaid { background: transparent; border: none; text-align: center; overflow: visible; }
pre.mermaid svg { max-width: 100%; height: auto; }
`.trim();
