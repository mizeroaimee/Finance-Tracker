/***********************************************
 * app.js - Integrated (Dashboard + Transactions + Auth)
 ***********************************************/

/* -------------------------
   1) Basic DOM selectors & helpers
   ------------------------- */
const authOverlay = document.getElementById('authOverlay');
const appRoot = document.getElementById('appRoot');

const tabLogin = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');
const tabReset = document.getElementById('tabReset');

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const resetForm = document.getElementById('resetForm');

const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');

const regName = document.getElementById('regName');
const regEmail = document.getElementById('regEmail');
const regPassword = document.getElementById('regPassword');
const registerBtn = document.getElementById('registerBtn');
const registerError = document.getElementById('registerError');

const resetEmail = document.getElementById('resetEmail');
const resetBtn = document.getElementById('resetBtn');
const resetError = document.getElementById('resetError');
const resetSuccess = document.getElementById('resetSuccess');

const toRegister = document.getElementById('toRegister');
const toLogin = document.getElementById('toLogin');
const resetToLogin = document.getElementById('resetToLogin');

const userNameEl = document.getElementById('userName');
const userEmailEl = document.getElementById('userEmail');

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

/* Modal elements (unchanged) */
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
  appId: "1:225771628304:web:d25cec52accc4dd1636795"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

/* -------------------------
   3) AUTH UI: Tabs & shortcuts
   ------------------------- */
function showAuthTab(tab) {
  // Reset errors
  loginError.textContent = '';
  registerError.textContent = '';
  resetError.textContent = '';
  resetSuccess.textContent = '';

  tabLogin.classList.remove('active');
  tabRegister.classList.remove('active');
  tabReset.classList.remove('active');

  loginForm.classList.add('hidden');
  registerForm.classList.add('hidden');
  resetForm.classList.add('hidden');

  if (tab === 'login') {
    tabLogin.classList.add('active');
    loginForm.classList.remove('hidden');
  } else if (tab === 'register') {
    tabRegister.classList.add('active');
    registerForm.classList.remove('hidden');
  } else {
    tabReset.classList.add('active');
    resetForm.classList.remove('hidden');
  }
}

tabLogin.addEventListener('click', () => showAuthTab('login'));
tabRegister.addEventListener('click', () => showAuthTab('register'));
tabReset.addEventListener('click', () => showAuthTab('reset'));
toRegister.addEventListener('click', (e) => { e.preventDefault(); showAuthTab('register'); });
toLogin.addEventListener('click', (e) => { e.preventDefault(); showAuthTab('login'); });
resetToLogin.addEventListener('click', (e) => { e.preventDefault(); showAuthTab('login'); });

/* -------------------------
   4) AUTH FUNCTIONS (register, login, reset)
   ------------------------- */

// Register user
registerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  registerError.textContent = '';

  const name = regName.value.trim();
  const email = regEmail.value.trim();
  const password = regPassword.value;

  if (!name || !email || !password) {
    registerError.textContent = 'Please provide name, email, and password.';
    return;
  }

  registerBtn.disabled = true;
  auth.createUserWithEmailAndPassword(email, password)
    .then(cred => {
      // Save profile in Firestore
      const uid = cred.user.uid;
      return db.collection('users').doc(uid).set({
        name,
        email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }).then(() => {
        // Optionally send email verification
        return cred.user.sendEmailVerification().catch(() => {});
      });
    })
    .catch(err => {
      console.error(err);
      registerError.textContent = err.message || 'Registration failed.';
    })
    .finally(() => { registerBtn.disabled = false; });
});

// Login
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  loginError.textContent = '';

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email || !password) {
    loginError.textContent = 'Provide email and password.';
    return;
  }

  loginBtn.disabled = true;
  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      // onAuthStateChanged handles UI change
    })
    .catch(err => {
      console.error(err);
      loginError.textContent = err.message || 'Login failed.';
    })
    .finally(() => { loginBtn.disabled = false; });
});

// Reset password
resetForm.addEventListener('submit', (e) => {
  e.preventDefault();
  resetError.textContent = '';
  resetSuccess.textContent = '';

  const email = resetEmail.value.trim();
  if (!email) {
    resetError.textContent = 'Provide an email address.';
    return;
  }

  resetBtn.disabled = true;
  auth.sendPasswordResetEmail(email)
    .then(() => {
      resetSuccess.textContent = 'Password reset email sent. Check your inbox.';
    })
    .catch(err => {
      console.error(err);
      resetError.textContent = err.message || 'Failed to send reset email.';
    })
    .finally(() => { resetBtn.disabled = false; });
});

/* -------------------------
   5) Protect app — listen for auth state
   ------------------------- */

// We will initialize Firestore listeners only after successful login
let firestoreInitialized = false;

auth.onAuthStateChanged(user => {
  if (user) {
    // Hide auth overlay, show app
    authOverlay.classList.add('hidden');
    appRoot.classList.remove('hidden');

    // Set user info in header
    const displayName = user.displayName || '';
    const email = user.email || '';
    userNameEl.textContent = displayName || email.split('@')[0] || 'User';
    userEmailEl.textContent = email;

    // Initialize full app only once
    if (!firestoreInitialized) {
      firestoreInitialized = true;
      appInitAfterAuth(user);
    }
  } else {
    // No user — show auth overlay, hide app
    authOverlay.classList.remove('hidden');
    appRoot.classList.add('hidden');
  }
});

/* -------------------------
   6) App initialization that depends on being authenticated
   ------------------------- */
function appInitAfterAuth(user) {
  // attach nav listeners, populate category selects and start Firestore listeners
  navItems.forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const view = e.currentTarget.getAttribute('data-view');
      switchView(view);
    });
  });

  // default view and UI
  switchView('dashboard');

  loadCategoriesToFilter(allCategories);
  populateTxCategorySelect();

  // Start Firestore listeners (only now)
  initFirestoreListeners();
}

/* -------------------------
   7) Chart (Filled Line)
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
   8) Firestore listeners & data binding (unchanged logic)
   ------------------------- */

let liveTransactions = []; // cached transactions
let allTransactionsForUI = [];

function initFirestoreListeners() {
  // Real-time listener for transactions collection
  db.collection("transactions").orderBy('date', 'asc').onSnapshot(snapshot => {
    const txs = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      data.id = doc.id;
      txs.push(data);
    });

    liveTransactions = txs;
    updateDashboardFromTransactions(liveTransactions);
    updateTransactionListView(liveTransactions);
    updateRecentTransactions(liveTransactions);
    updateCategoryFilterOptions(liveTransactions);
  }, err => {
    console.error("Firestore listener error:", err);
    liveTransactions = [];
    updateDashboardFromTransactions([]);
    updateTransactionListView([]);
    updateRecentTransactions([]);
  });
}

/* Update dashboard calculations and chart */
function updateDashboardFromTransactions(transactions) {
  if (!transactions || transactions.length === 0) {
    totalBalanceEl.textContent = currencyFormatter.format(0);
    monthlyIncomeEl.textContent = currencyFormatter.format(0);
    monthlyExpenseEl.textContent = currencyFormatter.format(0);
    renderBalanceChart([0], ['Today']);
    return;
  }

  let totalBalance = 0;
  let monthlyIncome = 0;
  let monthlyExpense = 0;

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const computedBalances = [];
  transactions.forEach(tx => {
    if (typeof tx.balance === 'number') computedBalances.push(tx.balance);
  });

  // if no precomputed balances, compute running sums
  if (computedBalances.length === 0) {
    let acc = 0;
    transactions.forEach(tx => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'Credit') acc += Math.abs(amt);
      else acc -= Math.abs(amt);
      computedBalances.push(acc);
    });
  }

  // Chart points: last 7 + Today
  const lastN = 7;
  const totalLen = transactions.length;
  const startIndex = Math.max(0, totalLen - lastN);
  const chartPoints = [];
  const chartLabels = [];
  for (let i = startIndex; i < totalLen; i++) {
    const tx = transactions[i];
    chartLabels.push(toDateObject(tx.date).toLocaleDateString('en-US', { month:'short', day:'numeric' }));
    chartPoints.push(computedBalances[i]);
  }
  const lastBalance = computedBalances.length ? computedBalances[computedBalances.length - 1] : 0;
  chartLabels.push('Today');
  chartPoints.push(lastBalance);

  // Totals
  transactions.forEach(tx => {
    const date = toDateObject(tx.date);
    if (tx.type === 'Credit') totalBalance += Number(tx.amount || 0);
    else totalBalance -= Number(tx.amount || 0);

    if (date.getMonth() === thisMonth && date.getFullYear() === thisYear) {
      if (tx.type === 'Credit') monthlyIncome += Number(tx.amount || 0);
      else monthlyExpense += Math.abs(Number(tx.amount || 0));
    }
  });

  totalBalanceEl.textContent = currencyFormatter.format(lastBalance || 0);
  monthlyIncomeEl.textContent = currencyFormatter.format(monthlyIncome);
  monthlyExpenseEl.textContent = currencyFormatter.format(monthlyExpense);

  renderBalanceChart(chartPoints.map(n => Number(n || 0)), chartLabels);
}

/* Recent transactions for dashboard */
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

/* Transaction list view + filters */
function updateTransactionListView(transactions) {
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

/* Render the transaction cards */
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

/* Filters logic */
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

/* Populate add/edit modal category select */
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
   9) Add / Edit / Delete transactions (unchanged)
   ------------------------- */

addTransactionBtn.addEventListener('click', () => openAddTransaction());
viewAllBtn && viewAllBtn.addEventListener('click', () => switchView('transactions'));

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

window.openEditTransaction = function(id) {
  editingTransactionId = id;
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

function showModal() { modalOverlay.classList.remove('hidden'); }
modalCancel.addEventListener('click', () => { modalOverlay.classList.add('hidden'); editingTransactionId = null; });

modalSave.addEventListener('click', () => {
  const title = txTitle.value.trim();
  const amount = Number(txAmount.value || 0);
  const type = txType.value;
  const category = txCategory.value || 'Other';
  const dateVal = txDate.value ? new Date(txDate.value) : new Date();
  const description = txDescription.value || '';

  if (!title || !amount) return alert('Please provide title and amount.');

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
    payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    db.collection('transactions').add(payload).then(() => {
      modalOverlay.classList.add('hidden');
    }).catch(err => {
      console.error(err); alert('Failed to add transaction.');
    });
  }
});

window.deleteTransaction = function(id) {
  if (!confirm('Delete this transaction?')) return;
  db.collection('transactions').doc(id).delete().catch(err => {
    console.error(err); alert('Failed to delete.');
  });
};

/* -------------------------
   10) View switching helper (unchanged)
   ------------------------- */
function switchView(viewName) {
  viewContent.querySelectorAll('.view').forEach(v => v.classList.add('view-hidden'));
  const target = document.getElementById(`${viewName}-view`);
  if (target) target.classList.remove('view-hidden');

  navItems.forEach(item => {
    item.parentElement.classList.remove('active');
    if (item.getAttribute('data-view') === viewName) item.parentElement.classList.add('active');
  });

  document.querySelector('.main-header h1').textContent = viewName.charAt(0).toUpperCase() + viewName.slice(1);
}

/* -------------------------
   11) Sign out
   ------------------------- */
const signOutBtn = document.getElementById('signOutBtn');
if (signOutBtn) signOutBtn.addEventListener('click', () => {
  auth.signOut().then(() => {
    // show auth overlay is handled by onAuthStateChanged
  }).catch(err => {
    console.error(err);
    alert('Sign out failed.');
  });
});

/* -------------------------
   12) Small UX helpers
   ------------------------- */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') modalOverlay.classList.add('hidden');
});
