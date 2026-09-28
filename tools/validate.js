#!/usr/bin/env node
/* 콘텐츠·문제 생성기 검증 스크립트
 * 사용법: node tools/validate.js
 * - 모든 챕터 데이터를 불러와 180일 코스를 구성
 * - 마크업(후리가나·빈칸) 문법 오류, 중복 어휘, 가나 표기 오류 검사
 * - 모든 날짜에 대해 연습/평가/보스/청해/시험 문제를 여러 번 생성해 보기 개수·중복·정답 포함 여부 확인
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ctx = { console, Math, Date, JSON, Object, Array, String, Number, Error, setTimeout, clearTimeout, Promise };
ctx.globalThis = ctx;
vm.createContext(ctx);
const files = ['js/data/kana.js', 'js/course.js', 'js/core.js'];
const dataDir = path.join(root, 'js/data');
fs.readdirSync(dataDir).filter(f => /^ch\d+\.js$/.test(f)).sort().forEach(f => files.push('js/data/' + f));
files.push('js/quiz.js');
for (const f of files) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });

const JP = ctx.JP;
JP.store.state = null;
JP.store.load = function () { this.state = JSON.parse(JSON.stringify({ settings: { romaji: 'auto', rate: 1 }, srs: {}, prog: {} })); return this.state; };
JP.store.load();
JP.course.build();

let errors = 0, warnings = 0;
const err = (m) => { errors++; console.log('  ✗ ' + m); };
const warn = (m) => { warnings++; console.log('  ! ' + m); };

console.log('챕터 수:', JP.sortedChapters.length, '/ 총 일수:', JP.totalDays);
JP.sortedChapters.forEach(ch => {
  if (ch.lessons.length !== 24) err(`챕터 ${ch.n}: 학습일이 ${ch.lessons.length}일 (24일이어야 함)`);
});
for (let d = 1; d <= JP.totalDays; d++) if (!JP.days[d]) err('비어 있는 날짜: ' + d);

// 가나 표기 검사
const KANA_RE = /^[ぁ-ゖァ-ヺー〜]+$/;
const seenReading = {};
JP.all.vocab.forEach(v => {
  const r = v.r.replace(/^〜/, '');
  if (!KANA_RE.test(v.r)) err(`어휘 읽기에 가나 이외 문자: ${v.r} (day ${v.day})`);
  if (!v.m) err(`뜻 없음: ${v.r} (day ${v.day})`);
  const key = v.r + '|' + v.w;
  if (seenReading[key]) warn(`중복 어휘: ${v.r} ${v.w} (day ${seenReading[key]} & ${v.day})`);
  seenReading[key] = v.day;
  const ro = JP.course.romaji(r);
  if (/[^a-z'~ -]/.test(ro)) err(`로마자 변환 실패: ${v.r} → ${ro}`);
});
console.log('어휘:', JP.all.vocab.length, '문법:', JP.all.gram.length, '대사:', JP.all.line.length, '대화:', JP.all.dlg.length, '가나:', JP.all.kana.length);
console.log('예문:', JP.all.gram.reduce((a, g) => a + g.x.length, 0), '빈칸 예문:', JP.all.gram.reduce((a, g) => a + g.x.filter(x => x.cloze).length, 0), '인문학 노트:', JP.sortedChapters.reduce((a, c) => a + c.lessons.filter(l => l.note).length, 0));

// 예문 마크업 검사
const allSent = [];
JP.all.gram.forEach(g => g.x.forEach(s => allSent.push([g, s])));
JP.all.line.forEach(l => allSent.push([l, l.s]));
JP.all.dlg.forEach(dl => dl.lines.forEach(ln => allSent.push([dl, ln.s])));
JP.all.dlg.forEach(dl => {
  const opts = [dl.q.a].concat(dl.q.w);
  if (opts.length !== 4 || new Set(opts).size !== 4) err(`대화 문제 보기 오류 day ${dl.day}`);
});
allSent.forEach(([it, s]) => {
  if (/[{}\[\]|]/.test(s.plain)) err(`마크업 잔여 문자: ${s.markup} (day ${it.day})`);
  if (/[㐀-鿿]/.test(s.kana)) err(`후리가나 누락 한자: ${s.markup} → ${s.kana} (day ${it.day})`);
  if (!s.ko) err(`번역 없음: ${s.markup} (day ${it.day})`);
  if (s.cloze) {
    const all = [s.cloze.answer].concat(s.cloze.opts);
    if (new Set(all).size !== all.length) err(`빈칸 보기 중복: ${s.markup}`);
  }
});
JP.all.gram.forEach(g => {
  if (!g.d) warn(`문법 설명 없음: ${g.t} (day ${g.day})`);
});

// 가나 전부 배정되었는지
const unassigned = JP.kana.list.filter(k => !k.day);
if (unassigned.length) err('어느 날에도 배정되지 않은 가나: ' + unassigned.map(k => k.ch).join(' '));

// 학습 노트 / 대사
JP.sortedChapters.forEach(ch => ch.lessons.forEach((L, i) => {
  if (!L.note) warn(`인문학 노트 없음: 챕터 ${ch.n} 학습 ${i + 1} (${L.t})`);
}));

// 문제 생성
function checkQ(q, where) {
  if (!q) return err(where + ': 문제 없음');
  if (q.kind === 'choice') {
    const labels = q.options.map(o => o.label);
    if (new Set(labels).size !== labels.length) err(`${where}: 보기 중복 [${labels.join(' / ')}] (${q.type})`);
    if (!q.options.some(o => o.value === q.answer)) err(`${where}: 정답 보기 없음`);
    if (q.type !== 'pair' && q.options.length !== 4) err(`${where}: 보기 ${q.options.length}개 (${q.type})`);
  } else if (q.kind === 'order') {
    if (q.tokens.length < 3) err(`${where}: 배열 토큰 부족`);
  } else if (q.kind === 'match') {
    if (q.pairs.length < 3) err(`${where}: 짝 부족`);
    const r = q.pairs.map(p => p.r); if (new Set(r).size !== r.length) err(`${where}: 짝 오른쪽 중복 ${r.join('/')}`);
  }
}
for (let rep = 0; rep < 4; rep++) {
  for (let d = 1; d <= JP.totalDays; d++) {
    const D = JP.days[d];
    try {
      if (D.type === 'lesson') {
        const p = JP.quiz.practice(d); if (!p.length) err('연습 문제 없음 day ' + d); p.forEach(q => checkQ(q, 'practice d' + d));
        const t = JP.quiz.test(d); if (t.length !== 10) err(`평가 문항 ${t.length}개 day ${d}`); t.forEach(q => checkQ(q, 'test d' + d));
        if (t.filter(q => q.listening).length < 2) warn(`평가 청해 문항 부족 day ${d}`);
      } else if (D.type === 'boss') {
        const b = JP.quiz.boss(d); if (b.length < 20) err(`보스 문항 ${b.length}개 day ${d}`); b.forEach(q => checkQ(q, 'boss d' + d));
      } else if (D.type === 'listen') {
        const l = JP.quiz.listen(d); if (l.length < 15) err(`청해 특훈 문항 ${l.length}개 day ${d}`); l.forEach(q => checkQ(q, 'listen d' + d));
      } else if (D.type === 'exam') {
        const e = JP.quiz.exam(d); if (e.length !== 30) err(`시험 문항 ${e.length}개 day ${d}`); e.forEach(q => checkQ(q, 'exam d' + d));
      }
    } catch (e) { err(`day ${d} 생성 중 예외: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
  }
}

console.log(`\n결과: 오류 ${errors}개, 경고 ${warnings}개`);
process.exit(errors ? 1 : 0);
