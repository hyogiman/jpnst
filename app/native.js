/* 설치형 앱(Android, Capacitor) 연동 — tools/build-app.js가 앱 빌드에만 넣는 파일
 *  - 뒤로 가기 버튼: 창 닫기 → 레슨 그만하기 확인 → 홈 탭 → 앱 종료 순서
 *  - 학습 기록 백업: 파일을 만든 뒤 공유 창(드라이브·카카오톡·메일·내 파일 등)으로 보냄
 *  - 상태 표시줄 아이콘 색을 앱 테마(밝게/어둡게)에 맞춤
 *  - 앱이 뒤로 가면 재생 중인 음성 멈춤
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
