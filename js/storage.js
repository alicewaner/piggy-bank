// ============================================================
// storage.js — localStorage + Firestore cloud sync
// ============================================================

var ACCOUNTS_KEY = 'piggybank_accounts';
var currentAccountId = null;

function getSaveKey() {
  return 'piggybank_save_' + currentAccountId;
}

// ---- Cloud Sync ----

var CloudSync = {
  _saveTimer: null,

  saveToCloud: function(state) {
    var user = auth.currentUser;
    if (!user) return;

    // Debounce: wait 500ms after last save to batch writes
    clearTimeout(CloudSync._saveTimer);
    CloudSync._saveTimer = setTimeout(function() {
      db.collection('users').doc(user.uid).set({
        gameState: state,
        profile: {
          name: state.playerName || '',
          balance: state.wallet ? state.wallet.balance : 0,
          animalCount: state.animals ? state.animals.filter(function(a) { return a.alive; }).length : 0
        },
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).catch(function(e) {
        console.error('Cloud save error:', e);
      });
    }, 500);
  },

  loadFromCloud: function() {
    var user = auth.currentUser;
    if (!user) return Promise.resolve(null);
    return db.collection('users').doc(user.uid).get().then(function(doc) {
      if (doc.exists && doc.data().gameState) {
        return doc.data().gameState;
      }
      return null;
    });
  },

  loadAllUsers: function() {
    return db.collection('users').get().then(function(snapshot) {
      var users = [];
      snapshot.forEach(function(doc) {
        var data = doc.data();
        if (data.gameState) {
          users.push({
            uid: doc.id,
            state: data.gameState,
            profile: data.profile || {}
          });
        }
      });
      return users;
    });
  }
};

// ---- Old account system (kept for backward compat) ----

var Storage = {
  loadAccounts: function() {
    try {
      var raw = localStorage.getItem(ACCOUNTS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to load accounts:', e);
    }
    return [];
  },

  saveAccounts: function(accounts) {
    try {
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch (e) {
      console.error('Failed to save accounts:', e);
    }
  },

  createAccount: function(name, pin) {
    var accounts = this.loadAccounts();
    var maxId = 0;
    accounts.forEach(function(a) {
      var num = parseInt(a.id.replace('acc_', ''));
      if (num > maxId) maxId = num;
    });
    var newAccount = {
      id: 'acc_' + (maxId + 1),
      name: name,
      pin: pin
    };
    accounts.push(newAccount);
    this.saveAccounts(accounts);
    return newAccount;
  },

  deleteAccount: function(id) {
    var accounts = this.loadAccounts();
    accounts = accounts.filter(function(a) { return a.id !== id; });
    this.saveAccounts(accounts);
    localStorage.removeItem('piggybank_save_' + id);
  },

  setCurrentAccount: function(id) {
    currentAccountId = id;
  },

  migrateOldSave: function() {
    var oldRaw = localStorage.getItem('piggybank_save');
    if (!oldRaw) return;

    var accounts = this.loadAccounts();
    if (accounts.length > 0) return;

    try {
      var oldState = JSON.parse(oldRaw);
      var name = oldState.playerName || 'Player';
      var account = {
        id: 'acc_1',
        name: name,
        pin: '1234'
      };
      accounts.push(account);
      this.saveAccounts(accounts);
      localStorage.setItem('piggybank_save_acc_1', oldRaw);
      localStorage.removeItem('piggybank_save');
    } catch (e) {
      console.error('Migration failed:', e);
    }
  },

  // ---- Per-account game state ----

  load: function() {
    try {
      var raw = localStorage.getItem(getSaveKey());
      if (raw) {
        var state = JSON.parse(raw);
        return this._migrate(state);
      }
    } catch (e) {
      console.error('Failed to load save:', e);
    }
    return null;
  },

  _migrate: function(state) {
    var defaults = createDefaultState();
    if (!state.inventory) state.inventory = defaults.inventory;
    if (!state.stats) state.stats = defaults.stats;
    if (state.nextAnimalId === undefined) state.nextAnimalId = defaults.nextAnimalId;
    if (state.quizStreak === undefined) state.quizStreak = 0;
    if (!state.playerName) state.playerName = '';
    if (!state.playerAge) state.playerAge = 8;
    if (state.playerBirthday === undefined) state.playerBirthday = '';
    if (!state.settings) state.settings = defaults.settings;
    if (!state.lastInterestDate) state.lastInterestDate = state.dailyState.lastDate || todayString();
    if (state.settings.tasksPerReward === undefined) state.settings.tasksPerReward = 3;
    if (state.settings.chatTimeLimitSeconds === undefined) state.settings.chatTimeLimitSeconds = 120;
    // Remove deprecated settings
    delete state.settings.dailyRewardCap;

    if (state.dailyState.quizMathCompleted === undefined) {
      state.dailyState.quizMathCompleted = state.dailyState.quizCompleted || false;
      state.dailyState.quizEncyclopediaCompleted = false;
      delete state.dailyState.quizCompleted;
    }
    // Migrate to task credits system
    if (state.dailyState.totalTaskCredits === undefined) state.dailyState.totalTaskCredits = 0;
    if (state.dailyState.waterUnlocked === undefined) state.dailyState.waterUnlocked = false;
    if (state.dailyState.foodUnlocked === undefined) state.dailyState.foodUnlocked = false;
    if (state.dailyState.chatSecondsUsed === undefined) state.dailyState.chatSecondsUsed = 0;
    // Remove deprecated daily fields
    delete state.dailyState.pointsEarned;
    delete state.dailyState.taskRewardsEarned;
    delete state.dailyState.quizRewardEarned;

    // Auto-categorize old transactions missing categories
    if (state.wallet && state.wallet.transactions) {
      state.wallet.transactions.forEach(function(t) {
        if (t.category) return;
        var d = (t.desc || '').toLowerCase();
        if (d.indexOf('sold ') === 0) t.category = 'Sell Animal';
        else if (d.indexOf('bought baby') !== -1) t.category = 'Buy Animal';
        else if (d.indexOf('interest') !== -1) t.category = 'Interest Income';
        else if (d.indexOf('welcome bonus') !== -1) t.category = 'Gift';
        else if (d.indexOf('task') !== -1) t.category = 'Task Reward';
        else if (d.indexOf('quiz') !== -1) t.category = 'Quiz Reward';
      });
    }

    if (state.settings.questionsPerQuiz === undefined) state.settings.questionsPerQuiz = 5;

    // Remove deprecated points from inventory
    delete state.inventory.points;

    // Animal feedCount + mood migration
    if (state.animals) {
      state.animals.forEach(function(a) {
        if (a.feedCount === undefined) a.feedCount = 0;
        if (a.mood === undefined) a.mood = 'happy';
      });
    }

    if (state.tasks && state.tasks.chores) {
      var tc = state.dailyState.tasksCompleted;
      var needed = state.tasks.chores.length;
      if (tc.length < needed) {
        for (var mi = tc.length; mi < needed; mi++) tc.push(false);
      } else if (tc.length > needed) {
        state.dailyState.tasksCompleted = tc.slice(0, needed);
      }
    }
    return state;
  },

  save: function(state) {
    try {
      localStorage.setItem(getSaveKey(), JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save:', e);
    }
    // Async cloud sync
    CloudSync.saveToCloud(state);
  },

  hasSave: function() {
    return localStorage.getItem(getSaveKey()) !== null;
  },

  reset: function() {
    localStorage.removeItem(getSaveKey());
    // Also delete from cloud
    var user = auth.currentUser;
    if (user) {
      db.collection('users').doc(user.uid).delete().catch(function(e) {
        console.error('Cloud delete error:', e);
      });
    }
  },

  init: function() {
    if (!this.hasSave()) {
      var state = createDefaultState();
      this.save(state);
      return state;
    }
    return this.load();
  }
};
