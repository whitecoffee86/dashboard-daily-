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
for f in ('race.js', 'harvest.js', 'field.js', 'calendar.js', 'records.js', 'trophy.js'):
    if (here / f).exists(): shutil.copy(here / f, WORK / f)   # 없는 장면은 아래에서 빠짐

E, day, ytd = ev['primary'], ev['day'], ev['ytd']
key, up = E['key'], E['mood'] == 'up'
d = ev['date']; md = f"{int(d[5:7])}/{int(d[8:10])}"
import datetime as _dt
_today = (_dt.datetime.utcnow() + _dt.timedelta(hours=9)).date().isoformat()
DAYW = '오늘' if d == _today else f"{int(d[5:7])}월 {int(d[8:10])}일" 
pnl_full = f"{day['pnl']:+,}원"
man = day['pnl_txt'].lstrip('+-')          # "1,093만"
sign_word = '늘었어요' if day['pnl'] > 0 else '줄었어요'

# ── 훅: 짧게 한 마디. 설명은 화면이 한다 ──
# (헤더, 말할 문장(text), tts(None이면 text), 화면 큰 글자 [(글자, at, size, color)], 쿼카)
HOOK = {
    'big_day':  (f"8계좌 농사<br>하루 <b>{day['pnl_txt']}원</b>", f"하루 만에 {man}원.", None,
                 [("하루 만에", "하루", 96, None), (f"{day['pnl_txt']}원", "만에", 124, 'gold')], 'coins_jump_joy'),
    'top_day':  (f"올해 {day['n_traded']}일 중<br><b>{day['rank']}번째</b> 좋은 날", f"올해 {day['rank']}번째로 좋은 날.", None,
                 [(f"{day['n_traded']}일 중", "올해", 96, None), (f"{day['rank']}번째", "좋은", 150, 'gold')], 'pose_basket_cheer'),
    'ath':      ("8계좌 농사<br><b>신고점</b> 다시 찍었다", "신고점, 다시 찍었다.", None,
                 [("올해", "신고점,", 96, None), ("신고점 갱신", "다시", 124, 'gold')], 'pose_rocket_ride'),
    'achievement': (f"8계좌 농사<br>업적 <b>{E.get('badge','').split(' ',1)[-1]}</b>", f"새 업적 달성.", None,
                 [("새 업적", "새", 96, None), (E.get('badge', ''), "달성.", 104, 'gold')], 'pose_trophy_cheer'),
    'chain_harvest': (f"하루에 <b>{day['harvest_n']}계좌</b><br>연쇄 수확", f"하루에 {day['harvest_n']}계좌 수확.", None,
                 [("하루에", "하루에", 96, None), (f"{day['harvest_n']}계좌 수확", "수확.", 124, 'gold')], 'harvest_gold_fruit'),
    'storm_day': (f"8계좌 농사<br>하루 <b>{day['pnl_txt']}원</b>", f"하루 만에 {man}원 빠졌다.", None,
                 [("하루 만에", "하루", 96, None), (f"{day['pnl_txt']}원", "빠졌다.", 124, 'red')], 'pose_endure_eyes_closed'),
    'acc8_add': ("8번 계좌<br><b>-5% 추가 파종선</b>", "8번 계좌, -5% 도착.", "8번 계좌, 마이너스5퍼센트 도착.",
                 [("8번 계좌", "8번", 110, None), ("-5% 도달", "도착.", 124, 'red')], 'warning_sign'),
    'acc8_cut': ("8번 계좌<br><b>-15% 청산선</b>", "8번 계좌, -15% 청산선.", "8번 계좌, 마이너스15퍼센트 청산선.",
                 [("8번 계좌", "8번", 110, None), ("-15% 청산선", "청산선.", 110, 'red')], 'pose_falling_panic'),
}
header, hook_text, hook_tts, hook_lines, hook_actor = HOOK[key]
hook_line = {"who": "A", "text": hook_text, **({"tts": hook_tts} if hook_tts else {})}

# ── 농사일지: 대사 없이 숫자·칩·배지가 보여준다 ──
trades = day['trades'][:4] or ['🌾 매매 없음 · 그대로 보유']
nh = sum('수확' in t for t in trades)
badges = []
if day.get('realized'): badges.append({"label": "오늘 실현", "value": f"+{day['realized_txt']}"})
if day.get('rank') and day['pnl'] > 0 and day['rank'] <= max(20, day['n_traded'] // 5):
    badges.append({"label": "올해 순위", "value": f"{day['n_traded']}일 중 {day['rank']}위"})
elif day.get('kospi_pct') is not None:
    badges.append({"label": "오늘 코스피", "value": f"{day['kospi_pct']:+.2f}%"})
badges = badges[:2]
T_CHIP = 1.9; T_RANK = T_CHIP + 0.45 * len(trades) + 0.3
HARVEST_HOLD = round(T_RANK + 0.35 * len(badges) + 1.4, 1)
RUN = 3.4; T_GAP = 0.4 + RUN + 0.3; RACE_HOLD = round(T_GAP + 1.8, 1)
mood_a, mood_b = ('drive', 'up') if up else ('soft', 'soft')

scenes = [
    {"type": "stage", "lines": [hook_line], "min_dur": 2.6,
     "props": {"lines": [{"text": t, "at": a, "size": s, **({"color": c} if c else {})} for t, a, s, c in hook_lines], "y": 600},
     "actors": [{"id": hook_actor, "x": 540, "y": 1390, "h": 430, "enter": "drop", "at": 0.1, "anim": "bounce" if up else "idle"}],
     "fx": ([{"type": "coins", "at": hook_lines[-1][1], "n": 26}] if up else [{"type": "tint", "color": "rgba(10,16,40,.4)", "at": 0}, {"type": "rain", "at": 0, "n": 120}])},
    {"type": "custom", "lines": [], "hold": HARVEST_HOLD, "music": mood_a,
     "props": {"script_file": "harvest.js",
               "data": {"title_v": f"{md} 농사일지", "subtitle": "KODEX 레버리지 · 코스닥150 레버리지", "pnl": pnl_full,
                        "sub": f"하루 수익률 {day['ret_pct']:+.2f}%", "trades": trades, "badges": badges, "up": day['pnl'] >= 0},
               "cues": {"start": {"at": 0.2}, "chips": {"at": T_CHIP}, "rank": {"at": T_RANK}}},
     "sfx": [{"at": 0.2, "sound": "ticks", "dur": 1.3}, {"at": 1.45, "sound": "hit" if up else "thud"},
             {"at": T_CHIP, "offset": 0.15, "sound": "coin" if nh else "pop", "repeat": len(trades), "every": 0.45},
             {"at": T_RANK, "offset": 0.1, "sound": "win" if up else "thud"}]},
    {"type": "custom", "lines": [], "hold": RACE_HOLD, "music": mood_b,
     "props": {"script_file": "race.js",
               "data": {"title_v": "2026 코스피와 달리기", "subtitle": "누적 수익률 · 좌수법(NAV) 기준", "series": ev['race'], "run": RUN,
                        "from": "1/1", "to": md},
               "cues": {"start": {"at": 0.4}, "gap": {"at": T_GAP}}},
     "sfx": [{"at": 0.4, "sound": "riser"}, {"at": T_GAP, "sound": "sparkle"}]},
]

# ── 대시보드 장면들 (대사 없음 — 화면이 보여준다) ──
F, C, R, TR = ev['field'], ev['calendar'], ev['records'], ev['trophies']
acts = sum(1 for s_ in 'KQ' for x in F[s_] if x['t'])
ACT = 1.9; FIELD_HOLD = round(ACT + 0.4 * acts + 0.5 + 1.5, 1)
field_sc = {"type": "custom", "lines": [], "hold": FIELD_HOLD, "music": mood_a,
    "props": {"script_file": "field.js",
              "data": {"title_v": "🌾 8계좌 밭", "subtitle": f"평단 대비 수익률 · {md} 종가", "K": F['K'], "Q": F['Q']},
              "cues": {"start": {"at": 0.2}, "act": {"at": ACT}}},
    "sfx": [{"at": 0.25, "sound": "pop", "repeat": 8, "every": 0.14, "db": -16}]
         + ([{"at": ACT, "offset": 0.15, "sound": "coin", "repeat": acts, "every": 0.4}] if acts else [])}
n_cal = len(C['days']); FILL = 2.4
cal_sc = {"type": "custom", "lines": [], "hold": round(0.4 + FILL + 1.6, 1), "music": mood_b,
    "props": {"script_file": "calendar.js",
              "data": {"title_v": "📅 최근 4주 밭 달력", "subtitle": "빨강 수익 · 파랑 손실 · 오늘은 금테", "from": C['from'], "to": C['to'],
                       "today": C['today'], "best_d": C['best_d'], "days": C['days'], "fill": FILL, "total_label": "4주 누적"},
              "cues": {"start": {"at": 0.4}, "best": {"at": 0.4 + FILL}}},
    "sfx": [{"at": 0.4, "sound": "ticks", "dur": FILL}, {"at": 0.4 + FILL, "sound": "sparkle"}]}
rec_sc = {"type": "custom", "lines": [], "hold": 4.8, "music": mood_a,
    "props": {"script_file": "records.js",
              "data": dict(R, title_v="📊 기록실", subtitle=f"2026 거래일 {day['n_traded']}일 기준"),
              "cues": {"start": {"at": 0.25}, "cards": {"at": 1.6}}},
    "sfx": [{"at": 0.25, "sound": "up"}, {"at": 1.6, "sound": "check", "repeat": 4, "every": 0.3}]
         + ([{"at": 2.0, "sound": "hit"}] if R['best']['today'] else [])}
got = sum(1 for x in TR if x['ok']); has_new = any(x['new'] for x in TR)
T_SPOT = round(0.25 + len(TR) * 0.13 + 0.5, 2)
tro_sc = {"type": "custom", "lines": [], "hold": round(T_SPOT + (2.0 if has_new else 1.4), 1), "music": 'up' if up else 'soft',
    "props": {"script_file": "trophy.js",
              "data": {"title_v": "🏆 업적 진열장", "subtitle": f"{len(TR)}개 중 {got}개 획득", "items": TR},
              "cues": {"start": {"at": 0.25}, "spot": {"at": T_SPOT}}},
    "sfx": [{"at": 0.25, "sound": "pop", "repeat": len(TR), "every": 0.13, "db": -15}]
         + ([{"at": T_SPOT, "sound": "win"}, {"at": T_SPOT + 0.2, "sound": "sparkle"}] if has_new else [{"at": T_SPOT - 0.2, "sound": "sparkle"}])}
hook_sc, log_sc, race_sc = scenes
body = [log_sc, field_sc, cal_sc, rec_sc, tro_sc, race_sc]
focus = {'achievement': tro_sc, 'ath': race_sc, 'chain_harvest': field_sc, 'acc8_add': field_sc, 'acc8_cut': field_sc}.get(key)
if focus is not None:
    body.remove(focus); body.insert(0, focus)
scenes = [hook_sc] + [b for b in body if (WORK / b['props']['script_file']).exists()]

end_line = ({"who": "A", "text": "-5%마다 심고, -15%면 정리.", "tts": "마이너스5퍼센트마다 심고, 마이너스15퍼센트면 정리."},
            [{"text": "-5%마다 심고", "at": "심고,", "size": 92, "color": "gold"}, {"text": "-15%면 정리", "at": "정리.", "size": 92, "color": "red"}]) \
    if key in ('acc8_add', 'acc8_cut') else \
           ({"who": "A", "text": "내리면 심고, 오르면 거둔다."},
            [{"text": "내리면 심고", "at": "내리면", "size": 92}, {"text": "오르면 거둔다", "at": "오르면", "color": "gold", "size": 104}])
scenes.append({"type": "title", "lines": [end_line[0]], "min_dur": 3.2,
               "props": {"asset": "field_sowing_walk", "focus": [50, 35], "lines": end_line[1],
                         "sub": {"text": "8계좌 규칙 · 매일 매매일지는 고정댓글", "at": end_line[1][-1]["at"]}}})

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
