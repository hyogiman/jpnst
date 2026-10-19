#!/usr/bin/env node
/* 휴대폰 설치용 앱(Android) 웹 파일 만들기 → www/
 *  - 앱 파일·녹음 음성·아이콘을 그대로 복사 (인터넷 없이 동작)
 *  - 글꼴: Google Fonts 대신 @fontsource 글꼴을 앱에 넣음. 앱에 실제로 나오는 글자가 들어 있는
 *    조각(unicode-range) 파일만 골라 넣어 용량을 줄임
 *  - 서비스 워커 끔(앱 안에 파일이 이미 있음), Capacitor 연동 스크립트(app/native.js) 추가
 *  - 오픈소스 라이선스 고지(www/licenses.txt): 설정 → 오픈소스 라이선스에서 보여 줌
 *  - ANIMIMI_STORE=play 이면 구글 플레이 판: 광고 켜기(window.JP_STORE·JP_ADS), GitHub 업데이트 확인 끄기
 *    광고 단위 ID는 ANIMIMI_ADMOB_BANNER_ID (없으면 구글 시험용 배너)
 * 사용법: npm ci && node tools/build-app.js && npx cap sync android
 *        구글 플레이 판: ANIMIMI_STORE=play node tools/build-app.js && npx cap sync android
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const out = path.join(root, 'www');
const nm = path.join(root, 'node_modules');

function rmrf(p) { fs.rmSync(p, { recursive: true, force: true }); }
function copy(rel, dest) {
  const src = path.join(root, rel), dst = path.join(out, dest || rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.cpSync(src, dst, { recursive: true });
}
function walk(dir, filter, acc = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, filter, acc);
    else if (filter(p)) acc.push(p);
  }
  return acc;
}

rmrf(out);
fs.mkdirSync(out, { recursive: true });

// 1) 앱 파일
['css', 'js', 'audio', 'icons', 'manifest.webmanifest'].forEach(r => copy(r));
copy('app/native.js', 'js/native.js');
fs.mkdirSync(path.join(out, 'vendor'), { recursive: true });
fs.copyFileSync(path.join(nm, '@capacitor/core/dist/capacitor.js'), path.join(out, 'vendor/capacitor.js'));

// 2) 글꼴: 앱에 나오는 글자 모으기
const used = new Set();
for (let c = 0x20; c <= 0x7e; c++) used.add(c);
const textFiles = [path.join(root, 'index.html'), path.join(root, 'css/app.css'), path.join(root, 'app/native.js')]
  .concat(walk(path.join(root, 'js'), p => p.endsWith('.js')));
textFiles.forEach(f => { for (const ch of fs.readFileSync(f, 'utf8')) used.add(ch.codePointAt(0)); });

// index.html의 Google Fonts와 같은 글꼴·굵기
const FONTS = [
  ['black-han-sans', ['400']],
  ['dela-gothic-one', ['400']],
  ['ibm-plex-sans-kr', ['400', '500', '700']],
  ['klee-one', ['400', '600']]
];
function rangeHits(range) {
  return range.split(',').some(part => {
    const m = part.trim().replace(/^U\+/i, '').split('-');
    const a = parseInt(m[0], 16), b = m[1] ? parseInt(m[1], 16) : a;
    for (const cp of used) if (cp >= a && cp <= b) return true;
    return false;
  });
}
let css = '/* 자동 생성: tools/build-app.js — 앱에 들어간 글꼴 (SIL Open Font License) */\n';
let fontBytes = 0, kept = 0, total = 0;
fs.mkdirSync(path.join(out, 'fonts/files'), { recursive: true });
for (const [pkg, weights] of FONTS) {
  const dir = path.join(nm, '@fontsource', pkg);
  for (const w of weights) {
    const src = fs.readFileSync(path.join(dir, w + '.css'), 'utf8');
    for (const block of src.match(/@font-face\s*{[^}]*}/g) || []) {
      total++;
      const ur = (block.match(/unicode-range:\s*([^;]+);/) || [])[1];
      if (ur && !rangeHits(ur)) continue;
      const file = (block.match(/url\(\.\/files\/([^)]+\.woff2)\)/) || [])[1];
      if (!file) continue;
      fs.copyFileSync(path.join(dir, 'files', file), path.join(out, 'fonts/files', file));
      fontBytes += fs.statSync(path.join(dir, 'files', file)).size;
      kept++;
      css += block.replace(/src:[^;]+;/, `src: url(files/${file}) format('woff2');`) + '\n';
    }
  }
  copy(path.join('node_modules/@fontsource', pkg, 'LICENSE'), path.join('fonts', 'LICENSE-' + pkg + '.txt'));
}
fs.writeFileSync(path.join(out, 'fonts/fonts.css'), css);

// 3) index.html: 글꼴 연결을 앱 안 파일로, 서비스 워커 끄기, 앱 연동 스크립트 추가
const STORE = process.env.ANIMIMI_STORE || '';
const TEST_BANNER = 'ca-app-pub-3940256099942544/9214589741';   // 구글이 공개한 시험용 적응형 배너
const banner = process.env.ANIMIMI_ADMOB_BANNER_ID || TEST_BANNER;
const storeScript = STORE === 'play'
  ? `<script>window.JP_STORE = 'play'; window.JP_ADS = ${JSON.stringify({ banner, test: banner === TEST_BANNER })}; // 구글 플레이 판: 광고 켬</script>\n`
  : '';
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html
  .replace(/<link rel="preconnect"[^>]*>\n?/g, '')
  .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^"]*">/, '<link rel="stylesheet" href="fonts/fonts.css">')
  .replace('<script src="js/data/kana.js"></script>',
    '<script>window.JP_NO_SW = true; window.JP_APP = true; // 설치형 앱: 파일이 앱 안에 있음</script>\n' + storeScript +
    '<script src="vendor/capacitor.js"></script>\n<script src="js/data/kana.js"></script>')
  .replace('<script src="js/app.js"></script>', '<script src="js/app.js"></script>\n<script src="js/native.js"></script>');
if (!/fonts\/fonts\.css/.test(html) || !/js\/native\.js/.test(html)) { console.error('index.html 변환 실패'); process.exit(1); }
fs.writeFileSync(path.join(out, 'index.html'), html);

// 4) 오픈소스 라이선스 고지 — 앱에 들어가는 라이브러리(MIT)와 글꼴(SIL OFL 1.1)의 저작권·라이선스 원문
const ver = pkg => JSON.parse(fs.readFileSync(path.join(nm, pkg, 'package.json'), 'utf8')).version;
const LIBS = ['@capacitor/core', '@capacitor/android', '@capacitor/app', '@capacitor/filesystem', '@capacitor/share', '@capacitor-community/admob'];
let lic = 'アニ耳 — Open source licenses\n\n';
for (const p of LIBS) lic += `■ ${p} ${ver(p)}\n\n${fs.readFileSync(path.join(nm, p, 'LICENSE'), 'utf8').trim()}\n\n`;
for (const [p] of FONTS) lic += `■ @fontsource/${p} ${ver('@fontsource/' + p)} (font)\n\n${fs.readFileSync(path.join(nm, '@fontsource', p, 'LICENSE'), 'utf8').trim()}\n\n`;
lic += '■ Google Mobile Ads SDK, Google User Messaging Platform SDK\n\nCopyright Google LLC. Used under the Google APIs Terms of Service and the AdMob terms (not open source).\n';
fs.writeFileSync(path.join(out, 'licenses.txt'), lic);

const size = walk(out, () => true).reduce((s, p) => s + fs.statSync(p).size, 0);
console.log(`www/ ${(size / 1e6).toFixed(1)} MB — 글꼴 조각 ${kept}/${total}개 (${(fontBytes / 1e6).toFixed(1)} MB), 사용 글자 ${used.size}자` + (STORE ? ` · ${STORE} 판` + (STORE === 'play' ? ` (광고 ${banner === TEST_BANNER ? '시험용' : '실제'} 배너)` : '') : ''));
