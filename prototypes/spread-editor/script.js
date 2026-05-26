// Folio — spread-first editor visual prototype.
// Throwaway. No engine wiring. Mock analysis only.

const PLACEMENTS = ["text-left", "text-right", "text-top", "text-bottom", "wordless"];

const PLACEMENT_ICONS = {
  "text-left":   `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="1.5" y="2.5" width="6" height="11"/><rect x="8.5" y="2.5" width="6" height="11" stroke-dasharray="1 1.5"/></svg>`,
  "text-right":  `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="1.5" y="2.5" width="6" height="11" stroke-dasharray="1 1.5"/><rect x="8.5" y="2.5" width="6" height="11"/></svg>`,
  "text-top":    `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="1.5" y="2.5" width="13" height="3"/><rect x="1.5" y="6.5" width="13" height="7" stroke-dasharray="1 1.5"/></svg>`,
  "text-bottom": `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="1.5" y="2.5" width="13" height="7" stroke-dasharray="1 1.5"/><rect x="1.5" y="10.5" width="13" height="3"/></svg>`,
  "wordless":    `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="1.5" y="2.5" width="13" height="11" stroke-dasharray="1 1.5"/></svg>`,
};

const TRIM_TO_ASPECT = {
  "8.5x8.5": [1, 1],
  "8x10":    [4, 5],
  "10x8":    [5, 4],
  "7x7":     [1, 1],
  "5x7":     [5, 7],
};

const TRIMS_BY_CONSTRUCTION = {
  picture: ["8.5x8.5", "8x10", "10x8"],
  board:   ["7x7", "5x7"],
};

const TILE_BASE_BY_CONSTRUCTION = {
  picture: 360,
  board:   280,
};

const SPREADS_BY_CONSTRUCTION = {
  picture: 16,
  board:   12,
};

const WORD_TARGETS = {
  picture: { total: 600, perSpread: { soft: 45, hard: 60 } },
  board:   { total: 100, perSpread: { soft: 15, hard: 25 } },
};

// Sample manuscript — original, not lifted from anywhere.
// Index is 1-based to match the engine's Spread.index convention.
const SAMPLE_MANUSCRIPT = [
  { index: 1,  text: "The Morning Walk",                                                        placement: "text-bottom", wordless: false },
  { index: 2,  text: "Before the sun came up, Mira put on her boots.",                          placement: "text-left",   wordless: false },
  { index: 3,  text: "She tiptoed past her brother. He was still asleep.",                      placement: "text-right",  wordless: false },
  { index: 4,  text: "Outside, the grass was wet and the air smelled like rain.",               placement: "text-bottom", wordless: false },
  { index: 5,  text: "A small brown rabbit watched her from the hedge.",                        placement: "text-left",   wordless: false },
  { index: 6,  text: "“Where are you going?” the rabbit seemed to ask.",                        placement: "text-right",  wordless: false },
  { index: 7,  text: "“To the pond,” said Mira. “I want to see the fog.”",                      placement: "text-top",    wordless: false },
  { index: 8,  text: "The pond was quiet. The fog hung low over the water.",                    placement: "text-bottom", wordless: false },
  { index: 9,  text: "Mira sat very still. A heron stood at the far edge.",                     placement: "text-left",   wordless: false },
  { index: 10, text: "She held her breath. The heron didn’t move.",                             placement: "text-right",  wordless: false },
  { index: 11, text: "",                                                                         placement: "wordless",    wordless: true  },
  { index: 12, text: "Then, slowly, it lifted one long leg.",                                   placement: "text-bottom", wordless: false },
  { index: 13, text: "Mira watched until the sun rose behind the trees.",                       placement: "text-left",   wordless: false },
  { index: 14, text: "She walked home. The grass had begun to dry.",                            placement: "text-right",  wordless: false },
  { index: 15, text: "Her brother was eating toast at the table. “You’re up early,” he said.",  placement: "text-bottom", wordless: false },
  { index: 16, text: "Mira smiled.",                                                             placement: "text-bottom", wordless: false },
];

// Mock reach words — would come from the engine in real life.
const REACH_WORDS = new Set([
  "tiptoed", "hedge", "heron", "lifted",
]);

const REACH_REASONS = {
  tiptoed: "tier-2 — quiet motion, low frequency for ages 3–5",
  hedge:   "tier-2 — domain word, may need illustration support",
  heron:   "tier-3 — proper noun-adjacent, low frequency",
  lifted:  "morphologically complex — past-tense of an action verb",
};

// ---------- state ----------

let manuscript = clone(SAMPLE_MANUSCRIPT);
let ageBand = "picture";
let trimSize = "8.5x8.5";

// ---------- helpers ----------

function clone(arr) { return JSON.parse(JSON.stringify(arr)); }

function countWords(s) {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function isPaired(index, total) {
  return index !== 1 && index !== total;
}

function wordStatus(count, target) {
  if (count === 0) return "neutral";
  if (count <= target.soft) return "green";
  if (count <= target.hard) return "amber";
  return "red";
}

function decorateReachWords(text) {
  // tokenize, preserving original spacing; wrap reach matches in spans.
  const out = [];
  // split on word boundaries but keep delimiters
  const parts = text.split(/(\b[\w’']+\b)/);
  for (const part of parts) {
    const key = part.toLowerCase().replace(/[’']/g, "");
    if (REACH_WORDS.has(key)) {
      const reason = REACH_REASONS[key] ?? "reach word";
      out.push(`<span class="reach-word" title="${escapeAttr(reason)}">${escapeHtml(part)}</span>`);
    } else {
      out.push(escapeHtml(part));
    }
  }
  return out.join("");
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

function escapeAttr(s) { return escapeHtml(s); }

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// ---------- rendering ----------

function setAspectFromTrim() {
  const [w, h] = TRIM_TO_ASPECT[trimSize];
  const tileBase = TILE_BASE_BY_CONSTRUCTION[ageBand];
  document.documentElement.style.setProperty("--tile-w", w);
  document.documentElement.style.setProperty("--tile-h", h);
  document.documentElement.style.setProperty("--tile-base", `${tileBase}px`);
}

function renderEditor() {
  const surface = document.getElementById("editor-surface");
  surface.innerHTML = "";

  const total = SPREADS_BY_CONSTRUCTION[ageBand];
  // ensure manuscript length matches construction
  while (manuscript.length < total) {
    manuscript.push({
      index: manuscript.length + 1,
      text: "",
      placement: "text-bottom",
      wordless: false,
    });
  }
  if (manuscript.length > total) {
    manuscript = manuscript.slice(0, total);
  }

  const target = WORD_TARGETS[ageBand].perSpread;

  for (let i = 0; i < total; i++) {
    const spread = manuscript[i];
    const paired = isPaired(spread.index, total);

    const row = document.createElement("div");
    row.className = "spread-row";

    // meta row (label + placement picker + word count)
    const meta = document.createElement("div");
    meta.className = "spread-meta";

    const [w, h] = TRIM_TO_ASPECT[trimSize];
    const tileBase = TILE_BASE_BY_CONSTRUCTION[ageBand];
    const rowW = paired
      ? `${tileBase * 2 * (w / h)}px`
      : `${tileBase * (w / h)}px`;
    meta.style.setProperty("--row-w", rowW);

    const label = document.createElement("span");
    label.textContent = `Spread ${spread.index} of ${total}`;
    meta.appendChild(label);

    const picker = document.createElement("div");
    picker.className = "placement-picker";
    for (const p of PLACEMENTS) {
      const btn = document.createElement("button");
      btn.className = "placement-btn";
      btn.type = "button";
      btn.title = p;
      btn.setAttribute("aria-pressed", spread.placement === p ? "true" : "false");
      btn.innerHTML = PLACEMENT_ICONS[p];
      btn.addEventListener("click", () => {
        spread.placement = p;
        spread.wordless = p === "wordless";
        renderEditor();
        updateReadability();
      });
      picker.appendChild(btn);
    }
    meta.appendChild(picker);

    const count = countWords(spread.text);
    const status = wordStatus(count, target);
    const badge = document.createElement("span");
    badge.className = "word-badge";
    badge.dataset.status = status;
    badge.textContent = `${count} words`;
    meta.appendChild(badge);

    row.appendChild(meta);

    // the spread itself
    const spreadEl = document.createElement("div");
    spreadEl.className = "spread";
    spreadEl.dataset.paired = String(paired);
    spreadEl.dataset.placement = spread.placement;
    spreadEl.style.setProperty("--tile-base", `${tileBase}px`);

    if (spread.placement !== "wordless") {
      const textZone = document.createElement("div");
      textZone.className = "text-zone";
      const content = document.createElement("div");
      content.className = "text-content";
      content.contentEditable = "true";
      content.spellcheck = false;
      content.dataset.placeholder = "Type the spread’s text…";
      content.dataset.index = String(i);
      content.innerHTML = decorateReachWords(spread.text);
      textZone.appendChild(content);
      spreadEl.appendChild(textZone);
    }

    const ill = document.createElement("div");
    ill.className = "illustration-zone";
    spreadEl.appendChild(ill);

    row.appendChild(spreadEl);
    surface.appendChild(row);

    // page-turn chevron between spreads
    if (i < total - 1) {
      const turn = document.createElement("div");
      turn.className = "page-turn";
      turn.innerHTML = `
        <span>page turn</span>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4">
          <path d="M6 3l5 5-5 5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="hover-info">spread ${spread.index + 1} of ${total} — ${arcPosition(spread.index + 1, total)}</span>
      `;
      surface.appendChild(turn);
    }
  }

  // wire up text editing — debounced reflow + reach decoration on blur
  surface.querySelectorAll(".text-content").forEach((el) => {
    el.addEventListener("input", onTextInput);
    el.addEventListener("blur", onTextBlur);
  });
}

function arcPosition(index, total) {
  const ratio = index / total;
  if (ratio <= 0.2) return "opening — establish world";
  if (ratio <= 0.4) return "rising — first turn";
  if (ratio <= 0.7) return "middle — sustained action";
  if (ratio <= 0.9) return "climax zone";
  return "resolution";
}

// ---------- editing ----------

const debouncedReadability = debounce(updateReadability, 320);

function onTextInput(e) {
  const el = e.currentTarget;
  const idx = Number(el.dataset.index);
  manuscript[idx].text = el.innerText;

  // live word count badge
  const badge = el.closest(".spread-row")?.querySelector(".word-badge");
  if (badge) {
    const target = WORD_TARGETS[ageBand].perSpread;
    const count = countWords(manuscript[idx].text);
    badge.textContent = `${count} words`;
    badge.dataset.status = wordStatus(count, target);
  }

  debouncedReadability();
}

function onTextBlur(e) {
  // re-render reach decoration without resetting caret mid-typing.
  const el = e.currentTarget;
  const idx = Number(el.dataset.index);
  manuscript[idx].text = el.innerText;
  el.innerHTML = decorateReachWords(manuscript[idx].text);
}

// ---------- readability sidebar (mock) ----------

function updateReadability() {
  const total = manuscript.reduce((sum, s) => sum + countWords(s.text), 0);
  const target = WORD_TARGETS[ageBand].total;

  document.getElementById("total-words").textContent = total;
  document.getElementById("total-target").textContent = target;

  const meter = document.getElementById("word-meter-fill");
  const pct = Math.min(100, (total / target) * 100);
  meter.style.width = `${pct}%`;
  meter.dataset.status = total <= target * 0.85
    ? "green"
    : total <= target ? "amber" : "red";

  // reach
  const allText = manuscript.map((s) => s.text).join(" ");
  const reachHits = [];
  for (const word of REACH_WORDS) {
    const re = new RegExp(`\\b${word}\\b`, "i");
    if (re.test(allText)) reachHits.push(word);
  }
  document.getElementById("reach-count").textContent = reachHits.length;
  const reachList = document.getElementById("reach-list");
  reachList.innerHTML = reachHits
    .map((w) => `<li title="${escapeAttr(REACH_REASONS[w])}">${escapeHtml(w)}</li>`)
    .join("");

  // vocabulary (extremely rough mock — only here for visual rhythm)
  const tokens = allText.toLowerCase().match(/\b[\w’']+\b/g) ?? [];
  const unique = new Set(tokens);
  const sightWordList = new Set(["the", "a", "and", "to", "of", "in", "it", "is", "she", "he", "her", "his", "they", "was", "had"]);
  const sightHits = tokens.filter((t) => sightWordList.has(t)).length;

  document.getElementById("tier1").textContent = tokens.length ? `${Math.round(85)}%` : "—";
  document.getElementById("tier2").textContent = tokens.length ? `${Math.round(11)}%` : "—";
  document.getElementById("sight").textContent = tokens.length ? `${Math.round((sightHits / tokens.length) * 100)}%` : "—";
  document.getElementById("unique").textContent = unique.size || "—";
}

// ---------- construction picker ----------

function syncTrimOptions() {
  const sel = document.getElementById("trim-size");
  const allowed = TRIMS_BY_CONSTRUCTION[ageBand];
  for (const opt of sel.options) {
    opt.hidden = !allowed.includes(opt.value);
  }
  if (!allowed.includes(trimSize)) {
    trimSize = allowed[0];
    sel.value = trimSize;
  }
}

function wirePicker() {
  document.getElementById("age-band").addEventListener("change", (e) => {
    ageBand = e.target.value;
    syncTrimOptions();
    setAspectFromTrim();
    renderEditor();
    updateReadability();
  });
  document.getElementById("trim-size").addEventListener("change", (e) => {
    trimSize = e.target.value;
    setAspectFromTrim();
    renderEditor();
  });
  document.getElementById("body-font").addEventListener("change", (e) => {
    const font = e.target.value === "atkinson"
      ? "var(--font-sans)"
      : "var(--font-serif)";
    document.documentElement.style.setProperty("--body-font", font);
  });
  document.getElementById("reset-text").addEventListener("click", () => {
    manuscript = clone(SAMPLE_MANUSCRIPT);
    if (ageBand === "board") {
      manuscript = manuscript.slice(0, SPREADS_BY_CONSTRUCTION.board);
    }
    renderEditor();
    updateReadability();
  });
}

// ---------- init ----------

syncTrimOptions();
setAspectFromTrim();
renderEditor();
updateReadability();
wirePicker();
