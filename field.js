// 대시보드 '8칸 밭' — 코스피·코스닥 8계좌가 흙칸으로 깔리고, 작물이 자라고, 오늘 수확한 칸은 바구니가 튀어나옴
// props.data = {K:[{n,on,ret,t}...8], Q:[...8], title_v, subtitle}
//   on=보유 여부, ret=평단 대비 %(없으면 null), t=오늘 매매(seed|add|harvest|adj|null)
// props.cues = {start, act, sum}
heading((vertical && P.title_v) || P.title || '8계좌 밭', P.subtitle);
const V = vertical;
const O = V ? {x: 70, y: 690} : {x: 300, y: 210};
const CW = V ? 205 : 300, CH = V ? 118 : 120, GX = 14, GY = 12;
const BLOCK = 2 * CH + GY + 58;                  // 블록 하나(제목 + 2줄)
const UP = '#ff7a6b', DN = '#6aa8ff', GOLD = '#e8c86a', GREEN = '#5fd69a';
const crop = r => r == null ? '🌾' : r >= 0.3 ? '🌽' : r >= -10 ? '🌿' : '🌱';   // 익음 · 자라는 중 · 새싹(깊이 물림)
const cells = [];
[['K', '🐂 코스피 · KODEX 레버리지'], ['Q', '🐎 코스닥 · 코스닥150 레버리지']].forEach(([s, lab], b) => {
  const bx = V ? O.x : O.x + b * (4 * CW + 3 * GX + 60) * 0, by = O.y + b * (BLOCK + (V ? 22 : 10));
  const h = el('div', 'abs', lab); h.style.cssText += `left:${bx}px;top:${by}px;font-size:${V ? 32 : 30}px;font-weight:800;color:#dfe6f5;white-space:nowrap`;
  const cnt = (P[s] || []).filter(x => x.on).length;
  const hc = el('div', 'abs', `<b style="color:${GOLD}">${cnt}</b>/8 보유`); hc.style.cssText += `left:${bx + 4 * CW + 3 * GX}px;top:${by + 4}px;transform:translateX(-100%);font-size:28px;color:#9fb0cf;font-weight:700;white-space:nowrap`;
  (P[s] || []).forEach((a, j) => {
    const x = bx + (j % 4) * (CW + GX), y = by + 52 + Math.floor(j / 4) * (CH + GY);
    const c = el('div', 'abs', '');
    c.style.cssText += `left:${x}px;top:${y}px;width:${CW}px;height:${CH}px;border-radius:20px;overflow:hidden;
      background:${a.on ? 'linear-gradient(180deg,rgba(120,84,52,.55),rgba(76,52,32,.75))' : 'rgba(255,255,255,.05)'};
      border:2px solid ${a.on ? 'rgba(232,200,106,.28)' : 'rgba(255,255,255,.08)'}`;
    const no = el('div', 'abs', `${a.n}`, c); no.style.cssText += `left:14px;top:8px;font-size:26px;font-weight:900;color:${a.on ? '#f3e2c0' : 'rgba(243,245,250,.35)'}`;
    const em = el('div', 'abs', a.on ? crop(a.ret) : '', c); em.style.cssText += `left:${CW * .3}px;top:${CH / 2 + 4}px;font-size:${V ? 54 : 58}px;line-height:1;transform:translate(-50%,-50%)`;
    const rt = el('div', 'abs', a.on && a.ret != null ? `${a.ret >= 0 ? '+' : ''}${a.ret.toFixed(1)}%` : (a.on || a.t ? '' : '빈칸'), c);
    rt.style.cssText += `right:12px;bottom:8px;font-size:${a.on ? 26 : 24}px;font-weight:800;color:${a.on ? (a.ret >= 0 ? UP : DN) : 'rgba(243,245,250,.3)'};font-variant-numeric:tabular-nums`;
    // 오늘 매매 연출용
    let fx = null, tag = null;
    if (a.t) {
      const ic = {harvest: '🧺', seed: '🌱', add: '💧', adj: '🔧'}[a.t] || '✨';
      const word = {harvest: '수확!', seed: '파종!', add: '추가!', adj: '조정'}[a.t] || '';
      const col = a.t === 'harvest' ? GOLD : GREEN;
      fx = el('div', 'abs', ic, c); fx.style.cssText += `left:${CW / 2}px;top:${CH / 2 - 4}px;font-size:66px;line-height:1;transform:translate(-50%,-50%) scale(0);`;
      tag = el('div', 'abs', word); tag.style.cssText += `left:${x + CW / 2}px;top:${y + CH - 40}px;transform:translateX(-50%);padding:4px 16px;border-radius:999px;font-size:28px;font-weight:900;
        color:#0b1430;background:${col};box-shadow:0 6px 20px rgba(0,0,0,.4);white-space:nowrap;opacity:0;z-index:3`;
      c.dataset.col = col;
    }
    cells.push({c, em, rt, fx, tag, a, k: cells.length});
  });
});
const acts = cells.filter(x => x.a.t);
const T0 = at('start', .25), TA = at('act', 2.0), TS = at('sum', TA + .5 + acts.length * .4);
const nOn = cells.filter(x => x.a.on).length;
const sum = el('div', 'abs', P.summary || `보유 ${nOn}칸 · 빈칸 ${16 - nOn}칸`);
sum.style.cssText += `left:${V ? 540 : 960}px;top:${O.y + 2 * BLOCK + (V ? 44 : 30)}px;transform:translateX(-50%);font-size:${V ? 34 : 34}px;font-weight:800;color:#9fb0cf;white-space:nowrap`;
return t => {
  cells.forEach(x => {
    const q = prog(t, T0 + x.k * .07, .4);
    x.c.style.opacity = clamp(q * 2);
    x.c.style.transform = `translateY(${(1 - eo(q)) * 40}px)`;
    const g = prog(t, T0 + .5 + x.k * .07, .5);
    x.em.style.transform = `translate(-50%,-50%) scale(${x.a.on ? back(g, 2.2) : 0})`;
    x.rt.style.opacity = eo(prog(t, T0 + .8 + x.k * .07, .3));
  });
  acts.forEach((x, i) => {
    const q = prog(t, TA + i * .4, .55);
    const harvest = x.a.t === 'harvest';
    if (harvest) {           // 작물이 위로 뽑혀 나가고 바구니가 튀어나옴
      if (q > 0) x.em.textContent = crop(null);
      x.em.style.opacity = q > 0 ? 1 - eo(q) : (x.a.on ? 1 : 0);
      x.em.style.transform = `translate(-50%,${-50 - 120 * eo(q)}%) scale(${q > 0 ? 1 : 0})`;
    }
    x.fx.style.transform = `translate(-50%,-50%) scale(${back(prog(t, TA + i * .4 + .15, .45), 2.6)})`;
    x.tag.style.opacity = clamp(prog(t, TA + i * .4 + .2, .25) * 2);
    x.tag.style.transform = `translateX(-50%) translateY(${(1 - eo(prog(t, TA + i * .4 + .2, .4))) * 20}px)`;
    const glow = q > 0 ? .5 + .5 * pulse(t, 2.4) : 0;
    x.c.style.boxShadow = q > 0 ? `0 0 ${18 + 22 * glow}px ${x.c.dataset.col}` : 'none';
    x.c.style.borderColor = q > 0 ? x.c.dataset.col : '';
  });
  appear(sum, prog(t, TS, .45), 16);
};
