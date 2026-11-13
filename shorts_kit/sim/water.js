// 물타기(물통) 버전: 70%대 칸 = 유리 물통. 금화를 쏟으면 가라앉으며 수면이 오르고, 떠 있던 7번 구슬이 넘치는 물을 타고 핀볼판으로 → 30%대.
// 8번은 마른 통에서 금화끼리 뭉친 새 구슬 → 0%대. A단계(금화·수면) + C단계(두 구슬 핀볼, 실제 칸에 떨어지는 궤적 탐색)
const M = require('matter-js'), fs = require('fs');
// 사용: node water.js <out.json> <plan.json>  (plan: T7 = 물탄 계좌 구슬이 떨어질 칸, T8 = 새 씨앗 칸 또는 null)
const OUT = process.argv[2], PL = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')), NC = 40, T7 = PL.T7, T8 = PL.T8 == null ? null : PL.T8, HS = T8 !== null;
const G = {
  TUBE: { L: 50, R: 230, TOP: 600, LIP: 650, BOT: 1450, X: 140 }, L0: 1260,
  HOP: { L: 862, R: 952, TOP: 560, FLOOR: 700, X: 907 },
  TROUGH: [[234, 652], [322, 694]],
  PEGY: [790, 850, 910, 970, 1030, 1090, 1150, 1210, 1270], PEGR: 9, PEGDX: 120,
  BIN: { L: 240, R: 960, T: 1338, B: 1450, N: 7 }, WALLR: 966, R7: 26, R8: 23.9, RC: 8,
};
const HZ = 120, step = 1000 / HZ, dt = step / 1000;
let seed = 17; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const seg = (x1, y1, x2, y2, th, o = {}) => M.Bodies.rectangle((x1 + x2) / 2, (y1 + y2) / 2, Math.hypot(x2 - x1, y2 - y1) + th * .6, th, { isStatic: true, angle: Math.atan2(y2 - y1, x2 - x1), friction: .2, restitution: .2, ...o });
const T = G.TUBE, H = G.HOP;
// ---------- A단계 ----------
const hopPins = [[H.X - 22, 610], [H.X + 22, 610], [H.X, 650]];
function runA() {
  const e = M.Engine.create({ positionIterations: 12, velocityIterations: 10 }); e.gravity.y = 1.5;
  const st = { label: 'wall' };
  M.World.add(e.world, [seg(T.L - 6, T.TOP - 60, T.L - 6, T.BOT + 8, 12, st), seg(T.R + 6, T.TOP - 60, T.R + 6, T.BOT + 8, 12, st), seg(T.L - 12, T.BOT + 8, T.R + 12, T.BOT + 8, 16, { label: 'tfloor' }),
    seg(H.L - 6, H.TOP - 60, H.L - 6, H.FLOOR + 8, 12, st), seg(H.R + 6, H.TOP - 60, H.R + 6, H.FLOOR + 8, 12, st), seg(H.L - 12, H.FLOOR + 8, H.R + 12, H.FLOOR + 8, 16, { label: 'hfloor' }),
    ...hopPins.map(([x, y], i) => M.Bodies.circle(x, y, 7, { isStatic: true, label: 'hpin', restitution: .4 }))]);
  const ball = M.Bodies.circle(T.X, G.L0 - G.R7 * .25, G.R7, { isStatic: true, label: 'ball', collisionFilter: { group: -1 } }); M.World.add(e.world, ball);
  const coins = [], side = [], ev = [], splash = []; let t = 0, level = G.L0, lv = 0, by = G.L0 - G.R7 * .25, bv = 0, bx = T.X;
  const entered = new Set();
  M.Events.on(e, 'collisionStart', E => { for (const p of E.pairs) { const a = p.bodyA, b = p.bodyB; const ca = a.label === 'coin', cb = b.label === 'coin'; if (!ca && !cb) continue;
    const rv = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y); if (rv < 1.0) continue; const o = ca ? b : a, c = ca ? a : b;
    ev.push([+t.toFixed(3), +rv.toFixed(2), ca && cb ? 'coin' : o.label, +c.position.x.toFixed(0), +c.position.y.toFixed(0), c.side]); } });
  const P0 = .05, P1 = 3.0, frames = [], lvls = [], balls = []; let poured = 0, k = 0, tFull = null;
  while (t < 11.5) {
    while (poured < NC * (HS ? 2 : 1) && t >= P0 + Math.floor(poured / (HS ? 2 : 1)) * (P1 - P0) / NC) {
      const s7 = !HS || poured % 2 === 0, x = s7 ? T.X + 14 + (rnd() - .5) * 70 : H.X + (rnd() - .5) * 24;
      const c = M.Bodies.circle(x, 548, G.RC * (.9 + rnd() * .2), { restitution: .3, friction: .1, frictionAir: .004, density: .002, label: 'coin', collisionFilter: { group: s7 ? -1 : 0 } });
      c.side = s7 ? 7 : 8; M.Body.setVelocity(c, { x: (rnd() - .5) * .8, y: s7 ? 8.5 + rnd() * 1.5 : 1.5 + rnd() }); M.Body.setAngularVelocity(c, (rnd() - .5) * .3);
      M.World.add(e.world, c); coins.push(c); side.push(c.side); poured++;
    }
    // 물속 금화: 부력 + 끌림(천천히 가라앉으며 흔들림)
    for (const c of coins) { if (c.side !== 7) continue;
      if (c.position.y > level) { if (!entered.has(c.id)) { entered.add(c.id); splash.push([+t.toFixed(3), +c.position.x.toFixed(0), +Math.hypot(c.velocity.x, c.velocity.y).toFixed(2)]); }
        M.Body.applyForce(c, c.position, { x: (rnd() - .5) * c.mass * .0004, y: -c.mass * .001 * 1.5 * .55 }); M.Body.setVelocity(c, { x: c.velocity.x * .94, y: c.velocity.y * .94 }); M.Body.setAngularVelocity(c, c.angularVelocity * .96 + (rnd() - .5) * .01); } }
    const tgt = G.L0 - (G.L0 - T.LIP) * entered.size / NC;
    lv += (14 * (tgt - level) - 2 * .7 * Math.sqrt(14) * lv) * dt; level += lv * dt; if (level < T.LIP) { level = T.LIP; lv = 0; }
    if (tFull === null && entered.size === NC && level <= T.LIP + 2) tFull = t;
    const btg = level - G.R7 * .25 + Math.sin(t * 3.1) * 2.5; bv += (40 * (btg - by) - 2 * .35 * Math.sqrt(40) * bv) * dt; by += bv * dt; bx = T.X + Math.sin(t * 1.7) * 4;
    M.Body.setPosition(ball, { x: bx, y: by });
    M.Engine.update(e, step); t += dt; k++;
    if (k % 4 === 0) { frames.push(coins.map(c => [+c.position.x.toFixed(1), +c.position.y.toFixed(1), +c.angle.toFixed(2)])); lvls.push(+level.toFixed(1)); balls.push([+bx.toFixed(1), +by.toFixed(1)]); }
  }
  console.log('A: coins in tube', coins.filter(c => c.side === 7 && c.position.y > 1200).length, 'hopper', coins.filter(c => c.side === 8 && c.position.y > 560).length, 'full at', tFull && tFull.toFixed(2), 'splashes', splash.length);
  return { frames, fps: 30, ev, splash, side, radii: coins.map(c => +c.circleRadius.toFixed(2)), lvls, balls, tFull };
}
// ---------- C단계 ----------
const pegs = [];
G.PEGY.forEach((y, r) => { const off = r % 2 ? G.PEGDX / 2 : 0; for (let x = 300 + off; x < G.WALLR - 20; x += G.PEGDX) pegs.push([x, y]); });
const BW = (G.BIN.R - G.BIN.L) / G.BIN.N;
const divs = [...Array(G.BIN.N - 1)].map((_, i) => G.BIN.L + BW * (i + 1));
function trial(o) {
  const e = M.Engine.create({ positionIterations: 12, velocityIterations: 10 }); e.gravity.y = 1.9;
  const st = { isStatic: true, restitution: .45, friction: .02 };
  const B = [seg(...G.TROUGH[0], ...G.TROUGH[1], 12, { label: 'trough', friction: .1, restitution: .1 }), seg(T.R + 6, T.LIP, T.R + 6, T.BOT, 12, { ...st, label: 'wall' }), seg(T.L - 6, T.TOP - 60, T.L - 6, T.BOT, 12, { ...st, label: 'wall' }),
    seg(G.WALLR, 740, G.WALLR, G.BIN.B, 12, { ...st, label: 'wall' }), seg(H.L - 6, H.TOP, H.L - 6, H.FLOOR, 12, { ...st, label: 'wall' }), seg(H.R + 6, H.TOP, H.R + 6, H.FLOOR, 12, { ...st, label: 'wall' })];
  pegs.forEach(([x, y], i) => B.push(M.Bodies.circle(x, y, G.PEGR, { ...st, label: 'p' + i })));
  divs.forEach((x, i) => B.push(M.Bodies.rectangle(x, (G.BIN.T + G.BIN.B) / 2, 8, G.BIN.B - G.BIN.T, { ...st, label: 'd' + i, chamfer: { radius: 3.9 } })));
  B.push(seg(G.BIN.L - 8, G.BIN.B + 8, G.WALLR, G.BIN.B + 8, 16, { ...st, label: 'bfloor', restitution: .3 }));
  M.World.add(e.world, B);
  const mk = (x, y, r, lab) => { const b = M.Bodies.circle(x, y, r, { restitution: .42, friction: .05, frictionAir: .0015, density: .004, label: lab }); M.World.add(e.world, b); return b; };
  const b7 = mk(T.R - 34 + o.d7, T.LIP - 40, G.R7, 'b7'), b8 = HS ? mk(H.X + o.d8, H.FLOOR - G.R8, G.R8, 'b8') : null;
  M.Body.setVelocity(b7, { x: o.v7, y: -2.2 }); if (b8) M.Body.setStatic(b8, true);
  const S7 = { b: b7, path: [], hits: [], land: null, minX: 1e9, maxX: -1e9, last: null }, S8 = HS ? { b: b8, path: [], hits: [], land: null, minX: 1e9, maxX: -1e9, last: null } : null; const SS = HS ? [S7, S8] : [S7];
  let t = 0;
  M.Events.on(e, 'collisionStart', E => E.pairs.forEach(p => { for (const S of SS) { const o2 = p.bodyA === S.b ? p.bodyB : p.bodyB === S.b ? p.bodyA : null; if (!o2) continue;
    S.hits.push([+t.toFixed(3), o2.label, +Math.hypot(S.b.velocity.x, S.b.velocity.y).toFixed(2), +S.b.position.x.toFixed(0), +S.b.position.y.toFixed(0)]); } }));
  for (let k = 0; k < HZ * 9; k++) {
    if (b8 && b8.isStatic && t >= o.rel8) M.Body.setStatic(b8, false);
    M.Engine.update(e, step); t += dt;
    for (const S of SS) { const p = S.b.position; if (k % 2 === 0) S.path.push([+p.x.toFixed(1), +p.y.toFixed(1), +S.b.angle.toFixed(3)]);
      if (p.y > 760 && p.y < G.BIN.T) { S.minX = Math.min(S.minX, p.x); S.maxX = Math.max(S.maxX, p.x); }
      if (S.last === null && p.y > G.PEGY[G.PEGY.length - 1]) S.last = Math.floor((p.x - G.BIN.L) / BW);
      if (S.land === null && p.y > G.BIN.T + 20) S.land = t; }
    if (S7.land !== null && (!S8 || S8.land !== null) && t > Math.max(S7.land, S8 ? S8.land : 0) + 1.6) break;
  }
  for (const S of SS) { S.bin = Math.floor((S.b.position.x - G.BIN.L) / BW); S.settled = S.b.position.y > G.BIN.B - 40; S.span = S.maxX - S.minX; }
  return { S7, S8 };
}
const A = runA();
const top = (S, Tg) => S.hits.some(h => h[1][0] === 'd' && (+h[1].slice(1) === Tg - 1 || +h[1].slice(1) === Tg) && h[4] < G.BIN.T - 10);
let best = null, tries = 0, acc = 0;
const V0 = T7 <= 1 ? .8 : T7 >= 5 ? 4.6 : 3.0, VR = T7 <= 1 ? 2.8 : T7 >= 5 ? 3.2 : 2.6;
for (let i = 0; i < 9000 && acc < 60; i++) {
  tries++;
  const o = { d7: (rnd() - .5) * 8, v7: V0 + rnd() * VR, d8: (rnd() - .5) * 8, rel8: .1 + rnd() * .3 };
  const { S7, S8 } = trial(o);
  if (!(S7.bin === T7 && S7.settled && S7.land && (!S8 || (S8.bin === T8 && S8.settled && S8.land)))) continue;
  if (!(S7.land > 1.6 && S7.land < 4.2)) continue;
  acc++;
  const sc = (top(S7, T7) ? 2 : 0) + (S7.last !== T7 ? 1 : 0) + Math.min(S7.span, 420) / 300 + (S7.span > 160 ? .8 : 0) + (S8 ? (top(S8, T8) ? .6 : 0) + Math.min(S8.span, 250) / 500 + (S8.land < S7.land - .6 ? .5 : 0) : 0);
  if (!best || sc > best.sc) best = { S7, S8, o, sc };
}
if (!best) { console.error('궤적 못 찾음', tries); process.exit(1); }
const pk = S => ({ path: S.path, hits: S.hits, land: S.land, bin: S.bin });
console.log('C: tries', tries, 'acc', acc, 'score', best.sc.toFixed(2), 'b7 land', best.S7.land.toFixed(2), 'span', best.S7.span.toFixed(0), 'bin', best.S7.bin, HS ? '| b8 land ' + best.S8.land.toFixed(2) + ' bin ' + best.S8.bin : '| 새 씨앗 없음');
fs.writeFileSync(OUT, JSON.stringify({ G, pegs, divs, BW, hopPins, A, C7: pk(best.S7), C8: HS ? { ...pk(best.S8), d: best.o.d8, rel: best.o.rel8 } : null, fps: 60 }));
