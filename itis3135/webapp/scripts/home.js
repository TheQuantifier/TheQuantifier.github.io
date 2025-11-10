// scripts/home.js
(() => {
  const DATA_URL = "data/data.json"; // your local data file
  const CURRENCY = "USD";

  const $ = (sel, root = document) => root.querySelector(sel);

  // ============== Formatting helpers ==============
  const fmtMoney = (value, currency = CURRENCY) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency })
      .format(Number.isFinite(+value) ? +value : 0);

  const fmtDate = (iso) =>
    new Date(iso + (iso?.length === 10 ? "T00:00:00" : ""))
      .toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });

  // ============== Data load / merge ==============
  async function loadJson() {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${DATA_URL} (${res.status})`);
    return await res.json();
  }

  function getLocalTxns() {
    try {
      return JSON.parse(localStorage.getItem("userTxns") || "[]");
    } catch {
      return [];
    }
  }

  function setLocalTxns(arr) {
    localStorage.setItem("userTxns", JSON.stringify(arr || []));
  }

  function normalize(data) {
    const baseExpenses = Array.isArray(data.expenses) ? data.expenses : [];
    const baseIncome   = Array.isArray(data.income) ? data.income : [];

    // Ensure both have standard fields
    const local = getLocalTxns();
    const extraExpenses = local.filter(t => (t.type || "expense") === "expense");
    const extraIncome   = local.filter(t => t.type === "income");

    return {
      users: Array.isArray(data.users) ? data.users : [],
      expenses: [...baseExpenses, ...extraExpenses],
      income:   [...baseIncome,   ...extraIncome]
    };
  }

  // ============== Computations ==============
  function computeOverview(expenses, income) {
    const total_spending = expenses.reduce((sum, t) => sum + (+t.amount || 0), 0);
    const total_income   = income.reduce((sum, i) => sum + (+i.amount || 0), 0);
    const net_balance    = total_income - total_spending;

    const categories = expenses.reduce((acc, t) => {
      const key = t.category || "Uncategorized";
      acc[key] = (acc[key] || 0) + (+t.amount || 0);
      return acc;
    }, {});

    const dates = [...expenses.map(t => t.date), ...income.map(i => i.date)].filter(Boolean);
    const latestISO = dates.length ? dates.sort().slice(-1)[0] : null;
    const last_updated = latestISO
      ? new Date(latestISO + (latestISO.length === 10 ? "T00:00:00" : "")).toISOString()
      : new Date().toISOString();

    return { total_spending, total_income, net_balance, categories, last_updated, currency: CURRENCY };
  }

  // ============== Rendering ==============
  function renderKpis(comp) {
    $("#kpiIncome").textContent   = fmtMoney(comp.total_income, comp.currency);
    $("#kpiSpending").textContent = fmtMoney(comp.total_spending, comp.currency);
    $("#kpiBalance").textContent  = fmtMoney(comp.net_balance, comp.currency);
    $("#lastUpdated").textContent = `Data updated ${new Date(comp.last_updated).toLocaleString()}`;
  }

  function renderRecent(tbody, expenses) {
    if (!tbody) return;
    tbody.innerHTML = "";

    expenses.slice()
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
      .slice(-8)
      .reverse()
      .forEach(txn => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${fmtDate(txn.date)}</td>
          <td>${txn.source || ""}</td>
          <td>${txn.category || ""}</td>
          <td class="num">${fmtMoney(txn.amount)}</td>
          <td>${txn.payment_method || txn.method || ""}</td>
          <td>${txn.notes || ""}</td>
        `;
        tbody.appendChild(tr);
      });

    if (!tbody.children.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="6" class="subtle">No expenses yet.</td>`;
      tbody.appendChild(tr);
    }
  }

  function renderLegend(container, categories) {
    if (!container) return;
    container.innerHTML = "";
    const palette = ["#0057b8", "#00a3e0", "#1e3a8a", "#0ea5e9", "#2563eb", "#0891b2", "#3b82f6"];
    Object.keys(categories || {}).forEach((name, i) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.style.color = palette[i % palette.length];
      chip.innerHTML = `<span class="dot" aria-hidden="true"></span>${name}`;
      container.appendChild(chip);
    });
  }

  function renderBreakdown(listEl, categories) {
    if (!listEl) return;
    listEl.innerHTML = "";
    const total = Object.values(categories || {}).reduce((a, b) => a + b, 0);
    Object.entries(categories || {})
      .sort((a, b) => b[1] - a[1])
      .forEach(([name, amt]) => {
        const pct = total ? Math.round((amt / total) * 100) : 0;
        const li = document.createElement("li");
        li.innerHTML = `<span>${name}</span><span>${fmtMoney(amt)} (${pct}%)</span>`;
        listEl.appendChild(li);
      });
  }

  // Simple canvas bar chart (no libraries)
  function drawBarChart(canvas, dataObj) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const entries = Object.entries(dataObj || {});
    const labels = entries.map(e => e[0]);
    const values = entries.map(e => +e[1] || 0);
    const max = Math.max(1, ...values);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const P = { t: 20, r: 20, b: 50, l: 40 };
    const innerW = canvas.width - P.l - P.r;
    const innerH = canvas.height - P.t - P.b;

    // axes
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#e5e7eb";
    ctx.beginPath();
    ctx.moveTo(P.l, P.t);
    ctx.lineTo(P.l, P.t + innerH);
    ctx.lineTo(P.l + innerW, P.t + innerH);
    ctx.stroke();

    const gap = 14;
    const barW = Math.max(10, (innerW - gap * (values.length + 1)) / Math.max(values.length, 1));
    const palette = ["#0057b8", "#00a3e0", "#1e3a8a", "#0ea5e9", "#2563eb", "#0891b2", "#3b82f6"];

    values.forEach((v, i) => {
      const h = (v / max) * (innerH - 10);
      const x = P.l + gap + i * (barW + gap);
      const y = P.t + innerH - h;
      ctx.fillStyle = palette[i % palette.length];
      ctx.fillRect(x, y, barW, h);

      ctx.fillStyle = "#111827";
      ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(v.toFixed(2)), x + barW / 2, y - 6);

      ctx.fillStyle = "#6b7280";
      ctx.save();
      ctx.translate(x + barW / 2, P.t + innerH + 16);
      ctx.rotate(-Math.PI / 10);
      ctx.fillText(labels[i], 0, 0);
      ctx.restore();
    });
  }

  // ============== Actions / UI wiring ==============
  function personalizeWelcome(users) {
    // If you set sessionStorage on login (e.g., name/email), prefer that:
    const storedName = sessionStorage.getItem("currentUserName");
    if (storedName) {
      $("#welcomeTitle").textContent = `Welcome back, ${storedName}`;
      return;
    }
    // else fall back to first user in JSON or generic
    const name = users?.[0]?.name;
    $("#welcomeTitle").textContent = name ? `Welcome back, ${name}` : "Welcome back";
  }

  function openModal() {
    $("#addTxnModal")?.classList.remove("hidden");
  }

  function closeModal() {
    $("#addTxnModal")?.classList.add("hidden");
  }

  function wireInteractions(onRefresh, allDataRef) {
    $("#btnUpload")?.addEventListener("click", () => (window.location.href = "./upload.html"));
    $("#btnReports")?.addEventListener("click", () => (window.location.href = "./reports.html"));
    $("#btnAddTxn")?.addEventListener("click", openModal);
    $("#btnCancelModal")?.addEventListener("click", closeModal);

    // Save new transaction to localStorage
    $("#txnForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const newTxn = {
        type: "expense", // defaulting to expense; add a selector if you want income
        date: $("#txnDate")?.value,
        source: $("#txnSource")?.value?.trim(),
        category: $("#txnCategory")?.value?.trim(),
        amount: parseFloat($("#txnAmount")?.value),
        payment_method: $("#txnMethod")?.value?.trim(),
        notes: $("#txnNotes")?.value?.trim()
      };

      if (!newTxn.date || !newTxn.source || !newTxn.category || !Number.isFinite(newTxn.amount)) {
        alert("Please fill in Date, Amount, Source, and Category.");
        return;
      }

      const list = getLocalTxns();
      list.push(newTxn);
      setLocalTxns(list);

      closeModal();
      $("#txnForm").reset();
      onRefresh(); // re-render with new data
      alert("Transaction added!");
    });

    // Export CSV (expenses + income + local additions)
    $("#btnExport")?.addEventListener("click", () => {
      const { expenses, income } = allDataRef.current || { expenses: [], income: [] };
      const rows = [
        ["type", "id", "date", "source", "category", "amount", "payment_method", "notes"]
      ];

      expenses.forEach(e =>
        rows.push(["expense", e.id || "", e.date || "", e.source || "", e.category || "", e.amount || 0, e.payment_method || e.method || "", e.notes || ""])
      );
      income.forEach(i =>
        rows.push(["income", i.id || "", i.date || "", i.source || "", i.category || "", i.amount || 0, i.payment_method || i.method || "", i.notes || ""])
      );

      const csv = rows.map(r => r.map(cell => {
        const s = String(cell ?? "");
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(",")).join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `finance_export_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  // ============== Render cycle ==============
  async function init() {
    const allDataRef = { current: null };

    async function refresh() {
      try {
        const raw = await loadJson();
        const merged = normalize(raw);
        allDataRef.current = { expenses: merged.expenses, income: merged.income };

        personalizeWelcome(merged.users);

        const comp = computeOverview(merged.expenses, merged.income);
        renderKpis(comp);
        renderRecent($("#txnTbody"), merged.expenses);
        drawBarChart($("#categoriesChart"), comp.categories);
        renderLegend($("#chartLegend"), comp.categories);
        renderBreakdown($("#categoryList"), comp.categories);
      } catch (err) {
        console.error(err);
        $("#lastUpdated").textContent = "Could not load data.";
        $("#txnTbody").innerHTML = `<tr><td colspan="6" class="subtle">Failed to load expenses.</td></tr>`;
      }
    }

    wireInteractions(refresh, allDataRef);
    await refresh();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
