// ============================================================
// breeding.js — Breeding pen logic
// ============================================================

const Breeding = (() => {
  let selectingSlot = null; // 1 or 2

  function render() {
    const state = Storage.load();
    const pen = state.breedingPen;

    // Slot 1
    renderSlot(1, pen.parent1Id, state);
    // Slot 2
    renderSlot(2, pen.parent2Id, state);

    // Breeding button
    const breedBtn = document.getElementById('btn-breed');
    const statusEl = document.getElementById('breeding-status');

    if (pen.active) {
      breedBtn.style.display = 'none';
      statusEl.innerHTML = '<p class="breeding-active">Breeding in progress... Baby will arrive tomorrow!</p>';
    } else if (pen.parent1Id && pen.parent2Id) {
      breedBtn.style.display = '';
      breedBtn.onclick = startBreeding;
      statusEl.textContent = 'Both parents ready! Start breeding?';
    } else {
      breedBtn.style.display = 'none';
      statusEl.textContent = 'Select 2 adult animals to breed.';
    }

    // Adult selection list
    renderSelectList(state);
  }

  function renderSlot(num, animalId, state) {
    const slot = document.getElementById('breed-slot-' + num);
    if (animalId) {
      const animal = state.animals.find(a => a.id === animalId);
      if (animal && animal.alive) {
        const name = animal.name || ANIMAL_NAMES[animal.type].singular;
        slot.innerHTML = `
          <div class="pixel-art ${animal.type}-adult idle-bounce"></div>
          <p>${name}</p>
          <button class="btn btn-small btn-secondary remove-parent" data-slot="${num}">Remove</button>`;
        slot.querySelector('.remove-parent').addEventListener('click', () => {
          const s = Storage.load();
          if (num === 1) s.breedingPen.parent1Id = null;
          else s.breedingPen.parent2Id = null;
          Storage.save(s);
          Sound.click();
          render();
        });
        return;
      }
    }
    slot.innerHTML = `<p>Select Parent ${num}</p>
      <button class="btn btn-small btn-primary select-parent" data-slot="${num}">Choose</button>`;
    slot.querySelector('.select-parent').addEventListener('click', () => {
      selectingSlot = num;
      Sound.click();
      render();
    });
  }

  function renderSelectList(state) {
    const list = document.getElementById('breed-select-list');
    if (selectingSlot === null) {
      list.innerHTML = '';
      return;
    }

    const pen = state.breedingPen;
    const adults = state.animals.filter(a =>
      a.alive && a.stage === 'adult' &&
      a.id !== pen.parent1Id && a.id !== pen.parent2Id
    );

    if (adults.length === 0) {
      list.innerHTML = '<p class="empty-msg">No available adult animals. Raise some babies first!</p>';
      return;
    }

    list.innerHTML = '<h4>Choose an adult:</h4>' + adults.map(a => {
      const name = a.name || ANIMAL_NAMES[a.type].singular;
      return `<div class="breed-option" data-id="${a.id}">
        <div class="pixel-art ${a.type}-adult" ></div>
        <span>${name}</span>
      </div>`;
    }).join('');

    list.querySelectorAll('.breed-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const id = parseInt(opt.dataset.id);
        const s = Storage.load();
        if (selectingSlot === 1) s.breedingPen.parent1Id = id;
        else s.breedingPen.parent2Id = id;
        Storage.save(s);
        selectingSlot = null;
        Sound.click();
        render();
      });
    });
  }

  function startBreeding() {
    const state = Storage.load();
    state.breedingPen.active = true;
    state.breedingPen.startDate = todayString();
    Storage.save(state);
    Sound.breed();
    App.showToast('Breeding started! Check back tomorrow for your new baby!');
    render();
  }

  return { render };
})();
