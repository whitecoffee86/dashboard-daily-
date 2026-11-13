// 손절 날(밭): −15% 정리선 지층이 씨앗에 무너질 때 흙덩이 물리
const M = require('matter-js'), fs = require('fs');
const OUT = process.argv[2];
const G = { SURF: 700, Y0: 730, S: 38, TL: 336, TR: 744, PANE: -15, FLOOR: 1600, CX: 540 };
const yOf = p => G.Y0 - p * G.S;
const PY = yOf(G.PANE), TH = 26;
let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const e = M.Engine.create({ positionIterations: 12, velocityIterations: 10 }); e.gravity.y = 1.5;
const st = { isStatic: true, friction: .3, restitution: .25 };
M.World.add(e.world, [M.Bodies.rectangle(G.TL - 8, 1300, 16, 700, { ...st, label: 'wall' }), M.Bodies.rectangle(G.TR + 8, 1300, 16, 700, { ...st, label: 'wall' }), M.Bodies.rectangle(G.CX, G.FLOOR + 8, 600, 16, { ...st, label: 'floor' })]);
// 판을 세로 띠로 자르고 띠마다 대각선으로 두 조각
const xs = [G.TL]; while (xs[xs.length - 1] < G.TR - 40) xs.push(Math.min(G.TR, xs[xs.length - 1] + 26 + rnd() * 30)); xs[xs.length - 1] = G.TR;
const shards = [];
for (let i = 0; i < xs.length - 1; i++) {
  const x0 = xs[i], x1 = xs[i + 1], y0 = PY - TH / 2, y1 = PY + TH / 2;
  const tris = rnd() < .5 ? [[[x0, y0], [x1, y0], [x0, y1]], [[x1, y0], [x1, y1], [x0, y1]]] : [[[x0, y0], [x1, y0], [x1, y1]], [[x0, y0], [x1, y1], [x0, y1]]];
  for (const tri of tris) {
    const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
    const b = M.Bodies.fromVertices(cx, cy, [tri.map(([x, y]) => ({ x, y }))], { friction: .2, restitution: .35, frictionAir: .01, density: .003, label: 'chunk' });
    const dx = cx - G.CX, near = Math.max(0, 1 - Math.abs(dx) / 150);
    M.Body.setVelocity(b, { x: dx / 50 + (rnd() - .5) * 1.6, y: .5 + near * 5 + rnd() * 1.5 });
    M.Body.setAngularVelocity(b, (rnd() - .5) * .3);
    b.shape = b.vertices.map(v => [+(v.x - b.position.x).toFixed(2), +(v.y - b.position.y).toFixed(2)]);
    shards.push(b);
  }
}
M.World.add(e.world, shards);
const HZ = 120, step = 1000 / HZ; let T = 0, k = 0; const frames = [], ev = [];
M.Events.on(e, 'collisionStart', E => { for (const p of E.pairs) { const a = p.bodyA, b = p.bodyB; if (a.label !== 'chunk' && b.label !== 'chunk') continue;
  const rv = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y); if (rv < 1.2) continue; const s = a.label === 'chunk' ? a : b;
  ev.push([+T.toFixed(3), +rv.toFixed(2), a.label === 'chunk' && b.label === 'chunk' ? 'chunk' : (a.label === 'chunk' ? b : a).label, +s.position.x.toFixed(0)]); } });
while (T < 3.5) { M.Engine.update(e, step); T += step / 1000; k++; if (k % 4 === 0) frames.push(shards.map(s => [+s.position.x.toFixed(1), +s.position.y.toFixed(1), +s.angle.toFixed(3)])); }
console.log('shards', shards.length, 'events', ev.length, 'settled y', Math.max(...frames[frames.length - 1].map(f => f[1])).toFixed(0));
fs.writeFileSync(OUT, JSON.stringify({ G, shards: { shape: shards.map(s => s.shape), frames, fps: 30, ev } }));
