// 수확(햇빛) 재생 (세로 1080x1920): 심은 날 → 전날 흐림(살짝 가라앉음) → 수확 날 해 뜸 → 줄기가 수익률만큼 → 금화 열매 우수수 → 다음 밭 연쇄 판정
// 데이터는 shorts_kit/build.py 가 plan.json + sim/bean.js 결과로 채운다.
el('style', null, `#pill,#topbar{display:none!important}
.bn-t{position:absolute;left:0;right:0;text-align:center;font-weight:900;color:#fff;letter-spacing:-2px;white-space:nowrap;text-shadow:0 4px 24px rgba(0,0,0,.6)}
.bn-t b{color:#ffd45e}
.bn-chip{position:absolute;left:50%;top:398px;white-space:nowrap;font-size:30px;font-weight:800;color:#d8e2f5;background:rgba(10,16,34,.35);border:2px solid rgba(255,255,255,.22);padding:7px 24px;border-radius:30px}
.bn-end{position:absolute;left:50%;top:930px;white-space:nowrap;text-align:center;background:rgba(10,16,34,.95);border:3px solid #ffd45e;border-radius:30px;padding:20px 44px;box-shadow:0 0 60px rgba(255,212,94,.35),0 20px 40px rgba(0,0,0,.5)}
.bn-end .a{font-size:48px;font-weight:900;color:#fff}.bn-end .a i{font-style:normal;color:#ffd45e;font-size:84px}
.bn-end .s{font-size:32px;font-weight:800;color:#c9d4ea;margin-top:8px}.bn-end .s b{color:#7fb0ff}.bn-end .s i{font-style:normal;color:#ffd45e}`);
const cv = el('canvas', null); cv.width = 1080; cv.height = 1920; cv.style.cssText = 'position:absolute;left:0;top:0;width:1080px;height:1920px';
const ctx = cv.getContext('2d');
const t1 = el('div', 'bn-t', P.title1); t1.style.cssText += 'top:226px;font-size:56px';
const t2 = el('div', 'bn-t', P.title2); t2.style.cssText += 'top:288px;font-size:80px';
const chip = el('div', 'bn-chip', P.chip);
const end = el('div', 'bn-end', P.end); end.style.opacity = 0;
const G = P.G, A = P.A, FONT = '"Noto Sans CJK KR",sans-serif', PCT = P.PCT, SEEDP = Math.max(P.seedPct, -1.8), NUM = String(P.n), HASB = G.BELL != null;
const TOPV = G.TOPV || Math.max(PCT, HASB ? G.BELL : 0), TS = TOPV <= 10.4 ? 1 : TOPV <= 21 ? 2 : 5, MAXT = TOPV <= 9.6 ? 10 : Math.ceil((TOPV + .3) / TS) * TS;
const yOf = p => G.G0 - p * G.S, spineX = y => G.SX + 16 * Math.sin((G.G0 - y) / 85);
const T_CL = P.tCloud, T_SUN = P.tSun, T_G0 = P.tGrow0, T_G1 = P.tGrow1, T_SH = P.tShake, T_DR = P.tDrop, T_END = P.tend;
const pctAt = t => { if (t < T_CL + .4) return 0; if (t < T_G0) return SEEDP * eio(prog(t, T_CL + .4, .8)); const q = prog(t, T_G0, T_G1 - T_G0); return SEEDP + (PCT - SEEDP) * (1 - Math.pow(1 - q, 2.6)); };
const tCross = p => { for (let t = T_G0; t <= T_G1; t += .005) if (pctAt(t) >= p) return t; return null; };
const T_HL = tCross(.3), T_BELL = HASB ? tCross(G.BELL) : null, T_FLAGS = P.flags.map(f => tCross(f[0])), T_GND = tCross(0);
const seedY = p => G.G0 + 24 + Math.min(140, -Math.min(0, p) * G.S);
// ---------- 고정 배경(하늘 제외) ----------
const base = document.createElement('canvas'); base.width = 1080; base.height = 1920;
{ const b = base.getContext('2d'), R = rnd(9);
  b.fillStyle = 'rgba(40,50,80,.55)'; b.beginPath(); b.moveTo(0, G.G0 - 60); for (let x = 0; x <= 1080; x += 30) b.lineTo(x, G.G0 - 60 - Math.sin(x * .006) * 40 - Math.sin(x * .017) * 14); b.lineTo(1080, G.G0); b.lineTo(0, G.G0); b.fill();
  const soil = b.createLinearGradient(0, G.G0, 0, 1920); soil.addColorStop(0, '#6b4528'); soil.addColorStop(.25, '#4e321d'); soil.addColorStop(1, '#1d140e'); b.fillStyle = soil; b.fillRect(0, G.G0, 1080, 1920 - G.G0);
  for (let i = 0; i < 260; i++) { const x = R() * 1080, y = G.G0 + 20 + R() * 260, r = 1.5 + R() * 4; if (Math.abs(x - G.SX) < 60) continue; b.fillStyle = `rgba(${150 + R() * 60},${110 + R() * 40},${80 + R() * 30},${.2 + R() * .25})`; b.beginPath(); b.ellipse(x, y, r, r * .7, R() * 3, 0, 7); b.fill(); }
  const grass = b.createLinearGradient(0, G.G0 - 10, 0, G.G0 + 8); grass.addColorStop(0, '#6fbe52'); grass.addColorStop(1, '#2f6a2a'); b.fillStyle = grass; b.fillRect(0, G.G0 - 6, 1080, 14);
    // 씨앗 단면 창
  b.fillStyle = 'rgba(26,17,11,.9)'; b.fillRect(G.SX - 55, G.G0 + 8, 110, 170); b.strokeStyle = 'rgba(230,240,255,.4)'; b.lineWidth = 3; b.strokeRect(G.SX - 55, G.G0 + 8, 110, 170);
  // 기둥 + 눈금
  const yT = yOf(MAXT + .4 * TS); const pg = b.createLinearGradient(G.PX - 11, 0, G.PX + 11, 0); pg.addColorStop(0, '#7a5428'); pg.addColorStop(.5, '#d9a868'); pg.addColorStop(1, '#7a5428'); b.fillStyle = pg; b.fillRect(G.PX - 11, yT, 22, G.G0 - yT);
  b.font = `900 30px ${FONT}`; b.textAlign = 'right'; b.textBaseline = 'middle';
  for (let p = TS; p <= MAXT; p += TS) { const y = yOf(p); b.fillStyle = 'rgba(255,255,255,.85)'; b.beginPath(); b.arc(G.PX - 16, y, 5, 0, 7); b.fill(); if (TS > 1 || p % 2 === 0) { b.fillStyle = '#e9eef9'; b.fillText(`+${p}%`, G.PX - 30, y); b.fillStyle = 'rgba(255,255,255,.10)'; b.fillRect(G.PX + 14, y - 1, 700, 2); } }
  b.fillStyle = '#e9eef9'; b.fillText('0%', G.PX - 30, G.G0 - 16);
  b.setLineDash([14, 10]); b.strokeStyle = '#ffd45e'; b.lineWidth = 4; b.beginPath(); b.moveTo(G.PX - 10, yOf(.3)); b.lineTo(1040, yOf(.3)); b.stroke(); b.setLineDash([]);
  const K = G.BASK; b.fillStyle = 'rgba(30,40,70,.5)'; b.beginPath(); b.moveTo(K.L, K.T); b.lineTo(K.R, K.T); b.lineTo(K.R - 24, G.G0); b.lineTo(K.L + 24, G.G0); b.closePath(); b.fill();
}
const spr = document.createElement('canvas'); { const R = 10, SS = 4; spr.width = spr.height = Math.ceil(R * 2 * SS + 8); const c = spr.getContext('2d'), m = spr.width / 2, r = R * SS;
  const g = c.createRadialGradient(m - r * .35, m - r * .4, r * .1, m, m, r); g.addColorStop(0, '#fff6c4'); g.addColorStop(.35, '#ffd457'); g.addColorStop(.8, '#d99a1e'); g.addColorStop(1, '#8a5a0c');
  c.fillStyle = g; c.beginPath(); c.arc(m, m, r, 0, 7); c.fill(); c.lineWidth = r * .1; c.strokeStyle = '#a8700f'; c.beginPath(); c.arc(m, m, r * .72, 0, 7); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(m - r * .35, m - r * .45, r * .3, r * .13, -.6, 0, 7); c.fill(); }
const SPR = spr.width / 4 / 10;
function pill(x, y, txt, fs, bg, fg, align = 'center', alpha = 1) {
  if (alpha <= 0) return; ctx.save(); ctx.globalAlpha = alpha; ctx.font = `900 ${fs}px ${FONT}`; const w = ctx.measureText(txt).width + 30, h = fs + 20, x0 = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(x0, y - h / 2, w, h, 14); ctx.fill(); ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x0 + w / 2, y + 1); ctx.restore();
}
function seedBall(x, y, r, crack) {
  const g = ctx.createRadialGradient(x - r * .3, y - r * .35, r * .1, x, y, r); g.addColorStop(0, '#fff6c4'); g.addColorStop(.45, '#ffc93a'); g.addColorStop(1, '#9a6408');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(90,50,0,.5)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.font = `900 ${Math.round(r * .95)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(60,30,0,.7)'; ctx.strokeText(NUM, x, y + 1); ctx.fillStyle = '#fff'; ctx.fillText(NUM, x, y + 1);
  if (crack > 0) { ctx.strokeStyle = `rgba(60,30,0,${crack})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - r * .7, y - r * .5); ctx.lineTo(x - r * .1, y - r * .1); ctx.lineTo(x + r * .3, y - r * .6); ctx.lineTo(x + r * .8, y - r * .2); ctx.stroke(); }
}
const coinAt = (i, s) => { const F = A.frames, fi = Math.min(F.length - 2, Math.max(0, Math.floor(s * A.fps))), fr = clamp(s * A.fps - fi), a = F[fi][i], b = F[fi + 1][i]; return [lerp(a[0], b[0], fr), lerp(a[1], b[1], fr), lerp(a[2], b[2], fr)]; };
const CR = rnd(5), clouds = [...Array(6)].map(() => [CR() * 900, 480 + CR() * 260, 160 + CR() * 120, 50 + CR() * 30, CR()]);
const rain = [...Array(80)].map(() => [CR() * 1180 - 50, CR() * 900 + 450, .7 + CR() * .5]);
const sparkR = rnd(77), sparks = [...Array(40)].map(() => [sparkR() * 6.283, 80 + sparkR() * 200, sparkR() * .3]);
return t => {
  let shx = 0, shy = 0; { const dl = t - T_BELL; if (T_BELL && dl >= 0 && dl < .3) { shx += Math.sin(dl * 70) * 6 * (1 - dl / .3); } }
  ctx.setTransform(1, 0, 0, 1, shx, shy); ctx.clearRect(-60, -60, 1200, 2040);
  // 하늘: 11/6 저녁 → 11/9 흐림 → 11/10 맑음
  const wCl = clamp(prog(t, T_CL, .5)) * (1 - prog(t, T_SUN - .1, .6)), wSun = prog(t, T_SUN - .1, .7);
  const mix = (a, b, c, k1, k2) => a.map((v, i) => Math.round(v * (1 - k1 - k2) + b[i] * k1 + c[i] * k2));
  const top = mix([11, 20, 48], [52, 58, 72], [70, 140, 220], wCl, wSun), bot = mix([232, 168, 106], [110, 116, 128], [255, 226, 160], wCl, wSun);
  const sky = ctx.createLinearGradient(0, 0, 0, G.G0); sky.addColorStop(0, `rgb(${top})`); sky.addColorStop(1, `rgb(${bot})`); ctx.fillStyle = sky; ctx.fillRect(-60, -60, 1200, G.G0 + 60);
  // 해
  if (wSun > 0) { const sy = lerp(820, 600, eo(wSun)), sx = 860; const gl = ctx.createRadialGradient(sx, sy, 10, sx, sy, 420); gl.addColorStop(0, `rgba(255,240,170,${.75 * wSun})`); gl.addColorStop(1, 'rgba(255,220,120,0)'); ctx.fillStyle = gl; ctx.fillRect(sx - 420, sy - 420, 840, 840);
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * .25); ctx.strokeStyle = `rgba(255,236,150,${.55 * wSun})`; ctx.lineWidth = 6; ctx.lineCap = 'round'; for (let k = 0; k < 12; k++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(70, 0); ctx.lineTo(100 + 12 * Math.sin(t * 4 + k), 0); ctx.stroke(); } ctx.restore();
    ctx.fillStyle = `rgba(255,214,94,${wSun})`; ctx.beginPath(); ctx.arc(sx, sy, 56, 0, 7); ctx.fill();
    // 줄기 쪽으로 비치는 빛
    if (t > T_G0 - .2) { ctx.save(); ctx.globalAlpha = .18 * clamp((t - T_G0 + .2) / .4); const lg = ctx.createLinearGradient(sx, sy, G.SX, G.G0); lg.addColorStop(0, 'rgba(255,240,180,1)'); lg.addColorStop(1, 'rgba(255,240,180,0)'); ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(sx - 40, sy); ctx.lineTo(sx + 40, sy); ctx.lineTo(G.SX + 160, G.G0); ctx.lineTo(G.SX - 120, G.G0); ctx.closePath(); ctx.fill(); ctx.restore(); } }
  ctx.drawImage(base, 0, 0);
  // 먹구름 + 이슬비
  if (wCl > 0) { const go = prog(t, T_SUN - .2, .7);
    clouds.forEach(([x0, y0, rx, ry, ph], i) => { const x = lerp(x0 - 500, x0, eo(prog(t, T_CL, .7))) + go * (700 + i * 60) + Math.sin(t + ph * 6) * 10; ctx.fillStyle = `rgba(${70 + ph * 30},${76 + ph * 30},${92 + ph * 30},${.9 * (1 - go)})`; ctx.beginPath(); ctx.ellipse(x, y0, rx, ry, 0, 0, 7); ctx.ellipse(x + rx * .5, y0 - ry * .5, rx * .6, ry * .9, 0, 0, 7); ctx.fill(); });
    ctx.strokeStyle = `rgba(190,205,230,${.5 * wCl})`; ctx.lineWidth = 2; ctx.beginPath(); rain.forEach(([x0, y0, sp]) => { const y = 520 + (y0 + t * 800 * sp) % (G.G0 - 520), x = x0 - (y - 520) * .15; ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 20); }); ctx.stroke(); }
  // 날짜 라벨
  pill(G.SX - 210, G.G0 + 70, P.labPlant, 26, 'rgba(235,242,255,.95)', '#1b2442', 'center', clamp(prog(t, .15, .3)) * (1 - prog(t, T_CL + .2, .3)));
  pill(760, 560, P.labCloud, 30, 'rgba(40,50,70,.92)', '#9cc2ff', 'center', clamp(prog(t, T_CL + .2, .3)) * (1 - prog(t, T_SUN, .3)));
  pill(790, 600, P.labSun, 30, 'rgba(255,236,170,.96)', '#5a3512', 'right', clamp(prog(t, T_SUN + .3, .3)) * (1 - prog(t, T_END - .3, .3)));
  // 지난 수확 깃발 · 지난 최고 종 · 수확선
  P.flags.forEach(([p, lab], i) => { const y = yOf(p), tc = T_FLAGS[i], fl = tc && t > tc ? Math.exp(-(t - tc) * 3) : 0, wv = Math.sin(t * 6 + i) * 3 + Math.sin(t * 30) * 10 * fl;
    ctx.strokeStyle = '#c9d4ea'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(G.PX - 12, y); ctx.lineTo(G.PX - 80, y); ctx.stroke();
    ctx.fillStyle = 'rgba(127,176,255,.9)'; ctx.beginPath(); ctx.moveTo(G.PX - 80, y - 2); ctx.quadraticCurveTo(G.PX - 120, y - 14 + wv, G.PX - 160, y - 8 + wv); ctx.lineTo(G.PX - 160, y + 18 + wv); ctx.quadraticCurveTo(G.PX - 120, y + 12 + wv, G.PX - 80, y + 26); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0d1630'; ctx.font = `900 22px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lab, G.PX - 120, y + 11 + wv * .6); });
  if (HASB) { const y = yOf(G.BELL), d = t - T_BELL, sw = T_BELL && d > 0 ? Math.sin(d * 14) * .5 * Math.exp(-d * 1.6) : 0, gl = T_BELL && d > 0 ? Math.exp(-d * 1.5) : 0;
    ctx.strokeStyle = '#c9d4ea'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(G.PX - 11, y - 30); ctx.lineTo(G.PX - 46, y - 30); ctx.stroke();
    ctx.save(); ctx.translate(G.PX - 46, y - 30); ctx.rotate(sw); if (gl > 0) { ctx.shadowColor = `rgba(255,220,100,${gl})`; ctx.shadowBlur = 60 * gl; }
    const bg = ctx.createLinearGradient(-24, 0, 24, 0); bg.addColorStop(0, '#a8700f'); bg.addColorStop(.5, '#ffe9a0'); bg.addColorStop(1, '#a8700f'); ctx.fillStyle = bg;
    ctx.beginPath(); ctx.moveTo(-8, 4); ctx.quadraticCurveTo(-14, 10, -16, 30); ctx.quadraticCurveTo(-26, 44, -28, 48); ctx.lineTo(28, 48); ctx.quadraticCurveTo(26, 44, 16, 30); ctx.quadraticCurveTo(14, 10, 8, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7a4f0c'; ctx.beginPath(); ctx.arc(0, 52, 7, 0, 7); ctx.fill(); ctx.restore();
    if (gl > 0) { ctx.strokeStyle = `rgba(255,230,140,${gl})`; ctx.lineWidth = 5; ctx.lineCap = 'round'; for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const a = -.5 + k * .5; ctx.beginPath(); ctx.moveTo(G.PX - 46 + s * (36 + 10 * (1 - gl)), y + 4 + a * 30); ctx.lineTo(G.PX - 46 + s * (58 + 22 * (1 - gl)), y + 4 + a * 44); ctx.stroke(); } }
    ctx.fillStyle = '#ffe9a8'; ctx.font = `900 30px ${FONT}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(P.bellLab1, G.PX - 84, y - 10); ctx.fillStyle = '#e3e9f6'; ctx.font = `800 24px ${FONT}`; ctx.fillText(P.bellLab2, G.PX - 84, y + 22); }
  { const fl = T_HL && t > T_HL ? Math.exp(-(t - T_HL) * 2.5) : 0; pill(1066, yOf(.3) - 26, '수확선 +0.3%', 24, `rgba(255,212,94,${.85 + .15 * fl})`, '#3a2500', 'right'); }
  // 씨앗 + 줄기
  const p = pctAt(t), tipY = yOf(Math.max(p, -99)), sY = seedY(Math.min(0, t < T_G0 ? p : SEEDP)), growing = t >= T_G0;
  const crack = growing ? clamp((t - T_G0) / .15) : 0;
  const shake = t > T_SH && t < T_DR + .3 ? Math.sin(t * 38) * 5 * (1 - clamp((t - T_DR) / .3)) : 0;
  const sway = y => (shake + (t > T_G1 ? Math.sin(t * 2.2) * 2 : 0)) * clamp((G.G0 - y) / 500);
  if (growing) { const y0 = sY - 10, y1 = Math.min(tipY, y0); const n = 40;
    for (const [w, col] of [[18, '#2f7a2c'], [10, '#5fbf4a']]) { ctx.strokeStyle = col; ctx.lineCap = 'round'; for (let k = 0; k < n; k++) { const ya = lerp(y0, y1, k / n), yb = lerp(y0, y1, (k + 1) / n); ctx.lineWidth = w * (1 - .55 * k / n); ctx.beginPath(); ctx.moveTo(spineX(ya) + sway(ya), ya); ctx.lineTo(spineX(yb) + sway(yb), yb); ctx.stroke(); } }
    // 꼭대기 덩굴손
    const tx = spineX(y1) + sway(y1); ctx.strokeStyle = '#5fbf4a'; ctx.lineWidth = 5; ctx.beginPath(); for (let k = 0; k <= 20; k++) { const a = k / 20 * 5, r = 22 * (1 - k / 22); const x = tx + Math.cos(a + t * 2) * r - 6, y = y1 - 8 + Math.sin(a + t * 2) * r * .8; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    // 잎(줄기가 지나가면 펼쳐짐)
    P.leaves.forEach(l => { if (tipY > l.y0) return; const tl = tCross((G.G0 - l.y0) / G.S) || T_G0, s = eo(clamp((t - tl) / .3)); if (s <= 0) return;
      ctx.save(); ctx.translate(l.x + sway(l.y) - l.side * l.len / 2 * (1 - s), l.y); ctx.rotate(l.ang); ctx.scale(s, s);
      const lg = ctx.createLinearGradient(-l.len / 2, 0, l.len / 2, 0); lg.addColorStop(0, '#3f9a3a'); lg.addColorStop(1, '#7fd36a'); ctx.fillStyle = lg;
      ctx.beginPath(); ctx.ellipse(0, 0, l.len / 2 + 6, 15, 0, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(30,80,30,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-l.len / 2, 0); ctx.lineTo(l.len / 2, 0); ctx.stroke(); ctx.restore(); }); }
  // 씨앗(줄기가 나오면 금 가며 작아짐)
  { const r = 24 * (1 - .4 * clamp((t - T_G0) / .6)); ctx.save(); ctx.beginPath(); ctx.rect(G.SX - 55, G.G0 + 8, 110, 170); ctx.clip(); seedBall(G.SX, sY, r, crack); ctx.restore(); }
  { const a = clamp(prog(t, T_CL + .9, .3)) * (1 - prog(t, T_G0 + .1, .25)); pill(G.SX - 64, sY, `${P.seedLab}`, 28, 'rgba(10,16,34,.9)', '#9cc2ff', 'right', a); }
  // 금화 열매: 줄기가 그 높이를 지나면 맺히고, 흔들린 뒤 우수수
  if (t < T_DR) P.fruits.forEach((f, i) => { if (tipY > f.y + 6) return; const tf = (tCross((G.G0 - f.y) / G.S) || T_G0) + .08, s = back(clamp((t - tf) / .35), 2); if (s <= 0) return; const x = f.x + sway(f.y), y = f.y + Math.sin(t * 3 + i) * 1.2;
      ctx.strokeStyle = '#3f8a35'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 9 * s); ctx.lineTo(x - 5, y - 18 * s); ctx.stroke();
      const S = A.radii[i] * SPR * 2 * s; ctx.drawImage(spr, x - S / 2, y - S / 2, S, S); });
  else { const s = t - T_DR; A.radii.forEach((rr, i) => { const [x, y, a] = coinAt(i, s); const S = rr * SPR * 2; ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.drawImage(spr, -S / 2, -S / 2, S, S); ctx.restore(); }); }
  // 바구니 앞(유리)
  { const K = G.BASK; ctx.fillStyle = 'rgba(200,230,255,.10)'; ctx.beginPath(); ctx.moveTo(K.L, K.T); ctx.lineTo(K.R, K.T); ctx.lineTo(K.R - 24, G.G0); ctx.lineTo(K.L + 24, G.G0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#9a6a34'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(K.L, K.T); ctx.lineTo(K.L + 24, G.G0); ctx.moveTo(K.R, K.T); ctx.lineTo(K.R - 24, G.G0); ctx.stroke();
    ctx.strokeStyle = '#e2b479'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(K.L - 6, K.T); ctx.lineTo(K.R + 6, K.T); ctx.stroke();
    pill(K.R - 90, G.G0 + 44, P.basketLab, 30, 'rgba(255,248,225,.95)', '#5a3512'); }
  // 꼭대기 % 표시
  if (growing && p > 0) { const big = t >= T_G1 ? back(prog(t, T_G1, .35), 2.2) : 0, gold = t >= T_G1; const tx = spineX(tipY);
    pill(tx + 8, tipY - 62, `+${p.toFixed(1)}%`, Math.round(40 + 16 * big), gold ? 'rgba(255,212,94,.97)' : 'rgba(10,16,34,.85)', gold ? '#3a2500' : '#ffe9a8'); }
  if (t >= T_G1 && t < T_G1 + .8) sparks.forEach(([a, sp, dl]) => { const q = clamp((t - T_G1 - dl * .3) / .6); if (q <= 0 || q >= 1) return; ctx.fillStyle = `rgba(255,${220 + 35 * (1 - q)},140,${1 - q})`; ctx.fillRect(spineX(tipY) + Math.cos(a) * sp * eo(q) * .5, tipY + Math.sin(a) * sp * eo(q) * .4, 5, 5); });
  // 다음 밭 판정(연쇄): 햇빛이 다음 계좌 밭으로 → 깊이 묻힌 씨앗은 꿈틀하다 멈춤
  if (P.chain && t > P.chain.t - .05) { const C = P.chain, s = t - C.t, a = clamp(s / .3);
    ctx.save(); ctx.globalAlpha = a; const X0 = 60, Y0 = 1380, W = 600, H = 200;
    ctx.fillStyle = 'rgba(10,16,34,.9)'; ctx.beginPath(); ctx.roundRect(X0, Y0, W, H, 22); ctx.fill(); ctx.strokeStyle = 'rgba(255,212,94,.6)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#ffe9a8'; ctx.font = `900 30px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; if (C.also && C.also.length) ctx.font = `900 26px ${FONT}`; ctx.fillText(C.also && C.also.length ? `${C.also.map(a => a[0]).join('·')}번도 수확 → 다음 ${C.acc}번 밭도?` : `다음 ${C.acc}번 밭도?`, X0 + 24, Y0 + 36);
    // 미니 단면: 땅 + 깊이
    const gx = X0 + 30, gy = Y0 + 80, gw = 230, gh = 100; ctx.fillStyle = '#4e321d'; ctx.fillRect(gx, gy, gw, gh); ctx.fillStyle = '#5fae4a'; ctx.fillRect(gx, gy - 4, gw, 8);
    const beam = clamp((s - .2) / .4); if (beam > 0) { ctx.fillStyle = `rgba(255,236,160,${.35 * beam})`; ctx.beginPath(); ctx.moveTo(gx + gw - 30, Y0 + 50); ctx.lineTo(gx + gw, Y0 + 50); ctx.lineTo(gx + gw / 2 + 40, gy); ctx.lineTo(gx + gw / 2 - 40, gy); ctx.closePath(); ctx.fill(); }
    const wig = s > .6 && s < 1.4 ? Math.sin(s * 40) * 4 * (1 - (s - .6) / .8) : 0;
    ctx.fillStyle = '#9cc2ff'; ctx.font = `900 18px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('▼ ▼ ▼', gx + gw / 2, gy + 40);
    const sg = ctx.createRadialGradient(gx + gw / 2 - 4 + wig, gy + gh - 22, 2, gx + gw / 2 + wig, gy + gh - 18, 16); sg.addColorStop(0, '#cfe3ff'); sg.addColorStop(1, '#3f72d6'); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(gx + gw / 2 + wig, gy + gh - 18, 14, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `900 16px ${FONT}`; ctx.fillText(String(C.acc), gx + gw / 2 + wig, gy + gh - 17);
    if (s > 1.4) { const q = clamp((s - 1.4) / .3); for (let k = 0; k < 4; k++) { ctx.fillStyle = `rgba(230,235,245,${.5 * (1 - q)})`; ctx.beginPath(); ctx.arc(gx + gw / 2 + (k - 1.5) * 10, gy + gh - 40 - q * 50, 6 + q * 8, 0, 7); ctx.fill(); } }
    ctx.fillStyle = '#9cc2ff'; ctx.font = `900 40px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText(`${C.pct > 0 ? '+' : '−'}${Math.abs(C.pct).toFixed(1)}%`, gx + gw + 30, gy + 20);
    if (s > 1.4) { ctx.globalAlpha = a * clamp((s - 1.4) / .25); ctx.fillStyle = '#ffb070'; ctx.font = `900 30px ${FONT}`; ctx.fillText('싹 안 남 → 연쇄 멈춤', gx + gw + 30, gy + 72); }
    ctx.restore(); }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  appear(t1, prog(t, 0, .25), 18, .9); appear(t2, prog(t, .1, .25), 24, .9);
  const cq = eo(prog(t, .15, .3)); chip.style.opacity = cq; chip.style.transform = `translateX(-50%) translateY(${(1 - cq) * -14}px)`;
  const eq = prog(t, T_END, .4); end.style.opacity = clamp(eq * 2); end.style.transform = `translateX(-50%) scale(${eq > 0 ? .5 + .5 * back(eq, 2.4) : .5})`;
};
