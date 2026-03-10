// ============================================================
// tasks.js — Dynamic chores, task credits unlock food/water
// ============================================================

var Tasks = (function() {

  function render() {
    var state = Storage.load();
    var ds = state.dailyState;
    var s = state.settings;
    var list = document.getElementById('tasks-list');

    // Render dynamic chore checkboxes
    list.innerHTML = state.tasks.chores.map(function(chore, i) {
      var done = ds.tasksCompleted[i];
      return '<label class="task-item ' + (done ? 'task-done' : '') + '">' +
        '<input type="checkbox" class="task-check" data-index="' + i + '"' +
        (done ? ' checked disabled' : '') + '>' +
        '<span class="task-text">' + chore + '</span></label>';
    }).join('');

    // Quiz buttons
    var mathBtn = document.getElementById('btn-math-quiz');
    var encBtn = document.getElementById('btn-encyclopedia-quiz');

    if (ds.quizMathCompleted) {
      mathBtn.textContent = 'Math Done!';
      mathBtn.disabled = true;
    } else {
      mathBtn.textContent = 'Math Quiz';
      mathBtn.disabled = false;
    }

    if (ds.quizEncyclopediaCompleted) {
      encBtn.textContent = 'Encyclopedia Done!';
      encBtn.disabled = true;
    } else {
      encBtn.textContent = 'Encyclopedia Quiz';
      encBtn.disabled = false;
    }

    // Update reward display
    var n = s.tasksPerReward;
    document.getElementById('task-reward-text').textContent =
      'Every ' + n + ' tasks = Water, then Food';

    // Progress text
    var choresDone = ds.tasksCompleted.filter(Boolean).length;
    var credits = ds.totalTaskCredits || 0;
    var statusParts = [choresDone + ' tasks done', credits + ' credits'];
    if (ds.waterUnlocked) statusParts.push('Water unlocked');
    if (ds.foodUnlocked) statusParts.push('Food unlocked');
    statusParts.push('Food: ' + state.inventory.food);
    statusParts.push('Water: ' + state.inventory.water);
    document.getElementById('tasks-progress').textContent = statusParts.join(' | ');

    // Checkbox listeners
    list.querySelectorAll('.task-check').forEach(function(cb) {
      cb.addEventListener('change', function() {
        completeTask(parseInt(cb.dataset.index));
      });
    });

    // Quiz button listeners
    mathBtn.onclick = function() {
      Sound.click();
      App.showScreen('quiz');
      Quiz.start('math');
    };
    encBtn.onclick = function() {
      Sound.click();
      App.showScreen('quiz');
      Quiz.start('encyclopedia');
    };
  }

  function completeTask(index) {
    var state = Storage.load();
    if (state.dailyState.tasksCompleted[index]) return;

    state.dailyState.tasksCompleted[index] = true;
    Sound.click();
    Storage.save(state);

    addTaskCredit();
    render();
  }

  function addTaskCredit() {
    var state = Storage.load();
    var ds = state.dailyState;
    var n = state.settings.tasksPerReward;

    ds.totalTaskCredits = (ds.totalTaskCredits || 0) + 1;

    // Check if water threshold reached (first N credits)
    if (!ds.waterUnlocked && ds.totalTaskCredits >= n) {
      ds.waterUnlocked = true;
      state.inventory.water++;
      Sound.coin();
      App.showToast('Water unlocked! +1 Water');
    }
    // Check if food threshold reached (next N credits = 2*N total)
    else if (ds.waterUnlocked && !ds.foodUnlocked && ds.totalTaskCredits >= n * 2) {
      ds.foodUnlocked = true;
      state.inventory.food++;
      Sound.coin();
      App.showToast('Food unlocked! +1 Food');
    }

    Storage.save(state);
  }

  function awardQuizComplete(quizType) {
    var state = Storage.load();
    if (quizType === 'math') {
      state.dailyState.quizMathCompleted = true;
    } else {
      state.dailyState.quizEncyclopediaCompleted = true;
    }
    Storage.save(state);

    if (quizType === 'math' && !state.dailyState.quizEncyclopediaCompleted) {
      App.showToast('Math quiz done! Try Encyclopedia quiz too!');
    } else if (quizType === 'encyclopedia' && !state.dailyState.quizMathCompleted) {
      App.showToast('Encyclopedia quiz done! Try Math quiz too!');
    } else {
      App.showToast('Both quizzes done!');
    }
  }

  function addQuizCorrectAnswer() {
    addTaskCredit();
  }

  return { render: render, awardQuizComplete: awardQuizComplete, addQuizCorrectAnswer: addQuizCorrectAnswer };
})();
