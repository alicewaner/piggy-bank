// ============================================================
// quiz.js — Quiz engine: math + encyclopedia, 5 questions each
// ============================================================

const Quiz = (() => {
  let currentQuestions = [];
  let currentIndex = 0;
  let score = 0;
  let streak = 0;
  let quizType = 'math';
  let questionsPerQuiz = 5;
  function getQuestionsPerQuiz() {
    return questionsPerQuiz;
  }

  // 200+ math questions across 5 difficulty levels
  const QUESTIONS = {
    1: [ // Easy
      { q: 'What is 2 + 3?', a: ['5', '4', '6', '3'], c: 0 },
      { q: 'What is 5 - 2?', a: ['3', '4', '2', '1'], c: 0 },
      { q: 'What is 1 + 1?', a: ['2', '3', '1', '0'], c: 0 },
      { q: 'What is 4 + 1?', a: ['5', '6', '3', '4'], c: 0 },
      { q: 'What is 3 + 3?', a: ['6', '5', '7', '4'], c: 0 },
      { q: 'What is 6 - 4?', a: ['2', '3', '1', '4'], c: 0 },
      { q: 'What is 7 + 2?', a: ['9', '8', '10', '7'], c: 0 },
      { q: 'What is 10 - 5?', a: ['5', '4', '6', '3'], c: 0 },
      { q: 'How many legs does a dog have?', a: ['4', '2', '6', '8'], c: 0 },
      { q: 'How many days are in a week?', a: ['7', '5', '6', '8'], c: 0 },
      { q: 'If you have 3 apples and eat 1, how many are left?', a: ['2', '3', '1', '4'], c: 0 },
      { q: 'What is 2 + 2?', a: ['4', '3', '5', '2'], c: 0 },
      { q: 'How many pennies in a nickel?', a: ['5', '10', '1', '25'], c: 0 },
      { q: 'What comes after 5?', a: ['6', '7', '4', '8'], c: 0 },
      { q: 'What shape has 3 sides?', a: ['Triangle', 'Square', 'Circle', 'Rectangle'], c: 0 },
      { q: 'What is 0 + 5?', a: ['5', '0', '50', '1'], c: 0 },
      { q: 'What is 8 - 3?', a: ['5', '4', '6', '3'], c: 0 },
      { q: 'How many wheels on a bicycle?', a: ['2', '3', '4', '1'], c: 0 },
      { q: 'What is 3 + 4?', a: ['7', '6', '8', '5'], c: 0 },
      { q: 'What is 9 - 1?', a: ['8', '7', '9', '10'], c: 0 },
      { q: 'If you save $1 a day for 3 days, how much do you have?', a: ['$3', '$1', '$2', '$4'], c: 0 },
      { q: 'What is 6 + 2?', a: ['8', '7', '9', '6'], c: 0 },
      { q: 'How many fingers on one hand?', a: ['5', '4', '6', '10'], c: 0 },
      { q: 'What is 4 - 4?', a: ['0', '1', '4', '2'], c: 0 },
      { q: 'What is 5 + 5?', a: ['10', '9', '11', '8'], c: 0 },
      { q: 'If you have 2 coins worth 5 cents each, how much?', a: ['10 cents', '5 cents', '15 cents', '20 cents'], c: 0 },
      { q: 'What is 1 + 2 + 3?', a: ['6', '5', '7', '4'], c: 0 },
      { q: 'How many ears do you have?', a: ['2', '1', '3', '4'], c: 0 },
      { q: 'What is 7 - 7?', a: ['0', '1', '7', '14'], c: 0 },
    ],
    2: [ // Medium-Easy
      { q: 'What is 12 + 8?', a: ['20', '18', '22', '19'], c: 0 },
      { q: 'What is 15 - 7?', a: ['8', '7', '9', '6'], c: 0 },
      { q: 'What is 3 x 4?', a: ['12', '7', '10', '14'], c: 0 },
      { q: 'What is 20 / 4?', a: ['5', '4', '6', '10'], c: 0 },
      { q: 'How many nickels make a quarter?', a: ['5', '4', '10', '25'], c: 0 },
      { q: 'What is 9 x 2?', a: ['18', '16', '20', '11'], c: 0 },
      { q: 'If you buy a toy for $3 and pay with $5, what is your change?', a: ['$2', '$3', '$1', '$5'], c: 0 },
      { q: 'What is 25 + 15?', a: ['40', '35', '45', '30'], c: 0 },
      { q: 'How many months in a year?', a: ['12', '10', '11', '14'], c: 0 },
      { q: 'What is 6 x 3?', a: ['18', '15', '21', '12'], c: 0 },
      { q: 'If you have $10 and spend $4, how much is left?', a: ['$6', '$4', '$5', '$7'], c: 0 },
      { q: 'What is 30 - 12?', a: ['18', '22', '16', '20'], c: 0 },
      { q: 'How many dimes in a dollar?', a: ['10', '20', '5', '100'], c: 0 },
      { q: 'What is 7 x 5?', a: ['35', '30', '40', '25'], c: 0 },
      { q: 'What is 50 - 25?', a: ['25', '20', '30', '15'], c: 0 },
      { q: 'How many sides does a hexagon have?', a: ['6', '5', '8', '7'], c: 0 },
      { q: 'What is 4 x 6?', a: ['24', '20', '26', '18'], c: 0 },
      { q: 'If something costs $7.50, how much change from $10?', a: ['$2.50', '$3.50', '$2.00', '$3.00'], c: 0 },
      { q: 'What is 100 - 45?', a: ['55', '65', '45', '50'], c: 0 },
      { q: 'How many quarters in a dollar?', a: ['4', '10', '5', '2'], c: 0 },
      { q: 'What is 8 x 3?', a: ['24', '21', '27', '18'], c: 0 },
      { q: 'What is 11 + 14?', a: ['25', '24', '26', '23'], c: 0 },
      { q: 'How many inches in a foot?', a: ['12', '10', '6', '24'], c: 0 },
      { q: 'What is 9 x 4?', a: ['36', '32', '40', '28'], c: 0 },
      { q: 'If you earn $2 a day for a week, how much?', a: ['$14', '$7', '$12', '$10'], c: 0 },
      { q: 'What is 16 / 2?', a: ['8', '6', '4', '10'], c: 0 },
      { q: 'What is 5 x 5?', a: ['25', '20', '30', '15'], c: 0 },
      { q: 'What is 14 + 19?', a: ['33', '32', '34', '31'], c: 0 },
      { q: 'What is 45 - 18?', a: ['27', '23', '33', '25'], c: 0 },
      { q: 'What is 6 x 6?', a: ['36', '30', '42', '24'], c: 0 },
    ],
    3: [ // Medium
      { q: 'What is 12 x 11?', a: ['132', '121', '144', '122'], c: 0 },
      { q: 'What is 156 + 244?', a: ['400', '390', '410', '300'], c: 0 },
      { q: 'If you save $5 a week for 8 weeks, how much?', a: ['$40', '$35', '$45', '$30'], c: 0 },
      { q: 'What is 15% of 100?', a: ['15', '10', '20', '25'], c: 0 },
      { q: 'What is 144 / 12?', a: ['12', '11', '13', '14'], c: 0 },
      { q: 'If a shirt costs $20 and is 25% off, what do you pay?', a: ['$15', '$5', '$10', '$18'], c: 0 },
      { q: 'What is 7 x 8?', a: ['56', '54', '48', '63'], c: 0 },
      { q: 'What is 1,000 - 637?', a: ['363', '373', '463', '337'], c: 0 },
      { q: 'What is 9 x 9?', a: ['81', '72', '90', '63'], c: 0 },
      { q: 'If you share 24 cookies among 6 friends, how many each?', a: ['4', '3', '6', '5'], c: 0 },
      { q: 'What is 250 + 375?', a: ['625', '525', '725', '600'], c: 0 },
      { q: 'How many minutes in 2 hours?', a: ['120', '100', '90', '180'], c: 0 },
      { q: 'What is 8 x 7?', a: ['56', '54', '48', '63'], c: 0 },
      { q: 'If an item costs $12.50 and you pay $20, what is your change?', a: ['$7.50', '$7.00', '$8.50', '$8.00'], c: 0 },
      { q: 'What is 500 / 25?', a: ['20', '25', '15', '50'], c: 0 },
      { q: 'What is 11 x 12?', a: ['132', '121', '144', '120'], c: 0 },
      { q: 'If you earn $8/hour and work 5 hours, how much?', a: ['$40', '$35', '$45', '$48'], c: 0 },
      { q: 'What is 3 squared?', a: ['9', '6', '12', '27'], c: 0 },
      { q: 'What is 480 / 6?', a: ['80', '70', '60', '90'], c: 0 },
      { q: 'What is 10% of 250?', a: ['25', '2.5', '250', '50'], c: 0 },
      { q: 'If 3 books cost $15, how much for 1 book?', a: ['$5', '$3', '$15', '$10'], c: 0 },
      { q: 'What is 13 x 7?', a: ['91', '84', '97', '77'], c: 0 },
      { q: 'What is 1,500 - 876?', a: ['624', '634', '724', '614'], c: 0 },
      { q: 'If you buy 4 items at $3.50 each, what is the total?', a: ['$14.00', '$12.00', '$15.00', '$13.50'], c: 0 },
      { q: 'What is 6 x 12?', a: ['72', '66', '78', '60'], c: 0 },
      { q: 'What is double 45?', a: ['90', '80', '100', '85'], c: 0 },
      { q: 'What is 99 + 99?', a: ['198', '188', '208', '196'], c: 0 },
      { q: 'What is 15 x 4?', a: ['60', '55', '65', '45'], c: 0 },
      { q: 'What is 200 - 87?', a: ['113', '123', '103', '117'], c: 0 },
      { q: 'What is 14 x 5?', a: ['70', '65', '75', '60'], c: 0 },
    ],
    4: [ // Medium-Hard
      { q: 'What is 23 x 17?', a: ['391', '381', '401', '371'], c: 0 },
      { q: 'What is 20% of 350?', a: ['70', '35', '7', '175'], c: 0 },
      { q: 'If you invest $100 and earn 10% interest, how much total?', a: ['$110', '$100', '$10', '$120'], c: 0 },
      { q: 'What is the square root of 64?', a: ['8', '6', '7', '9'], c: 0 },
      { q: 'What is 2,500 / 50?', a: ['50', '25', '500', '5'], c: 0 },
      { q: 'If a bus travels 60 mph for 3 hours, how far?', a: ['180 mi', '120 mi', '200 mi', '60 mi'], c: 0 },
      { q: 'What is 15 x 15?', a: ['225', '200', '250', '215'], c: 0 },
      { q: 'What fraction is equivalent to 0.75?', a: ['3/4', '1/2', '2/3', '7/5'], c: 0 },
      { q: 'If sales tax is 8% on a $50 item, what is the total?', a: ['$54', '$58', '$50.08', '$45'], c: 0 },
      { q: 'What is 18 x 12?', a: ['216', '206', '226', '196'], c: 0 },
      { q: 'How many edges does a cube have?', a: ['12', '6', '8', '10'], c: 0 },
      { q: 'What is 3,456 - 1,789?', a: ['1,667', '1,767', '1,567', '1,677'], c: 0 },
      { q: 'If you save $25/month, how much in a year?', a: ['$300', '$250', '$275', '$325'], c: 0 },
      { q: 'What is 5 cubed?', a: ['125', '15', '25', '75'], c: 0 },
      { q: 'What is 33% of 600?', a: ['198', '200', '180', '210'], c: 0 },
      { q: 'What is 1,234 + 4,321?', a: ['5,555', '5,455', '5,655', '5,545'], c: 0 },
      { q: 'What is 75% of 80?', a: ['60', '65', '55', '70'], c: 0 },
      { q: 'What is the perimeter of a 5x3 rectangle?', a: ['16', '15', '8', '30'], c: 0 },
      { q: 'If a dozen eggs costs $3.60, how much for 1 egg?', a: ['$0.30', '$0.36', '$0.25', '$0.40'], c: 0 },
      { q: 'What is 19 x 21?', a: ['399', '389', '409', '379'], c: 0 },
      { q: 'What is 40% of 200?', a: ['80', '40', '60', '100'], c: 0 },
      { q: 'If you divide $100 among 4 people, how much each?', a: ['$25', '$20', '$50', '$30'], c: 0 },
      { q: 'What is 16 x 16?', a: ['256', '246', '266', '236'], c: 0 },
      { q: 'What is 4,000 / 80?', a: ['50', '40', '500', '5'], c: 0 },
      { q: 'What is the area of a triangle with base 10 and height 6?', a: ['30', '60', '16', '20'], c: 0 },
      { q: 'What is 999 + 1?', a: ['1,000', '1,001', '999', '9,991'], c: 0 },
      { q: 'If you buy 3 for $5.99 each, how much total?', a: ['$17.97', '$15.99', '$18.97', '$17.00'], c: 0 },
      { q: 'What is 12 squared?', a: ['144', '124', '132', '156'], c: 0 },
      { q: 'What is 625 / 25?', a: ['25', '20', '30', '125'], c: 0 },
      { q: 'What is 14 x 14?', a: ['196', '186', '204', '169'], c: 0 },
    ],
    5: [ // Hard
      { q: 'What is 37 x 43?', a: ['1,591', '1,481', '1,691', '1,571'], c: 0 },
      { q: 'If you invest $500 at 5% simple interest for 2 years, how much interest?', a: ['$50', '$25', '$100', '$55'], c: 0 },
      { q: 'What is the square root of 169?', a: ['13', '12', '14', '11'], c: 0 },
      { q: 'If 8 people share a $120 bill equally, how much each?', a: ['$15', '$12', '$16', '$14'], c: 0 },
      { q: 'What is 2 to the power of 8?', a: ['256', '128', '512', '64'], c: 0 },
      { q: 'What is 45% of 800?', a: ['360', '320', '400', '380'], c: 0 },
      { q: 'If a car depreciates 20% per year and costs $10,000, what after 1 year?', a: ['$8,000', '$2,000', '$9,000', '$7,000'], c: 0 },
      { q: 'What is 876 x 4?', a: ['3,504', '3,404', '3,604', '3,304'], c: 0 },
      { q: 'How many prime numbers are between 1 and 20?', a: ['8', '7', '9', '6'], c: 0 },
      { q: 'What is 15% tip on an $80 meal?', a: ['$12', '$8', '$15', '$10'], c: 0 },
      { q: 'What is 25 x 25?', a: ['625', '525', '675', '600'], c: 0 },
      { q: 'If a store gives 30% off $85, what do you pay?', a: ['$59.50', '$55.50', '$25.50', '$65.00'], c: 0 },
      { q: 'What is 2,048 / 64?', a: ['32', '28', '36', '24'], c: 0 },
      { q: 'What is 999 x 9?', a: ['8,991', '8,991', '9,991', '8,981'], c: 0 },
      { q: 'If you save $50/week, how many weeks to save $1,000?', a: ['20', '25', '10', '50'], c: 0 },
      { q: 'What is 17 x 19?', a: ['323', '313', '333', '303'], c: 0 },
      { q: 'What is 3 to the power of 5?', a: ['243', '125', '81', '729'], c: 0 },
      { q: 'What is 1,111 x 5?', a: ['5,555', '5,505', '5,550', '5,565'], c: 0 },
      { q: 'If compound interest is 10% on $100 for 2 years, the total is?', a: ['$121', '$120', '$110', '$130'], c: 0 },
      { q: 'What is 12,345 - 6,789?', a: ['5,556', '5,656', '5,446', '6,556'], c: 0 },
      { q: 'If 1 euro = $1.10, how many dollars for 50 euros?', a: ['$55', '$50', '$60', '$45'], c: 0 },
      { q: 'What is the volume of a cube with side 5?', a: ['125', '25', '75', '150'], c: 0 },
      { q: 'What is 88 x 12?', a: ['1,056', '1,006', '1,156', '1,066'], c: 0 },
      { q: 'What is 256 / 16?', a: ['16', '12', '18', '24'], c: 0 },
      { q: 'What is 0.125 as a fraction?', a: ['1/8', '1/4', '1/6', '1/10'], c: 0 },
      { q: 'If a plane flies at 500 mph for 2.5 hours, how far?', a: ['1,250 mi', '1,000 mi', '1,500 mi', '750 mi'], c: 0 },
      { q: 'What is 13 x 17?', a: ['221', '211', '231', '201'], c: 0 },
      { q: 'What is the median of 3, 7, 9, 15, 21?', a: ['9', '7', '15', '11'], c: 0 },
      { q: 'What is 47 x 53?', a: ['2,491', '2,481', '2,501', '2,391'], c: 0 },
    ]
  };

  function pickQuestions(difficulty, type) {
    var pool;
    if (type === 'encyclopedia') {
      pool = ENCYCLOPEDIA_QUESTIONS[difficulty] || ENCYCLOPEDIA_QUESTIONS[1];
    } else {
      pool = QUESTIONS[difficulty] || QUESTIONS[1];
    }
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, getQuestionsPerQuiz());
  }

  function start(type) {
    quizType = type || 'math';
    const state = Storage.load();
    questionsPerQuiz = (state.settings && state.settings.questionsPerQuiz) || 5;
    currentQuestions = pickQuestions(state.quizDifficulty, quizType);
    currentIndex = 0;
    score = 0;
    streak = 0;

    // Update header
    const header = document.querySelector('#screen-quiz .screen-header h2');
    if (header) {
      header.textContent = quizType === 'math' ? 'Math Quiz!' : 'Encyclopedia Quiz!';
    }

    showQuestion();
  }

  function showQuestion() {
    if (currentIndex >= getQuestionsPerQuiz()) {
      finishQuiz();
      return;
    }

    const q = currentQuestions[currentIndex];
    document.getElementById('quiz-progress').textContent =
      `Question ${currentIndex + 1}/${getQuestionsPerQuiz()}`;
    document.getElementById('quiz-score').textContent = `Score: ${score}`;
    document.getElementById('quiz-question').textContent = q.q;
    document.getElementById('quiz-feedback').textContent = '';
    document.getElementById('quiz-feedback').className = 'quiz-feedback';

    // Shuffle answers
    const indices = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    const answers = document.getElementById('quiz-answers');
    answers.innerHTML = indices.map(i => {
      return `<button class="quiz-btn" data-idx="${i}">${q.a[i]}</button>`;
    }).join('');

    answers.querySelectorAll('.quiz-btn').forEach(btn => {
      btn.addEventListener('click', () => answerQuestion(parseInt(btn.dataset.idx)));
    });
  }

  function answerQuestion(idx) {
    const q = currentQuestions[currentIndex];
    const feedback = document.getElementById('quiz-feedback');
    const buttons = document.querySelectorAll('.quiz-btn');
    buttons.forEach(b => b.disabled = true);

    if (idx === q.c) {
      score++;
      streak++;
      feedback.textContent = 'Correct!';
      feedback.className = 'quiz-feedback feedback-correct';
      Sound.correct();
    } else {
      streak = 0;
      feedback.textContent = `Wrong! The answer was: ${q.a[q.c]}`;
      feedback.className = 'quiz-feedback feedback-wrong';
      Sound.wrong();
    }

    buttons.forEach(b => {
      if (parseInt(b.dataset.idx) === q.c) {
        b.classList.add('correct-answer');
      } else if (parseInt(b.dataset.idx) === idx && idx !== q.c) {
        b.classList.add('wrong-answer');
      }
    });

    currentIndex++;
    setTimeout(showQuestion, 1500);
  }

  function finishQuiz() {
    const state = Storage.load();
    state.stats.totalQuizzesTaken++;

    // Adaptive difficulty
    if (score >= getQuestionsPerQuiz()) {
      state.quizDifficulty = Math.min(5, state.quizDifficulty + 1);
    } else if (score === 0) {
      state.quizDifficulty = Math.max(1, state.quizDifficulty - 1);
    }
    state.quizStreak = streak;
    Storage.save(state);

    // Show results
    const typeLabel = quizType === 'math' ? 'Math' : 'Encyclopedia';
    document.getElementById('quiz-question').textContent =
      `${typeLabel} Quiz Complete! You got ${score}/${getQuestionsPerQuiz()}!`;
    document.getElementById('quiz-answers').innerHTML =
      `<button class="btn btn-primary" id="quiz-done">Back to Tasks</button>`;
    document.getElementById('quiz-feedback').textContent =
      score >= getQuestionsPerQuiz() ? 'Perfect!' : score >= 2 ? 'Good effort!' : 'Keep practicing!';
    document.getElementById('quiz-feedback').className = 'quiz-feedback feedback-correct';

    document.getElementById('quiz-done').addEventListener('click', () => {
      Sound.click();
      Tasks.awardQuizComplete(quizType);
      App.showScreen('tasks');
    });
  }

  return { start };
})();
