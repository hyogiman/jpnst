/* 오프라인 지원
 * - 앱 파일(HTML·JS·CSS): 네트워크 우선 → 새 버전이 바로 반영되고, 오프라인이면 캐시 사용
 * - 녹음 음성 묶음·글꼴: 캐시 우선 (한 번 받으면 오프라인에서도 재생)
 * - 부분 요청(Range)은 가로채지 않음
 */
var CACHE = 'animimi-v2';
var ASSETS = [
  './', 'index.html', 'css/app.css', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png',
  'js/data/kana.js', 'js/data/audio-index.js', 'js/course.js', 'js/core.js',
  'js/data/ch1.js', 'js/data/ch2.js', 'js/data/ch3.js', 'js/data/ch4.js', 'js/data/ch5.js', 'js/data/ch6.js',
  'js/quiz.js', 'js/app.js', 'audio/pack0.mp3'
];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
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
  var cacheFirst = isFont || /\/audio\/pack\d+\.mp3$/.test(url.pathname);
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
