// Android 앱 아이콘 생성 (icons/icon.svg → android/app/src/main/res/mipmap-*)
//  - ic_launcher.png        : 둥근 사각 아이콘 (Android 7 이하)
//  - ic_launcher_round.png  : 원형 아이콘
//  - ic_launcher_foreground : 적응형 아이콘 전경 (배경색은 values/ic_launcher_background.xml), 테마 아이콘(monochrome)에도 사용
// 사용법: node tools/make-android-icons.js  (playwright 필요)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const res = path.join(root, 'android/app/src/main/res');
const svg = fs.readFileSync(path.join(root, 'icons/icon.svg'), 'utf8');
const BG = (svg.match(/<rect[^>]*fill="(#[0-9A-Fa-f]{6})"/) || [])[1] || '#1E50A2';
const glyph = svg.replace(/<rect[^>]*\/>/, ''); // 배경 사각형을 뺀 글자 부분
const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  async function shot(file, size, html) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:transparent">${html}</body></html>`);
    await page.screenshot({ path: file, omitBackground: true });
  }
  const full = s => svg.replace('<svg ', `<svg width="${s}" height="${s}" `);
  for (const [d, k] of Object.entries(DENS)) {
    const dir = path.join(res, 'mipmap-' + d);
    const legacy = Math.round(48 * k), fg = Math.round(108 * k);
    await shot(path.join(dir, 'ic_launcher.png'), legacy, full(legacy));
    // 원형: 파란 원 + 글자(원 안에 들어가도록 약간 축소)
    await shot(path.join(dir, 'ic_launcher_round.png'), legacy,
      `<div style="width:${legacy}px;height:${legacy}px;border-radius:50%;background:${BG};display:grid;place-items:center">${glyph.replace('<svg ', `<svg width="${Math.round(legacy * 0.86)}" height="${Math.round(legacy * 0.86)}" `)}</div>`);
    // 적응형 전경: 108dp 캔버스의 가운데 66dp 안전 영역 안에 글자
    const inner = Math.round(fg * 66 / 108);
    await shot(path.join(dir, 'ic_launcher_foreground.png'), fg,
      `<div style="width:${fg}px;height:${fg}px;display:grid;place-items:center">${glyph.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div>`);
  }
  fs.writeFileSync(path.join(res, 'values/ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG}</color>\n</resources>\n`);
  const adaptive = `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n    <monochrome android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n`;
  for (const f of ['ic_launcher.xml', 'ic_launcher_round.xml']) fs.writeFileSync(path.join(res, 'mipmap-anydpi-v26', f), adaptive);
  await browser.close();
  console.log('Android 아이콘 생성 완료 (배경색 ' + BG + ')');
})();
