const API_URL = "http://localhost:8080/api/transactions";
let allTransactions = [];
let pieChart, barChart, lineChart;

// ✅ Load transactions
async function loadTransactions() {
  const res = await fetch(API_URL);
  allTransactions = await res.json();
  displayTransactions(allTransactions);
  updateCharts(allTransactions);
}

// ✅ Display table + summary
function displayTransactions(data) {
  const table = document.getElementById("transactionTable");
  table.innerHTML = "";

  let totalIncome = 0, totalExpense = 0;

  data.forEach(t => {
    if (t.type.toLowerCase() === "income") totalIncome += t.amount;
    else totalExpense += t.amount;

    const rowClass = t.type.toLowerCase() === "income" ? "income" : "expense";

    table.innerHTML += `
      <tr class="${rowClass}">
        <td>${t.id}</td>
        <td>${t.type}</td>
        <td>${t.category}</td>
        <td>${t.amount}</td>
        <td>${t.date}</td>
        <td>${t.description}</td>
        <td><button class="delete-btn" onclick="deleteTransaction(${t.id})">🗑️</button></td>
      </tr>`;
  });

  document.getElementById("totalIncome").innerText = totalIncome.toFixed(2);
  document.getElementById("totalExpense").innerText = totalExpense.toFixed(2);
  document.getElementById("netBalance").innerText = (totalIncome - totalExpense).toFixed(2);
}

// ✅ Delete transaction
async function deleteTransaction(id) {
  if (confirm("Are you sure you want to delete this transaction?")) {
    await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    loadTransactions();
  }
}

// ✅ Add transaction
document.getElementById("transactionForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const tx = {
    type: document.getElementById("type").value,
    category: document.getElementById("category").value,
    amount: parseFloat(document.getElementById("amount").value),
    date: document.getElementById("date").value,
    description: document.getElementById("description").value
  };

  await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tx)
  });

  e.target.reset();
  loadTransactions();
});

// ✅ Filter function
function applyFilters() {
  const typeFilter = document.getElementById("filterType").value;
  const searchText = document.getElementById("searchBox").value.toLowerCase();

  let filtered = allTransactions;

  if (typeFilter !== "all")
    filtered = filtered.filter(t => t.type.toLowerCase() === typeFilter);

  if (searchText)
    filtered = filtered.filter(t =>
      t.category.toLowerCase().includes(searchText) ||
      t.description.toLowerCase().includes(searchText)
    );

  displayTransactions(filtered);
  updateCharts(filtered);
}

// ✅ Update all charts
function updateCharts(data) {
  const income = data.filter(t => t.type.toLowerCase() === "income")
                     .reduce((sum, t) => sum + t.amount, 0);
  const expense = data.filter(t => t.type.toLowerCase() === "expense")
                      .reduce((sum, t) => sum + t.amount, 0);

  const categoryTotals = {};
  data.forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });

  // 📅 Monthly Expense Trend
  const monthlyExpense = {};
  data.forEach(t => {
    if (t.type.toLowerCase() === "expense" && t.date) {
      const month = t.date.substring(0, 7); // YYYY-MM
      monthlyExpense[month] = (monthlyExpense[month] || 0) + t.amount;
    }
  });

  const months = Object.keys(monthlyExpense).sort();
  const monthlyAmounts = months.map(m => monthlyExpense[m]);

  const pieCtx = document.getElementById("pieChart").getContext("2d");
  const barCtx = document.getElementById("barChart").getContext("2d");
  const lineCtx = document.getElementById("lineChart").getContext("2d");

  if (pieChart) pieChart.destroy();
  if (barChart) barChart.destroy();
  if (lineChart) lineChart.destroy();

  // ✅ Pie Chart — Income vs Expense
  pieChart = new Chart(pieCtx, {
    type: "pie",
    data: {
      labels: ["Income", "Expense"],
      datasets: [{
        data: [income, expense],
        backgroundColor: ["#00ff99", "#ff6666"]
      }]
    },
    options: { plugins: { legend: { labels: { color: "white" } } } }
  });

  // ✅ Bar Chart — Category Breakdown
  barChart = new Chart(barCtx, {
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

  // ✅ Line Chart — Monthly Expense Trend
  lineChart = new Chart(lineCtx, {
    type: "line",
    data: {
      labels: months,
      datasets: [{
        label: "Monthly Expense Trend",
        data: monthlyAmounts,
        borderColor: "#ff6666",
        backgroundColor: "rgba(255, 102, 102, 0.3)",
        tension: 0.4,
        fill: true,
        pointBackgroundColor: "gold"
      }]
    },
    options: {
      scales: {
        x: { ticks: { color: "white" } },
        y: { ticks: { color: "white" } }
      },
      plugins: {
        legend: { labels: { color: "white" } }
      }
    }
  });
}

loadTransactions();


