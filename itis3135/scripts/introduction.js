/**
 * File: scripts/introduction.js
 * Purpose: BYO - Introduction Form logic
 */

/* ======================= MINI QUERY HELPERS ======================= */
function $(sel, root) {
  return (root || document).querySelector(sel);
}
function $$(sel, root) {
  var list = (root || document).querySelectorAll(sel);
  return Array.prototype.slice.call(list);
}

/* ======================= DEFAULTS (EDIT THESE) ======================= */
var defaultData = {
  firstName: "John",
  middleName: "Alexander",
  preferredName: "Iohannes Manus",
  lastName: "Hand",

  ackStatement: "I certify that this page is my original work and abides by course guidelines.",
  ackDate: new Date().toISOString().slice(0, 10),

  mascotAdj: "Jolly",
  mascotAnimal: "Hound",
  divider: "•",

  pictureCaption: "John Hand — Mathematics & Web Dev Student at UNC Charlotte",

  personalStatement:
    "I’m a senior Mathematics major at UNC Charlotte who enjoys game design, systems thinking, and building polished web apps.",

  bullets: [
    { title: "Personal Background",       text: "Born and raised in NC; I enjoy hiking, swimming, running, and big questions." },
    { title: "Professional Background",   text: "Preceptor, RA, and student leader with finance/inventory responsibilities." },
    { title: "Academic Background",       text: "BS Mathematics (’26), Honors College; Calc I–III, Linear Algebra, DEs, Stats." },
    { title: "Primary Computer Platform", text: "Custom Windows PC (Ryzen 7 7700X) and MacBook Air M3." },
    { title: "Courses I’m Taking & Why",  text: "See course list below—each chosen to sharpen practical dev + analytics." },
    { title: "Interesting Fact",          text: "Built a large Mekanism factory in Minecraft and a 3D Godot RPG." },
    { title: "Goals for This Course",     text: "Ship accessible, validated, well-structured front-end projects." }
  ],

  courses: [
    { dept: "ITIS", number: "3135", name: "Front-End Web App Dev",   reason: "Deepen accessible, production-worthy FE skills." },
    { dept: "MATH", number: "3163", name: "Intro to Modern Algebra", reason: "Strengthen abstraction and rigor." }
  ],

  quote: "Mathematics, rightly viewed, possesses not only truth, but supreme beauty.",
  quoteAuthor: "Bertrand Russell",

  funnyThing: "",
  shareThing: "",

  links: [
    { label: "LinkedIn",       url: "https://www.linkedin.com/in/johnahand" },
    { label: "Personal Site",  url: "https://thequantifier.com" },
    { label: "Roundelay Farm", url: "https://roundelay.farm" },
    { label: "GitHub",         url: "https://github.com/thequantifier" },
    { label: "UNC Charlotte",  url: "https://www.charlotte.edu" }
  ]
};

/* ======================= DOM REFERENCES ======================= */
var form         = $("#intro-form");
var resultView   = $("#result-view");
var formView     = $("#form-view");
var errorsEl     = $("#errors");
var defaultImgEl = $("#defaultImageUrl");

var bulletsWrap  = $("#bullets");
var coursesWrap  = $("#courses");
var linksWrap    = $("#links");
var addCourseBtn = $("#add-course");
var clearBtn     = $("#clear-all");

/* ======================= UTILS ======================= */
function setVal(id, val) {
  var el = document.getElementById(id);
  if (el) {
    if (val === undefined || val === null) {
      el.value = "";
    } else {
      el.value = String(val);
    }
  }
}

function escapeHtml(s) {
  if (s === undefined || s === null) s = "";
  s = String(s);
  return s.replace(/[&<>"']/g, function (m) {
    var map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return map[m];
  });
}

function padToCount(arr, count, filler) {
  var out = [];
  if (Object.prototype.toString.call(arr) === "[object Array]") {
    for (var i = 0; i < arr.length; i++) out.push(arr[i]);
  }
  if (typeof count !== "number" || count < 1) count = 1;
  while (out.length < count) {
    var add = {};
    if (filler) {
      for (var k in filler) {
        if (Object.prototype.hasOwnProperty.call(filler, k)) add[k] = filler[k];
      }
    }
    out.push(add);
  }
  if (out.length > count) out.length = count;
  return out;
}

function removeChildren(node) {
  if (!node) return;
  while (node.firstChild) node.removeChild(node.firstChild);
}

/* ======================= ROW BUILDERS ======================= */
function bulletRow(index, title, text) {
  if (!title) title = "";
  if (!text)  text  = "";
  var idT = "bullet-title-" + index;
  var idC = "bullet-text-" + index;

  var row = document.createElement("div");
  row.className = "row";
  row.innerHTML =
    '<label for="' + idT + '">Bullet ' + (index + 1) + ' Title<span aria-hidden="true"> *</span>' +
      '<input id="' + idT + '" name="bulletTitle" type="text" required placeholder="e.g., Personal Background" value="' + escapeHtml(title) + '" />' +
    '</label>' +
    '<label for="' + idC + '">Bullet ' + (index + 1) + ' Text<span aria-hidden="true"> *</span>' +
      '<input id="' + idC + '" name="bulletText" type="text" required placeholder="One sentence summary" value="' + escapeHtml(text) + '" />' +
    '</label>';
  return row;
}

function courseRow(course) {
  if (!course) course = {};
  var dept   = course.dept   || "";
  var number = course.number || "";
  var name   = course.name   || "";
  var reason = course.reason || "";

  var row = document.createElement("div");
  row.className = "row course-row";
  row.innerHTML =
    '<label>Dept<span aria-hidden="true"> *</span>' +
      '<input name="courseDept" type="text" required placeholder="ITIS" value="' + escapeHtml(dept) + '" />' +
    '</label>' +
    '<label>No.<span aria-hidden="true"> *</span>' +
      '<input name="courseNumber" type="text" required inputmode="numeric" placeholder="3135" value="' + escapeHtml(number) + '" />' +
    '</label>' +
    '<label>Name<span aria-hidden="true"> *</span>' +
      '<input name="courseName" type="text" required placeholder="Front-End Web App Dev" value="' + escapeHtml(name) + '" />' +
    '</label>' +
    '<label>Reason<span aria-hidden="true"> *</span>' +
      '<input name="courseReason" type="text" required placeholder="Why this course?" value="' + escapeHtml(reason) + '" />' +
    '</label>' +
    '<button type="button" class="btn danger remove-course" aria-label="Remove course">✕</button>';
  return row;
}

function linkRow(index, label, url) {
  if (!label) label = "";
  if (!url)   url   = "";
  var idL = "link-label-" + index;
  var idU = "link-url-" + index;

  var row = document.createElement("div");
  row.className = "row";
  row.innerHTML =
    '<label for="' + idL + '">Link ' + (index + 1) + ' Label<span aria-hidden="true"> *</span>' +
      '<input id="' + idL + '" name="linkLabel" type="text" required placeholder="LinkedIn" value="' + escapeHtml(label) + '" />' +
    '</label>' +
    '<label for="' + idU + '">URL<span aria-hidden="true"> *</span>' +
      '<input id="' + idU + '" name="linkUrl" type="url" required placeholder="https://..." value="' + escapeHtml(url) + '" />' +
    '</label>';
  return row;
}

/* ======================= SEED FORM ======================= */
function seedForm() {
  setVal("firstName",         defaultData.firstName);
  setVal("middleName",        defaultData.middleName);
  setVal("preferredName",     defaultData.preferredName);
  setVal("lastName",          defaultData.lastName);

  setVal("ackStatement",      defaultData.ackStatement);
  setVal("ackDate",           defaultData.ackDate);

  setVal("mascotAdj",         defaultData.mascotAdj);
  setVal("mascotAnimal",      defaultData.mascotAnimal);
  setVal("divider",           defaultData.divider);

  setVal("pictureUrl",        "");
  setVal("pictureCaption",    defaultData.pictureCaption);

  setVal("personalStatement", defaultData.personalStatement);

  // Bullets
  removeChildren(bulletsWrap);
  var seven = padToCount(defaultData.bullets, 7, { title: "", text: "" });
  for (var i = 0; i < seven.length; i++) {
    bulletsWrap.appendChild(bulletRow(i, seven[i].title || "", seven[i].text || ""));
  }

  // Courses
  removeChildren(coursesWrap);
  for (var j = 0; j < defaultData.courses.length; j++) {
    coursesWrap.appendChild(courseRow(defaultData.courses[j]));
  }

  // Links
  removeChildren(linksWrap);
  var five = padToCount(defaultData.links, 5, { label: "", url: "" });
  for (var k = 0; k < five.length; k++) {
    linksWrap.appendChild(linkRow(k, five[k].label || "", five[k].url || ""));
  }

  errorsEl.hidden = true;
  errorsEl.innerHTML = "";
}

/* ======================= VALIDATION ======================= */
function validateRequired() {
  errorsEl.innerHTML = "";
  errorsEl.hidden = true;

  // Clear old invalid styling
  var olds = $$(".invalid", form);
  for (var i = 0; i < olds.length; i++) {
    olds[i].classList.remove("invalid");
  }

  // Built-in required checks
  var invalids = $$("input:invalid, textarea:invalid", form);
  for (var a = 0; a < invalids.length; a++) invalids[a].classList.add("invalid");

  // Exactly 7 bullets with values
  var titles = $$("input[name='bulletTitle']", form);
  var texts  = $$("input[name='bulletText']", form);
  var okBullets = (titles.length === 7 && texts.length === 7);
  if (okBullets) {
    for (var b = 0; b < 7; b++) {
      if (!titles[b].value.trim() || !texts[b].value.trim()) {
        okBullets = false; break;
      }
    }
  }

  // At least one complete course
  var rows = $$(".course-row", form);
  var okCourses = rows.length > 0;
  if (okCourses) {
    var depts   = $$("input[name='courseDept']", form);
    var numbers = $$("input[name='courseNumber']", form);
    var names   = $$("input[name='courseName']", form);
    var reasons = $$("input[name='courseReason']", form);
    for (var c = 0; c < depts.length; c++) {
      if (!depts[c].value.trim() || !numbers[c].value.trim() || !names[c].value.trim() || !reasons[c].value.trim()) {
        okCourses = false; break;
      }
    }
  }

  var problems = [];
  if (invalids.length) problems.push("Please complete all required fields.");
  if (!okBullets)      problems.push("Provide exactly seven bullets (each with a Title and Text).");
  if (!okCourses)      problems.push("Add at least one course with all four fields completed.");

  if (problems.length) {
    var list = "<ul>";
    for (var p = 0; p < problems.length; p++) list += "<li>" + problems[p] + "</li>";
    list += "</ul>";
    errorsEl.innerHTML = list;
    errorsEl.hidden = false;
    return false;
  }
  return true;
}

/* ======================= IMAGE HELPER ======================= */
function fileToDataURL(file) {
  return new Promise(function (resolve) {
    var reader = new FileReader();
    reader.onload = function (e) { resolve(e.target.result); };
    reader.readAsDataURL(file);
  });
}

/* ======================= DATA COLLECTION ======================= */
function gatherData() {
  return new Promise(function (resolve) {
    var data = {
      firstName:         $("#firstName").value.trim(),
      middleName:        $("#middleName").value.trim(),
      preferredName:     $("#preferredName").value.trim(),
      lastName:          $("#lastName").value.trim(),

      ackStatement:      $("#ackStatement").value.trim(),
      ackDate:           $("#ackDate").value,

      mascotAdj:         $("#mascotAdj").value.trim(),
      mascotAnimal:      $("#mascotAnimal").value.trim(),
      divider:           ($("#divider").value.trim() || "•"),

      pictureCaption:    $("#pictureCaption").value.trim(),
      personalStatement: $("#personalStatement").value.trim(),

      bullets: [],
      courses: [],
      quote:             $("#quote").value.trim(),
      quoteAuthor:       $("#quoteAuthor").value.trim(),

      funnyThing:        $("#funnyThing").value.trim(),
      shareThing:        $("#shareThing").value.trim(),

      links: [],
      imageSrc: ""
    };

    // Bullets
    var titles = $$("input[name='bulletTitle']", form);
    var texts  = $$("input[name='bulletText']", form);
    for (var i = 0; i < titles.length; i++) {
      data.bullets.push({ title: titles[i].value.trim(), text: texts[i].value.trim() });
    }

    // Courses
    var depts   = $$("input[name='courseDept']", form);
    var numbers = $$("input[name='courseNumber']", form);
    var names   = $$("input[name='courseName']", form);
    var reasons = $$("input[name='courseReason']", form);
    for (var j = 0; j < depts.length; j++) {
      data.courses.push({
        dept:   depts[j].value.trim(),
        number: numbers[j].value.trim(),
        name:   names[j].value.trim(),
        reason: reasons[j].value.trim()
      });
    }

    // Links (non-empty only)
    var linkLabels = $$("input[name='linkLabel']", form);
    var linkUrls   = $$("input[name='linkUrl']", form);
    for (var k = 0; k < linkLabels.length; k++) {
      var label = linkLabels[k].value.trim();
      var url   = linkUrls[k].value.trim();
      if (label && url) data.links.push({ label: label, url: url });
    }

    // Image: uploaded > URL > default
    var file = $("#picture").files && $("#picture").files[0];
    var imageSrc = $("#pictureUrl").value.trim();

    if (file) {
      fileToDataURL(file).then(function (dataUrl) {
        data.imageSrc = dataUrl;
        resolve(data);
      });
    } else {
      if (!imageSrc) {
        imageSrc = defaultImgEl ? defaultImgEl.value : "images/intro/profile.jpg";
      }
      data.imageSrc = imageSrc;
      resolve(data);
    }
  });
}

/* ======================= RESULT RENDER ======================= */
function renderResult(data) {
  // Bullets
  var bulletsHtml = "";
  for (var i = 0; i < data.bullets.length; i++) {
    var b = data.bullets[i];
    var bLabel = escapeHtml(b.title || "");
    var bText  = escapeHtml(b.text || "");
    bulletsHtml += "<li><strong>" + bLabel + ":</strong> " + bText + "</li>";
  }

  // Courses
  var divider = escapeHtml(data.divider || "•");
  var coursesHtml = "";
  for (var c = 0; c < data.courses.length; c++) {
    var cc = data.courses[c];
    var head = escapeHtml(cc.dept) + " " + escapeHtml(cc.number) + " " + divider + " " + escapeHtml(cc.name) + ": ";
    var reason = escapeHtml(cc.reason);
    coursesHtml += "<li><strong>" + head + "</strong>" + reason + "</li>";
  }

  // Links
  var linksHtml = "";
  for (var l = 0; l < data.links.length; l++) {
    var lk = data.links[l];
    linksHtml += '<li><a href="' + escapeHtml(lk.url) + '" target="_blank" rel="noopener">' +
                 escapeHtml(lk.label) + "</a></li>";
  }

  // Full name
  var parts = [];
  if (data.firstName) parts.push(data.firstName);
  if (data.middleName) parts.push(data.middleName);
  if (data.lastName) parts.push(data.lastName);
  var fullName = parts.join(" ");
  var preferred = data.preferredName ? " (" + escapeHtml(data.preferredName) + ")" : "";

  // HTML
  resultView.innerHTML =
    '<article class="intro-result">' +
      '<header class="intro-head">' +
        "<h2>Introduction Form</h2>" +
        '<p class="muted">' + escapeHtml(data.ackStatement) + " <em>" + escapeHtml(data.ackDate) + "</em></p>" +
      "</header>" +

      '<section class="identity">' +
        "<p><strong>Name:</strong> " + escapeHtml(fullName) + preferred + "</p>" +
        "<p><strong>Mascot:</strong> " + escapeHtml(data.mascotAdj) + " " + escapeHtml(data.mascotAnimal) + "</p>" +
      "</section>" +

      '<figure class="intro-figure">' +
        '<img src="' + data.imageSrc + '" alt="Profile image of ' + escapeHtml(fullName) + '" />' +
        "<figcaption>" + escapeHtml(data.pictureCaption) + "</figcaption>" +
      "</figure>" +

      '<section class="statement"><p>' + escapeHtml(data.personalStatement) + "</p></section>" +

      '<section class="bullets"><ul>' + bulletsHtml + "</ul></section>" +

      '<section class="courses"><h3>Current Courses</h3><ul>' + coursesHtml + "</ul></section>" +

      '<section class="quote"><blockquote><p>' + escapeHtml(data.quote) + "</p><footer>&mdash; " +
         escapeHtml(data.quoteAuthor) + "</footer></blockquote></section>" +

      (data.funnyThing ? "<p><strong>Funny thing:</strong> " + escapeHtml(data.funnyThing) + "</p>" : "") +
      (data.shareThing ? "<p><strong>Something to share:</strong> " + escapeHtml(data.shareThing) + "</p>" : "") +

      '<section class="links"><h3>Links</h3><ul>' + linksHtml + "</ul></section>" +

      '<div class="actions"><button type="button" id="restart" class="btn">Reset everything</button></div>' +
    "</article>";

  // Wire restart
  var restartBtn = $("#restart", resultView);
  if (restartBtn) {
    restartBtn.addEventListener("click", function () {
      resultView.hidden = true;
      formView.hidden = false;
      form.reset();
      seedForm();
      window.scrollTo(0, 0);
    });
  }
}

/* ======================= EVENT WIRING ======================= */
document.addEventListener("DOMContentLoaded", function () {
  seedForm();

  // Submit → validate → collect → render
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validateRequired()) return;

    gatherData().then(function (data) {
      renderResult(data);
      formView.hidden = true;
      resultView.hidden = false;
      window.scrollTo(0, 0);
    });
  });

  // Input → clear invalid highlight
  form.addEventListener("input", function (e) {
    var t = e.target || e.srcElement;
    if (t && t.classList && t.classList.contains("invalid")) {
      t.classList.remove("invalid");
    }
  });

  // Reset → restore defaults
  form.addEventListener("reset", function () {
    setTimeout(seedForm, 0);
  });

  // Clear → blank all fields and rebuild empty rows
  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      var inputs = $$("input, textarea", form);
      for (var i = 0; i < inputs.length; i++) {
        if (inputs[i].type === "file") inputs[i].value = "";
        else inputs[i].value = "";
      }
      removeChildren(bulletsWrap);
      for (var b = 0; b < 7; b++) bulletsWrap.appendChild(bulletRow(b, "", ""));
      removeChildren(coursesWrap);
      removeChildren(linksWrap);
      for (var m = 0; m < 5; m++) linksWrap.appendChild(linkRow(m, "", ""));
      errorsEl.hidden = true;
      errorsEl.innerHTML = "";
    });
  }

  // Add course
  if (addCourseBtn) {
    addCourseBtn.addEventListener("click", function () {
      coursesWrap.appendChild(courseRow());
    });
  }

  // Remove course (event delegation with closest fallback)
  coursesWrap.addEventListener("click", function (e) {
    var target = e.target || e.srcElement;
    if (target && target.classList && target.classList.contains("remove-course")) {
      var row = null;
      if (target.closest) {
        row = target.closest(".course-row");
      }
      if (!row) {
        var p = target.parentNode;
        while (p && p !== coursesWrap && (!p.classList || !p.classList.contains("course-row"))) {
          p = p.parentNode;
        }
        row = p;
      }
      if (row && row.parentNode) row.parentNode.removeChild(row);
    }
  });
});