/* 공통 유틸 · 저장소 · 음성 · SRS(간격 반복) */
(function (g) {
  var JP = (g.JP = g.JP || {});

  /* ================= 유틸 ================= */
  var U = {
    $: function (sel, root) { return (root || document).querySelector(sel); },
    $$: function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); },
    esc: function (s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    },
    shuffle: function (a) {
      a = a.slice();
      for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
      return a;
    },
    sample: function (a, n) { return U.shuffle(a).slice(0, n); },
    pick: function (a) { return a[Math.floor(Math.random() * a.length)]; },
    uniq: function (a) { var s = {}; return a.filter(function (x) { var k = typeof x === 'object' ? x.id : x; if (s[k]) return false; s[k] = 1; return true; }); },
    clamp: function (x, a, b) { return Math.max(a, Math.min(b, x)); },
    // 로컬 날짜 기준 "에포크 일수"
    today: function () { var d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); },
    dayStr: function (n) { return new Date(n * 864e5).toISOString().slice(0, 10); },
    strDay: function (s) { var p = s.split('-'); return Math.floor(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 864e5); },
    todayStr: function () { return U.dayStr(U.today()); },
    fmt: function (n) { return Number(n || 0).toLocaleString('ko-KR'); }
  };
  JP.U = U;

  /* ================= 저장소 =================
   * 1차: localStorage (즉시, 오프라인)
   * 2차: claude.ai 아티팩트로 열었을 때는 사용자별 비공개 db 문서에 동기화
   */
  var KEY = 'anime-nihongo:v1';
  function fresh() {
    return {
      v: 1, createdAt: Date.now(), updatedAt: 0,
      settings: { rate: 1, voice: '', engine: 'clips', romaji: 'auto', furigana: true, sfx: true, haptics: true, unlockAll: false },
      prog: {}, xp: 0,
      streak: { n: 0, best: 0, last: null, freeze: 0 },
      act: {}, srs: {}, lis: [0, 0], hist: [], badges: {},
      cnt: { ans: 0, ok: 0, hanamaru: 0, boss: 0, reviews: 0, combo: 0, comboBest: 0, lessonsToday: 0, lessonsDate: '' }
    };
  }
  function migrate(s) {
    var f = fresh();
    if (!s || typeof s !== 'object') return f;
    Object.keys(f).forEach(function (k) { if (s[k] === undefined) s[k] = f[k]; });
    Object.keys(f.settings).forEach(function (k) { if (s.settings[k] === undefined) s.settings[k] = f.settings[k]; });
    Object.keys(f.cnt).forEach(function (k) { if (s.cnt[k] === undefined) s.cnt[k] = f.cnt[k]; });
    return s;
  }

  var Store = {
    state: null,
    remote: null,
    listeners: [],
    load: function () {
      var s = null;
      try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s = null; }
      Store.state = migrate(s);
      return Store.state;
    },
    save: function () {
      var s = Store.state;
      s.updatedAt = Date.now();
      try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* 저장 불가 환경 */ }
      Store.pushRemote();
    },
    replace: function (s) {
      Store.state = migrate(s);
      try { localStorage.setItem(KEY, JSON.stringify(Store.state)); } catch (e) {}
      Store.listeners.forEach(function (fn) { fn(); });
    },
    onReplace: function (fn) { Store.listeners.push(fn); },
    reset: function () { Store.replace(fresh()); Store.save(); },

    /* ---- 원격 동기화 (claude.ai 아티팩트 전용, 없으면 조용히 건너뜀) ---- */
    initRemote: function () {
      if (!g.claude || typeof g.claude.use !== 'function') return;
      Promise.all([g.claude.use('db'), g.claude.use('user')]).then(function (r) {
        var db = r[0], user = r[1];
        if (!db || !user) return null;
        return user.id().then(function (uid) {
          if (!uid) return null;
          var ref = db.doc('data/users/' + uid + '/progress');
          return ref.get().then(function (snap) {
            Store.remote = { ref: ref, busy: false, dirty: false };
            var remote = snap.exists ? JSON.parse(JSON.stringify(snap.data())) : null;
            var local = Store.state;
            if (remote && remote.data && (remote.updatedAt || 0) > (local.updatedAt || 0)) {
              Store.replace(remote.data);
            } else if (local.updatedAt) {
              Store.pushRemote();
            }
          });
        });
      }).catch(function () { Store.remote = null; });
    },
    pushRemote: function () {
      var R = Store.remote;
      if (!R) return;
      R.dirty = true;
      if (R.timer || R.busy) return;
      R.timer = setTimeout(function flush() {
        R.timer = null;
        if (!R.dirty) return;
        R.dirty = false; R.busy = true;
        R.ref.set({ updatedAt: Store.state.updatedAt, data: Store.state }).then(function () {
          R.busy = false;
          if (R.dirty) R.timer = setTimeout(flush, 1500);
        }, function (e) {
          R.busy = false;
          if (e && (e.code === 'invalid_argument' || e.code === 'revoked' || e.code === 'not_granted')) Store.remote = null;
          else if (R.dirty) R.timer = setTimeout(flush, 4000);
        });
      }, 1500);
    },
    exportJSON: function () { return JSON.stringify(Store.state); },
    importJSON: function (txt) {
      var s = JSON.parse(txt);
      if (!s || typeof s !== 'object' || !s.prog || !s.srs) throw new Error('형식이 맞지 않는 백업 파일입니다.');
      Store.replace(s);
      Store.save();
    }
  };
  JP.store = Store;

  /* ================= 음성 ① 녹음 클립 (기본) =================
   * tools/make-audio.py가 만든 audio/pack*.mp3 묶음(VOICEVOX 합성)에서 필요한 구간만 잘라 재생.
   * 기기 TTS가 없는 안드로이드 인앱 브라우저·웹뷰에서도 소리가 나도록 하기 위함.
   */
  var Clips = {
    el: null, packs: {}, loaded: {}, urls: {}, seq: 0, unlocked: false,
    base: g.JP_AUDIO_BASE || '',
    index: function () { return JP.audioIndex || null; },
    entry: function (key) { var I = Clips.index(); return I ? I.map[JP.audioHash(key)] : null; },
    audio: function () {
      if (!Clips.el) {
        var a = Clips.el = new Audio();
        a.preload = 'auto';
        a.setAttribute('playsinline', '');
        try { a.preservesPitch = true; a.mozPreservesPitch = true; a.webkitPreservesPitch = true; } catch (e) {}
      }
      return Clips.el;
    },
    // iOS·안드로이드는 사용자가 탭한 순간에 한 번 재생해 둔 오디오 요소만 나중에 자동 재생을 허용합니다.
    unlock: function () {
      var I = Clips.index();
      if (Clips.unlocked || !I) return;
      Clips.unlocked = true;
      try { var a = Clips.audio(); a.src = I.silent; var p = a.play(); if (p && p.catch) p.catch(function () { Clips.unlocked = false; }); } catch (e) { Clips.unlocked = false; }
    },
    loadPack: function (p) {
      var I = Clips.index();
      if (!I) return Promise.reject(new Error('no index'));
      if (!Clips.packs[p]) {
        Clips.packs[p] = fetch(Clips.base + I.packs[p]).then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.arrayBuffer();
        }).then(function (buf) { Clips.loaded[p] = buf; return buf; }, function (e) { delete Clips.packs[p]; throw e; });
      }
      return Clips.packs[p];
    },
    prefetch: function (list) { (list || []).forEach(function (p) { if (Clips.index() && Clips.index().packs[p]) Clips.loadPack(p).catch(function () {}); }); },
    url: function (key) {
      var e = Clips.entry(key), h = JP.audioHash(key);
      if (!e) return Promise.reject(new Error('no clip'));
      if (Clips.urls[h]) return Promise.resolve(Clips.urls[h]);
      var make = function (buf) { return (Clips.urls[h] = URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' }))); };
      var p = e[0], off = e[1], len = e[2];
      if (Clips.loaded[p]) return Promise.resolve(make(Clips.loaded[p].slice(off, off + len)));
      var full = Clips.loadPack(p).then(function (buf) { return buf.slice(off, off + len); });
      // 묶음 전체를 받기 전에는 필요한 구간만 먼저 요청 (같은 출처에서만)
      if (!Clips.base) {
        var ranged = fetch(Clips.index().packs[p], { headers: { Range: 'bytes=' + off + '-' + (off + len - 1) } }).then(function (r) {
          if (r.status !== 206) throw new Error('no range');
          return r.arrayBuffer();
        }).then(function (b) { if (b.byteLength !== len) throw new Error('bad range'); return b; });
        return new Promise(function (resolve, reject) {
          var fails = 0, fail = function (err) { if (++fails === 2) reject(err); };
          ranged.then(function (b) { resolve(make(b)); }, fail);
          full.then(function (b) { resolve(make(b)); }, fail);
        });
      }
      return full.then(make);
    },
    play: function (key, rate) {
      var my = ++Clips.seq;
      return Clips.url(key).then(function (u) {
        if (my !== Clips.seq) return true;
        return new Promise(function (resolve) {
          var a = Clips.audio(), done = false;
          var finish = function (ok) { if (done) return; done = true; a.onended = a.onerror = null; resolve(ok); };
          try { a.pause(); } catch (e) {}
          a.src = u;
          a.defaultPlaybackRate = rate; a.playbackRate = rate;
          try { a.preservesPitch = true; a.webkitPreservesPitch = true; } catch (e) {}
          a.onended = function () { finish(true); };
          a.onerror = function () { finish(false); };
          setTimeout(function () { finish(true); }, 15000);
          var pr = a.play();
          if (pr && pr.catch) pr.catch(function () { finish(false); });
        });
      }, function () { return false; });
    },
    stop: function () { Clips.seq++; if (Clips.el) try { Clips.el.pause(); } catch (e) {} }
  };
  JP.clips = Clips;

  /* ================= 음성 ② 기기 음성 (Web Speech API, 대체용) ================= */
  var PREFERRED = [/Nanami|Keita|Aoi|Daichi|Mayu|Naoki|Shiori/i, /Google/i, /Kyoko|O-ren|Otoya|Hattori/i];
  var Speech = {
    supported: typeof g.speechSynthesis !== 'undefined' && typeof g.SpeechSynthesisUtterance !== 'undefined',
    voices: [],
    voice: null,
    unlocked: false,
    checked: false,
    init: function () {
      if (!Speech.supported) { Speech.checked = true; return; }
      var load = function () {
        var all = g.speechSynthesis.getVoices() || [];
        Speech.voices = all.filter(function (v) { return /^ja(-|_|$)/i.test(v.lang); });
        if (Speech.voices.length) Speech.checked = true;
        Speech.choose();
      };
      load();
      try { g.speechSynthesis.addEventListener('voiceschanged', load); } catch (e) { g.speechSynthesis.onvoiceschanged = load; }
      setTimeout(function () { load(); Speech.checked = true; }, 1000);
    },
    choose: function () {
      var want = JP.store.state && JP.store.state.settings.voice;
      var vs = Speech.voices;
      Speech.voice = null;
      if (!vs.length) return;
      if (want) Speech.voice = vs.filter(function (v) { return v.name === want; })[0] || null;
      if (!Speech.voice) {
        for (var i = 0; i < PREFERRED.length && !Speech.voice; i++) {
          Speech.voice = vs.filter(function (v) { return PREFERRED[i].test(v.name); })[0] || null;
        }
      }
      if (!Speech.voice) Speech.voice = vs[0];
    },
    useClips: function () { var s = JP.store.state; return !!Clips.index() && !(s && s.settings.engine === 'device'); },
    deviceHasJa: function () { return Speech.supported && Speech.voices.length > 0; },
    // 소리를 낼 수단이 있는가 (녹음 클립 또는 기기 일본어 음성)
    hasJa: function () { return Speech.useClips() || Speech.deviceHasJa(); },
    unlock: function () {
      Clips.unlock();
      if (!Speech.supported || Speech.unlocked || Speech.useClips()) return;
      try { var u = new SpeechSynthesisUtterance(''); u.volume = 0; g.speechSynthesis.speak(u); Speech.unlocked = true; } catch (e) {}
    },
    speak: function (text, opt) {
      opt = opt || {};
      if (!text) return Promise.resolve(false);
      var base = (JP.store.state && JP.store.state.settings.rate) || 1;
      var rate = U.clamp(base * (opt.rate || 1), 0.5, 2);
      if (Speech.useClips()) {
        var key = JP.audioKey(text, opt.voice), key2 = JP.audioKey(text, 'f');
        var k = Clips.entry(key) ? key : Clips.entry(key2) ? key2 : null;
        if (k) return Clips.play(k, rate).then(function (ok) { return ok || Speech.device(text, opt, rate); });
      }
      return Speech.device(text, opt, rate);
    },
    device: function (text, opt, rate) {
      return new Promise(function (resolve) {
        if (!Speech.supported) return resolve(false);
        try {
          var syn = g.speechSynthesis;
          var go = function () {
            var u = new SpeechSynthesisUtterance(String(text).replace(/[〜~]/g, ''));
            u.lang = 'ja-JP';
            var v = Speech.voice;
            if (opt.voice === 'm' && Speech.voices.length > 1) v = Speech.voices.filter(function (x) { return x !== Speech.voice; })[0] || v;
            if (v) u.voice = v;
            u.rate = U.clamp(rate, 0.4, 1.8);
            u.pitch = opt.voice === 'm' && Speech.voices.length < 2 ? 0.8 : 1;
            var done = false;
            var finish = function () { if (!done) { done = true; resolve(true); } };
            u.onend = finish; u.onerror = finish;
            setTimeout(finish, 10000);
            syn.speak(u);
            if (syn.paused) syn.resume();
          };
          // 크롬(특히 안드로이드)은 cancel() 직후 바로 speak()하면 소리가 사라지는 문제가 있어 잠깐 기다림
          if (syn.speaking || syn.pending) { syn.cancel(); setTimeout(go, 120); } else go();
        } catch (e) { resolve(false); }
      });
    },
    stop: function () {
      Clips.stop();
      try { if (Speech.supported && (g.speechSynthesis.speaking || g.speechSynthesis.pending)) g.speechSynthesis.cancel(); } catch (e) {}
    }
  };
  JP.speech = Speech;

  /* ================= 효과음 (Web Audio, 파일 없이 합성) ================= */
  var ctx = null;
  function tone(freq, t0, dur, type, vol) {
    var o = ctx.createOscillator(), gn = ctx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    gn.gain.setValueAtTime(0, ctx.currentTime + t0);
    gn.gain.linearRampToValueAtTime(vol || 0.12, ctx.currentTime + t0 + 0.01);
    gn.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t0 + dur);
    o.connect(gn); gn.connect(ctx.destination);
    o.start(ctx.currentTime + t0); o.stop(ctx.currentTime + t0 + dur + 0.02);
  }
  JP.sfx = function (kind) {
    var st = JP.store.state;
    if (!st || !st.settings.sfx) return;
    try {
      var AC = g.AudioContext || g.webkitAudioContext;
      if (!AC) return;
      if (!ctx) ctx = new AC();
      if (ctx.state === 'suspended') ctx.resume();
      if (kind === 'ok') { tone(880, 0, 0.12, 'triangle'); tone(1318.5, 0.09, 0.2, 'triangle'); }
      else if (kind === 'bad') { tone(196, 0, 0.22, 'sawtooth', 0.06); tone(185, 0.05, 0.25, 'square', 0.03); }
      else if (kind === 'stamp') { tone(110, 0, 0.18, 'sine', 0.25); tone(70, 0.02, 0.25, 'sine', 0.2); }
      else if (kind === 'up') { [523.3, 659.3, 784, 1046.5].forEach(function (f, i) { tone(f, i * 0.09, 0.25, 'triangle', 0.1); }); }
      else if (kind === 'hit') { tone(330, 0, 0.08, 'square', 0.05); tone(660, 0.04, 0.1, 'triangle', 0.08); }
      else if (kind === 'tap') { tone(1200, 0, 0.04, 'sine', 0.04); }
    } catch (e) {}
    if (st.settings.haptics && kind === 'bad' && navigator.vibrate) { try { navigator.vibrate(60); } catch (e) {} }
  };

  /* ================= SRS (라이트너 상자 + 날짜 간격) ================= */
  // 상자 번호별 다음 복습까지 일수
  var INTERVALS = [0, 1, 2, 4, 7, 14, 30, 60];
  var SRS = {
    INTERVALS: INTERVALS,
    MAX: INTERVALS.length - 1,
    get: function (id) { return JP.store.state.srs[id]; },
    learn: function (id) {
      var s = JP.store.state.srs;
      if (!s[id]) s[id] = [1, U.today() + 1, 0, 0];
    },
    // 복습 결과 반영
    answer: function (id, ok) {
      var s = JP.store.state.srs, r = s[id];
      if (!r) { r = s[id] = [1, U.today() + 1, 0, 0]; }
      if (ok) { r[0] = Math.min(SRS.MAX, r[0] + 1); r[1] = U.today() + INTERVALS[r[0]]; r[2]++; }
      else { r[0] = Math.max(1, Math.floor(r[0] / 2)); r[1] = U.today() + 1; r[3]++; }
    },
    // 시험에서 틀린 항목은 내일 다시 나오도록
    flagWeak: function (id) {
      var r = JP.store.state.srs[id];
      if (r) { r[1] = Math.min(r[1], U.today() + 1); r[3]++; }
    },
    due: function () {
      var t = U.today(), s = JP.store.state.srs;
      return Object.keys(s).filter(function (id) { return s[id][1] <= t && JP.items[id]; })
        .sort(function (a, b) { return s[a][1] - s[b][1] || s[a][0] - s[b][0]; });
    },
    box: function (id) { var r = JP.store.state.srs[id]; return r ? r[0] : 0; },
    learnedCount: function (type) {
      var s = JP.store.state.srs;
      return Object.keys(s).filter(function (id) { var it = JP.items[id]; return it && (!type || it.type === type); }).length;
    },
    masteredCount: function (type, min) {
      var s = JP.store.state.srs; min = min || 4;
      return Object.keys(s).filter(function (id) { var it = JP.items[id]; return it && (!type || it.type === type) && s[id][0] >= min; }).length;
    },
    weakest: function (n) {
      var s = JP.store.state.srs;
      return Object.keys(s).filter(function (id) { return JP.items[id] && s[id][3] > 0; })
        .sort(function (a, b) { return (s[b][3] - s[b][2] * 0.3) - (s[a][3] - s[a][2] * 0.3); }).slice(0, n);
    }
  };
  JP.srs = SRS;
})(typeof window !== 'undefined' ? window : globalThis);
