// Copy the Mermaid browser bundle into public/vendor so rendered plans can load it same-origin
// (plans are self-contained: no CDN). Runs as part of `pnpm build`.
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url);
const src = join(dirname(require.resolve('mermaid/package.json')), 'dist', 'mermaid.min.js');
const dst = join(dirname(new URL(import.meta.url).pathname), '..', 'public', 'vendor', 'mermaid.min.js');
mkdirSync(dirname(dst), { recursive: true });
copyFileSync(src, dst);
console.log(`copied mermaid bundle -> ${dst}`);
