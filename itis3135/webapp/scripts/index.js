// scripts/index.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const errorEl = document.getElementById("loginError");
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  const yearEl = document.getElementById("year");

  if (yearEl) yearEl.textContent = new Date().getFullYear();
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (errorEl) errorEl.textContent = "";

    const email = emailEl?.value.trim();
    const password = passEl?.value.trim();

    if (!email || !password) {
      if (errorEl) errorEl.textContent = "Please enter both email and password.";
      return;
    }

    // OPTIONAL: try to match user name from local data
    let nameForSession = "";
    try {
      const res = await fetch("data/data.json", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const match = (json.users || []).find(u => (u.email || "").toLowerCase() === email.toLowerCase());
        if (match?.name) nameForSession = match.name;
      }
    } catch {
      // ignore; we'll just fall back to email
    }

    // Fake auth: store session "identity"
    sessionStorage.setItem("currentUserEmail", email);
    sessionStorage.setItem("currentUserName", nameForSession || email);

    // Simulated login success
    setTimeout(() => {
      window.location.href = "home.html";
    }, 300);
  });
});
