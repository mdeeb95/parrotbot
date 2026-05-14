import { api, esc, mountShell, toast } from "/js/shared.js";

await mountShell("/dashboard");
await refresh();

byId("toggle").addEventListener("click", onToggle);

async function refresh() {
  const data = await api("/api/dashboard");
  byId("welcome").textContent = `Welcome back, ${data.user.display_name}.`;
  renderSetup(data.setup, data.is_primary);
  renderStatus(data.channel, data.setup, data.is_primary);
  renderUsage(data.usage);
  renderToday(data);
}

function renderSetup(setup, isPrimary) {
  const setupDone = setup.is_modded && setup.has_identity;
  const el = byId("setup");
  if (setupDone || !isPrimary) {
    el.hidden = true;
    return;
  }

  const modStep = setup.is_modded
    ? step(1, "Mod the bot", "Done.", true)
    : step(
        1,
        "Mod the bot so it can post in any chat mode",
        `Type <code class="rounded bg-cream px-1.5 py-0.5">/mod parrotparrotbot</code> in your chat, then:
         <button data-action="confirm-mod" class="ml-2 rounded bg-accent px-3 py-1 text-xs font-semibold text-cream">
           I've modded the bot
         </button>`,
        false,
      );

  const identityStep = setup.has_identity
    ? step(2, "Set your identity", "Done.", true)
    : step(
        2,
        "Tell the bot who you are",
        `<a href="/dashboard/kb" class="text-accent hover:underline">Open knowledge base →</a>`,
        false,
      );

  el.innerHTML = `
    <h2 class="text-lg font-semibold">Finish setup</h2>
    <p class="mt-1 text-sm text-roast">Two quick steps before Parrot can start answering.</p>
    <div class="mt-4 space-y-3">${modStep}${identityStep}</div>
  `;
  el.hidden = false;

  const confirmBtn = el.querySelector('[data-action="confirm-mod"]');
  if (confirmBtn) confirmBtn.addEventListener("click", onConfirmMod);
}

function step(num, title, body, done) {
  return `
    <div class="flex gap-3">
      <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${done ? "border-accent text-accent" : "border-mocha-strong text-roast"}">
        ${done ? "✓" : num}
      </div>
      <div class="flex-1">
        <div class="font-medium">${esc(title)}</div>
        <div class="mt-1 text-sm text-roast">${body}</div>
      </div>
    </div>
  `;
}

function renderStatus(channel, setup, isPrimary) {
  byId("status-label").textContent = channel.is_active ? "Active" : "Inactive";

  const btn = byId("toggle");
  const canToggle = setup.is_modded && setup.has_identity && isPrimary;
  if (!canToggle) {
    btn.hidden = true;
    return;
  }
  btn.textContent = channel.is_active ? "Deactivate" : "Activate";
  btn.dataset.next = channel.is_active ? "false" : "true";
  btn.disabled = false;
  btn.hidden = false;
}

function renderUsage({ month, limit }) {
  byId("month-answers").textContent = month;
  byId("month-limit").textContent = limit;
  const pct = Math.min(100, (month / limit) * 100);
  byId("usage-bar").style.width = `${pct}%`;
  byId("overcap-warning").hidden = month < limit;
}

function renderToday({ usage, today_blocks, channel }) {
  const blocksTotal = today_blocks.reduce((acc, b) => acc + b.count, 0);
  const hasActivity = usage.today > 0 || blocksTotal > 0;

  byId("today-empty").hidden = hasActivity;
  byId("today-stats").hidden = !hasActivity;
  if (!hasActivity) return;

  byId("today-answers").textContent = usage.today;
  byId("today-top-intent").textContent = usage.top_intent ?? "—";
  byId("today-active").textContent = channel.is_active ? "Yes" : "No";

  const wrap = byId("today-blocks-wrap");
  wrap.hidden = blocksTotal === 0;
  if (blocksTotal === 0) return;

  byId("blocks-total").textContent = blocksTotal;
  byId("today-blocks").innerHTML = today_blocks.map(blockPill).join("");
}

function blockPill(b) {
  const tone =
    b.category === "actionable"
      ? "border-[#7a5a47] bg-[#fef4e6] text-[#8a5530]"
      : b.category === "operational"
        ? "border-mocha bg-cream text-roast"
        : "border-[#a14040] bg-[#fde8e8] text-[#7a1f1f]";
  return `<span class="rounded-full border ${tone} px-2.5 py-0.5 text-xs" title="${esc(b.explainer)}">${esc(b.title)} · ${b.count}</span>`;
}

async function onToggle(e) {
  const btn = e.currentTarget;
  const next = btn.dataset.next === "true";
  btn.disabled = true;
  try {
    await api("/api/channels/toggle", {
      method: "POST",
      body: JSON.stringify({ is_active: next }),
    });
    await refresh();
  } catch (err) {
    toast("Couldn't update bot status", false);
    btn.disabled = false;
    console.error(err);
  }
}

async function onConfirmMod() {
  try {
    await api("/api/channels/mod-confirm", { method: "POST" });
    toast("Marked as modded");
    await refresh();
  } catch (err) {
    toast("Couldn't update. Try again.", false);
    console.error(err);
  }
}

function byId(id) {
  return document.getElementById(id);
}
