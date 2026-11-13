#!/bin/bash
# 이벤트 쇼츠 한 편 만들기(plan.json → 최종 mp4). 사용: bash make_short.sh <WORK> <무음 패치 엔진 폴더>
#   WORK 에 plan.json 이 있어야 한다(plan.py --out $WORK/plan.json). 엔진은 engine_patch.py 로 만든다.
set -euo pipefail
W=$(cd "$1" && pwd); ENG=$2; KIT=$(cd "$(dirname "$0")" && pwd)
python3 "$KIT/build.py" "$W/plan.json" "$W"
cd "$ENG"; export WCV_NO_VOICE=1
python3 wcv.py tts "$W/storyboard.json" "$W" | tail -2
for i in 1 2 3 4 5; do
  out=$(python3 wcv.py render "$W" --budget 240 2>&1 | tail -3); echo "$out"
  echo "$out" | grep -q "남은 장면: 0" && break
done
echo "$out" | grep -q "남은 장면: 0" || { echo "RENDER 미완료"; exit 1; }
python3 wcv.py audio "$W" | tail -1
python3 wcv.py assemble "$W" | tail -1
python3 "$KIT/finish.py" "$W"
