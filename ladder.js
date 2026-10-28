// [8계좌 계단식 밭] 같은 ETF를 산 가격 높이대로 계단에 깔고, 오늘 가격선이 몇 칸을 넘었는지 보여 준다. 세로(쇼츠) 전용.
// 금액은 화면에 쓰지 않는다(avg·today 는 위치 계산용). 수익률 %와 칸 번호만 표시.
// props.data = {
//   mode: "hook" | "build" | "rise" | "harvest" | "fall" | "wait",
//   product: "KODEX 레버리지", today: 69955, today_label: "오늘 종가",
//   steps: [{n:1, avg:198281}, ...],                // 보유 칸(harvest 칸은 판 직전 평단)
//   cards: [{top, title, label, value, dec, pre, unit, color}] (hook — 2장. value 는 숫자, 0부터 롤업)
//   harvest_n: [8]        (harvest — 바구니 칸, 빈 배열이면 전부 '기다림')
//   new_n: 8, new_from: 72000|null, new_label: "새로 심음"   (fall/wait — 오늘 심거나 더 심은 칸. new_from=있던 평단(추가 매수), null=새 칸)
//   note: 띠 문구(build), banner: 띠 문구(harvest/wait), foot: 면책 한 줄(harvest/wait)
//   title_v, subtitle
// }
// cues: hook {a, b, ha, hb, q} · build {start, note} · rise {line, rets} · harvest {basket, wait, banner} · fall {line, seed} · wait {banner}
heading(P.title_v || '계단식 밭', P.subtitle || '');
const GOLD = '#e8c86a', RED = '#ff6b6b', BLUE = '#6aa6ff';
const S = P.steps || [], N = S.length, M = P.mode || 'build';
const fmtP = (v, d = 1) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d) + '%';

if (M === 'hook') {
  const mk = (h, i) => {
    const col = h.color || (h.value >= 0 ? RED : BLUE);
    const d = el('div', 'abs', `<div style="font-size:30px;font-weight:800;color:#9fb0cf">${h.top || P.product || ''}</div>
      <div style="font-size:44px;font-weight:900;color:#fff;margin-top:6px">${h.title || ''}</div>
      <div style="font-size:28px;font-weight:700;color:#9fb0cf">${h.label || ''}</div>
      <div class="v" style="font-size:96px;font-weight:900;letter-spacing:-3px;line-height:1.05;margin-top:18px;color:${col}">0</div>`);
    d.style.cssText += `left:${70 + i * 480}px;top:720px;width:460px;height:520px;box-sizing:border-box;border-radius:30px;background:rgba(255,255,255,.06);border:4px solid ${col};display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center`;
    d._h = h; d._c = col; return d;
  };
  const C = P.cards.map(mk);
  const txt = (h, v) => h.unit !== undefined ? (h.pre || '') + v.toFixed(h.dec || 0) + h.unit : fmtP(v, h.dec ?? 1);
  const vs = el('div', 'abs', 'VS'); vs.style.cssText += `left:490px;top:940px;width:100px;text-align:center;font-size:54px;font-weight:900;color:${GOLD}`;
  const same = el('div', 'abs', P.same || '같은 ETF'); same.style.cssText += `left:90px;width:900px;top:1270px;text-align:center;font-size:44px;font-weight:900;color:#0c1630;background:${GOLD};border-radius:18px;padding:10px 0`;
  const qm = el('div', 'abs', '?'); qm.style.cssText += `left:440px;top:860px;width:200px;text-align:center;font-size:200px;font-weight:900;color:${GOLD};text-shadow:0 0 40px ${GOLD}aa;opacity:0`;
  return t => {
    const qq = prog(t, at('q', 99), .5);
    qm.style.opacity = clamp(qq * 3); qm.style.transform = `scale(${qq > 0 ? .3 + .7 * back(clamp(qq), 2.6) : .3}) rotate(${8 * Math.sin(t * 4)}deg)`;
    C.forEach((c, i) => {
      const t0 = i ? at('b', .3) : at('a', .1), qi = prog(t, t0, .45), qn = eo(prog(t, t0, 1.6));
      c.style.opacity = clamp(qi * 3);
      c.style.transform = `translateY(${5 * Math.sin(t * 2.2 + i * 1.7)}px) scale(${qi < 1 ? .4 + .6 * back(qi, 2.2) : 1}) rotateY(${(1 - eo(qi)) * 90}deg)`;
      const hq = prog(t, at(i ? 'hb' : 'ha', 99), .6), bump = hq > 0 && hq < 1 ? Math.sin(hq * Math.PI) : 0;
      if (bump) c.style.transform += ` scale(${1 + .12 * bump})`;
      c.querySelector('.v').textContent = txt(c._h, c._h.value * qn);
      c.style.boxShadow = `0 0 ${14 + 24 * pulse(t + i * .5, 1.6)}px ${c._c}88`;
      if (qq > 0) c.style.filter = `brightness(${1 + .25 * pulse(t + i * .5, 2)})`;
    });
    appear(vs, prog(t, .5, .4) * (1 - qq), 0, .6 + .4 * back(prog(t, .5, .4), 2));
    appear(same, prog(t, 1.4, .5), 24, .9);
  };
}

// ── 계단 (build · rise · harvest · fall · wait) ──
const NEW = S.find(s => s.n === P.new_n);
const isFall = M === 'fall' || M === 'wait';
const prices = S.map(s => s.avg).concat([P.today], NEW && P.new_from ? [P.new_from] : []);
const hi = Math.max(...prices) * 1.04, lo = Math.min(...prices) * 0.6;
const Y0 = 880, Y1 = 1340, X0 = 120, SW = Math.min(104, Math.floor(832 / Math.max(N, 1)));
const yOf = p => Y1 - (p - lo) / (hi - lo) * (Y1 - Y0);
const ret = s => (P.today / s.avg - 1) * 100;
const g = svg(`<defs><linearGradient id="soil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b4a2b"/><stop offset="1" stop-color="#2a1d14"/></linearGradient>
  <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GOLD}" stop-opacity=".38"/><stop offset="1" stop-color="${GOLD}" stop-opacity=".04"/></linearGradient></defs>
  <rect id="glow" x="${X0 - 30}" y="${Y1}" width="${N * SW + 60}" height="0" fill="url(#sun)"/>
  <g id="steps"></g>
  <line id="pl" x1="${X0 - 40}" x2="${X0 + N * SW + 40}" y1="${Y1}" y2="${Y1}" stroke="${GOLD}" stroke-width="6" stroke-dasharray="18 10" opacity="0"/>`);
const G = g.querySelector('#steps'), glow = g.querySelector('#glow'), pl = g.querySelector('#pl');
const parts = S.map((s, i) => {
  const x = X0 + i * SW, isNew = NEW === s;
  const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  r.setAttribute('x', x + 3); r.setAttribute('width', SW - 6);
  r.setAttribute('rx', 10); r.setAttribute('fill', 'url(#soil)'); r.setAttribute('stroke', '#8a6a44'); r.setAttribute('stroke-width', 3);
  G.appendChild(r);
  const top = el('div', 'abs', `<div class="crop" style="font-size:44px;line-height:1">🌱</div><div style="font-size:26px;font-weight:900;color:#fff">${s.n}번</div>`);
  top.style.cssText += `left:${x}px;width:${SW}px;text-align:center`;
  const tag = el('div', 'abs', fmtP(ret(s)));
  tag.style.cssText += `left:${x - 6}px;width:${SW + 12}px;text-align:center;font-size:24px;font-weight:900;color:${ret(s) >= 0 ? RED : BLUE};opacity:0`;
  const w = el('div', 'abs', '');
  w.style.cssText += `left:${x}px;width:${SW}px;text-align:center;font-size:22px;font-weight:800;color:#9fb0cf;opacity:0`;
  const place = y => { r.setAttribute('y', y); r.setAttribute('height', Y1 + 20 - y); top.style.top = (y - 84) + 'px'; tag.style.top = (y + 14) + 'px'; w.style.top = (y + 48) + 'px'; };
  return {s, x, r, top, tag, w, isNew, place, y: yOf(s.avg), y0: isNew && P.new_from ? yOf(P.new_from) : yOf(s.avg)};
});
const lab = el('div', 'abs', `${P.today_label || '오늘 가격'} ▸`); lab.style.cssText += `left:${X0 + 10}px;width:400px;font-size:30px;font-weight:900;color:${GOLD};opacity:0`;
const note = el('div', 'abs', P.note || ''); note.style.cssText += `left:90px;width:900px;top:700px;text-align:center;font-size:36px;font-weight:900;color:#0c1630;background:${GOLD};border-radius:18px;padding:10px 0;opacity:0`;
const ban = el('div', 'abs', P.banner || ''); ban.style.cssText += `left:90px;width:900px;top:700px;text-align:center;font-size:38px;font-weight:900;color:#0c1630;background:${GOLD};border-radius:18px;padding:10px 0;opacity:0`;
const foot = el('div', 'abs', P.foot || ''); foot.style.cssText += `left:240px;width:720px;top:1512px;font-size:22px;font-weight:700;color:#9fb0cf;opacity:0`;
const nl = el('div', 'abs', P.new_label || '새로 심음'); nl.style.cssText += `font-size:26px;font-weight:900;color:#0c1630;background:#7ee08a;border-radius:12px;padding:2px 10px;opacity:0;white-space:nowrap`;
const hp = parts.filter(p => (P.harvest_n || []).includes(p.s.n));
const baskets = hp.map(() => { const b = el('div', 'abs', '🧺<div style="font-size:26px;font-weight:900;color:#0c1630;background:' + GOLD + ';border-radius:12px;padding:2px 8px;margin-top:-6px">수확!</div>'); b.style.opacity = 0; return b; });
const PY = yOf(P.today);
const startY = isFall ? Math.min(...parts.filter(p => !p.isNew).map(p => p.y), Y1) - 6 : Y1 + 10;

return t => {
  // 계단 위치·등장
  const sq = M === 'fall' ? eio(prog(t, at('seed', 1.3), .9)) : 1;
  parts.forEach((p, i) => {
    let q = M === 'build' ? prog(t, at('start', .1) + i * .16, .45) : 1;
    let y = p.y;
    if (p.isNew && isFall) {
      if (P.new_from) y = lerp(p.y0, p.y, sq);            // 추가 매수: 평단이 내려앉음
      else q = M === 'fall' ? prog(t, at('seed', 1.3), .5) : 1;   // 새 칸: 떨어져 박힘
    }
    const dy = (1 - eo(q)) * -220;
    p.place(y);
    p.r.setAttribute('transform', `translate(0 ${dy})`); p.r.style.opacity = clamp(q * 2);
    p.top.style.opacity = clamp(q * 2); p.top.style.transform = `translateY(${dy}px)`;
    if (p.isNew && isFall) {
      p.r.setAttribute('stroke', '#7ee08a'); p.r.setAttribute('stroke-width', 6);
      const nq = M === 'fall' ? prog(t, at('seed', 1.3) + .4, .4) : 1;
      nl.style.left = (p.x + SW / 2 - 70) + 'px'; nl.style.top = (y - 130) + 'px';
      appear(nl, nq, 10, .7 + .3 * back(clamp(nq), 2));
    }
  });
  if (M === 'build') appear(note, prog(t, at('note', 1.7), .5), 24, .9);
  // 오늘 가격선
  let lq = 0, ly = Y1 + 10;
  if (M === 'rise') { lq = eio(prog(t, at('line', .15), 1.8)); ly = lerp(Y1 + 10, PY, lq); }
  else if (M === 'harvest' || M === 'wait') { lq = 1; ly = PY; }
  else if (M === 'fall') { lq = 1; ly = lerp(startY, PY, eio(prog(t, at('line', .15), 1.2))); }
  pl.setAttribute('y1', ly); pl.setAttribute('y2', ly); pl.setAttribute('opacity', lq > 0 ? 1 : 0);
  glow.setAttribute('y', ly); glow.setAttribute('height', Math.max(0, Y1 + 20 - ly));
  lab.style.top = (ly - 46) + 'px'; lab.style.opacity = lq > 0 ? 1 : 0;
  // 가격선이 넘은 칸 = 이익
  parts.forEach((p, i) => {
    const crossed = lq > 0 && !isFall && ly <= p.y + 2;
    p.top.querySelector('.crop').textContent = crossed ? '🌾' : '🌱';
    if (!(p.isNew && isFall)) { p.r.setAttribute('stroke', crossed ? GOLD : '#8a6a44'); p.r.setAttribute('stroke-width', crossed ? 6 : 3); }
    if (crossed) p.top.style.transform = `translateY(${-8 * pulse(t, 1.4)}px) scale(${1 + .08 * pulse(t, 1.4)})`;
    if (p.isNew && isFall && M === 'wait') p.top.style.transform = `translateY(${-6 * pulse(t, 1.2)}px)`;
    const showTag = (M === 'harvest' || M === 'wait') ? 1 : M === 'rise' ? (crossed ? prog(t, at('line', .15) + 1.6, .3) : prog(t, at('rets', 2.4) + (N - 1 - i) * .08, .3)) : 0;
    appear(p.tag, p.isNew && isFall ? 0 : showTag, 10, .7 + .3 * back(clamp(showTag), 2));
  });
  if (M === 'harvest') {
    hp.forEach((p, k) => {
      const q = prog(t, at('basket', .15) + k * .2, .5);
      baskets[k].style.cssText = `position:absolute;left:${p.x - 10}px;width:${SW + 20}px;top:${p.y - 200 - 30 * back(clamp(q), 2)}px;text-align:center;font-size:70px;opacity:${clamp(q * 3)};transform:scale(${.4 + .6 * back(clamp(q), 2.4)})`;
    });
    parts.filter(p => !hp.includes(p)).forEach((p, i) => { p.w.textContent = '기다림'; appear(p.w, prog(t, at('wait', .6) + i * .1, .3), 8, 1); });
  }
  if (M === 'harvest' || M === 'wait') { appear(ban, prog(t, at('banner', 1.3), .5), 24, .9); appear(foot, prog(t, .3, .4), 0, 1); }
};
