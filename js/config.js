/* =========================================================
   MISR NOW — project configuration
   The interface is English; the news itself is Arabic
   (Egyptian Arabic by default). Every API used here is free.
   The GNews and WeatherAPI keys live in this file (school
   project) — for production, lock them to your domain from
   each provider's dashboard.
   ========================================================= */

const CONFIG = {
  /* ---------- NEWS ---------- */

  /* GNews key — https://gnews.io */
  gnewsKey: "285d6352b5efed01b826f635648ea45d",

  /* Arabic headlines, Egypt-first */
  gnewsLang: "ar",
  gnewsCountry: "eg",

  /* gnews.io sends no CORS header, so the browser needs a proxy.
     Swap this for your own serverless endpoint if you have one. */
  gnewsProxy: "https://api.allorigins.win/raw?url=",

  /* Section rail. The labels stay English because they belong to
     the interface; each section is fetched lazily on click so we
     stay well inside the free daily quota. `query` is used when a
     topic returns nothing useful in Arabic. */
  categories: [
    { id: "world", name: "World", icon: "🌍", query: "العالم" },
    { id: "business", name: "Business", icon: "💼", query: "اقتصاد" },
    { id: "technology", name: "Tech", icon: "💻", topic: "technology" },
    { id: "sports", name: "Sports", icon: "⚽", query: "رياضة" },
    { id: "health", name: "Health", icon: "🩺", query: "صحة" },
    { id: "entertainment", name: "Culture", icon: "🎬", query: "فن وثقافة" }
  ],

  /* Open Arabic RSS feeds — free, no key.
     `direct: true` means the feed sends CORS headers, so the browser
     parses the XML itself; the others need rss2json, which has a quota. */
  rssFeeds: [
    { id: "dw-ar", name: "Deutsche Welle Arabic", short: "DW", direct: true, url: "https://rss.dw.com/rdf/rss-ar-all" },
    { id: "almasryalyoum", name: "Al Masry Al-Youm", short: "Masry", direct: true, url: "https://www.almasryalyoum.com/rss/rssfeeds" },
    { id: "bbc-ar", name: "BBC Arabic", short: "BBC", url: "https://feeds.bbci.co.uk/arabic/rss.xml" },
    { id: "aljazeera", name: "Al Jazeera", short: "AJ", url: "https://www.aljazeera.net/aljazeerarss/a7c186be-1baa-4bd4-9d80-a84db769f779/73d0e1b4-532f-45ef-b135-bfdff8b8cab9" },
    { id: "rt-arabic", name: "RT Arabic", short: "RT", url: "https://arabic.rt.com/rss/" }
  ],

  /* ---------- SPORTS ---------- */
  sports: {
    base: "https://www.thesportsdb.com/api/v1/json",
    key: "123",
    primaryLeagues: ["4328", "4335", "4332", "4331", "4330"]
  },

  /* ---------- WEATHER ---------- */
  weatherApiKey: "eaddd34ad0834a5f841145519263009",
  weatherApi: { base: "https://api.weatherapi.com/v1" },
  weather: {
    base: "https://api.open-meteo.com/v1/forecast",
    cities: [
      { id: "cairo", name: "Cairo", lat: 30.0444, lon: 31.2357 },
      { id: "alex", name: "Alexandria", lat: 31.2001, lon: 29.9187 },
      { id: "giza", name: "Giza", lat: 30.0131, lon: 31.2089 },
      { id: "mansoura", name: "Mansoura", lat: 31.0409, lon: 31.3785 },
      { id: "tanta", name: "Tanta", lat: 30.7865, lon: 30.9934 },
      { id: "luxor", name: "Luxor", lat: 25.6872, lon: 32.6396 },
      { id: "aswan", name: "Aswan", lat: 24.0889, lon: 32.8998 },
      { id: "portsaid", name: "Port Said", lat: 31.2653, lon: 32.3019 }
    ]
  },

  /* ---------- CURRENCY ---------- */
  /* open.er-api is the only free source that carries EGP,
     so it stays the primary; Frankfurter backs up world pairs. */
  currency: {
    base: "https://open.er-api.com/v6/latest",
    frankfurter: "https://api.frankfurter.dev/v1/latest",
    frankfurterSymbols: ["EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "TRY", "CNY"],
    main: "USD",
    list: [
      { code: "USD", name: "US Dollar", flag: "🇺🇸" },
      { code: "EUR", name: "Euro", flag: "🇪🇺" },
      { code: "GBP", name: "British Pound", flag: "🇬🇧" },
      { code: "SAR", name: "Saudi Riyal", flag: "🇸🇦" },
      { code: "AED", name: "UAE Dirham", flag: "🇦🇪" },
      { code: "QAR", name: "Qatari Riyal", flag: "🇶🇦" },
      { code: "KWD", name: "Kuwaiti Dinar", flag: "🇰🇼" },
      { code: "JPY", name: "Japanese Yen", flag: "🇯🇵" },
      { code: "TRY", name: "Turkish Lira", flag: "🇹🇷" },
      { code: "CNY", name: "Chinese Yuan", flag: "🇨🇳" },
      { code: "EGP", name: "Egyptian Pound", flag: "🇪🇬" }
    ]
  },

  /* ---------- APP BEHAVIOUR ---------- */
  cacheMinutes: 15,
  scoresRefreshSec: 90,
  gnewsRetryMs: 4000,
  rssRetryMs: 9000,
  pageSize: 9
};

/* Page map — used by the header nav, footer and article links */
const PAGES = {
  home: "index.html",
  sports: "sports.html",
  currency: "currency.html",
  weather: "weather.html"
};