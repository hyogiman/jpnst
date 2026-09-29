#!/usr/bin/env python3
"""녹음 음성 생성기 (Open JTalk + HTS 음성)

입력: node tools/audio-texts.js 가 만든 JSON
출력: audio/pack0.mp3 ~ pack6.mp3 (여러 MP3 클립을 이어 붙인 묶음 파일)
      js/data/audio-index.js (해시 → [묶음 번호, 시작 바이트, 길이])

필요: pip install pyopenjtalk-prebuilt "numpy<2" lameenc
음성:
  f = HTS voice "Mei" (MMDAgent Project, Nagoya Institute of Technology, CC BY 3.0) — pyopenjtalk 기본 내장
  m = HTS voice "NIT ATR503 M001" (HTS Working Group, Nagoya Institute of Technology, CC BY 3.0)
사용법:
  node tools/audio-texts.js > /tmp/audio-texts.json
  python3 tools/make-audio.py /tmp/audio-texts.json --male path/to/nitech_jp_atr503_m001.htsvoice
"""
import argparse, base64, json, os, re, sys
import numpy as np
import pyopenjtalk
from pyopenjtalk.htsengine import HTSEngine
import lameenc

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')

# Open JTalk가 후리가나와 다르게 읽는 한자를 가나로 바꿔서 합성 (화면 표기는 그대로)
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
]

def normalize_reading(k):
    """장음 표기 차이(エイ/エー), 조사 は/へ 표기 차이는 무시하고 비교하기 위한 정규화"""
    k = re.sub(r'[、。！？!?…・「」〜 ]', '', k)
    k = k.replace('ハ', 'ワ').replace('ヘ', 'エ').replace('ヲ', 'オ')
    vowel_of = {}
    rows = {'ア': 'アカサタナハマヤラワガザダバパァャ', 'イ': 'イキシチニヒミリギジヂビピィ', 'ウ': 'ウクスツヌフムユルグズヅブプゥュ', 'エ': 'エケセテネヘメレゲゼデベペェ', 'オ': 'オコソトノホモヨロヲゴゾドボポォョ'}
    for v, cs in rows.items():
        for c in cs:
            vowel_of[c] = v
    out = []
    for c in k:
        if c == 'ー' and out:
            out.append(vowel_of.get(out[-1], 'ー'))
        else:
            out.append(c)
    s = ''.join(out)
    s = re.sub(r'([エケセテネメレゲゼデベペ])イ', r'\1エ', s)
    s = re.sub(r'([オコソトノホモヨロゴゾドボポョ])ウ', r'\1オ', s)
    return s

def apply_overrides(t):
    for a, b in OVERRIDES:
        t = t.replace(a, b)
    return t

def synth(engine, text):
    labels = pyopenjtalk.extract_fullcontext(text)
    engine.refresh()
    x = engine.synthesize(labels)
    return np.asarray(x, dtype=np.float64), engine.get_sampling_frequency()

def to_mp3(x, sr, encoder_rate=24000, kbps=40):
    # 앞뒤 무음 정리 (+60ms 여유)
    thr = max(np.abs(x).max() * 0.02, 50)
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx):
        pad = int(sr * 0.06)
        x = x[max(0, idx[0] - pad): min(len(x), idx[-1] + pad)]
    # 48k → 24k (2점 평균 후 솎아내기)
    if sr == 48000:
        n = len(x) // 2 * 2
        x = x[:n].reshape(-1, 2).mean(axis=1)
    peak = np.abs(x).max() or 1
    x = x / peak * 0.89 * 32767
    pcm = x.astype(np.int16).tobytes()
    enc = lameenc.Encoder()
    enc.set_bit_rate(kbps); enc.set_in_sample_rate(encoder_rate); enc.set_channels(1); enc.set_quality(2)
    return enc.encode(pcm) + enc.flush()

def silent_mp3():
    enc = lameenc.Encoder()
    enc.set_bit_rate(32); enc.set_in_sample_rate(24000); enc.set_channels(1); enc.set_quality(7)
    return enc.encode(np.zeros(2400, dtype=np.int16).tobytes()) + enc.flush()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('texts')
    ap.add_argument('--male', required=True)
    ap.add_argument('--check-only', action='store_true')
    a = ap.parse_args()
    items = json.load(open(a.texts, encoding='utf-8'))

    # 1) 읽기 검사: 한자 문장의 발음이 후리가나 읽기와 같은지
    bad = []
    for it in items:
        it['text_in'] = apply_overrides(it['synth'])
        if it['kind'] in ('sent', 'line', 'dlg') and it['kana']:
            got = normalize_reading(pyopenjtalk.g2p(it['text_in'], kana=True))
            want = normalize_reading(pyopenjtalk.g2p(it['kana'], kana=True))
            if got != want:
                bad.append((it['synth'], got, want))
    for b in bad:
        print('읽기 차이:', ' | '.join(b), file=sys.stderr)
    print('읽기 차이 %d건' % len(bad), file=sys.stderr)
    if a.check_only:
        return

    default_voice = os.path.join(os.path.dirname(pyopenjtalk.__file__), 'htsvoice', 'mei_normal.htsvoice')
    engines = {'f': HTSEngine(default_voice.encode()), 'm': HTSEngine(a.male.encode())}
    packs = {}
    index = {}
    os.makedirs(os.path.join(ROOT, 'audio'), exist_ok=True)
    for n, it in enumerate(items):
        x, sr = synth(engines[it['voice']], it['text_in'])
        mp3 = to_mp3(x, sr)
        buf = packs.setdefault(it['pack'], bytearray())
        index[it['hash']] = [it['pack'], len(buf), len(mp3)]
        buf.extend(mp3)
        if n % 200 == 0:
            print('%d/%d' % (n, len(items)), file=sys.stderr)
    total = 0
    for p, buf in sorted(packs.items()):
        path = os.path.join(ROOT, 'audio', 'pack%d.mp3' % p)
        with open(path, 'wb') as f:
            f.write(buf)
        total += len(buf)
        print('pack%d.mp3 %.1f MB' % (p, len(buf) / 1e6), file=sys.stderr)
    js = ('/* 자동 생성: tools/make-audio.py — 직접 수정하지 마세요\n'
          ' * 음성: Open JTalk + HTS voice "Mei" / "NIT ATR503 M001" (Nagoya Institute of Technology, CC BY 3.0)\n */\n'
          '(function (g) {\n  var JP = (g.JP = g.JP || {});\n'
          '  JP.audioIndex = {\n    packs: %s,\n    silent: "data:audio/mpeg;base64,%s",\n    map: %s\n  };\n'
          '})(typeof window !== "undefined" ? window : globalThis);\n') % (
        json.dumps(['audio/pack%d.mp3' % p for p in range(max(packs) + 1)]),
        base64.b64encode(silent_mp3()).decode(),
        json.dumps(index, separators=(',', ':')))
    with open(os.path.join(ROOT, 'js', 'data', 'audio-index.js'), 'w', encoding='utf-8') as f:
        f.write(js)
    print('총 %d개 클립, %.1f MB' % (len(items), total / 1e6), file=sys.stderr)

if __name__ == '__main__':
    main()
