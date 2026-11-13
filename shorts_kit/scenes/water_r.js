// 물타기(물통) 재생 (세로 1080x1920): 금화 퐁당 → 수면 상승 → 물탄 계좌(na) 구슬이 넘치는 물을 타고 핀볼판으로 → '본전까지 남은 폭' 칸 / 새 씨앗(ns)은 마른 통에서 뭉쳐 0%대로
// 데이터는 shorts_kit/build.py 가 plan.json + sim/water.js 결과로 채운다.
el('style', null, `#pill,#topbar{display:none!important}
.wt-t{position:absolute;left:0;right:0;text-align:center;font-weight:900;color:#fff;letter-spacing:-2px;white-space:nowrap;text-shadow:0 4px 24px rgba(0,0,0,.6)}
.wt-t b{color:#7fd0ff}
.wt-chip{position:absolute;left:50%;top:398px;white-space:nowrap;font-size:30px;font-weight:800;color:#d8e2f5;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.18);padding:7px 24px;border-radius:30px}
.wt-end{position:absolute;left:50%;top:860px;white-space:nowrap;text-align:center;background:rgba(10,16,34,.95);border:3px solid #ffd45e;border-radius:30px;padding:20px 44px;box-shadow:0 0 60px rgba(255,212,94,.35),0 20px 40px rgba(0,0,0,.5)}
.wt-end .a{font-size:46px;font-weight:900;color:#fff}.wt-end .a b{color:#7fb0ff}.wt-end .a i{font-style:normal;color:#ffd45e;font-size:80px}
.wt-end .m{font-size:36px;font-weight:900;color:#ffe9a8;margin-top:6px}.wt-end .m i{font-style:normal;color:#ffd45e}
.wt-end .s{font-size:32px;font-weight:800;color:#c9d4ea;margin-top:8px}`);
const cv = el('canvas', null); cv.width = 1080; cv.height = 1920; cv.style.cssText = 'position:absolute;left:0;top:0;width:1080px;height:1920px';
const ctx = cv.getContext('2d');
const t1 = el('div', 'wt-t', P.title1); t1.style.cssText += 'top:226px;font-size:56px';
const t2 = el('div', 'wt-t', P.title2); t2.style.cssText += 'top:288px;font-size:80px';
const chip = el('div', 'wt-chip', P.chip);
const end = el('div', 'wt-end', P.end); end.style.opacity = 0;
const G = P.G, A = P.A, C7 = P.C7, C8 = P.C8, BW = P.BW, TB = G.TUBE, H = G.HOP, FONT = '"Noto Sans CJK KR",sans-serif', SURF = 580;
const HS = !!C8, NA = String(P.na), NS = String(P.ns || '');
const T_OVER = P.tOver, T_M8 = HS ? P.tM8 : 1e9, T_M8E = HS ? P.tM8e : 1e9, L7 = T_OVER + C7.land, L8 = HS ? T_OVER + C8.land : 1e9, R8T = HS ? T_OVER + C8.rel : 1e9, T_END = P.tend;
const N7 = A.side.filter(s => s === 7).length, N8 = A.side.length - N7;
const BX = i => G.BIN.L + BW * (i + .5);
const fAt = s => { const F = A.frames, fi = Math.min(F.length - 2, Math.max(0, Math.floor(s * A.fps))); return [fi, clamp(s * A.fps - fi)]; };
const lvAt = t => { const [fi, fr] = fAt(t); return lerp(A.lvls[fi], A.lvls[fi + 1], fr); };
const fbAt = t => { const [fi, fr] = fAt(t); return [lerp(A.balls[fi][0], A.balls[fi + 1][0], fr), lerp(A.balls[fi][1], A.balls[fi + 1][1], fr)]; };
// ---------- 고정 배경 ----------
const base = document.createElement('canvas'); base.width = 1080; base.height = 1920;
{ const b = base.getContext('2d'), R = rnd(8);
  const sky = b.createLinearGradient(0, 0, 0, SURF); sky.addColorStop(0, '#0b1430'); sky.addColorStop(1, '#22365f'); b.fillStyle = sky; b.fillRect(0, 0, 1080, SURF);
  for (let i = 0; i < 70; i++) { b.fillStyle = `rgba(255,255,255,${.15 + R() * .4})`; b.fillRect(R() * 1080, R() * 560, 2, 2); }
  const soil = b.createLinearGradient(0, SURF, 0, 1920); soil.addColorStop(0, '#6b4528'); soil.addColorStop(.12, '#4e321d'); soil.addColorStop(.4, '#2a1d1c'); soil.addColorStop(1, '#0d0b14'); b.fillStyle = soil; b.fillRect(0, SURF, 1080, 1920 - SURF);
  for (let i = 0; i < 300; i++) { const x = R() * 1080, y = SURF + 10 + R() * 200, r = 1.5 + R() * 4; if ((x > TB.L - 12 && x < TB.R + 12) || (x > H.L - 12 && x < H.R + 12)) continue; b.fillStyle = `rgba(${150 + R() * 60},${110 + R() * 40},${80 + R() * 30},${.18 + R() * .22})`; b.beginPath(); b.ellipse(x, y, r, r * .7, R() * 3, 0, 7); b.fill(); }
  const grass = b.createLinearGradient(0, SURF - 10, 0, SURF + 8); grass.addColorStop(0, '#5fae4a'); grass.addColorStop(1, '#2f6a2a'); b.fillStyle = grass; b.fillRect(0, SURF - 6, 1080, 14);
  // 핀볼판 배경
  const cave = b.createRadialGradient(570, 1060, 40, 570, 1060, 560); cave.addColorStop(0, 'rgba(60,70,130,.45)'); cave.addColorStop(1, 'rgba(20,20,40,0)'); b.fillStyle = cave; b.fillRect(0, 700, 1080, 800);
  b.fillStyle = 'rgba(8,10,24,.55)'; b.beginPath(); b.roundRect(TB.R + 8, 740, G.WALLR - TB.R - 4, G.BIN.B - 740 + 16, 22); b.fill();
  // 유리 물통(뒤판) + 마른 통
  b.fillStyle = 'rgba(10,18,40,.85)'; b.fillRect(TB.L, TB.TOP, TB.R - TB.L, TB.BOT - TB.TOP);
  if (HS) { b.fillStyle = 'rgba(10,18,40,.85)'; b.fillRect(H.L, H.TOP, H.R - H.L, H.FLOOR - H.TOP); }
  b.fillStyle = '#1a110b'; b.fillRect(TB.L, SURF - 8, TB.R - TB.L, 30); if (HS) b.fillRect(H.L, SURF - 8, H.R - H.L, 30);
  // 칸
  for (let i = 0; i < G.BIN.N; i++) { const x0 = G.BIN.L + BW * i, k = 1 - i / (G.BIN.N - 1); const g = b.createLinearGradient(0, G.BIN.T, 0, G.BIN.B); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(255,${Math.round(212 - 120 * k)},${Math.round(94 - 10 * k)},.2)`); b.fillStyle = g; b.fillRect(x0 + 5, G.BIN.T, BW - 10, G.BIN.B - G.BIN.T); }
  b.fillStyle = '#c7d2ea'; b.fillRect(TB.L - 10, G.BIN.B + 2, G.WALLR - TB.L + 16, 14);
  b.fillStyle = '#9aa8c8'; b.fillRect(G.WALLR - 6, 760, 12, G.BIN.B - 760);
  for (const x of P.divs) { const g = b.createLinearGradient(x - 4, 0, x + 4, 0); g.addColorStop(0, '#8d9bbb'); g.addColorStop(.5, '#eef3ff'); g.addColorStop(1, '#8d9bbb'); b.fillStyle = g; b.beginPath(); b.roundRect(x - 4, G.BIN.T, 8, G.BIN.B - G.BIN.T, 4); b.fill(); }
  b.fillStyle = '#c9d4ea'; b.font = `800 30px ${FONT}`; b.textAlign = 'center'; b.textBaseline = 'middle'; b.fillText('◀ 멀다    본전까지 올라야 하는 폭    가깝다 ▶', 520, 1530);
  // 물받이(나무)
  const [[x1, y1], [x2, y2]] = G.TROUGH; b.save(); b.translate(x1, y1); b.rotate(Math.atan2(y2 - y1, x2 - x1)); const L = Math.hypot(x2 - x1, y2 - y1);
  const wd = b.createLinearGradient(0, -6, 0, 6); wd.addColorStop(0, '#d9a868'); wd.addColorStop(1, '#8a5a2c'); b.fillStyle = wd; b.beginPath(); b.roundRect(-4, -6, L + 8, 12, 5); b.fill(); b.restore();
}
const spr = document.createElement('canvas'); { const R = 10, SS = 4; spr.width = spr.height = Math.ceil(R * 2 * SS + 8); const c = spr.getContext('2d'), m = spr.width / 2, r = R * SS;
  const g = c.createRadialGradient(m - r * .35, m - r * .4, r * .1, m, m, r); g.addColorStop(0, '#fff6c4'); g.addColorStop(.35, '#ffd457'); g.addColorStop(.8, '#d99a1e'); g.addColorStop(1, '#8a5a0c');
  c.fillStyle = g; c.beginPath(); c.arc(m, m, r, 0, 7); c.fill(); c.lineWidth = r * .1; c.strokeStyle = '#a8700f'; c.beginPath(); c.arc(m, m, r * .72, 0, 7); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(m - r * .35, m - r * .45, r * .3, r * .13, -.6, 0, 7); c.fill(); }
const SPR = spr.width / 4 / 10;
function marble(x, y, r, ang, gold, num, glow) {
  ctx.save(); if (glow > 0) { ctx.shadowColor = `rgba(255,214,94,${glow})`; ctx.shadowBlur = 44 * glow; }
  const g = ctx.createRadialGradient(x - r * .3, y - r * .35, r * .1, x, y, r); if (gold) { g.addColorStop(0, '#fff6c4'); g.addColorStop(.45, '#ffc93a'); g.addColorStop(1, '#9a6408'); } else { g.addColorStop(0, '#9cc2ff'); g.addColorStop(.45, '#3f72d6'); g.addColorStop(1, '#162a66'); }
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r * .97, 0, 7); ctx.clip(); ctx.translate(x, y); ctx.rotate(ang); ctx.strokeStyle = gold ? 'rgba(255,255,230,.6)' : 'rgba(190,220,255,.5)'; ctx.lineWidth = r * .13; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-r * .8, r * .2); ctx.bezierCurveTo(-r * .2, -r * .7, r * .3, r * .7, r * .85, -r * .15); ctx.stroke(); ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(x - r * .38, y - r * .45, r * .3, r * .14, -.7, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(10,20,50,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
  if (r > 12) { ctx.font = `900 ${Math.round(r * .95)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(10,16,40,.75)'; ctx.strokeText(num, x, y + 1); ctx.fillStyle = '#fff'; ctx.fillText(num, x, y + 1); }
  ctx.restore();
}
function pill(x, y, txt, sub, fs, bg, fg, align = 'center', alpha = 1, subfg = '#c9d4ea') {
  if (alpha <= 0) return; ctx.save(); ctx.globalAlpha = alpha; ctx.font = `900 ${fs}px ${FONT}`; let w = ctx.measureText(txt).width; if (sub) { ctx.font = `800 22px ${FONT}`; w = Math.max(w, ctx.measureText(sub).width); } w += 30; const h = fs + 20 + (sub ? 28 : 0), x0 = align === 'right' ? x - w : align === 'left' ? x : x - w / 2;
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(x0, y - h / 2, w, h, 14); ctx.fill(); ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 ${fs}px ${FONT}`; ctx.fillText(txt, x0 + w / 2, sub ? y - 13 : y + 1);
  if (sub) { ctx.font = `800 22px ${FONT}`; ctx.fillStyle = subfg; ctx.fillText(sub, x0 + w / 2, y + 20); } ctx.restore();
}
function sack(t, sx, sy, l1, l2) {
  const tilt = t < .05 ? 0 : t < 3.4 ? eo(prog(t, .05, .3)) : 1 - eio(prog(t, 3.4, .45)), shk = t > .35 && t < 3.35 ? Math.sin(t * 40 + sx) * 2 : 0, fade = 1 - prog(t, 3.9, .4);
  if (fade <= 0) return; ctx.save(); ctx.globalAlpha = fade; const th = -.12 - tilt * 2.15;
  ctx.save(); ctx.translate(sx, sy + shk); ctx.rotate(th); ctx.scale(.86, .86);
  const sg = ctx.createLinearGradient(-50, -60, 50, 40); sg.addColorStop(0, '#e2c08a'); sg.addColorStop(1, '#9a6e3a'); ctx.fillStyle = sg;
  ctx.beginPath(); ctx.moveTo(-30, -36); ctx.quadraticCurveTo(-60, 10, -42, 44); ctx.quadraticCurveTo(0, 62, 42, 44); ctx.quadraticCurveTo(60, 10, 30, -36); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7a5428'; ctx.fillRect(-32, -44, 64, 12); ctx.restore();
  ctx.fillStyle = '#4a3010'; ctx.font = `900 21px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const lx = sx - 10 * Math.sin(th), ly = sy + shk + 10 * Math.cos(th); ctx.fillText(l1, lx, ly - 11); ctx.fillText(l2, lx, ly + 13); ctx.restore();
}
// 물보라·기포·넘치는 물 미리 만들기
const SR = rnd(41);
const drops = [], bubbles = [];
A.splash.forEach(([ts, x, v]) => { const lv = A.lvls[Math.min(A.lvls.length - 1, Math.round(ts * A.fps))];
  for (let k = 0; k < 7; k++) drops.push([ts, x, lv, (SR() - .5) * 300, -(180 + SR() * 220) * Math.min(1.4, .6 + v / 6)]);
  for (let k = 0; k < 5; k++) bubbles.push([ts + .05 + SR() * .25, x + (SR() - .5) * 26, lv + 30 + SR() * 90, 130 + SR() * 90, 2 + SR() * 4, SR() * 6]); });
const stream = [...Array(110)].map((_, i) => [T_OVER - .35 + i * .022 * (i < 70 ? 1 : 1.8), SR()]);
const pegHit = P.pegs.map(() => []); for (const C of [C7, C8].filter(Boolean)) C.hits.forEach(h => { if (h[1][0] === 'p') pegHit[+h[1].slice(1)].push(T_OVER + h[0]); });
const ballAt = (C, t) => { const k = (t - T_OVER) * P.fps - 1; const i = Math.max(0, Math.min(C.path.length - 2, Math.floor(k))), fr = clamp(k - i), a = C.path[i], b = C.path[i + 1]; return [lerp(a[0], b[0], fr), lerp(a[1], b[1], fr), lerp(a[2], b[2], fr)]; };
const binOf = x => Math.max(0, Math.min(G.BIN.N - 1, Math.floor((x - G.BIN.L) / BW)));
const C8P = HS ? [H.X + C8.d, H.FLOOR - G.R8] : [0, 0];
const sparkR = rnd(77), sparks = [...Array(32)].map(() => [sparkR() * 6.283, 100 + sparkR() * 220, sparkR() * .3]);
return t => {
  let shx = 0, shy = 0; for (const [L, s] of [[L7, 12], [L8, 6]]) { const dl = t - L; if (dl >= 0 && dl < .4) { shx += Math.sin(dl * 70) * s * (1 - dl / .4); shy += Math.cos(dl * 60) * s * .7 * (1 - dl / .4); } }
  ctx.setTransform(1, 0, 0, 1, shx, shy); ctx.clearRect(-60, -60, 1200, 2040); ctx.drawImage(base, 0, 0);
  const lv = lvAt(t), fi = fAt(t);
  // 금화(물통 안은 물 아래에 보이도록 먼저)
  A.radii.forEach((rr, i) => { const F = A.frames, a = F[fi[0]][i], b2 = F[fi[0] + 1][i] || a; if (!a) return; let x = lerp(a[0], b2[0], fi[1]), y = lerp(a[1], b2[1], fi[1]), ang = lerp(a[2], b2[2], fi[1]), sc = 1;
    if (A.side[i] === 8 && t >= T_M8) { const mq = clamp((t - T_M8) / (T_M8E - T_M8)); const p = F[Math.min(F.length - 1, Math.round(T_M8 * A.fps))][i]; const dx = p[0] - C8P[0], dy = p[1] - C8P[1], d = Math.hypot(dx, dy), lag = Math.min(.5, d / 200 * .5), s = clamp((mq - lag) / .5);
      if (s >= 1) return; const a0 = Math.atan2(dy, dx) + 3 * s * s * Math.min(1, 60 / Math.max(d, 1)); x = C8P[0] + Math.cos(a0) * d * (1 - eio(s)); y = C8P[1] + Math.sin(a0) * d * (1 - eio(s)) - Math.sin(Math.PI * s) * 14; sc = 1 - .5 * s; ang += s * 8; }
    const S = rr * SPR * 2 * sc; ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.drawImage(spr, -S / 2, -S / 2, S, S); ctx.restore(); });
  // 기포
  for (const [t0, x, y0, sp, r, ph] of bubbles) { const d = t - t0; if (d < 0) continue; const y = y0 - sp * d; if (y < lv + 4 || d > 3) continue; ctx.strokeStyle = 'rgba(210,240,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x + Math.sin(d * 9 + ph) * 4, y, r, 0, 7); ctx.stroke(); }
  // 7번 구슬(물에 뜬 상태)
  let b7 = null; if (t < T_OVER + .02) { const [x, y] = fbAt(t); b7 = [x, y, Math.sin(t * 1.3) * .4]; }
  else { const p = ballAt(C7, t), q = clamp((t - T_OVER) / .15); const [fx, fy] = fbAt(T_OVER); b7 = [lerp(fx, p[0], eo(q)), lerp(fy, p[1], eo(q)), p[2]]; }
  if (t < T_OVER + .6) marble(b7[0], b7[1], G.R7, b7[2], false, NA, 0);
  // 물(수면 출렁임 + 앞판 유리)
  { ctx.save(); ctx.beginPath(); ctx.rect(TB.L, TB.TOP - 40, TB.R - TB.L, TB.BOT - TB.TOP + 40); ctx.clip();
    const surf = x => { let h = Math.sin(x * .06 + t * 3) * 1.5; for (const [ts, xs, v] of A.splash) { const d = t - ts; if (d > 0 && d < 1.2) h += Math.min(9, 2 + v) * Math.exp(-4 * d) * Math.cos(.09 * (x - xs)) * Math.sin(20 * d); } return h; };
    const wg = ctx.createLinearGradient(0, lv, 0, TB.BOT); wg.addColorStop(0, 'rgba(90,170,255,.55)'); wg.addColorStop(1, 'rgba(30,80,170,.7)'); ctx.fillStyle = wg;
    ctx.beginPath(); ctx.moveTo(TB.L, TB.BOT); for (let x = TB.L; x <= TB.R; x += 6) ctx.lineTo(x, lv + surf(x)); ctx.lineTo(TB.R, TB.BOT); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(220,245,255,.9)'; ctx.lineWidth = 3; ctx.beginPath(); for (let x = TB.L; x <= TB.R; x += 6) x === TB.L ? ctx.moveTo(x, lv + surf(x)) : ctx.lineTo(x, lv + surf(x)); ctx.stroke(); ctx.restore(); }
  ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(TB.L + 8, TB.TOP + 10, 12, TB.BOT - TB.TOP - 20);
  ctx.strokeStyle = 'rgba(230,240,255,.55)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(TB.L, TB.TOP - 20); ctx.lineTo(TB.L, TB.BOT); ctx.moveTo(TB.R, TB.LIP); ctx.lineTo(TB.R, TB.BOT); ctx.stroke();
  if (HS) { ctx.strokeStyle = 'rgba(230,240,255,.55)'; ctx.lineWidth = 4; ctx.strokeRect(H.L, H.TOP, H.R - H.L, H.FLOOR - H.TOP); }
  // 물보라
  for (const [t0, x, y0, vx, vy] of drops) { const d = t - t0; if (d < 0 || d > .5) continue; const y = y0 + vy * d + 700 * d * d; if (y > y0 + 4) continue; ctx.fillStyle = `rgba(200,235,255,${.9 * (1 - d / .5)})`; ctx.beginPath(); ctx.arc(x + vx * d, y, 3, 0, 7); ctx.fill(); }
  // 넘치는 물줄기
  const [[x1, y1], [x2, y2]] = G.TROUGH;
  for (const [t0, r] of stream) { const d = t - t0; if (d < 0 || d > 1.3) continue; let x, y; if (d < .25) { const q = d / .25; x = lerp(TB.R - 4, x2, q); y = lerp(TB.LIP - 4, y2 - 8, q) + Math.sin(r * 20) * 3; } else { const f = d - .25; x = x2 + (200 + r * 120) * f; y = y2 - 8 + 60 * f + 900 * f * f; }
    if (y > 980) continue; ctx.fillStyle = `rgba(150,210,255,${.75 * (1 - d / 1.3)})`; ctx.beginPath(); ctx.arc(x, y, 3 + r * 3, 0, 7); ctx.fill(); }
  // 8번 마른 통 바닥(열림)
  if (HS) { const op = eio(prog(t, R8T - .12, .18)), half = (H.R - H.L) / 2; ctx.save(); ctx.beginPath(); ctx.rect(H.L, H.FLOOR - 2, H.R - H.L, 22); ctx.clip(); ctx.fillStyle = '#c9cfdb'; ctx.fillRect(H.L - op * half, H.FLOOR, half, 12); ctx.fillRect(H.X + op * half, H.FLOOR, half, 12); ctx.restore();
    P.hopPins.forEach(([x, y]) => { ctx.fillStyle = '#9aa3b8'; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); }); }
  // 핀
  P.pegs.forEach(([x, y], i) => { let f = 0; for (const h of pegHit[i]) { const d = t - h; if (d >= 0 && d < .3) f = Math.max(f, 1 - d / .3); }
    ctx.shadowColor = 'rgba(140,200,255,.9)'; ctx.shadowBlur = 10 + f * 30; ctx.fillStyle = `rgb(${150 + f * 105},${200 + f * 55},255)`;
    ctx.beginPath(); ctx.moveTo(x, y - 12 - f * 3); ctx.lineTo(x + 9 + f * 2, y); ctx.lineTo(x, y + 12 + f * 3); ctx.lineTo(x - 9 - f * 2, y); ctx.closePath(); ctx.fill(); });
  ctx.shadowBlur = 0;
  // 칸 강조 + 라벨
  const b8 = !HS || t < T_OVER ? null : ballAt(C8, t);
  const hot = new Set(); for (const b of [t > T_OVER + .6 ? b7 : null, b8]) if (b && b[1] > 760) hot.add(binOf(b[0]));
  const lit = {}; if (t >= L7) lit[C7.bin] = L7; if (t >= L8) lit[C8.bin] = L8;
  for (let i = 0; i < G.BIN.N; i++) { const x = BX(i); let a = hot.has(i) ? .26 : 0; if (lit[i] !== undefined) a = .42 + .14 * Math.sin((t - lit[i]) * 8);
    if (a > 0) { const g = ctx.createLinearGradient(0, G.BIN.T - 40, 0, G.BIN.B); g.addColorStop(0, 'rgba(255,214,94,0)'); g.addColorStop(1, `rgba(255,214,94,${a})`); ctx.fillStyle = g; ctx.fillRect(x - BW / 2 + 5, G.BIN.T - 40, BW - 10, G.BIN.B - G.BIN.T + 40); }
    const big = lit[i] !== undefined ? back(prog(t, lit[i], .35), 2.2) : 0;
    ctx.fillStyle = hot.has(i) || big ? '#ffd45e' : '#e9eef9'; ctx.font = `900 ${Math.round(29 + 5 * big)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(P.binLab[i], x, G.BIN.B + 36 + 4 * big); }
  ctx.fillStyle = '#9cc2ff'; ctx.font = `900 29px ${FONT}`; ctx.fillText(P.tubeLab, TB.X, G.BIN.B + 36);
  // 구슬(핀볼판)
  if (t >= T_OVER + .6) marble(b7[0], b7[1], G.R7, b7[2], false, NA, t >= L7 ? .55 + .25 * Math.sin((t - L7) * 8) : 0);
  if (HS && t >= T_M8) { if (!b8 || t < R8T) { let k8 = 0; A.radii.forEach((rr, i) => { if (A.side[i] !== 8) return; const p = A.frames[Math.min(A.frames.length - 1, Math.round(T_M8 * A.fps))][i]; const d = Math.hypot(p[0] - C8P[0], p[1] - C8P[1]), lag = Math.min(.5, d / 200 * .5); if (clamp((t - T_M8) / (T_M8E - T_M8)) >= lag + .5) k8++; });
      const pop = t >= T_M8E ? back(prog(t, T_M8E, .3), 3) : 0, r = G.R8 * Math.sqrt(k8 / N8) * (t >= T_M8E ? .9 + .1 * pop : 1); if (r > .5) marble(C8P[0], C8P[1], r, (t - T_M8) * 2, true, NS, .3); }
    else marble(b8[0], b8[1], G.R8, b8[2], true, NS, t >= L8 ? .5 + .25 * Math.sin((t - L8) * 8) : 0); }
  for (const [L, C, k] of [[L7, C7, 1], [L8, C8, .7]]) { if (!C) continue; const s = t - L; if (s >= 0 && s < .8) sparks.forEach(([a, sp, dl]) => { const q = clamp((s - dl * .2) / .6); if (q <= 0 || q >= 1) return; ctx.fillStyle = `rgba(255,${220 + 35 * (1 - q)},120,${1 - q})`; ctx.fillRect(BX(C.bin) + Math.cos(a) * sp * eo(q) * .35 * k, G.BIN.B - 40 - Math.abs(Math.sin(a)) * sp * eo(q) * .5 * k + q * q * 40, 5, 5); }); }
  // 자루
  sack(t, TB.X + 40, 513, NA + '번에', '더'); if (HS) sack(t, H.X + 26, 513, NS + '번', '새로');
  // 라벨들
  const nIn = A.splash.filter(s => s[0] <= t).length;
  pill(TB.R + 14, Math.max(b7[1], 700), P.tagA, P.tagB, 26, 'rgba(235,242,255,.95)', '#1b2442', 'left', clamp(prog(t, .2, .3)) * (1 - prog(t, T_OVER - .4, .3)), '#2a5cc0');
  pill(480, 650, `${NA}번에 든 돈 ×${(1 + P.addRatio * nIn / N7).toFixed(2)}`, null, 32, 'rgba(10,16,34,.88)', '#ffe9a8', 'center', clamp(prog(t, .8, .3)));
  if (HS) pill(H.L - 14, 640, NS + '번 새 씨앗', null, 26, 'rgba(255,236,170,.96)', '#3a2500', 'right', clamp(prog(t, T_M8E, .3)) * (1 - prog(t, R8T + .5, .3)));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  appear(t1, prog(t, 0, .25), 18, .9); appear(t2, prog(t, .1, .25), 24, .9);
  const cq = eo(prog(t, .15, .3)); chip.style.opacity = cq; chip.style.transform = `translateX(-50%) translateY(${(1 - cq) * -14}px)`;
  const eq = prog(t, T_END, .4); end.style.opacity = clamp(eq * 2); end.style.transform = `translateX(-50%) scale(${eq > 0 ? .5 + .5 * back(eq, 2.4) : .5})`;
};
