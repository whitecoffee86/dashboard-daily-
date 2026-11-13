#!/usr/bin/env python3
"""whitecoffee-video 엔진 사본을 만들고 '음성 없음(WCV_NO_VOICE=1)' 패치를 넣는다.
사용: python3 engine_patch.py <스킬 scripts 폴더> [/tmp/eng_nv]
- 대사 없는 장면에서 BGM 크기·끝맺음이 맞도록 4곳을 고친다(환경변수가 없으면 원래와 똑같이 동작).
- 엔진은 ../assets 를 찾으므로 /tmp/assets 링크도 만든다."""
import os, shutil, sys
src = os.path.abspath(sys.argv[1]); dst = sys.argv[2] if len(sys.argv) > 2 else '/tmp/eng_nv'
shutil.rmtree(dst, ignore_errors=True); shutil.copytree(src, dst)
p = os.path.join(dst, 'wcv.py'); s = open(p).read()
R = [
 ("TALK_DB, GAP_DB = -20.0, -13.0", "TALK_DB, GAP_DB = (-15.0, -15.0) if os.environ.get('WCV_NO_VOICE') else (-20.0, -13.0)"),
 ("    vl = _loud(np.concatenate([voice[k * hop:(k + 1) * hop] for k in np.where(active)[0]]) if active.any() else voice)\n",
  "    vl = _loud(np.concatenate([voice[k * hop:(k + 1) * hop] for k in np.where(active)[0]]) if active.any() else voice)\n    if os.environ.get('WCV_NO_VOICE'): vl = -16.0\n"),
 ('last["start"] + (last["lines"][-1]["end"] if last["lines"] else 0.5)',
  'last["start"] + (last["lines"][-1]["end"] if last["lines"] else (last["dur"] - 0.3 if os.environ.get("WCV_NO_VOICE") else 0.5))'),
 ("    mix = voice[:, None] + mus * (lvl * dmul * fade)[:, None] + sfx\n",
  "    if os.environ.get('WCV_NO_VOICE'): sfx = sfx * 10 ** (4 / 20)\n    mix = voice[:, None] + mus * (lvl * dmul * fade)[:, None] + sfx\n"),
]
for a, b in R:
    if b in s: continue
    if s.count(a) != 1: sys.exit(f"패치 실패(엔진 코드가 바뀜): {a[:60]}")
    s = s.replace(a, b)
if not any(l.startswith('import') and ' os' in l.replace(',', ' ') for l in s.splitlines()[:40]): s = 'import os\n' + s
open(p, 'w').write(s)
assets = os.path.join(os.path.dirname(src), 'assets')
if os.path.isdir(assets):
    if os.path.islink('/tmp/assets') or not os.path.exists('/tmp/assets'):
        try: os.remove('/tmp/assets')
        except FileNotFoundError: pass
        os.symlink(assets, '/tmp/assets')
print('engine ok', dst, 'WCV_NO_VOICE x', open(p).read().count('WCV_NO_VOICE'))
