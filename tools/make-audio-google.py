#!/usr/bin/env python3
"""녹음 음성 생성기 (Google Cloud Text-to-Speech · Chirp 3: HD)

입력: node tools/audio-texts.js 가 만든 JSON
출력: audio/pack0-<해시>.mp3 ~ pack6-<해시>.mp3 (섞어 듣기), pack2-sulafat-<해시>.mp3 등 (목소리별), js/data/audio-index.js

키: 환경 변수 GOOGLE_TTS_KEY 또는 --key-file 경로 (키는 절대 저장소에 넣지 말 것)
    Claude 클라우드 환경에서는 네트워크 시크릿(허용 사이트 texttospeech.googleapis.com, 헤더 X-Goog-Api-Key)으로 두고 --proxy-key
사용법:
  node tools/audio-texts.js > /tmp/audio-texts.json
  GOOGLE_TTS_KEY=... python3 tools/make-audio-google.py /tmp/audio-texts.json --cache /tmp/gtts-cache --asr /tmp/asr-models
필요: pip install "numpy<2" lameenc pyopenjtalk-prebuilt   (make-audio.py의 음량·압축 처리를 함께 씀)
      --asr를 쓰면 sherpa-onnx·miniaudio와 음성 인식 모델 두 개도 (tools/asr_verify.py 첫머리 참고), --whisper는 Whisper small 모델도

만드는 방식
 - 목소리 4개를 섞어 씀(여러 화자의 소리에 익숙해지도록): 여성 Despina·Sulafat, 남성 Algenib·Fenrir
   · 글자(가나): Despina 한 목소리로 통일, 0.7배속으로 또렷하게
     (0.5배속보다 오히려 잘못 읽는 일이 조금 적었음: 어려운 글자 21개 × 목소리 4개 실험에서 받아 적기가 맞은 비율 59% → 63%)
   · 단어: 네 목소리를 고르게 나눔 / 소리 구별 짝은 두 단어를 같은 목소리로
   · 예문·애니 대사: 남자 말투(おれ·お前·ぞ 등)는 남성, 여자 말투(わよ·かしら 등)는 여성, 나머지는 고르게
   · 장면 대화: 등장인물의 성별에 맞춰 인물마다 목소리 하나를 고정
   · 목소리 고르기(설정)용: 장면 대화를 뺀 모든 항목을 네 목소리로 하나씩 더 만듦 (audio-texts.js의 voice=Despina 등)
 - 읽기: 앱의 후리가나 그대로 읽게 함. 한 글자 한자는 후리가나로 바꿔 넣고, 두 글자 이상 한자는 읽기를 지정
   (Chirp 3: HD의 일본어 요미가나 지정 — 12개 중 11개 반영을 소리 모양 비교로 확인)
   읽기 지정이 무시될 때를 대비해, 사전(Open JTalk)의 기본 읽기가 후리가나와 다른 말(九時→くじ, 辛い→からい 등)은
   한자 대신 가나로 넣음
 - 같은 입력도 만들 때마다 조금씩 달라 가끔 숨소리가 섞이므로, 여러 번 만들어 가장 맑은 것을 고름
   (글자 4번, 단어 3번, 문장 2번. 맑기 = 조화음 대 잡음비)
   고를 때는 성대 울림이 뚜렷한 비율(엄격한 울린 비율)을 크게 봄: 구글 음성은 가끔 모음까지 속삭이듯(무성음) 말하는데,
   맑기는 울린 칸만 보고 재서 이런 후보가 오히려 높게 나옴(특히 남성 목소리). 모두 속삭이면 몇 번 더 만듦.
   글자는 히라가나·마침표 붙인 표기로도 2번씩 더 만들어 후보를 늘림(は·へ는 조사 わ·え로 읽힐 수 있어 히라가나 제외)
   똑같은 요청에는 똑같은 소리가 돌아올 때가 많아, 두 번째부터는 음량 값(volumeGainDb)을 0.05dB씩 바꿔 보냄
 - 맑기만으로는 "맞게 읽었는지"를 알 수 없음: 구글 음성은 가끔 아예 다르게 읽음(예전 녹음을 받아 적어 보니 つ가 あ·え로,
   した가 じゃ·さあ·あっ으로, こうこう가 こう로 들리는 것들이 있었음. 같은 입력도 만들 때마다 다름).
   그래서 --asr를 주면 후보마다 앱에 넣을 최종 소리를 일본어 음성 인식
   두 가지로 받아 적어, 기대 읽기와 맞는 후보 중에서만 고름(맑기는 그다음). 맞는 후보가 없으면 몇 번 더 만들고,
   그래도 없으면 다른 입력(마침표 붙이기·가나로·가타카나로, 글자는 다른 속도)으로 만들어 봄
   --whisper를 더 주면 글자(가나) 녹음은 성격이 다른 세 번째 인식기(Whisper small)로도 받아 적어 봄: 지금 앱에 든 MP3가 맞으면 그대로 두고,
   아니면 두 인식기가 맞다고 한 후보 중 Whisper도 맞게 적은 것을 고름(두 인식기가 ぐ/く, む/ぬ, にゅ/に 같은 비슷한 소리를 함께 놓칠 때가 있음).
   --redo로 지정한 단어·소리 구별 짝도 같은 방식으로 다시 고름
 - 앞뒤는 말소리 바로 앞(0.08초, 글자는 0.12초)·뒤(0.18초)까지만 남김(말하기 전 숨소리·잡음 제거), 96kbps MP3
   첫소리가 약한 녹음은 숨소리 규칙에 첫 박이 잘릴 수 있어, 받아 적기가 틀리면 앞을 덜 자른 소리로 다시 검사함
 - 구글 음성은 후보의 약 7%를 말소리 한가운데서 시작하는(첫소리가 잘린) 소리로 보냄: 처음 5ms가 최대보다 40dB 낮은 소리보다 크면
   이렇게 보고(hot_head) 크게 감점하며, 맞게 읽은 후보 중에서도 첫소리가 온전한 것을 먼저 고름(모두 잘렸으면 더 만듦)
 - --asr로 고를 때는 마지막에 앱에 넣을 MP3로 압축한 소리 그대로 한 번 더 받아 적어 맞는 후보를 씀(압축 뒤에만 틀리는 아슬아슬한 녹음이 약 1%)
 - 요청 속도: Chirp 3: HD는 기본 한도가 프로젝트당 분당 200건이라 분당 150건으로 묶어 보냄(--rpm).
   한도에 걸리면(429) 잠시 쉬었다가 이어 가고, 만든 소리는 --cache 폴더에 남아 다시 실행해도 또 요청하지 않음
"""
import argparse, base64, hashlib, importlib.util, io, json, os, re, sys, threading, time, urllib.error, urllib.request, wave
from concurrent.futures import ThreadPoolExecutor
import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
_spec = importlib.util.spec_from_file_location('make_audio', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'make-audio.py'))
MA = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(MA)   # finish(), to_mp3(), silent_mp3() 재사용

VOICE = {'Despina': 'ja-JP-Chirp3-HD-Despina', 'Sulafat': 'ja-JP-Chirp3-HD-Sulafat',
         'Algenib': 'ja-JP-Chirp3-HD-Algenib', 'Fenrir': 'ja-JP-Chirp3-HD-Fenrir'}
FEMALE, MALE = ['Despina', 'Sulafat'], ['Algenib', 'Fenrir']
ALL4 = ['Despina', 'Algenib', 'Sulafat', 'Fenrir']
KANA_VOICE = 'Despina'
CREDIT = 'Google Cloud Text-to-Speech (Chirp 3: HD) — Despina·Sulafat(여성), Algenib·Fenrir(남성)'

# 장면 대화 등장인물의 성별 (이름이 같으면 같은 성별)
SPEAKER = {
    'ユイ': 'F', 'ケン': 'M', 'ハル': 'M', 'ミオ': 'F', 'アヤ': 'F', 'ソウ': 'M', 'リク': 'M', '母': 'F', 'サキ': 'F', 'タクミ': 'M',
    'ナナ': 'F', 'ユウ': 'M', 'ライバル': 'M', '主人公': 'M', '隊長': 'M', '隊員': 'M', 'カイ': 'M', 'レン': 'M', '魔王': 'M', '勇者': 'M',
    'ミナ': 'F', 'ショウ': 'M', 'ジン': 'M', 'トウマ': 'M', '女神': 'F', '魔導士': 'F', '剣士': 'M', '探偵': 'M', '容疑者': 'F',
    '門番': 'M', '侍': 'M', 'ヒナ': 'F', 'コウ': 'M', 'アレン': 'M', 'リナ': 'F', 'マコ': 'F', 'ハヤト': 'M', 'ミク': 'F', 'ソラ': 'M',
    'ユウキ': 'M', 'アオイ': 'F', 'ハク': 'M', 'ツバサ': 'M', 'チヒロ': 'F', 'ハルキ': 'M', 'リコ': 'F', 'ダイ': 'M',
}
# 말투(역할어)로 성별 정하기
MALE_STYLE = re.compile(r'(おれ|俺|オレ|ぼく|僕|ボク|てめえ|貴様|きさま|お前|おまえ|野郎|ちくしょう|すげえ|ねえぞ|わしが|のう…|それがし|ござる|我が|'
                        r'ぜ[！!。]?$|ぞ[！!。]?$|だろ[！!？?。]?$|しろ[！!。]?$|黙れ)')
FEMALE_STYLE = re.compile(r'(あたし|わよ|わね|のよ|かしら|ですわ|わ[！!。]$|てよ[！!。]?$|ちょうだい|なのよ|おにいちゃん|あんた|でしょ[！!？?]*$|せんぱい！)')
# 고정 문장(앱 안내 음성)의 읽기 지정
STATIC = {
    'こんにちは。アニメの日本語を、いっしょに勉強しましょう。': ('こんにちは。アニメの日本語を、いっしょに勉強しましょう。', [('日本語', 'にほんご'), ('勉強', 'べんきょう')]),
    'アニメを字幕なしで楽しめるように、毎日少しずつ頑張りましょう。': ('アニメを字幕なしでたのしめるように、毎日少しずつ頑張りましょう。', [('字幕', 'じまく'), ('毎日', 'まいにち'), ('頑張', 'がんば')]),
    'こんにちは': ('こんにちわ', []),
}
PARTICLE_WA = {'こんにちは', 'こんばんは', 'じつは', 'ほんとうは'}
KANA_FIX = {'ヲ': 'オ', 'ヂ': 'ジ', 'ヅ': 'ズ'}
Y = 'PHONETIC_ENCODING_JAPANESE_YOMIGANA'
KANJI = re.compile(r'[㐀-鿿豈-﫿々]')

def okurigana_split(w, r):
    """聞く/きく → ('聞', 'き'): 앞뒤의 같은 가나(오쿠리가나)를 떼고, 남은 부분이 한자뿐이면 (한자, 읽기)"""
    i = 0
    while i < min(len(w), len(r)) and w[i] == r[i] and not KANJI.match(w[i]): i += 1
    j = 0
    while j < min(len(w), len(r)) - i and w[-1 - j] == r[-1 - j] and not KANJI.match(w[-1 - j]): j += 1
    wc, rc = w[i:len(w) - j], r[i:len(r) - j]
    if wc and rc and all(KANJI.match(c) for c in wc): return (wc, rc)
    return None

def bucket(s, n):
    return int(hashlib.sha1(s.encode()).hexdigest()[:8], 16) % n

def hira(s):
    return ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in s)

def kata(s):
    return ''.join(chr(ord(c) + 0x60) if 'ぁ' <= c <= 'ゖ' else c for c in s)

_ojt = None
def dict_reading(s):
    """사전(Open JTalk)의 기본 읽기(히라가나). 앱의 후리가나와 다르면 합성기도 다르게 읽을 수 있는 말로 봄"""
    global _ojt
    if _ojt is None:
        import pyopenjtalk; _ojt = pyopenjtalk
    return hira(''.join(w['read'] for w in _ojt.run_frontend(s)))

def plan(items):
    """항목마다 (목소리, 입력 문장, 읽기 지정, 속도, 만들 횟수)를 정함"""
    dlg_voice = {}
    days = sorted({it['day'] for it in items if it['kind'] == 'dlg'})
    for di, day in enumerate(days):
        who = []
        for it in items:
            if it['kind'] == 'dlg' and it['day'] == day and it['who'] not in who: who.append(it['who'])
        used = []
        for wi, w in enumerate(who):
            g = SPEAKER.get(w) or ('F' if wi % 2 == 0 else 'M')
            pool = FEMALE if g == 'F' else MALE
            pool = pool[di % 2:] + pool[:di % 2]            # 대화마다 시작 목소리를 바꿔 고르게
            v = next((p for p in pool if p not in used), pool[0])
            used.append(v); dlg_voice[(day, w)] = v
    jobs, odd = [], []
    for it in items:
        k, synth = it['kind'], it['synth']
        fixed = it['voice'] if it['voice'] in VOICE else None   # 목소리 고르기용 항목은 그 목소리로 (읽기·속도·횟수는 기본과 같게)
        if k == 'kana':
            # 가나만 있는 말에는 읽기 지정이 안 됨(API가 거부) → 소리가 같은 글자로 바꿔 넣음(ヲ→オ 등)
            jobs.append((it, fixed or KANA_VOICE, KANA_FIX.get(synth, synth), [], 0.7, 4)); continue
        if k == 'static':
            text, ruby = STATIC[synth]; jobs.append((it, fixed or KANA_VOICE, text, ruby, None, 2)); continue
        if k in ('vocab', 'pair'):
            w = (it.get('w') or '').replace('〜', '').replace('~', '').strip()
            core = okurigana_split(w, synth) if (w and w != synth and KANJI.search(w) and len(w) > 1) else None
            if core and dict_reading(w) != hira(synth):
                core = None; odd.append(w)                   # 사전의 기본 읽기와 다른 말(辛い: からい/つらい 등)은 가나로 넣어 확실하게
            if core:
                text, ruby = w, [core]                       # 한자 단어: 한자 + 한자 부분의 읽기 지정
            else:
                text, ruby = synth, []                       # 가나 단어·한 글자 한자·섞인 단어: 가나로
                if synth in PARTICLE_WA: text = synth[:-1] + 'わ'   # こんにちは의 は는 '와'
            voice = fixed or ALL4[bucket(it['group'] or synth, 4)]
            jobs.append((it, voice, text, ruby, None, 3)); continue
        text, ruby = it['gtext'] or synth, [tuple(p) for p in it['ruby']]
        # 사전의 기본 읽기와 다르게 읽는 한자(九時→くじ, 一回→いっかい 등)는 읽기 지정 대신 가나로 바꿔 넣음
        swap = set()
        for surf, rd in it['toks'] or []:
            inside = [kj for kj, _ in ruby if kj in surf]
            if inside and dict_reading(surf) != hira(rd): swap.update(inside); odd.append(surf)
        if swap:
            for kj, r in sorted(ruby, key=lambda p: -len(p[0])):
                if kj in swap: text = text.replace(kj, r)
            ruby = [p for p in ruby if p[0] not in swap and p[0] in text]
        if fixed:
            voice = fixed
        elif k == 'dlg':
            voice = dlg_voice[(it['day'], it['who'])]
        else:
            plain = synth
            if MALE_STYLE.search(plain): voice = MALE[bucket(plain, 2)]
            elif FEMALE_STYLE.search(plain): voice = FEMALE[bucket(plain, 2)]
            else: voice = ALL4[bucket(plain, 4)]
        jobs.append((it, voice, text, ruby, None, 2))
    if odd: print('사전의 기본 읽기와 달라 가나로 넣은 말 %d개: %s' % (len(dict.fromkeys(odd)), ' '.join(dict.fromkeys(odd))), file=sys.stderr)
    return jobs

class Client:
    def __init__(self, key, cache, rpm=150):
        # key가 비어 있으면 키 없이 보냄: Claude 클라우드 환경의 네트워크 시크릿이 X-Goog-Api-Key 헤더로 붙여 줌
        self.url = 'https://texttospeech.googleapis.com/v1/text:synthesize' + ('?key=' + key if key else '')
        self.cache = cache; self.chars = 0; self.calls = 0; self.lock = threading.Lock()
        # 분당 요청 수 제한: 요청 사이 간격을 60/rpm 초 이상으로 벌림 (동시 작업이 여러 개여도 전체 합계 기준)
        self.gap = 60.0 / rpm if rpm else 0.0; self.next_t = 0.0; self.pace = threading.Lock()
    def wait_turn(self):
        if not self.gap: return
        with self.pace:
            now = time.monotonic(); t = max(now, self.next_t); self.next_t = t + self.gap
        if t > now: time.sleep(t - now)
    def synth(self, voice, text, ruby, rate, take):
        sig = json.dumps([voice, text, ruby, rate, take], ensure_ascii=False)
        path = os.path.join(self.cache, hashlib.sha1(sig.encode()).hexdigest() + '.wav') if self.cache else None
        if path and os.path.exists(path):
            wav = open(path, 'rb').read()
        else:
            inp = {'text': text}
            if ruby: inp['customPronunciations'] = {'pronunciations': [{'phrase': p, 'phoneticEncoding': Y, 'pronunciation': r} for p, r in ruby]}
            ac = {'audioEncoding': 'LINEAR16', 'sampleRateHertz': 24000}
            if rate: ac['speakingRate'] = rate
            # 똑같은 요청에는 똑같은 소리가 돌아올 때가 많아, 두 번째부터는 음량을 0.05dB씩 아주 조금 바꿔 새로 만들게 함
            # (들리지 않는 차이이고, 음량은 뒤에서 다시 맞춤)
            if take: ac['volumeGainDb'] = round(0.05 * take, 2)
            body = json.dumps({'input': inp, 'voice': {'languageCode': 'ja-JP', 'name': VOICE[voice]}, 'audioConfig': ac}).encode()
            for attempt in range(8):
                self.wait_turn()
                try:
                    req = urllib.request.Request(self.url, data=body, headers={'Content-Type': 'application/json'})
                    with urllib.request.urlopen(req, timeout=90) as r: wav = base64.b64decode(json.load(r)['audioContent'])
                    break
                except urllib.error.HTTPError as e:
                    msg = e.read().decode()[:300]
                    # 429 = 분당 한도 초과 → 한도가 다시 차도록 1분 가까이 쉬었다가 다시 시도
                    if e.code == 429 and attempt < 7: time.sleep(30 + 10 * attempt); continue
                    if e.code in (500, 502, 503, 504) and attempt < 5: time.sleep(2 ** attempt + 1); continue
                    raise RuntimeError(f'HTTP {e.code}: {msg}')
                except (urllib.error.URLError, TimeoutError):
                    if attempt < 5: time.sleep(2 ** attempt + 1); continue
                    raise
            with self.lock: self.chars += len(text); self.calls += 1
            if path: open(path, 'wb').write(wav)
        with wave.open(io.BytesIO(wav)) as w:
            return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768.0, w.getframerate()

def voicing(x, sr):
    """(맑기 dB, 유성 비율, 소리 길이 초) — 맑기는 유성 프레임의 조화음 대 잡음비 중앙값"""
    x = x / (np.abs(x).max() + 1e-9)
    n, hop, fr = int(sr * 0.03), int(sr * 0.01), int(sr * 0.01)
    lo, hi = int(sr / 500), int(sr / 70)
    m = len(x) // fr
    if m == 0: return float('nan'), 0.0, 0.0
    e = 10 * np.log10((x[:m * fr].reshape(m, fr) ** 2).mean(1) + 1e-12)
    act = e > e.max() - 30
    on = np.where(act)[0]
    dur = (on[-1] - on[0] + 1) * 0.01 if len(on) else 0.0
    w = np.hanning(n); wa = np.correlate(w, w, 'full')[n - 1:]
    tot = vo = 0; hs = []
    for i in range(0, len(x) - n, hop):
        k = i // fr
        if k >= m or not act[k]: continue
        f = x[i:i + n] * w
        ac = np.correlate(f, f, 'full')[n - 1:]
        r = (ac / (ac[0] + 1e-12)) / (wa / wa[0] + 1e-9)
        rmax = min(r[lo:hi].max(), 0.9999); tot += 1
        if rmax > 0.5: vo += 1; hs.append(10 * np.log10(rmax / (1 - rmax)))
    return (float(np.median(hs)) if hs else float('nan')), (vo / tot if tot else 0.0), dur

def voiced_frac(x, sr):
    """엄격한 울린 비율: 말소리 구간(최대보다 30dB 낮은 소리부터) 중 성대 울림이 뚜렷한 10ms 칸
    (주기성 0.7 넘음 + 최대보다 25dB 낮은 소리 이상)의 비율. 속삭이듯(무성음) 나온 소리는 0에 가까움.
    맑기(조화음 대 잡음비)는 울린 칸만 보고 재므로, 거의 속삭이고 잠깐만 울린 소리가 오히려 높게 나올 수 있어 함께 봄"""
    x = x / (np.abs(x).max() + 1e-9)
    fr, win = int(sr * 0.01), int(sr * 0.04); m = len(x) // fr
    if m == 0: return 0.0
    e = 10 * np.log10((x[:m * fr].reshape(m, fr) ** 2).mean(1) + 1e-12); e -= e.max()
    act = np.where(e > -30)[0]
    if not len(act): return 0.0
    lo, hi = int(sr / 500), int(sr / 70); vo = 0
    for k in range(act[0], act[-1] + 1):
        f = x[k * fr:k * fr + win]
        if len(f) < win or e[k] <= -25: continue
        f = f - f.mean(); ac = np.correlate(f, f, 'full')[win - 1:]
        if ac[0] > 0 and (ac / ac[0])[lo:hi].max() > 0.7: vo += 1
    return vo / (act[-1] - act[0] + 1)

def trim(x, sr, lead=0.08, tail=0.18, maxlead=0.15, head=True):   # maxlead=None·head=False: 앞을 덜 자름(숨소리·짧은 소리 규칙 없이)
    """앞뒤 줄이기: 말소리 바로 앞뒤까지만 남김
    구글 음성은 말하기 전후에 작은 숨소리·잡음(최대 음량보다 35~55dB 낮음)을 넣을 때가 있고, 천천히 읽는 글자에서는
    이것이 0.6~1.4초나 돼서, 예전처럼 50dB 기준으로 자르면 1초 가까이 쉬었다가 소리가 났음.
    그래서 최대보다 30dB 낮은 소리부터를 말소리로 보고 앞 0.08초·뒤 0.18초만 여유로 남김(잦아드는 끝소리 보존).
    말소리와 0.25초 넘게 떨어진 아주 짧은 소리(0.12초 미만)는 숨소리·딸깍 소리로 보고 뺌. 단 크게 난 소리(최대보다 15dB 낮은 소리 이상)는
    げっ·はっ 같은 짧은 감탄사일 수 있어 남김.
    또 숨소리가 30dB 기준을 살짝 넘나들며 말소리 앞에 이어 붙는 경우(최대 0.7초 늦게 시작)가 있어, 분명한 말소리(최대보다
    20dB 낮은 소리 이상)가 시작되기 maxlead초(0.15초, 글자는 0.3초)보다 앞은 숨소리로 봄(약한 첫소리 ㅅ·ㅎ 등은 대개 이 안에 들어옴)
    다만 첫 박이 약하게 나온 녹음(ほっとする의 ほっ, よふかし의 よ 등)은 이 규칙에 첫소리가 잘려서, --asr로 검사할 때는
    받아 적기가 틀리면 이 규칙 없이 자른 것으로 다시 검사함(final_clip)"""
    fr = int(sr * 0.01); m = len(x) // fr
    if m == 0: return x
    e = 10 * np.log10((x[:m * fr].reshape(m, fr) ** 2).mean(1) + 1e-12)
    act = e > e.max() - 30
    seg = []                                         # 말소리 덩어리 [시작, 끝) (0.15초 미만 틈은 이어 붙임)
    for k in np.where(act)[0]:
        if seg and k - seg[-1][1] < 15: seg[-1][1] = k + 1
        else: seg.append([k, k + 1])
    if not seg: return x
    quiet = lambda s: e[s[0]:s[1]].max() < e.max() - 15
    while head and len(seg) > 1 and seg[0][1] - seg[0][0] < 12 and seg[1][0] - seg[0][1] >= 25 and quiet(seg[0]): seg.pop(0)
    while len(seg) > 1 and seg[-1][1] - seg[-1][0] < 12 and seg[-1][0] - seg[-2][1] >= 25 and quiet(seg[-1]): seg.pop()
    start = seg[0][0]
    loud = np.where(e > e.max() - 20)[0]
    if len(loud) and maxlead is not None: start = max(start, loud[0] - int(round(maxlead / 0.01)))
    a = max(0, start * fr - int(lead * sr)); b = min(len(x), seg[-1][1] * fr + int(tail * sr))
    return x[a:b]

def morae(kana):
    k = re.sub(r'[^ぁ-ゖァ-ーー]', '', kana)
    return len(re.sub(r'[ゃゅょぁぃぅぇぉャュョァィゥェォ]', '', k))

def choose(kind, takes):
    """여러 번 만든 것 중 가장 맑은 것. 길이가 다른 것들과 크게 다르면(끊김·덧말) 감점. 글자는 모음의 울린 비율을 우선"""
    durs = [t['dur'] for t in takes]; med = float(np.median(durs))
    for t in takes:
        h = t['hnr'] if not np.isnan(t['hnr']) else -20
        if kind == 'kana':
            # 글자는 모음이 성대 울림으로 또렷이 나는지(엄격한 울린 비율)를 가장 크게 봄 — 속삭이듯 나온 'ハ…'는 맑기만으로는 못 거름
            # (맑기 40처럼 튀는 값이 나오는 거의 무성음 후보가 있어 맑기는 25에서 자름)
            pen = 0 if 0.15 <= t['dur'] <= 0.8 else 15     # 0.7배속 한 박의 소리 길이 (0.5배속일 때는 0.28~0.9초였음)
            t['score'] = 20 * t['vf'] + 0.3 * min(h, 25) - pen
            continue
        pen = 0 if 0.75 * med <= t['dur'] <= 1.35 * med else 10
        t['score'] = 20 * t['vf'] + min(h, 25) - pen   # 단어·문장도 울린 비율을 크게 봄 (남성 목소리에서 속삭이는 후보가 맑기로는 높게 나옴)
    for t in takes:
        if t.get('hot'): t['score'] -= 6                # 말하는 도중에 뚝 끊긴 후보는 감점 (끝소리가 잘렸을 수 있음)
        if t.get('hh'): t['score'] -= 12                # 말하는 도중에 시작한 후보는 크게 감점 (첫 자음이 잘렸을 수 있음)
    return max(takes, key=lambda t: t['score'])

def hot_head(x, sr):
    """소리가 말하는 도중에 시작하는가: 만든 소리의 처음 5ms가 최대보다 40dB 낮은 소리보다 큼. 구글 음성은 후보의 약 7%를 이렇게
    첫소리가 잘린 채로 보냄(정상인 후보는 대개 -60dB 아래의 무음으로 시작). 예: Despina의 つよい가 つ의 마찰음 한가운데서 시작해 す처럼 들릴 수 있음.
    맑기·울린 비율로만 고르면 첫 무성 자음이 잘린 후보가 덜 시끄러워 보여서 이런 후보도 그대로 뽑혔음(전체 녹음의 약 5%)"""
    k = int(sr * 0.005)
    return bool(10 * np.log10((x[:k] ** 2).mean() + 1e-12) > 10 * np.log10((x ** 2).max() + 1e-12) - 40)

def hot_tail(y, sr):
    """소리가 말하는 도중에 끝나는가: 마지막 0.06초에 최대보다 30dB 낮은 소리보다 큰 소리가 있음 (구글 음성이 가끔 뚝 끊어서 보냄)"""
    fr = int(sr * 0.01); m = len(y) // fr
    if m < 12: return False
    e = 10 * np.log10((y[:m * fr].reshape(m, fr) ** 2).mean(1) + 1e-12)
    return e[-6:].max() > e.max() - 30

def final_clip(t, is_kana, gentle=False):
    """앱에 넣을 최종 소리(앞뒤 자르기 + 음량 맞추기). gentle: 숨소리·짧은 소리 규칙 없이 앞을 덜 자름
    소리가 말하는 도중에 끝나면, 끝의 페이드(0.03초)가 마지막 소리(ます의 す 등)를 깎지 않도록 아주 짧게(0.01초) 줄이고 0.15초 무음을 붙임"""
    ml = None if gentle else (0.30 if is_kana else 0.15)   # 천천히 읽는 글자는 첫소리가 길어 여유를 조금 더
    y = trim(t['x'], t['sr'], lead=0.12 if is_kana else 0.08, maxlead=ml, head=not gentle)
    if hot_tail(y, t['sr']):
        y = y.copy(); k = int(t['sr'] * 0.01); y[-k:] *= np.linspace(1, 0, k)
        y = np.concatenate([y, np.zeros(int(t['sr'] * 0.15))])
    return MA.finish(y, t['sr'])

def asr_rank(r):
    """판정 결과의 순위: 맞음 > 확실히 맞음(조사 자리가 불확실하지 않음) > 두 인식기 모두 맞음 > 더 잘 맞힌 인식기의 박 거리 > 박 거리 합"""
    return (r['ok'], r.get('sure', r['ok']), r['both'], -r['d'], -min(r['d1'], 9) - min(r['d2'], 9))

def verify(ck, it, cands, is_kana):
    """후보마다 최종 소리를 음성 인식으로 받아 적어 판정 → t['asr'] = {ok, both, r1, r2, d, d1, d2}, t['y'] = 앱에 넣을 소리.
    앞을 덜 자른 소리가 더 잘 맞으면(약한 첫소리가 잘렸던 것) 그쪽을 씀"""
    clips, owner = [], []
    for t in cands:
        t['y'] = final_clip(t, is_kana); clips.append((t['y'], t['sr'])); owner.append((t, None))
        g = final_clip(t, is_kana, True)
        if len(g) - len(t['y']) > 0.03 * t['sr']: clips.append((g, t['sr'])); owner.append((t, g))
    for (t, g), r in zip(owner, ck.check(it, clips)):
        if g is None: t['asr'] = r
        elif asr_rank(r) > asr_rank(t['asr']): t['asr'], t['y'], t['gentle'] = r, g, True

def ranked(kind, takes):
    """받아 적기가 맞은 후보를 고르는 순서대로: 첫소리가 온전한 후보 먼저, 그다음 점수(두 인식기가 다 맞힌 후보를 조금 더 높게). 맞은 후보가 없으면 []"""
    ok = [t for t in takes if t.get('asr', {}).get('ok')]
    ok = [t for t in ok if t['asr'].get('sure', True)] or ok           # 확실히 맞은 후보가 있으면 그중에서
    if not ok: return []
    choose(kind, ok)
    return sorted(ok, key=lambda t: (not t.get('hh'), t['score'] + (4 if t['asr']['both'] else 0) + (3 if t['asr']['d'] == 0 else 0)), reverse=True)

def pick(kind, takes):
    """받아 적기가 맞은 후보 중 맨 앞. 다 틀리면 가장 덜 틀린 것 중 가장 맑은 것"""
    rk = ranked(kind, takes)
    if rk: return rk[0]
    choose(kind, takes)
    return max(takes, key=lambda t: (asr_rank(t['asr']) if 'asr' in t else (False, False, -99), t['score']))

def mp3_wave(b):
    """MP3 바이트 → 16kHz 파형: 앱에서 실제로 나는 소리(압축한 뒤)를 받아 적을 때 (pip install miniaudio)"""
    import miniaudio
    d = miniaudio.decode(bytes(b), output_format=miniaudio.SampleFormat.FLOAT32, nchannels=1, sample_rate=16000)
    return np.frombuffer(d.samples, dtype=np.float32).copy(), 16000

# 녹음마다 만든 조건(목소리·입력·읽기 지정·속도·횟수·자르기 방식)의 서명을 tools/audio-manifest.json에 남겨 두고,
# 다음에 만들 때 조건이 같으면 지금 묶음의 MP3를 그대로 다시 씀 → 캐시가 없는 새 작업 공간에서도 바뀐 항목만 요청
TRIM_VER = 'trim-30dB-v4'   # 크게 난 짧은 첫소리(げっ 등)는 남김
MANIFEST = os.path.join(ROOT, 'tools', 'audio-manifest.json')
PICK_VER = 'pick-v4'        # 엄격한 울린 비율을 함께 보고 고르기(속삭이는 후보 거르기) + 음성 인식 검사(--asr)
# (뚝 끊긴 소리의 끝 처리·조사 は 판정은 해당 녹음만 --redo로 다시 골라서 반영. 나머지 녹음은 결과가 같아 서명을 바꾸지 않음)
KANA_VER = 'kana-pick-v4'   # 글자: 0.7배속, 다른 표기 후보 더하기
def signature(task_key, asr, w=False):
    """w: 세 번째 인식기(--whisper)까지 보고 고름(또는 지금 녹음을 그것으로 확인함)"""
    voice, text, ruby_s, rate, n, is_kana = task_key
    ver = TRIM_VER + '+' + PICK_VER + ('+asr' if asr else '') + ('+w' if w else '') + ('+' + KANA_VER if is_kana else '')
    return hashlib.sha1(json.dumps([voice, text, ruby_s, rate, n, ver], ensure_ascii=False).encode()).hexdigest()[:12]
def load_previous():
    """(항목 해시 → 서명, 항목 해시 → 지금 MP3 바이트를 읽는 함수)"""
    try:
        sigs = json.load(open(MANIFEST, encoding='utf-8'))
        src = open(os.path.join(ROOT, 'js', 'data', 'audio-index.js'), encoding='utf-8').read()
        packs = json.loads(re.search(r'packs: (\[.*?\])', src).group(1)); mp = json.loads(re.search(r'map: (\{.*\})\n', src).group(1))
    except (OSError, ValueError, AttributeError):
        return {}, None
    bufs = {}
    def read(h):
        if h not in mp: return None
        p, off, ln = mp[h]
        if p not in bufs:
            try: bufs[p] = open(os.path.join(ROOT, packs[p]), 'rb').read()
            except OSError: return None
        return bytes(bufs[p][off:off + ln])
    return sigs, read

def asr_summary(tasks, results):
    """음성 인식 검사 결과 요약: 종류별 통과 수, 끝내 맞는 후보를 못 찾은 녹음(가장 덜 틀린 것을 씀) 목록"""
    from collections import Counter
    tot, ok, gentle, fails = Counter(), Counter(), 0, []
    for k, its in tasks:
        info = results[its[0]['hash']][2]; r = info.get('asr')
        if not r: continue
        kd = its[0]['kind']; tot[kd] += 1; gentle += info['gentle']
        if r['ok']: ok[kd] += 1
        else: fails.append('%s  [%s · 입력 %s]  인식: %s / %s' % (its[0]['key'], info['voice'], info['text'], r['r1'], r['r2']) + (' · Whisper: %s%s' % (r.get('wr'), ' (맞음)' if r.get('w') else '') if 'w' in r else ''))
    wt = [(its, results[its[0]['hash']][2]) for k, its in tasks if results[its[0]['hash']][2].get('w')]
    if wt:
        kept = sum(1 for its, i in wt if i.get('reused'))
        new = [(its, i) for its, i in wt if not i.get('reused')]
        miss = ['%s  [%s · 입력 %s]  Whisper: %s' % (its[0]['key'], i['voice'], i['text'], i['asr'].get('wr')) for its, i in new if not i['asr'].get('w')]
        print('세 번째 인식기(Whisper) 확인: 지금 녹음이 맞아 그대로 둔 것 %d개 · 다시 골라 Whisper도 맞게 적은 것 %d개 · 끝내 Whisper와는 안 맞은 것 %d개'
              % (kept, len(new) - len(miss), len(miss)), file=sys.stderr)
        if miss: print('  ' + '\n  '.join(miss), file=sys.stderr)
    if not tot: return
    infos = [results[its[0]['hash']][2] for k, its in tasks if results[its[0]['hash']][2].get('asr')]
    print('음성 인식 검사: ' + ', '.join('%s %d/%d' % (kd, ok[kd], tot[kd]) for kd in tot) + ' 통과 · 앞을 덜 자른 것 %d개' % gentle
          + ' · 압축한 소리(MP3)로도 맞은 것 %d/%d · 첫소리가 잘린 후보를 쓴 것 %d개' % (sum(1 for i in infos if i['asr'].get('m')), len(infos), sum(1 for i in infos if i['asr'].get('hh'))),
          file=sys.stderr)
    if fails: print('맞는 후보를 못 찾은 녹음 %d개 (가장 덜 틀린 것을 씀):\n  ' % len(fails) + '\n  '.join(fails), file=sys.stderr)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('texts'); ap.add_argument('--key-file'); ap.add_argument('--cache'); ap.add_argument('--workers', type=int, default=6)
    ap.add_argument('--report', help='항목별 결과(JSON) 저장 경로'); ap.add_argument('--limit', type=int, default=0, help='시험용: 앞에서 N개만')
    ap.add_argument('--dry', action='store_true', help='시험용: 앱 파일(audio/·audio-index.js)을 쓰지 않음')
    ap.add_argument('--rpm', type=int, default=150, help='분당 요청 수 상한 (Chirp 3: HD 기본 한도는 프로젝트당 분당 200건)')
    ap.add_argument('--redo', help='이 JSON 목록(항목 키)에 있는 녹음은 이전 결과를 다시 쓰지 않고 새로 고름')
    ap.add_argument('--proxy-key', action='store_true', help='키 없이 보냄 (Claude 클라우드 환경의 네트워크 시크릿이 X-Goog-Api-Key 헤더를 붙이는 경우)')
    ap.add_argument('--asr', help='음성 인식 모델 폴더: 후보마다 받아 적어 보고 맞게 읽은 것만 고름 (tools/asr_verify.py)')
    ap.add_argument('--whisper', help='세 번째 인식기(Whisper small) 폴더: 글자(가나) 녹음과 --redo로 준 단어·소리 구별 짝은 이것도 맞게 받아 적은 후보를 먼저 고름 (--asr와 함께)')
    a = ap.parse_args()
    ck = wk = None
    if a.asr:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from asr_verify import Checker
        ck = Checker(a.asr)
    if a.whisper:
        if not ck: sys.exit('--whisper는 --asr와 함께 써야 합니다')
        from asr_verify import Whisper
        wk = Whisper(a.whisper)
    key = os.environ.get('GOOGLE_TTS_KEY') or (open(a.key_file).read().strip() if a.key_file else '')
    if not key and not a.proxy_key: sys.exit('GOOGLE_TTS_KEY 환경 변수나 --key-file(또는 --proxy-key)이 필요합니다')
    if a.cache: os.makedirs(a.cache, exist_ok=True)
    items = json.load(open(a.texts, encoding='utf-8'))
    if a.limit: items = items[:a.limit]
    jobs = plan(items)
    cl = Client(key, a.cache, a.rpm)
    from collections import Counter
    print('목소리 배분:', dict(Counter(j[1] for j in jobs)), file=sys.stderr)

    # 같은 목소리·같은 입력은 한 번만 만들고 공유 (あ/ア 등)
    uniq = {}
    for it, voice, text, ruby, rate, n in jobs:
        uniq.setdefault((voice, text, json.dumps(ruby, ensure_ascii=False), rate, n, it['kind'] == 'kana'), []).append(it)
    tasks = list(uniq.items())
    results = {}
    done = [0]
    prev_sigs, prev_read = load_previous()
    redo = set(json.load(open(a.redo, encoding='utf-8'))) if a.redo else set()
    reused = [0]
    def work(task):
        (voice, text, ruby_s, rate, n, is_kana), its = task
        redo_it = any(it['key'] in redo for it in its)
        # 세 번째 인식기로도 확인: 글자 전부, --redo로 준 단어·소리 구별 짝, --redo로 준 문장 중 조사 は·へ가 있는 것
        # (두 인식기는 받아 적은 は를 발음 변환에서 늘 '와'로 읽어 버려, 구글 음성이 조사를 '하'로 읽어도 못 잡을 때가 있음.
        #  Whisper는 이럴 때 お前派·増波처럼 다른 한자로 적어 드러남)
        particle = any(sf in ('は', 'へ') for sf, kn in (its[0].get('toks') or []))
        w_on = wk is not None and (is_kana or (redo_it and (its[0]['kind'] in ('vocab', 'pair') or particle)))
        sig_w = signature(task[0], True, True)
        # 조건이 같은 녹음이 이미 있으면 그대로 씀 (요청·다시 압축 없음). 음성 인식 검사(--asr)로 고른 녹음은 검사 없이 만들 때도 다시 씀
        sigs = {sig_w, signature(task[0], True)} | (set() if ck else {signature(task[0], False)})
        hit = next((it for it in its if prev_sigs.get(it['hash']) in sigs), None) if prev_read and not redo_it else None
        if hit:
            mp3 = prev_read(hit['hash']); wr = None
            if mp3 and w_on and prev_sigs[hit['hash']] != sig_w:
                # 두 인식기로만 고른 글자 녹음: 앱에 든 MP3 그대로 다시 받아 적어, 두 인식기 중 하나와 Whisper가 다 맞으면 그대로 두고 아니면 다시 고름
                mw = mp3_wave(mp3); r = ck.check(its[0], [mw])[0]
                wr = wk.check(its[0], [mw])[0] if r['ok'] and r.get('sure', True) else {'ok': False}
                if not wr['ok']: mp3 = None
            if mp3:
                with cl.lock: reused[0] += 1; done[0] += 1
                return task, mp3, {'voice': voice, 'text': text, 'ruby': json.loads(ruby_s), 'hnr': None, 'dur': None, 'takes': [], 'fallback': False, 'reused': True,
                                   'w': prev_sigs[hit['hash']] == sig_w or wr is not None}
        ruby = json.loads(ruby_s)
        takes = []; fallback = None; made = set(); alts = []
        def add(tx, t, rb=None, rt=None):
            """후보 하나 만들기 (rb·rt: 이 후보만 읽기 지정·속도를 다르게)"""
            rb = ruby if rb is None else rb; rt = rate if rt is None else rt
            x, sr = cl.synth(voice, tx, rb, rt, t)
            made.add((tx, json.dumps(rb, ensure_ascii=False), rt, t))
            h, vr, dur = voicing(x, sr)
            y = trim(x, sr)
            takes.append({'x': x, 'sr': sr, 'hnr': h, 'vr': vr, 'dur': dur, 'take': t, 'text': tx, 'ruby': rb, 'rate': rt, 'vf': voiced_frac(y, sr), 'hot': hot_tail(y, sr),
                          'hh': hot_head(x, sr)})
        def more(tx, k, rb=None, rt=None):
            """같은 입력으로 아직 안 만든 번호의 후보를 k개 더 (번호가 같으면 캐시를 다시 씀)"""
            rbs, r, t = json.dumps(ruby if rb is None else rb, ensure_ascii=False), (rate if rt is None else rt), 0
            while k > 0:
                if (tx, rbs, r, t) not in made: add(tx, t, rb, rt); k -= 1
                t += 1
        for t in range(n):
            try:
                add(text, t)
            except RuntimeError as e:
                if 'custom pronunciation' not in str(e) or not ruby: raise
                it0 = its[0]; fallback = it0['kana'] or it0['synth']   # 거부되면 후리가나 그대로(가나 문장)
                text, ruby = fallback, []
                add(text, t)
        kind = 'kana' if is_kana else 'x'
        best = choose(kind, takes)
        # 모두 흐리거나 속삭이듯 나왔으면 몇 번 더 만들어 봄 (짧은 말은 맑기 12·울린 비율 0.3(글자 0.5), 문장은 맑기 10·울린 비율 0.25 미만일 때)
        short = is_kana or len(text) <= 6
        low_v = best['vf'] < (0.5 if is_kana else 0.3 if short else 0.25)
        low_h = np.isnan(best['hnr']) or best['hnr'] < (12 if short else 10)
        if low_v or low_h:
            more(text, 3 if short else 2); best = choose(kind, takes)
        if not is_kana and best['vf'] < 0.15:
            # 그래도 거의 속삭이면(울린 비율 0.15 미만): 단어는 마침표를 붙인 입력으로 2번, 문장은 3번 더 만들어 봄
            if short and not re.search(r'[。！？!?…]$', text): more(text + '。', 2)
            else: more(text, 3)
            prev, best = best, choose('x', takes)
            if best['vf'] < prev['vf']: best = prev        # 더 덜 울리는 후보로는 바꾸지 않음
        if is_kana:
            # 글자는 다른 표기로도 만들어 후보를 늘림: 히라가나(は·へ는 조사 わ·え로 읽힐 수 있어 빼고), 마침표를 붙인 가타카나.
            # 같은 가타카나만 넣으면 비슷한(때로 똑같은) 소리가 반복되고, 가끔 모음까지 속삭이듯(무성음) 나오기 때문
            alts = ([hira(text)] if hira(text) != text and hira(text) not in ('は', 'へ') else []) + [text + '。']
            for tx in alts: more(tx, 2)
            best = choose('kana', takes)
            if best['vf'] < 0.45:
                # 그래도 모음이 약하면(울린 비율 0.45 미만) 가타카나로 4번, 다른 표기로 2번씩 더 만들어 봄 (더 덜 울리는 쪽으로는 안 바꿈)
                more(text, 4)
                for tx in alts: more(tx, 2)
                prev, best = best, choose('kana', takes)
                if best['vf'] < prev['vf']: best = prev
        asr = None
        if ck:
            # 음성 인식 검사: 앱에 넣을 최종 소리를 받아 적어 기대 읽기와 맞는지 봄 (tools/asr_verify.py)
            #  - 가장 맑은 후보부터 보고, 두 인식기가 다 맞히면 그것으로 끝. 아니면 나머지 후보도 모두 검사(글자는 처음부터 모두)
            #  - 맞는 후보가 하나도 없으면 후보를 더 만들어 봄: 같은 입력 몇 번 더 → 다른 입력(마침표·가나·가타카나, 글자는 다른 속도)
            it0 = its[0]
            choose(kind, takes)
            top = takes if is_kana else [max(takes, key=lambda t: t['score'])]
            verify(ck, it0, top, is_kana)
            if is_kana or top[0].get('hh') or not (top[0]['asr']['ok'] and top[0]['asr']['both'] and top[0]['asr'].get('sure', True)):
                verify(ck, it0, [t for t in takes if 'asr' not in t], is_kana)
            surf_step = None
            if is_kana:
                rounds = [lambda: (more(text, 4), [more(tx, 2) for tx in alts]),
                          lambda: [more(tx, 2, rt=r) for tx in [text] + alts[:1] for r in (0.85, 0.5)]]
            elif it0['kind'] in ('vocab', 'pair'):
                dot = [] if re.search(r'[。！？!?…]$', text) else [text + '。']
                rounds = [lambda: (more(text, 3), [more(tx, 2) for tx in dot]),
                          lambda: more(it0['synth'] if ruby else kata(text) if kata(text) != text else hira(text), 3, rb=[])]   # 한자 단어는 가나로, 가나 단어는 가타카나(가타카나 단어는 히라가나)로
            else:
                # 한 글자 한자를 가나로 바꿔 넣은 문장은 조사 は를 ハ로 읽는 일이 있어(かれはやさしい → "카레하"), 한자 그대로 넣은 입력도 만들어 봄
                kana_in, surf_in = it0['kana'] or it0['synth'], it0['synth']
                surf_step = (lambda: more(surf_in, 4, rb=[])) if surf_in != text else None
                rounds = [lambda: more(text, 3)] + ([surf_step] if surf_step else []) + \
                         ([lambda: more(kana_in, 2, rb=[])] if kana_in not in (text, surf_in) else [])
            ran = 0
            for step in rounds:
                # 확실히 맞고 첫소리가 온전한(hot_head 아님) 후보가 생길 때까지
                if any(t.get('asr', {}).get('ok') and t['asr'].get('sure', True) and not t.get('hh') for t in takes): break
                step(); ran += 1
                verify(ck, it0, [t for t in takes if 'asr' not in t], is_kana)
            best = pick(kind, takes)
            # 앱에 넣을 압축한 소리(MP3) 그대로 한 번 더 받아 적어 봄: 압축 전 소리로는 맞았는데 압축하면 틀리는 아슬아슬한 후보가 있음
            # (고른 녹음 1만여 개를 MP3로 다시 검사하니 약 1%가 이랬음 — 대개 약한 첫 박이 빠짐: はやくしろ → やくしろう)
            #  - 고르는 순서대로 보며, MP3로도 두 인식기 중 하나가 맞힌 첫 후보를 씀
            #  - 세 번째 인식기(--whisper)를 쓰는 녹음(글자 전부·--redo로 준 단어와 소리 구별 짝)은 그중 Whisper도 맞게 적은 첫 후보를 먼저 찾음.
            #    두 인식기가 다 틀린 녹음은 덜 틀린 순서로 6개까지 보며 Whisper가 맞게 적은 후보를 찾음.
            #    글자는 그래도 없으면 같은 속도로 후보를 더 만들어 봄(첫 추가 단계를 아직 안 했을 때 한 번만)
            #  - 끝내 없으면 압축 전 소리 기준으로 고른 것을 그대로 씀
            def order():
                rk = ranked(kind, takes)
                if rk: return rk
                choose(kind, takes)
                return sorted([t for t in takes if 'asr' in t], key=lambda t: (asr_rank(t['asr']), t['score']), reverse=True)[:6]
            def final_try():
                """→ (MP3로 두 인식기 중 하나와 Whisper가 다 맞힌 첫 후보, MP3로 두 인식기 중 하나가 맞힌 첫 후보, Whisper만 맞힌 첫 후보)"""
                b = c = None
                for t in order():
                    if 'm' not in t:
                        mw = mp3_wave(MA.to_mp3(t['y'], t['sr'], kbps=96))
                        r = ck.check(it0, [mw])[0]; t['m'] = dict(r, ok=r['ok'] and r.get('sure', True))
                        if w_on and (t['m']['ok'] or not t['asr']['ok']): t['w'] = wk.check(it0, [mw])[0]
                    m_ok, w_ok = t['m']['ok'], t.get('w', {}).get('ok', False)
                    if m_ok and (w_ok or not w_on): return (t if w_on else None), t, c
                    if m_ok and not b: b = t
                    if w_ok and not c: c = t
                return None, b, c
            if w_on: verify(ck, it0, [t for t in takes if 'asr' not in t], is_kana)
            fa, fb, fc = final_try()
            if not (fa or fb) and any('asr' not in t for t in takes):
                verify(ck, it0, [t for t in takes if 'asr' not in t], is_kana); fa, fb, fc = final_try()
            if w_on and not fa and is_kana and ran == 0:
                rounds[0](); verify(ck, it0, [t for t in takes if 'asr' not in t], is_kana); fa, fb, fc = final_try()
            if not (fa or fb) and not is_kana:
                # MP3로는 맞는 후보가 없으면(압축 전에만 아슬아슬하게 맞음) 아직 안 해 본 추가 단계로 후보를 더 만들어 봄
                for step in rounds[ran:]:
                    step(); ran += 1; verify(ck, it0, [t for t in takes if 'asr' not in t], is_kana); fa, fb, fc = final_try()
                    if fa or fb: break
            if w_on and not fa and particle:
                # 조사가 있는 문장: 아직 안 해 본 다른 입력(한자 그대로 등)으로도 만들어 봄 — 한자 그대로 넣으면 조사를 바르게 읽는 일이 많음
                left = rounds[ran:]
                for step in ([surf_step] if surf_step in left else []) + [r for r in left if r is not surf_step]:
                    step(); verify(ck, it0, [t for t in takes if 'asr' not in t], is_kana); fa, fb, fc = final_try()
                    if fa: break
            best = fa or fb or fc or best
            asr = dict(best['asr'])
            asr['n_ok'] = sum(1 for t in takes if t.get('asr', {}).get('ok'))
            asr['m'], asr['mr'], asr['hh'] = best.get('m', {}).get('ok', False), [best.get('m', {}).get('r1'), best.get('m', {}).get('r2')], bool(best.get('hh'))
            if w_on: asr['w'], asr['wr'] = best.get('w', {}).get('ok', False), best.get('w', {}).get('r')
        y = best['y'] if 'y' in best else final_clip(best, is_kana)
        mp3 = MA.to_mp3(y, best['sr'], kbps=96)
        with cl.lock:
            done[0] += 1
            if done[0] % 100 == 0: print(f'{done[0]}/{len(tasks)}  (보낸 글자 {cl.chars}, API 호출 {cl.calls}번)', file=sys.stderr, flush=True)
        return task, mp3, {'voice': voice, 'text': best['text'], 'vf': round(best['vf'], 2), 'ruby': best['ruby'], 'rate': best['rate'],
                           'hnr': round(best['hnr'], 1) if not np.isnan(best['hnr']) else None, 'dur': round(best['dur'], 2),
                           'takes': [round(t['hnr'], 1) if not np.isnan(t['hnr']) else None for t in takes], 'fallback': bool(fallback),
                           'asr': asr, 'gentle': bool(best.get('gentle')), 'w': w_on}
    with ThreadPoolExecutor(max_workers=a.workers) as ex:
        for task, mp3, info in ex.map(work, tasks):
            for it in task[1]: results[it['hash']] = (it, mp3, info)

    # 묶음 파일 쓰기 (make-audio.py와 같은 형식)
    #  - 기본(섞어 듣기) 묶음: pack0(가나·고정 문장), pack1~6(챕터별)
    #  - 목소리 묶음: pack2-sulafat 등 (설정에서 목소리를 고른 경우용). 기본 묶음에 이미 있는 소리는 그 자리를 같이 씀
    packs, index, report = {}, {}, []
    placed = {}                                       # id(mp3) → (묶음 이름표, 위치, 길이)
    for it in sorted(items, key=lambda it: it['voice'] in VOICE):   # 기본 항목 먼저
        _, mp3, info = results[it['hash']]
        if id(mp3) not in placed:
            label = str(it['pack']) + ('-' + it['voice'].lower() if it['voice'] in VOICE else '')
            buf = packs.setdefault(label, bytearray())
            placed[id(mp3)] = (label, len(buf), len(mp3)); buf.extend(mp3)
        index[it['hash']] = placed[id(mp3)]
        rate = None
        reading = it['kana'] or it['synth']
        if info.get('dur'): rate = round(morae(reading) / info['dur'], 1)
        report.append(dict(info, key=it['key'], kind=it['kind'], morae_per_sec=rate))
    if a.dry:
        if a.report: json.dump(report, open(a.report, 'w'), ensure_ascii=False, indent=0)
        print('시험 실행: 앱 파일은 쓰지 않음 · API 호출 %d번, 보낸 글자 %d자' % (cl.calls, cl.chars), file=sys.stderr)
        asr_summary(tasks, results)
        return
    os.makedirs(os.path.join(ROOT, 'audio'), exist_ok=True)
    labels = sorted(packs, key=lambda l: ('-' in l, int(l.split('-')[0]), l))   # 기본 묶음 0~6이 먼저 (서비스 워커가 pack0을 미리 받음)
    order = {l: i for i, l in enumerate(labels)}
    index = {h: [order[e[0]], e[1], e[2]] for h, e in index.items()}
    total, names = 0, {}
    for l in labels:
        buf = packs[l]
        names[l] = 'audio/pack%s-%s.mp3' % (l, hashlib.sha1(buf).hexdigest()[:8])
        with open(os.path.join(ROOT, names[l]), 'wb') as f: f.write(buf)
        total += len(buf); print('%s %.1f MB' % (names[l], len(buf) / 1e6), file=sys.stderr)
    for f in os.listdir(os.path.join(ROOT, 'audio')):
        if re.fullmatch(r'pack\d+(-[a-z]+)?(-[0-9a-f]+)?\.mp3', f) and 'audio/' + f not in names.values():
            os.remove(os.path.join(ROOT, 'audio', f))
    js = ('/* 자동 생성: tools/make-audio-google.py — 직접 수정하지 마세요\n'
          ' * 음성: %s\n */\n'
          '(function (g) {\n  var JP = (g.JP = g.JP || {});\n'
          '  JP.audioIndex = {\n    packs: %s,\n    silent: "data:audio/mpeg;base64,%s",\n    map: %s\n  };\n'
          '})(typeof window !== "undefined" ? window : globalThis);\n') % (
        CREDIT, json.dumps([names[l] for l in labels]), base64.b64encode(MA.silent_mp3()).decode(),
        json.dumps(index, separators=(',', ':')))
    with open(os.path.join(ROOT, 'js', 'data', 'audio-index.js'), 'w', encoding='utf-8') as f: f.write(js)
    sigs = {}
    for k, its in tasks:
        info = results[its[0]['hash']][2]
        if info.get('fallback'): continue
        s = signature(k, True, True) if info.get('w') else prev_sigs.get(its[0]['hash']) if info.get('reused') else signature(k, info.get('asr') is not None)
        for it in its: sigs[it['hash']] = s
    with open(MANIFEST, 'w', encoding='utf-8') as f: json.dump(dict(sorted(sigs.items())), f, separators=(',', ':'))
    if a.report: json.dump(report, open(a.report, 'w'), ensure_ascii=False, indent=0)
    print('총 %d개 클립 (만든 소리 %d개 중 그대로 다시 쓴 것 %d개, API 호출 %d번, 보낸 글자 %d자), %.1f MB' % (len(items), len(tasks), reused[0], cl.calls, cl.chars, total / 1e6), file=sys.stderr)
    asr_summary(tasks, results)

if __name__ == '__main__':
    main()
