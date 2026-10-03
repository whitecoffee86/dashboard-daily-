// 대시보드 '업적 진열장' — 12개 배지가 차례로 켜지고(잠긴 건 회색 + 진행 막대), 새 업적은 스포트라이트
// props.data = {items:[{ic,n,ok,v,p,new}...12], title_v, subtitle}
// props.cues = {start, spot}
heading((vertical && P.title_v) || P.title || '업적 진열장', P.subtitle);
const V = vertical, GOLD = '#e8c86a';
const COLS = V ? 3 : 4, CW = V ? 282 : 330, CH = V ? 150 : 150, GX = 14, GY = 14;
const W0 = COLS * CW + (COLS - 1) * GX, X0 = (V ? 540 : 960) - W0 / 2 - (V ? 30 : 0), Y0 = V ? 700 : 250;
const items = (P.items || []).map((a, i) => {
  const x = X0 + (i % COLS) * (CW + GX), y = Y0 + Math.floor(i / COLS) * (CH + GY);
  const c = el('div', 'abs', '');
  c.style.cssText += `left:${x}px;top:${y}px;width:${CW}px;height:${CH}px;border-radius:22px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
    background:${a.ok ? 'linear-gradient(180deg,rgba(232,200,106,.20),rgba(232,200,106,.05))' : 'rgba(255,255,255,.04)'};
    border:2px solid ${a.ok ? 'rgba(232,200,106,.55)' : 'rgba(255,255,255,.08)'}`;
  const ic = el('div', '', a.ic, c); ic.style.cssText = `font-size:50px;line-height:1.05;${a.ok ? '' : 'filter:grayscale(1);opacity:.35'}`;
  const nm = el('div', '', a.n, c); nm.style.cssText = `font-size:29px;font-weight:900;color:${a.ok ? '#fff3cf' : 'rgba(243,245,250,.42)'};white-space:nowrap`;
  const v = el('div', '', a.v, c); v.style.cssText = `font-size:22px;font-weight:700;color:${a.ok ? GOLD : 'rgba(159,176,207,.6)'};white-space:nowrap;font-variant-numeric:tabular-nums`;
  let bar = null;
  if (!a.ok) {
    const bg = el('div', 'abs', '', c); bg.style.cssText += `left:22px;right:22px;bottom:12px;height:6px;border-radius:6px;background:rgba(255,255,255,.08)`;
    bar = el('div', '', '', bg); bar.style.cssText = `height:100%;width:0;border-radius:6px;background:#9fb0cf`;
  }
  let rib = null;
  if (a.new) {
    rib = el('div', 'abs', 'NEW'); rib.style.cssText += `left:${x + CW - 18}px;top:${y - 16}px;transform:translateX(-100%);padding:4px 14px;border-radius:999px;background:#ff6f61;color:#fff;font-size:24px;font-weight:900;opacity:0;z-index:3`;
  }
  return {c, bar, rib, a, i};
});
const T0 = at('start', .25), TS = at('spot', T0 + items.length * .13 + .5);
const anyNew = items.some(x => x.a.new);
return t => {
  items.forEach(x => {
    const q = prog(t, T0 + x.i * .13, .4);
    let s = .6 + .4 * back(q, 2);
    x.c.style.opacity = clamp(q * 2.5);
    if (x.bar) x.bar.style.width = (x.a.p * 100 * eo(prog(t, T0 + x.i * .13 + .3, .6))).toFixed(1) + '%';
    if (anyNew) {
      const sp = eo(prog(t, TS, .5));
      if (x.a.new) {
        s *= 1 + .14 * sp;
        x.c.style.boxShadow = sp > 0 ? `0 0 ${24 + 26 * pulse(t, 2.2)}px rgba(232,200,106,.85)` : 'none';
        x.c.style.zIndex = 2;
        { const k = prog(t, TS + .15, .35); x.rib.style.opacity = clamp(k * 3); x.rib.style.transform = `translateX(-100%) scale(${.6 + .4 * back(k, 2.5)})`; }
      } else x.c.style.filter = `brightness(${1 - .45 * sp})`;
    } else if (x.a.ok) {
      const w = prog(t, T0 + items.length * .13 + .2 + x.i * .05, .5);   // 획득한 배지에 반짝임이 한 번 훑고 지나감
      x.c.style.boxShadow = w > 0 && w < 1 ? `0 0 ${30 * Math.sin(w * Math.PI)}px rgba(232,200,106,.7)` : 'none';
    }
    x.c.style.transform = `scale(${s})`;
  });
};
