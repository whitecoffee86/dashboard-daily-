// 손절 날(밭): 날씨(시장)에 따라 씨앗이 땅속을 오르내림 → 물타기 날은 물뿌리개로 잠깐 떠오름 → 마지막 날 −15% 정리선 지층이 무너지며 정리 (세로 1080x1920)
// 데이터는 shorts_kit/build.py 가 plan.json 으로 채운다. D[i] = [시각, 날짜, 수익률, 지수변화, 날씨, 라벨, 물타기번호|null, 본전코앞]
el('style', null, `#pill,#topbar{display:none!important}
.sk-t{position:absolute;left:0;right:0;text-align:center;font-weight:900;color:#fff;letter-spacing:-2px;white-space:nowrap;text-shadow:0 4px 24px rgba(0,0,0,.6)}
.sk-t b{color:#ffb070}
.sk-chip{position:absolute;left:50%;top:398px;white-space:nowrap;font-size:30px;font-weight:800;color:#d8e2f5;background:rgba(10,16,34,.35);border:2px solid rgba(255,255,255,.2);padding:7px 24px;border-radius:30px}
.sk-end{position:absolute;left:50%;top:760px;white-space:nowrap;text-align:center;background:rgba(10,16,34,.95);border:3px solid #ff9a52;border-radius:30px;padding:20px 44px;box-shadow:0 0 60px rgba(255,140,60,.3),0 20px 40px rgba(0,0,0,.5)}
.sk-end .a{font-size:48px;font-weight:900;color:#fff}.sk-end .a i{font-style:normal;color:#7fb0ff;font-size:80px}
.sk-end .s{font-size:31px;font-weight:800;color:#c9d4ea;margin-top:8px}`);
const cv = el('canvas', null); cv.width = 1080; cv.height = 1920; cv.style.cssText = 'position:absolute;left:0;top:0;width:1080px;height:1920px';
const ctx = cv.getContext('2d');
const t1 = el('div', 'sk-t', P.title1); t1.style.cssText += 'top:226px;font-size:56px';
const t2 = el('div', 'sk-t', P.title2); t2.style.cssText += 'top:288px;font-size:80px';
const chip = el('div', 'sk-chip', P.chip);
const end = el('div', 'sk-end', P.end); end.style.opacity = 0;
const G = P.G, SHD = P.shards, FONT = '"Noto Sans CJK KR",sans-serif', CX = G.CX;
const yOf = p => G.Y0 - p * G.S, PY = yOf(G.PANE), TH = 26;
const D = P.days, ADDS = P.adds, R_A = P.rA, NADD = P.nAdd, NUM = String(P.n);
const rPhys = t => { let r = R_A; for (const a of ADDS) if (t >= a.t + .9) r = a.rB; return r; };
const radAt = t => { let r = R_A; for (const a of ADDS) { if (t >= a.t + 1.0) r = a.rB; else if (t >= a.t) { r = r + (a.rB - r) * clamp((t - a.t - .3) / .7); break; } else break; } return r; };
// ---------- 씨앗 움직임(스프링·감쇠 + 지층 접촉) ----------
const HZ = 240, TMAX = P.dur + 1;
const Y = new Float32Array(Math.ceil(TMAX * HZ)); let y = G.SURF - 60, v = 0, hit = null, shatter = null, cut = null;
const plunge = D[D.length - 1][0];
for (let i = 0; i < Y.length; i++) {
  const t = i / HZ; let tgt = G.SURF - 60, K = 60, Cd = 2 * .5 * Math.sqrt(60);
  for (const d of D) if (t >= d[0]) tgt = yOf(d[2]);
  for (const a of ADDS) if (t >= a.t2 && t < a.tNext) tgt = yOf(a.pct);
  if (t >= plunge) { K = 30; Cd = 2 * .45 * Math.sqrt(30); }
  const r = rPhys(t);
  if (cut !== null && t >= cut) { v += 1500 / HZ; y += v / HZ; Y[i] = y; continue; }
  v += (K * (tgt - y) - Cd * v) / HZ; y += v / HZ;
  if (t >= plunge && shatter === null && y + r >= PY - TH / 2) { if (hit === null) hit = t; y = PY - TH / 2 - r; v = -v * .12; }
  if (hit !== null && shatter === null && t >= hit + .4) { shatter = t; v = 320; }
  if (shatter !== null && cut === null && t >= shatter + 1.15) cut = t;
  Y[i] = y;
}
const sY = t => Y[Math.max(0, Math.min(Y.length - 1, Math.round(t * HZ)))];
const T_HIT = hit, T_SH = shatter, T_CUT = cut, T_END = P.tend;
const dayAt = t => { let c = null; for (const d of D) if (t >= d[0]) c = d; return c; };
// ---------- 고정 배경(하늘 제외) ----------
const base = document.createElement('canvas'); base.width = 1080; base.height = 1920;
{ const b = base.getContext('2d'), R = rnd(14);
  const soil = b.createLinearGradient(0, G.SURF, 0, 1920); soil.addColorStop(0, '#6b4528'); soil.addColorStop(.2, '#4e321d'); soil.addColorStop(.6, '#2f1f16'); soil.addColorStop(1, '#120c09'); b.fillStyle = soil; b.fillRect(0, G.SURF, 1080, 1920 - G.SURF);
  for (let i = 0; i < 700; i++) { const x = R() * 1080, y = G.SURF + 10 + R() * 900, r = 1.5 + R() * 4; b.fillStyle = `rgba(${150 + R() * 60},${110 + R() * 40},${80 + R() * 30},${.15 + R() * .22})`; b.beginPath(); b.ellipse(x, y, r, r * .7, R() * 3, 0, 7); b.fill(); }
  const grass = b.createLinearGradient(0, G.SURF - 10, 0, G.SURF + 8); grass.addColorStop(0, '#4f8e40'); grass.addColorStop(1, '#2a5a26'); b.fillStyle = grass; b.fillRect(0, G.SURF - 6, 1080, 14);
  b.fillStyle = '#7a4f2c'; b.beginPath(); b.ellipse(CX, G.SURF - 2, 90, 20, 0, Math.PI, 0); b.fill();
  // 단면 창
  b.fillStyle = 'rgba(20,12,8,.45)'; b.fillRect(G.TL, G.SURF + 10, G.TR - G.TL, G.FLOOR - G.SURF - 10);
  b.strokeStyle = 'rgba(230,240,255,.35)'; b.lineWidth = 4; b.strokeRect(G.TL, G.SURF + 10, G.TR - G.TL, G.FLOOR - G.SURF - 10);
  // 눈금(왼쪽)
  b.textAlign = 'right'; b.textBaseline = 'middle';
  for (let p = 0; p >= -20; p -= 5) { const y = yOf(p); b.fillStyle = 'rgba(255,255,255,.14)'; b.fillRect(G.TL, y - 1, G.TR - G.TL, 2); b.fillStyle = '#e9eef9'; b.font = `900 30px ${FONT}`; b.fillText(p === 0 ? '본전 0%' : `${p}%`, G.TL - 16, y); }
  b.setLineDash([12, 9]); b.strokeStyle = '#7fb0ff'; b.lineWidth = 4; b.beginPath(); b.moveTo(G.TL, yOf(-5)); b.lineTo(G.TR, yOf(-5)); b.stroke(); b.setLineDash([]);
  b.fillStyle = '#9cc2ff'; b.font = `800 24px ${FONT}`; b.fillText('추가 매수선', G.TL - 16, yOf(-5) + 30);
  b.fillStyle = '#ffb070'; b.font = `900 26px ${FONT}`; b.fillText('정리선', G.TL - 16, PY + 32);
  // 표지
  b.fillStyle = '#8a5a2c'; b.fillRect(CX + 150, G.SURF - 90, 10, 84);
}
// 지층(정리선) 모양
const crust = (() => { const R = rnd(8), pts = []; for (let x = G.TL; x <= G.TR; x += 12) pts.push([x, PY - TH / 2 + (R() - .5) * 6]); for (let x = G.TR; x >= G.TL; x -= 12) pts.push([x, PY + TH / 2 + (R() - .5) * 6]); return pts; })();
function seed(x, y, r, glow) {
  ctx.save(); if (glow > 0) { ctx.shadowColor = `rgba(255,214,94,${glow})`; ctx.shadowBlur = 40 * glow; }
  const g = ctx.createRadialGradient(x - r * .3, y - r * .35, r * .1, x, y, r); g.addColorStop(0, '#fff6c4'); g.addColorStop(.45, '#ffc93a'); g.addColorStop(1, '#9a6408');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(90,50,0,.5)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(x - r * .38, y - r * .45, r * .3, r * .14, -.7, 0, 7); ctx.fill();
  ctx.font = `900 ${Math.round(r * .95)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(60,30,0,.7)'; ctx.strokeText(NUM, x, y + 1); ctx.fillStyle = '#fff'; ctx.fillText(NUM, x, y + 1); ctx.restore();
}
function pill(x, y, txt, sub, fs, bg, fg, align = 'center', alpha = 1) {
  if (alpha <= 0) return; ctx.save(); ctx.globalAlpha = alpha; ctx.font = `900 ${fs}px ${FONT}`; let w = ctx.measureText(txt).width; if (sub) { ctx.font = `800 22px ${FONT}`; w = Math.max(w, ctx.measureText(sub).width); } w += 30; const h = fs + 20 + (sub ? 28 : 0), x0 = align === 'right' ? x - w : align === 'left' ? x : x - w / 2;
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(x0, y - h / 2, w, h, 14); ctx.fill(); ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 ${fs}px ${FONT}`; ctx.fillText(txt, x0 + w / 2, sub ? y - 13 : y + 1);
  if (sub) { ctx.font = `800 22px ${FONT}`; ctx.fillStyle = '#c9d4ea'; ctx.fillText(sub, x0 + w / 2, y + 20); } ctx.restore();
}
const shardAt = (i, s) => { const F = SHD.frames, fi = Math.min(F.length - 2, Math.max(0, Math.floor(s * SHD.fps))), fr = clamp(s * SHD.fps - fi), a = F[fi][i], b = F[fi + 1][i]; return [lerp(a[0], b[0], fr), lerp(a[1], b[1], fr), lerp(a[2], b[2], fr)]; };
const WR = rnd(6), rain = [...Array(110)].map(() => [WR() * 1180 - 50, WR() * 700, .7 + WR() * .6]);
const clouds = [...Array(7)].map(() => [WR() * 1080, 470 + WR() * 120, 150 + WR() * 120, 45 + WR() * 25, WR()]);
const drops = []; for (const a of ADDS) for (let i = 0; i < NADD; i++) drops.push([a.t + i * .03, CX + 40 + (WR() - .5) * 50, WR()]);
const bolt = (x0, seedv) => { const R = rnd(seedv), pts = [[x0, 470]]; let x = x0, y = 470; while (y < G.SURF) { y += 30 + R() * 40; x += (R() - .5) * 60; pts.push([x, Math.min(y, G.SURF)]); } return pts; };
const bolts = D.map((d, i) => d[4] === 'storm' ? bolt(560 + (i * 97) % 300, 50 + i) : null);
return t => {
  const day = dayAt(t), w = day ? day[4] : 'dusk', ts = day ? t - day[0] : 0, last = day === D[D.length - 1];
  let shx = 0, shy = 0; for (const [T0, s, d] of [[T_HIT, 8, .25], [T_SH, 16, .5], [T_CUT, 6, .3]]) { if (T0 === null) continue; const dl = t - T0; if (dl >= 0 && dl < d) { shx += Math.sin(dl * 70) * s * (1 - dl / d); shy += Math.cos(dl * 60) * s * .7 * (1 - dl / d); } }
  ctx.setTransform(1, 0, 0, 1, shx, shy); ctx.clearRect(-60, -60, 1200, 2040);
  // 하늘(날씨 = 그날 코스피)
  const pal = { dusk: [[11, 20, 48], [200, 140, 100]], rain: [[40, 48, 66], [110, 116, 130]], storm: [[18, 22, 36], [60, 64, 80]], sun: [[70, 140, 220], [255, 226, 160]], cloud: [[70, 84, 110], [170, 176, 186]] };
  const prevW = (() => { const i = D.indexOf(day); return i > 0 ? D[i - 1][4] : 'dusk'; })(), k = clamp(ts / .5);
  const cmix = (a, b) => a.map((v2, i) => Math.round(v2 + (b[i] - v2) * k));
  const sky = ctx.createLinearGradient(0, 0, 0, G.SURF); sky.addColorStop(0, `rgb(${cmix(pal[prevW][0], pal[w][0])})`); sky.addColorStop(1, `rgb(${cmix(pal[prevW][1], pal[w][1])})`); ctx.fillStyle = sky; ctx.fillRect(-60, -60, 1200, G.SURF + 60);
  if (w === 'sun' || (w === 'cloud')) { const a = w === 'sun' ? k : .45 * k; const sx = 860, sy = 560; const gl = ctx.createRadialGradient(sx, sy, 10, sx, sy, 300); gl.addColorStop(0, `rgba(255,240,170,${.7 * a})`); gl.addColorStop(1, 'rgba(255,220,120,0)'); ctx.fillStyle = gl; ctx.fillRect(sx - 300, sy - 300, 600, 600); ctx.fillStyle = `rgba(255,214,94,${a})`; ctx.beginPath(); ctx.arc(sx, sy, 48, 0, 7); ctx.fill(); }
  if (w === 'rain' || w === 'storm' || w === 'cloud') { const a = (w === 'cloud' ? .55 : 1) * k; clouds.forEach(([x0, y0, rx, ry, ph], i) => { const x = x0 + Math.sin(t * .4 + ph * 6) * 40; ctx.fillStyle = `rgba(${55 + ph * 30},${60 + ph * 30},${75 + ph * 30},${.9 * a})`; ctx.beginPath(); ctx.ellipse(x, y0, rx, ry, 0, 0, 7); ctx.ellipse(x + rx * .5, y0 - ry * .5, rx * .6, ry * .9, 0, 0, 7); ctx.fill(); }); }
  if (w === 'rain' || w === 'storm') { const n = w === 'storm' ? (last ? 110 : 90) : 45; ctx.strokeStyle = `rgba(170,190,230,${.5 * k})`; ctx.lineWidth = 2; ctx.beginPath(); rain.slice(0, n).forEach(([x0, y0, sp]) => { const yy = 460 + (y0 + t * 1000 * sp) % (G.SURF - 460), x = x0 - (yy - 460) * .2; ctx.moveTo(x, yy); ctx.lineTo(x - 8, yy + 28); }); ctx.stroke(); }
  const bi = D.indexOf(day); if (bolts[bi] && ts < .35) { const a = 1 - ts / .35; ctx.fillStyle = `rgba(220,230,255,${.35 * a})`; ctx.fillRect(-60, -60, 1200, G.SURF + 60); ctx.strokeStyle = `rgba(255,255,230,${a})`; ctx.lineWidth = 5; ctx.beginPath(); bolts[bi].forEach(([x, y2], j) => j ? ctx.lineTo(x, y2) : ctx.moveTo(x, y2)); ctx.stroke(); }
  if (T_SH !== null && t > T_SH && t < T_SH + .4) { const a = 1 - (t - T_SH) / .4; ctx.fillStyle = `rgba(230,235,255,${.5 * a})`; ctx.fillRect(-60, -60, 1200, G.SURF + 60); }
  ctx.drawImage(base, 0, 0);
  // 정리선 지층(무너지기 전) + 금
  if (T_SH === null || t < T_SH) { ctx.fillStyle = '#8a5a34'; ctx.beginPath(); crust.forEach(([x, y2], j) => j ? ctx.lineTo(x, y2) : ctx.moveTo(x, y2)); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#ffb070'; ctx.lineWidth = 3; ctx.stroke();
    if (T_HIT !== null && t >= T_HIT) { const q = clamp((t - T_HIT) / .35); ctx.strokeStyle = 'rgba(20,10,0,.9)'; ctx.lineWidth = 3; ctx.beginPath(); for (let j = 0; j < 7; j++) { const a = j / 7 * 6.283; ctx.moveTo(CX, PY); ctx.lineTo(CX + Math.cos(a) * 140 * eo(q), PY + Math.sin(a) * Math.min(TH / 2, 140 * eo(q) * .15)); } ctx.stroke(); } }
  else { const s = t - T_SH; SHD.shape.forEach((sh, i) => { const [x, y2, a] = shardAt(i, s); ctx.save(); ctx.translate(x, y2); ctx.rotate(a); ctx.fillStyle = '#8a5a34'; ctx.strokeStyle = '#c98a54'; ctx.lineWidth = 1.5; ctx.beginPath(); sh.forEach(([px, py], j) => j ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); });
    if (s < 1) for (let j = 0; j < 30; j++) { const a = j * 2.4, q = clamp(s / 1); ctx.fillStyle = `rgba(150,110,70,${.6 * (1 - q)})`; ctx.beginPath(); ctx.arc(CX + Math.cos(a) * 160 * eo(q) * (j % 3 + 1) / 3, PY + Math.sin(a) * 40 * eo(q) + q * q * 80, 3 + (j % 4), 0, 7); ctx.fill(); } }
  // 물타기: 금빛 물뿌리개 → 물방울이 흙으로 스며 씨앗까지
  const by = sY(t);
  for (const AD of ADDS) { const T_ADD = AD.t; const a = clamp(prog(t, T_ADD - .4, .3)) * (1 - prog(t, T_ADD + 1.1, .3)); if (a > 0) { const tilt = eo(prog(t, T_ADD - .3, .3)) * (1 - prog(t, T_ADD + 1.0, .3)); ctx.save(); ctx.globalAlpha = a; ctx.translate(CX + 120, 600); ctx.rotate(-.7 * tilt);
      const cg = ctx.createLinearGradient(-50, -40, 50, 40); cg.addColorStop(0, '#ffe9a0'); cg.addColorStop(1, '#b07a12'); ctx.fillStyle = cg; ctx.beginPath(); ctx.roundRect(-45, -32, 90, 64, 14); ctx.fill();
      ctx.strokeStyle = '#b07a12'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(-45, -10); ctx.lineTo(-100, -40); ctx.stroke(); ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(20, -32, 26, Math.PI, 0); ctx.stroke(); ctx.restore(); } }
  for (const [t0, x0, ph] of drops) { const s = t - t0; if (s < 0) continue; let x = x0 + (CX - x0) * clamp(s / .8), y2; if (s < .25) y2 = 560 + 800 * s * s + 120 * s; else y2 = 590 + 400 * (s - .25); if (y2 > by - 10 || s > 2) continue; ctx.fillStyle = y2 < G.SURF ? 'rgba(255,214,94,.95)' : 'rgba(255,214,94,.75)'; ctx.beginPath(); ctx.ellipse(x + Math.sin(s * 20 + ph * 6) * (y2 > G.SURF ? 6 : 0), y2, 5, 7, 0, 0, 7); ctx.fill(); }
  // 11/2 거의 본전: 새싹이 고개를 내밀었다가 11/3에 시듦
  D.forEach((sp, j) => { if (!sp[7] || !D[j + 1]) return; const sq = clamp(prog(t, sp[0] + .5, .4)) * (1 - prog(t, D[j + 1][0], .15)); if (sq > 0 && by < G.SURF + 90) { ctx.strokeStyle = '#5fbf4a'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(CX, by - 20); ctx.quadraticCurveTo(CX + 6, G.SURF - 10, CX + 4, G.SURF - 30 * sq); ctx.stroke(); ctx.fillStyle = '#7fd36a'; ctx.beginPath(); ctx.ellipse(CX + 16, G.SURF - 30 * sq, 14 * sq, 7 * sq, -.4, 0, 7); ctx.fill(); } });
  // 씨앗
  const R = radAt(t);
  ctx.save(); ctx.beginPath(); ctx.rect(G.TL - 4, G.SURF - 120, G.TR - G.TL + 8, G.FLOOR - G.SURF + 120); ctx.clip();
  seed(CX, by, R, ADDS.some(a => t >= a.t + .3 && t < a.t + 1.4) ? .6 : 0); ctx.restore();
  // 정리 도장 + 빈 밭
  if (T_CUT !== null && t > T_CUT - .05) { const q = clamp((t - T_CUT + .05) / .25); ctx.save(); ctx.translate(CX + 170, sY(T_CUT)); ctx.rotate(-.15); ctx.scale(1.6 - .6 * eo(q), 1.6 - .6 * eo(q)); ctx.globalAlpha = q; ctx.strokeStyle = '#ff6a4a'; ctx.lineWidth = 6; ctx.strokeRect(-70, -32, 140, 64); ctx.fillStyle = '#ff6a4a'; ctx.font = `900 40px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('정리', 0, 2); ctx.restore(); }
  pill(CX + 155, G.SURF - 104, T_CUT !== null && t > T_CUT + .3 ? NUM + '번 비움' : NUM + '번 밭', null, 26, T_CUT !== null && t > T_CUT + .3 ? 'rgba(255,154,82,.95)' : 'rgba(255,248,225,.95)', '#3a2000', 'center');
  // 날짜·날씨 라벨 + 씨앗 옆 수익률
  if (day) { pill(270, 640, `${day[1]} ${day[5]}`, null, 32, day[3] >= 0 ? 'rgba(255,236,170,.96)' : 'rgba(30,40,64,.92)', day[3] >= 0 ? '#5a3512' : '#9cc2ff', 'center', clamp(ts / .25)); }
  if (day && (T_CUT === null || t < T_CUT + .2)) { let pct = day[2], sub = day === D[0] ? '심음' : null; const AD = day[6] != null ? ADDS[day[6]] : null; if (AD && t >= AD.t2) { pct = AD.pct; sub = '물타기 → 평단 낮아짐'; } if (day[7] && t > day[0] + .5) sub = '본전 코앞!';
    pill(G.TR + 18, Math.max(760, Math.min(by, 1520)), `${Math.abs(pct) < .05 ? '0%' : (pct > 0 ? '+' : '−') + Math.abs(pct).toFixed(1) + '%'}`, sub, 36, 'rgba(10,16,34,.9)', pct < 0 ? '#9cc2ff' : '#ffe9a8', 'left'); }
  for (const AD of ADDS) if (t > AD.t - .3 && t < AD.t2 + .2) pill(CX + 120, 520, `${AD.date} 물타기 (추가 매수)`, null, 28, 'rgba(255,236,170,.96)', '#5a3512', 'center', clamp(prog(t, AD.t - .3, .3)) * (1 - prog(t, AD.t2, .2)));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  appear(t1, prog(t, 0, .25), 18, .9); appear(t2, prog(t, .1, .25), 24, .9);
  const cq = eo(prog(t, .15, .3)); chip.style.opacity = cq; chip.style.transform = `translateX(-50%) translateY(${(1 - cq) * -14}px)`;
  const eq = prog(t, T_END, .4); end.style.opacity = clamp(eq * 2); end.style.transform = `translateX(-50%) scale(${eq > 0 ? .5 + .5 * back(eq, 2.4) : .5})`;
};
