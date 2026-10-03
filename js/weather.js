/* =========================================================
   MISR NOW — weather page
   A rail of all 27 Egyptian governorates grouped by region,
   current conditions, hourly strip, 5-day outlook and an
   at-a-glance grid that loads the whole country in batches.
   ========================================================= */

(() => {
  const { $, $$, esc, wxIcon, skeleton, emptyState } = UI;
  const state = { city: "cairo", wx: null, all: new Map(), loading: false };

  const citiesByRegion = () => CONFIG.weather.regions.map(region => ({
    region,
    list: CONFIG.weather.cities.filter(c => c.region === region)
  })).filter(g => g.list.length);

  const cityById = id => CONFIG.weather.cities.find(c => c.id === id);

  /* Provider timestamps arrive as city-local strings without a zone
     ("2026-10-05 00:00"), so we format them by hand instead of letting
     the browser shift them into the viewer's timezone. */
  const localTime = value => {
    const m = String(value || "").match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : null;
  };
  const hhmm = value => String(value || "").split(/[T ]/)[1]?.slice(0, 5) || "—";
  const dayLabel = value => {
    const d = localTime(value);
    return d ? d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : value;
  };

  /* ---------- governorate rail ---------- */
  function buildRail() {
    $("#city-rail").innerHTML = citiesByRegion().map(g => `
      <div class="rail-group">
        <span class="rail-label">${esc(g.region)}</span>
        <div class="rail-chips">
          ${g.list.map(c => `<button class="chip ${c.id === state.city ? "active" : ""}" data-city="${c.id}">${esc(c.name)}</button>`).join("")}
        </div>
      </div>`).join("");

    $("#city-rail").addEventListener("click", e => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      markActive(chip.dataset.city);
      load(chip.dataset.city);
    });
  }

  function markActive(cityId) {
    $$("#city-rail .chip").forEach(c => c.classList.toggle("active", c.dataset.city === cityId));
    $$("#cities-grid .city-card").forEach(c => c.classList.toggle("active", c.dataset.city === cityId));
  }

  /* ---------- current conditions ---------- */
  function renderCurrent(wx) {
    const city = cityById(state.city);
    $("#wx-current").innerHTML = `
      <div class="wx-hero">
        ${wxIcon(wx, 110)}
        <div class="wx-hero-txt">
          <h2>${esc(wx.city.name)}</h2>
          ${city ? `<span class="stamp">${esc(city.region)} · ${esc(wx.city.name)}</span>` : ""}
          <div class="wx-temp">${wx.temp}°</div>
          <p>${esc(wx.desc)}</p>
          <span class="stamp">${esc(wx.source)}${wx.lastUpdate ? " · " + esc(wx.lastUpdate) : ""}</span>
        </div>
      </div>
      <div class="wx-facts">
        <div><small>Feels like</small><b>${wx.feels}°</b></div>
        <div><small>Humidity</small><b>${wx.humidity}%</b></div>
        <div><small>Wind</small><b>${wx.wind} km/h</b></div>
        <div><small>Pressure</small><b>${wx.pressure ?? "—"} mb</b></div>
        <div><small>UV index</small><b>${wx.uv ?? "—"}</b></div>
        <div><small>Sunrise</small><b>${hhmm(wx.sunrise)}</b></div>
        <div><small>Sunset</small><b>${hhmm(wx.sunset)}</b></div>
        <div><small>Visibility</small><b>${wx.visibility ? wx.visibility + " km" : "—"}</b></div>
      </div>`;
  }

  /* ---------- hourly + daily ---------- */
  function renderHourly(wx) {
    $("#hourly").innerHTML = wx.hours.map(h => `
      <div class="hour-card">
        <span class="hour-time">${hhmm(h.time)}</span>
        ${wxIcon(h, 34)}
        <b>${h.temp}°</b>
        <small>${esc(h.desc)}</small>
      </div>`).join("");

    $("#hourly-stamp").textContent = wx.hours.length ? "from " + hhmm(wx.hours[0].time) : "";
  }

  function renderForecast(wx) {
    $("#forecast").innerHTML = wx.days.slice(1).map(d => `
      <article class="day-card">
        <b>${dayLabel(d.date)}</b>
        ${wxIcon(d, 44)}
        <span class="day-desc">${esc(d.desc)}</span>
        <div class="day-temps"><b>${d.max}°</b><em>${d.min}°</em></div>
      </article>`).join("");
  }

  /* ---------- every governorate at a glance ---------- */
  function renderAll() {
    const done = state.all.size;
    const total = CONFIG.weather.cities.length;

    $("#all-cities-progress").textContent = done
      ? `${done} of ${total} governorates loaded`
      : `${total} governorates`;

    $("#cities-grid").innerHTML = citiesByRegion().map(g => `
      <section class="city-group">
        <h3 class="city-group-title">${esc(g.region)}</h3>
        <div class="city-group-list">
          ${g.list.map(c => {
            const wx = state.all.get(c.id);
            if (!wx) {
              return `<div class="city-card is-loading">
                <span class="city-skeleton"></span>
                <div><b>${esc(c.name)}</b><span>loading…</span></div>
              </div>`;
            }
            return `<button class="city-card ${c.id === state.city ? "active" : ""}" data-city="${c.id}">
              ${wxIcon(wx, 34)}
              <div>
                <b>${esc(wx.city.name || c.name)}</b>
                <span>${wx.temp}° · ${esc(wx.desc)}</span>
              </div>
              <em>${wx.days[0].min}° / ${wx.days[0].max}°</em>
            </button>`;
          }).join("")}
        </div>
      </section>`).join("");
  }

  /* WeatherAPI is metered, so the full-country grid is opt-in and walks
     the list in small batches instead of firing 27 requests at once. */
  async function loadAllCities() {
    if (state.loading) return;
    state.loading = true;
    const btn = $("#load-all");
    btn.disabled = true;
    btn.textContent = "Loading…";
    renderAll();

    const pending = CONFIG.weather.cities.filter(c => !state.all.has(c.id));
    const size = CONFIG.weather.batch || 6;

    for (let i = 0; i < pending.length; i += size) {
      const chunk = pending.slice(i, i + size);
      const got = await Promise.allSettled(chunk.map(c => Api.weather(c.id)));
      got.forEach((r, n) => { if (r.status === "fulfilled") state.all.set(chunk[n].id, r.value); });
      renderAll();
    }

    state.loading = false;
    btn.disabled = false;
    btn.textContent = "Refresh all governorates";
    $("#all-cities-progress").textContent = `${state.all.size} of ${CONFIG.weather.cities.length} governorates loaded`;
    UI.toast(`Loaded ${state.all.size} governorates`);
  }

  /* ---------- selected city ---------- */
  async function load(cityId) {
    state.city = cityId;
    markActive(cityId);
    $("#wx-current").innerHTML = skeleton(2);
    $("#hourly").innerHTML = skeleton(1);
    $("#forecast").innerHTML = skeleton(1);

    const cached = state.all.get(cityId);
    if (cached) {
      state.wx = cached;
      renderCurrent(cached);
      renderHourly(cached);
      renderForecast(cached);
    }

    try {
      const wx = await Api.weather(cityId);
      state.wx = wx;
      state.all.set(cityId, wx);
      renderCurrent(wx);
      renderHourly(wx);
      renderForecast(wx);
      if (state.all.size > 1) renderAll();
    } catch {
      if (!cached) {
        $("#wx-current").innerHTML = emptyState("Weather unavailable", "Both providers failed to respond.");
      }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    buildRail();
    renderAll();

    $("#load-all").addEventListener("click", loadAllCities);
    $("#cities-grid").addEventListener("click", e => {
      const card = e.target.closest(".city-card");
      if (!card) return;
      load(card.dataset.city);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    load("cairo");
  });
})();