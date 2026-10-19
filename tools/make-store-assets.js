// 구글 플레이 스토어 등록 자료 만들기 → store/
//  - icon-512.png        : 앱 아이콘 512×512 (꽉 찬 정사각형 — 둥근 모서리는 플레이가 입힘)
//  - feature-graphic.png : 대표 이미지 1024×500
//  - screenshot-1~7.png  : 휴대폰 화면 1080×1920 (실제 앱 화면을 몇 화 공부한 상태로 캡처)
// 사용법: ANIMIMI_STORE=play node tools/build-app.js && npx http-server www -p 8766 &
//         node tools/make-store-assets.js      (playwright 필요)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8766/index.html';
const out = path.join(__dirname, '..', 'store');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

  // 1) 아이콘 512×512 — 플레이 규격은 모서리까지 꽉 찬 정사각형(둥근 모서리·그림자는 플레이가 입힘)
  const svg = fs.readFileSync(path.join(__dirname, '..', 'icons/icon.svg'), 'utf8').replace('<svg ', '<svg width="512" height="512" ');
  const ip = await browser.newPage({ viewport: { width: 512, height: 512 } });
  await ip.setContent(`<html><body style="margin:0">${svg.replace(/ rx="[\d.]+"/, '')}</body></html>`);
  await ip.screenshot({ path: path.join(out, 'icon-512.png') });

  // 2) 대표 이미지 1024×500 (앱 글꼴을 쓰려고 앱 주소에서 그림)
  const fp = await browser.newPage({ viewport: { width: 1024, height: 500 } });
  await fp.goto(BASE);
  await fp.evaluate(logo => {
    document.body.innerHTML = `
      <div style="width:1024px;height:500px;position:relative;overflow:hidden;background:#1E50A2;color:#fff;font-family:'IBM Plex Sans KR',sans-serif">
        <div style="position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.08) 1.6px,transparent 2px);background-size:14px 14px"></div>
        <div style="position:absolute;right:-60px;top:-40px;width:420px;height:420px;border-radius:50%;background:rgba(255,255,255,.06)"></div>
        <div style="position:absolute;left:72px;top:92px;display:flex;align-items:center;gap:28px">
          <div style="width:150px;height:150px;border-radius:34px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.25)">${logo}</div>
          <div>
            <div style="font-family:'Dela Gothic One',sans-serif;font-size:92px;line-height:1">アニ耳</div>
            <div style="font-family:'Black Han Sans',sans-serif;font-size:40px;margin-top:14px;letter-spacing:.02em">애니를 듣는 귀 · 일본어 180일</div>
          </div>
        </div>
        <div style="position:absolute;left:72px;bottom:70px;display:flex;gap:12px;font-size:22px;font-weight:700">
          ${['히라가나부터 애니 대사까지', '매일 평가·간격 반복', '자연스러운 음성 4종'].map(t => `<span style="background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.3);padding:8px 16px;border-radius:999px">${t}</span>`).join('')}
        </div>
      </div>`;
  }, svg.replace('width="512" height="512" ', 'width="150" height="150" '));
  await fp.waitForTimeout(600);
  await fp.screenshot({ path: path.join(out, 'feature-graphic.png') });

  // 3) 휴대폰 화면 (360×640 × 3배 = 1080×1920)
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 });
  await page.goto(BASE);
  await page.waitForSelector('[data-act="onboard"]');
  await page.click('[data-act="onboard"]');
  await page.waitForSelector('.today');
  const shot = async (n) => { await page.waitForTimeout(500); await page.screenshot({ path: path.join(out, `screenshot-${n}.png`) }); };

  // 진행 중인 화를 끝까지 진행 (tools/smoke.js와 같은 방식). stopAt(info)가 참이면 그 화면에서 멈춤
  async function advance(stopAt) {
    for (let guard = 0; guard < 400; guard++) {
      const info = await page.evaluate(() => {
        const r = JP.app.state(); if (!r) return { done: true };
        const s = r.steps[r.si]; const q = r.cur;
        return { k: s.k, qkind: q && !r.answered ? q.kind : null, lis: !!(q && q.listening), answered: r.answered, hasFb: !!document.querySelector('.feedback'), dlg: !!document.querySelector('#runBody .dlg') };
      });
      if (info.done) return;
      if (stopAt && stopAt(info)) return info;
      if (info.k === 'result') { await page.click('[data-act="endRun"]'); continue; }
      if (info.hasFb) { await page.click('.feedback [data-act="cont"]'); continue; }
      if (info.qkind && !info.answered) {
        await page.evaluate(() => {
          const r = JP.app.state(), q = r.cur;
          if (q.kind === 'choice') document.querySelector('#opts [data-v="' + q.answer + '"]').click();
          else if (q.kind === 'order') {
            const used = new Set();
            q.answerSeq.forEach(t => { const i = q.tokens.findIndex((x, j) => x.text === t && !used.has(j)); used.add(i); document.querySelector('.order-bank [data-i="' + i + '"]').click(); });
            document.querySelector('[data-act="orderCheck"]').click();
          } else if (q.kind === 'match') {
            q.pairs.forEach(p => { document.querySelector('[data-act="mL"][data-id="' + p.id + '"]').click(); document.querySelector('[data-act="mR"][data-id="' + p.id + '"]').click(); });
          }
        });
        await page.waitForTimeout(80);
        const graded = await page.evaluate(() => { const r = JP.app.state(); return r && ({ test: 1, boss: 1, listenTest: 1, exam: 1 })[r.steps[r.si].k]; });
        if (graded) await page.waitForTimeout(800);
        continue;
      }
      const btn = await page.$('#runFoot [data-act="cardNext"], #runFoot [data-act="next"]');
      if (btn) { await btn.click(); continue; }
      await page.waitForTimeout(150);
    }
  }
  async function playDay(day, stopAt) {
    await page.evaluate(d => JP.app.startRun(d), day);
    return advance(stopAt);
  }
  async function quitRun() {
    await page.evaluate(() => JP.app.back());
    const yes = await page.$('[data-act="quitYes"]');
    if (yes) await yes.click();
    await page.waitForTimeout(300);
  }

  // ② 글자 카드 (1화 첫 글자)
  await playDay(1, info => info.k === 'learn');
  await shot(2);
  await quitRun();
  // 몇 화 공부해 둔 상태 만들기
  for (const d of [1, 2, 3]) await playDay(d);
  // ③ 듣기 문제 (4화 평가에서 처음 나오는 듣기 문제)
  await playDay(4, info => info.k === 'test' && info.qkind === 'choice' && info.lis);
  await shot(3);
  await quitRun();
  // 아래 두 장은 체험 모드(모든 화 열기)로 찍고 되돌림
  await page.evaluate(() => { JP.store.state.settings.unlockAll = true; JP.store.save(); JP.app.render(); });
  // ⑤ 인문학 한 스푼 (5화 '역할어' — 다른 작품 이름이 나오지 않는 글)
  await playDay(5, info => info.k === 'note');
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(5);
  await quitRun();
  // ④ 장면 대화 (151화 대화 단계, 일본어 자막)
  await playDay(151, info => info.dlg);
  await page.click('[data-act="subMode"][data-v="jp"]');
  await shot(4);
  await quitRun();
  await page.evaluate(() => { JP.store.state.settings.unlockAll = false; JP.store.save(); JP.app.render(); });
  // ① 홈
  await page.click('[data-act="tab"][data-v="home"]'); await page.evaluate(() => window.scrollTo(0, 0));
  await shot(1);
  // ⑥ 나(기록)
  await page.click('[data-act="tab"][data-v="me"]'); await page.evaluate(() => window.scrollTo(0, 0));
  await shot(6);
  // ⑦ 설정 — '설정' 제목이 위 막대 바로 아래 오게
  await page.evaluate(() => {
    const h = [...document.querySelectorAll('.sec-title h2')].find(x => x.textContent.trim() === '설정');
    const bar = document.querySelector('.topbar');
    if (h) window.scrollTo(0, h.getBoundingClientRect().top + window.scrollY - (bar ? bar.offsetHeight : 0) - 12);
  });
  await shot(7);

  await browser.close();
  console.log('store/ 에 아이콘·대표 이미지·화면 7장을 만들었습니다');
})();
