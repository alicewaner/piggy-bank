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
      quizMathCompleted: false,
      quizEncyclopediaCompleted: false,
      foodEarned: 0,
      waterEarned: 0,
      taskRewardsEarned: 0,
      quizRewardEarned: false
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
      tasksPerReward: 2,     // every N tasks = 1 reward batch
      taskRewardFood: 1,     // food per batch
      taskRewardWater: 1,    // water per batch
      dailyRewardCap: 0,     // 0 = unlimited
      quizRewardFood: 1,
      quizRewardWater: 1,
      customDepositCategories: [],
      customWithdrawCategories: []
    },
    lastInterestDate: todayString()
  };
}

var ENCYCLOPEDIA_QUESTIONS = {
  1: [ // Easy — Animals & Nature
    { q: 'What animal is known as man\'s best friend?', a: ['Dog', 'Cat', 'Horse', 'Fish'], c: 0 },
    { q: 'How many legs does a spider have?', a: ['8', '6', '10', '4'], c: 0 },
    { q: 'What is the largest animal on Earth?', a: ['Blue whale', 'Elephant', 'Giraffe', 'Shark'], c: 0 },
    { q: 'What do caterpillars turn into?', a: ['Butterflies', 'Bees', 'Ants', 'Birds'], c: 0 },
    { q: 'Which animal has a very long neck?', a: ['Giraffe', 'Elephant', 'Horse', 'Bear'], c: 0 },
    { q: 'What do frogs start life as?', a: ['Tadpoles', 'Eggs', 'Fish', 'Worms'], c: 0 },
    { q: 'What is the closest star to Earth?', a: ['The Sun', 'The Moon', 'Mars', 'Polaris'], c: 0 },
    { q: 'How many planets are in our solar system?', a: ['8', '7', '9', '10'], c: 0 },
    { q: 'What planet is known as the Red Planet?', a: ['Mars', 'Venus', 'Jupiter', 'Saturn'], c: 0 },
    { q: 'What is water made of?', a: ['Hydrogen and oxygen', 'Salt', 'Air', 'Sugar'], c: 0 },
    { q: 'Which season do leaves fall from trees?', a: ['Autumn', 'Spring', 'Summer', 'Winter'], c: 0 },
    { q: 'What do bees make?', a: ['Honey', 'Milk', 'Bread', 'Butter'], c: 0 },
    { q: 'What is a baby cow called?', a: ['Calf', 'Puppy', 'Kitten', 'Foal'], c: 0 },
    { q: 'What is the largest continent?', a: ['Asia', 'Africa', 'Europe', 'America'], c: 0 },
    { q: 'What keeps birds up in the air?', a: ['Wings', 'Tails', 'Beaks', 'Legs'], c: 0 },
    { q: 'How many colors are in a rainbow?', a: ['7', '5', '6', '8'], c: 0 },
    { q: 'What gives plants their green color?', a: ['Chlorophyll', 'Sunlight', 'Water', 'Soil'], c: 0 },
    { q: 'Which animal carries its house on its back?', a: ['Snail', 'Frog', 'Rabbit', 'Mouse'], c: 0 },
    { q: 'What is the largest ocean?', a: ['Pacific', 'Atlantic', 'Indian', 'Arctic'], c: 0 },
    { q: 'What body part pumps blood through your body?', a: ['Heart', 'Brain', 'Lungs', 'Stomach'], c: 0 },
    { q: 'What do plants need to grow?', a: ['Water and sunlight', 'Rocks', 'Sand', 'Ice'], c: 0 },
    { q: 'How many bones does an adult human have?', a: ['206', '100', '300', '150'], c: 0 },
    { q: 'What is a group of fish called?', a: ['School', 'Herd', 'Pack', 'Flock'], c: 0 },
    { q: 'What animal is the tallest in the world?', a: ['Giraffe', 'Elephant', 'Horse', 'Camel'], c: 0 },
    { q: 'What are clouds made of?', a: ['Water droplets', 'Cotton', 'Smoke', 'Dust'], c: 0 },
    { q: 'Which animal has black and white stripes?', a: ['Zebra', 'Lion', 'Tiger', 'Bear'], c: 0 },
    { q: 'What is the Earth mostly covered with?', a: ['Water', 'Land', 'Sand', 'Ice'], c: 0 },
    { q: 'What sense do your ears give you?', a: ['Hearing', 'Sight', 'Smell', 'Taste'], c: 0 },
    { q: 'What animal says "ribbit"?', a: ['Frog', 'Duck', 'Dog', 'Cat'], c: 0 },
    { q: 'What is the frozen form of water?', a: ['Ice', 'Snow', 'Steam', 'Rain'], c: 0 },
  ],
  2: [ // Medium-Easy — Animals, Space, Geography
    { q: 'What is the fastest land animal?', a: ['Cheetah', 'Lion', 'Horse', 'Deer'], c: 0 },
    { q: 'Which planet has rings around it?', a: ['Saturn', 'Mars', 'Venus', 'Mercury'], c: 0 },
    { q: 'What is the largest desert on Earth?', a: ['Sahara', 'Gobi', 'Kalahari', 'Arctic'], c: 0 },
    { q: 'How many teeth does an adult human have?', a: ['32', '20', '28', '36'], c: 0 },
    { q: 'What gas do we breathe in to stay alive?', a: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Helium'], c: 0 },
    { q: 'Which organ lets you think and learn?', a: ['Brain', 'Heart', 'Liver', 'Lungs'], c: 0 },
    { q: 'What is the longest river in the world?', a: ['Nile', 'Amazon', 'Mississippi', 'Yangtze'], c: 0 },
    { q: 'What type of animal is a dolphin?', a: ['Mammal', 'Fish', 'Reptile', 'Bird'], c: 0 },
    { q: 'How long does Earth take to orbit the Sun?', a: ['365 days', '30 days', '7 days', '100 days'], c: 0 },
    { q: 'What is the hardest natural material?', a: ['Diamond', 'Gold', 'Iron', 'Wood'], c: 0 },
    { q: 'Which planet is closest to the Sun?', a: ['Mercury', 'Venus', 'Earth', 'Mars'], c: 0 },
    { q: 'What are baby dogs called?', a: ['Puppies', 'Kittens', 'Cubs', 'Chicks'], c: 0 },
    { q: 'What force keeps us on the ground?', a: ['Gravity', 'Wind', 'Magnetism', 'Friction'], c: 0 },
    { q: 'What is the largest organ of the human body?', a: ['Skin', 'Liver', 'Heart', 'Brain'], c: 0 },
    { q: 'What country is known for kangaroos?', a: ['Australia', 'India', 'Brazil', 'Canada'], c: 0 },
    { q: 'How many wings does a bee have?', a: ['4', '2', '6', '8'], c: 0 },
    { q: 'What is lava when it cools down?', a: ['Rock', 'Sand', 'Water', 'Mud'], c: 0 },
    { q: 'Which animal can change its color?', a: ['Chameleon', 'Snake', 'Frog', 'Lizard'], c: 0 },
    { q: 'What is the center of an atom called?', a: ['Nucleus', 'Electron', 'Proton', 'Shell'], c: 0 },
    { q: 'What continent is Egypt on?', a: ['Africa', 'Asia', 'Europe', 'Australia'], c: 0 },
    { q: 'What are the tiny building blocks of life called?', a: ['Cells', 'Atoms', 'Germs', 'Seeds'], c: 0 },
    { q: 'What is the deepest ocean?', a: ['Pacific', 'Atlantic', 'Indian', 'Arctic'], c: 0 },
    { q: 'What animal has the longest lifespan?', a: ['Tortoise', 'Elephant', 'Whale', 'Parrot'], c: 0 },
    { q: 'What is the layer of gases around Earth called?', a: ['Atmosphere', 'Ozone', 'Space', 'Cloud'], c: 0 },
    { q: 'Which bird can fly backwards?', a: ['Hummingbird', 'Eagle', 'Sparrow', 'Penguin'], c: 0 },
    { q: 'What is a volcano?', a: ['Mountain that erupts lava', 'Deep hole', 'Tall hill', 'River source'], c: 0 },
    { q: 'What is the biggest planet in our solar system?', a: ['Jupiter', 'Saturn', 'Neptune', 'Uranus'], c: 0 },
    { q: 'What is the smallest bone in the human body?', a: ['Stapes (ear)', 'Toe bone', 'Finger bone', 'Rib'], c: 0 },
    { q: 'What do you call a scientist who studies stars?', a: ['Astronomer', 'Biologist', 'Chemist', 'Geologist'], c: 0 },
    { q: 'What is the main gas in the air we breathe?', a: ['Nitrogen', 'Oxygen', 'Carbon dioxide', 'Helium'], c: 0 },
  ],
  3: [ // Medium — Science, Geography, Body
    { q: 'What is the chemical symbol for water?', a: ['H2O', 'CO2', 'O2', 'NaCl'], c: 0 },
    { q: 'What is the tallest mountain on Earth?', a: ['Mount Everest', 'K2', 'Kilimanjaro', 'Denali'], c: 0 },
    { q: 'What part of the plant takes in water from the soil?', a: ['Roots', 'Leaves', 'Stem', 'Flower'], c: 0 },
    { q: 'How many chambers does the human heart have?', a: ['4', '2', '3', '6'], c: 0 },
    { q: 'What is the study of weather called?', a: ['Meteorology', 'Biology', 'Geology', 'Zoology'], c: 0 },
    { q: 'What galaxy do we live in?', a: ['Milky Way', 'Andromeda', 'Triangulum', 'Orion'], c: 0 },
    { q: 'What is the largest mammal on land?', a: ['African elephant', 'Blue whale', 'Hippo', 'Rhino'], c: 0 },
    { q: 'What kind of energy comes from the Sun?', a: ['Solar energy', 'Wind energy', 'Water energy', 'Sound'], c: 0 },
    { q: 'How many continents are there?', a: ['7', '5', '6', '8'], c: 0 },
    { q: 'What is the boiling point of water in Celsius?', a: ['100', '50', '200', '0'], c: 0 },
    { q: 'Which animal is the king of the jungle?', a: ['Lion', 'Tiger', 'Bear', 'Wolf'], c: 0 },
    { q: 'What do the lungs help you do?', a: ['Breathe', 'Eat', 'See', 'Walk'], c: 0 },
    { q: 'What is the process of plants making food called?', a: ['Photosynthesis', 'Digestion', 'Respiration', 'Germination'], c: 0 },
    { q: 'Which planet is farthest from the Sun?', a: ['Neptune', 'Pluto', 'Uranus', 'Saturn'], c: 0 },
    { q: 'What substance gives bones their strength?', a: ['Calcium', 'Iron', 'Protein', 'Vitamin C'], c: 0 },
    { q: 'What is the capital of Japan?', a: ['Tokyo', 'Beijing', 'Seoul', 'Bangkok'], c: 0 },
    { q: 'What type of rock is formed from lava?', a: ['Igneous', 'Sedimentary', 'Metamorphic', 'Mineral'], c: 0 },
    { q: 'What are animals without backbones called?', a: ['Invertebrates', 'Vertebrates', 'Mammals', 'Reptiles'], c: 0 },
    { q: 'What ocean lies between Africa and Australia?', a: ['Indian Ocean', 'Pacific', 'Atlantic', 'Arctic'], c: 0 },
    { q: 'What is the speed of light per second?', a: ['186,000 miles', '100,000 miles', '1 million miles', '50,000 miles'], c: 0 },
    { q: 'What causes tides in the ocean?', a: ['Moon\'s gravity', 'Wind', 'Earthquakes', 'Sun\'s heat'], c: 0 },
    { q: 'What is the largest bird in the world?', a: ['Ostrich', 'Eagle', 'Albatross', 'Pelican'], c: 0 },
    { q: 'What gas do plants absorb from the air?', a: ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Helium'], c: 0 },
    { q: 'What are the three states of matter?', a: ['Solid, liquid, gas', 'Hot, warm, cold', 'Big, medium, small', 'Red, blue, green'], c: 0 },
    { q: 'What is a baby kangaroo called?', a: ['Joey', 'Kit', 'Pup', 'Cub'], c: 0 },
    { q: 'How many bones are in the human body?', a: ['206', '100', '300', '150'], c: 0 },
    { q: 'What continent is the Amazon rainforest on?', a: ['South America', 'Africa', 'Asia', 'Australia'], c: 0 },
    { q: 'What vitamin comes from sunlight?', a: ['Vitamin D', 'Vitamin C', 'Vitamin A', 'Vitamin B'], c: 0 },
    { q: 'What is the equator?', a: ['Imaginary line around middle of Earth', 'A country', 'A mountain', 'A river'], c: 0 },
    { q: 'What is the most common element in the universe?', a: ['Hydrogen', 'Oxygen', 'Carbon', 'Helium'], c: 0 },
  ],
  4: [ // Medium-Hard — Deeper Science & Geography
    { q: 'What is the chemical formula for table salt?', a: ['NaCl', 'H2O', 'CO2', 'O2'], c: 0 },
    { q: 'What layer of Earth do we live on?', a: ['Crust', 'Mantle', 'Core', 'Magma'], c: 0 },
    { q: 'What is the powerhouse of the cell?', a: ['Mitochondria', 'Nucleus', 'Ribosome', 'Cell wall'], c: 0 },
    { q: 'What is the Great Barrier Reef made of?', a: ['Coral', 'Rock', 'Sand', 'Ice'], c: 0 },
    { q: 'What planet has the most moons?', a: ['Saturn', 'Jupiter', 'Neptune', 'Uranus'], c: 0 },
    { q: 'What is the formula for carbon dioxide?', a: ['CO2', 'C2O', 'CO', 'O2C'], c: 0 },
    { q: 'How many time zones are there in the world?', a: ['24', '12', '36', '48'], c: 0 },
    { q: 'What is the largest organ inside the human body?', a: ['Liver', 'Heart', 'Lungs', 'Brain'], c: 0 },
    { q: 'What type of animal is a whale shark?', a: ['Fish', 'Whale', 'Dolphin', 'Shark-whale hybrid'], c: 0 },
    { q: 'What is the driest continent?', a: ['Antarctica', 'Africa', 'Australia', 'Asia'], c: 0 },
    { q: 'What are fossils?', a: ['Remains of ancient life', 'Rocks', 'Crystals', 'Shells'], c: 0 },
    { q: 'How fast does Earth spin at the equator?', a: ['About 1,000 mph', '100 mph', '10,000 mph', '500 mph'], c: 0 },
    { q: 'What connects muscles to bones?', a: ['Tendons', 'Ligaments', 'Cartilage', 'Nerves'], c: 0 },
    { q: 'What country has the most people?', a: ['India', 'China', 'USA', 'Indonesia'], c: 0 },
    { q: 'What causes earthquakes?', a: ['Tectonic plates moving', 'Wind', 'Rain', 'Volcanos'], c: 0 },
    { q: 'What is the study of living things called?', a: ['Biology', 'Chemistry', 'Physics', 'Geology'], c: 0 },
    { q: 'What animal can regenerate its limbs?', a: ['Starfish', 'Dolphin', 'Frog', 'Turtle'], c: 0 },
    { q: 'What is the smallest planet in our solar system?', a: ['Mercury', 'Mars', 'Venus', 'Pluto'], c: 0 },
    { q: 'What carries oxygen in the blood?', a: ['Red blood cells', 'White blood cells', 'Plasma', 'Platelets'], c: 0 },
    { q: 'What is the longest bone in the human body?', a: ['Femur', 'Tibia', 'Humerus', 'Spine'], c: 0 },
    { q: 'What is the capital of Australia?', a: ['Canberra', 'Sydney', 'Melbourne', 'Perth'], c: 0 },
    { q: 'What is a group of wolves called?', a: ['Pack', 'Herd', 'Flock', 'School'], c: 0 },
    { q: 'What causes a rainbow?', a: ['Light refracting in water', 'Paint in the sky', 'Wind', 'Heat'], c: 0 },
    { q: 'What is the human body\'s largest muscle?', a: ['Gluteus maximus', 'Biceps', 'Heart', 'Quadriceps'], c: 0 },
    { q: 'What is the name of Earth\'s natural satellite?', a: ['The Moon', 'The Sun', 'Mars', 'Venus'], c: 0 },
    { q: 'What type of rock is marble?', a: ['Metamorphic', 'Igneous', 'Sedimentary', 'Mineral'], c: 0 },
    { q: 'How many lungs do humans have?', a: ['2', '1', '3', '4'], c: 0 },
    { q: 'What is the deepest point in the ocean called?', a: ['Mariana Trench', 'Grand Canyon', 'Deep Blue', 'Bermuda Triangle'], c: 0 },
    { q: 'Which animal sleeps standing up?', a: ['Horse', 'Dog', 'Cat', 'Bear'], c: 0 },
    { q: 'What is DNA?', a: ['Genetic code of life', 'A type of cell', 'A bone', 'A vitamin'], c: 0 },
  ],
  5: [ // Hard — Advanced Science & Nature
    { q: 'What is the pH of pure water?', a: ['7', '0', '14', '5'], c: 0 },
    { q: 'What is the most abundant gas in Earth\'s atmosphere?', a: ['Nitrogen (78%)', 'Oxygen (21%)', 'Carbon dioxide', 'Argon'], c: 0 },
    { q: 'What is the process of water moving through a cycle called?', a: ['Water cycle', 'Rain cycle', 'Cloud cycle', 'Flow cycle'], c: 0 },
    { q: 'What element does the symbol Fe represent?', a: ['Iron', 'Fluorine', 'Lead', 'Fermium'], c: 0 },
    { q: 'How long does it take light to reach Earth from the Sun?', a: ['About 8 minutes', '1 second', '1 hour', '1 day'], c: 0 },
    { q: 'What is the name of the force that opposes motion?', a: ['Friction', 'Gravity', 'Magnetism', 'Inertia'], c: 0 },
    { q: 'What animal has three hearts?', a: ['Octopus', 'Whale', 'Spider', 'Eagle'], c: 0 },
    { q: 'What is the largest known structure in the universe?', a: ['Hercules-Corona Borealis Great Wall', 'Milky Way', 'Andromeda', 'The Sun'], c: 0 },
    { q: 'What is the name of the first person on the Moon?', a: ['Neil Armstrong', 'Buzz Aldrin', 'John Glenn', 'Yuri Gagarin'], c: 0 },
    { q: 'What part of the brain controls balance?', a: ['Cerebellum', 'Cerebrum', 'Brain stem', 'Hippocampus'], c: 0 },
    { q: 'How many chromosomes do humans have?', a: ['46', '23', '48', '44'], c: 0 },
    { q: 'What is the hardest mineral on the Mohs scale?', a: ['Diamond (10)', 'Quartz (7)', 'Topaz (8)', 'Corundum (9)'], c: 0 },
    { q: 'What is the smallest unit of an element?', a: ['Atom', 'Molecule', 'Cell', 'Proton'], c: 0 },
    { q: 'What is a light-year?', a: ['Distance light travels in a year', 'A year of sunlight', 'A fast year', 'A space year'], c: 0 },
    { q: 'What is the second most common element in Earth\'s crust?', a: ['Silicon', 'Aluminum', 'Iron', 'Calcium'], c: 0 },
    { q: 'What type of blood vessels carry blood away from the heart?', a: ['Arteries', 'Veins', 'Capillaries', 'Ventricles'], c: 0 },
    { q: 'What is the name of the theory explaining the origin of the universe?', a: ['Big Bang', 'String theory', 'Relativity', 'Evolution'], c: 0 },
    { q: 'What is the only mammal that can fly?', a: ['Bat', 'Flying squirrel', 'Sugar glider', 'Owl'], c: 0 },
    { q: 'What layer of the atmosphere contains the ozone layer?', a: ['Stratosphere', 'Troposphere', 'Mesosphere', 'Thermosphere'], c: 0 },
    { q: 'What is absolute zero in Celsius?', a: ['-273.15', '0', '-100', '-459'], c: 0 },
    { q: 'What animal has blue blood?', a: ['Horseshoe crab', 'Blue whale', 'Jellyfish', 'Swordfish'], c: 0 },
    { q: 'What is the most electrically conductive element?', a: ['Silver', 'Copper', 'Gold', 'Aluminum'], c: 0 },
    { q: 'What is the study of earthquakes called?', a: ['Seismology', 'Geology', 'Volcanology', 'Meteorology'], c: 0 },
    { q: 'What is the only planet that rotates on its side?', a: ['Uranus', 'Neptune', 'Saturn', 'Venus'], c: 0 },
    { q: 'How many valves are in the human heart?', a: ['4', '2', '3', '6'], c: 0 },
    { q: 'What is the strongest natural fiber?', a: ['Spider silk', 'Cotton', 'Wool', 'Hemp'], c: 0 },
    { q: 'What is the largest species of penguin?', a: ['Emperor penguin', 'King penguin', 'Gentoo', 'Rockhopper'], c: 0 },
    { q: 'What element makes up most of the Sun?', a: ['Hydrogen', 'Helium', 'Oxygen', 'Carbon'], c: 0 },
    { q: 'What is the deepest lake in the world?', a: ['Lake Baikal', 'Lake Superior', 'Caspian Sea', 'Lake Victoria'], c: 0 },
    { q: 'What is the Earth\'s inner core mostly made of?', a: ['Iron and nickel', 'Rock', 'Magma', 'Silicon'], c: 0 },
  ]
};

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
