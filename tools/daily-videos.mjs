#!/usr/bin/env node
// Copies the newest Transhuman Daily videos (GitHub releases td-ep-<date>) into _site/daily/media/<date>/video.mp4, so they
// play inline on iPhones (GitHub serves release assets as downloads, which Safari won't play in a page). Run after the build,
// with GH_TOKEN set (the Actions token is enough). A video that can't be fetched only logs a warning: its page links to the
// release instead.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, process.env.OUT_DIR || '_site');
const repo = process.env.GITHUB_REPOSITORY || 'peterxing/transhumanism-australia';
let index;
try { index = JSON.parse(fs.readFileSync(path.join(ROOT, 'daily', 'data', 'index.json'), 'utf8')); } catch { console.log('[videos] no daily index yet'); process.exit(0); }
let n = 0;
for (const e of index.episodes || []) {
  if (!e.video || !e.video.pages) continue;
  const dest = path.join(OUT, e.video.file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try {
    execFileSync('gh', ['release', 'download', `td-ep-${e.date}`, '--repo', repo, '--pattern', '*.mp4', '--output', dest, '--clobber'], { stdio: 'pipe' });
    console.log(`[videos] ${e.date}: ${(fs.statSync(dest).size / 1e6).toFixed(1)} MB`);
    n++;
  } catch (err) {
    console.log(`[videos] WARN ${e.date}: ${String(err.stderr || err.message).trim().slice(0, 200)}`);
  }
}
console.log(`[videos] ${n} video(s) on Pages`);
