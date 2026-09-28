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
      settings: { rate: 1, voice: '', romaji: 'auto', furigana: true, sfx: true, haptics: true, unlockAll: false },
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

  /* ================= 음성 (Web Speech API) ================= */
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
    hasJa: function () { return Speech.supported && Speech.voices.length > 0; },
    // iOS는 첫 발화가 사용자 탭 안에서 일어나야 이후 자동 재생이 됩니다.
    unlock: function () {
      if (!Speech.supported || Speech.unlocked) return;
      try { var u = new SpeechSynthesisUtterance(' '); u.volume = 0; g.speechSynthesis.speak(u); Speech.unlocked = true; } catch (e) {}
    },
    speak: function (text, opt) {
      opt = opt || {};
      return new Promise(function (resolve) {
        if (!Speech.supported || !text) return resolve(false);
        try {
          var syn = g.speechSynthesis;
          syn.cancel();
          var u = new SpeechSynthesisUtterance(String(text).replace(/[〜~]/g, ''));
          u.lang = 'ja-JP';
          if (Speech.voice) u.voice = Speech.voice;
          var base = (JP.store.state && JP.store.state.settings.rate) || 1;
          u.rate = U.clamp(base * (opt.rate || 1), 0.4, 1.8);
          u.pitch = 1;
          var done = false;
          var finish = function () { if (!done) { done = true; resolve(true); } };
          u.onend = finish; u.onerror = finish;
          setTimeout(finish, 8000);
          syn.speak(u);
          if (syn.paused) syn.resume();
        } catch (e) { resolve(false); }
      });
    },
    stop: function () { try { if (Speech.supported) g.speechSynthesis.cancel(); } catch (e) {} }
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
