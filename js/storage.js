// ============================================================
// storage.js — localStorage save/load/reset + multi-account
// ============================================================

var ACCOUNTS_KEY = 'piggybank_accounts';
var currentAccountId = null;

function getSaveKey() {
  return 'piggybank_save_' + currentAccountId;
}

var Storage = {
  // ---- Account Management ----

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
    // Only migrate if no accounts exist yet
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
        var defaults = createDefaultState();
        // Migrate missing fields
        if (!state.inventory) state.inventory = defaults.inventory;
        if (!state.stats) state.stats = defaults.stats;
        if (state.nextAnimalId === undefined) state.nextAnimalId = defaults.nextAnimalId;
        if (state.quizStreak === undefined) state.quizStreak = 0;
        if (!state.playerName) state.playerName = '';
        if (!state.playerAge) state.playerAge = 8;
        if (!state.settings) state.settings = defaults.settings;
        if (!state.lastInterestDate) state.lastInterestDate = state.dailyState.lastDate || todayString();
        if (state.settings.taskFoodReward === undefined) state.settings.taskFoodReward = 2;
        if (state.settings.taskWaterReward === undefined) state.settings.taskWaterReward = 2;
        return state;
      }
    } catch (e) {
      console.error('Failed to load save:', e);
    }
    return null;
  },

  save: function(state) {
    try {
      localStorage.setItem(getSaveKey(), JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save:', e);
    }
  },

  hasSave: function() {
    return localStorage.getItem(getSaveKey()) !== null;
  },

  reset: function() {
    localStorage.removeItem(getSaveKey());
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
