// UI 스모크 테스트: 실제 화면을 조작해 레슨·보스·청해·시험을 끝까지 진행
// 사용법: npx http-server -p 8765 & node tools/smoke.js
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8765/index.html';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(BASE);
  await page.waitForSelector('[data-act="onboard"]');
  await page.click('[data-act="onboard"]');
  await page.waitForSelector('.today');

  async function playDay(day, opts = {}) {
    if (day != null) await page.evaluate(d => JP.app.startRun(d), day);
    let guard = 0, result = null;
    while (guard++ < 400) {
      const info = await page.evaluate(() => {
        const r = JP.app.state(); if (!r) return { done: true };
        const s = r.steps[r.si]; const q = r.cur;
        return { k: s.k, qkind: q && !r.answered ? q.kind : null, answered: r.answered, hasFb: !!document.querySelector('.feedback'), res: r.res ? { score: r.res.score, pass: r.res.pass } : null };
      });
      if (info.done) break;
      if (info.k === 'result') {
        result = info.res;
        // 복습 결과: '한 세트 더'로 이어 풀 수 있는지 한 번 확인한 뒤 그만두기
        if (opts.more) { opts.more = false; const m = await page.$('#runFoot [data-act="review"]'); if (!m) { errors.push('한 세트 더 버튼이 없음'); } else { await m.click(); continue; } }
        await page.click('#runFoot [data-act="endRun"]'); continue;
      }
      if (info.hasFb) { await page.click('.feedback [data-act="cont"]'); continue; }
      if (info.qkind && !info.answered) {
        const wrong = opts.wrongEvery && Math.random() < opts.wrongEvery;
        await page.evaluate(({ wrong }) => {
          const r = JP.app.state(), q = r.cur;
          if (q.kind === 'choice') {
            const v = wrong ? q.options.find(o => o.value !== q.answer).value : q.answer;
            document.querySelector('#opts [data-v="' + v + '"]').click();
          } else if (q.kind === 'order') {
            const used = new Set();
            q.answerSeq.forEach(t => { const i = q.tokens.findIndex((x, j) => x.text === t && !used.has(j)); used.add(i); document.querySelector('.order-bank [data-i="' + i + '"]').click(); });
            document.querySelector('[data-act="orderCheck"]').click();
          } else if (q.kind === 'match') {
            q.pairs.forEach(p => { document.querySelector('[data-act="mL"][data-id="' + p.id + '"]').click(); document.querySelector('[data-act="mR"][data-id="' + p.id + '"]').click(); });
          } else if (q.kind === 'input') {
            // 일본어 자판처럼 가나를 그대로 씀. 네 번에 한 번은 로마자로 쳐서 자판이 없을 때의 변환도 점검
            const inp = document.getElementById('ansIn'), k = q.answers[0].k, n = window.__inputs || 0;
            inp.value = wrong ? 'zzzz' : n % 4 === 3 ? JP.course.romaji(k) : k;
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            const pv = document.getElementById('ansPrev');
            if (!wrong && n % 4 !== 3 && pv && pv.textContent) window.__prevBad = (window.__prevBad || 0) + 1;   // 가나로 쓰면 미리 보기 없음
            window.__inputs = n + 1;
            document.querySelector('[data-act="inputCheck"]').click();
          } else if (q.kind === 'self') {
            document.querySelector('[data-act="selfShow"]').click();
            window.__selfs = (window.__selfs || 0) + 1;
            document.querySelector('[data-act="selfRate"][data-v="' + (wrong ? '0' : '1') + '"]').click();
          }
        }, { wrong });
        await page.waitForTimeout(80);
        // 채점 단계는 도장 연출(0.72초) 뒤 자동 진행
        const graded = await page.evaluate(() => { const r = JP.app.state(); return r && ({ test: 1, boss: 1, listenTest: 1, exam: 1 })[r.steps[r.si].k]; });
        if (graded) await page.waitForTimeout(800);
        continue;
      }
      // 버튼 진행 (인트로·카드·대사·인문학)
      const btn = await page.$('#runFoot [data-act="cardNext"], #runFoot [data-act="next"]');
      if (btn) { await btn.click(); continue; }
      await page.waitForTimeout(150);
    }
    return result;
  }

  // 문제 난이도: 기본(섞어 풀기)에서 직접 입력·스스로 채점 문제가 섞여 나오는지 함께 봄
  const r1 = await playDay(1);
  console.log('day 1 →', r1);
  await page.waitForSelector('.today');
  const r2 = await playDay(2, { wrongEvery: 0.15 });
  console.log('day 2 (some wrong) →', r2);
  // 체험 모드로 다른 유형 점검
  await page.evaluate(() => { JP.store.state.settings.unlockAll = true; JP.store.save(); JP.app.render(); });
  for (const d of [7, 10, 29, 30, 59, 60, 151, 170, 180]) {
    const r = await playDay(d);
    console.log('day', d, JP_TYPE(d), '→', r);
  }
  function JP_TYPE(d) { return d % 30 === 0 ? 'exam' : d % 30 === 29 ? 'listen' : (d % 30) % 7 === 0 ? 'boss' : 'lesson'; }
  // 복습 탭 · 문자표 · 학습 노트 · 나 화면 렌더
  for (const t of ['review', 'kana', 'book', 'me', 'home']) {
    await page.click('[data-act="tab"][data-v="' + t + '"]');
    await page.waitForTimeout(200);
  }
  // 학습 노트: 단어·문법·대사·인문학 칸, 문법 자세히 펼치기
  await page.click('[data-act="tab"][data-v="book"]');
  for (const v of ['vocab', 'gram', 'line', 'note']) {
    await page.click('[data-act="bookTab"][data-v="' + v + '"]');
    await page.waitForTimeout(150);
  }
  await page.click('[data-act="bookTab"][data-v="gram"]');
  const notes = await page.evaluate(() => { const d = document.querySelector('details.gitem'); if (d) d.open = true; return { items: document.querySelectorAll('details.gitem').length, why: document.querySelectorAll('details.gitem .gsec').length }; });
  console.log('notes →', JSON.stringify(notes));
  if (!notes.items || !notes.why) errors.push('학습 노트 문법 칸이 비어 있음');
  // 지난 화 다시 읽기 (1화 시트 → 이 화 내용 다시 읽기)
  await page.click('[data-act="tab"][data-v="home"]');
  await page.evaluate(() => { const c = document.querySelector('[data-act="chap"][data-v="1"]'); if (c) c.click(); });
  await page.click('[data-act="sheet"][data-day="1"]');
  await page.click('[data-act="dayReview"]');
  await page.waitForTimeout(200);
  const rv = await page.evaluate(() => document.querySelectorAll('.sheet.tall .rv-sec').length);
  console.log('day review sections →', rv);
  if (!rv) errors.push('이 화 내용 다시 읽기가 비어 있음');
  await page.click('.sheet.tall [data-act="closeOverlay"]');
  // 복습: 복습 탭의 카드 하나 → 종류·난이도 → 시작. 옛 버튼(무작위 청해·약점 집중 훈련·누적 복습 카드)이 없어야 함
  await page.click('[data-act="tab"][data-v="review"]');
  await page.waitForTimeout(150);
  const tab = await page.evaluate(() => ({ card: document.querySelectorAll('.review-card').length, starts: document.querySelectorAll('[data-act="review"]').length,
    old: document.querySelectorAll('.drill-card, [data-act="drill"], [data-v="weak"], [data-v="due"]').length }));
  console.log('review tab →', JSON.stringify(tab));
  if (tab.card !== 1 || tab.starts !== 1 || tab.old) errors.push('복습 탭이 하나로 합쳐지지 않음 ' + JSON.stringify(tab));
  // 복습할 때가 된 항목 3개를 만들어 세트 앞에 나오는지, 맞히면 기억 단계가 오르는지 확인
  const dueIds = await page.evaluate(() => {
    const s = JP.store.state, ids = Object.keys(s.srs).filter(id => JP.items[id] && JP.items[id].type === 'vocab').slice(0, 3);
    ids.forEach(id => { s.srs[id] = [2, JP.U.today() - 1, 1, 0]; });
    JP.store.save(); JP.app.render(); return ids;
  });
  await page.click('[data-act="reviewKind"][data-v="mix"]');
  await page.click('[data-act="setLevel"][data-v="hard"]');
  const hero = await page.evaluate(() => document.querySelector('.review-card .hero-num').textContent);
  if (+hero < 3) errors.push('오늘 복습할 항목 수가 ' + hero);
  await page.click('.review-card [data-act="review"]');
  const inSet = await page.evaluate(ids => JP.app.state().steps[0].qs.filter(q => ids.includes(q.srsId)).length, dueIds);
  const r0 = await playDay(null);
  const after = await page.evaluate(ids => ids.map(id => JP.store.state.srs[id][0] + '/' + (JP.store.state.srs[id][1] - JP.U.today())), dueIds);
  console.log('review mix hard (복습할 때가 된 것 ' + inSet + '/3) →', r0, '· 기억 단계/다음 복습까지 일수', after.join(' '));
  if (inSet !== 3) errors.push('복습할 때가 된 항목이 세트에 다 들어가지 않음: ' + inSet);
  if (!after.every(x => x === '3/4')) errors.push('복습할 때가 된 항목을 맞혔는데 기억 단계가 오르지 않음: ' + after.join(' '));
  if (!r0 || r0.score < 100) errors.push('복습(mix·hard) 정답을 다 맞혔는데 ' + (r0 && r0.score) + '점');
  for (const [kind, lv] of [['gram', 'mid'], ['listen', 'hard'], ['vocab', 'easy']]) {
    await page.click('[data-act="tab"][data-v="review"]');
    await page.click('[data-act="reviewKind"][data-v="' + kind + '"]');
    await page.click('[data-act="setLevel"][data-v="' + lv + '"]');
    await page.click('.review-card [data-act="review"]');
    const r = await playDay(null, { more: kind === 'vocab' });
    console.log('review', kind, lv, '→', r);
    if (!r || r.score < 100) errors.push('복습(' + kind + '·' + lv + ') 정답을 다 맞혔는데 ' + (r && r.score) + '점');
  }
  const inputs = await page.evaluate(() => [window.__inputs || 0, window.__selfs || 0, JP.store.state.drill.sets, window.__prevBad || 0]);
  console.log('직접 입력 ' + inputs[0] + '문항 · 스스로 채점 ' + inputs[1] + '문항 · 복습 세트 ' + inputs[2]);
  if (!inputs[0] || !inputs[1]) errors.push('직접 입력·스스로 채점 문제가 나오지 않음');
  if (inputs[3]) errors.push('가나로 썼는데 미리 보기가 나온 문항 ' + inputs[3]);
  await page.evaluate(() => { JP.store.state.settings.level = 'mid'; JP.store.save(); });
  // 다른 목소리 버튼 (녹음 음성일 때만 나옴): 누르면 목소리 이름으로 바뀜
  await page.evaluate(() => JP.app.startRun(31));
  for (let i = 0; i < 20 && !(await page.$('.voice-btn')); i++) {
    const btn = await page.$('#runFoot [data-act="cardNext"], #runFoot [data-act="next"]'); if (btn) await btn.click(); await page.waitForTimeout(80);
  }
  const vb = await page.$('.voice-btn');
  if (vb) { await vb.click(); await page.waitForTimeout(150); console.log('voice button →', await vb.textContent()); }
  else console.log('voice button → (기기 음성 모드라 없음)');
  await page.evaluate(() => { const r = JP.app.state(); if (r) document.querySelector('[data-act="quit"]').click(); });
  await page.waitForTimeout(150);
  const q0 = await page.$('[data-act="quitYes"]'); if (q0) await q0.click();
  await page.click('[data-act="tab"][data-v="review"]');
  const start = await page.$('.review-card [data-act="review"]');
  if (start) { await start.click(); await page.waitForTimeout(200); }
  const st = await page.evaluate(() => ({ xp: JP.store.state.xp, streak: JP.store.state.streak, srs: Object.keys(JP.store.state.srs).length, badges: Object.keys(JP.store.state.badges) }));
  console.log('state →', JSON.stringify(st));
  await page.evaluate(() => { const r = JP.app.state(); if (r) document.querySelector('[data-act="quit"]').click(); });
  await page.waitForTimeout(200);
  const quit = await page.$('[data-act="quitYes"]'); if (quit) await quit.click();
  await page.click('[data-act="tab"][data-v="home"]');
  await page.screenshot({ path: process.env.SHOT || '/tmp/home.png', fullPage: false });
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
