// Renders every page of transhuman.com.au from data/*.json. All pages live at the site root and use relative links,
// so the same build works at transhuman.com.au and at the GitHub Pages preview (peterxing.github.io/<repo>/).
import { esc, fmt, timeRange, isoUtcCompact } from './util.mjs';
import { glyph, icon, logoMark } from './icons.mjs';

const PILLARS = ['longevity', 'wellbeing', 'intelligence', 'frontier'];
const PILLAR_NAME = { longevity: 'Longevity', wellbeing: 'Wellbeing', intelligence: 'Intelligence', frontier: 'Frontier tech' };

export function renderSite(ctx) {
  const { site, events, now } = ctx;
  const SITE = site.url.replace(/\/$/, '');
  const VER = ctx.version;

  // ------------------------------------------------------------------ links
  const joinUrl = where => `${site.membership.url}?utm_source=transhuman.com.au&utm_medium=website&utm_campaign=membership&utm_content=${where}`;
  const rsvpUrl = ev => `${ev.url}${ev.url.includes('?') ? '&' : '?'}aff=${site.eventbrite.aff}`;
  const ext = (url, label, cls = '') => `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener">${label}</a>`;
  const mapsUrl = ev => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([ev.venue, ev.address].filter(Boolean).join(', '))}`;
  const gcalUrl = ev => `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(evTitle(ev))}&dates=${isoUtcCompact(ev.start)}/${isoUtcCompact(ev.end)}&location=${encodeURIComponent([ev.venue, ev.address].filter(Boolean).join(', '))}&details=${encodeURIComponent(`${ev.description || ''}\n\nRSVP: ${ev.url}`)}`;

  // ------------------------------------------------------------------ events
  const withOverrides = ev => ({ ...ev, ...(events.overrides?.[ev.id] || {}) });
  const upcoming = (events.upcoming || []).map(withOverrides).filter(e => !e.hide && new Date(e.end) > now);
  const past = (events.past || []).map(withOverrides).filter(e => !e.hide);
  const next = upcoming[0] || null;
  const evTitle = ev => ev.title || ev.name.replace(/\s*(monthly\s+)?meet-?up\s*$/i, '').trim() || ev.name;
  const evKind = ev => (/monthly/i.test(ev.name) ? 'Monthly meetup' : /meet-?up/i.test(ev.name) ? 'Meetup' : 'Event');
  const tzName = iso => new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', timeZoneName: 'short' }).formatToParts(new Date(iso)).find(p => p.type === 'timeZoneName')?.value || '';
  const where = ev => ev.online ? 'Online' : (ev.area || ev.venue || 'Sydney').replace(/,\s*NSW$/, '');
  const talkLine = ev => ev.talk ? `${ev.speaker ? `${esc(ev.speaker)}: ` : ''}${esc(ev.talk)}` : esc(ev.description || '');

  const countdown = ev => {
    const ms = Math.max(0, new Date(ev.start) - now);
    const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60;
    const cell = (k, v, l) => `<div><b data-cd="${k}">${String(v).padStart(2, '0')}</b><span>${l}</span></div>`;
    return `<div class="cd" aria-hidden="true">${cell('d', d, 'days')}${cell('h', h, 'hours')}${cell('m', m, 'mins')}${cell('s', 0, 'secs')}</div>`;
  };

  const eventCard = (ev, { heading = 'h2', where: placement = 'hero' } = {}) => {
    if (!ev) {
      return `<article class="ev-card ev-none"><div class="ev-top"><span class="k">Next meetup</span></div>
<${heading} class="ev-title">Date coming soon</${heading}>
<p class="ev-talk">We meet every month in Sydney. Follow us on Eventbrite and you'll hear the moment the next one is announced.</p>
<div class="ev-actions"><a class="btn btn-primary" href="${esc(site.eventbrite.organizer_url)}" target="_blank" rel="noopener">Follow on Eventbrite ${icon.arrow({ size: 18 })}</a></div></article>`;
    }
    return `<article class="ev-card" data-countdown data-start="${esc(ev.start)}" data-end="${esc(ev.end)}">
<div class="ev-top"><span class="live-dot" aria-hidden="true"></span><span class="k" data-cd-label>Next meetup</span><span class="ev-kind">${evKind(ev)} · ${esc(ev.price || 'Free')}</span></div>
<${heading} class="ev-title"><a href="${esc(rsvpUrl(ev))}" target="_blank" rel="noopener">${esc(evTitle(ev))}</a></${heading}>
<p class="ev-talk">${talkLine(ev)}</p>
${countdown(ev)}
<p class="ev-live" data-cd-live hidden>${icon.spark({ size: 18 })} Happening right now. Come and say hi.</p>
<ul class="ev-meta">
<li>${icon.cal({ size: 20 })}<span><strong>${esc(fmt(ev.start, 'long'))}</strong><small>${esc(timeRange(ev.start, ev.end))} ${esc(tzName(ev.start))}</small></span></li>
<li>${icon.pin({ size: 20 })}<span><strong>${esc(ev.online ? 'Online' : ev.venue)}</strong>${ev.address ? `<small><a href="${esc(mapsUrl(ev))}" target="_blank" rel="noopener">${esc(ev.address)}</a></small>` : ''}</span></li>
</ul>
<div class="ev-actions"><a class="btn btn-light" href="${esc(rsvpUrl(ev))}" target="_blank" rel="noopener" data-track="rsvp-${placement}">RSVP free ${icon.arrow({ size: 18 })}</a><a class="btn btn-ghost" href="cal/${esc(ev.id)}.ics" download>${icon.cal({ size: 18 })} Add to calendar</a></div>
<p class="ev-foot"><a href="${esc(gcalUrl(ev))}" target="_blank" rel="noopener">Google Calendar</a> · <a href="events">All events</a></p>
</article>`;
  };

  const eventRow = ev => `<li class="ev-row"><div class="ev-date"><b>${esc(fmt(ev.start, 'day'))}</b><span>${esc(fmt(ev.start, 'mon'))}</span></div>
<div class="ev-body"><h3><a href="${esc(rsvpUrl(ev))}" target="_blank" rel="noopener">${esc(evTitle(ev))}</a></h3><p>${esc(fmt(ev.start, 'wday'))} · ${esc(timeRange(ev.start, ev.end))} · ${esc(ev.online ? 'Online' : ev.venue)}</p>${ev.talk || ev.description ? `<p class="muted">${talkLine(ev)}</p>` : ''}</div>
<a class="btn btn-sm btn-light" href="${esc(rsvpUrl(ev))}" target="_blank" rel="noopener">RSVP</a></li>`;

  const pastRow = ev => `<li><span class="mono">${esc(fmt(ev.start, 'dmy'))}</span><span><strong>${esc(evTitle(ev))}</strong>${ev.talk ? ` · ${talkLine(ev)}` : ''}<small>${esc(where(ev))}</small></span></li>`;

  // ------------------------------------------------------------------ radar
  const radar = ctx.radar || { items: [] };
  const rItems = radar.items || [];
  const byPillar = p => rItems.filter(i => i.pillar === p);
  const radarItem = (it, extra = '') => `<li class="r-item" data-pillar="${it.pillar}"${extra}><span class="r-glyph">${glyph(it.pillar, { size: 16 })}</span><div><a class="r-title" href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.title)}</a><div class="r-meta"><span class="r-tag">${PILLAR_NAME[it.pillar]}</span> ${esc(it.source)} · ${esc(fmt(it.date, 'dm'))}${it.via ? ` · via <a href="${esc(it.via.url)}" target="_blank" rel="noopener">${esc(it.via.name)}</a>` : ''}</div></div></li>`;
  const interleave = (n) => {
    const lists = PILLARS.map(byPillar), out = [];
    for (let i = 0; out.length < n && lists.some(l => l[i]); i++) for (const l of lists) if (l[i] && out.length < n) out.push(l[i]);
    return out;
  };
  const sdCard = (f = radar.featured) => !f ? '' : `<a class="sd-card" href="${esc(f.url)}" target="_blank" rel="noopener">
${f.thumb ? `<img src="${esc(f.thumb)}" alt="" width="320" height="180" loading="lazy" decoding="async">` : ''}<div><span class="k">${icon.play({ size: 14 })} Watch · 3 min · ${esc(f.day || '')}</span><h3>The Singularity Daily · EP.${String(f.ep).padStart(3, '0')}</h3><p class="sd-hook">${esc(f.hook)}</p>${f.titles?.[0] ? `<p class="muted">${esc(f.titles[0])}</p>` : ''}<span class="go">The last 24 hours in AI, every day, on peterxing.com ${icon.arrow({ size: 16 })}</span></div></a>`;

  // ------------------------------------------------------------------ shared chrome
  const promo = () => !next ? '' : `<aside class="promo" aria-label="Next meetup"><a href="${esc(rsvpUrl(next))}" target="_blank" rel="noopener"><span class="live-dot" aria-hidden="true"></span><span class="k">Next meetup</span><strong>${esc(fmt(next.start, 'short'))}</strong><span class="promo-what">${esc(evTitle(next))} · ${esc(where(next))} · ${esc(next.price || 'Free')}</span><span class="go">RSVP ${icon.arrow({ size: 16 })}</span></a></aside>`;

  const nav = [['events', 'Events'], ['./#supers', 'The three supers'], ['radar', 'Radar'], ['speakers', 'Speakers'], ['investment', 'Venture studio']];
  const header = path => `<header class="site-head"><div class="wrap head-in">
<a class="brand" href="./" aria-label="${esc(site.name)}: home">${logoMark(34)}<span class="word"><b>Transhumanism</b><i>Australia</i></span></a>
<nav class="nav" id="nav" aria-label="Main">${nav.map(([h, l]) => `<a href="${h}"${h === path ? ' aria-current="page"' : ''}>${l}</a>`).join('')}<a class="nav-join" href="join">Membership</a></nav>
<a class="btn btn-primary btn-sm head-cta" href="${esc(joinUrl('header'))}" target="_blank" rel="noopener" data-track="join-header">Join <span>· 14 days free</span></a>
<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav" aria-label="Open menu">${icon.menu({ size: 22 })}</button>
</div></header>`;

  const footer = () => `<footer class="site-foot"><div class="wrap">
<div class="foot-grid">
<div class="foot-brand"><a class="brand" href="./">${logoMark(40)}<span class="word"><b>Transhumanism</b><i>Australia</i></span></a>
<p>${esc(site.tagline)} A community and venture studio for the science and technology that make us more than human.</p>
<p class="foot-cta"><a class="btn btn-primary btn-sm" href="${esc(joinUrl('footer'))}" target="_blank" rel="noopener">Become a member</a>${next ? ` <a class="btn btn-ghost btn-sm" href="${esc(rsvpUrl(next))}" target="_blank" rel="noopener">RSVP to ${esc(fmt(next.start, 'dm'))}</a>` : ''}</p></div>
<div><h2>Explore</h2><ul><li><a href="events">Events</a></li><li><a href="radar">The Transhuman Radar</a></li><li><a href="./#supers">The three supers</a></li><li><a href="speakers">Speakers</a></li><li><a href="media">In the media</a></li><li><a href="blog">Articles</a></li></ul></div>
<div><h2>Get involved</h2><ul><li><a href="join">Membership</a></li><li><a href="speakers#book">Book a speaker</a></li><li><a href="investment">Pitch a project</a></li><li><a href="partners">Partners and venues</a></li><li><a href="bci">Brain–computer interfaces</a></li><li>${ext(site.merch, 'Merch')}</li></ul></div>
<div><h2>Follow</h2><ul>${site.social.map(s => `<li>${ext(s.url, esc(s.name))}</li>`).join('')}</ul></div>
</div>
<div class="foot-base"><p>© ${now.getFullYear()} ${esc(site.legal)} · <a href="mailto:${esc(site.email)}">${esc(site.email)}</a> · ${esc(site.address)}</p><p class="muted">Nothing on this site is financial or medical advice. Headlines on the Radar link to, and belong to, their publishers.</p></div>
</div></footer>`;

  const mobileCta = () => `<div class="mcta" data-mcta><a class="btn btn-primary" href="${esc(joinUrl('mobile-bar'))}" target="_blank" rel="noopener">Join · 14 days free</a>${next ? `<a class="btn btn-ghost" href="${esc(rsvpUrl(next))}" target="_blank" rel="noopener">RSVP ${esc(fmt(next.start, 'dm'))}</a>` : ''}</div>`;

  const orgLd = {
    '@context': 'https://schema.org', '@type': 'Organization', name: site.name, legalName: site.legal, url: `${SITE}/`,
    logo: `${SITE}/assets/img/logo-512.png`, email: site.email, description: site.description,
    address: { '@type': 'PostalAddress', streetAddress: 'Level 4, 11 York Street', addressLocality: 'Sydney', addressRegion: 'NSW', postalCode: '2000', addressCountry: 'AU' },
    sameAs: site.social.map(s => s.url),
  };
  const eventLd = ev => ({
    '@context': 'https://schema.org', '@type': 'Event', name: evTitle(ev) + (evKind(ev) === 'Monthly meetup' ? ' Monthly Meetup' : ''),
    description: ev.talk ? `${ev.speaker ? ev.speaker + ': ' : ''}${ev.talk}. ${ev.description || ''}`.trim() : ev.description,
    startDate: ev.start, endDate: ev.end, eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: ev.online ? 'https://schema.org/OnlineEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode',
    location: ev.online ? { '@type': 'VirtualLocation', url: ev.url } : { '@type': 'Place', name: ev.venue, address: { '@type': 'PostalAddress', streetAddress: ev.address, addressLocality: (ev.area || '').split(',')[0], addressRegion: 'NSW', addressCountry: 'AU' } },
    image: ev.image ? [ev.image] : [`${SITE}/assets/img/og.png`],
    organizer: { '@type': 'Organization', name: site.name, url: `${SITE}/` },
    offers: { '@type': 'Offer', price: ev.free ? '0' : String(ev.price || '').replace(/[^\d.]/g, ''), priceCurrency: 'AUD', availability: 'https://schema.org/InStock', url: ev.url },
  });

  const page = ({ path = '', title, description = site.description, body, ld = [], cls = '' }) => {
    const canonical = path ? `${SITE}/${path}` : `${SITE}/`;
    return `<!doctype html>
<html lang="en-AU" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta name="theme-color" content="#06070b">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:locale" content="en_AU">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE}/assets/img/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(site.name)}: ${esc(site.tagline)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
<link rel="icon" href="assets/img/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">
<link rel="preload" href="assets/fonts/Anton-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/Inter-500.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/css/site.css?v=${VER}">
<script>document.documentElement.className='js'</script>
${[orgLd, ...ld].map(j => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>
<body class="${cls}">
<a class="skip" href="#main">Skip to content</a>
${promo()}
${header(path)}
<main id="main">
${body}
</main>
${footer()}
${mobileCta()}
<script src="assets/js/site.js?v=${VER}" defer></script>
</body>
</html>
`;
  };

  const section = (id, kicker, h2, lede, inner, cls = '') => `<section class="sec ${cls}"${id ? ` id="${id}"` : ''}><div class="wrap">
<header class="sec-head">${kicker ? `<p class="kicker">${kicker}</p>` : ''}<h2>${h2}</h2>${lede ? `<p class="lede">${lede}</p>` : ''}</header>
${inner}
</div></section>`;

  // ------------------------------------------------------------------ reusable blocks
  const joinBlock = (where = 'home', { heading = true } = {}) => {
    const m = site.membership;
    return `<div class="join-grid">
<div>${heading ? `<p class="kicker">Membership</p><h2>Join the movement</h2>` : ''}<p class="lede">${esc(m.pitch)}</p>
<ul class="benefits">${m.benefits.map(b => `<li>${icon.check({ size: 20 })}<span><strong>${esc(b.title)}</strong> ${esc(b.text)}</span></li>`).join('')}</ul>
${next ? `<p class="muted">Not ready yet? <a href="${esc(rsvpUrl(next))}" target="_blank" rel="noopener">Come to a free meetup first</a>.</p>` : ''}</div>
<aside class="price-card" aria-label="Membership price">
<p class="k">Membership</p>
<p class="price"><b>${esc(m.price)}</b><span>/ ${esc(m.period)}</span></p>
<p class="trial">Your first ${m.trial_days} days are free</p>
<a class="btn btn-primary btn-block" href="${esc(joinUrl(where))}" target="_blank" rel="noopener" data-track="join-${where}">Start your free trial ${icon.arrow({ size: 18 })}</a>
<ul class="fine"><li>${icon.check({ size: 16 })} Renews monthly. Cancel any time.</li><li>${icon.check({ size: 16 })} ${esc(m.payment_methods)}</li><li>${icon.check({ size: 16 })} Secure checkout by Stripe</li></ul>
</aside></div>`;
  };

  const doors = (withLatest = true) => `<div class="doors">${site.supers.map(s => {
    const latest = withLatest ? byPillar(s.id).slice(0, 3) : [];
    return `<article class="door" data-pillar="${s.id}" id="super-${s.id}">
<div class="porthole">${glyph(s.id, { size: 46, sw: 2.8 })}</div>
<h3><span>Super</span> ${esc(s.name.replace(/^Super\s+/i, ''))}</h3>
<p class="door-line">${esc(s.line)}</p>
<p>${esc(s.text)}</p>
<ul class="chips">${s.topics.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
${latest.length ? `<div class="door-latest"><h4>Latest signals</h4><ul>${latest.map(it => `<li><a href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.title)}</a><small>${esc(it.source)} · ${esc(fmt(it.date, 'dm'))}</small></li>`).join('')}</ul><a class="more" href="radar#${s.id}">More ${esc(s.name.toLowerCase())} ${icon.arrow({ size: 16 })}</a></div>` : ''}
</article>`;
  }).join('')}</div>
<div class="frontier"><p><span class="r-glyph" data-pillar="frontier">${glyph('frontier', { size: 16 })}</span> <strong>${esc(site.frontier.title)}:</strong></p><ul class="chips">${site.frontier.topics.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>`;

  const statsBand = () => {
    const o = events.organizer || {};
    const yrs = parseInt(o.hostingYears, 10);
    const stats = [
      o.totalEvents && [String(o.totalEvents), 'events hosted'],
      o.attendeesHosted && [String(o.attendeesHosted), 'attendees'],
      yrs && [`${yrs}+`, 'years of meetups'],
      ['Free', 'every meetup, open to everyone'],
    ].filter(Boolean);
    return `<section class="stats" aria-label="Track record"><div class="wrap">
<ul class="stat-list">${stats.map(([n, l]) => `<li><b>${esc(n)}</b><span>${esc(l)}</span></li>`).join('')}</ul>
<p class="seen"><span class="k">As seen and heard on</span> ${site.media_logos.map(m => `<span>${esc(m)}</span>`).join('')}</p>
</div></section>`;
  };

  const peopleImg = (src, alt, w = 400, h = 400, cls = '') => `<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}" width="${w}" height="${h}" loading="lazy" decoding="async">`;
  const speakers = ctx.speakers.speakers || [];
  const others = speakers.filter(s => !['peter-xing', 'alyse-sue'].includes(s.id) && s.photo);
  const people = ctx.people;

  const founders = () => `<div class="founders">${['peterxing', 'alysesue'].map(k => {
    const p = people[k];
    return `<a class="founder" href="${k}">${peopleImg(p.photo, p.name, 560, 420)}<div><p class="k">Co-founder</p><h3>${esc(p.name)}</h3><p>${esc(p.headline)}</p><span class="go">Profile and bookings ${icon.arrow({ size: 16 })}</span></div></a>`;
  }).join('')}</div>`;

  const faces = () => `<div class="faces"><ul>${others.slice(0, 14).map(s => `<li title="${esc(s.name)}">${peopleImg(s.photo, s.name, 64, 64)}</li>`).join('')}</ul><p>Plus ${others.length} more speakers and facilitators who have presented with us. <a href="speakers">Meet them ${icon.arrow({ size: 16 })}</a></p></div>`;

  const faq = (items = site.faq) => `<div class="faq">${items.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a).replace(/info@transhumanism\.com\.au/g, `<a href="mailto:${site.email}">${site.email}</a>`)}</p></details>`).join('')}</div>`;

  const finalCta = () => `<section class="final"><div class="wrap"><h2>Don't just watch the future.<br><span>Help build it.</span></h2>
<div class="cta-row"><a class="btn btn-primary btn-lg" href="${esc(joinUrl('final'))}" target="_blank" rel="noopener" data-track="join-final">Become a member <small>14 days free</small></a>${next ? `<a class="btn btn-ghost btn-lg" href="${esc(rsvpUrl(next))}" target="_blank" rel="noopener">RSVP to the next meetup</a>` : ''}</div></div></section>`;

  const networkCard = n => {
    if (!n.url) return `<li><div class="nl"><h3>${esc(n.name)}</h3><p>${esc(n.text)}</p></div></li>`;
    const internal = !/^https?:/.test(n.url);
    return `<li><a href="${esc(n.url)}"${internal ? '' : ' target="_blank" rel="noopener"'}><h3>${esc(n.name)} ${internal ? icon.arrow({ size: 16 }) : icon.ext({ size: 16 })}</h3><p>${esc(n.text)}</p></a></li>`;
  };
  const networkGrid = () => `<ul class="network">${site.network.map(networkCard).join('')}</ul>`;

  const mediaList = (items) => `<ul class="media-list">${items.map(m => `<li><span class="outlet">${esc(m.outlet)}${m.year ? ` · ${esc(m.year)}` : ''}</span>${m.url ? ext(m.url, esc(m.title)) : `<span>${esc(m.title)}</span>`}</li>`).join('')}</ul>`;

  const files = {};

  // ================================================================== HOME
  const hero = `<section class="hero"><div class="wrap hero-grid">
<div class="hero-copy">
<p class="kicker">${esc(site.name)} · Sydney</p>
<h1><span class="l1">Live <em>longer.</em></span> <span class="l2">Feel <em>better.</em></span> <span class="l3">Think <em>bigger.</em></span></h1>
<p class="hero-lede">We're Australia's community for the science and technology that extend healthy life, lift wellbeing and amplify intelligence, from AI and brain–computer interfaces to rejuvenation biotech. <strong>Meet us every month in Sydney.</strong></p>
<div class="cta-row"><a class="btn btn-primary btn-lg" href="${esc(joinUrl('hero'))}" target="_blank" rel="noopener" data-track="join-hero">Become a member <small>14 days free</small></a>${next ? `<a class="btn btn-ghost btn-lg" href="${esc(rsvpUrl(next))}" target="_blank" rel="noopener" data-track="rsvp-hero-secondary">RSVP to the next meetup</a>` : `<a class="btn btn-ghost btn-lg" href="events">See events</a>`}</div>
<p class="fine-print">Membership is ${esc(site.membership.price)} a month after your free trial. Meetups are free and open to everyone.</p>
</div>
<div class="hero-card">${eventCard(next, { heading: 'h2', where: 'hero' })}</div>
</div>
<div class="hero-supers wrap" aria-hidden="true">${site.supers.map(s => `<span data-pillar="${s.id}">${glyph(s.id, { size: 18 })} ${esc(s.name)}</span>`).join('')}</div>
</section>`;

  const homeEvents = section('events', 'Every month, in person', 'Come to a meetup',
    'The AI Singularity Syndicate is our monthly meetup in Sydney. We talk about all things AI and don\'t hold back on where we think we are on the road to the singularity. Free, and open to everyone.',
    `<div class="events-grid">
<div>${upcoming.length ? `<h3 class="sub">Coming up</h3><ul class="ev-list">${upcoming.slice(0, 4).map(eventRow).join('')}</ul>` : `<p class="muted">The next date is being locked in. Follow us on Eventbrite to hear first.</p>`}
${past.length ? `<h3 class="sub">Recently</h3><ul class="past-list">${past.slice(0, 3).map(pastRow).join('')}</ul>` : ''}</div>
<aside class="aside-stack">
<div class="note"><h3>Never miss one</h3><p>Follow ${esc(site.name)} on Eventbrite and you'll get an email whenever we announce a meetup.</p><a class="btn btn-ghost btn-sm" href="${esc(site.eventbrite.organizer_url)}" target="_blank" rel="noopener">Follow on Eventbrite ${icon.ext({ size: 16 })}</a></div>
<div class="note"><h3>Host, sponsor or speak</h3><p>Got a venue, a talk or a project the community should see? We'd love to hear from you.</p><a class="btn btn-ghost btn-sm" href="mailto:${esc(site.email)}?subject=Meetup%20idea">${icon.mail({ size: 16 })} ${esc(site.email)}</a></div>
</aside></div>`);

  const homeRadar = section('radar', 'The Transhuman Radar', 'What moved this week',
    `Headlines across longevity, wellbeing, intelligence and frontier tech, gathered every morning from trusted science and technology sources.`,
    `<div class="radar-tabs" role="group" aria-label="Filter the radar">${[['all', 'All']].concat(PILLARS.map(p => [p, PILLAR_NAME[p]])).map(([k, l], i) => `<button type="button" data-filter="${k}" aria-pressed="${i === 0}"${k !== 'all' ? ` data-pillar="${k}"` : ''}>${k !== 'all' ? glyph(k, { size: 14 }) : ''}${l}</button>`).join('')}</div>
<div class="radar-grid"><ol class="r-list" data-radar>
${(() => { const all = new Set(interleave(12)); return rItems.map(it => radarItem(it, `${all.has(it) ? ' data-all' : ' hidden'}`)).join('\n'); })()}
</ol>
<aside class="radar-side">${sdCard()}<p class="muted small">Updated ${esc(radar.updated ? fmt(radar.updated, 'dm') : '')}. Every headline links to its publisher. <a href="radar">The full radar ${icon.arrow({ size: 14 })}</a></p></aside></div>`);

  const home = `${hero}
${statsBand()}
${section('supers', 'What we\'re about', 'Three doors to a better future', 'Transhumanism is the idea that science and technology can, and should, take us beyond the limits of our biology. We organise everything around three goals.', doors(true))}
${homeEvents}
<section class="sec join" id="join"><div class="wrap">${joinBlock('home')}</div></section>
${homeRadar}
${section('what', 'What we do', 'Learn it, build it, back it', '', `<ul class="cards3">${site.what_we_do.map(w => `<li><h3>${esc(w.title)}</h3><p>${esc(w.text)}</p><a class="more" href="${esc(w.href)}">${esc(w.cta)} ${icon.arrow({ size: 16 })}</a></li>`).join('')}</ul>`)}
${section('people', 'People', 'Founders and speakers', '', founders() + faces())}
${section('network', 'The Transhuman Network State', 'Projects in our orbit', 'Transhumanism Australia is part of a global network of projects accelerating our transhuman future.', networkGrid())}
${section('media', 'In the media', 'As seen and heard on', '', mediaList(ctx.media.items.slice(0, 8)) + `<p><a class="more" href="media">All media ${icon.arrow({ size: 16 })}</a></p>`)}
${section('faq', 'Questions', 'Good to know', '', faq())}
${finalCta()}`;
  files['index.html'] = page({ title: `${site.name} · ${site.tagline}`, body: home, ld: upcoming.slice(0, 6).map(eventLd), cls: 'home' });

  // ================================================================== EVENTS
  files['events.html'] = page({
    path: 'events', title: `Events · ${site.name}`,
    description: `Free monthly meetups in Sydney on AI and the singularity, longevity, wellbeing and emerging tech. RSVP on Eventbrite.`,
    ld: upcoming.map(eventLd),
    body: `<section class="page-hero"><div class="wrap hero-grid">
<div><p class="kicker">Events</p><h1>Every month, <em>in person.</em></h1><p class="hero-lede">The AI Singularity Syndicate is our monthly meetup in Sydney: we talk about all things AI and don't hold back on where we think we are on the road to the singularity. Every meetup is free and open to everyone, member or not.</p>
<div class="cta-row"><a class="btn btn-ghost" href="${esc(site.eventbrite.organizer_url)}" target="_blank" rel="noopener">Follow on Eventbrite ${icon.ext({ size: 16 })}</a><a class="btn btn-ghost" href="${esc(site.youtube)}" target="_blank" rel="noopener">${icon.play({ size: 16 })} Past talks on YouTube</a></div></div>
<div class="hero-card">${eventCard(next, { heading: 'h2', where: 'events' })}</div></div></section>
${section('all', '', 'Coming up', '', upcoming.length ? `<ul class="ev-list">${upcoming.map(eventRow).join('')}</ul>` : `<p class="muted">Nothing on the calendar right now, but we meet every month. <a href="${esc(site.eventbrite.organizer_url)}" target="_blank" rel="noopener">Follow us on Eventbrite</a> to hear first.</p>`)}
${past.length ? section('past', '', 'Recent meetups', '', `<ul class="past-list">${past.slice(0, 24).map(pastRow).join('')}</ul>`) : ''}
${section('host', '', 'Host, sponsor or speak', `We're always looking for venues, speakers and partners. Email <a href="mailto:${esc(site.email)}">${esc(site.email)}</a>.`, '')}
<section class="sec join"><div class="wrap">${joinBlock('events')}</div></section>`,
  });

  // ================================================================== JOIN
  files['join.html'] = page({
    path: 'join', title: `Become a member · ${site.name}`,
    description: `Join Australia's transhumanist community for ${site.membership.price} a month, with your first ${site.membership.trial_days} days free.`,
    body: `<section class="page-hero"><div class="wrap"><p class="kicker">Membership</p><h1>Join the <em>movement.</em></h1><p class="hero-lede">Super longevity, super wellbeing and super intelligence won't build themselves. Members keep Australia's transhumanist community growing, and meet the people making it happen.</p></div></section>
<section class="sec join"><div class="wrap">${joinBlock('join-page', { heading: false })}</div></section>
${section('how', '', 'How it works', '', `<ol class="steps"><li><b>1</b><h3>Start your free trial</h3><p>It takes a minute on Stripe. Pay nothing for ${site.membership.trial_days} days.</p></li><li><b>2</b><h3>Come to a meetup</h3><p>${next ? `The next one is ${esc(fmt(next.start, 'long'))} at ${esc(next.venue)}.` : 'We meet every month in Sydney.'}</p></li><li><b>3</b><h3>Meet your people</h3><p>Founders, researchers, investors and biohackers who think the future is worth building.</p></li></ol>`)}
${next ? section('next', '', 'The next meetup', '', `<div class="narrow">${eventCard(next, { heading: 'h3', where: 'join' })}</div>`) : ''}
${section('faq', '', 'Questions', '', faq())}`,
  });

  // ================================================================== RADAR
  files['radar.html'] = page({
    path: 'radar', title: `The Transhuman Radar · ${site.name}`,
    description: 'This week\'s headlines in longevity, wellbeing, intelligence and frontier tech, gathered every morning from trusted science and technology sources.',
    body: `<section class="page-hero"><div class="wrap"><p class="kicker">The Transhuman Radar</p><h1>What moved <em>this week.</em></h1><p class="hero-lede">Headlines across the three supers, and the frontier tech that gets us there, gathered every morning from trusted science and technology sources. Updated ${esc(radar.updated ? fmt(radar.updated, 'longy') : '')}.</p></div></section>
${radar.featured ? `<section class="sec tight"><div class="wrap">${sdCard()}</div></section>` : ''}
${PILLARS.map(p => {
      const s = site.supers.find(x => x.id === p);
      const items = byPillar(p);
      return `<section class="sec radar-sec" id="${p}" data-pillar="${p}"><div class="wrap"><header class="sec-head"><p class="kicker">${glyph(p, { size: 16 })} ${esc(s ? s.name : PILLAR_NAME[p])}</p><h2>${esc(s ? s.line : 'And everything that gets us there')}</h2></header>
${items.length ? `<ol class="r-list">${items.map(it => radarItem(it)).join('\n')}</ol>` : '<p class="muted">Nothing new this week.</p>'}</div></section>`;
    }).join('\n')}
${section('sources', '', 'Where the headlines come from', 'Every morning we read these sources, keep the last ten days, and sort each story into a pillar. Want to suggest a source? Email us.', `<ul class="chips">${[...new Set((ctx.sources.sources || []).map(s => s.name))].map(n => `<li>${esc(n)}</li>`).join('')}</ul>`)}`,
  });

  // ================================================================== SPEAKERS
  files['speakers.html'] = page({
    path: 'speakers', title: `Speakers · ${site.name}`,
    description: 'Keynotes and workshops on transhumanism and emerging technology, from generative AI and brain–computer interfaces to robotics, biotech and healthy longevity.',
    body: `<section class="page-hero"><div class="wrap"><p class="kicker">Speakers</p><h1>Keynotes and <em>workshops.</em></h1><p class="hero-lede">We deliver keynotes and workshops on transhumanism and the latest emerging technologies: generative AI, brain–computer interfaces, web3, extended reality, robotics, nanotech, biotech and healthy longevity, plus deep-dives and guided tutorials so people learn by doing.</p>
<div class="cta-row" id="book"><a class="btn btn-primary" href="${esc(site.calendly)}" target="_blank" rel="noopener">Book a call ${icon.arrow({ size: 18 })}</a><a class="btn btn-ghost" href="mailto:${esc(site.email)}?subject=Speaker%20enquiry">${icon.mail({ size: 18 })} ${esc(site.email)}</a></div></div></section>
${section('founders', 'Co-founders', 'Featured speakers', '', founders())}
${section('all', '', 'Speakers and facilitators who have presented with us', '', `<ul class="speaker-grid">${speakers.filter(s => s.photo).map(s => `<li id="${esc(s.id)}">${peopleImg(s.photo, s.name, 120, 120)}<div><h3>${esc(s.name)}${s.cofounder ? ' <span class="badge">Co-founder</span>' : ''}</h3><p>${esc(s.bio)}</p></div></li>`).join('')}</ul>`)}`,
  });

  // ================================================================== PROFILES
  const recentTalks = ctx.peterTalks?.talks || [];
  const profile = (key) => {
    const p = people[key];
    const isPeter = key === 'peterxing';
    return `<section class="page-hero profile"><div class="wrap profile-grid">
<div><p class="kicker">${esc(p.role)}</p><h1>${esc(p.name)}</h1><p class="hero-lede">${esc(p.headline)}</p>
${p.bio.map(b => `<p>${esc(b)}</p>`).join('')}
<div class="cta-row">${isPeter ? `<a class="btn btn-primary" href="${esc(site.calendly)}" target="_blank" rel="noopener">Book ${esc(p.name.split(' ')[0])} ${icon.arrow({ size: 18 })}</a>` : `<a class="btn btn-primary" href="mailto:${esc(p.email)}?subject=Speaking%20enquiry">${icon.mail({ size: 18 })} Contact ${esc(p.name.split(' ')[0])}</a>`}${p.brochure ? ext(p.brochure, 'Keynote brochure', 'btn btn-ghost') : ''}</div>
${p.links ? `<p class="link-row">${p.links.map(l => ext(l.url, esc(l.name))).join(' · ')}</p>` : ''}</div>
<figure>${peopleImg(p.photo, p.name, 560, 500)}</figure></div></section>
${isPeter ? section('help', '', `${esc(p.name.split(' ')[0])} can help with`, '', `<ul class="cards3 two">${p.help.map(h => `<li><h3>${esc(h.title)}</h3><p>${esc(h.text)}</p></li>`).join('')}</ul>`) : section('topics', '', 'Speaking topics', '', `<ul class="chips big">${p.topics.map(t => `<li>${esc(t)}</li>`).join('')}</ul><h3 class="sub">Invited to speak at</h3><ul class="chips">${p.events.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`)}
${isPeter && recentTalks.length ? section('recent', '', 'Recent talks', '', `<ul class="media-list">${recentTalks.map(t => `<li><span class="outlet">${esc(t.venue)}${t.year ? ` · ${esc(t.year)}` : ''}</span>${ext(t.url, esc(t.title))}</li>`).join('')}</ul>`) : ''}
${isPeter ? section('talks', '', 'Selected talks', '', `<ul class="media-list">${p.talks.map(t => `<li><span class="outlet">${esc(t.venue)}</span>${ext(t.url, esc(t.title))}</li>`).join('')}</ul><p class="muted">Also: ${esc(p.also_spoke.join(', '))}.</p>`) : ''}
${p.photo2 ? `<section class="sec tight"><div class="wrap"><figure class="wide-photo">${peopleImg(p.photo2, p.photo2_alt || p.name, 1000, 560)}</figure></div></section>` : ''}
${section('media', '', 'In the media', '', isPeter ? mediaList(p.media) : `<ul class="quotes">${p.media.map(m => `<li><blockquote>${m.url ? ext(m.url, esc(m.title)) : esc(m.title)}</blockquote><cite>${esc(m.outlet)}</cite></li>`).join('')}</ul>`)}
${isPeter ? section('communities', '', 'Communities', '', `<p class="lede">${esc(p.communities)}</p>`) : ''}`;
  };
  files['peterxing.html'] = page({ path: 'peterxing', title: `Peter Xing · ${site.name}`, description: `${people.peterxing.headline} Co-founder of Transhumanism Australia.`, body: profile('peterxing'),
    ld: [{ '@context': 'https://schema.org', '@type': 'Person', name: 'Peter Xing', url: `${SITE}/peterxing`, jobTitle: 'Co-founder, Transhumanism Australia', image: `${SITE}/${people.peterxing.photo}`, sameAs: people.peterxing.links.map(l => l.url) }] });
  files['alysesue.html'] = page({ path: 'alysesue', title: `Alyse Sue · ${site.name}`, description: 'Keynote speaker on web3, the metaverse, AI and transhumanism. Co-founder of Transhumanism Australia and Transhuman Coin.', body: profile('alysesue') });

  // ================================================================== MEDIA, PARTNERS, BLOG
  files['media.html'] = page({ path: 'media', title: `In the media · ${site.name}`, description: 'Transhumanism Australia and its people on the ABC, Sunrise, 9 News, The Project, VICE, HuffPost, CGTN, triple j, TEDx and more.',
    body: `<section class="page-hero"><div class="wrap"><p class="kicker">Media</p><h1>In the <em>media.</em></h1><p class="hero-lede">Transhumanism Australia and its people on TV, radio, podcasts and the web. For media enquiries, email <a href="mailto:${esc(site.email)}">${esc(site.email)}</a>.</p></div></section>
${section('', '', 'Coverage', '', mediaList(ctx.media.items))}` });

  files['partners.html'] = page({ path: 'partners', title: `Partners and venues · ${site.name}`, description: 'The venues that host our meetups and the organisations we have partnered with.',
    body: `<section class="page-hero"><div class="wrap"><p class="kicker">Partners</p><h1>Partners and <em>venues.</em></h1><p class="hero-lede">Thank you to the venues that host our meetups and the communities we've worked with. Want to partner with us? Email <a href="mailto:${esc(site.email)}">${esc(site.email)}</a>.</p></div></section>
${section('venues', '', 'Venues that have hosted us', '', `<ul class="network">${ctx.partners.venues.map(v => `<li><a href="${esc(v.url)}" target="_blank" rel="noopener"><h3>${esc(v.name)} ${icon.ext({ size: 16 })}</h3><p>${esc(v.place)}</p></a></li>`).join('')}</ul>`)}
${section('partners', '', 'Communities we\'ve partnered with', '', `<ul class="chips big">${ctx.partners.partners.map(p => `<li>${p.url ? ext(p.url, esc(p.name)) : esc(p.name)}</li>`).join('')}</ul>`)}` });

  files['blog.html'] = page({ path: 'blog', title: `Articles · ${site.name}`, description: 'Coverage of transhumanism and emerging technologies by members of the community.',
    body: `<section class="page-hero"><div class="wrap"><p class="kicker">Articles</p><h1>From the <em>community.</em></h1><p class="hero-lede">Coverage of transhumanism and emerging technologies by our members. For this week's news, see <a href="radar">the Radar</a>.</p></div></section>
${section('', '', 'Articles', '', `<ul class="media-list">${ctx.articles.items.map(a => `<li>${ext(a.url, esc(a.title))}${a.text ? `<small>${esc(a.text)}</small>` : ''}</li>`).join('')}</ul>`)}` });

  // ================================================================== VENTURE STUDIO
  files['investment.html'] = page({ path: 'investment', title: `Venture studio · ${site.name}`, description: 'We educate, incubate, accelerate and invest in projects for the transhumanism movement across super longevity, super intelligence and super wellbeing.',
    body: `<section class="page-hero"><div class="wrap"><p class="kicker">Venture studio</p><h1>Back the <em>future.</em></h1><p class="hero-lede">As a community, we invest in scientific research and technologies that enhance the human condition, across super longevity, super intelligence and super wellbeing. We educate, incubate, accelerate and invest in projects for the transhumanism movement as part of the Transhuman Network State.</p>
<div class="cta-row"><a class="btn btn-primary" href="${esc(site.calendly)}" target="_blank" rel="noopener">Pitch your project ${icon.arrow({ size: 18 })}</a><a class="btn btn-ghost" href="mailto:${esc(site.email)}?subject=Project%20pitch">${icon.mail({ size: 18 })} Email us</a></div></div></section>
${section('themes', 'Investment themes', 'The three supers', '', doors(false))}
${section('how', '', 'How we help founders', '', `<ul class="cards3 four">${[['Educate', 'Keynotes, workshops, deep-dives and guided tutorials on the technologies that matter.'], ['Incubate', 'Shape early ideas with a community of technologists, researchers and operators.'], ['Accelerate', 'Connections to partners, mentors and research institutions, in Australia and around the world.'], ['Invest', 'Investment in transhuman projects with partners such as WAVIA and Transhuman Coin.']].map(([t, d]) => `<li><h3>${t}</h3><p>${d}</p></li>`).join('')}</ul>`)}
${section('partners', '', 'Who we work with', '', `<ul class="network">${site.network.filter(n => ['WAVIA', 'Transhuman Coin', 'Brain–computer interfaces'].includes(n.name)).map(networkCard).join('')}${networkCard({ name: 'Longevity Vision', text: 'Sergey Young\'s longevity investment portfolio, on a mission to make longevity affordable and accessible for everyone.', url: 'https://longevity.vision/' })}</ul><p class="muted small">Nothing on this site is financial advice.</p>`)}` });

  // ================================================================== BCI
  const bciPhotos = [1, 3, 5, 6, 9, 12].map(n => `assets/img/bci/bci-${String(n).padStart(2, '0')}.webp`);
  files['bci.html'] = page({ path: 'bci', title: `Brain–computer interfaces · ${site.name}`, description: 'Our dream-decoding brain–computer interface project with the Australian Artificial Intelligence Institute at UTS, demoed at SXSW Sydney.',
    body: `<section class="page-hero"><div class="wrap"><p class="kicker">${glyph('intelligence', { size: 16 })} Project</p><h1>Welcome to your <em>dreamscape.</em></h1><p class="hero-lede">Experience brain–computer interfaces (BCIs) from the Australian Artificial Intelligence Institute (AAII) at UTS: an open-source brain-to-computer interface system, demoed at SXSW Sydney at NSW House on 17–19 October 2023 among the latest innovations from NSW's tech scene.</p></div></section>
<section class="sec tight"><div class="wrap"><div class="video"><iframe src="https://www.youtube-nocookie.com/embed/djmMWSQPfJc" title="Brain–computer interface project video" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></div></section>
${section('about', '', 'Decoding the mind', '', `<div class="prose"><p>Approximately one-third of a human lifetime is spent asleep. Dreams, often thought of as cognitive narratives, remain one of the human mind's great mysteries. This BCI project performs functions such as direct mental command and control, enabling seamless and intuitive human–computer interaction. Compatible with a wide variety of devices and platforms, BCIs bring a new era of technology closer to the human mind.</p><p>The team behind it: AAII's ${ext('https://profiles.uts.edu.au/Avinash.Singh', 'Dr Avinash Singh')}, <a href="peterxing">Peter Xing</a> (Transhumanism Australia co-founder), Yangyulin Ai and Quang Nhan Duong.</p></div>`)}
<section class="sec tight"><div class="wrap"><ul class="gallery">${bciPhotos.map((src, i) => `<li>${peopleImg(src, `The BCI demo at SXSW Sydney, photo ${i + 1}`, 1000, 667)}</li>`).join('')}</ul></div></section>
${finalCta()}` });

  // ================================================================== redirects, 404, next
  const redirect = (to, title) => `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><title>${esc(title)}</title><meta name="robots" content="noindex"><link rel="canonical" href="${SITE}/${to.replace(/^\.\//, '')}"><meta http-equiv="refresh" content="0; url=${esc(to)}"><script>location.replace(${JSON.stringify(to)}+(location.hash&&!${JSON.stringify(to)}.includes('#')?location.hash:''))</script></head><body><p><a href="${esc(to)}">${esc(title)}</a></p></body></html>\n`;
  const legacy = { home: './', technologies: './#supers', 'quantum-computing': './#supers', robotics: './#supers', 'biotech-and-nanotech': './#super-longevity', 'vr-and-ar': './#supers', automation: './#supers', healthspan: './#super-longevity', 'internet-of-things': './#supers', 'all-speakers': 'speakers' };
  for (const [from, to] of Object.entries(legacy)) files[`${from}.html`] = redirect(to, site.name);

  const nextTarget = next ? rsvpUrl(next) : 'events';
  files['next.html'] = `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><title>Next meetup · ${esc(site.name)}</title><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=${esc(nextTarget)}"><script>location.replace(${JSON.stringify(nextTarget)})</script></head><body><p><a href="${esc(nextTarget)}">${next ? `${esc(evTitle(next))}, ${esc(fmt(next.start, 'long'))}` : 'Events'}</a></p></body></html>\n`;

  files['404.html'] = `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Page not found · ${esc(site.name)}</title><meta name="robots" content="noindex">
<script>(function(){var p=location.pathname;var m=p.match(/^(.*\\/)([^/]+)\\/+$/);if(m){location.replace(m[1]+m[2]+location.search+location.hash);return}var low=p.toLowerCase();if(low!==p){location.replace(low+location.search+location.hash)}})()</script>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#06070b;color:#e8ecf2;font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:center;padding:24px}h1{font-size:48px;margin:0 0 8px;letter-spacing:.02em}a{color:#ffd447}p{color:#9aa4b4}</style></head>
<body><main><h1>Lost in the singularity</h1><p>That page has moved on (or never existed).</p><p><a href="${SITE}/">Go to the home page</a> · <a href="${SITE}/events">Events</a> · <a href="${SITE}/join">Membership</a></p></main></body></html>\n`;

  // ================================================================== calendar files, sitemap, robots
  for (const ev of upcoming) {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Transhumanism Australia//transhuman.com.au//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
      `UID:${ev.id}@transhuman.com.au`, `DTSTAMP:${isoUtcCompact(now.toISOString())}`, `DTSTART:${isoUtcCompact(ev.start)}`, `DTEND:${isoUtcCompact(ev.end)}`,
      `SUMMARY:${icsText(evTitle(ev))}`, `DESCRIPTION:${icsText(`${ev.talk ? (ev.speaker ? ev.speaker + ': ' : '') + ev.talk + '. ' : ''}${ev.description || ''}\n\nRSVP (free): ${ev.url}`)}`,
      `LOCATION:${icsText([ev.venue, ev.address].filter(Boolean).join(', '))}`, `URL:${ev.url}`, 'END:VEVENT', 'END:VCALENDAR'];
    files[`cal/${ev.id}.ics`] = lines.map(foldIcs).join('\r\n') + '\r\n';
  }
  const pages = ['', 'events', 'join', 'radar', 'speakers', 'peterxing', 'alysesue', 'media', 'partners', 'investment', 'bci', 'blog'];
  const day = now.toISOString().slice(0, 10);
  files['sitemap.xml'] = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(p => `<url><loc>${SITE}/${p}</loc><lastmod>${day}</lastmod></url>`).join('\n')}\n</urlset>\n`;
  files['robots.txt'] = `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`;
  return files;
}

const icsText = s => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
function foldIcs(line) {
  const out = [];
  let s = line;
  while (Buffer.byteLength(s, 'utf8') > 74) {
    let n = 74;
    while (Buffer.byteLength(s.slice(0, n), 'utf8') > 74) n--;
    out.push(s.slice(0, n));
    s = ' ' + s.slice(n);
  }
  out.push(s);
  return out.join('\r\n');
}
