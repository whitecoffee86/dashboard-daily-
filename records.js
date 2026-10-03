// 대시보드 '기록실' — 승패 막대가 차오르고 승률이 카운트업, 기록 카드 4장이 찍힘. 오늘이 기록이면 NEW 도장
// props.data = {win_days, loss_days, win_rate, best:{d,txt,today}, worst:{d,txt,today}, longw, streak, pf, title_v, subtitle}
// props.cues = {start, cards}
heading((vertical && P.title_v) || P.title || '기록실', P.subtitle);
const V = vertical, UP = '#ff7a6b', DN = '#6aa8ff', GOLD = '#e8c86a';
const X0 = V ? 80 : 360, W = V ? 860 : 1200, Y0 = V ? 700 : 230;
const md = d => `${+d.slice(5, 7)}/${+d.slice(8, 10)}`;
// 승패
const wl = el('div', 'abs', ''); wl.style.cssText += `left:${X0}px;top:${Y0}px;width:${W}px;display:flex;justify-content:space-between;align-items:flex-end;font-weight:900`;
const lw = el('span', '', `<span style="font-size:34px;color:${UP}">수익 ${P.win_days}일</span>`, wl);
const rate = el('span', '', '', wl); rate.style.cssText = `font-size:${V ? 84 : 90}px;color:#fff;font-variant-numeric:tabular-nums;line-height:1`;
const ll = el('span', '', `<span style="font-size:34px;color:${DN}">손실 ${P.loss_days}일</span>`, wl);
const barBg = el('div', 'abs', ''); barBg.style.cssText += `left:${X0}px;top:${Y0 + 112}px;width:${W}px;height:34px;border-radius:17px;overflow:hidden;background:rgba(255,255,255,.06);display:flex`;
const tot = Math.max(1, P.win_days + P.loss_days);
const bw = el('div', '', '', barBg); bw.style.cssText = `height:100%;width:0;background:${UP}`;
const gapEl = el('div', '', '', barBg); gapEl.style.cssText = 'flex:1';
const bl = el('div', '', '', barBg); bl.style.cssText = `height:100%;width:0;background:${DN}`;
// 카드 4장
const cards = [
  {lab: `🏆 최고의 날 · ${md(P.best.d)}`, val: P.best.txt, col: UP, isNew: P.best.today},
  {lab: `🌧 최악의 날 · ${md(P.worst.d)}`, val: P.worst.txt, col: DN, isNew: P.worst.today},
  {lab: '🔥 최장 연승', val: `${P.longw}연승`, col: GOLD, isNew: P.streak > 0 && P.streak >= P.longw && P.longw >= 3},
  P.streak >= 2 ? {lab: '⚡ 지금', val: `${P.streak}연승 중`, col: GOLD} : {lab: '⚖️ 손익비', val: P.pf != null ? `${P.pf.toFixed(2)}` : '-', col: '#dfe6f5'},
];
const CW = (W - 20) / 2, CH = V ? 170 : 150, CY = Y0 + (V ? 200 : 190);
const cEls = cards.map((k, i) => {
  const x = X0 + (i % 2) * (CW + 20), y = CY + Math.floor(i / 2) * (CH + 20);
  const c = el('div', 'abs', `<span style="font-size:${V ? 28 : 28}px;color:#9fb0cf;font-weight:700;white-space:nowrap">${k.lab}</span>
    <b style="font-size:${V ? 60 : 58}px;color:${k.col};font-variant-numeric:tabular-nums;white-space:nowrap">${k.val}</b>`);
  c.style.cssText += `left:${x}px;top:${y}px;width:${CW}px;height:${CH}px;border-radius:24px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;
    background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.02));border:2px solid rgba(255,255,255,.10)`;
  let st = null;
  if (k.isNew) {
    st = el('div', 'abs', '오늘 기록!'); st.style.cssText += `left:${x + CW - 10}px;top:${y - 14}px;transform:translateX(-100%) rotate(-6deg);padding:4px 14px;border-radius:12px;border:3px solid #ff6f61;color:#ff6f61;background:rgba(11,20,48,.9);font-size:26px;font-weight:900;opacity:0;z-index:3`;
  }
  return {c, st, i};
});
const T0 = at('start', .25), TC = at('cards', 1.7);
return t => {
  const q = eo(prog(t, T0, 1.3));
  bw.style.width = (P.win_days / tot * 100 * q).toFixed(2) + '%';
  bl.style.width = (P.loss_days / tot * 100 * q).toFixed(2) + '%';
  rate.innerHTML = `${(P.win_rate * q).toFixed(1)}<span style="font-size:.5em">%</span>`;
  appear(wl, prog(t, T0, .35), 14);
  cEls.forEach(x => {
    const p = prog(t, TC + x.i * .3, .45);
    appear(x.c, p, 30, .8 + .2 * back(p, 2));
    if (x.st) { const k = prog(t, TC + x.i * .3 + .4, .3); x.st.style.opacity = clamp(k * 3); x.st.style.transform = `translateX(-100%) rotate(-6deg) scale(${1.6 - .6 * eo(k)})`; }
  });
};
