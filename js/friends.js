// ============================================================
// friends.js — Friends system: add, accept, decline, view stable, chat
// ============================================================

const Friends = (() => {
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function getCurrentUser() {
    var user = auth.currentUser;
    if (!user) return null;
    return { uid: user.uid, name: user.displayName || 'Player' };
  }

  // ---- Render main friends screen ----

  function render() {
    var me = getCurrentUser();
    if (!me) return;

    var container = document.getElementById('friends-content');
    if (!container) return;

    container.innerHTML = '<p class="empty-msg">Loading...</p>';

    Promise.all([loadPending(me), loadAccepted(me), loadAllUsersForAdd(me)])
      .then(function(results) {
        var pending = results[0];
        var friends = results[1];
        var addable = results[2];
        renderFriendsScreen(container, me, pending, friends, addable);
      })
      .catch(function(err) {
        console.error('Friends load error:', err);
        container.innerHTML = '<p class="empty-msg">Could not load friends. ' + escapeHtml(err.message || '') + '</p>';
      });
  }

  function loadPending(me) {
    return db.collection('friendRequests')
      .where('toUid', '==', me.uid)
      .where('status', '==', 'pending')
      .get()
      .then(function(snap) {
        var results = [];
        snap.forEach(function(doc) {
          results.push({ id: doc.id, data: doc.data() });
        });
        return results;
      });
  }

  function loadAccepted(me) {
    // Need two queries: where I'm fromUid or toUid
    var q1 = db.collection('friendRequests')
      .where('fromUid', '==', me.uid)
      .where('status', '==', 'accepted')
      .get();
    var q2 = db.collection('friendRequests')
      .where('toUid', '==', me.uid)
      .where('status', '==', 'accepted')
      .get();

    return Promise.all([q1, q2]).then(function(snaps) {
      var results = [];
      var seen = {};
      snaps.forEach(function(snap) {
        snap.forEach(function(doc) {
          if (!seen[doc.id]) {
            seen[doc.id] = true;
            results.push({ id: doc.id, data: doc.data() });
          }
        });
      });
      return results;
    });
  }

  function loadAllUsersForAdd(me) {
    return CloudSync.loadAllUsers().then(function(users) {
      return users.filter(function(u) { return u.uid !== me.uid; });
    });
  }

  function bindFriendButtons(container) {
    container.querySelectorAll('.btn-accept-friend').forEach(function(btn) {
      btn.addEventListener('click', function() {
        Sound.click();
        acceptRequest(btn.dataset.id);
      });
    });

    container.querySelectorAll('.btn-decline-friend').forEach(function(btn) {
      btn.addEventListener('click', function() {
        Sound.click();
        declineRequest(btn.dataset.id);
      });
    });

    container.querySelectorAll('.btn-send-request').forEach(function(btn) {
      btn.addEventListener('click', function() {
        Sound.click();
        sendRequest(btn.dataset.uid, btn.dataset.name);
      });
    });

    container.querySelectorAll('.btn-view-stable').forEach(function(btn) {
      btn.addEventListener('click', function() {
        Sound.click();
        viewFriendStable(btn.dataset.uid, btn.dataset.name);
      });
    });

    container.querySelectorAll('.btn-chat-friend').forEach(function(btn) {
      btn.addEventListener('click', function() {
        Sound.click();
        chatWithFriend(btn.dataset.name);
      });
    });
  }

  // ---- Actions ----

  function sendRequest(toUid, toName) {
    var me = getCurrentUser();
    if (!me) return;

    // Check for existing request
    db.collection('friendRequests')
      .where('fromUid', '==', me.uid)
      .where('toUid', '==', toUid)
      .get()
      .then(function(snap) {
        if (!snap.empty) {
          App.showToast('Request already sent!');
          return;
        }
        return db.collection('friendRequests').add({
          fromUid: me.uid,
          fromName: me.name,
          toUid: toUid,
          toName: toName,
          status: 'pending',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function() {
          App.showToast('Friend request sent to ' + toName + '!');
          render();
        });
      })
      .catch(function(err) {
        console.error('Send request error:', err);
        App.showToast('Could not send request. ' + (err.message || ''));
      });
  }

  function acceptRequest(docId) {
    db.collection('friendRequests').doc(docId).update({
      status: 'accepted'
    }).then(function() {
      App.showToast('Friend request accepted!');
      Sound.heart();
      render();
    }).catch(function(err) {
      console.error('Accept error:', err);
      App.showToast('Could not accept request.');
    });
  }

  function declineRequest(docId) {
    db.collection('friendRequests').doc(docId).delete()
      .then(function() {
        App.showToast('Request declined.');
        render();
      }).catch(function(err) {
        console.error('Decline error:', err);
        App.showToast('Could not decline request.');
      });
  }

  // ---- View Friend's Stable ----

  function viewFriendStable(uid, name) {
    var header = document.getElementById('friend-stable-name');
    var grid = document.getElementById('friend-stable-grid');
    if (!header || !grid) return;

    header.textContent = name + "'s Barn";
    grid.innerHTML = '<p class="empty-msg">Loading...</p>';

    App.showScreen('friend-stable');

    db.collection('users').doc(uid).get().then(function(doc) {
      if (!doc.exists || !doc.data().gameState) {
        grid.innerHTML = '<p class="empty-msg">Could not load barn.</p>';
        return;
      }
      var friendState = doc.data().gameState;
      var alive = (friendState.animals || []).filter(function(a) { return a.alive; });
      var myState = Storage.load();

      var countEl = document.getElementById('friend-stable-count');
      if (countEl) countEl.textContent = alive.length + ' animal' + (alive.length !== 1 ? 's' : '');

      if (alive.length === 0) {
        grid.innerHTML = '<div class="empty-stable"><p>No animals yet!</p></div>';
        return;
      }

      grid.innerHTML = alive.map(function(animal) {
        var aName = animal.name || ANIMAL_NAMES[animal.type].singular;
        var cssClass = animal.type + '-' + animal.stage;
        var statusIcons = '';
        if (animal.isBred) statusIcons += '<span class="bred-badge">Bred</span>';

        // Daily hearts display
        var hasWater = !!animal.wateredToday;
        var hasFood = !!animal.fedToday;
        var hasHappy = animal.happyHeartToday && !animal.happyHeartRemoved;
        var dailyHearts = '<div class="daily-hearts">' +
          '<span class="heart-icon ' + (hasWater ? 'heart-icon-water' : 'heart-icon-empty') + '">&#9829;</span>' +
          '<span class="heart-icon ' + (hasFood ? 'heart-icon-food' : 'heart-icon-empty') + '">&#9829;</span>' +
          '<span class="heart-icon ' + (hasHappy ? 'heart-icon-happy' : 'heart-icon-empty') + '">&#9829;</span>' +
          '</div>';

        // Maturity bar
        var maturityBar;
        if (animal.stage === 'adult') {
          maturityBar = '<div class="maturity-bar"><div class="maturity-fill" style="width:100%"></div>' +
            '<span class="maturity-text">Grown up!</span></div>';
        } else {
          var pct = Math.round((animal.hearts / HEARTS.maxHearts) * 100);
          maturityBar = '<div class="maturity-bar"><div class="maturity-fill" style="width:' + pct + '%"></div>' +
            '<span class="maturity-text">' + animal.hearts + '/' + HEARTS.maxHearts + '</span></div>';
        }

        // Feed buttons — water and food separately
        var canWater = myState.inventory.water >= 1 && !animal.wateredToday;
        var canFood = myState.inventory.food >= 1 && !animal.fedToday;
        var feedBtns = '<div class="friend-feed-btns">' +
          '<button class="btn btn-accent btn-small btn-friend-water" data-animal-id="' + animal.id + '"' +
          (canWater ? '' : ' disabled') + '>' + (hasWater ? 'Watered' : 'Water') + '</button>' +
          '<button class="btn btn-accent btn-small btn-friend-food" data-animal-id="' + animal.id + '"' +
          (canFood ? '' : ' disabled') + '>' + (hasFood ? 'Fed' : 'Food') + '</button>' +
          '</div>';

        return '<div class="animal-card ' + (animal.stage === 'adult' ? 'adult-card' : '') + '">' +
          '<div class="sprite-wrap"><div class="pixel-art ' + cssClass + ' idle-bounce"></div></div>' +
          '<div class="animal-info">' +
          '<div class="animal-name">' + escapeHtml(aName) + '</div>' +
          dailyHearts + maturityBar +
          '<div class="animal-status">' + statusIcons + '</div>' +
          feedBtns +
          '</div></div>';
      }).join('');

      grid.querySelectorAll('.btn-friend-water').forEach(function(btn) {
        btn.addEventListener('click', function() {
          Sound.click();
          feedFriendWater(uid, parseInt(btn.dataset.animalId), name);
        });
      });
      grid.querySelectorAll('.btn-friend-food').forEach(function(btn) {
        btn.addEventListener('click', function() {
          Sound.click();
          feedFriendFood(uid, parseInt(btn.dataset.animalId), name);
        });
      });
    }).catch(function(err) {
      console.error('Load friend stable error:', err);
      grid.innerHTML = '<p class="empty-msg">Could not load barn.</p>';
    });
  }

  function feedFriendSupply(friendUid, animalId, friendName, type) {
    var myState = Storage.load();
    if (myState.inventory[type] < 1) {
      App.showToast('You need ' + type + ' to feed!');
      return;
    }

    db.collection('users').doc(friendUid).get().then(function(doc) {
      if (!doc.exists || !doc.data().gameState) {
        App.showToast('Could not load friend data.');
        return;
      }
      var friendState = doc.data().gameState;
      var animal = friendState.animals.find(function(a) { return a.id === animalId; });
      if (!animal || !animal.alive) {
        App.showToast('Animal not found.');
        return;
      }

      if (type === 'water' && animal.wateredToday) {
        App.showToast('Already watered today!');
        return;
      }
      if (type === 'food' && animal.fedToday) {
        App.showToast('Already fed today!');
        return;
      }

      // Update friend's animal
      if (type === 'water') {
        animal.wateredToday = true;
        animal.daysWithoutWater = 0;
      } else {
        animal.fedToday = true;
        animal.daysWithoutFood = 0;
      }

      // Give heart
      var maxDay = animal.isBred ? HEARTS.maxPerDayBred : HEARTS.maxPerDayBought;
      if ((animal.heartsToday || 0) < maxDay && animal.hearts < HEARTS.maxHearts) {
        animal.hearts++;
        animal.heartsToday = (animal.heartsToday || 0) + 1;
        if (animal.hearts >= HEARTS.adultThreshold && animal.stage === 'baby') {
          animal.stage = 'adult';
        }
      }

      // Check happy: both watered and fed + happy mood
      if (animal.wateredToday && animal.fedToday) {
        var mood = animal.mood || 'happy';
        if (mood === 'happy' && !animal.happyHeartToday) {
          animal.happyHeartToday = true;
          animal.happyHeartRemoved = false;
          if ((animal.heartsToday || 0) < maxDay && animal.hearts < HEARTS.maxHearts) {
            animal.hearts++;
            animal.heartsToday = (animal.heartsToday || 0) + 1;
            if (animal.hearts >= HEARTS.adultThreshold && animal.stage === 'baby') {
              animal.stage = 'adult';
            }
          }
        }
      }

      return db.collection('users').doc(friendUid).update({
        'gameState': friendState
      }).then(function() {
        var ms = Storage.load();
        ms.inventory[type]--;
        Storage.save(ms);

        if (typeof CloudSync !== 'undefined' && CloudSync.saveToCloud) {
          CloudSync.saveToCloud();
        }

        Sound.feed();
        var aName = animal.name || ANIMAL_NAMES[animal.type].singular;
        var action = type === 'water' ? 'gave water to' : 'fed';
        App.showToast('You ' + action + ' ' + friendName + "'s " + aName + '!');
        viewFriendStable(friendUid, friendName);
      });
    }).catch(function(err) {
      console.error('Feed friend animal error:', err);
      App.showToast('Could not feed animal. ' + (err.message || ''));
    });
  }

  function feedFriendWater(friendUid, animalId, friendName) {
    feedFriendSupply(friendUid, animalId, friendName, 'water');
  }

  function feedFriendFood(friendUid, animalId, friendName) {
    feedFriendSupply(friendUid, animalId, friendName, 'food');
  }

  // ---- Chat shortcut ----

  function chatWithFriend(name) {
    App.showScreen('chat');
    var input = document.getElementById('chat-input');
    if (input) {
      input.value = '@' + name + ' ';
      input.focus();
    }
  }

  // ---- Back button from friend stable ----

  function initListeners() {
    var backBtn = document.getElementById('btn-friend-stable-back');
    if (backBtn) {
      backBtn.addEventListener('click', function() {
        Sound.click();
        App.showScreen('friends');
      });
    }
  }

  function cleanup() {
    // Reserved for future subscription cleanup
  }

  // ---- Group Chat ----

  var groupSelectMode = false;
  var groupSelected = [];

  function toggleGroupSelect() {
    groupSelectMode = !groupSelectMode;
    groupSelected = [];
    render();
  }

  function handleGroupCheckbox(uid, name, checked) {
    if (checked) {
      if (groupSelected.length < 2) {
        groupSelected.push({ uid: uid, name: name });
      }
    } else {
      groupSelected = groupSelected.filter(function(s) { return s.uid !== uid; });
    }
  }

  function checkMutualFriendship(uidA, uidB) {
    var q1 = db.collection('friendRequests')
      .where('fromUid', '==', uidA)
      .where('toUid', '==', uidB)
      .where('status', '==', 'accepted')
      .get();
    var q2 = db.collection('friendRequests')
      .where('fromUid', '==', uidB)
      .where('toUid', '==', uidA)
      .where('status', '==', 'accepted')
      .get();
    return Promise.all([q1, q2]).then(function(snaps) {
      return !snaps[0].empty || !snaps[1].empty;
    });
  }

  function startGroupChat() {
    if (groupSelected.length !== 2) {
      App.showToast('Please select exactly 2 friends.');
      return;
    }
    var me = getCurrentUser();
    if (!me) return;

    var friendA = groupSelected[0];
    var friendB = groupSelected[1];

    // Validate all 3 are mutual friends (A-B must also be friends)
    checkMutualFriendship(friendA.uid, friendB.uid).then(function(areFriends) {
      if (!areFriends) {
        App.showToast(friendA.name + ' and ' + friendB.name + ' are not friends with each other!');
        return;
      }

      var uids = [me.uid, friendA.uid, friendB.uid].sort();
      var groupId = uids.join('_');
      var names = [me.name, friendA.name, friendB.name].sort().join(', ');

      groupSelectMode = false;
      groupSelected = [];

      Chat.setGroupFilter(groupId, names);
      App.showScreen('chat');
    }).catch(function(err) {
      console.error('Group chat validation error:', err);
      App.showToast('Could not verify friendships.');
    });
  }

  function renderFriendsScreen(container, me, pending, friends, addable) {
    var html = '';

    // Pending requests
    if (pending.length > 0) {
      html += '<div class="friends-section"><h3 class="friends-section-title">Pending Requests</h3>';
      pending.forEach(function(req) {
        html += '<div class="friend-request-card" data-id="' + req.id + '">' +
          '<span class="friend-req-name">' + escapeHtml(req.data.fromName || 'Player') + '</span>' +
          '<div class="friend-req-actions">' +
            '<button class="btn btn-accent btn-small btn-accept-friend" data-id="' + req.id + '">Accept</button>' +
            '<button class="btn btn-danger btn-small btn-decline-friend" data-id="' + req.id + '">Decline</button>' +
          '</div>' +
        '</div>';
      });
      html += '</div>';
    }

    // Friend list with optional group selection
    html += '<div class="friends-section"><h3 class="friends-section-title">My Friends</h3>';

    if (friends.length >= 2) {
      if (groupSelectMode) {
        html += '<div style="margin-bottom:8px;display:flex;gap:6px;">' +
          '<button class="btn btn-accent btn-small" id="btn-start-group-chat">Start Chat</button>' +
          '<button class="btn btn-secondary btn-small" id="btn-cancel-group">Cancel</button>' +
          '</div>';
      } else {
        html += '<button class="btn btn-primary btn-small" id="btn-group-chat" style="margin-bottom:8px;">Group Chat</button>';
      }
    }

    if (friends.length === 0) {
      html += '<p class="empty-msg">No friends yet. Add someone below!</p>';
    } else {
      friends.forEach(function(fr) {
        var d = fr.data;
        var friendUid = d.fromUid === me.uid ? d.toUid : d.fromUid;
        var friendName = d.fromUid === me.uid ? d.toName : d.fromName;
        if (groupSelectMode) {
          var checked = groupSelected.some(function(s) { return s.uid === friendUid; });
          html += '<div class="friend-card">' +
            '<label class="friend-checkbox-label">' +
              '<input type="checkbox" class="friend-group-check" data-uid="' + friendUid + '" data-name="' + escapeHtml(friendName || 'Player') + '"' + (checked ? ' checked' : '') + '>' +
              '<span class="friend-name">' + escapeHtml(friendName || 'Player') + '</span>' +
            '</label>' +
          '</div>';
        } else {
          html += '<div class="friend-card">' +
            '<span class="friend-name">' + escapeHtml(friendName || 'Player') + '</span>' +
            '<div class="friend-actions">' +
              '<button class="btn btn-primary btn-small btn-view-stable" data-uid="' + friendUid + '" data-name="' + escapeHtml(friendName || 'Player') + '">View Barn</button>' +
              '<button class="btn btn-accent btn-small btn-chat-friend" data-name="' + escapeHtml(friendName || 'Player') + '">Chat</button>' +
            '</div>' +
          '</div>';
        }
      });
    }
    html += '</div>';

    // Add friend section
    var friendUids = {};
    friends.forEach(function(fr) {
      var d = fr.data;
      friendUids[d.fromUid] = true;
      friendUids[d.toUid] = true;
    });
    html += '<div class="friends-section"><h3 class="friends-section-title">Add Friend</h3>';
    var filteredAddable = addable.filter(function(u) {
      return !friendUids[u.uid];
    });
    if (filteredAddable.length === 0) {
      html += '<p class="empty-msg">No new players to add.</p>';
    } else {
      filteredAddable.forEach(function(u) {
        var uName = u.state.playerName || u.profile.name || 'Player';
        html += '<div class="friend-add-row">' +
          '<span class="friend-add-name">' + escapeHtml(uName) + '</span>' +
          '<button class="btn btn-primary btn-small btn-send-request" data-uid="' + u.uid + '" data-name="' + escapeHtml(uName) + '">Add</button>' +
        '</div>';
      });
    }
    html += '</div>';

    container.innerHTML = html;
    bindFriendButtons(container);

    // Group chat buttons
    var groupBtn = document.getElementById('btn-group-chat');
    if (groupBtn) {
      groupBtn.addEventListener('click', function() {
        Sound.click();
        toggleGroupSelect();
      });
    }
    var cancelBtn = document.getElementById('btn-cancel-group');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function() {
        Sound.click();
        toggleGroupSelect();
      });
    }
    var startBtn = document.getElementById('btn-start-group-chat');
    if (startBtn) {
      startBtn.addEventListener('click', function() {
        Sound.click();
        startGroupChat();
      });
    }

    // Group checkboxes
    container.querySelectorAll('.friend-group-check').forEach(function(cb) {
      cb.addEventListener('change', function() {
        handleGroupCheckbox(cb.dataset.uid, cb.dataset.name, cb.checked);
        if (groupSelected.length > 2) {
          cb.checked = false;
          groupSelected = groupSelected.filter(function(s) { return s.uid !== cb.dataset.uid; });
          App.showToast('Pick exactly 2 friends.');
        }
      });
    });
  }

  return {
    render: render,
    initListeners: initListeners,
    cleanup: cleanup,
    sendRequest: sendRequest
  };
})();
