// ============================================================
// data.js — Constants, default state, Animal class
// ============================================================

var ANIMAL_TYPES = ['pig', 'sheep', 'cat', 'dog', 'dragon', 'axolotl', 'hedgehog', 'platypus'];

var ANIMAL_NAMES = {
  pig:       { singular: 'Pig' },
  sheep:     { singular: 'Sheep' },
  cat:       { singular: 'Cat' },
  dog:       { singular: 'Dog' },
  dragon:    { singular: 'Dragon' },
  axolotl:   { singular: 'Axolotl' },
  hedgehog:  { singular: 'Hedgehog' },
  platypus:  { singular: 'Platypus' }
};

// Default prices (can be overridden by parent)
var DEFAULT_PRICES = {
  buyBaby: 500,    // $5.00
  sellAdult: 1000  // $10.00
};

var HEARTS = {
  maxHearts: 15,
  adultThreshold: 15,
  maxPerDayBought: 3,   // feed(1) + water(1) + happy(1)
  maxPerDayBred: 5
};

var DEATH = {
  daysWithoutWater: 2,
  daysWithoutFood: 3
};

var DEPOSIT_CATEGORIES = ['Red Pocket', 'Birthday', 'Holiday', 'Piggy Bank Reward', 'Interest Income', 'Other Earnings'];
var WITHDRAW_CATEGORIES = ['Snack', 'Toys', 'Stationery', 'Books', 'Piggy Bank Spend', 'Others'];

var DEFAULT_CHORES = [
  'Make your bed',
  'Brush your teeth',
  'Clean your room',
  'Do your homework'
];

function createDefaultState() {
  return {
    wallet: {
      balance: 1000, // $10.00 in cents
      transactions: [
        { type: 'deposit', amount: 1000, desc: 'Welcome bonus!', date: todayString() }
      ]
    },
    animals: [],
    dailyState: {
      lastDate: todayString(),
      tasksCompleted: [false, false, false, false],
      quizCompleted: false,
      foodEarned: 0,
      waterEarned: 0
    },
    tasks: {
      chores: [].concat(DEFAULT_CHORES)
    },
    playerName: '',
    playerAge: 8,
    parentPassword: '1234',
    quizDifficulty: 1,
    quizStreak: 0,
    breedingPen: {
      parent1Id: null,
      parent2Id: null,
      startDate: null,
      active: false
    },
    stats: {
      totalAnimalsRaised: 0,
      totalMoneyEarned: 0,
      totalQuizzesTaken: 0,
      daysPlayed: 1
    },
    inventory: {
      food: 2,
      water: 2
    },
    nextAnimalId: 1,
    // Parent-configurable settings
    settings: {
      interestRate: 5,       // Annual interest rate (%)
      buyBabyPrice: 500,     // cents
      sellAdultPrice: 1000,  // cents
      taskFoodReward: 2,
      taskWaterReward: 2,
      customDepositCategories: [],
      customWithdrawCategories: []
    },
    lastInterestDate: todayString()
  };
}

function createAnimal(type, isBred) {
  isBred = isBred || false;
  var state = Storage.load();
  var id = state.nextAnimalId++;
  var animal = {
    id: id,
    type: type,
    name: '',
    stage: 'baby',
    hearts: 0,
    isBred: isBred,
    alive: true,
    daysWithoutFood: 0,
    daysWithoutWater: 0,
    fedToday: false,
    wateredToday: false,
    happyHeartToday: false,    // auto-granted when fed+watered
    happyHeartRemoved: false,  // parent removed it
    heartsToday: 0,
    bornDate: todayString()
  };
  state.animals.push(animal);
  Storage.save(state);
  return animal;
}

function todayString() {
  var d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function formatMoney(cents) {
  return '$' + (cents / 100).toFixed(2);
}

function getMonthYear(dateStr) {
  var parts = dateStr.split('-');
  return parts[0] + '-' + parts[1];
}
