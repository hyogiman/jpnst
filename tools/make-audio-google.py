#!/usr/bin/env python3
"""녹음 음성 생성기 (Google Cloud Text-to-Speech · Chirp 3: HD)

입력: node tools/audio-texts.js 가 만든 JSON
출력: audio/pack0-<해시>.mp3 ~ pack6-<해시>.mp3, js/data/audio-index.js  (형식은 make-audio.py와 같음)

키: 환경 변수 GOOGLE_TTS_KEY 또는 --key-file 경로 (키는 절대 저장소에 넣지 말 것)
사용법:
  node tools/audio-texts.js > /tmp/audio-texts.json
  GOOGLE_TTS_KEY=... python3 tools/make-audio-google.py /tmp/audio-texts.json --cache /tmp/gtts-cache
필요: pip install "numpy<2" lameenc pyopenjtalk-prebuilt   (make-audio.py의 음량·압축 처리를 함께 씀)

만드는 방식
 - 목소리 4개를 섞어 씀(여러 화자의 소리에 익숙해지도록): 여성 Despina·Sulafat, 남성 Algenib·Fenrir
   · 글자(가나): Despina 한 목소리로 통일, 0.5배속으로 또렷하게
   · 단어: 네 목소리를 고르게 나눔 / 소리 구별 짝은 두 단어를 같은 목소리로
   · 예문·애니 대사: 남자 말투(おれ·お前·ぞ 등)는 남성, 여자 말투(わよ·かしら 등)는 여성, 나머지는 고르게
   · 장면 대화: 등장인물의 성별에 맞춰 인물마다 목소리 하나를 고정
 - 읽기: 앱의 후리가나 그대로 읽게 함. 한 글자 한자는 후리가나로 바꿔 넣고, 두 글자 이상 한자는 읽기를 지정
   (Chirp 3: HD의 일본어 요미가나 지정 — 12개 중 11개 반영을 소리 모양 비교로 확인)
   읽기 지정이 무시될 때를 대비해, 사전(Open JTalk)의 기본 읽기가 후리가나와 다른 말(九時→くじ, 辛い→からい 등)은
   한자 대신 가나로 넣음
 - 같은 입력도 만들 때마다 조금씩 달라 가끔 숨소리가 섞이므로, 여러 번 만들어 가장 맑은 것을 고름
   (글자 4번, 단어 3번, 문장 2번. 맑기 = 조화음 대 잡음비)
 - 앞뒤 무음은 여유를 남기고 줄임(소리 끝을 자르지 않음), 96kbps MP3
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
        if k == 'kana':
            # 가나만 있는 말에는 읽기 지정이 안 됨(API가 거부) → 소리가 같은 글자로 바꿔 넣음(ヲ→オ 등)
            jobs.append((it, KANA_VOICE, KANA_FIX.get(synth, synth), [], 0.5, 4)); continue
        if k == 'static':
            text, ruby = STATIC[synth]; jobs.append((it, KANA_VOICE, text, ruby, None, 2)); continue
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
            voice = ALL4[bucket(it['group'] or synth, 4)]
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
        if k == 'dlg':
            voice = dlg_voice[(it['day'], it['who'])]
        else:
            plain = synth
            if MALE_STYLE.search(plain): voice = MALE[bucket(plain, 2)]
            elif FEMALE_STYLE.search(plain): voice = FEMALE[bucket(plain, 2)]
            else: voice = ALL4[bucket(plain, 4)]
        jobs.append((it, voice, text, ruby, None, 2))
    if odd: print('사전의 기본 읽기와 달라 가나로 넣은 말 %d개: %s' % (len(odd), ' '.join(dict.fromkeys(odd))), file=sys.stderr)
    return jobs

class Client:
    def __init__(self, key, cache, rpm=150):
        self.url = 'https://texttospeech.googleapis.com/v1/text:synthesize?key=' + key
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

def trim(x, sr, lead=0.10, tail=0.28, thr_db=-50):
    """앞뒤 무음 줄이기: 최대 음량보다 50dB 낮은 소리까지는 남기고(소리 끝을 자르지 않음) 여유를 둠"""
    fr = int(sr * 0.005); m = len(x) // fr
    if m == 0: return x
    e = 10 * np.log10((x[:m * fr].reshape(m, fr) ** 2).mean(1) + 1e-12)
    on = np.where(e > e.max() + thr_db)[0]
    if not len(on): return x
    a = max(0, on[0] * fr - int(lead * sr)); b = min(len(x), (on[-1] + 1) * fr + int(tail * sr))
    return x[a:b]

def morae(kana):
    k = re.sub(r'[^ぁ-ゖァ-ーー]', '', kana)
    return len(re.sub(r'[ゃゅょぁぃぅぇぉャュョァィゥェォ]', '', k))

def choose(kind, takes):
    """여러 번 만든 것 중 가장 맑은 것. 길이가 다른 것들과 크게 다르면(끊김·덧말) 감점"""
    durs = [t['dur'] for t in takes]; med = float(np.median(durs))
    for t in takes:
        h = t['hnr'] if not np.isnan(t['hnr']) else -20
        if kind == 'kana':
            pen = 0 if 0.28 <= t['dur'] <= 0.9 else 15
        else:
            pen = 0 if 0.75 * med <= t['dur'] <= 1.35 * med else 10
        t['score'] = h - pen
    return max(takes, key=lambda t: t['score'])

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('texts'); ap.add_argument('--key-file'); ap.add_argument('--cache'); ap.add_argument('--workers', type=int, default=6)
    ap.add_argument('--report', help='항목별 결과(JSON) 저장 경로'); ap.add_argument('--limit', type=int, default=0, help='시험용: 앞에서 N개만')
    ap.add_argument('--dry', action='store_true', help='시험용: 앱 파일(audio/·audio-index.js)을 쓰지 않음')
    ap.add_argument('--rpm', type=int, default=150, help='분당 요청 수 상한 (Chirp 3: HD 기본 한도는 프로젝트당 분당 200건)')
    a = ap.parse_args()
    key = os.environ.get('GOOGLE_TTS_KEY') or (open(a.key_file).read().strip() if a.key_file else '')
    if not key: sys.exit('GOOGLE_TTS_KEY 환경 변수나 --key-file이 필요합니다')
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
    def work(task):
        (voice, text, ruby_s, rate, n, is_kana), its = task
        ruby = json.loads(ruby_s)
        takes = []; fallback = None
        for t in range(n):
            try:
                x, sr = cl.synth(voice, text, ruby, rate, t)
            except RuntimeError as e:
                if 'custom pronunciation' not in str(e) or not ruby: raise
                it0 = its[0]; fallback = it0['kana'] or it0['synth']   # 거부되면 후리가나 그대로(가나 문장)
                text, ruby = fallback, []
                x, sr = cl.synth(voice, text, ruby, rate, t)
            h, vr, dur = voicing(x, sr)
            takes.append({'x': x, 'sr': sr, 'hnr': h, 'vr': vr, 'dur': dur, 'take': t})
        best = choose('kana' if is_kana else 'x', takes)
        # 모두 흐리게 나왔으면 몇 번 더 만들어 봄 (짧은 말은 맑기 12, 문장은 10 미만일 때)
        short = is_kana or len(text) <= 6
        extra = 3 if short and (np.isnan(best['hnr']) or best['hnr'] < 12) else 2 if not short and (np.isnan(best['hnr']) or best['hnr'] < 10) else 0
        for t in range(n, n + extra):
            x, sr = cl.synth(voice, text, ruby, rate, t)
            h, vr, dur = voicing(x, sr)
            takes.append({'x': x, 'sr': sr, 'hnr': h, 'vr': vr, 'dur': dur, 'take': t})
        if extra: best = choose('kana' if is_kana else 'x', takes)
        y = MA.finish(trim(best['x'], best['sr']), best['sr'])
        mp3 = MA.to_mp3(y, best['sr'], kbps=96)
        with cl.lock:
            done[0] += 1
            if done[0] % 100 == 0: print(f'{done[0]}/{len(tasks)}  (보낸 글자 {cl.chars})', file=sys.stderr, flush=True)
        return task, mp3, {'voice': voice, 'text': text, 'ruby': ruby, 'hnr': round(best['hnr'], 1) if not np.isnan(best['hnr']) else None,
                           'dur': round(best['dur'], 2), 'takes': [round(t['hnr'], 1) if not np.isnan(t['hnr']) else None for t in takes], 'fallback': bool(fallback)}
    with ThreadPoolExecutor(max_workers=a.workers) as ex:
        for task, mp3, info in ex.map(work, tasks):
            for it in task[1]: results[it['hash']] = (it, mp3, info)

    # 묶음 파일 쓰기 (make-audio.py와 같은 형식)
    packs, index, report = {}, {}, []
    placed = {}
    for it in items:
        _, mp3, info = results[it['hash']]
        buf = packs.setdefault(it['pack'], bytearray())
        k = (it['pack'], id(mp3))
        if k not in placed:
            placed[k] = [it['pack'], len(buf), len(mp3)]; buf.extend(mp3)
        index[it['hash']] = placed[k]
        rate = None
        reading = it['kana'] or it['synth']
        if info['dur']: rate = round(morae(reading) / info['dur'], 1)
        report.append(dict(info, key=it['key'], kind=it['kind'], morae_per_sec=rate))
    if a.dry:
        if a.report: json.dump(report, open(a.report, 'w'), ensure_ascii=False, indent=0)
        print('시험 실행: 앱 파일은 쓰지 않음 · API 호출 %d번, 보낸 글자 %d자' % (cl.calls, cl.chars), file=sys.stderr)
        return
    os.makedirs(os.path.join(ROOT, 'audio'), exist_ok=True)
    total, names = 0, {}
    for p, buf in sorted(packs.items()):
        names[p] = 'audio/pack%d-%s.mp3' % (p, hashlib.sha1(buf).hexdigest()[:8])
        with open(os.path.join(ROOT, names[p]), 'wb') as f: f.write(buf)
        total += len(buf); print('%s %.1f MB' % (names[p], len(buf) / 1e6), file=sys.stderr)
    for f in os.listdir(os.path.join(ROOT, 'audio')):
        if re.fullmatch(r'pack\d+(-[0-9a-f]+)?\.mp3', f) and 'audio/' + f not in names.values():
            os.remove(os.path.join(ROOT, 'audio', f))
    js = ('/* 자동 생성: tools/make-audio-google.py — 직접 수정하지 마세요\n'
          ' * 음성: %s\n */\n'
          '(function (g) {\n  var JP = (g.JP = g.JP || {});\n'
          '  JP.audioIndex = {\n    packs: %s,\n    silent: "data:audio/mpeg;base64,%s",\n    map: %s\n  };\n'
          '})(typeof window !== "undefined" ? window : globalThis);\n') % (
        CREDIT, json.dumps([names[p] for p in range(max(packs) + 1)]), base64.b64encode(MA.silent_mp3()).decode(),
        json.dumps(index, separators=(',', ':')))
    with open(os.path.join(ROOT, 'js', 'data', 'audio-index.js'), 'w', encoding='utf-8') as f: f.write(js)
    if a.report: json.dump(report, open(a.report, 'w'), ensure_ascii=False, indent=0)
    print('총 %d개 클립 (만든 소리 %d개, API 호출 %d번, 보낸 글자 %d자), %.1f MB' % (len(items), len(tasks), cl.calls, cl.chars, total / 1e6), file=sys.stderr)

if __name__ == '__main__':
    main()
