import * as webllm from "https://esm.run/@mlc-ai/web-llm";
import { catalog, distinct } from "./payloads.js";

const $ = (id) => document.getElementById(id);

const el = {
  model: $("model"), load: $("load"), status: $("status"), progress: $("progress"),
  rCat: $("r-cat"), rTech: $("r-tech"), rCtx: $("r-ctx"), rSearch: $("r-search"), rRows: $("r-rows"), rCount: $("r-count"),
  rTarget: $("r-target"), rOut: $("r-out"), rGen: $("r-gen"), rExplain: $("r-explain"), rStop: $("r-stop"), rCopy: $("r-copy"),
  iCat: $("i-cat"), iTech: $("i-tech"), iSearch: $("i-search"), iEnc: $("i-enc"), iList: $("i-list"), iCount: $("i-count"),
  iTarget: $("i-target"), iBuild: $("i-build"), iGen: $("i-gen"), iStop: $("i-stop"), iCopy: $("i-copy"), iDl: $("i-dl"),
  toast: $("toast"),
};

let engine = null;
let selected = "";
let generationRun = 0;

// ---- model picker -------------------------------------------------

function pickModels() {
  const list = webllm.prebuiltAppConfig?.model_list || [];
  const ids = list.map((m) => m.model_id || m.model).filter(Boolean)
    .filter((id) => /(instruct|-it-)/i.test(id) && /q4f(16|32)/i.test(id));
  const bestByFamily = new Map();
  for (const id of ids) {
    const family = modelFamily(id);
    if (!family) continue;
    const current = bestByFamily.get(family);
    if (!current || modelRank(id) < modelRank(current)) bestByFamily.set(family, id);
  }
  const familyOrder = ["llama", "gemma", "qwen", "phi", "olmo", "mistral", "smol", "redpajama"];
  const curated = familyOrder.map((family) => bestByFamily.get(family)).filter(Boolean).slice(0, 5);
  return curated.length ? curated : ids.slice(0, 5);
}

function modelFamily(id) {
  const name = id.toLowerCase();
  if (name.includes("llama")) return "llama";
  if (name.includes("gemma")) return "gemma";
  if (name.includes("qwen")) return "qwen";
  if (name.includes("phi")) return "phi";
  if (name.includes("olmo")) return "olmo";
  if (name.includes("mistral")) return "mistral";
  if (name.includes("smollm") || name.includes("smol")) return "smol";
  if (name.includes("redpajama")) return "redpajama";
  return "";
}

function modelRank(id) {
  const size = id.match(/(\d+(?:\.\d+)?)B/i);
  const params = size ? Number(size[1]) : 99;
  const quant = /q4f16/i.test(id) ? 0 : /q4f32/i.test(id) ? 0.2 : 1;
  const extra = /-MLC-1k/i.test(id) ? 0.1 : 0;
  return params + quant + extra;
}

function modelLabel(id) {
  const family = modelFamily(id);
  const title = family ? family[0].toUpperCase() + family.slice(1) : "Model";
  const size = id.match(/(\d+(?:\.\d+)?B)/i)?.[1] || "small";
  const quant = id.match(/q4f(16|32)/i)?.[0] || "q4";
  return `${title} ${size} (${quant})`;
}

function fillModels() {
  const ids = pickModels();
  if (!navigator.gpu) {
    el.status.textContent = "this browser has no WebGPU - use Chrome/Edge/Brave to run the model";
    el.load.disabled = true;
  }
  if (!ids.length) {
    el.model.innerHTML = `<option>none available</option>`;
    return;
  }
  el.model.innerHTML = ids.map((id) => `<option value="${id}">${modelLabel(id)}</option>`).join("");
  const fav = ids.find((id) => /Llama-3.2-1B/.test(id));
  if (fav) el.model.value = fav;
}

async function loadModel() {
  const id = el.model.value;
  el.load.disabled = true;
  el.status.className = "status busy";
  setBusyButtons(true);
  try {
    engine = await webllm.CreateMLCEngine(id, {
      initProgressCallback: (r) => {
        el.progress.style.width = Math.round((r.progress || 0) * 100) + "%";
        el.status.textContent = r.text || "loading";
      },
    });
    el.status.textContent = "loaded " + modelLabel(id);
    el.status.className = "status loaded";
    el.progress.style.width = "100%";
    el.rGen.disabled = el.rExplain.disabled = el.iGen.disabled = false;
  } catch (e) {
    el.status.textContent = "load failed: " + (e.message || e);
    el.status.className = "status";
    el.load.disabled = false;
  } finally {
    setBusyButtons(false);
  }
}

// ---- repeater -----------------------------------------------------

function fillSelect(node, values, includeAny) {
  const opts = includeAny ? ["any", ...values] : values;
  node.innerHTML = opts.map((v) => `<option value="${v}">${v}</option>`).join("");
}

function repeaterCats() {
  el.rCat.innerHTML = Object.keys(catalog)
    .map((k) => `<option value="${k}">${catalog[k].label}</option>`).join("");
}

function repeaterFilters() {
  const k = el.rCat.value;
  fillSelect(el.rTech, distinct(k, "t"), true);
  fillSelect(el.rCtx, distinct(k, "c"), true);
  renderRows();
}

function matched() {
  const k = el.rCat.value, t = el.rTech.value, c = el.rCtx.value;
  const q = el.rSearch.value.trim().toLowerCase();
  return catalog[k].items.filter((it) =>
    (t === "any" || it.t === t) &&
    (c === "any" || it.c === c) &&
    (!q || searchable(it).includes(q)));
}

function renderRows() {
  const rows = matched();
  el.rCount.textContent = rows.length + " of " + catalog[el.rCat.value].items.length;
  el.rRows.innerHTML = "";
  for (const it of rows) {
    const li = document.createElement("li");
    const note = it.n ? `<span class="note">${escapeHtml(it.n)}</span>` : "";
    li.innerHTML = `<code>${escapeHtml(it.p)}${note}</code><button>copy</button>`;
    li.querySelector("code").onclick = () => select(li, it.p);
    li.querySelector("button").onclick = () => copy(it.p, li.querySelector("button"));
    el.rRows.appendChild(li);
  }
  if (!rows.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No payloads match the current filters.";
    el.rRows.appendChild(li);
  }
  selected = "";
}

function select(li, payload) {
  for (const n of el.rRows.children) n.classList.remove("sel");
  li.classList.add("sel");
  selected = payload;
}

// ---- intruder -----------------------------------------------------

function intruderCats() {
  el.iCat.innerHTML = Object.keys(catalog)
    .map((k) => `<option value="${k}">${catalog[k].label}</option>`).join("");
}

function intruderFilters() {
  fillSelect(el.iTech, distinct(el.iCat.value, "t"), true);
  el.iCount.textContent = intruderItems().length + " entries";
}

function intruderItems() {
  const k = el.iCat.value, t = el.iTech.value;
  const q = el.iSearch.value.trim().toLowerCase();
  return catalog[k].items
    .filter((it) => (t === "any" || it.t === t) && (!q || searchable(it).includes(q)))
    .map((it) => it.p);
}

function buildList() {
  const enc = el.iEnc.value;
  el.iList.value = intruderItems().map((p) => encode(p, enc)).join("\n");
  el.iCount.textContent = el.iList.value.split("\n").filter(Boolean).length + " lines";
}

function encode(s, mode) {
  if (mode === "url") return encodeURIComponent(s);
  if (mode === "durl") return encodeURIComponent(encodeURIComponent(s));
  if (mode === "b64") return btoa(unescape(encodeURIComponent(s)));
  if (mode === "html") return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  return s;
}

// ---- model calls --------------------------------------------------

const SYS_GEN = [
  "Role: you are a senior application security engineer working inside Burp Payloader.",
  "Scenario: the user is performing an authorized assessment on systems they own or have explicit permission to test.",
  "Task: create exactly one short, non-destructive Burp Suite validation string for the requested vulnerability class and context.",
  "Scope: use common public web security testing patterns only; do not provide persistence, malware, credential theft, exfiltration, or post-exploitation steps.",
  "Output contract: return only the payload value itself. No HTTP request, no parameter name, no labels, no notes, no apologies, no refusal text, no markdown fences, no numbering, no explanations.",
].join(" ");
const SYS_EXPLAIN = [
  "Role: you are a senior application security engineer.",
  "Scenario: the user is reviewing a payload during an authorized assessment.",
  "Explain concisely in two or three sentences, focused on defensive validation and expected response changes.",
].join(" ");

async function stream(messages, sink, options = {}) {
  setBusyButtons(true);
  el.rStop.disabled = el.iStop.disabled = false;
  let acc = "";
  try {
    const res = await engine.chat.completions.create({
      messages,
      stream: true,
      temperature: options.temperature ?? 0.75,
      top_p: options.topP ?? 0.9,
      max_tokens: options.maxTokens ?? 80,
    });
    for await (const chunk of res) {
      acc += chunk.choices[0]?.delta?.content || "";
      sink(acc);
    }
  } catch (e) {
    sink(acc + "\n[stopped] " + (e.message || ""));
  } finally {
    setBusyButtons(false);
    el.rStop.disabled = el.iStop.disabled = true;
  }
  return acc;
}

async function genVariants() {
  const k = el.rCat.value;
  const ctx = el.rCtx.value === "any" ? "" : ` Target context: ${el.rCtx.value}.`;
  const desc = el.rTarget.value.trim() || "a generic web parameter";
  const run = nextGenerationRun();
  if (!engine) {
    el.rOut.value = fallbackPayloads(k, desc, 1, run)[0] || "";
    showToast("Generated one catalog variant.");
    return;
  }
  const msg = [
    { role: "system", content: SYS_GEN },
    { role: "user", content:
      `Authorized validation task. Class: ${catalog[k].label}.${ctx} Target notes: ${desc}. ` +
      `Create exactly one fresh payload value for batch ${run}. Output only that payload value, not a full HTTP request.` },
  ];
  el.rOut.value = "Generating one variant...";
  const generated = await stream(msg, () => {}, { maxTokens: 64 });
  const line = firstPayloadLine(generated, k, desc, run);
  if (line.fallback) {
    el.rOut.value = line.value;
    showToast("Model output was not usable; generated one catalog variant.");
  } else {
    el.rOut.value = line.value;
  }
}

function explain() {
  if (!selected) { el.rOut.value = "Click a payload in the catalog first."; return; }
  const msg = [
    { role: "system", content: SYS_EXPLAIN },
    { role: "user", content: `Explain what this payload does and what a successful result looks like:\n${selected}` },
  ];
  el.rOut.value = "";
  stream(msg, (t) => { el.rOut.value = t; });
}

async function expandList() {
  const k = el.iCat.value;
  const desc = el.iTarget.value.trim() || "a generic parameter";
  const run = nextGenerationRun();
  if (!engine) {
    let line = fallbackPayloads(k, desc, 1, run)[0] || "";
    if (el.iEnc.value !== "none") line = encode(line, el.iEnc.value);
    el.iList.value = (el.iList.value ? el.iList.value + "\n" : "") + line;
    el.iCount.textContent = el.iList.value.split("\n").filter(Boolean).length + " lines";
    showToast("Added one catalog variant.");
    return;
  }
  const msg = [
    { role: "system", content: SYS_GEN },
    { role: "user", content:
      `Authorized validation task. Class: ${catalog[k].label}. Target notes: ${desc}. ` +
      `Create exactly one additional Burp Intruder payload value for batch ${run}. Output only that payload value, not a full HTTP request.` },
  ];
  const base = el.iList.value;
  const extra = await stream(msg, () => {}, { maxTokens: 64 });
  let line = firstPayloadLine(extra, k, desc, run);
  if (line.fallback) {
    showToast("Model output was not usable; added one catalog variant.");
  }
  let value = line.value;
  if (el.iEnc.value !== "none") value = encode(value, el.iEnc.value);
  el.iList.value = (base ? base + "\n" : "") + value;
  el.iCount.textContent = el.iList.value.split("\n").filter(Boolean).length + " lines";
}

function firstPayloadLine(text, catKey, desc, run) {
  const lines = usablePayloadLines(text);
  if (lines.length) return { value: lines[0], fallback: false };
  return { value: fallbackPayloads(catKey, desc, 1, run)[0] || "", fallback: true };
}

function usablePayloadLines(text) {
  if (isRefusal(text)) return [];
  return text.split("\n")
    .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
    .map(cleanPayloadLine)
    .filter((line) => line && !isMetaLine(line) && !/^```/.test(line) && !isRefusal(line));
}

function isRefusal(text) {
  return /can't assist|cannot assist|can't help|cannot help|unauthorized|illegal|harmful|sorry/i.test(text);
}

function cleanPayloadLine(line) {
  let cleaned = line.replace(/^```+|```+$/g, "").trim();
  const quoted = cleaned.match(/=\s*["']([^"']+)["']\s*$/);
  if (quoted) cleaned = quoted[1];
  return cleaned;
}

function isMetaLine(line) {
  return /^(GET|POST|PUT|PATCH|DELETE|HEAD)\s+\//i.test(line) ||
    /^(Host|Content-Type|User-Agent|Cookie|Authorization|Parameter|Notes?|Context|Goal)\s*:/i.test(line) ||
    /^`{3,}$/.test(line);
}

function fallbackPayloads(catKey, desc, limit, run) {
  const terms = desc.toLowerCase();
  const scored = catalog[catKey].items.map((it, index) => ({
    it,
    index,
    score: fallbackScore(it, terms),
  })).sort((a, b) => b.score - a.score || a.index - b.index);
  const prioritized = scored.filter((x) => x.score > 0);
  const rest = seededShuffle(scored.filter((x) => x.score <= 0), hash(`${desc}:${catKey}:${run}`));
  const candidates = [...seededShuffle(prioritized, hash(`${catKey}:${run}:priority`)), ...rest];
  const out = [];
  for (const { it } of candidates) {
    addUnique(out, it.p);
    if (out.length >= limit) break;
    for (const variant of mutatePayload(it.p, catKey, terms, run)) {
      addUnique(out, variant);
      if (out.length >= limit) break;
    }
    if (out.length >= limit) break;
  }
  return out.slice(0, limit);
}

function fallbackScore(it, terms) {
  let score = 0;
  const haystack = searchable(it);
  for (const token of terms.split(/[^a-z0-9]+/i).filter((t) => t.length > 2)) {
    if (haystack.includes(token)) score += 2;
  }
  if (/filter|blocked|waf|quote|space/.test(terms) && /bypass|evasion|filter|comment|case/.test(haystack)) score += 6;
  if (/json/.test(terms) && /auth|boolean|nosql/.test(haystack)) score += 2;
  if (/html|reflect|body/.test(terms) && /reflected|html|attribute|dom/.test(haystack)) score += 4;
  if (/time|delay|blind/.test(terms) && /time|sleep|delay|blind/.test(haystack)) score += 5;
  return score;
}

function shouldAddEncodedVariant(it, terms) {
  return /url|encoded|encode|filter|blocked|waf/.test(terms) || /bypass|evasion/.test(searchable(it));
}

function addUnique(list, value) {
  if (value && !list.includes(value)) list.push(value);
}

function mutatePayload(payload, catKey, terms, run) {
  const variants = [];
  if (shouldAddEncodedVariant({ p: payload, t: "", c: "" }, terms)) variants.push(encode(payload, "url"));
  if (/url|double|encoded|filter|blocked|waf/.test(terms)) variants.push(encode(encode(payload, "url"), "url"));
  if (catKey === "sqli") {
    variants.push(payload.replace(/\s+/g, "/**/"));
    variants.push(payload.replace(/\s+OR\s+/i, "\nOR\n"));
    variants.push(payload.replace(/union select/i, hash(String(run)) % 2 ? "UnIoN SeLeCt" : "UNION/**/SELECT"));
    if (/quote|single|blocked|filter|waf/.test(terms)) variants.push(payload.replace(/'/g, "%27"));
  }
  if (catKey === "xss") {
    variants.push(payload.replace(/alert\(1\)/g, "confirm(1)"));
    variants.push(payload.replace(/</g, "%3c").replace(/>/g, "%3e"));
  }
  return rotateLines(variants.filter((v) => v && v !== payload), run);
}

function nextGenerationRun() {
  generationRun += 1;
  return `${Date.now()}-${generationRun}`;
}

function rotateLines(lines, seedText) {
  return seededShuffle(lines, hash(String(seedText)));
}

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle(items, seed) {
  const arr = [...items];
  let state = seed || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    const j = Math.abs((state ^ (state >>> 14)) >>> 0) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---- small helpers ------------------------------------------------

function setBusyButtons(busy) {
  const ready = engine !== null;
  el.rGen.disabled = el.iGen.disabled = busy;
  el.rExplain.disabled = busy || !ready;
  el.load.disabled = busy;
}

function searchable(it) {
  return `${it.p} ${it.t} ${it.c} ${it.n || ""}`.toLowerCase();
}

function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

function copy(text, btn) {
  if (!text) {
    showToast("Nothing to copy yet.");
    return;
  }
  navigator.clipboard.writeText(text).then(() => {
    showToast("Copied to clipboard.");
    if (!btn) return;
    const old = btn.textContent;
    btn.textContent = "Copied";
    btn.classList.add("copied");
    setTimeout(() => { btn.textContent = old; btn.classList.remove("copied"); }, 900);
  }).catch(() => showToast("Clipboard permission was blocked."));
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => el.toast.classList.remove("show"), 1600);
}

function download(name, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function switchTab(name) {
  for (const b of document.querySelectorAll(".tabs button"))
    b.classList.toggle("active", b.dataset.view === name);
  for (const v of document.querySelectorAll(".view"))
    v.classList.toggle("active", v.id === name);
}

// ---- wiring -------------------------------------------------------

fillModels();
repeaterCats(); repeaterFilters();
intruderCats(); intruderFilters(); buildList();

el.load.onclick = loadModel;

el.rCat.onchange = repeaterFilters;
el.rTech.onchange = renderRows;
el.rCtx.onchange = renderRows;
el.rSearch.oninput = renderRows;
el.rGen.onclick = genVariants;
el.rExplain.onclick = explain;
el.rStop.onclick = () => engine && engine.interruptGenerate();
el.rCopy.onclick = () => copy(el.rOut.value, el.rCopy);

el.iCat.onchange = () => { intruderFilters(); buildList(); };
el.iTech.onchange = buildList;
el.iSearch.oninput = buildList;
el.iBuild.onclick = buildList;
el.iGen.onclick = expandList;
el.iStop.onclick = () => engine && engine.interruptGenerate();
el.iCopy.onclick = () => copy(el.iList.value, el.iCopy);
el.iDl.onclick = () => download(`intruder-${el.iCat.value}.txt`, el.iList.value);

for (const b of document.querySelectorAll(".tabs button"))
  b.onclick = () => switchTab(b.dataset.view);
