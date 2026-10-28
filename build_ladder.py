#!/usr/bin/env python3
"""8계좌 '계단식 밭' 이벤트 쇼츠 storyboard 만들기 (2026-10-27).

사용: python3 build_ladder.py <event.json> <data 폴더> <WORK 폴더>
  - 같은 폴더의 farm_event.py 를 불러 마지막 거래일 매매(수확·파종)를 다시 읽고,
    산 가격 높이대로 깐 계단 위에서 '그날의 질문 → 원인 → 반전 → 답' 4장면을 만든다.
  - ladder.js 를 WORK 로 복사한다. 화면·제목·썸네일·헤더·자막에 원화 금액은 넣지 않는다(수익률 %·칸 번호만).
  - 계단으로 설명할 수 없는 날(손절 청산, 오른 날 이익 칸을 안 판 날 등)은 종료코드 2 — 예약 작업은 이벤트 쇼츠를 건너뛴다.
종류: UP(수확한 날) · SEED(심거나 더 심은 날) · HOLD(오른 날인데 이익 난 칸이 없어 안 판 날)
"""
import json, sys, shutil, datetime as dt
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from farm_event import load, trading_days, detect_trades  # noqa: E402

KEYS = {'K': ('lever_avg', '_leverPrice', 'KODEX 레버리지', '코스피'),
        'Q': ('kosdaq_avg', '_kosdaqPrice', 'KODEX 코스닥150 레버리지', '코스닥')}
NATIVE = {1: '한', 2: '두', 3: '세', 4: '네', 5: '다섯', 6: '여섯', 7: '일곱', 8: '여덟'}
DISC = ("※ 레버리지 ETF는 하루 2배를 추종해 손실이 빠르게 커질 수 있고, 오래 들고 있으면 지수와 괴리가 생깁니다. "
        "개인 기록이며 매수·매도 권유가 아닙니다.")
FOOT = "종가 기준 · 개인 기록 · 투자 권유 아님 · 레버리지 ETF는 손실도 2배"


def pct(v, sign=True):
    r = round(v)
    return ('+' if r > 0 and sign else '−' if r < 0 else '') + f"{abs(r)}%"


def pct1(v):
    return ('+' if v > 0 else '−' if v < 0 else '') + f"{abs(v):.1f}%"


def pct1_tts(v):
    return ('플러스 ' if v > 0 else '마이너스 ' if v < 0 else '') + f"{abs(v):.1f}퍼센트"


def pct_tts(v):
    r = round(v)
    return ('플러스 ' if r > 0 else '마이너스 ' if r < 0 else '') + f"{abs(r)}퍼센트"


def actor(i, act, react=None):
    a = {"id": act, "x": 140, "y": 1580, "h": 200, "enter": "left", "at": 0.05, "anim": "bounce"}
    if react: a["react"] = [react]
    return a


def main(ev_path, data_dir, work):
    ev = json.loads(Path(ev_path).read_text())
    prim = ev.get('primary') or (ev.get('events') or [None])[0]
    if not prim: print('이벤트 없음'); sys.exit(2)
    daily, hist, acc, closes = load(data_dir)
    D = [r for r in trading_days(daily) if r['d'] <= ev['date']]   # 과거 날짜로도 재현 가능
    L, P = D[-1], D[-2]
    if L['d'] != ev['date']: print(f"날짜 불일치: data {L['d']} vs event {ev['date']}"); sys.exit(2)
    trades = detect_trades(P, L)
    kospi = ev['day'].get('kospi_pct')

    # 상품 고르기: 수확 > 파종 > 코스피
    def has(s, ts): return [e for e in trades if e['s'] == s and e['t'] in ts]
    s = next((x for x in 'KQ' if has(x, ('harvest',))), None) or next((x for x in 'KQ' if has(x, ('seed', 'add'))), None) or 'K'
    key, pkey, product, idx = KEYS[s]
    # 그날 종가: event.json field 의 칸별 수익률로 역산(과거 날짜도 정확), 없으면 accounts.json 최신가
    est = sorted(a_ * (1 + f['ret'] / 100) for a_, f in zip(L.get(key) or [], (ev.get('field') or {}).get(s, []))
                 if a_ and f.get('ret') is not None)
    price = est[len(est) // 2] if est else acc.get(pkey)
    if not price: print('가격 없음'); sys.exit(2)
    if s == 'Q' and ev['day'].get('kospi_pct') is not None:
        idx_pct = None  # 코스닥 지수 변화는 데이터에 없음 → 카드에서 빼고 코스피를 쓰지 않는다
    harvested = [e['n'] for e in has(s, ('harvest',))]
    seeded = [e for e in has(s, ('seed', 'add'))]
    a_now, a_prev = L.get(key) or [0] * 8, P.get(key) or [0] * 8
    steps = []
    for j in range(8):
        v = a_now[j] or (a_prev[j] if (j + 1) in harvested else 0)
        if v: steps.append({"n": j + 1, "avg": v})
    ret = {st['n']: (price / st['avg'] - 1) * 100 for st in steps}
    if len(steps) < 3: print('보유 칸이 3칸 미만 — 계단이 안 됨'); sys.exit(2)

    def seed_day(n):  # 그 칸을 마지막으로 새로 심은 날
        for k in range(len(D) - 1, 0, -1):
            x0, x1 = (D[k - 1].get(key) or [0] * 8)[n - 1], (D[k].get(key) or [0] * 8)[n - 1]
            if not x0 and x1: return D[k]['d']
        return None

    if harvested:
        if any(ret[n] < 0 for n in harvested): print('손실 청산(손절) — 계단 쇼츠 미지원'); sys.exit(2)
        kind = 'UP'
    elif seeded:
        kind = 'SEED'
    elif prim.get('mood') == 'up' and all(v < 0 for v in ret.values()):
        kind = 'HOLD'
    else:
        print(f"계단으로 설명하기 어려운 날({prim['key']}) — 이벤트 쇼츠 건너뜀"); sys.exit(2)

    base = {"product": product, "today": price, "today_label": "오늘 종가", "steps": steps,
            "title_v": f"{product} · {len(steps)}칸 계단식 밭", "subtitle": f"산 가격 높이대로 · {L['d'][5:].replace('-', '/')} 종가 기준"}
    D_ = lambda **k: {**base, **k}
    mmdd = L['d'][5:].replace('-', '/')
    N = len(steps)
    build_line = {"who": "A", "text": f"떨어질 때마다, 더 싸게 {N}번 나눠 샀거든요.", "tts": f"떨어질 때마다, 더 싸게 {NATIVE.get(N, N)} 번 나눠 샀거든요."}
    sfx0 = lambda big=False: {"at": 0, "sound": "whoosh_big" if big else "whoosh"}

    if kind == 'UP':
        top = steps[0]
        low = max((st for st in steps if st['n'] in harvested), key=lambda st: ret[st['n']])
        k = len(harvested)
        a, b = ret[low['n']], ret[top['n']]
        sd = seed_day(low['n'])
        low_label = '어제 산 칸' if sd == P['d'] else (f"{sd[5:].replace('-', '/')}에 산 칸" if sd else '가장 싸게 산 칸')
        top_label = '처음 산 칸' if top['n'] == 1 else '가장 비싸게 산 칸'
        header = f"같은 ETF인데<br><b>{pct(a)}와 {pct(b)}?</b>"
        title = f"같은 레버리지 ETF인데 한 칸은 {pct(a)}, 한 칸은 {pct(b)}인 이유"
        nums = '·'.join(str(n) for n in sorted(harvested))
        scenes = [
            {"lines": [{"who": "A", "text": f"같은 ETF인데, 한 칸은 {pct(a)}, 한 칸은 {pct(b)}예요.",
                        "tts": f"같은 이티에프인데, 한 칸은 {pct_tts(a)}, 한 칸은 {pct_tts(b)}예요."},
                       {"who": "Q", "text": "같은 걸 샀는데, 왜요?"}],
             "data": D_(mode="hook", title_v="같은 ETF, 두 칸", subtitle=f"{product} · {mmdd} 종가 기준",
                        cards=[{"title": f"{top['n']}번 칸", "label": top_label, "value": round(b, 1)},
                               {"title": f"{low['n']}번 칸", "label": low_label, "value": round(a, 1)}]),
             "cues": {"a": {"at": 0.1}, "b": {"at": 0.3}, "hb": {"at": f"{pct(a)},"}, "ha": {"at": f"{pct(b)}예요."}, "q": {"at": "왜요"}},
             "sfx": [sfx0(True), {"at": 0.1, "sound": "ticks", "dur": 1.6}, {"at": 1.75, "sound": "hit", "big": True}, {"at": "왜요", "sound": "pop"}],
             "actor": actor(0, "shock_closeup", {"anim": "shake", "at": "왜요"}), "music": "drive", "min_dur": 2.8},
            {"lines": [build_line], "data": D_(mode="build", note="한 칸 = 계좌 하나 · 아래로 갈수록 싸게 산 칸"),
             "cues": {"start": {"at": 0.1}, "note": {"at": 1.6}},
             "sfx": [sfx0(), {"at": 0.1, "sound": "pop", "repeat": N, "every": 0.16, "db": -14}, {"at": 1.6, "sound": "check"}],
             "actor": actor(1, "pose_planting_coin"), "music": "calm", "min_dur": 3.2},
            {"lines": [{"who": "A", "text": "오늘 반등에, 가장 싸게 산 칸만 이익이 났어요." if k == 1 else f"오늘 반등에, 아래쪽 {k}칸이 이익선을 넘었어요.",
                        **({} if k == 1 else {"tts": f"오늘 반등에, 아래쪽 {NATIVE.get(k, k)}칸이 이익선을 넘었어요."})}],
             "data": D_(mode="rise"), "cues": {"line": {"at": 0.15}, "rets": {"at": 2.3}},
             "sfx": [sfx0(), {"at": 0.15, "sound": "riser"}, {"at": 1.75, "sound": "sparkle"}, {"at": 2.3, "sound": "pop", "repeat": N - 1, "every": 0.08, "db": -16}],
             "actor": actor(2, "pointer_explain"), "music": "up", "min_dur": 3.4},
            {"lines": [{"who": "A", "text": "그래서 그 한 칸만 팔고, 나머지는 기다려요." if k == 1 else f"그래서 그 {k}칸만 팔고, 나머지는 기다려요.",
                        **({} if k == 1 else {"tts": f"그래서 그 {NATIVE.get(k, k)}칸만 팔고, 나머지는 기다려요."})}],
             "data": D_(mode="harvest", harvest_n=harvested, banner=f"{nums}번만 수확 · 나머지는 그대로", foot=FOOT),
             "cues": {"basket": {"at": 0.15}, "wait": {"at": 0.6}, "banner": {"at": 1.3}},
             "sfx": [sfx0(), {"at": 0.15, "sound": "coin"}, {"at": 0.6, "sound": "pop", "repeat": N - k, "every": 0.1, "db": -16}, {"at": 1.3, "sound": "win"}],
             "actor": actor(3, "harvest_gold_fruit", {"anim": "shake", "at": 0.4}), "fx": [{"type": "coins", "at": 0.2, "n": 14}], "music": "up", "min_dur": 3.0},
        ]
        thumb = {"actor": "harvest_gold_fruit", "actor_h": 760, "actor_top": 960, "top": f"{product} 8계좌", "line1": "같은 ETF인데", "main": f"{pct(a)} vs {pct(b)}", "main_size": 140}
        desc = f"같은 {product}를 떨어질 때마다 칸에 나눠 사면 생기는 일 — {mmdd} 종가 기준, 가장 싸게 산 칸부터 이익이 나서 {nums}번 칸만 수확했습니다. 나머지 칸은 그대로 기다립니다."
        pin = "여러분은 한 번에 사세요, 떨어질 때마다 나눠서 사세요?"
        style = "bright"; slug_kind = "ladder-up"
    elif kind == 'SEED':
        new = min((st for st in steps if st['n'] in [e['n'] for e in seeded]), key=lambda st: st['avg'])
        ne = next(e for e in seeded if e['n'] == new['n'])
        new_from = a_prev[new['n'] - 1] if ne['t'] == 'add' else None
        old_steps = [st for st in steps if st is not new] if not new_from else steps
        kp = kospi if (kospi is not None and s == 'K') else None
        header = (f"{idx} {pct1(kp)}인 날<br><b>왜 더 샀나?</b>" if kp is not None and kp < 0 else "떨어지는 날<br><b>왜 더 샀나?</b>")
        title = f"{'코스피 ' + pct1(kp) + ' 빠진 날, ' if kp is not None and kp < 0 else '떨어지는 날, '}레버리지 ETF를 오히려 더 산 이유"
        l3 = (f"가격이 맨 아래 칸보다 내려가서, 그 아래에 {new['n']}번 칸을 새로 심었어요." if not new_from
              else f"{new['n']}번 칸이 더 빠져서, 같은 칸에 한 번 더 심었어요.")
        cards = ([{"top": idx, "title": "오늘", "label": "지수 변화", "value": round(kp, 1)}] if kp is not None else []) + \
                [{"top": product, "title": f"{new['n']}번 칸", "label": "오늘 심은 칸" if not new_from else "오늘 더 심은 칸", "value": new['n'], "unit": "번", "color": "#7ee08a"}]
        if len(cards) < 2:
            cards.insert(0, {"top": product, "title": "보유 칸", "label": "오늘 기준", "value": N, "unit": "칸", "color": "#e8c86a"})
        scenes = [
            {"lines": [{"who": "A", "text": (f"코스피가 {pct1(kp)} 빠진 날, 저는 오히려 더 샀어요." if kp is not None and kp < 0 else "떨어지는 날, 저는 오히려 더 샀어요."),
                        **({"tts": f"코스피가 {pct1_tts(kp)} 빠진 날, 저는 오히려 더 샀어요."} if kp is not None and kp < 0 else {})},
                       {"who": "Q", "text": "떨어지는데, 왜 사요?"}],
             "data": D_(mode="hook", title_v="떨어진 날의 매수", subtitle=f"{product} · {mmdd} 종가 기준", cards=cards, same="같은 날"),
             "cues": {"a": {"at": 0.1}, "b": {"at": 0.3}, "q": {"at": "왜"}},
             "sfx": [sfx0(True), {"at": 0.1, "sound": "ticks", "dur": 1.6}, {"at": 1.75, "sound": "hit", "big": True}, {"at": "왜", "sound": "pop"}],
             "actor": actor(0, "pose_endure_eyes_closed"), "music": "tense", "min_dur": 2.8},
            {"lines": [{"who": "A", "text": "떨어질 때마다, 한 칸씩 더 싸게 사 왔거든요."}],
             "data": {**D_(mode="build", note="한 칸 = 계좌 하나 · 아래로 갈수록 싸게 산 칸"), "steps": old_steps},
             "cues": {"start": {"at": 0.1}, "note": {"at": 1.6}},
             "sfx": [sfx0(), {"at": 0.1, "sound": "pop", "repeat": len(old_steps), "every": 0.16, "db": -14}, {"at": 1.6, "sound": "check"}],
             "actor": actor(1, "pose_planting_coin"), "music": "calm", "min_dur": 3.2},
            {"lines": [{"who": "A", "text": l3}],
             "data": D_(mode="fall", new_n=new['n'], new_from=new_from, new_label="새로 심음" if not new_from else "더 심음"),
             "cues": {"line": {"at": 0.15}, "seed": {"at": 1.3}},
             "sfx": [sfx0(), {"at": 0.15, "sound": "down"}, {"at": 1.3, "sound": "thud"}, {"at": 1.7, "sound": "pop"}],
             "actor": actor(2, "sowing_dark_sky"), "music": "tense", "min_dur": 3.4},
            {"lines": [{"who": "A", "text": "다음 반등 때, 가장 먼저 익을 칸이에요."}],
             "data": D_(mode="wait", new_n=new['n'], new_from=new_from, new_label="새로 심음" if not new_from else "더 심음",
                        banner=f"{new['n']}번 = 가장 싸게 산 칸", foot=FOOT),
             "cues": {"banner": {"at": 0.3}},
             "sfx": [sfx0(), {"at": 0.3, "sound": "check"}],
             "actor": actor(3, "watering_dca"), "music": "soft", "min_dur": 2.8},
        ]
        thumb = {"actor": "sowing_dark_sky", "actor_h": 760, "actor_top": 960, "top": f"{product} 8계좌",
                 "line1": (f"{idx} {pct1(kp)}인 날" if kp is not None and kp < 0 else "떨어지는 날"), "main": f"{new['n']}번 칸 심음", "main_size": 150}
        desc = f"{product}가 떨어진 {mmdd}, 산 가격 계단의 맨 아래에 {new['n']}번 칸을 {'새로' if not new_from else '한 번 더'} 심은 기록입니다. 다음 반등 때 가장 먼저 이익이 날 칸입니다."
        pin = "여러분은 떨어지는 날, 사시나요, 기다리시나요?"
        style = "piano"; slug_kind = "ladder-seed"
    else:  # HOLD
        kp = kospi or 0
        low = steps[-1]
        header = f"{idx} {pct1(kp)} 날<br><b>왜 안 팔았나?</b>"
        title = f"{idx} {pct1(kp)} 오른 날, 레버리지 ETF를 한 칸도 안 판 이유"
        scenes = [
            {"lines": [{"who": "A", "text": f"코스피가 {pct1(kp)} 오른 날, 저는 한 칸도 안 팔았어요.", "tts": f"코스피가 {pct1_tts(kp)} 오른 날, 저는 한 칸도 안 팔았어요."},
                       {"who": "Q", "text": "올랐는데, 왜요?"}],
             "data": D_(mode="hook", title_v="오른 날, 판 칸은?", subtitle=f"{product} · {mmdd} 종가 기준", same="같은 날",
                        cards=[{"top": idx, "title": "오늘", "label": "지수 변화", "value": round(kp, 1)},
                               {"top": product, "title": "오늘 판 칸", "label": "수확", "value": 0, "unit": "칸", "color": "#9fb0cf"}]),
             "cues": {"a": {"at": 0.1}, "b": {"at": 0.3}, "q": {"at": "왜요"}},
             "sfx": [sfx0(True), {"at": 0.1, "sound": "ticks", "dur": 1.6}, {"at": 1.75, "sound": "hit", "big": True}, {"at": "왜요", "sound": "pop"}],
             "actor": actor(0, "thinking_question"), "music": "drive", "min_dur": 2.8},
            {"lines": [build_line], "data": D_(mode="build", note="한 칸 = 계좌 하나 · 아래로 갈수록 싸게 산 칸"),
             "cues": {"start": {"at": 0.1}, "note": {"at": 1.6}},
             "sfx": [sfx0(), {"at": 0.1, "sound": "pop", "repeat": N, "every": 0.16, "db": -14}, {"at": 1.6, "sound": "check"}],
             "actor": actor(1, "pose_planting_coin"), "music": "calm", "min_dur": 3.2},
            {"lines": [{"who": "A", "text": "올랐는데도, 가장 싸게 산 칸까지 아직 손실이에요."}],
             "data": D_(mode="rise"), "cues": {"line": {"at": 0.15}, "rets": {"at": 2.0}},
             "sfx": [sfx0(), {"at": 0.15, "sound": "riser"}, {"at": 2.0, "sound": "pop", "repeat": N, "every": 0.08, "db": -16}],
             "actor": actor(2, "pointer_explain"), "music": "calm", "min_dur": 3.4},
            {"lines": [{"who": "A", "text": "그래서 오늘은, 익은 칸이 없어 기다려요."}],
             "data": D_(mode="harvest", harvest_n=[], banner="익은 칸 0 · 전부 기다림", foot=FOOT),
             "cues": {"wait": {"at": 0.2}, "banner": {"at": 1.0}},
             "sfx": [sfx0(), {"at": 0.2, "sound": "pop", "repeat": N, "every": 0.1, "db": -16}, {"at": 1.0, "sound": "check"}],
             "actor": actor(3, "waiting_moneybag"), "music": "soft", "min_dur": 2.8},
        ]
        thumb = {"actor": "waiting_moneybag", "actor_h": 760, "actor_top": 960, "top": f"{product} 8계좌", "line1": f"{idx} {pct1(kp)} 날", "main": "0칸 수확", "main_size": 170}
        desc = f"{idx}가 {pct1(kp)} 오른 {mmdd}, 가장 싸게 산 칸까지 아직 손실이라 한 칸도 팔지 않은 기록입니다."
        pin = "여러분은 오른 날, 손실 중인 칸도 파시나요?"
        style = "piano"; slug_kind = "ladder-hold"

    sb = {"slug": f"farm-event-{L['d']}-{slug_kind}-shorts", "format": "vertical", "category": "단기 투자",
          "music": {"style": style},
          "voices": {"A": ["ko-KR-SunHiNeural", "+12%", "+30Hz"], "Q": ["ko-KR-InJoonNeural", "+8%"]},
          "header": header, "hot_words": ["칸", "계단", "수확"],
          "meta": {"titles": [title], "title_why": "금액 없이, 처음 보는 사람도 '어? 왜?' 하는 모순 하나로 열고 마지막 장면에서 답한다.",
                   "description": desc, "hashtags": ["레버리지ETF", "분할매수", "KODEX레버리지", "8계좌", "주식농사", "shorts"],
                   "pinned_comment": pin, "disclaimer_extra": DISC},
          "thumbnail": thumb, "ladder_kind": kind, "event_key": prim['key'], "scenes": []}
    for i, sc in enumerate(scenes):
        o = {"id": f"s{i + 1:02d}", "type": "custom", "music": sc["music"], "lines": sc["lines"],
             "props": {"script_file": "ladder.js", "data": sc["data"], "cues": sc["cues"]},
             "sfx": sc["sfx"], "actors": [sc["actor"]], "min_dur": sc["min_dur"]}
        if sc.get("fx"): o["fx"] = sc["fx"]
        sb["scenes"].append(o)
    w = Path(work); w.mkdir(parents=True, exist_ok=True)
    shutil.copy(HERE / 'ladder.js', w / 'ladder.js')
    (w / 'storyboard.json').write_text(json.dumps(sb, ensure_ascii=False, indent=1))
    print(f"storyboard: {w / 'storyboard.json'} | {kind} | slug {sb['slug']} | header {header}")


if __name__ == '__main__':
    if len(sys.argv) < 4: print(__doc__); sys.exit(1)
    main(*sys.argv[1:4])
