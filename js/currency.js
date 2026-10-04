/* =========================================================
   MISR NOW — currency page
   Featured pairs, instant converter and the full rate table.
   All quotes come from open.er-api (EGP) with Frankfurter
   filling in the international pairs.
   ========================================================= */

(() => {
  const { $, esc, num, emptyState, skeleton, toast } = UI;
  const state = { data: null };

  /* ---------- converter ---------- */
  function fillSelects() {
    const options = CONFIG.currency.list.map(c =>
      `<option value="${c.code}">${c.flag} ${c.code} — ${c.name}</option>`).join("");
    $("#conv-from").innerHTML = options;
    $("#conv-to").innerHTML = options;
    $("#conv-from").value = "USD";
    $("#conv-to").value = "EGP";
  }

  function convert() {
    if (!state.data) return;

    const amount = parseFloat($("#conv-amount").value) || 0;
    const from = $("#conv-from").value;
    const to = $("#conv-to").value;
    const rates = state.data.rates;

    if (!rates[from] || !rates[to]) {
      $("#conv-out").textContent = "Pair unavailable";
      return;
    }

    /* every rate is quoted against USD, so conversion hops via USD */
    const usd = from === "USD" ? amount : amount / rates[from];
    const out = to === "USD" ? usd : usd * rates[to];
    const one = to === "USD" ? 1 / rates[from] : rates[to] / rates[from];

    $("#conv-out").textContent = `${out.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${to}`;
    $("#conv-rate").textContent = `1 ${from} = ${num(one, 4)} ${to}`;
  }

  /* ---------- featured cards ---------- */
  function renderHeroFx() {
    const r = state.data.rates;
    const cards = [
      { code: "USD", label: "US Dollar", value: r.EGP, note: "EGP per 1 USD", big: true },
      { code: "EUR", label: "Euro", value: r.EUR ? r.EGP / r.EUR : null, note: "EGP per 1 EUR" },
      { code: "SAR", label: "Saudi Riyal", value: r.SAR ? r.EGP / r.SAR : null, note: "EGP per 1 SAR" },
      { code: "GBP", label: "Pound Sterling", value: r.GBP ? r.EGP / r.GBP : null, note: "EGP per 1 GBP" }
    ];

    $("#hero-fx").innerHTML = cards.map(c => `
      <article class="fx-card ${c.big ? "fx-card-main" : ""}">
        <header>
          <span>${CONFIG.currency.list.find(x => x.code === c.code).flag} ${c.code}</span>
          <small>${esc(c.label)}</small>
        </header>
        <b>${c.value ? num(c.value, c.big ? 3 : 4) : "—"}</b>
        <span>${esc(c.note)}</span>
      </article>`).join("");
  }

  /* ---------- full table ---------- */
  function renderTable() {
    const r = state.data.rates;

    const rows = CONFIG.currency.list
      .filter(c => r[c.code])
      .map(c => {
        const egp = r[c.code];
        const barWidth = Math.max(6, Math.min(100, (1 / egp) * 100));
        return `<tr>
          <td class="cur-name">${c.flag} ${esc(c.name)}</td>
          <td><b>${c.code}</b></td>
          <td>${num(1 / egp, 4)}</td>
          <td class="egp">${num(egp, 4)} EGP</td>
          <td class="bar-cell">
            <span class="bar" style="width:${barWidth}%"></span>
          </td>
        </tr>`;
      }).join("");

    $("#rates-body").innerHTML = rows;
    $("#table-stamp").textContent =
      `Updated ${new Date(state.data.updated).toLocaleString("en-GB")} · via ${state.data.sources.join(" + ")}`;
  }

  /* ---------- boot ---------- */
  async function load() {
    $("#hero-fx").innerHTML = skeleton(3);
    $("#rates-body").innerHTML = skeleton(4);

    try {
      state.data = await Api.rates();
      renderHeroFx();
      renderTable();
      convert();
    } catch (err) {
      $("#hero-fx").innerHTML = emptyState("Rates unavailable", err.message);
      $("#rates-body").innerHTML = "";
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    fillSelects();

    ["#conv-amount", "#conv-from", "#conv-to"].forEach(sel =>
      $(sel).addEventListener("input", convert));

    $("#conv-swap").addEventListener("click", () => {
      const from = $("#conv-from").value;
      $("#conv-from").value = $("#conv-to").value;
      $("#conv-to").value = from;
      convert();
      toast("Currencies swapped");
    });

    load();
  });
})();