/*
  Builds the publications, talks, media and tools sections from data/*.json.

  data/publications.json  list of papers, newest first:
    title, venue, year, authors, abstract, doi, cite
    latest      true to show it in the "latest" block (hidden when no paper
                has it)
    selected    true to also show it in the "selected" block
    highlights  optional list of short sentences
    (venue "arXiv" marks a preprint)

  data/talks.json  { "talks": [...] }, newest first:
    year, title, kind ("invited seminar", "contributed talk", ...)
    event       optional { name, url, tooltip }
    hosts       optional list of { name, url }, shown as "hosted by ..."
    video       optional url

  data/media.json  { "media": [...] }, newest first:
    name, source, date, url
    lang        "it", "en", "es", ...
    selected    true to show it in the top block

  data/tools.json  { "<category>": [ { name, url, tooltip } ] }
*/

const OWNER = "Edoardo Loru";
const SCHOLAR_URL = "https://scholar.google.com/citations?user=q8-1yvMAAAAJ&hl=it";

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

async function getJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

function showError(container, what, err) {
  console.error(err);
  container.innerHTML = `<p class="error">Couldn't load ${what} (${esc(err.message)}).</p>`;
}

/* ---------- Publications ---------- */

const isPreprint = p => p.venue === "arXiv";

function authorsHTML(p) {
  return esc(p.authors).replaceAll(OWNER, `<strong>${OWNER}</strong>`);
}

function highlightsHTML(p) {
  if (!p.highlights?.length) return "";
  return `<ul class="highlights">${p.highlights.map(h => `<li>${esc(h)}</li>`).join("")}</ul>`;
}

function paperActions(p, abstractId) {
  return `
    <div class="actions">
      ${abstractId ? `<button class="btn small" type="button" aria-expanded="false" aria-controls="${abstractId}">abstract ▾</button>` : ""}
      <a class="btn small" href="https://doi.org/${esc(p.doi)}" target="_blank">paper ↗</a>
      <a class="btn small" href="https://doi2bib.org/bib/${esc(p.doi)}" target="_blank">bib ↗</a>
      <button class="btn small" type="button" data-copy="${esc(p.doi)}">copy doi</button>
      <button class="btn small" type="button" data-copy="${esc(p.cite)}">copy citation</button>
    </div>`;
}

// prefix keeps abstract ids unique when a paper is both latest and selected
const featuredPaper = prefix => (p, i) => {
  const id = `abstract-${prefix}-${i}`;
  return `
    <article class="featured-paper">
      <h4>${esc(p.title)}</h4>
      <p class="authors">${authorsHTML(p)}</p>
      <div class="meta">${esc(p.venue)} · ${esc(p.year)}${isPreprint(p) ? ` <span class="tag">preprint</span>` : ""}</div>
      ${highlightsHTML(p)}
      ${paperActions(p, id)}
      <div class="abstract" id="${id}" hidden><p>${esc(p.abstract)}</p></div>
    </article>`;
};

function paperRow(p) {
  const tags = isPreprint(p) ? `<span class="tag">preprint</span>` : "";
  return `
    <details class="paper">
      <summary>
        <span>
          <span class="paper-title">${esc(p.title)}</span>
          <span class="meta">· ${esc(p.venue)}</span> ${tags}
        </span>
      </summary>
      <div class="paper-body">
        <p class="authors">${authorsHTML(p)}</p>
        ${highlightsHTML(p)}
        <p>${esc(p.abstract)}</p>
        ${paperActions(p)}
      </div>
    </details>`;
}

async function loadPublications() {
  const latestEl = document.getElementById("papers-latest");
  const selectedEl = document.getElementById("papers-selected");
  const allEl = document.getElementById("papers-all");
  if (!latestEl || !selectedEl || !allEl) return;

  let papers;
  try {
    papers = await getJSON("data/publications.json");
  } catch (err) {
    showError(selectedEl, `the list of papers. See <a href="${SCHOLAR_URL}">Google Scholar</a> instead`, err);
    return;
  }

  document.getElementById("pub-count").textContent = papers.length;
  document.getElementById("all-count").textContent = `(${papers.length})`;

  const latest = papers.filter(p => p.latest);
  latestEl.innerHTML = latest.map(featuredPaper("latest")).join("");
  document.getElementById("latest-block").hidden = latest.length === 0;
  selectedEl.innerHTML = papers.filter(p => p.selected).map(featuredPaper("selected")).join("");

  // Group by year, keeping the hand-written order inside each year
  const years = new Map();
  [...papers].sort((a, b) => b.year - a.year).forEach(p => {
    if (!years.has(p.year)) years.set(p.year, []);
    years.get(p.year).push(p);
  });

  allEl.innerHTML = [...years].map(([year, list]) => `
    <div class="year-group">
      <h4 class="group-title">${esc(year)}</h4>
      ${list.map(paperRow).join("")}
    </div>`).join("");
}

/* ---------- Talks ---------- */

function linkHTML(item) {
  const tip = item.tooltip ? ` data-tooltip="${esc(item.tooltip)}"` : "";
  return `<a href="${esc(item.url)}" target="_blank"${tip}>${esc(item.name)}</a>`;
}

// "A", "A and B", "A, B and C"
function joinNames(list) {
  const names = list.map(linkHTML);
  return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

async function loadTalks() {
  const container = document.getElementById("talks-list");
  if (!container) return;

  let talks;
  try {
    talks = (await getJSON("data/talks.json")).talks;
  } catch (err) {
    showError(container, "the list of talks", err);
    return;
  }

  container.innerHTML = `
    <ul class="rows">
      ${talks.map(t => {
        const meta = [esc(t.kind)];
        if (t.event) meta.push(linkHTML(t.event));
        if (t.hosts?.length) meta.push(`hosted by ${joinNames(t.hosts)}`);
        if (t.video) meta.push(`<a href="${esc(t.video)}" target="_blank">video ↗</a>`);
        return `
          <li>
            <span class="row-date">${esc(t.year)}</span>
            <div>
              ${esc(t.title)}
              <div class="meta">${meta.join(" · ")}</div>
            </div>
          </li>`;
      }).join("")}
    </ul>`;
}

/* ---------- Media ---------- */

function mediaLink(m) {
  return `<a href="${esc(m.url)}" target="_blank"${m.lang ? ` lang="${esc(m.lang)}"` : ""}>${esc(m.name)}</a>`;
}

function langTag(m) {
  return m.lang ? ` <span class="tag">${esc(m.lang)}</span>` : "";
}

async function loadMedia() {
  const container = document.getElementById("media-list");
  if (!container) return;

  let media;
  try {
    media = (await getJSON("data/media.json")).media;
  } catch (err) {
    showError(container, "the media list", err);
    return;
  }

  const selected = media.filter(m => m.selected);
  const others = media.filter(m => !m.selected);
  const featured = selected.length ? `
    <dl class="kv featured">
      ${selected.map(m => `
        <dt>${esc(m.source)}</dt>
        <dd>${mediaLink(m)}<div class="meta">${esc(m.date)}${langTag(m)}</div></dd>`).join("")}
    </dl>` : "";

  container.innerHTML = `
    ${featured}
    <details class="fold">
      <summary>other coverage (${others.length})</summary>
      <ul class="rows">
        ${others.map(m => `
          <li>
            <span class="row-date">${esc(m.date)}</span>
            <div>${mediaLink(m)}<div class="meta">${esc(m.source)}${langTag(m)}</div></div>
          </li>`).join("")}
      </ul>
    </details>`;
}

/* ---------- Tools ---------- */

async function loadTools() {
  const container = document.getElementById("tools-list");
  if (!container) return;

  let data;
  try {
    data = await getJSON("data/tools.json");
  } catch (err) {
    showError(container, "the list of tools", err);
    return;
  }

  container.innerHTML = `
    <dl class="kv">
      ${Object.entries(data).map(([category, tools]) => `
        <dt>${esc(category)}</dt>
        <dd>${tools.map(t => `<a href="${esc(t.url)}" target="_blank" data-tooltip="${esc(t.tooltip)}">${esc(t.name)}</a>`).join(", ")}</dd>`).join("")}
    </dl>`;
}

/* ---------- Page behaviour ---------- */

// One listener for the buttons built above (abstract toggles, copy citation)
document.addEventListener("click", async e => {
  const toggle = e.target.closest("button[aria-controls]");
  if (toggle) {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", open);
    document.getElementById(toggle.getAttribute("aria-controls")).hidden = !open;
    return;
  }

  const copy = e.target.closest("button[data-copy]");
  if (copy) {
    // Freeze the width so the shorter "copied" label doesn't resize the button
    copy.dataset.label ??= copy.textContent;
    copy.style.width = `${copy.getBoundingClientRect().width}px`;
    try {
      await navigator.clipboard.writeText(copy.dataset.copy);
      copy.textContent = "copied";
    } catch {
      copy.textContent = "failed";
    }
    clearTimeout(copy.resetTimer);
    copy.resetTimer = setTimeout(() => {
      copy.textContent = copy.dataset.label;
      copy.style.width = "";
    }, 1500);
  }
});

// Tooltips open to the left when the link is close to the right edge
function placeTooltip(e) {
  const el = e.target.closest?.("[data-tooltip]");
  if (!el) return;
  const room = document.documentElement.clientWidth - el.getBoundingClientRect().left;
  el.classList.toggle("tip-flip", room < 320);
}
document.addEventListener("pointerover", placeTooltip);
document.addEventListener("focusin", placeTooltip);

// Email: the HTML holds the address reversed and split, so it is only
// put together here, in the browser
function showEmail() {
  const el = document.getElementById("email");
  if (!el) return;
  const flip = s => [...s].reverse().join("");
  const address = `${flip(el.dataset.user)}@${flip(el.dataset.domain)}`;
  el.href = `mailto:${address}`;
  el.textContent = address;
}

// Theme button cycles: follow the system → light → dark → follow the system.
// The choice is kept in localStorage; the inline script in <head> applies it early.
const THEMES = [
  { name: "auto", icon: "◐", label: "Theme: follows your system. Switch to light" },
  { name: "light", icon: "☀\uFE0E", label: "Theme: light. Switch to dark" },
  { name: "dark", icon: "☾", label: "Theme: dark. Switch to follow your system" }
];

function setupThemeToggle() {
  const button = document.getElementById("theme-toggle");
  if (!button) return;
  const root = document.documentElement;
  let index = Math.max(0, THEMES.findIndex(t => t.name === root.dataset.theme));

  const render = () => {
    const theme = THEMES[index];
    button.textContent = theme.icon;
    button.dataset.mode = theme.name;
    button.title = theme.label;
    button.setAttribute("aria-label", theme.label);
  };

  button.addEventListener("click", () => {
    index = (index + 1) % THEMES.length;
    const name = THEMES[index].name;
    if (name === "auto") delete root.dataset.theme;
    else root.dataset.theme = name;
    try {
      if (name === "auto") localStorage.removeItem("theme");
      else localStorage.setItem("theme", name);
    } catch {}
    render();
  });

  render();
  button.hidden = false;
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  showEmail();
  setupThemeToggle();
  loadPublications();
  loadTalks();
  loadMedia();
  loadTools();
});
