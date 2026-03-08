// ============================================================
// parent.js — Parent mode: PIN gate, edit chores, prices,
//   interest rate, task rewards, remove happy hearts, progress
// ============================================================

var Parent = (function() {
  var authenticated = false;

  function render() {
    var pinSection = document.getElementById('parent-pin');
    var dashboard = document.getElementById('parent-dashboard');

    if (!authenticated) {
      pinSection.style.display = '';
      dashboard.style.display = 'none';
      document.getElementById('pin-input').value = '';
      document.getElementById('pin-error').style.display = 'none';

      document.getElementById('btn-pin-submit').onclick = function() {
        var state = Storage.load();
        var pin = document.getElementById('pin-input').value;
        if (pin === state.parentPassword) {
          authenticated = true;
          Sound.click();
          render();
        } else {
          document.getElementById('pin-error').style.display = '';
          Sound.wrong();
        }
      };
      return;
    }

    pinSection.style.display = 'none';
    dashboard.style.display = '';

    renderChoreEditor();
    renderSettingsEditor();
    renderAnimalHearts();
    renderProgressDashboard();
    setupParentButtons();
  }

  function renderChoreEditor() {
    var state = Storage.load();
    var editor = document.getElementById('chore-editor');
    editor.innerHTML = state.tasks.chores.map(function(chore, i) {
      return '<div class="chore-edit-row">' +
        '<label>Chore ' + (i + 1) + ':</label>' +
        '<input type="text" class="chore-input" data-index="' + i + '" value="' + chore + '" maxlength="50">' +
        '</div>';
    }).join('');

    document.getElementById('btn-save-chores').onclick = function() {
      var s = Storage.load();
      document.querySelectorAll('.chore-input').forEach(function(input) {
        var idx = parseInt(input.dataset.index);
        var val = input.value.trim();
        if (val) s.tasks.chores[idx] = val;
      });
      Storage.save(s);
      Sound.click();
      App.showToast('Chores updated!');
    };
  }

  function renderSettingsEditor() {
    var state = Storage.load();
    var s = state.settings;

    document.getElementById('setting-interest').value = s.interestRate;
    document.getElementById('setting-buy-price').value = (s.buyBabyPrice / 100).toFixed(2);
    document.getElementById('setting-sell-price').value = (s.sellAdultPrice / 100).toFixed(2);
    document.getElementById('setting-food-reward').value = s.taskFoodReward;
    document.getElementById('setting-water-reward').value = s.taskWaterReward;

    document.getElementById('btn-save-settings').onclick = function() {
      var st = Storage.load();
      st.settings.interestRate = parseFloat(document.getElementById('setting-interest').value) || 0;
      st.settings.buyBabyPrice = Math.round(parseFloat(document.getElementById('setting-buy-price').value) * 100) || 500;
      st.settings.sellAdultPrice = Math.round(parseFloat(document.getElementById('setting-sell-price').value) * 100) || 1000;
      st.settings.taskFoodReward = parseInt(document.getElementById('setting-food-reward').value) || 2;
      st.settings.taskWaterReward = parseInt(document.getElementById('setting-water-reward').value) || 2;
      Storage.save(st);
      Sound.click();
      App.showToast('Settings saved!');
    };
  }

  function renderAnimalHearts() {
    var state = Storage.load();
    var container = document.getElementById('parent-animals');
    var alive = state.animals.filter(function(a) { return a.alive; });

    if (alive.length === 0) {
      container.innerHTML = '<p class="empty-msg">No animals.</p>';
      return;
    }

    container.innerHTML = alive.map(function(a) {
      var name = a.name || ANIMAL_NAMES[a.type].singular;
      var hasHappy = a.happyHeartToday && !a.happyHeartRemoved;
      var btnText = hasHappy ? 'Remove Happy Heart' : (a.happyHeartRemoved ? 'Already removed' : 'No happy heart yet');
      var canRemove = hasHappy;

      return '<div class="parent-animal-row">' +
        '<div class="pixel-art ' + a.type + '-' + a.stage + '"></div>' +
        '<span>' + name + ' (' + a.hearts + '/' + HEARTS.maxHearts + ')' +
        (a.fedToday ? ' Fed' : '') + (a.wateredToday ? ' Water' : '') + '</span>' +
        '<button class="btn btn-small ' + (canRemove ? 'btn-danger' : 'btn-secondary') + '" ' +
        'data-id="' + a.id + '"' + (canRemove ? '' : ' disabled') + '>' +
        btnText + '</button></div>';
    }).join('');

    container.querySelectorAll('button[data-id]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = parseInt(btn.dataset.id);
        Stable.removeHappyHeart(id);
        Sound.wrong();
        App.showToast('Happy heart removed.');
        renderAnimalHearts();
      });
    });
  }

  function renderProgressDashboard() {
    var state = Storage.load();
    var alive = state.animals.filter(function(a) { return a.alive; });
    var adults = alive.filter(function(a) { return a.stage === 'adult'; });
    var choresDone = state.dailyState.tasksCompleted.filter(Boolean).length;

    var dash = document.getElementById('progress-dashboard');
    dash.innerHTML =
      '<div class="progress-grid">' +
      '<div class="progress-stat"><div class="stat-value">' + state.stats.daysPlayed + '</div><div class="stat-label">Days Played</div></div>' +
      '<div class="progress-stat"><div class="stat-value">' + alive.length + '</div><div class="stat-label">Animals</div></div>' +
      '<div class="progress-stat"><div class="stat-value">' + adults.length + '</div><div class="stat-label">Adults</div></div>' +
      '<div class="progress-stat"><div class="stat-value">' + formatMoney(state.wallet.balance) + '</div><div class="stat-label">Balance</div></div>' +
      '<div class="progress-stat"><div class="stat-value">' + state.stats.totalAnimalsRaised + '</div><div class="stat-label">Raised</div></div>' +
      '<div class="progress-stat"><div class="stat-value">' + state.stats.totalQuizzesTaken + '</div><div class="stat-label">Quizzes</div></div>' +
      '<div class="progress-stat"><div class="stat-value">' + choresDone + '/4</div><div class="stat-label">Chores Today</div></div>' +
      '<div class="progress-stat"><div class="stat-value">Lvl ' + state.quizDifficulty + '</div><div class="stat-label">Quiz Level</div></div>' +
      '</div>';
  }

  function setupParentButtons() {
    document.getElementById('btn-change-pin').onclick = function() {
      var newPin = document.getElementById('new-pin').value.trim();
      if (newPin.length < 1) {
        App.showToast('Enter a new PIN.');
        return;
      }
      var state = Storage.load();
      state.parentPassword = newPin;
      Storage.save(state);
      Sound.click();
      App.showToast('PIN changed!');
      document.getElementById('new-pin').value = '';
    };

    document.getElementById('btn-reset-game').onclick = function() {
      if (confirm('Reset this account? This cannot be undone!')) {
        Storage.reset();
        Storage.init();
        authenticated = false;
        Sound.click();
        App.showToast('Game reset!');
        App.logout();
      }
    };

    document.getElementById('btn-parent-logout').onclick = function() {
      authenticated = false;
      Sound.click();
      render();
    };
  }

  return { render: render };
})();
