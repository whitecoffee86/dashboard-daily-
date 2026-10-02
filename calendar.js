// 대시보드 '매일의 밭 달력' — 한 달 거래일 칸이 하루씩 수익(빨강)/손실(파랑)으로 물들고, 누적 손익이 따라 올라감
// props.data = {month:"2026-09", days:[{d,pnl,txt}...], title, title_v, subtitle, best_d, worst_d}
// props.cues = {start, best, total}
heading((vertical && P.title_v) || P.title || '매일의 밭 달력', P.subtitle);
const V = vertical, days = P.days, ym = P.month;
const y0 = +ym.slice(0, 4), m0 = +ym.slice(5, 7) - 1;
const nDays = new Date(y0, m0 + 1, 0).getDate();
const map = {}; days.forEach(r => map[r.d] = r);
const absMax = Math.max(1, ...days.map(r => Math.abs(r.pnl)));
const G = V ? {x: 120, y: 880, cw: 140, ch: 92, gap: 12} : {x: 260, y: 380, cw: 168, ch: 96, gap: 14};
const WD = ['월', '화', '수', '목', '금'];
WD.forEach((w, i) => { const e = el('div', 'abs', w); e.style.cssText += `left:${G.x + i * (G.cw + G.gap)}px;top:${G.y - 52}px;width:${G.cw}px;text-align:center;font-size:${V ? 30 : 30}px;color:#7f8dab;font-weight:700`; });
let row = 0, started = false; const cells = [];
for (let dd = 1; dd <= nDays; dd++) {
  const dt = new Date(y0, m0, dd), w = dt.getDay(); if (w === 0 || w === 6) continue;
  if (started && w === 1) row++;
  started = true;
  const ds = `${ym}-${String(dd).padStart(2, '0')}`, r = map[ds];
  const c = el('div', 'abs', `<b>${dd}</b>${r ? `<span>${r.txt}</span>` : ''}`);
  c.style.cssText += `left:${G.x + (w - 1) * (G.cw + G.gap)}px;top:${G.y + row * (G.ch + G.gap)}px;width:${G.cw}px;height:${G.ch}px;border-radius:16px;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;background:rgba(255,255,255,.05);color:rgba(243,245,250,.55)`;
  c.querySelector('b').style.cssText = `font-size:${V ? 30 : 32}px;font-weight:800`;
  const sp = c.querySelector('span'); if (sp) sp.style.cssText = `font-size:${V ? 24 : 24}px;font-weight:800;color:#f3f5fa;opacity:0`;
  cells.push({c, r, sp, ds});
}
const rows = row + 1;
const tot = el('div', 'abs', ''); tot.style.cssText += V
  ? `left:${G.x}px;top:${G.y - 160}px;font-size:56px;font-weight:900;white-space:nowrap`
  : `left:${G.x + 5 * (G.cw + G.gap) + 40}px;top:${G.y + 10}px;font-size:64px;font-weight:900;white-space:nowrap`;
const totL = el('div', 'abs', P.total_label || '이번 달 누적'); totL.style.cssText += V
  ? `left:${G.x + 470}px;top:${G.y - 140}px;font-size:30px;color:#9fb0cf;font-weight:700`
  : `left:${G.x + 5 * (G.cw + G.gap) + 44}px;top:${G.y - 36}px;font-size:32px;color:#9fb0cf;font-weight:700`;
const filled = cells.filter(x => x.r);
const T0 = at('start', .4), STEP = Math.min(.22, (P.fill || 4.4) / Math.max(1, filled.length));
const won = v => { const a = Math.abs(v), s = v < 0 ? '−' : '+'; return a >= 1e8 ? `${s}${(a / 1e8).toFixed(2)}억` : `${s}${Math.round(a / 1e4).toLocaleString()}만`; };
return t => {
  let sum = 0;
  filled.forEach((x, i) => {
    const q = prog(t, T0 + i * STEP, .35);
    if (q > 0) sum += x.r.pnl * eo(q);
    const a = .18 + .82 * Math.min(1, Math.abs(x.r.pnl) / absMax);
    const col = x.r.pnl >= 0 ? `rgba(255,111,97,${(a * eo(q)).toFixed(3)})` : `rgba(90,150,255,${(a * eo(q)).toFixed(3)})`;
    x.c.style.background = q > 0 ? col : 'rgba(255,255,255,.05)';
    x.c.style.transform = `scale(${q > 0 && q < 1 ? 1 + .12 * Math.sin(q * Math.PI) : 1})`;
    x.c.style.color = q > .5 ? '#fff' : 'rgba(243,245,250,.55)';
    if (x.sp) x.sp.style.opacity = eo(prog(t, T0 + i * STEP + .2, .3));
    const hot = (x.ds === P.best_d && t > at('best', 99)) || (x.ds === P.worst_d && t > at('worst', 99));
    x.c.style.outline = hot ? `4px solid ${x.ds === P.best_d ? '#e8c86a' : '#9fb0cf'}` : 'none';
    x.c.style.boxShadow = hot ? `0 0 ${20 + 14 * pulse(t, 3)}px rgba(232,200,106,.6)` : 'none';
  });
  tot.textContent = won(sum); tot.style.color = sum >= 0 ? '#ff8a7a' : '#7fb0ff';
  appear(tot, prog(t, T0, .4), 10); appear(totL, prog(t, T0, .4), 10);
};
