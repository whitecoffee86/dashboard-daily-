// 대시보드 '농사일지' — 오늘 손익 숫자가 슬롯처럼 굴러가고, 매매 칩이 떨어지고, 순위 배지가 찍힘
// props.data = {pnl:"+10,931,430원", sub:"하루 수익률 +7.79%", trades:["🧺 코스피 6번 수확",...],
//               badges:[{"label":"실현","value":"+27만"},{"label":"올해 순위","value":"182일 중 9위"}], title, title_v, up:true}
// props.cues = {start, chips, rank}
heading((vertical && P.title_v) || P.title || '오늘의 농사일지', P.subtitle);
const V = vertical, CX = V ? 470 : 960;
const up = P.up !== false, NUMC = up ? '#ff7a6b' : '#6aa8ff';
// ── 슬롯 숫자 ──
const FS = V ? 104 : 130, LH = FS * 1.12;
const box = el('div', 'abs', ''); box.style.cssText += `left:${CX}px;top:${V ? 690 : 230}px;transform:translateX(-50%);display:flex;font-weight:900;font-size:${FS}px;line-height:${LH}px;height:${LH}px;overflow:hidden;color:${NUMC};text-shadow:0 0 40px ${up ? 'rgba(255,122,107,.35)' : 'rgba(106,168,255,.35)'};letter-spacing:-2px;font-variant-numeric:tabular-nums`;
const chars = [...P.pnl];
const cols = chars.map((ch, i) => {
  if (!/\d/.test(ch)) { const s = el('span', '', ch, box); return null; }
  const w = el('span', '', '', box); w.style.cssText = `display:inline-block;height:${LH}px;overflow:hidden`;
  const strip = el('span', '', '', w); strip.style.cssText = 'display:flex;flex-direction:column';
  for (let r = 0; r < 3; r++) for (let d = 0; d < 10; d++) el('span', '', String(d), strip).style.cssText = `height:${LH}px;display:block;text-align:center`;
  return {strip, d: +ch, i};
}).filter(Boolean);
const sub = el('div', 'abs', P.sub || ''); sub.style.cssText += `left:${CX}px;top:${(V ? 690 : 230) + LH + 14}px;transform:translateX(-50%);font-size:${V ? 38 : 44}px;color:#9fb0cf;font-weight:700;white-space:nowrap`;
// ── 매매 칩 ──
const chipTop = V ? 930 : 520;
const chips = (P.trades || []).map((tx, i) => {
  const harvest = /🧺|✂️/.test(tx);
  const c = el('div', 'abs', tx);
  c.style.cssText += `left:${V ? CX : CX - 420 + (i % 2) * 440}px;top:${V ? chipTop + i * 100 : chipTop + Math.floor(i / 2) * 110}px;transform:translateX(${V ? '-50%' : '0'});
    padding:16px 34px;border-radius:999px;font-size:${V ? 44 : 46}px;font-weight:800;white-space:nowrap;
    border:3px solid ${harvest ? '#e8c86a' : '#5fd69a'};color:${harvest ? '#ffe39a' : '#9df0c2'};
    background:${harvest ? 'rgba(232,200,106,.16)' : 'rgba(95,214,154,.14)'};box-shadow:0 10px 30px rgba(0,0,0,.35)`;
  return c;
});
// ── 배지 ──
const nb = (P.trades || []).length;
const badgeTop = V ? Math.min(1210, chipTop + nb * 100 + 30) : chipTop + Math.ceil(nb / 2) * 110 + 50;
const badges = (P.badges || []).map((b, i) => {
  const e = el('div', 'abs', `<span style="font-size:${V ? 30 : 32}px;color:#9fb0cf;font-weight:700">${b.label}</span><b style="font-size:${V ? 50 : 56}px;color:#e8c86a">${b.value}</b>`);
  const bw = V ? 400 : 440;
  e.style.cssText += `left:${V ? CX - bw - 12 + i * (bw + 24) : CX - bw - 20 + i * (bw + 40)}px;top:${badgeTop}px;width:${bw}px;display:flex;flex-direction:column;align-items:center;gap:6px;
    padding:20px 10px;border-radius:24px;background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.02));border:2px solid rgba(232,200,106,.45)`;
  return e;
});
const T0 = at('start', .3), TC = at('chips', 2.5), TR = at('rank', 4.5);
return t => {
  cols.forEach(c => {
    const q = eo(prog(t, T0 + c.i * .05, 1.1 + c.i * .06));
    const pos = (20 + c.d) * q;              // 두 바퀴 돌고 목표 숫자에 멈춤
    c.strip.style.transform = `translateY(${-pos * LH}px)`;
  });
  appear(sub, prog(t, T0 + 1.2, .5), 20);
  chips.forEach((c, i) => {
    const q = prog(t, TC + i * .45, .5);
    c.style.opacity = clamp(q * 3);
    c.style.transform = `translateX(${V ? '-50%' : '0'}) translateY(${(1 - eo(q)) * -120}px) scale(${.5 + .5 * back(q, 2)})`;
  });
  badges.forEach((b, i) => appear(b, prog(t, TR + i * .35, .5), 30, .85 + .15 * back(prog(t, TR + i * .35, .5), 2)));
};
