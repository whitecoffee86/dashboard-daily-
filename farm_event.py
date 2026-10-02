#!/usr/bin/env python3
"""주식농사 이벤트 감지 — 대시보드(dashboard-daily-) 데이터로 '쇼츠감' 사건을 찾는다.

사용: python3 farm_event.py <data 폴더> [YYYY-MM-DD] [--out event.json]
  날짜를 빼면 마지막 거래일. 결과 JSON 에 events(점수순)·primary·scene 데이터가 담긴다.
금액 공개 원칙(2번): 손익·실현수익은 원 단위, 총자산·계좌 잔고는 내보내지 않는다(수익률만).
"""
import json, math, sys, datetime as dt
from pathlib import Path

ALLOT = [3e6, 3e6, 4e6, 4e6, 5e6, 5e6, 6e6, 6e6]
SYS = {'K': '코스피', 'Q': '코스닥'}


def won(n, sign=False):
    s = '-' if n < 0 else ('+' if sign and n > 0 else '')
    a = abs(round(n))
    eok, man = divmod(a, 100_000_000)
    man = round(man / 10_000)
    if man == 10000: eok += 1; man = 0
    if eok: return f"{s}{eok}억" + (f" {man:,}만" if man else '')
    if a >= 10_000: return f"{s}{round(a / 10_000):,}만"
    return f"{s}{a:,}"


def is_wd(d):
    return dt.date.fromisoformat(d).weekday() < 5


def load(data_dir):
    p = Path(data_dir)
    daily = json.loads((p / 'daily.json').read_text())
    hist = json.loads((p / 'hist.json').read_text())
    acc = json.loads((p / 'accounts.json').read_text())
    closes = {}
    if (p / 'closes.json').exists():
        closes = json.loads((p / 'closes.json').read_text()).get('closes', {})
    return daily, hist, acc, closes


def trading_days(daily):
    D = []
    for i in range(1, len(daily)):
        r, p = daily[i], daily[i - 1]
        if is_wd(r['d']) and (r['pnl'] != 0 or r.get('kospiVal') != p.get('kospiVal')):
            D.append(r)
    return D


def detect_trades(p, r):
    ev = []
    for key, s in (('lever_avg', 'K'), ('kosdaq_avg', 'Q')):
        a, b = p.get(key) or [0] * 8, r.get(key) or [0] * 8
        for j in range(8):
            x, y = a[j] or 0, b[j] or 0
            if x == y: continue
            t = 'seed' if x == 0 else 'harvest' if y == 0 else 'add' if y < x else 'adj'
            ev.append({'s': s, 'n': j + 1, 't': t})
    if (r.get('realized') or 0) > 0 and not any(e['t'] == 'harvest' for e in ev):
        ev.append({'s': '?', 'n': 0, 't': 'partial'})
    return ev


def tr_text(e):
    if e['t'] == 'partial': return '✂️ 부분 수확'
    icon = {'seed': '🌱', 'add': '💧', 'harvest': '🧺', 'adj': '🔧'}[e['t']]
    name = {'seed': '파종', 'add': '추가 파종', 'harvest': '수확', 'adj': '평단 조정'}[e['t']]
    return f"{icon} {SYS[e['s']]} {e['n']}번 {name}"


def achievements(D):
    """대시보드 업적 진열장과 같은 기준. 얻은 업적 이름 집합."""
    if not D: return set()
    L = D[-1]
    traded = [r for r in D if r['pnl'] != 0]
    run = longw = 0
    for r in traded:
        run = run + 1 if r['pnl'] > 0 else 0
        longw = max(longw, run)
    ath, pk = 0, 1000.0
    for r in D:
        if r['nav'] > pk + 1e-9: ath += 1; pk = r['nav']
    maxret = max(r['ret'] for r in D)
    best = max((r['pnl'] for r in traded), default=0)
    real = sum(r.get('realized') or 0 for r in D)
    mreal = {}
    for r in D: mreal[r['d'][:7]] = mreal.get(r['d'][:7], 0) + (r.get('realized') or 0)
    navs = [1000.0] + [r['nav'] for r in D]
    peak, mdd = navs[0], 0
    for v in navs:
        peak = max(peak, v); mdd = min(mdd, (v / peak - 1) * 100)
    navpk = max(r['nav'] for r in D)
    got = set()
    if longw >= 5: got.add('🔥 연승 장인')
    if ath >= 10: got.add('🏔 신고가 사냥꾼')
    if best >= 1e7: got.add('💥 하루 천만')
    if maxret >= 100: got.add('🚀 더블')
    if maxret >= 200: got.add('🌋 트리플')
    if any(v >= 1e7 for v in mreal.values()): got.add('🧺 월 천만 수확')
    if L['ret'] - L['kospi'] > 0: got.add('🐢 코스피 추월')
    if len(D) >= 100: got.add('📅 100일 출석')
    if mdd <= -30 and L['ret'] > 0: got.add('⛈ 폭풍 생존')
    if L['nav'] >= navpk - 1e-9: got.add('🏔 전고점 탈환')
    if real >= 1e8: got.add('🌾 1억 수확')
    if maxret >= 300: got.add('👑 +300% 클럽')
    return got


def month_summary(D, ym, closes):
    """월간 결산(롱폼)용 요약. 금액 공개 2번: 손익·실현은 원, 자산은 수익률만."""
    M = [r for r in D if r['d'][:7] == ym]
    if not M: return {'month': ym, 'empty': True}
    i0 = D.index(M[0]); prev = D[i0 - 1] if i0 > 0 else None
    base_nav = prev['nav'] if prev else 1000.0
    base_kv = prev['kospiVal'] if prev and prev.get('kospiVal') else M[0].get('kospiVal')
    traded = [r for r in M if r['pnl'] != 0]
    wins = [r for r in traded if r['pnl'] > 0]
    best = max(traded, key=lambda r: r['pnl']) if traded else None
    worst = min(traded, key=lambda r: r['pnl']) if traded else None
    evs = []
    for a, b in zip([prev] + M[:-1] if prev else M[:-1], M if prev else M[1:]):
        evs += [dict(e, d=b['d']) for e in detect_trades(a, b)]
    pk_before = max([1000.0] + [r['nav'] for r in D[:i0]])
    ath = sum(1 for j, r in enumerate(M) if r['nav'] > max([pk_before] + [x['nav'] for x in M[:j]]) + 1e-9)
    gained = sorted(achievements(D[:D.index(M[-1]) + 1]) - achievements(D[:i0]))
    by_acc = {}
    for e in evs:
        if e['t'] == 'harvest': by_acc[f"{SYS[e['s']]} {e['n']}번"] = by_acc.get(f"{SYS[e['s']]} {e['n']}번", 0) + 1
    return {
        'month': ym, 'days': len(M),
        'pnl': sum(r['pnl'] for r in M), 'pnl_txt': won(sum(r['pnl'] for r in M), True),
        'realized': sum((r.get('realized') or 0) for r in M), 'realized_txt': won(sum((r.get('realized') or 0) for r in M)),
        'ret_pct': round((M[-1]['nav'] / base_nav - 1) * 100, 2),
        'kospi_pct': round((M[-1]['kospiVal'] / base_kv - 1) * 100, 2) if base_kv and M[-1].get('kospiVal') else None,
        'win_rate': round(len(wins) / len(traded) * 100, 1) if traded else None, 'win_days': len(wins), 'traded_days': len(traded),
        'best': {'d': best['d'], 'pnl_txt': won(best['pnl'], True)} if best else None,
        'worst': {'d': worst['d'], 'pnl_txt': won(worst['pnl'], True)} if worst else None,
        'harvests': sum(e['t'] == 'harvest' for e in evs), 'seeds': sum(e['t'] in ('seed', 'add') for e in evs),
        'harvest_rank': sorted(by_acc.items(), key=lambda x: -x[1])[:3],
        'ath_count': ath, 'new_achievements': gained,
        'ytd_ret': round(M[-1]['ret'], 1), 'ytd_kospi': round(M[-1]['kospi'], 1),
        'calendar': [{'d': r['d'], 'pnl': r['pnl'], 'txt': won(r['pnl'], True)} for r in M],
        'race_month': [{'d': (prev or M[0])['d'], 'me': 0.0, 'kp': 0.0}] + [{'d': r['d'], 'me': round((r['nav'] / base_nav - 1) * 100, 2),
                        'kp': round((r['kospiVal'] / base_kv - 1) * 100, 2) if base_kv and r.get('kospiVal') else 0} for r in M],
    }


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if '--month' in sys.argv: args.remove(sys.argv[sys.argv.index('--month') + 1])
    out = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
    if out in args: args.remove(out)
    daily, hist, acc, closes = load(args[0])
    D = trading_days(daily)
    if '--month' in sys.argv:
        ym = sys.argv[sys.argv.index('--month') + 1]
        res = month_summary(D, ym, closes)
        txt = json.dumps(res, ensure_ascii=False, indent=1)
        if out: Path(out).write_text(txt)
        print(txt[:1500]); return
    target = args[1] if len(args) > 1 else D[-1]['d']
    idx = next((i for i, r in enumerate(D) if r['d'] == target), None)
    if idx is None or idx == 0:
        print(json.dumps({'date': target, 'events': [], 'reason': '해당 날짜 데이터 없음'}, ensure_ascii=False)); return
    D = D[:idx + 1]
    L, P = D[-1], D[-2]
    for r in D:
        if r.get('leverClose') or r.get('kosdaqClose'): closes[r['d']] = [r.get('leverClose') or 0, r.get('kosdaqClose') or 0]

    traded = [r for r in D if r['pnl'] != 0]
    pnls = sorted((r['pnl'] for r in traded), reverse=True)
    rank = pnls.index(L['pnl']) + 1 if L['pnl'] in pnls else None
    worst_rank = len(pnls) - rank + 1 if rank else None
    top = math.ceil(len(traded) * 0.05)
    day_ret = (L['nav'] / P['nav'] - 1) * 100
    kospi_day = (L['kospiVal'] / P['kospiVal'] - 1) * 100 if L.get('kospiVal') and P.get('kospiVal') else None
    prev_peak = max(r['nav'] for r in D[:-1])
    trades = detect_trades(P, L)
    harvests = [e for e in trades if e['t'] == 'harvest']
    ever = set()
    for k in range(2, len(D)):          # 예전에 한 번이라도 땄던 업적은 다시 알리지 않음
        ever |= achievements(D[:k])
    new_ach = sorted(achievements(D) - ever)
    navpk = max(r['nav'] for r in D)

    ev = []
    # 신고점: 직전 신고점 이후 10거래일 이상 지나서 다시 찍은 경우만 (연일 갱신은 제외)
    if L['nav'] > prev_peak + 1e-9:
        last_pk_i = max(i for i, r in enumerate(D[:-1]) if r['nav'] >= prev_peak - 1e-9)
        gap_days = len(D) - 1 - last_pk_i
        if gap_days >= 10:
            ev.append({'key': 'ath', 'score': 90, 'title': f'{gap_days}거래일 만에 신고점', 'mood': 'up'})
    for a in new_ach:
        if a in ('🏔 전고점 탈환',) and any(e['key'] == 'ath' for e in ev): continue
        ev.append({'key': 'achievement', 'score': 85, 'title': f'업적 달성 {a}', 'mood': 'up', 'badge': a})
    if L['pnl'] >= 1e7:
        ev.append({'key': 'big_day', 'score': 80, 'title': f'하루 {won(L["pnl"], True)}', 'mood': 'up'})
    elif rank and L['pnl'] > 0 and rank <= top:
        ev.append({'key': 'top_day', 'score': 70, 'title': f'올해 {len(traded)}거래일 중 {rank}위', 'mood': 'up'})
    if len(harvests) >= 3:
        ev.append({'key': 'chain_harvest', 'score': 65, 'title': f'하루 {len(harvests)}계좌 연쇄 수확', 'mood': 'up'})
    if L['pnl'] <= -1e7 or (worst_rank and L['pnl'] < 0 and worst_rank <= top and len(traded) >= 60):
        ev.append({'key': 'storm_day', 'score': 60, 'title': f'하루 {won(L["pnl"], True)}' if L['pnl'] <= -1e7 else f'올해 하위 {worst_rank}번째 하락일', 'mood': 'down'})
    c = closes.get(L['d'])
    if c:
        for key, s, ci in (('lever_avg', 'K', 0), ('kosdaq_avg', 'Q', 1)):
            a8 = (L.get(key) or [0] * 8)[7]
            cp = closes.get(P['d']); a8p = (P.get(key) or [0] * 8)[7]
            r8p = (cp[ci] / a8p - 1) * 100 if cp and cp[ci] and a8p else 0
            if a8 and c[ci]:
                r8 = (c[ci] / a8 - 1) * 100
                if r8 <= -15 and r8p > -15: ev.append({'key': 'acc8_cut', 'score': 75, 'title': f'{SYS[s]} 8번 -15% 청산선', 'mood': 'down'})
                elif r8 <= -5 and r8p > -5: ev.append({'key': 'acc8_add', 'score': 55, 'title': f'{SYS[s]} 8번 -5% 추가 파종선', 'mood': 'down'})
    ev.sort(key=lambda e: -e['score'])

    # 장면 데이터 (금액 공개 2번: 손익·실현은 원, 자산은 %만)
    race = [{'d': '2026-01-01', 'me': 0.0, 'kp': 0.0}] + [{'d': r['d'], 'me': round(r['ret'], 2), 'kp': round(r['kospi'], 2)} for r in D]
    step = max(1, len(race) // 90)
    race_s = race[::step]
    if race_s[-1]['d'] != race[-1]['d']: race_s.append(race[-1])
    mreal = sum((r.get('realized') or 0) for r in D if r['d'][:7] == L['d'][:7])
    real26 = sum((r.get('realized') or 0) for r in D)
    wk0 = dt.date.fromisoformat(L['d']); wk0 -= dt.timedelta(days=wk0.weekday())
    week = [r for r in D if dt.date.fromisoformat(r['d']) >= wk0]
    res = {
        'date': L['d'],
        'events': ev,
        'primary': ev[0] if ev else None,
        'day': {'pnl': L['pnl'], 'pnl_txt': won(L['pnl'], True), 'ret_pct': round(day_ret, 2),
                'kospi_pct': round(kospi_day, 2) if kospi_day is not None else None,
                'realized': L.get('realized') or 0, 'realized_txt': won(L.get('realized') or 0),
                'rank': rank, 'n_traded': len(traded),
                'trades': [tr_text(e) for e in trades], 'harvest_n': len(harvests)},
        'ytd': {'ret': round(L['ret'], 1), 'kospi': round(L['kospi'], 1), 'gap': round(L['ret'] - L['kospi'], 1),
                'dd_from_peak': round((L['nav'] / navpk - 1) * 100, 1),
                'month_realized_txt': won(mreal), 'ytd_realized_txt': won(real26)},
        'week': {'from': week[0]['d'] if week else None, 'pnl_txt': won(sum(r['pnl'] for r in week), True),
                 'realized_txt': won(sum((r.get('realized') or 0) for r in week))},
        'race': race_s,
        'new_achievements': new_ach,
    }
    txt = json.dumps(res, ensure_ascii=False, indent=1)
    if out: Path(out).write_text(txt)
    print(json.dumps({k: res[k] for k in ('date', 'events', 'day', 'ytd')}, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
