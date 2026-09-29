#!/usr/bin/env node
/* 단일 파일 빌드
 *  - dist/anime-nihongo.html : 모든 CSS·JS를 넣은 독립 실행 HTML (휴대폰에 파일로 보내 열어도 동작)
 *  - dist/artifact.html      : claude.ai 아티팩트 게시용 본문 (doctype/head 없이)
 * 사용법: node tools/build.js
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const scripts = [...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const css = fs.readFileSync(path.join(root, 'css/app.css'), 'utf8');
const fontLink = index.match(/<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com[^"]+)">/)[1];
const js = scripts.map(src => `/* ---- ${src} ---- */\n` + fs.readFileSync(path.join(root, src), 'utf8')).join('\n')
  .replace(/<\/script/gi, '<\\/script');
const iconSvg = fs.readFileSync(path.join(root, 'icons/icon.svg'), 'utf8');
const iconData = 'data:image/svg+xml;base64,' + Buffer.from(iconSvg).toString('base64');

const bodyInner =
  '<div id="app"><p style="padding:24px;font-family:sans-serif">불러오는 중…</p></div>\n<div id="overlay"></div>\n<div id="toast"></div>\n' +
  '<script>\nwindow.JP_NO_SW = true; // 단일 파일 빌드에서는 서비스 워커를 쓰지 않음\n' + '__AUDIO_BASE__' + js + '\n</script>\n';

const title = 'アニ耳 일본어';
// 독립 실행 파일은 녹음 음성을 배포 사이트에서 불러오고, 아티팩트는 함께 올린 audio/ 파일을 씀
const AUDIO_SITE = process.env.AUDIO_SITE || 'https://2nhyeok.kr/';
const bodyStandalone = bodyInner.replace('__AUDIO_BASE__', 'window.JP_AUDIO_BASE = ' + JSON.stringify(AUDIO_SITE) + ';\n');
const bodyArtifact = bodyInner.replace('__AUDIO_BASE__', '');
const standalone = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<meta name="theme-color" content="#1E50A2">
<link rel="icon" href="${iconData}">
<link rel="stylesheet" href="${fontLink}">
<style>
${css}
</style>
</head>
<body>
${bodyStandalone}</body>
</html>
`;
const artifact = `<title>${title}</title>
<link rel="stylesheet" href="${fontLink}">
<style>
${css}
</style>
${bodyArtifact}`;

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/anime-nihongo.html'), standalone);
const artOut = process.env.ARTIFACT_OUT || path.join(root, 'dist/artifact.html');
fs.writeFileSync(artOut, artifact);
console.log('dist/anime-nihongo.html', (standalone.length / 1024).toFixed(0) + 'KB');
console.log(path.relative(root, artOut), (artifact.length / 1024).toFixed(0) + 'KB');
