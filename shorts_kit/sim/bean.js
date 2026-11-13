// 수확(햇빛) 버전: 해가 나면 8번 씨앗에서 줄기가 자라 +PCT%까지 → 금화 열매가 잎사귀에 튕기며 바구니로 우수수
// 줄기·잎·열매 위치를 만들고(렌더러와 공유), 열매가 떨어지는 물리를 기록한다.
const M = require('matter-js'), fs = require('fs');
// 사용: node bean.js <out.json> <plan.json>  (plan: PCT 수익률, unit 금화 1개 = %, bell.p 지난 최고)
const PL = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const OUT = process.argv[2], PCT = +PL.PCT, UNIT = PL.unit || .1, TOPV = Math.max(PCT, PL.bell ? PL.bell.p : 0, 1);
const G = { G0: 1330, PX: 330, S: TOPV <= 9.6 ? 75 : +(760 / (TOPV + .8)).toFixed(2), SX: 640, BASK: { L: 400, R: 900, T: 1170 }, BELL: PL.bell ? PL.bell.p : null, RC: 9, TOPV };
const yOf = p => G.G0 - p * G.S;
const spineX = y => G.SX + 16 * Math.sin((G.G0 - y) / 85);
let seed = 23; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const TOP = yOf(PCT);
// 잎: 줄기를 따라 좌우 번갈아, 바깥쪽 아래로 기울어짐(길게)
const leaves = [];
const L0 = Math.min(150, Math.max(40, (G.G0 - TOP) * .3)), LSP = Math.min(60, Math.max(40, (G.G0 - TOP) / 6));
for (let y = G.G0 - L0, k = 0; y > TOP + 30; y -= LSP, k++) { const side = k % 2 ? -1 : 1, len = 96 + rnd() * 30, ang = side * (.3 + rnd() * .14);
  leaves.push({ x: spineX(y) + side * (len / 2 + 8), y: y + Math.abs(Math.sin(ang)) * len * .25, len, ang, side, y0: y }); }
// 열매: 잎 끝마다 포도송이처럼(4·3·2 줄), 금화 1개 = 0.1%
const N = Math.max(1, Math.round(PCT / UNIT)), fruits = [];
const tips = !leaves.length ? [[spineX(TOP) + 26, TOP + 4, { side: 1, x: spineX(TOP) + 26 }], [spineX(TOP) - 26, TOP + 4, { side: -1, x: spineX(TOP) - 26 }]] : leaves.map(l => { const c = Math.cos(l.ang) * l.len / 2, s = Math.sin(l.ang) * l.len / 2; return l.side > 0 ? [l.x + c, l.y + s, l] : [l.x - c, l.y - s, l]; });
const per = tips.map((_, i) => Math.floor(N / tips.length) + (i < N % tips.length ? 1 : 0));
tips.forEach(([tx, ty, l], i) => { let n = per[i], r = 0; const rows = []; while (n > 0) { const w = Math.min(n, Math.max(1, 5 - r)); rows.push(w); n -= w; r++; }
  rows.forEach((w, r) => { for (let k = 0; k < w; k++) fruits.push({ x: +(tx - l.side * 6 + (k - (w - 1) / 2) * 20).toFixed(1), y: +(ty + 18 + r * 17).toFixed(1), leaf: leaves.indexOf(l) === -1 ? 100 + i : leaves.indexOf(l) }); }); });
// 떨어뜨리기(위에서부터 차례로)
const e = M.Engine.create({ positionIterations: 12, velocityIterations: 10 }); e.gravity.y = 1.5;
const st = { isStatic: true, friction: .05, restitution: .35 };
const B = leaves.map((l, i) => M.Bodies.rectangle(l.x, l.y, l.len, 9, { ...st, angle: l.ang, label: 'leaf' + i, chamfer: { radius: 4 } }));
const K = G.BASK, seg = (x1, y1, x2, y2, th, o = {}) => M.Bodies.rectangle((x1 + x2) / 2, (y1 + y2) / 2, Math.hypot(x2 - x1, y2 - y1) + th * .6, th, { isStatic: true, angle: Math.atan2(y2 - y1, x2 - x1), friction: .3, restitution: .3, ...o });
B.push(seg(K.L, K.T, K.L + 24, G.G0, 12, { label: 'rim' }), seg(K.R, K.T, K.R - 24, G.G0, 12, { label: 'rim' }), seg(K.L + 20, G.G0 - 4, K.R - 20, G.G0 - 4, 10, { label: 'bfloor', friction: .6, restitution: .1 }));
B.push(seg(0, G.G0 + 10, 1080, G.G0 + 10, 20, { label: 'ground', friction: .6, restitution: .15 }));
B.push(M.Bodies.rectangle(G.SX, (TOP + G.G0) / 2, 18, G.G0 - TOP, { ...st, label: 'stalk' }));
M.World.add(e.world, B);
const coins = fruits.map((f, i) => { const c = M.Bodies.circle(f.x, f.y, G.RC * .96, { restitution: .38, friction: .06, frictionAir: .006, density: .002, label: 'coin', isStatic: true }); c.rel = (G.G0 - f.y) > 0 ? (f.y - TOP) / (G.G0 - TOP) * 1.1 + rnd() * .12 : 0; return c; });
M.World.add(e.world, coins);
const HZ = 120, step = 1000 / HZ; let T = 0, k = 0; const frames = [], ev = [];
M.Events.on(e, 'collisionStart', E => { for (const p of E.pairs) { const a = p.bodyA, b = p.bodyB; const ca = a.label === 'coin', cb = b.label === 'coin'; if (!ca && !cb) continue;
  const rv = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y); if (rv < 1.0) continue; const o = ca ? b : a, c = ca ? a : b;
  ev.push([+T.toFixed(3), +rv.toFixed(2), ca && cb ? 'coin' : o.label.replace(/\d+$/, ''), +c.position.x.toFixed(0), +c.position.y.toFixed(0)]); } });
while (T < 4.2) {
  for (const c of coins) if (c.isStatic && T >= c.rel) { M.Body.setStatic(c, false); M.Body.setVelocity(c, { x: (rnd() - .5) * 1.4, y: .3 + rnd() * .6 }); M.Body.setAngularVelocity(c, (rnd() - .5) * .4); }
  M.Engine.update(e, step); T += step / 1000; k++;
  if (k % 4 === 0) frames.push(coins.map(c => [+c.position.x.toFixed(1), +c.position.y.toFixed(1), +c.angle.toFixed(2)]));
}
const inB = coins.filter(c => c.position.x > K.L && c.position.x < K.R && c.position.y > K.T - 10).length;
console.log('leaves', leaves.length, 'fruits', fruits.length, '/', N, 'in basket', inB, 'leaf hits', ev.filter(x => x[2] === 'leaf').length);
fs.writeFileSync(OUT, JSON.stringify({ G, PCT, UNIT, TOP, leaves, fruits, rel: coins.map(c => +c.rel.toFixed(3)), A: { frames, fps: 30, ev, radii: coins.map(c => +c.circleRadius.toFixed(2)) } }));
