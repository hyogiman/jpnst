// PWA 아이콘 PNG 생성 (icons/icon.svg → 180/192/512, 마스커블 512)
// 사용법: node tools/make-icons.js  (playwright 필요)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const svg = fs.readFileSync(path.join(__dirname, '../icons/icon.svg'), 'utf8');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const jobs = [['icon-180.png', 180, false], ['icon-192.png', 192, false], ['icon-512.png', 512, false], ['icon-maskable-512.png', 512, true]];
  for (const [name, size, maskable] of jobs) {
    const inner = maskable ? svg.replace('rx="15"', 'rx="0"') : svg;
    const pad = maskable ? Math.round(size * 0.1) : 0;
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:${maskable ? '#1E50A2' : 'transparent'}"><div style="width:${size}px;height:${size}px;padding:${pad}px;box-sizing:border-box">${inner.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body></html>`);
    await page.screenshot({ path: path.join(__dirname, '../icons', name), omitBackground: !maskable });
    console.log('wrote', name);
  }
  await browser.close();
})();
