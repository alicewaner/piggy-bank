// ============================================================
// tasks.js — Daily chores checklist with configurable rewards
// ============================================================

var Tasks = (function() {

  function render() {
    var state = Storage.load();
    var ds = state.dailyState;
    var foodReward = state.settings.taskFoodReward;
    var waterReward = state.settings.taskWaterReward;
    var list = document.getElementById('tasks-list');

    list.innerHTML = state.tasks.chores.map(function(chore, i) {
      var done = ds.tasksCompleted[i];
      return '<label class="task-item ' + (done ? 'task-done' : '') + '">' +
        '<input type="checkbox" class="task-check" data-index="' + i + '"' +
        (done ? ' checked disabled' : '') + '>' +
        '<span class="task-text">' + chore + '</span></label>';
    }).join('');

    var quizBtn = document.getElementById('btn-take-quiz');
    if (ds.quizCompleted) {
      quizBtn.textContent = 'Quiz Done!';
      quizBtn.disabled = true;
    } else {
      quizBtn.textContent = 'Take Quiz (counts as a task!)';
      quizBtn.disabled = false;
    }

    // Update reward display
    document.getElementById('task-reward-text').textContent =
      'Earn: ' + foodReward + ' Food + ' + waterReward + ' Water';

    var completed = ds.tasksCompleted.filter(Boolean).length + (ds.quizCompleted ? 1 : 0);
    document.getElementById('tasks-progress').textContent =
      completed + '/5 done | Food: ' + state.inventory.food + ' | Water: ' + state.inventory.water;

    list.querySelectorAll('.task-check').forEach(function(cb) {
      cb.addEventListener('change', function() {
        completeTask(parseInt(cb.dataset.index));
      });
    });

    quizBtn.onclick = function() {
      Sound.click();
      App.showScreen('quiz');
      Quiz.start();
    };
  }

  function completeTask(index) {
    var state = Storage.load();
    if (state.dailyState.tasksCompleted[index]) return;

    state.dailyState.tasksCompleted[index] = true;
    Sound.click();

    // All 4 chores done → award resources
    var choresDone = state.dailyState.tasksCompleted.filter(Boolean).length;
    if (choresDone === 4 && state.dailyState.foodEarned === 0) {
      var foodReward = state.settings.taskFoodReward;
      var waterReward = state.settings.taskWaterReward;
      state.inventory.food += foodReward;
      state.inventory.water += waterReward;
      state.dailyState.foodEarned = foodReward;
      state.dailyState.waterEarned = waterReward;
      Sound.coin();
      App.showToast('All chores done! +' + foodReward + ' Food +' + waterReward + ' Water!');
    }

    Storage.save(state);
    render();
  }

  function awardQuizResources() {
    var state = Storage.load();
    if (!state.dailyState.quizCompleted) {
      state.dailyState.quizCompleted = true;
      state.inventory.food += 1;
      state.inventory.water += 1;
      Storage.save(state);
      App.showToast('Quiz done! +1 Food +1 Water!');
    }
  }

  return { render: render, awardQuizResources: awardQuizResources };
})();
