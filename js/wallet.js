// ============================================================
// wallet.js — Bank with balance, deposit/withdraw (PIN gated),
//             interest calculation, transaction history,
//             categories, summary, import/export
// ============================================================

var Wallet = (function() {
  var currentAction = null; // 'deposit' or 'withdraw'
  var summaryPeriod = 'month';

  function addTransaction(type, amount, desc, category) {
    var state = Storage.load();
    if (type === 'deposit') {
      state.wallet.balance += amount;
    } else {
      if (state.wallet.balance < amount) return false;
      state.wallet.balance -= amount;
    }
    state.wallet.transactions.unshift({
      type: type, amount: amount, desc: desc, date: todayString(), category: category || ''
    });
    if (state.wallet.transactions.length > 100) {
      state.wallet.transactions = state.wallet.transactions.slice(0, 100);
    }
    Storage.save(state);
    return true;
  }

  function getBalance() {
    return Storage.load().wallet.balance;
  }

  // Calculate and apply monthly interest
  function processInterest() {
    var state = Storage.load();
    var today = todayString();
    var lastMonth = getMonthYear(state.lastInterestDate);
    var thisMonth = getMonthYear(today);

    if (lastMonth === thisMonth) return;

    var lastParts = state.lastInterestDate.split('-');
    var todayParts = today.split('-');
    var monthsPassed = (parseInt(todayParts[0]) - parseInt(lastParts[0])) * 12 +
                       (parseInt(todayParts[1]) - parseInt(lastParts[1]));

    if (monthsPassed <= 0) return;

    var annualRate = state.settings.interestRate;
    var monthlyRate = annualRate / 12 / 100;

    for (var m = 0; m < monthsPassed; m++) {
      var interest = Math.round(state.wallet.balance * monthlyRate);
      if (interest > 0) {
        state.wallet.balance += interest;
        state.wallet.transactions.unshift({
          type: 'deposit',
          amount: interest,
          desc: 'Monthly interest (' + annualRate + '% annual)',
          date: today,
          category: 'Interest Income'
        });
      }
    }

    state.lastInterestDate = today;
    Storage.save(state);
  }

  function getCategoryOptions(type) {
    var state = Storage.load();
    var defaults = type === 'deposit' ? DEPOSIT_CATEGORIES : WITHDRAW_CATEGORIES;
    var custom = type === 'deposit'
      ? (state.settings.customDepositCategories || [])
      : (state.settings.customWithdrawCategories || []);
    return defaults.concat(custom);
  }

  function populateCategorySelect(type) {
    var sel = document.getElementById('wallet-category');
    var options = getCategoryOptions(type);
    sel.innerHTML = options.map(function(c) {
      return '<option value="' + c + '">' + c + '</option>';
    }).join('');
  }

  function render() {
    var state = Storage.load();
    var balance = state.wallet.balance;
    var name = state.playerName || 'Friend';

    document.getElementById('bank-greeting').textContent = name + "'s Bank";
    document.getElementById('wallet-balance').textContent = formatMoney(balance);

    var rateInfo = document.getElementById('interest-info');
    if (rateInfo) {
      rateInfo.textContent = 'Interest: ' + state.settings.interestRate + '% / year';
    }

    // Transaction list
    var list = document.getElementById('transaction-list');
    if (state.wallet.transactions.length === 0) {
      list.innerHTML = '<p class="empty-msg">No transactions yet.</p>';
    } else {
      list.innerHTML = state.wallet.transactions.map(function(t) {
        var sign = t.type === 'deposit' ? '+' : '-';
        var cls = t.type === 'deposit' ? 'tx-deposit' : 'tx-withdraw';
        var catLabel = t.category ? '<span class="tx-category">[' + t.category + ']</span> ' : '';
        return '<div class="transaction ' + cls + '">' +
          '<span class="tx-desc">' + catLabel + t.desc + '</span>' +
          '<span class="tx-amount">' + sign + formatMoney(t.amount) + '</span>' +
          '<span class="tx-date">' + t.date + '</span>' +
          '</div>';
      }).join('');
    }

    // Render summary
    renderSummary(state);

    // Wire up buttons
    document.getElementById('btn-deposit').onclick = function() {
      currentAction = 'deposit';
      populateCategorySelect('deposit');
      showPinGate();
    };
    document.getElementById('btn-withdraw').onclick = function() {
      currentAction = 'withdraw';
      populateCategorySelect('withdraw');
      showPinGate();
    };
    document.getElementById('btn-wallet-cancel').onclick = function() {
      hideWalletForm();
    };
    document.getElementById('btn-wallet-confirm').onclick = function() {
      confirmTransaction();
    };

    // Summary period toggle
    document.querySelectorAll('.summary-period-btn').forEach(function(btn) {
      btn.onclick = function() {
        summaryPeriod = btn.dataset.period;
        document.querySelectorAll('.summary-period-btn').forEach(function(b) {
          b.classList.remove('active', 'btn-accent');
          b.classList.add('btn-secondary');
        });
        btn.classList.add('active', 'btn-accent');
        btn.classList.remove('btn-secondary');
        renderSummary(Storage.load());
      };
    });

    // Import/Export
    document.getElementById('btn-export').onclick = exportState;
    document.getElementById('btn-import').onclick = function() {
      document.getElementById('import-file').click();
    };
    document.getElementById('import-file').onchange = importState;
  }

  function renderSummary(state) {
    var today = todayString();
    var todayParts = today.split('-');
    var year = todayParts[0];
    var month = todayParts[1];

    var filtered = state.wallet.transactions.filter(function(t) {
      if (!t.date) return false;
      var parts = t.date.split('-');
      if (summaryPeriod === 'month') {
        return parts[0] === year && parts[1] === month;
      } else {
        return parts[0] === year;
      }
    });

    var income = {};
    var spending = {};
    var incomeTotal = 0;
    var spendingTotal = 0;

    filtered.forEach(function(t) {
      var cat = t.category || 'Uncategorized';
      if (t.type === 'deposit') {
        income[cat] = (income[cat] || 0) + t.amount;
        incomeTotal += t.amount;
      } else {
        spending[cat] = (spending[cat] || 0) + t.amount;
        spendingTotal += t.amount;
      }
    });

    var html = '';

    html += '<div class="summary-table"><h4 class="summary-title summary-income-title">Income</h4>';
    var incomeKeys = Object.keys(income);
    if (incomeKeys.length === 0) {
      html += '<p class="empty-msg">No income this period.</p>';
    } else {
      incomeKeys.forEach(function(k) {
        html += '<div class="summary-row"><span>' + k + '</span><span class="tx-deposit">' + formatMoney(income[k]) + '</span></div>';
      });
      html += '<div class="summary-row summary-total"><span>Total</span><span class="tx-deposit">' + formatMoney(incomeTotal) + '</span></div>';
    }
    html += '</div>';

    html += '<div class="summary-table"><h4 class="summary-title summary-spending-title">Spending</h4>';
    var spendingKeys = Object.keys(spending);
    if (spendingKeys.length === 0) {
      html += '<p class="empty-msg">No spending this period.</p>';
    } else {
      spendingKeys.forEach(function(k) {
        html += '<div class="summary-row"><span>' + k + '</span><span class="tx-withdraw">' + formatMoney(spending[k]) + '</span></div>';
      });
      html += '<div class="summary-row summary-total"><span>Total</span><span class="tx-withdraw">' + formatMoney(spendingTotal) + '</span></div>';
    }
    html += '</div>';

    document.getElementById('summary-tables').innerHTML = html;
  }

  function showPinGate() {
    var pinArea = document.getElementById('wallet-pin-area');
    var form = document.getElementById('wallet-form');
    pinArea.style.display = '';
    form.style.display = 'none';
    document.getElementById('wallet-pin').value = '';
    document.getElementById('wallet-pin-error').style.display = 'none';
    document.getElementById('wallet-pin').focus();

    document.getElementById('btn-wallet-pin-ok').onclick = function() {
      var state = Storage.load();
      var pin = document.getElementById('wallet-pin').value;
      if (pin === state.parentPassword) {
        pinArea.style.display = 'none';
        form.style.display = '';
        document.getElementById('wallet-amount').value = '';
        document.getElementById('wallet-desc').value = '';
        document.getElementById('wallet-amount').focus();
      } else {
        document.getElementById('wallet-pin-error').style.display = '';
        Sound.wrong();
      }
    };
    document.getElementById('btn-wallet-pin-cancel').onclick = function() {
      pinArea.style.display = 'none';
      currentAction = null;
    };
  }

  function confirmTransaction() {
    var amountStr = document.getElementById('wallet-amount').value;
    var desc = document.getElementById('wallet-desc').value.trim();
    var category = document.getElementById('wallet-category').value;
    if (!desc) desc = currentAction === 'deposit' ? 'Deposit' : 'Spending';
    var amount = Math.round(parseFloat(amountStr) * 100);

    if (!amount || amount <= 0) {
      App.showToast('Enter a valid amount!');
      return;
    }
    if (currentAction === 'withdraw' && amount > getBalance()) {
      App.showToast('Not enough money!');
      return;
    }

    addTransaction(currentAction, amount, desc, category);
    Sound.coin();
    App.showToast(currentAction === 'deposit' ? 'Deposited!' : 'Spent!');
    hideWalletForm();
    render();
  }

  function hideWalletForm() {
    document.getElementById('wallet-form').style.display = 'none';
    document.getElementById('wallet-pin-area').style.display = 'none';
    currentAction = null;
  }

  function exportState() {
    var state = Storage.load();
    var json = JSON.stringify(state, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'piggybank_backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    App.showToast('Backup exported!');
  }

  function importState(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        var data = JSON.parse(ev.target.result);
        // Basic validation
        if (!data.wallet || !data.animals || !data.settings) {
          App.showToast('Invalid backup file!');
          return;
        }
        Storage.save(data);
        App.showToast('Backup restored! Reloading...');
        setTimeout(function() { location.reload(); }, 1000);
      } catch (err) {
        App.showToast('Could not read file!');
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-imported
    e.target.value = '';
  }

  return {
    addTransaction: addTransaction,
    getBalance: getBalance,
    render: render,
    processInterest: processInterest
  };
})();
