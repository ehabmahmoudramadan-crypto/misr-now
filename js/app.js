/* =========================================================
   مصر الآن — منطق العرض والتفاعل
   ========================================================= */

(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  const state = {
    news: [],
    shown: 8,
    filter: "all",
    query: "",
    city: "cairo",
    cur: null,
    scores: []
  };

  /* ---------- أدوات ---------- */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function timeAgo(dateStr) {
    const then = new Date(dateStr).getTime();
    if (Number.isNaN(then)) return "";
    const mins = Math.floor((Date.now() - then) / 60000);
    if (mins < 1) return "الآن";
    if (mins < 60) return `منذ ${mins} دقيقة`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `منذ ${hrs} ساعة`;
    const days = Math.floor(hrs / 24);
    return days === 1 ? "أمس" : `منذ ${days} يوم`;
  }

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove("show"), 4000);
  }

  /* ---------- الساعة والتاريخ ---------- */
  function startClock() {
    const clock = $("#live-clock");
    const dateEl = $("#live-date");
    const tick = () => {
      const now = new Date();
      clock.textContent = now.toLocaleTimeString("ar-EG", { hour12: true });
      dateEl.textContent = now.toLocaleDateString("ar-EG", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
      });
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- الوضع الليلي ---------- */
  function initTheme() {
    const btn = $("#theme-toggle");
    const saved = localStorage.getItem("mn-theme");
    if (saved === "dark") { document.body.classList.add("dark"); btn.textContent = "☀️"; }

    btn.addEventListener("click", () => {
      const dark = document.body.classList.toggle("dark");
      btn.textContent = dark ? "☀️" : "🌙";
      localStorage.setItem("mn-theme", dark ? "dark" : "light");
    });
  }

  /* ---------- الموبايل ---------- */
  function initMenu() {
    $("#menu-btn").addEventListener("click", () => $("#main-nav").classList.toggle("open"));
    $$(".nav-link").forEach(a => a.addEventListener("click", () => $("#main-nav").classList.remove("open")));
  }

  /* ---------- شريط عاجل + الأخبار ---------- */
  function renderTicker(items) {
    $("#ticker-track").innerHTML = items.slice(0, 12).map(n =>
      `<a class="ticker-item" href="${esc(n.link)}" target="_blank" rel="noopener">${esc(n.title)}</a>`
    ).join("");
  }

  function buildFilters() {
    const box = $("#news-filters");
    const feeds = [{ id: "all", short: "الكل" }, ...CONFIG.newsFeeds.map(f => ({ id: f.id, short: f.short }))];
    box.innerHTML = feeds.map(f =>
      `<button class="chip ${f.id === "all" ? "active" : ""}" data-feed="${f.id}">${f.short}</button>`
    ).join("");

    box.addEventListener("click", e => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      $$("#news-filters .chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      state.filter = chip.dataset.feed;
      state.shown = 8;
      renderNews();
    });
  }

  function filteredNews() {
    return state.news.filter(n => {
      const okFeed = state.filter === "all" || n.feedId === state.filter;
      const okQuery = !state.query || n.title.includes(state.query);
      return okFeed && okQuery;
    });
  }

  function renderNews() {
    const list = filteredNews();
    const hero = $("#news-hero");
    const rest = $("#news-list");

    if (!list.length) {
      hero.innerHTML = `<div class="empty">لا توجد نتائج مطابقة 🔍</div>`;
      rest.innerHTML = "";
      $("#load-more").style.display = "none";
      return;
    }

    const [top, ...others] = list;
    hero.innerHTML = `
      <a class="thumb" href="${esc(top.link)}" target="_blank" rel="noopener">
        <img src="${esc(top.image)}" alt="${esc(top.title)}" loading="lazy"
             onerror="this.src='${Api.placeholder}'">
      </a>
      <div class="body">
        <div class="meta">
          <span class="tag-src">${esc(top.source)}</span>
          <span>${timeAgo(top.date)}</span>
        </div>
        <h3>${esc(top.title)}</h3>
        <p class="muted">الأخبار أولاً بأول على مدار الساعة — تابع التغطية الكاملة من المصدر الأصلي.</p>
      </div>`;

    rest.innerHTML = others.slice(0, state.shown).map(n => `
      <a class="news-item" href="${esc(n.link)}" target="_blank" rel="noopener">
        <span class="thumb"><img src="${esc(n.image)}" alt="" loading="lazy"
             onerror="this.src='${Api.placeholder}'"></span>
        <span class="body">
          <span class="meta">
            <span class="tag-src">${esc(n.source)}</span>
            <span>${timeAgo(n.date)}</span>
          </span>
          <h4>${esc(n.title)}</h4>
        </span>
      </a>`).join("");

    const btn = $("#load-more");
    btn.style.display = others.length > state.shown ? "inline-block" : "none";
  }

  async function loadNews() {
    try {
      state.news = await Api.allNews();
      renderTicker(state.news);
      renderNews();
    } catch (err) {
      $("#news-hero").innerHTML = `<div class="empty">تعذّر تحميل الأخبار — ${esc(err.message)}</div>`;
      toast("مشكلة في تحميل الأخبار، جرب تعمل تحديث للصفحة");
    }
  }

  function initSearch() {
    $("#search-form").addEventListener("submit", e => {
      e.preventDefault();
      state.query = $("#search-input").value.trim();
      state.shown = 12;
      renderNews();
      $("#news").scrollIntoView({ behavior: "smooth" });
      if (state.query) toast(`نتائج البحث عن: ${state.query}`);
    });
  }

  /* ---------- الطقس ---------- */
  function wxIconHtml(wx, size = 48) {
    return wx.iconUrl
      ? `<img src="${esc(wx.iconUrl)}" alt="${esc(wx.desc)}" width="${size}" style="width:${size}px">`
      : `<span style="font-size:${size * 0.85}px;line-height:1">${wx.icon}</span>`;
  }

  function renderWeatherMini(wx) {
    $("#wc-city-name").textContent = wx.city.name;
    $("#wc-body").innerHTML = `
      <div class="wc-mini">
        ${wxIconHtml(wx, 56)}
        <div>
          <div class="temp">${wx.temp}°</div>
          <div class="desc">${esc(wx.desc)}</div>
          <div class="sub">الأعلى ${wx.days[0].max}° · الأدنى ${wx.days[0].min}° · رطوبة ${wx.humidity}%</div>
        </div>
      </div>`;
  }

  function renderWeatherFull(wx) {
    $("#wx-now").innerHTML = `
      ${wxIconHtml(wx, 96)}
      <div>
        <div class="wx-desc">${esc(wx.city.name)} — ${esc(wx.desc)}</div>
        <div class="big-temp">${wx.temp}°</div>
        <div class="wx-stats">
          <div>الإحساس<b>${wx.feels}°</b></div>
          <div>الرطوبة<b>${wx.humidity}%</b></div>
          <div>الرياح<b>${wx.wind} كم/س</b></div>
          <div>أعلى / أدنى<b>${wx.days[0].max}° / ${wx.days[0].min}°</b></div>
          <div>المصدر<b>${esc(wx.source)}</b></div>
        </div>
      </div>`;

    $("#wx-forecast").innerHTML = wx.days.slice(1).map(d => `
      <div class="wx-day">
        <div class="d">${new Date(d.date).toLocaleDateString("ar-EG", { weekday: "long" })}</div>
        <div class="ic">${wxIconHtml(d, 44)}</div>
        <div class="d" style="font-size:.78rem;color:var(--muted)">${esc(d.desc)}</div>
        <div class="t"><b>${d.max}°</b> / <span>${d.min}°</span></div>
      </div>`).join("");
  }

  function buildCityPickers() {
    const options = CONFIG.weather.cities.map(c =>
      `<option value="${c.id}">${c.name}</option>`).join("");
    $("#wc-city").innerHTML = options;
    $("#wc-city-chips").innerHTML = CONFIG.weather.cities.map(c =>
      `<button class="chip ${c.id === "cairo" ? "active" : ""}" data-city="${c.id}">${c.name}</button>`).join("");

    $("#wc-city").addEventListener("change", e => setCity(e.target.value));
    $("#wc-city-chips").addEventListener("click", e => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      $$("#wc-city-chips .chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      $("#wc-city").value = chip.dataset.city;
      setCity(chip.dataset.city);
    });
  }

  async function setCity(id) {
    state.city = id;
    try {
      const wx = await Api.weather(id);
      renderWeatherMini(wx);
      renderWeatherFull(wx);
    } catch {
      $("#wc-body").innerHTML = `<div class="empty">تعذّر تحميل الطقس</div>`;
    }
  }

  /* ---------- العملات ---------- */
  function renderCurrencyMini(data) {
    const egp = data.rates.EGP;
    const brief = ["EUR", "GBP", "SAR"].map(code => {
      const cur = CONFIG.currency.list.find(c => c.code === code);
      return `<div>${cur.flag} ${code}<b>${data.rates[code].toFixed(3)}</b></div>`;
    }).join("");

    $("#cur-stamp").textContent = new Date(data.updated).toLocaleString("ar-EG");
    $("#cur-body").innerHTML = `
      <div class="cur-main">
        <b>${egp.toFixed(3)}</b><span>جنيه مصري لكل دولار واحد</span>
      </div>
      <div class="cur-grid">${brief}</div>`;
  }

  function renderCurrencyTable(data) {
    const rows = CONFIG.currency.list
      .filter(c => data.rates[c.code])
      .map(c => {
        const inUsd = 1 / data.rates[c.code];
        return `<tr>
          <td>${c.flag} ${c.name}</td>
          <td><b>${c.code}</b></td>
          <td>${inUsd.toFixed(4)}</td>
          <td><span class="rate-up">${data.rates[c.code].toFixed(4)}</span> ج.م</td>
        </tr>`;
      }).join("");

    $("#rates-body").innerHTML = rows;
    $("#cur-table-stamp").textContent =
      "آخر تحديث: " + new Date(data.updated).toLocaleString("ar-EG") +
      " • المصدر: " + data.sources.join(" + ");
  }

  function buildCurrencySelects() {
    const opts = CONFIG.currency.list.map(c =>
      `<option value="${c.code}">${c.flag} ${c.code} — ${c.name}</option>`).join("");
    $("#conv-from").innerHTML = opts;
    $("#conv-to").innerHTML = opts;
    $("#conv-from").value = "USD";
    $("#conv-to").value = "EGP";
  }

  function convert() {
    if (!state.cur) return;
    const amount = parseFloat($("#conv-amount").value) || 0;
    const from = $("#conv-from").value;
    const to = $("#conv-to").value;

    // كل الأسعار متاحة مقابل الدولار، فالتحويل يمر من USD دائماً
    const inUsd = from === "USD" ? amount : amount / state.cur.rates[from];
    const out = to === "USD" ? inUsd : inUsd * state.cur.rates[to];

    $("#conv-out").textContent = `${out.toLocaleString("ar-EG", { maximumFractionDigits: 2 })} ${to}`;
  }

  async function loadCurrency() {
    try {
      const data = await Api.rates();
      state.cur = data;
      renderCurrencyMini(data);
      renderCurrencyTable(data);
      convert();
    } catch {
      $("#cur-body").innerHTML = `<div class="empty">تعذّر تحميل أسعار العملات</div>`;
    }
  }

  function initConverter() {
    ["#conv-amount", "#conv-from", "#conv-to"].forEach(sel =>
      $(sel).addEventListener("input", convert));
  }

  /* ---------- الرياضة ---------- */
  function renderMiniScores(matches) {
    const box = $("#scores-body");
    if (!matches.length) { box.innerHTML = `<div class="empty">لا توجد مباريات مباشرة الآن ⚽</div>`; return; }

    box.innerHTML = matches.slice(0, 4).map(m => `
      <div class="mini-score ${m.status === "live" ? "live" : ""}">
        <span class="teams">
          <span>${esc(m.home)}</span><span>${esc(m.away)}</span>
        </span>
        <span class="sc">${esc(m.score)}</span>
      </div>`).join("");
  }

  function renderMatches(matches) {
    const grid = $("#matches-grid");
    if (!matches.length) { grid.innerHTML = `<div class="empty">لا توجد مباريات متاحة حالياً</div>`; return; }

    grid.innerHTML = matches.map(m => {
      const [h, a] = m.score.split(" - ");
      const live = m.status === "live";
      const hWin = live && +h > +a, aWin = live && +a > +h;

      return `<div class="match-card ${live ? "live" : ""}">
        <div class="match-top">
          <span class="league">${esc(m.league)}</span>
          <span class="${live ? "status-live" : ""}">${live ? `● ${esc(m.minute)}` : esc(m.minute)}</span>
        </div>
        <div class="match-teams">
          <div class="team-row ${hWin ? "win" : ""}">
            <img src="${esc(m.homeBadge || Api.placeholder)}" alt="">
            <span class="tname">${esc(m.home)}</span>
            <span class="match-score">${h}</span>
          </div>
          <div class="team-row ${aWin ? "win" : ""}">
            <img src="${esc(m.awayBadge || Api.placeholder)}" alt="">
            <span class="tname">${esc(m.away)}</span>
            <span class="match-score">${a}</span>
          </div>
        </div>
      </div>`;
    }).join("");
  }

  function renderLeagues(leagues) {
    $("#leagues-grid").innerHTML = leagues.map(l => `
      <div class="league-card">
        <div class="flag">⚽</div>
        <b>${esc(l.name)}</b>
        <small>${esc(l.sport)}</small>
      </div>`).join("");
  }

  function renderTeams(teams) {
    const grid = $("#teams-grid");
    if (!teams.length) { grid.innerHTML = `<div class="empty">مفيش نادي بهذا الاسم 🔍</div>`; return; }

    grid.innerHTML = teams.map(t => `
      <div class="team-card">
        <img src="${esc(t.badge)}" alt="" onerror="this.src='${Api.placeholder}'">
        <div>
          <b>${esc(t.name)}</b>
          <small>${esc(t.country)} ${t.league ? "• " + esc(t.league) : ""}</small>
          ${t.formed ? `<small>تأسس ${esc(t.formed)}</small>` : ""}
        </div>
      </div>`).join("");
  }

  async function loadScores(force = false) {
    try {
      const matches = await Api.liveScores(force);
      state.scores = matches;
      renderMiniScores(matches);
      renderMatches(matches);
    } catch {
      $("#scores-body").innerHTML = `<div class="empty">تعذّر تحميل النتائج</div>`;
    }
  }

  async function loadLeagues() {
    try {
      renderLeagues(await Api.leagues());
    } catch {
      $("#leagues-grid").innerHTML = `<div class="empty">تعذّر تحميل الدوريات</div>`;
    }
  }

  async function searchTeam(q) {
    const grid = $("#teams-grid");
    grid.innerHTML = `<div class="skeleton-line"></div>`;
    try {
      renderTeams(await Api.searchTeam(q));
    } catch {
      grid.innerHTML = `<div class="empty">تعذّر البحث عن النادي</div>`;
    }
  }

  function initSportsTabs() {
    const tabs = $$("[data-sport-tab]");
    const panes = { live: $("#sport-live"), leagues: $("#sport-leagues"), search: $("#sport-search") };

    tabs.forEach(tab => tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      Object.entries(panes).forEach(([k, el]) => el.hidden = k !== tab.dataset.sportTab);
    }));

    $("#team-btn").addEventListener("click", () => {
      const q = $("#team-input").value.trim();
      if (q.length < 2) return toast("اكتب اسم النادي الأول");
      searchTeam(q);
    });
    $("#team-input").addEventListener("keydown", e => { if (e.key === "Enter") $("#team-btn").click(); });
  }

  /* ---------- التشغيل ---------- */
  function init() {
    startClock();
    initTheme();
    initMenu();
    initSearch();
    initConverter();
    initSportsTabs();
    buildFilters();
    buildCityPickers();
    buildCurrencySelects();

    loadNews();
    setCity("cairo");
    loadCurrency();
    loadScores();
    loadLeagues();

    // زر "عرض المزيد"
    $("#load-more").addEventListener("click", () => {
      state.shown += 8;
      renderNews();
    });

    // تحديث النتائج المباشرة تلقائياً
    setInterval(() => loadScores(true), CONFIG.scoresRefreshSec * 1000);

    // تحديث كل ساعة
    setInterval(() => {
      Api.cache.drop("news");
      Api.cache.drop("wx:");
      Api.cache.drop("cur:");
      loadNews();
      setCity(state.city);
      loadCurrency();
    }, 60 * 60 * 1000);
  }

  document.addEventListener("DOMContentLoaded", init);
})();