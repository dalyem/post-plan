import { parse } from 'node-html-parser';
import { BASE_THEME_CSS } from './theme';

const THEME_STYLE = `<style id="post-plan-base-theme">\n${BASE_THEME_CSS}\n</style>`;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Compose the themed, viewable document from agent-submitted HTML.
 *
 * - Full document (has <head>): inject the base theme as the first child of
 *   <head> (so agent styles, which come later, override it); add charset /
 *   viewport if missing; normalize the doctype.
 * - Bare fragment (no <head>): wrap it in a minimal themed document shell.
 *
 * The original source is never mutated on disk — this runs at render time only.
 */
export function renderThemed(rawHtml: string, fallbackTitle = 'Plan'): string {
  const root = parse(rawHtml, {
    lowerCaseTagName: false,
    comment: true,
    voidTag: { closingSlash: true },
  });
  const head = root.querySelector('head');

  if (head) {
    head.insertAdjacentHTML('afterbegin', THEME_STYLE);
    if (!head.querySelector('meta[name="viewport"]')) {
      head.insertAdjacentHTML(
        'afterbegin',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
      );
    }
    if (!head.querySelector('meta[charset]')) {
      head.insertAdjacentHTML('afterbegin', '<meta charset="utf-8">');
    }
    const body = root.toString().replace(/^\s*<!doctype[^>]*>/i, '');
    return `<!doctype html>\n${body}`;
  }

  // Fragment: wrap in a themed shell.
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(fallbackTitle)}</title>
${THEME_STYLE}
</head>
<body>
${rawHtml}
</body>
</html>`;
}
