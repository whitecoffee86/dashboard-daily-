#!/usr/bin/env python3
"""이벤트 JSON(farm_event.py 결과) → 세로 쇼츠 storyboard.json
사용: python3 build_story.py event.json <WORK폴더>
금액 공개 2번: 손익·실현은 원 단위, 총자산·잔고는 쓰지 않음(수익률만).
"""
import json, sys, shutil
from pathlib import Path

ev = json.load(open(sys.argv[1]))
WORK = Path(sys.argv[2]); WORK.mkdir(parents=True, exist_ok=True)
here = Path(__file__).parent
for f in ('race.js', 'harvest.js'):
    shutil.copy(here / f, WORK / f)

E, day, ytd = ev['primary'], ev['day'], ev['ytd']
key, up = E['key'], E['mood'] == 'up'
d = ev['date']; md = f"{int(d[5:7])}/{int(d[8:10])}"
import datetime as _dt
_today = (_dt.datetime.utcnow() + _dt.timedelta(hours=9)).date().isoformat()
DAYW = '오늘' if d == _today else f"{int(d[5:7])}월 {int(d[8:10])}일" 
pnl_full = f"{day['pnl']:+,}원"
man = day['pnl_txt'].lstrip('+-')          # "1,093만"
sign_word = '늘었어요' if day['pnl'] > 0 else '줄었어요'

# ── 훅 ──
HOOK = {
    'big_day':  (f"8계좌 농사<br>하루 <b>{day['pnl_txt']}원</b>", f"레버리지 ETF 8계좌 농사, {DAYW} 하루에만 {man} 원이 {sign_word}.",
                 [("하루 만에", "하루에만", 96, None), (f"{day['pnl_txt']}원", sign_word, 120, 'gold')], 'coins_jump_joy'),
    'top_day':  (f"올해 {day['n_traded']}일 중<br><b>{day['rank']}번째</b> 좋은 날", f"올해 {day['n_traded']}거래일 중에 {day['rank']}번째로 좋은 날이 왔어요.",
                 [(f"{day['n_traded']}일 중", "중에", 96, None), (f"{day['rank']}번째", "번째로", 140, 'gold')], 'pose_basket_cheer'),
    'ath':      ("8계좌 농사<br><b>신고점</b> 다시 찍었다", "8계좌 농사가 올해 신고점을 다시 찍었어요.",
                 [("올해", "올해", 96, None), ("신고점 갱신", "신고점을", 120, 'gold')], 'pose_rocket_ride'),
    'achievement': (f"8계좌 농사<br>업적 <b>{E.get('badge','').split(' ',1)[-1]}</b>", f"오늘 대시보드에 새 업적이 떴어요. {E.get('badge','').split(' ',1)[-1]}입니다.",
                 [("새 업적", "새", 96, None), (E.get('badge', ''), "업적이", 104, 'gold')], 'pose_trophy_cheer'),
    'chain_harvest': (f"하루에 <b>{day['harvest_n']}계좌</b><br>연쇄 수확", f"오늘은 하루에 {day['harvest_n']}계좌를 연달아 수확했어요.",
                 [("하루에", "하루에", 96, None), (f"{day['harvest_n']}계좌 수확", "연달아", 120, 'gold')], 'harvest_gold_fruit'),
    'storm_day': (f"8계좌 농사<br>하루 <b>{day['pnl_txt']}원</b>", f"오늘은 하루에 {man} 원이 줄었어요. 올해 손꼽히는 하락일이에요.",
                 [("하루 만에", "하루에", 96, None), (f"{day['pnl_txt']}원", "줄었어요.", 120, 'red')], 'pose_endure_eyes_closed'),
    'acc8_add': ("8번 계좌<br><b>-5% 추가 파종선</b>", "마지막 8번 계좌가 평단 대비 마이너스 5퍼센트 선에 닿았어요.",
                 [("8번 계좌", "8번", 110, None), ("-5% 도달", "마이너스", 120, 'red')], 'warning_sign'),
    'acc8_cut': ("8번 계좌<br><b>-15% 청산선</b>", "마지막 8번 계좌가 마이너스 15퍼센트 청산선에 닿았어요.",
                 [("8번 계좌", "8번", 110, None), ("-15% 청산선", "청산선에", 110, 'red')], 'pose_falling_panic'),
}
header, hook_text, hook_lines, hook_actor = HOOK[key]

# ── 농사일지 장면 ──
trades = day['trades'][:4] or ['🌾 매매 없음 · 그대로 보유']
nh = sum('수확' in t for t in trades); ns = sum('파종' in t for t in trades)
if nh and ns: trade_line = f"오늘 일지를 펼쳐보면, 수확 {nh}번과 파종 {ns}번이 있었어요."
elif nh: trade_line = f"오늘 일지를 펼쳐보면, 수확이 {nh}번 있었어요."
elif ns: trade_line = f"오늘 일지를 펼쳐보면, 파종이 {ns}번 있었어요."
else: trade_line = "오늘 일지를 펼쳐보면, 매매 없이 그대로 지켰어요."
badges = []
if day.get('realized'): badges.append({"label": "오늘 실현", "value": f"+{day['realized_txt']}"})
if day.get('rank') and day['pnl'] > 0 and day['rank'] <= max(20, day['n_traded'] // 5):
    badges.append({"label": "올해 순위", "value": f"{day['n_traded']}일 중 {day['rank']}위"})
    rank_line = f"올해 {day['n_traded']}거래일 중에 {day['rank']}위예요."
    rank_at = "거래일"
elif day.get('kospi_pct') is not None:
    badges.append({"label": "오늘 코스피", "value": f"{day['kospi_pct']:+.2f}%"})
    rank_line = f"같은 날 코스피는 {day['kospi_pct']:+.2f}%였어요."
    rank_at = "같은"
else:
    rank_line = '수익률은 좌수법 기준으로 계산했어요.'; rank_at = '좌수법'
badges = badges[:2]

scenes = [
    {"type": "stage", "lines": [{"who": "A", "text": hook_text}],
     "props": {"lines": [{"text": t, "at": a, "size": s, **({"color": c} if c else {})} for t, a, s, c in hook_lines], "y": 600},
     "actors": [{"id": hook_actor, "x": 540, "y": 1390, "h": 430, "enter": "drop", "at": 0.2, "anim": "bounce" if up else "idle"}],
     "fx": ([{"type": "coins", "at": hook_lines[-1][1], "n": 26}] if up else [{"type": "tint", "color": "rgba(10,16,40,.4)", "at": 0}, {"type": "rain", "at": 0, "n": 120}])},
    {"type": "custom", "lines": [{"who": "A", "text": trade_line}, {"who": "A", "text": rank_line}],
     "props": {"script_file": "harvest.js",
               "data": {"title_v": f"{md} 농사일지", "subtitle": "KODEX 레버리지 · 코스닥150 레버리지", "pnl": pnl_full,
                        "sub": f"하루 수익률 {day['ret_pct']:+.2f}%", "trades": trades, "badges": badges, "up": day['pnl'] >= 0},
               "cues": {"start": {"at": 0.3}, "chips": {"at": "펼쳐보면,"}, "rank": {"at": rank_at}}},
     "sfx": [{"at": 0.3, "sound": "ticks", "dur": 1.2}, {"at": "펼쳐보면,", "offset": 0.2, "sound": "coin" if nh else "pop", "repeat": len(trades), "every": 0.45},
             {"at": rank_at, "offset": 0.1, "sound": "win" if up else "thud"}]},
    {"type": "custom", "lines": [{"who": "A", "text": f"올해 전체로 보면 제 밭은 {ytd['ret']:+.1f}%, 코스피는 {ytd['kospi']:+.1f}%예요."},
                                 {"who": "A", "text": f"격차는 {ytd['gap']:+.1f}%p로 벌어져 있어요.", "tts": f"격차는 {ytd['gap']:+.1f}퍼센트포인트로 벌어져 있어요."}],
     "props": {"script_file": "race.js",
               "data": {"title_v": "2026 코스피와 달리기", "subtitle": "누적 수익률 · 좌수법(NAV) 기준", "series": ev['race'], "run": 4.0,
                        "from": "1/1", "to": md},
               "cues": {"start": {"at": "올해"}, "gap": {"at": "격차는"}}},
     "sfx": [{"at": "올해", "offset": 0.1, "sound": "riser"}, {"at": "격차는", "sound": "sparkle"}]},
    {"type": "stage", "lines": [{"who": "A", "text": "규칙은 하나예요. 내리면 다음 칸을 심고, 0.3% 넘게 오르면 거둬요."}],
     "props": {"lines": [{"text": "내리면 심고", "at": "내리면", "size": 100, "color": "green"},
                         {"text": "오르면 거둔다", "at": "오르면", "size": 100, "color": "gold"}], "y": 640},
     "actors": [{"id": "eight_pots", "x": 540, "y": 1390, "h": 420, "enter": "rise", "at": 0.3, "anim": "idle"}]},
    {"type": "title", "lines": [{"who": "A", "text": "8계좌 규칙과 매일 매매일지는 블로그에 그대로 올리고 있어요."}],
     "props": {"asset": "field_sowing_walk", "focus": [50, 35],
               "lines": [{"text": "규칙대로 심고", "at": "규칙과", "size": 84}, {"text": "규칙대로 거둔다", "at": "매매일지는", "color": "gold", "size": 96}],
               "sub": {"text": "8계좌 규칙 · 매일 매매일지는 블로그에", "at": "블로그에"}}},
]
if key in ('acc8_add', 'acc8_cut'):
    scenes[3]["lines"][0]["text"] = "8번은 규칙이 달라요. 마이너스 5%마다 더 심고, 마이너스 15%면 8번만 정리해요."
    scenes[3]["props"]["lines"] = [{"text": "-5%마다 추가", "at": "5%마다", "size": 96, "color": "gold"},
                                   {"text": "-15%면 정리", "at": "15%면", "size": 96, "color": "red"}]

thumb_main = day['pnl_txt'] if key in ('big_day', 'storm_day') else {'top_day': f"{day['rank']}위", 'ath': '신고점', 'chain_harvest': f"{day['harvest_n']}계좌 수확",
              'achievement': '업적 달성', 'acc8_add': '-5%', 'acc8_cut': '-15%'}[key]
sb = {
    "slug": f"farm-event-{d}-{key.replace('_', '')}-shorts", "format": "vertical", "category": "단기 투자",
    "music": {"style": "bright" if up else "piano"},
    "header": header, "hot_words": ["수확", "파종", "8계좌", "코스피"],
    "meta": {
        "titles": [f"레버리지 ETF 8계좌 분할매매 | {E['title']} ({md})",
                   f"{E['title']}, 8계좌 농사 {md} 기록",
                   f"코스피 {ytd['kospi']:+.0f}% vs 내 밭 {ytd['ret']:+.0f}% · {md} 농사일지"],
        "description": f"KODEX 레버리지·코스닥150 레버리지를 8계좌로 나눠 사고파는 주식농사 {md} 기록입니다. {E['title']}. 수익률은 좌수법(NAV) 기준입니다.",
        "hashtags": ["레버리지ETF", "분할매수", "8계좌", "주식농사", "KODEX레버리지", "shorts"],
        "pinned_comment": "8계좌 규칙 전체는 티스토리(ideas07576.tistory.com/4)에, 매일 매매일지는 네이버 블로그(blog.naver.com/whitecoffee0528)에 있어요.",
        "disclaimer_extra": "※ 레버리지 ETF는 하루 2배를 추종해 손실이 빠르게 커질 수 있고, 오래 들고 있으면 지수와 괴리가 생깁니다. 개인 기록이며 매수·매도 권유가 아닙니다."},
    "thumbnail": {"actor": "shock_closeup" if up else "pose_falling_panic", "actor_h": 820, "top": "8계좌 분할매매",
                  "main": thumb_main, "sub": f"{md} 농사일지<br>{E['title'][:12]}"},
    "scenes": scenes,
}
(WORK / 'storyboard.json').write_text(json.dumps(sb, ensure_ascii=False, indent=1))
print('storyboard:', WORK / 'storyboard.json', '| slug', sb['slug'], '| header', header.replace('<br>', ' / '))
