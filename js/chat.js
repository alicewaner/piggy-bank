// ============================================================
// chat.js — Public & private chat via Firestore
// ============================================================

const Chat = (() => {
  let unsubscribe = null;
  let userList = [];
  let groupFilter = null;   // { groupId, groupNames }


  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatTime(ts) {
    if (!ts) return '';
    var d = ts.toDate ? ts.toDate() : new Date(ts);
    var h = d.getHours();
    var m = d.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
  }

  function getCurrentUser() {
    var user = auth.currentUser;
    if (!user) return null;
    return { uid: user.uid, name: user.displayName || 'Player' };
  }

  function loadUserList() {
    return CloudSync.loadAllUsers().then(function(users) {
      userList = users.map(function(u) {
        return {
          uid: u.uid,
          name: u.state.playerName || u.profile.name || 'Player'
        };
      });
      return userList;
    }).catch(function() {
      userList = [];
    });
  }

  function parsePrivateMessage(text) {
    if (text.charAt(0) !== '@') return null;
    // Match @Name followed by space then message
    for (var i = 0; i < userList.length; i++) {
      var name = userList[i].name;
      if (text.substring(1, 1 + name.length).toLowerCase() === name.toLowerCase() &&
          text.charAt(1 + name.length) === ' ') {
        return {
          recipientUid: userList[i].uid,
          recipientName: name,
          message: text.substring(2 + name.length)
        };
      }
    }
    return null;
  }

  function sendMessage() {
    var input = document.getElementById('chat-input');
    var text = (input.value || '').trim();
    if (!text) return;
    if (text.length > 200) {
      text = text.substring(0, 200);
    }

    var me = getCurrentUser();
    if (!me) return;

    var priv = parsePrivateMessage(text);

    var msg = {
      text: priv ? priv.message : text,
      senderUid: me.uid,
      senderName: me.name,
      recipientUid: priv ? priv.recipientUid : null,
      recipientName: priv ? priv.recipientName : null,
      groupId: groupFilter ? groupFilter.groupId : null,
      groupNames: groupFilter ? groupFilter.groupNames : null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection('messages').add(msg).then(function() {
      input.value = '';
    }).catch(function(err) {
      console.error('Send message error:', err);
      App.showToast('Could not send message.');
    });
  }

  function subscribe() {
    if (unsubscribe) unsubscribe();

    var me = getCurrentUser();
    if (!me) return;

    var query = db.collection('messages');
    if (groupFilter) {
      query = query.where('groupId', '==', groupFilter.groupId);
    }
    unsubscribe = query
      .orderBy('createdAt', 'desc')
      .limit(50)
      .onSnapshot(function(snapshot) {
        var messages = [];
        snapshot.forEach(function(doc) {
          messages.push(doc.data());
        });
        // Reverse to show oldest first
        messages.reverse();
        renderMessages(messages);
      }, function(err) {
        console.error('Chat subscribe error:', err);
      });
  }

  function renderMessages(messages) {
    var container = document.getElementById('chat-messages');
    if (!container) return;

    var me = getCurrentUser();
    if (!me) return;

    var html = '';
    messages.forEach(function(msg) {
      // Group mode: only show group messages for this group
      if (groupFilter) {
        if (msg.groupId !== groupFilter.groupId) return;
      } else {
        // Normal mode: skip group messages, filter private messages
        if (msg.groupId) return;
        if (msg.recipientUid && msg.senderUid !== me.uid && msg.recipientUid !== me.uid) {
          return;
        }
      }

      var isPrivate = !!msg.recipientUid;
      var isMine = msg.senderUid === me.uid;
      var rowClass = 'chat-msg';
      if (isPrivate) rowClass += ' chat-msg-private';
      if (isMine) rowClass += ' chat-msg-mine';

      var badge = isPrivate ? '<span class="chat-private-badge">Private</span>' : '';
      var recipientInfo = '';
      if (isPrivate) {
        var otherName = isMine ? msg.recipientName : msg.senderName;
        recipientInfo = '<span class="chat-recipient-info">' +
          (isMine ? 'to ' : 'from ') + escapeHtml(otherName || '') +
          '</span>';
      }

      html += '<div class="' + rowClass + '">' +
        '<div class="chat-msg-header">' +
          '<span class="chat-sender">' + escapeHtml(msg.senderName || 'Player') + '</span>' +
          badge + recipientInfo +
          '<span class="chat-time">' + formatTime(msg.createdAt) + '</span>' +
        '</div>' +
        '<div class="chat-msg-text">' + escapeHtml(msg.text || '') + '</div>' +
      '</div>';
    });

    if (!html) {
      html = '<p class="empty-msg">No messages yet. Say hello!</p>';
    }

    container.innerHTML = html;
    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  function setGroupFilter(groupId, groupNames) {
    groupFilter = { groupId: groupId, groupNames: groupNames };
    var banner = document.getElementById('group-chat-banner');
    if (banner) {
      banner.style.display = '';
      var nameEl = document.getElementById('group-chat-names');
      if (nameEl) nameEl.textContent = groupNames;
    }
    render();
  }

  function clearGroupFilter() {
    groupFilter = null;
    var banner = document.getElementById('group-chat-banner');
    if (banner) banner.style.display = 'none';
    render();
  }

  function render() {
    var banner = document.getElementById('group-chat-banner');
    if (banner) banner.style.display = groupFilter ? '' : 'none';
    loadUserList().then(function() {
      subscribe();
    });
  }

  function initListeners() {
    var sendBtn = document.getElementById('chat-send');
    if (sendBtn) {
      sendBtn.addEventListener('click', function() {
        Sound.click();
        sendMessage();
      });
    }

    var input = document.getElementById('chat-input');
    if (input) {
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          sendMessage();
        }
      });
    }

    var backBtn = document.getElementById('btn-group-chat-back');
    if (backBtn) {
      backBtn.addEventListener('click', function() {
        Sound.click();
        clearGroupFilter();
      });
    }
  }

  function cleanup() {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    userList = [];
    groupFilter = null;
    var container = document.getElementById('chat-messages');
    if (container) container.innerHTML = '';
    var banner = document.getElementById('group-chat-banner');
    if (banner) banner.style.display = 'none';
  }

  return {
    render: render,
    initListeners: initListeners,
    cleanup: cleanup,
    setGroupFilter: setGroupFilter,
    clearGroupFilter: clearGroupFilter
  };
})();
