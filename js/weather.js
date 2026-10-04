/* =========================================================
   MISR NOW — weather page
   City rail, current conditions, hourly strip, 5-day outlook
   and an at-a-glance grid for every Egyptian city.
   ========================================================= */

(() => {
  const { $, $$, esc, wxIcon, skeleton, emptyState } = UI;
  const state = { city: "cairo", wx: null };

  /* Provider timestamps arrive as city-local strings without a zone
     ("2026-10-05 00:00"), so we format them by hand instead of letting
     the browser shift them into the viewer's timezone. */
  const localTime = value => {
    const m = String(value || "").match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : null;
  };
  const hhmm = value => String(value || "").split(" ")[1]?.slice(0, 5) || "—";
  const dayLabel = value => {
    const d = localTime(value);
    return d ? d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : value;
  };

  /* ---------- city rail ---------- */
  function buildRail() {
    $("#city-rail").innerHTML = CONFIG.weather.cities.map(c =>
      `<button class="chip ${c.id === state.city ? "active" : ""}" data-city="${c.id}">${esc(c.name)}</button>`
    ).join("");

    $("#city-rail").addEventListener("click", e => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      $$("#city-rail .chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      load(chip.dataset.city);
    });
  }

  /* ---------- current conditions ---------- */
  function renderCurrent(wx) {
    $("#wx-current").innerHTML = `
      <div class="wx-hero">
        ${wxIcon(wx, 110)}
        <div class="wx-hero-txt">
          <h2>${esc(wx.city.name)}</h2>
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

  /* ---------- all cities ---------- */
  function renderCitiesGrid(list) {
    $("#cities-grid").innerHTML = list.map(item => `
      <button class="city-card" data-city="${item.city.id}">
        ${wxIcon(item, 38)}
        <div>
          <b>${esc(item.city.name)}</b>
          <span>${item.temp}° · ${esc(item.desc)}</span>
        </div>
        <em>${item.days[0].min}° / ${item.days[0].max}°</em>
      </button>`).join("");

    $("#cities-grid").onclick = e => {
      const card = e.target.closest(".city-card");
      if (!card) return;
      $$("#city-rail .chip").forEach(c => c.classList.toggle("active", c.dataset.city === card.dataset.city));
      load(card.dataset.city);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
  }

  /* ---------- loading ---------- */
  async function load(cityId) {
    state.city = cityId;
    $("#wx-current").innerHTML = skeleton(2);
    $("#hourly").innerHTML = skeleton(1);
    $("#forecast").innerHTML = skeleton(1);
    $("#cities-grid").innerHTML = skeleton(2);

    const results = await Promise.allSettled(
      [cityId, ...CONFIG.weather.cities.map(c => c.id)]
        .filter((id, i, arr) => arr.indexOf(id) === i)
        .map(id => Api.weather(id))
    );

    const picked = results[0].status === "fulfilled" ? results[0].value : null;
    if (!picked) {
      $("#wx-current").innerHTML = emptyState("Weather unavailable", "Both providers failed to respond.");
      return;
    }

    state.wx = picked;
    renderCurrent(picked);
    renderHourly(picked);
    renderForecast(picked);

    const list = results.filter(r => r.status === "fulfilled").map(r => r.value);
    if (list.length > 1) renderCitiesGrid(list);
  }

  document.addEventListener("DOMContentLoaded", () => {
    buildRail();
    load("cairo");
  });
})();