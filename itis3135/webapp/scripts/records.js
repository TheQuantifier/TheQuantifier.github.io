// scripts/records.js
document.addEventListener("DOMContentLoaded", () => {
  // =================== Elements ===================
  const expenseTbody = document.getElementById("recordsTbody");
  const incomeTbody  = document.getElementById("recordsTbodyIncome");

  const filtersForm        = document.getElementById("filtersForm");
  const filtersFormIncome  = document.getElementById("filtersFormIncome");

  const expensePageInfo = document.getElementById("pageInfo");
  const incomePageInfo  = document.getElementById("pageInfoIncome");

  // Add modals
  const addExpenseModal = document.getElementById("addExpenseModal");
  const addIncomeModal  = document.getElementById("addIncomeModal");
  const expenseForm     = document.getElementById("expenseForm");
  const incomeForm      = document.getElementById("incomeForm");

  // Buttons
  const btnAddExpense   = document.getElementById("btnAddExpense");
  const btnAddIncome    = document.getElementById("btnAddIncome");
  const cancelExpenseBtn= document.getElementById("cancelExpenseBtn");
  const cancelIncomeBtn = document.getElementById("cancelIncomeBtn");
  const btnExportExpenses = document.getElementById("btnExportExpenses");
  const btnExportIncome   = document.getElementById("btnExportIncome");
  const btnUploadExpense  = document.getElementById("btnUploadExpense");
  const btnUploadIncome   = document.getElementById("btnUploadIncome");

  // =================== State ===================
  const DATA_URL = "data/data.json";
  const localKey = "userTxns";

  const state = {
    expenses: [],
    income: [],
    pager: {
      expenses: { page: 1, pageSize: 25 },
      income:   { page: 1, pageSize: 25 }
    }
  };

  // =================== Helpers ===================
  const $ = (sel, root=document) => root.querySelector(sel);

  const fmtMoney = (n) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" })
      .format(Number.isFinite(+n) ? +n : 0);

  const fmtDate = (iso) =>
    !iso ? "—" :
    new Date(iso + (iso.length === 10 ? "T00:00:00" : ""))
      .toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });

  function showModal(modal) { modal?.classList.remove("hidden"); }
  function hideModal(modal) { modal?.classList.add("hidden"); }

  function createRow(record) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${fmtDate(record.date)}</td>
      <td>${record.source || "—"}</td>
      <td>${record.category || "—"}</td>
      <td class="num">${fmtMoney(record.amount)}</td>
      <td>${record.payment_method || record.method || "—"}</td>
      <td>${record.notes || ""}</td>
    `;
    return tr;
  }

  function getLocalTxns() {
    try { return JSON.parse(localStorage.getItem(localKey) || "[]"); }
    catch { return []; }
  }

  function setLocalTxns(arr) {
    localStorage.setItem(localKey, JSON.stringify(arr || []));
  }

  function genId(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2,8)}-${Date.now().toString(36)}`;
  }

  // =================== Load & Normalize ===================
  async function loadData() {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${DATA_URL} (${res.status})`);
    const base = await res.json();

    const local = getLocalTxns();

    const baseExpenses = Array.isArray(base.expenses) ? base.expenses : [];
    const baseIncome   = Array.isArray(base.income)   ? base.income   : [];

    const localExpenses = local.filter(t => (t.type || "expense") === "expense");
    const localIncome   = local.filter(t => t.type === "income");

    state.expenses = [...baseExpenses, ...localExpenses].map(x => ({
      id: x.id || genId("TXN"),
      date: x.date || "",
      source: x.source || "",
      category: x.category || "",
      amount: Number(x.amount) || 0,
      payment_method: x.payment_method || x.method || "",
      notes: x.notes || ""
    }));

    state.income = [...baseIncome, ...localIncome].map(x => ({
      id: x.id || genId("INC"),
      date: x.date || "",
      source: x.source || "",
      category: x.category || "",
      amount: Number(x.amount) || 0,
      payment_method: x.payment_method || x.method || "",
      notes: x.notes || ""
    }));

    // Populate category dropdowns dynamically
    populateCategories("#category", state.expenses);
    populateCategories("#categoryIncome", state.income);

    // Sync page size from selects
    const psExp = parseInt($("#pageSize")?.value || "25", 10);
    const psInc = parseInt($("#pageSizeIncome")?.value || "25", 10);
    state.pager.expenses.pageSize = psExp;
    state.pager.income.pageSize   = psInc;

    renderAll();
  }

  function populateCategories(selectSel, items) {
    const sel = $(selectSel);
    if (!sel) return;
    const existing = new Set();
    [...sel.options].forEach(o => existing.add(o.value));
    const cats = [...new Set(items.map(i => i.category).filter(Boolean))].sort();
    sel.innerHTML = `<option value="">All</option>` + cats.map(c => `<option>${c}</option>`).join("");
  }

  // =================== Filtering / Sorting / Paging ===================
  function getFilterConfig(form, type) {
    return {
      q:        form.querySelector("input[type=search]")?.value.trim().toLowerCase() || "",
      category: form.querySelector(`#category${type || ""}`)?.value || "",
      method:   form.querySelector(`#method${type || ""}`)?.value || "",
      minDate:  form.querySelector(`#minDate${type || ""}`)?.value || "",
      maxDate:  form.querySelector(`#maxDate${type || ""}`)?.value || "",
      minAmt:   parseFloat(form.querySelector(`#minAmt${type || ""}`)?.value) || 0,
      maxAmt:   parseFloat(form.querySelector(`#maxAmt${type || ""}`)?.value) || Infinity,
      sort:     form.querySelector(`#sort${type || ""}`)?.value || "date_desc",
      pageSize: parseInt(form.querySelector(`#pageSize${type || ""}`)?.value) || 25
    };
  }

  function applyFilters(items, cfg) {
    let filtered = items.filter(r => {
      const mQ = !cfg.q ||
        (r.source && r.source.toLowerCase().includes(cfg.q)) ||
        (r.category && r.category.toLowerCase().includes(cfg.q)) ||
        (r.notes && r.notes.toLowerCase().includes(cfg.q));
      const mCat = !cfg.category || r.category === cfg.category;
      const method = r.payment_method || r.method || "";
      const mMethod = !cfg.method || method === cfg.method;
      const mDate = (!cfg.minDate || r.date >= cfg.minDate) && (!cfg.maxDate || r.date <= cfg.maxDate);
      const mAmt = r.amount >= cfg.minAmt && r.amount <= cfg.maxAmt;
      return mQ && mCat && mMethod && mDate && mAmt;
    });

    filtered.sort((a, b) => {
      switch (cfg.sort) {
        case "date_asc":    return (a.date || "").localeCompare(b.date || "");
        case "date_desc":   return (b.date || "").localeCompare(a.date || "");
        case "amount_asc":  return a.amount - b.amount;
        case "amount_desc": return b.amount - a.amount;
        case "source_asc":  return (a.source || "").localeCompare(b.source || "");
        case "source_desc": return (b.source || "").localeCompare(a.source || "");
        default:            return 0;
      }
    });

    return filtered;
  }

  function paginate(items, pager) {
    const total = items.length;
    const pages = Math.max(1, Math.ceil(total / pager.pageSize));
    const page  = Math.min(Math.max(1, pager.page), pages);
    const start = (page - 1) * pager.pageSize;
    const end   = start + pager.pageSize;
    return { page, pages, total, slice: items.slice(start, end) };
  }

  // =================== Rendering ===================
  function renderExpenses() {
    const cfg = getFilterConfig(filtersForm, "");
    state.pager.expenses.pageSize = cfg.pageSize;

    const filtered = applyFilters(state.expenses, cfg);
    const pageData = paginate(filtered, state.pager.expenses);

    expenseTbody.innerHTML = "";
    if (pageData.slice.length === 0) {
      expenseTbody.innerHTML = `<tr><td colspan="6" class="subtle">No matching records.</td></tr>`;
    } else {
      pageData.slice.forEach(r => expenseTbody.appendChild(createRow(r)));
    }
    if (expensePageInfo) {
      expensePageInfo.textContent = `Page ${pageData.page} of ${pageData.pages} · ${pageData.total} record(s)`;
    }
    // Enable/disable pager buttons
    $("#prevPage")?.toggleAttribute("disabled", pageData.page <= 1);
    $("#nextPage")?.toggleAttribute("disabled", pageData.page >= pageData.pages);
  }

  function renderIncome() {
    const cfg = getFilterConfig(filtersFormIncome, "Income");
    state.pager.income.pageSize = cfg.pageSize;

    const filtered = applyFilters(state.income, cfg);
    const pageData = paginate(filtered, state.pager.income);

    incomeTbody.innerHTML = "";
    if (pageData.slice.length === 0) {
      incomeTbody.innerHTML = `<tr><td colspan="6" class="subtle">No matching records.</td></tr>`;
    } else {
      pageData.slice.forEach(r => incomeTbody.appendChild(createRow(r)));
    }
    if (incomePageInfo) {
      incomePageInfo.textContent = `Page ${pageData.page} of ${pageData.pages} · ${pageData.total} record(s)`;
    }
    $("#prevPageIncome")?.toggleAttribute("disabled", pageData.page <= 1);
    $("#nextPageIncome")?.toggleAttribute("disabled", pageData.page >= pageData.pages);
  }

  function renderAll() {
    renderExpenses();
    renderIncome();
  }

  // =================== Add Expense / Income ===================
  btnAddExpense?.addEventListener("click", () => showModal(addExpenseModal));
  btnAddIncome ?.addEventListener("click", () => showModal(addIncomeModal));

  cancelExpenseBtn?.addEventListener("click", () => hideModal(addExpenseModal));
  cancelIncomeBtn ?.addEventListener("click", () => hideModal(addIncomeModal));

  expenseForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const payload = {
      type: "expense",
      id: genId("TXN"),
      date: $("#expenseDate")?.value,
      source: $("#expenseSource")?.value?.trim(),
      category: $("#expenseCategory")?.value?.trim(),
      amount: parseFloat($("#expenseAmount")?.value),
      payment_method: $("#expenseMethod")?.value?.trim(),
      notes: $("#expenseNotes")?.value?.trim()
    };

    if (!payload.date || !payload.source || !payload.category || !Number.isFinite(payload.amount)) {
      alert("Please fill in Date, Amount, Source, and Category.");
      return;
    }

    const local = getLocalTxns();
    local.push(payload);
    setLocalTxns(local);

    hideModal(addExpenseModal);
    expenseForm.reset();
    loadData();
  });

  incomeForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const payload = {
      type: "income",
      id: genId("INC"),
      date: $("#incomeDate")?.value,
      source: $("#incomeSource")?.value?.trim(),
      category: $("#incomeCategory")?.value?.trim(),
      amount: parseFloat($("#incomeAmount")?.value),
      payment_method: $("#incomeMethod")?.value?.trim(),
      notes: $("#incomeNotes")?.value?.trim()
    };

    if (!payload.date || !payload.source || !payload.category || !Number.isFinite(payload.amount)) {
      alert("Please fill in Date, Amount, Source, and Category.");
      return;
    }

    const local = getLocalTxns();
    local.push(payload);
    setLocalTxns(local);

    hideModal(addIncomeModal);
    incomeForm.reset();
    loadData();
  });

  // =================== CSV Export ===================
  function exportCSV(items, filenameBase) {
    const rows = [["type","id","date","source","category","amount","payment_method","notes"]];
    items.forEach(r => rows.push([
      filenameBase === "expenses" ? "expense" : "income",
      r.id || "",
      r.date || "",
      r.source || "",
      r.category || "",
      r.amount ?? 0,
      r.payment_method || r.method || "",
      r.notes || ""
    ]));

    const csv = rows
      .map(r => r.map(c => {
        const s = String(c ?? "");
        return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
      }).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `${filenameBase}_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  btnExportExpenses?.addEventListener("click", () => {
    // export currently filtered EXPENSE set
    const cfg = getFilterConfig(filtersForm, "");
    const filtered = applyFilters(state.expenses, cfg);
    exportCSV(filtered, "expenses");
  });

  btnExportIncome?.addEventListener("click", () => {
    const cfg = getFilterConfig(filtersFormIncome, "Income");
    const filtered = applyFilters(state.income, cfg);
    exportCSV(filtered, "income");
  });

  // =================== Filters & Pager Wiring ===================
  filtersForm?.addEventListener("submit", e => { e.preventDefault(); state.pager.expenses.page = 1; renderExpenses(); });
  filtersFormIncome?.addEventListener("submit", e => { e.preventDefault(); state.pager.income.page = 1; renderIncome(); });

  document.getElementById("btnClear")?.addEventListener("click", () => {
    filtersForm?.reset();
    state.pager.expenses.page = 1;
    renderExpenses();
  });
  document.getElementById("btnClearIncome")?.addEventListener("click", () => {
    filtersFormIncome?.reset();
    state.pager.income.page = 1;
    renderIncome();
  });

  // page size changes reset to page 1
  $("#pageSize")?.addEventListener("change", () => { state.pager.expenses.page = 1; renderExpenses(); });
  $("#pageSizeIncome")?.addEventListener("change", () => { state.pager.income.page = 1; renderIncome(); });

  // Prev/Next buttons
  document.getElementById("prevPage")?.addEventListener("click", () => { state.pager.expenses.page--; renderExpenses(); });
  document.getElementById("nextPage")?.addEventListener("click", () => { state.pager.expenses.page++; renderExpenses(); });
  document.getElementById("prevPageIncome")?.addEventListener("click", () => { state.pager.income.page--; renderIncome(); });
  document.getElementById("nextPageIncome")?.addEventListener("click", () => { state.pager.income.page++; renderIncome(); });

  // Upload buttons (navigate)
  btnUploadExpense?.addEventListener("click", () => (window.location.href = "upload.html"));
  btnUploadIncome ?.addEventListener("click", () => (window.location.href = "upload.html"));

  // =================== Init ===================
  loadData();
});
