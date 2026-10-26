/* 어려운 문제 · 누적 복습
 *  1. 입력 → 가나: 로마자(shigoto → しごと)를 가나로 바꿈. 한글 자판 그대로 쳐도(ㄴ노ㅑ…) 누른 자판으로 되돌려 바꿈
 *  2. 채점: 가나·한자 표기, 장음 표기(ー/う/お), 조사 は·へ·を를 わ·え·お로 친 것, では/じゃ 같은 차이를 구별해
 *     맞음 / 맞음(표기 주의) / 틀림으로 판정
 *  3. 헷갈리는 보기: 소리가 비슷한 말(かき/かぎ), 같은 화에 나온 말(같은 주제), 같은 문법의 다른 예문에서 보기를 고름
 *  4. 새 문제 유형: input(직접 입력) · self(떠올린 뒤 스스로 채점) · 조각 맞추기(가짜 조각이 섞인 배열)
 *  5. 난이도: 설정의 '문제 난이도'에 따라 보기 문제를 위 유형으로 바꿈 (보기 고르기 / 섞어서 / 주관식)
 *  6. 누적 복습: 지금까지 배운 것 전체에서 20문항씩. 오래 안 본 것·자주 틀린 것을 먼저
 */
(function (g) {
  var JP = g.JP, U = JP.U, C = JP.course;
  var seq = 0;

  /* ================= 1. 입력 → 가나 ================= */
  // 2벌식 자판: 한글 자모 → 그 자모가 찍히는 영문 자판 글쇠 (쌍자음·ㅒ·ㅖ는 같은 글쇠를 두 번 누른 것으로 봄)
  var JAMO_KEY = {
    'ㄱ': 'r', 'ㄲ': 'rr', 'ㄴ': 's', 'ㄷ': 'e', 'ㄸ': 'ee', 'ㄹ': 'f', 'ㅁ': 'a', 'ㅂ': 'q', 'ㅃ': 'qq', 'ㅅ': 't', 'ㅆ': 'tt',
    'ㅇ': 'd', 'ㅈ': 'w', 'ㅉ': 'ww', 'ㅊ': 'c', 'ㅋ': 'z', 'ㅌ': 'x', 'ㅍ': 'v', 'ㅎ': 'g',
    'ㅏ': 'k', 'ㅐ': 'o', 'ㅑ': 'i', 'ㅒ': 'oo', 'ㅓ': 'j', 'ㅔ': 'p', 'ㅕ': 'u', 'ㅖ': 'pp', 'ㅗ': 'h', 'ㅘ': 'hk', 'ㅙ': 'ho', 'ㅚ': 'hl',
    'ㅛ': 'y', 'ㅜ': 'n', 'ㅝ': 'nj', 'ㅞ': 'np', 'ㅟ': 'nl', 'ㅠ': 'b', 'ㅡ': 'm', 'ㅢ': 'ml', 'ㅣ': 'l',
    'ㄳ': 'rt', 'ㄵ': 'sw', 'ㄶ': 'sg', 'ㄺ': 'fr', 'ㄻ': 'fa', 'ㄼ': 'fq', 'ㄽ': 'ft', 'ㄾ': 'fx', 'ㄿ': 'fv', 'ㅀ': 'fg', 'ㅄ': 'qt'
  };
  var CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'.split('');
  var JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'.split('');
  var JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  function hangulToKeys(s) {
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s[i], code = c.charCodeAt(0);
      if (code >= 0xAC00 && code <= 0xD7A3) {
        var n = code - 0xAC00, t = n % 28, v = Math.floor(n / 28) % 21, l = Math.floor(n / 588);
        out += JAMO_KEY[CHO[l]] + JAMO_KEY[JUNG[v]] + (t ? JAMO_KEY[JONG[t]] : '');
      } else if (JAMO_KEY[c]) out += JAMO_KEY[c];
      else out += c;
    }
    return out;
  }

  // 로마자 → 히라가나 (일본 PC의 로마자 입력과 같은 규칙: nn·n'→ん, 같은 자음 두 번→っ, -→ー, x·l→작은 글자)
  var R = {};
  function add(map) { Object.keys(map).forEach(function (k) { R[k] = map[k]; }); }
  add({ a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お' });
  var rows = {
    k: 'かきくけこ', g: 'がぎぐげご', s: 'さしすせそ', z: 'ざじずぜぞ', t: 'たちつてと', d: 'だぢづでど', n: 'なにぬねの',
    h: 'はひふへほ', b: 'ばびぶべぼ', p: 'ぱぴぷぺぽ', m: 'まみむめも', r: 'らりるれろ'
  };
  var V = ['a', 'i', 'u', 'e', 'o'];
  Object.keys(rows).forEach(function (c) { V.forEach(function (v, i) { R[c + v] = rows[c][i]; }); });
  add({ ya: 'や', yu: 'ゆ', yo: 'よ', ye: 'いぇ', wa: 'わ', wi: 'うぃ', we: 'うぇ', wo: 'を', wu: 'う',
    shi: 'し', chi: 'ち', tsu: 'つ', fu: 'ふ', ji: 'じ', ca: 'か', ci: 'し', cu: 'く', ce: 'せ', co: 'こ',
    fa: 'ふぁ', fi: 'ふぃ', fe: 'ふぇ', fo: 'ふぉ', fyu: 'ふゅ', va: 'ゔぁ', vi: 'ゔぃ', vu: 'ゔ', ve: 'ゔぇ', vo: 'ゔぉ',
    tsa: 'つぁ', tsi: 'つぃ', tse: 'つぇ', tso: 'つぉ', thi: 'てぃ', thu: 'てゅ', dhi: 'でぃ', dhu: 'でゅ', twu: 'とぅ', dwu: 'どぅ',
    kwa: 'くぁ', gwa: 'ぐぁ', she: 'しぇ', je: 'じぇ', che: 'ちぇ' });
  var YO = { ya: 'ゃ', yu: 'ゅ', yo: 'ょ', ye: 'ぇ' };
  ['k', 'g', 'n', 'h', 'b', 'p', 'm', 'r'].forEach(function (c) {
    var i2 = rows[c][1];   // き·ぎ…
    Object.keys(YO).forEach(function (y) { R[c + y] = i2 + YO[y]; });
  });
  [['sh', 'し'], ['sy', 'し'], ['ch', 'ち'], ['ty', 'ち'], ['cy', 'ち'], ['j', 'じ'], ['jy', 'じ'], ['zy', 'じ'], ['dy', 'ぢ'], ['fy', 'ふ']].forEach(function (p) {
    ['a', 'u', 'o', 'e'].forEach(function (v) { R[p[0] + v] = p[1] + ({ a: 'ゃ', u: 'ゅ', o: 'ょ', e: 'ぇ' })[v]; });
  });
  R.je = 'じぇ'; R.she = 'しぇ'; R.che = 'ちぇ';
  ['x', 'l'].forEach(function (x) {
    add((function () { var m = {}; m[x + 'a'] = 'ぁ'; m[x + 'i'] = 'ぃ'; m[x + 'u'] = 'ぅ'; m[x + 'e'] = 'ぇ'; m[x + 'o'] = 'ぉ'; m[x + 'ya'] = 'ゃ'; m[x + 'yu'] = 'ゅ'; m[x + 'yo'] = 'ょ';
      m[x + 'tu'] = 'っ'; m[x + 'tsu'] = 'っ'; m[x + 'wa'] = 'ゎ'; return m; })());
  });
  var MAXK = 4;
  function romajiToKana(src) {
    var s = String(src).toLowerCase(), out = '', i = 0;
    while (i < s.length) {
      var c = s[i], nx = s[i + 1];
      if (c === '-' || c === 'ー' || c === '−' || c === '～') { out += 'ー'; i++; continue; }
      if (c === 'n') {
        if (nx === 'n') {
          if (/[aiueo]/.test(s[i + 2] || '')) { out += 'ん'; i += 1; continue; }  // nna → んな (おんな·こんにちは)
          out += 'ん'; i += 2; continue;                                            // nn·nny·nn+자음 → ん (こんや = konnya)
        }
        if (nx === "'") { out += 'ん'; i += 2; continue; }
        if (nx === undefined) { out += 'ん'; i++; continue; }                     // 끝의 n → ん
        if (!/[aiueoy]/.test(nx)) { out += 'ん'; i++; continue; }                  // n + 자음 → ん
      }
      if (/[a-z]/.test(c) && c === nx && !/[aiueon]/.test(c)) { out += 'っ'; i++; continue; }   // kk → っk
      if (c === 't' && nx === 'c' && s[i + 2] === 'h') { out += 'っ'; i++; continue; }          // tch → っch
      var hit = null;
      for (var L = MAXK; L >= 1; L--) { var piece = s.substr(i, L); if (R[piece]) { hit = piece; break; } }
      if (hit) { out += R[hit]; i += hit.length; continue; }
      out += c; i++;                                                             // 가나·한자·기호는 그대로 (미완성 로마자도 그대로 보임)
    }
    return out;
  }
  function toKana(raw) { return romajiToKana(hangulToKeys(String(raw || '').normalize ? String(raw || '').normalize('NFC') : String(raw || ''))); }

  /* ================= 2. 채점 ================= */
  function hira(s) { return String(s).replace(/[ァ-ヶ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); }); }
  function clean(s) { return String(s || '').replace(/[\s。、．，,.!！?？…・「」『』（）()\[\]〜~'"“”‘’]/g, ''); }
  var VOWEL = {};
  (function () {
    var t = { a: 'あかがさざただなはばぱまやらわぁゃゎ', i: 'いきぎしじちぢにひびぴみりぃ', u: 'うくぐすずつづぬふぶぷむゆるぅゅゔ', e: 'えけげせぜてでねへべぺめれぇ', o: 'おこごそぞとどのほぼぽもよろをぉょ' };
    Object.keys(t).forEach(function (v) { t[v].split('').forEach(function (c) { VOWEL[c] = v; }); });
  })();
  var VK = { a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お' };
  // 소리대로: ー는 앞 모음, おう·えい는 おお·ええ, ぢ·づ·を는 じ·ず·お (장음을 어떻게 적었는지는 무시하고 길이는 그대로 봄)
  function phon(s) {
    s = clean(hira(s)).replace(/ぢ/g, 'じ').replace(/づ/g, 'ず').replace(/を/g, 'お').replace(/っ$/, '');   // 끝의 っ(げっ·ちぇっ)는 치기 어려워 빼고 봄
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s[i], pv = out ? VOWEL[out[out.length - 1]] : null;
      if (c === 'ー' && pv) { out += VK[pv]; continue; }
      if (c === 'う' && pv === 'o') { out += 'お'; continue; }
      if (c === 'い' && pv === 'e') { out += 'え'; continue; }
      out += c;
    }
    return out;
  }
  var PART_SOUND = { 'は': 'わ', 'へ': 'え', 'を': 'お' };
  // answers: [{ k: 가나 읽기, w: 한자 표기(있으면), particle: true(조사) }]
  function grade(raw, answers) {
    var given = toKana(raw), g0 = clean(hira(given)), r0 = clean(raw);
    var res = { ok: false, near: false, note: '', given: given };
    if (!g0) return res;
    for (var i = 0; i < answers.length; i++) {
      var a = answers[i], k = clean(hira(a.k || '')), w = clean(a.w || '');
      if ((w && (r0 === w || clean(given) === w)) || g0 === k) { res.ok = true; return res; }
    }
    for (i = 0; i < answers.length; i++) {
      a = answers[i]; k = clean(hira(a.k || ''));
      if (a.particle && PART_SOUND[k] && g0 === PART_SOUND[k]) { res.ok = true; res.near = true; res.note = '조사 ' + a.k + '는 ' + ({ 'は': 'ha', 'へ': 'he', 'を': 'wo' })[k] + '로 입력해요 (소리는 ' + PART_SOUND[k] + ')'; return res; }
      if (k.indexOf('では') >= 0 && g0 === k.replace(/では/g, 'じゃ')) { res.ok = true; res.near = true; res.note = 'じゃ는 では를 줄인 말이에요 (정답: ' + a.k + ')'; return res; }
      if (k.indexOf('じゃ') >= 0 && g0 === k.replace(/じゃ/g, 'では')) { res.ok = true; res.near = true; res.note = 'では는 じゃ의 원래 형태예요 (정답: ' + a.k + ')'; return res; }
      if (phon(given) === phon(a.k || '')) { res.ok = true; res.near = true; res.note = '소리는 맞아요. 표기는 ' + (a.w && a.w !== a.k ? a.k + ' (' + a.w + ')' : a.k); return res; }
    }
    return res;
  }

  /* ================= 3. 헷갈리는 보기 ================= */
  function morae(s) {
    var out = [];
    String(s).split('').forEach(function (c) { if (/[ゃゅょぁぃぅぇぉャュョァィゥェォ]/.test(c) && out.length) out[out.length - 1] += c; else out.push(c); });
    return out;
  }
  function editDist(a, b) {
    var n = a.length, m = b.length, prev = [], cur, i, j;
    for (j = 0; j <= m; j++) prev[j] = j;
    for (i = 1; i <= n; i++) {
      cur = [i];
      for (j = 1; j <= m; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[m];
  }
  function kanjiSet(w) { return (String(w || '').match(/[㐀-鿿]/g) || []); }
  // 단어 v와 헷갈리기 쉬운 순서: 소리가 1~2박만 다른 말 > 같은 한자를 쓰는 말 > 같은 화(같은 주제) > 가까운 날 > 나머지
  // 뜻에 같은 낱말이 들어 있으면(알다 / 알다, 이해하다) 정답이 둘처럼 보이므로 보기에서 뺌
  function meanWords(m) { return String(m || '').split(/[,，、·\/()（）\s~〜?？!！.]+/).filter(Boolean); }
  function confusableVocab(v, n, pool) {
    var r = morae(hira(v.r)), ks = kanjiSet(v.w), mw = meanWords(v.m);
    var cand = (pool || JP.all.vocab).filter(function (x) {
      return x !== v && hira(x.r) !== hira(v.r) && x.m !== v.m && !meanWords(x.m).some(function (w) { return mw.indexOf(w) >= 0; });
    });
    cand.forEach(function (x) {
      var d = editDist(r, morae(hira(x.r))), sc = 0;
      if (d === 1) sc += 6; else if (d === 2 && r.length >= 3) sc += 3;
      if (ks.length && kanjiSet(x.w).some(function (c) { return ks.indexOf(c) >= 0; })) sc += 4;
      if (x.day === v.day) sc += 3; else if (Math.abs(x.day - v.day) <= 6) sc += 1.5; else if (x.ch === v.ch) sc += 0.5;
      if (morae(hira(x.r)).length === r.length) sc += 0.5;
      x._sc = sc + Math.random() * 1.5;
    });
    cand.sort(function (a, b) { return b._sc - a._sc; });
    var out = [], seenM = {}, seenR = {};
    for (var i = 0; i < cand.length && out.length < n; i++) {
      if (seenM[cand[i].m] || seenR[cand[i].r]) continue;
      seenM[cand[i].m] = seenR[cand[i].r] = 1; out.push(cand[i]);
    }
    return out;
  }
  // 문장 뜻 보기: 같은 문법의 다른 예문(구조가 같음) > 같은 화 > 가까운 날
  function sentDistractors(s, item, n) {
    var pool = [];
    if (item && item.type === 'gram') pool = pool.concat(item.x, item.more || []);
    var d = (item && item.day) || 1;
    JP.all.gram.forEach(function (gp) { if (gp !== item && Math.abs(gp.day - d) <= 3) pool = pool.concat(gp.x); });
    JP.all.line.forEach(function (l) { if (Math.abs(l.day - d) <= 6) pool.push(l.s); });
    pool = U.shuffle(pool.filter(function (x) { return x && x.ko && x.ko !== s.ko && x.plain !== s.plain; }));
    var out = [], seen = {};
    for (var i = 0; i < pool.length && out.length < n; i++) { if (seen[pool[i].ko]) continue; seen[pool[i].ko] = 1; out.push(pool[i].ko); }
    return out;
  }
  // 헷갈리는 조사
  var PARTICLES = ['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'も', 'の', 'から', 'まで', 'より', 'や', 'か'];
  // 서로 바꿔 써도 맞는 짝(방향의 へ/に, 나열의 と/や, 관계절의 の/が, 출발점의 から/より, 会う의 に/と)은 보기·가짜 조각에서 뺌
  var PART_CONF = { 'は': ['が', 'を', 'も'], 'が': ['を', 'は', 'も'], 'を': ['が', 'に', 'で'], 'に': ['で', 'を', 'が'], 'で': ['に', 'を', 'が'], 'へ': ['で', 'を', 'が'],
    'と': ['を', 'が', 'で'], 'も': ['は', 'が', 'を'], 'の': ['を', 'で', 'と'], 'から': ['まで', 'で', 'を'], 'まで': ['から', 'で', 'を'], 'より': ['まで', 'で', 'を'], 'や': ['を', 'が', 'で'], 'か': ['も', 'ね', 'を'] };

  /* ================= 4. 새 문제 유형 ================= */
  var T = function () { return JP.quiz._t; };
  function romajiOn(it) { return JP.romajiOn ? JP.romajiOn(it) : false; }
  function vocabReveal(v) { return { big: v.r, kanji: v.w && v.w !== v.r ? v.w : '', sub: romajiOn(v) ? (v.ro || C.romaji(v.r)) : '', ko: v.m, audio: v.r, hint: v.h }; }
  function sentReveal(s) { return { html: s.html, kana: s.kana, ko: s.ko, audio: s.plain }; }
  function vocabAnswers(v) {
    // 뜻이 같은 다른 단어(쓰다: かく/にがい 등)도 정답
    var out = [{ k: v.r.replace(/[〜~]/g, ''), w: (v.w || '').replace(/[〜~]/g, '') }];
    JP.all.vocab.forEach(function (x) { if (x !== v && x.m === v.m) out.push({ k: x.r.replace(/[〜~]/g, ''), w: (x.w || '').replace(/[〜~]/g, '') }); });
    return out;
  }
  function inputQ(base) {
    base.kind = 'input'; base.id = 'd' + (++seq);
    base.answerLabel = base.answerLabel || C.escapeHtml(base.answers[0].k);
    return base;
  }
  // 단어: 뜻 → 일본어 쓰기
  function vocabWrite(v) {
    var n = morae(v.r.replace(/[〜~]/g, '')).length;
    return inputQ({ item: v, section: 'vocab', listening: false, type: 'vocabWrite',
      prompt: { big: v.m, cls: 'ko-big', q: '일본어로 쓰세요', len: n },
      answers: vocabAnswers(v), answerLabel: C.escapeHtml(v.r) + (v.w && v.w !== v.r ? ' <span class="muted">' + C.escapeHtml(v.w) + '</span>' : ''),
      reveal: vocabReveal(v) });
  }
  // 단어: 듣고 받아쓰기
  function vocabDictation(v) {
    return inputQ({ item: v, section: 'listen', listening: true, type: 'vocabDictation',
      prompt: { audio: v.r, q: '듣고 들리는 대로 쓰세요' },
      answers: [{ k: v.r.replace(/[〜~]/g, ''), w: (v.w || '').replace(/[〜~]/g, '') }], answerLabel: C.escapeHtml(v.r),
      reveal: vocabReveal(v) });
  }
  // 단어: 한자 읽기
  function kanjiRead(v) {
    return inputQ({ item: v, section: 'vocab', listening: false, type: 'kanjiRead',
      prompt: { big: v.w, cls: 'jp-word', q: '읽는 법을 쓰세요' },
      answers: [{ k: v.r.replace(/[〜~]/g, '') }], answerLabel: C.escapeHtml(v.r),
      reveal: vocabReveal(v) });
  }
  // 글자: 보고 소리 쓰기 / 듣고 글자 쓰기
  function kanaReadInput(k) {
    return inputQ({ item: k, section: 'kana', listening: false, type: 'kanaReadInput',
      prompt: { big: k.c, cls: 'jp-big', q: '이 글자의 소리를 로마자로 쓰세요' }, romaji: true,
      answers: [{ k: hira(k.c) }], answerLabel: C.escapeHtml(k.ro), reveal: { big: k.c, sub: k.ro, audio: k.c } });
  }
  function kanaDictation(k) {
    return inputQ({ item: k, section: 'listen', listening: true, type: 'kanaDictation',
      prompt: { audio: k.c, q: '들리는 글자를 쓰세요' },
      answers: [{ k: hira(k.c) }], answerLabel: C.escapeHtml(k.c), reveal: { big: k.c, sub: k.ro, audio: k.c } });
  }
  // 빈칸 직접 쓰기 (문장 + 뜻을 보고)
  function tokenAnswer(tok) { return { k: C.toReading(tok.src), w: C.stripRuby(tok.src), particle: PARTICLES.indexOf(C.stripRuby(tok.src)) >= 0 }; }
  function blankHtml(s, idx) {
    return s.tokens.map(function (t, i) { return i === idx ? '<span class="blank">＿＿</span>' + C.escapeHtml(t.punct || '') : C.rubyHtml(t.full); }).join('');
  }
  function clozeInput(s, gp, idx, type) {
    var tok = s.tokens[idx];
    return inputQ({ item: gp, section: 'gram', listening: false, type: type || 'clozeInput', sent: s,
      prompt: { html: blankHtml(s, idx), ko: s.ko, q: '빈칸에 들어갈 말을 쓰세요' },
      answers: [tokenAnswer(tok)], answerLabel: C.rubyHtml(tok.src), reveal: sentReveal(s) });
  }
  // 듣고 빈칸 받아쓰기
  function dictCloze(s, item, idx) {
    var tok = s.tokens[idx];
    return inputQ({ item: item, section: 'listen', listening: true, type: 'dictCloze', sent: s,
      prompt: { audio: s.plain, html: blankHtml(s, idx), q: '듣고 빈칸의 말을 쓰세요' },
      answers: [tokenAnswer(tok)], answerLabel: C.rubyHtml(tok.src), reveal: sentReveal(s) });
  }
  // 소리 구별: 듣고 쓰기 (둘 중 하나를 찍어 맞히지 못하게)
  function pairInput(q) {
    var target = q.prompt.audio;
    return inputQ({ item: q.item, section: 'listen', listening: true, type: 'pairInput',
      prompt: { audio: target, q: '들리는 말을 쓰세요' }, answers: [{ k: target }], answerLabel: C.escapeHtml(target), reveal: q.reveal });
  }
  // 떠올린 뒤 스스로 채점
  function selfQ(base) { base.kind = 'self'; base.id = 'd' + (++seq); return base; }
  function vocabRecall(v, listening) {
    return selfQ({ item: v, section: listening ? 'listen' : 'vocab', listening: !!listening, type: listening ? 'listenRecall' : 'vocabRecall',
      prompt: listening ? { audio: v.r, q: '듣고 뜻을 떠올려 보세요' } : { big: v.r, cls: 'jp-word', q: '뜻을 떠올려 보세요', audioBtn: v.r },
      answerHtml: C.escapeHtml(v.m), reveal: vocabReveal(v) });
  }
  function sentRecall(s, item, listening) {
    return selfQ({ item: item, section: listening ? 'listen' : 'gram', listening: !!listening, type: listening ? 'sentListenRecall' : 'sentRecall', sent: s,
      prompt: listening ? { audio: s.plain, q: '듣고 뜻을 떠올려 보세요' } : { html: s.html, q: '뜻을 떠올려 보세요', audioBtn: s.plain },
      answerHtml: C.escapeHtml(s.ko), reveal: sentReveal(s) });
  }
  function gramRecall(gp) {
    var ex = gp.x[0];
    return selfQ({ item: gp, section: 'gram', listening: false, type: 'gramRecall',
      prompt: { big: gp.t, cls: 'jp-word', q: '이 문법의 뜻과 쓰임을 떠올려 보세요' },
      answerHtml: C.escapeHtml(gp.m), reveal: ex ? sentReveal(ex) : null });
  }
  // 문법 뜻 문제는 제목이 일본어 형태(〜ては いけない 등)이고 뜻이 한국어인 항목만 (글자 단원의 '헷갈리는 히라가나 짝', '동사 ます형' 같은 주제 제목은 제외)
  function titleOk(gp) { var t = String(gp.t).replace(/\([^)]*\)|（[^）]*）/g, ''); return /[ぁ-んァ-ヶ]/.test(t) && !/[가-힣]/.test(t) && /[가-힣]/.test(gp.m || ''); }
  // 문법 뜻 고르기 (제목 → 뜻)
  function gramMeaning(gp) {
    var pool = U.shuffle(JP.all.gram.filter(function (x) { return x !== gp && titleOk(x) && x.m !== gp.m && Math.abs(x.day - gp.day) <= 40; }));
    var wr = [], seen = {};
    pool.forEach(function (x) { if (wr.length < 3 && !seen[x.m]) { seen[x.m] = 1; wr.push(x.m); } });
    var ex = gp.x[0];
    var opts = [{ label: gp.m, value: 'A' }].concat(wr.map(function (l, i) { return { label: l, value: 'W' + i }; }));
    return { id: 'd' + (++seq), kind: 'choice', item: gp, section: 'gram', listening: false, type: 'gramMeaning',
      prompt: { big: gp.t, cls: 'jp-word', q: '이 문법의 뜻은?' }, optCls: 'ko-opt', options: U.shuffle(opts), answer: 'A',
      reveal: ex ? sentReveal(ex) : null };
  }
  // 조각 맞추기: 문장 배열 + 가짜 조각
  function orderDecoy(q) {
    var s = q.sent, toks = q.answerSeq, decoys = [];
    if (s && s.cloze && s.cloze.opts.length) decoys.push(U.pick(s.cloze.opts));
    var plainToks = toks.map(C.stripRuby);
    toks.forEach(function (t) {
      var p = C.stripRuby(t).replace(/[。、！？!?…]+$/, '');
      if (decoys.length < 2 && PART_CONF[p] && Math.random() < 0.6) { var alt = U.pick(PART_CONF[p]); if (plainToks.indexOf(alt) < 0) decoys.push(alt); }
    });
    if (decoys.length < 1 && q.item && q.item.type === 'gram') {
      var other = U.pick(q.item.x.concat(q.item.more || []).filter(function (x) { return x !== s; }));
      if (other) { var ot = U.pick(other.orderTokens); if (ot && toks.indexOf(ot) < 0) decoys.push(ot); }
    }
    decoys = U.uniq(decoys).filter(function (d) { return toks.indexOf(d) < 0; }).slice(0, 2);
    if (!decoys.length) return q;
    var tokens = toks.map(function (t, i) { return { i: i, html: C.rubyHtml(t), text: t }; })
      .concat(decoys.map(function (d, j) { return { i: toks.length + j, html: C.rubyHtml(d), text: d, decoy: true }; }));
    return Object.assign({}, q, { id: 'd' + (++seq), type: 'orderDecoy', tokens: U.shuffle(tokens), need: toks.length,
      prompt: { ko: q.prompt.ko, q: '뜻에 맞게 순서대로 고르세요 (필요 없는 조각이 섞여 있어요)' } });
  }
  // 단어 조각 맞추기: 뜻 → 가나 조각을 순서대로 (헷갈리는 조각 2~3개 섞음)
  var MORA_CONF = {};
  (function () {
    var pairs = ['かが', 'きぎ', 'くぐ', 'けげ', 'こご', 'さざ', 'しじ', 'すず', 'せぜ', 'そぞ', 'ただ', 'ちぢ', 'つづ', 'てで', 'とど', 'はばぱ', 'ひびぴ', 'ふぶぷ', 'へべぺ', 'ほぼぽ',
      'ぬめ', 'ねれわ', 'るろ', 'あお', 'いり', 'つっ', 'やゃ', 'ゆゅ', 'よょ', 'おう', 'えい'];
    pairs.forEach(function (p) { var cs = p.split(''); cs.forEach(function (c) { MORA_CONF[c] = (MORA_CONF[c] || []).concat(cs.filter(function (x) { return x !== c; })); }); });
  })();
  function vocabTiles(v) {
    var word = v.r.replace(/[〜~]/g, ''), ms = morae(word);
    if (ms.length < 2 || ms.length > 8) return vocabWrite(v);
    var kata = /[ァ-ヶ]/.test(word);
    var decoys = [];
    U.shuffle(ms).forEach(function (m) {
      if (decoys.length >= 3) return;
      var h = hira(m[0]), alts = MORA_CONF[h];
      if (alts && alts.length) { var a = U.pick(alts); var d = (kata ? JP.kana.toKata(a) : a) + m.slice(1); if (ms.indexOf(d) < 0 && decoys.indexOf(d) < 0) decoys.push(d); }
    });
    if (decoys.length < 2) decoys.push(kata ? 'ッ' : 'っ');
    var tokens = ms.map(function (m, i) { return { i: i, html: C.escapeHtml(m), text: m }; })
      .concat(decoys.map(function (d, j) { return { i: ms.length + j, html: C.escapeHtml(d), text: d, decoy: true }; }));
    return { id: 'd' + (++seq), kind: 'order', item: v, section: 'vocab', listening: false, type: 'vocabTiles',
      prompt: { ko: v.m, q: '뜻에 맞는 말을 조각으로 만드세요 (필요 없는 조각이 섞여 있어요)' },
      tokens: U.shuffle(tokens), answerSeq: ms, need: ms.length, reveal: vocabReveal(v) };
  }

  /* ---------- 예문에서 빈칸 고르기 ---------- */
  var PUNCT_ONLY = /^[。、！？!?…‥・「」『』（）()〜~ー]+$/;
  function gramForms(gp) {
    if (gp._forms) return gp._forms;
    var A = {}, T2 = {};
    gp.x.forEach(function (s) { if (s.cloze) A[C.stripRuby(s.cloze.answer)] = 1; });
    String(gp.t).replace(/\([^)]*\)|（[^）]*）/g, ' ').split(/[\s\/・·,、]+/).forEach(function (x) {
      x = x.replace(/[〜~]/g, '').trim(); if (x && /[ぁ-んァ-ヶ]/.test(x) && !/[가-힣]/.test(x)) T2[x] = 1;
    });
    return (gp._forms = { ans: A, title: T2 });
  }
  // 문법의 핵심 형태가 들어 있는 토큰 위치 (없으면 -1)
  function gramTarget(s, gp) {
    if (s.cloze) return s.cloze.index;
    var F = gramForms(gp), i;
    for (i = 0; i < s.tokens.length; i++) if (F.ans[s.tokens[i].plain]) return i;
    for (i = 0; i < s.tokens.length; i++) if (F.title[s.tokens[i].plain]) return i;
    return -1;
  }
  function particleTarget(s) {
    var idx = [];
    s.tokens.forEach(function (t, i) { if (PART_CONF[t.plain]) idx.push(i); });
    return idx.length ? U.pick(idx) : -1;
  }
  // 받아쓰기 빈칸: 배운 단어와 같은 토큰을 먼저, 없으면 2~6박의 내용어
  function dictTarget(s) {
    var known = {}, cand = [], good = [];
    JP.all.vocab.forEach(function (v) { if (JP.srs.get(v.id)) { known[hira(v.r)] = 1; if (v.w) known[v.w] = 1; } });
    s.tokens.forEach(function (t, i) {
      var k = hira(t.kana), n = morae(k).length;
      if (PUNCT_ONLY.test(t.plain) || PART_CONF[t.plain] || n < 2 || n > 7) return;
      cand.push(i); if (known[k] || known[t.plain]) good.push(i);
    });
    return good.length ? U.pick(good) : cand.length ? U.pick(cand) : -1;
  }
  // 빈칸 보기 문제 (마크업에 빈칸이 없는 예문도): 정답 + 같은 문법의 다른 형태·헷갈리는 조사
  function clozeChoice(s, gp, idx) {
    var tok = s.tokens[idx], ans = tok.src, p = tok.plain, wr = [];
    if (s.cloze && idx === s.cloze.index) return T().cloze(s, gp);
    if (PART_CONF[p]) wr = PART_CONF[p].slice();
    else {
      var F = gramForms(gp);
      gp.x.forEach(function (x) { if (x.cloze) wr = wr.concat([x.cloze.answer].concat(x.cloze.opts)); });
      wr = wr.concat(Object.keys(F.title));
    }
    wr = U.uniq(wr.map(function (w) { return w; })).filter(function (w) { return C.stripRuby(w) !== p; });
    wr = U.shuffle(wr).slice(0, 3);
    if (wr.length < 3) wr = wr.concat(U.shuffle(PARTICLES.filter(function (x) { return x !== p && wr.indexOf(x) < 0; }))).slice(0, 3);
    var opts = [{ label: C.rubyHtml(ans), value: 'A' }].concat(wr.map(function (w, i) { return { label: C.rubyHtml(w), value: 'W' + i }; }));
    return { id: 'd' + (++seq), kind: 'choice', item: gp, section: 'gram', listening: false, type: 'cloze', sent: s, blank: idx,
      prompt: { html: blankHtml(s, idx), ko: s.ko, q: '빈칸에 알맞은 말은?' }, optCls: 'jp-opt', optHtml: true,
      options: U.shuffle(opts), answer: 'A', reveal: sentReveal(s) };
  }

  /* ================= 5. 난이도 ================= */
  function level() { var s = JP.store.state; return (s && s.settings.level) || 'mid'; }
  var CHANCE = { easy: 0, mid: 0.45, hard: 1 };
  var GRADED_CTX = { test: 1, boss: 1, listenTest: 1, exam: 1 };
  // 보기 문제 하나를 난이도에 맞는 유형으로 (graded: 평가·보스·시험에서는 스스로 채점 문제를 쓰지 않음)
  function hardenOne(q, ctx, lv) {
    lv = lv || level();
    if (!q || Math.random() >= CHANCE[lv]) return q;
    var graded = !!GRADED_CTX[ctx], voice = JP.speech.hasJa(), it = q.item, s = q.sent;
    var nq = null;
    switch (q.type) {
      case 'kanaRead': nq = kanaReadInput(it); break;
      case 'kanaListen': if (voice) nq = kanaDictation(it); break;
      case 'vocabReverse': nq = lv === 'mid' && Math.random() < 0.5 ? vocabTiles(it) : vocabWrite(it); break;
      case 'vocabListen': if (voice) nq = Math.random() < 0.7 || graded ? vocabDictation(it) : vocabRecall(it, true); break;
      case 'vocabMeaning':
        if (!graded) nq = vocabRecall(it);
        else if (it.w && /[㐀-鿿]/.test(it.w) && Math.random() < 0.5) nq = kanjiRead(it);
        break;
      case 'cloze':
        var bi = q.blank != null ? q.blank : (s && s.cloze ? s.cloze.index : -1);
        if (s && bi >= 0) nq = clozeInput(s, it, bi);
        break;
      case 'gramMeaning': if (!graded) nq = gramRecall(it); break;
      case 'sentMeaning': if (!graded && s) nq = sentRecall(s, it, false); break;
      case 'order': nq = orderDecoy(q); break;
      case 'sentListen':
        if (voice && s) {
          var di = dictTarget(s);
          if (di >= 0 && (graded || Math.random() < 0.6)) nq = dictCloze(s, it, di);
          else if (!graded) nq = sentRecall(s, it, true);
        }
        break;
      case 'pair': if (voice) nq = pairInput(q); break;
    }
    if (!nq) return q;
    ['rate', 'stage', 'review', 'srsId', 'drillId'].forEach(function (k) { if (q[k] !== undefined) nq[k] = q[k]; });
    if (ctx === 'exam') nq.section = q.section;          // 승급 시험은 영역별 점수라 원래 영역 그대로
    return nq;
  }
  function harden(qs, ctx) {
    var lv = level();
    if (lv === 'easy') return qs;
    return qs.map(function (q) { return hardenOne(q, ctx, lv); });
  }

  /* ================= 6. 누적 복습 ================= */
  function drillState() {
    var s = JP.store.state;
    if (!s.drill || typeof s.drill !== 'object') s.drill = {};
    var d = s.drill;
    d.sets = d.sets || 0; d.ans = d.ans || 0; d.ok = d.ok || 0; d.seen = d.seen || {}; d.kind = d.kind || 'mix';
    return d;
  }
  function learned() {
    var srs = JP.store.state.srs, out = [];
    Object.keys(srs).forEach(function (id) { var it = JP.items[id]; if (it) out.push(it); });
    return out;
  }
  function learnedDays() {
    var days = {};
    learned().forEach(function (it) { days[it.day] = 1; });
    return Object.keys(days).map(Number);
  }
  function counts() {
    var c = { kana: 0, vocab: 0, gram: 0, line: 0, ex: 0 };
    learned().forEach(function (it) { c[it.type] = (c[it.type] || 0) + 1; if (it.type === 'gram') c.ex += it.x.length + (it.more || []).length; });
    return c;
  }
  // 오래 안 본 것(누적 복습에서 한 번도 안 나온 것이 가장 먼저) + 자주 틀린 것 + 기억 단계가 낮은 것
  function priority(it, d) {
    var srs = JP.store.state.srs[it.id] || [1, 0, 0, 0], seen = d.seen[it.id];
    var age = seen ? (d.sets - seen[0]) : 99;
    var sc = seen ? Math.min(4, age / 3) : 5;
    var bad = (seen ? seen[2] : 0) + srs[3], good = (seen ? seen[1] : 0) + srs[2];
    sc += Math.min(3, bad / Math.max(1, good) * 3);
    if (srs[0] <= 2) sc += 1;
    if (seen && age <= 1) sc -= 6;                    // 바로 앞 세트에 나온 것은 뒤로 (세트 번호는 세트를 마칠 때 올라감)
    return sc + Math.random() * 2;
  }
  function pickExample(gp) {
    var all = gp.x.concat(gp.more || []);
    return all.length ? U.pick(all) : null;
  }
  function voice() { return JP.speech.hasJa(); }
  // 항목 하나 → 문제 하나 (kind: 고른 종류, listenOnly: 듣기 문제만)
  function makeQ(it, listenOnly) {
    var t = T(), q = null, r = Math.random();
    if (it.type === 'kana') {
      q = listenOnly && voice() ? t.kanaListen(it) : U.pick([t.kanaRead, t.kanaListen])(it);
    } else if (it.type === 'vocab') {
      if (listenOnly) q = t.vocabListen(it);
      else if (it.w && /[㐀-鿿]/.test(it.w) && r < 0.2) q = level() === 'easy' ? confusedMeaning(it) : kanjiRead(it);
      else q = U.pick([confusedMeaning, confusedReverse, function (v) { return voice() ? t.vocabListen(v) : confusedMeaning(v); }])(it);
    } else if (it.type === 'gram') {
      var s = pickExample(it);
      if (!s) return null;
      if (listenOnly) {
        var di = voice() ? dictTarget(s) : -1;
        q = di >= 0 && level() !== 'easy' ? dictCloze(s, it, di) : sentMeaning(s, it, true);
      } else {
        var gi = gramTarget(s, it), pi = particleTarget(s);
        var opts = [];
        if (gi >= 0) opts.push('gram', 'gram');
        if (pi >= 0) opts.push('particle');
        if (s.orderTokens.length >= 3 && s.orderTokens.length <= 9) opts.push('order');
        opts.push('meaning');
        if (voice()) opts.push('listen');
        if (titleOk(it)) opts.push('title');
        var kind = U.pick(opts);
        if (kind === 'gram') q = clozeChoice(s, it, gi);
        else if (kind === 'particle') q = clozeChoice(s, it, pi);
        else if (kind === 'order') q = t.order(s, it);
        else if (kind === 'meaning') q = sentMeaning(s, it, false);
        else if (kind === 'listen') { var d2 = dictTarget(s); q = d2 >= 0 && level() !== 'easy' ? dictCloze(s, it, d2) : sentMeaning(s, it, true); }
        else q = gramMeaning(it);
      }
    } else if (it.type === 'line') {
      var di2 = voice() ? dictTarget(it.s) : -1;
      if (listenOnly || r < 0.5) q = di2 >= 0 && level() !== 'easy' && r < 0.3 ? dictCloze(it.s, it, di2) : sentMeaning(it.s, it, true);
      else if (it.s.orderTokens.length >= 3 && it.s.orderTokens.length <= 9) q = t.order(it.s, it);
      else q = sentMeaning(it.s, it, false);
    } else if (it.type === 'dlg') {
      q = JP.quiz.dlgQ(it);
    } else if (it.type === 'pairItem') {
      q = t.pairQ(it.p, it.day);
    }
    return q;
  }
  // 헷갈리는 보기로 만든 단어 문제
  function confusedMeaning(v) {
    var wr = confusableVocab(v, 3);
    var opts = [{ label: v.m, value: 'A' }].concat(wr.map(function (x, i) { return { label: x.m, value: 'W' + i }; }));
    return { id: 'd' + (++seq), kind: 'choice', item: v, section: 'vocab', listening: false, type: 'vocabMeaning',
      prompt: { big: v.r, cls: 'jp-word', small: v.w && v.w !== v.r ? v.w : '', ro: romajiOn(v) ? (v.ro || C.romaji(v.r)) : '', q: '뜻을 고르세요', audioBtn: v.r },
      options: U.shuffle(opts), answer: 'A', reveal: vocabReveal(v) };
  }
  function confusedReverse(v) {
    var wr = confusableVocab(v, 3);
    var opts = [{ label: v.r, value: 'A' }].concat(wr.map(function (x, i) { return { label: x.r, value: 'W' + i }; }));
    return { id: 'd' + (++seq), kind: 'choice', item: v, section: 'vocab', listening: false, type: 'vocabReverse',
      prompt: { big: v.m, cls: 'ko-big', q: '일본어로 고르세요' }, optCls: 'jp-opt', options: U.shuffle(opts), answer: 'A', reveal: vocabReveal(v) };
  }
  function sentMeaning(s, item, listening) {
    var wr = sentDistractors(s, item, 3);
    if (wr.length < 3) return T().sentListen(s, item, listening ? 'listen' : 'gram');
    var opts = [{ label: s.ko, value: 'A' }].concat(wr.map(function (l, i) { return { label: l, value: 'W' + i }; }));
    return { id: 'd' + (++seq), kind: 'choice', item: item, section: listening ? 'listen' : 'gram', listening: !!listening, type: listening ? 'sentListen' : 'sentMeaning', sent: s,
      prompt: listening ? { audio: s.plain, q: '듣고 뜻을 고르세요' } : { html: s.html, q: '뜻을 고르세요', audioBtn: s.plain },
      optCls: 'ko-opt', options: U.shuffle(opts), answer: 'A', reveal: sentReveal(s) };
  }
  var MIX = { vocab: 8, gram: 7, listen: 4, kana: 1 };
  function buildSet(kind, n) {
    n = n || 20;
    var d = drillState(), items = learned();
    var by = { kana: [], vocab: [], gram: [], line: [] };
    items.forEach(function (it) { if (by[it.type]) by[it.type].push(it); });
    by.gram = by.gram.filter(function (gp) { return gp.x.length || (gp.more || []).length; });
    // 듣기용: 장면 대화·소리 구별 짝(배운 화의 것)
    var days = {}; items.forEach(function (it) { days[it.day] = 1; });
    var dlgs = [], pairs = [];
    Object.keys(days).forEach(function (dd) {
      var D = JP.days[dd]; if (!D) return;
      if (D.dlg) dlgs.push(D.dlg);
      (D.pairs || []).forEach(function (p, i) { pairs.push({ type: 'pairItem', id: 'p' + dd + '_' + i, p: p, day: +dd, ch: D.ch }); });
    });
    function top(list, k) {
      return list.map(function (it) { return [priority(it, d), it]; }).sort(function (a, b) { return b[0] - a[0]; }).slice(0, k).map(function (x) { return x[1]; });
    }
    var picks = [];
    function take(list, k, listenOnly) { top(list, k).forEach(function (it) { picks.push([it, listenOnly]); }); }
    if (kind === 'vocab') take(by.vocab, n);
    else if (kind === 'gram') take(by.gram, n);
    else if (kind === 'listen') {
      var lp = by.vocab.concat(by.line, by.gram);
      take(dlgs, Math.min(3, dlgs.length), true); take(pairs, Math.min(3, pairs.length), true);
      take(lp, n - picks.length, true);
    } else {
      var weakKana = by.kana.filter(function (k) { var r = JP.store.state.srs[k.id]; return r && (r[0] <= 2 || r[3] > r[2]); });
      var plan = { vocab: MIX.vocab, gram: MIX.gram, listen: MIX.listen, kana: weakKana.length ? MIX.kana : 0 };
      if (!by.gram.length) { plan.vocab += plan.gram; plan.gram = 0; }
      if (!by.vocab.length) { plan.gram += plan.vocab; plan.vocab = 0; }
      take(by.vocab, plan.vocab); take(by.gram, plan.gram);
      take(weakKana.length ? weakKana : by.kana, plan.kana);
      var lis = by.line.concat(dlgs.length && Math.random() < 0.5 ? [U.pick(dlgs)] : [], pairs.length && Math.random() < 0.5 ? [U.pick(pairs)] : []);
      take(lis.length ? lis : by.vocab, plan.listen, true);
    }
    // 모자라면 아무 배운 것으로 채움
    var have = {}; picks.forEach(function (p) { have[p[0].id] = 1; });
    var rest = U.shuffle(by.vocab.concat(by.gram, by.line).filter(function (it) { return !have[it.id]; }));
    while (picks.length < n && rest.length) picks.push([rest.shift(), kind === 'listen']);
    var qs = U.shuffle(picks).map(function (p) { var q = makeQ(p[0], p[1]); if (q) q.drillId = p[0].id; return q; }).filter(Boolean);
    return harden(qs.slice(0, n), 'drill');
  }
  function noteAnswer(q, ok) {
    var d = drillState(), id = q.drillId;
    d.ans++; if (ok) d.ok++;
    if (!id) return;
    var r = d.seen[id] || [d.sets, 0, 0];
    r[0] = d.sets; if (ok) r[1]++; else r[2]++;
    d.seen[id] = r;
  }

  JP.drill = {
    toKana: toKana, hangulToKeys: hangulToKeys, romajiToKana: romajiToKana, grade: grade, phon: phon, morae: morae,
    confusableVocab: confusableVocab, sentDistractors: sentDistractors, harden: harden, hardenOne: hardenOne, level: level,
    buildSet: buildSet, noteAnswer: noteAnswer, state: drillState, counts: counts, learnedDays: learnedDays,
    _t: { vocabWrite: vocabWrite, vocabDictation: vocabDictation, kanjiRead: kanjiRead, kanaReadInput: kanaReadInput, kanaDictation: kanaDictation,
      clozeInput: clozeInput, dictCloze: dictCloze, vocabRecall: vocabRecall, sentRecall: sentRecall, gramRecall: gramRecall, gramMeaning: gramMeaning,
      orderDecoy: orderDecoy, vocabTiles: vocabTiles, clozeChoice: clozeChoice, gramTarget: gramTarget, dictTarget: dictTarget, makeQ: makeQ }
  };
})(typeof window !== 'undefined' ? window : globalThis);
