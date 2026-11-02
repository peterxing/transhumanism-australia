// Shared helpers for the build: JSON IO, HTML escaping, Sydney-time formatting, tolerant fetching.
import fs from 'node:fs';
import path from 'node:path';

export const TZ = 'Australia/Sydney';
export const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';

export function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) {
    if (fallback !== undefined) return fallback;
    throw new Error(`cannot read ${file}: ${e.message}`);
  }
}

// Writes pretty JSON only when the content changed (ignoring `ignoreKeys`), so scheduled runs don't churn the repo.
export function writeJsonIfChanged(file, obj, ignoreKeys = []) {
  const strip = o => JSON.stringify(o, (k, v) => (ignoreKeys.includes(k) ? undefined : v));
  const prev = readJson(file, null);
  if (prev && strip(prev) === strip(obj)) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 1) + '\n', 'utf8');
  return true;
}

export const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', eacute: 'é', egrave: 'è', uuml: 'ü', ouml: 'ö', auml: 'ä', copy: '©', reg: '®', trade: '™', deg: '°', middot: '·', times: '×', minus: '−' };
export function decodeEntities(s) {
  return String(s ?? '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeChar(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeChar(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => NAMED[n.toLowerCase()] ?? m);
}
const safeChar = n => (n > 0 && n < 0x110000 ? String.fromCodePoint(n) : '');

export const stripTags = s => String(s ?? '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
export const clean = s => decodeEntities(stripTags(decodeEntities(s))).replace(/\s+/g, ' ').trim();

export async function fetchText(url, { timeout = 25000, headers = {}, tries = 2 } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeout);
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-AU,en;q=0.9', ...headers }, signal: ac.signal, redirect: 'follow' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      last = e;
      await new Promise(res => setTimeout(res, 800 * (i + 1)));
    } finally { clearTimeout(t); }
  }
  throw new Error(`${url}: ${last?.message || last}`);
}

// ---------------------------------------------------------------- Sydney time

const parts = (d, opts) => Object.fromEntries(new Intl.DateTimeFormat('en-AU', { timeZone: TZ, ...opts }).formatToParts(d).map(p => [p.type, p.value]));

export function fmt(iso, style) {
  const d = new Date(iso);
  const p = parts(d, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  const long = parts(d, { weekday: 'long', month: 'long' });
  const time = `${p.hour}:${p.minute}${(p.dayPeriod || '').toLowerCase().replace(/\s/g, '')}`;
  switch (style) {
    case 'day': return p.day;
    case 'mon': return p.month;
    case 'wday': return p.weekday;
    case 'time': return time;
    case 'short': return `${p.weekday} ${p.day} ${p.month}`;
    case 'dm': return `${p.day} ${p.month}`;
    case 'dmy': return `${p.day} ${p.month} ${p.year}`;
    case 'long': return `${long.weekday} ${p.day} ${long.month}`;
    case 'longy': return `${long.weekday} ${p.day} ${long.month} ${p.year}`;
    case 'year': return p.year;
    default: return `${p.weekday} ${p.day} ${p.month} ${p.year}, ${time}`;
  }
}

// "6:00–8:30pm" (drops the first am/pm when both match)
export function timeRange(startIso, endIso) {
  const a = fmt(startIso, 'time'), b = fmt(endIso, 'time');
  const ap = a.slice(-2), bp = b.slice(-2);
  return ap === bp ? `${a.slice(0, -2)}–${b}` : `${a}–${b}`;
}

// The UTC offset ("+11:00") Sydney uses at a given local wall-clock time.
export function sydneyOffset(dateStr, timeStr = '12:00:00') {
  const guess = new Date(`${dateStr}T${timeStr}Z`);
  for (const off of [11, 10]) {
    const d = new Date(guess.getTime() - off * 3600e3);
    const p = parts(d, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    if (`${p.year}-${p.month}-${p.day}` === dateStr && `${p.hour}:${p.minute}` === timeStr.slice(0, 5)) return `+${off}:00`;
  }
  return '+10:00';
}

export const isoUtcCompact = iso => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

// Finds `"key":` in a page and returns the JSON value that follows (object or array), respecting strings.
export function jsonAfterKey(html, key) {
  let i = html.indexOf(`"${key}":`);
  if (i < 0) return undefined;
  i = html.indexOf(':', i) + 1;
  while (/\s/.test(html[i])) i++;
  const open = html[i];
  const close = open === '[' ? ']' : open === '{' ? '}' : null;
  if (!close) return undefined;
  let depth = 0, inStr = false;
  for (let j = i; j < html.length; j++) {
    const c = html[j];
    if (inStr) {
      if (c === '\\') j++;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) {
      try { return JSON.parse(html.slice(i, j + 1)); } catch { return undefined; }
    }
  }
  return undefined;
}

export const slug = s => String(s).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-');
