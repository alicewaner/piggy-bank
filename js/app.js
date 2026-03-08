// ============================================================
// app.js — Screen router, daily cycle, entry point
// ============================================================

const App = (() => {
  let currentScreen = 'welcome';

  function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById('screen-' + name);
    if (screen) {
      screen.classList.add('active');
      currentScreen = name;
    }

    // Update nav active state
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.screen === name);
    });

    // Refresh screen data
    switch (name) {
      case 'stable': Stable.render(); break;
      case 'market': Market.render(); break;
      case 'tasks': Tasks.render(); break;
      case 'wallet': Wallet.render(); break;
      case 'breeding': Breeding.render(); break;
      case 'parent': Parent.render(); break;
      case 'leaderboard': renderLeaderboard('total'); break;
    }
  }

  function dailyCycle() {
    const state = Storage.load();
    const today = todayString();
    if (state.dailyState.lastDate === today) return;

    const oldDate = state.dailyState.lastDate;
    const daysPassed = Math.max(1, dateDiffDays(oldDate, today));

    for (let d = 0; d < daysPassed; d++) {
      state.animals.forEach(animal => {
        if (!animal.alive) return;

        if (!animal.fedToday) {
          animal.daysWithoutFood++;
        } else {
          animal.daysWithoutFood = 0;
        }
        if (!animal.wateredToday) {
          animal.daysWithoutWater++;
        } else {
          animal.daysWithoutWater = 0;
        }

        if (animal.daysWithoutWater >= DEATH.daysWithoutWater ||
            animal.daysWithoutFood >= DEATH.daysWithoutFood) {
          animal.alive = false;
          showToast('Oh no! ' + (animal.name || ANIMAL_NAMES[animal.type].singular) + ' has passed away...');
          Sound.death();
        }

        animal.fedToday = false;
        animal.wateredToday = false;
        animal.parentVoteToday = false;
        animal.heartsToday = 0;
        animal.happyHeartToday = false;
        animal.happyHeartRemoved = false;
      });

      if (state.breedingPen.active && state.breedingPen.startDate) {
        const breedDays = dateDiffDays(state.breedingPen.startDate, today);
        if (breedDays >= 1) {
          const p1 = state.animals.find(a => a.id === state.breedingPen.parent1Id);
          const p2 = state.animals.find(a => a.id === state.breedingPen.parent2Id);
          if (p1 && p2) {
            const babyType = Math.random() < 0.5 ? p1.type : p2.type;
            const id = state.nextAnimalId++;
            state.animals.push({
              id, type: babyType, name: '', stage: 'baby',
              hearts: 0, isBred: true, alive: true,
              daysWithoutFood: 0, daysWithoutWater: 0,
              fedToday: false, wateredToday: false,
              parentVoteToday: false, heartsToday: 0,
              happyHeartToday: false, happyHeartRemoved: false,
              bornDate: today
            });
            showToast('A new baby ' + ANIMAL_NAMES[babyType].singular + ' was born from breeding!');
            Sound.baby();
          }
          state.breedingPen = { parent1Id: null, parent2Id: null, startDate: null, active: false };
        }
      }
    }

    state.dailyState = {
      lastDate: today,
      tasksCompleted: new Array(state.tasks.chores.length).fill(false),
      quizMathCompleted: false,
      quizEncyclopediaCompleted: false,
      foodEarned: 0,
      waterEarned: 0,
      taskRewardsEarned: 0,
      quizRewardEarned: false,
      parentVoteDone: false
    };

    state.stats.daysPlayed += daysPassed;
    Storage.save(state);
  }

  function dateDiffDays(dateStr1, dateStr2) {
    const d1 = new Date(dateStr1 + 'T00:00:00');
    const d2 = new Date(dateStr2 + 'T00:00:00');
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
  }

  function showToast(msg, duration) {
    duration = duration || 3000;
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function() { toast.classList.remove('show'); }, duration);
  }

  // Map age to starting quiz difficulty
  function ageToDifficulty(age) {
    if (age <= 6) return 1;
    if (age <= 7) return 1;
    if (age <= 8) return 2;
    if (age <= 9) return 3;
    if (age <= 10) return 3;
    if (age <= 11) return 4;
    return 5;
  }

  // ---- Account UI ----

  function renderAccountPicker() {
    var accounts = Storage.loadAccounts();
    var accountList = document.getElementById('account-list');
    var createForm = document.getElementById('create-account-form');
    var cancelBtn = document.getElementById('btn-cancel-create');

    if (accounts.length === 0) {
      // No accounts — show create form only
      accountList.style.display = 'none';
      createForm.style.display = '';
      cancelBtn.style.display = 'none';
    } else {
      // Show account cards
      accountList.style.display = '';
      createForm.style.display = 'none';
      renderAccountCards(accounts);
    }
  }

  function renderAccountCards(accounts) {
    var container = document.getElementById('account-cards');
    container.innerHTML = accounts.map(function(acc) {
      return '<div class="account-card" data-id="' + acc.id + '">' +
        '<button class="account-delete-btn" data-id="' + acc.id + '" title="Delete">&times;</button>' +
        '<div class="account-avatar">' + acc.name.charAt(0).toUpperCase() + '</div>' +
        '<div class="account-name">' + acc.name + '</div>' +
        '</div>';
    }).join('');

    // Card tap → PIN prompt
    container.querySelectorAll('.account-card').forEach(function(card) {
      card.addEventListener('click', function(e) {
        if (e.target.classList.contains('account-delete-btn')) return;
        Sound.click();
        var id = card.dataset.id;
        showPinModal(id, 'login');
      });
    });

    // Delete button → parent PIN required
    container.querySelectorAll('.account-delete-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        Sound.click();
        var id = btn.dataset.id;
        showPinModal(id, 'delete');
      });
    });
  }

  // PIN modal for login or delete
  var pinModalAction = null;
  var pinModalAccountId = null;

  function showPinModal(accountId, action) {
    pinModalAccountId = accountId;
    pinModalAction = action;

    var modal = document.getElementById('pin-modal');
    var title = document.getElementById('pin-modal-title');
    var input = document.getElementById('account-pin-input');
    var error = document.getElementById('account-pin-error');

    if (action === 'delete') {
      title.textContent = 'Parent PIN to Delete';
    } else {
      var accounts = Storage.loadAccounts();
      var acc = accounts.find(function(a) { return a.id === accountId; });
      title.textContent = 'PIN for ' + (acc ? acc.name : '');
    }

    input.value = '';
    error.style.display = 'none';
    modal.style.display = 'flex';
    input.focus();
  }

  function hidePinModal() {
    document.getElementById('pin-modal').style.display = 'none';
    pinModalAction = null;
    pinModalAccountId = null;
  }

  function handlePinSubmit() {
    var pin = document.getElementById('account-pin-input').value;
    var error = document.getElementById('account-pin-error');

    if (pinModalAction === 'login') {
      var accounts = Storage.loadAccounts();
      var acc = accounts.find(function(a) { return a.id === pinModalAccountId; });
      if (acc && pin === acc.pin) {
        Sound.click();
        hidePinModal();
        Storage.setCurrentAccount(acc.id);
        Storage.init();
        startGame();
      } else {
        error.style.display = '';
        Sound.wrong();
      }
    } else if (pinModalAction === 'delete') {
      // Need parent PIN — check from any account's save, or use default '1234'
      var parentPin = getParentPin();
      if (pin === parentPin) {
        Sound.click();
        var accName = '';
        var accounts = Storage.loadAccounts();
        var acc = accounts.find(function(a) { return a.id === pinModalAccountId; });
        if (acc) accName = acc.name;
        Storage.deleteAccount(pinModalAccountId);
        hidePinModal();
        showToast(accName + "'s account deleted.");
        renderAccountPicker();
      } else {
        error.style.display = '';
        Sound.wrong();
      }
    }
  }

  // Get parent PIN from any existing account save, fallback to '1234'
  function getParentPin() {
    var accounts = Storage.loadAccounts();
    for (var i = 0; i < accounts.length; i++) {
      try {
        var raw = localStorage.getItem('piggybank_save_' + accounts[i].id);
        if (raw) {
          var state = JSON.parse(raw);
          if (state.parentPassword) return state.parentPassword;
        }
      } catch (e) {}
    }
    return '1234';
  }

  function init() {
    // Migrate old single-save if needed
    Storage.migrateOldSave();

    // Render account picker or create form
    renderAccountPicker();

    // Create account button
    document.getElementById('btn-create-account').addEventListener('click', function() {
      Sound.click();
      var name = document.getElementById('player-name').value.trim();
      var age = parseInt(document.getElementById('player-age').value) || 8;
      var pin = document.getElementById('new-account-pin').value.trim();

      if (!name) {
        showToast('Please enter your name!');
        return;
      }
      if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        showToast('PIN must be 4 digits!');
        return;
      }

      var account = Storage.createAccount(name, pin);
      Storage.setCurrentAccount(account.id);

      var state = Storage.init();
      state.playerName = name;
      state.playerAge = age;
      state.quizDifficulty = ageToDifficulty(age);
      Storage.save(state);

      // Clear form
      document.getElementById('player-name').value = '';
      document.getElementById('new-account-pin').value = '';

      startGame();
    });

    // "+ New Account" button
    document.getElementById('btn-new-account').addEventListener('click', function() {
      Sound.click();
      document.getElementById('account-list').style.display = 'none';
      document.getElementById('create-account-form').style.display = '';
      document.getElementById('btn-cancel-create').style.display = '';
    });

    // Cancel create → back to picker
    document.getElementById('btn-cancel-create').addEventListener('click', function() {
      Sound.click();
      renderAccountPicker();
    });

    // PIN modal buttons
    document.getElementById('btn-pin-ok').addEventListener('click', function() {
      handlePinSubmit();
    });
    document.getElementById('pin-modal-close').addEventListener('click', function() {
      hidePinModal();
    });
    document.getElementById('pin-modal').addEventListener('click', function(e) {
      if (e.target.id === 'pin-modal') hidePinModal();
    });
    // Enter key in PIN input
    document.getElementById('account-pin-input').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') handlePinSubmit();
    });

    // Nav bar
    document.querySelectorAll('.nav-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        Sound.click();
        showScreen(btn.dataset.screen);
      });
    });

    // More menu items (skip logout, it has its own handler)
    document.querySelectorAll('.more-item').forEach(function(btn) {
      if (btn.id === 'btn-logout') return;
      btn.addEventListener('click', function() {
        Sound.click();
        showScreen(btn.dataset.screen);
      });
    });

    // Log out button
    document.getElementById('btn-logout').addEventListener('click', function() {
      Sound.click();
      logout();
    });

    // Modal close — X button, tap outside, Done button
    document.getElementById('modal-close').addEventListener('click', function() {
      document.getElementById('animal-modal').style.display = 'none';
    });
    document.getElementById('animal-modal').addEventListener('click', function(e) {
      if (e.target.id === 'animal-modal') {
        document.getElementById('animal-modal').style.display = 'none';
      }
    });
    document.getElementById('btn-modal-done').addEventListener('click', function() {
      document.getElementById('animal-modal').style.display = 'none';
    });
  }

  function trackLogin() {
    try {
      var usage = JSON.parse(localStorage.getItem('piggybank_usage') || '{}');
      var accId = currentAccountId;
      if (!accId) return;
      var accounts = Storage.loadAccounts();
      var acc = accounts.find(function(a) { return a.id === accId; });
      var name = acc ? acc.name : accId;
      var now = new Date().toISOString();
      var today = todayString();

      if (!usage[accId]) {
        usage[accId] = { name: name, totalLogins: 0, loginTimestamps: [], daysActive: [], lastLogin: null };
      }
      var u = usage[accId];
      u.name = name;
      u.totalLogins++;
      u.loginTimestamps.push(now);
      if (u.loginTimestamps.length > 100) u.loginTimestamps = u.loginTimestamps.slice(-100);
      if (u.daysActive.indexOf(today) === -1) u.daysActive.push(today);
      u.lastLogin = now;
      localStorage.setItem('piggybank_usage', JSON.stringify(usage));
    } catch (e) {
      console.error('Usage tracking error:', e);
    }
  }

  function renderLeaderboard(sortBy) {
    sortBy = sortBy || 'total';
    var accounts = Storage.loadAccounts();
    var entries = [];

    accounts.forEach(function(acc) {
      try {
        var raw = localStorage.getItem('piggybank_save_' + acc.id);
        if (!raw) return;
        var state = JSON.parse(raw);
        var bank = state.wallet ? state.wallet.balance : 0;
        var animalValue = 0;
        if (state.animals) {
          state.animals.forEach(function(a) {
            if (!a.alive) return;
            var buyPrice = (state.settings && state.settings.buyBabyPrice) || 500;
            var sellPrice = (state.settings && state.settings.sellAdultPrice) || 1000;
            var maxH = HEARTS.maxHearts;
            var val = buyPrice + (sellPrice - buyPrice) * (a.hearts / maxH);
            animalValue += Math.round(val);
          });
        }
        entries.push({
          name: acc.name,
          bank: bank,
          animals: animalValue,
          total: bank + animalValue,
          animalCount: state.animals ? state.animals.filter(function(a) { return a.alive; }).length : 0
        });
      } catch (e) {}
    });

    entries.sort(function(a, b) { return b[sortBy] - a[sortBy]; });

    var container = document.getElementById('leaderboard-list');
    if (!container) return;

    // Sort toggle buttons
    var toggleHtml = '<div class="leaderboard-sort">' +
      '<button class="btn btn-small ' + (sortBy === 'total' ? 'btn-accent' : 'btn-secondary') + '" data-sort="total">Total</button>' +
      '<button class="btn btn-small ' + (sortBy === 'bank' ? 'btn-accent' : 'btn-secondary') + '" data-sort="bank">Bank</button>' +
      '<button class="btn btn-small ' + (sortBy === 'animals' ? 'btn-accent' : 'btn-secondary') + '" data-sort="animals">Animals</button>' +
      '</div>';

    var rowsHtml = entries.map(function(e, i) {
      var rankClass = i === 0 ? 'rank-gold' : (i === 1 ? 'rank-silver' : (i === 2 ? 'rank-bronze' : ''));
      return '<div class="leaderboard-row ' + rankClass + '">' +
        '<span class="lb-rank">#' + (i + 1) + '</span>' +
        '<span class="lb-name">' + e.name + '</span>' +
        '<span class="lb-stats">' +
          '<span class="lb-total">' + formatMoney(e.total) + '</span>' +
          '<span class="lb-detail">Bank: ' + formatMoney(e.bank) + '</span>' +
          '<span class="lb-detail">Animals: ' + formatMoney(e.animals) + ' (' + e.animalCount + ')</span>' +
        '</span>' +
      '</div>';
    }).join('');

    if (entries.length === 0) {
      rowsHtml = '<p class="empty-msg">No players yet.</p>';
    }

    container.innerHTML = toggleHtml + rowsHtml;

    container.querySelectorAll('.leaderboard-sort button').forEach(function(btn) {
      btn.addEventListener('click', function() {
        Sound.click();
        renderLeaderboard(btn.dataset.sort);
      });
    });
  }

  function startGame() {
    dailyCycle();
    trackLogin();
    Wallet.processInterest();
    document.getElementById('bottom-nav').style.display = '';
    showScreen('stable');
  }

  function logout() {
    currentAccountId = null;
    document.getElementById('bottom-nav').style.display = 'none';
    showScreen('welcome');
    renderAccountPicker();
  }

  return { init: init, showScreen: showScreen, showToast: showToast, dailyCycle: dailyCycle, logout: logout };
})();

// Boot
document.addEventListener('DOMContentLoaded', App.init);
