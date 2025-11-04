/* ============================================================================
 * scripts/generate_json.js
 * For intro_form.html (ITIS 3135)
 *
 * Adds a "Generate JSON" flow that:
 *  - Builds a JSON object from the Introduction Form using the TA's exact keys
 *  - Hides the form and shows a <section><pre><code class="language-json">...</code></pre>
 *  - Uses Highlight.js for pretty, copyable JSON
 *  - Changes the page <h2> from "Introduction Form" to "Introduction HTML" (per spec)
 *
 * TA-required JSON keys (values filled from the form & dynamic sections):
 *  firstName, preferredName, middleInitial, lastName, divider,
 *  mascotAdjective, mascotAnimal,
 *  image, imageCaption,
 *  personalStatement,
 *  personalBackground, professionalBackground, academicBackground,
 *  subjectBackground, primaryComputer,
 *  courses: [{department, number, name, reason}, ...],
 *  links:   [{name, href}, ...]
 * ========================================================================== */

(function () {
  function $(sel, root) {
    if (!root) root = document;
    return root.querySelector(sel);
  }

  function $$(sel, root) {
    if (!root) root = document;
    return Array.prototype.slice.call(root.querySelectorAll(sel));
  }

  function val(id) {
    var el = document.getElementById(id);
    if (el && typeof el.value !== "undefined") {
      return String(el.value).trim();
    }
    return "";
  }

  function escapeHtml(s) {
    if (s === undefined || s === null) s = "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeKey(s) {
    if (!s) return "";
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  // ---- Bullets -> map of title -> text (best-effort) ----
  function collectBulletsMap() {
    var root = document.getElementById("bullets");
    var out = {};
    if (!root) return out;

    var rows = $$(".bullet-row, .bullet, .row, fieldset", root);
    if (rows.length > 0) {
      rows.forEach(function (row) {
        var titleEl = $("input[type='text'], textarea", row);
        var title = "";
        if (titleEl && typeof titleEl.value !== "undefined") {
          title = String(titleEl.value).trim();
        }
        var restInputs = $$("textarea, input[type='text']", row).slice(1);
        var textParts = restInputs.map(function (e) {
          return String(e.value || "").trim();
        }).filter(function (t) { return t; });
        var text = textParts.join(" ");
        if (title || text) {
          out[normalizeKey(title)] = text;
        }
      });
      return out;
    }

    // Fallback: take pairs of (title, text)
    var fields = $$("input[type='text'], textarea", root).map(function (e) {
      return String(e.value || "").trim();
    });
    for (var i = 0; i + 1 < fields.length; i += 2) {
      var t = fields[i];
      var txt = fields[i + 1];
      if (t || txt) {
        out[normalizeKey(t)] = txt;
      }
    }
    return out;
  }

  // ---- Courses -> [{department, number, name, reason}] ----
  function collectCourses() {
    var root = document.getElementById("courses");
    var arr = [];
    if (!root) return arr;

    var rows = $$(".course-row, .row, fieldset", root);
    if (rows.length > 0) {
      rows.forEach(function (row) {
        var vals = $$("input, textarea, select", row).map(function (e) {
          return String(e.value || "").trim();
        });
        var department = vals[0] || "";
        var number = vals[1] || "";
        var name = vals[2] || "";
        var reason = "";
        if (vals.length > 3) {
          reason = vals.slice(3).join(" ");
        }
        if (department || number || name || reason) {
          arr.push({ department: department, number: number, name: name, reason: reason });
        }
      });
      return arr;
    }

    // Fallback: scan in groups of 4
    var flat = $$("input, textarea, select", root).map(function (e) {
      return String(e.value || "").trim();
    });
    for (var i = 0; i < flat.length; i += 4) {
      var d = flat[i] || "";
      var n = flat[i + 1] || "";
      var nm = flat[i + 2] || "";
      var rs = flat[i + 3] || "";
      if (d || n || nm || rs) {
        arr.push({ department: d, number: n, name: nm, reason: rs });
      }
    }
    return arr;
  }

  // ---- Links -> [{name, href}] ----
  function collectLinks() {
    var root = document.getElementById("links");
    var arr = [];
    if (!root) return arr;

    var rows = $$(".link-row, .row, fieldset, .link", root);
    if (rows.length > 0) {
      rows.forEach(function (row) {
        var inputs = $$("input[type='text'], input[type='url']", row);
        var name = "";
        var href = "";
        if (inputs[0] && typeof inputs[0].value !== "undefined") {
          name = String(inputs[0].value).trim();
        }
        if (inputs[1] && typeof inputs[1].value !== "undefined") {
          href = String(inputs[1].value).trim();
        }
        if (name || href) {
          arr.push({ name: name, href: href });
        }
      });
      return arr;
    }

    // Fallback: scan two-by-two
    var flat = $$("input[type='text'], input[type='url']", root).map(function (e) {
      return String(e.value || "").trim();
    });
    for (var i = 0; i < flat.length; i += 2) {
      var name2 = flat[i] || "";
      var href2 = flat[i + 1] || "";
      if (name2 || href2) {
        arr.push({ name: name2, href: href2 });
      }
    }
    return arr;
  }

  function middleInitialFromMiddleName(middle) {
    middle = String(middle || "").trim();
    if (!middle) return "";
    // take first A-Z letter
    var m = middle.match(/[A-Za-z]/);
    if (m && m[0]) return m[0].toUpperCase();
    return "";
  }

  // Map bullets to the TA-required keys using title matching
  function fillFromBullets(bmap, requiredKey) {
    // accepted labels for each key (normalizeKey-comparison)
    var aliases = {
      personalBackground: ["personalbackground"],
      professionalBackground: ["professionalbackground", "workbackground", "careerbackground"],
      academicBackground: ["academicbackground", "educationbackground", "schoolbackground"],
      subjectBackground: ["subjectbackground", "subjectmatterbackground"],
      primaryComputer: ["primarycomputer", "primarydevice", "computer"]
    };
    var want = aliases[requiredKey] || [requiredKey.toLowerCase()];
    for (var i = 0; i < want.length; i++) {
      var k = want[i];
      if (bmap[k]) return bmap[k];
    }
    return "";
  }

  function buildJsonObject() {
    // Identity & mascot
    var firstName = val("firstName");
    var preferredName = val("preferredName");
    var middle = val("middleName");
    var middleInitial = middleInitialFromMiddleName(middle);
    var lastName = val("lastName");
    var divider = val("divider");
    var mascotAdjective = val("mascotAdj");
    var mascotAnimal = val("mascotAnimal");

    // Image
    var image = val("pictureUrl");
    if (!image) {
      var def = val("defaultImageUrl");
      if (def) image = def;
      else image = "images/intro/profile.jpg";
    }
    var imageCaption = val("pictureCaption");

    // Statement & bullets
    var personalStatement = val("personalStatement");
    var bulletsMap = collectBulletsMap();

    var personalBackground = fillFromBullets(bulletsMap, "personalBackground");
    var professionalBackground = fillFromBullets(bulletsMap, "professionalBackground");
    var academicBackground = fillFromBullets(bulletsMap, "academicBackground");
    var subjectBackground = fillFromBullets(bulletsMap, "subjectBackground");
    var primaryComputer = fillFromBullets(bulletsMap, "primaryComputer");

    // Arrays
    var courses = collectCourses();
    var links = collectLinks();

    // TA-required shape
    var data = {
      firstName: firstName,
      preferredName: preferredName,
      middleInitial: middleInitial,
      lastName: lastName,
      divider: divider,
      mascotAdjective: mascotAdjective,
      mascotAnimal: mascotAnimal,
      image: image,
      imageCaption: imageCaption,
      personalStatement: personalStatement,
      personalBackground: personalBackground,
      professionalBackground: professionalBackground,
      academicBackground: academicBackground,
      subjectBackground: subjectBackground,
      primaryComputer: primaryComputer,
      courses: courses,
      links: links
    };

    return data;
  }

  function toPrettyJson(obj) {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      return "{\n  \"error\": \"Failed to serialize JSON\"\n}";
    }
  }

  function renderCodeBlock(jsonText) {
    var wrap = document.createElement("section");
    wrap.setAttribute("id", "generated-json");
    wrap.setAttribute("aria-label", "Generated JSON Code");

    var pre = document.createElement("pre");
    var code = document.createElement("code");
    code.className = "language-json";
    code.textContent = jsonText; // literal JSON

    pre.appendChild(code);
    wrap.appendChild(pre);
    return { wrap: wrap, code: code };
  }

  function switchViewsForJson() {
    var h2 = $("main h2");
    if (h2) h2.textContent = "Introduction HTML"; // per assignment spec
    var formView = $("#form-view");
    if (formView) formView.hidden = true;
    var result = $("#result-view");
    if (result) {
      result.hidden = false;
      return result;
    }
    var mainEl = $("main");
    if (mainEl) return mainEl;
    return document.body;
  }

  function generateAndShowJson() {
    var obj = buildJsonObject();
    var jsonText = toPrettyJson(obj);
    var mount = switchViewsForJson();
    var rendered = renderCodeBlock(jsonText);
    mount.appendChild(rendered.wrap);

    if (window.hljs && typeof window.hljs.highlightElement === "function") {
      window.hljs.highlightElement(rendered.code);
    }
  }

  function init() {
    var btn = document.getElementById("btnGenerateJson");
    if (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        generateAndShowJson();
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();