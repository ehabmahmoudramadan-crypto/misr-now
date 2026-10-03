# MISR NOW

**Live Arabic news portal with an English interface** — headlines, football, currency rates and weather, built with nothing but HTML, CSS and vanilla JavaScript.

The chrome (navigation, buttons, section labels, tables) is in English, and every
headline comes back in Arabic — Egyptian Arabic first, through GNews and a set of
Arabic RSS feeds. Everything is fetched live from free public APIs at request
time. No database, no build step, no framework.

🔗 **Live demo:** https://ehabmahmoudramadan-crypto.github.io/misr-now/

---

## Languages

| Layer | Language | How |
| --- | --- | --- |
| Interface | English | static markup in the five HTML files |
| Headlines, summaries | Arabic | `CONFIG.gnewsLang = "ar"`, `CONFIG.gnewsCountry = "eg"`, Arabic RSS feeds |
| Direction of a headline | automatic | every text node carries `dir="auto"`, so the browser picks RTL or LTR from the content |
| Search | Arabic-aware | diacritics, hamza and ta-marbuta variants are folded before comparing |
| Sports, weather, currency data | English | TheSportsDB, WeatherAPI and open.er-api return those in English |

---

## What is inside

| Page | File | What it does |
| --- | --- | --- |
| Home | `index.html` | Merged live feed (6 sources), lead story, lazy section rail, source filter, Arabic-aware search, live weather / rates / score widgets |
| Sports | `sports.html` | Live scores with auto-refresh, league list, sports headlines, club finder |
| Currency | `currency.html` | Featured EGP pairs, instant converter, full rate table with share bars |
| Weather | `weather.html` | Current conditions for 8 Egyptian cities, next 12 hours, 5-day outlook, at-a-glance grid |
| Article | `article.html` | Full headline view with the original publisher link |

Shared logic lives in three files loaded by every page:

* `js/config.js` — API keys, endpoints, feed list, cities, currencies, refresh timers
* `js/api.js` — every request, normalised to one shape, with caching and fallbacks
* `js/ui.js` — theme, clock, nav, breaking-news ticker, toasts, formatting helpers

Each page then loads its own small script: `news.js`, `sports.js`, `currency.js`, `weather.js`, `article.js`.

---

## Data sources

| Feature | Provider | Key needed | Notes |
| --- | --- | --- | --- |
| Top headlines | GNews (`lang=ar`, `country=eg`) | yes | Sections use an Arabic search phrase, fetched lazily |
| Arabic RSS | DW Arabic, Al Masry Al-Youm | no | Fetched **directly** — these send CORS headers, so the browser parses the XML itself |
| Arabic RSS | BBC Arabic, Al Jazeera, RT Arabic | no | Read through rss2json, which has a free quota and throttles bursts |
| Football | TheSportsDB | no (free tier `123`) | Live scores, leagues, team search |
| Exchange rates | open.er-api.com | no | Primary source — the only free one carrying EGP |
| Exchange backup | Frankfurter | no | Fills any international pair the primary misses |
| Weather | WeatherAPI | yes | Current, hourly and 6-day forecast |
| Weather fallback | Open-Meteo | no | Used automatically if WeatherAPI fails |

A typical home page therefore shows around 100 Arabic headlines from six sources.

### Behaviour under failure

* A dead RSS feed is logged and skipped — the rest of the feed still renders.
* WeatherAPI falling back to Open-Meteo is transparent to the page.
* If every currency provider fails the page shows an explicit empty state.
* Identical in-flight requests share one network call, which keeps GNews
  inside its free-tier rate limit.
* A `429` from GNews triggers one delayed retry.
* Responses are cached in `localStorage` for `CONFIG.cacheMinutes`.

### One thing worth knowing about GNews

`gnews.io` sends no `Access-Control-Allow-Origin` header, so a browser is not
allowed to call it directly from a page. The request therefore goes through a
public read-only proxy (`CONFIG.gnewsProxy`). If the proxy ever disappears, the
code falls back to the direct address, so the site keeps working as soon as the
provider adds CORS support. Replace the proxy with your own serverless endpoint
if you want the key to stay off the client.

---

## Run it locally

The project is static, but the browser blocks `fetch` on `file://`, so serve it:

```bash
# any static server works, e.g.
npx serve .
# or with Node only
node -e "const h=require('http'),f=require('fs'),p=require('path');h.createServer((q,s)=>{const fp=p.join(process.cwd(),q.url==='/'?'/index.html':q.url.split('?')[0]);f.readFile(fp,(e,d)=>{if(e){s.writeHead(404);return s.end('404')}s.writeHead(200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css'}[p.extname(fp)]||'text/plain'});s.end(d)})}).listen(8080)"
```

Then open <http://localhost:8080>.

---

## Project layout

```
proj-02/
├── index.html        home
├── sports.html       football desk
├── currency.html     rates + converter
├── weather.html      weather desk
├── article.html      single headline view
├── css/
│   └── style.css     tokens, components, responsive rules, dark mode
└── js/
    ├── config.js     all configuration in one place
    ├── api.js        data layer (news, sports, weather, currency)
    ├── ui.js         shared UI helpers
    ├── news.js       home page
    ├── sports.js     sports page
    ├── currency.js   currency page
    ├── weather.js    weather page
    └── article.js    article page
```

---

## Security note about the API keys

`js/config.js` holds the GNews and WeatherAPI keys, which means they are
visible to anyone who opens the source. That is fine for a school project,
but before publishing anything real:

1. Restrict each key to the deployment domain from the provider's dashboard.
2. Or move the calls behind a tiny serverless function and keep the key there.

---

## Accessibility and responsiveness

* Semantic landmarks, `aria-label`s on icon buttons, `aria-current` on the active nav item.
* Full keyboard focus on every control; cards open from buttons, not `<div>`s.
* Breakpoints at 1080px, 900px, 760px and 520px — the layout holds from 1440px down to 360px.
* `prefers-reduced-motion` disables the ticker animation and transitions.
* Light and dark themes, remembered in `localStorage`.

---

## Licence

Built as a front-end course project. Headlines and images belong to their
original publishers; this project only indexes their public feeds.
