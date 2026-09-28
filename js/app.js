/* アニ耳 — 화면과 상호작용
 * 탭: 코스(스탬프 카드) · 복습(SRS) · 문자표 · 단어장 · 나(통계·배지·설정)
 * 러너: 한 화 = 인트로 → 워밍업 복습 → 새로 배우기 → 연습 → 애니 대사 → 인문학 → 오늘의 평가 → 결과
 */
(function () {
  var JP = window.JP, U = JP.U, C = JP.course, S = JP.store, SRS = JP.srs, SP = JP.speech, Q = JP.quiz;
  var esc = U.esc;

  /* ================= 아이콘 ================= */
  function svg(inner, vb) { return '<svg viewBox="' + (vb || '0 0 24 24') + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>'; }
  var I = {
    route: svg('<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h7"/>'),
    cycle: svg('<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 21v-5h-5"/>'),
    grid: svg('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
    book: svg('<path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H11v17H5.5A2.5 2.5 0 0 0 3 22.5z"/><path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H13v17h5.5a2.5 2.5 0 0 1 2.5 2.5z"/>'),
    user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2c1 3.5 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 1.5.8 2.8 2 3.3C10.5 9 11.5 5.5 12 2z"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
    speaker: svg('<path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>'),
    close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
    check: svg('<path d="M4 12.5 9.5 18 20 6"/>'),
    x: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z"/></svg>',
    sword: svg('<path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 6-6M16 16l4 4M19 21l2-2"/>'),
    headphones: svg('<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z"/>'),
    scroll: svg('<path d="M8 21h11a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 0 0-2-2 2 2 0 0 0-2 2v3h4"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/>'),
    lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
    pen: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/>'),
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 4v16l13-8z"/></svg>',
    mic: svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
    back: svg('<path d="M15 18 9 12l6-6"/>'),
    gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>')
  };

  /* 도장·꽃동그라미(はなまる) */
  function hanamaruPath() {
    var d = '', i, a, r;
    // 바깥 꽃잎 10장
    var n = 10, R = 42;
    for (i = 0; i < n; i++) {
      var a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2;
      var x0 = 50 + R * Math.cos(a0), y0 = 50 + R * Math.sin(a0);
      var x1 = 50 + R * Math.cos(a1), y1 = 50 + R * Math.sin(a1);
      var cx = 50 + (R + 11) * Math.cos(am), cy = 50 + (R + 11) * Math.sin(am);
      d += (i === 0 ? 'M' + x0.toFixed(1) + ' ' + y0.toFixed(1) : '') + ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + x1.toFixed(1) + ' ' + y1.toFixed(1);
    }
    // 안쪽 소용돌이
    var sp = '';
    for (i = 0; i <= 64; i++) {
      a = i / 64 * Math.PI * 5.2 + Math.PI;
      r = 3 + i * 0.47;
      sp += (i ? ' L' : 'M') + (50 + r * Math.cos(a)).toFixed(1) + ' ' + (50 + r * Math.sin(a)).toFixed(1);
    }
    return '<path d="' + d + '"/><path d="' + sp + '"/>';
  }
  var HANAMARU = hanamaruPath();
  function stampSvg(grade, cls) {
    var body;
    if (grade === 'hana') body = HANAMARU;
    else if (grade === 'maru') body = '<path d="M62 12C35 6 12 24 12 50s19 40 40 40 38-16 38-40c0-17-11-31-28-36"/>';
    else if (grade === 'san') body = '<path d="M50 14 88 82H12z"/>';
    else body = '<path d="M20 20l60 60M80 20 20 80"/>';
    return '<svg class="' + (cls || 'stamp-svg') + '" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="' + (grade === 'hana' ? 5 : 8) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  }
  var GRADE_TXT = { hana: '하나마루 ◎', maru: '합격 ○', san: '다시 한 번 △' };
  var GRADE_RANK = { san: 0, maru: 1, hana: 2 };

  function bossSvg() {
    return '<svg class="boss-svg" viewBox="0 0 120 120" aria-hidden="true"><path fill="currentColor" d="M22 36 32 8l14 22h28l14-22 10 28c8 9 12 20 12 32 0 26-22 44-50 44S10 94 10 68c0-12 4-23 12-32z"/><circle cx="44" cy="62" r="9" fill="#fff"/><circle cx="76" cy="62" r="9" fill="#fff"/><circle cx="46" cy="64" r="4" fill="#111"/><circle cx="74" cy="64" r="4" fill="#111"/><path d="M40 88l8-6 6 6 6-6 6 6 6-6 8 6" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round"/></svg>';
  }
  function logoSvg(cls) {
    return '<svg class="' + (cls || 'mark') + '" viewBox="0 0 64 64" aria-hidden="true"><rect x="2" y="2" width="60" height="60" rx="16" fill="var(--ruri)"/><path d="M15 20h24c0 9-5 15-12 19M27 26c0 12-3 20-10 25" fill="none" stroke="var(--on-ruri)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M44 26a10 10 0 0 1 0 14M49 21a17 17 0 0 1 0 24" fill="none" stroke="var(--shu)" stroke-width="4" stroke-linecap="round"/></svg>';
  }
  function medal(glyph, on) {
    return '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21" fill="' + (on ? 'var(--gold-soft)' : 'var(--card-2)') + '" stroke="' + (on ? 'var(--shu)' : 'var(--line)') + '" stroke-width="2.5"/><circle cx="24" cy="24" r="16" fill="none" stroke="' + (on ? 'var(--shu)' : 'var(--line)') + '" stroke-width="1.2"/><text x="24" y="31" text-anchor="middle" font-size="20" font-weight="600" font-family="Klee One, serif" fill="' + (on ? 'var(--shu)' : 'var(--muted)') + '">' + glyph + '</text></svg>';
  }

  /* ================= 게임 데이터 ================= */
  var RANKS = [
    { k: 'F', jp: '見習い冒険者', ko: '견습 모험가' },
    { k: 'E', jp: '文字の旅人', ko: '문자의 여행자' },
    { k: 'D', jp: '言葉の剣士', ko: '말의 검사' },
    { k: 'C', jp: '活用の魔導士', ko: '활용의 마도사' },
    { k: 'B', jp: '口調の達人', ko: '말투의 달인' },
    { k: 'A', jp: '物語の語り部', ko: '이야기의 이야기꾼' },
    { k: 'S', jp: '字幕なしの勇者', ko: '자막 없는 용사' }
  ];
  var TYPE_LABEL = { lesson: '학습', boss: '보스전', listen: '청해 특훈', exam: '승급 시험' };
  var TYPE_ICON = { lesson: I.book, boss: I.sword, listen: I.headphones, exam: I.scroll };
  var PASS_XP = { lesson: 30, boss: 60, listen: 50, exam: 100 };

  function st() { return S.state; }
  function save() { S.save(); }
  function prog(day) { return st().prog[day]; }
  function isDone(day) { var p = prog(day); return !!(p && p.pass); }
  function isUnlocked(day) { return st().settings.unlockAll || day === 1 || isDone(day - 1); }
  function currentDay() { for (var d = 1; d <= JP.totalDays; d++) if (!isDone(d)) return d; return JP.totalDays; }
  // 랭크는 승급 시험을 순서대로 통과한 만큼 오른다 (체험 모드로 건너뛴 시험은 제외)
  function rankIdx() { var n = 0; for (var c = 1; c <= 6; c++) { if (isDone(c * 30)) n = c; else break; } return n; }
  function levelOf(xp) { return Math.floor((1 + Math.sqrt(1 + 0.08 * xp)) / 2); }
  function levelXp(L) { return 50 * L * (L - 1); }
  function passedCount() { return Object.keys(st().prog).filter(function (d) { return st().prog[d].pass; }).length; }
  function countDays(pred) { var n = 0; Object.keys(st().prog).forEach(function (d) { if (pred(+d, st().prog[d])) n++; }); return n; }
  function hanaCount() { return countDays(function (d, p) { return p.grade === 'hana'; }); }
  function bossWins() { return countDays(function (d, p) { return p.pass && JP.days[d] && JP.days[d].type === 'boss'; }); }
  function listenWins() { return countDays(function (d, p) { return p.pass && JP.days[d] && JP.days[d].type === 'listen'; }); }

  var BADGES = [
    { id: 'first', n: '첫 걸음', d: '첫 에피소드 통과', g: '初', c: function () { return passedCount() >= 1; } },
    { id: 'hira', n: '히라가나 정복', d: '1장 1주차 보스 격파', g: 'ひ', c: function () { return isDone(7); } },
    { id: 'kata', n: '가타카나 정복', d: '1장 3주차 보스 격파', g: 'カ', c: function () { return isDone(21); } },
    { id: 'streak3', n: '사흘 연속', d: '3일 연속 학습', g: '三', c: function () { return st().streak.best >= 3; } },
    { id: 'streak7', n: '일주일 연속', d: '7일 연속 학습', g: '七', c: function () { return st().streak.best >= 7; } },
    { id: 'streak30', n: '한 달 연속', d: '30일 연속 학습', g: '月', c: function () { return st().streak.best >= 30; } },
    { id: 'streak100', n: '백일 수행', d: '100일 연속 학습', g: '百', c: function () { return st().streak.best >= 100; } },
    { id: 'hana1', n: '첫 하나마루', d: '평가 90점 이상', g: '花', c: function () { return hanaCount() >= 1; } },
    { id: 'hana30', n: '꽃다발', d: '하나마루 30개', g: '華', c: function () { return hanaCount() >= 30; } },
    { id: 'boss1', n: '보스 사냥꾼', d: '첫 보스 격파', g: '鬼', c: function () { return bossWins() >= 1; } },
    { id: 'boss24', n: '마왕 토벌', d: '보스 24마리 모두 격파', g: '魔', c: function () { return bossWins() >= 24; } },
    { id: 'w100', n: '단어 100', d: '단어 100개 습득', g: '語', c: function () { return SRS.learnedCount('vocab') >= 100; } },
    { id: 'w500', n: '단어 500', d: '단어 500개 습득', g: '辞', c: function () { return SRS.learnedCount('vocab') >= 500; } },
    { id: 'w1000', n: '단어 1000', d: '단어 1000개 습득', g: '典', c: function () { return SRS.learnedCount('vocab') >= 1000; } },
    { id: 'rev500', n: '복습의 달인', d: '복습 500문항', g: '復', c: function () { return st().cnt.reviews >= 500; } },
    { id: 'combo20', n: '연속 정답 20', d: '20문제 연속 정답', g: '連', c: function () { return st().cnt.comboBest >= 20; } },
    { id: 'ear', n: '애니 귀', d: '청해 특훈 3회 통과', g: '耳', c: function () { return listenWins() >= 3; } },
    { id: 'owl', n: '올빼미', d: '밤 11시 이후 학습', g: '夜', c: function () { return !!(st().flags && st().flags.owl); } },
    { id: 'early', n: '아침형 인간', d: '오전 7시 전 학습', g: '朝', c: function () { return !!(st().flags && st().flags.early); } },
    { id: 'grad', n: '자막 없는 용사', d: '180화 완주', g: '勇', c: function () { return passedCount() >= JP.totalDays; } }
  ];

  /* ================= UI 상태 ================= */
  var ui = { tab: 'home', chapter: null, kanaScript: 'H', bookTab: 'vocab', bookQuery: '', bookAll: false, resetArm: false };
  var run = null;

  function applyDisplayPrefs() {
    var s = st().settings;
    document.body.classList.toggle('no-furi', !s.furigana);
    if (s.theme === 'light' || s.theme === 'dark') document.documentElement.setAttribute('data-theme', s.theme);
    else if (s.themeSet) document.documentElement.removeAttribute('data-theme');
  }

  function toast(msg) {
    var t = document.getElementById('toast');
    t.innerHTML = '<div class="toast" role="status">' + esc(msg) + '</div>';
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.innerHTML = ''; }, 2400);
  }

  /* ================= 오디오 ================= */
  var playing = null;
  function say(text, rate, btn) {
    SP.unlock();
    if (!text) return Promise.resolve();
    if (btn) { if (playing) playing.classList.remove('playing'); btn.classList.add('playing'); playing = btn; }
    return SP.speak(text, { rate: rate || 1 }).then(function () { if (btn) btn.classList.remove('playing'); });
  }
  function audioBtn(text, opts) {
    opts = opts || {};
    return '<button class="audio-btn ' + (opts.big ? 'big' : '') + (opts.slow ? ' slow' : '') + '" data-act="say" data-t="' + esc(text) + '" data-r="' + (opts.rate || 1) + '" aria-label="' + (opts.slow ? '천천히 듣기' : '듣기') + '">' + (opts.slow ? '<span class="small" style="font-weight:700">0.7</span>' : I.speaker) + '</button>';
  }
  // 대화 재생: 화자마다 목소리(또는 음높이)를 다르게
  function playDialog(lines, rate, onLine) {
    var i = 0, speakers = [];
    lines.forEach(function (l) { if (speakers.indexOf(l.who) < 0) speakers.push(l.who); });
    function next() {
      if (i >= lines.length || !run && !playDialog.free) { if (onLine) onLine(-1); return; }
      var l = lines[i], si = speakers.indexOf(l.who);
      if (onLine) onLine(i);
      var voices = SP.voices, orig = SP.voice;
      if (voices.length > 1 && si % 2 === 1) SP.voice = voices.filter(function (v) { return v !== orig; })[0] || orig;
      SP.unlock();
      var u = SP.speak(l.s.plain, { rate: rate || 1 });
      SP.voice = orig;
      i++;
      u.then(function () { setTimeout(next, 280); });
    }
    next();
  }

  /* ================= 상단바 · 탭 ================= */
  function renderTop() {
    var s = st(), r = RANKS[rankIdx()], lv = levelOf(s.xp);
    return '<header class="topbar">' +
      '<div class="brand">' + logoSvg() + '<span>アニ耳</span></div>' +
      '<span class="chip rank" title="' + esc(r.ko) + '">' + r.k + '級</span>' +
      '<span class="chip streak" title="연속 학습일">' + I.flame + '<span class="tabnum">' + s.streak.n + '</span></span>' +
      '<span class="chip xp" title="레벨">' + I.bolt + 'Lv.<span class="tabnum">' + lv + '</span></span>' +
      '</header>';
  }
  function renderTabs() {
    var due = SRS.due().length;
    var tabs = [['home', I.route, '코스'], ['review', I.cycle, '복습'], ['kana', I.grid, '문자표'], ['book', I.book, '단어장'], ['me', I.user, '나']];
    return '<nav class="tabbar" aria-label="메뉴"><div class="in">' + tabs.map(function (t) {
      return '<button class="tab ' + (ui.tab === t[0] ? 'on' : '') + '" data-act="tab" data-v="' + t[0] + '">' + t[1] + '<span>' + t[2] + '</span>' +
        (t[0] === 'review' && due ? '<span class="dot tabnum">' + (due > 99 ? '99+' : due) + '</span>' : '') + '</button>';
    }).join('') + '</div></nav>';
  }

  function render() {
    applyDisplayPrefs();
    var root = document.getElementById('app');
    if (!st().onboarded) { root.innerHTML = '<div class="shell"><main class="view">' + viewWelcome() + '</main></div>'; return; }
    var views = { home: viewHome, review: viewReview, kana: viewKana, book: viewBook, me: viewMe };
    root.innerHTML = '<div class="shell">' + renderTop() + '<main class="view" id="view">' + views[ui.tab]() + '</main></div>' + renderTabs();
    if (ui.tab === 'me') bindCharts();
  }

  /* ================= 온보딩 ================= */
  function viewWelcome() {
    return '<section class="welcome">' + logoSvg('logo') +
      '<div><div class="eyebrow">애니 청해 일본어 180일</div><h1>アニ耳<br>애니를 듣는 귀</h1></div>' +
      '<p class="lead">일본어를 전혀 몰라도 괜찮아요. 하루 한 화(약 20~30분)씩, 6개월 동안 글자부터 애니 대사 청해까지 갑니다.</p>' +
      '<div class="card stack">' +
      '<div class="steps-list">' +
      '<div><span class="n">1</span>매일 한 화: 복습 → 새로 배우기 → 연습 → 애니 대사 → 인문학 한 스푼</div>' +
      '<div><span class="n">2</span>매 화의 끝에 <b>오늘의 평가</b>(10문항, 70점 이상 통과)</div>' +
      '<div><span class="n">3</span>7일마다 <b>보스전</b>, 30일마다 <b>승급 시험</b> — F급에서 S급까지</div>' +
      '<div><span class="n">4</span>틀린 문제는 간격 반복(SRS)으로 알맞은 날에 다시 나와요</div>' +
      '</div></div>' +
      '<div class="card row"><div style="flex:1"><b>소리 확인</b><div class="small muted">버튼을 눌러 일본어 음성이 들리는지 확인하세요.</div></div>' + audioBtn('こんにちは。アニメの日本語を、いっしょに勉強しましょう。') + '</div>' +
      voiceBanner() +
      '<button class="btn block" data-act="onboard">시작하기</button>' +
      '</section>';
  }
  function voiceBanner() {
    if (SP.hasJa() || !SP.checked) return '';
    return '<details class="banner"><summary style="cursor:pointer"><b>일본어 음성을 찾지 못했어요.</b> 설치 방법 보기</summary><p class="small" style="margin:8px 0 0">' +
      '· iPhone: 설정 → 손쉬운 사용 → 읽기 및 말하기 → 음성 → 일본어<br>· Android: 설정 → 텍스트 음성 변환(TTS) → 음성 데이터 설치 → 일본어<br>' +
      '기기마다 메뉴 이름이 조금 다를 수 있어요. 음성이 없어도 학습은 가능하며, 듣기 문제는 글자로 대신 표시됩니다.</p></details>';
  }

  /* ================= 홈: 코스 ================= */
  function dayBrief(D) {
    if (D.type !== 'lesson') return '';
    var parts = [];
    if (D.kana.length) parts.push('새 글자 <b>' + D.kana.length + '</b>');
    if (D.vocab.length) parts.push('단어 <b>' + D.vocab.length + '</b>');
    if (D.gram.length) parts.push('문법 <b>' + D.gram.length + '</b>');
    if (D.dlg) parts.push('장면 대화');
    if (D.line) parts.push('애니 대사');
    if (D.note) parts.push('인문학');
    return parts.map(function (p) { return '<span>' + p + '</span>'; }).join('');
  }
  function viewHome() {
    var s = st(), cur = currentDay(), D = JP.days[cur], ch = C.chapterOf(cur);
    if (ui.chapter == null) ui.chapter = ch.n;
    var due = SRS.due().length;
    var todayN = s.cnt.lessonsDate === U.todayStr() ? s.cnt.lessonsToday : 0;
    var allDone = passedCount() >= JP.totalDays;
    var html = voiceBanner();
    html += '<section class="today" aria-label="오늘의 에피소드">' +
      '<div class="row" style="justify-content:space-between"><span class="ep-no">第' + cur + '話 · ' + esc(ch.jp) + '</span>' +
      '<span class="type-badge ' + D.type + '">' + TYPE_ICON[D.type] + TYPE_LABEL[D.type] + '</span></div>' +
      '<h2 class="ep-title">' + esc(D.title) + '</h2><div class="ep-sub">' + esc(D.sub) + '</div>' +
      (D.type === 'lesson' ? '<div class="flow">' + dayBrief(D) + '</div>' : '<div class="flow"><span>' + (D.type === 'boss' ? '주간 복습 20문항 · 7번 틀리면 패배' : D.type === 'listen' ? '듣기 전용 15문항 · 점점 빨라져요' : '30문항 · 문자·어휘·문법·청해 영역별 채점') + '</span></div>') +
      (allDone ? '<div class="banner"><b>180화 완주!</b> 이제 좋아하는 애니를 자막 없이 도전해 보세요. 복습은 계속 이어집니다.</div>' :
        '<button class="btn block" data-act="start" data-day="' + cur + '">' + I.play + (todayN ? ' 다음 화 이어서 하기' : ' 오늘의 에피소드 시작') + '</button>') +
      '<div class="goal-line"><span>오늘 완료 <b class="tabnum">' + todayN + '</b>화</span><span>복습 대기 <b class="tabnum">' + due + '</b>개</span><span>진도 <b class="tabnum">' + passedCount() + '</b>/180</span></div>' +
      (todayN >= 2 ? '<p class="small muted" style="margin:8px 0 0">오늘은 이미 ' + todayN + '화를 마쳤어요. 기억은 잠을 자는 동안 정리되기 때문에, 하루 1~2화에 복습을 곁들이는 편이 오래 남습니다.</p>' : '') +
      '</section>';

    html += '<div class="sec-title"><h2>스탬프 카드</h2><span class="jp">スタンプカード</span></div>';
    html += '<div class="chapters" role="tablist">' + JP.sortedChapters.map(function (c) {
      var lock = !s.settings.unlockAll && !isUnlocked((c.n - 1) * 30 + 1);
      return '<button class="chap ' + (ui.chapter === c.n ? 'on' : '') + (lock ? ' lock' : '') + '" data-act="chap" data-v="' + c.n + '" role="tab" aria-selected="' + (ui.chapter === c.n) + '">' +
        '<div class="n">第' + c.n + '章 · ' + c.rankFrom + '→' + c.rankTo + '</div><div class="t">' + esc(c.title) + '</div><div class="r jp">' + esc(c.jp) + '</div></button>';
    }).join('') + '</div>';
    html += stampCard(JP.sortedChapters[ui.chapter - 1], cur);
    return html;
  }
  function cellHtml(d, cur) {
    var D = JP.days[d], p = prog(d), lock = !isUnlocked(d);
    var cls = 'cell ' + (D.type !== 'lesson' ? D.type : '') + (d === cur && !isDone(d) ? ' cur' : '') + (lock ? ' lock' : '') + (p && p.pass ? ' done' : '');
    var ic = D.type === 'boss' ? I.sword : D.type === 'listen' ? I.headphones : D.type === 'exam' ? I.scroll : '';
    var inner = p && p.pass ? '<span class="stamp">' + stampSvg(p.grade) + '</span><span class="num-under">' + d + '</span>' : String(d);
    return '<button class="' + cls + '" data-act="sheet" data-day="' + d + '" aria-label="' + d + '화 ' + esc(D.title) + (p && p.pass ? ' 완료' : lock ? ' 잠김' : '') + '">' + (ic ? '<span class="ic">' + ic + '</span>' : '') + inner + '</button>';
  }
  function stampCard(ch, cur) {
    var base = (ch.n - 1) * 30, html = '<section class="stampcard"><header><h3>第' + ch.n + '章 ' + esc(ch.title) + '</h3><span class="jp">' + esc(ch.jp) + '</span></header>';
    html += '<p class="small muted" style="margin:0 4px 10px">' + esc(ch.goal) + '</p>';
    for (var w = 0; w < 4; w++) {
      html += '<div class="weekrow"><span class="wk">' + (w + 1) + '주</span>';
      for (var i = 1; i <= 7; i++) html += cellHtml(base + w * 7 + i, cur);
      html += '</div>';
    }
    html += '<div class="weekrow lastrow"><span class="wk">마무리</span>' + cellHtml(base + 29, cur) + cellHtml(base + 30, cur) + '<span class="small muted" style="padding-left:6px;line-height:1.3">청해 특훈 · 승급 시험 <b style="color:var(--shu)">' + ch.rankTo + '급</b></span></div>';
    html += '<div class="legend"><span><i style="background:var(--shu-soft)"></i>보스전</span><span><i style="background:var(--ok-soft)"></i>청해 특훈</span><span><i style="background:var(--gold-soft)"></i>승급 시험</span><span>도장 ◎ 90점↑ · ○ 70점↑</span></div>';
    return html + '</section>';
  }

  /* 에피소드 상세 시트 */
  function openSheet(day) {
    var D = JP.days[day], p = prog(day), lock = !isUnlocked(day), ch = C.chapterOf(day);
    var body = '<div class="grab"></div><div class="row" style="justify-content:space-between"><span class="ep-no">第' + day + '話 · ' + esc(ch.jp) + '</span><span class="type-badge ' + D.type + '">' + TYPE_ICON[D.type] + TYPE_LABEL[D.type] + '</span></div>' +
      '<h2>' + esc(D.title) + '</h2><p class="muted" style="margin:0 0 12px">' + esc(D.sub) + '</p>';
    if (p) body += '<div class="row" style="margin-bottom:12px"><span class="chip">최고 점수 <b class="tabnum">&nbsp;' + p.best + '점</b></span><span class="chip">' + GRADE_TXT[p.grade] + '</span><span class="chip">도전 ' + p.tries + '회</span></div>';
    if (D.type === 'lesson') {
      if (D.kana.length) body += '<div class="eyebrow">새 글자</div><div class="kchips" style="margin:6px 0 12px">' + D.kana.map(function (k) { return '<span>' + k.c + '</span>'; }).join('') + '</div>';
      if (D.gram.length) body += '<div class="eyebrow">문법 · 표현</div><ul class="list-plain" style="margin:6px 0 12px">' + D.gram.map(function (g) { return '<li><span class="jp">' + esc(g.t) + '</span><span class="muted">' + esc(g.m) + '</span></li>'; }).join('') + '</ul>';
      if (D.vocab.length) body += '<div class="eyebrow">단어</div><ul class="list-plain" style="margin:6px 0 12px">' + D.vocab.map(function (v) { return '<li><span class="jp">' + esc(v.r) + '</span><span class="muted">' + esc(v.m) + '</span></li>'; }).join('') + '</ul>';
      if (D.note) body += '<div class="eyebrow">인문학 한 스푼</div><p style="margin:4px 0 12px">' + esc(D.note[0]) + '</p>';
    } else {
      body += '<p class="small">' + (D.type === 'boss' ? '지난 6화의 내용이 섞여 나옵니다. 14문제를 맞히면 보스 격파, 7번 틀리면 패배예요. 격파하면 <b>연속 학습 보호권</b>을 1장 얻습니다(최대 2장).' : D.type === 'listen' ? '이 챕터의 단어·예문·대사·대화를 소리로만 풉니다. 5문항마다 속도가 빨라져요(0.9배 → 1.0배 → 1.2배).' : '챕터 전체를 30문항으로 평가합니다. 70점 이상이면 합격하고 랭크가 올라갑니다.') + '</p>';
    }
    if (lock) body += '<div class="banner" style="margin:10px 0"><b>잠겨 있어요.</b> 이전 화의 평가를 70점 이상으로 통과하면 열립니다. (설정의 "체험 모드"로 모든 화를 미리 볼 수 있어요.)</div>';
    else {
      body += '<div class="stack" style="margin-top:12px"><button class="btn block" data-act="start" data-day="' + day + '">' + I.play + (p ? ' 처음부터 다시 하기' : ' 시작하기') + '</button>';
      if (p && D.type === 'lesson') body += '<button class="btn ghost block" data-act="start" data-day="' + day + '" data-mode="testOnly">평가만 다시 보기</button>';
      body += '</div>';
    }
    showOverlay('<div class="overlay" role="dialog" aria-modal="true" aria-label="' + day + '화 정보"><div class="scrim" data-act="closeOverlay"></div><div class="sheet">' + body + '</div></div>');
  }
  function showOverlay(html) { document.getElementById('overlay').innerHTML = html; }
  function closeOverlay() { document.getElementById('overlay').innerHTML = ''; }

  /* ================= 복습 탭 ================= */
  function viewReview() {
    var due = SRS.due(), s = st();
    var boxes = [0, 0, 0, 0, 0, 0, 0];
    Object.keys(s.srs).forEach(function (id) { if (JP.items[id]) boxes[Math.min(7, s.srs[id][0]) - 1]++; });
    var max = Math.max.apply(null, boxes.concat([1]));
    var weak = SRS.weakest(12);
    var html = '<div class="sec-title"><h2>복습</h2><span class="jp">ふくしゅう</span></div>';
    html += '<section class="card stack"><div class="row" style="justify-content:space-between;align-items:flex-end"><div><div class="eyebrow">오늘 복습할 항목</div><div class="hero-num">' + due.length + '</div></div>' +
      '<div class="small muted" style="max-width:20ch;text-align:right">잊어버리기 직전에 다시 떠올리면 기억이 가장 오래 갑니다.</div></div>' +
      (due.length ? '<button class="btn block" data-act="review" data-v="due">' + I.play + ' 지금 복습하기 (' + Math.min(20, due.length) + '문항)</button>' : '<div class="banner">오늘 복습은 모두 끝났어요. 새 에피소드를 진행하면 복습 항목이 쌓입니다.</div>') +
      '</section>';
    html += '<section class="card"><div class="sec-title"><h2 style="font-size:15px">기억 단계</h2><span class="small muted">총 ' + Object.keys(s.srs).length + '개</span></div>' +
      '<p class="small muted" style="margin:4px 0 12px">맞힐 때마다 다음 단계로 올라가고, 복습 간격이 1 → 2 → 4 → 7 → 14 → 30 → 60일로 늘어납니다. 틀리면 단계가 내려가요.</p>' +
      '<div class="boxes" role="img" aria-label="기억 단계별 항목 수">' + boxes.map(function (n, i) {
        return '<div class="b"><em class="tabnum">' + n + '</em><i style="height:' + Math.max(2, Math.round(n / max * 60)) + 'px"></i><span>' + (i + 1) + '단계</span></div>';
      }).join('') + '</div></section>';
    if (weak.length) {
      html += '<section class="card"><div class="sec-title"><h2 style="font-size:15px">자주 틀리는 항목</h2><button class="btn sm ghost" data-act="review" data-v="weak">약점 집중 훈련</button></div><div style="margin-top:8px">' +
        weak.map(function (id) { return itemRow(JP.items[id]); }).join('') + '</div></section>';
    }
    if (Object.keys(s.srs).length >= 8) {
      html += '<section class="card row"><div style="flex:1"><b>무작위 청해 연습</b><div class="small muted">지금까지 배운 것 중에서 듣기 문제 15개</div></div><button class="btn sm" data-act="review" data-v="listen">' + I.headphones + '</button></section>';
    }
    return html;
  }
  function itemLabel(it) {
    if (it.type === 'kana') return { jp: it.c, m: it.ro, audio: it.c };
    if (it.type === 'vocab') return { jp: it.r + (it.w && it.w !== it.r ? ' <span class="muted small">' + esc(it.w) + '</span>' : ''), m: it.m, audio: it.r, raw: true };
    if (it.type === 'gram') return { jp: esc(it.t), m: it.m, audio: it.x[0] ? it.x[0].plain : '', raw: true };
    if (it.type === 'line') return { jp: it.s.html, m: it.s.ko, audio: it.s.plain, raw: true };
    return { jp: '', m: '' };
  }
  function dotsHtml(id) {
    var b = SRS.box(id), h = '<span class="dots" aria-label="기억 단계 ' + b + '">';
    for (var i = 1; i <= 7; i++) h += '<i class="' + (i <= b ? 'on' : '') + '"></i>';
    return h + '</span>';
  }
  function itemRow(it) {
    var L = itemLabel(it);
    return '<div class="item-row"><div class="txt"><div class="jp">' + (L.raw ? L.jp : esc(L.jp)) + '</div><div class="m">' + esc(L.m) + '</div></div>' + dotsHtml(it.id) + (L.audio ? audioBtn(L.audio) : '') + '</div>';
  }

  /* ================= 문자표 ================= */
  function kanaClass(k) {
    var b = SRS.box(k.id);
    if (!b) return 'nolearn';
    return b >= 6 ? 'm4' : b >= 4 ? 'm3' : b >= 2 ? 'm2' : 'm1';
  }
  function kcell(ch) {
    if (!ch) return '<div class="kcell empty"></div>';
    var k = JP.kana.byChar[ch];
    return '<button class="kcell ' + kanaClass(k) + '" data-act="kana" data-v="' + esc(ch) + '"><span class="c">' + ch + '</span><span class="r">' + (k.ro) + '</span></button>';
  }
  function viewKana() {
    var H = ui.kanaScript === 'H', conv = function (c) { return H || !c ? c : JP.kana.toKata(c); };
    var learned = JP.all.kana.filter(function (k) { return k.script === ui.kanaScript && SRS.box(k.id); }).length;
    var total = JP.all.kana.filter(function (k) { return k.script === ui.kanaScript; }).length;
    var html = '<div class="sec-title"><h2>문자표</h2><div class="seg" role="tablist"><button class="' + (H ? 'on' : '') + '" data-act="kanaScript" data-v="H">ひらがな</button><button class="' + (!H ? 'on' : '') + '" data-act="kanaScript" data-v="K">カタカナ</button></div></div>';
    html += '<p class="small muted" style="margin:0">습득 ' + learned + ' / ' + total + '자 · 글자를 누르면 소리와 기억법, 쓰기 연습이 나와요.</p>';
    html += '<section class="card stack"><div class="eyebrow">기본 (오십음)</div><div class="kgrid">' + JP.kana.gojuon.map(function (row) { return row.map(function (c) { return kcell(conv(c)); }).join(''); }).join('') + '</div></section>';
    html += '<section class="card stack"><div class="eyebrow">탁음 · 반탁음</div><div class="kgrid">' + JP.kana.dakuGrid.map(function (row) { return row.map(function (c) { return kcell(conv(c)); }).join(''); }).join('') + '</div></section>';
    html += '<section class="card stack"><div class="eyebrow">요음</div><div class="kgrid three">' + JP.kana.yoonGrid.map(function (row) { return row.map(function (c) { return kcell(conv(c)); }).join(''); }).join('') + '</div></section>';
    if (!H) html += '<section class="card stack"><div class="eyebrow">외래어 확장음</div><div class="kgrid">' + JP.kana.ext.map(kcell).join('') + '</div></section>';
    html += '<div class="legend"><span><i style="background:var(--card);border:1px solid var(--line)"></i>아직</span><span><i style="background:var(--ruri-soft)"></i>학습 중</span><span><i style="background:var(--ruri)"></i>익숙함</span><span><i style="background:var(--gold-fill)"></i>마스터</span></div>';
    return html;
  }
  function kanaExample(k) {
    for (var d = 1; d <= JP.totalDays; d++) {
      var D = JP.days[d];
      if (!D || !D.vocab) continue;
      for (var i = 0; i < D.vocab.length; i++) { var v = D.vocab[i]; if (v.r.indexOf(k.c) >= 0) return v; }
    }
    return null;
  }
  function kanaDetailHtml(k, inCard) {
    var ex = kanaExample(k);
    var h = '<div class="glyph-wrap"><span class="glyph">' + k.c + '</span><div class="stack" style="align-items:center;gap:8px"><span class="glyph-ro">' + k.ro + '</span>' + audioBtn(k.c) + audioBtn(k.c, { slow: true, rate: 0.6 }) + '</div></div>';
    if (k.mn) h += '<div class="mn"><b>기억법</b> · ' + esc(k.mn) + '</div>';
    if (k.origin) h += '<div class="origin"><span class="oj">' + k.origin + '</span><span>이 글자는 한자 <b>' + k.origin + '</b>(' + esc(k.hun) + ')에서 왔어요.</span></div>';
    if (k.group === 'daku') h += '<div class="mn">탁점(゛)은 목청을 울리는 소리, 반탁점(゜)은 p 소리를 만듭니다.</div>';
    if (k.group === 'yoon') h += '<div class="mn">작은 ゃ·ゅ·ょ가 앞 글자와 합쳐져 <b>한 박자</b>로 소리 납니다.</div>';
    if (ex) h += '<div class="row"><div style="flex:1"><div class="eyebrow">예시 단어</div><div class="jp" style="font-size:22px">' + esc(ex.r) + ' <span class="small muted">' + esc(ex.w || '') + '</span></div><div class="small">' + esc(ex.m) + '</div></div>' + audioBtn(ex.r) + '</div>';
    h += '<details' + (inCard ? '' : ' open') + '><summary class="row small" style="cursor:pointer;color:var(--ruri);font-weight:700">' + I.pen.replace('<svg', '<svg style="width:18px;height:18px"') + ' 따라 써 보기</summary><div class="stack" style="margin-top:10px"><canvas class="pad" width="600" height="600" data-glyph="' + esc(k.c) + '"></canvas><div class="row" style="justify-content:center"><button class="btn sm ghost" data-act="padClear">지우기</button><button class="btn sm ghost" data-act="padGuide">본보기 켜기/끄기</button></div></div></details>';
    return h;
  }
  function openKana(ch) {
    var k = JP.kana.byChar[ch];
    say(k.c);
    showOverlay('<div class="overlay" role="dialog" aria-modal="true"><div class="scrim" data-act="closeOverlay"></div><div class="sheet"><div class="grab"></div><div class="stack">' + kanaDetailHtml(k) + '<button class="btn ghost block" data-act="closeOverlay">닫기</button></div></div></div>');
    initPads();
  }
  /* 쓰기 연습 패드 */
  function initPads() {
    U.$$('canvas.pad').forEach(function (cv) {
      if (cv._init) return; cv._init = true; cv._guide = true;
      var ctx = cv.getContext('2d'), drawing = false, last = null;
      function guide() {
        ctx.clearRect(0, 0, cv.width, cv.height);
        var cs = getComputedStyle(document.documentElement);
        ctx.strokeStyle = cs.getPropertyValue('--line'); ctx.lineWidth = 3; ctx.setLineDash([12, 12]);
        ctx.beginPath(); ctx.moveTo(300, 0); ctx.lineTo(300, 600); ctx.moveTo(0, 300); ctx.lineTo(600, 300); ctx.stroke(); ctx.setLineDash([]);
        if (cv._guide) {
          ctx.fillStyle = cs.getPropertyValue('--muted'); ctx.globalAlpha = .28;
          ctx.font = '600 430px "Klee One", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(cv.dataset.glyph, 300, 318); ctx.globalAlpha = 1;
        }
      }
      cv._guideFn = guide;
      if (document.fonts && document.fonts.load) document.fonts.load('600 60px "Klee One"', cv.dataset.glyph).then(guide, guide); else guide();
      function pos(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; }
      cv.addEventListener('pointerdown', function (e) { drawing = true; last = pos(e); cv.setPointerCapture(e.pointerId); });
      cv.addEventListener('pointermove', function (e) {
        if (!drawing) return; var p = pos(e);
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--ink'); ctx.lineWidth = 22; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p;
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { cv.addEventListener(ev, function () { drawing = false; }); });
    });
  }

  /* ================= 단어장 ================= */
  function viewBook() {
    var q = ui.bookQuery.trim().toLowerCase(), all = ui.bookAll || st().settings.unlockAll;
    var tabs = [['vocab', '단어'], ['gram', '문법'], ['line', '대사·대화']];
    var html = '<div class="sec-title"><h2>단어장</h2><div class="seg">' + tabs.map(function (t) { return '<button class="' + (ui.bookTab === t[0] ? 'on' : '') + '" data-act="bookTab" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div></div>';
    html += '<input class="search" id="bookSearch" type="search" placeholder="일본어·한자·뜻으로 검색" value="' + esc(ui.bookQuery) + '" data-input="bookSearch" autocomplete="off">';
    html += '<div class="row" style="justify-content:space-between"><span class="small muted">' + (all ? '전체 코스 미리보기' : '지금까지 배운 것만 표시') + '</span><button class="switch ' + (all ? 'on' : '') + '" data-act="bookAll" role="switch" aria-checked="' + all + '" aria-label="전체 보기"></button></div>';
    var learnedDay = function (it) { return all || isDone(it.day) || !!SRS.get(it.id); };
    var out = '', lastCh = 0, count = 0;
    function head(it) { var h = ''; if (it.ch !== lastCh) { lastCh = it.ch; var c = JP.sortedChapters[it.ch - 1]; h = '<div class="group-h">第' + c.n + '章 ' + esc(c.title) + '</div>'; } return h; }
    if (ui.bookTab === 'vocab') {
      JP.all.vocab.forEach(function (v) {
        if (!learnedDay(v)) return;
        if (q && (v.r + ' ' + v.w + ' ' + v.m + ' ' + C.romaji(v.r)).toLowerCase().indexOf(q) < 0) return;
        if (count++ > 400) return;
        out += head(v) + itemRow(v);
      });
    } else if (ui.bookTab === 'gram') {
      JP.all.gram.forEach(function (g) {
        if (!learnedDay(g)) return;
        if (q && (g.t + ' ' + g.m + ' ' + g.d).toLowerCase().indexOf(q) < 0) return;
        count++;
        out += head(g) + '<details class="gitem"><summary><span class="jp">' + esc(g.t) + '</span><span class="small muted">' + esc(g.m) + '</span></summary>' +
          '<div class="gram-d">' + g.d + '</div>' + g.x.map(exHtml).join('') + '</details>';
      });
    } else {
      JP.all.line.forEach(function (l) {
        if (!learnedDay(l)) return;
        if (q && (l.s.plain + ' ' + l.s.kana + ' ' + l.s.ko).toLowerCase().indexOf(q) < 0) return;
        count++;
        out += head(l) + '<div class="item-row"><div class="txt"><div class="jp">' + l.s.html + '</div><div class="m">' + esc(l.s.ko) + '</div></div>' + audioBtn(l.s.plain) + '</div>';
        var D = JP.days[l.day];
        if (D.dlg) out += '<details class="gitem"><summary><span class="small" style="color:var(--ruri);font-weight:700">장면 대화 듣기</span></summary>' + dialogHtml(D.dlg.lines, 'all') + '<button class="btn sm ghost" data-act="playDlg" data-day="' + D.day + '">' + I.play + ' 전체 재생</button></details>';
      });
    }
    html += '<section class="card" style="padding-top:4px">' + (out || '<p class="muted">' + (q ? '검색 결과가 없어요.' : '아직 배운 항목이 없어요. 첫 에피소드를 시작해 보세요!') + '</p>') + '</section>';
    return html;
  }
  function exHtml(s) {
    return '<div class="ex"><div class="txt"><div class="jp">' + s.html + '</div>' + (st().settings.furigana ? '' : '<div class="kana">' + esc(s.kana) + '</div>') + '<div class="ko">' + esc(s.ko) + '</div></div>' + audioBtn(s.plain) + '</div>';
  }
  function dialogHtml(lines, mode, now) {
    var whos = [];
    return '<div class="dlg">' + lines.map(function (l, i) {
      if (whos.indexOf(l.who) < 0) whos.push(l.who);
      var b = whos.indexOf(l.who) % 2 === 1;
      var jp = mode === 'none' ? '<span class="hid">••••••</span>' : mode === 'ko' ? '<span class="ko" style="font-size:15px">' + esc(l.s.ko) + '</span>' : l.s.html;
      var sub = mode === 'all' ? '<div class="ko">' + esc(l.s.ko) + '</div>' : '';
      return '<div class="ln ' + (b ? 'b' : '') + (now === i ? ' now' : '') + '" data-act="sayLine" data-t="' + esc(l.s.plain) + '"><span class="who">' + esc(l.who) + '</span><div style="flex:1;min-width:0"><div class="jp">' + jp + '</div>' + sub + '</div></div>';
    }).join('') + '</div>';
  }

  /* ================= 나: 통계 · 배지 · 설정 ================= */
  function skillPct(type) {
    var items = JP.all[type], sum = 0, s = st().srs;
    if (type === 'gram') items = items.filter(function (g) { return g.x.length; });
    items.forEach(function (it) { var r = s[it.id]; if (r) sum += Math.min(r[0], 4) / 4; });
    return items.length ? Math.round(sum / items.length * 100) : 0;
  }
  function viewMe() {
    var s = st(), ri = rankIdx(), r = RANKS[ri], lv = levelOf(s.xp), cur = levelXp(lv), nxt = levelXp(lv + 1);
    var html = '<section class="card profile"><div class="rank-emblem"><svg viewBox="0 0 100 100" fill="none" stroke="currentColor"><circle cx="50" cy="50" r="46" stroke-width="4"/><circle cx="50" cy="50" r="38" stroke-width="1.5"/></svg><b>' + r.k + '</b></div>' +
      '<div style="flex:1;min-width:0"><div class="eyebrow">' + r.k + '급 모험가 랭크</div><div class="rank-title">' + esc(r.jp) + '</div><div class="small muted">' + esc(r.ko) + (ri < 6 ? ' · 다음 승급: ' + RANKS[ri + 1].k + '급 (' + (ri + 1) * 30 + '화 시험)' : ' · 최고 랭크') + '</div>' +
      '<div class="lvl" style="margin-top:10px"><div class="bar"><i style="width:' + Math.round((s.xp - cur) / (nxt - cur) * 100) + '%"></i></div><div class="t"><span>Lv.' + lv + '</span><span class="tabnum">' + U.fmt(s.xp) + ' / ' + U.fmt(nxt) + ' XP</span></div></div></div></section>';
    var scores = s.hist.map(function (h) { return h[1]; });
    var avg = scores.length ? Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / scores.length) : 0;
    html += '<div class="tiles">' +
      tile('연속 학습', s.streak.n + '<small>일</small>', '최고 ' + s.streak.best + '일 · 보호권 ' + s.streak.freeze + '장') +
      tile('완료한 화', passedCount() + '<small>/180</small>', '하나마루 ' + hanaCount() + '개') +
      tile('익힌 단어', SRS.learnedCount('vocab') + '<small>개</small>', '오래 기억(7일↑) ' + SRS.masteredCount('vocab') + '개') +
      tile('평균 점수', (scores.length ? avg : '–') + '<small>점</small>', '평가 ' + scores.length + '회') +
      '</div>';
    var lisArr = (s.lis || '').split('');
    var lisRate = lisArr.length ? Math.round(lisArr.filter(function (c) { return c === '1'; }).length / lisArr.length * 100) : null;
    var cov = coverage();
    html += '<section class="card"><div class="sec-title"><h2 style="font-size:15px">능력치</h2><span class="small muted">코스 진척 기준</span></div>' +
      skill('문자', skillPct('kana')) + skill('어휘', skillPct('vocab')) + skill('문법', skillPct('gram')) + skill('애니 대사', skillPct('line')) +
      '<p class="small muted" style="margin:10px 0 0">각 항목을 복습 4단계(7일 간격) 이상까지 익히면 100%로 계산합니다. 최근 청해 문항 정답률: <b style="color:var(--ink)">' + (lisRate == null ? '아직 없음' : lisRate + '%') + '</b>' + (lisArr.length ? ' (최근 ' + lisArr.length + '문항)' : '') + '</p></section>';
    html += '<section class="card"><div class="sec-title"><h2 style="font-size:15px">애니 표현 커버리지</h2><span class="tabnum" style="font-weight:700">' + cov.pct + '%</span></div>' +
      '<div class="meter" style="margin:10px 0"><i style="width:' + cov.pct + '%"></i></div><p class="small muted" style="margin:0">이 코스에 수록된 단어·문법·대사 ' + U.fmt(cov.total) + '개 중 복습 3단계 이상으로 익힌 것 ' + U.fmt(cov.have) + '개. 실제 애니 전체 대사에 대한 이해도를 측정한 값은 아니에요.</p></section>';
    html += '<section class="card"><div class="sec-title"><h2 style="font-size:15px">평가 점수 추이</h2><span class="small muted">최근 30회</span></div>' + scoreChart(s.hist.slice(-30)) + '</section>';
    html += '<section class="card"><div class="sec-title"><h2 style="font-size:15px">학습 기록</h2><span class="small muted">최근 12주 · 획득 XP</span></div>' + heatmap() + '</section>';
    html += '<div class="sec-title"><h2>배지</h2><span class="jp">バッジ</span></div><div class="badges">' + BADGES.map(function (b) {
      var on = !!s.badges[b.id];
      return '<div class="badge ' + (on ? '' : 'off') + '">' + medal(b.g, on) + '<b>' + esc(b.n) + '</b><span>' + esc(b.d) + '</span></div>';
    }).join('') + '</div>';
    html += settingsHtml();
    html += designHtml();
    return html;
  }
  function tile(l, v, sub) { return '<div class="tile"><div class="l">' + l + '</div><div class="v tabnum">' + v + '</div><div class="small muted">' + sub + '</div></div>'; }
  function skill(l, p) { return '<div class="skill"><span>' + l + '</span><div class="meter"><i style="width:' + p + '%"></i></div><span class="v tabnum">' + p + '%</span></div>'; }
  function coverage() {
    var s = st().srs, total = 0, have = 0;
    ['vocab', 'gram', 'line'].forEach(function (t) { JP.all[t].forEach(function (it) { if (t === 'gram' && !it.x.length) return; total++; if (s[it.id] && s[it.id][0] >= 3) have++; }); });
    return { total: total, have: have, pct: total ? Math.round(have / total * 100) : 0 };
  }
  function scoreChart(h) {
    if (h.length < 2) return '<p class="small muted">평가를 두 번 이상 보면 점수 추이가 그려져요.</p>';
    var W = 320, H = 150, L = 30, R = 10, T = 12, B = 22, n = h.length;
    var x = function (i) { return L + (n === 1 ? 0 : i / (n - 1) * (W - L - R)); };
    var y = function (v) { return T + (100 - v) / 100 * (H - T - B); };
    var g = '';
    [0, 50, 100].forEach(function (v) { g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="var(--line)" stroke-width="1"/><text x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end" font-size="10" fill="var(--muted)">' + v + '</text>'; });
    g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(70) + '" y2="' + y(70) + '" stroke="var(--shu)" stroke-width="1" opacity=".55"/><text x="' + (W - R) + '" y="' + (y(70) - 4) + '" text-anchor="end" font-size="10" fill="var(--muted)">합격선 70</text>';
    var pts = h.map(function (e, i) { return x(i).toFixed(1) + ',' + y(e[1]).toFixed(1); });
    g += '<path d="M' + pts.join(' L') + ' L' + x(n - 1).toFixed(1) + ',' + y(0) + ' L' + x(0).toFixed(1) + ',' + y(0) + 'Z" fill="var(--ruri)" opacity=".1"/>';
    g += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="var(--ruri)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
    h.forEach(function (e, i) { g += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(e[1]).toFixed(1) + '" r="' + (i === n - 1 ? 5 : 3.5) + '" fill="var(--ruri)" stroke="var(--card)" stroke-width="2"/>'; });
    var lastE = h[n - 1];
    g += '<text x="' + x(n - 1) + '" y="' + (y(lastE[1]) - 10) + '" text-anchor="end" font-size="11" font-weight="700" fill="var(--ink)">' + lastE[1] + '점</text>';
    g += '<text x="' + L + '" y="' + (H - 4) + '" font-size="10" fill="var(--muted)">' + h[0][0] + '화</text><text x="' + (W - R) + '" y="' + (H - 4) + '" text-anchor="end" font-size="10" fill="var(--muted)">' + lastE[0] + '화</text>';
    g += '<rect class="hit" x="' + L + '" y="' + T + '" width="' + (W - L - R) + '" height="' + (H - T - B) + '" fill="transparent"/>';
    return '<div class="chart-wrap" data-chart="' + esc(JSON.stringify(h.map(function (e) { return [e[0], e[1], x(0), 0]; }))) + '" data-w="' + W + '" data-l="' + L + '" data-r="' + R + '"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="최근 평가 점수 선 그래프, 마지막 ' + lastE[1] + '점">' + g + '</svg><div class="chart-tip" hidden></div></div>' +
      '<table class="sr"><caption>평가 점수</caption>' + h.map(function (e) { return '<tr><td>' + e[0] + '화</td><td>' + e[1] + '점</td></tr>'; }).join('') + '</table>';
  }
  function bindCharts() {
    U.$$('.chart-wrap').forEach(function (w) {
      var data = JSON.parse(w.dataset.chart), svgEl = w.querySelector('svg'), tip = w.querySelector('.chart-tip');
      var W = +w.dataset.w, L = +w.dataset.l, R = +w.dataset.r, n = data.length;
      function show(e) {
        var r = svgEl.getBoundingClientRect(), vx = (e.clientX - r.left) / r.width * W;
        var i = Math.round((vx - L) / (W - L - R) * (n - 1)); i = U.clamp(i, 0, n - 1);
        var px = (L + i / (n - 1) * (W - L - R)) / W * r.width;
        var py = (12 + (100 - data[i][1]) / 100 * (150 - 12 - 22)) / 150 * r.height;
        tip.hidden = false; tip.textContent = data[i][0] + '화 · ' + data[i][1] + '점';
        tip.style.left = px + 'px'; tip.style.top = py + 'px';
      }
      svgEl.addEventListener('pointermove', show);
      svgEl.addEventListener('pointerdown', show);
      svgEl.addEventListener('pointerleave', function () { tip.hidden = true; });
    });
  }
  function heatmap() {
    var t = U.today(), act = st().act, start = t - 83;
    // 월요일 시작으로 정렬
    var dow = (new Date(start * 864e5).getUTCDay() + 6) % 7;
    start -= dow;
    var cells = '';
    for (var d = start; d <= t; d++) {
      var xp = act[U.dayStr(d)] || 0;
      var lv = xp === 0 ? 0 : xp < 50 ? 1 : xp < 100 ? 2 : xp < 200 ? 3 : 4;
      cells += '<i class="h' + lv + '" title="' + U.dayStr(d) + ' · ' + xp + ' XP"></i>';
    }
    return '<div class="heat" role="img" aria-label="최근 12주 학습 기록">' + cells + '</div><div class="heat-legend">적음 <i style="background:var(--heat-0)"></i><i style="background:var(--heat-1)"></i><i style="background:var(--heat-2)"></i><i style="background:var(--heat-3)"></i><i style="background:var(--heat-4)"></i> 많음</div>';
  }
  function settingsHtml() {
    var s = st().settings;
    var vopts = SP.voices.map(function (v) { return '<option value="' + esc(v.name) + '"' + (SP.voice && SP.voice.name === v.name ? ' selected' : '') + '>' + esc(v.name) + '</option>'; }).join('');
    return '<div class="sec-title"><h2>설정</h2><span class="jp">せってい</span></div><section class="card">' +
      '<div class="set-row"><div><div class="l">일본어 음성</div><div class="d">' + (SP.hasJa() ? '기기에 설치된 일본어 음성 ' + SP.voices.length + '개' : '일본어 음성을 찾지 못했어요') + '</div></div>' + (vopts ? '<select id="voiceSel" data-input="voice">' + vopts + '</select>' : '') + '</div>' +
      '<div class="set-row"><div><div class="l">말하기 속도</div><div class="d">기본 속도 <span class="tabnum" id="rateVal">' + s.rate.toFixed(2) + '</span>배</div></div><input id="rateRange" type="range" min="0.6" max="1.3" step="0.05" value="' + s.rate + '" data-input="rate"></div>' +
      '<div class="set-row"><div class="l">음성 테스트</div>' + audioBtn('アニメを字幕なしで楽しめるように、毎日少しずつ頑張りましょう。') + '</div>' +
      '<div class="set-row"><div><div class="l">로마자 표시</div><div class="d">자동: 1장(문자 단계)에서만 표시</div></div><div class="seg">' + [['auto', '자동'], ['always', '항상'], ['never', '숨김']].map(function (o) { return '<button class="' + (s.romaji === o[0] ? 'on' : '') + '" data-act="setRomaji" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="set-row"><div><div class="l">후리가나</div><div class="d">한자 위에 읽는 법 표시</div></div><button class="switch ' + (s.furigana ? 'on' : '') + '" data-act="toggle" data-v="furigana" role="switch" aria-checked="' + s.furigana + '" aria-label="후리가나"></button></div>' +
      '<div class="set-row"><div class="l">효과음</div><button class="switch ' + (s.sfx ? 'on' : '') + '" data-act="toggle" data-v="sfx" role="switch" aria-checked="' + s.sfx + '" aria-label="효과음"></button></div>' +
      '<div class="set-row"><div class="l">진동 (오답 시)</div><button class="switch ' + (s.haptics ? 'on' : '') + '" data-act="toggle" data-v="haptics" role="switch" aria-checked="' + s.haptics + '" aria-label="진동"></button></div>' +
      '<div class="set-row"><div><div class="l">화면 테마</div></div><div class="seg">' + [['system', '시스템'], ['light', '밝게'], ['dark', '어둡게']].map(function (o) { return '<button class="' + ((s.theme || 'system') === o[0] ? 'on' : '') + '" data-act="setTheme" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="set-row"><div><div class="l">체험 모드</div><div class="d">모든 화의 잠금을 풀어 미리 봅니다 (교육 담당자·검토용)</div></div><button class="switch ' + (s.unlockAll ? 'on' : '') + '" data-act="toggle" data-v="unlockAll" role="switch" aria-checked="' + s.unlockAll + '" aria-label="체험 모드"></button></div>' +
      '</section>' +
      '<section class="card stack"><div class="sec-title"><h2 style="font-size:15px">학습 기록 백업</h2></div><p class="small muted" style="margin:0">학습 기록은 이 기기의 브라우저에 저장됩니다. 브라우저 데이터를 지우면 사라질 수 있으니 가끔 백업 파일로 내보내 두세요.</p>' +
      '<div class="row"><button class="btn sm ghost" data-act="export">백업 내보내기</button><label class="btn sm ghost" for="importFile">백업 불러오기</label><input id="importFile" type="file" accept="application/json,.json" class="sr" data-input="import"></div>' +
      '<div class="danger-zone"><div class="row" style="justify-content:space-between"><div><div class="l">처음부터 다시 시작</div><div class="small muted">모든 진도·복습·배지가 지워집니다.</div></div><button class="btn sm bad" data-act="reset">' + (ui.resetArm ? '한 번 더 누르면 삭제' : '초기화') + '</button></div></div></section>';
  }
  function designHtml() {
    return '<details class="card"><summary style="cursor:pointer;font-weight:700">이 앱은 이렇게 설계되었어요</summary><div class="gram-d" style="margin-top:10px">' +
      '<p><b>간격 반복(SRS)</b> · 에빙하우스의 망각 곡선 연구 이후 반복 확인된 "간격 효과"를 적용해, 배운 항목을 1·2·4·7·14·30·60일 간격으로 다시 묻습니다.</p>' +
      '<p><b>인출 연습</b> · 다시 읽기보다 "떠올리기"가 기억을 더 강하게 만든다는 연구(시험 효과)에 따라, 매 화를 평가로 마무리합니다.</p>' +
      '<p><b>듣기 우선</b> · 목표가 애니 청해이므로 모든 단어·예문에 음성을 붙이고, 평가마다 듣기 문항을 최소 3개 넣었습니다. 6장에서는 장면 대화를 한국어 자막 → 일본어 자막 → 자막 없음 순서로 듣습니다.</p>' +
      '<p><b>한국어 화자 맞춤</b> · 어순·조사·한자음이 닮은 점을 적극 활용해 설명합니다(예: 約束 = 약속).</p>' +
      '<p><b>구어 집중</b> · 교과서 존댓말만으로는 애니가 들리지 않기 때문에 반말·문말 조사·축약(〜てる, 〜ちゃう)·역할어를 따로 다룹니다.</p>' +
      '<p><b>게임 요소</b> · 스탬프 카드, 연속 학습, 레벨, 랭크, 보스전, 배지. 자기결정성 이론이 말하는 "유능감"을 매일 확인할 수 있도록 설계했습니다. 틀려도 목숨이 깎이지 않고(보스전 제외), 몇 번이든 다시 도전할 수 있어요.</p>' +
      '<p class="small muted">현실적인 기대치: 6개월 코스를 마치면 일상·학원물의 쉬운 대사와 자주 나오는 표현은 상당 부분 알아들을 수 있지만, 모든 애니를 자막 없이 완전히 이해하려면 이후에도 꾸준한 시청과 어휘 확장이 필요합니다.</p>' +
      '</div></details>';
  }

  /* ================= 러너 (한 화 진행) ================= */
  function buildCards(D) {
    var cards = [];
    D.kana.forEach(function (k) { cards.push({ t: 'kana', k: k }); });
    if (D.confuse) cards.push({ t: 'confuse', groups: D.confuse });
    D.vocab.forEach(function (v) { cards.push({ t: 'vocab', v: v }); });
    if (D.pairs && D.pairs.length) cards.push({ t: 'pairs', pairs: D.pairs });
    D.gram.forEach(function (g) { cards.push({ t: 'gram', g: g }); });
    if (D.dlg) cards.push({ t: 'dlg', dlg: D.dlg });
    return cards;
  }
  function buildSteps(day, mode) {
    var D = JP.days[day];
    if (mode === 'testOnly') return [{ k: 'testIntro' }, { k: 'test', qs: Q.test(day) }, { k: 'result' }];
    if (D.type === 'lesson') {
      var steps = [{ k: 'intro' }];
      var due = SRS.due().filter(function (id) { return JP.items[id].day < day; });
      if (due.length) steps.push({ k: 'warmup', qs: Q.forItems(due.slice(0, 8), 8) });
      steps.push({ k: 'learn', cards: buildCards(D) });
      steps.push({ k: 'practice', qs: Q.practice(day) });
      if (D.line) steps.push({ k: 'line' });
      if (D.note) steps.push({ k: 'note' });
      steps.push({ k: 'testIntro' }, { k: 'test', qs: Q.test(day) }, { k: 'result' });
      return steps;
    }
    if (D.type === 'boss') return [{ k: 'bossIntro' }, { k: 'boss', qs: Q.boss(day) }, { k: 'result' }];
    if (D.type === 'listen') return [{ k: 'listenIntro' }, { k: 'listenTest', qs: Q.listen(day) }, { k: 'result' }];
    return [{ k: 'examIntro' }, { k: 'exam', qs: Q.exam(day) }, { k: 'result' }];
  }
  var STEP_LABEL = { intro: '시작', warmup: '워밍업 복습', learn: '새로 배우기', practice: '연습', line: '오늘의 애니 대사', note: '인문학 한 스푼', testIntro: '오늘의 평가', test: '오늘의 평가', result: '결과', bossIntro: '보스전', boss: '보스전', listenIntro: '청해 특훈', listenTest: '청해 특훈', examIntro: '승급 시험', exam: '승급 시험', review: '복습' };
  var GRADED = { test: 1, boss: 1, listenTest: 1, exam: 1 };

  function startRun(day, mode) {
    closeOverlay();
    SP.unlock();
    run = {
      day: day, D: JP.days[day], mode: mode || 'full', steps: buildSteps(day, mode), si: 0, i: 0,
      answers: [], xpLive: 0, queue: null, cur: null, answered: false, combo: 0,
      boss: { hp: 14, max: 14, lives: 7 }, shadow: 0, subMode: 'ko'
    };
    renderRun();
  }
  function startReview(kind) {
    var ids;
    if (kind === 'due') ids = SRS.due().slice(0, 20);
    else if (kind === 'weak') ids = SRS.weakest(15);
    else ids = U.sample(Object.keys(st().srs).filter(function (id) { var it = JP.items[id]; return it && it.type !== 'kana' || (it && Math.random() < .3); }), 15);
    if (!ids.length) { toast('복습할 항목이 없어요.'); return; }
    var qs = kind === 'listen' ? ids.map(function (id) { var q = Q.qFor(JP.items[id], 'listen'); if (q) q.srsId = id; return q; }).filter(Boolean) : Q.forItems(U.shuffle(ids), ids.length);
    run = { day: 0, D: null, mode: 'review', reviewKind: kind, steps: [{ k: 'review', qs: qs }, { k: 'result' }], si: 0, i: 0, answers: [], xpLive: 0, combo: 0 };
    renderRun();
  }
  function stepNow() { return run.steps[run.si]; }
  function progressPct() {
    var s = stepNow(), base = run.si / run.steps.length, within = 0;
    if (s.qs) within = Math.min(1, run.i / Math.max(1, run.queue ? run.queue.length : s.qs.length));
    if (s.cards) within = run.i / s.cards.length;
    return Math.round((base + within / run.steps.length) * 100);
  }
  function renderRun(keepScroll) {
    var s = stepNow();
    if (!s.qs) run.queue = null;
    var graded = GRADED[s.k];
    var top = '<div class="run-top"><button class="icon-btn" data-act="quit" aria-label="그만하기">' + I.close + '</button>' +
      '<div class="pbar ' + (graded ? 'test' : '') + '"><i style="width:' + progressPct() + '%"></i></div><span class="run-label">' + STEP_LABEL[s.k] + '</span></div>';
    var body = '', foot = '';
    var fn = STEPS[s.k];
    var out = fn();
    body = out.body; foot = out.foot || '';
    var html = '<div class="runner" role="dialog" aria-modal="true" aria-label="' + (run.D ? run.D.day + '화 ' + esc(run.D.title) : '복습') + '">' + top +
      '<div class="run-body" id="runBody"><div class="in">' + body + '</div></div><div class="run-foot" id="runFoot">' + foot + '</div></div><div id="fb"></div>';
    var ov = document.getElementById('overlay');
    ov.innerHTML = html;
    if (!keepScroll) { var rb = document.getElementById('runBody'); if (rb) rb.scrollTop = 0; }
    if (out.after) out.after();
    initPads();
  }
  function nextStep() {
    run.si++; run.i = 0; run.queue = null; run.cur = null;
    if (run.si >= run.steps.length) { endRun(); return; }
    if (stepNow().k === 'result') finishRun();
    renderRun();
  }

  var STEPS = {
    intro: function () {
      var D = run.D, ch = C.chapterOf(D.day), s = run.steps;
      var list = s.filter(function (x) { return x.k !== 'intro' && x.k !== 'result' && x.k !== 'testIntro'; }).map(function (x, i) {
        var extra = x.k === 'warmup' ? ' · ' + x.qs.length + '문항' : x.k === 'learn' ? ' · 카드 ' + x.cards.length + '장' : x.k === 'practice' ? ' · ' + x.qs.length + '문항' : x.k === 'test' ? ' · 10문항, 70점 통과' : '';
        return '<div><span class="n">' + (i + 1) + '</span>' + STEP_LABEL[x.k] + '<span class="muted small">' + extra + '</span></div>';
      }).join('');
      return {
        body: '<div class="titlecard"><div class="eyebrow">' + esc(ch.jp) + ' · 第' + ch.n + '章</div><div class="ep">第' + D.day + '話</div><h1>' + esc(D.title) + '</h1><div class="muted">' + esc(D.sub) + '</div></div>' +
          (D.tip ? '<div class="banner"><b>오늘의 팁</b> · ' + esc(D.tip) + '</div>' : '') +
          '<div class="card stack"><div class="eyebrow">오늘의 순서 · 약 ' + (D.kana.length > 12 ? 25 : 20) + '~30분</div><div class="steps-list">' + list + '</div></div>',
        foot: '<button class="btn block" data-act="next">시작</button>'
      };
    },
    warmup: function () { return qStep('어제까지 배운 것 중 복습할 때가 된 항목이에요.'); },
    review: function () { return qStep(); },
    practice: function () { return qStep(); },
    learn: function () {
      var s = stepNow(), c = s.cards[run.i], n = s.cards.length, body = '', after = null;
      if (c.t === 'kana') {
        body = '<div class="lcard"><div class="kind">새 글자 · ' + (c.k.script === 'H' ? '히라가나' : '가타카나') + '</div>' + kanaDetailHtml(c.k, true) + '</div>';
        after = function () { say(c.k.c); };
      } else if (c.t === 'vocab') {
        var v = c.v;
        body = '<div class="lcard"><div class="kind">새 단어</div><div class="vocab-main"><div class="r">' + esc(v.r) + '</div>' + (v.w && v.w !== v.r ? '<div class="w">' + esc(v.w) + '</div>' : '') +
          (JP.romajiOn(v) ? '<div class="ro">' + esc(v.ro || C.romaji(v.r)) + '</div>' : '') + '<div class="m">' + esc(v.m) + '</div></div>' +
          (v.h ? '<div class="hint">' + esc(v.h) + '</div>' : '') +
          '<div class="row" style="justify-content:center">' + audioBtn(v.r) + audioBtn(v.r, { slow: true, rate: 0.6 }) + '</div></div>';
        after = function () { say(v.r); };
      } else if (c.t === 'gram') {
        var g = c.g;
        body = '<div class="lcard"><div class="kind">문법 · 표현</div><div class="gram-title">' + esc(g.t) + '</div><div class="gram-m">' + esc(g.m) + '</div><div class="gram-d">' + g.d + '</div>' +
          (g.x.length ? '<div>' + g.x.map(exHtml).join('') + '</div>' : '') + '</div>';
      } else if (c.t === 'confuse') {
        body = '<div class="lcard"><div class="kind">헷갈리는 글자 비교</div><p class="small muted" style="margin:0">나란히 놓고 다른 점을 찾아보세요. 글자를 누르면 소리가 나요.</p>' +
          c.groups.map(function (gr) { return '<div class="kgrid" style="grid-template-columns:repeat(' + gr.length + ',1fr)">' + gr.split('').map(function (ch) { return kcell(ch); }).join('') + '</div>'; }).join('') + '</div>';
      } else if (c.t === 'pairs') {
        body = '<div class="lcard"><div class="kind">소리 구별 훈련</div><p class="small muted" style="margin:0">비슷하게 들리지만 뜻이 다른 말들입니다. 번갈아 들으며 차이를 느껴 보세요.</p>' +
          c.pairs.map(function (p) { return '<div class="row" style="border-top:1px dashed var(--line);padding-top:10px"><div style="flex:1" class="row">' + audioBtn(p[0]) + '<div><div class="jp" style="font-size:22px">' + esc(p[0]) + '</div><div class="small muted">' + esc(p[2]) + '</div></div></div><div style="flex:1" class="row">' + audioBtn(p[1]) + '<div><div class="jp" style="font-size:22px">' + esc(p[1]) + '</div><div class="small muted">' + esc(p[3]) + '</div></div></div></div>'; }).join('') + '</div>';
      } else if (c.t === 'dlg') {
        body = '<div class="lcard"><div class="kind">장면 대화 · 자막 단계 훈련</div><p class="small muted" style="margin:0">① 한국어 자막으로 내용을 파악 → ② 일본어 자막으로 소리와 글자 맞추기 → ③ 자막 없이 듣기. 대사를 누르면 한 줄씩 들려요.</p>' +
          '<div class="seg">' + [['ko', '한국어 자막'], ['jp', '일본어 자막'], ['none', '자막 없음']].map(function (o) { return '<button class="' + (run.subMode === o[0] ? 'on' : '') + '" data-act="subMode" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>' +
          '<div id="dlgBox">' + dialogHtml(c.dlg.lines, run.subMode) + '</div><button class="btn ghost" data-act="playDlg" data-day="' + c.dlg.day + '">' + I.play + ' 대화 재생</button></div>';
      }
      return {
        body: body + '<div class="counter">' + (run.i + 1) + ' / ' + n + '</div>',
        foot: '<div class="card-nav">' + (run.i > 0 ? '<button class="btn ghost" data-act="cardPrev">이전</button>' : '') + '<button class="btn" data-act="cardNext">' + (run.i === n - 1 ? '연습하러 가기' : '다음') + '</button></div>',
        after: after
      };
    },
    line: function () {
      var l = run.D.line, show = run.showKo;
      return {
        body: '<div class="line-card"><div class="eyebrow">今日のセリフ · 오늘의 애니 대사</div><div class="jp">' + l.s.html + '</div>' +
          (show ? '<div class="ko">' + esc(l.s.ko) + '</div>' : '<button class="btn sm ghost" data-act="showKo" style="background:transparent;color:var(--paper);border-color:rgba(255,255,255,.3);box-shadow:none">해석 보기</button>') +
          '<div class="speed" style="margin-top:14px"><button data-act="say" data-t="' + esc(l.s.plain) + '" data-r="0.75">' + I.speaker + '천천히 0.75</button><button data-act="say" data-t="' + esc(l.s.plain) + '" data-r="1">' + I.speaker + '보통 1.0</button><button data-act="say" data-t="' + esc(l.s.plain) + '" data-r="1.25">' + I.speaker + '애니 속도 1.25</button></div></div>' +
          (l.n ? '<div class="mn">' + esc(l.n) + '</div>' : '') +
          '<div class="card stack"><div class="row" style="justify-content:space-between"><div><b>따라 말하기 (쉐도잉)</b><div class="small muted">음성을 듣고 바로 소리 내어 따라 해 보세요. 3번!</div></div><div class="shadow-count">' + [0, 1, 2].map(function (i) { return '<i class="' + (i < run.shadow ? 'on' : '') + '"></i>'; }).join('') + '</div></div>' +
          '<button class="btn ghost" data-act="shadow">' + I.mic + ' 들었고, 따라 말했어요</button></div>',
        foot: '<button class="btn block" data-act="next">다음</button>',
        after: function () { if (!run._lineAuto) { run._lineAuto = true; say(l.s.plain); } }
      };
    },
    note: function () {
      var n = run.D.note;
      return {
        body: '<div class="note-card"><div class="eyebrow">人文学のひとさじ · 인문학 한 스푼</div><h3>' + esc(n[0]) + '</h3>' + n[1].split('\n\n').map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>',
        foot: '<button class="btn block" data-act="next">평가 보러 가기</button>'
      };
    },
    testIntro: function () {
      return {
        body: '<div class="titlecard"><div class="eyebrow">第' + run.D.day + '話</div><h1>오늘의 평가</h1><div class="muted">今日のテスト</div></div>' +
          '<div class="card stack"><div class="steps-list"><div><span class="n">10</span>오늘 배운 내용 + 지난 복습 2문항</div><div><span class="n">70</span>70점 이상이면 통과, 다음 화가 열려요</div><div><span class="n">90</span>90점 이상이면 하나마루(◎) 도장</div><div><span class="n">' + I.headphones.replace('<svg', '<svg style="width:14px;height:14px"') + '</span>듣기 문항이 3개 이상 나와요</div></div>' +
          '<p class="small muted" style="margin:0">평가 중에는 정답을 바로 알려 주지 않아요. 끝나고 틀린 문제를 모아 보여 드립니다.</p></div>',
        foot: '<button class="btn shu block" data-act="next">평가 시작</button>'
      };
    },
    test: function () { return qStep(); },
    bossIntro: function () {
      var b = run.D.boss;
      return {
        body: '<div class="boss-card">' + bossSvg() + '<div class="name">' + esc(b.jp) + '</div><div class="sub">' + esc(run.D.sub) + '</div></div>' +
          '<div class="card stack"><div class="steps-list"><div><span class="n">14</span>14문제를 맞히면 보스 격파</div><div><span class="n">7</span>7번 틀리면 패배 — 다시 도전할 수 있어요</div><div><span class="n">+1</span>격파하면 연속 학습 보호권 1장</div></div><p class="small muted" style="margin:0">범위: ' + run.D.range[0] + '화 ~ ' + run.D.range[1] + '화</p></div>',
        foot: '<button class="btn shu block" data-act="next">' + I.sword + ' 도전!</button>'
      };
    },
    boss: function () { return qStep(); },
    listenIntro: function () {
      return {
        body: '<div class="titlecard"><div class="eyebrow">第' + run.D.day + '話</div><h1>청해 특훈</h1><div class="muted">聞き取り特訓</div></div>' +
          '<div class="card stack"><div class="steps-list"><div><span class="n">1</span>1~5번: 0.9배속</div><div><span class="n">2</span>6~10번: 1.0배속</div><div><span class="n">3</span>11~15번: 1.15~1.25배속 (애니 속도)</div></div><p class="small muted" style="margin:0">글자 없이 소리만 들려요. 다시 듣기는 몇 번이든 괜찮습니다.</p></div>',
        foot: '<button class="btn shu block" data-act="next">' + I.headphones + ' 시작</button>'
      };
    },
    listenTest: function () { return qStep(); },
    examIntro: function () {
      var ch = C.chapterOf(run.D.day);
      return {
        body: '<div class="titlecard"><div class="eyebrow">' + esc(ch.jp) + '</div><div class="ep">' + ch.rankFrom + ' → ' + ch.rankTo + '</div><h1>승급 시험</h1><div class="muted">昇級試験</div></div>' +
          '<div class="card stack"><div class="steps-list"><div><span class="n">30</span>문자 · 어휘 · 문법 · 청해 영역별 문항</div><div><span class="n">70</span>70점 이상 합격 → ' + ch.rankTo + '급 승급</div></div><p class="small muted" style="margin:0">챕터 전체 범위입니다. 시간 제한은 없어요.</p></div>',
        foot: '<button class="btn shu block" data-act="next">' + I.scroll + ' 시험 시작</button>'
      };
    },
    exam: function () { return qStep(); },
    result: function () { return resultView(); }
  };

  /* ---------- 문제 단계 ---------- */
  function qStep(note) {
    var s = stepNow();
    if (!run.queue) run.queue = s.qs.slice();
    if (run.i >= run.queue.length) { setTimeout(nextStep, 0); return { body: '' }; }
    var q = run.queue[run.i];
    run.cur = q; run.answered = false;
    if (q.kind === 'order') run.order = [];
    if (q.kind === 'match') run.match = { sel: null, done: {}, miss: 0 };
    var head = '';
    if (s.k === 'boss') head = bossHud();
    if (s.k === 'listenTest') head = '<div class="row" style="justify-content:space-between"><span class="type-badge listen">' + q.stage + '단계 · ' + q.rate + '배속</span><span class="small muted tabnum">' + (run.i + 1) + ' / ' + run.queue.length + '</span></div>';
    else if (s.k === 'exam') head = '<div class="row" style="justify-content:space-between"><span class="type-badge exam">' + ({ kana: '문자', vocab: '어휘', gram: '문법', listen: '청해' })[q.section] + '</span><span class="small muted tabnum">' + (run.i + 1) + ' / ' + run.queue.length + '</span></div>';
    else if (s.k !== 'boss') head = '<div class="row" style="justify-content:space-between">' + (q.review ? '<span class="type-badge">복습 문제</span>' : '<span></span>') + '<span class="small muted tabnum">' + (run.i + 1) + ' / ' + run.queue.length + '</span></div>';
    if (note && run.i === 0) head += '<p class="small muted" style="margin:0">' + note + '</p>';
    var r = renderQ(q);
    return { body: head + r.body, foot: r.foot || '', after: function () { autoAudio(q); } };
  }
  function bossHud() {
    var b = run.boss, hearts = '';
    for (var i = 0; i < 7; i++) hearts += I.heart.replace('<svg', '<svg class="' + (i < b.lives ? '' : 'off') + '"');
    return '<div class="boss-hud" id="bossHud"><div class="t"><span class="jp">' + esc(run.D.boss.jp) + '</span><span class="tabnum">HP ' + b.hp + '/' + b.max + '</span></div><div class="hpbar"><i style="width:' + (b.hp / b.max * 100) + '%"></i></div><div class="hearts" aria-label="남은 목숨 ' + b.lives + '">' + hearts + '</div></div>';
  }
  function audioText(q) { return q.prompt.audio || ''; }
  function autoAudio(q) {
    if (!q.prompt || q.kind === 'order') return;
    var rate = q.rate || 1;
    if (q.prompt && q.prompt.dialog) { setTimeout(function () { runDialogPrompt(); }, 150); return; }
    var t = audioText(q);
    if (t) setTimeout(function () { say(t, rate, document.querySelector('.q-prompt .audio-btn.big')); }, 120);
  }
  function runDialogPrompt() {
    var q = run && run.cur; if (!q || !q.prompt.dialog) return;
    var box = document.getElementById('qDlg');
    playDialog(q.prompt.dialog, q.rate || 1, function (i) {
      if (!box) return;
      U.$$('.ln', box).forEach(function (el, j) { el.classList.toggle('now', j === i); });
    });
  }

  function renderQ(q) {
    if (q.kind === 'match') return renderMatch(q);
    if (q.kind === 'order') return renderOrder(q);
    var p = q.prompt, body = '<div class="q-head">' + esc(p.q || '') + '</div><div class="q-prompt">';
    var noVoice = !SP.hasJa();
    if (p.dialog) {
      body += '<div id="qDlg" style="width:100%;text-align:left">' + dialogHtml(p.dialog, noVoice ? 'jp' : 'none') + '</div><button class="btn ghost sm" data-act="replayDlg">' + I.play + ' 다시 듣기</button>';
    } else if (p.audio) {
      body += '<div class="row" style="justify-content:center">' + audioBtn(p.audio, { big: true, rate: q.rate || 1 }) + audioBtn(p.audio, { slow: true, rate: 0.6 }) + '</div>' +
        (noVoice ? '<div class="q-small">(음성 없음) <span class="jp">' + esc(p.audio) + '</span></div>' : '');
    } else if (p.big) {
      body += '<div class="' + p.cls + '">' + esc(p.big) + '</div>';
      if (p.small) body += '<div class="q-small jp">' + esc(p.small) + '</div>';
      if (p.ro) body += '<div class="q-small">' + esc(p.ro) + '</div>';
      if (p.audioBtn) body += audioBtn(p.audioBtn);
    } else if (p.html) {
      body += '<div class="q-sent">' + p.html + '</div>';
      if (p.ko) body += '<div class="q-ko">' + esc(p.ko) + '</div>';
    }
    body += '</div>';
    var long = q.options.some(function (o) { return String(o.label).replace(/<[^>]+>/g, '').length > 11; }) || q.optCls === 'ko-opt';
    body += '<div class="opts ' + (long ? 'one' : '') + '" id="opts">' + q.options.map(function (o) {
      return '<button class="opt ' + (q.optCls || '') + '" data-act="ans" data-v="' + o.value + '">' + (q.optHtml ? o.label : esc(o.label)) + '</button>';
    }).join('') + '</div>';
    return { body: body };
  }
  function renderOrder(q) {
    var body = '<div class="q-head">' + esc(q.prompt.q) + '</div><div class="q-prompt"><div class="q-ko" style="font-size:17px">' + esc(q.prompt.ko) + '</div>' + (q.prompt.audioBtn ? audioBtn(q.prompt.audioBtn) : '') + '</div>' +
      '<div class="order-tray" id="tray" aria-label="고른 순서">' + run.order.map(function (ti, j) { var t = q.tokens[ti]; return '<button class="tok" data-act="untok" data-j="' + j + '">' + t.html + '</button>'; }).join('') + '</div>' +
      '<div class="order-bank">' + q.tokens.map(function (t, ti) { return '<button class="tok ' + (run.order.indexOf(ti) >= 0 ? 'used' : '') + '" data-act="tok" data-i="' + ti + '">' + t.html + '</button>'; }).join('') + '</div>';
    var full = run.order.length === q.tokens.length;
    return { body: body, foot: '<button class="btn block" data-act="orderCheck" ' + (full ? '' : 'disabled') + '>확인</button>' };
  }
  function renderMatch(q) {
    var m = run.match;
    var body = '<div class="q-head">짝을 맞춰 보세요</div><div class="match"><div class="col">' + q.left.map(function (p) {
      return '<button class="mbtn jp ' + (m.done[p.id] ? 'gone' : '') + (m.sel === p.id ? ' sel' : '') + '" data-act="mL" data-id="' + p.id + '">' + esc(p.l) + '</button>';
    }).join('') + '</div><div class="col">' + q.right.map(function (p) {
      return '<button class="mbtn ' + (m.done[p.id] ? 'gone' : '') + '" data-act="mR" data-id="' + p.id + '">' + esc(p.r) + '</button>';
    }).join('') + '</div></div>';
    return { body: body };
  }

  /* ---------- 채점 ---------- */
  function isGradedStep() { return !!GRADED[stepNow().k]; }
  function recordAnswer(q, ok) {
    var s = st(), k = stepNow().k;
    run.answers.push({ q: q, ok: ok, step: k });
    s.cnt.ans++; if (ok) { s.cnt.ok++; run.combo++; s.cnt.combo = run.combo; s.cnt.comboBest = Math.max(s.cnt.comboBest, run.combo); } else run.combo = 0;
    if (q.listening) { s.lis = ((s.lis || '') + (ok ? '1' : '0')).slice(-50); }
    var id = q.srsId || (q.item && q.item.id);
    if (k === 'warmup' || k === 'review') {
      if (id && SRS.get(id)) SRS.answer(id, ok);
      s.cnt.reviews++;
      if (ok) run.xpLive += 3;
    } else if (k === 'practice') {
      if (ok && !q._retry) run.xpLive += 2;
    } else if (!ok && id && SRS.get(id)) SRS.flagWeak(id);
  }
  function answerChoice(v, btn) {
    if (run.answered) return;
    run.answered = true;
    var q = run.cur, ok = v === q.answer;
    var opts = document.getElementById('opts'); if (opts) opts.classList.add('locked');
    if (btn) btn.classList.add(ok ? 'sel-ok' : 'sel-bad');
    recordAnswer(q, ok);
    afterAnswer(q, ok);
  }
  function afterAnswer(q, ok) {
    JP.sfx(ok ? 'ok' : 'bad');
    var k = stepNow().k;
    if (isGradedStep()) {
      if (k === 'boss') {
        if (ok) run.boss.hp = Math.max(0, run.boss.hp - 1); else run.boss.lives = Math.max(0, run.boss.lives - 1);
        var hud = document.getElementById('bossHud');
        if (hud) { hud.outerHTML = bossHud(); var h2 = document.getElementById('bossHud'); if (h2 && ok) h2.classList.add('hit'); }
        if (ok) JP.sfx('hit');
      }
      stampPop(ok);
      setTimeout(function () {
        document.getElementById('fb').innerHTML = '';
        if (k === 'boss' && (run.boss.hp <= 0 || run.boss.lives <= 0)) { nextStep(); return; }
        advance();
      }, 720);
    } else {
      if (!ok && k === 'practice' && !q._retry) { var again = Object.assign({}, q, { _retry: true, options: q.options ? U.shuffle(q.options) : q.options, tokens: q.tokens ? U.shuffle(q.tokens) : q.tokens, left: q.left ? U.shuffle(q.left) : q.left, right: q.right ? U.shuffle(q.right) : q.right }); run.queue.push(again); }
      showFeedback(q, ok);
    }
  }
  function advance() { run.i++; SP.stop(); renderRun(); }
  function stampPop(ok) {
    document.getElementById('fb').innerHTML = '<div class="stamp-pop" aria-live="polite"><div class="mark ' + (ok ? 'ok' : 'bad') + '">' + stampSvg(ok ? 'maru' : 'x', 'stamp-svg') + '</div><span class="sr">' + (ok ? '정답' : '오답') + '</span></div>';
  }
  function correctLabel(q) {
    if (q.kind === 'choice') { var o = q.options.filter(function (x) { return x.value === q.answer; })[0]; return o ? (q.optHtml ? o.label : esc(o.label)) : ''; }
    if (q.kind === 'order') return q.answerSeq.map(C.rubyHtml).join(' ');
    return '';
  }
  function revealHtml(rv) {
    if (!rv) return '';
    if (rv.dialog) return dialogHtml(rv.dialog, 'all');
    if (rv.html) return '<div class="reveal"><div class="txt"><div class="jp">' + rv.html + '</div><div class="kana">' + esc(rv.kana) + '</div><div class="ko">' + esc(rv.ko) + '</div></div>' + audioBtn(rv.audio) + '</div>';
    return '<div class="reveal"><div class="txt"><div class="jp" style="font-size:24px">' + esc(rv.big) + (rv.sub ? ' <span class="small muted" style="font-family:var(--font-body)">' + esc(rv.sub) + '</span>' : '') + '</div>' + (rv.ko ? '<div class="ko">' + esc(rv.ko) + '</div>' : '') + (rv.note ? '<div class="small muted">' + esc(rv.note) + '</div>' : '') + (rv.hint ? '<div class="small muted">' + esc(rv.hint) + '</div>' : '') + '</div>' + (rv.audio ? audioBtn(rv.audio) : '') + '</div>';
  }
  var PRAISE = ['정답!', '좋아요!', '완벽해요!', 'すごい!', 'その調子!'];
  function showFeedback(q, ok) {
    var title = ok ? (run.combo >= 5 ? run.combo + '연속 정답!' : U.pick(PRAISE)) : '아쉬워요';
    var html = '<div class="feedback ' + (ok ? 'ok' : 'bad') + '" role="status"><div class="in"><div class="fb-title">' + (ok ? I.check : I.x).replace('<svg', '<svg style="width:22px;height:22px"') + title + '</div>' +
      (!ok && q.kind !== 'match' ? '<div class="small">정답: <b class="' + (q.optCls === 'jp-opt' || q.kind === 'order' ? 'jp' : '') + '">' + correctLabel(q) + '</b>' + (stepNow().k === 'practice' ? ' <span class="muted">· 이 문제는 끝에 한 번 더 나와요</span>' : '') + '</div>' : '') +
      revealHtml(q.reveal) +
      '<button class="btn ' + (ok ? 'ok' : 'bad') + ' block" data-act="cont">계속</button></div></div>';
    document.getElementById('fb').innerHTML = html;
    var foot = document.getElementById('runFoot'); if (foot) foot.innerHTML = '';
    if (!ok && q.reveal && q.reveal.audio && q.kind !== 'match') setTimeout(function () { say(q.reveal.audio); }, 200);
  }

  /* ---------- 결과 ---------- */
  function touchStreak() {
    var s = st(), t = U.today(), k = s.streak;
    if (k.last === t) return false;
    if (k.last === t - 1) k.n++;
    else if (k.last === t - 2 && k.freeze > 0) { k.freeze--; k.n++; toast('연속 학습 보호권을 사용했어요!'); }
    else k.n = 1;
    k.last = t; k.best = Math.max(k.best, k.n);
    return true;
  }
  function addXp(n) { var s = st(); s.xp += n; var d = U.todayStr(); s.act[d] = (s.act[d] || 0) + n; }
  function checkBadges() {
    var s = st(), fresh = [];
    BADGES.forEach(function (b) { if (!s.badges[b.id] && b.c()) { s.badges[b.id] = U.todayStr(); fresh.push(b); } });
    return fresh;
  }
  function finishRun() {
    var s = st(), r = run, res = { xp: [], badges: [], rankUp: null, lvBefore: levelOf(s.xp) }, rankBefore = rankIdx();
    s.flags = s.flags || {};
    var hr = new Date().getHours();
    if (hr >= 23 || hr < 4) s.flags.owl = true;
    if (hr >= 4 && hr < 7) s.flags.early = true;
    if (r.xpLive) res.xp.push(['연습·복습 정답', r.xpLive]);
    if (r.mode === 'review') {
      var n = r.answers.length, c = r.answers.filter(function (a) { return a.ok; }).length;
      res.score = n ? Math.round(c / n * 100) : 0; res.correct = c; res.total = n;
      if (n >= 5) touchStreak();
    } else {
      var D = r.D, gradedK = { test: 1, boss: 1, listenTest: 1, exam: 1 };
      var ga = r.answers.filter(function (a) { return gradedK[a.step]; });
      var total = ga.length, correct = ga.filter(function (a) { return a.ok; }).length;
      var score = total ? Math.round(correct / total * 100) : 0;
      var pass, grade;
      if (D.type === 'boss') { pass = r.boss.hp <= 0; grade = pass ? (total - correct <= 1 ? 'hana' : 'maru') : 'san'; }
      else { pass = score >= 70; grade = score >= 90 ? 'hana' : pass ? 'maru' : 'san'; }
      var prev = s.prog[D.day];
      var firstPass = pass && !(prev && prev.pass);
      var firstHana = grade === 'hana' && !(prev && prev.grade === 'hana');
      var p = s.prog[D.day] = prev || { best: 0, grade: 'san', tries: 0, pass: false };
      p.tries++; p.best = Math.max(p.best, score); p.last = U.todayStr();
      if (GRADE_RANK[grade] > GRADE_RANK[p.grade]) p.grade = grade;
      if (pass) { p.pass = true; if (!p.done) p.done = U.todayStr(); }
      s.hist.push([D.day, score, U.todayStr()]); if (s.hist.length > 400) s.hist.shift();
      // 오늘 배운 항목을 복습 대상에 등록 (점수와 무관하게)
      if (D.type === 'lesson') {
        D.kana.concat(D.vocab, D.gram.filter(function (g) { return g.x.length; }), D.line ? [D.line] : []).forEach(function (it) { SRS.learn(it.id); });
        ga.forEach(function (a) { var id = a.q.item && a.q.item.id; if (!a.ok && id && SRS.get(id)) SRS.flagWeak(id); });
      }
      var testXp = correct * 5;
      if (testXp) res.xp.push([(D.type === 'boss' ? '보스 공격' : '평가 정답') + ' ' + correct + '개', testXp]);
      if (firstPass) res.xp.push([TYPE_LABEL[D.type] + ' 첫 통과', PASS_XP[D.type]]);
      else if (pass) res.xp.push(['재도전 통과', 10]);
      if (firstHana) res.xp.push(['하나마루 보너스', 20]);
      if (D.type === 'boss' && pass) { s.streak.freeze = Math.min(2, s.streak.freeze + (firstPass ? 1 : 0)); }
      if (D.type === 'exam' && rankIdx() > rankBefore) res.rankUp = RANKS[rankIdx()];
      if (D.type === 'lesson' && r.mode !== 'testOnly') {
        if (s.cnt.lessonsDate !== U.todayStr()) { s.cnt.lessonsDate = U.todayStr(); s.cnt.lessonsToday = 0; }
        s.cnt.lessonsToday++;
      } else if (D.type !== 'lesson') {
        if (s.cnt.lessonsDate !== U.todayStr()) { s.cnt.lessonsDate = U.todayStr(); s.cnt.lessonsToday = 0; }
        s.cnt.lessonsToday++;
      }
      res.score = score; res.correct = correct; res.total = total; res.pass = pass; res.grade = grade; res.firstPass = firstPass;
      res.wrong = ga.filter(function (a) { return !a.ok; }).map(function (a) { return a.q; });
      if (D.type === 'exam') {
        var sec = {};
        ga.forEach(function (a) { var k = a.q.section; sec[k] = sec[k] || [0, 0]; sec[k][1]++; if (a.ok) sec[k][0]++; });
        res.sections = sec;
      }
      touchStreak();
    }
    var sum = res.xp.reduce(function (a, x) { return a + x[1]; }, 0);
    addXp(sum);
    res.sum = sum; res.lvAfter = levelOf(s.xp);
    res.badges = checkBadges();
    save();
    run.res = res;
    setTimeout(function () { JP.sfx(res.pass === false ? 'bad' : 'stamp'); if (res.lvAfter > res.lvBefore || res.rankUp) setTimeout(function () { JP.sfx('up'); }, 400); }, 250);
  }
  function resultView() {
    var r = run.res, s = st(), D = run.D;
    var lv = levelOf(s.xp), cur = levelXp(lv), nxt = levelXp(lv + 1);
    var body = '<div class="result">';
    if (run.mode === 'review') {
      body += stampSvg(r.score >= 70 ? 'maru' : 'san', 'big-stamp' + (r.score >= 70 ? '' : ' fail')) + '<div class="score tabnum">' + r.correct + '<small> / ' + r.total + '</small></div><div class="verdict">복습 완료</div>' +
        '<p class="small muted" style="margin:0">맞힌 항목은 복습 간격이 늘어나고, 틀린 항목은 내일 다시 나옵니다.</p>';
    } else {
      var fail = !r.pass;
      body += stampSvg(fail ? 'san' : r.grade, 'big-stamp' + (fail ? ' fail' : ''));
      body += '<div class="score tabnum">' + r.score + '<small>점</small></div>';
      body += '<div class="verdict">' + (D.type === 'boss' ? (r.pass ? esc(D.boss.jp) + ' 격파!' : '패배… 다시 도전!') : r.pass ? (r.grade === 'hana' ? 'はなまる! 완벽해요' : '합격! 다음 화가 열렸어요') : '아쉬워요. 70점부터 통과예요') + '</div>';
      body += '<p class="small muted" style="margin:0">' + r.correct + ' / ' + r.total + ' 정답' + (D.type === 'boss' ? ' · 남은 목숨 ' + run.boss.lives : '') + '</p>';
      if (r.sections) {
        var names = { kana: '문자', vocab: '어휘', gram: '문법', listen: '청해' };
        body += '<div class="sections">' + ['kana', 'vocab', 'gram', 'listen'].filter(function (k) { return r.sections[k]; }).map(function (k) {
          var v = r.sections[k], p = Math.round(v[0] / v[1] * 100);
          return '<div class="s"><span>' + names[k] + '</span><div class="meter"><i style="width:' + p + '%"></i></div><span class="tabnum">' + v[0] + '/' + v[1] + '</span></div>';
        }).join('') + '</div>';
      }
      if (r.rankUp) body += '<div class="rankup"><div class="eyebrow" style="color:inherit;opacity:.7">昇級 · 승급</div><div class="r">' + r.rankUp.k + '級</div><div class="jp" style="font-size:20px">' + esc(r.rankUp.jp) + '</div><div class="small" style="opacity:.8">' + esc(r.rankUp.ko) + '</div></div>';
    }
    if (r.xp.length) body += '<div class="xp-rows">' + r.xp.map(function (x) { return '<div><span>' + esc(x[0]) + '</span><b class="tabnum">+' + x[1] + ' XP</b></div>'; }).join('') + '</div>';
    body += '<div class="lvl"><div class="bar"><i style="width:' + Math.round((s.xp - cur) / (nxt - cur) * 100) + '%"></i></div><div class="t"><span>' + (r.lvAfter > r.lvBefore ? '레벨 업! ' : '') + 'Lv.' + lv + '</span><span class="tabnum">' + U.fmt(s.xp) + ' XP</span></div></div>';
    body += '<div class="row" style="justify-content:center"><span class="chip streak">' + I.flame + s.streak.n + '일 연속</span>' + (s.streak.freeze ? '<span class="chip">보호권 ' + s.streak.freeze + '장</span>' : '') + '</div>';
    r.badges.forEach(function (b) { body += '<div class="newbadge">' + medal(b.g, true) + '<div><b>새 배지: ' + esc(b.n) + '</b><div class="small">' + esc(b.d) + '</div></div></div>'; });
    if (r.wrong && r.wrong.length) {
      body += '<div class="wrong-list"><div class="eyebrow">틀린 문제 다시 보기</div>' + r.wrong.map(function (q) {
        return '<div class="w"><div class="txt">' + revealHtml(q.reveal) + (q.kind === 'choice' ? '<div class="small">정답: <b>' + correctLabel(q) + '</b></div>' : '') + '</div></div>';
      }).join('') + '</div>';
    }
    body += '</div>';
    var foot = '<div class="stack">';
    if (run.mode === 'review') foot += '<button class="btn block" data-act="endRun">확인</button>';
    else if (!r.pass) foot += '<button class="btn shu block" data-act="retry">다시 도전</button><button class="btn ghost block" data-act="endRun">홈으로</button>';
    else if (D.day < JP.totalDays) foot += '<button class="btn block" data-act="start" data-day="' + (D.day + 1) + '">다음 화로</button><button class="btn ghost block" data-act="endRun">홈으로</button>';
    else foot += '<button class="btn block" data-act="endRun">홈으로</button>';
    return { body: body, foot: foot + '</div>' };
  }
  function endRun() { run = null; SP.stop(); var qb = document.getElementById('quitBox'); if (qb) qb.remove(); closeOverlay(); render(); }

  /* ================= 이벤트 ================= */
  var H = {
    tab: function (el) { ui.tab = el.dataset.v; render(); window.scrollTo(0, 0); },
    chap: function (el) { ui.chapter = +el.dataset.v; render(); },
    sheet: function (el) { openSheet(+el.dataset.day); },
    closeOverlay: function () { closeOverlay(); },
    start: function (el) {
      var day = +el.dataset.day;
      if (!isUnlocked(day)) { openSheet(day); return; }
      startRun(day, el.dataset.mode);
    },
    onboard: function () { st().onboarded = true; save(); render(); },
    say: function (el) { say(el.dataset.t, +el.dataset.r || 1, el.classList.contains('audio-btn') ? el : null); },
    sayLine: function (el) { say(el.dataset.t); },
    kana: function (el) { if (run) { say(el.dataset.v); return; } openKana(el.dataset.v); },
    kanaScript: function (el) { ui.kanaScript = el.dataset.v; render(); },
    bookTab: function (el) { ui.bookTab = el.dataset.v; render(); },
    bookAll: function () { ui.bookAll = !ui.bookAll; render(); },
    review: function (el) { startReview(el.dataset.v); },
    playDlg: function (el) {
      var D = JP.days[+el.dataset.day];
      playDialog.free = true;
      var box = el.parentElement.querySelector('.dlg');
      playDialog(D.dlg.lines, 1, function (i) { if (box) U.$$('.ln', box).forEach(function (x, j) { x.classList.toggle('now', j === i); }); if (i < 0) playDialog.free = false; });
    },
    replayDlg: function () { runDialogPrompt(); },
    subMode: function (el) { run.subMode = el.dataset.v; renderRun(true); },
    // 러너
    quit: function () {
      if (run && stepNow().k === 'result') { endRun(); return; }
      showQuit();
    },
    quitYes: function () { endRun(); },
    quitNo: function () { var q = document.getElementById('quitBox'); if (q) q.remove(); },
    next: function () { SP.stop(); nextStep(); },
    cardNext: function () { var s = stepNow(); SP.stop(); if (run.i < s.cards.length - 1) { run.i++; renderRun(); } else nextStep(); },
    cardPrev: function () { if (run.i > 0) { run.i--; renderRun(); } },
    showKo: function () { run.showKo = true; renderRun(true); },
    shadow: function () { run.shadow = Math.min(3, run.shadow + 1); JP.sfx('tap'); if (run.shadow < 3) say(run.D.line.s.plain); renderRun(true); },
    ans: function (el) { answerChoice(el.dataset.v, el); },
    cont: function () { document.getElementById('fb').innerHTML = ''; advance(); },
    tok: function (el) { var i = +el.dataset.i; if (run.order.indexOf(i) >= 0 || run.answered) return; run.order.push(i); JP.sfx('tap'); var r = renderOrder(run.cur); rerenderQ(r); },
    untok: function (el) { if (run.answered) return; run.order.splice(+el.dataset.j, 1); rerenderQ(renderOrder(run.cur)); },
    orderCheck: function () {
      if (run.answered) return; run.answered = true;
      var q = run.cur, given = run.order.map(function (i) { return q.tokens[i].text; });
      var ok = given.join('') === q.answerSeq.join('');
      recordAnswer(q, ok); afterAnswer(q, ok);
    },
    mL: function (el) { run.match.sel = el.dataset.id; JP.sfx('tap'); say((run.cur.pairs.filter(function (p) { return p.id === el.dataset.id; })[0] || {}).audio); rerenderQ(renderMatch(run.cur)); },
    mR: function (el) {
      var m = run.match, id = el.dataset.id;
      if (!m.sel) return;
      if (m.sel === id) { m.done[id] = true; m.sel = null; JP.sfx('ok'); }
      else { m.miss++; JP.sfx('bad'); el.classList.add('shake'); var L = document.querySelector('[data-act="mL"][data-id="' + m.sel + '"]'); if (L) L.classList.add('shake'); setTimeout(function () { m.sel = null; rerenderQ(renderMatch(run.cur)); }, 320); return; }
      if (Object.keys(m.done).length === run.cur.pairs.length) { var ok = m.miss === 0; recordAnswer(run.cur, ok); run.answered = true; setTimeout(function () { showFeedback(run.cur, ok); }, 200); }
      rerenderQ(renderMatch(run.cur));
    },
    retry: function () { var D = run.D; startRun(D.day, D.type === 'lesson' ? 'testOnly' : undefined); },
    endRun: function () { endRun(); },
    // 설정
    toggle: function (el) { var k = el.dataset.v; st().settings[k] = !st().settings[k]; save(); render(); },
    setRomaji: function (el) { st().settings.romaji = el.dataset.v; save(); render(); },
    setTheme: function (el) { st().settings.theme = el.dataset.v; st().settings.themeSet = true; save(); render(); },
    export: function () { exportBackup(); },
    reset: function () {
      if (!ui.resetArm) { ui.resetArm = true; render(); setTimeout(function () { ui.resetArm = false; }, 5000); return; }
      ui.resetArm = false; S.reset(); ui.chapter = null; render(); toast('처음 상태로 돌아갔어요.');
    },
    padClear: function (el) { var cv = el.closest('.stack').querySelector('canvas.pad'); if (cv && cv._guideFn) cv._guideFn(); },
    padGuide: function (el) { var cv = el.closest('.stack').querySelector('canvas.pad'); if (cv) { cv._guide = !cv._guide; cv._guideFn(); } }
  };
  function rerenderQ(r) {
    var body = document.querySelector('#runBody .in');
    var head = run.steps[run.si].k === 'boss' ? bossHud() : '<div class="row" style="justify-content:space-between"><span></span><span class="small muted tabnum">' + (run.i + 1) + ' / ' + run.queue.length + '</span></div>';
    body.innerHTML = head + r.body;
    document.getElementById('runFoot').innerHTML = r.foot || '';
  }
  function showQuit() {
    var box = document.createElement('div');
    box.id = 'quitBox';
    box.innerHTML = '<div class="overlay" style="z-index:95"><div class="scrim" data-act="quitNo"></div><div class="sheet"><div class="grab"></div><h2 style="font-family:var(--font-body);font-weight:800;font-size:19px">그만할까요?</h2><p class="muted">지금 나가면 이번 화의 진행 상황은 저장되지 않아요. (복습 결과는 저장됩니다)</p><div class="stack"><button class="btn block" data-act="quitNo">계속하기</button><button class="btn ghost block" data-act="quitYes">나가기</button></div></div></div>';
    document.body.appendChild(box);
  }
  function exportBackup() {
    var data = S.exportJSON(), name = 'anime-nihongo-backup-' + U.todayStr() + '.json';
    var p = window.claude && window.claude.use ? window.claude.use('downloads') : Promise.resolve(null);
    p.then(function (dl) {
      if (dl) return dl.save({ filename: name, data: data }).then(function () { toast('백업 파일을 저장했어요.'); }, function (e) { if (e && e.code !== 'declined') toast('저장하지 못했어요: ' + (e.message || e.code)); });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
      a.download = name; document.body.appendChild(a); a.click(); a.remove();
      toast('백업 파일을 내보냈어요.');
    }).catch(function () { toast('이 화면에서는 파일 저장을 할 수 없어요.'); });
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var fn = H[el.dataset.act];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('input', function (e) {
    var k = e.target.dataset && e.target.dataset.input;
    if (k === 'bookSearch') {
      ui.bookQuery = e.target.value;
      clearTimeout(H._st);
      H._st = setTimeout(function () { render(); var i = document.getElementById('bookSearch'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250);
    } else if (k === 'rate') {
      st().settings.rate = +e.target.value; var rv = document.getElementById('rateVal'); if (rv) rv.textContent = (+e.target.value).toFixed(2);
      clearTimeout(H._rt); H._rt = setTimeout(save, 400);
    }
  });
  document.addEventListener('change', function (e) {
    var k = e.target.dataset && e.target.dataset.input;
    if (k === 'voice') { st().settings.voice = e.target.value; SP.choose(); save(); say('こんにちは'); }
    else if (k === 'import') {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () { try { S.importJSON(rd.result); toast('백업을 불러왔어요.'); render(); } catch (err) { toast(err.message || '불러오지 못했어요.'); } };
      rd.readAsText(f);
    }
  });
  document.addEventListener('keydown', function (e) {
    if (!run || e.target.tagName === 'INPUT') return;
    if (e.key === 'Enter') { var b = document.querySelector('.feedback [data-act="cont"]') || document.querySelector('#runFoot .btn:not(.ghost):not([disabled])'); if (b) { e.preventDefault(); b.click(); } }
    else if (/^[1-4]$/.test(e.key)) { var o = U.$$('#opts .opt')[+e.key - 1]; if (o && !run.answered) o.click(); }
  });

  /* ================= 시작 ================= */
  function init() {
    C.build();
    S.load();
    SP.init();
    S.onReplace(function () { SP.choose(); if (!run) render(); });
    render();
    S.initRemote();
    // 음성 목록이 늦게 도착하는 브라우저 대응
    setTimeout(function () { if (!run && (ui.tab === 'me' || !st().onboarded || ui.tab === 'home')) render(); }, 1200);
    if (!window.JP_NO_SW && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol) && window.top === window.self) {
      try { navigator.serviceWorker.register('sw.js').catch(function () {}); } catch (e) {}
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  JP.app = { render: render, startRun: startRun, state: function () { return run; } };
})();
