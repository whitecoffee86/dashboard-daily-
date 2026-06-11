"""
_단기투자_.xlsx 의 INPUT 시트를 읽어서
data/daily.json, data/accounts.json, data/monthly.json 을 갱신한다.
 
NAV 계산 공식 (엑셀 역추적으로 검증 완료):
  - 좌수 변동 = io / 전일NAV  (첫날은 io / 1000)
  - NAV = 기말자산 / 좌수
  - 일별수익률 = (NAV - 전일NAV) / 전일NAV
"""
import json, sys
from pathlib import Path
import pandas as pd
 
EXCEL_PATH = Path('_단기투자_INPUT.xlsx')
DATA_DIR   = Path('data')
KOSPI_BASE = 4214.17    # 2026-01-01 기준값
NAV_BASE   = 1000.0
GOAL       = 100_000_000
 
LIFE_ITEMS = [
    {'name': '생활비', 'target': 3_500_000},
    {'name': '월세',   'target': 1_500_000},
    {'name': '식비',   'target': 1_100_000},
    {'name': '관리비', 'target':   400_000},
    {'name': '교통비', 'target':   300_000},
    {'name': '통신비', 'target':   200_000},
    {'name': '적금',   'target': 3_000_000},
]
 
def load_input(path: Path) -> pd.DataFrame:
    df = pd.read_excel(path, sheet_name='INPUT', header=2)
    df.columns = ['date','end','io','kospi','realized',
                  'acc1','acc2','acc3','acc4','acc5','acc6','acc7','acc8']
    df = df[pd.to_datetime(df['date'], errors='coerce').notna()].copy()
    df['date'] = pd.to_datetime(df['date']).dt.strftime('%Y-%m-%d')
    for col in df.columns[1:]:
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
    return df.reset_index(drop=True)
 
def calc_nav_series(df: pd.DataFrame) -> list:
    """
    NAV = 기말자산 / 좌수
    좌수 변동 = io / 전일NAV  (첫날: io / NAV_BASE)
    """
    shares   = 0.0
    prev_nav = NAV_BASE
    rows     = []
 
    for i, r in df.iterrows():
        end  = int(r['end'])
        io   = int(r['io'])
        kp   = float(r['kospi'])
        real = int(r['realized'])
 
        # 좌수 업데이트
        if i == 0:
            shares += io / NAV_BASE
        elif io != 0:
            shares += io / prev_nav
 
        nav   = round(end / shares, 6) if shares != 0 else prev_nav
        ret   = round((nav / NAV_BASE - 1) * 100, 4)
        kospi = round((kp - KOSPI_BASE) / KOSPI_BASE * 100, 4)
 
        # 당일손익 (첫날은 초기 입금이므로 0)
        prev_end = rows[-1]['end'] if rows else end
        pnl = 0 if i == 0 else end - prev_end - io
 
        rows.append({
            'd':        r['date'],
            'end':      end,
            'io':       io if io != 0 else None,
            'pnl':      pnl,
            'realized': real,
            'nav':      nav,
            'shares':   round(shares, 6),
            'ret':      ret,
            'kospi':    kospi,
            'kospiVal': kp,
        })
        prev_nav = nav
 
    return rows
 
def build_monthly(rows: list) -> dict:
    from collections import defaultdict
    # 1~5월 확정 실현손익 (월수익 시트 고정값)
    monthly = defaultdict(int, {
        '2026-01': 7215472,
        '2026-02': 6907829,
        '2026-03': 7159542,
        '2026-04': 13471723,
        '2026-05': 14703327,
    })
    for r in rows:
        ym = r['d'][:7]
        if ym >= '2026-06':  # 6월 이후만 INPUT 시트에서 집계
            monthly[ym] += r['realized']
 
    # 이달 생활비 충당 계산
    this_month = max(monthly.keys()) if monthly else ''
    total      = max(monthly.get(this_month, 0), 0)
    remaining  = total
    items = []
    for item in LIFE_ITEMS:
        actual    = min(remaining, item['target'])
        remaining = max(0, remaining - item['target'])
        items.append({**item, 'actual': actual})
 
    return {
        'goal':    GOAL,
        'items':   items,
        'monthly': {k: v for k, v in sorted(monthly.items())},
    }
 
def build_accounts(df: pd.DataFrame) -> list:
    last = df.iloc[-1]
    return [{'name': f'{i+1}계좌', 'balance': int(last[f'acc{i+1}'])} for i in range(8)]
 
def main():
    if not EXCEL_PATH.exists():
        print(f'ERROR: {EXCEL_PATH} 없음', file=sys.stderr); sys.exit(1)
 
    DATA_DIR.mkdir(exist_ok=True)
    print(f'📂 {EXCEL_PATH} 읽는 중...')
 
    df       = load_input(EXCEL_PATH)
    print(f'   INPUT 시트: {len(df)}행')
 
    daily    = calc_nav_series(df)
    accounts = build_accounts(df)
    monthly  = build_monthly(daily)
 
    (DATA_DIR / 'daily.json').write_text(
        json.dumps(daily, ensure_ascii=False, separators=(',', ':')))
    (DATA_DIR / 'accounts.json').write_text(
        json.dumps(accounts, ensure_ascii=False, separators=(',', ':')))
    (DATA_DIR / 'monthly.json').write_text(
        json.dumps(monthly, ensure_ascii=False, separators=(',', ':')))
 
    print(f'✅ data/ 갱신 완료')
    m    = monthly['monthly']
    last = max(m.keys()) if m else '-'
    print(f'   daily.json    : {len(daily)}개 항목, 마지막={daily[-1]["d"]}')
    print(f'   accounts.json : 총 {sum(a["balance"] for a in accounts):,}원')
    print(f'   monthly.json  : {last} 실현 {m.get(last, 0):+,}원')
 
if __name__ == '__main__':
    main()
