#!/usr/bin/env node
/* 녹음 음성이 필요한 모든 문장을 뽑아 JSON으로 출력 (tools/make-audio.py의 입력)
 * 사용법: node tools/audio-texts.js > /tmp/audio-texts.json
 * 각 항목: { key, hash, voice, synth, kana, toks, w, pack, kind }
 *  - pack 0 = 가나·고정 문장, pack 1~6 = 해당 문장이 처음 나오는 챕터
 *  - toks = 예문의 토큰별 [표기, 가나 읽기] (조사 は·へ·を 발음 검사용), w = 단어의 한자 표기 (억양·읽기 정확도용)
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
function add(text, opts) {
  const voice = opts.voice || 'f';
  const key = JP.audioKey(text, voice);
  if (out.has(key)) return;
  out.set(key, { key, hash: JP.audioHash(key), voice, synth: opts.synth || key.slice(2), kana: opts.kana || '', toks: opts.toks || null, w: opts.w || '', pack: opts.pack, kind: opts.kind });
}
JP.STATIC_AUDIO.forEach(t => add(t, { pack: 0, kind: 'static' }));
JP.kana.list.forEach(k => add(k.c, { pack: 0, kind: 'kana', synth: JP.kana.toKata(k.c) }));
for (let d = 1; d <= JP.totalDays; d++) {
  const D = JP.days[d];
  if (!D || D.type !== 'lesson') continue;
  const pack = D.ch;
  D.vocab.forEach(v => add(v.r, { pack, kind: 'vocab', w: v.w }));
  (D.pairs || []).forEach(p => { add(p[0], { pack, kind: 'pair' }); add(p[1], { pack, kind: 'pair' }); });
  D.gram.forEach(g => g.x.forEach(s => add(s.plain, { pack, kind: 'sent', kana: s.kana, toks: toks(s) })));
  if (D.line) add(D.line.s.plain, { pack, kind: 'line', kana: D.line.s.kana, toks: toks(D.line.s) });
  if (D.dlg) {
    const who = [];
    D.dlg.lines.forEach(l => {
      if (who.indexOf(l.who) < 0) who.push(l.who);
      add(l.s.plain, { pack, kind: 'dlg', kana: l.s.kana, toks: toks(l.s), voice: who.indexOf(l.who) % 2 ? 'm' : 'f' });
    });
  }
}
const list = [...out.values()];
const hashes = new Set(list.map(x => x.hash));
if (hashes.size !== list.length) { console.error('hash collision!'); process.exit(1); }
process.stdout.write(JSON.stringify(list));
console.error('clips:', list.length);
