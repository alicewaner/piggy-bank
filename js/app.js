// ============================================================
// app.js — Screen router, daily cycle, Firebase auth entry point
// ============================================================

const App = (() => {
  let currentScreen = 'welcome';

  function showScreen(name) {
    // Stop chat timer when leaving chat
    if (currentScreen === 'chat' && name !== 'chat') {
      Chat.stopChatTimer();
    }

    // Check chat quota before showing chat
    if (name === 'chat' && !Chat.checkQuota()) {
      App.showToast('Chat time is up for today!');
      return;
    }

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById('screen-' + name);
    if (screen) {
      screen.classList.add('active');
      currentScreen = name;
    }

    // Scroll to top on screen change
    window.scrollTo(0, 0);

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
      case 'chat': Chat.render(); break;
      case 'friends': Friends.render(); break;
      case 'friend-stable': break;
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

        // Runaway: ZERO feeding (no water AND no food) for 2 consecutive days
        if (animal.daysWithoutWater >= RUNAWAY.daysNeglected &&
            animal.daysWithoutFood >= RUNAWAY.daysNeglected) {
          animal.alive = false;
          animal.ranAway = true;
          var aName = animal.name || ANIMAL_NAMES[animal.type].singular;
          showToast('Oh no! ' + aName + ' ran away!');
          Sound.wrong();
          Stable.sendAnimalAway(animal, state);
        }

        animal.fedToday = false;
        animal.wateredToday = false;
        animal.parentVoteToday = false;
        animal.heartsToday = 0;
        animal.happyHeartToday = false;
        animal.happyHeartRemoved = false;
        animal.feedCount = 0;
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
              feedCount: 0, mood: 'happy',
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
      totalTaskCredits: 0,
      waterUnlocked: false,
      foodUnlocked: false,
      chatSecondsUsed: 0,
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

  function birthdayToAge(birthday) {
    if (!birthday) return 8;
    var parts = birthday.split('-');
    var bYear = parseInt(parts[0]);
    var bMonth = parseInt(parts[1]);
    var bDay = parseInt(parts[2]);
    var now = new Date();
    var age = now.getFullYear() - bYear;
    var mDiff = (now.getMonth() + 1) - bMonth;
    if (mDiff < 0 || (mDiff === 0 && now.getDate() < bDay)) {
      age--;
    }
    return Math.max(4, Math.min(age, 18));
  }

  function updateAgeFromBirthday() {
    var state = Storage.load();
    if (state.playerBirthday) {
      var age = birthdayToAge(state.playerBirthday);
      if (age !== state.playerAge) {
        state.playerAge = age;
        state.quizDifficulty = ageToDifficulty(age);
        Storage.save(state);
      }
    }
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

  function handleForgotPassword() {
    var email = document.getElementById('login-email').value.trim();
    setAuthError('login-error', '');
    if (!email) {
      setAuthError('login-error', 'Enter your email above, then tap Forgot Password.');
      return;
    }
    auth.sendPasswordResetEmail(email)
      .then(function() {
        App.showToast('Password reset email sent!');
        setAuthError('login-error', '');
      })
      .catch(function(error) {
        setAuthError('login-error', firebaseErrorMsg(error.code));
      });
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
    var birthday = document.getElementById('register-birthday').value;
    var email = document.getElementById('register-email').value.trim();
    var password = document.getElementById('register-password').value;
    setAuthError('register-error', '');

    if (!name) {
      setAuthError('register-error', 'Please enter your name.');
      return;
    }
    if (!birthday) {
      setAuthError('register-error', 'Please enter your birthday.');
      return;
    }
    if (!email || !password) {
      setAuthError('register-error', 'Please enter email and password.');
      return;
    }

    var age = birthdayToAge(birthday);
    var currency = document.getElementById('register-currency').value || 'CAD';

    auth.createUserWithEmailAndPassword(email, password)
      .then(function(cred) {
        // Set display name
        return cred.user.updateProfile({ displayName: name }).then(function() {
          // Set up account
          Storage.setCurrentAccount(cred.user.uid);
          var state = createDefaultState();
          state.playerName = name;
          state.playerBirthday = birthday;
          state.playerAge = age;
          state.quizDifficulty = ageToDifficulty(age);
          state.localCurrency = currency;
          Storage.save(state);
          // onAuthStateChanged will start the game
        });
      })
      .catch(function(error) {
        setAuthError('register-error', firebaseErrorMsg(error.code));
        Sound.wrong();
      });
  }

  function handleGoogleLogin() {
    var provider = new firebase.auth.GoogleAuthProvider();
    setAuthError('login-error', '');

    auth.signInWithPopup(provider)
      .then(function(result) {
        // If this is a brand new Google user (no Firestore data yet),
        // onAuthStateChanged will handle creating default state
      })
      .catch(function(error) {
        setAuthError('login-error', error.message);
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

    // Viewer's currency for leaderboard conversion
    var myState = Storage.load();
    var myCurrency = (myState && myState.localCurrency) || 'CAD';

    CloudSync.loadAllUsers().then(function(users) {
      var entries = [];
      users.forEach(function(u) {
        var state = u.state;
        var theirCurrency = (state.localCurrency) || 'CAD';
        var rate = (state.settings && state.settings.exchangeRate) || 1;
        var bankLocal = state.wallet ? state.wallet.balance : 0;
        var bank = convertCurrency(bankLocal, theirCurrency, myCurrency);
        var pcInTheirCurrency = Math.round((state.piggyCoins || 0) / rate);
        var pcValue = convertCurrency(pcInTheirCurrency, theirCurrency, myCurrency);
        var animalValueLocal = 0;
        var animalCount = 0;
        if (state.animals) {
          state.animals.forEach(function(a) {
            if (!a.alive) return;
            animalCount++;
            var buyPrice = (state.settings && state.settings.buyBabyPrice) || 500;
            var sellPrice = (state.settings && state.settings.sellAdultPrice) || 1000;
            var maxH = HEARTS.maxHearts;
            var val = buyPrice + (sellPrice - buyPrice) * (a.hearts / maxH);
            animalValueLocal += Math.round(val / rate);
          });
        }
        var animalValue = convertCurrency(animalValueLocal, theirCurrency, myCurrency);
        entries.push({
          uid: u.uid,
          name: state.playerName || u.profile.name || 'Player',
          bank: bank,
          animals: animalValue,
          total: bank + pcValue + animalValue,
          animalCount: animalCount,
          pc: pcValue
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
        var mainValue = sortBy === 'bank' ? e.bank : (sortBy === 'animals' ? e.animals : e.total);
        var details = '';
        if (sortBy === 'total') {
          details = '<span class="lb-detail">Bank: ' + formatMoney(e.bank) + '</span>' +
            '<span class="lb-detail">Animals: ' + formatMoney(e.animals) + ' (' + e.animalCount + ')</span>';
        } else if (sortBy === 'bank') {
          details = '<span class="lb-detail">Total: ' + formatMoney(e.total) + '</span>' +
            '<span class="lb-detail">Animals: ' + formatMoney(e.animals) + ' (' + e.animalCount + ')</span>';
        } else {
          details = '<span class="lb-detail">Total: ' + formatMoney(e.total) + '</span>' +
            '<span class="lb-detail">Bank: ' + formatMoney(e.bank) + '</span>';
        }
        return '<div class="leaderboard-row ' + rankClass + '" data-uid="' + e.uid + '" data-name="' + e.name + '">' +
          '<span class="lb-rank">#' + (i + 1) + '</span>' +
          '<span class="lb-name">' + e.name + '</span>' +
          '<span class="lb-stats">' +
            '<span class="lb-total">' + formatMoney(mainValue) + '</span>' +
            details +
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

      var me = auth.currentUser;
      container.querySelectorAll('.leaderboard-row').forEach(function(row) {
        if (!row.dataset.uid || (me && row.dataset.uid === me.uid)) return;
        row.style.cursor = 'pointer';
        row.addEventListener('click', function() {
          Sound.click();
          Friends.sendRequest(row.dataset.uid, row.dataset.name);
        });
      });
    }).catch(function(err) {
      console.error('Leaderboard error:', err);
      container.innerHTML = '<p class="empty-msg">Could not load leaderboard.</p>';
    });
  }

  // ---- Game lifecycle ----

  function promptBirthdayIfMissing() {
    var state = Storage.load();
    if (state.playerBirthday) return;

    var modal = document.getElementById('birthday-modal');
    modal.style.display = 'flex';

    document.getElementById('btn-birthday-save').onclick = function() {
      var val = document.getElementById('birthday-prompt-input').value;
      if (!val) {
        App.showToast('Please pick your birthday!');
        return;
      }
      var s = Storage.load();
      s.playerBirthday = val;
      s.playerAge = birthdayToAge(val);
      s.quizDifficulty = ageToDifficulty(s.playerAge);
      Storage.save(s);
      modal.style.display = 'none';
      Sound.click();
      App.showToast('Birthday saved!');
    };
  }

  function startGame() {
    dailyCycle();
    updateAgeFromBirthday();
    // Set global currency symbol
    var st = Storage.load();
    var cur = st.localCurrency || 'CAD';
    currentCurrencySymbol = FX_RATES[cur] ? FX_RATES[cur].symbol : 'CA$';
    // Force cloud sync to ensure profile.email is up to date
    CloudSync.saveToCloud(st);
    promptBirthdayIfMissing();
    trackLogin();
    Wallet.processInterest();
    Chat.initListeners();
    Friends.initListeners();
    document.getElementById('bottom-nav').style.display = '';
    showScreen('stable');
  }

  function logout() {
    Chat.cleanup();
    Friends.cleanup();
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
    document.getElementById('btn-google-login').addEventListener('click', handleGoogleLogin);
    document.getElementById('btn-forgot-password').addEventListener('click', function() {
      handleForgotPassword();
    });
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
          var state = Storage.init();
          // For Google sign-in users: fill name from Google profile if empty
          if (!state.playerName && user.displayName) {
            state.playerName = user.displayName;
            Storage.save(state);
          }
          startGame();
        }).catch(function(err) {
          console.error('Cloud load error, using local:', err);
          var state = Storage.init();
          if (!state.playerName && user.displayName) {
            state.playerName = user.displayName;
            Storage.save(state);
          }
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
document.addEventListener('DOMContentLoaded', function() {
  window.scrollTo(0, 0);
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  App.init();
});
