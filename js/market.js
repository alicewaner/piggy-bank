// ============================================================
// market.js — Buy/sell animals with configurable prices
// ============================================================

var Market = (function() {

  function render() {
    var state = Storage.load();
    var buyPrice = state.settings.buyBabyPrice;
    var sellPrice = state.settings.sellAdultPrice;

    document.getElementById('market-balance').textContent = formatMoney(state.wallet.balance);

    // Buy grid
    var buyGrid = document.getElementById('market-buy-grid');
    buyGrid.innerHTML = ANIMAL_TYPES.map(function(type) {
      var canAfford = state.wallet.balance >= buyPrice;
      return '<div class="market-item">' +
        '<div class="sprite-wrap"><div class="pixel-art ' + type + '-baby idle-bounce"></div></div>' +
        '<div class="market-item-name">Baby ' + ANIMAL_NAMES[type].singular + '</div>' +
        '<div class="market-item-price">' + formatMoney(buyPrice) + '</div>' +
        '<button class="btn btn-primary btn-small buy-btn" data-type="' + type + '"' +
        (canAfford ? '' : ' disabled') + '>Buy</button></div>';
    }).join('');

    buyGrid.querySelectorAll('.buy-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { buyAnimal(btn.dataset.type); });
    });

    // Sell grid
    var sellGrid = document.getElementById('market-sell-grid');
    var adults = state.animals.filter(function(a) { return a.alive && a.stage === 'adult'; });
    if (adults.length === 0) {
      sellGrid.innerHTML = '<p class="empty-msg">No adult animals to sell.</p>';
    } else {
      sellGrid.innerHTML = adults.map(function(a) {
        var name = a.name || ANIMAL_NAMES[a.type].singular;
        return '<div class="market-item">' +
          '<div class="sprite-wrap"><div class="pixel-art ' + a.type + '-adult idle-bounce"></div></div>' +
          '<div class="market-item-name">' + name + '</div>' +
          '<div class="market-item-price">' + formatMoney(sellPrice) + '</div>' +
          '<button class="btn btn-accent btn-small sell-btn" data-id="' + a.id + '">Sell</button></div>';
      }).join('');

      sellGrid.querySelectorAll('.sell-btn').forEach(function(btn) {
        btn.addEventListener('click', function() { sellAnimal(parseInt(btn.dataset.id)); });
      });
    }

    // Update section headers with current prices
    document.getElementById('buy-price-label').textContent = 'Buy a Baby Animal - ' + formatMoney(buyPrice);
    document.getElementById('sell-price-label').textContent = 'Sell an Adult Animal - ' + formatMoney(sellPrice);
  }

  function buyAnimal(type) {
    var state = Storage.load();
    var price = state.settings.buyBabyPrice;
    if (state.wallet.balance < price) {
      App.showToast('Not enough money!');
      return;
    }

    Wallet.addTransaction('withdraw', price, 'Bought baby ' + ANIMAL_NAMES[type].singular);
    createAnimal(type, false);
    Sound.buy();
    App.showToast('You got a baby ' + ANIMAL_NAMES[type].singular + '!');
    render();
  }

  function sellAnimal(id) {
    var state = Storage.load();
    var animal = state.animals.find(function(a) { return a.id === id; });
    if (!animal || !animal.alive || animal.stage !== 'adult') return;

    var price = state.settings.sellAdultPrice;
    var name = animal.name || ANIMAL_NAMES[animal.type].singular;
    if (!confirm('Sell ' + name + ' for ' + formatMoney(price) + '?')) return;

    animal.alive = false;
    state.stats.totalAnimalsRaised++;
    state.stats.totalMoneyEarned += price;
    Storage.save(state);

    Wallet.addTransaction('deposit', price, 'Sold ' + name);
    Sound.sell();
    App.showToast('Sold ' + name + ' for ' + formatMoney(price) + '!');
    render();
  }

  return { render: render };
})();
