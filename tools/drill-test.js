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
// 4. 앱이 보여 주는 로마자(JP.course.romaji)를 그대로 치면 맞음으로 채점되는지: 모든 단어 읽기와 예문 토큰
JP.course.build();
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
JP.store.state = { settings: { level: 'mid', romaji: 'auto' }, srs: {}, drill: {} };
Object.keys(JP.items).forEach(id => JP.store.state.srs[id] = [1 + (id.length % 5), 0, id.length % 3, id.length % 2]);
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
        if (lv === 'hard' && q.kind === 'choice' && ['vocabReverse', 'cloze'].includes(q.type)) { fail++; console.log('✗ hard still choice', q.type); }
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
console.log('문제 ' + n + '개 생성 · 유형별:', Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(', '));
console.log(fail ? '실패 ' + fail + '개' : '모두 통과');
process.exit(fail ? 1 : 0);
