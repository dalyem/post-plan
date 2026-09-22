import { parse } from 'node-html-parser';
import { BASE_THEME_CSS } from './theme';

const THEME_STYLE = `<style id="post-plan-base-theme">\n${BASE_THEME_CSS}\n</style>`;
/**
 * Mermaid support. Diagrams are authored as <pre class="mermaid">…</pre> (or a
 * <pre><code class="language-mermaid"> block). The loader runs only when such a
 * block exists, pulls the same-origin bundle from /vendor/mermaid.min.js (no CDN,
 * plans stay self-contained) and renders in the reader's color scheme.
 */
const MERMAID_LOADER = `<script id="post-plan-mermaid">(function(){
function ready(f){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",f):f();}
ready(function(){
  var blocks=[];
  document.querySelectorAll("pre.mermaid, div.mermaid, pre > code.language-mermaid, pre > code.mermaid").forEach(function(el){
    var host=el.tagName==="CODE"?el.parentElement:el; if(host.__ppMermaid) return; host.__ppMermaid=1;
    var d=document.createElement("pre"); d.className="mermaid"; d.textContent=el.textContent; host.replaceWith(d); blocks.push(d);
  });
  if(!blocks.length) return;
  var dark=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;
  var s=document.createElement("script"); s.src="/vendor/mermaid.min.js";
  s.onload=function(){try{window.mermaid.initialize({startOnLoad:false,theme:dark?"dark":"default",securityLevel:"strict"});window.mermaid.run({nodes:blocks});}catch(e){console.error("mermaid",e);}};
  s.onerror=function(){console.error("post-plan: mermaid bundle failed to load");};
  document.head.appendChild(s);
});})();</script>`;


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
    head.insertAdjacentHTML('afterbegin', THEME_STYLE + MERMAID_LOADER);
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
${MERMAID_LOADER}
</head>
<body>
${rawHtml}
</body>
</html>`;
}
