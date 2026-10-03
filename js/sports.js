/* =========================================================
   MISR NOW â€” sports page
   Live scores (auto refresh), league list, sports headlines
   from GNews and a team finder backed by TheSportsDB.
   ========================================================= */

(() => {
  const { $, $$, esc, timeAgo, skeleton, emptyState, toast } = UI;

  const scoreCard = m => {
    const played = m.homeScore !== null;
    const live = m.status === "live";
    const homeWin = live && m.homeScore > m.awayScore;
    const awayWin = live && m.awayScore > m.homeScore;

    const statusText = {
      live: `â— ${m.minute || "LIVE"}`,
      finished: "Full time",
      postponed: "Postponed",
      scheduled: m.kickoff ? `Kick-off ${m.kickoff}` : "Upcoming"
    }[m.status] || m.minute;

    return `<article class="match ${live ? "is-live" : ""}">
      <header class="match-head">
        <span class="league">${esc(m.league)}</span>
        <span class="status ${live ? "status-live" : ""}">${esc(statusText)}</span>
      </header>
      <div class="match-team ${homeWin ? "win" : ""}">
        <img src="${esc(m.homeBadge || Api.placeholder)}" alt="" loading="lazy">
        <span>${esc(m.home)}</span>
        <b>${played ? m.homeScore : ""}</b>
      </div>
      <div class="match-team ${awayWin ? "win" : ""}">
        <img src="${esc(m.awayBadge || Api.placeholder)}" alt="" loading="lazy">
        <span>${esc(m.away)}</span>
        <b>${played ? m.awayScore : ""}</b>
      </div>
      ${played ? "" : `<div class="match-vs">${esc(m.score)}</div>`}
      ${m.venue ? `<footer class="match-foot">ðŸ“ ${esc(m.venue)}</footer>` : ""}
    </article>`;
  };

  async function loadScores(force = false) {
    const grid = $("#matches-grid");
    if (!grid.children.length) grid.innerHTML = skeleton(4);

    try {
      const matches = await Api.liveScores(force);
      grid.innerHTML = matches.length
        ? matches.map(scoreCard).join("")
        : emptyState("No matches available", "TheSportsDB has no live fixtures right now.");
      $("#scores-stamp").textContent =
        `${matches.filter(m => m.status === "live").length} live Â· updated ${new Date().toLocaleTimeString("en-GB", { hour12: false })}`;
    } catch (err) {
      grid.innerHTML = emptyState("Could not load scores", err.message);
    }
  }

  async function loadLeagues() {
    const grid = $("#leagues-grid");
    grid.innerHTML = skeleton(3);
    try {
      const leagues = await Api.leagues();
      grid.innerHTML = leagues.map(l => `
        <article class="league-card">
          <span class="league-icon">âš½</span>
          <b>${esc(l.name)}</b>
          <small>${esc(l.sport)}</small>
        </article>`).join("");
    } catch (err) {
      grid.innerHTML = emptyState("Could not load leagues", err.message);
    }
  }

  async function loadSportsNews() {
    const grid = $("#sports-news");
    grid.innerHTML = skeleton(3);
    try {
      const articles = await Api.gnews("sports");
      grid.innerHTML = articles.map(a => `
        <article class="news-card" data-index="0">
          <button class="card-media" data-open>
            <img src="${esc(a.image)}" alt="" loading="lazy" onerror="this.src='${Api.placeholder}'">
          </button>
          <div class="card-body">
            <div class="meta">
              <span class="tag">${esc(a.sourceName)}</span>
              <span>${timeAgo(a.date)}</span>
            </div>
            <h3><button class="link-btn" data-open dir="auto">${esc(a.title)}</button></h3>
            <p class="clamp-2" dir="auto">${esc(a.summary || "")}</p>
          </div>
        </article>`).join("");

      grid.onclick = e => {
        if (!e.target.closest("[data-open]")) return;
        const box = e.target.closest(".news-card");
        UI.openArticle(articles[Number(box.dataset.index)] || articles[0]);
      };
    } catch (err) {
      grid.innerHTML = emptyState("Sports news unavailable", err.message);
    }
  }

  async function searchTeams(query) {
    const grid = $("#teams-grid");
    grid.innerHTML = skeleton(2);
    try {
      const teams = await Api.searchTeam(query);
      grid.innerHTML = teams.length
        ? teams.map(t => `
          <article class="team-card">
            <img src="${esc(t.badge)}" alt="" loading="lazy" onerror="this.src='${Api.placeholder}'">
            <div>
              <b>${esc(t.name)}</b>
              <small>${esc(t.country)}${t.league ? " Â· " + esc(t.league) : ""}</small>
              ${t.stadium ? `<small>ðŸŸ ${esc(t.stadium)}${t.capacity ? " Â· " + Number(t.capacity).toLocaleString("en-US") + " seats" : ""}</small>` : ""}
              ${t.formed ? `<small>Founded ${esc(t.formed)}</small>` : ""}
            </div>
          </article>`).join("")
        : emptyState("No team found", `Nothing matched â€œ${query}â€`);
    } catch (err) {
      grid.innerHTML = emptyState("Search failed", err.message);
    }
  }

  function initTabs() {
    const tabs = $$("#sport-tabs .chip");
    const panels = { scores: $("#tab-scores"), leagues: $("#tab-leagues"), news: $("#tab-news"), teams: $("#tab-teams") };
    const loaders = { leagues: loadLeagues, news: loadSportsNews };
    const loaded = {};

    tabs.forEach(tab => tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      Object.entries(panels).forEach(([key, panel]) => panel.hidden = key !== tab.dataset.tab);

      const key = tab.dataset.tab;
      if (loaders[key] && !loaded[key]) {
        loaded[key] = true;
        loaders[key]();
      }
    }));
  }

  function initTeamForm() {
    $("#team-form").addEventListener("submit", e => {
      e.preventDefault();
      const q = $("#team-input").value.trim();
      if (q.length < 2) return toast("Type at least two characters");
      searchTeams(q);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    initTeamForm();
    loadScores();
    setInterval(() => loadScores(true), CONFIG.scoresRefreshSec * 1000);
  });
})();