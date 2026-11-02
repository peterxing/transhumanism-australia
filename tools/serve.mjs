#!/usr/bin/env node
// Local preview that routes like GitHub Pages: /events serves events.html, folders serve index.html, misses get 404.html.
//   node tools/build.mjs && node tools/serve.mjs   ->  http://localhost:8787
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', process.env.OUT_DIR || '_site');
const PORT = Number(process.env.PORT || 8787);
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain', '.ics': 'text/calendar' };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const candidates = [rel, `${rel}.html`, path.join(rel, 'index.html')];
  for (const c of candidates) {
    const p = path.join(ROOT, c);
    if (p.startsWith(ROOT) && fs.existsSync(p) && fs.statSync(p).isFile()) {
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
      return fs.createReadStream(p).pipe(res);
    }
  }
  res.writeHead(404, { 'Content-Type': TYPES['.html'] });
  fs.createReadStream(path.join(ROOT, '404.html')).pipe(res);
}).listen(PORT, () => console.log(`serving ${ROOT} on http://localhost:${PORT}`));
