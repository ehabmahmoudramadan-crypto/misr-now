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

  /* ---------- WEATHER ---------- */
  /* All 27 Egyptian governorates, grouped by region. The rail is grouped
     the same way so the page stays readable with this many cities. */
  weatherApiKey: "eaddd34ad0834a5f841145519263009",
  weatherApi: { base: "https://api.weatherapi.com/v1" },
  weather: {
    base: "https://api.open-meteo.com/v1/forecast",
    /* How many cities may be requested at once by the "all cities" grid */
    batch: 6,
    regions: ["Greater Cairo", "Delta", "Canal & Coast", "Upper Egypt"],
    cities: [
      { id: "cairo", name: "Cairo", region: "Greater Cairo", lat: 30.0444, lon: 31.2357 },
      { id: "giza", name: "Giza", region: "Greater Cairo", lat: 30.0131, lon: 31.2089 },
      { id: "qalyubia", name: "Benha", region: "Greater Cairo", lat: 30.4664, lon: 31.3247 },

      { id: "dakahlia", name: "Mansoura", region: "Delta", lat: 31.0339, lon: 31.2419 },
      { id: "gharbia", name: "Tanta", region: "Delta", lat: 30.7865, lon: 30.9934 },
      { id: "monufia", name: "Shibin El Kom", region: "Delta", lat: 30.5525, lon: 31.0128 },
      { id: "beheira", name: "Damanhur", region: "Delta", lat: 31.0341, lon: 30.4682 },
      { id: "kafrelsheikh", name: "Kafr El Sheikh", region: "Delta", lat: 31.1117, lon: 30.9398 },
      { id: "sharqia", name: "Zagazig", region: "Delta", lat: 30.5877, lon: 31.5020 },
      { id: "damietta", name: "Damietta", region: "Delta", lat: 31.4167, lon: 31.8167 },

      { id: "alexandria", name: "Alexandria", region: "Canal & Coast", lat: 31.2001, lon: 29.9187 },
      { id: "portsaid", name: "Port Said", region: "Canal & Coast", lat: 31.2653, lon: 32.3019 },
      { id: "ismailia", name: "Ismailia", region: "Canal & Coast", lat: 30.5965, lon: 32.2715 },
      { id: "suez", name: "Suez", region: "Canal & Coast", lat: 29.9668, lon: 32.5498 },
      { id: "redsea", name: "Hurghada", region: "Canal & Coast", lat: 27.2579, lon: 33.8116 },
      { id: "matrouh", name: "Matrouh", region: "Canal & Coast", lat: 31.3543, lon: 27.2373 },
      { id: "northsinai", name: "Arish", region: "Canal & Coast", lat: 31.1316, lon: 33.3578 },
      { id: "southsinai", name: "Sharm El Sheikh", region: "Canal & Coast", lat: 27.9158, lon: 34.3300 },

      { id: "faiyum", name: "Faiyum", region: "Upper Egypt", lat: 29.3084, lon: 30.8428 },
      { id: "benisuef", name: "Beni Suef", region: "Upper Egypt", lat: 29.0661, lon: 31.0994 },
      { id: "minya", name: "Minya", region: "Upper Egypt", lat: 28.1099, lon: 30.7503 },
      { id: "asyut", name: "Asyut", region: "Upper Egypt", lat: 27.1801, lon: 31.1837 },
      { id: "sohag", name: "Sohag", region: "Upper Egypt", lat: 26.8372, lon: 31.6959 },
      { id: "qena", name: "Qena", region: "Upper Egypt", lat: 26.1642, lon: 32.7267 },
      { id: "luxor", name: "Luxor", region: "Upper Egypt", lat: 25.6872, lon: 32.6396 },
      { id: "aswan", name: "Aswan", region: "Upper Egypt", lat: 24.0889, lon: 32.8998 },
      { id: "newvalley", name: "Kharga", region: "Upper Egypt", lat: 25.4488, lon: 30.5425 }
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
  gnewsRetryMs: 4000,
  rssRetryMs: 9000,
  pageSize: 9
};

/* Page map — used by the header nav, footer and article links */
const PAGES = {
  home: "index.html",
  currency: "currency.html",
  weather: "weather.html"
};