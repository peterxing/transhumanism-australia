// transhuman.com.au: countdowns, the radar filter, the mobile menu and the mobile join bar. No dependencies.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // ---- mobile menu
  const head = $('.site-head');
  const toggle = $('.nav-toggle');
  if (head && toggle) {
    toggle.addEventListener('click', () => {
      const open = head.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    $$('.nav a', head).forEach(a => a.addEventListener('click', () => { head.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }));
  }

  // ---- countdowns to the next meetup (Sydney times are baked into data-start/data-end as ISO with offset)
  const cards = $$('[data-countdown]');
  const pad = n => String(n).padStart(2, '0');
  function tick() {
    const now = Date.now();
    for (const el of cards) {
      const start = Date.parse(el.dataset.start), end = Date.parse(el.dataset.end);
      if (now >= end) {
        el.classList.add('is-over');
        const label = $('[data-cd-label]', el); if (label) label.textContent = 'That\u2019s a wrap';
        const live = $('[data-cd-live]', el); if (live) { live.hidden = false; live.textContent = 'This one has finished. The next date is on its way.'; }
        continue;
      }
      if (now >= start) {
        el.classList.add('is-live');
        const label = $('[data-cd-label]', el); if (label) label.textContent = 'On now';
        const live = $('[data-cd-live]', el); if (live) live.hidden = false;
        continue;
      }
      const ms = start - now;
      const v = { d: Math.floor(ms / 864e5), h: Math.floor(ms / 36e5) % 24, m: Math.floor(ms / 6e4) % 60, s: Math.floor(ms / 1e3) % 60 };
      for (const k of Object.keys(v)) { const b = $(`[data-cd="${k}"]`, el); if (b) b.textContent = pad(v[k]); }
    }
  }
  if (cards.length) { tick(); setInterval(tick, 1000); }

  // ---- radar filter (home page): "All" shows the interleaved picks, a pillar shows everything in it
  const list = $('[data-radar]');
  const buttons = $$('.radar-tabs button');
  if (list && buttons.length) {
    const items = $$('.r-item', list);
    const apply = f => {
      buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === f)));
      let shown = 0;
      for (const it of items) {
        const on = f === 'all' ? it.hasAttribute('data-all') : it.dataset.pillar === f && shown < 10;
        it.hidden = !on;
        if (on) shown++;
      }
    };
    buttons.forEach(b => b.addEventListener('click', () => apply(b.dataset.filter)));
  }

  // ---- mobile join bar: appears once the hero's own buttons have scrolled away
  const bar = $('[data-mcta]');
  const anchor = $('.hero .cta-row') || $('.page-hero') || $('main > *');
  if (bar && anchor && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => bar.classList.toggle('show', !e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 }).observe(anchor);
  }
})();
