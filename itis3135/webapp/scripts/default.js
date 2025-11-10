/* ===============================================
   Finance App – default.js (no API)
   Shared script for all pages.
   - Loads header/footer fragments
   - Highlights active nav link
   - Manages account dropdown
   - Simulated auth state via sessionStorage
   =============================================== */

document.addEventListener("DOMContentLoaded", () => {
  loadHeaderAndFooter();
});

/** Fetch a fragment (no cache) */
async function loadFragment(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} not found`);
  return res.text();
}

/** Load header & footer, then wire behaviors */
function loadHeaderAndFooter() {
  // Header
  loadFragment("components/header.html")
    .then((html) => {
      const header = document.getElementById("header");
      if (header) header.innerHTML = html;
      setActiveNavLink();
      initAccountMenu();
      initAuthState();
    })
    .catch((err) => console.error("Header load failed:", err));

  // Footer
  loadFragment("components/footer.html")
    .then((html) => {
      const footer = document.getElementById("footer");
      if (footer) footer.innerHTML = html;
      const y = document.getElementById("year");
      if (y) y.textContent = new Date().getFullYear();
    })
    .catch((err) => console.error("Footer load failed:", err));
}

/** Highlight current page in nav */
function setActiveNavLink() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const navLinks = document.querySelectorAll("#header nav a");
  navLinks.forEach((link) => {
    const linkPage = link.getAttribute("href");
    if (linkPage === currentPage) link.classList.add("active");
    else link.classList.remove("active");
  });
}

/** Account menu dropdown */
function initAccountMenu() {
  const icon = document.getElementById("account-icon");
  const menu = document.getElementById("account-menu");
  if (!icon || !menu) return;

  icon.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("show");
    icon.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("click", (e) => {
    if (!icon.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.remove("show");
      icon.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      menu.classList.remove("show");
      icon.setAttribute("aria-expanded", "false");
      icon.blur();
    }
  });
}

/** Fake auth via sessionStorage
 *  Keys used:
 *   - currentUserName
 *   - currentUserEmail
 *  Elements:
 *   - .auth-link (becomes Login/Logout)
 *   - [data-auth="authed"] shown only when “logged in”
 *   - [data-auth="guest"]  shown only when “logged out”
 *   - [data-user-name], #account-name
 *   - [data-user-email], #account-email
 */
function initAuthState() {
  const authLink = document.querySelector(".auth-link");
  const authedEls = document.querySelectorAll('[data-auth="authed"]');
  const guestEls  = document.querySelectorAll('[data-auth="guest"]');

  const name = sessionStorage.getItem("currentUserName") || "";
  const email = sessionStorage.getItem("currentUserEmail") || "";

  const isLoggedIn = Boolean(name || email);

  // Fill optional account UI
  const nameTargets  = document.querySelectorAll("[data-user-name], #account-name");
  const emailTargets = document.querySelectorAll("[data-user-email], #account-email");

  nameTargets.forEach((el) => (el.textContent = name || email || "Account"));
  emailTargets.forEach((el) => (el.textContent = email || ""));

  // Toggle visibility groups
  authedEls.forEach((el) => (el.style.display = isLoggedIn ? "" : "none"));
  guestEls.forEach((el) => (el.style.display = isLoggedIn ? "none" : ""));

  // Auth link behavior
  if (!authLink) return;

  if (isLoggedIn) {
    authLink.textContent = "Logout";
    authLink.href = "#";
    authLink.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        // Clear session “auth”
        sessionStorage.removeItem("currentUserName");
        sessionStorage.removeItem("currentUserEmail");
        // Redirect to login (index.html in your setup)
        window.location.href = "index.html";
      },
      { once: true }
    );
  } else {
    authLink.textContent = "Login";
    authLink.href = "index.html";
  }
}
