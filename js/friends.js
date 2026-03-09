// ============================================================
// friends.js — Friends system: add, accept, decline, view stable, chat
// ============================================================

const Friends = (() => {
  let unsubPending = null;
  let unsubFriends = null;

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
        container.innerHTML = '<p class="empty-msg">Could not load friends.</p>';
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
        App.showToast('Could not send request.');
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

    header.textContent = name + "'s Stable";
    grid.innerHTML = '<p class="empty-msg">Loading...</p>';

    App.showScreen('friend-stable');

    db.collection('users').doc(uid).get().then(function(doc) {
      if (!doc.exists || !doc.data().gameState) {
        grid.innerHTML = '<p class="empty-msg">Could not load stable.</p>';
        return;
      }
      var state = doc.data().gameState;
      var alive = (state.animals || []).filter(function(a) { return a.alive; });

      var countEl = document.getElementById('friend-stable-count');
      if (countEl) countEl.textContent = alive.length + ' animal' + (alive.length !== 1 ? 's' : '');

      if (alive.length === 0) {
        grid.innerHTML = '<div class="empty-stable"><p>No animals yet!</p></div>';
        return;
      }

      grid.innerHTML = alive.map(function(animal) {
        var aName = animal.name || ANIMAL_NAMES[animal.type].singular;
        var heartPct = Math.round((animal.hearts / HEARTS.maxHearts) * 100);
        var cssClass = animal.type + '-' + animal.stage;
        var statusIcons = '';
        if (animal.isBred) statusIcons += '<span class="bred-badge">Bred</span>';

        return '<div class="animal-card ' + (animal.stage === 'adult' ? 'adult-card' : '') + '">' +
          '<div class="sprite-wrap"><div class="pixel-art ' + cssClass + ' idle-bounce"></div></div>' +
          '<div class="animal-info">' +
          '<div class="animal-name">' + escapeHtml(aName) + '</div>' +
          '<div class="heart-bar"><div class="heart-fill" style="width:' + heartPct + '%"></div>' +
          '<span class="heart-text">' + animal.hearts + '/' + HEARTS.maxHearts + '</span></div>' +
          '<div class="animal-status">' + statusIcons + '</div>' +
          '</div></div>';
      }).join('');
    }).catch(function(err) {
      console.error('Load friend stable error:', err);
      grid.innerHTML = '<p class="empty-msg">Could not load stable.</p>';
    });
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
    if (unsubPending) { unsubPending(); unsubPending = null; }
    if (unsubFriends) { unsubFriends(); unsubFriends = null; }
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
              '<button class="btn btn-primary btn-small btn-view-stable" data-uid="' + friendUid + '" data-name="' + escapeHtml(friendName || 'Player') + '">View Stable</button>' +
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
