/* 설치형 앱(Android, Capacitor) 연동 — tools/build-app.js가 앱 빌드에만 넣는 파일
 *  - 뒤로 가기 버튼: 창 닫기 → 레슨 그만하기 확인 → 홈 탭 → 앱 종료 순서
 *  - 학습 기록 백업: 파일을 만든 뒤 공유 창(드라이브·카카오톡·메일·내 파일 등)으로 보냄
 *  - 상태 표시줄 아이콘 색을 앱 테마(밝게/어둡게)에 맞춤
 *  - 앱이 뒤로 가면 재생 중인 음성 멈춤
 *  - 새 버전 알림: GitHub Releases의 최신 버전을 6시간에 한 번 확인해, 설치된 버전보다 새로우면 홈에 안내
 *    (구글 플레이 판은 스토어가 업데이트를 맡으므로 확인하지 않음)
 *  - 광고(구글 플레이 판만, tools/build-app.js가 window.JP_STORE='play'·JP_ADS를 넣음): 홈(코스)·나(기록) 화면
 *    아래쪽, 탭 막대 바로 위에 작은 배너 하나. 레슨·평가·창이 열리면 숨김. 동의가 필요한 지역이면 구글 동의 화면을 먼저 보여 줌
 * 웹(브라우저)에서는 아무 일도 하지 않음
 */
(function () {
  var cap = window.Capacitor;
  var core = window.capacitorExports;
  if (!cap || !core || !cap.isNativePlatform || !cap.isNativePlatform()) return;
  var JP = window.JP;
  var App = core.registerPlugin('App');
  var Filesystem = core.registerPlugin('Filesystem');
  var Share = core.registerPlugin('Share');
  var SystemBars = core.registerPlugin('SystemBars');
  document.documentElement.classList.add('native-app');

  App.addListener('backButton', function () {
    if (JP.app && JP.app.back && JP.app.back()) return;
    App.exitApp();
  });

  App.addListener('pause', function () {
    try { if (JP.speech && JP.speech.stop) JP.speech.stop(); else if (JP.clips) JP.clips.stop(); } catch (e) {}
  });

  JP.nativeSave = function (name, data) {
    return Filesystem.writeFile({ path: name, data: data, directory: 'CACHE', encoding: 'utf8' }).then(function (r) {
      return Share.share({ title: 'アニ耳 학습 기록 백업', dialogTitle: '백업 파일을 보낼 곳을 고르세요', files: [r.uri] });
    }).catch(function (e) {
      // 공유 창을 그냥 닫은 경우는 오류로 보지 않음
      if (e && /cancel/i.test(String(e.message || e))) return;
      throw e;
    });
  };

  var STORE = window.JP_STORE || '';

  // ---------- 새 버전 알림 ----------
  // 릴리스 태그 app-v1.0.N 의 N = APK의 versionCode (GitHub Actions 빌드 번호)
  var RELEASE_API = 'https://api.github.com/repos/hyogiman/jpnst/releases/latest';
  var UPDATE_KEY = 'animimi:update';
  var installed = null;
  function readCache() { try { return JSON.parse(localStorage.getItem(UPDATE_KEY)) || {}; } catch (e) { return {}; } }
  function writeCache(c) { try { localStorage.setItem(UPDATE_KEY, JSON.stringify(c)); } catch (e) {} }
  function apply(c) {
    var build = +installed.build || 0;
    JP.update = { current: installed.version, build: build, latest: c.version || '', latestBuild: c.build || 0, newer: (c.build || 0) > build, checked: !!c.at };
    return JP.update;
  }
  JP.checkUpdate = function (force) {
    var cache = readCache();
    // getInfo가 바로 예외를 던져도 거부된 Promise로 바꿔 조용히 처리
    var ready = installed ? Promise.resolve() : Promise.resolve().then(function () { return App.getInfo(); }).then(function (i) { installed = i; });
    return ready.then(function () {
      apply(cache);
      if (!force && cache.at && Date.now() - cache.at < 6 * 3600e3) return JP.update;
      return fetch(RELEASE_API, { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (rel) {
        var m = /(\d+)\.(\d+)\.(\d+)$/.exec(rel.tag_name || '');
        if (!m) throw new Error('unexpected tag ' + rel.tag_name);
        cache = { at: Date.now(), version: m[1] + '.' + m[2] + '.' + m[3], build: +m[3] };
        writeCache(cache);
        return apply(cache);
      }).catch(function () { return Object.assign({}, JP.update, { failed: true }); });
    }).catch(function () { return { failed: true }; });
  };
  function autoCheck() {
    var before = !!(JP.update && JP.update.newer);
    JP.checkUpdate(false).then(function (u) {
      // 새 버전을 처음 알게 됐을 때만 다시 그림 (레슨 중이면 레슨이 끝난 뒤 홈에서 보임)
      if (u && u.newer && !before && JP.app && JP.app.render && !(JP.app.state && JP.app.state())) JP.app.render();
    });
  }
  if (STORE === 'play') {
    // 구글 플레이 판: 업데이트는 Play 스토어가 맡음 → GitHub 확인 없이 설치된 버전만 표시
    JP.checkUpdate = null;
    Promise.resolve().then(function () { return App.getInfo(); }).then(function (i) {
      JP.update = { current: i.version, build: +i.build || 0, store: 'play' };
    }).catch(function () {});
  } else {
    setTimeout(autoCheck, 1500);
    App.addListener('resume', autoCheck);
  }

  // ---------- 광고 (구글 플레이 판만) ----------
  if (STORE === 'play' && window.JP_ADS) (function () {
    var AdMob = core.registerPlugin('AdMob');
    var conf = window.JP_ADS, ready = false, made = false, shown = false, busy = false, lastH = 0;
    JP.ads = { privacy: false };
    function want() {
      var sc = JP.app && JP.app.screen ? JP.app.screen() : '';
      return sc === 'home' || sc === 'me';
    }
    function setInset(h) {
      document.documentElement.style.setProperty('--ad-h', (h > 0 ? Math.ceil(h) : 0) + 'px');
      document.documentElement.classList.toggle('has-ad', h > 0);
    }
    function tabbarHeight() {
      var t = document.querySelector('.tabbar');
      return t ? Math.round(t.getBoundingClientRect().height) : 0;
    }
    function sync() {
      if (!ready || busy) return;
      var w = want(), job = null;
      if (w && !shown) {
        shown = true;
        if (made && lastH) setInset(lastH);         // 다시 보일 때는 크기 알림이 안 올 수 있어 마지막 높이로 여백을 먼저 맞춤
        job = made ? AdMob.resumeBanner()
          : AdMob.showBanner({ adId: conf.banner, adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: tabbarHeight(), isTesting: !!conf.test }).then(function () { made = true; });
      } else if (!w && shown) {
        shown = false; setInset(0);
        job = AdMob.hideBanner();
      }
      if (!job) return;
      busy = true;
      job.catch(function () {}).then(function () { busy = false; if (want() !== shown) sync(); });
    }
    AdMob.addListener('bannerAdSizeChanged', function (size) {
      var h = (size && size.height) || 0;
      if (h > 0) lastH = h;
      setInset(shown ? h : 0);
    });
    AdMob.addListener('bannerAdFailedToLoad', function () { setInset(0); });
    JP.ads.sync = sync;
    JP.ads.privacyForm = function () { return AdMob.showPrivacyOptionsForm(); };
    function start() {
      AdMob.requestConsentInfo().then(function (info) {
        if (info.isConsentFormAvailable && info.status === 'REQUIRED') return AdMob.showConsentForm();
        return info;
      }).then(function (info) {
        JP.ads.privacy = info.privacyOptionsRequirementStatus === 'REQUIRED';
        if (!info.canRequestAds) return;
        // 학습 앱이라 광고 내용 등급은 '청소년 이상(Teen)'까지만
        return AdMob.initialize({ maxAdContentRating: 'Teen' }).then(function () { ready = true; sync(); });
      }).catch(function () {});
    }
    // 화면이 바뀔 때마다(탭 이동·레슨 시작·창 열기) 배너를 보일지 다시 판단
    var obs = new MutationObserver(function () { sync(); });
    obs.observe(document.getElementById('app'), { childList: true });
    obs.observe(document.getElementById('overlay'), { childList: true });
    setTimeout(start, 1200);
  })();

  function syncBars() {
    var t = document.documentElement.getAttribute('data-theme');
    var dark = t === 'dark' || (t !== 'light' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    SystemBars.setStyle({ style: dark ? 'DARK' : 'LIGHT' }).catch(function () {});
  }
  syncBars();
  new MutationObserver(syncBars).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (window.matchMedia) {
    var mq = matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', syncBars);
  }
})();
