/************************************************
 * app.js - Finance Tracker with Authentication
 * COMPLETE & FIXED VERSION
 ************************************************/

/* -------------------------
   Firebase Configuration
   ------------------------- */
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
const auth = firebase.auth();

/* -------------------------
   Global Variables
   ------------------------- */
let currentUser = null;
let liveTransactions = [];
let allTransactionsForUI = [];
let userCategories = [];
let editingTransactionId = null;
let editingCategoryId = null;
let balanceChartInstance = null;
let categoryChartInstance = null;
let incomeExpenseChartInstance = null;

const defaultCategories = [
  { name: 'Salary', icon: 'fa-money-check-alt', type: 'income' },
  { name: 'Food', icon: 'fa-utensils', type: 'expense' },
  { name: 'Transport', icon: 'fa-car', type: 'expense' },
  { name: 'Shopping', icon: 'fa-shopping-cart', type: 'expense' },
  { name: 'Entertainment', icon: 'fa-tv', type: 'expense' },
  { name: 'Bills', icon: 'fa-file-invoice-dollar', type: 'expense' },
  { name: 'Health', icon: 'fa-heartbeat', type: 'expense' },
  { name: 'Other', icon: 'fa-wallet', type: 'both' }
];

const currencyFormatter = new Intl.NumberFormat('en-US', { 
  style: 'currency', 
  currency: 'USD' 
});

/* -------------------------
   DOM Elements
   ------------------------- */
const authContainer = document.getElementById('authContainer');
const mainApp = document.getElementById('mainApp');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authError = document.getElementById('authError');

const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const showRegisterLink = document.getElementById('showRegisterLink');

const registerName = document.getElementById('registerName');
const registerEmail = document.getElementById('registerEmail');
const registerPassword = document.getElementById('registerPassword');
const registerBtn = document.getElementById('registerBtn');
const showLoginLink = document.getElementById('showLoginLink');

const navItems = document.querySelectorAll('.nav-item a');
const viewContent = document.getElementById('view-content');
const signOutBtn = document.getElementById('signOutBtn');
const userProfileBtn = document.getElementById('userProfileBtn');

const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const userAvatar = document.getElementById('userAvatar');

const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const closeSidebar = document.getElementById('closeSidebar');

const totalBalanceEl = document.getElementById('total-balance');
const monthlyIncomeEl = document.getElementById('monthly-income');
const monthlyExpenseEl = document.getElementById('monthly-expenses');
const recentContainer = document.getElementById('recent-transactions-list');
const viewAllBtn = document.getElementById('viewAllBtn');

const transactionListEl = document.getElementById('transaction-list');
const txTotalIncomeEl = document.getElementById('tx-total-income');
const txTotalExpenseEl = document.getElementById('tx-total-expense');
const txNetBalanceEl = document.getElementById('tx-net-balance');
const searchInput = document.getElementById('searchInput');
const filterType = document.getElementById('filterType');
const filterCategory = document.getElementById('filterCategory');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
const addTransactionBtn = document.getElementById('addTransactionBtn');

const categoriesList = document.getElementById('categoriesList');
const addCategoryBtn = document.getElementById('addCategoryBtn');

const analyticsPeriod = document.getElementById('analyticsPeriod');
const analyticsTotalIncome = document.getElementById('analytics-total-income');
const analyticsTotalExpenses = document.getElementById('analytics-total-expenses');
const analyticsNetSavings = document.getElementById('analytics-net-savings');
const analyticsSavingsRate = document.getElementById('analytics-savings-rate');
const topCategoriesList = document.getElementById('top-categories-list');

const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const updateProfileBtn = document.getElementById('updateProfileBtn');
const newPassword = document.getElementById('newPassword');
const changePasswordBtn = document.getElementById('changePasswordBtn');

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

const categoryModalOverlay = document.getElementById('categoryModalOverlay');
const categoryModalTitle = document.getElementById('categoryModalTitle');
const categoryModalCancel = document.getElementById('categoryModalCancel');
const categoryModalSave = document.getElementById('categoryModalSave');
const categoryName = document.getElementById('categoryName');
const categoryIcon = document.getElementById('categoryIcon');
const categoryType = document.getElementById('categoryType');

/* -------------------------
   Mobile Menu
   ------------------------- */
mobileMenuToggle.addEventListener('click', () => {
  sidebar.classList.add('sidebar-open');
  sidebarOverlay.classList.add('show');
  document.body.style.overflow = 'hidden';
});

closeSidebar.addEventListener('click', closeMobileMenu);
sidebarOverlay.addEventListener('click', closeMobileMenu);

function closeMobileMenu() {
  sidebar.classList.remove('sidebar-open');
  sidebarOverlay.classList.remove('show');
  document.body.style.overflow = '';
}

/* -------------------------
   Utility Functions
   ------------------------- */
function toDateObject(dateVal) {
  if (!dateVal) return new Date();
  if (dateVal.toDate && typeof dateVal.toDate === 'function') return dateVal.toDate();
  return new Date(dateVal);
}

function showAuthError(message) {
  authError.textContent = message;
  authError.style.display = 'block';
  setTimeout(() => {
    authError.style.display = 'none';
  }, 5000);
}

function showNotification(message) {
  alert(message);
}

/* -------------------------
   Authentication
   ------------------------- */
showRegisterLink.addEventListener('click', (e) => {
  e.preventDefault();
  loginForm.style.display = 'none';
  registerForm.style.display = 'block';
  authError.style.display = 'none';
});

showLoginLink.addEventListener('click', (e) => {
  e.preventDefault();
  registerForm.style.display = 'none';
  loginForm.style.display = 'block';
  authError.style.display = 'none';
});

loginBtn.addEventListener('click', async () => {
  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email || !password) {
    showAuthError('Please enter email and password');
    return;
  }

  try {
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';
    await auth.signInWithEmailAndPassword(email, password);
  } catch (error) {
    console.error('Login error:', error);
    showAuthError(getAuthErrorMessage(error.code));
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
  }
});

registerBtn.addEventListener('click', async () => {
  const name = registerName.value.trim();
  const email = registerEmail.value.trim();
  const password = registerPassword.value;

  if (!name || !email || !password) {
    showAuthError('Please fill in all fields');
    return;
  }

  if (password.length < 6) {
    showAuthError('Password must be at least 6 characters');
    return;
  }

  try {
    registerBtn.disabled = true;
    registerBtn.textContent = 'Creating account...';
    
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    
    await userCredential.user.updateProfile({
      displayName: name
    });

    await db.collection('users').doc(userCredential.user.uid).set({
      displayName: name,
      email: email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Create default categories
    const batch = db.batch();
    defaultCategories.forEach(cat => {
      const ref = db.collection('categories').doc();
      batch.set(ref, {
        userId: userCredential.user.uid,
        name: cat.name,
        icon: cat.icon,
        type: cat.type,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    await batch.commit();

    // Sign out immediately after registration
    await auth.signOut();
    
    // Show success message and return to login
    showAuthError('Account created successfully! Please sign in.');
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
    registerName.value = '';
    registerEmail.value = '';
    registerPassword.value = '';
    registerBtn.disabled = false;
    registerBtn.textContent = 'Create Account';

  } catch (error) {
    console.error('Registration error:', error);
    showAuthError(getAuthErrorMessage(error.code));
    registerBtn.disabled = false;
    registerBtn.textContent = 'Create Account';
  }
});

signOutBtn.addEventListener('click', async () => {
  try {
    await auth.signOut();
  } catch (error) {
    console.error('Sign out error:', error);
    showNotification('Failed to sign out');
  }
});

function getAuthErrorMessage(errorCode) {
  const errorMessages = {
    'auth/email-already-in-use': 'This email is already registered',
    'auth/invalid-email': 'Invalid email address',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/weak-password': 'Password should be at least 6 characters',
    'auth/too-many-requests': 'Too many attempts. Please try again later'
  };
  return errorMessages[errorCode] || 'An error occurred. Please try again';
}

auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user;
    authContainer.style.display = 'none';
    mainApp.style.display = 'flex';
    
    updateUserProfile(user);
    initFirestoreListeners();
    
  } else {
    currentUser = null;
    mainApp.style.display = 'none';
    authContainer.style.display = 'flex';
    
    loginEmail.value = '';
    loginPassword.value = '';
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
  }
});

function updateUserProfile(user) {
  const displayName = user.displayName || 'User';
  const email = user.email || '';
  
  userName.textContent = displayName;
  userEmail.textContent = email;
  
  const initial = displayName.charAt(0).toUpperCase();
  userAvatar.innerHTML = initial;
  
  if (profileName) profileName.value = displayName;
  if (profileEmail) profileEmail.value = email;
}

userProfileBtn.addEventListener('click', () => {
  switchView('settings');
});

updateProfileBtn.addEventListener('click', async () => {
  const newName = profileName.value.trim();
  
  if (!newName) {
    showNotification('Please enter a name');
    return;
  }

  try {
    updateProfileBtn.disabled = true;
    updateProfileBtn.textContent = 'Updating...';
    
    await currentUser.updateProfile({
      displayName: newName
    });

    await db.collection('users').doc(currentUser.uid).update({
      displayName: newName,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    updateUserProfile(currentUser);
    showNotification('Profile updated successfully');
    
  } catch (error) {
    console.error('Profile update error:', error);
    showNotification('Failed to update profile');
  } finally {
    updateProfileBtn.disabled = false;
    updateProfileBtn.textContent = 'Update Profile';
  }
});

changePasswordBtn.addEventListener('click', async () => {
  const password = newPassword.value;
  
  if (!password || password.length < 6) {
    showNotification('Password must be at least 6 characters');
    return;
  }

  try {
    changePasswordBtn.disabled = true;
    changePasswordBtn.textContent = 'Changing...';
    
    await currentUser.updatePassword(password);
    
    newPassword.value = '';
    showNotification('Password changed successfully');
    
  } catch (error) {
    console.error('Password change error:', error);
    if (error.code === 'auth/requires-recent-login') {
      showNotification('Please sign out and sign in again to change your password');
    } else {
      showNotification('Failed to change password');
    }
  } finally {
    changePasswordBtn.disabled = false;
    changePasswordBtn.textContent = 'Change Password';
  }
});

/* -------------------------
   View Switching
   ------------------------- */
function switchView(viewName) {
  viewContent.querySelectorAll('.view').forEach(v => v.classList.add('view-hidden'));
  const target = document.getElementById(`${viewName}-view`);
  if (target) target.classList.remove('view-hidden');

  navItems.forEach(item => {
    item.parentElement.classList.remove('active');
    if (item.getAttribute('data-view') === viewName) {
      item.parentElement.classList.add('active');
    }
  });

  document.querySelector('.main-header h1').textContent = 
    viewName.charAt(0).toUpperCase() + viewName.slice(1);

  // Close mobile menu
  closeMobileMenu();

  // Load view-specific content
  if (viewName === 'categories') {
    renderCategories();
  } else if (viewName === 'analytics') {
    updateAnalytics();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  navItems.forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      switchView(e.currentTarget.getAttribute('data-view'));
    });
  });

  switchView('dashboard');
});

/* -------------------------
   Firestore Listeners
   ------------------------- */
function initFirestoreListeners() {
  if (!currentUser) return;

  // Listen to transactions
  db.collection("transactions")
    .where('userId', '==', currentUser.uid)
    .orderBy('date', 'asc')
    .onSnapshot(snapshot => {
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
    }, err => {
      console.error("Firestore listener error:", err);
    });

  // Listen to categories
  db.collection("categories")
    .where('userId', '==', currentUser.uid)
    .onSnapshot(snapshot => {
      const cats = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        data.id = doc.id;
        cats.push(data);
      });

      userCategories = cats;
      updateCategorySelects();
      renderCategories();
    });
}

/* -------------------------
   Dashboard
   ------------------------- */
function updateDashboardFromTransactions(transactions) {
  if (!transactions || transactions.length === 0) {
    totalBalanceEl.textContent = currencyFormatter.format(0);
    monthlyIncomeEl.textContent = currencyFormatter.format(0);
    monthlyExpenseEl.textContent = currencyFormatter.format(0);
    renderBalanceChart([0], ['Today']);
    return;
  }

  let monthlyIncome = 0;
  let monthlyExpense = 0;

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const chartPoints = [];
  const chartLabels = [];
  let computedBalances = [];

  let acc = 0;
  transactions.forEach(tx => {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'Credit') acc += Math.abs(amt);
    else acc -= Math.abs(amt);
    computedBalances.push(acc);
  });

  const lastN = 7;
  const totalLen = transactions.length;
  const startIndex = Math.max(0, totalLen - lastN);
  
  for (let i = startIndex; i < totalLen; i++) {
    const tx = transactions[i];
    const date = toDateObject(tx.date);
    chartLabels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    chartPoints.push(computedBalances[i]);
  }

  const lastBalance = computedBalances.length ? computedBalances[computedBalances.length - 1] : 0;
  chartLabels.push('Today');
  chartPoints.push(lastBalance);

  transactions.forEach(tx => {
    const date = toDateObject(tx.date);

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

function renderBalanceChart(chartDataPoints, chartLabels) {
  const ctx = document.getElementById('balance-trend-chart');
  if (!ctx) return;
  
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
   Transactions
   ------------------------- */
function updateTransactionListView(transactions) {
  allTransactionsForUI = transactions.map(tx => ({
    id: tx.id,
    title: tx.description || tx.title || 'Transaction',
    amount: Number(tx.amount) || 0,
    type: tx.type || 'Debit',
    category: tx.category || 'Other',
    date: toDateObject(tx.date),
    raw: tx
  }));
  applyFiltersAndRender();
}

function renderTransactions(list) {
  transactionListEl.innerHTML = '';
  if (!list || list.length === 0) {
    transactionListEl.innerHTML = '<p style="text-align:center;padding:14px;color:#777;">No transactions found.</p>';
    txTotalIncomeEl.textContent = currencyFormatter.format(0);
    txTotalExpenseEl.textContent = currencyFormatter.format(0);
    txNetBalanceEl.textContent = currencyFormatter.format(0);
    return;
  }

  let income = 0, expense = 0;
  list.forEach(t => {
    if (t.type === 'Credit') income += Math.abs(Number(t.amount || 0));
    else expense += Math.abs(Number(t.amount || 0));
  });

  txTotalIncomeEl.textContent = currencyFormatter.format(income);
  txTotalExpenseEl.textContent = currencyFormatter.format(expense);
  txNetBalanceEl.textContent = currencyFormatter.format(income - expense);

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

searchInput.addEventListener('input', applyFiltersAndRender);
filterType.addEventListener('change', applyFiltersAndRender);
filterCategory.addEventListener('change', applyFiltersAndRender);
clearFiltersBtn.addEventListener('click', () => {
  searchInput.value = '';
  filterType.value = 'all';
  filterCategory.value = 'all';
  applyFiltersAndRender();
});

function updateCategorySelects() {
  // Update filter dropdown
  filterCategory.innerHTML = '<option value="all">All Categories</option>';
  userCategories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.name;
    opt.textContent = cat.name;
    filterCategory.appendChild(opt);
  });

  // Update transaction modal dropdown
  txCategory.innerHTML = '';
  userCategories.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.textContent = c.name;
    txCategory.appendChild(opt);
  });
}

addTransactionBtn.addEventListener('click', () => {
  editingTransactionId = null;
  modalTitle.textContent = 'Add Transaction';
  txTitle.value = '';
  txAmount.value = '';
  txType.value = 'Credit';
  txCategory.value = userCategories.length > 0 ? userCategories[0].name : '';
  txDate.value = new Date().toISOString().slice(0,10);
  txDescription.value = '';
  modalOverlay.classList.remove('hidden');
});

viewAllBtn && viewAllBtn.addEventListener('click', () => switchView('transactions'));

window.openEditTransaction = function(id) {
  editingTransactionId = id;
  db.collection('transactions').doc(id).get().then(doc => {
    if (!doc.exists) return alert('Transaction not found.');
    const data = doc.data();
    modalTitle.textContent = 'Edit Transaction';
    txTitle.value = data.description || data.title || '';
    txAmount.value = Math.abs(Number(data.amount || 0));
    txType.value = data.type || 'Debit';
    txCategory.value = data.category || '';
    const d = toDateObject(data.date);
    txDate.value = d.toISOString().slice(0,10);
    txDescription.value = data.note || data.description || '';
    modalOverlay.classList.remove('hidden');
  }).catch(err => {
    console.error(err);
    alert('Unable to load transaction.');
  });
};

modalCancel.addEventListener('click', () => {
  modalOverlay.classList.add('hidden');
  editingTransactionId = null;
});

modalSave.addEventListener('click', async () => {
  if (!currentUser) return;

  const title = txTitle.value.trim();
  const amount = Number(txAmount.value || 0);
  const type = txType.value;
  const category = txCategory.value;
  const dateVal = txDate.value ? new Date(txDate.value) : new Date();
  const description = txDescription.value.trim() || title;

  if (!title || !amount) {
    return alert('Please provide title and amount.');
  }

  if (!category) {
    return alert('Please select a category.');
  }

  const payload = {
    userId: currentUser.uid,
    description: description,
    title: title,
    amount: Math.abs(amount),
    type: type,
    category: category,
    date: firebase.firestore.Timestamp.fromDate(dateVal),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    if (editingTransactionId) {
      await db.collection('transactions').doc(editingTransactionId).update(payload);
      showNotification('Transaction updated successfully');
    } else {
      payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('transactions').add(payload);
      showNotification('Transaction added successfully');
    }
    modalOverlay.classList.add('hidden');
    editingTransactionId = null;
  } catch (err) {
    console.error(err);
    alert('Failed to save transaction.');
  }
});

window.deleteTransaction = function(id) {
  if (!confirm('Delete this transaction?')) return;
  db.collection('transactions').doc(id).delete()
    .then(() => showNotification('Transaction deleted'))
    .catch(err => {
      console.error(err);
      alert('Failed to delete.');
    });
};

/* -------------------------
   Categories
   ------------------------- */
addCategoryBtn.addEventListener('click', () => {
  editingCategoryId = null;
  categoryModalTitle.textContent = 'Add Category';
  categoryName.value = '';
  categoryIcon.value = 'fa-wallet';
  categoryType.value = 'expense';
  categoryModalOverlay.classList.remove('hidden');
});

function renderCategories() {
  if (!userCategories || userCategories.length === 0) {
    categoriesList.innerHTML = '<p class="muted" style="text-align:center;padding:20px;">No categories yet. Add your first category!</p>';
    return;
  }

  let html = '';
  userCategories.forEach(cat => {
    const typeColor = cat.type === 'income' ? '#1abc9c' : cat.type === 'expense' ? '#ff6b6b' : '#3498db';
    const typeLabel = cat.type === 'income' ? 'Income' : cat.type === 'expense' ? 'Expense' : 'Both';
    
    html += `
      <div class="category-item">
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="category-icon" style="background:${typeColor}20;">
            <i class="fas ${cat.icon}" style="color:${typeColor};"></i>
          </div>
          <div style="flex:1;">
            <div style="font-weight:700;font-size:16px;">${cat.name}</div>
            <div style="color:#6b7280;font-size:13px;margin-top:4px;">${typeLabel}</div>
          </div>
        </div>
        <div style="display:flex;gap:10px;">
          <i class="fas fa-edit" style="cursor:pointer;color:#6b7280;" onclick="editCategory('${cat.id}')"></i>
          <i class="fas fa-trash" style="cursor:pointer;color:#6b7280;" onclick="deleteCategory('${cat.id}')"></i>
        </div>
      </div>
    `;
  });

  categoriesList.innerHTML = html;
}

window.editCategory = function(id) {
  editingCategoryId = id;
  const cat = userCategories.find(c => c.id === id);
  if (!cat) return;

  categoryModalTitle.textContent = 'Edit Category';
  categoryName.value = cat.name;
  categoryIcon.value = cat.icon;
  categoryType.value = cat.type;
  categoryModalOverlay.classList.remove('hidden');
};

window.deleteCategory = function(id) {
  if (!confirm('Delete this category?')) return;
  db.collection('categories').doc(id).delete()
    .then(() => showNotification('Category deleted'))
    .catch(err => {
      console.error(err);
      alert('Failed to delete category.');
    });
};

categoryModalCancel.addEventListener('click', () => {
  categoryModalOverlay.classList.add('hidden');
  editingCategoryId = null;
});

categoryModalSave.addEventListener('click', async () => {
  if (!currentUser) return;

  const name = categoryName.value.trim();
  const icon = categoryIcon.value;
  const type = categoryType.value;

  if (!name) {
    return alert('Please provide a category name.');
  }

  const payload = {
    userId: currentUser.uid,
    name: name,
    icon: icon,
    type: type,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    if (editingCategoryId) {
      await db.collection('categories').doc(editingCategoryId).update(payload);
      showNotification('Category updated successfully');
    } else {
      payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('categories').add(payload);
      showNotification('Category added successfully');
    }
    categoryModalOverlay.classList.add('hidden');
    editingCategoryId = null;
  } catch (err) {
    console.error(err);
    alert('Failed to save category.');
  }
});

/* -------------------------
   Analytics
   ------------------------- */
analyticsPeriod.addEventListener('change', updateAnalytics);

function updateAnalytics() {
  const period = analyticsPeriod.value;
  const now = new Date();
  let startDate;

  switch(period) {
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case '3months':
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      break;
    case '6months':
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'all':
    default:
      startDate = new Date(2000, 0, 1);
      break;
  }

  const filteredTxs = liveTransactions.filter(tx => {
    const txDate = toDateObject(tx.date);
    return txDate >= startDate;
  });

  let totalIncome = 0;
  let totalExpenses = 0;
  const categoryTotals = {};

  filteredTxs.forEach(tx => {
    const amount = Math.abs(Number(tx.amount || 0));
    if (tx.type === 'Credit') {
      totalIncome += amount;
    } else {
      totalExpenses += amount;
      categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + amount;
    }
  });

  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : 0;

  analyticsTotalIncome.textContent = currencyFormatter.format(totalIncome);
  analyticsTotalExpenses.textContent = currencyFormatter.format(totalExpenses);
  analyticsNetSavings.textContent = currencyFormatter.format(netSavings);
  analyticsSavingsRate.textContent = savingsRate + '%';

  renderCategoryChart(categoryTotals);
  renderIncomeExpenseChart(totalIncome, totalExpenses);
  renderTopCategories(categoryTotals);
}

function renderCategoryChart(categoryTotals) {
  const ctx = document.getElementById('category-chart');
  if (!ctx) return;

  if (categoryChartInstance) categoryChartInstance.destroy();

  const labels = Object.keys(categoryTotals);
  const data = Object.values(categoryTotals);

  if (labels.length === 0) {
    return;
  }

  const colors = [
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#f7b731', '#5f27cd',
    '#00d2d3', '#ff9ff3', '#54a0ff', '#48dbfb', '#1dd1a1'
  ];

  categoryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors.slice(0, labels.length)
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right'
        }
      }
    }
  });
}

function renderIncomeExpenseChart(income, expense) {
  const ctx = document.getElementById('income-expense-chart');
  if (!ctx) return;

  if (incomeExpenseChartInstance) incomeExpenseChartInstance.destroy();

  incomeExpenseChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Income', 'Expenses'],
      datasets: [{
        label: 'Amount',
        data: [income, expense],
        backgroundColor: ['#1abc9c', '#ff6b6b']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return  value.toLocaleString();
            }
          }
        }
      }
    }
  });
}

function renderTopCategories(categoryTotals) {
  const sorted = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (sorted.length === 0) {
    topCategoriesList.innerHTML = '<p class="muted" style="text-align:center;padding:20px;">No expense data available</p>';
    return;
  }

  const maxAmount = sorted[0][1];

  let html = '';
  sorted.forEach(([category, amount]) => {
    const percentage = ((amount / maxAmount) * 100).toFixed(0);
    html += `
      <div class="top-category-item">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="font-weight:600;">${category}</span>
          <span style="font-weight:700;">${currencyFormatter.format(amount)}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${percentage}%;"></div>
        </div>
      </div>
    `;
  });

  topCategoriesList.innerHTML = html;
}

/* -------------------------
   Keyboard Shortcuts
   ------------------------- */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    modalOverlay.classList.add('hidden');
    categoryModalOverlay.classList.add('hidden');
  }
});