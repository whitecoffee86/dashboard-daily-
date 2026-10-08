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
_today = (_dt.datetime.now(_dt.timezone.utc) + _dt.timedelta(hours=9)).date().isoformat()
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
    # ── 새 사건 (2026-10) ──
    'ret_milestone': (f"8계좌 농사<br>누적 <b>+{E.get('n', 0)}%</b> 돌파", f"누적 수익률 +{E.get('n', 0)}% 돌파.",
                 f"누적 수익률 플러스{E.get('n', 0)}퍼센트 돌파.",
                 [("올해 누적", "누적", 96, None), (f"+{E.get('n', 0)}% 돌파", "돌파.", 130, 'gold')], 'pose_rocket_ride'),
    'streak':   (f"8계좌 농사<br><b>{E.get('n', 0)}연승</b> 중", f"{E.get('n', 0)}일 연속 수익.", None,
                 [("연속 수익", "연속", 96, None), (f"{E.get('n', 0)}연승", "수익.", 160, 'gold')], 'jumping_joy_phone'),
    'comeback': (f"{E.get('n', 0)}연패 끝<br><b>반등</b>", f"{E.get('n', 0)}연패 끝, 반등.", None,
                 [(f"{E.get('n', 0)}연패 끝", "연패", 110, None), ("반등 ↗", "반등.", 160, 'gold')], 'spring_bounce'),
    'beat_kospi': (f"코스피 {day['kospi_pct'] or 0:+.1f}%<br>내 밭 <b>{day['ret_pct']:+.1f}%</b>", "코스피를 크게 앞선 날.", None,
                 [(f"코스피 {day['kospi_pct'] or 0:+.1f}%", "코스피를", 104, None), (f"내 밭 {day['ret_pct']:+.1f}%", "앞선", 124, 'gold')], 'confident_thumbs'),
    'drawdown': (f"고점 대비<br><b>{E.get('n', 0)}%</b>", f"고점에서 {abs(E.get('n', 0))}% 내려왔다.",
                 f"고점에서 {abs(E.get('n', 0))}퍼센트 내려왔다.",
                 [("고점 대비", "고점에서", 96, None), (f"{E.get('n', 0)}%", "내려왔다.", 170, 'red')], 'umbrella_shield'),
    'chain_seed': (f"하루에 <b>{E.get('n', 0)}계좌</b><br>씨앗 심기", f"하루에 {E.get('n', 0)}계좌 파종.", None,
                 [("하루에", "하루에", 96, None), (f"{E.get('n', 0)}계좌 파종", "파종.", 124, 'gold')], 'pose_planting_coin'),
    'week_summary': (f"이번 주<br>8계좌 농사 <b>{ev['week']['pnl_txt']}원</b>", "이번 주 농사 결산.", None,
                 [("이번 주", "이번", 110, None), (f"{ev['week']['pnl_txt']}원", "결산.", 124, 'gold' if ev['week'].get('pnl', 0) >= 0 else 'red')], 'clipboard_check'),
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
T_CHIP = 1.3; T_RANK = T_CHIP + 0.38 * len(trades) + 0.2
HARVEST_HOLD = round(T_RANK + 0.3 * len(badges) + 0.8, 1)
RUN = 2.8; T_GAP = 0.1 + RUN + 0.2; RACE_HOLD = round(T_GAP + 1.0, 1)
mood_a, mood_b = ('drive', 'up') if up else ('soft', 'soft')

scenes = [
    {"type": "stage", "lines": [hook_line], "min_dur": 2.6,
     "props": {"lines": [{"text": t, "at": a, "size": s, **({"color": c} if c else {})} for t, a, s, c in hook_lines], "y": 600},
     "actors": [{"id": hook_actor, "x": 540, "y": 1390, "h": 430, "enter": "drop", "at": 0, "anim": "bounce" if up else "wobble",
                 "react": [{"anim": "jump" if up else "shake", "at": hook_lines[-1][1]}]}],
     "fx": ([{"type": "coins", "at": hook_lines[-1][1], "n": 30}, {"type": "confetti", "at": hook_lines[-1][1]}] if up else
            [{"type": "tint", "color": "rgba(10,16,40,.4)", "at": 0}, {"type": "rain", "at": 0, "n": 140},
             {"type": "lightning", "hits": [{"at": hook_lines[-1][1]}]}])},
    {"type": "custom", "lines": [], "hold": HARVEST_HOLD, "music": mood_a,
     "props": {"script_file": "harvest.js",
               "data": {"title_v": f"{md} 농사일지", "subtitle": "KODEX 레버리지 · 코스닥150 레버리지", "pnl": pnl_full,
                        "sub": f"하루 수익률 {day['ret_pct']:+.2f}%", "trades": trades, "badges": badges, "up": day['pnl'] >= 0},
               "cues": {"start": {"at": 0.05}, "chips": {"at": T_CHIP}, "rank": {"at": T_RANK}}},
     "sfx": [{"at": 0, "sound": "whoosh"}, {"at": 0.05, "sound": "ticks", "dur": 1.0}, {"at": 1.05, "sound": "hit" if up else "thud", "big": False},
             {"at": T_CHIP, "offset": 0.15, "sound": "coin" if nh else "pop", "repeat": len(trades), "every": 0.45},
             {"at": T_RANK, "offset": 0.1, "sound": "win" if up else "thud"}]},
    {"type": "custom", "lines": [], "hold": RACE_HOLD, "music": mood_b,
     "props": {"script_file": "race.js",
               "data": {"title_v": "2026 코스피와 달리기", "subtitle": "누적 수익률 · 좌수법(NAV) 기준", "series": ev['race'], "run": RUN,
                        "from": "1/1", "to": md},
               "cues": {"start": {"at": 0.1}, "gap": {"at": T_GAP}}},
     "sfx": [{"at": 0, "sound": "whoosh"}, {"at": 0.1, "sound": "riser"}, {"at": T_GAP, "sound": "win" if ev['ytd']['gap'] > 0 else "sparkle"}]},
]

# ── 대시보드 장면들 (대사 없음 — 화면이 보여준다) ──
F, C, R, TR = ev['field'], ev['calendar'], ev['records'], ev['trophies']
acts = sum(1 for s_ in 'KQ' for x in F[s_] if x['t'])
ACT = 1.3; FIELD_HOLD = round(ACT + 0.35 * acts + 0.3 + 0.8, 1)
field_sc = {"type": "custom", "lines": [], "hold": FIELD_HOLD, "music": mood_a,
    "props": {"script_file": "field.js",
              "data": {"title_v": "🌾 8계좌 밭", "subtitle": f"평단 대비 수익률 · {md} 종가", "K": F['K'], "Q": F['Q']},
              "cues": {"start": {"at": 0.05}, "act": {"at": ACT}}},
    "sfx": [{"at": 0, "sound": "whoosh"}, {"at": 0.1, "sound": "pop", "repeat": 8, "every": 0.12, "db": -16}]
         + ([{"at": ACT, "offset": 0.15, "sound": "coin", "repeat": acts, "every": 0.4}] if acts else [])}
n_cal = len(C['days']); FILL = 2.0
cal_sc = {"type": "custom", "lines": [], "hold": round(0.1 + FILL + 1.0, 1), "music": mood_b,
    "props": {"script_file": "calendar.js",
              "data": {"title_v": "📅 최근 4주 밭 달력", "subtitle": "빨강 수익 · 파랑 손실 · 오늘은 금테", "from": C['from'], "to": C['to'],
                       "today": C['today'], "best_d": C['best_d'], "days": C['days'], "fill": FILL, "total_label": "4주 누적"},
              "cues": {"start": {"at": 0.1}, "best": {"at": 0.1 + FILL}}},
    "sfx": [{"at": 0, "sound": "whoosh"}, {"at": 0.1, "sound": "ticks", "dur": FILL}, {"at": 0.1 + FILL, "sound": "sparkle"}]}
rec_sc = {"type": "custom", "lines": [], "hold": 3.3, "music": mood_a,
    "props": {"script_file": "records.js",
              "data": dict(R, title_v="📊 기록실", subtitle=f"2026 거래일 {day['n_traded']}일 기준"),
              "cues": {"start": {"at": 0.05}, "cards": {"at": 1.0}}},
    "sfx": [{"at": 0, "sound": "whoosh"}, {"at": 0.05, "sound": "up"}, {"at": 1.0, "sound": "check", "repeat": 4, "every": 0.25}]
         + ([{"at": 1.4, "sound": "hit"}] if R['best']['today'] else [])}
got = sum(1 for x in TR if x['ok']); has_new = any(x['new'] for x in TR)
T_SPOT = round(0.05 + len(TR) * 0.1 + 0.3, 2)
tro_sc = {"type": "custom", "lines": [], "hold": round(T_SPOT + (1.4 if has_new else 0.9), 1), "music": 'up' if up else 'soft',
    "props": {"script_file": "trophy.js",
              "data": {"title_v": "🏆 업적 진열장", "subtitle": f"{len(TR)}개 중 {got}개 획득", "items": TR},
              "cues": {"start": {"at": 0.05}, "spot": {"at": T_SPOT}}},
    "sfx": [{"at": 0, "sound": "whoosh"}, {"at": 0.05, "sound": "pop", "repeat": len(TR), "every": 0.1, "db": -15}]
         + ([{"at": T_SPOT, "sound": "win"}, {"at": T_SPOT + 0.2, "sound": "sparkle"}] if has_new else [{"at": T_SPOT - 0.2, "sound": "sparkle"}])}
hook_sc, log_sc, race_sc = scenes

# ── 구석 쿼카: 장면마다 다른 포즈·말풍선으로 리액션 (왼쪽 아래, 오른쪽 x>960 은 쇼츠 버튼 구역이라 피함) ──
def buddy(sc, up_id, down_id, up_txt, down_txt, at, react='jump'):
    sc.setdefault('actors', []).append({"id": up_id if up else down_id, "x": 140, "y": 1580, "h": 200,
        "enter": "left", "at": 0.05, "anim": "bounce" if up else "idle",
        "react": [{"anim": react if up else 'shake', "at": at}]})   # 말풍선은 대시보드 숫자를 가려서 쓰지 않음
buddy(log_sc, 'calculator_happy', 'sad_red_chart', '오늘 정산!', '아야…', T_CHIP)
buddy(field_sc, 'pose_planting_coin', 'watering_dca', '밭 점검!', '물 줘야지', ACT)
buddy(cal_sc, 'pointer_explain', 'pointer_explain', '빨강 많다!', '파랑이 많네', round(0.1 + FILL, 2), 'grow')
buddy(rec_sc, 'magnifier_phone', 'magnifier_phone', '기록 보자', '버티는 중', 1.0)
buddy(tro_sc, 'pose_trophy_cheer', 'pose_chest_cheer', '진열장!', '언젠가 다 딴다', T_SPOT)
buddy(race_sc, 'pose_rocket_ride', 'umbrella_shield', '코스피 나와!', '버틴다', T_GAP)
# 상승일엔 포인트 순간에 폭죽·동전
if up:
    race_sc.setdefault('fx', []).append({"type": "coins", "at": T_GAP, "n": 18})
    if has_new: tro_sc.setdefault('fx', []).append({"type": "confetti", "at": T_SPOT})
body = [log_sc, field_sc, cal_sc, rec_sc, tro_sc, race_sc]
focus = {'achievement': tro_sc, 'ath': race_sc, 'chain_harvest': field_sc, 'acc8_add': field_sc, 'acc8_cut': field_sc,
         'ret_milestone': race_sc, 'beat_kospi': race_sc, 'drawdown': race_sc, 'streak': rec_sc, 'comeback': cal_sc,
         'chain_seed': field_sc, 'week_summary': cal_sc}.get(key)
if focus is not None:
    body.remove(focus); body.insert(0, focus)
scenes = [hook_sc] + [b for b in body if (WORK / b['props']['script_file']).exists()]

end_line = ({"who": "A", "text": "-5%마다 심고, -15%면 정리.", "tts": "마이너스5퍼센트마다 심고, 마이너스15퍼센트면 정리."},
            [{"text": "-5%마다 심고", "at": "심고,", "size": 92, "color": "gold"}, {"text": "-15%면 정리", "at": "정리.", "size": 92, "color": "red"}]) \
    if key in ('acc8_add', 'acc8_cut', 'drawdown', 'chain_seed') else \
           ({"who": "A", "text": "내리면 심고, 오르면 거둔다."},
            [{"text": "내리면 심고", "at": "내리면", "size": 92}, {"text": "오르면 거둔다", "at": "오르면", "color": "gold", "size": 104}])
scenes.append({"type": "title", "lines": [end_line[0]], "min_dur": 2.6,
               "props": {"asset": "field_sowing_walk", "focus": [50, 35], "lines": end_line[1],
                         "sub": {"text": "8계좌 규칙 · 매일 매매일지는 고정댓글", "at": end_line[1][-1]["at"]}}})

thumb_main = day['pnl_txt'] if key in ('big_day', 'storm_day') else {'top_day': f"{day['rank']}위", 'ath': '신고점', 'chain_harvest': f"{day['harvest_n']}계좌 수확",
              'achievement': '업적 달성', 'acc8_add': '-5%', 'acc8_cut': '-15%',
              'ret_milestone': f"+{E.get('n', 0)}%", 'streak': f"{E.get('n', 0)}연승", 'comeback': '반등',
              'beat_kospi': f"{day['ret_pct']:+.1f}%", 'drawdown': f"{E.get('n', 0)}%", 'chain_seed': f"{E.get('n', 0)}계좌 파종",
              'week_summary': ev['week']['pnl_txt']}[key]
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
