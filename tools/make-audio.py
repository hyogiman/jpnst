#!/usr/bin/env python3
"""녹음 음성 생성기 (VOICEVOX)

입력: node tools/audio-texts.js 가 만든 JSON
출력: audio/pack0-<해시>.mp3 ~ pack6-<해시>.mp3 (여러 MP3 클립을 이어 붙인 묶음 파일)
      js/data/audio-index.js (해시 → [묶음 번호, 시작 바이트, 길이])

음성 (VOICEVOX core 0.15, 신경망 음성 합성):
  f = VOICEVOX:冥鳴ひまり  (speaker 14)
  m = VOICEVOX:玄野武宏   (speaker 11)
  두 음성 모두 크레딧 표기 조건으로 상업·비상업 이용 가능 (각 캐릭터 이용 규약 참고)

준비 (Linux x86_64 기준):
  pip install pyopenjtalk-prebuilt "numpy<2" lameenc "pydantic>=1.9.2,<2"
  pip install https://github.com/VOICEVOX/voicevox_core/releases/download/0.15.0/voicevox_core-0.15.0+cpu-cp38-abi3-linux_x86_64.whl
  curl -LO https://github.com/microsoft/onnxruntime/releases/download/v1.13.1/onnxruntime-linux-x64-1.13.1.tgz && tar xzf onnxruntime-linux-x64-1.13.1.tgz
사용법:
  node tools/audio-texts.js > /tmp/audio-texts.json
  python3 tools/make-audio.py /tmp/audio-texts.json --ort onnxruntime-linux-x64-1.13.1/lib/libonnxruntime.so.1.13.1 [--cache DIR] [--check-only]

읽기 검사: 합성기가 실제로 읽을 발음(AudioQuery)을 후리가나·단어 읽기와 비교합니다.
 - 단어: 한자 표기 → 히라가나 → 가타카나 순으로 시도해 읽기가 맞는 첫 입력을 씁니다
   (한자 표기가 억양이 가장 자연스럽고, 히라가나만 쓰면 はち를 '와치'로 읽는 식의 오류가 생김)
 - 예문: 따로 떨어진 조사 は·へ·を 는 わ·え·お 로, 그 밖의 글자는 쓰인 그대로 읽어야 통과
 - 고친 읽기는 OVERRIDES 에 적습니다 (화면 표기는 그대로, 합성 입력만 바뀜)
"""
import argparse, base64, ctypes, hashlib, io, json, os, re, sys, wave

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
VOICES = {'f': (14, '冥鳴ひまり'), 'm': (11, '玄野武宏')}

# 합성기가 후리가나와 다르게 읽는 한자를 가나로 바꿔서 합성 (화면 표기는 그대로)
OVERRIDES = [
    ('日本', 'にほん'),
    ('毎日水を', '毎日みずを'),
    ('勝った', 'かった'),
    ('ドアが開きます', 'ドアがあきます'),
    ('雨が降りそう', '雨がふりそう'),
    ('何のために', 'なんのために'),
    ('君には', 'きみには'),
    ('君を', 'きみを'),
    ('君の', 'きみの'),
    ('君が', 'きみが'),
    ('君次第', 'きみ次第'),
    ('君、', 'きみ、'),
    ('君しか', 'きみしか'),
    ('君なら', 'きみなら'),
    ('我に', 'われに'),
    ('背負い込む', 'せおいこむ'),
    ('ふはは', 'フハハ'),  # 웃음소리: 히라가나로는 は를 조사로 보고 '후와와'로 읽음
]

# ---------- 읽기 정규화 ----------
SMALL_VOWEL = {'ャ': 'a', 'ュ': 'u', 'ョ': 'o', 'ァ': 'a', 'ィ': 'i', 'ゥ': 'u', 'ェ': 'e', 'ォ': 'o'}
ROWS = {'a': 'アカサタナハマヤラワガザダバパ', 'i': 'イキシチニヒミリギジヂビピ',
        'u': 'ウクスツヌフムユルグズヅブプヴ', 'e': 'エケセテネヘメレゲゼデベペ', 'o': 'オコソトノホモヨロヲゴゾドボポ'}
VOWEL_OF = {c: v for v, cs in ROWS.items() for c in cs}
VOWEL_OF.update(SMALL_VOWEL)
VOWEL_KANA = {'a': 'ア', 'i': 'イ', 'u': 'ウ', 'e': 'エ', 'o': 'オ'}

def kata(s):
    return ''.join(chr(ord(c) + 0x60) if 'ぁ' <= c <= 'ゖ' else c for c in s)

def norm(s):
    """발음이 같은 표기 차이를 없앤 가타카나 (장음 ー/ウ/イ, ヅ/ズ, ヂ/ジ, ヲ/オ)"""
    s = kata(s)
    s = re.sub(r"[\s、。，,．.！？!?…‥・「」『』（）()〜~'/_＿\-]", '', s)
    s = s.replace('ヲ', 'オ').replace('ヅ', 'ズ').replace('ヂ', 'ジ')
    out = []
    for c in s:
        prev_v = VOWEL_OF.get(out[-1]) if out else None
        if c == 'ー' and prev_v:
            c = VOWEL_KANA[prev_v]
        elif c == 'ウ' and prev_v == 'o':
            c = 'オ'
        elif c == 'イ' and prev_v == 'e':
            c = 'エ'
        out.append(c)
    return ''.join(out)

PARTICLE = {'は': 'ワ', 'へ': 'エ', 'を': 'オ'}

def token_options(plain, kana):
    """토큰 하나가 읽힐 수 있는 발음 후보들"""
    kana = re.sub(r'[〜~]', '', kana).strip()
    if plain in PARTICLE:  # 가나로 쓴 조사 は・へ・を (歯{は} 같은 한자 단어는 제외)
        return [PARTICLE[plain]]
    opts = ['']
    for i, c in enumerate(kana):
        alts = [c]
        end = i == len(kana) - 1 and i > 0
        if c == 'は' and (end or kana[max(0, i - 1):i + 1] in ('では', 'には', 'とは')):
            alts = ['は', 'わ']   # こんにちは・では・わけにはいかない 등 조사로 읽는 は
        elif c == 'へ' and end:
            alts = ['へ', 'え']
        opts = [o + a for o in opts for a in alts][:64]
    return opts

def expected_readings(it):
    """이 클립이 읽혀야 하는 발음들 (정규화한 집합). None = 검사 안 함"""
    if it['kind'] == 'static':
        return None
    if it['kind'] == 'kana':
        return {norm(it['synth'])}
    toks = it.get('toks') or [[it['synth'], it['synth']]]
    out = ['']
    for plain, kana in toks:
        out = [o + t for o in out for t in token_options(plain, kana)][:256]
    return {norm(o) for o in out}

def reading_ok(want, got):
    return want is None or norm(got) in want

def apply_overrides(t):
    for a, b in OVERRIDES:
        t = t.replace(a, b)
    return t

def candidates(it):
    """합성 입력 후보 (앞에서부터 읽기가 맞는 첫 후보를 씀)"""
    base = apply_overrides(it['synth'])
    if it['kind'] == 'vocab':
        c = []
        w = re.sub(r'[〜~]', '', it.get('w') or '').strip()
        if w and w != base:
            c.append(apply_overrides(w))
        c += [base, kata(base)]
        return c
    if it['kind'] == 'pair':
        return [base, kata(base)]
    return [base]

# ---------- 음성 합성 ----------
class Engine:
    def __init__(self, ort):
        if ort:
            ctypes.CDLL(os.path.abspath(ort), mode=ctypes.RTLD_GLOBAL)
        import pyopenjtalk
        from voicevox_core import VoicevoxCore
        dic = os.path.join(os.path.dirname(pyopenjtalk.__file__), 'open_jtalk_dic_utf_8-1.11')
        self.core = VoicevoxCore(acceleration_mode='CPU', cpu_num_threads=os.cpu_count() or 0, open_jtalk_dict_dir=dic)
        for sid, _ in VOICES.values():
            self.core.load_model(sid)

    def query(self, text, voice):
        return self.core.audio_query(text, VOICES[voice][0])

    @staticmethod
    def reading(q):
        return ''.join(m.text for ap in q.accent_phrases for m in ap.moras)

    def synth(self, q, voice, kind):
        moras = [m for ap in q.accent_phrases for m in ap.moras]
        q.pre_phoneme_length = 0.12
        q.post_phoneme_length = 0.25
        if kind == 'kana':
            # 글자 하나: 모음을 충분히 늘려 "아—"처럼 또렷하게 (기본값은 0.1~0.3초라 짧게 끊겨 들림)
            q.speed_scale = 0.9
            m = moras[-1]
            m.vowel_length = max(m.vowel_length, 0.45 if m.vowel == 'N' else 0.42)
            q.post_phoneme_length = 0.3
        elif kind in ('vocab', 'pair'):
            q.speed_scale = 0.95
            if len(moras) == 1:  # て·め 같은 한 박 단어
                moras[0].vowel_length = max(moras[0].vowel_length, 0.3)
        return self.core.synthesis(q, VOICES[voice][0])

def wav_to_float(wav_bytes):
    import numpy as np
    with wave.open(io.BytesIO(wav_bytes)) as w:
        sr = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768.0
        if w.getnchannels() == 2:
            x = x.reshape(-1, 2).mean(axis=1)
    return x, sr

def finish(x, sr):
    """음량 맞추기(말소리 구간 RMS 기준) + 양 끝 짧은 페이드. 앞뒤 무음은 자르지 않음 (끝이 끊겨 들리지 않게)"""
    import numpy as np
    frame = int(sr * 0.02)
    n = len(x) // frame
    if n:
        e = (x[:n * frame].reshape(n, frame) ** 2).mean(axis=1)
        active = e[e > e.max() * 0.01]
        rms = float(np.sqrt(active.mean())) if len(active) else 0.0
    else:
        rms = 0.0
    peak = float(np.abs(x).max()) or 1.0
    gain = min(10 ** (-19 / 20) / rms if rms else 1.0, 0.95 / peak)
    x = x * gain
    fi, fo = int(sr * 0.005), int(sr * 0.03)
    x[:fi] *= np.linspace(0, 1, fi)
    x[-fo:] *= np.linspace(1, 0, fo)
    return x

def to_mp3(x, sr, kbps=48):
    import numpy as np, lameenc
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()
    enc = lameenc.Encoder()
    enc.set_bit_rate(kbps); enc.set_in_sample_rate(sr); enc.set_channels(1); enc.set_quality(2)
    return enc.encode(pcm) + enc.flush()

def silent_mp3():
    import numpy as np, lameenc
    enc = lameenc.Encoder()
    enc.set_bit_rate(32); enc.set_in_sample_rate(24000); enc.set_channels(1); enc.set_quality(7)
    return enc.encode(np.zeros(2400, dtype=np.int16).tobytes()) + enc.flush()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('texts')
    ap.add_argument('--ort', default=os.environ.get('VOICEVOX_ORT'), help='libonnxruntime.so.1.13.1 경로')
    ap.add_argument('--cache', help='합성 결과(wav) 캐시 폴더 — 다시 만들 때 바뀐 문장만 합성')
    ap.add_argument('--check-only', action='store_true')
    a = ap.parse_args()
    items = json.load(open(a.texts, encoding='utf-8'))
    eng = Engine(a.ort)

    # 1) 입력 고르기 + 읽기 검사 (합성기가 실제로 읽을 발음 기준)
    bad = []
    for it in items:
        want = expected_readings(it)
        chosen = None
        for c in candidates(it):
            q = eng.query(c, it['voice'])
            if reading_ok(want, eng.reading(q)):
                chosen = (c, q)
                break
        if chosen is None:
            c = candidates(it)[0]
            q = eng.query(c, it['voice'])
            bad.append((it['synth'], eng.reading(q), ' / '.join(sorted(want))[:120]))
            chosen = (c, q)
        it['text_in'], it['q'] = chosen
    if a.check_only:
        for it in items:
            if it['kind'] in ('vocab', 'pair') and it['text_in'] != candidates(it)[0]:
                print('대체 입력:', it['synth'], '→', it['text_in'], file=sys.stderr)
    for b in bad:
        print('읽기 차이:', ' | '.join(b), file=sys.stderr)
    print('읽기 차이 %d건' % len(bad), file=sys.stderr)
    if a.check_only:
        return

    # 2) 합성 → MP3 (같은 음성·같은 입력이면 한 번만 합성해 공유: あ/ア 등)
    if a.cache:
        os.makedirs(a.cache, exist_ok=True)
    packs, index, done = {}, {}, {}
    os.makedirs(os.path.join(ROOT, 'audio'), exist_ok=True)
    total_sec = 0.0
    for n, it in enumerate(items):
        sig = '%s|%s|%s' % (it['voice'], it['kind'] if it['kind'] in ('kana', 'vocab', 'pair') else 'sent', it['text_in'])
        buf = packs.setdefault(it['pack'], bytearray())
        if (it['pack'], sig) in done:
            index[it['hash']] = done[(it['pack'], sig)]
            continue
        cpath = os.path.join(a.cache, hashlib.sha1(('v2|' + sig).encode()).hexdigest() + '.wav') if a.cache else None
        if cpath and os.path.exists(cpath):
            wav = open(cpath, 'rb').read()
        else:
            wav = eng.synth(it['q'], it['voice'], it['kind'])
            if cpath:
                open(cpath, 'wb').write(wav)
        x, sr = wav_to_float(wav)
        total_sec += len(x) / sr
        mp3 = to_mp3(finish(x, sr), sr)
        entry = [it['pack'], len(buf), len(mp3)]
        buf.extend(mp3)
        index[it['hash']] = entry
        done[(it['pack'], sig)] = entry
        if n % 100 == 0:
            print('%d/%d' % (n, len(items)), file=sys.stderr, flush=True)
    # 묶음 파일 이름에 내용 해시를 넣음 → 음성을 다시 만들면 주소가 바뀌어, 휴대폰에 캐시된 옛 묶음과 새 색인이 섞이지 않음
    total, names = 0, {}
    for p, buf in sorted(packs.items()):
        names[p] = 'audio/pack%d-%s.mp3' % (p, hashlib.sha1(buf).hexdigest()[:8])
        with open(os.path.join(ROOT, names[p]), 'wb') as f:
            f.write(buf)
        total += len(buf)
        print('%s %.1f MB' % (names[p], len(buf) / 1e6), file=sys.stderr)
    for f in os.listdir(os.path.join(ROOT, 'audio')):
        if re.fullmatch(r'pack\d+(-[0-9a-f]+)?\.mp3', f) and 'audio/' + f not in names.values():
            os.remove(os.path.join(ROOT, 'audio', f))
    js = ('/* 자동 생성: tools/make-audio.py — 직접 수정하지 마세요\n'
          ' * 음성: VOICEVOX:冥鳴ひまり (여성) / VOICEVOX:玄野武宏 (남성)\n */\n'
          '(function (g) {\n  var JP = (g.JP = g.JP || {});\n'
          '  JP.audioIndex = {\n    packs: %s,\n    silent: "data:audio/mpeg;base64,%s",\n    map: %s\n  };\n'
          '})(typeof window !== "undefined" ? window : globalThis);\n') % (
        json.dumps([names[p] for p in range(max(packs) + 1)]),
        base64.b64encode(silent_mp3()).decode(),
        json.dumps(index, separators=(',', ':')))
    with open(os.path.join(ROOT, 'js', 'data', 'audio-index.js'), 'w', encoding='utf-8') as f:
        f.write(js)
    print('총 %d개 클립 (합성 %d개, %.0f초), %.1f MB' % (len(items), len(done), total_sec, total / 1e6), file=sys.stderr)

if __name__ == '__main__':
    main()
