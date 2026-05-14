import { api, mountShell, toast } from "/js/shared.js";

const [, account] = await Promise.all([
  mountShell("/dashboard/settings"),
  api("/api/account"),
]);

byId("twitch-login").textContent = account.twitch_login;
byId("email").textContent = account.email ?? "—";
byId("plan").textContent = account.plan === "free" ? "Free" : account.plan;
byId("confirm-target").textContent = account.twitch_login;

const dialog = byId("delete-dialog");
const input = byId("confirm-input");
const confirmBtn = byId("confirm-delete");

byId("open-delete").addEventListener("click", () => {
  input.value = "";
  confirmBtn.disabled = true;
  dialog.showModal();
});

input.addEventListener("input", () => {
  confirmBtn.disabled = input.value.toLowerCase() !== account.twitch_login.toLowerCase();
});

confirmBtn.addEventListener("click", async () => {
  confirmBtn.disabled = true;
  try {
    await api("/api/account/delete", {
      method: "POST",
      body: JSON.stringify({ confirm_username: input.value }),
    });
    location.href = "/";
  } catch (err) {
    toast("Couldn't delete account", false);
    confirmBtn.disabled = false;
    console.error(err);
  }
});

function byId(id) {
  return document.getElementById(id);
}
