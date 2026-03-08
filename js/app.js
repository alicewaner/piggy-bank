// ============================================================
// app.js — Screen router, daily cycle, Firebase auth entry point
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

  function ageToDifficulty(age) {
    if (age <= 6) return 1;
    if (age <= 7) return 1;
    if (age <= 8) return 2;
    if (age <= 9) return 3;
    if (age <= 10) return 3;
    if (age <= 11) return 4;
    return 5;
  }

  // ---- Firebase Auth UI ----

  function showLoginForm() {
    document.getElementById('auth-loading').style.display = 'none';
    document.getElementById('login-form').style.display = '';
    document.getElementById('register-form').style.display = 'none';
  }

  function showRegisterForm() {
    document.getElementById('auth-loading').style.display = 'none';
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = '';
  }

  function setAuthError(formId, msg) {
    var el = document.getElementById(formId);
    el.textContent = msg;
    el.style.display = msg ? '' : 'none';
  }

  function firebaseErrorMsg(code) {
    switch (code) {
      case 'auth/invalid-email': return 'Invalid email address.';
      case 'auth/user-not-found': return 'No account with this email.';
      case 'auth/wrong-password': return 'Wrong password.';
      case 'auth/invalid-credential': return 'Wrong email or password.';
      case 'auth/email-already-in-use': return 'Email already registered.';
      case 'auth/weak-password': return 'Password must be 6+ characters.';
      case 'auth/too-many-requests': return 'Too many attempts. Try later.';
      default: return 'Login failed. Please try again.';
    }
  }

  function handleLogin() {
    var email = document.getElementById('login-email').value.trim();
    var password = document.getElementById('login-password').value;
    setAuthError('login-error', '');

    if (!email || !password) {
      setAuthError('login-error', 'Please enter email and password.');
      return;
    }

    auth.signInWithEmailAndPassword(email, password)
      .then(function() {
        // onAuthStateChanged will handle the rest
      })
      .catch(function(error) {
        setAuthError('login-error', firebaseErrorMsg(error.code));
        Sound.wrong();
      });
  }

  function handleRegister() {
    var name = document.getElementById('register-name').value.trim();
    var age = parseInt(document.getElementById('register-age').value) || 8;
    var email = document.getElementById('register-email').value.trim();
    var password = document.getElementById('register-password').value;
    setAuthError('register-error', '');

    if (!name) {
      setAuthError('register-error', 'Please enter your name.');
      return;
    }
    if (!email || !password) {
      setAuthError('register-error', 'Please enter email and password.');
      return;
    }

    auth.createUserWithEmailAndPassword(email, password)
      .then(function(cred) {
        // Set display name
        return cred.user.updateProfile({ displayName: name }).then(function() {
          // Set up account
          Storage.setCurrentAccount(cred.user.uid);
          var state = createDefaultState();
          state.playerName = name;
          state.playerAge = age;
          state.quizDifficulty = ageToDifficulty(age);
          Storage.save(state);
          // onAuthStateChanged will start the game
        });
      })
      .catch(function(error) {
        setAuthError('register-error', firebaseErrorMsg(error.code));
        Sound.wrong();
      });
  }

  // ---- Usage tracking ----

  function trackLogin() {
    try {
      var usage = JSON.parse(localStorage.getItem('piggybank_usage') || '{}');
      var accId = currentAccountId;
      if (!accId) return;
      var user = auth.currentUser;
      var name = user && user.displayName ? user.displayName : accId;
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

  // ---- Leaderboard (reads from Firestore) ----

  function renderLeaderboard(sortBy) {
    sortBy = sortBy || 'total';
    var container = document.getElementById('leaderboard-list');
    if (!container) return;

    container.innerHTML = '<p class="empty-msg">Loading...</p>';

    CloudSync.loadAllUsers().then(function(users) {
      var entries = [];
      users.forEach(function(u) {
        var state = u.state;
        var bank = state.wallet ? state.wallet.balance : 0;
        var animalValue = 0;
        var animalCount = 0;
        if (state.animals) {
          state.animals.forEach(function(a) {
            if (!a.alive) return;
            animalCount++;
            var buyPrice = (state.settings && state.settings.buyBabyPrice) || 500;
            var sellPrice = (state.settings && state.settings.sellAdultPrice) || 1000;
            var maxH = HEARTS.maxHearts;
            var val = buyPrice + (sellPrice - buyPrice) * (a.hearts / maxH);
            animalValue += Math.round(val);
          });
        }
        entries.push({
          name: state.playerName || u.profile.name || 'Player',
          bank: bank,
          animals: animalValue,
          total: bank + animalValue,
          animalCount: animalCount
        });
      });

      entries.sort(function(a, b) { return b[sortBy] - a[sortBy]; });

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
    }).catch(function(err) {
      console.error('Leaderboard error:', err);
      container.innerHTML = '<p class="empty-msg">Could not load leaderboard.</p>';
    });
  }

  // ---- Game lifecycle ----

  function startGame() {
    dailyCycle();
    trackLogin();
    Wallet.processInterest();
    document.getElementById('bottom-nav').style.display = '';
    showScreen('stable');
  }

  function logout() {
    auth.signOut().then(function() {
      currentAccountId = null;
      document.getElementById('bottom-nav').style.display = 'none';
      showScreen('welcome');
      showLoginForm();
    });
  }

  // ---- Init ----

  function init() {
    // Nav bar
    document.querySelectorAll('.nav-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        Sound.click();
        showScreen(btn.dataset.screen);
      });
    });

    // More menu items (skip logout)
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

    // Modal close
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

    // ---- Firebase Auth buttons ----
    document.getElementById('btn-login').addEventListener('click', handleLogin);
    document.getElementById('btn-show-register').addEventListener('click', function() {
      Sound.click();
      showRegisterForm();
    });
    document.getElementById('btn-register').addEventListener('click', handleRegister);
    document.getElementById('btn-show-login').addEventListener('click', function() {
      Sound.click();
      showLoginForm();
    });

    // Enter key on login/register forms
    document.getElementById('login-password').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('register-password').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') handleRegister();
    });

    // ---- Firebase Auth state listener ----
    auth.onAuthStateChanged(function(user) {
      if (user) {
        // User is signed in — load cloud data and start game
        Storage.setCurrentAccount(user.uid);
        CloudSync.loadFromCloud().then(function(cloudState) {
          if (cloudState) {
            // Cloud data exists — use it (apply migrations)
            var migrated = Storage._migrate(cloudState);
            localStorage.setItem(getSaveKey(), JSON.stringify(migrated));
          }
          // Init from localStorage (either cloud-synced or fresh)
          Storage.init();
          startGame();
        }).catch(function(err) {
          console.error('Cloud load error, using local:', err);
          Storage.init();
          startGame();
        });
      } else {
        // Not signed in — show login form
        showLoginForm();
      }
    });
  }

  return { init: init, showScreen: showScreen, showToast: showToast, dailyCycle: dailyCycle, logout: logout };
})();

// Boot
document.addEventListener('DOMContentLoaded', App.init);
