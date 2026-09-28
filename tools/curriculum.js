#!/usr/bin/env node
/* 180일 커리큘럼 표 생성: node tools/curriculum.js > docs/CURRICULUM.md */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { console, Math, Date, JSON, Object, Array, String, Number, Error, setTimeout, clearTimeout, Promise };
ctx.globalThis = ctx; vm.createContext(ctx);
const files = ['js/data/kana.js', 'js/course.js', 'js/core.js'];
fs.readdirSync(path.join(root, 'js/data')).filter(f => /^ch\d+\.js$/.test(f)).sort().forEach(f => files.push('js/data/' + f));
files.forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx));
const JP = ctx.JP; JP.course.build();
const out = [];
const cnt = (a) => a.length;
out.push('# アニ耳 180일 커리큘럼');
out.push('');
out.push('> 이 문서는 `node tools/curriculum.js > docs/CURRICULUM.md`로 앱 데이터에서 자동 생성됩니다. 내용을 고치려면 `js/data/ch*.js`를 수정하세요.');
out.push('');
out.push(`- 총 **${JP.totalDays}화** (6챕터 × 30화) · 학습 ${JP.sortedChapters.length * 24}화 + 보스전 24회 + 청해 특훈 6회 + 승급 시험 6회`);
out.push(`- 가나 ${JP.all.kana.length}자 · 단어·표현 ${JP.all.vocab.length}개 · 문법 ${JP.all.gram.length}항목 · 예문 ${JP.all.gram.reduce((a, g) => a + g.x.length, 0)}개 · 애니 대사 ${JP.all.line.length}개 · 장면 대화 ${JP.all.dlg.length}편 · 인문학 노트 ${JP.sortedChapters.reduce((a, c) => a + c.lessons.filter(l => l.note).length, 0)}편`);
out.push('- 하루 권장 학습 시간: 20~30분 (복습 → 새로 배우기 → 연습 → 애니 대사 → 인문학 → 평가)');
out.push('');
JP.sortedChapters.forEach(ch => {
  out.push(`## 제${ch.n}장 ${ch.title} (${ch.jp}) — ${ch.rankFrom}급 → ${ch.rankTo}급`);
  out.push('');
  out.push(`**목표** ${ch.goal}`);
  out.push('');
  out.push('| 화 | 유형 | 제목 | 핵심 내용 | 어휘 | 인문학 한 스푼 |');
  out.push('|---:|---|---|---|---:|---|');
  for (let d = (ch.n - 1) * 30 + 1; d <= ch.n * 30; d++) {
    const D = JP.days[d];
    const type = { lesson: '학습', boss: '보스전', listen: '청해 특훈', exam: '승급 시험' }[D.type];
    let core = '';
    if (D.type === 'lesson') {
      const parts = [];
      if (D.kana.length) parts.push('가나 ' + D.kana.map(k => k.c).join(' '));
      D.gram.forEach(g => parts.push(g.t));
      if (D.dlg) parts.push('장면 대화');
      core = parts.join(' / ');
    } else core = D.sub + (D.range ? ` (${D.range[0]}~${D.range[1]}화 범위)` : '');
    const vocab = D.type === 'lesson' ? D.vocab.length : '';
    const note = D.note ? D.note[0] : '';
    out.push(`| ${d} | ${type} | ${D.title} | ${core.replace(/\|/g, '/')} | ${vocab} | ${note} |`);
  }
  out.push('');
});
console.log(out.join('\n'));
