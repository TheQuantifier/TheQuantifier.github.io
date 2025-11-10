// scripts/register.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  const msg = document.getElementById("registerMessage");
  const nameEl = document.getElementById("name");
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  const btn = document.getElementById("registerBtn");
  const yearEl = document.getElementById("year");

  if (yearEl) yearEl.textContent = new Date().getFullYear();
  if (!form) return;

  const setMsg = (text, color = "") => {
    if (!msg) return;
    msg.textContent = text;
    msg.style.color = color;
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    setMsg("");

    const name = nameEl?.value.trim();
    const email = emailEl?.value.trim();
    const password = passEl?.value || "";

    if (!name || !email || !password) {
      return setMsg("Please fill in all fields.", "red");
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return setMsg("Please enter a valid email address.", "red");
    }
    if (password.length < 6) {
      return setMsg("Password must be at least 6 characters long.", "red");
    }

    // Simulate request
    btn.disabled = true;
    setMsg("Creating your account...", "black");

    setTimeout(() => {
      setMsg("✅ Account created! Redirecting to login…", "green");
      const params = new URLSearchParams(location.search);
      const redirect = params.get("redirect") || "index.html";
      setTimeout(() => (window.location.href = redirect), 600);
    }, 500);
  });
});
