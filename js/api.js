/* =========================================================
   مصر الآن — طبقة التعامل مع الـ APIs
   كل المصادر مجانية وبدون مفاتيح، مع كاش محلي في localStorage
   ========================================================= */

const Api = (() => {
  const cache = {
    get(key) {
      try {
        const raw = localStorage.getItem("mn:" + key);
        if (!raw) return null;
        const { time, data } = JSON.parse(raw);
        if (Date.now() - time > CONFIG.cacheMinutes * 60000) return null;
        return data;
      } catch { return null; }
    },
    set(key, data) {
      try { localStorage.setItem("mn:" + key, JSON.stringify({ time: Date.now(), data })); } catch {}
    },
    drop(prefix) {
      Object.keys(localStorage)
        .filter(k => k.startsWith("mn:" + prefix))
        .forEach(k => localStorage.removeItem(k));
    }
  };

  const rss2json = "https://api.rss2json.com/v1/api.json?rss_url=";

  async function getJSON(url, cacheKey, { force = false } = {}) {
    if (!force && cacheKey) {
      const hit = cache.get(cacheKey);
      if (hit) return hit;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    if (cacheKey) cache.set(cacheKey, data);
    return data;
  }

  /* ---------- الأخبار ---------- */
  async function news(feed) {
    /* ملاحظة: بارامتر count بيتطلب API key في rss2json المجاني، فبنسيبه */
    const url = rss2json + encodeURIComponent(feed.url);
    const data = await getJSON(url, "news:" + feed.id);

    return (data.items || []).map(item => ({
      title: clean(item.title),
      link: item.link,
      date: item.pubDate,
      image: item.thumbnail || item.enclosure?.link || item.image?.url || placeholder,
      source: feed.short,
      sourceName: feed.name,
      feedId: feed.id
    }));
  }

  async function allNews(force = false) {
    const results = await Promise.allSettled(CONFIG.newsFeeds.map(f => news(f)));
    const merged = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled") merged.push(...r.value);
      else console.warn("فشل مصدر:", CONFIG.newsFeeds[i].name, r.reason?.message);
    });
    if (!merged.length) throw new Error("لا يوجد أي مصدر أخبار شغّال");
    return dedupe(merged).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /* ---------- الرياضة ---------- */
  const sportsBase = () => `${CONFIG.sports.base}/${CONFIG.sports.key}`;

  async function liveScores(force = false) {
    const data = await getJSON(sportsBase() + "/livescore.php?sport=Soccer", "scores", { force });
    return (data.livescore || [])
      .filter(m => m.strSport === "Soccer")
      .map(m => ({
        league: m.strLeague,
        home: m.strHomeTeam,
        away: m.strAwayTeam,
        homeBadge: m.strHomeTeamBadge,
        awayBadge: m.strAwayTeamBadge,
        score: `${m.intHomeScore ?? "-"} - ${m.intAwayScore ?? "-"}`,
        minute: m.strProgress || m.strStatus || "",
        status: statusOf(m),
        venue: m.strVenue || ""
      }));
  }

  function statusOf(m) {
    const s = (m.strStatus || "").toLowerCase();
    if (s.includes("match") || s.includes("minute")) return "live";
    if (s.includes("postponed") || s.includes("canceled")) return "postponed";
    if (s.includes("finished") || s.includes("full")) return "finished";
    return "scheduled";
  }

  async function leagues() {
    const data = await getJSON(sportsEp("all_leagues.php"), "leagues");
    return (data.leagues || [])
      .filter(l => CONFIG.sports.primaryLeagues.includes(l.idLeague))
      .map(l => ({ id: l.idLeague, name: l.strLeague, sport: l.strSport }));
  }

  async function searchTeam(q) {
    const data = await getJSON(sportsEp("searchteams.php?t=" + encodeURIComponent(q)), "team:" + q);
    return (data.teams || []).map(t => ({
      name: t.strTeam,
      alternate: t.strTeamAlternate || "",
      league: t.strLeague || "",
      country: t.strCountry || "",
      badge: t.strTeamBadge || placeholder,
      formed: t.intFormedYear || ""
    }));
  }

  function sportsEp(ep) { return sportsBase() + "/" + ep; }

  /* ---------- الطقس ---------- */
  async function weather(cityId) {
    const city = CONFIG.weather.cities.find(c => c.id === cityId) || CONFIG.weather.cities[0];
    if (CONFIG.weatherApiKey) {
      try {
        return await weatherViaWeatherApi(city);
      } catch (e) {
        console.warn("WeatherAPI فشل، هنستخدم Open-Meteo:", e.message);
        Api.cache.drop("wx:" + city.id);
      }
    }
    return await weatherViaOpenMeteo(city);
  }

  async function weatherViaWeatherApi(city) {
    const url = `${CONFIG.weatherApi.base}/forecast.json?key=${CONFIG.weatherApiKey}` +
      `&q=${city.lat},${city.lon}&days=6&aqi=no&alerts=no&lang=ar`;

    const d = await getJSON(url, "wx:" + city.id);
    const c = d.current;

    return {
      city,
      source: "WeatherAPI",
      temp: Math.round(c.temp_c),
      feels: Math.round(c.feelslike_c),
      humidity: c.humidity,
      wind: c.wind_kph,
      isDay: c.is_day === 1,
      desc: c.condition.text,
      icon: emojiFromWeatherApi(c.condition.code, c.is_day === 1),
      iconUrl: normalizeIcon(c.condition.icon),
      days: (d.forecast?.forecastday || []).map(f => ({
        date: f.date,
        max: Math.round(f.day.maxtemp_c),
        min: Math.round(f.day.mintemp_c),
        desc: f.day.condition.text,
        icon: emojiFromWeatherApi(f.day.condition.code, true),
        iconUrl: normalizeIcon(f.day.condition.icon)
      }))
    };
  }

  async function weatherViaOpenMeteo(city) {
    const url = CONFIG.weather.base +
      `?latitude=${city.lat}&longitude=${city.lon}` +
      "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min" +
      "&timezone=auto&forecast_days=6";

    const d = await getJSON(url, "wx:" + city.id);
    return {
      city,
      source: "Open-Meteo",
      temp: Math.round(d.current.temperature_2m),
      feels: Math.round(d.current.apparent_temperature),
      humidity: d.current.relative_humidity_2m,
      wind: d.current.wind_speed_10m,
      isDay: d.current.is_day === 1,
      desc: weatherDesc(d.current.weather_code),
      icon: weatherIcon(d.current.weather_code, d.current.is_day === 1),
      iconUrl: "",
      days: (d.daily.time || []).map((date, i) => ({
        date,
        max: Math.round(d.daily.temperature_2m_max[i]),
        min: Math.round(d.daily.temperature_2m_min[i]),
        desc: weatherDesc(d.daily.weather_code[i]),
        icon: weatherIcon(d.daily.weather_code[i], true),
        iconUrl: ""
      }))
    };
  }

  function normalizeIcon(url) {
    if (!url) return "";
    return url.startsWith("//") ? "https:" + url : url;
  }

  function emojiFromWeatherApi(code, isDay = true) {
    if (code === 1000) return isDay ? "☀️" : "🌙";
    if (code === 1003) return "⛅";
    if ([1006, 1147].includes(code)) return "☁️";
    if ([1009, 1030, 1135].includes(code)) return "🌫️";
    if ([1063, 1150, 1153, 1180, 1183, 1240].includes(code)) return "🌦️";
    if ([1066, 1210, 1213, 1216, 1219, 1222, 1225, 1255, 1258].includes(code)) return "❄️";
    if ([1069, 1072, 1192, 1195, 1201, 1204, 1207, 1237, 1249, 1252, 1261, 1264].includes(code)) return "🌧️";
    if ([1087, 1273, 1276].includes(code)) return "⛈️";
    return "🌡️";
  }

  function weatherDesc(code) {
    const map = {
      0: "سماء صافية", 1: "صافي غالباً", 2: "غائم جزئياً", 3: "غائم",
      45: "ضباب", 48: "ضباب كثيف",
      51: "رذاذ خفيف", 53: "رذاذ", 55: "رذاذ كثيف",
      61: "مطر خفيف", 63: "مطر", 65: "مطر غزير",
      66: "مطر متجمد", 67: "مطر متجمد",
      71: "ثلج خفيف", 73: "ثلج", 75: "ثلج كثيف", 77: "حبيبات ثلج",
      80: "زخات مطر", 81: "زخات مطر", 82: "زخات غزيرة",
      85: "زخات ثلج", 86: "زخات ثلج",
      95: "عاصفة رعدية", 96: "رعد وبرد", 99: "عاصفة رعدية شديدة"
    };
    return map[code] || "غير معروف";
  }

  function weatherIcon(code, isDay = true) {
    if (code === 0) return isDay ? "☀️" : "🌙";
    if ([1, 2].includes(code)) return isDay ? "🌤️" : "☁️";
    if (code === 3) return "☁️";
    if ([45, 48].includes(code)) return "🌫️";
    if (code >= 51 && code <= 57) return "🌦️";
    if (code >= 61 && code <= 67) return "🌧️";
    if (code >= 71 && code <= 77) return "❄️";
    if (code >= 80 && code <= 86) return "🌧️";
    if (code >= 95) return "⛈️";
    return "🌡️";
  }

  /* ---------- العملات ---------- */
  async function rates(base = CONFIG.currency.main) {
    let main = null, backup = null;

    try {
      main = await getJSON(CONFIG.currency.base + "/" + base, "cur:" + base);
    } catch (e) {
      console.warn("open.er-api فشل:", e.message);
    }

    try {
      const symbols = CONFIG.currency.frankfurterSymbols.join(",");
      backup = await getJSON(CONFIG.currency.frankfurter + "?base=" + base + "&symbols=" + symbols, "cur:frank");
    } catch (e) {
      console.warn("Frankfurter فشل:", e.message);
    }

    if (!main && !backup) throw new Error("كل مصادر العملات فشلت");

    return {
      updated: main?.time_last_update_utc || backup?.date || new Date().toISOString(),
      // Frankfurter بيملي أي عملة ناقصة من المصدر الأساسي
      rates: { ...(backup?.rates || {}), ...(main?.rates || {}) },
      sources: [main && "open.er-api", backup && "Frankfurter"].filter(Boolean)
    };
  }

  /* ---------- أدوات ---------- */
  function clean(t) {
    return String(t || "")
      .replace(/<!\[CDATA\[|\]\]>/g, "")
      .replace(/&#8217;|&rsquo;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();
  }

  function dedupe(list) {
    const seen = new Set();
    return list.filter(item => {
      const key = item.title.slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  const placeholder = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225">
      <rect width="400" height="225" fill="#1b2333"/>
      <text x="200" y="118" fill="#8fa0b8" font-size="26" font-family="sans-serif"
        text-anchor="middle">مصر الآن</text>
    </svg>`
  );

  return { news, allNews, liveScores, leagues, searchTeam, weather, rates, cache, placeholder, weatherDesc };
})();