# アニ耳 (아니미미) — 애니 청해 일본어 180일

일본어를 **전혀 모르는 한국어 화자**가 6개월 동안 하루 한 화(20~30분)씩 공부해, **일본 애니메이션의 대사를 알아듣는 청해 기초**를 만드는 모바일 학습 웹앱입니다.

- 히라가나·가타카나부터 시작 (글자마다 한국어 기억법 · 기원 한자 · 음성 · 쓰기 연습)
- 모든 글자·단어·예문·대사에 **일본어 음성** (속도 조절, 애니 속도 1.25배 듣기)
- **매 화 마지막에 평가** (10문항, 70점 통과 · 90점 하나마루) — 통과해야 다음 화가 열림
- 주간 **보스전**, 챕터 **승급 시험**(F급 → S급), 스탬프 카드, 연속 학습, 레벨, 배지, 성장 그래프
- 틀린 것은 **간격 반복(SRS)** 으로 알맞은 날에 다시 출제
- 매 화 **인문학 한 스푼** — 언어·문화·철학·심리학으로 생각을 넓히는 짧은 읽을거리

| 콘텐츠 | 수량 |
|---|---:|
| 코스 | 180화 (학습 144 · 보스전 24 · 청해 특훈 6 · 승급 시험 6) |
| 가나 | 221자 |
| 단어·표현 | 1,154개 |
| 문법·표현 항목 | 196개 (예문 496개) |
| 애니 대사 | 139개 |
| 장면 대화 | 24편 |
| 인문학 노트 | 144편 |

- 전체 일정표: [docs/CURRICULUM.md](docs/CURRICULUM.md)
- 설계 근거(참고 앱 분석, 학습과학, 게이미피케이션, 한계): [docs/DESIGN.md](docs/DESIGN.md)

## 휴대폰에서 실행하기

### 방법 1. GitHub Pages + 도메인 `2nhyeok.kr` (현재 설정)
앱은 `main` 브랜치 루트에 있고, `CNAME` 파일에 `2nhyeok.kr`이 지정되어 있습니다.
1. 저장소 **Settings → Pages** 에서 Source를 `Deploy from a branch`, 브랜치 `main`, 폴더 `/ (root)`로 저장합니다.
2. 같은 화면의 **Custom domain**에 `2nhyeok.kr`이 들어가 있는지 확인합니다.
3. 도메인 업체(DNS 관리)에서 아래 레코드를 추가합니다.

   | 호스트 | 유형 | 값 |
   |---|---|---|
   | `@` | A | `185.199.108.153` |
   | `@` | A | `185.199.109.153` |
   | `@` | A | `185.199.110.153` |
   | `@` | A | `185.199.111.153` |
   | `www` | CNAME | `hyogiman.github.io` |

   (IPv6를 쓰려면 AAAA 레코드 `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`)
4. DNS가 반영되면(보통 몇 분~최대 48시간) Pages 화면에서 **Enforce HTTPS**를 켭니다.
5. 휴대폰에서 `https://2nhyeok.kr`을 열고 **홈 화면에 추가**하면 앱처럼 전체 화면으로 실행되고, 한 번 연 뒤에는 오프라인에서도 동작합니다.
   - iPhone(Safari): 공유 버튼 → 홈 화면에 추가
   - Android(Chrome): 메뉴 → 홈 화면에 추가 / 앱 설치

> 저장소가 비공개(private)라면 요금제에 따라 Pages 사용이 제한될 수 있습니다. 설정 방법은 GitHub 문서 "Managing a custom domain for your GitHub Pages site"를 참고하세요.

### 방법 2. 단일 파일로 열기
`dist/anime-nihongo.html` 하나에 앱 전체가 들어 있습니다. 이 파일을 휴대폰으로 옮겨 브라우저에서 열면 됩니다. 글꼴과 녹음 음성은 인터넷(https://2nhyeok.kr)에서 불러오며, 연결이 없으면 기본 글꼴과 기기 음성을 씁니다.

### 방법 3. 컴퓨터에서 개발용으로 실행
```bash
npx http-server -p 8080 .
# http://localhost:8080 접속
```

## 음성
- 기본은 **녹음 음성**입니다. 모든 가나·단어·예문·대사(2,086개 클립, 약 __MB__MB)를 신경망 음성 합성 소프트웨어 **VOICEVOX**로 미리 만들어 `audio/`에 넣어 두었기 때문에, 휴대폰에 일본어 음성이 없어도, 카카오톡 같은 앱 안 브라우저에서도 같은 소리가 납니다. 챕터별 묶음 파일로 나뉘어 있어 처음 여는 챕터만 받으며, 한 번 받으면 오프라인에서도 재생됩니다.
- 음성: **VOICEVOX:冥鳴ひまり**(여성, 기본) · **VOICEVOX:玄野武宏**(남성, 장면 대화의 두 번째 화자). 두 캐릭터 모두 크레딧 표기를 조건으로 상업·비상업 이용이 가능하며, 앱 안(나 → 설정, 설계 설명)에 크레딧을 표시합니다. 자세한 조건은 [VOICEVOX 이용 규약](https://voicevox.hiroshiba.jp/term/)과 각 캐릭터 규약([冥鳴ひまり](https://www.meimeihimari.com/terms-of-use), [玄野武宏](https://voicevox.hiroshiba.jp/product/kurono_takehiro/))을 확인하세요.
- 학습용으로 이렇게 만들었습니다.
  - **글자 하나(あ 등)**: 모음을 약 0.4초로 늘리고 끝을 자연스럽게 줄여 "아—"처럼 또렷하게 들리도록 (합성기 기본값은 0.1~0.3초라 짧게 끊겨 들림)
  - **단어**: 한자 표기로 합성해 사전의 억양을 따름. 한자로 읽기가 틀리면(예: 静か → しずかか) 가나로 바꿔 합성
  - **읽기 자동 검사**: 합성기가 실제로 읽을 발음을 후리가나와 한 글자씩 비교 (조사 は·へ·を는 わ·え·お). 이 검사로 이전 음성의 오독 6건(はち→"와치", つかう→"쓰카아" 등)을 찾아 고쳤습니다.
  - 앞뒤 무음을 잘라 내지 않아 소리 끝이 끊기지 않고, 여성·남성 음성의 크기를 맞춤
- **나 → 설정 → 음성 방식**에서 "기기 음성"으로 바꾸면 휴대폰 내장 음성(iPhone의 Kyoko 등)을 씁니다. 이때 소리가 안 나면:
  - **Android**: 기종마다 메뉴 위치가 다르므로 설정 앱 검색창에 **"텍스트 음성 변환"** 을 검색 → 기본 엔진(Google 음성 서비스) → 음성 데이터 설치 → 일본어. Google 음성 서비스가 없으면 Play 스토어에서 "Google 음성 인식 및 합성"을 설치합니다.
  - **iPhone**: 설정 → 손쉬운 사용 → 읽기 및 말하기 → 음성 → 일본어.
- 콘텐츠를 고친 뒤 음성을 다시 만들려면 (Linux x86_64, 음성 모델이 든 VOICEVOX core 약 1GB를 받습니다):
  ```bash
  pip install pyopenjtalk-prebuilt "numpy<2" lameenc "pydantic>=1.9.2,<2"
  pip install https://github.com/VOICEVOX/voicevox_core/releases/download/0.15.0/voicevox_core-0.15.0+cpu-cp38-abi3-linux_x86_64.whl
  curl -LO https://github.com/microsoft/onnxruntime/releases/download/v1.13.1/onnxruntime-linux-x64-1.13.1.tgz && tar xzf onnxruntime-linux-x64-1.13.1.tgz
  node tools/audio-texts.js > /tmp/audio-texts.json
  python3 tools/make-audio.py /tmp/audio-texts.json --ort onnxruntime-linux-x64-1.13.1/lib/libonnxruntime.so.1.13.1 --cache /tmp/vv-cache
  ```
  `--check-only`로 읽기 검사만 할 수 있고, 합성기가 후리가나와 다르게 읽는 문장은 파일 안의 `OVERRIDES`에 고친 읽기를 적습니다. 묶음 파일 이름에 내용 해시가 붙어(`pack0-1a2b3c4d.mp3`) 다시 만들면 휴대폰도 새 음성을 받습니다.

## 학습 기록
- 기록은 브라우저(localStorage)에 저장됩니다. 브라우저 데이터를 지우면 사라질 수 있으니 **나 → 학습 기록 백업**으로 가끔 내보내 두세요.
- claude.ai 아티팩트로 열면 로그인한 사용자별 비공개 저장소에도 자동 동기화됩니다.
- **체험 모드**(설정)를 켜면 모든 화의 잠금이 풀려 교육 담당자가 전체 콘텐츠를 검토할 수 있습니다. 체험 모드로 건너뛴 승급 시험은 랭크에 반영되지 않습니다.

## 폴더 구조
```
index.html              앱 진입점
manifest.webmanifest    PWA 설정
sw.js                   오프라인 캐시(서비스 워커)
css/app.css             디자인 (라이트/다크 테마)
js/data/kana.js         가나 221자 · 기억법 · 기원 한자
js/data/ch1.js ~ ch6.js 챕터별 콘텐츠 (단어·문법·예문·대사·대화·인문학)
js/data/audio-index.js  녹음 음성 색인 (자동 생성)
audio/pack0~6-*.mp3     녹음 음성 묶음 (자동 생성, 이름에 내용 해시)
js/course.js            180일 코스 구성, 예문 마크업 파서, 로마자 변환
js/core.js              저장소 · 음성 · 효과음 · SRS
js/quiz.js              문제 생성기 (연습·평가·보스·청해 특훈·승급 시험)
js/app.js               화면 · 레슨 진행 · 게임 요소 · 통계
tools/validate.js       콘텐츠·문제 생성 검증
tools/smoke.js          브라우저 UI 스모크 테스트 (Playwright)
tools/build.js          단일 파일 빌드 (dist/)
tools/curriculum.js     docs/CURRICULUM.md 생성
tools/make-icons.js     아이콘 PNG 생성
tools/audio-texts.js    음성이 필요한 문장 목록 추출
tools/make-audio.py     녹음 음성 합성 (VOICEVOX) · 읽기 검사
```

## 콘텐츠 수정하기
`js/data/ch*.js`의 각 화는 다음 형식입니다.
```js
{
  t: '제목', sub: '부제', tip: '오늘의 팁',
  kana: 'あ い う',                                  // 새 글자 (1장)
  v: [['がくせい', '学生', '학생', '學生 = 학생']],   // [읽기, 한자, 뜻, 메모]
  g: [{ t: 'AはBです', m: 'A는 B입니다', d: '설명(HTML)',
        x: [['わたし [は] 学生{がくせい} です 。', '저는 학생입니다.']] }],
  line: ['行{い}く ぞ ！', '간다!', '해설'],          // 오늘의 애니 대사
  dlg: { lines: [['화자', '대사', '번역']], q: ['질문', '정답', ['오답', '오답', '오답']] },
  note: ['인문학 제목', '본문']
}
```
예문 마크업: 공백 = 단어 구분 · `漢字{かんじ}` = 후리가나 · `[정답|오답|오답]` = 빈칸 문제 · `+토큰` = 앞 단어에 붙여 배열.

수정 후에는 검증을 실행하세요.
```bash
node tools/validate.js          # 콘텐츠 오류 검사
node tools/curriculum.js > docs/CURRICULUM.md
node tools/build.js             # dist/ 단일 파일 다시 만들기
```
