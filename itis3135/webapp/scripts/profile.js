// scripts/profile.js
// Offline profile viewer/editor with localStorage persistence.
// Validator-safe: no optional chaining, no ??, no spread, no arrow fn shortcuts.

(function () {
  "use strict";

  var DATA_URL = "data/data.json";

  var DEFAULT_USER = {
    id: "self",
    name: "John Alexander Hand",
    preferred: "Iohannes Manus",
    handle: "@thequantifier",
    email: "john@handfam.org",
    schoolEmail: "jhand12@charlotte.edu",
    phone: "(919) 576-6048",
    location: "Charlotte, NC, USA",
    memberSince: "Aug 2022",
    role: "Director of Finance • UNC Charlotte",
    program: "B.S. Mathematics (Honors), Minor: Interactive Programming",
    bio: "Math, code, and building 3D games in Godot. Runs a finance-receipt OCR app and a few websites."
  };

  // ---------- DOM LOOKUPS ----------
  var toggleBtn   = document.getElementById("toggleEditBtn");
  var editBtn     = document.getElementById("editProfileBtn");
  var cancelBtn   = document.getElementById("cancelEditBtn");
  var form        = document.getElementById("editForm");
  var view        = document.getElementById("detailsView");

  var vFullName   = document.getElementById("detailFullName");
  var vPreferred  = document.getElementById("detailPreferred");
  var vEmail      = document.getElementById("profileEmail");
  var vSchool     = document.getElementById("profileSchoolEmail");
  var vPhone      = document.getElementById("profilePhone");
  var vLocation   = document.getElementById("profileLocation");
  var vSince      = document.getElementById("profileSince");
  var vBio        = document.getElementById("detailBio");
  var vRole       = document.getElementById("detailRole");
  var vProgram    = document.getElementById("detailProgram");
  var vNameTop    = document.getElementById("profileName");
  var vTagTop     = document.getElementById("profileTag");
  var vAvatar     = document.getElementById("profileAvatar");

  var fFullName   = document.getElementById("inputFullName");
  var fPreferred  = document.getElementById("inputPreferred");
  var fEmail      = document.getElementById("inputEmail");
  var fPhone      = document.getElementById("inputPhone");
  var fBio        = document.getElementById("inputBio");

  var statLastLogin = document.getElementById("statLastLogin");
  var stat2FA       = document.getElementById("stat2FA");
  var statUploads   = document.getElementById("statUploads");

  var btn2FA      = document.getElementById("toggle2FABtn");
  var btnPwd      = document.getElementById("changePasswordBtn");
  var btnSignout  = document.getElementById("signOutAllBtn");
  var btnCopyLink = document.getElementById("copyProfileLinkBtn");
  var btnAvatar   = document.getElementById("changeAvatarBtn");

  // ---------- HELPERS ----------
  function text(el, t) {
    if (el) {
      if (t === null || t === undefined) t = "—";
      el.textContent = t;
    }
  }

  function val(el) {
    if (!el) return "";
    return (el.value || "").trim();
  }

  function storageKeyExtras(uid) {
    return "profileExtras:" + uid;
  }

  function storageKeyAvatar(uid) {
    return "profileAvatar:" + uid;
  }

  function storageKeyAccount(uid) {
    return "accountMeta:" + uid;
  }

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, obj) {
    try {
      localStorage.setItem(key, JSON.stringify(obj));
    } catch (e) {
      console.warn("writeJSON error for key:", key);
    }
  }

  function applyAvatarFromDataURL(url) {
    if (!vAvatar) return;
    if (url) {
      vAvatar.style.backgroundImage = "url('" + url + "')";
      vAvatar.style.backgroundSize = "cover";
      vAvatar.style.backgroundPosition = "center";
    } else {
      vAvatar.style.backgroundImage = "";
    }
  }

  function set2FA(enabled) {
    text(stat2FA, enabled ? "Enabled" : "Disabled");
    if (btn2FA) btn2FA.textContent = enabled ? "Disable" : "Enable";
  }

  // ---------- LOAD BASE USER ----------
  function loadBaseUser() {
    return fetch(DATA_URL, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("no data.json");
        return res.json();
      })
      .then(function (data) {
        var users = Array.isArray(data.users) ? data.users : [];
        var found = null;
        var i;

        for (i = 0; i < users.length; i++) {
          var u = users[i];
          var em = (u.email || "").toLowerCase();
          if (em === DEFAULT_USER.email.toLowerCase()) {
            found = u;
            break;
          }
        }
        if (!found && users.length > 0) found = users[0];

        if (found) {
          return {
            id: found.id || "self",
            name: found.name || DEFAULT_USER.name,
            preferred: found.preferred || DEFAULT_USER.preferred,
            handle: found.handle || DEFAULT_USER.handle,
            email: found.email || DEFAULT_USER.email,
            schoolEmail: found.schoolEmail || DEFAULT_USER.schoolEmail,
            phone: found.phone || DEFAULT_USER.phone,
            location: found.location || DEFAULT_USER.location,
            memberSince: found.memberSince || DEFAULT_USER.memberSince,
            role: found.role || DEFAULT_USER.role,
            program: found.program || DEFAULT_USER.program,
            bio: found.bio || DEFAULT_USER.bio
          };
        }

        return DEFAULT_USER;
      })
      .catch(function () {
        return DEFAULT_USER;
      });
  }

  // ---------- INIT ----------
  function init() {
    loadBaseUser().then(function (base) {
      var uid = base.email || base.id || "self";

      var extras = readJSON(storageKeyExtras(uid), {
        preferred: base.preferred,
        phone: base.phone,
        bio: base.bio
      });

      var meta = readJSON(storageKeyAccount(uid), {
        lastLogin: new Date().toLocaleString(),
        twoFA: false,
        uploads: 127
      });

      var avatarDataURL = localStorage.getItem(storageKeyAvatar(uid));

      // Top identity
      text(vNameTop, base.name);
      text(vTagTop, base.handle);

      // Summary
      text(vEmail, base.email);
      text(vSchool, base.schoolEmail);
      text(vPhone, extras.phone ? extras.phone : base.phone);
      text(vLocation, base.location);
      text(vSince, base.memberSince);

      // Details view
      text(vFullName, base.name);
      text(vPreferred, extras.preferred ? extras.preferred : base.preferred);
      text(vRole, base.role);
      text(vProgram, base.program);
      text(vBio, extras.bio ? extras.bio : base.bio);

      // Form fields
      if (fFullName)  fFullName.value  = base.name || "";
      if (fPreferred) fPreferred.value = extras.preferred || base.preferred || "";
      if (fEmail)     fEmail.value     = base.email || "";
      if (fPhone)     fPhone.value     = extras.phone || base.phone || "";
      if (fBio)       fBio.value       = extras.bio || base.bio || "";

      // Stats
      text(statLastLogin, meta.lastLogin);
      text(statUploads, String(meta.uploads));
      set2FA(meta.twoFA);

      // Avatar
      applyAvatarFromDataURL(avatarDataURL);

      // ---------- EVENT HANDLERS ----------
      if (toggleBtn) {
        toggleBtn.addEventListener("click", function () {
          var expanded = toggleBtn.getAttribute("aria-expanded") === "true";
          toggleBtn.setAttribute("aria-expanded", expanded ? "false" : "true");
          form.hidden = expanded;
          view.hidden = !expanded;
        });
      }

      if (editBtn) {
        editBtn.addEventListener("click", function () {
          toggleBtn.setAttribute("aria-expanded", "true");
          form.hidden = false;
          view.hidden = true;
        });
      }

      if (cancelBtn) {
        cancelBtn.addEventListener("click", function () {
          toggleBtn.setAttribute("aria-expanded", "false");
          form.hidden = true;
          view.hidden = false;
        });
      }

      if (btnCopyLink) {
        btnCopyLink.addEventListener("click", function () {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(location.href)
              .then(function () { alert("Profile link copied!"); })
              .catch(function () { alert("Could not copy link."); });
          }
        });
      }

      if (btnAvatar) {
        btnAvatar.addEventListener("click", function () {
          var input = document.createElement("input");
          input.type = "file";
          input.accept = "image/*";
          input.onchange = function () {
            if (!input.files || !input.files[0]) return;
            var reader = new FileReader();
            reader.onload = function () {
              var dataURL = reader.result;
              localStorage.setItem(storageKeyAvatar(uid), dataURL);
              applyAvatarFromDataURL(dataURL);
            };
            reader.readAsDataURL(input.files[0]);
          };
          input.click();
        });
      }

      if (btn2FA) {
        btn2FA.addEventListener("click", function () {
          var next = !meta.twoFA;
          meta.twoFA = next;
          writeJSON(storageKeyAccount(uid), meta);
          set2FA(next);
        });
      }

      if (btnPwd) {
        btnPwd.addEventListener("click", function () {
          alert("Password change not implemented in demo.");
        });
      }

      if (btnSignout) {
        btnSignout.addEventListener("click", function () {
          alert("Signed out all sessions (demo only).");
        });
      }

      if (form) {
        form.addEventListener("submit", function (e) {
          e.preventDefault();

          var newPreferred = val(fPreferred);
          var newPhone = val(fPhone);
          var newBio = val(fBio);

          var newExtras = {
            preferred: newPreferred,
            phone: newPhone,
            bio: newBio
          };

          writeJSON(storageKeyExtras(uid), newExtras);

          text(vFullName, val(fFullName) || base.name);
          text(vPreferred, newPreferred || base.preferred);
          text(vEmail, fEmail ? fEmail.value : base.email);
          text(vPhone, newPhone || base.phone);
          text(vBio, newBio || base.bio);

          meta.lastLogin = new Date().toLocaleString();
          writeJSON(storageKeyAccount(uid), meta);
          text(statLastLogin, meta.lastLogin);

          toggleBtn.setAttribute("aria-expanded", "false");
          form.hidden = true;
          view.hidden = false;

          alert("Profile updated locally.");
        });
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
