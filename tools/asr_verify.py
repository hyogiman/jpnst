"""녹음 발음 검사 (tools/make-audio-google.py --asr 에서 사용)
 - 일본어 음성 인식 두 가지(ReazonSpeech·SenseVoice, sherpa-onnx)로 후보 녹음을 받아 적고, 기대 읽기와 박(모라) 단위로 비교
 - 인식 결과의 한자·숫자·알파벳은 pyopenjtalk로 발음 가나로 바꿔 비교
 - 단어·문장은 장음·촉음까지 구별(strict: ここ≠こうこう, おばさん≠おばあさん), 가나 한 글자는 장음 차이를 무시(loose)
 - 가나 한 글자는 인식기가 "うん" "えい"처럼 뒤에 한 박을 덧붙이는 버릇이 있어, 기대한 박으로 시작하면 통과
 - 문장 사이에 긴 쉼이 있으면 인식기가 한쪽을 통째로 빠뜨릴 때가 있어(テストは…でした。きょうです。→ "きょうです"),
   쉼에서 나눠 따로 받아 적은 것도 함께 봄
 - 세 번째 인식기 Whisper(--whisper)는 글자·소리 구별 짝처럼 짧은 녹음을 한 번 더 확인할 때 씀 (아래 Whisper 참고)
 - 모델: https://github.com/k2-fsa/sherpa-onnx/releases (asr-models) 의
   sherpa-onnx-zipformer-ja-reazonspeech-2024-08-01, sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2025-09-09
"""
import os, re, threading
import numpy as np

SMALL = set('ャュョァィゥェォヮ')
PUNCT = re.compile(r'[\s、。，．,.!！?？…・「」『』（）()\-—~〜:：;；"\'“”‘’]+')
LATIN = {'A': 'エー', 'B': 'ビー', 'C': 'シー', 'D': 'ディー', 'E': 'イー', 'F': 'エフ', 'G': 'ジー', 'H': 'エイチ', 'I': 'アイ', 'J': 'ジェー',
         'K': 'ケー', 'L': 'エル', 'M': 'エム', 'N': 'エヌ', 'O': 'オー', 'P': 'ピー', 'Q': 'キュー', 'R': 'アール', 'S': 'エス', 'T': 'ティー',
         'U': 'ユー', 'V': 'ブイ', 'W': 'ダブリュー', 'X': 'エックス', 'Y': 'ワイ', 'Z': 'ゼット'}
ROMA = {
    'ア': 'a', 'イ': 'i', 'ウ': 'u', 'エ': 'e', 'オ': 'o', 'カ': 'ka', 'キ': 'ki', 'ク': 'ku', 'ケ': 'ke', 'コ': 'ko',
    'サ': 'sa', 'シ': 'shi', 'ス': 'su', 'セ': 'se', 'ソ': 'so', 'タ': 'ta', 'チ': 'chi', 'ツ': 'tsu', 'テ': 'te', 'ト': 'to',
    'ナ': 'na', 'ニ': 'ni', 'ヌ': 'nu', 'ネ': 'ne', 'ノ': 'no', 'ハ': 'ha', 'ヒ': 'hi', 'フ': 'fu', 'ヘ': 'he', 'ホ': 'ho',
    'マ': 'ma', 'ミ': 'mi', 'ム': 'mu', 'メ': 'me', 'モ': 'mo', 'ヤ': 'ya', 'ユ': 'yu', 'ヨ': 'yo',
    'ラ': 'ra', 'リ': 'ri', 'ル': 'ru', 'レ': 're', 'ロ': 'ro', 'ワ': 'wa', 'ヲ': 'o', 'ン': 'N', 'ッ': 'Q',
    'ガ': 'ga', 'ギ': 'gi', 'グ': 'gu', 'ゲ': 'ge', 'ゴ': 'go', 'ザ': 'za', 'ジ': 'ji', 'ズ': 'zu', 'ゼ': 'ze', 'ゾ': 'zo',
    'ダ': 'da', 'ヂ': 'ji', 'ヅ': 'zu', 'デ': 'de', 'ド': 'do', 'バ': 'ba', 'ビ': 'bi', 'ブ': 'bu', 'ベ': 'be', 'ボ': 'bo',
    'パ': 'pa', 'ピ': 'pi', 'プ': 'pu', 'ペ': 'pe', 'ポ': 'po', 'ヴ': 'bu',   # ヴ는 실제 발음이 대개 ブ
    'ァ': 'a', 'ィ': 'i', 'ゥ': 'u', 'ェ': 'e', 'ォ': 'o', 'ャ': 'ya', 'ュ': 'yu', 'ョ': 'yo', 'ヮ': 'wa',
}
_ojt = None

def kata(s):
    return ''.join(chr(ord(c) + 0x60) if 'ぁ' <= c <= 'ゖ' else c for c in s)

def pron(text):
    """글 → 발음 가타카나 (조사 は→ワ 등). 인식 결과의 한자·숫자·알파벳도 읽기로 바꿈"""
    global _ojt
    if not text: return ''
    text = re.sub(r'[A-Za-z]', lambda m: LATIN.get(m.group(0).upper(), ''), text)
    # 인식기가 '絵をかく'의 かく를 描く로 적으면 pyopenjtalk가 えがく로 읽어 버려 맞게 읽은 녹음도 틀린 것이 됨 (이 앱의 かく는 모두 かく로 읽음)
    text = text.replace('描', '書')
    t = PUNCT.sub(' ', text).strip()
    if not t: return ''
    if _ojt is None:
        import pyopenjtalk; _ojt = pyopenjtalk
    try:
        p = _ojt.g2p(t, kana=True)
    except Exception:
        p = kata(t)
    return re.sub(r'[^ァ-ヴー]', '', kata(p))

def morae(k):
    out = []
    for c in k:
        if c in SMALL and out: out[-1] += c
        else: out.append(c)
    return out

def mora_roma(m):
    if len(m) == 2 and m[1] in SMALL:
        a, b = ROMA.get(m[0], '?'), ROMA.get(m[1], '?')
        if b in ('ya', 'yu', 'yo'):
            return (a[:-1] + b[1:]) if a in ('shi', 'chi', 'ji') else (a[:-1] + b)
        return a[:-1] + b
    return ROMA.get(m, '?')

def loose(k):
    """장음·촉음을 빼고 박의 자음+모음만 남긴 목록 (오오→오, 오우→오, 에이→에)"""
    out = []
    for m in morae(k):
        if m in ('ー', 'ッ'): continue
        if out and m in ('ア', 'イ', 'ウ', 'エ', 'オ'):
            pv = mora_roma(out[-1])[-1:]
            if pv == ROMA[m] or (pv == 'o' and m == 'ウ') or (pv == 'e' and m == 'イ'): continue
        out.append(m)
    return [mora_roma(m) for m in out]

def strict(k):
    """장음·촉음도 한 박으로 셈(오우·오오→오ー, 에이·에에→에ー로 맞춤): ここ≠こうこう, おばさん≠おばあさん, うん≠ううん.
    말 첫머리·끝의 촉음은 들리지 않거나 인식기가 덧붙이곤 해서(っていうか, ゾクッ) 뺌"""
    out, prev = [], ''
    for m in morae(k):
        v = mora_roma(prev)[-1:] if prev else ''
        if m == 'ー' or (v and m in ('ア', 'イ', 'ウ', 'エ', 'オ') and (ROMA[m] == v or (v == 'o' and m == 'ウ') or (v == 'e' and m == 'イ'))):
            out.append('R'); continue
        out.append('Q' if m == 'ッ' else mora_roma(m)); prev = m
    while out and out[0] == 'Q': out.pop(0)
    while out and out[-1] == 'Q': out.pop()
    return out

def dist(a, b):
    n, m = len(a), len(b)
    if not n or not m: return n or m
    prev = list(range(m + 1))
    for i in range(1, n + 1):
        cur = [i] + [0] * m
        for j in range(1, m + 1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] != b[j - 1]))
        prev = cur
    return prev[m]

def plain(t):
    return PUNCT.sub('', t or '')

def aligned(a, b):
    """편집 거리가 가장 작은 정렬에서 a의 각 박이 맞붙은 b의 박 {a 위치: b의 박}"""
    n, m = len(a), len(b)
    D = [[i + j if not i or not j else 0 for j in range(m + 1)] for i in range(n + 1)]
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            D[i][j] = min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (a[i - 1] != b[j - 1]))
    i, j, out = n, m, {}
    while i > 0 and j > 0:
        if D[i][j] == D[i - 1][j - 1] + (a[i - 1] != b[j - 1]): out[i - 1] = b[j - 1]; i -= 1; j -= 1
        elif D[i][j] == D[i - 1][j] + 1: i -= 1
        else: j -= 1
    return out

PARTICLE = {'は': 'ワ', 'へ': 'エ', 'を': 'オ'}
def tok_pron(toks):
    """예문 토큰([표기, 가나 읽기]) → (발음 가타카나, 조사 は·へ 박의 위치). 가나만으로 읽기를 만들면 조사 は가 ハ로 읽혀 버려서,
    토큰으로 떨어진 조사(は·へ·を)와 では·には 등은 ワ·エ·オ로 바꿔 넣음"""
    out, marks = '', []
    for surf, kana in toks or []:
        k = re.sub(r'[^ァ-ヴー]', '', kata(kana or ''))
        if surf in PARTICLE:
            if surf != 'を': marks.append(out)
            out += PARTICLE[surf]; continue
        if surf in ('では', 'には', 'とは', 'のは', 'ことは') or surf.startswith('では'):
            i = k.rfind('ハ') if not surf.startswith('では') else 1
            marks.append(out + k[:i]); k = k[:i] + 'ワ' + k[i + 1:]
        out += k
    return out, marks

def to16k(x, sr):
    """인식기 입력(16kHz)으로 바꾸기 — 창 씌운 sinc 저역 통과 필터로 올렸다 내림 (24kHz → 16kHz는 2배 올려 3분의 1)"""
    x = np.asarray(x, dtype=np.float64)
    if sr == 16000: return x.astype(np.float32)
    from math import gcd
    g = gcd(16000, sr); up, down = 16000 // g, sr // g
    taps = 24 * max(up, down) + 1; fc = 0.45 / max(up, down)
    n = np.arange(taps) - taps // 2
    h = 2 * fc * np.sinc(2 * fc * n) * np.kaiser(taps, 8.0) * up
    z = np.zeros(len(x) * up); z[::up] = x
    return np.convolve(z, h, mode='same')[::down].astype(np.float32)

def pieces(x, sr, gap=0.3, floor=40):
    """말 사이의 긴 쉼(최대보다 floor dB 낮은 소리가 gap초 넘게)에서 나눈 조각들. 쉼이 없으면 []"""
    fr = int(sr * 0.01); m = len(x) // fr
    if m == 0: return []
    e = 10 * np.log10((np.asarray(x[:m * fr]).reshape(m, fr) ** 2).mean(1) + 1e-12); e -= e.max()
    loud = e > -floor; on = np.where(loud)[0]
    if not len(on): return []
    cuts, run = [], 0
    for k in range(on[0], on[-1] + 1):
        if not loud[k]: run += 1; continue
        if run >= gap / 0.01: cuts.append(k - run // 2)
        run = 0
    if not cuts: return []
    b = [0] + [c * fr for c in cuts] + [len(x)]
    return [x[b[i]:b[i + 1]] for i in range(len(b) - 1)]

def judge(kind, wants, surfaces, rec, marks=None, flags=None):
    """인식 결과 하나를 판정 → (통과 여부, 박 거리). wants = 기대 발음 가타카나 목록, surfaces = 그대로 맞으면 통과인 표기(한자 단어 등)
    가나 한 글자는 장음을 무시(loose: 인식기가 キュ를 "九(きゅう)"처럼 늘려 적곤 함), 단어·문장은 장음·촉음까지 구별(strict)
    marks = wants[0]에서 조사 は·へ가 시작하는 앞부분 목록: 그 박이 ハ·ヘ로 들렸으면(かれは → 枯れ葉·箱·派) 거리와 상관없이 실패.
    다만 인식기가 は·へ를 글자 그대로 적었으면(가나로 적은 かれは…) 발음 변환이 조사인 줄 몰라 ハ로 읽은 것일 수 있어 '불확실'로만 표시
    (flags에 'unc' 추가 — 고를 때 확실히 맞은 후보를 먼저 찾음)"""
    r = plain(rec)
    if not r: return False, 99
    if r in surfaces: return True, 0
    p = pron(r)
    if not p: return False, 99
    norm = loose if kind == 'kana' else strict
    q = norm(p)
    best = 99
    for w in wants:
        lw = norm(w)
        if not lw: continue
        d = dist(lw, q)
        if kind in ('kana', 'vocab', 'pair', 'static') and len(q) > len(lw) and q[:len(lw)] == lw and sum(m not in ('R', 'Q') for m in q[len(lw):]) <= 1:
            d = 0                                               # 인식기가 끝에 한 박을 덧붙인 경우 (うん, かた, ちぇっ→チェック 등)
        best = min(best, d)
    if kind in ('kana', 'vocab', 'pair'):
        return best == 0, best
    n = max(len(norm(wants[0])), 1)
    if marks and best:
        al = aligned(norm(wants[0]), q)
        for pre in marks:
            i = len(norm(pre)) if pre else 0
            if al.get(i) in ('ha', 'he'):
                if 'は' in r or 'へ' in r:
                    if flags is not None: flags.append('unc')
                    break
                return False, best + 5                            # 조사 は를 ハ, へ를 ヘ로 읽음 (덜 틀린 것을 고를 때도 맨 뒤로)
    return best <= max(1, round(n * 0.08)), best              # 문장: 8% 이내(최소 1박)의 차이는 인식기 오차로 봄

def expect(it):
    """항목 → (기대 발음 목록, 그대로 통과인 표기, 조사 자리). 문장은 토큰의 후리가나로 만든 읽기(조사 반영)와 원문을 형태소 분석한 읽기"""
    text = it['key'].split('|', 1)[1]
    if it['kind'] == 'kana':
        k = kata(text)
        return [k], {text, k, ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in k)}, None   # ハ를 は로 적어도 맞음
    if it['kind'] in ('vocab', 'pair'):
        s = it['synth']
        if s in ('こんにちは', 'こんばんは'): s = s[:-1] + 'わ'
        w = (it.get('w') or '').replace('〜', '').replace('~', '')
        return [kata(s), pron(s)], {x for x in (text, s, kata(s), w) if x}, None
    if it.get('toks'):
        tp, marks = tok_pron(it['toks'])
        return [tp, pron(text)], {plain(text)}, marks
    return [pron(it.get('kana') or it['synth']), pron(text)], {plain(text)}, None

def recognize(rec, clips):
    """[(파형, 표본율)] → 받아 적은 글 목록"""
    ss = []
    pad = np.zeros(4800, dtype=np.float32)             # 앞뒤 0.3초 무음: 짧은 소리(가나 한 글자)도 인식이 안정되게
    for x, sr in clips:
        s = rec.create_stream()
        s.accept_waveform(16000, np.concatenate([pad, to16k(x, sr), pad]))
        ss.append(s)
    rec.decode_streams(ss)
    return [s.result.text for s in ss]

class Checker:
    """후보 녹음 묶음을 두 인식기로 받아 적고 판정. 여러 작업 스레드가 함께 써도 되도록 잠금"""
    def __init__(self, models, threads=4):
        import sherpa_onnx
        def find(word):
            for root, dirs, files in os.walk(models):
                if 'tokens.txt' in files and word in root: return root
            raise SystemExit('음성 인식 모델 폴더가 없습니다: ' + word)
        d = find('reazon')
        pick = lambda pre: os.path.join(d, [x for x in os.listdir(d) if x.startswith(pre) and x.endswith('.onnx') and 'int8' not in x][0])
        self.r1 = sherpa_onnx.OfflineRecognizer.from_transducer(encoder=pick('encoder'), decoder=pick('decoder'), joiner=pick('joiner'),
                                                                tokens=os.path.join(d, 'tokens.txt'), num_threads=threads,
                                                                decoding_method='greedy_search', sample_rate=16000, feature_dim=80)
        d = find('sense')
        self.r2 = sherpa_onnx.OfflineRecognizer.from_sense_voice(model=os.path.join(d, [x for x in os.listdir(d) if x.endswith('.onnx')][0]),
                                                                 tokens=os.path.join(d, 'tokens.txt'), num_threads=threads, language='ja', use_itn=False)
        self.lock = threading.Lock()

    def _rec(self, rec, clips):
        return recognize(rec, clips)

    def check(self, it, clips):
        """clips: [(파형, 표본율)] → [{'ok': 둘 중 하나라도 맞음, 'both': 둘 다 맞음, 'r1','r2': 인식 결과, 'd1','d2': 각각의 박 거리, 'd': 둘 중 작은 것}]"""
        if not clips: return []
        allc, split = list(clips), {}
        for i, (x, sr) in enumerate(clips):
            p = pieces(x, sr)
            if len(p) > 1: split[i] = (len(allc), len(p)); allc += [(q, sr) for q in p]
        with self.lock:
            t1 = self._rec(self.r1, allc)
            t2 = self._rec(self.r2, allc)
        wants, surf, marks = expect(it)
        out = []
        for i in range(len(clips)):
            res, unc = [], []
            for t in (t1, t2):
                texts = [t[i]]
                if i in split: s, n = split[i]; texts.append(''.join(t[s:s + n]))   # 쉼에서 나눠 받아 적은 것
                cand = []
                for x in texts:
                    fl = []; cand.append((judge(it['kind'], wants, surf, x, marks, fl), x, bool(fl)))
                res.append(min(cand, key=lambda z: (not z[0][0], z[2], z[0][1])))
            ((o1, d1), a, u1), ((o2, d2), b, u2) = res
            # 확실히 맞음: 조사 자리가 불확실하지 않은 쪽으로 통과
            sure = (o1 and not u1) or (o2 and not u2)
            out.append({'ok': o1 or o2, 'both': o1 and o2, 'sure': sure, 'r1': a, 'r2': b, 'd': min(d1, d2), 'd1': d1, 'd2': d2})
        return out

class Whisper:
    """세 번째 인식기 Whisper small(일본어 지정): 고르는 데 쓴 두 인식기와 따로 받아 적어 한 번 더 확인 (make-audio-google.py --whisper)
    가나 한 글자는 두 인식기가 비슷한 소리(ぐ/く, む/ぬ, にゅ/に 등)를 함께 놓칠 때가 있어, 성격이 다른 인식기의 표를 하나 더 받음.
    한자로 적으면(中·主·牛) 읽기를 하나로 정할 수 없어 맞아도 '안 맞음'으로 나오므로, 표를 못 받은 것일 뿐 틀렸다는 뜻은 아님
    모델: https://github.com/k2-fsa/sherpa-onnx/releases (asr-models) 의 sherpa-onnx-whisper-small (int8 파일)"""
    def __init__(self, d, threads=4):
        import sherpa_onnx
        f = lambda suf: os.path.join(d, next(x for x in sorted(os.listdir(d)) if x.endswith(suf)))
        self.rec = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=f('encoder.int8.onnx'), decoder=f('decoder.int8.onnx'), tokens=f('tokens.txt'),
                                                              language='ja', task='transcribe', num_threads=threads)
        self.lock = threading.Lock()

    def check(self, it, clips):
        """clips: [(파형, 표본율)] → [{'ok': 맞게 받아 적음, 'r': 받아 적은 글}] (글자·단어용: 쉼에서 나누지 않음)"""
        if not clips: return []
        with self.lock: texts = recognize(self.rec, clips)
        wants, surf, marks = expect(it)
        out = []
        for t in texts:
            fl = []; ok = judge(it['kind'], wants, surf, t, marks, fl)[0]
            out.append({'ok': ok and not fl, 'r': t})    # 조사 자리가 불확실(は·へ를 글자 그대로 적음)하면 표로 치지 않음
        return out
