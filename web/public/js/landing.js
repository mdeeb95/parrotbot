if (new URLSearchParams(location.search).get("error") === "auth_failed") {
  document.getElementById("auth-error").hidden = false;
}

// Dev-login is gated server-side. Probe it before revealing the button so
// prod users never see a button that wouldn't work.
const probe = await fetch("/api/auth/dev/available");
if (probe.ok) {
  const btn = document.getElementById("dev-login");
  btn.hidden = false;
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    const res = await fetch("/api/auth/dev/test-login", { method: "POST" });
    if (res.ok) location.href = "/dashboard";
    else btn.disabled = false;
  });
}
