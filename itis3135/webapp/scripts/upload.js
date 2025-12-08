/* ===============================================
   Finance App — upload.js (ES module)
   Drag & drop / file picker → POST to backend /api/receipts
   Lists & deletes via /api/receipts using api.js helpers.
   =============================================== */

import { api, API_BASE } from "./api.js";

(function () {

  const UPLOAD_URL = API_BASE + "/receipts";

  const ACCEPTED = ["application/pdf", "image/png", "image/jpeg"];
  const MAX_MB = 50;

  // ---- Elements ----
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const fileList = document.getElementById("fileList");
  const uploadBtn = document.getElementById("uploadBtn");
  const clearBtn = document.getElementById("clearBtn");
  const statusMsg = document.getElementById("statusMsg");
  const recentTableBody = document.getElementById("recentTableBody");

  if (!dropzone || !fileInput) {
    console.error("upload.js: Missing #dropzone or #fileInput.");
    return;
  }

  let queue = [];
  let pickerArmed = false;

  // ---------- Helpers ----------
  function setStatus(msg, isError) {
    if (!statusMsg) return;
    statusMsg.textContent = msg;
    if (isError) statusMsg.classList.add("error");
    else statusMsg.classList.remove("error");
  }

  function bytesToSize(bytes) {
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    let n = bytes || 0;
    while (n >= 1024 && i < units.length - 1) {
      n /= 1024;
      i++;
    }
    const fixed = n >= 10 || i === 0 ? 0 : 1;
    return n.toFixed(fixed) + " " + units[i];
  }

  function extFromName(name) {
    return name.indexOf(".") !== -1 ? name.split(".").pop().toUpperCase() : "";
  }

  function isAccepted(file) {
    if (ACCEPTED.indexOf(file.type) !== -1) return true;
    const ext = extFromName(file.name).toLowerCase();
    return ["pdf", "png", "jpg", "jpeg"].indexOf(ext) !== -1;
  }

  function overLimit(file) {
    return file.size > MAX_MB * 1024 * 1024;
  }

  async function fetchJSON(url, opts) {
    const options = opts || {};
    const fetchOpts = {
      method: options.method || "GET",
      credentials: "include",
      headers: options.headers || {}
    };

    if (options.formData) {
      fetchOpts.body = options.formData;
    } else if (options.body !== undefined) {
      fetchOpts.headers = Object.assign(
        { "Content-Type": "application/json" },
        fetchOpts.headers
      );
      fetchOpts.body = JSON.stringify(options.body);
    }

    const res = await fetch(url, fetchOpts);
    const raw = await res.text();
    let json;

    try {
      json = raw ? JSON.parse(raw) : {};
    } catch (e) {
      json = { raw: raw };
    }

    if (!res.ok) {
      const message = json && json.error ? json.error : "HTTP " + res.status;
      const err = new Error(message);
      err.status = res.status;
      throw err;
    }

    return json;
  }

  // ---------- Recent uploads ----------
  const trashSVG = '<img src="images/trash.jpg" alt="Delete" class="icon-trash" />';

  function renderRecentRows(rows) {
    recentTableBody.innerHTML = "";
    if (!rows.length) {
      recentTableBody.innerHTML =
        '<tr><td colspan="6" class="subtle">No uploads yet.</td></tr>';
      return;
    }

    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var tr = document.createElement("tr");
      tr.setAttribute("data-id", r._id);

      var when = r.uploaded_at
        ? new Date(r.uploaded_at).toLocaleString()
        : "—";

      tr.innerHTML =
        '<td>' + (r.original_filename || r.stored_filename || "—") + "</td>" +
        "<td>" + (r.mimetype || "—") + "</td>" +
        '<td class="num">' + (r.size_bytes ? bytesToSize(r.size_bytes) : "—") + "</td>" +
        "<td>" + when + "</td>" +
        "<td>" + (r.parse_status || "raw") + "</td>" +
        '<td class="num">' +
        '<button class="icon-btn js-delete" data-id="' + r._id + '" title="Delete" aria-label="Delete this receipt">' +
        trashSVG +
        "</button></td>";

      recentTableBody.appendChild(tr);
    }
  }

  async function refreshRecent() {
    try {
      var rows = await api.listReceipts();
      renderRecentRows(rows || []);
    } catch (err) {
      var msg = (err.message || "").toLowerCase();
      if (msg.indexOf("not") !== -1) {
        var url = new URL("./login.html", location.href);
        url.searchParams.set("redirect", "upload.html");
        location.href = url.toString();
        return;
      }
      recentTableBody.innerHTML =
        '<tr><td colspan="6" class="subtle">Failed to load uploads.</td></tr>';
    }
  }

  // ---------- Delete ----------
  recentTableBody.addEventListener("click", async function (e) {
    var btn = e.target.closest && e.target.closest(".js-delete");
    if (!btn) return;

    var id = btn.getAttribute("data-id");
    if (!id) return;

    var row = btn.closest("tr");

    if (!window.confirm("Delete this receipt?")) return;

    btn.disabled = true;

    try {
      await api.deleteReceipt(id);
      if (row && row.parentNode) row.parentNode.removeChild(row);
      refreshRecent();
      setStatus("Deleted.");
    } catch (err) {
      setStatus("Delete failed: " + err.message, true);
      btn.disabled = false;
    }
  });

  // ---------- Queue ----------
  function renderQueue() {
    fileList.innerHTML = "";
    uploadBtn.disabled = queue.length === 0;

    for (var i = 0; i < queue.length; i++) {
      (function (file, idx) {
        var item = document.createElement("div");
        item.className = "file-item";

        var thumb = document.createElement("div");
        thumb.className = "file-thumb";

        if (String(file.type).indexOf("image/") === 0) {
          var img = document.createElement("img");
          img.alt = "";
          img.style.width = "100%";
          img.style.height = "100%";
          img.style.objectFit = "cover";

          var reader = new FileReader();
          reader.onload = function (ev) {
            img.src = ev.target.result;
          };
          reader.readAsDataURL(file);
          thumb.appendChild(img);
        } else {
          thumb.textContent = extFromName(file.name) || "FILE";
        }

        var meta = document.createElement("div");
        meta.className = "file-meta";

        var name = document.createElement("div");
        name.className = "file-name";
        name.textContent = file.name;

        var sub = document.createElement("div");
        sub.className = "file-subtle";
        sub.textContent = (file.type || "Unknown") + " • " + bytesToSize(file.size);

        meta.appendChild(name);
        meta.appendChild(sub);

        var actions = document.createElement("div");
        actions.className = "file-actions";

        var removeBtn = document.createElement("button");
        removeBtn.className = "file-remove";
        removeBtn.type = "button";
        removeBtn.setAttribute("aria-label", "Remove " + file.name);
        removeBtn.textContent = "✕";

        removeBtn.addEventListener("click", function () {
          queue.splice(idx, 1);
          renderQueue();
        });

        actions.appendChild(removeBtn);

        item.appendChild(thumb);
        item.appendChild(meta);
        item.appendChild(actions);
        fileList.appendChild(item);
      })(queue[i], i);
    }
  }

  function addFiles(files) {
    var arr = [];
    for (var i = 0; i < (files ? files.length : 0); i++) {
      arr.push(files[i]);
    }
    if (!arr.length) return;

    var accepted = [];
    var rejected = 0;

    for (var j = 0; j < arr.length; j++) {
      var f = arr[j];
      if (!isAccepted(f) || overLimit(f)) {
        rejected++;
      } else {
        accepted.push(f);
      }
    }

    if (accepted.length > 0) {
      queue = queue.concat(accepted);
      renderQueue();
      setStatus(accepted.length + " file(s) added.");
    }

    if (rejected > 0) {
      setStatus(
        rejected +
          " file(s) skipped (PDF/PNG/JPG only, ≤ " +
          MAX_MB +
          " MB).",
        true
      );
    }
  }

  // ---------- Picker ----------
  function openPickerOnce() {
    if (!fileInput || pickerArmed) return;

    pickerArmed = true;
    setTimeout(function () {
      pickerArmed = false;
    }, 2500);

    try {
      if (fileInput.showPicker) fileInput.showPicker();
      else fileInput.click();
    } catch (e) {
      fileInput.click();
    }
  }

  fileInput.addEventListener(
    "click",
    function (e) {
      e.stopPropagation();
    },
    true
  );

  dropzone.addEventListener(
    "click",
    function () {
      openPickerOnce();
    },
    true
  );

  dropzone.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPickerOnce();
    }
  });

  fileInput.addEventListener("change", function (e) {
    addFiles(e.target.files);
    fileInput.value = "";
  });

  ["dragenter", "dragover"].forEach(function (evt) {
    dropzone.addEventListener(evt, function (e) {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("is-dragover");
    });
  });

  ["dragleave", "drop"].forEach(function (evt) {
    dropzone.addEventListener(evt, function (e) {
      e.preventDefault();
      e.stopPropagation();

      if (evt === "drop") {
        if (e.dataTransfer && e.dataTransfer.files) {
          addFiles(e.dataTransfer.files);
        }
      }

      dropzone.classList.remove("is-dragover");
    });
  });

  clearBtn.addEventListener("click", function () {
    queue = [];
    fileInput.value = "";
    renderQueue();
    setStatus("Cleared selection.");
  });

  // ---------- Upload All ----------
  async function uploadAll() {
    while (queue.length > 0) {
      var file = queue[0];

      var fd = new FormData();
      fd.append("receipt", file, file.name);

      uploadBtn.disabled = true;
      dropzone.setAttribute("aria-busy", "true");
      setStatus("Uploading " + file.name + "…");

      try {
        // IMPORTANT FIX: use formData, not body
        await fetchJSON(UPLOAD_URL, {
          method: "POST",
          formData: fd
        });

        setStatus("Uploaded: " + file.name);
        queue.shift();
        renderQueue();
        await refreshRecent();
      } catch (err) {
        if (err.status === 401 || err.status === 403) {
          var url = new URL("./login.html", location.href);
          url.searchParams.set("redirect", "upload.html");
          location.href = url.toString();
          return;
        }
        setStatus("Upload failed: " + err.message, true);
        break;
      } finally {
        dropzone.removeAttribute("aria-busy");
      }
    }

    uploadBtn.disabled = queue.length === 0;
  }

  uploadBtn.addEventListener("click", uploadAll);

  // ---------- Init ----------
  renderQueue();
  refreshRecent();
})();
