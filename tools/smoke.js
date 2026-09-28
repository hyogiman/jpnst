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
    await page.evaluate(d => JP.app.startRun(d), day);
    let guard = 0, result = null;
    while (guard++ < 400) {
      const info = await page.evaluate(() => {
        const r = JP.app.state(); if (!r) return { done: true };
        const s = r.steps[r.si]; const q = r.cur;
        return { k: s.k, qkind: q && !r.answered ? q.kind : null, answered: r.answered, hasFb: !!document.querySelector('.feedback'), res: r.res ? { score: r.res.score, pass: r.res.pass } : null };
      });
      if (info.done) break;
      if (info.k === 'result') { result = info.res; await page.click('[data-act="endRun"]'); continue; }
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
  // 복습 탭 · 문자표 · 단어장 · 나 화면 렌더
  for (const t of ['review', 'kana', 'book', 'me', 'home']) {
    await page.click('[data-act="tab"][data-v="' + t + '"]');
    await page.waitForTimeout(200);
  }
  await page.click('[data-act="tab"][data-v="review"]');
  const due = await page.$('[data-act="review"][data-v="due"]');
  if (due) { await due.click(); await page.waitForTimeout(200); }
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
