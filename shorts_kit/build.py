#!/usr/bin/env python3
"""plan.json → 작업 폴더(storyboard.json · 장면 스크립트 · sim.json · fx.wav · 업로드 키트).

사용: python3 build.py <plan.json> <WORK>
  matter-js 가 필요하다: 처음 한 번 `cd shorts_kit && npm install` (package.json 에 0.19 고정).
  이후 엔진(wcv.py 무음 패치본)으로 tts → render → audio → assemble, 그다음 finish.py 로 효과음을 섞는다.
"""
import json, math, os, shutil, subprocess, sys
from pathlib import Path

KIT = Path(__file__).resolve().parent
MUSIC = {'water': 'acoustic', 'bean': 'bright', 'sink': 'piano'}
DISC = "레버리지 ETF는 하루 2배를 추종해 손실이 빠르게 커질 수 있고 오래 들고 있으면 지수와 괴리가 생깁니다. 개인 기록이며 매수·매도 권유가 아닙니다."
NOTE = "※ 내레이션 없이 화면과 효과음으로 만든 영상이며, 내용은 운영자 WhiteCoffee의 실제 매매 기록입니다."


def node(script, out, plan):
    env = dict(os.environ)
    nm = KIT / 'node_modules'
    if nm.exists(): env['NODE_PATH'] = str(nm)
    r = subprocess.run(['node', str(KIT / 'sim' / script), str(out)] + ([str(plan)] if plan else []), capture_output=True, text=True, env=env)
    print(r.stdout.strip())
    if r.returncode: print(r.stderr[-1500:], file=sys.stderr); sys.exit(1)


def sink_times(G, days, adds, rA):
    """sink_r.js 의 씨앗 움직임과 똑같은 계산(효과음·끝 시각용)."""
    yOf = lambda p: G['Y0'] - p * G['S']; PY = yOf(G['PANE']); TH = 26; HZ = 240
    y, v, hit, sh, cut = G['SURF'] - 60, 0.0, None, None, None; plunge = days[-1][0]
    for i in range(int(40 * HZ)):
        t = i / HZ; tgt = G['SURF'] - 60; K = 60; Cd = 2 * .5 * math.sqrt(60)
        for dd in days:
            if t >= dd[0]: tgt = yOf(dd[2])
        for a in adds:
            if a['t2'] <= t < a['tNext']: tgt = yOf(a['pct'])
        if t >= plunge: K = 30; Cd = 2 * .45 * math.sqrt(30)
        r = rA
        for a in adds:
            if t >= a['t'] + .9: r = a['rB']
        if cut is not None and t >= cut: break
        v += (K * (tgt - y) - Cd * v) / HZ; y += v / HZ
        if t >= plunge and sh is None and y + r >= PY - TH / 2:
            if hit is None: hit = t
            y = PY - TH / 2 - r; v = -v * .12
        if hit is not None and sh is None and t >= hit + .4: sh = t; v = 320
        if sh is not None and cut is None and t >= sh + 1.15: cut = t
    return hit, sh, cut


def build_water(P, W):
    node('water.js', W / 'sim.json', W / 'plan.json')
    d = json.loads((W / 'sim.json').read_text()); A = d['A']
    TO = A['tFull'] + .2; TM8, TM8E = 3.35, 4.0
    L7 = TO + d['C7']['land']; L8 = TO + d['C8']['land'] if d['C8'] else 0
    TEND = max(L7, L8) + 1.0
    data = dict(G=d['G'], pegs=d['pegs'], divs=d['divs'], BW=d['BW'], hopPins=d['hopPins'], A=A, C7=d['C7'], C8=d['C8'], fps=d['fps'],
                tOver=TO, tM8=TM8, tM8e=TM8E, tend=TEND, addRatio=P['addRatio'], na=P['na'], ns=P['ns'],
                title1=P['title1'], title2=P['title2'], chip=P['chip'], binLab=P['binLab'], tubeLab=P['tubeLab'],
                tagA=P['tagA'], tagB=P['tagB'], end=P['end'])
    return data, TEND + 2.8


def build_bean(P, W):
    node('bean.js', W / 'sim.json', W / 'plan.json')
    d = json.loads((W / 'sim.json').read_text())
    TCL, TSUN, TG0, TG1 = .5, 1.75, 2.15, 4.7
    TSH = TG1 + .25; TDR = TSH + .4
    ch = P.get('chain')
    TCH = TDR + 1.7; TEND = TCH + 2.0 if ch else TDR + 1.9
    G = d['G']
    data = dict(G=G, PCT=d['PCT'], leaves=d['leaves'], fruits=d['fruits'], A=d['A'], seedPct=P['seedPct'], n=P['n'],
                chain=dict(acc=ch['acc'], pct=ch['pct'], also=ch.get('also', []), t=TCH) if ch else None,
                tCloud=TCL, tSun=TSUN, tGrow0=TG0, tGrow1=TG1, tShake=TSH, tDrop=TDR, tend=TEND,
                title1=P['title1'], title2=P['title2'], chip=P['chip'], labPlant=P['labPlant'], labCloud=P['labCloud'], labSun=P['labSun'],
                seedLab=P['seedLab'], flags=P['flags'], bellLab1=(P['bell'] or {}).get('lab1', ''), bellLab2=(P['bell'] or {}).get('lab2', ''),
                basketLab=P['basketLab'], end=P['end'])
    return data, TEND + 2.8


def build_sink(P, W):
    node('sink.js', W / 'sim.json', None)
    d = json.loads((W / 'sim.json').read_text()); G = d['G']
    days = P['days']; n = len(days)
    gap = 1.05 if n <= 6 else .85
    D, adds, t = [], [], .2
    for j, x in enumerate(days):
        near = j > 0 and j < n - 1 and x['pct'] >= -1.0 and not x['add']
        ai = None
        if x['add']:
            ai = len(adds)
            adds.append(dict(t=round(t + 1.0, 2), t2=round(t + 2.1, 2), pct=x['add']['pct'], ratio=x['add']['ratio'], date=x['add']['date']))
        D.append([round(t, 2), x['d'], x['pct'], x['k'], x['w'], x['lab'], ai, near])
        t += 3.0 if x['add'] else (gap if j else .8)
    rA = 24.0; r = rA
    for k, a in enumerate(adds):
        r = round(r * math.sqrt(a['ratio']), 1); a['rB'] = min(r, 40.0)
        nxt = [dd[0] for dd in D if dd[0] > a['t']]
        a['tNext'] = nxt[0] if nxt else 99
    hit, sh, cut = sink_times(G, D, adds, rA)
    if cut is None: print('씨앗이 정리선에 닿지 않음', file=sys.stderr); sys.exit(1)
    TEND = cut + 1.2; DUR = TEND + 2.8
    (W / 'times.json').write_text(json.dumps(dict(hit=hit, shatter=sh, cut=cut, tend=TEND)))
    data = dict(G=G, shards=d['shards'], days=D, adds=adds, rA=rA, nAdd=24, n=P['n'], tend=TEND, dur=DUR,
                title1=P['title1'], title2=P['title2'], chip=P['chip'], end=P['end'])
    return data, DUR


def kit_text(P, slug, dur):
    k, n = P['kind'], P.get('n') or P.get('na')
    prod = P['product']
    if k == 'water':
        gb = P['gapBefore']; ga = max(0, P['gapAfter']); nd = 0 if gb >= 20 else 1
        titles = [f"{P['title1']}에 물을 타면 본전까지 얼마나 가까워질까",
                  f"레버리지 ETF 물타기, 본전까지 +{gb:.{nd}f}% → +{ga:.{nd}f}%",
                  f"{prod} {P['na']}번 계좌 물타기, 공은 어느 칸에 떨어질까"]
        tags = ['#레버리지ETF', '#물타기', '#KODEX레버리지' if P['market'] == 'K' else '#코스닥150레버리지', '#분할매수', '#주식농사', '#shorts']
        pin = "여러분은 물린 주식에 물을 타나요, 그냥 두나요?"
        rule = "규칙: 내리면 다음 계좌에 새로 심고(N번), 바로 앞 계좌(N-1번)도 같은 금액으로 함께 삽니다. 8번은 −5%마다 추가."
    elif k == 'bean':
        titles = [f"{P['title1']}, 얼마나 자랐을까 ({P['labSun'].split(' ')[0]} 수확)",
                  f"레버리지 ETF 8계좌 {P['n']}번 밭, 해 뜬 날 {('+' if P['PCT'] > 0 else '')}{P['PCT']:.1f}% 수확",
                  f"흐린 날 {P['seedLab']} → 다음 날 수확선을 넘기까지"]
        tags = ['#레버리지ETF', '#분할매도', '#KODEX레버리지' if P['market'] == 'K' else '#코스닥150레버리지', '#8계좌', '#주식농사', '#shorts']
        pin = "여러분은 수익 몇 %에서 파세요?"
        rule = "규칙: 마지막에 심은 계좌가 +0.3% 넘게 오르면 거두고, 그 앞 계좌도 수익이면 이어서 거둡니다(연쇄)."
    else:
        titles = [f"−15% 정리선, {P['n']}번 밭은 버틸 수 있었을까",
                  f"레버리지 ETF {P['n']}번 계좌 {P['cutPct']:.1f}% 정리한 날".replace('-', '−'),
                  "물타기로 버티던 씨앗이 정리선 아래로 내려간 날"]
        tags = ['#레버리지ETF', '#손절', '#KODEX레버리지' if P['market'] == 'K' else '#코스닥150레버리지', '#8계좌', '#주식농사', '#shorts']
        pin = "손절선 정해 두셨나요? 몇 %인가요?"
        rule = "규칙: 8번 계좌는 −5%마다 더 심고, 종가 −15% 아래면 8번만 정리합니다. 1~7번은 그대로."
    desc = f"{P['summary']}.\n{rule}\n\n{DISC}\n{NOTE}"
    md = [f"# 업로드 키트 — {slug}", "", f"- 장면: {dict(water='물타기', bean='수확', sink='손절')[k]} · {prod} · {P['date']}", f"- 길이: {dur:.0f}초 · 세로 1080×1920 · 음성 없음(효과음+BGM)", "",
          "## 제목 후보", *[f"{i + 1}. {t}" for i, t in enumerate(titles)], "", "## 설명란", "```", desc, "```", "", "## 해시태그", ' '.join(tags), "",
          "## 고정 댓글", pin, "", "## 올리는 순서",
          "- 공개: 오늘 밤 9시 전후(같은 날 에버그린 관련 쇼츠는 저녁 7시)",
          "- 관련 동영상(선택): 최근 8계좌 관련 롱폼(주간 결산 등)을 연결, 없으면 비워도 됨",
          "- 쇼츠 댓글·설명란 링크는 클릭이 안 되므로 블로그 주소는 넣지 않는다 — 채널 프로필 링크가 맡는다"]
    return titles, desc, tags, pin, '\n'.join(md) + '\n'


def main():
    plan, W = Path(sys.argv[1]), Path(sys.argv[2])
    W.mkdir(parents=True, exist_ok=True)
    P = json.loads(plan.read_text())
    if plan.resolve() != (W / 'plan.json').resolve(): shutil.copy(plan, W / 'plan.json')
    k = P['kind']
    data, dur = {'water': build_water, 'bean': build_bean, 'sink': build_sink}[k](P, W)
    shutil.copy(KIT / 'scenes' / f'{k}_r.js', W / f'{k}_r.js')
    slug = P['slug'] + '-shorts'
    titles, desc, tags, pin, md = kit_text(P, slug, dur)
    sb = {"slug": slug, "format": "vertical", "category": "단기 투자", "music": {"style": MUSIC[k]},
          "meta": {"titles": titles, "title_why": "", "description": desc, "hashtags": tags, "pinned_comment": pin, "disclaimer_extra": DISC},
          "scenes": [{"id": "s01", "type": "custom", "music": "soft", "lines": [], "min_dur": round(dur, 2),
                      "props": {"script_file": f"{k}_r.js", "data": data, "cues": {}}, "sfx": []}]}
    (W / 'storyboard.json').write_text(json.dumps(sb, ensure_ascii=False))
    (W / f'{slug}_kit.md').write_text(md)
    r = subprocess.run([sys.executable, str(KIT / 'fx.py'), str(W)], capture_output=True, text=True)
    print(r.stdout.strip())
    if r.returncode: print(r.stderr[-2000:], file=sys.stderr); sys.exit(1)
    print(f"BUILD OK {k} slug={slug} dur={dur:.2f}s music={MUSIC[k]}")


if __name__ == '__main__':
    main()
