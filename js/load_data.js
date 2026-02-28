async function loadPublications() {
  const container = document.getElementById("publications");
  if (!container) return;
  const res = await fetch("data/publications.json");
  const papers = await res.json();

  function createList(items) {
    const ul = document.createElement("ul");
    ul.className = "paper-list";
    items.forEach(p => {
      const authors = p.authors.replaceAll(
        "Edoardo Loru",
        "<b>Edoardo Loru</b>"
      );
      const li = document.createElement("li");
      if (p.selected) li.classList.add("selected-paper");
      const star = p.selected ? '<span class="star">★</span> ' : '';
      li.innerHTML = `
            <details class="paper-entry">
               <summary>
                  <a data-tooltip="click me!">"${p.title}"</a>
            <span class="paper-meta">
              ,<em> ${p.venue}</em>, ${p.year}
            </span>
          </summary>
          <div class="abstract-box">
            <p>
              authors:
              <br>
              ${authors}
              <br><br>
              ${p.highlights ? `
              highlights:
              <ul>
                ${p.highlights.map(hl => `<li>${hl}</li>`).join('')}
              </ul><br>` : ''}
              abstract:
              <br>
              ${p.abstract}
              <br><br>
              doi:
              <br>
              <a href="https://doi.org/${p.doi}" target="_blank">${p.doi}</a>
              <br><br>
              cite:
              <br>
              ${p.cite}
              <br>
              <a href="https://doi2bib.org/bib/${p.doi}" target="_blank">{bib}</a>
            </p>
          </div>
        </details>
      `;
      ul.appendChild(li);
    });
    return ul;
  }

  const preprints = papers.filter(p => p.venue === "arXiv");
  const publications = papers.filter(p => p.venue !== "arXiv");

  if (publications.length > 0) {
    const h3pub = document.createElement("h3");
    h3pub.textContent = "Publications";
    container.appendChild(h3pub);
    container.appendChild(createList(publications));
  }

  if (preprints.length > 0) {
    const h3pre = document.createElement("h3");
    h3pre.textContent = "Preprints";
    container.appendChild(h3pre);
    container.appendChild(createList(preprints));
  }
}

async function loadTools() {
  const container = document.getElementById("tools");
  if (!container) return;

  const res = await fetch("data/tools.json");
  const data = await res.json();

  Object.entries(data).forEach(([category, tools]) => {
    const li = document.createElement("li");

    const links = tools
      .map(
        t =>
          `<a href="${t.url}" target="_blank" data-tooltip="${t.tooltip}">${t.name}</a>`
      )
      .join(", ");

    li.innerHTML = `<b>${category}</b>: ${links}`;
    container.appendChild(li);
  });
}

async function loadMedia() {
  const container = document.getElementById("media");
  if (!container) return;

  const res = await fetch("data/media.json");
  const data = await res.json();

  const ul = document.createElement("ul");
  ul.className = "media-list";

  data.media.forEach(m => {
    const li = document.createElement("li");
    li.innerHTML = `<a href="${m.url}" target="_blank">"${m.name}"</a>, <i>${m.source}</i>, ${m.date}`
    ul.appendChild(li)
  })
  container.appendChild(ul)
}

document.addEventListener("DOMContentLoaded", () => {
  loadPublications();
  loadMedia();
  loadTools();
});
