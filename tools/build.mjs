#!/usr/bin/env node
// Builds transhuman.com.au into _site/.
//   node tools/build.mjs            render from the committed data/*.json
//   node tools/build.mjs --refresh  first refresh events (Eventbrite), the Radar (feeds) and Peter's recent talks,
//                                   writing data/*.json only when something changed; then render
// Never fails on a network problem: it logs it and renders from the last good data.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readJson, writeJsonIfChanged, fetchText } from './util.mjs';
import { refreshEvents } from './events.mjs';
import { refreshRadar } from './radar.mjs';
import { renderSite } from './render.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, process.env.OUT_DIR || '_site');
const D = f => path.join(ROOT, 'data', f);
const args = new Set(process.argv.slice(2));
const now = process.env.BUILD_NOW ? new Date(process.env.BUILD_NOW) : new Date();
const log = (...a) => console.log('[build]', ...a);

const site = readJson(D('site.json'));
let events = readJson(D('events.json'));
let radar = readJson(D('radar.json'), { items: [] });
let peterTalks = readJson(D('peter-talks.json'), { talks: [] });
const sources = readJson(D('sources.json'));

if (args.has('--refresh')) {
  const [ev, rd, pt] = await Promise.allSettled([
    refreshEvents(site, events, now),
    refreshRadar(sources, radar, now),
    fetchText('https://peterxing.com/author.json').then(JSON.parse),
  ]);
  if (ev.status === 'fulfilled') {
    ev.value.log.forEach(l => log(l));
    if (writeJsonIfChanged(D('events.json'), { ...ev.value.data, updated: now.toISOString() }, ['updated'])) log('events.json updated');
    events = readJson(D('events.json'));
  } else log('events refresh failed:', ev.reason?.message || ev.reason);
  if (rd.status === 'fulfilled') {
    rd.value.log.forEach(l => log(l));
    (rd.value.status || []).filter(s => !s.ok).forEach(s => log(`  source down: ${s.source} (${s.url}): ${s.error}`));
    if (rd.value.data && writeJsonIfChanged(D('radar.json'), rd.value.data, ['updated'])) log('radar.json updated');
    radar = readJson(D('radar.json'), radar);
  } else log('radar refresh failed:', rd.reason?.message || rd.reason);
  if (pt.status === 'fulfilled' && Array.isArray(pt.value.talks) && pt.value.talks.length) {
    const talks = pt.value.talks.filter(t => t.url && t.title).map(({ title, venue, year, url }) => ({ title, venue, year, url }));
    if (writeJsonIfChanged(D('peter-talks.json'), { _about: 'Peter Xing\'s recent talks, copied from peterxing.com/author.json by tools/build.mjs --refresh.', talks })) log('peter-talks.json updated');
    peterTalks = readJson(D('peter-talks.json'));
  } else if (pt.status === 'rejected') log('peter talks refresh failed:', pt.reason?.message || pt.reason);
}

const ctx = {
  site, events, radar, sources, peterTalks, now,
  speakers: readJson(D('speakers.json')),
  people: readJson(D('people.json')),
  media: readJson(D('media.json')),
  articles: readJson(D('articles.json')),
  partners: readJson(D('partners.json')),
  version: crypto.createHash('sha1').update(fs.readFileSync(path.join(ROOT, 'assets/css/site.css')) + fs.readFileSync(path.join(ROOT, 'assets/js/site.js'))).digest('hex').slice(0, 10),
};

const files = renderSite(ctx);
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.cpSync(path.join(ROOT, 'assets'), path.join(OUT, 'assets'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'data'), { recursive: true });
for (const f of ['events.json', 'radar.json']) fs.copyFileSync(D(f), path.join(OUT, 'data', f));
for (const [rel, content] of Object.entries(files)) {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, 'utf8');
}
if (site.cname) fs.writeFileSync(path.join(OUT, 'CNAME'), site.cname + '\n');
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
log(`wrote ${Object.keys(files).length} files to ${path.relative(ROOT, OUT)}/ (next event: ${(events.upcoming || [])[0]?.start || 'none'}; radar items: ${(radar.items || []).length})`);
