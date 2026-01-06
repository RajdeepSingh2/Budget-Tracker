const API_URL = "http://localhost:8080/api/transactions";

/* ⭐ UNIQUE FEATURE CONFIG */
const MONTHLY_BUDGET_LIMIT = 6000;

let allTransactions = [];
let editId = null;
let pieChart = null;
let barChart = null;
let lineChart = null;

/* ===============================
   LOAD TRANSACTIONS
================================ */
async function loadTransactions() {
  const res = await fetch(API_URL);
  allTransactions = await res.json();
  render(allTransactions);
}

function render(data) {
  displayTransactions(data);
  updateSummary(data);
  updateInsights(data);
  checkBudgetLimit(data);
  updateCharts(data);
}

/* ===============================
   TABLE + SUMMARY
================================ */
function displayTransactions(data) {
  const table = document.getElementById("transactionTable");
  table.innerHTML = "";

  data.forEach(t => {
    const rowClass = t.type === "income" ? "income" : "expense";

    table.innerHTML += `
      <tr class="${rowClass}">
        <td>${t.id}</td>
        <td>${t.type}</td>
        <td>${t.category}</td>
        <td>${t.amount}</td>
        <td>${t.date}</td>
        <td>${t.description || ""}</td>
        <td>
          <button onclick="editTransaction(${t.id})">✏️</button>
          <button class="delete-btn" onclick="deleteTransaction(${t.id})">🗑️</button>
        </td>
      </tr>
    `;
  });
}

function updateSummary(data) {
  let income = 0, expense = 0;

  data.forEach(t => {
    t.type === "income" ? income += t.amount : expense += t.amount;
  });

  document.getElementById("totalIncome").innerText = income.toFixed(2);
  document.getElementById("totalExpense").innerText = expense.toFixed(2);
  document.getElementById("netBalance").innerText = (income - expense).toFixed(2);
}

/* ===============================
   ⭐ SMART INSIGHTS
================================ */
function updateInsights(data) {
  if (data.length === 0) return;

  const categoryTotals = {};
  data.forEach(t => {
    if (t.type === "expense") {
      categoryTotals[t.category] =
        (categoryTotals[t.category] || 0) + t.amount;
    }
  });

  let topCategory = "-";
  let maxAmount = 0;

  for (let cat in categoryTotals) {
    if (categoryTotals[cat] > maxAmount) {
      maxAmount = categoryTotals[cat];
      topCategory = cat;
    }
  }

  document.getElementById("topCategory").innerText =
    `Top Category: ${topCategory} (₹${maxAmount})`;

  const expenses = data
    .filter(t => t.type === "expense")
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (expenses.length >= 2) {
    const last = expenses[expenses.length - 1].amount;
    const prev = expenses[expenses.length - 2].amount;

    const trend = last > prev ? "📈 Increasing" : "📉 Decreasing";
    document.getElementById("spendingTrend").innerText =
      `Spending Trend: ${trend}`;
  }
}

/* ===============================
   ⭐ BUDGET LIMIT WARNING
================================ */
function checkBudgetLimit(data) {
  const currentMonth = new Date().toISOString().slice(0, 7);

  const monthlyExpense = data
    .filter(t => t.type === "expense" && t.date.startsWith(currentMonth))
    .reduce((sum, t) => sum + t.amount, 0);

  const alertBox = document.getElementById("budgetAlert");

  if (monthlyExpense > MONTHLY_BUDGET_LIMIT) {
    alertBox.style.display = "flex";
    alertBox.innerText =
      `⚠️ Budget exceeded by ₹${monthlyExpense - MONTHLY_BUDGET_LIMIT}`;
  } else {
    alertBox.style.display = "none";
  }
}

/* ===============================
   ADD / UPDATE
================================ */
document.getElementById("transactionForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const tx = {
    type: document.getElementById("type").value,
    category: document.getElementById("category").value.trim(),
    amount: parseFloat(document.getElementById("amount").value),
    date: document.getElementById("date").value,
    description: document.getElementById("description").value.trim()
  };

  if (!tx.type || !tx.category || tx.amount <= 0) {
    alert("Please enter valid transaction details");
    return;
  }

  if (editId !== null) {
    await fetch(`${API_URL}/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tx)
    });
    editId = null;
  } else {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tx)
    });
  }

  e.target.reset();
  loadTransactions();
});

/* ===============================
   EDIT / DELETE
================================ */
function editTransaction(id) {
  const t = allTransactions.find(x => x.id === id);

  document.getElementById("type").value = t.type;
  document.getElementById("category").value = t.category;
  document.getElementById("amount").value = t.amount;
  document.getElementById("date").value = t.date;
  document.getElementById("description").value = t.description;

  editId = id;
}

async function deleteTransaction(id) {
  if (!confirm("Delete this transaction?")) return;
  await fetch(`${API_URL}/${id}`, { method: "DELETE" });
  loadTransactions();
}

/* ===============================
   FILTERS
================================ */
function applyFilters() {
  const typeFilter = document.getElementById("filterType").value;
  const searchText = document.getElementById("searchBox").value.toLowerCase();

  const filtered = allTransactions.filter(t => {
    const matchesType = typeFilter === "all" || t.type === typeFilter;
    const matchesSearch =
      t.category.toLowerCase().includes(searchText) ||
      (t.description || "").toLowerCase().includes(searchText);
    return matchesType && matchesSearch;
  });

  render(filtered);
}

/* ===============================
   CHARTS
================================ */
function updateCharts(data) {
  const income = data.filter(t => t.type === "income")
                     .reduce((s, t) => s + t.amount, 0);
  const expense = data.filter(t => t.type === "expense")
                      .reduce((s, t) => s + t.amount, 0);

  const categoryTotals = {};
  data.forEach(t => {
    categoryTotals[t.category] =
      (categoryTotals[t.category] || 0) + t.amount;
  });

  const monthlyExpense = {};
  data.forEach(t => {
    if (t.type === "expense") {
      const month = t.date.substring(0, 7);
      monthlyExpense[month] =
        (monthlyExpense[month] || 0) + t.amount;
    }
  });

  const months = Object.keys(monthlyExpense).sort();
  const monthlyAmounts = months.map(m => monthlyExpense[m]);

  if (pieChart) pieChart.destroy();
  if (barChart) barChart.destroy();
  if (lineChart) lineChart.destroy();

  pieChart = new Chart(document.getElementById("pieChart"), {
    type: "pie",
    data: { labels: ["Income", "Expense"], datasets: [{ data: [income, expense] }] }
  });

  barChart = new Chart(document.getElementById("barChart"), {
    type: "bar",
    data: {
      labels: Object.keys(categoryTotals),
      datasets: [{ label: "Amount by Category", data: Object.values(categoryTotals) }]
    }
  });

  lineChart = new Chart(document.getElementById("lineChart"), {
    type: "line",
    data: {
      labels: months,
      datasets: [{ label: "Monthly Expense Trend", data: monthlyAmounts, fill: true, tension: 0.4 }]
    }
  });
}

/* ===============================
   INIT
================================ */
document.addEventListener("DOMContentLoaded", loadTransactions);


