const API_URL = "http://localhost:8080/api/transactions";
const MONTHLY_BUDGET_LIMIT = 6000;

let allTransactions = [];
let editId = null;
let pieChart, barChart, lineChart;

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
   SMART INSIGHTS
================================ */
function updateInsights(data) {
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

  const expenses = data.filter(t => t.type === "expense");
  if (expenses.length >= 2) {
    const trend =
      expenses[expenses.length - 1].amount >
      expenses[expenses.length - 2].amount
        ? "📈 Increasing"
        : "📉 Decreasing";

    document.getElementById("spendingTrend").innerText =
      `Spending Trend: ${trend}`;
  }
}

/* ===============================
   MONTHLY BUDGET ALERT
================================ */
function checkBudgetLimit(data) {
  const currentMonth = new Date().toISOString().slice(0, 7);

  const monthlyExpense = data
    .filter(t => t.type === "expense" && t.date.startsWith(currentMonth))
    .reduce((sum, t) => sum + t.amount, 0);

  const alertBox = document.getElementById("budgetAlert");
  if (!alertBox) return;

  if (monthlyExpense > MONTHLY_BUDGET_LIMIT) {
    alertBox.style.display = "block";
    alertBox.innerText =
      `⚠️ Monthly budget exceeded by ₹${monthlyExpense - MONTHLY_BUDGET_LIMIT}`;
  } else {
    alertBox.style.display = "none";
  }
}

/* ===============================
   ADD / UPDATE TRANSACTION
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
    alert("Enter valid details");
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
   EDIT TRANSACTION
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

/* ===============================
   DELETE TRANSACTION
================================ */
async function deleteTransaction(id) {
  if (!confirm("Delete this transaction?")) return;
  await fetch(`${API_URL}/${id}`, { method: "DELETE" });
  loadTransactions();
}

/* ===============================
   CHARTS (ORIGINAL COLORS)
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

  pieChart?.destroy();
  barChart?.destroy();
  lineChart?.destroy();

  pieChart = new Chart(document.getElementById("pieChart"), {
    type: "pie",
    data: {
      labels: ["Income", "Expense"],
      datasets: [{
        data: [income, expense],
        backgroundColor: ["#00ff99", "#ff6666"],
        borderColor: "#ffffff",
        borderWidth: 2
      }]
    },
    options: {
      plugins: { legend: { labels: { color: "white" } } }
    }
  });

  barChart = new Chart(document.getElementById("barChart"), {
    type: "bar",
    data: {
      labels: Object.keys(categoryTotals),
      datasets: [{
        label: "Amount by Category",
        data: Object.values(categoryTotals),
        backgroundColor: "#FFD700"
      }]
    },
    options: {
      scales: {
        x: { ticks: { color: "white" } },
        y: { ticks: { color: "white" } }
      },
      plugins: { legend: { labels: { color: "white" } } }
    }
  });

  lineChart = new Chart(document.getElementById("lineChart"), {
    type: "line",
    data: {
      labels: months,
      datasets: [{
        label: "Monthly Expense Trend",
        data: monthlyAmounts,
        borderColor: "#ff6666",
        backgroundColor: "rgba(255,102,102,0.35)",
        fill: true,
        tension: 0.4,
        pointBackgroundColor: "gold"
      }]
    },
    options: {
      scales: {
        x: { ticks: { color: "white" } },
        y: { ticks: { color: "white" } }
      },
      plugins: { legend: { labels: { color: "white" } } }
    }
  });
}

/* ===============================
   INIT
================================ */
document.addEventListener("DOMContentLoaded", loadTransactions);
