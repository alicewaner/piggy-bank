// ============================================================
// stable.js — My Stable screen
// Hearts: water(1) + food(1) + happy auto(1) = max 3/day
// ============================================================

var Stable = (function() {
  var selectedAnimalId = null;

  function dailyHeartsHTML(animal) {
    var hasWater = !!animal.wateredToday;
    var hasFood = !!animal.fedToday;
    var hasHappy = animal.happyHeartToday && !animal.happyHeartRemoved;
    return '<div class="daily-hearts">' +
      '<span class="heart-icon ' + (hasWater ? 'heart-icon-water' : 'heart-icon-empty') + '" title="Water">&#9829;</span>' +
      '<span class="heart-icon ' + (hasFood ? 'heart-icon-food' : 'heart-icon-empty') + '" title="Food">&#9829;</span>' +
      '<span class="heart-icon ' + (hasHappy ? 'heart-icon-happy' : 'heart-icon-empty') + '" title="Happy">&#9829;</span>' +
      '</div>';
  }

  function maturityHTML(animal) {
    if (animal.stage === 'adult') {
      return '<div class="maturity-bar"><div class="maturity-fill" style="width:100%"></div>' +
        '<span class="maturity-text">Grown up!</span></div>';
    }
    var pct = Math.round((animal.hearts / HEARTS.maxHearts) * 100);
    return '<div class="maturity-bar"><div class="maturity-fill" style="width:' + pct + '%"></div>' +
      '<span class="maturity-text">' + animal.hearts + '/' + HEARTS.maxHearts + '</span></div>';
  }

  function render() {
    var state = Storage.load();
    var grid = document.getElementById('stable-grid');
    var alive = state.animals.filter(function(a) { return a.alive; });

    document.getElementById('food-count').textContent = 'Food: ' + state.inventory.food;
    document.getElementById('water-count').textContent = 'Water: ' + state.inventory.water;

    if (alive.length === 0) {
      grid.innerHTML = '<div class="empty-stable">' +
        '<p>No animals yet!</p><p>Visit the Market to buy your first baby animal.</p></div>';
      return;
    }

    grid.innerHTML = alive.map(function(animal) {
      var name = animal.name || ANIMAL_NAMES[animal.type].singular;
      var cssClass = animal.type + '-' + animal.stage;
      var mood = animal.mood || 'happy';
      var statusIcons = '';
      var moodClass = mood === 'happy' ? 'mood-happy' : 'mood-sad';
      statusIcons += '<span class="mood-badge ' + moodClass + '">' + (mood === 'happy' ? 'Happy' : 'Sad') + '</span>';
      if (animal.isBred) statusIcons += '<span class="bred-badge">Bred</span>';

      return '<div class="animal-card ' + (animal.stage === 'adult' ? 'adult-card' : '') + '" data-id="' + animal.id + '">' +
        '<div class="sprite-wrap"><div class="pixel-art ' + cssClass + ' idle-bounce"></div></div>' +
        '<div class="animal-info">' +
        '<div class="animal-name">' + name + '</div>' +
        dailyHeartsHTML(animal) +
        maturityHTML(animal) +
        '<div class="animal-status">' + statusIcons + '</div>' +
        '</div></div>';
    }).join('');

    grid.querySelectorAll('.animal-card').forEach(function(card) {
      card.addEventListener('click', function() {
        Sound.click();
        openAnimalModal(parseInt(card.dataset.id));
      });
    });
  }

  function openAnimalModal(animalId) {
    var state = Storage.load();
    var animal = state.animals.find(function(a) { return a.id === animalId; });
    if (!animal || !animal.alive) return;

    selectedAnimalId = animalId;
    var modal = document.getElementById('animal-modal');
    var name = animal.name || ANIMAL_NAMES[animal.type].singular;
    var cssClass = animal.type + '-' + animal.stage;
    var mood = animal.mood || 'happy';

    document.getElementById('modal-animal-art').innerHTML =
      '<div class="pixel-art ' + cssClass + ' idle-bounce"></div>';
    document.getElementById('modal-animal-name').textContent = name;
    document.getElementById('modal-name-input').value = animal.name;

    // Daily hearts display (3 icons)
    var heartsHTML = dailyHeartsHTML(animal);
    var labels = '<div class="daily-hearts-labels">' +
      '<span>Water</span><span>Food</span><span>Happy</span></div>';
    heartsHTML += labels;

    // Maturity progress
    heartsHTML += maturityHTML(animal);

    document.getElementById('modal-hearts').innerHTML = heartsHTML;

    // Stage display
    document.getElementById('modal-stage').textContent =
      animal.stage === 'adult' ? 'ADULT - Ready to sell or breed!' : 'Baby - Keep feeding to grow!';

    // Mood toggle button
    var btnMood = document.getElementById('btn-mood-toggle');
    var moodPinArea = document.getElementById('mood-pin-area');
    var moodClass = mood === 'happy' ? 'mood-happy' : 'mood-sad';
    btnMood.textContent = 'Mood: ' + (mood === 'happy' ? 'Happy' : 'Sad');
    btnMood.className = 'btn btn-small mood-badge ' + moodClass;
    moodPinArea.style.display = 'none';
    document.getElementById('mood-pin-input').value = '';
    document.getElementById('mood-pin-error').style.display = 'none';

    btnMood.onclick = function() {
      Sound.click();
      moodPinArea.style.display = '';
      document.getElementById('mood-pin-input').focus();
    };

    document.getElementById('btn-mood-pin-ok').onclick = function() {
      var pin = document.getElementById('mood-pin-input').value;
      var s = Storage.load();
      if (pin === s.parentPassword) {
        var a = s.animals.find(function(x) { return x.id === animalId; });
        if (a) {
          a.mood = (a.mood || 'happy') === 'happy' ? 'sad' : 'happy';
          Storage.save(s);
          Sound.click();
          App.showToast('Mood set to ' + a.mood + '!');
          moodPinArea.style.display = 'none';
          openAnimalModal(animalId);
          render();
        }
      } else {
        document.getElementById('mood-pin-error').style.display = '';
        Sound.wrong();
      }
    };

    document.getElementById('btn-mood-pin-cancel').onclick = function() {
      moodPinArea.style.display = 'none';
      document.getElementById('mood-pin-input').value = '';
      document.getElementById('mood-pin-error').style.display = 'none';
    };

    // Feed buttons — separate water and food
    var btnFeedWater = document.getElementById('btn-feed-water');
    var btnFeedFood = document.getElementById('btn-feed-food');

    var canWater = state.inventory.water >= 1 && !animal.wateredToday;
    var canFood = state.inventory.food >= 1 && !animal.fedToday;

    btnFeedWater.disabled = !canWater;
    btnFeedWater.textContent = animal.wateredToday ? 'Watered' : 'Feed Water';

    btnFeedFood.disabled = !canFood;
    btnFeedFood.textContent = animal.fedToday ? 'Fed' : 'Feed Food';

    // Status warnings
    var status = '';
    if (animal.daysWithoutFood > 0) {
      status += '<p class="warning">Hungry! ' + animal.daysWithoutFood + ' day(s) without food!</p>';
    }
    if (animal.daysWithoutWater > 0) {
      status += '<p class="warning">Thirsty! ' + animal.daysWithoutWater + ' day(s) without water!</p>';
    }
    document.getElementById('modal-status').innerHTML = status;

    modal.style.display = 'flex';

    btnFeedWater.onclick = function() { feedWater(animalId); };
    btnFeedFood.onclick = function() { feedFood(animalId); };
    document.getElementById('btn-save-name').onclick = function() { saveName(animalId); };
  }

  function feedWater(id) {
    var state = Storage.load();
    var animal = state.animals.find(function(a) { return a.id === id; });
    if (!animal || animal.wateredToday || state.inventory.water < 1) return;

    state.inventory.water--;
    animal.wateredToday = true;
    animal.daysWithoutWater = 0;

    giveHeart(animal);
    checkHappy(animal);

    Storage.save(state);
    Sound.feed();
    App.showToast((animal.name || ANIMAL_NAMES[animal.type].singular) + ' drank water!');
    openAnimalModal(id);
    render();
  }

  function feedFood(id) {
    var state = Storage.load();
    var animal = state.animals.find(function(a) { return a.id === id; });
    if (!animal || animal.fedToday || state.inventory.food < 1) return;

    state.inventory.food--;
    animal.fedToday = true;
    animal.daysWithoutFood = 0;

    giveHeart(animal);
    checkHappy(animal);

    Storage.save(state);
    Sound.feed();
    App.showToast((animal.name || ANIMAL_NAMES[animal.type].singular) + ' ate food!');
    openAnimalModal(id);
    render();
  }

  function checkHappy(animal) {
    if (animal.wateredToday && animal.fedToday) {
      var mood = animal.mood || 'happy';
      if (mood === 'happy' && !animal.happyHeartToday) {
        animal.happyHeartToday = true;
        animal.happyHeartRemoved = false;
        giveHeart(animal);
        Sound.heart();
      }
    }
  }

  function giveHeart(animal) {
    var maxDay = animal.isBred ? HEARTS.maxPerDayBred : HEARTS.maxPerDayBought;
    if (animal.heartsToday < maxDay && animal.hearts < HEARTS.maxHearts) {
      animal.hearts++;
      animal.heartsToday++;
      if (animal.hearts >= HEARTS.adultThreshold && animal.stage === 'baby') {
        animal.stage = 'adult';
        Sound.heart();
        App.showToast((animal.name || ANIMAL_NAMES[animal.type].singular) + ' grew into an adult!');
      }
    }
  }

  // Called by parent to remove happy heart
  function removeHappyHeart(animalId) {
    var state = Storage.load();
    var animal = state.animals.find(function(a) { return a.id === animalId; });
    if (!animal || !animal.happyHeartToday || animal.happyHeartRemoved) return;

    animal.happyHeartRemoved = true;
    if (animal.hearts > 0) {
      animal.hearts--;
      animal.heartsToday--;
      if (animal.hearts < HEARTS.adultThreshold) {
        animal.stage = 'baby';
      }
    }
    Storage.save(state);
  }

  function saveName(id) {
    var state = Storage.load();
    var animal = state.animals.find(function(a) { return a.id === id; });
    if (!animal) return;
    var input = document.getElementById('modal-name-input');
    animal.name = input.value.trim().slice(0, 16);
    Storage.save(state);
    Sound.click();
    App.showToast('Named: ' + animal.name);
    openAnimalModal(id);
    render();
  }

  return { render: render, openAnimalModal: openAnimalModal, removeHappyHeart: removeHappyHeart, giveHeart: giveHeart };
})();
