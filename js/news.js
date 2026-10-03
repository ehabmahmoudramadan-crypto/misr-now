/* =========================================================
   MISR NOW — home page
   Merged live feed + lazy-loaded category sections, search,
   the three live sidebar widgets and the live match board.
   ========================================================= */

(() => {
  const { $, $$, esc, timeAgo, wxIcon, skeleton, emptyState } = UI;

  const state = {
    feed: [],          // merged RSS + GNews headlines
    category: null,    // active GNews section (null = merged feed)
    categoryCache: {}, // section id -> articles
    query: "",
    shown: CONFIG.pageSize
  };

  /* ---------- card markup ----------
     Headlines are Arabic, so every text node carries dir="auto" and
     lets the browser pick the direction from the first strong letter. */
  const cardHtml = (article, index) => `
    <article class="news-card" data-index="${index}">
      <button class="card-media" data-open aria-label="${esc(article.title)}">
        <img src="${esc(article.image)}" alt="" loading="lazy" onerror="this.src='${Api.placeholder}'">
      </button>
      <div class="card-body">
        <div class="meta">
          <span class="tag">${esc(article.source)}</span>
          <span>${timeAgo(article.date)}</span>
        </div>
        <h3><button class="link-btn" data-open dir="auto">${esc(article.title)}</button></h3>
        <p class="clamp-2" dir="auto">${esc(article.summary || "افتح التقرير الأصلي للتفاصيل الكاملة.")}</p>
      </div>
    </article>`;

  /* ---------- current article list ---------- */
  function articles() {
    let list = state.category ? (state.categoryCache[state.category] || []) : state.feed;

    if (state.query) {
      const q = foldArabic(state.query);
      list = list.filter(a => foldArabic(a.title).includes(q));
    }
    return list;
  }

  /* Arabic is typed without diacritics and with several letter
     variants, so the search box folds both sides before comparing. */
  function foldArabic(text) {
    return String(text)
      .toLowerCase()
      .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      .replace(/ة/g, "ه");
  }

  function render() {
    const list = articles();
    const hero = $("#hero");
    const grid = $("#news-grid");

    if (!list.length) {
      hero.innerHTML = emptyState("No headlines found", state.query ? `Nothing matches “${state.query}”` : "Try another section");
      grid.innerHTML = "";
      $("#load-more").style.display = "none";
      return;
    }

    const [top, ...rest] = list;
    hero.innerHTML = `
      <article class="hero-inner" data-index="0">
        <button class="hero-media" data-open aria-label="${esc(top.title)}">
          <img src="${esc(top.image)}" alt="" onerror="this.src='${Api.placeholder}'">
        </button>
        <div class="hero-body">
          <div class="meta">
            <span class="tag tag-lg">${esc(top.source)}</span>
            <span>${timeAgo(top.date)}</span>
          </div>
          <h2><button class="link-btn" data-open dir="auto">${esc(top.title)}</button></h2>
          <p dir="auto">${esc(top.summary || "")}</p>
          <button class="btn btn-sm" data-open>Read the full story ↗</button>
        </div>
      </article>`;

    grid.innerHTML = rest.slice(0, state.shown).map((a, i) => cardHtml(a, i + 1)).join("");
    $("#load-more").style.display = rest.length > state.shown ? "inline-block" : "none";
  }

  /* ---------- category rail (lazy GNews sections) ---------- */
  function buildRail() {
    const rail = $("#category-rail");
    rail.innerHTML = [
      `<button class="chip active" data-cat="">All Sources</button>`,
      ...CONFIG.categories.map(c =>
        `<button class="chip" data-cat="${c.id}">${c.icon} ${esc(c.name)}</button>`)
    ].join("");

    rail.addEventListener("click", async e => {
      const chip = e.target.closest(".chip");
      if (!chip) return;

      $$("#category-rail .chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");

      const cat = chip.dataset.cat;
      state.category = cat || null;
      state.shown = CONFIG.pageSize;
      render();

      if (!cat) { $("#category-note").hidden = true; return; }

      const note = $("#category-note");
      if (!state.categoryCache[cat]) {
        note.hidden = false;
        note.textContent = `Loading ${chip.textContent.trim()}…`;
        try {
          state.categoryCache[cat] = await Api.gnews(cat);
        } catch (err) {
          note.textContent = "This section is unavailable right now.";
          return;
        }
      }
      note.hidden = true;
      render();
    });
  }

  /* ---------- live match board (sidebar) ----------
     ESPN returns the next fixtures for a league, so the board ranks
     whatever is playing first, then the soonest kick-offs — and it
     polls every CONFIG.sports.refreshSec seconds while the tab is open. */
  function kickoffLabel(date) {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-GB", {
      weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
    });
  }

  function scoreRow(m) {
    const status = m.live
      ? `LIVE · ${m.detail || "Playing"}`
      : m.finished ? "FT" : kickoffLabel(m.date);
    const value = m.live || m.finished ? `${m.homeScore} - ${m.awayScore}` : "vs";

    return `<div class="score-row ${m.live ? "is-live" : ""}">
      <span class="score-meta">
        <span class="league">${esc(m.league)}</span>
        <span class="status">${esc(status)}</span>
      </span>
      <span class="score-body">
        <span class="score-teams">
          <span>${esc(m.home)}</span>
          <span>${esc(m.away)}</span>
        </span>
        <span class="score-value">${esc(value)}</span>
      </span>
    </div>`;
  }

  async function loadScores(force = false) {
    try {
      const matches = await Api.liveMatches(force);
      const live = matches.filter(m => m.live).length;

      $("#side-scores").innerHTML = matches.length
        ? matches.map(scoreRow).join("")
        : emptyState("No matches right now", "Fixtures appear here as soon as they are scheduled.");

      const stamp = $("#scores-stamp");
      if (stamp) stamp.textContent = live ? `${live} playing now` : "next kick-offs";
    } catch {
      $("#side-scores").innerHTML = emptyState("Match board unavailable", "ESPN did not respond.");
    }
  }

  /* ---------- live widgets ---------- */
  async function loadWidgets() {
    loadScores();
    loadCurrency();
    loadWeather();
  }

  async function loadWeather() {
    try {
      const wx = await Api.weather("cairo");
      $("#strip-weather").innerHTML = `
        <div class="wx-row">
          ${wxIcon(wx, 52)}
          <div>
            <div class="wx-temp">${wx.temp}°</div>
            <div class="wx-desc">${esc(wx.desc)}</div>
            <div class="wx-sub">H ${wx.days[0].max}° · L ${wx.days[0].min}° · ${wx.humidity}% RH</div>
          </div>
        </div>`;

      $("#side-weather").innerHTML = `
        <div class="wx-row">
          ${wxIcon(wx, 56)}
          <div>
            <div class="wx-temp">${wx.temp}°</div>
            <div class="wx-desc">${esc(wx.city.name)}</div>
            <div class="wx-sub">Feels ${wx.feels}° · Wind ${wx.wind} km/h</div>
          </div>
        </div>
        <div class="wx-days">
          ${wx.days.slice(1, 4).map(d => `
            <div class="wx-mini-day">
              <span>${new Date(d.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short" })}</span>
              ${wxIcon(d, 28)}
              <b>${d.max}°</b><em>${d.min}°</em>
            </div>`).join("")}
        </div>
        <a class="btn btn-ghost btn-sm" href="weather.html">Open weather page →</a>`;
    } catch {
      $("#strip-weather").innerHTML = emptyState("Weather unavailable");
      $("#side-weather").innerHTML = emptyState("Weather unavailable");
    }
  }

  async function loadCurrency() {
    try {
      const data = await Api.rates();
      $("#strip-currency").innerHTML = `
        <div class="fx-main">
          <b>${UI.num(data.rates.EGP, 3)}</b>
          <span>EGP per USD</span>
        </div>
        <div class="fx-grid">
          ${["EUR", "GBP", "SAR"].map(code => {
            const cur = CONFIG.currency.list.find(c => c.code === code);
            return `<div>${cur.flag} ${code}<b>${UI.num(data.rates[code], 3)}</b></div>`;
          }).join("")}
        </div>`;
    } catch {
      $("#strip-currency").innerHTML = emptyState("Rates unavailable");
    }
  }

  /* ---------- search + load more ---------- */
  function initSearch() {
    $("#search-form").addEventListener("submit", e => {
      e.preventDefault();
      state.query = $("#search-input").value.trim();
      state.shown = CONFIG.pageSize;
      render();
      UI.toast(state.query ? `Searching for “${state.query}”` : "Search cleared");
    });

    $("#load-more").addEventListener("click", () => {
      state.shown += CONFIG.pageSize;
      render();
    });

    /* every [data-open] button opens the article page for its card */
    document.addEventListener("click", e => {
      const trigger = e.target.closest("[data-open]");
      if (!trigger) return;
      const box = trigger.closest("[data-index]");
      if (!box) return;
      const article = articles()[Number(box.dataset.index)];
      if (article) UI.openArticle(article);
    });
  }

  /* ---------- boot ---------- */
  async function loadNews() {
    $("#news-grid").innerHTML = skeleton(3);
    try {
      state.feed = await Api.allNews();
      render();
    } catch (err) {
      $("#news-grid").innerHTML = emptyState("Could not load headlines", err.message);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    buildRail();
    initSearch();
    loadNews();
    loadWidgets();

    /* keep the match board fresh while the tab stays open */
    setInterval(() => loadScores(true), CONFIG.sports.refreshSec * 1000);
  });
})();
