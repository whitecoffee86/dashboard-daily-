// 대시보드 '코스피와 달리기' — 내 누적수익률(금색) vs 코스피(보라) 경주
// props.data = {series:[{d,me,kp}...], title, title_v, subtitle, run(초)}
// props.cues = {start, gap}
heading((vertical && P.title_v) || P.title || '코스피와 달리기', P.subtitle);
const S = P.series, n = S.length;
const B = vertical ? {x: 110, y: 780, w: 560, h: 520} : {x: 220, y: 230, w: 1260, h: 600};
let mn = Infinity, mx = -Infinity;
S.forEach(p => { mn = Math.min(mn, p.me, p.kp); mx = Math.max(mx, p.me, p.kp); });
const pad = (mx - mn) * 0.08; mn -= pad; mx += pad * 1.6;
const X = i => B.x + i / (n - 1) * B.w, Y = v => B.y + (1 - (v - mn) / (mx - mn)) * B.h;
const RG = mx - mn, stepV = RG > 160 ? 100 : RG > 60 ? 50 : RG > 20 ? 10 : RG > 8 ? 5 : 2;
let g = '';
for (let v = Math.ceil(mn / stepV) * stepV; v <= mx; v += stepV)
  g += `<line x1="${B.x}" x2="${B.x + B.w}" y1="${Y(v)}" y2="${Y(v)}" stroke="rgba(255,255,255,${v === 0 ? .28 : .07})" stroke-width="2"/>` +
       `<text x="${B.x - 16}" y="${Y(v) + 9}" fill="#7f8dab" font-size="26" text-anchor="end">${v > 0 ? '+' : ''}${v}%</text>`;
g += `<text x="${B.x}" y="${B.y + B.h + 46}" fill="#7f8dab" font-size="26">${P.from || S[0].d.slice(5).replace('-', '.')}</text>`;
g += `<text x="${B.x + B.w}" y="${B.y + B.h + 46}" fill="#7f8dab" font-size="26" text-anchor="end">${P.to || S[n - 1].d.slice(5).replace('-', '.')}</text>`;
g += `<path id="area" d="" fill="rgba(232,200,106,.10)"/>`;
g += `<path id="kp" d="" fill="none" stroke="#9b8cf0" stroke-width="${vertical ? 4 : 5}" stroke-linejoin="round" stroke-linecap="round"/>`;
g += `<path id="me" d="" fill="none" stroke="#e8c86a" stroke-width="${vertical ? 6 : 7}" stroke-linejoin="round" stroke-linecap="round" style="filter:drop-shadow(0 0 10px rgba(232,200,106,.6))"/>`;
g += `<circle id="dk" r="10" fill="#9b8cf0"/><circle id="dm" r="13" fill="#e8c86a" stroke="#0b1430" stroke-width="4"/>`;
g += `<path id="br" d="" fill="none" stroke="#e8c86a" stroke-width="4" stroke-dasharray="8 8" opacity="0"/>`;
const sv = svg(g);
const pm = sv.querySelector('#me'), pk = sv.querySelector('#kp'), ar = sv.querySelector('#area');
const dm = sv.querySelector('#dm'), dk = sv.querySelector('#dk'), br = sv.querySelector('#br');
const lab = (cls, color) => { const e = el('div', 'abs', ''); e.style.cssText += `font-size:${vertical ? 34 : 44}px;font-weight:900;color:${color};white-space:nowrap;text-shadow:0 2px 12px rgba(0,0,0,.6)`; return e; };
const LM = lab('m', '#e8c86a'), LK = lab('k', '#b8acff');
const gap = el('div', 'abs', ''); gap.style.cssText += `font-size:${vertical ? 54 : 64}px;font-weight:900;color:#e8c86a;white-space:nowrap;text-shadow:0 0 30px rgba(232,200,106,.5)`;
const T0 = at('start', .4), RUN = P.run || 4.2;
const pathTo = (key, k, f) => {
  let d = '';
  for (let i = 0; i <= k; i++) d += (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(S[i][key]).toFixed(1);
  if (k < n - 1 && f > 0) d += 'L' + lerp(X(k), X(k + 1), f).toFixed(1) + ',' + lerp(Y(S[k][key]), Y(S[k + 1][key]), f).toFixed(1);
  return d;
};
return t => {
  const q = eio(prog(t, T0, RUN)), pos = q * (n - 1), k = Math.floor(pos), f = pos - k;
  const cur = key => k >= n - 1 ? S[n - 1][key] : lerp(S[k][key], S[k + 1][key], f);
  const xm = X(pos), ym = Y(cur('me')), yk = Y(cur('kp'));
  pm.setAttribute('d', pathTo('me', k, f)); pk.setAttribute('d', pathTo('kp', k, f));
  ar.setAttribute('d', pathTo('me', k, f) + `L${xm},${Y(Math.max(mn, 0))}L${X(0)},${Y(Math.max(mn, 0))}Z`);
  dm.setAttribute('cx', xm); dm.setAttribute('cy', ym); dk.setAttribute('cx', xm); dk.setAttribute('cy', yk);
  const show = t > T0 ? 1 : 0;
  [dm, dk].forEach(c => c.style.opacity = show);
  LM.textContent = `나 ${cur('me') >= 0 ? '+' : ''}${cur('me').toFixed(1)}%`;
  LK.textContent = `코스피 ${cur('kp') >= 0 ? '+' : ''}${cur('kp').toFixed(1)}%`;
  const lx = vertical ? xm + 24 : Math.min(xm + 22, B.x + B.w - 280);
  let lyM = ym - 64, lyK = yk + 14;
  if (lyK - lyM < 60) lyK = lyM + 60;
  LM.style.left = lx + 'px'; LM.style.top = lyM + 'px'; LM.style.opacity = show;
  LK.style.left = lx + 'px'; LK.style.top = lyK + 'px'; LK.style.opacity = show;
  // 격차 괄호 + 숫자
  const gq = eo(prog(t, at('gap', T0 + RUN + .4), .6));
  const xe = X(n - 1) + 26, y1 = Y(S[n - 1].me), y2 = Y(S[n - 1].kp);
  br.setAttribute('d', `M${xe},${y1} h18 V${y2} h-18`); br.setAttribute('opacity', gq);
  gap.textContent = `격차 +${(S[n - 1].me - S[n - 1].kp).toFixed(1)}%p`;
  gap.style.left = (vertical ? B.x + 20 : Math.min(xe + 40, 1460)) + 'px';
  gap.style.top = (vertical ? 668 : (y1 + y2) / 2 - 40) + 'px';
  appear(gap, gq, 24, .9 + .1 * gq);
};
