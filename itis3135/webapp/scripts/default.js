/* ==========================================================
   Finance App – default.js (validator-safe ES5)
   FUNCTIONS ARE DEFINED BEFORE USE
   ========================================================== */

/* ==========================================================
   Fetch reusable fragments (no cache)
   ========================================================== */
function loadFragment(path) {
  return fetch(path, { cache: "no-store" }).then(function (response) {
    if (!response.ok) {
      throw new Error("Fragment not found: " + path);
    }
    return response.text();
  });
}

/* ==========================================================
   Highlight active navigation link
   ========================================================== */
function setActiveNavLink() {
  var parts = window.location.pathname.split("/");
  var currentPage = parts[parts.length - 1] || "index.html";

  var navLinks = document.querySelectorAll("#header nav a");

  for (var i = 0; i < navLinks.length; i++) {
    var link = navLinks[i];
    var href = link.getAttribute("href");

    if (href === currentPage) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    } else {
      link.classList.remove("active");
      link.removeAttribute("aria-current");
    }
  }
}

/* ==========================================================
   Accessible Account Dropdown Menu
   ========================================================== */
function initAccountMenu() {
  var icon = document.getElementById("account-icon");
  var menu = document.getElementById("account-menu");

  if (!icon || !menu) return;

  icon.setAttribute("role", "button");
  icon.setAttribute("aria-expanded", "false");
  icon.setAttribute("tabindex", "0");

  function toggleMenu() {
    var isOpen = menu.classList.toggle("show");
    icon.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  icon.addEventListener("click", toggleMenu);

  icon.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleMenu();
    }
  });

  document.addEventListener("click", function (e) {
    if (!icon.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.remove("show");
      icon.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      menu.classList.remove("show");
      icon.setAttribute("aria-expanded", "false");
      icon.blur();
    }
  });
}

/* ==========================================================
   Simulated Authentication System
   ========================================================== */
function initAuthState() {
  var authLink = document.querySelector(".auth-link");

  var authedEls = document.querySelectorAll('[data-auth="authed"]');
  var guestEls = document.querySelectorAll('[data-auth="guest"]');

  var name = sessionStorage.getItem("currentUserName") || "";
  var email = sessionStorage.getItem("currentUserEmail") || "";
  var loggedIn = !!(name || email);

  var nameTargets = document.querySelectorAll("[data-user-name], #account-name");
  var emailTargets = document.querySelectorAll("[data-user-email], #account-email");

  var i;

  for (i = 0; i < nameTargets.length; i++) {
    nameTargets[i].textContent = name || email || "Account";
  }

  for (i = 0; i < emailTargets.length; i++) {
    emailTargets[i].textContent = email || "";
  }

  for (i = 0; i < authedEls.length; i++) {
    authedEls[i].style.display = loggedIn ? "" : "none";
  }

  for (i = 0; i < guestEls.length; i++) {
    guestEls[i].style.display = loggedIn ? "none" : "";
  }

  if (!authLink) return;

  if (loggedIn) {
    authLink.textContent = "Logout";
    authLink.href = "#";
    authLink.setAttribute("aria-label", "Logout of your account");

    authLink.addEventListener(
      "click",
      function (e) {
        e.preventDefault();
        sessionStorage.removeItem("currentUserName");
        sessionStorage.removeItem("currentUserEmail");
        window.location.href = "index.html";
      },
      { once: true }
    );
  } else {
    authLink.textContent = "Login";
    authLink.href = "index.html";
    authLink.setAttribute("aria-label", "Go to login page");
  }
}

/* ==========================================================
   Load Accumulus Validator Script
   ========================================================== */
function loadValidator() {
  var script = document.createElement("script");
  script.src = "https://lint.page/kit/4d0fe3.js";
  script.crossOrigin = "anonymous";
  script.defer = true;

  document.body.appendChild(script);
}

/* ==========================================================
   Load header/footer components
   ========================================================== */
function loadHeaderAndFooter() {
  /* Load Header */
  loadFragment("components/header.html")
    .then(function (html) {
      var header = document.getElementById("header");
      if (header) {
        header.innerHTML = html;
        setActiveNavLink();
        initAccountMenu();
        initAuthState();
      }
    })
    .catch(function (err) {
      console.error("Header load error:", err);
    });

  /* Load Footer */
  loadFragment("components/footer.html")
    .then(function (html) {
      var footer = document.getElementById("footer");
      if (footer) {
        footer.innerHTML = html;
      }

      var yearEl = document.getElementById("year");
      if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
      }

      loadValidator();
    })
    .catch(function (err) {
      console.error("Footer load error:", err);
    });
}

/* ==========================================================
   Start Script After DOM Loads
   ========================================================== */
document.addEventListener("DOMContentLoaded", function () {
  loadHeaderAndFooter();
});
