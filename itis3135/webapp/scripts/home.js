// scripts/home.js
(function () {
  var dataUrl = "data/data.json";
  var currencyCode = "USD";

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  /* ========= Formatting Helpers ========= */
  function fmtMoney(value, currency) {
    var num = parseFloat(value);
    if (isNaN(num)) num = 0;

    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || currencyCode
    }).format(num);
  }

  function fmtDate(iso) {
    if (!iso) return "";

    if (iso.length === 10) {
      iso = iso + "T00:00:00";
    }

    var d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit"
    });
  }

  /* ========= Data Load ========= */
  function loadJson() {
    return fetch(dataUrl, { cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error("Failed to load " + dataUrl);
      return res.json();
    });
  }

  function getLocalTxns() {
    try {
      var raw = localStorage.getItem("userTxns");
      return JSON.parse(raw || "[]");
    } catch (e) {
      return [];
    }
  }

  function setLocalTxns(arr) {
    localStorage.setItem("userTxns", JSON.stringify(arr || []));
  }

  function normalize(data) {
    var baseExpenses = Array.isArray(data.expenses) ? data.expenses : [];
    var baseIncome = Array.isArray(data.income) ? data.income : [];

    var local = getLocalTxns();
    var extraExpenses = [];
    var extraIncome = [];

    for (var i = 0; i < local.length; i++) {
      var t = local[i];
      if ((t.type || "expense") === "expense") extraExpenses.push(t);
      else if (t.type === "income") extraIncome.push(t);
    }

    return {
      users: Array.isArray(data.users) ? data.users : [],
      expenses: baseExpenses.concat(extraExpenses),
      income: baseIncome.concat(extraIncome)
    };
  }

  /* ========= Computations ========= */
  function computeOverview(expenses, income) {
    var totalSpending = 0;
    var totalIncome = 0;

    for (var i = 0; i < expenses.length; i++) {
      totalSpending += parseFloat(expenses[i].amount) || 0;
    }
    for (var j = 0; j < income.length; j++) {
      totalIncome += parseFloat(income[j].amount) || 0;
    }

    var netBalance = totalIncome - totalSpending;

    var categories = {};
    for (var k = 0; k < expenses.length; k++) {
      var cat = expenses[k].category || "Uncategorized";
      var amt = parseFloat(expenses[k].amount) || 0;
      categories[cat] = (categories[cat] || 0) + amt;
    }

    var dates = [];
    for (var m = 0; m < expenses.length; m++) {
      if (expenses[m].date) dates.push(expenses[m].date);
    }
    for (var n = 0; n < income.length; n++) {
      if (income[n].date) dates.push(income[n].date);
    }

    dates.sort();
    var latestIso = dates.length ? dates[dates.length - 1] : null;

    if (latestIso && latestIso.length === 10) {
      latestIso = latestIso + "T00:00:00";
    }

    var lastUpdated = latestIso
      ? new Date(latestIso).toISOString()
      : new Date().toISOString();

    return {
      totalSpending: totalSpending,
      totalIncome: totalIncome,
      netBalance: netBalance,
      categories: categories,
      lastUpdated: lastUpdated,
      currency: currencyCode
    };
  }

  /* ========= Rendering ========= */
  function renderKpis(comp) {
    $("#kpiIncome").textContent = fmtMoney(comp.totalIncome);
    $("#kpiSpending").textContent = fmtMoney(comp.totalSpending);
    $("#kpiBalance").textContent = fmtMoney(comp.netBalance);

    $("#lastUpdated").textContent =
      "Data updated " + new Date(comp.lastUpdated).toLocaleString();
  }

  function renderRecent(tbody, expenses) {
    if (!tbody) return;
    tbody.innerHTML = "";

    var sorted = expenses
      .slice()
      .sort(function (a, b) {
        return (a.date || "").localeCompare(b.date || "");
      })
      .slice(-8)
      .reverse();

    for (var i = 0; i < sorted.length; i++) {
      var t = sorted[i];
      var tr = document.createElement("tr");

      tr.innerHTML =
        "<td>" +
        fmtDate(t.date) +
        "</td><td>" +
        (t.source || "") +
        "</td><td>" +
        (t.category || "") +
        "</td><td class=\"num\">" +
        fmtMoney(t.amount) +
        "</td><td>" +
        (t.paymentMethod || t.method || "") +
        "</td><td>" +
        (t.notes || "") +
        "</td>";

      tbody.appendChild(tr);
    }

    if (!tbody.children.length) {
      var trEmpty = document.createElement("tr");
      trEmpty.innerHTML =
        '<td colspan="6" class="subtle">No expenses yet.</td>';
      tbody.appendChild(trEmpty);
    }
  }

  function renderLegend(container, categories) {
    if (!container) return;

    container.innerHTML = "";
    var palette = ["#0057b8", "#00a3e0", "#1e3a8a", "#0ea5e9", "#2563eb", "#0891b2", "#3b82f6"];

    var keys = Object.keys(categories);
    for (var i = 0; i < keys.length; i++) {
      var name = keys[i];

      var chip = document.createElement("span");
      chip.className = "chip";
      chip.style.color = palette[i % palette.length];
      chip.innerHTML = '<span class="dot" aria-hidden="true"></span>' + name;

      container.appendChild(chip);
    }
  }

  function renderBreakdown(listEl, categories) {
    if (!listEl) return;

    listEl.innerHTML = "";
    var keys = Object.keys(categories);

    var total = 0;
    for (var i = 0; i < keys.length; i++) {
      total += categories[keys[i]];
    }

    var entries = keys
      .map(function (k) {
        return [k, categories[k]];
      })
      .sort(function (a, b) {
        return b[1] - a[1];
      });

    for (var j = 0; j < entries.length; j++) {
      var name = entries[j][0];
      var amt = entries[j][1];
      var pct = total ? Math.round((amt / total) * 100) : 0;

      var li = document.createElement("li");
      li.innerHTML =
        "<span>" +
        name +
        "</span><span>" +
        fmtMoney(amt) +
        " (" +
        pct +
        "%)</span>";

      listEl.appendChild(li);
    }
  }

  /* ========= Canvas Bar Chart ========= */
  function drawBarChart(canvas, dataObj) {
    if (!canvas) return;

    var ctx = canvas.getContext("2d");
    var keys = Object.keys(dataObj || {});
    var values = [];

    for (var i = 0; i < keys.length; i++) {
      values.push(parseFloat(dataObj[keys[i]]) || 0);
    }

    var max = 1;
    for (var j = 0; j < values.length; j++) {
      if (values[j] > max) max = values[j];
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var P = { t: 20, r: 20, b: 50, l: 40 };
    var innerWidth = canvas.width - P.l - P.r;
    var innerHeight = canvas.height - P.t - P.b;

    ctx.lineWidth = 1;
    ctx.strokeStyle = "#e5e7eb";
    ctx.beginPath();
    ctx.moveTo(P.l, P.t);
    ctx.lineTo(P.l, P.t + innerHeight);
    ctx.lineTo(P.l + innerWidth, P.t + innerHeight);
    ctx.stroke();

    var gap = 14;
    var barWidth = Math.max(
      10,
      (innerWidth - gap * (keys.length + 1)) / (keys.length || 1)
    );

    var palette = ["#0057b8", "#00a3e0", "#1e3a8a", "#0ea5e9", "#2563eb", "#0891b2", "#3b82f6"];

    for (var k = 0; k < keys.length; k++) {
      var v = values[k];
      var h = (v / max) * (innerHeight - 10);
      var x = P.l + gap + k * (barWidth + gap);
      var y = P.t + innerHeight - h;

      ctx.fillStyle = palette[k % palette.length];
      ctx.fillRect(x, y, barWidth, h);

      ctx.fillStyle = "#111827";
      ctx.font = "12px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(String(v.toFixed(2)), x + barWidth / 2, y - 6);

      ctx.fillStyle = "#6b7280";
      ctx.save();
      ctx.translate(x + barWidth / 2, P.t + innerHeight + 16);
      ctx.rotate(-Math.PI / 10);
      ctx.fillText(keys[k], 0, 0);
      ctx.restore();
    }
  }

  /* ========= UI Actions ========= */
  function personalizeWelcome(users) {
    var storedName = sessionStorage.getItem("currentUserName");
    var el = $("#welcomeTitle");

    if (storedName) {
      el.textContent = "Welcome back, " + storedName;
      return;
    }

    if (users && users.length && users[0].name) {
      el.textContent = "Welcome back, " + users[0].name;
    } else {
      el.textContent = "Welcome back";
    }
  }

  function openModal() {
    var modal = $("#addTxnModal");
    if (modal) modal.classList.remove("hidden");
  }

  function closeModal() {
    var modal = $("#addTxnModal");
    if (modal) modal.classList.add("hidden");
  }

  function wireInteractions(refresh, allDataRef) {
    var btnUpload = $("#btnUpload");
    if (btnUpload) {
      btnUpload.addEventListener("click", function () {
        window.location.href = "./upload.html";
      });
    }

    var btnReports = $("#btnReports");
    if (btnReports) {
      btnReports.addEventListener("click", function () {
        window.location.href = "./reports.html";
      });
    }

    var btnAddTxn = $("#btnAddTxn");
    if (btnAddTxn) btnAddTxn.addEventListener("click", openModal);

    var btnCancel = $("#btnCancelModal");
    if (btnCancel) btnCancel.addEventListener("click", closeModal);

    var form = $("#txnForm");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();

        var newTxn = {
          type: "expense",
          date: $("#txnDate") ? $("#txnDate").value : "",
          source: $("#txnSource") ? $("#txnSource").value.trim() : "",
          category: $("#txnCategory") ? $("#txnCategory").value.trim() : "",
          amount: parseFloat($("#txnAmount") ? $("#txnAmount").value : ""),
          paymentMethod: $("#txnMethod") ? $("#txnMethod").value.trim() : "",
          notes: $("#txnNotes") ? $("#txnNotes").value.trim() : ""
        };

        if (
          !newTxn.date ||
          !newTxn.source ||
          !newTxn.category ||
          !isFinite(newTxn.amount)
        ) {
          alert("Please fill in Date, Amount, Source, and Category.");
          return;
        }

        var list = getLocalTxns();
        list.push(newTxn);
        setLocalTxns(list);

        closeModal();
        form.reset();
        refresh();
        alert("Transaction added!");
      });
    }

    var btnExport = $("#btnExport");
    if (btnExport) {
      btnExport.addEventListener("click", function () {
        var current = allDataRef.current || { expenses: [], income: [] };
        var expenses = current.expenses;
        var income = current.income;

        var rows = [
          ["type", "id", "date", "source", "category", "amount", "paymentMethod", "notes"]
        ];

        function pushRows(arr, type) {
          for (var i = 0; i < arr.length; i++) {
            var t = arr[i];
            rows.push([
              type,
              t.id || "",
              t.date || "",
              t.source || "",
              t.category || "",
              t.amount || 0,
              t.paymentMethod || t.method || "",
              t.notes || ""
            ]);
          }
        }

        pushRows(expenses, "expense");
        pushRows(income, "income");

        var csv = "";
        for (var r = 0; r < rows.length; r++) {
          var line = "";
          for (var c = 0; c < rows[r].length; c++) {
            var cell = String(rows[r][c]);
            if (/[",\n]/.test(cell)) {
              cell = '"' + cell.replace(/"/g, '""') + '"';
            }
            line += (c > 0 ? "," : "") + cell;
          }
          csv += line + "\n";
        }

        var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download =
          "finance_export_" + new Date().toISOString().slice(0, 10) + ".csv";

        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });
    }
  }

  /* ========= Render Cycle ========= */
  function init() {
    var allDataRef = { current: null };

    function refresh() {
      return loadJson()
        .then(function (raw) {
          var merged = normalize(raw);

          allDataRef.current = {
            expenses: merged.expenses,
            income: merged.income
          };

          personalizeWelcome(merged.users);

          var comp = computeOverview(merged.expenses, merged.income);
          renderKpis(comp);
          renderRecent($("#txnTbody"), merged.expenses);
          drawBarChart($("#categoriesChart"), comp.categories);
          renderLegend($("#chartLegend"), comp.categories);
          renderBreakdown($("#categoryList"), comp.categories);
        })
        .catch(function () {
          $("#lastUpdated").textContent = "Could not load data.";
          $("#txnTbody").innerHTML =
            '<tr><td colspan="6" class="subtle">Failed to load expenses.</td></tr>';
        });
    }

    wireInteractions(refresh, allDataRef);
    refresh();
  }

  // Start immediately
  init();
})();
