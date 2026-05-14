import { api, esc, mountShell } from "/js/shared.js";

const channelParam = new URLSearchParams(location.search).get("channel");
const cache = new Map();

let mode = readMode();
let page = readPage();

await mountShell("/dashboard/activity");
await load();

wireFilters();
window.addEventListener("popstate", () => {
  mode = readMode();
  page = readPage();
  load();
});

function readMode() {
  return new URLSearchParams(location.search).get("show") === "all" ? "all" : "actionable";
}

function readPage() {
  return Math.max(1, parseInt(new URLSearchParams(location.search).get("page") ?? "1", 10) || 1);
}

async function load() {
  const key = `${mode}:${page}`;
  let data = cache.get(key);
  if (!data) {
    const q = new URLSearchParams({ show: mode, page: String(page) });
    if (channelParam) q.set("channel", channelParam);
    data = await api(`/api/activity?${q}`);
    cache.set(key, data);
  }

  renderToday(data.today_blocks);
  renderFilters();
  renderRows(data.rows, data.total);
  renderPagination(data);
}

function wireFilters() {
  byId("filter-actionable").addEventListener("click", (e) => {
    e.preventDefault();
    setState("actionable", 1);
  });
  byId("filter-all").addEventListener("click", (e) => {
    e.preventDefault();
    setState("all", 1);
  });
  byId("prev-link").addEventListener("click", (e) => {
    e.preventDefault();
    setState(mode, page - 1);
  });
  byId("next-link").addEventListener("click", (e) => {
    e.preventDefault();
    setState(mode, page + 1);
  });
  byId("refresh").addEventListener("click", async () => {
    cache.clear();
    const btn = byId("refresh");
    btn.disabled = true;
    try {
      await load();
    } finally {
      btn.disabled = false;
    }
  });
}

function setState(nextMode, nextPage) {
  mode = nextMode;
  page = Math.max(1, nextPage);
  history.pushState({}, "", hrefFor(mode, page));
  load();
}

function renderToday(blocks) {
  const el = byId("today");
  if (blocks.length === 0) {
    el.hidden = true;
    return;
  }
  const total = blocks.reduce((acc, b) => acc + b.count, 0);
  byId("today-heading").textContent = `Today: ${total} blocked`;
  byId("today-pills").innerHTML = blocks.map(pill).join("");
  el.hidden = false;
}

function pill(b) {
  return `<span class="rounded-full border ${badgeClass(b.category)} px-2.5 py-0.5 text-xs" title="${esc(b.explainer)}">${esc(b.title)} · ${b.count}</span>`;
}

function badgeClass(category) {
  if (category === "actionable") return "border-[#7a5a47] bg-[#fef4e6] text-[#8a5530]";
  if (category === "operational") return "border-mocha bg-cream text-roast";
  return "border-[#a14040] bg-[#fde8e8] text-[#7a1f1f]";
}

function renderFilters() {
  const activeCls = "border-accent bg-mocha";
  const inactiveCls = "border-mocha bg-foam text-roast hover:border-mocha-strong";

  const actionable = byId("filter-actionable");
  actionable.href = hrefFor("actionable", 1);
  actionable.className = `rounded-lg border px-3 py-1.5 cursor-pointer ${mode === "actionable" ? activeCls : inactiveCls}`;

  const all = byId("filter-all");
  all.href = hrefFor("all", 1);
  all.className = `rounded-lg border px-3 py-1.5 cursor-pointer ${mode === "all" ? activeCls : inactiveCls}`;
}

function hrefFor(m, p) {
  const q = new URLSearchParams();
  if (m === "all") q.set("show", "all");
  if (p > 1) q.set("page", String(p));
  if (channelParam) q.set("channel", channelParam);
  const qs = q.toString();
  return qs ? `/dashboard/activity?${qs}` : "/dashboard/activity";
}

function renderRows(rows, total) {
  byId("empty").hidden = total !== 0;
  byId("rows").hidden = total === 0;
  byId("rows-body").innerHTML = rows.map(row).join("");
}

function row(r) {
  const when = new Date(r.ts).toLocaleString();
  const status = r.block
    ? `<span class="rounded-full border ${badgeClass(r.block.category)} px-2.5 py-0.5 text-xs" title="${esc(r.block.explainer)}">${esc(r.block.title)}</span>`
    : `<span class="rounded-full border border-[#3d7a4a] bg-[#e6f3ea] px-2.5 py-0.5 text-xs text-[#2a5d3a]">Posted</span>`;
  const answer = r.block
    ? `<span class="text-xs text-roast">${esc(r.intent ?? "(no intent)")}</span>`
    : esc(r.answer_text ?? "");
  return `
    <tr class="border-b border-mocha align-top last:border-b-0">
      <td class="whitespace-nowrap px-4 py-3 text-roast">${esc(when)}</td>
      <td class="whitespace-nowrap px-4 py-3">${status}</td>
      <td class="px-4 py-3 text-roast">${esc(truncate(r.first_input, 80))}</td>
      <td class="px-4 py-3">${answer}</td>
      <td class="whitespace-nowrap px-4 py-3 text-right text-roast">${r.asker_count}</td>
    </tr>
  `;
}

function truncate(s, n) {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}

function renderPagination(data) {
  const wrap = byId("pagination");
  if (data.total_pages <= 1) {
    wrap.hidden = true;
    return;
  }
  wrap.hidden = false;
  byId("page-info").textContent = `Page ${data.page} of ${data.total_pages} · ${data.total} total`;

  const prev = byId("prev-link");
  prev.hidden = data.page <= 1;
  prev.href = hrefFor(data.mode, data.page - 1);

  const next = byId("next-link");
  next.hidden = data.page >= data.total_pages;
  next.href = hrefFor(data.mode, data.page + 1);
}

function byId(id) {
  return document.getElementById(id);
}
