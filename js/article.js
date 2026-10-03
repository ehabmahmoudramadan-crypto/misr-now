/* =========================================================
   MISR NOW â€” article page
   The clicked headline arrives through sessionStorage, so it
   renders instantly; the live feed is then used to suggest a
   handful of related stories.
   ========================================================= */

(() => {
  const { $, esc, timeAgo, skeleton, emptyState, openArticle } = UI;

  function renderArticle(a) {
    document.title = `${a.title} â€” MISR NOW`;

    $("#article").innerHTML = `
      <div class="article-head">
        <div class="meta">
          <span class="tag tag-lg">${esc(a.sourceName || a.source)}</span>
          <span>${timeAgo(a.date)}</span>
          ${a.category ? `<span class="tag">${esc(a.category)}</span>` : ""}
        </div>
        <h1 dir="auto">${esc(a.title)}</h1>
        <p class="article-lead" dir="auto">${esc(a.summary || "Ø§Ù„Ù†Ø§Ø´Ø± Ù„Ù… ÙŠÙ‚Ø¯Ù‘Ù… Ù…Ù„Ø®ØµÙ‹Ø§ â€” Ø§ÙØªØ­ Ø§Ù„ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø£ØµÙ„ÙŠ Ù„Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ø®Ø¨Ø± ÙƒØ§Ù…Ù„Ù‹Ø§.")}</p>
        <div class="article-actions">
          <a class="btn" href="${esc(a.link)}" target="_blank" rel="noopener">Read the original report â†—</a>
          <button class="btn btn-ghost" id="copy-link">Copy link</button>
        </div>
      </div>

      <figure class="article-media">
        <img src="${esc(a.image)}" alt="" onerror="this.src='${Api.placeholder}'">
      </figure>

      <div class="article-note">
        <strong>Where this came from</strong>
        <p dir="auto">${esc(a.sourceName || a.source)}${a.feedId ? " Â· Ø§Ù„Ù…ØµØ¯Ø±: " + esc(a.feedId) : ""} â€” Ù†ÙØ´Ø± ${new Date(a.date).toLocaleString("en-GB")}. Ù…ÙˆÙ‚Ø¹ MISR NOW ÙŠØ¹Ø±Ø¶ ÙÙ‚Ø· Ø§Ù„Ø¹Ù†Ø§ÙˆÙŠÙ† Ø§Ù„Ø¹Ø§Ù…Ø©ØŒ ÙˆØ§Ù„Ù†Ø§Ø´Ø± ÙŠØ­ØªÙØ¸ Ø¨Ø­Ù‚ÙˆÙ‚Ù‡ Ø§Ù„ÙƒØ§Ù…Ù„Ø© ÙÙŠ Ø§Ù„Ù…Ø­ØªÙˆÙ‰.</p>
      </div>`;

    $("#copy-link").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(a.link);
        UI.toast("Link copied to clipboard");
      } catch {
        UI.toast("Copy failed â€” select the address bar instead");
      }
    });
  }

  async function renderRelated() {
    const grid = $("#related");
    grid.innerHTML = skeleton(3);

    try {
      const feed = await Api.allNews();
      const related = feed.filter(n => n.link !== document.referrer && n.title !== document.title).slice(0, 3);

      grid.innerHTML = related.map((n, i) => `
        <article class="news-card" data-index="${i}">
          <button class="card-media" data-open aria-label="${esc(n.title)}">
            <img src="${esc(n.image)}" alt="" loading="lazy" onerror="this.src='${Api.placeholder}'">
          </button>
          <div class="card-body">
            <div class="meta">
              <span class="tag">${esc(n.source)}</span>
              <span>${timeAgo(n.date)}</span>
            </div>
            <h3><button class="link-btn" data-open dir="auto">${esc(n.title)}</button></h3>
          </div>
        </article>`).join("");

      grid.addEventListener("click", e => {
        if (!e.target.closest("[data-open]")) return;
        const box = e.target.closest(".news-card");
        openArticle(related[Number(box.dataset.index)]);
      });
    } catch {
      grid.innerHTML = emptyState("Could not load more headlines");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const saved = UI.readArticle();

    if (saved) renderArticle(saved);
    else {
      $("#article").innerHTML = emptyState(
        "No article selected",
        "Open any headline from the home page to read it here."
      );
    }

    renderRelated();
  });
})();