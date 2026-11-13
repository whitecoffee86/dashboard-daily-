#!/usr/bin/env python3
"""엔진이 만든 쇼츠(BGM)에 fx.wav 를 섞어 최종본을 만들고, 확인용 프레임 시트와 썸네일을 뽑는다.
사용: python3 finish.py <WORK>   → <slug>-final.mp4, <slug>_thumb.png, check_sheet.jpg"""
import json, subprocess, sys, re
from pathlib import Path
W = Path(sys.argv[1]); sb = json.loads((W / 'storyboard.json').read_text()); slug = sb['slug']
P = sb['scenes'][0]['props']['data']; kind = sb['scenes'][0]['props']['script_file'].split('_')[0]
src = W / f'{slug}.mp4'
if not src.exists(): sys.exit(f'엔진 결과 없음: {src}')
fin = W / f'{slug}-final.mp4'
run = lambda *a: subprocess.run(list(a), capture_output=True, text=True)
r = run('ffmpeg', '-y', '-v', 'error', '-i', str(src), '-i', str(W / 'fx.wav'), '-filter_complex',
        '[0:a]volume=0.62[m];[1:a]volume=1.0,apad[f];[m][f]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.93[a]',
        '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', str(fin))
if r.returncode: sys.exit(r.stderr[-800:])
dur = float(run('ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(fin)).stdout)
vd = run('ffmpeg', '-hide_banner', '-i', str(fin), '-af', 'volumedetect', '-vn', '-f', 'null', '-').stderr
mean = float(re.search(r'mean_volume: (-?[\d.]+)', vd).group(1)); mx = float(re.search(r'max_volume: (-?[\d.]+)', vd).group(1))
key = {'water': lambda: [P['tOver'] - .5, P['tOver'] + P['C7']['land'] + .3],
       'bean': lambda: [P['tSun'] + .3, P['tGrow1'] + .1, P['tDrop'] + 1.0] + ([P['chain']['t'] + 1.6] if P.get('chain') else []),
       'sink': lambda: [d[0] + .6 for d in P['days']][1:3] + [json.loads((W / 'times.json').read_text())['shatter'] + .3]}[kind]()
ts = [.1, .35, .7, 2.0] + key + [P['tend'] + .8]
ts = sorted(set(round(min(dur - .05, t), 2) for t in ts))[:12]
fr = W / 'chk'; fr.mkdir(exist_ok=True)
for f in fr.glob('*.jpg'): f.unlink()
for i, t in enumerate(ts): run('ffmpeg', '-y', '-v', 'error', '-ss', f'{t:.2f}', '-i', str(fin), '-frames:v', '1', '-vf', 'scale=270:480', str(fr / f'{i:02d}.jpg'))
cols = 6; rows = (len(ts) + cols - 1) // cols
run('ffmpeg', '-y', '-v', 'error', '-i', str(fr / '%02d.jpg'), '-vf', f'tile={cols}x{rows}:padding=4', '-frames:v', '1', str(W / 'check_sheet.jpg'))
run('ffmpeg', '-y', '-v', 'error', '-ss', f'{min(dur - .1, P["tend"] + .8):.2f}', '-i', str(fin), '-frames:v', '1', str(W / f'{slug}_thumb.png'))
size = fin.stat().st_size / 1e6
print(json.dumps(dict(final=str(fin), dur=round(dur, 2), mean_db=mean, max_db=mx, mb=round(size, 1), sheet=str(W / 'check_sheet.jpg'), sheet_times=ts,
                      thumb=str(W / f'{slug}_thumb.png'), ok=bool(mean > -30 and dur > 5 and size < 30)), ensure_ascii=False))
