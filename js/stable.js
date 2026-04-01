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

    var pcEl = document.getElementById('pc-balance');
    if (pcEl) {
      pcEl.textContent = formatPC(state.piggyCoins);
      pcEl.onclick = function() { Sound.click(); openPCModal(); };
    }

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

    // Status warnings — runaway risk
    var status = '';
    if (animal.daysWithoutFood > 0) {
      status += '<p class="warning">Hungry! ' + animal.daysWithoutFood + ' day(s) without food!</p>';
    }
    if (animal.daysWithoutWater > 0) {
      status += '<p class="warning">Thirsty! ' + animal.daysWithoutWater + ' day(s) without water!</p>';
    }
    if (animal.daysWithoutFood >= 1 && animal.daysWithoutWater >= 1) {
      status += '<p class="warning" style="color:#DC2626;font-weight:700;">Might run away tomorrow if not fed!</p>';
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

  // ---- Piggy Coin Modal ----

  function openPCModal() {
    var state = Storage.load();
    var rate = state.settings.exchangeRate || 1;

    // Create or reuse modal
    var modal = document.getElementById('pc-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'pc-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = '<div class="modal-box pc-modal-box">' +
      '<h3>Piggy Coin Wallet</h3>' +
      '<div class="pc-balance-big">' + formatPC(state.piggyCoins) + '</div>' +
      '<div class="pc-stats">' +
        '<div class="pc-stat-row"><span>Total spent buying animals</span><span>' + formatPC(state.stats.totalPCSpentOnAnimals) + '</span></div>' +
        '<div class="pc-stat-row"><span>Total earned selling animals</span><span>' + formatPC(state.stats.totalPCEarnedFromAnimals) + '</span></div>' +
        '<div class="pc-stat-row pc-rate-row"><span>Exchange rate</span><span>' + rate + ' PC = $1.00</span></div>' +
      '</div>' +
      '<div class="pc-transfer">' +
        '<h4>PC → Bank</h4>' +
        '<div class="pc-transfer-row">' +
          '<input type="number" id="pc-transfer-amount" class="amount-input" placeholder="PC amount" min="0.01" step="0.01">' +
          '<button class="btn btn-primary btn-small" id="btn-pc-transfer">Transfer</button>' +
        '</div>' +
        '<p class="pc-transfer-hint">You will receive <span id="pc-transfer-preview">$0.00</span> in your bank.</p>' +
      '</div>' +
      '<div class="pc-transfer pc-transfer-reverse">' +
        '<h4>Bank → PC</h4>' +
        '<div class="pc-transfer-row">' +
          '<input type="number" id="pc-buy-amount" class="amount-input" placeholder="$ amount" min="0.01" step="0.01">' +
          '<button class="btn btn-accent btn-small" id="btn-pc-buy">Buy PC</button>' +
        '</div>' +
        '<p class="pc-transfer-hint">You will get <span id="pc-buy-preview">0.00 PC</span>. Bank: ' + formatMoney(state.wallet.balance) + '</p>' +
      '</div>' +
      '<button class="btn btn-secondary" id="btn-pc-close">Close</button>' +
    '</div>';

    modal.style.display = 'flex';

    // Preview calculation
    var input = document.getElementById('pc-transfer-amount');
    var preview = document.getElementById('pc-transfer-preview');
    input.addEventListener('input', function() {
      var pcAmount = Math.round(parseFloat(input.value) * 100) || 0;
      var cashAmount = Math.round(pcAmount / rate);
      preview.textContent = formatMoney(cashAmount);
    });

    // Transfer button
    document.getElementById('btn-pc-transfer').onclick = function() {
      var pcDollars = parseFloat(input.value);
      if (!pcDollars || pcDollars <= 0) {
        App.showToast('Enter a valid amount!');
        return;
      }
      var pcCents = Math.round(pcDollars * 100);
      var s = Storage.load();
      if (pcCents > s.piggyCoins) {
        App.showToast('Not enough Piggy Coins!');
        return;
      }
      var cashCents = Math.round(pcCents / (s.settings.exchangeRate || 1));
      s.piggyCoins -= pcCents;
      Storage.save(s);
      Wallet.addTransaction('deposit', cashCents, 'Transfer ' + formatPC(pcCents) + ' to cash', 'Transfer from Piggy Coin');
      Sound.coin();
      App.showToast('Transferred ' + formatPC(pcCents) + ' → ' + formatMoney(cashCents) + ' to bank!');
      modal.style.display = 'none';
      render();
    };

    // Buy PC with cash
    var buyInput = document.getElementById('pc-buy-amount');
    var buyPreview = document.getElementById('pc-buy-preview');
    buyInput.addEventListener('input', function() {
      var cashAmount = Math.round(parseFloat(buyInput.value) * 100) || 0;
      var pcAmount = Math.round(cashAmount * rate);
      buyPreview.textContent = formatPC(pcAmount);
    });

    document.getElementById('btn-pc-buy').onclick = function() {
      var cashDollars = parseFloat(buyInput.value);
      if (!cashDollars || cashDollars <= 0) {
        App.showToast('Enter a valid amount!');
        return;
      }
      var cashCents = Math.round(cashDollars * 100);
      var s = Storage.load();
      if (cashCents > s.wallet.balance) {
        App.showToast('Not enough cash in bank!');
        return;
      }
      var pcCents = Math.round(cashCents * (s.settings.exchangeRate || 1));
      s.piggyCoins += pcCents;
      Storage.save(s);
      Wallet.addTransaction('withdraw', cashCents, 'Buy ' + formatPC(pcCents), 'Transfer to Piggy Coin');
      Sound.coin();
      App.showToast('Bought ' + formatPC(pcCents) + ' for ' + formatMoney(cashCents) + '!');
      modal.style.display = 'none';
      render();
    };

    // Close
    document.getElementById('btn-pc-close').onclick = function() {
      modal.style.display = 'none';
    };
    modal.addEventListener('click', function(e) {
      if (e.target === modal) modal.style.display = 'none';
    });
  }

  // ---- Stray / Runaway System ----

  function sendAnimalAway(animal, state) {
    var me = Friends.getCurrentUser();
    if (!me) return;

    // Pick recipient: prefer friends, then random user
    Friends.loadAccepted(me).then(function(friends) {
      var candidates = [];
      friends.forEach(function(fr) {
        var d = fr.data;
        var friendUid = d.fromUid === me.uid ? d.toUid : d.fromUid;
        var friendName = d.fromUid === me.uid ? d.toName : d.fromName;
        candidates.push({ uid: friendUid, name: friendName });
      });

      if (candidates.length > 0) {
        // Pick random friend
        var pick = candidates[Math.floor(Math.random() * candidates.length)];
        createStrayDoc(animal, me, pick);
        return;
      }

      // No friends — try random user
      CloudSync.loadAllUsers().then(function(users) {
        var others = users.filter(function(u) { return u.uid !== me.uid; });
        if (others.length === 0) return; // No one to send to
        var pick = others[Math.floor(Math.random() * others.length)];
        createStrayDoc(animal, me, { uid: pick.uid, name: pick.state.playerName || pick.profile.name || 'Player' });
      });
    });
  }

  function createStrayDoc(animal, owner, target) {
    // Clean copy of animal for stray doc
    var animalCopy = JSON.parse(JSON.stringify(animal));
    animalCopy.alive = true;
    animalCopy.ranAway = false;
    animalCopy.daysWithoutWater = 0;
    animalCopy.daysWithoutFood = 0;
    animalCopy.fedToday = false;
    animalCopy.wateredToday = false;
    animalCopy.heartsToday = 0;
    animalCopy.happyHeartToday = false;
    animalCopy.happyHeartRemoved = false;

    db.collection('strayAnimals').add({
      animal: animalCopy,
      ownerUid: owner.uid,
      ownerName: owner.name,
      targetUid: target.uid,
      targetName: target.name,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function(err) {
      console.error('Failed to create stray doc:', err);
    });
  }

  function loadStrays(callback) {
    var user = auth.currentUser;
    if (!user) { callback([]); return; }

    db.collection('strayAnimals')
      .where('targetUid', '==', user.uid)
      .get()
      .then(function(snap) {
        var strays = [];
        snap.forEach(function(doc) {
          strays.push({ id: doc.id, data: doc.data() });
        });
        callback(strays);
      })
      .catch(function(err) {
        console.error('Load strays error:', err);
        callback([]);
      });
  }

  function renderStrays(container, strays) {
    if (strays.length === 0) return;

    var html = '<div class="stray-section">' +
      '<h3 class="stray-section-title">Stray Animals</h3>' +
      '<p class="stray-section-desc">These animals ran away from their owners and found your barn!</p>';

    html += strays.map(function(stray) {
      var animal = stray.data.animal;
      var aName = animal.name || ANIMAL_NAMES[animal.type].singular;
      var cssClass = animal.type + '-' + animal.stage;
      var ownerName = stray.data.ownerName || 'Someone';

      return '<div class="stray-card" data-stray-id="' + stray.id + '">' +
        '<div class="sprite-wrap"><div class="pixel-art ' + cssClass + ' idle-bounce"></div></div>' +
        '<div class="animal-info">' +
        '<div class="animal-name">' + aName + '</div>' +
        '<div class="stray-badge">From ' + ownerName + '</div>' +
        maturityHTML(animal) +
        '<div class="stray-actions">' +
        '<button class="btn btn-accent btn-small btn-adopt-stray" data-stray-id="' + stray.id + '">Adopt</button>' +
        '<button class="btn btn-secondary btn-small btn-send-home" data-stray-id="' + stray.id + '">Send Home</button>' +
        '</div></div></div>';
    }).join('');

    html += '</div>';
    container.insertAdjacentHTML('beforeend', html);

    // Bind buttons
    container.querySelectorAll('.btn-adopt-stray').forEach(function(btn) {
      btn.addEventListener('click', function() {
        Sound.click();
        adoptStray(btn.dataset.strayId);
      });
    });
    container.querySelectorAll('.btn-send-home').forEach(function(btn) {
      btn.addEventListener('click', function() {
        Sound.click();
        sendStrayHome(btn.dataset.strayId);
      });
    });
  }

  function adoptStray(strayDocId) {
    var state = Storage.load();
    var needed = state.settings.tasksPerReward;
    if (state.dailyState.totalTaskCredits < needed) {
      App.showToast('You need ' + needed + ' task credits to adopt a stray! (Have: ' + state.dailyState.totalTaskCredits + ')');
      return;
    }

    db.collection('strayAnimals').doc(strayDocId).get().then(function(doc) {
      if (!doc.exists) {
        App.showToast('Stray not found.');
        return;
      }
      var strayData = doc.data();
      var animal = strayData.animal;

      // Deduct task credits
      var s = Storage.load();
      s.dailyState.totalTaskCredits -= needed;

      // Add animal to my barn
      animal.id = s.nextAnimalId++;
      animal.isAdopted = true;
      animal.originalOwner = strayData.ownerUid;
      animal.alive = true;
      animal.ranAway = false;
      s.animals.push(animal);
      Storage.save(s);

      // Delete stray doc
      return db.collection('strayAnimals').doc(strayDocId).delete().then(function() {
        Sound.heart();
        var aName = animal.name || ANIMAL_NAMES[animal.type].singular;
        App.showToast('You adopted ' + aName + '!');
        render();
      });
    }).catch(function(err) {
      console.error('Adopt stray error:', err);
      App.showToast('Could not adopt stray.');
    });
  }

  function sendStrayHome(strayDocId) {
    db.collection('strayAnimals').doc(strayDocId).get().then(function(doc) {
      if (!doc.exists) {
        App.showToast('Stray not found.');
        return;
      }
      var strayData = doc.data();
      var animal = strayData.animal;
      var ownerUid = strayData.ownerUid;

      // Load owner's state from Firestore
      return db.collection('users').doc(ownerUid).get().then(function(userDoc) {
        if (!userDoc.exists || !userDoc.data().gameState) {
          App.showToast('Owner not found. Releasing animal.');
          return db.collection('strayAnimals').doc(strayDocId).delete();
        }

        var ownerState = userDoc.data().gameState;

        // Heart penalty
        animal.hearts = Math.max(0, animal.hearts - RUNAWAY.heartPenalty);
        if (animal.hearts < HEARTS.adultThreshold) {
          animal.stage = 'baby';
        }
        animal.daysWithoutWater = 0;
        animal.daysWithoutFood = 0;
        animal.ranAway = false;
        animal.alive = true;

        // Re-add to owner's animals
        ownerState.animals.push(animal);

        // Write owner state back
        return db.collection('users').doc(ownerUid).update({
          'gameState': ownerState
        }).then(function() {
          return db.collection('strayAnimals').doc(strayDocId).delete();
        }).then(function() {
          Sound.click();
          var aName = animal.name || ANIMAL_NAMES[animal.type].singular;
          App.showToast(aName + ' was sent home! (Lost ' + RUNAWAY.heartPenalty + ' hearts)');
          render();
        });
      });
    }).catch(function(err) {
      console.error('Send home error:', err);
      App.showToast('Could not send animal home.');
    });
  }

  // Load my lost animals (ones that ran away from me)
  function loadMyLostAnimals(callback) {
    var user = auth.currentUser;
    if (!user) { callback([]); return; }

    db.collection('strayAnimals')
      .where('ownerUid', '==', user.uid)
      .get()
      .then(function(snap) {
        var lost = [];
        snap.forEach(function(doc) {
          lost.push({ id: doc.id, data: doc.data() });
        });
        callback(lost);
      })
      .catch(function(err) {
        console.error('Load lost animals error:', err);
        callback([]);
      });
  }

  function renderLostAnimals(container, lost) {
    if (lost.length === 0) return;

    var html = '<div class="lost-section">' +
      '<h3 class="stray-section-title">Lost Animals</h3>' +
      '<p class="stray-section-desc">Your animals ran away and are staying with someone else.</p>';

    html += lost.map(function(item) {
      var animal = item.data.animal;
      var aName = animal.name || ANIMAL_NAMES[animal.type].singular;
      var cssClass = animal.type + '-' + animal.stage;
      var targetName = item.data.targetName || 'Someone';

      return '<div class="stray-card lost-card" data-lost-id="' + item.id + '">' +
        '<div class="sprite-wrap"><div class="pixel-art ' + cssClass + ' idle-bounce"></div></div>' +
        '<div class="animal-info">' +
        '<div class="animal-name">' + aName + '</div>' +
        '<div class="stray-badge" style="background:#f59e0b;color:#000;">At ' + targetName + '\'s barn</div>' +
        maturityHTML(animal) +
        '<div class="stray-actions">' +
        '<button class="btn btn-accent btn-small btn-recall" data-lost-id="' + item.id + '">Recall Home</button>' +
        '</div>' +
        '</div></div>';
    }).join('');

    html += '</div>';
    container.insertAdjacentHTML('beforeend', html);

    // Bind recall buttons
    container.querySelectorAll('.btn-recall').forEach(function(btn) {
      btn.addEventListener('click', function() {
        Sound.click();
        recallAnimal(btn.dataset.lostId);
      });
    });
  }

  function recallAnimal(strayDocId) {
    db.collection('strayAnimals').doc(strayDocId).get().then(function(doc) {
      if (!doc.exists) {
        App.showToast('Animal not found.');
        return;
      }
      var strayData = doc.data();
      var animal = strayData.animal;

      // Add animal back to my barn
      var state = Storage.load();
      animal.id = state.nextAnimalId++;
      animal.alive = true;
      animal.ranAway = false;
      animal.daysWithoutWater = 0;
      animal.daysWithoutFood = 0;
      state.animals.push(animal);
      Storage.save(state);

      // Delete stray doc
      return db.collection('strayAnimals').doc(strayDocId).delete().then(function() {
        Sound.heart();
        var aName = animal.name || ANIMAL_NAMES[animal.type].singular;
        App.showToast(aName + ' is back home!');
        render();
      });
    }).catch(function(err) {
      console.error('Recall animal error:', err);
      App.showToast('Could not recall animal.');
    });
  }

  // Updated render to include strays and lost animals
  var originalRender = render;
  render = function() {
    originalRender();
    var grid = document.getElementById('stable-grid');
    loadStrays(function(strays) {
      renderStrays(grid, strays);
    });
    loadMyLostAnimals(function(lost) {
      renderLostAnimals(grid, lost);
    });
  };

  return { render: render, openAnimalModal: openAnimalModal, removeHappyHeart: removeHappyHeart, giveHeart: giveHeart, sendAnimalAway: sendAnimalAway };
})();
