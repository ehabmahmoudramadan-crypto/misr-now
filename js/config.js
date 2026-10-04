/* =========================================================
   MISR NOW — project configuration
   Every API used here is free. The GNews and WeatherAPI keys
   live in this file (school project) — for production, lock
   them to your domain from each provider's dashboard.
   ========================================================= */

const CONFIG = {
  /* ---------- NEWS ---------- */

  /* GNews key — https://gnews.io */
  gnewsKey: "285d6352b5efed01b826f635648ea45d",

  /* Section rail. Each section is fetched lazily (only on click)
     so we stay well inside the free daily quota. */
  categories: [
    { id: "top", name: "Top Stories", icon: "🔥", query: "" },
    { id: "world", name: "World", icon: "🌍" },
    { id: "business", name: "Business", icon: "💼" },
    { id: "sports", name: "Sports", icon: "⚽" },
    { id: "health", name: "Health", icon: "🩺" },
    { id: "technology", name: "Tech", icon: "💻" },
    { id: "entertainment", name: "Entertainment", icon: "🎬" }
  ],

  /* Open RSS feeds — free, no key, no quota */
  rssFeeds: [
    { id: "bbc", name: "BBC News", short: "BBC", url: "https://feeds.bbci.co.uk/news/rss.xml" },
    { id: "cbs", name: "CBS News", short: "CBS", url: "https://www.cbsnews.com/latest/rss/main" },
    { id: "france24", name: "France 24", short: "F24", url: "https://www.france24.com/en/rss" },
    { id: "dw", name: "Deutsche Welle", short: "DW", url: "https://rss.dw.com/rdf/rss-en-all" },
    { id: "guardian", name: "The Guardian", short: "Guardian", url: "https://www.theguardian.com/world/rss" }
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
  cacheMinutes: 10,
  scoresRefreshSec: 90,
  pageSize: 9
};

/* Page map — used by the header nav, footer and article links */
const PAGES = {
  home: "index.html",
  sports: "sports.html",
  currency: "currency.html",
  weather: "weather.html"
};