// scripts/records.js
document.addEventListener("DOMContentLoaded", function () {

  // =================== ELEMENTS ===================
  var expenseTbody       = document.getElementById("recordsTbody");
  var incomeTbody        = document.getElementById("recordsTbodyIncome");

  var filtersForm        = document.getElementById("filtersForm");
  var filtersFormIncome  = document.getElementById("filtersFormIncome");

  var expensePageInfo    = document.getElementById("pageInfo");
  var incomePageInfo     = document.getElementById("pageInfoIncome");

  var addExpenseModal    = document.getElementById("addExpenseModal");
  var addIncomeModal     = document.getElementById("addIncomeModal");
  var expenseForm        = document.getElementById("expenseForm");
  var incomeForm         = document.getElementById("incomeForm");

  var btnAddExpense      = document.getElementById("btnAddExpense");
  var btnAddIncome       = document.getElementById("btnAddIncome");
  var cancelExpenseBtn   = document.getElementById("cancelExpenseBtn");
  var cancelIncomeBtn    = document.getElementById("cancelIncomeBtn");

  var btnExportExpenses  = document.getElementById("btnExportExpenses");
  var btnExportIncome    = document.getElementById("btnExportIncome");

  var btnUploadExpense   = document.getElementById("btnUploadExpense");
  var btnUploadIncome    = document.getElementById("btnUploadIncome");

  // =================== STATE ===================
  var DATA_URL = "data/data.json";
  var localKey = "userTxns";

  var state = {
    expenses: [],
    income: [],
    pager: {
      expenses: { page: 1, pageSize: 25 },
      income:   { page: 1, pageSize: 25 }
    }
  };

  // =================== HELPERS ===================

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function fmtMoney(n) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD"
    }).format(isFinite(+n) ? +n : 0);
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    if (iso.length === 10) iso += "T00:00:00";
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit"
    });
  }

  function showModal(m) {
    if (m) m.classList.remove("hidden");
  }

  function hideModal(m) {
    if (m) m.classList.add("hidden");
  }

  function createRow(record) {
    var tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" + fmtDate(record.date) + "</td>" +
      "<td>" + (record.source || "—") + "</td>" +
      "<td>" + (record.category || "—") + "</td>" +
      "<td class='num'>" + fmtMoney(record.amount) + "</td>" +
      "<td>" + (record.payment_method || record.method || "—") + "</td>" +
      "<td>" + (record.notes || "") + "</td>";
    return tr;
  }

  function getLocalTxns() {
    try { return JSON.parse(localStorage.getItem(localKey) || "[]"); }
    catch (_) { return []; }
  }

  function setLocalTxns(arr) {
    localStorage.setItem(localKey, JSON.stringify(arr || []));
  }

  function genId(prefix) {
    return prefix + "-" +
      Math.random().toString(36).slice(2, 8) + "-" +
      Date.now().toString(36);
  }

  // =================== CATEGORY POPULATION ===================
  function populateCategories(selStr, items) {
    var sel = $(selStr);
    if (!sel) return;

    var cats = [];
    items.forEach(function (i) {
      if (i.category && cats.indexOf(i.category) === -1) cats.push(i.category);
    });
    cats.sort();

    sel.innerHTML = "<option value=''>All</option>" +
      cats.map(function (c) { return "<option>" + c + "</option>"; }).join("");
  }

  // =================== FILTERING / SORTING ===================
  function getFilterConfig(form, typeSuffix) {
    typeSuffix = typeSuffix || "";

    return {
      q:        (form.querySelector("input[type=search]") || {}).value || "",
      category: (form.querySelector("#category" + typeSuffix) || {}).value || "",
      method:   (form.querySelector("#method" + typeSuffix) || {}).value || "",
      minDate:  (form.querySelector("#minDate" + typeSuffix) || {}).value || "",
      maxDate:  (form.querySelector("#maxDate" + typeSuffix) || {}).value || "",
      minAmt:   parseFloat((form.querySelector("#minAmt" + typeSuffix) || {}).value) || 0,
      maxAmt:   parseFloat((form.querySelector("#maxAmt" + typeSuffix) || {}).value) || Infinity,
      sort:     (form.querySelector("#sort" + typeSuffix) || {}).value || "date_desc",
      pageSize: parseInt((form.querySelector("#pageSize" + typeSuffix) || {}).value, 10) || 25
    };
  }

  function applyFilters(items, cfg) {
    var filtered = items.filter(function (r) {
      var q = cfg.q.toLowerCase();

      var mQ = !q ||
        (r.source && r.source.toLowerCase().indexOf(q) !== -1) ||
        (r.category && r.category.toLowerCase().indexOf(q) !== -1) ||
        (r.notes && r.notes.toLowerCase().indexOf(q) !== -1);

      var mCat = !cfg.category || r.category === cfg.category;
      var method = r.payment_method || r.method || "";
      var mMethod = !cfg.method || method === cfg.method;

      var mDate =
        (!cfg.minDate || r.date >= cfg.minDate) &&
        (!cfg.maxDate || r.date <= cfg.maxDate);

      var mAmt = r.amount >= cfg.minAmt && r.amount <= cfg.maxAmt;

      return mQ && mCat && mMethod && mDate && mAmt;
    });

    filtered.sort(function (a, b) {
      switch (cfg.sort) {
        case "date_asc": return (a.date || "").localeCompare(b.date || "");
        case "date_desc": return (b.date || "").localeCompare(a.date || "");
        case "amount_asc": return a.amount - b.amount;
        case "amount_desc": return b.amount - a.amount;
        case "source_asc": return (a.source || "").localeCompare(b.source || "");
        case "source_desc": return (b.source || "").localeCompare(a.source || "");
        default: return 0;
      }
    });

    return filtered;
  }

  function paginate(items, pager) {
    var total = items.length;
    var pages = Math.max(1, Math.ceil(total / pager.pageSize));
    var page  = Math.min(Math.max(1, pager.page), pages);
    var start = (page - 1) * pager.pageSize;
    var end   = start + pager.pageSize;

    return {
      page: page,
      pages: pages,
      total: total,
      slice: items.slice(start, end)
    };
  }

  // =================== RENDERING ===================
  function renderExpenses() {
    var cfg = getFilterConfig(filtersForm, "");
    state.pager.expenses.pageSize = cfg.pageSize;

    var filtered = applyFilters(state.expenses, cfg);
    var pageData = paginate(filtered, state.pager.expenses);

    expenseTbody.innerHTML = pageData.slice.length === 0
      ? "<tr><td colspan='6' class='subtle'>No matching records.</td></tr>"
      : "";

    pageData.slice.forEach(function (r) {
      expenseTbody.appendChild(createRow(r));
    });

    if (expensePageInfo) {
      expensePageInfo.textContent =
        "Page " + pageData.page + " of " + pageData.pages + " · " + pageData.total + " record(s)";
    }

    var prev = document.getElementById("prevPage");
    var next = document.getElementById("nextPage");

    if (prev) prev.disabled = pageData.page <= 1;
    if (next) next.disabled = pageData.page >= pageData.pages;
  }

  function renderIncome() {
    var cfg = getFilterConfig(filtersFormIncome, "Income");
    state.pager.income.pageSize = cfg.pageSize;

    var filtered = applyFilters(state.income, cfg);
    var pageData = paginate(filtered, state.pager.income);

    incomeTbody.innerHTML = pageData.slice.length === 0
      ? "<tr><td colspan='6' class='subtle'>No matching records.</td></tr>"
      : "";

    pageData.slice.forEach(function (r) {
      incomeTbody.appendChild(createRow(r));
    });

    if (incomePageInfo) {
      incomePageInfo.textContent =
        "Page " + pageData.page + " of " + pageData.pages + " · " + pageData.total + " record(s)";
    }

    var prev = document.getElementById("prevPageIncome");
    var next = document.getElementById("nextPageIncome");

    if (prev) prev.disabled = pageData.page <= 1;
    if (next) next.disabled = pageData.page >= pageData.pages;
  }

  function renderAll() {
    renderExpenses();
    renderIncome();
  }

  // =================== LOAD DATA ===================
  function loadData() {
    fetch(DATA_URL, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load " + DATA_URL);
        return res.json();
      })
      .then(function (base) {
        var local = getLocalTxns();

        var baseExpenses = Array.isArray(base.expenses) ? base.expenses : [];
        var baseIncome   = Array.isArray(base.income)   ? base.income   : [];

        var localExpenses = local.filter(function (t) { return (t.type || "expense") === "expense"; });
        var localIncome   = local.filter(function (t) { return t.type === "income"; });

        state.expenses = baseExpenses.concat(localExpenses).map(function (x) {
          return {
            id: x.id || genId("TXN"),
            date: x.date || "",
            source: x.source || "",
            category: x.category || "",
            amount: parseFloat(x.amount) || 0,
            payment_method: x.payment_method || x.method || "",
            notes: x.notes || ""
          };
        });

        state.income = baseIncome.concat(localIncome).map(function (x) {
          return {
            id: x.id || genId("INC"),
            date: x.date || "",
            source: x.source || "",
            category: x.category || "",
            amount: parseFloat(x.amount) || 0,
            payment_method: x.payment_method || x.method || "",
            notes: x.notes || ""
          };
        });

        populateCategories("#category", state.expenses);
        populateCategories("#categoryIncome", state.income);

        var psExp = parseInt(($("#pageSize") || {}).value || "25", 10);
        var psInc = parseInt(($("#pageSizeIncome") || {}).value || "25", 10);

        state.pager.expenses.pageSize = psExp;
        state.pager.income.pageSize   = psInc;

        renderAll();
      });
  }

  // =================== EVENT LISTENERS ===================

  if (btnAddExpense) btnAddExpense.addEventListener("click", function () {
    showModal(addExpenseModal);
  });

  if (btnAddIncome) btnAddIncome.addEventListener("click", function () {
    showModal(addIncomeModal);
  });

  if (cancelExpenseBtn) cancelExpenseBtn.addEventListener("click", function () {
    hideModal(addExpenseModal);
  });

  if (cancelIncomeBtn) cancelIncomeBtn.addEventListener("click", function () {
    hideModal(addIncomeModal);
  });

  if (expenseForm) expenseForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var payload = {
      type: "expense",
      id: genId("TXN"),
      date: $("#expenseDate").value,
      source: $("#expenseSource").value.trim(),
      category: $("#expenseCategory").value.trim(),
      amount: parseFloat($("#expenseAmount").value),
      payment_method: $("#expenseMethod").value.trim(),
      notes: $("#expenseNotes").value.trim()
    };

    if (!payload.date || !payload.source || !payload.category || !isFinite(payload.amount)) {
      alert("Please fill in Date, Amount, Source, and Category.");
      return;
    }

    var local = getLocalTxns();
    local.push(payload);
    setLocalTxns(local);

    hideModal(addExpenseModal);
    expenseForm.reset();
    loadData();
  });

  if (incomeForm) incomeForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var payload = {
      type: "income",
      id: genId("INC"),
      date: $("#incomeDate").value,
      source: $("#incomeSource").value.trim(),
      category: $("#incomeCategory").value.trim(),
      amount: parseFloat($("#incomeAmount").value),
      payment_method: $("#incomeMethod").value.trim(),
      notes: $("#incomeNotes").value.trim()
    };

    if (!payload.date || !payload.source || !payload.category || !isFinite(payload.amount)) {
      alert("Please fill in Date, Amount, Source, and Category.");
      return;
    }

    var local = getLocalTxns();
    local.push(payload);
    setLocalTxns(local);

    hideModal(addIncomeModal);
    incomeForm.reset();
    loadData();
  });

  // CSV Exports
 function exportCSV(items, filenameBase) {
    var rows = [["type","id","date","source","category","amount","payment_method","notes"]];

  if (btnExportExpenses) btnExportExpenses.addEventListener("click", function () {
    var cfg = getFilterConfig(filtersForm, "");
    var filtered = applyFilters(state.expenses, cfg);
    exportCSV(filtered, "expenses");
  });

  if (btnExportIncome) btnExportIncome.addEventListener("click", function () {
    var cfg = getFilterConfig(filtersFormIncome, "Income");
    var filtered = applyFilters(state.income, cfg);
    exportCSV(filtered, "income");
  });

    items.forEach(function (r) {
      rows.push([
        filenameBase === "expenses" ? "expense" : "income",
        r.id || "",
        r.date || "",
        r.source || "",
        r.category || "",
        r.amount || 0,
        r.payment_method || r.method || "",
        r.notes || ""
      ]);
    });

    var csv = rows.map(function (r) {
      return r.map(function (c) {
        var s = String(c || "");
        return /[",\n]/.test(s) ? "\"" + s.replace(/"/g, "\"\"") + "\"" : s;
      }).join(",");
    }).join("\n");

    var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filenameBase + "_" + new Date().toISOString().slice(0,10) + ".csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Filtering & Clearing
  if (filtersForm) filtersForm.addEventListener("submit", function (e) {
    e.preventDefault();
    state.pager.expenses.page = 1;
    renderExpenses();
  });

  if (filtersFormIncome) filtersFormIncome.addEventListener("submit", function (e) {
    e.preventDefault();
    state.pager.income.page = 1;
    renderIncome();
  });

  var btnClear = document.getElementById("btnClear");
  if (btnClear) btnClear.addEventListener("click", function () {
    filtersForm.reset();
    state.pager.expenses.page = 1;
    renderExpenses();
  });

  var btnClearIncome = document.getElementById("btnClearIncome");
  if (btnClearIncome) btnClearIncome.addEventListener("click", function () {
    filtersFormIncome.reset();
    state.pager.income.page = 1;
    renderIncome();
  });

  // Page size changes
  var ps = $("#pageSize");
  if (ps) ps.addEventListener("change", function () {
    state.pager.expenses.page = 1;
    renderExpenses();
  });

  var psI = $("#pageSizeIncome");
  if (psI) psI.addEventListener("change", function () {
    state.pager.income.page = 1;
    renderIncome();
  });

  // Prev/Next
  var prev = document.getElementById("prevPage");
  if (prev) prev.addEventListener("click", function () {
    state.pager.expenses.page--;
    renderExpenses();
  });

  var next = document.getElementById("nextPage");
  if (next) next.addEventListener("click", function () {
    state.pager.expenses.page++;
    renderExpenses();
  });

  var prevI = document.getElementById("prevPageIncome");
  if (prevI) prevI.addEventListener("click", function () {
    state.pager.income.page--;
    renderIncome();
  });

  var nextI = document.getElementById("nextPageIncome");
  if (nextI) nextI.addEventListener("click", function () {
    state.pager.income.page++;
    renderIncome();
  });

  // Upload buttons
  if (btnUploadExpense) btnUploadExpense.addEventListener("click", function () {
    window.location.href = "upload.html";
  });

  if (btnUploadIncome) btnUploadIncome.addEventListener("click", function () {
    window.location.href = "upload.html";
  });

  // =================== INIT ===================
  loadData();

});
