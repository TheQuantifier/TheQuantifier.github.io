// scripts/reports.js
// Offline reports: loads from data/data.json + merges userTxns from localStorage.
// Keeps your PIE (doughnut) chart via Chart.js + DataLabels plugin.
// The time-series line remains a lightweight custom canvas chart.

(() => {
  const DATA_URL = "data/data.json";
  const LOCAL_KEY = "userTxns";
  const CURRENCY = "USD";

  let _pie = null; // Chart.js instance

  const $ = (sel, root = document) => root.querySelector(sel);
  const toNum = (x) => (Number.isFinite(+x) ? +x : 0);

  const fmtMoney = (n) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: CURRENCY })
      .format(toNum(n));

  const fmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  };

  function yyyymm(iso) {
    if (!iso) return null;
    const m = iso.match(/^(\d{4})-(\d{2})/);
    return m ? `${m[1]}-${m[2]}` : null;
  }

  function normalizeDateKey(iso) {
    if (!iso) return null;
    const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
    if (isNaN(d)) return null;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  // ---------- Data load & merge ----------
  async function loadBase() {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${DATA_URL} (${res.status})`);
    return res.json();
  }

  function getLocalTxns() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]"); }
    catch { return []; }
  }

  function mergeData(base) {
    const baseExp = Array.isArray(base.expenses) ? base.expenses : [];
    const baseInc = Array.isArray(base.income)   ? base.income   : [];
    const local   = getLocalTxns();

    const localExp = local.filter(t => (t.type || "expense") === "expense");
    const localInc = local.filter(t => t.type === "income");

    const expenses = [...baseExp, ...localExp].map(x => ({
      date: x.date || "",
      source: x.source || "",
      category: x.category || "Uncategorized",
      amount: toNum(x.amount),
      method: x.payment_method || x.method || "",
      notes: x.notes || ""
    }));

    const income = [...baseInc, ...localInc].map(x => ({
      date: x.date || "",
      source: x.source || "",
      category: x.category || "Uncategorized",
      amount: toNum(x.amount),
      method: x.payment_method || x.method || "",
      notes: x.notes || ""
    }));

    return { expenses, income };
  }

  // ---------- Derivations ----------
  function computeSummary(expenses) {
    const categories = {};
    let total = 0;

    for (const t of expenses) {
      const amt = toNum(t.amount);
      total += amt;
      const cat = t.category || "Uncategorized";
      categories[cat] = (categories[cat] || 0) + amt;
    }

    // monthly average by distinct months with any expense
    const months = new Set(expenses.map(t => yyyymm(t.date)).filter(Boolean));
    const monthlyAvg = total / Math.max(1, months.size);

    // top category
    let top = "N/A";
    let max = 0;
    for (const [k, v] of Object.entries(categories)) {
      if (v > max) { max = v; top = k; }
    }

    return { total, monthlyAvg, topCategory: top, categories };
  }

  function sumByDate(rows) {
    const map = {};
    for (const r of rows) {
      const key = normalizeDateKey(r.date);
      if (!key) continue;
      map[key] = (map[key] || 0) + toNum(r.amount);
    }
    return map;
  }

  // ---------- Summary cards ----------
  function renderCards({ total, monthlyAvg, topCategory }) {
    const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    set("total-expenses", fmtMoney(total));
    set("monthly-average", fmtMoney(monthlyAvg));
    set("top-category", topCategory || "N/A");
  }

  // ---------- PIE (doughnut) with Chart.js ----------
  function renderPieChart(categories) {
    const canvas = $("#categoryChart");
    if (!canvas || typeof Chart === "undefined") return;

    const labels = Object.keys(categories || {});
    const values = Object.values(categories || {}).map(toNum);

    // palettes (repeat if needed)
    const colors = [
      "#007bff","#28a745","#ffc107","#dc3545",
      "#6f42c1","#17a2b8","#6610f2","#6c757d",
      "#20c997","#fd7e14"
    ];

    if (_pie) { _pie.destroy(); _pie = null; }

    // Register plugin if present
    if (window.ChartDataLabels) {
      Chart.register(window.ChartDataLabels);
    }

    _pie = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          label: "Spending by Category",
          data: values,
          backgroundColor: labels.map((_, i) => colors[i % colors.length]),
          borderWidth: 0
        }]
      },
      options: {
        responsive: false,
        plugins: {
          legend: { position: "bottom" },
          datalabels: window.ChartDataLabels ? {
            color: "#fff",
            font: { weight: "bold", size: 12 },
            formatter: (val, ctx) => {
              const data = ctx.chart.data.datasets[0].data;
              const total = data.reduce((s, v) => s + toNum(v), 0);
              if (!total) return "0%";
              const pct = (val / total) * 100;
              return `${pct.toFixed(1)}%`;
            }
          } : undefined,
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${fmtMoney(ctx.parsed)}`
            }
          }
        },
        cutout: "55%"
      }
    });
  }

  // ---------- Lightweight line chart (custom canvas) ----------
  function drawLineChart(canvas, seriesMap, toggles) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const allDates = Array.from(new Set([
      ...Object.keys(seriesMap.expenses || {}),
      ...Object.keys(seriesMap.income || {})
    ])).sort();

    const expData = allDates.map(d => toNum(seriesMap.expenses?.[d] || 0));
    const incData = allDates.map(d => toNum(seriesMap.income?.[d] || 0));

    const enabledExp = !!toggles.expenses?.checked;
    const enabledInc = !!toggles.income?.checked;

    const maxY = Math.max(
      1,
      ...(enabledExp ? expData : [0]),
      ...(enabledInc ? incData : [0])
    );

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const P = { t: 20, r: 20, b: 50, l: 50 };
    const innerW = canvas.width - P.l - P.r;
    const innerH = canvas.height - P.t - P.b;

    // axes
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(P.l, P.t);
    ctx.lineTo(P.l, P.t + innerH);
    ctx.lineTo(P.l + innerW, P.t + innerH);
    ctx.stroke();

    // y ticks (4)
    ctx.fillStyle = "#6b7280";
    ctx.font = "12px system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
    for (let i = 0; i <= 4; i++) {
      const val = (i / 4) * maxY;
      const y = P.t + innerH - (val / maxY) * (innerH - 10);
      ctx.fillText(fmtMoney(val), 4, y + 4);
      ctx.strokeStyle = "#f3f4f6";
      ctx.beginPath();
      ctx.moveTo(P.l, y);
      ctx.lineTo(P.l + innerW, y);
      ctx.stroke();
    }

    function plotLine(data, color) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const stepX = innerW / Math.max(1, data.length - 1);
      data.forEach((v, i) => {
        const x = P.l + i * stepX;
        const y = P.t + innerH - (v / maxY) * (innerH - 10);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // fill under line (soft)
      ctx.fillStyle = color + "33";
      ctx.beginPath();
      data.forEach((v, i) => {
        const x = P.l + i * stepX;
        const y = P.t + innerH - (v / maxY) * (innerH - 10);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.lineTo(P.l + innerW, P.t + innerH);
      ctx.lineTo(P.l, P.t + innerH);
      ctx.closePath();
      ctx.fill();
    }

    if (enabledExp) plotLine(expData, "#dc3545");  // red-ish
    if (enabledInc) plotLine(incData, "#28a745");  // green-ish

    // x labels (sparse)
    const tickEvery = Math.max(1, Math.floor(allDates.length / 8));
    ctx.fillStyle = "#6b7280";
    ctx.textAlign = "center";
    allDates.forEach((d, i) => {
      if (i % tickEvery !== 0 && i !== allDates.length - 1) return;
      const x = P.l + (innerW / Math.max(1, allDates.length - 1)) * i;
      ctx.fillText(fmtDate(d), x, P.t + innerH + 18);
    });
  }

  // ---------- init ----------
  async function init() {
    try {
      const base = await loadBase();
      const { expenses, income } = mergeData(base);

      // Summary
      const summary = computeSummary(expenses);
      renderCards(summary);

      // PIE chart for categories
      renderPieChart(summary.categories);

      // Line chart series
      const expenseByDate = sumByDate(expenses);
      const incomeByDate  = sumByDate(income);

      const expToggle = $("#toggle-expenses");
      const incToggle = $("#toggle-income");

      const redrawLine = () =>
        drawLineChart($("#monthlyChart"), { expenses: expenseByDate, income: incomeByDate }, { expenses: expToggle, income: incToggle });

      // initial draw + wiring
      redrawLine();
      expToggle?.addEventListener("change", redrawLine);
      incToggle?.addEventListener("change", redrawLine);

    } catch (err) {
      console.error("Error loading reports:", err);
      document.querySelectorAll(".card p").forEach(p => (p.textContent = "Error loading data"));
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
