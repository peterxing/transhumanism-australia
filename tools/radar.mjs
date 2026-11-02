// Builds data/radar.json: recent headlines from data/sources.json, sorted into the three supers (plus frontier tech).
// Only titles, links, outlet names and dates are kept; every headline links to its publisher.
import { fetchText, clean } from './util.mjs';

const PILLARS = ['longevity', 'wellbeing', 'intelligence', 'frontier'];

function parseFeed(xml) {
  const items = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const b of blocks) {
    const tag = name => {
      const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i').exec(b);
      return m ? m[1] : '';
    };
    let link = clean(tag('link'));
    if (!/^https?:/i.test(link)) {
      const alts = [...b.matchAll(/<link\b([^>]*)\/?>/gi)].map(m => m[1]);
      const pick = alts.find(a => /rel=["']alternate["']/i.test(a)) || alts.find(a => !/rel=/i.test(a)) || alts[0] || '';
      link = (/href=["']([^"']+)["']/i.exec(pick) || [])[1] || '';
    }
    if (!/^https?:/i.test(link)) link = clean(tag('guid'));
    const date = clean(tag('pubDate') || tag('dc:date') || tag('published') || tag('updated'));
    const categories = [...b.matchAll(/<category\b[^>]*?(?:term=["']([^"']*)["'][^>]*)?(?:\/>|>([\s\S]*?)<\/category>)/gi)].map(m => clean(m[1] || m[2] || '')).filter(Boolean);
    items.push({
      title: clean(tag('title')),
      url: link.trim(),
      date: date ? new Date(date) : null,
      text: clean(tag('description') || tag('summary') || '').slice(0, 600),
      categories,
    });
  }
  return items;
}

async function singularityDaily(src, maxAgeMs, now) {
  const base = src.url.replace(/\/?$/, '/');
  const index = JSON.parse(await fetchText(base + 'index.json'));
  const eps = (index.episodes || []).filter(e => now - new Date(`${e.date}T12:00:00+11:00`) < maxAgeMs).slice(0, 3);
  const items = [];
  for (const ep of eps) {
    let e;
    try { e = JSON.parse(await fetchText(`${base}episodes/${ep.date}.json`)); } catch { continue; }
    const via = { name: `The Singularity Daily EP.${String(ep.ep).padStart(3, '0')}`, url: `${src.site}/#/ep/${ep.date}` };
    for (const s of e.stories || []) {
      const first = (s.sources || []).find(x => x.url);
      items.push({
        title: clean(s.title),
        url: first ? first.url : via.url,
        source: first ? clean(first.outlet) : 'The Singularity Daily',
        date: new Date(`${s.date || ep.date}T12:00:00+11:00`),
        text: clean(s.summary || ''),
        via,
      });
    }
  }
  const latest = (index.episodes || [])[0];
  const featured = latest && {
    ep: latest.ep, date: latest.date, day: latest.day, hook: latest.hook, titles: (latest.titles || []).slice(0, 3),
    thumb: latest.thumb ? `https://peterxing.github.io/singularity-daily/${latest.thumb}` : null,
    url: `${src.site}/#/ep/${latest.date}`, site: src.site,
  };
  return { items, featured };
}

function classify(item, src, kw) {
  if (src.mode === 'fixed') return src.pillar;
  const titleOnly = src.match === 'title';
  const score = Object.fromEntries(PILLARS.map(p => [p, 0]));
  for (const p of PILLARS) {
    const re = kw[p];
    if (!re) continue;
    score[p] += (item.title.match(re) || []).length * 3 + (titleOnly ? 0 : (item.text.match(re) || []).length);
  }
  const best = PILLARS.reduce((a, b) => (score[b] > score[a] ? b : a));
  return score[best] > 0 ? best : src.pillar || null;
}

const normUrl = u => u.replace(/[?#].*$/, '').replace(/\/$/, '').toLowerCase();
const normTitle = t => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export async function refreshRadar(cfg, prev, now = new Date()) {
  const maxAgeMs = (cfg.max_age_days || 10) * 864e5;
  const kw = Object.fromEntries(Object.entries(cfg.keywords || {}).map(([k, v]) => [k, new RegExp(v, 'gi')]));
  const exclude = cfg.exclude_titles ? new RegExp(cfg.exclude_titles, 'i') : null;
  const status = [];
  let featured = prev?.featured || null;
  let pool = [];
  const results = await Promise.allSettled(cfg.sources.map(async src => {
    if (src.type === 'singularity-daily') {
      const r = await singularityDaily(src, maxAgeMs, now);
      if (r.featured) featured = r.featured;
      return { src, items: r.items };
    }
    return { src, items: parseFeed(await fetchText(src.url, { headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8' } })) };
  }));
  results.forEach((r, i) => {
    const src = cfg.sources[i];
    if (r.status !== 'fulfilled') { status.push({ source: src.name, url: src.url, ok: false, error: String(r.reason?.message || r.reason).slice(0, 160) }); return; }
    const srcExclude = src.exclude ? new RegExp(src.exclude, 'i') : null;
    let kept = 0;
    for (const it of r.value.items) {
      if (!it.title || !/^https?:\/\//i.test(it.url) || !it.date || isNaN(it.date)) continue;
      if (now - it.date > maxAgeMs || it.date - now > 864e5) continue;
      if ((exclude && exclude.test(it.title)) || (srcExclude && srcExclude.test(it.title))) continue;
      if ((it.categories || []).some(c => /sponsor|partner content|advertorial|paid post/i.test(c))) continue;
      const pillar = classify(it, src, kw);
      if (!pillar) continue;
      pool.push({ pillar, title: it.title, url: it.url, source: it.source || src.name, date: it.date.toISOString(), via: it.via, weight: src.weight || 1, src: src.name + src.url });
      kept++;
    }
    status.push({ source: src.name, url: src.url, ok: true, items: r.value.items.length, kept });
  });

  const okCount = status.filter(s => s.ok).length;
  if (okCount === 0 || pool.length < 8) {
    return { data: prev, log: [`radar: only ${okCount} sources answered and ${pool.length} items survived; keeping the previous radar`], status };
  }

  const seenU = new Set(), seenT = new Set();
  pool = pool
    .sort((a, b) => (new Date(b.date) - new Date(a.date)) + (b.weight - a.weight) * 12 * 3600e3)
    .filter(it => {
      const u = normUrl(it.url), t = normTitle(it.title);
      if (seenU.has(u) || seenT.has(t)) return false;
      seenU.add(u); seenT.add(t);
      return true;
    });

  const per = cfg.per_pillar || 12, perSrc = cfg.per_source || 3;
  const items = [];
  for (const p of PILLARS) {
    const counts = {};
    const chosen = pool.filter(it => it.pillar === p).sort((a, b) => (new Date(b.date) - new Date(a.date)) + (b.weight - a.weight) * 12 * 3600e3)
      .filter(it => (counts[it.src] = (counts[it.src] || 0) + 1) <= perSrc).slice(0, per);
    items.push(...chosen.map(({ weight, src, ...rest }) => rest));
  }
  const counts = Object.fromEntries(PILLARS.map(p => [p, items.filter(i => i.pillar === p).length]));
  return {
    data: { _about: 'Generated by tools/build.mjs --refresh from data/sources.json. Do not edit by hand.', updated: now.toISOString(), featured, counts, items },
    log: [`radar: ${okCount}/${cfg.sources.length} sources, ${pool.length} candidates, kept ${JSON.stringify(counts)}`],
    status,
  };
}
