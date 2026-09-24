/* Sticky-note message wall.
   Storage: Supabase REST if configured in _config.yml, else localStorage (per-visitor demo). */
(function () {
  var CFG = window.GUESTBOOK_CONFIG || {};
  var LIVE = !!(CFG.supabaseUrl && CFG.supabaseKey);
  var LS_KEY = 'guestbook_notes_v1';
  var LS_LAST = 'guestbook_last_post';
  var MAX_MSG = 240, MAX_NAME = 32, COOLDOWN_MS = 30000;
  var COLORS = ['#fff3bf', '#d3f9d8', '#d0ebff', '#ffdeeb', '#e5dbff'];

  var board = document.getElementById('gb-board');
  if (!board) return;

  var totalEl = document.getElementById('gb-total');
  var form = document.getElementById('gb-form');

  function ago(iso) {
    var s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (isNaN(s) || s < 60) return 'just now';
    var m = Math.floor(s / 60); if (m < 60) return m + (m === 1 ? ' minute ago' : ' minutes ago');
    var h = Math.floor(m / 60); if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
    var d = Math.floor(h / 24); if (d < 30) return d + (d === 1 ? ' day ago' : ' days ago');
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function tilt(seed) {
    var h = 2166136261;
    for (var i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (((h >>> 0) % 2001) / 1000 - 1).toFixed(2);
  }

  /* Notes size themselves to how much they have to say. */
  function sizeClass(msg) {
    var n = (msg || '').length;
    if (n <= 45) return 'is-sm';
    if (n <= 105) return 'is-md';
    if (n <= 175) return 'is-lg';
    return 'is-xl';
  }

  function lsRead() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || null; } catch (e) { return null; }
  }

  function seed() {
    var now = Date.now();
    return [
      { id: 's4', name: 'Dewi', message: 'Found your post on flaky tests at exactly the right moment. We quarantined four of ours this week and two turned out to be real race conditions.', color: '#d0ebff', created_at: new Date(now - 6e5).toISOString() },
      { id: 's3', name: 'Arif', message: 'The contract testing piece finally convinced my team lead. Thank you!', color: '#fff3bf', created_at: new Date(now - 864e5).toISOString() },
      { id: 's2', name: '', message: 'Clean site!', color: '#ffdeeb', created_at: new Date(now - 1728e5).toISOString() },
      { id: 's1', name: 'Putri', message: 'Bookmarked for the writing. More posts please.', color: '#d3f9d8', created_at: new Date(now - 3456e5).toISOString() }
    ];
  }

  function load() {
    if (LIVE) {
      return fetch(CFG.supabaseUrl + '/rest/v1/' + (CFG.table || 'guestbook') +
        '?select=id,name,message,color,created_at&order=created_at.desc&limit=300', {
        headers: { apikey: CFG.supabaseKey, Authorization: 'Bearer ' + CFG.supabaseKey }
      }).then(function (r) {
        if (!r.ok) throw new Error('load failed');
        return r.json();
      });
    }
    var have = lsRead();
    if (!have) { have = seed(); try { localStorage.setItem(LS_KEY, JSON.stringify(have)); } catch (e) {} }
    return Promise.resolve(have);
  }

  function save(note) {
    if (LIVE) {
      return fetch(CFG.supabaseUrl + '/rest/v1/' + (CFG.table || 'guestbook'), {
        method: 'POST',
        headers: {
          apikey: CFG.supabaseKey,
          Authorization: 'Bearer ' + CFG.supabaseKey,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify({ name: note.name, message: note.message, color: note.color })
      }).then(function (r) {
        if (!r.ok) throw new Error('save failed');
        return r.json();
      });
    }
    var all = lsRead() || [];
    all.unshift(note);
    try { localStorage.setItem(LS_KEY, JSON.stringify(all)); } catch (e) {}
    return Promise.resolve([note]);
  }

  function render(notes) {
    board.textContent = '';
    if (totalEl) totalEl.textContent = notes.length === 1 ? '1 note' : notes.length + ' notes';
    if (!notes.length) {
      var empty = document.createElement('p');
      empty.className = 'gb-empty';
      empty.textContent = 'No notes yet — be the first to leave one.';
      board.appendChild(empty);
      return;
    }
    notes.forEach(function (n) {
      var el = document.createElement('article');
      el.className = 'gb-note ' + sizeClass(n.message);
      el.style.background = n.color || COLORS[0];
      el.style.setProperty('--tilt', tilt(String(n.id || n.created_at)) + 'deg');

      var body = document.createElement('p');
      body.className = 'gb-note-msg';
      body.textContent = n.message;

      var foot = document.createElement('div');
      foot.className = 'gb-note-foot';
      var who = document.createElement('span');
      who.className = 'gb-note-name';
      who.textContent = n.name && n.name.trim() ? n.name : 'anonymous';
      var when = document.createElement('span');
      when.className = 'gb-note-time';
      when.textContent = ago(n.created_at);
      foot.appendChild(who);
      foot.appendChild(when);

      el.appendChild(body);
      el.appendChild(foot);
      board.appendChild(el);
    });
  }

  function refresh() {
    load().then(render).catch(function () {
      board.textContent = '';
      var err = document.createElement('p');
      err.className = 'gb-empty';
      err.textContent = 'Could not load notes right now. Please try again later.';
      board.appendChild(err);
    });
  }

  /* ---- Posting bar (absent when the wall is closed) ---- */
  if (form) {
    var nameEl = document.getElementById('gb-name');
    var msgEl = document.getElementById('gb-message');
    var trapEl = document.getElementById('gb-website');
    var countEl = document.getElementById('gb-count');
    var statusEl = document.getElementById('gb-status');
    var swatchWrap = document.getElementById('gb-swatches');
    var chosenColor = COLORS[0];

    COLORS.forEach(function (c, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'gb-swatch' + (i === 0 ? ' is-on' : '');
      b.style.background = c;
      b.title = 'Note color';
      b.setAttribute('aria-label', 'Note color ' + (i + 1));
      b.addEventListener('click', function () {
        chosenColor = c;
        Array.prototype.forEach.call(swatchWrap.children, function (el) { el.classList.remove('is-on'); });
        b.classList.add('is-on');
      });
      swatchWrap.appendChild(b);
    });

    function grow() {
      msgEl.style.height = 'auto';
      msgEl.style.height = Math.min(msgEl.scrollHeight, 96) + 'px';
    }

    function say(text, bad) {
      statusEl.textContent = text || '';
      statusEl.classList.toggle('is-on', !!text);
      statusEl.classList.toggle('is-bad', !!bad);
      if (text) {
        clearTimeout(say._t);
        say._t = setTimeout(function () {
          statusEl.textContent = '';
          statusEl.classList.remove('is-on');
        }, 4000);
      }
    }

    msgEl.addEventListener('input', function () {
      countEl.textContent = msgEl.value.length + ' / ' + MAX_MSG;
      countEl.classList.toggle('is-over', msgEl.value.length > MAX_MSG);
      grow();
    });

    msgEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (trapEl.value) return;

      var msg = msgEl.value.trim();
      var who = nameEl.value.trim().slice(0, MAX_NAME);
      if (!msg) { say('Write something first.', true); msgEl.focus(); return; }
      if (msg.length > MAX_MSG) { say('Keep it under ' + MAX_MSG + ' characters.', true); return; }
      if (/(https?:\/\/|www\.)/i.test(msg)) { say('Links are not allowed.', true); return; }

      var last = 0;
      try { last = parseInt(localStorage.getItem(LS_LAST) || '0', 10); } catch (e2) {}
      if (Date.now() - last < COOLDOWN_MS) { say('Just a moment before posting again.', true); return; }

      var btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      btn.textContent = 'Pinning…';

      save({
        id: 'n' + Date.now(),
        name: who || 'anonymous',
        message: msg,
        color: chosenColor,
        created_at: new Date().toISOString()
      }).then(function () {
        try { localStorage.setItem(LS_LAST, String(Date.now())); } catch (e3) {}
        msgEl.value = '';
        nameEl.value = '';
        countEl.textContent = '0 / ' + MAX_MSG;
        countEl.classList.remove('is-over');
        grow();
        say('Pinned. Thanks for stopping by!');
        refresh();
      }).catch(function () {
        say('Something went wrong — your note was not saved.', true);
      }).then(function () {
        btn.disabled = false;
        btn.textContent = 'Pin it';
      });
    });

    countEl.textContent = '0 / ' + MAX_MSG;
  }

  var bar = document.querySelector('.gb-bar');
  if (bar) {
    var syncBarHeight = function () {
      document.body.style.setProperty('--gb-bar-h', bar.offsetHeight + 'px');
    };
    syncBarHeight();
    window.addEventListener('resize', syncBarHeight);
    if (window.ResizeObserver) new ResizeObserver(syncBarHeight).observe(bar);
  }

  var demoBanner = document.getElementById('gb-demo');
  if (demoBanner && LIVE) demoBanner.style.display = 'none';
  refresh();
})();
