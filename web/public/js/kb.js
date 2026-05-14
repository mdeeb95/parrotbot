import { api, mountShell, toast } from "/js/shared.js";

const CONTAINERS = {
  link: "links-rows",
  custom_field: "custom-fields-rows",
  custom_qa: "custom-qa-rows",
};

const channelParam = new URLSearchParams(location.search).get("channel");
const kbPath = channelParam ? `/api/kb?channel=${encodeURIComponent(channelParam)}` : "/api/kb";

const [, data] = await Promise.all([mountShell("/dashboard/kb"), api(kbPath)]);

if (!data.is_primary) {
  byId("readonly-channel").textContent = data.twitch_channel;
  byId("readonly-json").textContent = JSON.stringify(data.kb, null, 2);
  byId("readonly-notice").hidden = false;
} else {
  populateForm(data.kb);
  byId("kb-form").hidden = false;
  wireForm();
}

function populateForm(kb) {
  byId("identity-name").value = kb.identity?.name ?? "";
  byId("identity-pronouns").value = kb.identity?.pronouns ?? "";
  byId("bio").value = kb.bio ?? "";
  byId("game").value = kb.game ?? "";
  byId("schedule").value = kb.schedule ?? "";
  (kb.links ?? []).forEach((l) => addRow("link", l));
  (kb.custom_fields ?? []).forEach((f) => addRow("custom_field", f));
  (kb.custom_qa ?? []).forEach((q) => addRow("custom_qa", q));
}

function wireForm() {
  document.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => addRow(btn.dataset.add, {}));
  });
  document.addEventListener("click", (e) => {
    const removeBtn = e.target.closest("[data-remove]");
    if (removeBtn) removeBtn.closest("[data-row]").remove();
  });
  byId("kb-form").addEventListener("submit", onSubmit);
}

function addRow(kind, values) {
  const tpl = byId(`tpl-${kind}`);
  const frag = tpl.content.cloneNode(true);
  for (const [field, value] of Object.entries(values)) {
    const el = frag.querySelector(`[data-field="${field}"]`);
    if (el) el.value = value;
  }
  byId(CONTAINERS[kind]).appendChild(frag);
}

async function onSubmit(e) {
  e.preventDefault();
  const btn = byId("save");
  const status = byId("save-status");
  btn.disabled = true;
  status.textContent = "Saving…";
  clearErrors();

  const body = collectForm();

  try {
    await api("/api/kb", { method: "PUT", body: JSON.stringify(body) });
    status.textContent = "Saved";
    setTimeout(() => (status.textContent = ""), 3000);
  } catch (err) {
    status.textContent = "";
    if (err.status === 400 && err.body?.errors) {
      showErrors(err.body.errors);
      toast("Some fields need fixing", false);
    } else {
      toast("Couldn't save", false);
      console.error(err);
    }
  } finally {
    btn.disabled = false;
  }
}

function collectForm() {
  return {
    identity: {
      name: byId("identity-name").value,
      pronouns: byId("identity-pronouns").value,
    },
    bio: byId("bio").value,
    game: byId("game").value,
    schedule: byId("schedule").value,
    links: rowsFor("links-rows"),
    custom_fields: rowsFor("custom-fields-rows"),
    custom_qa: rowsFor("custom-qa-rows"),
  };
}

function rowsFor(containerId) {
  return [...byId(containerId).querySelectorAll("[data-row]")].map((row) => {
    const obj = {};
    row.querySelectorAll("[data-field]").forEach((el) => {
      obj[el.dataset.field] = el.value;
    });
    return obj;
  });
}

function clearErrors() {
  document.querySelectorAll("[data-error-for]").forEach((el) => {
    el.hidden = true;
    el.textContent = "";
  });
}

function showErrors(errors) {
  for (const [field, message] of Object.entries(errors)) {
    const el = document.querySelector(`[data-error-for="${field}"]`);
    if (el) {
      el.textContent = message;
      el.hidden = false;
    }
  }
}

function byId(id) {
  return document.getElementById(id);
}
