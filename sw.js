/* 오프라인 지원
 * - 앱 파일(HTML·JS·CSS): 네트워크 우선 → 새 버전이 바로 반영되고, 오프라인이면 캐시 사용
 * - 녹음 음성 묶음·글꼴: 캐시 우선 (한 번 받으면 오프라인에서도 재생)
 * - 부분 요청(Range)은 가로채지 않음
 * - 앱 화면(/, index.html)과 앱 파일(css·js·icons·audio·manifest)만 맡음. 설치 안내(/apk/)·문서 등 다른 페이지는
 *   손대지 않아, 연결이 안 될 때 앱 첫 화면이 엉뚱한 주소에 뜨지(빈 화면) 않고 브라우저의 원래 안내가 보임
 * - 연결이 안 될 때: 저장해 둔 파일을 쓰고, 앱 첫 화면은 앱을 여는 경우(/, index.html)에만 대신 보여 줌
 * - 음성 묶음 파일 이름에는 내용 해시가 들어 있어(pack0-xxxxxxxx.mp3), 음성을 다시 만들면 새 파일을 받고 옛 파일은 지움
 */
var CACHE = 'animimi-v3';
var PACKS = [];
try { importScripts('js/data/audio-index.js'); PACKS = self.JP.audioIndex.packs; } catch (err) { /* 색인이 없으면 음성 없이 동작 */ }
var ASSETS = [
  './', 'index.html', 'css/app.css', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png',
  'js/data/kana.js', 'js/data/audio-index.js', 'js/course.js', 'js/core.js',
  'js/data/ch1.js', 'js/data/ch2.js', 'js/data/ch3.js', 'js/data/ch4.js', 'js/data/ch5.js', 'js/data/ch6.js',
  'js/quiz.js', 'js/app.js'
].concat(PACKS.slice(0, 1));
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});
var PACK_RE = /\/audio\/pack[\w-]*\.mp3$/;
var SCOPE = new URL('./', self.location.href).pathname;            // 예: '/'
var APP_RE = /^(index\.html|manifest\.webmanifest|(css|js|icons|audio)\/.+)?$/;
function isAppPath(pathname) { return pathname.indexOf(SCOPE) === 0 && APP_RE.test(pathname.slice(SCOPE.length)); }
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () {
    // 지금 색인에 없는 옛 음성 묶음 정리
    return caches.open(CACHE).then(function (c) {
      return c.keys().then(function (reqs) {
        return Promise.all(reqs.filter(function (r) {
          var p = new URL(r.url).pathname;
          return PACK_RE.test(p) && !PACKS.some(function (name) { return p.slice(-name.length) === name; });
        }).map(function (r) { return c.delete(r); }));
      });
    });
  }).then(function () { return self.clients.claim(); }));
});
function put(req, res) {
  if (res && res.status === 200) { var copy = res.clone(); caches.open(CACHE).then(function (c) { return c.put(req, copy); }).catch(function () {}); }
  return res;
}
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  var url = new URL(req.url);
  var isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !isFont) return;
  if (!isFont && !isAppPath(url.pathname)) return;               // 앱 밖의 페이지는 브라우저가 직접 처리
  var cacheFirst = isFont || PACK_RE.test(url.pathname);
  if (cacheFirst) {
    e.respondWith(caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) { if (isFont && res.type === 'opaque') { var c = res.clone(); caches.open(CACHE).then(function (ca) { ca.put(req, c); }); return res; } return put(req, res); });
    }));
    return;
  }
  e.respondWith(fetch(req).then(function (res) { return put(req, res); }).catch(function () {
    return caches.match(req).then(function (hit) {
      if (hit) return hit;
      // 앱 첫 화면 대신 보여 주기는 앱을 여는 경우에만 (스크립트·스타일 요청에 HTML을 주면 화면이 멈춤)
      return req.mode === 'navigate' ? caches.match('index.html') : Response.error();
    });
  }));
});
