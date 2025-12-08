// scripts/reports.js
// Validator-safe version (no optional catch binding, no optional chaining)

(function () {
  "use strict";

  var DATA_URL = "data/data.json";
  var LOCAL_KEY = "userTxns";
  var CURRENCY = "USD";
  var _pie = null; // Chart.js instance

  // ---------- Helpers ----------
  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function toNum(x) {
    var n = Number(x);
    return isFinite(n) ? n : 0;
  }

  function fmtMoney(n) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: CURRENCY
    }).format(toNum(n));
  }

  function fmtDate(iso) {
    if (!iso) return "";
    var s = iso.length === 10 ? iso + "T00:00:00" : iso;
    var d = new Date(s);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit"
    });
  }

  function yyyymm(iso) {
    if (!iso) return null;
    var m = iso.match(/^(\d{4})-(\d{2})/);
    return m ? m[1] + "-" + m[2] : null;
  }

  function normalizeDateKey(iso) {
    if (!iso) return null;
    var s = iso.length === 10 ? iso + "T00:00:00" : iso;
    var d = new Date(s);
    if (isNaN(d.getTime())) return null;
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, "0");
    var dd = String(d.getDate()).padStart(2, "0");
    return yyyy + "-" + mm + "-" + dd;
  }

  // ---------- Load & merge ----------
  function loadBase() {
    return fetch(DATA_URL, { cache: "no-store" }).then(function (res) {
      if (!res.ok) {
        throw new Error("Failed to load " + DATA_URL + " (" + res.status + ")");
      }
      return res.json();
    });
  }

  function getLocalTxns() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function mergeData(base) {
    var baseExp = Array.isArray(base.expenses) ? base.expenses : [];
    var baseInc = Array.isArray(base.income) ? base.income : [];
    var local = getLocalTxns();

    var localExp = local.filter(function (t) { return (t.type || "expense") === "expense"; });
    var localInc = local.filter(function (t) { return t.type === "income"; });

    var expenses = baseExp.concat(localExp).map(function (x) {
      return {
        date: x.date || "",
        source: x.source || "",
        category: x.category || "Uncategorized",
        amount: toNum(x.amount),
        method: x.payment_method || x.method || "",
        notes: x.notes || ""
      };
    });

    var income = baseInc.concat(localInc).map(function (x) {
      return {
        date: x.date || "",
        source: x.source || "",
        category: x.category || "Uncategorized",
        amount: toNum(x.amount),
        method: x.payment_method || x.method || "",
        notes: x.notes || ""
      };
    });

    return { expenses: expenses, income: income };
  }

  // ---------- Summary ----------
  function computeSummary(expenses) {
    var categories = {};
    var total = 0;

    var i, t, amt, cat;
    for (i = 0; i < expenses.length; i++) {
      t = expenses[i];
      amt = toNum(t.amount);
      total += amt;
      cat = t.category || "Uncategorized";
      categories[cat] = (categories[cat] || 0) + amt;
    }

    var monthsSet = {};
    for (i = 0; i < expenses.length; i++) {
      var key = yyyymm(expenses[i].date);
      if (key) monthsSet[key] = true;
    }
    var monthCount = Object.keys(monthsSet).length || 1;
    var monthlyAvg = total / monthCount;

    var top = "N/A";
    var max = 0;
    Object.keys(categories).forEach(function (k) {
      if (categories[k] > max) {
        max = categories[k];
        top = k;
      }
    });

    return {
      total: total,
      monthlyAvg: monthlyAvg,
      topCategory: top,
      categories: categories
    };
  }

  function sumByDate(rows) {
    var map = {};
    rows.forEach(function (r) {
      var key = normalizeDateKey(r.date);
      if (!key) return;
      map[key] = (map[key] || 0) + toNum(r.amount);
    });
    return map;
  }

  // ---------- Cards ----------
  function renderCards(summary) {
    function set(id, text) {
      var el = document.getElementById(id);
      if (el) el.textContent = text;
    }
    set("total-expenses", fmtMoney(summary.total));
    set("monthly-average", fmtMoney(summary.monthlyAvg));
    set("top-category", summary.topCategory || "N/A");
  }

  // ---------- PIE Chart ----------
  function renderPieChart(categories) {
    var canvas = $("#categoryChart");
    if (!canvas || typeof Chart === "undefined") return;

    var labels = Object.keys(categories);
    var values = labels.map(function (k) { return categories[k]; });

    var colors = [
      "#007bff", "#28a745", "#ffc107", "#dc3545",
      "#6f42c1", "#17a2b8", "#6610f2", "#6c757d",
      "#20c997", "#fd7e14"
    ];

    if (_pie) {
      _pie.destroy();
      _pie = null;
    }

    if (window.ChartDataLabels) {
      Chart.register(window.ChartDataLabels);
    }

    _pie = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [{
          label: "Spending by Category",
          data: values,
          backgroundColor: labels.map(function (_, i) {
            return colors[i % colors.length];
          }),
          borderWidth: 0
        }]
      },
      options: {
        responsive: false,
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return ctx.label + ": " + fmtMoney(ctx.parsed);
              }
            }
          }
        },
        cutout: "55%"
      }
    });
  }

  // ---------- Line Chart ----------
  function drawLineChart(canvas, seriesMap, toggles) {
    if (!canvas) return;
    var ctx = canvas.getContext("2d");

    // collect all dates
    var datesObj = {};
    function addKeys(obj) {
      if (!obj) return;
      Object.keys(obj).forEach(function (k) { datesObj[k] = true; });
    }
    addKeys(seriesMap.expenses);
    addKeys(seriesMap.income);
    var allDates = Object.keys(datesObj).sort();

    var expData = allDates.map(function (d) {
      return seriesMap.expenses && seriesMap.expenses[d] ? seriesMap.expenses[d] : 0;
    });

    var incData = allDates.map(function (d) {
      return seriesMap.income && seriesMap.income[d] ? seriesMap.income[d] : 0;
    });

    var enabledExp = toggles.expenses && toggles.expenses.checked;
    var enabledInc = toggles.income && toggles.income.checked;

    var maxY = 1;
    expData.forEach(function (v) { if (enabledExp && v > maxY) maxY = v; });
    incData.forEach(function (v) { if (enabledInc && v > maxY) maxY = v; });

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var P = { t: 20, r: 20, b: 50, l: 50 };
    var innerW = canvas.width - P.l - P.r;
    var innerH = canvas.height - P.t - P.b;

    // axes
    ctx.strokeStyle = "#e5e7eb";
    ctx.beginPath();
    ctx.moveTo(P.l, P.t);
    ctx.lineTo(P.l, P.t + innerH);
    ctx.lineTo(P.l + innerW, P.t + innerH);
    ctx.stroke();

    // y ticks
    ctx.fillStyle = "#6b7280";
    ctx.font = "12px system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
    var i;
    for (i = 0; i <= 4; i++) {
      var val = (i / 4) * maxY;
      var y = P.t + innerH - (val / maxY) * (innerH - 10);
      ctx.fillText(fmtMoney(val), 4, y + 4);
      ctx.beginPath();
      ctx.strokeStyle = "#f3f4f6";
      ctx.moveTo(P.l, y);
      ctx.lineTo(P.l + innerW, y);
      ctx.stroke();
    }

    function plotLine(data, color) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      var stepX = innerW / Math.max(1, data.length - 1);

      data.forEach(function (v, i) {
        var x = P.l + i * stepX;
        var y = P.t + innerH - (v / maxY) * (innerH - 10);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // fill
      ctx.fillStyle = color + "33";
      ctx.beginPath();
      data.forEach(function (v, i) {
        var x = P.l + i * stepX;
        var y = P.t + innerH - (v / maxY) * (innerH - 10);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.lineTo(P.l + innerW, P.t + innerH);
      ctx.lineTo(P.l, P.t + innerH);
      ctx.closePath();
      ctx.fill();
    }

    if (enabledExp) plotLine(expData, "#dc3545");
    if (enabledInc) plotLine(incData, "#28a745");

    // x labels
    var tickEvery = Math.max(1, Math.floor(allDates.length / 8));
    ctx.textAlign = "center";
    allDates.forEach(function (d, i) {
      if (i % tickEvery !== 0 && i !== allDates.length - 1) return;
      var x = P.l + (innerW / Math.max(1, allDates.length - 1)) * i;
      ctx.fillText(fmtDate(d), x, P.t + innerH + 18);
    });
  }

  // ---------- Init ----------
  function init() {
    loadBase()
      .then(function (base) {
        var merged = mergeData(base);
        var expenses = merged.expenses;
        var income = merged.income;

        var summary = computeSummary(expenses);
        renderCards(summary);
        renderPieChart(summary.categories);

        var expenseByDate = sumByDate(expenses);
        var incomeByDate = sumByDate(income);

        var expToggle = $("#toggle-expenses");
        var incToggle = $("#toggle-income");

        function redraw() {
          drawLineChart(
            $("#monthlyChart"),
            { expenses: expenseByDate, income: incomeByDate },
            { expenses: expToggle, income: incToggle }
          );
        }

        redraw();
        if (expToggle) expToggle.addEventListener("change", redraw);
        if (incToggle) incToggle.addEventListener("change", redraw);
      })
      .catch(function (err) {
        console.error("Error loading reports:", err);
        var cards = document.querySelectorAll(".card p");
        for (var i = 0; i < cards.length; i++) {
          cards[i].textContent = "Error loading data";
        }
      });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
