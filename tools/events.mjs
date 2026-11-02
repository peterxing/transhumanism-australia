// Refreshes data/events.json from the organiser's public Eventbrite page and each event's own page (schema.org data).
// Never wipes good data on a bad fetch: if Eventbrite can't be read, the previous upcoming list is kept (minus anything
// that has ended, which moves to `past`).
import { fetchText, jsonAfterKey, sydneyOffset, clean } from './util.mjs';

const EVENT_TYPES = /Event$/;

function ldBlocks(html) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const d = JSON.parse(m[1]);
      for (const x of Array.isArray(d) ? d : [d]) out.push(x);
    } catch { /* ignore malformed blocks */ }
  }
  return out;
}

const canonicalUrl = u => String(u || '').split(/[?#]/)[0];

async function eventDetails(url) {
  const html = await fetchText(url);
  const ld = ldBlocks(html).find(x => x && EVENT_TYPES.test(String(x['@type'] || '')) && x.startDate);
  if (!ld) throw new Error('no event data on page');
  const loc = ld.location || {};
  const addr = loc.address || {};
  const geo = /"latitude":"?(-?[\d.]+)"?,\s*"longitude":"?(-?[\d.]+)/.exec(html);
  const offer = [].concat(ld.offers || [])[0] || {};
  const low = Number(offer.lowPrice ?? offer.price ?? 0);
  return {
    name: clean(ld.name),
    start: ld.startDate,
    end: ld.endDate,
    status: String(ld.eventStatus || '').split('/').pop() || 'EventScheduled',
    online: /Online/.test(String(ld.eventAttendanceMode || '')),
    venue: clean(loc.name || ''),
    address: clean(addr.streetAddress || ''),
    area: [addr.addressLocality, addr.addressRegion].filter(Boolean).join(', '),
    lat: geo ? geo[1] : undefined,
    lng: geo ? geo[2] : undefined,
    description: clean(ld.description || ''),
    image: ld.image || undefined,
    free: !(low > 0),
    price: low > 0 ? `A$${low.toFixed(2).replace(/\.00$/, '')}` : 'Free',
  };
}

function fromListing(e) {
  const off = sydneyOffset(e.start_date, e.start_time);
  const start = `${e.start_date}T${e.start_time}${off}`;
  let end = `${e.end_date}T${e.end_time}${sydneyOffset(e.end_date, e.end_time)}`;
  if (new Date(end) <= new Date(start)) end = new Date(new Date(start).getTime() + 150 * 60e3).toISOString();
  const v = e.primary_venue || {};
  const a = v.address || {};
  return {
    name: clean(e.name), start, end, status: 'EventScheduled', online: !!e.is_online_event,
    venue: clean(v.name || ''), address: clean(a.localized_address_display || a.address_1 || ''),
    area: clean(a.localized_area_display || ''), lat: a.latitude, lng: a.longitude,
    description: clean(e.summary || ''), image: e.image?.url,
    free: !!e.ticket_availability?.is_free, price: e.ticket_availability?.minimum_ticket_price?.display || 'Free',
  };
}

const isCancelled = e => e.is_cancelled || /cancel/i.test(e.event_sales_status?.message_code || '') || /cancel/i.test(e.event_sales_status?.message || '');

export async function refreshEvents(site, data, now = new Date()) {
  const log = [];
  const prev = data.upcoming || [];
  let fetched = null;
  let organizer = data.organizer;
  try {
    const html = await fetchText(`https://www.eventbrite.com.au/o/${site.eventbrite.organizer_id}`);
    const list = jsonAfterKey(html, 'upcomingEvents');
    const metrics = jsonAfterKey(html, 'metrics');
    if (!Array.isArray(list)) throw new Error('organiser page has no upcomingEvents list');
    if (metrics && metrics.totalEvents) organizer = { followers: String(metrics.followers ?? organizer?.followers ?? ''), hostingYears: metrics.hostingYears ?? organizer?.hostingYears, totalEvents: metrics.totalEvents, attendeesHosted: metrics.attendeesHosted ?? organizer?.attendeesHosted };
    fetched = [];
    for (const e of list) {
      if (isCancelled(e)) { log.push(`skip cancelled: ${e.name}`); continue; }
      const id = String(e.id || e.eventbrite_event_id);
      const url = canonicalUrl(e.url);
      let rec;
      try { rec = await eventDetails(url); } catch (err) { log.push(`detail ${id}: ${err.message}; using listing`); rec = fromListing(e); }
      if (/Cancel/i.test(rec.status)) { log.push(`skip cancelled (page): ${rec.name}`); continue; }
      fetched.push({ id, url, ...rec });
    }
    log.push(`eventbrite: ${list.length} listed, ${fetched.length} live`);
  } catch (err) {
    log.push(`eventbrite unavailable (${err.message}); keeping the previous list`);
  }

  // Events we knew about that vanished from the listing: re-check their own page before dropping them.
  if (fetched) {
    for (const p of prev) {
      if (fetched.some(f => f.id === p.id) || new Date(p.end) < now) continue;
      try {
        const d = await eventDetails(p.url);
        if (/Cancel|Postpon/i.test(d.status)) { log.push(`dropped (now ${d.status}): ${p.name}`); continue; }
        fetched.push({ ...p, ...d });
        log.push(`kept (still on its page): ${p.name}`);
      } catch (err) { log.push(`dropped (gone: ${err.message}): ${p.name}`); }
    }
  }

  const all = (fetched ?? prev).map(e => ({ ...e }));
  const upcoming = all.filter(e => new Date(e.end) >= now).sort((a, b) => new Date(a.start) - new Date(b.start));
  const ended = [...prev, ...all].filter(e => new Date(e.end) < now);
  const past = [...(data.past || [])];
  for (const e of ended) if (!past.some(p => p.id === e.id)) { past.push(stripUndefined(e)); log.push(`moved to past: ${e.name} (${e.start.slice(0, 10)})`); }
  past.sort((a, b) => new Date(b.start) - new Date(a.start));

  return { data: { ...data, organizer, upcoming: upcoming.map(stripUndefined), past }, log };
}

function stripUndefined(o) { return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '')); }
