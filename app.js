// app.js

// app.js (Add this early in the file)

const dashboardView = document.getElementById('dashboard-view');
const transactionsView = document.getElementById('transactions-view');
const navItems = document.querySelectorAll('.nav-item a');

function switchView(viewName) {
    // Hide all views first (if you have many)
    document.getElementById('view-content').querySelectorAll('div[id$="-view"]').forEach(view => {
        view.classList.add('view-hidden');
    });

    // Show the requested view
    const targetView = document.getElementById(`${viewName}-view`);
    if (targetView) {
        targetView.classList.remove('view-hidden');
    }
    
    // Update active class on sidebar
    navItems.forEach(item => {
        item.parentElement.classList.remove('active');
        if (item.getAttribute('data-view') === viewName) {
            item.parentElement.classList.add('active');
            // Update the header h1 dynamically (optional)
            document.querySelector('.main-header h1').textContent = viewName.charAt(0).toUpperCase() + viewName.slice(1);
        }
    });

    // If we switch to transactions, load the list
    if (viewName === 'transactions') {
        fetchAndRenderTransactionList();
    } else if (viewName === 'dashboard') {
        fetchAndRenderDashboardData(); // Reload dashboard data
    }
}


// Add Event Listener to navigation items
document.addEventListener('DOMContentLoaded', () => {
    // ... existing content for DOMContentLoaded ...
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = e.currentTarget.getAttribute('data-view');
            switchView(view);
        });
    });
    
    // Initial view load
    switchView('dashboard'); // Start on the dashboard
});

// 1. Firebase Configuration (REPLACE with your actual keys from Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyBsgJAuSeZPhmFmriHyZ18pm4iE551lqww",
  authDomain: "finance-tracker-36ba4.firebaseapp.com",
  projectId: "finance-tracker-36ba4",
  storageBucket: "finance-tracker-36ba4.firebasestorage.app",
  messagingSenderId: "225771628304",
  appId: "1:225771628304:web:d25cec52accc4dd1636795"
};

// 2. Initialize Firebase and Firestore
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

console.log("Firebase initialized successfully. Ready to connect to Firestore!");

// --- Placeholder for other functions (updateDashboardUI, renderBalanceChart, etc.) ---

// 3. Initial Load
document.addEventListener('DOMContentLoaded', () => {
    // When the DOM is ready, we'll start fetching data from Firebase
    // fetchAndRenderDashboardData(); 
});
// Function to render the Chart.js graph
function renderBalanceChart(chartDataPoints, chartLabels) {
    
    // Clear the previous chart instance if any
    if (window.myBalanceChart) {
        window.myBalanceChart.destroy();
    }

    const ctx = chartCanvas.getContext('2d');

    window.myBalanceChart = new Chart(ctx, {
        type: 'line', 
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Balance',
                data: chartDataPoints,
                borderColor: '#1abc9c', 
                backgroundColor: 'rgba(26, 188, 156, 0.2)', 
                tension: 0.4, // Curved lines
                pointRadius: 3, // Shows points for clarity
                pointHoverRadius: 5,
                fill: true, 
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, 
            plugins: {
                legend: { display: false },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 750, // To match the 0, 750, 1500, 2250, 3000 axis in your image
                        callback: function(value) { return value.toLocaleString('en-US'); }
                    }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}
// Function to calculate and update dashboard figures
function fetchAndRenderDashboardData() {
    
    // *** PLACEHOLDER DATA (TO BE REPLACED BY FIREBASE DATA) ***
    const transactions = [
        { date: '2025-01-01', type: 'Credit', amount: 2500, balance: 2500 },
        { date: '2025-01-05', type: 'Debit', amount: 250, balance: 2250 },
        { date: '2025-01-10', type: 'Credit', amount: 750, balance: 3000 },
        { date: '2025-01-15', type: 'Debit', amount: 900, balance: 2100 },
        { date: '2025-01-20', type: 'Credit', amount: 100, balance: 2200 },
        { date: '2025-01-25', type: 'Credit', amount: 300, balance: 2500 },
        // ... imagine hundreds of entries
    ];

    // 1. Calculate Summary Metrics
    let totalBalance = 8234.56; // Final balance
    let monthlyIncome = 6200.00; // Total income for current month
    let monthlyExpense = 1250.50; // Total expense for current month

    // 2. Prepare Chart Data (using the placeholder transactions for the line shape)
    // We'll use the dates and the running balance for the trend chart
    const chartLabels = transactions.map(t => new Date(t.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }));
    const chartDataPoints = transactions.map(t => t.balance);

    // Add "Today" as the final label point to match the design
    chartLabels.push('Today');
    // Use the final balance for today's point
    chartDataPoints.push(totalBalance); 

    // 3. Update the UI Cards
    totalBalanceEl.textContent = currencyFormatter.format(totalBalance);
    monthlyIncomeEl.textContent = currencyFormatter.format(monthlyIncome);
    monthlyExpenseEl.textContent = currencyFormatter.format(monthlyExpense);

    // 4. Render the Chart
    renderBalanceChart(chartDataPoints, chartLabels);
    
    console.log("Dashboard figures and chart rendered using mock data.");
}
// Initial load when the page is ready
document.addEventListener('DOMContentLoaded', () => {
    // We call the function to fetch data and update the dashboard UI
    fetchAndRenderDashboardData(); 
});



// app.js (Add this after the renderBalanceChart function)

const transactionListEl = document.getElementById('transaction-list');
const txTotalIncomeEl = document.getElementById('tx-total-income');
const txTotalExpenseEl = document.getElementById('tx-total-expense');
const txNetBalanceEl = document.getElementById('tx-net-balance');

function createTransactionItemHTML(transaction) {
    const isCredit = transaction.type === 'Credit';
    const amountClass = isCredit ? 'tx-amount-positive' : 'tx-amount-negative';
    const amountSign = isCredit ? '+' : '-';
    const amountValue = Math.abs(transaction.amount).toFixed(2);
    const borderColor = isCredit ? '#1abc9c' : '#222020ff';
    
    // Simple icon mapping (expand this later)
    const iconClass = transaction.category === 'Salary' ? 'fas fa-money-check-alt' :
                      transaction.category === 'Food' ? 'fas fa-utensils' :
                      transaction.category === 'Entertainment' ? 'fas fa-tv' : 'fas fa-wallet';
                      
    const dateFormatted = transaction.date.toDate().toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

    return `
        <div class="transaction-item" style="border-left-color: ${borderColor};">
            <div class="tx-icon" style="background-color: ${borderColor};">
                <i class="${iconClass}"></i>
            </div>
            <div class="tx-details">
                <p class="tx-title">${transaction.description}</p>
                <p class="tx-category">${transaction.category}</p>
            </div>
            <div class="tx-amount-col">
                <p class="${amountClass}">${amountSign}${currencyFormatter.format(amountValue)}</p>
                <p class="tx-date">${dateFormatted}</p>
            </div>
            <div class="tx-actions">
                <button title="Edit" data-id="${transaction.id}"><i class="fas fa-edit"></i></button>
                <button title="Delete" data-id="${transaction.id}"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>
    `;
}

// Function to fetch and render the list (uses Firestore real-time listener)
function fetchAndRenderTransactionList() {
    transactionListEl.innerHTML = '<p class="loading-message">Fetching transactions...</p>';
    
    db.collection("transactions")
      .orderBy('date', 'desc') // Show newest transactions first
      .onSnapshot((snapshot) => {
        let listHTML = '';
        let incomeTotal = 0;
        let expenseTotal = 0;
        let netBalance = 0;
        
        snapshot.forEach((doc) => {
            const transaction = doc.data();
            transaction.id = doc.id; // Store document ID for edit/delete
            listHTML += createTransactionItemHTML(transaction);

            // Calculate totals
            if (transaction.type === 'Credit') {
                incomeTotal += transaction.amount;
            } else if (transaction.type === 'Debit') {
                expenseTotal += Math.abs(transaction.amount);
            }
        });
        
        netBalance = incomeTotal - expenseTotal;
        
        // Update the list and summary cards
        transactionListEl.innerHTML = listHTML || '<p class="loading-message">No transactions found.</p>';
        txTotalIncomeEl.textContent = currencyFormatter.format(incomeTotal);
        txTotalExpenseEl.textContent = currencyFormatter.format(expenseTotal);
        txNetBalanceEl.textContent = currencyFormatter.format(netBalance);

        // This is where you would also attach listeners for the edit/delete buttons
        // attachTransactionActionListeners();
        
        console.log(`Transaction List updated with ${snapshot.size} items.`);
    });
}
// Add this function to the bottom of app.js

function renderBalanceChart() {
    // Data extracted from the sample chart image (simplified)
    const chartLabels = ['Jan 1', 'Jan 5', 'Jan 10', 'Jan 15', 'Jan 20', 'Jan 25', 'Today'];
    const chartDataPoints = [2400, 2250, 3000, 2100, 2200, 2500, 2150]; // Example balance values

    const ctx = document.getElementById('balance-trend-chart').getContext('2d');

    new Chart(ctx, {
        type: 'line', // Line chart type
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Balance',
                data: chartDataPoints,
                borderColor: '#1abc9c', // Green color from your design
                backgroundColor: 'rgba(26, 188, 156, 0.2)', // Light fill color
                tension: 0.4, // Makes the line curved (like in the design)
                pointRadius: 0, // Hide the points by default
                fill: true, // Fill the area under the line
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Allows the chart to respect the height: 300px
            plugins: {
                legend: {
                    display: false // No legend needed for a single line
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    // Optional: Custom tooltip to show date and balance
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    // Custom Y-axis ticks to match the design (0, 750, 1500, 2250, 3000)
                    ticks: {
                        stepSize: 750,
                        callback: function(value) {
                            return value.toLocaleString('en-US'); // Format number with commas
                        }
                    }
                },
                x: {
                    grid: {
                        display: false // Hide vertical grid lines
                    }
                }
            }
        }
    });
}
// Update the Initial Load section to include the chart rendering

document.addEventListener('DOMContentLoaded', () => {
    updateDashboardUI();
    renderBalanceChart(); // CALL THE NEW CHART FUNCTION
});