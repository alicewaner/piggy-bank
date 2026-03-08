// ============================================================
// wallet.js — Bank with balance, deposit/withdraw (PIN gated),
//             interest calculation, transaction history
// ============================================================

var Wallet = (function() {
  var currentAction = null; // 'deposit' or 'withdraw'
  var pinVerified = false;

  function addTransaction(type, amount, desc) {
    var state = Storage.load();
    if (type === 'deposit') {
      state.wallet.balance += amount;
    } else {
      if (state.wallet.balance < amount) return false;
      state.wallet.balance -= amount;
    }
    state.wallet.transactions.unshift({
      type: type, amount: amount, desc: desc, date: todayString()
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

    if (lastMonth === thisMonth) return; // Same month, no interest

    // Calculate months passed
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
          date: today
        });
      }
    }

    state.lastInterestDate = today;
    Storage.save(state);
  }

  function render() {
    var state = Storage.load();
    var balance = state.wallet.balance;
    var name = state.playerName || 'Friend';

    document.getElementById('bank-greeting').textContent = name + "'s Bank";
    document.getElementById('wallet-balance').textContent = formatMoney(balance);

    // Interest info
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
        return '<div class="transaction ' + cls + '">' +
          '<span class="tx-desc">' + t.desc + '</span>' +
          '<span class="tx-amount">' + sign + formatMoney(t.amount) + '</span>' +
          '<span class="tx-date">' + t.date + '</span>' +
          '</div>';
      }).join('');
    }

    // Wire up buttons
    document.getElementById('btn-deposit').onclick = function() {
      currentAction = 'deposit';
      showPinGate();
    };
    document.getElementById('btn-withdraw').onclick = function() {
      currentAction = 'withdraw';
      showPinGate();
    };
    document.getElementById('btn-wallet-cancel').onclick = function() {
      hideWalletForm();
    };
    document.getElementById('btn-wallet-confirm').onclick = function() {
      confirmTransaction();
    };
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

    addTransaction(currentAction, amount, desc);
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

  return {
    addTransaction: addTransaction,
    getBalance: getBalance,
    render: render,
    processInterest: processInterest
  };
})();
