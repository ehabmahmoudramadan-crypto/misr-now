/* =========================================================
   MISR NOW — shared UI helpers
   Loaded on every page: theme, clock, nav state, toasts
   and small format utilities used by all page scripts.
   ========================================================= */

const UI = (() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ---------- escaping + formatting ---------- */
  const esc = value => String(value ?? "").replace(/[&<>"]/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function timeAgo(dateStr) {
    const then = new Date(dateStr).getTime();
    if (Number.isNaN(then)) return "";
    const mins = Math.floor((Date.now() - then) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    const days = Math.floor(hrs / 24);
    return days === 1 ? "yesterday" : days + "d ago";
  }

  const longDate = date =>
    new Date(date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const clockTime = date =>
    new Date(date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const num = (value, digits = 2) =>
    Number(value).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

  /* ---------- weather icon (URL from API, emoji otherwise) ---------- */
  function wxIcon(wx, size = 48) {
    if (!wx) return "";
    return wx.iconUrl
      ? `<img class="wx-img" src="${esc(wx.iconUrl)}" alt="${esc(wx.desc)}" width="${size}" style="width:${size}px">`
      : `<span class="wx-emoji" style="font-size:${Math.round(size * 0.85)}px">${wx.icon}</span>`;
  }

  /* ---------- skeletons ---------- */
  function skeleton(lines = 1) {
    return Array.from({ length: lines }, () => '<div class="skeleton"></div>').join("");
  }

  const emptyState = (msg, sub = "") => `
    <div class="empty">
      <strong>${esc(msg)}</strong>
      ${sub ? `<span>${esc(sub)}</span>` : ""}
    </div>`;

  /* ---------- toast ---------- */
  function toast(msg) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove("show"), 3600);
  }

  /* ---------- theme ---------- */
  function initTheme() {
    const btn = $("#theme-toggle");
    if (!btn) return;
    const stored = localStorage.getItem("mn-theme");
    if (stored === "dark") {
      document.body.classList.add("dark");
      btn.textContent = "☀️";
    }
    btn.addEventListener("click", () => {
      const dark = document.body.classList.toggle("dark");
      btn.textContent = dark ? "☀️" : "🌙";
      localStorage.setItem("mn-theme", dark ? "dark" : "light");
    });
  }

  /* ---------- live clock ---------- */
  function initClock() {
    const clock = $("#live-clock");
    const date = $("#live-date");
    if (!clock) return;

    const tick = () => {
      const now = new Date();
      clock.textContent = now.toLocaleTimeString("en-GB", { hour12: false });
      if (date) {
        date.textContent = now.toLocaleDateString("en-GB", {
          weekday: "long", day: "numeric", month: "short", year: "numeric"
        });
      }
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- mobile nav ---------- */
  function initNav() {
    const btn = $("#menu-btn");
    const nav = $("#main-nav");
    if (!btn || !nav) return;
    btn.addEventListener("click", () => nav.classList.toggle("open"));
    $$(".nav-link").forEach(a => a.addEventListener("click", () => nav.classList.remove("open")));
  }

  /* ---------- mark the active page ---------- */
  function initActivePage() {
    const page = document.body.dataset.page;
    if (!page) return;
    $$(".nav-link").forEach(a => {
      if (a.dataset.page === page) {
        a.classList.add("active");
        a.setAttribute("aria-current", "page");
      }
    });
  }

  /* ---------- breaking news ticker (shared by every page) ---------- */
  async function initTicker() {
    const track = $("#ticker-track");
    if (!track) return;

    track.innerHTML = '<span class="ticker-item">Loading live headlines…</span>';
    try {
      const news = await Api.allNews();
      track.innerHTML = news.slice(0, 12).map(n =>
        `<a class="ticker-item" href="${esc(n.link)}" target="_blank" rel="noopener">${esc(n.title)}</a>`
      ).join("");
    } catch (err) {
      track.innerHTML = `<span class="ticker-item">Breaking news feed unavailable right now</span>`;
    }
  }

  /* ---------- article hand-off between pages ---------- */
  function saveArticle(article) {
    try { sessionStorage.setItem("mn-article", JSON.stringify(article)); } catch {}
  }

  function readArticle() {
    try { return JSON.parse(sessionStorage.getItem("mn-article") || "null"); } catch { return null; }
  }

  function openArticle(article) {
    saveArticle(article);
    location.href = "article.html";
  }

  function init() {
    initTheme();
    initClock();
    initNav();
    initActivePage();
    initTicker();
  }

  return {
    $, $$, esc, timeAgo, longDate, clockTime, num, wxIcon,
    skeleton, emptyState, toast, init, saveArticle, readArticle, openArticle
  };
})();

document.addEventListener("DOMContentLoaded", UI.init);