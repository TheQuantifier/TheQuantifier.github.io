// web/scripts/api.js
//
// Smart API base that auto-switches between local dev and production (Render).
// - Local (served via Live Server/HTTP): http://localhost:4000/api
// - Production (GitHub Pages):           https://financeappmy.onrender.com/api
// - Manual override: add ?api=https://custom-host.com to your page URL

// -------------------------------
// 1) Optional manual override
// -------------------------------
const params = new URLSearchParams(window.location.search);
const urlApiOverride = params.get("api");

// -------------------------------
// 2) Detect localhost
// -------------------------------
const isLocalHost = (
  location.hostname === "localhost" ||
  location.hostname === "127.0.0.1"
);

// -------------------------------
// 3) Defaults
// -------------------------------
const PROD_API = "https://financeappmy.onrender.com/api";
const LOCAL_API = "http://localhost:4000/api";

// -------------------------------
// 4) Determine API base
// -------------------------------
export const API_BASE =
  (urlApiOverride ? urlApiOverride.replace(/\/$/, "") : null) ||
  (isLocalHost ? LOCAL_API : PROD_API);

// Also export root origin (no /api)
export const API_ORIGIN = API_BASE.replace(/\/api$/, "");


// ===========================================
// Shared Fetch Helper (with cookies enabled)
// ===========================================
async function fetchJson(path, options) {
  const opts = {
    method: (options && options.method) || "GET",
    credentials: "include",
    headers: (options && options.headers) || {}
  };

  if (options && options.formData) {
    // Sending FormData
    opts.body = options.formData;
  } else if (options && options.body !== undefined) {
    opts.headers = Object.assign({ "Content-Type": "application/json" }, opts.headers);
    opts.body = JSON.stringify(options.body);
  }

  const response = await fetch(API_BASE + path, opts);

  // Read raw text so we can attempt JSON parsing safely
  const raw = await response.text();
  let json;
  try {
    json = raw ? JSON.parse(raw) : {};
  } catch (err) {
    json = { raw: raw };
  }

  // Error handling
  if (!response.ok) {
    const message = (json && json.error) ? json.error : "HTTP " + response.status;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return json;
}


// ===========================================
// Public API used by your pages
// ===========================================
export const api = {

  // -------------------------
  // AUTH
  // -------------------------
  register: function (payload) {
    return fetchJson("/auth/register", {
      method: "POST",
      body: payload
    });
  },

  login: function (payload) {
    return fetchJson("/auth/login", {
      method: "POST",
      body: payload
    });
  },

  me: function () {
    return fetchJson("/auth/me");
  },

  logout: function () {
    return fetchJson("/auth/logout", { method: "POST" });
  },


  // -------------------------
  // RECORDS
  // -------------------------
  listRecords: function () {
    return fetchJson("/records");
  },

  createRecord: function (payload) {
    return fetchJson("/records", {
      method: "POST",
      body: payload
    });
  },


  // -------------------------
  // RECEIPTS
  // -------------------------
  listReceipts: function () {
    return fetchJson("/receipts");
  },

  getReceipt: function (id) {
    return fetchJson("/receipts/" + encodeURIComponent(id));
  },

  deleteReceipt: function (id) {
    return fetchJson("/receipts/" + encodeURIComponent(id), {
      method: "DELETE"
    });
  },

  uploadReceipt: function (file) {
    const fd = new FormData();
    fd.append("receipt", file, file.name);

    return fetchJson("/receipts", {
      method: "POST",
      formData: fd
    });
  }
};
