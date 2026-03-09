// ============================================================
// stable.js — My Stable screen
// Hearts: combined feed (1 food + 1 water = 1 heart), max 2/day
// 3rd heart auto if mood === 'happy' after 2nd feed
// ============================================================

var Stable = (function() {
  var selectedAnimalId = null;

  function render() {
    var state = Storage.load();
    var grid = document.getElementById('stable-grid');
    var alive = state.animals.filter(function(a) { return a.alive; });

    document.getElementById('food-count').textContent = 'Food: ' + state.inventory.food;
    document.getElementById('water-count').textContent = 'Water: ' + state.inventory.water;
    document.getElementById('points-count').textContent = 'Points: ' + (state.inventory.points || 0);

    if (alive.length === 0) {
      grid.innerHTML = '<div class="empty-stable">' +
        '<p>No animals yet!</p><p>Visit the Market to buy your first baby animal.</p></div>';
      return;
    }

    grid.innerHTML = alive.map(function(animal) {
      var name = animal.name || ANIMAL_NAMES[animal.type].singular;
      var heartPct = Math.round((animal.hearts / HEARTS.maxHearts) * 100);
      var cssClass = animal.type + '-' + animal.stage;
      var fc = animal.feedCount || 0;
      var mood = animal.mood || 'happy';
      var statusIcons = '';
      if (fc > 0) statusIcons += '<span class="status-fed">Fed ' + fc + '/2</span>';
      var moodClass = mood === 'happy' ? 'mood-happy' : 'mood-sad';
      statusIcons += '<span class="mood-badge ' + moodClass + '">' + (mood === 'happy' ? 'Happy' : 'Sad') + '</span>';
      if (animal.isBred) statusIcons += '<span class="bred-badge">Bred</span>';

      return '<div class="animal-card ' + (animal.stage === 'adult' ? 'adult-card' : '') + '" data-id="' + animal.id + '">' +
        '<div class="sprite-wrap"><div class="pixel-art ' + cssClass + ' idle-bounce"></div></div>' +
        '<div class="animal-info">' +
        '<div class="animal-name">' + name + '</div>' +
        '<div class="heart-bar"><div class="heart-fill" style="width:' + heartPct + '%"></div>' +
        '<span class="heart-text">' + animal.hearts + '/' + HEARTS.maxHearts + '</span></div>' +
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
    var fc = animal.feedCount || 0;
    var mood = animal.mood || 'happy';

    document.getElementById('modal-animal-art').innerHTML =
      '<div class="pixel-art ' + cssClass + ' idle-bounce"></div>';
    document.getElementById('modal-animal-name').textContent = name;
    document.getElementById('modal-name-input').value = animal.name;

    // Hearts display
    var heartsHTML = '';
    for (var i = 0; i < HEARTS.maxHearts; i++) {
      heartsHTML += '<span class="heart ' + (i < animal.hearts ? 'heart-full' : 'heart-empty') + '">&#9829;</span>';
    }
    // Show today's heart breakdown
    var todayInfo = [];
    if (fc >= 1) todayInfo.push('Feed 1 +1');
    if (fc >= 2) todayInfo.push('Feed 2 +1');
    if (animal.happyHeartToday && !animal.happyHeartRemoved) todayInfo.push('Happy +1');
    if (animal.happyHeartRemoved) todayInfo.push('Happy removed');
    heartsHTML += '<div class="hearts-today">Today: ' + (todayInfo.length ? todayInfo.join(', ') : 'none yet') + '</div>';
    document.getElementById('modal-hearts').innerHTML = heartsHTML;

    // Stage display (no mood here — moved to mood button)
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

    // Combined Feed button (replaces separate feed/water)
    var btnFeed = document.getElementById('btn-feed');
    var btnWater = document.getElementById('btn-water');
    // Hide the water button, repurpose feed button
    btnWater.style.display = 'none';

    var canFeed = state.inventory.food >= 1 && state.inventory.water >= 1 && fc < 2;
    btnFeed.disabled = !canFeed;
    if (fc >= 2) {
      btnFeed.textContent = 'Fed 2/2';
    } else {
      btnFeed.textContent = 'Feed ' + fc + '/2 (1 food + 1 water)';
    }

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

    btnFeed.onclick = function() { feedAnimal(animalId); };
    document.getElementById('btn-save-name').onclick = function() { saveName(animalId); };
  }

  function feedAnimal(id) {
    var state = Storage.load();
    var animal = state.animals.find(function(a) { return a.id === id; });
    if (!animal) return;
    var fc = animal.feedCount || 0;
    if (fc >= 2 || state.inventory.food < 1 || state.inventory.water < 1) return;

    // Consume 1 food + 1 water
    state.inventory.food--;
    state.inventory.water--;
    animal.feedCount = fc + 1;

    // Mark fed/watered for death tracking
    animal.fedToday = true;
    animal.wateredToday = true;
    animal.daysWithoutFood = 0;
    animal.daysWithoutWater = 0;

    // Give 1 heart
    giveHeart(animal);

    // After 2nd feed: check mood for auto 3rd heart
    if (animal.feedCount >= 2) {
      var mood = animal.mood || 'happy';
      if (mood === 'happy' && !animal.happyHeartToday) {
        animal.happyHeartToday = true;
        animal.happyHeartRemoved = false;
        giveHeart(animal);
        Sound.heart();
      }
    }

    Storage.save(state);
    Sound.feed();
    App.showToast((animal.name || ANIMAL_NAMES[animal.type].singular) + ' enjoyed the meal!');
    openAnimalModal(id);
    render();
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
    // Take back the heart
    if (animal.hearts > 0) {
      animal.hearts--;
      animal.heartsToday--;
      // Check if we need to revert adult stage
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
