/* ============================================================================
 * scripts/generate_html.js
 * For intro_form.html (ITIS 3135)
 *
 * Adds a "Generate HTML" flow that:
 *  - Builds an Introduction HTML snippet from current form values
 *  - Hides the form and swaps to a <section><pre><code class="language-html">...</code></pre>
 *  - Uses Highlight.js for pretty, copyable code
 *  - Changes the page <h2> from "Introduction Form" to "Introduction HTML"
 *
 * Field awareness (by id/name):
 *   Identity: firstName, middleName, preferredName, lastName
 *   Acknowledgment: ackStatement, ackDate
 *   Mascot: mascotAdj, mascotAnimal, divider
 *   Picture: pictureUrl (preferred if set), defaultImageUrl (fallback), pictureCaption
 *   Statement: personalStatement
 *   Bullets:    auto-reads any inputs/textareas inside #bullets (row-wise best-effort)
 *   Courses:    auto-reads rows inside #courses (dept/number/name/reason; best-effort)
 *   Quote:      quote, quoteAuthor
 *   Extras:     funnyThing, shareThing
 *   Links (5):  auto-reads from #links (name + url; best-effort)
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

  function escapeHtml(s) {
    if (s === undefined || s === null) s = "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function val(id) {
    var el = document.getElementById(id);
    if (el && typeof el.value !== "undefined") {
      return String(el.value).trim();
    }
    return "";
  }

  function nameLine() {
    var first = val("firstName");
    var mid = val("middleName");
    var pref = val("preferredName");
    var last = val("lastName");

    var parts = [];
    if (first) parts.push(first);
    if (mid) parts.push(mid);
    if (last) parts.push(last);
    var full = parts.join(" ").replace(/\s+/g, " ").trim();

    var out = "";
    if (pref) {
      out = escapeHtml(full) + " — " + "“" + escapeHtml(pref) + "”";
    } else {
      out = escapeHtml(full);
    }
    return out;
  }

  function mascotLine() {
    var adj = val("mascotAdj");
    var animal = val("mascotAnimal");
    var divider = val("divider") || "★";
    var piece = "";
    if (adj || animal) {
      var p = [];
      if (adj) p.push(adj);
      if (animal) p.push(animal);
      piece = p.join(" ");
    }
    if (piece) {
      return escapeHtml(divider) + " " + escapeHtml(piece);
    }
    return "";
  }

  function pictureSrc() {
    var url = val("pictureUrl");
    if (url) return url;
    // file uploads produce local paths we should not embed; use defaultImageUrl
    var def = val("defaultImageUrl");
    if (def) return def;
    return "images/intro/profile.jpg";
  }

  function collectBullets() {
    var root = document.getElementById("bullets");
    if (!root) return [];

    var rows = $$(".bullet-row, .bullet, .row", root);
    if (rows.length > 0) {
      var mapped = rows.map(function (row) {
        var firstEl = $("input[type='text'], textarea", row);
        var title = "";
        if (firstEl && typeof firstEl.value !== "undefined") {
          title = String(firstEl.value).trim();
        }
        var restInputs = $$("textarea, input[type='text']", row).slice(1);
        var restVals = restInputs.map(function (e) {
          return String(e.value || "").trim();
        }).filter(function (t) { return t; });
        var rest = restVals.join(" ");
        var obj = { title: title, text: rest || "" };
        if (obj.title || obj.text) return obj;
        return null;
      }).filter(function (r) { return r !== null; });
      return mapped;
    }

    var fields = $$("input[type='text'], textarea", root)
      .map(function (e) { return String(e.value || "").trim(); })
      .filter(function (t) { return t; });

    var out = [];
    var i;
    for (i = 0; i < fields.length; i += 2) {
      var t = fields[i] || "";
      var txt = fields[i + 1] || "";
      if (t || txt) out.push({ title: t, text: txt });
    }
    return out;
  }

  function collectCourses() {
    var root = document.getElementById("courses");
    if (!root) return [];
    var rows = $$(".course-row, .row, fieldset", root);

    if (rows.length === 0) {
      var fields = $$("input, textarea, select", root).map(function (e) {
        return String(e.value || "").trim();
      });
      var out = [];
      var i;
      for (i = 0; i < fields.length; i += 4) {
        var dept = fields[i] || "";
        var num = fields[i + 1] || "";
        var name = fields[i + 2] || "";
        var reason = fields[i + 3] || "";
        if (dept || num || name || reason) {
          out.push({ dept: dept, num: num, name: name, reason: reason });
        }
      }
      return out;
    }

    var mapped = rows.map(function (row) {
      var vals = $$("input, textarea, select", row).map(function (e) {
        return String(e.value || "").trim();
      });
      var dept = vals[0] || "";
      var num = vals[1] || "";
      var name = vals[2] || "";
      var reason = "";
      if (vals.length > 3) {
        reason = vals.slice(3).join(" ");
      }
      if (dept || num || name || reason) return { dept: dept, num: num, name: name, reason: reason };
      return null;
    }).filter(function (x) { return x !== null; });

    return mapped;
  }

  function collectLinks() {
    var root = document.getElementById("links");
    if (!root) return [];

    var rows = $$(".link-row, .row, fieldset, .link", root);
    if (rows.length > 0) {
      var list = rows.map(function (row) {
        var inputs = $$("input[type='text'], input[type='url']", row);
        var text = "";
        var href = "";
        if (inputs[0] && typeof inputs[0].value !== "undefined") {
          text = String(inputs[0].value).trim();
        }
        if (inputs[1] && typeof inputs[1].value !== "undefined") {
          href = String(inputs[1].value).trim();
        }
        if (text || href) return { text: text, href: href };
        return null;
      }).filter(function (x) { return x !== null; });
      return list;
    }

    var inputs = $$( "input[type='text'], input[type='url']", root)
      .map(function (e) { return String(e.value || "").trim(); });
    var out = [];
    var i;
    for (i = 0; i < inputs.length; i += 2) {
      var text = inputs[i] || "";
      var href = inputs[i + 1] || "";
      if (text || href) out.push({ text: text, href: href });
    }
    return out;
  }

  function buildIntroHtmlLiteral() {
    var name = nameLine();          // John A. Hand — “Iohannes Manus”
    var mascot = mascotLine();      // • Jolly Hound
    var imgSrc = pictureSrc();
    var imgCaption = val("pictureCaption");

    var ackStatement = val("ackStatement");
    var ackDate = val("ackDate");

    var personal = val("personalStatement");
    var quote = val("quote");
    var quoteAuthor = val("quoteAuthor");
    var funny = val("funnyThing");
    var share = val("shareThing");

    var bullets = collectBullets();
    var courses = collectCourses();
    var links = collectLinks();

    var nameLineHtml = "";
    if (mascot) {
      nameLineHtml = escapeHtml(name) + " " + escapeHtml(mascot);
    } else {
      nameLineHtml = escapeHtml(name);
    }

    var figCap = "";
    if (imgCaption) {
      figCap = "<figcaption>" + escapeHtml(imgCaption) + "</figcaption>";
    }
    var figureHtml =
"<figure>\n" +
"  <img src=\"" + escapeHtml(imgSrc) + "\" alt=\"Profile image for " + escapeHtml(name) + "\" />\n" +
"  " + figCap + "\n" +
"</figure>";

    var ackHtml =
"<p class=\"ack\"><em>" + escapeHtml(ackStatement) + " — " + escapeHtml(ackDate) + "</em></p>";

    var personalHtml = "";
    if (personal) {
      personalHtml = "<section><h4>Personal Statement</h4><p>" + escapeHtml(personal) + "</p></section>";
    }

    var bulletsHtml = "";
    if (bullets.length > 0) {
      var bulletItems = bullets.map(function (b) {
        var inner = "";
        if (b.title) {
          inner += "<strong>" + escapeHtml(b.title) + ":</strong> ";
        }
        inner += escapeHtml(b.text || "");
        return "    <li>" + inner + "</li>";
      }).join("\n");
      bulletsHtml =
"<section>\n" +
"  <h4>Main Points</h4>\n" +
"  <ul>\n" + bulletItems + "\n" +
"  </ul>\n" +
"</section>";
    }

    var coursesHtml = "";
    if (courses.length > 0) {
      var courseItems = courses.map(function (c) {
        var lineParts = [];
        var left = [];
        if (c.dept) left.push(c.dept);
        if (c.num) left.push(c.num);
        var leftStr = left.join(" ");
        if (leftStr) lineParts.push(leftStr);
        if (c.name) lineParts.push("— " + c.name);
        var base = lineParts.join(" ");
        var why = "";
        if (c.reason) {
          why = " <span class=\"muted\">(" + escapeHtml(c.reason) + ")</span>";
        }
        return "    <li>" + escapeHtml(base) + why + "</li>";
      }).join("\n");
      coursesHtml =
"<section>\n" +
"  <h4>Courses</h4>\n" +
"  <ol>\n" + courseItems + "\n" +
"  </ol>\n" +
"</section>";
    }

    var quoteHtml = "";
    if (quote || quoteAuthor) {
      quoteHtml =
"<blockquote>\n" +
"  <p>" + escapeHtml(quote) + "</p>\n" +
"  <footer>— " + escapeHtml(quoteAuthor) + "</footer>\n" +
"</blockquote>";
    }

    var extrasList = [];
    if (funny) {
      extrasList.push("<li><strong>Funny thing:</strong> " + escapeHtml(funny) + "</li>");
    }
    if (share) {
      extrasList.push("<li><strong>Something to share:</strong> " + escapeHtml(share) + "</li>");
    }
    var extrasHtml = "";
    if (extrasList.length > 0) {
      extrasHtml = "<section><h4>Extras</h4><ul>\n" + extrasList.join("\n") + "\n</ul></section>";
    }

    var linksHtml = "";
    if (links.length > 0) {
      var linkItems = links.map(function (l) {
        var text = l.text || l.href || "Link";
        var href = l.href || "#";
        return "    <li><a href=\"" + escapeHtml(href) + "\" target=\"_blank\" rel=\"noopener\">" + escapeHtml(text) + "</a></li>";
      }).join("\n");
      linksHtml =
"<section>\n" +
"  <h4>Links</h4>\n" +
"  <ul>\n" + linkItems + "\n" +
"  </ul>\n" +
"</section>";
    }

    var htmlLiteral =
"<h2>Introduction HTML</h2>\n" +
"<h3>" + nameLineHtml + "</h3>\n" +
figureHtml + "\n" +
ackHtml + "\n" +
personalHtml + "\n" +
bulletsHtml + "\n" +
coursesHtml + "\n" +
quoteHtml + "\n" +
extrasHtml + "\n" +
linksHtml;

    return htmlLiteral;
  }

  function renderCodeBlock(literalHtml) {
    var wrap = document.createElement("section");
    wrap.setAttribute("id", "generated-html");
    wrap.setAttribute("aria-label", "Generated HTML Code");

    var pre = document.createElement("pre");
    var code = document.createElement("code");
    code.className = "language-html";
    code.textContent = literalHtml; // literal, not rendered

    pre.appendChild(code);
    wrap.appendChild(pre);
    return { wrap: wrap, code: code };
  }

  function switchViews() {
    var h2 = $("main h2");
    if (h2) h2.textContent = "Introduction HTML";
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

  function generateAndShow() {
    var literal = buildIntroHtmlLiteral();
    var mount = switchViews();
    var rendered = renderCodeBlock(literal);
    mount.appendChild(rendered.wrap);

    if (window.hljs && typeof window.hljs.highlightElement === "function") {
      window.hljs.highlightElement(rendered.code);
    }
  }

  function init() {
    var btn = document.getElementById("btnGenerateHtml");
    if (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        generateAndShow();
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();