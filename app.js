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

const SYS_GEN = "You produce web application security test payloads for an authorised penetration test. " +
  "Output payloads only, one per line, no numbering, no explanation, no markdown fences.";
const SYS_EXPLAIN = "You are assisting a penetration tester. Explain concisely in two or three sentences.";

async function stream(messages, sink) {
  setBusyButtons(true);
  el.rStop.disabled = el.iStop.disabled = false;
  let acc = "";
  try {
    const res = await engine.chat.completions.create({ messages, stream: true, temperature: 0.6 });
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

function genVariants() {
  const k = el.rCat.value;
  const ctx = el.rCtx.value === "any" ? "" : ` Target context: ${el.rCtx.value}.`;
  const desc = el.rTarget.value.trim() || "a generic web parameter";
  const msg = [
    { role: "system", content: SYS_GEN },
    { role: "user", content:
      `Attack class: ${catalog[k].label}.${ctx} Target: ${desc}. ` +
      `Give 8 payloads tailored to this authorized test. One payload per line.` },
  ];
  el.rOut.value = "";
  stream(msg, (t) => { el.rOut.value = t; });
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
  const msg = [
    { role: "system", content: SYS_GEN },
    { role: "user", content:
      `Attack class: ${catalog[k].label}. Target: ${desc}. ` +
      `Give 12 additional fuzzing payloads not already obvious. One per line.` },
  ];
  const base = el.iList.value;
  const extra = await stream(msg, (t) => {
    el.iList.value = (base ? base + "\n" : "") + t;
  });
  if (el.iEnc.value !== "none") {
    const lines = extra.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => encode(l, el.iEnc.value));
    el.iList.value = (base ? base + "\n" : "") + lines.join("\n");
  }
  el.iCount.textContent = el.iList.value.split("\n").filter(Boolean).length + " lines";
}

// ---- small helpers ------------------------------------------------

function setBusyButtons(busy) {
  const ready = engine !== null;
  el.rGen.disabled = el.rExplain.disabled = el.iGen.disabled = busy || !ready;
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
