# transhuman.com.au

The website of **Transhumanism Australia**: a community and venture studio for the science and technology that make us
more than human. *Live longer. Feel better. Think bigger.*

It replaces the old Squarespace site with a fast static site on GitHub Pages that's built to do three jobs:

1. **Grow membership.** Every page leads to the A$5/month membership (14 days free) on Stripe.
2. **Fill the monthly meetups.** The next AI Singularity Syndicate is on every page: a top bar, a live countdown in the
   hero, an add-to-calendar file and a mobile RSVP bar. New Eventbrite events appear by themselves.
3. **Cover all of transhumanism, not just AI.** The three supers from the original brand, super longevity (∞, green),
   super wellbeing (^, yellow) and super intelligence (+, blue), plus the frontier tech that gets us there, with a daily
   **Transhuman Radar** of fresh headlines and the latest episode of The Singularity Daily from peterxing.com.

## Pages

| Address | What it is |
| --- | --- |
| `/` | Home: hero with the next meetup, the three supers, events, membership, the Radar, people, projects, media, FAQ |
| `/events` | Every upcoming meetup and the recent ones |
| `/next` | Always forwards to the next meetup's Eventbrite page. Use it in bios, slides and QR codes |
| `/join` | Membership landing page (good for QR codes at meetups) |
| `/radar` | This week's headlines in each pillar, and the sources |
| `/speakers`, `/peterxing`, `/alysesue` | Speakers and the co-founders' profiles (Peter's recent talks sync from peterxing.com) |
| `/investment` | The venture studio |
| `/bci` | The brain–computer interface project with UTS |
| `/media`, `/partners`, `/blog` | Press coverage, venues and partners, community articles |

Old Squarespace addresses keep working: `/home`, `/technologies`, `/robotics`, `/healthspan`, `/quantum-computing`,
`/biotech-and-nanotech`, `/vr-and-ar`, `/automation`, `/internet-of-things` and `/all-speakers` forward to their new
places, and the 404 page fixes trailing slashes and capital letters (`/PeterXing/` → `/peterxing`).
transhumanism.com.au forwards here too (see `peterxing/transhumanism-redirect`).

## Editing

Everything a visitor reads lives in `data/`. Edit a file on GitHub, commit, and the site rebuilds in about a minute.

| File | Holds |
| --- | --- |
| `data/site.json` | Tagline, membership (price, trial, **Stripe link**, benefits), the three supers, what we do, projects, FAQ, socials, contact |
| `data/events.json` | Refreshed automatically from Eventbrite. Add a talk title or speaker, or hide an event, under `overrides` (keyed by the Eventbrite event id) |
| `data/sources.json` | The Radar's feeds, pillar keywords and limits |
| `data/people.json` | Peter's and Alyse's profile pages |
| `data/speakers.json` | Everyone who has presented with us |
| `data/media.json`, `data/partners.json`, `data/articles.json` | Media coverage, venues and partners, articles |
| `data/radar.json`, `data/peter-talks.json` | Generated. Don't edit |

To change the membership price or Stripe Payment Link, edit `membership` in `data/site.json`. Links to Stripe carry
`utm_source=transhuman.com.au` and a `utm_content` naming the button (hero, header, footer, mobile-bar, final, home,
events, join-page), so the Stripe dashboard shows which buttons convert. Eventbrite links carry `aff=transhumancomau`
for Eventbrite's tracking-link reports.

## How it runs

`.github/workflows/pages.yml` builds the site with `node tools/build.mjs` (Node 22, no dependencies) and deploys it to
GitHub Pages:

- **on every push** it builds from the committed data;
- **twice a day** (about 6:15am and 6:15pm Sydney time) and on demand (Actions → Build and deploy → Run workflow) it runs
  `node tools/build.mjs --refresh` first, which
  - reads the organiser page on Eventbrite for upcoming events (skipping cancelled ones) and each event's own page for
    the details; ended events move to `past`, and an event that vanishes is re-checked on its own page before it's dropped;
  - reads the Radar feeds, keeps the last ten days, drops sponsored posts, sorts each headline into a pillar and keeps up
    to 12 per pillar (3 per source);
  - copies Peter's recent talks from peterxing.com/author.json;
  - commits `data/` only when something changed.

A network failure never breaks the site: each refresh falls back to the last good data.

## Working locally

```
node tools/build.mjs --refresh   # or without --refresh to use the committed data
node tools/serve.mjs             # http://localhost:8787, routed like GitHub Pages
```

## Credits

Fonts: Anton, Inter and JetBrains Mono (SIL Open Font License 1.1, `assets/fonts/OFL.txt`). Radar headlines link to, and
belong to, their publishers. Speaker photos and bios were migrated from the original site.
