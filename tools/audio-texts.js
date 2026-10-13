#!/usr/bin/env node
/* 녹음 음성이 필요한 모든 문장을 뽑아 JSON으로 출력 (tools/make-audio.py의 입력)
 * 사용법: node tools/audio-texts.js > /tmp/audio-texts.json
 * 각 항목: { key, hash, voice, synth, kana, toks, w, pack, kind }
 *  - pack 0 = 가나·고정 문장, pack 1~6 = 해당 문장이 처음 나오는 챕터
 *  - toks = 예문의 토큰별 [표기, 가나 읽기] (조사 は·へ·を 발음 검사용), w = 단어의 한자 표기 (억양·읽기 정확도용)
 *  - gtext·ruby = 구글 음성용 입력: 한 글자 한자는 후리가나로 바꾼 문장, 두 글자 이상 한자는 [한자, 읽기] 목록(읽기 지정용)
 *  - who·day = 장면 대화의 화자 이름과 날짜, group = 소리 구별 짝(두 단어를 같은 목소리로)
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { console, Math, Date, JSON, Object, Array, String, Number, Error, setTimeout, clearTimeout, Promise, unescape, encodeURIComponent };
ctx.globalThis = ctx; vm.createContext(ctx);
const files = ['js/data/kana.js', 'js/course.js', 'js/core.js'];
fs.readdirSync(path.join(root, 'js/data')).filter(f => /^ch\d+\.js$/.test(f)).sort().forEach(f => files.push('js/data/' + f));
files.forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx));
const JP = ctx.JP; JP.course.build();
const out = new Map();
const toks = s => s.tokens.map(t => [t.plain, t.kana]);
// 구글 음성 입력 만들기: 한 글자 한자(何·方·上 등)는 읽기가 여러 개라 후리가나로 바꾸고,
// 두 글자 이상 한자는 한자 그대로 두되 읽기를 지정. 같은 한자가 한 문장에서 다르게 읽히면 둘 다 가나로
const RUN = /([\u3400-\u9fff\uf900-\ufaff々〆ヶ]+)\{([^}]+)\}/g;
function gInput(s) {
  const pairs = new Map(), conflict = new Set();
  s.tokens.forEach(t => { for (const m of t.src.matchAll(RUN)) if (m[1].length > 1) { if (pairs.has(m[1]) && pairs.get(m[1]) !== m[2]) conflict.add(m[1]); else pairs.set(m[1], m[2]); } });
  const gtext = s.tokens.map(t => t.src.replace(RUN, (all, k, r) => (k.length === 1 || conflict.has(k)) ? r : k) + (t.punct || '')).join('');
  return { gtext, ruby: [...pairs].filter(([k]) => !conflict.has(k)) };
}
function add(text, opts) {
  const voice = opts.voice || 'f';
  const key = JP.audioKey(text, voice);
  if (out.has(key)) return;
  out.set(key, { key, hash: JP.audioHash(key), voice, synth: opts.synth || key.slice(2), kana: opts.kana || '', toks: opts.toks || null, w: opts.w || '', pack: opts.pack, kind: opts.kind,
    gtext: opts.g ? opts.g.gtext : '', ruby: opts.g ? opts.g.ruby : [], who: opts.who || '', day: opts.day || 0, group: opts.group || '' });
}
JP.STATIC_AUDIO.forEach(t => add(t, { pack: 0, kind: 'static' }));
JP.kana.list.forEach(k => add(k.c, { pack: 0, kind: 'kana', synth: JP.kana.toKata(k.c) }));
for (let d = 1; d <= JP.totalDays; d++) {
  const D = JP.days[d];
  if (!D || D.type !== 'lesson') continue;
  const pack = D.ch;
  D.vocab.forEach(v => add(v.r, { pack, kind: 'vocab', w: v.w }));
  (D.pairs || []).forEach(p => { add(p[0], { pack, kind: 'pair', group: p[0] }); add(p[1], { pack, kind: 'pair', group: p[0] }); });
  D.gram.forEach(g => g.x.forEach(s => add(s.plain, { pack, kind: 'sent', kana: s.kana, toks: toks(s), g: gInput(s) })));
  if (D.line) add(D.line.s.plain, { pack, kind: 'line', kana: D.line.s.kana, toks: toks(D.line.s), g: gInput(D.line.s) });
  if (D.dlg) {
    const who = [];
    D.dlg.lines.forEach(l => {
      if (who.indexOf(l.who) < 0) who.push(l.who);
      add(l.s.plain, { pack, kind: 'dlg', kana: l.s.kana, toks: toks(l.s), g: gInput(l.s), who: l.who, day: d, voice: who.indexOf(l.who) % 2 ? 'm' : 'f' });
    });
  }
}
const list = [...out.values()];
const hashes = new Set(list.map(x => x.hash));
if (hashes.size !== list.length) { console.error('hash collision!'); process.exit(1); }
process.stdout.write(JSON.stringify(list));
console.error('clips:', list.length);
