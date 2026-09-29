/* 오프라인 지원
 * - 앱 파일(HTML·JS·CSS): 네트워크 우선 → 새 버전이 바로 반영되고, 오프라인이면 캐시 사용
 * - 녹음 음성 묶음·글꼴: 캐시 우선 (한 번 받으면 오프라인에서도 재생)
 * - 부분 요청(Range)은 가로채지 않음
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
  var cacheFirst = isFont || PACK_RE.test(url.pathname);
  if (cacheFirst) {
    e.respondWith(caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) { if (isFont && res.type === 'opaque') { var c = res.clone(); caches.open(CACHE).then(function (ca) { ca.put(req, c); }); return res; } return put(req, res); });
    }));
    return;
  }
  e.respondWith(fetch(req).then(function (res) { return put(req, res); }).catch(function () {
    return caches.match(req).then(function (hit) { return hit || caches.match('index.html'); });
  }));
});
