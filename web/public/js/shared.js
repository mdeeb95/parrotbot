const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

export class ApiError extends Error {
  constructor(status, body) {
    super(`Request failed with ${status}`);
    this.status = status;
    this.body = body;
  }
}

export async function api(path, init) {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (res.status === 401) {
    location.href = "/";
    throw new ApiError(401, null);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body);
  }
  return res.json();
}

export function toast(message, ok = true) {
  const el = document.createElement("div");
  el.textContent = message;
  el.className = `fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg text-sm text-cream ${
    ok ? "bg-accent" : "bg-red-700"
  }`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

const ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5V22h16v-5"/></svg>',
  activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
};

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: "home", exact: true },
  { href: "/dashboard/kb", label: "Knowledge Base", icon: "book" },
  { href: "/dashboard/activity", label: "Activity", icon: "activity" },
  { href: "/dashboard/settings", label: "Settings", icon: "settings" },
];

// Renders the sidebar into <aside id="sidebar"> and injects a mobile drawer
// + hamburger so navigation works below the md breakpoint. The slot must
// already exist in the page HTML. Returns the /api/me payload.
export async function mountShell(activePath) {
  const channel = new URLSearchParams(location.search).get("channel");
  const path = channel ? `/api/me?channel=${encodeURIComponent(channel)}` : "/api/me";
  const me = await api(path);
  const html = sidebarHtml(activePath, me);

  document.getElementById("sidebar").innerHTML = html;
  mountMobileDrawer(html);
  wireChannelSwitcher(me.primary_login);
  return me;
}

function mountMobileDrawer(sidebarInnerHtml) {
  const trigger = document.createElement("button");
  trigger.id = "mobile-trigger";
  trigger.type = "button";
  trigger.className =
    "fixed right-4 top-4 z-20 rounded-lg border border-mocha bg-foam px-3 py-2 text-lg shadow md:hidden";
  trigger.setAttribute("aria-label", "Open navigation");
  trigger.textContent = "🍔";

  const dialog = document.createElement("dialog");
  dialog.id = "mobile-drawer";
  dialog.className =
    "left-0 w-64 max-w-[80vw] border-r border-mocha bg-cream p-6 text-espresso";
  dialog.style.cssText = "top:0;bottom:0;margin:0;height:100vh;max-height:100vh;";
  dialog.innerHTML = `<div class="flex h-full flex-col justify-between">${sidebarInnerHtml}</div>`;

  trigger.addEventListener("click", () => {
    dialog.showModal();
    trigger.classList.add("is-open");
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog || e.target.closest("a")) dialog.close();
  });
  dialog.addEventListener("close", () => trigger.classList.remove("is-open"));

  document.body.append(trigger, dialog);
}

function sidebarHtml(activePath, me) {
  const channelQs = me.is_primary ? "" : `?channel=${encodeURIComponent(me.active_channel)}`;

  const nav = NAV_ITEMS.map((item) => {
    const active = item.exact ? activePath === item.href : activePath.startsWith(item.href);
    const cls = active
      ? "bg-mocha text-espresso"
      : "text-roast hover:bg-mocha hover:text-espresso";
    return `
      <a href="${item.href}${channelQs}" class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${cls}">
        <span class="h-4 w-4 shrink-0">${ICONS[item.icon]}</span>
        ${item.label}
      </a>
    `;
  }).join("");

  const switcher = me.all_channels.length > 1 ? channelSwitcherHtml(me) : "";

  const avatar = me.user.avatar_url
    ? `<img src="${esc(me.user.avatar_url)}" alt="" class="h-9 w-9 rounded-full" />`
    : `<div class="h-9 w-9 rounded-full bg-mocha"></div>`;

  return `
    <div>
      <a href="/dashboard${channelQs}" class="mb-8 flex items-center gap-2.5 text-xl font-bold">
        <span class="text-2xl">🦜</span>
        Parrot
      </a>
      <nav class="flex flex-col gap-1">${nav}</nav>
      ${switcher}
    </div>
    <div class="flex items-center gap-3 rounded-xl border border-mocha bg-foam p-3">
      ${avatar}
      <div class="min-w-0 flex-1">
        <div class="truncate text-sm font-semibold text-espresso">${esc(me.user.display_name)}</div>
        <form action="/api/auth/signout" method="post">
          <button type="submit" class="text-xs text-roast hover:text-espresso">Sign out</button>
        </form>
      </div>
    </div>
  `;
}

function channelSwitcherHtml(me) {
  const options = me.all_channels
    .map((c) => {
      const selected = c.twitch_channel === me.active_channel ? " selected" : "";
      const label =
        c.twitch_channel === me.primary_login
          ? `${c.twitch_channel} (yours)`
          : `${c.twitch_channel} (read-only)`;
      return `<option value="${esc(c.twitch_channel)}"${selected}>${esc(label)}</option>`;
    })
    .join("");

  return `
    <div class="mt-6">
      <div class="mb-1.5 text-[11px] uppercase tracking-wider text-roast">Channel</div>
      <select id="channel-switcher" class="w-full rounded-lg border border-mocha bg-foam px-3 py-2 text-sm">
        ${options}
      </select>
    </div>
  `;
}

function wireChannelSwitcher(primaryLogin) {
  const sel = document.getElementById("channel-switcher");
  if (!sel) return;
  sel.addEventListener("change", () => {
    const next = sel.value;
    const url = new URL(location.href);
    if (next === primaryLogin) url.searchParams.delete("channel");
    else url.searchParams.set("channel", next);
    location.href = url.toString();
  });
}
