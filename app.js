/***********************************************
 * app.js - Integrated (Dashboard + Transactions)
 ***********************************************/

/* -------------------------
   1) Basic DOM selectors & helpers
   ------------------------- */
const navItems = document.querySelectorAll('.nav-item a');
const viewContent = document.getElementById('view-content');

const totalBalanceEl = document.getElementById('total-balance');
const monthlyIncomeEl = document.getElementById('monthly-income');
const monthlyExpenseEl = document.getElementById('monthly-expenses');

const recentContainer = document.getElementById('recent-transactions-list');

const transactionListEl = document.getElementById('transaction-list');
const txTotalIncomeEl = document.getElementById('tx-total-income');
const txTotalExpenseEl = document.getElementById('tx-total-expense');
const txNetBalanceEl = document.getElementById('tx-net-balance');

const searchInput = document.getElementById('searchInput');
const filterType = document.getElementById('filterType');
const filterCategory = document.getElementById('filterCategory');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');

const addTransactionBtn = document.getElementById('addTransactionBtn');
const viewAllBtn = document.getElementById('viewAllBtn');

/* Modal elements */
const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const modalCancel = document.getElementById('modalCancel');
const modalSave = document.getElementById('modalSave');

const txTitle = document.getElementById('txTitle');
const txAmount = document.getElementById('txAmount');
const txType = document.getElementById('txType');
const txCategory = document.getElementById('txCategory');
const txDate = document.getElementById('txDate');
const txDescription = document.getElementById('txDescription');

let editingTransactionId = null;
let allCategories = [
  'Salary','Food','Transport','Shopping','Entertainment','Bills','Health','Other'
];

/* Currency formatter */
const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/* Utility to convert Firestore Timestamp or string to JS Date */
function toDateObject(dateVal) {
  if (!dateVal) return new Date();
  if (dateVal.toDate && typeof dateVal.toDate === 'function') return dateVal.toDate();
  return new Date(dateVal);
}

/* -------------------------
   2) Firebase Initialization
   ------------------------- */
// REPLACE with your project's config if different
const firebaseConfig = {
  apiKey: "AIzaSyBsgJAuSeZPhmFmriHyZ18pm4iE551lqww",
  authDomain: "finance-tracker-36ba4.firebaseapp.com",
  projectId: "finance-tracker-36ba4",
  storageBucket: "finance-tracker-36ba4.firebasestorage.app",
  messagingSenderId: "225771628304",
  appId: "1:225771628304:web:d25cec52accc52accc4dd1636795"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* -------------------------
   3) View switching
   ------------------------- */
function switchView(viewName) {
  // hide others
  viewContent.querySelectorAll('.view').forEach(v => v.classList.add('view-hidden'));
  const target = document.getElementById(`${viewName}-view`);
  if (target) target.classList.remove('view-hidden');

  // nav active
  navItems.forEach(item => {
    item.parentElement.classList.remove('active');
    if (item.getAttribute('data-view') === viewName) item.parentElement.classList.add('active');
  });

  document.querySelector('.main-header h1').textContent = viewName.charAt(0).toUpperCase() + viewName.slice(1);

  // Load content for certain views
  if (viewName === 'transactions') {
    // list is updated in real-time from Firestore listener
  } else if (viewName === 'dashboard') {
    // dashboard data comes from the same listener too
  }
}

document.addEventListener('DOMContentLoaded', () => {
  navItems.forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      switchView(e.currentTarget.getAttribute('data-view'));
    });
  });

  // initial
  switchView('dashboard');

  // Populate category selects
  loadCategoriesToFilter(allCategories);
  populateTxCategorySelect();

  // Start Firestore listeners
  initFirestoreListeners();
});

/* -------------------------
   4) Chart (Filled Line)
   ------------------------- */
let balanceChartInstance = null;

function renderBalanceChart(chartDataPoints, chartLabels) {
  const ctx = document.getElementById('balance-trend-chart').getContext('2d');
  if (balanceChartInstance) balanceChartInstance.destroy();

  balanceChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [{
        label: 'Balance',
        data: chartDataPoints,
        borderColor: '#1abc9c',
        backgroundColor: 'rgba(26,188,156,0.18)',
        tension: 0.45,
        pointRadius: 3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 750,
            callback: v => v.toLocaleString()
          }
        },
        x: { grid: { display: false } }
      }
    }
  });
}

/* -------------------------
   5) Firestore listeners & data binding
   ------------------------- */

let liveTransactions = []; // cached transactions

function initFirestoreListeners() {
  // Real-time listener for transactions collection
  db.collection("transactions").orderBy('date', 'asc').onSnapshot(snapshot => {
    const txs = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      data.id = doc.id;
      txs.push(data);
    });

    // store ascending order (oldest -> newest)
    liveTransactions = txs;
    // Update UI components
    updateDashboardFromTransactions(liveTransactions);
    updateTransactionListView(liveTransactions);
    updateRecentTransactions(liveTransactions);
    updateCategoryFilterOptions(liveTransactions);
  }, err => {
    console.error("Firestore listener error:", err);
    // Fallback: if error, we keep using an empty list
    liveTransactions = [];
    updateDashboardFromTransactions([]);
    updateTransactionListView([]);
    updateRecentTransactions([]);
  });
}

/* Update dashboard calculations and chart */
function updateDashboardFromTransactions(transactions) {
  // If no transactions, show zeros
  if (!transactions || transactions.length === 0) {
    totalBalanceEl.textContent = currencyFormatter.format(0);
    monthlyIncomeEl.textContent = currencyFormatter.format(0);
    monthlyExpenseEl.textContent = currencyFormatter.format(0);
    renderBalanceChart([0], ['Today']);
    return;
  }

  // Compute totals
  let totalBalance = 0;
  let monthlyIncome = 0;
  let monthlyExpense = 0;

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  // For chart: take last up to 7 balance points (we will derive a running balance)
  const chartPoints = [];
  const chartLabels = [];

  // We need running balance. If transactions have a `balance` field use it; if not, compute.
  // Try to use the last known balance as starting point if present.
  // We'll compute an array of balances in order.
  let computedBalances = [];
  let knownBalanceAtEnd = null;
  transactions.forEach(tx => {
    const date = toDateObject(tx.date);
    if (typeof tx.balance === 'number') knownBalanceAtEnd = tx.balance;
  });

  // If balance fields exist, use them. Otherwise compute by summing credits and debits.
  if (knownBalanceAtEnd !== null) {
    computedBalances = transactions.map(tx => tx.balance || 0);
  } else {
    // use incremental sum starting from 0 then accumulate
    let acc = 0;
    transactions.forEach(tx => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'Credit') acc += Math.abs(amt);
      else acc -= Math.abs(amt);
      computedBalances.push(acc);
    });
  }

  // Chart: pick up to last 7 points
  const lastN = 7;
  const totalLen = transactions.length;
  const startIndex = Math.max(0, totalLen - lastN);
  for (let i = startIndex; i < totalLen; i++) {
    const tx = transactions[i];
    const date = toDateObject(tx.date);
    chartLabels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    chartPoints.push(computedBalances[i]);
  }
  // append Today point using last computed balance (or 0)
  const lastBalance = computedBalances.length ? computedBalances[computedBalances.length - 1] : 0;
  chartLabels.push('Today');
  chartPoints.push(lastBalance);

  // Totals (monthly)
  transactions.forEach(tx => {
    const date = toDateObject(tx.date);
    // totals for ledger
    if (tx.type === 'Credit') totalBalance += Number(tx.amount || 0);
    else totalBalance -= Number(tx.amount || 0);

    if (date.getMonth() === thisMonth && date.getFullYear() === thisYear) {
      if (tx.type === 'Credit') monthlyIncome += Number(tx.amount || 0);
      else monthlyExpense += Math.abs(Number(tx.amount || 0));
    }
  });

  // Display (ensure positive display of total balance as end balance)
  totalBalanceEl.textContent = currencyFormatter.format(lastBalance || 0);
  monthlyIncomeEl.textContent = currencyFormatter.format(monthlyIncome);
  monthlyExpenseEl.textContent = currencyFormatter.format(monthlyExpense);

  // Render chart with values (ensure numbers)
  renderBalanceChart(chartPoints.map(n => Number(n || 0)), chartLabels);
}

/* -------------------------
   6) Recent transactions for dashboard
   ------------------------- */
function updateRecentTransactions(transactions) {
  const container = recentContainer;
  container.innerHTML = '';

  if (!transactions || transactions.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">No recent transactions</p>';
    return;
  }

  const last3 = transactions.slice(-3).reverse();
  const icons = {
    'Salary': 'fa-money-check-alt',
    'Food': 'fa-utensils',
    'Transport': 'fa-car',
    'Shopping': 'fa-shopping-cart',
    'Entertainment': 'fa-tv',
    'Bills': 'fa-file-invoice-dollar',
    'Health': 'fa-heartbeat',
    'Other': 'fa-wallet'
  };

  let html = '';
  last3.forEach(tx => {
    const isCredit = tx.type === 'Credit';
    const color = isCredit ? '#1abc9c' : '#ff6b6b';
    const sign = isCredit ? '+' : '-';
    const date = toDateObject(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    html += `
      <div class="transaction-item" style="display:flex;align-items:center;gap:14px;padding:12px;border-radius:12px;background:#fbfefe;">
        <div style="width:44px;height:44px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;">
          <i class="fas ${icons[tx.category] || 'fa-wallet'}"></i>
        </div>
        <div style="flex:1;">
          <div style="font-weight:700;">${tx.description || tx.title || 'Transaction'}</div>
          <div style="color:#6b7280;font-size:13px;margin-top:6px;">${tx.category || 'Other'} • ${date}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:800;color:${color};">${sign}${currencyFormatter.format(Math.abs(Number(tx.amount || 0)))}</div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/* -------------------------
   7) Transaction list view + filters
   ------------------------- */
function updateTransactionListView(transactions) {
  // Render based on current filters
  allTransactionsForUI = transactions.map(tx => ({
    id: tx.id,
    title: tx.description || tx.title || 'Transaction',
    amount: Number(tx.amount || 0),
    type: tx.type || 'Debit',
    category: tx.category || 'Other',
    date: toDateObject(tx.date),
    raw: tx
  }));
  applyFiltersAndRender();
}

let allTransactionsForUI = [];

// Render the transaction cards
function renderTransactions(list) {
  transactionListEl.innerHTML = '';
  if (!list || list.length === 0) {
    transactionListEl.innerHTML = '<p style="text-align:center;padding:14px;color:#777;">No transactions found.</p>';
    txTotalIncomeEl.textContent = currencyFormatter.format(0);
    txTotalExpenseEl.textContent = currencyFormatter.format(0);
    txNetBalanceEl.textContent = currencyFormatter.format(0);
    return;
  }

  // Calculate totals for summary
  let income = 0, expense = 0;
  list.slice().reverse().forEach(t => {
    if (t.type === 'Credit') income += Math.abs(Number(t.amount || 0));
    else expense += Math.abs(Number(t.amount || 0));
  });

  txTotalIncomeEl.textContent = currencyFormatter.format(income);
  txTotalExpenseEl.textContent = currencyFormatter.format(expense);
  txNetBalanceEl.textContent = currencyFormatter.format(income - expense);

  // Render cards
  let html = '';
  list.slice().reverse().forEach(t => {
    const date = t.date instanceof Date ? t.date.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : String(t.date);
    const isCredit = t.type === 'Credit';
    const colorClass = isCredit ? 'amount-income' : 'amount-expense';
    html += `
      <div class="transaction-card">
        <div class="transaction-left">
          <div class="transaction-title">${t.title}</div>
          <div class="trans-info">
            <div class="${isCredit ? 'dot-income' : 'dot-expense'}"></div>
            <div class="category-pill ${isCredit ? 'cat-income' : 'cat-expense'}" style="margin-left:6px;">${t.category}</div>
            <div style="margin-left:6px;color:#6b7280;">${date}</div>
          </div>
        </div>
        <div class="transaction-right">
          <div class="transaction-amount ${colorClass}">${isCredit ? '+' : '-'}${currencyFormatter.format(Math.abs(Number(t.amount || 0)))}</div>
          <i class="fas fa-edit" style="cursor:pointer;" onclick="openEditTransaction('${t.id}')"></i>
          <i class="fas fa-trash" style="cursor:pointer;" onclick="deleteTransaction('${t.id}')"></i>
        </div>
      </div>
    `;
  });

  transactionListEl.innerHTML = html;
}

/* Filtering logic */
function applyFiltersAndRender() {
  const search = (searchInput.value || '').toLowerCase();
  const type = filterType.value;
  const category = filterCategory.value;

  const filtered = allTransactionsForUI.filter(t => {
    const matchesSearch = (t.title || '').toLowerCase().includes(search) || (t.category || '').toLowerCase().includes(search);
    const matchesType = type === 'all' || t.type === type;
    const matchesCategory = category === 'all' || t.category === category;
    return matchesSearch && matchesType && matchesCategory;
  });

  renderTransactions(filtered);
}

/* Attach filter inputs */
searchInput.addEventListener('input', applyFiltersAndRender);
filterType.addEventListener('change', applyFiltersAndRender);
filterCategory.addEventListener('change', applyFiltersAndRender);
clearFiltersBtn.addEventListener('click', () => {
  searchInput.value = '';
  filterType.value = 'all';
  filterCategory.value = 'all';
  applyFiltersAndRender();
});

/* Load categories into category select */
function loadCategoriesToFilter(categories) {
  // keep 'all' option
  filterCategory.innerHTML = '<option value="all">All Categories</option>';
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    filterCategory.appendChild(opt);
  });
}

/* Dynamically update categories based on transactions */
function updateCategoryFilterOptions(transactions) {
  const cats = new Set(allCategories);
  transactions.forEach(tx => { if (tx.category) cats.add(tx.category); });
  loadCategoriesToFilter(Array.from(cats).sort());
  populateTxCategorySelect(Array.from(cats).sort());
}

/* populate add/edit modal category select */
function populateTxCategorySelect(categories) {
  const cats = categories || allCategories;
  txCategory.innerHTML = '';
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    txCategory.appendChild(opt);
  });
}

/* -------------------------
   8) Add / Edit / Delete transactions
   ------------------------- */

addTransactionBtn.addEventListener('click', () => openAddTransaction());

viewAllBtn && viewAllBtn.addEventListener('click', () => switchView('transactions'));

// Open Add modal
function openAddTransaction() {
  editingTransactionId = null;
  modalTitle.textContent = 'Add Transaction';
  txTitle.value = '';
  txAmount.value = '';
  txType.value = 'Credit';
  txCategory.value = allCategories[0] || 'Other';
  txDate.value = new Date().toISOString().slice(0,10);
  txDescription.value = '';
  showModal();
}

// Open Edit modal
window.openEditTransaction = function(id) {
  editingTransactionId = id;
  // Fetch doc from firestore for full details
  db.collection('transactions').doc(id).get().then(doc => {
    if (!doc.exists) return alert('Transaction not found.');
    const data = doc.data();
    modalTitle.textContent = 'Edit Transaction';
    txTitle.value = data.description || data.title || '';
    txAmount.value = Math.abs(Number(data.amount || 0));
    txType.value = data.type || 'Debit';
    txCategory.value = data.category || allCategories[0] || 'Other';
    const d = toDateObject(data.date);
    txDate.value = d.toISOString().slice(0,10);
    txDescription.value = data.note || data.description || '';
    showModal();
  }).catch(err => {
    console.error(err);
    alert('Unable to load transaction for editing.');
  });
};

function showModal() {
  modalOverlay.classList.remove('hidden');
}

modalCancel.addEventListener('click', () => {
  modalOverlay.classList.add('hidden');
  editingTransactionId = null;
});

// Save (add or update)
modalSave.addEventListener('click', () => {
  const title = txTitle.value.trim();
  const amount = Number(txAmount.value || 0);
  const type = txType.value;
  const category = txCategory.value || 'Other';
  const dateVal = txDate.value ? new Date(txDate.value) : new Date();
  const description = txDescription.value || '';

  if (!title || !amount) {
    return alert('Please provide title and amount.');
  }

  const payload = {
    description: title,
    amount: Math.abs(amount),
    type: type,
    category: category,
    date: firebase.firestore.Timestamp.fromDate(dateVal),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  if (editingTransactionId) {
    db.collection('transactions').doc(editingTransactionId).update(payload).then(() => {
      modalOverlay.classList.add('hidden');
      editingTransactionId = null;
    }).catch(err => {
      console.error(err); alert('Failed to update transaction.');
    });
  } else {
    // create new
    payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    db.collection('transactions').add(payload).then(() => {
      modalOverlay.classList.add('hidden');
    }).catch(err => {
      console.error(err); alert('Failed to add transaction.');
    });
  }
});

// Delete
window.deleteTransaction = function(id) {
  if (!confirm('Delete this transaction?')) return;
  db.collection('transactions').doc(id).delete().catch(err => {
    console.error(err); alert('Failed to delete.');
  });
};

/* -------------------------
   9) Misc: sign out (placeholder)
   ------------------------- */
const signOutBtn = document.getElementById('signOutBtn');
if (signOutBtn) signOutBtn.addEventListener('click', () => {
  // If using firebase auth, sign out:
  if (firebase.auth) {
    firebase.auth().signOut().then(() => location.reload());
  } else {
    alert('Sign out not configured.');
  }
});

/* -------------------------
   10) Small UX helpers
   ------------------------- */
// Close modal with ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') modalOverlay.classList.add('hidden');
});
