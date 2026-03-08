// ============================================================
// stable.js — My Stable screen
// Hearts: feed=1, water=1, both=auto happy heart (parent can remove)
// ============================================================

var Stable = (function() {
  var selectedAnimalId = null;

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
      var heartPct = Math.round((animal.hearts / HEARTS.maxHearts) * 100);
      var cssClass = animal.type + '-' + animal.stage;
      var statusIcons = '';
      if (animal.fedToday) statusIcons += '<span class="status-fed">Fed</span>';
      if (animal.wateredToday) statusIcons += '<span class="status-watered">Water</span>';
      if (animal.happyHeartToday && !animal.happyHeartRemoved) statusIcons += '<span class="bred-badge">Happy</span>';
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
    if (animal.fedToday) todayInfo.push('Fed +1');
    if (animal.wateredToday) todayInfo.push('Water +1');
    if (animal.happyHeartToday && !animal.happyHeartRemoved) todayInfo.push('Happy +1');
    if (animal.happyHeartRemoved) todayInfo.push('Happy removed');
    heartsHTML += '<div class="hearts-today">Today: ' + (todayInfo.length ? todayInfo.join(', ') : 'none yet') + '</div>';
    document.getElementById('modal-hearts').innerHTML = heartsHTML;

    document.getElementById('modal-stage').textContent =
      animal.stage === 'adult' ? 'ADULT - Ready to sell or breed!' : 'Baby - Keep feeding to grow!';

    // Feed/water buttons
    var btnFeed = document.getElementById('btn-feed');
    var btnWater = document.getElementById('btn-water');
    btnFeed.disabled = animal.fedToday || state.inventory.food <= 0;
    btnWater.disabled = animal.wateredToday || state.inventory.water <= 0;
    btnFeed.textContent = animal.fedToday ? 'Fed!' : 'Feed (' + state.inventory.food + ')';
    btnWater.textContent = animal.wateredToday ? 'Watered!' : 'Water (' + state.inventory.water + ')';

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
    btnWater.onclick = function() { waterAnimal(animalId); };
    document.getElementById('btn-save-name').onclick = function() { saveName(animalId); };
  }

  function feedAnimal(id) {
    var state = Storage.load();
    var animal = state.animals.find(function(a) { return a.id === id; });
    if (!animal || animal.fedToday || state.inventory.food <= 0) return;

    animal.fedToday = true;
    animal.daysWithoutFood = 0;
    state.inventory.food--;

    // Feed heart
    giveHeart(animal);

    // Check for happy heart (both fed and watered)
    checkHappyHeart(animal);

    Storage.save(state);
    Sound.feed();
    App.showToast((animal.name || ANIMAL_NAMES[animal.type].singular) + ' enjoyed the food!');
    openAnimalModal(id);
    render();
  }

  function waterAnimal(id) {
    var state = Storage.load();
    var animal = state.animals.find(function(a) { return a.id === id; });
    if (!animal || animal.wateredToday || state.inventory.water <= 0) return;

    animal.wateredToday = true;
    animal.daysWithoutWater = 0;
    state.inventory.water--;

    // Water heart
    giveHeart(animal);

    // Check for happy heart
    checkHappyHeart(animal);

    Storage.save(state);
    Sound.water();
    App.showToast((animal.name || ANIMAL_NAMES[animal.type].singular) + ' drank water!');
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

  // Auto happy heart when both fed and watered
  function checkHappyHeart(animal) {
    if (animal.fedToday && animal.wateredToday && !animal.happyHeartToday) {
      animal.happyHeartToday = true;
      animal.happyHeartRemoved = false;
      giveHeart(animal);
      Sound.heart();
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

  return { render: render, openAnimalModal: openAnimalModal, removeHappyHeart: removeHappyHeart };
})();
