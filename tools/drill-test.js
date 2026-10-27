// 입력 변환·채점·문제 생성 점검: node tools/drill-test.js
global.window = global;
require('../js/data/kana.js'); require('../js/course.js'); require('../js/core.js');
for (const f of ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6']) require('../js/data/' + f + '.js');
require('../js/quiz.js'); require('../js/drill.js');
const D = JP.drill;
let fail = 0;
function eq(a, b, msg) { if (a !== b) { fail++; console.log('✗ ' + msg + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); } }
// 1. 로마자 → 가나
[['shigoto', 'しごと'], ['gakkou', 'がっこう'], ['kitte', 'きって'], ['konnichiha', 'こんにちは'], ['konnya', 'こんや'], ["kon'ya", 'こんや'], ['konya', 'こにゃ'],
 ['senpai', 'せんぱい'], ['sempai', 'せmぱい'], ['ko-hi-', 'こーひー'], ['tsukue', 'つくえ'], ['tukue', 'つくえ'], ['chotto', 'ちょっと'], ['tyotto', 'ちょっと'],
 ['matcha', 'まっちゃ'], ['jibun', 'じぶん'], ['zyugyou', 'じゅぎょう'], ['ryokou', 'りょこう'], ['wo', 'を'], ['ha', 'は'], ['xtu', 'っ'], ['dehaarimasen', 'ではありません'],
 ['dehaarimasenn', 'ではありません'], ['Shigoto', 'しごと'], ['fairu', 'ふぁいる'], ['vi', 'ゔぃ'], ['n', 'ん'], ['kanji', 'かんじ'], ['onna', 'おんな'], ['onnna', 'おんな'], ['minna', 'みんな'], ['kinnyoubi', 'きんようび'], ['konnnyaku', 'こんにゃく'],
 ['shinbun', 'しんぶん'], ['dhi', 'でぃ'], ['ti-mu', 'ちーむ'], ['mizu', 'みず'], ['しごと', 'しごと'], ['仕事', '仕事']
].forEach(([a, b]) => eq(D.romajiToKana(a), b, 'romaji ' + a));
// 2. 한글 자판 그대로 친 로마자
const ko = s => s.split('').map(c => ({ q: 'ㅂ', w: 'ㅈ', e: 'ㄷ', r: 'ㄱ', t: 'ㅅ', y: 'ㅛ', u: 'ㅕ', i: 'ㅑ', o: 'ㅐ', p: 'ㅔ', a: 'ㅁ', s: 'ㄴ', d: 'ㅇ', f: 'ㄹ', g: 'ㅎ', h: 'ㅗ', j: 'ㅓ', k: 'ㅏ', l: 'ㅣ', z: 'ㅋ', x: 'ㅌ', c: 'ㅊ', v: 'ㅍ', b: 'ㅠ', n: 'ㅜ', m: 'ㅡ' })[c] || c).join('');
// 한국어 입력기는 자모를 음절로 묶음 → 자모열을 브라우저 정규화(NFC)와 비슷하게 묶어 시험: 직접 만든 음절 예
[['노ㅑ', 'shi'], ['ㅅ녀', 'tsu'], ['ㅏ뭐ㅑ', 'kanji'], ['ㅎ마ㅏㅐㅕ', 'gakkou'], ['놰', 'sho']].forEach(([h, keys]) => eq(D.hangulToKeys(h), keys, 'hangul ' + h));
eq(D.toKana(ko('shigoto')), 'しごと', 'jamo shigoto');
eq(D.toKana('노ㅑㅎㅐㅅㅐ'), 'しごと', 'hangul syllables shigoto');
// 3. 채점
const g = (raw, ans) => { const r = D.grade(raw, ans); return r.ok ? (r.near ? 'near' : 'ok') : 'bad'; };
eq(g('shigoto', [{ k: 'しごと', w: '仕事' }]), 'ok', 'grade shigoto');
eq(g('仕事', [{ k: 'しごと', w: '仕事' }]), 'ok', 'grade kanji');
eq(g('shigotoo', [{ k: 'しごと' }]), 'bad', 'grade long');
eq(g('ko-hi-', [{ k: 'コーヒー' }]), 'ok', 'grade katakana');
eq(g('kouhii', [{ k: 'コーヒー' }]), 'near', 'grade kouhii');
eq(g('obasan', [{ k: 'おばあさん' }]), 'bad', 'grade obasan');
eq(g('wa', [{ k: 'は', particle: true }]), 'near', 'grade particle wa');
eq(g('ha', [{ k: 'は', particle: true }]), 'ok', 'grade particle ha');
eq(g('jaarimasen', [{ k: 'ではありません' }]), 'near', 'grade ja');
eq(g('', [{ k: 'は' }]), 'bad', 'grade empty');
eq(g('sensee', [{ k: 'せんせい' }]), 'near', 'grade sensee');
eq(g('kita', [{ k: 'きった' }]), 'bad', 'grade sokuon');
// 3-1. 일본어 자판으로 쓴 답: 가나·가타카나·전각 영문·반각 가타카나·조사 표기
eq(g('しごと', [{ k: 'しごと', w: '仕事' }]), 'ok', 'grade kana');
eq(g('シゴト', [{ k: 'しごと' }]), 'ok', 'grade katakana for hiragana');
eq(g('しごと。', [{ k: 'しごと' }]), 'ok', 'grade with 。');
eq(g('　しごと ', [{ k: 'しごと' }]), 'ok', 'grade with spaces');
eq(D.toKana('ｓｈｉｇｏｔｏ'), 'しごと', 'full-width romaji');
eq(D.toKana('ｼｺﾞﾄ'), 'シゴト', 'half-width katakana');
eq(g('ｺｰﾋｰ', [{ k: 'コーヒー' }]), 'ok', 'grade half-width katakana');
eq(g('こーひー', [{ k: 'コーヒー' }]), 'ok', 'grade hiragana long mark');
eq(g('わ', [{ k: 'は', particle: true }]), 'near', 'grade particle わ');
eq(/글자는 は로/.test(D.grade('わ', [{ k: 'は', particle: true }]).note), true, 'particle note says write は');
eq(g('お', [{ k: 'を', particle: true }]), 'near', 'grade particle お');
// 3-2. 변환 후보에서 같은 소리의 다른 한자를 고른 경우: 한자도 정답인 문제에서만 '표기 주의'로
JP.course.build();
{
  const byR = {};
  JP.all.vocab.forEach(v => { if (v.w && /[㐀-鿿]/.test(v.w) && !/[〜~]/.test(v.r + v.w)) (byR[v.r] = byR[v.r] || []).push(v); });
  const pair = Object.values(byR).find(a => a.length >= 2 && a[0].w !== a[1].w && a[0].m !== a[1].m);
  if (pair) {
    const [a, b] = pair;
    eq(g(b.w, [{ k: a.r, w: a.w }]), 'near', 'homophone kanji ' + b.w + ' for ' + a.w);
    eq(g(a.w, [{ k: a.r }]), 'bad', 'kanji copied in reading question ' + a.w);
    console.log('같은 소리 다른 한자 예: ' + a.r + ' — ' + a.w + '(' + a.m + ') / ' + b.w + '(' + b.m + ')');
  } else { fail++; console.log('✗ 같은 소리의 단어 짝을 찾지 못함'); }
}
// 4. 앱이 보여 주는 로마자(JP.course.romaji)를 그대로 치면 맞음으로 채점되는지: 모든 단어 읽기와 예문 토큰
let rt = 0, rtBad = [];
const tokenKana = new Set();
JP.all.gram.forEach(gp => gp.x.concat(gp.more || []).forEach(s => s.tokens.forEach(t => tokenKana.add(t.kana))));
JP.all.vocab.map(v => v.r.replace(/[〜~]/g, '')).concat([...tokenKana]).forEach(k => {
  if (!/[ぁ-ゖァ-ヺ]/.test(k)) return;
  rt++;
  const r = D.grade(JP.course.romaji(k), [{ k }]);
  if (!r.ok) rtBad.push(k + '→' + JP.course.romaji(k) + '→' + r.given);
});
if (rtBad.length) { fail += rtBad.length; console.log('✗ 로마자 왕복 실패 ' + rtBad.length + '/' + rt + ': ' + rtBad.slice(0, 20).join(', ')); }
else console.log('로마자 왕복 ' + rt + '개 모두 맞음');
// 5. 문제 생성: 모든 항목을 배운 것으로 놓고 여러 세트·난이도로 만들어 봄
// (복습할 때가 된 항목이 없을 때: 지금까지 배운 것 전체에서 채우는 경로)
const TODAY = JP.U.today();
JP.store.state = { settings: { level: 'mid', romaji: 'auto' }, srs: {}, drill: {} };
Object.keys(JP.items).forEach(id => JP.store.state.srs[id] = [1 + (id.length % 5), TODAY + 3, id.length % 3, id.length % 2]);
JP.speech = { hasJa: () => true };
const kinds = {}; let n = 0;
for (const lv of ['easy', 'mid', 'hard']) {
  JP.store.state.settings.level = lv;
  for (const kind of ['mix', 'vocab', 'gram', 'listen']) {
    for (let i = 0; i < 40; i++) {
      const qs = D.buildSet(kind, 20);
      if (qs.length !== 20) { fail++; console.log('✗ set size', lv, kind, qs.length); }
      qs.forEach(q => {
        n++; kinds[q.kind + ':' + q.type] = (kinds[q.kind + ':' + q.type] || 0) + 1;
        if (q.kind === 'choice' && (!q.options || q.options.length < 2 || q.options.filter(o => o.value === q.answer).length !== 1)) { fail++; console.log('✗ choice', q.type); }
        if (q.kind === 'choice' && new Set(q.options.map(o => o.label)).size !== q.options.length) { fail++; console.log('✗ dup options', q.type, q.options.map(o => o.label).join('|')); }
        if (q.kind === 'input' && (!q.answers.length || !q.answers[0].k)) { fail++; console.log('✗ input', q.type); }
        if (q.kind === 'input' && D.grade(q.answers[0].k, q.answers).ok !== true) { fail++; console.log('✗ input self', q.type, q.answers[0].k); }
        if (q.kind === 'order' && (!q.tokens || q.tokens.length < (q.need || q.answerSeq.length))) { fail++; console.log('✗ order', q.type); }
        if (lv === 'hard' && q.kind === 'choice' && ['vocabReverse', 'cloze', 'kanaRead'].includes(q.type)) { fail++; console.log('✗ hard still choice', q.type); }
        if (q.romaji || q.type === 'kanaReadInput') { fail++; console.log('✗ 로마자로 쓰는 문제가 남음', q.type); }
        if (q.srsId) { fail++; console.log('✗ 복습할 때가 아닌데 srsId', q.type); }
        if (kind === 'listen' && !q.listening) { fail++; console.log('✗ 듣기 세트에 듣기 아닌 문제', q.type); }
      });
    }
  }
  // 레슨·평가에도 적용
  for (let d = 1; d <= 180; d++) {
    const T = JP.days[d].type;
    const qs = T === 'lesson' ? D.harden(JP.quiz.test(d), 'test').concat(D.harden(JP.quiz.practice(d), 'practice')) : T === 'boss' ? D.harden(JP.quiz.boss(d), 'boss') : T === 'listen' ? D.harden(JP.quiz.listen(d), 'listenTest') : D.harden(JP.quiz.exam(d), 'exam');
    qs.forEach(q => { if (['test', 'boss', 'exam'].length && q.kind === 'self' && T !== 'lesson') { fail++; console.log('✗ self in graded', d, q.type); } });
  }
}
// 6. 복습할 때가 된 항목이 먼저(고른 종류에 맞는 것만, srsId가 붙어서), 남는 자리는 배운 것에서
JP.store.state.settings.level = 'mid';
{
  const byType = { kana: [], vocab: [], gram: [], line: [] };
  Object.keys(JP.items).forEach(id => { const it = JP.items[id]; if (byType[it.type]) byType[it.type].push(id); });
  const dueSet = new Set();
  Object.keys(byType).forEach(t => byType[t].slice(0, 4).forEach(id => { JP.store.state.srs[id][1] = TODAY - 1; dueSet.add(id); }));
  const want = { mix: ['kana', 'vocab', 'gram', 'line'], vocab: ['vocab'], gram: ['gram', 'line'], listen: ['kana', 'vocab', 'gram', 'line'] };
  for (const kind of Object.keys(want)) {
    const exp = [...dueSet].filter(id => want[kind].includes(JP.items[id].type));
    eq(D.dueFor(kind).length, exp.length, 'dueFor ' + kind);
    for (let i = 0; i < 10; i++) {
      const qs = D.buildSet(kind, 20), got = qs.filter(q => q.srsId).map(q => q.srsId);
      eq(qs.length, 20, 'due set size ' + kind);
      eq(got.length, exp.length, 'due items in set ' + kind);
      got.forEach(id => { if (!dueSet.has(id) || !want[kind].includes(JP.items[id].type)) { fail++; console.log('✗ 다른 종류의 복습 항목', kind, id); } });
      qs.forEach(q => { if (q.srsId && q.drillId !== q.srsId) { fail++; console.log('✗ srsId≠drillId', q.type); } if (kind === 'listen' && !q.listening) { fail++; console.log('✗ 듣기 세트에 듣기 아닌 문제(복습)', q.type); } });
    }
  }
  // 복습할 때가 된 것이 20개를 넘으면 한 세트가 모두 복습할 때가 된 것 (오래 밀린 것부터)
  byType.vocab.slice(0, 30).forEach((id, i) => { JP.store.state.srs[id][1] = TODAY - 30 + i; });
  const qs = D.buildSet('vocab', 20);
  eq(qs.filter(q => q.srsId).length, 20, 'all due when due > 20');
  eq(qs.every(q => byType.vocab.slice(0, 20).includes(q.srsId)), true, 'oldest due first');
  eq(D.available('vocab') >= 20, true, 'available vocab');
}
// 7. 글자 소리 문제: 로마자로 쓰지 않고, 연습에서는 떠올리기 · 평가에서는 듣고 쓰기
{
  const k = JP.all.kana ? JP.all.kana[0] : JP.items[Object.keys(JP.items).find(id => JP.items[id].type === 'kana')];
  const q = JP.quiz._t.kanaRead(k);
  const a = D.hardenOne(q, 'review', 'hard'), b = D.hardenOne(q, 'test', 'hard');
  eq(a.kind + ':' + a.type, 'self:kanaRecall', 'kanaRead → recall (review)');
  eq(!!a.revealAudio, true, 'kanaRecall plays sound on reveal');
  eq(b.kind + ':' + b.type, 'input:kanaDictation', 'kanaRead → dictation (test)');
}
console.log('문제 ' + n + '개 생성 · 유형별:', Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(', '));
console.log(fail ? '실패 ' + fail + '개' : '모두 통과');
process.exit(fail ? 1 : 0);
