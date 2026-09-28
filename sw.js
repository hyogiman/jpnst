/* 오프라인 지원: 앱 파일은 캐시 우선, 글꼴은 가져온 뒤 캐시 */
var CACHE = 'animimi-v1';
var ASSETS = [
  './', 'index.html', 'css/app.css', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png',
  'js/data/kana.js', 'js/course.js', 'js/core.js',
  'js/data/ch1.js', 'js/data/ch2.js', 'js/data/ch3.js', 'js/data/ch4.js', 'js/data/ch5.js', 'js/data/ch6.js',
  'js/quiz.js', 'js/app.js'
];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !isFont) return;
  e.respondWith(caches.match(req).then(function (hit) {
    var net = fetch(req).then(function (res) {
      if (res && (res.ok || res.type === 'opaque')) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () { return hit; });
    return hit || net;
  }));
});
