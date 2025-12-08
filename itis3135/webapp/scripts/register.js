// scripts/register.js
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("registerForm");
  const msg = document.getElementById("registerMessage");
  const nameEl = document.getElementById("name");
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  const btn = document.getElementById("registerBtn");
  const yearEl = document.getElementById("year");

  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  if (!form) return;

  function setMsg(text, color) {
    if (!msg) return;
    msg.textContent = text;
    msg.style.color = color || "";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    setMsg("");

    const name = nameEl ? nameEl.value.trim() : "";
    const email = emailEl ? emailEl.value.trim() : "";
    const password = passEl ? passEl.value : "";

    if (!name || !email || !password) {
      setMsg("Please fill in all fields.", "red");
      return;
    }

    var emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailPattern.test(email)) {
      setMsg("Please enter a valid email address.", "red");
      return;
    }

    if (password.length < 6) {
      setMsg("Password must be at least 6 characters long.", "red");
      return;
    }

    // Simulate request
    if (btn) btn.disabled = true;
    setMsg("Creating your account...", "black");

    setTimeout(function () {
      setMsg("✅ Account created! Redirecting to login…", "green");

      var params = new URLSearchParams(window.location.search);
      var redirect = params.get("redirect") || "index.html";

      setTimeout(function () {
        window.location.href = redirect;
      }, 600);
    }, 500);
  });
});
