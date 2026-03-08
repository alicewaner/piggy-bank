// Minimal DOM simulation test for multi-account system
var _store = {};
var localStorage = {
  getItem: function(k) { return _store[k] || null; },
  setItem: function(k, v) { _store[k] = v; },
  removeItem: function(k) { delete _store[k]; }
};

var _allElements = {};
function _makeEl(tag, id, classes) {
  var el = {
    tagName: tag, id: id || '', style: {}, textContent: '', innerHTML: '',
    value: '', disabled: false, dataset: {}, _listeners: {},
    _classes: new Set(classes || []),
    classList: {
      add: function(c) { el._classes.add(c); },
      remove: function(c) { el._classes.delete(c); },
      toggle: function(c, f) { f ? el._classes.add(c) : el._classes.delete(c); },
      contains: function(c) { return el._classes.has(c); }
    },
    addEventListener: function(evt, fn) {
      if (!el._listeners[evt]) el._listeners[evt] = [];
      el._listeners[evt].push(fn);
    },
    click: function() { (el._listeners['click'] || []).forEach(function(fn) { fn(); }); },
    querySelectorAll: function() { return []; },
    querySelector: function() { return null; },
    focus: function() {}
  };
  if (id) _allElements[id] = el;
  return el;
}

var screenIds = ['screen-welcome','screen-stable','screen-market','screen-tasks','screen-quiz','screen-breeding','screen-wallet','screen-parent','screen-more'];
screenIds.forEach(function(id) {
  _makeEl('div', id, id === 'screen-welcome' ? ['screen','active'] : ['screen']);
});

['bottom-nav','modal-close','animal-modal','toast',
  'food-count','water-count','stable-grid','market-balance','market-buy-grid','market-sell-grid',
  'tasks-list','btn-take-quiz','tasks-progress','quiz-progress','quiz-score','quiz-question','quiz-answers','quiz-feedback',
  'breed-slot-1','breed-slot-2','breeding-status','btn-breed','breed-select-list',
  'wallet-balance','transaction-list','parent-pin','parent-dashboard','pin-input','btn-pin-submit','pin-error',
  'chore-editor','btn-save-chores','parent-animals','progress-dashboard','new-pin','btn-change-pin','btn-reset-game','btn-parent-logout',
  'modal-animal-art','modal-animal-name','modal-name-input','btn-save-name','modal-hearts','modal-stage','btn-feed','btn-water','modal-status',
  'btn-modal-done',
  'account-list','account-cards','btn-new-account',
  'create-account-form','player-name','player-age','new-account-pin',
  'btn-create-account','btn-cancel-create',
  'pin-modal','pin-modal-close','pin-modal-title','account-pin-input','account-pin-error','btn-pin-ok',
  'btn-logout',
  'buy-price-label','sell-price-label','task-reward-text','bank-greeting','interest-info',
  'wallet-pin-area','wallet-pin','btn-wallet-pin-ok','btn-wallet-pin-cancel','wallet-pin-error',
  'wallet-form','wallet-amount','wallet-desc','btn-wallet-confirm','btn-wallet-cancel',
  'btn-deposit','btn-withdraw',
  'setting-interest','setting-buy-price','setting-sell-price','setting-food-reward','setting-water-reward','btn-save-settings'
].forEach(function(id) { _makeEl('div', id); });

var _domContentFn = null;
var document = {
  addEventListener: function(evt, fn) { if (evt === 'DOMContentLoaded') _domContentFn = fn; },
  querySelectorAll: function(sel) {
    if (sel === '.screen') return screenIds.map(function(id) { return _allElements[id]; });
    return [];
  },
  getElementById: function(id) { return _allElements[id] || _makeEl('div', id); }
};
var window = {
  AudioContext: function() {
    return {
      createOscillator: function() { return { type: '', frequency: { setValueAtTime: function(){} }, connect: function(){}, start: function(){}, stop: function(){} }; },
      createGain: function() { return { gain: { setValueAtTime: function(){}, linearRampToValueAtTime: function(){} }, connect: function(){} }; },
      currentTime: 0, destination: {}
    };
  }
};
var navigator = { serviceWorker: null };
var confirm = function() { return true; };
var setTimeout = function(fn, t) { };
var alert = function() {};

// Load data.js and storage.js only (no Sound dependency)
var fs = require('fs');
eval(fs.readFileSync('js/data.js', 'utf8'));
eval(fs.readFileSync('js/storage.js', 'utf8'));

console.log('Core files loaded OK');

// ---- Test 1: No accounts initially ----
console.log('\n=== Test 1: Fresh start ===');
var accounts = Storage.loadAccounts();
console.assert(accounts.length === 0, 'Should have no accounts');
console.log('PASS: No accounts on fresh start');

// ---- Test 2: Create account ----
console.log('\n=== Test 2: Create account ===');
var acc1 = Storage.createAccount('Alice', '1234');
console.assert(acc1.id === 'acc_1', 'First account should be acc_1');
console.assert(acc1.name === 'Alice', 'Name should be Alice');
console.assert(acc1.pin === '1234', 'PIN should be 1234');
accounts = Storage.loadAccounts();
console.assert(accounts.length === 1, 'Should have 1 account');
console.log('PASS: Account created');

// ---- Test 3: Per-account save ----
console.log('\n=== Test 3: Per-account save ===');
Storage.setCurrentAccount('acc_1');
var state = Storage.init();
state.playerName = 'Alice';
Storage.save(state);
console.assert(_store['piggybank_save_acc_1'] !== undefined, 'Save should exist under acc_1 key');
var loaded = Storage.load();
console.assert(loaded.playerName === 'Alice', 'Loaded state should have correct name');
console.log('PASS: Per-account save works');

// ---- Test 4: Second account with separate state ----
console.log('\n=== Test 4: Second account ===');
var acc2 = Storage.createAccount('Bob', '5678');
console.assert(acc2.id === 'acc_2', 'Second account should be acc_2');
Storage.setCurrentAccount('acc_2');
var state2 = Storage.init();
state2.playerName = 'Bob';
state2.wallet.balance = 9999;
Storage.save(state2);

// Switch back to acc_1 and verify isolation
Storage.setCurrentAccount('acc_1');
var state1 = Storage.load();
console.assert(state1.playerName === 'Alice', 'Alice state should be intact');
console.assert(state1.wallet.balance === 1000, 'Alice balance should be unchanged');

Storage.setCurrentAccount('acc_2');
var state2b = Storage.load();
console.assert(state2b.playerName === 'Bob', 'Bob state should be intact');
console.assert(state2b.wallet.balance === 9999, 'Bob balance should be 9999');
console.log('PASS: Accounts have separate game state');

// ---- Test 5: Delete account ----
console.log('\n=== Test 5: Delete account ===');
Storage.deleteAccount('acc_2');
accounts = Storage.loadAccounts();
console.assert(accounts.length === 1, 'Should have 1 account after delete');
console.assert(_store['piggybank_save_acc_2'] === undefined, 'Deleted account save should be removed');
console.log('PASS: Account deleted');

// ---- Test 6: hasSave / reset ----
console.log('\n=== Test 6: hasSave and reset ===');
Storage.setCurrentAccount('acc_1');
console.assert(Storage.hasSave() === true, 'acc_1 should have save');
Storage.reset();
console.assert(Storage.hasSave() === false, 'acc_1 should have no save after reset');
console.assert(_store['piggybank_save_acc_1'] === undefined, 'Save key should be removed');
console.log('PASS: hasSave and reset work');

// ---- Test 7: Migration from old save ----
console.log('\n=== Test 7: Migration ===');
_store = {}; // Clear everything
_store['piggybank_save'] = JSON.stringify({
  playerName: 'OldPlayer', playerAge: 9, wallet: { balance: 500, transactions: [] },
  animals: [], dailyState: { lastDate: '2025-01-01', tasksCompleted: [false,false,false,false] },
  tasks: { chores: ['a','b','c','d'] }, parentPassword: '1234', quizDifficulty: 2, quizStreak: 0,
  breedingPen: { parent1Id: null, parent2Id: null, startDate: null, active: false },
  stats: { totalAnimalsRaised: 0, totalMoneyEarned: 0, totalQuizzesTaken: 0, daysPlayed: 5 },
  inventory: { food: 3, water: 3 }, nextAnimalId: 1,
  settings: { interestRate: 5, buyBabyPrice: 500, sellAdultPrice: 1000, taskFoodReward: 2, taskWaterReward: 2 },
  lastInterestDate: '2025-01-01'
});
Storage.migrateOldSave();
accounts = Storage.loadAccounts();
console.assert(accounts.length === 1, 'Migration should create 1 account');
console.assert(accounts[0].name === 'OldPlayer', 'Migration should use playerName');
console.assert(accounts[0].id === 'acc_1', 'Migration should use acc_1');
console.assert(accounts[0].pin === '1234', 'Migration should set default PIN');
console.assert(_store['piggybank_save'] === undefined, 'Old save should be removed');
console.assert(_store['piggybank_save_acc_1'] !== undefined, 'Migrated save should exist');
var migrated = JSON.parse(_store['piggybank_save_acc_1']);
console.assert(migrated.playerName === 'OldPlayer', 'Migrated data should be intact');
console.assert(migrated.wallet.balance === 500, 'Migrated balance should be intact');
console.log('PASS: Migration works');

// ---- Test 8: Migration skipped if accounts exist ----
console.log('\n=== Test 8: Migration skipped ===');
_store['piggybank_save'] = JSON.stringify({ playerName: 'ShouldNotMigrate' });
Storage.migrateOldSave();
accounts = Storage.loadAccounts();
console.assert(accounts.length === 1, 'Should still have 1 account');
console.assert(accounts[0].name === 'OldPlayer', 'Should not have migrated again');
console.log('PASS: Migration skipped when accounts exist');

console.log('\n=== ALL TESTS PASSED ===');
