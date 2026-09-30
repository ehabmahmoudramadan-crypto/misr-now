/* =========================================================
   مصر الآن — إعدادات المشروع
   كل الـ APIs المستخدمة مجانية ولا تحتاج أي مفتاح (Key).
   لو حبيت أخبار أكتر، سجّل في gnews.io وحط المفتاح في الأسفل.
   ========================================================= */

const CONFIG = {
  /* مفتاح GNews (اختياري) — من https://gnews.io */
  gnewsKey: "",

  /* مصادر الأخبار العربية عبر RSS */
  newsFeeds: [
    { id: "bbc", name: "BBC عربي", short: "BBC", url: "https://feeds.bbci.co.uk/arabic/rss.xml" },
    { id: "dw", name: "DW عربية", short: "DW", url: "https://rss.dw.com/rdf/rss-ar-all" },
    { id: "france24", name: "France 24", short: "F24", url: "https://www.france24.com/ar/rss" },
    { id: "rt", name: "RT عربية", short: "RT", url: "https://arabic.rt.com/rss/" },
    { id: "cnn", name: "CNN عربية", short: "CNN", url: "http://arabic.cnn.com/api/v1/rss/rss.xml" }
  ],

  /* الرياضة: TheSportsDB — المفتاح المجاني 123 */
  sports: {
    base: "https://www.thesportsdb.com/api/v1/json",
    key: "123",
    primaryLeagues: ["4328", "4335", "4332", "4331", "4330"]
  },

  /* الطقس: WeatherAPI (أساسي) + Open-Meteo (احتياطي) */
  weatherApiKey: "eaddd34ad0834a5f841145519263009",
  weatherApi: { base: "https://api.weatherapi.com/v1" },
  weather: {
    base: "https://api.open-meteo.com/v1/forecast",
    cities: [
      { id: "cairo", name: "القاهرة", lat: 30.0444, lon: 31.2357 },
      { id: "alex", name: "الإسكندرية", lat: 31.2001, lon: 29.9187 },
      { id: "giza", name: "الجيزة", lat: 30.0131, lon: 31.2089 },
      { id: "mansoura", name: "المنصورة", lat: 31.0409, lon: 31.3785 },
      { id: "tanta", name: "طنطا", lat: 30.7865, lon: 30.9934 },
      { id: "luxor", name: "الأقصر", lat: 25.6872, lon: 32.6396 },
      { id: "aswan", name: "أسوان", lat: 24.0889, lon: 32.8998 },
      { id: "portsaid", name: "بورسعيد", lat: 31.2653, lon: 32.3019 }
    ]
  },

/* العملات: open.er-api.com (أساسي — فيه الجنيه) + Frankfurter (احتياطي — عملات عالمية) */
  currency: {
    base: "https://open.er-api.com/v6/latest",
    frankfurter: "https://api.frankfurter.dev/v1/latest",
    frankfurterSymbols: ["EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "TRY", "CNY"],
    main: "USD",
    list: [
      { code: "USD", name: "دولار أمريكي", flag: "🇺🇸" },
      { code: "EUR", name: "يورو", flag: "🇪🇺" },
      { code: "GBP", name: "جنيه إسترليني", flag: "🇬🇧" },
      { code: "SAR", name: "ريال سعودي", flag: "🇸🇦" },
      { code: "AED", name: "درهم إماراتي", flag: "🇦🇪" },
      { code: "QAR", name: "ريال قطري", flag: "🇶🇦" },
      { code: "KWD", name: "دينار كويتي", flag: "🇰🇼" },
      { code: "JPY", name: "ين ياباني", flag: "🇯🇵" },
      { code: "TRY", name: "ليرة تركية", flag: "🇹🇷" },
      { code: "CNY", name: "يوان صيني", flag: "🇨🇳" },
      { code: "EGP", name: "جنيه مصري", flag: "🇪🇬" }
    ]
  },

  /* مدة الكاش قبل إعادة الطلب (بالدقائق) */
  cacheMinutes: 10,

  /* تحديث النتائج المباشرة كل ثانية */
  scoresRefreshSec: 90
};