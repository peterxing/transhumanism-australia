// Inline SVG icons (stroke = currentColor). The three supers keep the old brand's glyphs: ∞ longevity, ^ wellbeing, + intelligence.
const svg = (d, { size = 24, sw = 2, fill = 'none', cls = '', label } = {}) =>
  `<svg class="ico ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>${d}</svg>`;

export const glyphPath = {
  longevity: '<path d="M12 12c-1.8-2.4-3.4-3.6-5.1-3.6a3.6 3.6 0 0 0 0 7.2c1.7 0 3.3-1.2 5.1-3.6zm0 0c1.8 2.4 3.4 3.6 5.1 3.6a3.6 3.6 0 0 0 0-7.2c-1.7 0-3.3 1.2-5.1 3.6z"/>',
  wellbeing: '<path d="M5.5 15.5 12 8.5l6.5 7"/>',
  intelligence: '<path d="M12 5v14M5 12h14"/>',
  frontier: '<path d="M12 4.5 19.5 12 12 19.5 4.5 12z"/>',
};
export const glyph = (p, opts = {}) => svg(glyphPath[p] || glyphPath.frontier, { sw: 2.6, ...opts });

export const icon = {
  arrow: (o) => svg('<path d="M5 12h14M13 6l6 6-6 6"/>', o),
  ext: (o) => svg('<path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/>', o),
  cal: (o) => svg('<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M8 3v4M16 3v4M3.5 10h17"/>', o),
  pin: (o) => svg('<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>', o),
  clock: (o) => svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', o),
  ticket: (o) => svg('<path d="M4 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v1h16v-1a2 2 0 0 1 0-4 2 2 0 0 0 0-4V7H4z"/><path d="M14 7v10" stroke-dasharray="2 2"/>', o),
  menu: (o) => svg('<path d="M4 7h16M4 12h16M4 17h16"/>', o),
  close: (o) => svg('<path d="M6 6l12 12M18 6 6 18"/>', o),
  play: (o) => svg('<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>', o),
  mail: (o) => svg('<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>', o),
  check: (o) => svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>', o),
  user: (o) => svg('<circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.5a7 7 0 0 1 14 0"/>', o),
  spark: (o) => svg('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>', o),
};

// The h+ mark: a ring broken at the top right, an h, and the + sitting in the gap.
export const logoMark = (size = 34, plus = 'var(--wellbeing)') =>
  `<svg class="mark" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="27" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-dasharray="128 41.65" transform="rotate(-8 32 32)"/><path d="M22 17v30M22 33c0-5 4-8 7.5-8S37 28 37 33v14" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M47.5 10.5v14M40.5 17.5h14" fill="none" stroke="${plus}" stroke-width="5" stroke-linecap="round"/></svg>`;
