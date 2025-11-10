// scripts/profile.js
// Offline profile: loads a base user from data/data.json (if present)
// and merges editable "extras" (preferred, phone, bio, avatar, 2FA)
// from localStorage. No database, no auth redirects.

(() => {
  const DATA_URL = "data/data.json";
  const DEFAULT_USER = {
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

  // ---------- DOM ----------
  const toggleBtn   = document.getElementById("toggleEditBtn");
  const editBtn     = document.getElementById("editProfileBtn");
  const cancelBtn   = document.getElementById("cancelEditBtn");
  const form        = document.getElementById("editForm");
  const view        = document.getElementById("detailsView");

  const vFullName   = document.getElementById("detailFullName");
  const vPreferred  = document.getElementById("detailPreferred");
  const vEmail      = document.getElementById("profileEmail");
  const vSchool     = document.getElementById("profileSchoolEmail");
  const vPhone      = document.getElementById("profilePhone");
  const vLocation   = document.getElementById("profileLocation");
  const vSince      = document.getElementById("profileSince");
  const vBio        = document.getElementById("detailBio");
  const vRole       = document.getElementById("detailRole");
  const vProgram    = document.getElementById("detailProgram");
  const vNameTop    = document.getElementById("profileName");
  const vTagTop     = document.getElementById("profileTag");
  const vAvatar     = document.getElementById("profileAvatar");

  const fFullName   = document.getElementById("inputFullName");
  const fPreferred  = document.getElementById("inputPreferred");
  const fEmail      = document.getElementById("inputEmail");
  const fPhone      = document.getElementById("inputPhone");
  const fBio        = document.getElementById("inputBio");

  const statLastLogin = document.getElementById("statLastLogin");
  const stat2FA       = document.getElementById("stat2FA");
  const statUploads   = document.getElementById("statUploads");

  const btn2FA      = document.getElementById("toggle2FABtn");
  const btnPwd      = document.getElementById("changePasswordBtn");
  const btnSignout  = document.getElementById("signOutAllBtn");
  const btnCopyLink = document.getElementById("copyProfileLinkBtn");
  const btnAvatar   = document.getElementById("changeAvatarBtn");

  // ---------- Helpers ----------
  const text = (el, t) => { if (el) el.textContent = t ?? "—"; };
  const val  = (el) => (el?.value ?? "").trim();

  const storageKeyExtras  = (uid) => `profileExtras:${uid}`;
  const storageKeyAvatar  = (uid) => `profileAvatar:${uid}`;
  const storageKeyAccount = (uid) => `accountMeta:${uid}`; // e.g., lastLogin, uploads, twoFA

  function readJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }
  function writeJSON(key, obj) {
    localStorage.setItem(key, JSON.stringify(obj || {}));
  }

  function applyAvatarFromDataURL(url) {
    if (!vAvatar) return;
    if (url) {
      vAvatar.style.backgroundImage = `url('${url}')`;
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

  // ---------- Load base user (data.json optional) ----------
  async function loadBaseUser() {
    try {
      const res = await fetch(DATA_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("no data.json");
      const data = await res.json();

      // If you keep users in data.json, try to find John; else fall back
      const users = Array.isArray(data.users) ? data.users : [];
      const found =
        users.find(u => (u.email || "").toLowerCase() === DEFAULT_USER.email.toLowerCase()) ||
        users[0];

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
    } catch {
      // ignore — use defaults
    }
    return { ...DEFAULT_USER };
  }

  // ---------- Populate UI ----------
  async function init() {
    const base = await loadBaseUser();
    const uid  = base.email || base.id || "self";

    // extras (editable fields) stored locally
    const extras = readJSON(storageKeyExtras(uid), {
      preferred: base.preferred,
      phone: base.phone,
      bio: base.bio
    });

    // account meta (fake stats)
    const meta = readJSON(storageKeyAccount(uid), {
      lastLogin: new Date().toLocaleString(),
      twoFA: false,
      uploads: 127
    });

    // avatar
    const avatarDataURL = localStorage.getItem(storageKeyAvatar(uid));

    // Top identity
    text(vNameTop, base.name);
    text(vTagTop, base.handle);

    // Summary block
    text(vEmail, base.email);
    text(vSchool, base.schoolEmail);
    text(vPhone, extras.phone || base.phone);
    text(vLocation, base.location);
    text(vSince, base.memberSince);

    // Details view
    text(vFullName, base.name);
    text(vPreferred, extras.preferred || base.preferred);
    text(vRole, base.role);
    text(vProgram, base.program);
    text(vBio, extras.bio || base.bio);

    // Form fields (email editable locally only if you want)
    if (fFullName)  fFullName.value  = base.name || "";
    if (fPreferred) fPreferred.value = extras.preferred || base.preferred || "";
    if (fEmail)     fEmail.value     = base.email || "";
    if (fPhone)     fPhone.value     = extras.phone || base.phone || "";
    if (fBio)       fBio.value       = extras.bio || base.bio || "";

    // Stats
    text(statLastLogin, meta.lastLogin || "—");
    text(statUploads, String(meta.uploads ?? "—"));
    set2FA(!!meta.twoFA);

    // Avatar
    applyAvatarFromDataURL(avatarDataURL);

    // Wire UI
    toggleBtn?.addEventListener("click", () => {
      const expanded = toggleBtn.getAttribute("aria-expanded") === "true";
      toggleBtn.setAttribute("aria-expanded", String(!expanded));
      form.hidden = !form.hidden;
      view.hidden = !view.hidden;
    });

    editBtn?.addEventListener("click", () => {
      toggleBtn?.setAttribute("aria-expanded", "true");
      form.hidden = false;
      view.hidden = true;
    });

    cancelBtn?.addEventListener("click", () => {
      toggleBtn?.setAttribute("aria-expanded", "false");
      form.hidden = true;
      view.hidden = false;
    });

    btnCopyLink?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        alert("Profile link copied!");
      } catch {
        alert("Could not copy link.");
      }
    });

    btnAvatar?.addEventListener("click", async () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const dataURL = reader.result;
          localStorage.setItem(storageKeyAvatar(uid), dataURL);
          applyAvatarFromDataURL(dataURL);
        };
        reader.readAsDataURL(file);
      };
      input.click();
    });

    btn2FA?.addEventListener("click", () => {
      const next = !meta.twoFA;
      meta.twoFA = next;
      writeJSON(storageKeyAccount(uid), meta);
      set2FA(next);
    });

    btnPwd?.addEventListener("click", () => {
      alert("This demo stores no real passwords. In a real app, you'd open a change-password form.");
    });

    btnSignout?.addEventListener("click", () => {
      alert("Signed out all sessions (demo).");
    });

    // Save (persist extras + reflect to view)
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      const newExtras = {
        preferred: val(fPreferred),
        phone: val(fPhone),
        bio: val(fBio)
      };
      writeJSON(storageKeyExtras(uid), newExtras);

      // reflect to view
      text(vFullName, val(fFullName) || base.name);
      text(vPreferred, newExtras.preferred || base.preferred);
      text(vEmail, fEmail?.value || base.email); // local only
      text(vPhone, newExtras.phone || base.phone);
      text(vBio, newExtras.bio || base.bio);

      // Quick stat: update last login to "now" as a visible change (optional)
      meta.lastLogin = new Date().toLocaleString();
      writeJSON(storageKeyAccount(uid), meta);
      text(statLastLogin, meta.lastLogin);

      toggleBtn?.setAttribute("aria-expanded", "false");
      form.hidden = true;
      view.hidden = false;
      alert("Profile updated locally.");
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
