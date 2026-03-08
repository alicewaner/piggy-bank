// ============================================================
// tasks.js — Dynamic chores, incremental rewards, two quizzes
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
    document.getElementById('task-reward-text').textContent =
      'Every ' + s.tasksPerReward + ' tasks = +' + s.taskRewardFood + ' Food +' + s.taskRewardWater + ' Water';

    // Progress text
    var choresDone = ds.tasksCompleted.filter(Boolean).length;
    var quizDone = (ds.quizMathCompleted ? 1 : 0) + (ds.quizEncyclopediaCompleted ? 1 : 0);
    var capText = s.dailyRewardCap > 0 ? ' (cap: ' + s.dailyRewardCap + ')' : '';
    document.getElementById('tasks-progress').textContent =
      choresDone + ' tasks done | ' + ds.taskRewardsEarned + ' rewards earned' + capText +
      ' | Food: ' + state.inventory.food + ' | Water: ' + state.inventory.water;

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

    // Incremental rewards: every N tasks = 1 reward batch
    var choresDone = state.dailyState.tasksCompleted.filter(Boolean).length;
    var s = state.settings;
    var expectedRewards = Math.floor(choresDone / s.tasksPerReward);
    var newRewards = expectedRewards - state.dailyState.taskRewardsEarned;

    if (newRewards > 0) {
      // Check daily cap
      if (s.dailyRewardCap > 0) {
        var canEarn = s.dailyRewardCap - state.dailyState.taskRewardsEarned;
        newRewards = Math.min(newRewards, canEarn);
      }
      if (newRewards > 0) {
        var foodGain = newRewards * s.taskRewardFood;
        var waterGain = newRewards * s.taskRewardWater;
        state.inventory.food += foodGain;
        state.inventory.water += waterGain;
        state.dailyState.foodEarned += foodGain;
        state.dailyState.waterEarned += waterGain;
        state.dailyState.taskRewardsEarned += newRewards;
        Sound.coin();
        App.showToast('Reward! +' + foodGain + ' Food +' + waterGain + ' Water!');
      }
    }

    Storage.save(state);
    render();
  }

  function awardQuizComplete(quizType) {
    var state = Storage.load();
    if (quizType === 'math') {
      state.dailyState.quizMathCompleted = true;
    } else {
      state.dailyState.quizEncyclopediaCompleted = true;
    }

    // Award quiz reward when BOTH quizzes are completed
    if (state.dailyState.quizMathCompleted && state.dailyState.quizEncyclopediaCompleted && !state.dailyState.quizRewardEarned) {
      state.dailyState.quizRewardEarned = true;
      var foodGain = state.settings.quizRewardFood;
      var waterGain = state.settings.quizRewardWater;
      state.inventory.food += foodGain;
      state.inventory.water += waterGain;
      state.dailyState.foodEarned += foodGain;
      state.dailyState.waterEarned += waterGain;
      Storage.save(state);
      App.showToast('Both quizzes done! +' + foodGain + ' Food +' + waterGain + ' Water!');
    } else {
      Storage.save(state);
      if (quizType === 'math' && !state.dailyState.quizEncyclopediaCompleted) {
        App.showToast('Math quiz done! Complete Encyclopedia quiz for bonus!');
      } else if (quizType === 'encyclopedia' && !state.dailyState.quizMathCompleted) {
        App.showToast('Encyclopedia quiz done! Complete Math quiz for bonus!');
      }
    }
  }

  return { render: render, awardQuizComplete: awardQuizComplete };
})();
