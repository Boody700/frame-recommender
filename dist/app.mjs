import { rank, contributions, validateTaste } from "./recommender.mjs";
const $ = (id) => document.getElementById(id), esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]), pct = (n) => (n * 100).toFixed(1) + "%";
let model, catalog, report, idMap;
const state = { page: "discover", favorites: [], saved: /* @__PURE__ */ new Set(), dismissed: /* @__PURE__ */ new Set(), mode: null, genre: "all", decade: "all", variety: false, search: false, query: "", limit: 12, demo: true };
const title = (i) => catalog[i].title.replace(/^(.*), (The|A|An)$/, "$2 $1");
const seeds = () => state.favorites.slice().sort((a, b) => a - b);
function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  $("status").textContent = message;
  setTimeout(() => $("toast").classList.remove("show"), 2500);
}
function poster(i, ordinal = "") {
  const film = catalog[i], palettes = [["#4b2637", "#fac5cf"], ["#1c4445", "#bce0d3"], ["#44351f", "#f0d3a1"], ["#302c4d", "#cfc4ef"], ["#4b2b27", "#f1bda8"]], p = palettes[film.id % 5], cx = 25 + film.id * 7 % 65, cy = 35 + film.id * 11 % 80;
  return `<div class="poster" style="--cover-bg:${p[0]};--cover-fg:${p[1]}"><span class="poster-top"><span>FRAME / COVER STUDY</span><span>${ordinal}</span></span><svg viewBox="0 0 200 300" aria-hidden="true" preserveAspectRatio="xMidYMid slice"><circle cx="${cx}" cy="${cy}" r="${35 + film.id % 35}" fill="${p[1]}" opacity=".18"/><circle cx="${200 - cx}" cy="${cy + 60}" r="${30 + film.id % 55}" fill="none" stroke="${p[1]}" stroke-width="1" opacity=".5"/><path d="M0 135L200 35M0 158L200 58M0 181L200 81" stroke="${p[1]}" opacity=".18"/><rect x="15" y="15" width="170" height="270" fill="none" stroke="${p[1]}" opacity=".12"/></svg><strong class="poster-title">${esc(title(i).replace(/\s+\([^)]*\)/g, ""))}</strong><span class="poster-bottom"><span>${film.year ?? "UNDATED"}</span><span>${esc(film.genres[0])}</span></span></div>`;
}
function reason(i) {
  if (!state.favorites.length || state.mode === "popular") return `Liked by ${catalog[i].likes} users in the historical fitting data.`;
  const support = contributions(model, seeds(), i);
  if (state.mode !== "content" && support.length) return "Because you liked " + title(support[0].index) + ".";
  const liked = new Set(state.favorites.flatMap((j) => catalog[j].genres)), overlap = catalog[i].genres.filter((g) => liked.has(g));
  return overlap.length ? "Shares your " + overlap.slice(0, 2).join(" / ") + " taste." : "A broader discovery from the blended signals.";
}
function currentRanking() {
  const allowed = new Set(catalog.map((m, i) => ({ m, i })).filter(({ m }) => (state.genre === "all" || m.genres.includes(state.genre)) && (state.decade === "all" || m.year !== null && Math.floor(m.year / 10) * 10 === Number(state.decade))).map((x) => x.i));
  return rank(model, seeds(), [...state.favorites, ...state.dismissed], state.mode, { limit: state.limit, allowed, variety: state.variety });
}
function card(i, pos) {
  const f = catalog[i];
  return `<article class="film-card"><button class="poster-link" data-detail="${i}" aria-label="Why ${esc(title(i))}?">${poster(i, String(pos).padStart(2, "0"))}</button><div class="card-body"><div class="card-meta"><span>${f.year ?? "UNDATED"} / ${f.likes} history likes</span><span>${String(pos).padStart(2, "0")}</span></div><h3 class="card-title">${esc(title(i))}</h3><p class="card-reason">${esc(reason(i))}</p><div class="card-actions"><button class="save-button" data-save="${i}" aria-pressed="${state.saved.has(i)}">${state.saved.has(i) ? "✓ On watchlist" : "＋ Watchlist"}</button><button class="dismiss-button" data-dismiss="${i}" aria-label="Hide ${esc(title(i))}">Not for me</button></div></div></article>`;
}
function tasteRoom() {
  return `<section class="taste-room"><div><div class="taste-title">${state.demo ? "EXAMPLE TASTE / MAKE IT YOURS" : "THE OPENING SCENE"}</div><h2>A little about your taste.</h2><p>${state.favorites.length} / 12 favorites · session only</p></div><div class="taste-strip">${state.favorites.length ? state.favorites.map((i) => `<div class="taste-chip">${poster(i)}<div>${esc(title(i))}</div><button data-remove="${i}" aria-label="Remove ${esc(title(i))} from favorites">×</button></div>`).join("") : '<span class="taste-empty">Start with films you already love.<br>Until then, crowd favorites lead the way.</span>'}</div><div class="taste-actions"><button class="button primary" id="open-search">＋ Add favorites</button><button class="button quiet" id="clear-taste">Clear taste</button></div></section>`;
}
function searchResults() {
  const q = state.query.trim().toLowerCase();
  return catalog.map((f, i) => ({ f, i })).filter(({ f, i }) => !q || (title(i) + " " + f.year + " " + f.genres.join(" ")).toLowerCase().includes(q)).sort((a, b) => b.f.likes - a.f.likes || a.f.id - b.f.id).slice(0, 12).map(({ f, i }) => `<div class="search-item">${poster(i)}<span>${esc(title(i))}<small>${f.year ?? "Undated"} / ${esc(f.genres.slice(0, 2).join(" · "))}</small></span><button class="add-film" data-add="${i}" ${state.favorites.includes(i) ? "disabled" : ""} aria-label="Add ${esc(title(i))} to favorites">${state.favorites.includes(i) ? "✓" : "＋"}</button></div>`).join("") || '<p class="search-hint">No title matches this search. This research catalog contains 1,000 films, not every movie.</p>';
}
function searchRoom() {
  return state.search ? `<section class="search-room" aria-label="Find favorites"><div class="search-row"><label class="sr-only" for="film-search">Search the historical film catalog</label><input id="film-search" type="search" maxlength="100" value="${esc(state.query)}" placeholder="A film, a year, a genre…"><button class="button small" id="close-search">Done</button></div><div class="preset-row"><span>OR TRY A TASTE:</span><button data-preset="adventure">Big adventure</button><button data-preset="warm">A little warmth</button><button data-preset="crime">After dark</button></div><div id="search-results" class="search-results">${searchResults()}</div><p class="search-hint">Favorites shape the ranking. Saving to the watchlist does not train your taste.</p></section>` : "";
}
function filters() {
  return `<div class="filters"><div class="filter-group"><label>RANKING<select id="mode">${Object.entries(report.names).map(([k, v]) => `<option value="${k}" ${state.mode === k ? "selected" : ""}>${v}</option>`).join("")}</select></label><label>GENRE<select id="genre"><option value="all">Any genre</option>${report.genres.map((g) => `<option value="${esc(g)}" ${state.genre === g ? "selected" : ""}>${esc(g)}</option>`).join("")}</select></label><label>DECADE<select id="decade"><option value="all">Any era</option>${[...new Set(catalog.filter((f) => f.year).map((f) => Math.floor(f.year / 10) * 10))].sort((a, b) => b - a).map((y) => `<option value="${y}" ${state.decade === String(y) ? "selected" : ""}>${y}s</option>`).join("")}</select></label><label class="variety-label"><input id="variety" type="checkbox" ${state.variety ? "checked" : ""}> More variety</label></div><button class="reset-filter" id="reset-filters">Reset filters</button></div>`;
}
function discover() {
  const result = currentRanking(), first = result.indices[0];
  return `<section class="hero"><div class="hero-copy"><div class="eyebrow">YOUR TASTE. A DIFFERENT KIND OF DOUBLE FEATURE.</div><h1>Good taste.<br><em>Great discoveries.</em></h1><p>A thousand films. A few favorites. A new way to find something that feels like you—and a few things that don't.</p><button class="button primary" id="hero-taste">Set the scene ↗</button><div class="hero-meta"><span>1,000 FILMS</span><span>LOCAL RANKING</span><span>NO STREAMING CLAIMS</span></div></div>${first !== void 0 ? `<article class="feature-ticket">${poster(first, "01")}<div class="feature-copy"><div class="eyebrow">TONIGHT'S FIRST PICK</div><h2>${esc(title(first))}</h2><p>${esc(reason(first))}</p><span class="genre">${esc(catalog[first].genres[0])}</span><p>${catalog[first].year ?? "Undated"} / historical catalog</p><button class="button small" data-detail="${first}">Why this one? ↗</button></div></article>` : '<div class="empty">No films remain in this selection.<br>Reset a filter or bring back hidden films.</div>'}</section>${tasteRoom()}${searchRoom()}<section><div class="section-heading"><div><h2>${state.favorites.length ? "The next scene is yours." : "Start with the crowd."}</h2><p>${!state.favorites.length ? "No-profile fallback: the same historical popularity ranking, whichever mode you select." : state.mode === "popular" ? "Popularity mode uses crowd likes. Favorites are excluded, but do not personalize this mode." : esc(report.names[state.mode]) + " · favorites shape the ranking; filters shape the selection."}</p></div><span>THE SHORTLIST / ${result.indices.length}</span></div>${filters()}${state.variety ? '<div class="notice">More variety reduces repeated genre profiles among the top candidates. It changes the base ranking evaluated in The algorithm.</div>' : ""}<div class="film-grid">${result.indices.map((i, p) => card(i, p + 1)).join("")}</div>${result.indices.length === state.limit && state.limit < 48 ? '<div class="more-row"><button class="button" id="show-more">Roll the next scene ↓</button></div>' : ""}<div class="wide-actions"><p>${state.dismissed.size} hidden films · ${state.saved.size} on your watchlist</p><button class="button quiet" id="reset-hidden">Bring back hidden films ↻</button></div><p class="art-credit">Original geometric cover studies by Frame. These are not official movie posters. Scores order suggestions; they are not predicted star ratings.</p></section>`;
}
function saved() {
  const rows = [...state.saved];
  return `<section class="page-hero saved-heading"><div><div class="eyebrow">YOUR OWN LITTLE FILM FESTIVAL</div><h1>For a<br><em>good evening.</em></h1><p>A session-only watchlist. Export your taste file to keep it after a refresh.</p></div><button class="button primary" id="export-taste">Export taste & watchlist ↗</button></section>${rows.length ? `<div class="film-grid">${rows.map((i, p) => card(i, p + 1)).join("")}</div>` : '<div class="empty">Your watchlist is waiting for its opening film.<br><a href="#discover">Discover something →</a></div>'}<div class="wide-actions"><p>Import/export favorites, saved films and hidden films locally.</p><button class="button" id="import-taste">Import taste</button><input id="taste-file" type="file" accept=".json,application/json" hidden></div><p class="art-credit">A watchlist is not a viewing history or a streaming-availability list. Cover art is an original Frame study.</p>`;
}
function pageHero(title2, copy, kicker) {
  return `<section class="page-hero"><div class="eyebrow">${kicker}</div><h1>${title2}</h1><p>${copy}</p></section>`;
}
function bench() {
  const r = report.models[report.selected], d = report.deltaVsPopularity;
  return `${pageHero("Good recommendations.<br><em>Show the receipts.</em>", "Personalization should earn its place against a simple popularity baseline. Here is the full local ranking diagnostic.", "THE ALGORITHM / NO SAMPLED NEGATIVES")}<div class="notice">This is a fixed-download MovieLens development-data study, not a production or shared research benchmark. The per-user chronological split is not a global historical replay: other users can contribute later calendar ratings. Evaluation is restricted to a training-selected 1,000-film catalog.</div><div class="table-wrap"><table><caption class="sr-only">All six base rankers on the same eligible users and full candidate catalog</caption><thead><tr><th>RANKER</th><th class="num">VAL NDCG@10</th><th class="num">TEST NDCG@10</th><th class="num">TEST RECALL@10</th><th class="num">TEST HIT@10</th><th class="num">CATALOG COVERAGE</th></tr></thead><tbody>${Object.entries(report.models).map(([k, v]) => `<tr class="${k === report.selected ? "selected" : ""}"><td>${esc(v.label)}${k === report.selected ? " / selected" : ""}</td><td class="num">${v.validation.ndcg10.toFixed(4)}</td><td class="num">${v.test.ndcg10.toFixed(4)}</td><td class="num">${pct(v.test.recall10)}</td><td class="num">${pct(v.test.hit10)}</td><td class="num">${pct(v.test.catalogCoverage)}</td></tr>`).join("")}</tbody></table></div><p class="table-note">All previously rated fitting-history films are excluded. Rankings use the full 1,000-item catalog, not sampled easy negatives. An unrated item is unjudged and counted as a non-hit; that does not establish dislike. Precision@10 is retained in the downloadable report.</p><div class="bench-story"><section class="panel"><div class="eyebrow">THE SELECTED BLEND</div><h2>Better than the crowd.<br>Within this setup.</h2><div class="metric-line"><strong>${r.test.ndcg10.toFixed(4)}</strong><span>test NDCG@10 / ${r.test.users} eligible users</span></div><div class="metric-line"><strong>+${d.ndcg.toFixed(4)}</strong><span>paired NDCG difference vs popularity</span></div><p>Paired 2,000-resample user-bootstrap interval: <strong>${d.bootstrap95[0].toFixed(4)} to ${d.bootstrap95[1].toFixed(4)}</strong>. This is conditional on the fixed data, split, catalog and selected ranker; it is not an online lift estimate.</p><p>NDCG rewards relevant films near the top. It is not an accuracy percentage. Recall measures the fraction of each eligible user's held-out positive films found in ten suggestions. Hit rate asks whether at least one was found.</p></section><section class="panel"><div class="eyebrow">THE SCOPE IS PART OF THE RESULT</div><h2>Who gets evaluated?</h2><p><strong>${report.testScope.eligibleUsers} / 610 users</strong> have at least five past positive films and at least one test positive inside the catalog. The catalog contains <strong>${report.testScope.inCatalogPositiveEvents} / ${report.testScope.positiveEvents}</strong> test positive events; ${report.testScope.evaluatedPositiveEvents} events enter the eligible-user evaluation.</p><p>This excludes users without enough history and positive films outside the selected catalog. It favors historically popular titles. The dashboard must not be read as a result for all MovieLens films, all users or newly entered taste profiles.</p><p>The selected model exposes ${pct(r.test.catalogCoverage)} of the catalog across all test top-ten lists. Personalized relevance and broad exposure are different goals.</p></section><section class="panel"><div class="eyebrow">THE SIGNALS</div><h2>Three ingredients.<br>One ranked list.</h2><p>Audience similarity uses binary historical likes (ratings ≥4), cosine item similarity and co-like shrinkage <code>n / (n + 10)</code>. Only the strongest 40 outgoing neighbors per film are retained.</p><p>Genre affinity uses a normalized TF-IDF genre profile. Popularity counts historical users who liked each film. Each signal is normalized by its per-query maximum before blending.</p><div class="formula">Selected blend: 75% audience<br>+ 20% genre affinity + 5% popularity</div><p>No-profile input falls back to popularity. The genre-only mode can handle a sparse taste signal, but this training-selected catalog does not evaluate true item cold start.</p></section><section class="panel"><div class="eyebrow">NO TEST-BASED MODEL CHOICE</div><h2>Fit. Select. Refit.<br>Then inspect.</h2><div class="pipeline"><span>Per-user order<br>timestamp → movie ID</span><span>First ~80%<br>fit model & catalog</span><span>Next ~10%<br>choose base ranker</span><span>Last ~10%<br>score frozen choice</span></div><p>The catalog is frozen from training likes only. For the final diagnostic, all candidates are refitted on train + validation, with test ratings excluded. The browser uses this same refit model.</p><p>More variety is an optional browser-only genre-diversification pass over the top 100 eligible candidates. Its results are not the base-ranker scores in this table.</p></section></div><div class="wide-actions"><p>Inspect the full metrics, scope, hashes and paired interval.</p><button class="button primary" id="export-report">Export evaluation ↗</button></div>`;
}
function notes() {
  return `${pageHero("A film club.<br><em>With field notes.</em>", "Frame is an independent educational recommendation project. The data, assumptions and limits belong in the credits.", "FIELD NOTES / THE FULL PICTURE")}<div class="bench-story"><section class="panel"><div class="eyebrow">01 / THE SOURCE</div><h2>One fixed historical cut.</h2><p><a href="https://grouplens.org/datasets/movielens/latest/" target="_blank" rel="noopener">MovieLens latest-small</a>, generated September 26, 2018: 100,836 ratings, 610 anonymous users, 9,742 movie entries. Frame keeps the 1,000 titles with the most training likes, with deterministic movie-ID tie breaks.</p><p>The source is a development dataset that may change over time. Original files, source conditions and SHA-256 hashes accompany this fixed educational study. Metadata may contain errors; the site has no current availability or review feed.</p><p>Credit: F. Maxwell Harper and Joseph A. Konstan (2015), <em>The MovieLens Datasets: History and Context</em>, ACM TiiS. <a href="https://doi.org/10.1145/2827872" target="_blank" rel="noopener">DOI 10.1145/2827872</a>. No GroupLens or University of Minnesota endorsement is implied.</p></section><section class="panel"><div class="eyebrow">02 / YOUR TASTE, LOCALLY</div><h2>No account.<br>No hidden profile.</h2><p>Ranking, searching, favorites, watchlist and file import/export run in this browser. Taste is held in session memory and clears on refresh. The app sends no taste profile to an inference API or database.</p><p>Up to twelve favorites create the interactive taste signal. The offline diagnostic uses all of each eligible historical user's past likes, so its results are not a measured accuracy for these shorter, new profiles.</p><p>Favorites personalize; watchlist saves do not. Hiding a film excludes it from suggestions without retraining the model. Empty taste gets crowd favorites. Your watchlist is not a confirmed viewing history.</p></section><section class="panel"><div class="eyebrow">03 / EXPLANATIONS & COVER ART</div><h2>Show the connection.<br>Keep the judgment.</h2><p>“Because you liked” identifies a positive outgoing item-neighbor contribution from one of your favorites. Shared-genre reasons describe metadata overlap. Neither is a causal explanation of enjoyment.</p><p>Ranking scores are relative signals, not predicted star ratings or probabilities of liking a film. Optional variety trades some base score for less genre repetition. Genre and decade filters narrow candidates before choosing results.</p><p>Every geometric cover is an original code-generated design. There are no official posters, fabricated plot summaries or streaming-service claims.</p></section><section class="panel"><div class="eyebrow">04 / REPRODUCIBILITY & LIMITS</div><h2>A useful diagnostic.<br>A modest claim.</h2><p>The source includes the downloader, deterministic split and fitting pipeline, sparse model, full evaluation, paired user bootstrap, Python/JavaScript ranking parity fixtures, tests, case study and interview guide.</p><p>The per-user split can use other users' later-calendar ratings. Unknown ratings are non-hits, not proven dislikes. The catalog is popularity-selected and covers only part of the held-out positives. These constraints limit external interpretation.</p><p>GroupLens permits research use and redistribution under its original conditions; commercial/revenue-bearing use requires separate permission. Those conditions are retained in the source. Original project code is MIT licensed; that does not relicense the dataset.</p></section></div>`;
}
function showDetail(i) {
  const f = catalog[i], support = state.mode === "content" ? [] : contributions(model, seeds(), i).slice(0, 3), values = currentRanking().scores;
  const likedGenres = new Set(state.favorites.flatMap((j) => catalog[j].genres)), overlap = f.genres.filter((g) => likedGenres.has(g));
  $("film-detail").innerHTML = `<div class="dialog-top"><span>FRAME / THE CONNECTION</span><button id="close-detail" aria-label="Close film details">×</button></div><div class="dialog-body">${poster(i)}<div><div class="eyebrow">${f.year ?? "UNDATED"} / ${f.likes} HISTORY LIKES</div><h2>${esc(title(i))}</h2><p>${esc(reason(i))}</p><div>${f.genres.map((g) => `<span class="genre">${esc(g)}</span>`).join("")}</div><h3 style="margin-top:22px">Why it appeared</h3>${state.mode === "popular" || !state.favorites.length ? "<p>Historical popularity determines this ranking. Your favorites are excluded; no personal similarity is used in this mode or fallback.</p>" : `<p>${state.mode === "content" ? "Genre affinity determines this ranking." : "Audience-neighbor support and/or genre signals contribute to this ranking."}</p>${support.map((s) => `<div class="reason-row"><span>Liked ${esc(title(s.index))}</span><strong>neighbor weight ${s.weight.toFixed(4)}</strong></div>`).join("")}<p>Shared genres: ${overlap.length ? esc(overlap.join(" / ")) : "none with current favorites"}.</p>`}<p class="detail-note">Base score ${values[i].toFixed(4)} · relative ranking signal, not a rating prediction. Neighbor links describe co-like patterns, not the cause of your taste.</p><div class="detail-actions"><button class="button primary" data-save="${i}" aria-pressed="${state.saved.has(i)}">${state.saved.has(i) ? "✓ On watchlist" : "＋ Watchlist"}</button><button class="button" data-add="${i}" ${state.favorites.includes(i) ? "disabled" : ""}>${state.favorites.includes(i) ? "Already a favorite" : "Add to favorites"}</button></div></div></div>`;
  bindButtons($("film-detail"));
  $("close-detail").onclick = () => $("film-dialog").close();
  if (!$("film-dialog").open) $("film-dialog").showModal();
}
function addFavorite(i) {
  if (state.favorites.includes(i)) return;
  if (state.favorites.length >= 12) {
    toast("Twelve favorites is the limit. Remove one to add another.");
    return;
  }
  state.demo = false;
  state.favorites.push(i);
  state.dismissed.delete(i);
  state.limit = 12;
  $("film-dialog").close();
  render();
  toast("Added " + title(i) + " to your taste.");
}
function bindButtons(root) {
  root.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", () => addFavorite(Number(b.dataset.add))));
  root.querySelectorAll("[data-remove]").forEach((b) => b.addEventListener("click", () => {
    state.demo = false;
    state.favorites = state.favorites.filter((i) => i !== Number(b.dataset.remove));
    state.limit = 12;
    render();
  }));
  root.querySelectorAll("[data-detail]").forEach((b) => b.addEventListener("click", () => showDetail(Number(b.dataset.detail))));
  root.querySelectorAll("[data-dismiss]").forEach((b) => b.addEventListener("click", () => {
    state.dismissed.add(Number(b.dataset.dismiss));
    render();
    toast("Film hidden. Bring it back using the reset below the shortlist.");
  }));
  root.querySelectorAll("[data-save]").forEach((b) => b.addEventListener("click", () => {
    const i = Number(b.dataset.save);
    state.saved.has(i) ? state.saved.delete(i) : state.saved.add(i);
    $("saved-count").textContent = state.saved.size;
    document.querySelectorAll(`[data-save="${i}"]`).forEach((el) => {
      el.setAttribute("aria-pressed", String(state.saved.has(i)));
      el.textContent = state.saved.has(i) ? "✓ On watchlist" : "＋ Watchlist";
    });
    if (state.page === "saved") render();
    toast(state.saved.has(i) ? "Saved for a good evening." : "Removed from watchlist.");
  }));
}
function download(name, obj) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" })), a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1e3);
  toast("Prepared " + name);
}
function bind() {
  bindButtons($("content"));
  for (const id of ["open-search", "hero-taste"]) $(id)?.addEventListener("click", () => {
    state.search = true;
    render();
    $("film-search").focus();
  });
  $("close-search")?.addEventListener("click", () => {
    state.search = false;
    render();
  });
  $("film-search")?.addEventListener("input", (e) => {
    state.query = e.target.value;
    $("search-results").innerHTML = searchResults();
    bindButtons($("search-results"));
  });
  $("clear-taste")?.addEventListener("click", () => {
    state.demo = false;
    state.favorites = [];
    state.limit = 12;
    render();
    toast("Taste cleared. Crowd favorites are the fallback.");
  });
  document.querySelectorAll("[data-preset]").forEach((b) => b.addEventListener("click", () => {
    const ids = { adventure: [2571, 260, 1196], warm: [1, 356, 318], crime: [296, 858, 50] }[b.dataset.preset];
    state.demo = true;
    state.favorites = ids.filter((id) => idMap.has(id)).map((id) => idMap.get(id));
    state.dismissed.clear();
    state.limit = 12;
    render();
    toast("Example taste loaded; replace it with your own favorites.");
  }));
  for (const k of ["mode", "genre", "decade"]) $(k)?.addEventListener("change", (e) => {
    state[k] = e.target.value;
    state.limit = 12;
    render();
  });
  $("variety")?.addEventListener("change", (e) => {
    state.variety = e.target.checked;
    render();
  });
  $("reset-filters")?.addEventListener("click", () => {
    state.genre = "all";
    state.decade = "all";
    state.variety = false;
    state.limit = 12;
    render();
  });
  $("reset-hidden")?.addEventListener("click", () => {
    state.dismissed.clear();
    render();
    toast("Hidden films restored.");
  });
  $("show-more")?.addEventListener("click", () => {
    state.limit = Math.min(48, state.limit + 12);
    render();
    if (state.limit === 48) toast("Showing up to 48 discoveries. Try a filter to narrow the scene.");
  });
  $("export-report")?.addEventListener("click", () => download("frame-evaluation.json", report));
  $("export-taste")?.addEventListener("click", () => download("frame-taste.json", { schema: "frame-taste-v1", mode: state.mode, favorites: state.favorites.map((i) => model.ids[i]), saved: [...state.saved].map((i) => model.ids[i]), dismissed: [...state.dismissed].map((i) => model.ids[i]), notice: "Historical research catalog; ranking scores are not enjoyment probabilities." }));
  $("import-taste")?.addEventListener("click", () => $("taste-file").click());
  $("taste-file")?.addEventListener("change", async (e) => {
    try {
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > 1e5) throw new Error("Choose a file smaller than 100 KB.");
      const x = validateTaste(JSON.parse(await f.text()), model.ids);
      state.demo = false;
      state.favorites = x.favorites.map((id) => idMap.get(id));
      state.saved = new Set(x.saved.map((id) => idMap.get(id)));
      state.dismissed = new Set(x.dismissed.map((id) => idMap.get(id)));
      state.mode = x.mode;
      state.genre = "all";
      state.decade = "all";
      state.variety = false;
      render();
      toast("Taste imported locally.");
    } catch (err) {
      toast("Import could not load: " + err.message);
    }
  });
}
function render() {
  const focus = document.activeElement?.id;
  $("content").innerHTML = ({ discover, saved, bench, notes }[state.page] || discover)();
  $("saved-count").textContent = state.saved.size;
  document.querySelectorAll("[data-page]").forEach((a) => {
    const active = a.dataset.page === state.page;
    a.classList.toggle("active", active);
    if (active) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  document.title = { discover: "Discover", saved: "Your watchlist", bench: "The algorithm", notes: "Field notes" }[state.page] + " / Frame";
  bind();
  if (focus) $(focus)?.focus({ preventScroll: true });
}
function route() {
  state.page = ["discover", "saved", "bench", "notes"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "discover";
  render();
}
try {
  [model, catalog, report] = await Promise.all(["model", "catalog", "evaluation"].map(async (key) => {
    const r = await fetch("./data/" + key + ".json");
    if (!r.ok) throw new Error("Could not load " + key);
    return r.json();
  }));
  idMap = new Map(model.ids.map((id, i) => [id, i]));
  state.mode = report.selected;
  state.favorites = [2571, 260, 1196].filter((id) => idMap.has(id)).map((id) => idMap.get(id));
  window.addEventListener("hashchange", () => {
    // A skip link is an in-page focus action, not a request for the default route.
    if (location.hash === "#main") {
      $("main").focus();
      return;
    }
    route();
    window.scrollTo({ top: 0, behavior: "instant" });
    $("main").focus({ preventScroll: true });
  });
  route();
} catch (err) {
  $("content").innerHTML = '<div class="empty" role="alert">The catalog could not load. Reload or use the included local HTTP server.</div>';
  console.error(err);
}
