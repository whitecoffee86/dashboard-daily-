#!/usr/bin/env python3
"""이벤트 쇼츠(물리엔진판) — 그날 매매에서 장면 하나를 고르고, 장면에 필요한 숫자를 모두 계산한다.

사용: python3 plan.py <data 폴더> [YYYY-MM-DD] --out plan.json [--log youtube-video-log.md]
  날짜를 빼면 마지막 거래일.
종료코드: 0 = 영상 만듦(plan.json 작성) / 3 = 영상 안 만드는 날(사유 한 줄 출력) / 그 밖 = 오류

장면(2026-11-13 사용자와 확정):
  water = 물타기 날: N번 새로 심고 N-1번에 더 삼(또는 8번 -5% 추가). 물통 → 핀볼 → '본전까지 남은 폭' 칸
  bean  = 수확 날: 해가 뜨면 콩나무가 수익률만큼 자라고 금화 열매가 바구니로 + 다음 밭 연쇄 판정
  sink  = 손절 날(8번 -15%): 날씨(지수)에 씨앗이 오르내리다 정리선 지층이 무너짐
  영상 없음: 8번만 다시 심은 날, 아무 매매 없는 날, 장면에 안 맞는 날
시장: 코스피(KODEX 레버리지) 우선. 코스피에 장면이 없고 코스닥에 수확·손절이 있을 때만 코스닥150 레버리지.
금액 원칙: 원화 금액·잔고·총자산은 어디에도 넣지 않는다(수익률 %·계좌 번호·지수 변화만).
"""
import json, math, re, sys, datetime as dt
from pathlib import Path

PROD = {'K': 'KODEX 레버리지', 'Q': 'KODEX 코스닥150 레버리지'}
AVG = {'K': 'lever_avg', 'Q': 'kosdaq_avg'}
CLOSE = {'K': 'leverClose', 'Q': 'kosdaqClose'}
CIDX = {'K': 0, 'Q': 1}
KIND_KO = {'water': '물타기', 'bean': '수확', 'sink': '손절'}


def md(d):
    y, m, dd = d.split('-'); return f"{int(m)}/{int(dd)}"


def sgn(p, nd=1):
    if abs(p) < 0.05: return '0%'
    return f"{'+' if p > 0 else '−'}{abs(p):.{nd}f}%"


def fnum(x):
    return str(int(round(x))) if abs(x - round(x)) < 1e-6 else f"{x:.1f}"


def is_wd(d):
    return dt.date.fromisoformat(d).weekday() < 5


def load(data_dir):
    p = Path(data_dir)
    daily = json.loads((p / 'daily.json').read_text())
    closes = {}
    if (p / 'closes.json').exists():
        closes = json.loads((p / 'closes.json').read_text()).get('closes', {})
    return daily, closes


def trading(daily):
    D = [daily[0]]
    for i in range(1, len(daily)):
        r, p = daily[i], daily[i - 1]
        if is_wd(r['d']) and (r['pnl'] != 0 or r.get('kospiVal') != p.get('kospiVal') or r.get(AVG['K']) != p.get(AVG['K'])):
            D.append(r)
    return D


def close_of(r, s, closes):
    c = r.get(CLOSE[s])
    if c: return c
    c = closes.get(r['d'])
    return c[CIDX[s]] if c else None


def trades(p, r, s):
    a, b = p.get(AVG[s]) or [0] * 8, r.get(AVG[s]) or [0] * 8
    ev = []
    for j in range(8):
        x, y = a[j] or 0, b[j] or 0
        if x == y: continue
        t = 'seed' if x == 0 else 'sell' if y == 0 else 'add' if y < x else 'adj'
        ev.append({'n': j + 1, 't': t, 'a0': x, 'a1': y})
    return ev


def weather(k):
    return 'sun' if k >= 1.0 else 'cloud' if k >= 0 else 'rain' if k > -2.5 else 'storm'


WKO = {'sun': '맑음', 'cloud': '구름', 'rain': '비', 'storm': '폭풍'}


class Ctx:
    def __init__(self, daily, closes):
        self.D = trading(daily); self.closes = closes
        self.idx = {r['d']: i for i, r in enumerate(self.D)}

    def mkt(self, i, s):
        """i번째 거래일의 시장 변화(%) — 코스피는 지수, 코스닥은 ETF 하루 변화."""
        r, p = self.D[i], self.D[i - 1]
        if s == 'K' and r.get('kospiVal') and p.get('kospiVal'):
            return (r['kospiVal'] / p['kospiVal'] - 1) * 100
        c1, c0 = close_of(r, s, self.closes), close_of(p, s, self.closes)
        return (c1 / c0 - 1) * 100 if c1 and c0 else 0.0

    def wk(self, i, s):
        k = self.mkt(i, s)
        return weather(k if s == 'K' else k / 2)

    def mlabel(self, i, s):
        k = self.mkt(i, s)
        return f"코스피 {sgn(k)}" if s == 'K' else f"ETF 하루 {sgn(k)}"


def plan_water(C, i, s, ev):
    r, p = C.D[i], C.D[i - 1]
    c = close_of(r, s, C.closes)
    adds = [e for e in ev if e['t'] == 'add']
    seeds = {e['n']: e for e in ev if e['t'] == 'seed'}
    if not adds or not c: return None
    a = max(adds, key=lambda e: e['n'])
    sd = seeds.get(a['n'] + 1)
    gb, ga = (a['a0'] / c - 1) * 100, (a['a1'] / c - 1) * 100
    if gb <= 0.5 or ga >= gb: return None
    price = sd['a1'] if sd else c
    q = (a['a0'] - a['a1']) / max(1e-9, a['a1'] - price)
    ratio = max(0.05, q * price / a['a0'])
    nice = [0.5, 1, 2, 3, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100]
    cand = [x for x in nice if 7 * x <= gb and ga < 7 * x]
    step = max(cand) if cand else round(gb / 7, 2)
    if ga >= 7 * step: return None
    t7 = 6 - int(max(0, ga) // step)
    gs = (sd['a1'] / c - 1) * 100 if sd else None
    t8 = 6 - int(max(0, gs) // step) if sd else None
    if sd and t8 == t7: return None
    loss = (c / a['a0'] - 1) * 100
    na, ns = a['n'], (sd['n'] if sd else None)
    nd = 0 if gb >= 20 else 1
    end = f'<div class="a">본전까지 {na}번 <b>+{gb:.{nd}f}%</b> → <i>+{max(0, ga):.{nd}f}%</i></div>'
    if sd: end += f'<div class="m">{ns}번 새 씨앗은 <i>0%</i>에서 출발</div>'
    end += f'<div class="s">대신 {na}번에 든 돈은 약 {1 + ratio:.1f}배</div>'
    lossTxt = f"−{abs(loss):.0f}%" if abs(loss) >= 10 else f"−{abs(loss):.1f}%"
    return dict(kind='water', na=na, ns=ns, gapBefore=round(gb, 2), gapAfter=round(ga, 2), gapSeed=None if gs is None else round(gs, 2),
                step=step, T7=t7, T8=t8, addRatio=round(ratio, 3),
                binLab=[f"{fnum((6 - k) * step)}%대" for k in range(7)], tubeLab=f"{fnum(int(gb // step) * step)}%대",
                title1=f"{lossTxt} 물린 주식", title2='<b>물을 타면?</b>',
                chip=f"{PROD[s]} {na}{'·' + str(ns) if sd else ''}번 · {md(r['d'])} 매매",
                tagA=f"{na}번 (물타기 전)", tagB=f"본전까지 +{gb:.{nd}f}%", end=end,
                summary=f"{na}번 계좌 {lossTxt}에서 물타기: 본전까지 남은 폭 +{gb:.{nd}f}% → +{max(0, ga):.{nd}f}%" + (f", {ns}번 새로 심음" if sd else ""))


def past_harvests(C, s, n, upto):
    out = []
    for i in range(1, upto):
        r, p = C.D[i], C.D[i - 1]
        for e in trades(p, r, s):
            if e['n'] == n and e['t'] == 'sell':
                c = close_of(r, s, C.closes)
                if c: out.append((r['d'], (c / e['a0'] - 1) * 100))
    return out


def last_seed(C, s, n, upto):
    for i in range(upto, 0, -1):
        r, p = C.D[i], C.D[i - 1]
        if not (p.get(AVG[s]) or [0] * 8)[n - 1] and (r.get(AVG[s]) or [0] * 8)[n - 1]:
            return i
    return None


def plan_bean(C, i, s, ev):
    r, p = C.D[i], C.D[i - 1]
    c = close_of(r, s, C.closes)
    if not c: return None
    sells = {e['n']: e for e in ev if e['t'] == 'sell'}
    wins = {n: (c / e['a0'] - 1) * 100 for n, e in sells.items()}
    wins = {n: v for n, v in wins.items() if v > 0}
    if not wins: return None
    n = max(wins); PCT = round(wins[n], 2)
    si = last_seed(C, s, n, i - 1)
    if si is None: return None
    a0 = sells[n]['a0']; cp = close_of(p, s, C.closes)
    seedPct = (cp / a0 - 1) * 100 if cp else 0.0
    if si == i - 1: seedPct = (cp / a0 - 1) * 100 if cp else 0.0
    hist = [(d, v) for d, v in past_harvests(C, s, n, i) if v > 0 and (dt.date.fromisoformat(r['d']) - dt.date.fromisoformat(d)).days <= 60]
    bell = None; flags = []
    if hist:
        best = max(v for _, v in hist)
        bd = [md(d) for d, v in hist if abs(v - best) < 0.05][-2:]
        bell = dict(p=round(best, 2), lab1=f"지난 최고 {sgn(best)}", lab2=' · '.join(bd))
        others = [(d, v) for d, v in hist if abs(v - best) >= 0.05 and abs(v - PCT) > .25]
        flags = [[round(v, 2), md(d)] for d, v in others[-3:]]
    # 연쇄 판정: n-1번부터 내려가며
    also = []; chain = None; j = n - 1
    while j >= 1 and j in wins:
        also.append([j, round(wins[j], 1)]); j -= 1
    if j >= 1:
        aj = (p.get(AVG[s]) or [0] * 8)[j - 1]
        if aj:
            chain = dict(acc=j, pct=round((c / aj - 1) * 100, 1), also=also)
    k_prev, k_now = C.mkt(i - 1, s) if i - 1 >= 1 else 0.0, C.mkt(i, s)
    labPlant = f"{md(C.D[si]['d'])} 심음 · 0%"
    labCloud = f"{md(p['d'])}{' 흐림' if k_prev < 0 else ''} · {C.mlabel(i - 1, s)}"
    labSun = f"{md(r['d'])}{' 맑음' if k_now > 0 else ''} · {C.mlabel(i, s)}"
    end = f'<div class="a">{n}번 밭 <i>{sgn(PCT)}</i> 수확</div>'
    end += f'<div class="s">{md(p["d"])} <b>{sgn(seedPct)}</b> → {md(r["d"])} <i>{sgn(PCT)}</i></div>'
    if also: end += f'<div class="s">{"·".join(str(a[0]) for a in also)}번도 함께 수확(연쇄)</div>'
    if chain and chain['pct'] < 0.3: end += f'<div class="s">{chain["acc"]}번은 <b>{sgn(chain["pct"])}</b>라 연쇄는 여기서 멈춤</div>'
    unit = 0.1 if PCT <= 12 else 0.2 if PCT <= 25 else 0.5
    return dict(kind='bean', n=n, PCT=PCT, seedPct=round(seedPct, 2), unit=unit, bell=bell, flags=flags, chain=chain,
                seedDate=C.D[si]['d'], labPlant=labPlant, labCloud=labCloud, labSun=labSun, seedLab=sgn(seedPct),
                basketLab=f"{int(r['d'][5:7])}월 수확",
                title1=f"{md(C.D[si]['d'])} 심은 {n}번 씨앗", title2='<b>얼마나 자랐을까?</b>',
                chip=f"{PROD[s]} {n}번 계좌 · {md(r['d'])} 수확", end=end,
                summary=f"{md(C.D[si]['d'])}에 심은 {n}번 밭이 {md(r['d'])} {sgn(PCT)}에서 수확" + (f", {'·'.join(str(a[0]) for a in also)}번도 연쇄 수확" if also else ""))


def plan_sink(C, i, s, ev):
    r, p = C.D[i], C.D[i - 1]
    c = close_of(r, s, C.closes)
    if not c: return None
    sells = [e for e in ev if e['t'] == 'sell' and (c / e['a0'] - 1) * 100 <= 0]
    if not sells: return None
    e = max(sells, key=lambda x: x['n']); n = e['n']
    cutp = (c / e['a0'] - 1) * 100
    if n != 8 or cutp > -15: return None
    si = last_seed(C, s, n, i - 1)
    if si is None: return None
    days = []
    for k in range(si, i + 1):
        rk, pk = C.D[k], C.D[k - 1]
        ck = close_of(rk, s, C.closes)
        if not ck: return None
        a_prev = (pk.get(AVG[s]) or [0] * 8)[n - 1]; a_now = (rk.get(AVG[s]) or [0] * 8)[n - 1]
        if k == i: a_now = a_prev
        add = None
        if k == si:
            pct = (ck / a_now - 1) * 100
        elif a_now < a_prev:
            pct = (ck / a_prev - 1) * 100
            q = (a_prev - a_now) / max(1e-9, a_now - ck)
            add = dict(pct=round((ck / a_now - 1) * 100, 2), ratio=round(1 + q * ck / a_prev, 3), date=md(rk['d']))
        else:
            pct = (ck / a_now - 1) * 100
        days.append(dict(d=md(rk['d']), pct=round(pct, 2), k=round(C.mkt(k, s), 2), w=C.wk(k, s), lab=C.mlabel(k, s), add=add))
    # 너무 길면 줄이기: 첫날·추가매수 날·마지막 4일
    if len(days) > 8:
        keep = {0, len(days) - 1, len(days) - 2, len(days) - 3, len(days) - 4} | {j for j, d in enumerate(days) if d['add']}
        days = [d for j, d in enumerate(days) if j in keep][-9:]
    sdate, cdate = C.D[si]['d'], r['d']
    end = f'<div class="a">{n}번 밭 <i>{sgn(cutp)}</i> 정리</div><div class="s">종가 기준 · 규칙대로 {n}번만 정리, 1~{n - 1}번은 그대로</div>'
    return dict(kind='sink', n=n, cutPct=round(cutp, 2), days=days, title1='−15% 정리선', title2='<b>버틸 수 있을까?</b>',
                chip=f"{PROD[s]} {n}번 계좌 · {md(sdate)}~{md(cdate)}", end=end,
                summary=f"{md(sdate)}에 심은 {n}번 밭이 {md(cdate)} {sgn(cutp)}로 −15% 정리선 아래 → 규칙대로 정리")


PRI = ['sink', 'bean', 'water']


def scenes_for(C, i, s):
    ev = trades(C.D[i - 1], C.D[i], s)
    out = {}
    for k, f in (('sink', plan_sink), ('bean', plan_bean), ('water', plan_water)):
        try:
            pl = f(C, i, s, ev)
        except Exception as ex:
            print(f"경고: {s} {k} 계산 실패 {ex}", file=sys.stderr); pl = None
        if pl: out[k] = pl
    return out, ev


def read_log(path):
    rows = []
    if not path or not Path(path).exists(): return rows
    for ln in Path(path).read_text().splitlines():
        m = re.match(r"- (\d{4}-\d\d-\d\d) · 이벤트쇼츠 (\d{4}-\d\d-\d\d) · ([^ ·]+)", ln)
        if m: rows.append(dict(made=m.group(1), date=m.group(2), key=m.group(3), line=ln))
    return rows


def main():
    a = sys.argv[1:]
    out = a[a.index('--out') + 1] if '--out' in a else 'plan.json'
    log = a[a.index('--log') + 1] if '--log' in a else None
    pos = [x for k, x in enumerate(a) if not x.startswith('--') and (k == 0 or not a[k - 1].startswith('--'))]
    daily, closes = load(pos[0])
    C = Ctx(daily, closes)
    date = pos[1] if len(pos) > 1 else C.D[-1]['d']
    if date not in C.idx: print(f"SKIP: {date} 거래일 데이터 없음"); sys.exit(3)
    i = C.idx[date]
    rows = read_log(log)
    if any(x['date'] == date for x in rows): print(f"SKIP: {date} 이미 만듦"); sys.exit(3)
    kq, evk = scenes_for(C, i, 'K')
    pick, s = None, 'K'
    for k in PRI:
        if k in kq: pick = kq[k]; break
    if not pick:
        qq, evq = scenes_for(C, i, 'Q')
        for k in ('sink', 'bean'):
            if k in qq: pick = qq[k]; s = 'Q'; break
    if not pick:
        print(f"SKIP: {date} 장면 없음 (코스피 매매 {[(e['n'], e['t']) for e in evk]})"); sys.exit(3)
    # 빈도: 같은 주 최대 2편, 손절은 같은 주 1편, 같은 장면 종류 3일 안 반복 금지
    d0 = dt.date.fromisoformat(date); wk0 = d0 - dt.timedelta(days=d0.weekday())
    this_week = [x for x in rows if wk0 <= dt.date.fromisoformat(x['date']) <= wk0 + dt.timedelta(days=6)]
    if len(this_week) >= 2: print(f"SKIP: 이번 주 이미 {len(this_week)}편"); sys.exit(3)
    if pick['kind'] == 'sink' and any(x['key'] in ('sink', 'storm_day', 'drawdown', 'acc8_add', 'acc8_cut') for x in this_week):
        print("SKIP: 이번 주 하락 계열 이미 있음"); sys.exit(3)
    for x in rows:
        if x['key'] == pick['kind'] and 0 <= (d0 - dt.date.fromisoformat(x['date'])).days <= 3:
            print(f"SKIP: 같은 장면({KIND_KO[pick['kind']]}) {x['date']}에 만듦"); sys.exit(3)
    pick.update(date=date, market=s, product=PROD[s], slug=f"farm-{pick['kind']}-{date}")
    Path(out).write_text(json.dumps(pick, ensure_ascii=False, indent=1))
    print(f"OK {pick['kind']} {s} {date} · {pick['summary']}")


if __name__ == '__main__':
    main()
