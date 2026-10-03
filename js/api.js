/* =========================================================
   MISR NOW â€” API layer
   - localStorage cache (fewer requests, faster repeat visits)
   - every provider response normalised to one shape
   - fallback source whenever the primary one fails
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

  /* Several widgets ask for the same feed at the same time (ticker +
     grid + related stories). GNews answers with 429 when that happens,
     so identical in-flight requests share a single network call. */
  const inflight = new Map();

  /* A slow provider must never hold a widget hostage: every request
     carries its own budget. AbortSignal.timeout is widely available,
     but the manual fallback keeps older browsers working. */
  function timeoutSignal(ms) {
    if (typeof AbortSignal === "undefined" || !ms) return undefined;
    if (AbortSignal.timeout) return AbortSignal.timeout(ms);
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), ms);
    return ctrl.signal;
  }

  async function getJSON(url, cacheKey, { force = false, timeout = 12000 } = {}) {
    if (!force && cacheKey) {
      const hit = cache.get(cacheKey);
      if (hit) return hit;
      if (inflight.has(cacheKey)) return inflight.get(cacheKey);
    }

    const task = (async () => {
      let res = await fetch(url, { signal: timeoutSignal(timeout) });
      if (res.status === 429) {
        /* Free endpoints answer 429 when two calls land too close
           together — one delayed retry is enough to get through. */
        await new Promise(r => setTimeout(r, 900));
        res = await fetch(url, { signal: timeoutSignal(timeout) });
      }
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (cacheKey) cache.set(cacheKey, data);
      return data;
    })();

    if (cacheKey) {
      inflight.set(cacheKey, task);
      task.catch(() => {}).finally(() => inflight.delete(cacheKey));
    }

    return task;
  }

  /* Same contract as getJSON but for XML bodies. Used for the feeds that
     send Access-Control-Allow-Origin, so they need no proxy and no quota. */
  async function getXML(url, cacheKey, { force = false, timeout = 12000 } = {}) {
    if (!force && cacheKey) {
      const hit = cache.get(cacheKey);
      if (hit) return hit;
      if (inflight.has(cacheKey)) return inflight.get(cacheKey);
    }

    const task = (async () => {
      const res = await fetch(url, { signal: timeoutSignal(timeout) });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();
      if (cacheKey) cache.set(cacheKey, text);
      return text;
    })();

    if (cacheKey) {
      inflight.set(cacheKey, task);
      task.catch(() => {}).finally(() => inflight.delete(cacheKey));
    }

    return task;
  }

  /* =========================================================
     NEWS
     ========================================================= */
  const rss2json = "https://api.rss2json.com/v1/api.json?rss_url=";

  async function rssFeed(feed) {
    /* Feeds flagged direct send CORS headers, so the browser reads the XML
       itself â€” no proxy, no rss2json quota. The rest go through rss2json,
       which throttles bursts with a 429, so one delayed retry is enough. */
    if (feed.direct) {
      const xml = await getXML(feed.url, "news:" + feed.id);
      return parseFeedXml(xml, feed);
    }

    const url = rss2json + encodeURIComponent(feed.url);

    let data;
    try {
      data = await getJSON(url, "news:" + feed.id);
    } catch (err) {
      if (!/429/.test(err.message)) throw err;
      await new Promise(r => setTimeout(r, CONFIG.rssRetryMs));
      data = await getJSON(url, "news:" + feed.id);
    }

    return (data.items || []).map(item => ({
      title: clean(item.title),
      link: item.link,
      date: item.pubDate,
      image: item.thumbnail || item.enclosure?.link || item.image?.url || firstImage(item.description) || placeholder,
      summary: stripHtml(item.description || item.content || "").slice(0, 260),
      source: feed.short,
      sourceName: feed.name,
      feedId: feed.id,
      category: ""
    }));
  }

  /* Reads both RSS 2.0 (<pubDate>, <description>) and RSS 1.0 / RDF
     (<dc:date>) shapes, which is what DW and Al Masry Al-Youm send. */
  function parseFeedXml(xml, feed) {
    const doc = new DOMParser().parseFromString(xml, "text/xml");

    return [...doc.querySelectorAll("item")].map(node => {
      const text = tag => node.getElementsByTagName(tag)[0]?.textContent?.trim() || "";
      const body = text("description") || text("content:encoded");

      const media =
        node.getElementsByTagName("media:content")[0]?.getAttribute("url") ||
        node.getElementsByTagName("media:thumbnail")[0]?.getAttribute("url") ||
        node.getElementsByTagName("enclosure")[0]?.getAttribute("url") ||
        firstImage(body);

      return {
        title: clean(text("title")),
        link: text("link") || node.getAttribute("rdf:about") || "",
        date: text("pubDate") || text("dc:date") || "",
        image: media || placeholder,
        summary: stripHtml(body).slice(0, 260),
        source: feed.short,
        sourceName: feed.name,
        feedId: feed.id,
        category: ""
      };
    });
  }

  /* rss2json gives no thumbnail for most items, but the description
     usually embeds the article image. */
  function firstImage(html) {
    const src = String(html || "").match(/<img[^>]+src=["']([^"']+)["']/i);
    return src ? src[1] : "";
  }

  async function gnews(section = "top") {
    const cat = CONFIG.categories.find(c => c.id === section);

    /* Some topics answer with nothing in Arabic, so each section may also
       declare a search phrase that reliably returns results. */
    const endpoint = cat?.query ? "search" : "top-headlines";

    const params = new URLSearchParams({
      lang: CONFIG.gnewsLang,
      country: CONFIG.gnewsCountry,
      apikey: CONFIG.gnewsKey
    });
    if (cat?.query) params.set("q", cat.query);
    else if (cat?.topic) params.set("topic", cat.topic);

    const direct = `https://gnews.io/api/v4/${endpoint}?${params}`;

    /* gnews.io answers without an Access-Control-Allow-Origin header,
       so a browser cannot call it straight from the page. The request
       therefore goes through a public read-only proxy; if that fails we
       still try the direct address in case the provider ever adds CORS. */
    const url = CONFIG.gnewsProxy + encodeURIComponent(direct);

    /* The free tier also answers 429 when two calls land too close
       together, so a single delayed retry is enough to recover. */
    let data;
    try {
      data = await getJSON(url, "gnews:" + section);
    } catch (err) {
      if (/429/.test(err.message)) {
        await new Promise(r => setTimeout(r, CONFIG.gnewsRetryMs));
        data = await getJSON(url, "gnews:" + section);
      } else {
        data = await getJSON(direct, "gnews:" + section);
      }
    }

    return (data.articles || []).map(a => ({
      title: clean(a.title),
      link: a.url,
      date: a.publishedAt,
      image: a.image || placeholder,
      summary: stripHtml(a.description || "").slice(0, 240),
      source: "GNews",
      sourceName: a.source?.name || "GNews",
      feedId: "gnews",
      category: section
    }));
  }

  /* Merged live feed: GNews headlines + every open RSS source */
  async function allNews(force = false) {
    const tasks = CONFIG.rssFeeds.map(f => ({ name: f.name, run: () => rssFeed(f) }));
    tasks.push({ name: "GNews", run: () => gnews("top") });

    const results = await Promise.allSettled(tasks.map(t => t.run()));
    const merged = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled") merged.push(...r.value);
      else console.warn("feed failed:", tasks[i].name, r.reason?.message);
    });

    if (!merged.length) throw new Error("No news source is reachable right now");
    return sortNews(merged);
  }

  function sortNews(list) {
    return dedupe(list).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /* =========================================================
     FOOTBALL
     The sidebar only needs "what is playing right now", so we read
     ESPN's public scoreboards (free, CORS enabled) for the leagues
     in CONFIG.sports and rank live matches by league importance.
     ========================================================= */
  async function liveMatches(force = false) {
    const boards = await Promise.allSettled(
      CONFIG.sports.leagues.map(l =>
        getJSON(`${CONFIG.sports.base}/${l.code}/scoreboard`, "mt:" + l.code, { force, timeout: 8000 })
      )
    );

    /* one list per league, ordered by league importance */
    const perLeague = CONFIG.sports.leagues.map((league, rank) => {
      const res = boards[rank];
      if (res.status !== "fulfilled" || !res.value) return { league, rank, rows: [] };

      const rows = (res.value.events || []).map(ev => {
        const comp = ev.competitions && ev.competitions[0];
        if (!comp) return null;
        const home = comp.competitors.find(c => c.homeAway === "home");
        const away = comp.competitors.find(c => c.homeAway === "away");
        if (!home || !away) return null;
        return {
          id: ev.id,
          league: league.name,
          rank,
          home: home.team.displayName,
          away: away.team.displayName,
          homeScore: Number(home.score ?? 0),
          awayScore: Number(away.score ?? 0),
          live: ev.status.type.state === "in",
          finished: ev.status.type.state === "post",
          detail: ev.status.type.detail || ev.status.type.description || "",
          date: ev.date
        };
      }).filter(Boolean)
        .sort((a, b) => {
          /* inside a league: playing first, finished last, soonest first */
          const phase = r => (r.live ? 0 : r.finished ? 2 : 1);
          return phase(a) - phase(b) || new Date(a.date) - new Date(b.date);
        });

      return { league, rank, rows };
    });

    /* What is playing right now always comes first — most important
       league first. Then the next kick-offs are interleaved across the
       leagues so one busy league cannot fill the whole board. */
    const picked = [];

    perLeague.forEach(group => {
      const live = group.rows.filter(r => r.live);
      picked.push(...live);
    });
    const liveTaken = picked.length;
    if (liveTaken >= CONFIG.sports.limit) return picked.slice(0, CONFIG.sports.limit);

    const queues = perLeague
      .map(g => g.rows.filter(r => !r.live))
      .filter(q => q.length);

    while (picked.length < CONFIG.sports.limit && queues.some(q => q.length)) {
      for (const q of queues) {
        if (picked.length >= CONFIG.sports.limit) break;
        const next = q.shift();
        if (next) picked.push(next);
      }
    }

    return picked;
  }

  /* =========================================================
     WEATHER
     ========================================================= */
  /* WeatherAPI leads: it carries the richer current conditions the
     page shows (UV, visibility, last update). Open-Meteo catches any
     failure and still delivers the full six-day forecast. */
  async function weather(cityId) {
    const city = CONFIG.weather.cities.find(c => c.id === cityId) || CONFIG.weather.cities[0];
    if (CONFIG.weatherApiKey) {
      try {
        return await weatherViaWeatherApi(city);
      } catch (e) {
        console.warn("WeatherAPI failed, falling back to Open-Meteo:", e.message);
        cache.drop("wx:" + city.id);
      }
    }
    return await weatherViaOpenMeteo(city);
  }

  async function weatherViaWeatherApi(city) {
    const url = `${CONFIG.weatherApi.base}/forecast.json?key=${CONFIG.weatherApiKey}` +
      `&q=${city.lat},${city.lon}&days=6&aqi=no&alerts=no&lang=en`;

    const d = await getJSON(url, "wx:" + city.id);
    const c = d.current;
    const today = d.forecast?.forecastday?.[0] || {};

  /* WeatherAPI nests the hourly list and the astro times inside
     each forecast day, so we flatten every day into one list of
     hours and keep the next twelve from now. */
  const flatHours = d.forecast?.forecastday
    ?.flatMap(f => f.hour || [])
    .map(h => ({
      time: h.time,
      epoch: h.time_epoch,
      temp: Math.round(h.temp_c),
      desc: h.condition.text,
      icon: emojiFromWeatherApi(h.condition.code, h.is_day === 1),
      iconUrl: normalizeIcon(h.condition.icon)
    })) || [];

  const now = Date.now();
  const start = flatHours.findIndex(h => (h.epoch ? h.epoch * 1000 : new Date(h.time.replace(" ", "T")).getTime()) >= now);
  const hours = flatHours.slice(start === -1 ? 0 : start, (start === -1 ? 0 : start) + 12);

  const astro = d.forecast?.astro?.astroday?.[0] || d.forecast?.forecastday?.[0]?.astro || {};

    return {
      city,
      source: "WeatherAPI",
      temp: Math.round(c.temp_c),
      feels: Math.round(c.feelslike_c),
      humidity: c.humidity,
      wind: c.wind_kph,
      pressure: c.pressure_mb,
      uv: c.uv ?? null,
      visibility: c.vis_km,
      isDay: c.is_day === 1,
      desc: c.condition.text,
      icon: emojiFromWeatherApi(c.condition.code, c.is_day === 1),
      iconUrl: normalizeIcon(c.condition.icon),
      lastUpdate: c.last_updated,
      sunrise: astro.sunrise,
      sunset: astro.sunset,
      hours,
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
      "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,pressure_msl,is_day" +
      "&hourly=temperature_2m,weather_code,visibility" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max" +
      "&timezone=auto&forecast_days=6";

    const d = await getJSON(url, "wx:" + city.id);
    const window = next12Window(d.hourly?.time || []);
    return {
      city,
      source: "Open-Meteo",
      temp: Math.round(d.current.temperature_2m),
      feels: Math.round(d.current.apparent_temperature),
      humidity: d.current.relative_humidity_2m,
      wind: d.current.wind_speed_10m,
      pressure: Math.round(d.current.pressure_msl),
      uv: d.daily?.uv_index_max?.[0] != null ? Math.round(d.daily.uv_index_max[0]) : null,
      visibility: d.hourly?.visibility?.[window[0]] != null ? Math.round(d.hourly.visibility[window[0]] / 1000) : null,
      isDay: d.current.is_day === 1,
      desc: weatherDesc(d.current.weather_code),
      icon: weatherIcon(d.current.weather_code, d.current.is_day === 1),
      iconUrl: "",
      lastUpdate: null,
      sunrise: d.daily?.sunrise?.[0],
      sunset: d.daily?.sunset?.[0],
      hours: (d.hourly?.time || []).slice(...window).map((t, i) => ({
        time: t,
        temp: Math.round(d.hourly.temperature_2m[i]),
        icon: weatherIcon(d.hourly.weather_code[i], true),
        iconUrl: "",
        desc: weatherDesc(d.hourly.weather_code[i])
      })),
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

  /* Providers send a full day of hours starting at midnight.
     We only want the next 12 hours, so the window starts at
     the first timestamp that is still in the future. */
  function next12Window(times) {
    if (!times.length) return [0, 0];
    const now = Date.now();
    const start = times.findIndex(t => new Date(t.replace(" ", "T")).getTime() >= now);
    return [start === -1 ? 0 : start, start === -1 ? 0 : start + 12];
  } function emojiFromWeatherApi(code, isDay = true) {
    if (code === 1000) return isDay ? "â˜€ï¸" : "ðŸŒ™";
    if (code === 1003) return "â›…";
    if ([1006, 1009].includes(code)) return "â˜ï¸";
    if ([1030, 1114, 1117, 1118, 1135, 1147].includes(code)) return "ðŸŒ«ï¸";
    if ([1063, 1150, 1153, 1180, 1183, 1240, 1243].includes(code)) return "ðŸŒ¦ï¸";
    if ([1066, 1210, 1213, 1216, 1219, 1222, 1225, 1255, 1258].includes(code)) return "â„ï¸";
    if ([1069, 1072, 1192, 1195, 1201, 1204, 1207, 1237, 1249, 1252, 1261, 1264].includes(code)) return "ðŸŒ§ï¸";
    if ([1087, 1246, 1273, 1276, 1279].includes(code)) return "â›ˆï¸";
    return "ðŸŒ¡ï¸";
  }

  /* WMO code table â€” only used by the Open-Meteo fallback */
  function weatherDesc(code) {
    const map = {
      0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
      45: "Fog", 48: "Freezing fog",
      51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
      61: "Light rain", 63: "Rain", 65: "Heavy rain",
      66: "Freezing rain", 67: "Heavy freezing rain",
      71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
      80: "Light showers", 81: "Showers", 82: "Violent showers",
      85: "Snow showers", 86: "Heavy snow showers",
      95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Severe thunderstorm"
    };
    return map[code] || "Unknown";
  }

  function weatherIcon(code, isDay = true) {
    if (code === 0) return isDay ? "â˜€ï¸" : "ðŸŒ™";
    if ([1, 2].includes(code)) return isDay ? "ðŸŒ¤ï¸" : "â˜ï¸";
    if (code === 3) return "â˜ï¸";
    if ([45, 48].includes(code)) return "ðŸŒ«ï¸";
    if (code >= 51 && code <= 57) return "ðŸŒ¦ï¸";
    if (code >= 61 && code <= 67) return "ðŸŒ§ï¸";
    if (code >= 71 && code <= 77) return "â„ï¸";
    if (code >= 80 && code <= 86) return "ðŸŒ§ï¸";
    if (code >= 95) return "â›ˆï¸";
    return "ðŸŒ¡ï¸";
  }

  /* =========================================================
     CURRENCY
     ========================================================= */
  async function rates(base = CONFIG.currency.main) {
    let main = null, backup = null;

    try {
      main = await getJSON(CONFIG.currency.base + "/" + base, "cur:" + base);
    } catch (e) {
      console.warn("open.er-api failed:", e.message);
    }

    try {
      const symbols = CONFIG.currency.frankfurterSymbols.join(",");
      backup = await getJSON(CONFIG.currency.frankfurter + "?base=" + base + "&symbols=" + symbols, "cur:frank");
    } catch (e) {
      console.warn("Frankfurter failed:", e.message);
    }

    if (!main && !backup) throw new Error("Every currency provider failed");

    return {
      updated: main?.time_last_update_utc || backup?.date || new Date().toISOString(),
      // Frankfurter fills any pair missing from the primary source
      rates: { ...(backup?.rates || {}), ...(main?.rates || {}) },
      sources: [main && "open.er-api", backup && "Frankfurter"].filter(Boolean)
    };
  }

  /* =========================================================
     SHARED HELPERS
     ========================================================= */
  function clean(t) {
    return String(t || "")
      .replace(/<!\[CDATA\[|\]\]>/g, "")
      .replace(/&#8217;|&rsquo;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#\d+;/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function stripHtml(html) {
    return String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
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

  /* Used whenever a publisher sends no image. A branded gradient reads
     better in a grid than a broken-image box. */
  const placeholder = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#d62828"/>
          <stop offset="1" stop-color="#f77f00"/>
        </linearGradient>
      </defs>
      <rect width="400" height="225" fill="url(#g)"/>
      <g fill="none" stroke="rgba(255,255,255,.28)" stroke-width="6">
        <circle cx="200" cy="112" r="46"/>
        <path d="M176 130V96l24-18 24 18v34"/>
      </g>
      <text x="200" y="196" fill="rgba(255,255,255,.9)" font-size="19"
        font-family="sans-serif" font-weight="700" letter-spacing="3"
        text-anchor="middle">MISR NOW</text>
    </svg>`
  );

  return {
    allNews, rssFeed, gnews, liveMatches, weather, rates, cache, placeholder, stripHtml
  };
})();
