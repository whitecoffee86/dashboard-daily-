# 이벤트 쇼츠 키트 (물리엔진판, 2026-11-13)

평일 저녁 예약 작업 '농사 이벤트 쇼츠'가 쓰는 도구. 그날 매매를 보고 장면 하나를 골라 세로 쇼츠(10~15초, 음성 없음)를 만든다.

| 장면 | 언제 | 무엇이 보이나 |
|---|---|---|
| water 물타기 | N번 새로 심고 N-1번에 더 산 날, 또는 8번 −5% 추가 | 금화를 부으면 물통 수면이 올라 구슬이 넘쳐 핀볼판으로 → '본전까지 올라야 하는 폭' 칸에 떨어짐. 새 씨앗은 0%대 |
| bean 수확 | 수익으로 판 날 | 흐린 날 → 해 뜸 → 콩나무가 수익률 높이만큼 자라고 금화 열매가 바구니로. 지난 최고 종, 다음 밭 연쇄 판정 |
| sink 손절 | 8번 −15% 정리한 날 | 날씨(지수)에 씨앗이 오르내리고 물타기 날은 물뿌리개, 마지막 날 정리선 지층이 무너짐 |

영상 없음: 8번만 다시 심은 날, 매매 없는 날, 장면에 안 맞는 날(plan.py 종료코드 3).
시장: 코스피(KODEX 레버리지) 우선, 코스피에 장면이 없고 코스닥에 수확·손절이 있을 때만 코스닥150 레버리지.
빈도: 같은 주 최대 2편, 손절은 같은 주 1편, 같은 장면 종류는 3일 안에 반복하지 않음(작업 로그 기준).
원화 금액·잔고·총자산은 어디에도 넣지 않는다.

## 순서
```bash
cd shorts_kit && npm install --no-audit --no-fund          # matter-js 0.19
python3 engine_patch.py <whitecoffee-video 스킬 scripts 폴더> /tmp/eng_nv   # 엔진 사본 + 음성 없음 패치 + /tmp/assets 링크
python3 plan.py ../data [YYYY-MM-DD] --out $WORK/plan.json --log <작업 로그 사본>   # 0=만듦, 3=안 만듦
bash make_short.sh $WORK /tmp/eng_nv      # build → tts/render/audio/assemble → finish
```
결과: `$WORK/<slug>-final.mp4`(BGM+효과음), `<slug>_thumb.png`, `<slug>_kit.md`(제목·설명·해시태그·고정댓글), `check_sheet.jpg`(확인용 프레임).

## 파일
- plan.py — 매매 감지·장면 선택·숫자 계산(daily.json 의 평단 변화로 심기/더 심기/팔기 판단, 수익률 = 종가/평단 − 1)
- sim/*.js — matter-js 물리(핀볼 궤적은 실제 칸에 떨어질 때까지 탐색)
- scenes/*_r.js — 엔진 custom 장면(물리 기록 재생)
- build.py · fx.py — storyboard·업로드 키트·효과음(fx.wav)
- finish.py — 엔진 결과에 효과음 섞기, 프레임 시트·썸네일
- sfx/ — Kenney Interface Sounds (CC0, LICENSE_kenney.txt)
