"""설치 안내 링크(2nhyeok.kr/install)의 QR 코드 만들기 → install/qr.svg · install/qr.png

  pip install segno
  python3 tools/make-install-qr.py

인쇄물·발표 자료에는 qr.png(740×740px)나 qr.svg(크기를 키워도 깨지지 않음)를 쓰면 됩니다.
"""
import os
import segno

URL = 'https://2nhyeok.kr/install/'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'install')

qr = segno.make(URL, error='m', micro=False)
qr.save(os.path.join(OUT, 'qr.svg'), scale=8, border=4, dark='#111827', light='#ffffff', xmldecl=False, title='2nhyeok.kr/install')
qr.save(os.path.join(OUT, 'qr.png'), scale=20, border=4, dark='#111827', light='#ffffff')
print(URL, '→ version', qr.version, 'error', qr.error, '·', qr.symbol_size(scale=20, border=4), 'px')
