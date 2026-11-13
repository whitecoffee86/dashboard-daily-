#!/usr/bin/env python3
"""효과음 트랙(fx.wav) 만들기 — 물리 충돌 시각에 맞춰 소리를 놓는다. 사용: python3 fx.py <WORK>
소리: numpy 로 합성(톡·쨍·종·마림바·퐁당·슈웅 등) + Kenney Interface Sounds(CC0, sfx 폴더). 사람 목소리는 쓰지 않는다."""
import json, subprocess, sys, wave
from pathlib import Path
import numpy as np

SR = 44100
KIT = Path(__file__).resolve().parent
KEN = KIT / 'sfx'
W = Path(sys.argv[1])
sb = json.loads((W / 'storyboard.json').read_text()); SC = sb['scenes'][0]; P = SC['props']['data']
KIND = SC['props']['script_file'].split('_')[0]
DUR = SC['min_dur'] + 1.0
out = np.zeros((int(SR * DUR), 2))
rng = np.random.default_rng({'water': 6, 'bean': 12, 'sink': 9}[KIND])


def load(name):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(KEN / name), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(float)


def add(sig, t, g=1.0, pan=0.0):
    if t is None: return
    i = int(t * SR)
    if i < 0 or i >= len(out): return
    n = min(len(sig), len(out) - i); l, r = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
    out[i:i + n, 0] += sig[:n] * g * l * 1.414; out[i:i + n, 1] += sig[:n] * g * r * 1.414


def tt(d): return np.arange(int(SR * d)) / SR
def pan_x(x): return float(np.clip((x - 540) / 540 * .6, -.7, .7))


def lowpass(x, fc):
    a = np.broadcast_to(np.exp(-2 * np.pi * np.asarray(fc, dtype=float) / SR), x.shape); y = np.zeros_like(x); s = 0.0
    for i in range(len(x)): s = (1 - a[i]) * x[i] + a[i] * s; y[i] = s
    return y


def env(n, a, r):
    e = np.ones(n); ia, ir = int(SR * a), int(SR * r)
    if ia: e[:ia] = np.linspace(0, 1, ia)
    if ir: e[-ir:] *= np.linspace(1, 0, ir)
    return e


def clink(f):
    t = tt(.16); return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / dd) for a, m, dd in [(1, 1, .05), (.6, 2.76, .03), (.35, 5.4, .018)])
def tok(f):
    t = tt(.09); return np.sin(2 * np.pi * f * t) * np.exp(-t / .016) + .45 * np.sin(2 * np.pi * f * 2.71 * t) * np.exp(-t / .006)
def bell(f, dec=.35):
    t = tt(dec * 3); return np.sin(2 * np.pi * f * t) * np.exp(-t / dec) + .25 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t / (dec * .3))
def marimba(f):
    t = tt(.6); return np.sin(2 * np.pi * f * t) * np.exp(-t / .22) + .35 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / .05)
def plop(f0):
    t = tt(.12); f = f0 * (1 + 2.2 * (t / .12) ** .7); s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .035)
    n = rng.standard_normal(len(t)); n = (n - lowpass(n, 2500)) * np.exp(-t / .006) * .4; return s + n
def pop(f0, f1, d=.08):
    t = tt(d); f = np.geomspace(f0, f1, len(t)); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (d * .4))
def sweep(f0, f1, dur, g=.3):
    t = tt(dur); f = np.geomspace(f0, f1, len(t)); return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), .03, dur * .5) * g
def drum(f0=120, f1=62, d=.45):
    """'두둥' 북 두 번(합성)."""
    t = tt(d); f = np.geomspace(f0, f1, len(t)); s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (d * .35))
    c = rng.standard_normal(len(t)); c = (c - lowpass(c, 1800)) * np.exp(-t / .01) * .5
    one = s + c; two = np.zeros(int(SR * .17) + len(one)); two[:len(one)] += one * .8; two[int(SR * .17):] += one * 1.0
    return two


def water():
    A = P['A']; TO = P['tOver']; HS = bool(P['C8'])
    x = rng.standard_normal(int(SR * .35)); x = x - lowpass(x, 1800); add(x * env(len(x), .08, .2) * .22, .05, -.6); add(x[::-1] * env(len(x), .08, .2) * .22, .08, .6)
    for ts, xx, v in A['splash']: add(plop(220 + rng.random() * 260), ts, .5 * min(1.2, .5 + v / 6), pan_x(xx))
    last = {}
    for T, rv, kind, xx, yy, sd in A['ev']:
        if T - last.get(kind + str(sd), -1) < .02: continue
        last[kind + str(sd)] = T; g = min(1.0, rv / 6.0)
        if sd == 7: s = lowpass(clink(1400 + rng.random() * 600), 1200) * 2.2; add(s, T, .25 * g, pan_x(xx))
        elif kind == 'hpin': add(tok(800 + rng.random() * 300), T, .3 * g, pan_x(xx))
        else: add(clink(2400 + rng.random() * 1200), T, .12 * g, pan_x(xx))
    n = int(SR * max(.5, TO - 1.4)); g = rng.standard_normal(n); g = lowpass(lowpass(g, 380), 500) * 6 * (1 + .6 * np.sin(2 * np.pi * 7 * np.arange(n) / SR)) * env(n, .4, .5); add(g * .22, 1.4, pan=-.6)
    for k in range(14): add(bell(900 + rng.random() * 900, .04), 1.6 + rng.random() * max(.2, TO - 1.8), .07, -.6)
    n = int(SR * 1.8); w = rng.standard_normal(n); w = lowpass(w, 2600) - lowpass(w, 350); w *= env(n, .1, 1.0) * 1.6; add(w * .35, TO - .35, pan=-.45)
    if HS:
        t = tt(.12); fq = np.geomspace(1300, 380, len(t)); add(np.sin(2 * np.pi * np.cumsum(fq) / SR) * np.exp(-t / .05) * .7, P['tM8e'], pan=.7)
        for k, f in enumerate([1568, 2093]): add(bell(f, .2), P['tM8e'] + .04 + k * .05, .12, .7)
        add(load('switch_002.wav'), TO + P['C8']['rel'] - .12, .5, .7)

    def ball_fx(C, PEN, gain):
        pk = 0; landed = False
        for h in C['hits']:
            T = TO + h[0]; lab, v, xx = h[1], h[2], h[3]
            if lab == 'trough': add(tok(420), T, .25 * gain, pan_x(xx)); continue
            if lab[0] == 'p': add(marimba(PEN[min(pk, len(PEN) - 1)]), T, .5 * gain * min(1, v / 5 + .4), pan_x(xx)); pk += 1
            elif lab[0] == 'd': add(bell(2093 if h[4] < 1330 else 1760, .25), T, .3 * gain, pan_x(xx))
            elif lab == 'wall': add(tok(380), T, .3 * gain, pan_x(xx))
            elif lab in ('b7', 'b8'): add(clink(1800), T, .4, pan_x(xx))
            elif lab == 'bfloor':
                if not landed: landed = True; add(drum(), T, .7 * gain, pan_x(xx)); t = tt(.3); add(np.sin(2 * np.pi * 70 * t) * np.exp(-t / .12), T, .9 * gain, pan_x(xx))
                else: t = tt(.2); add(np.sin(2 * np.pi * 90 * t) * np.exp(-t / .07) * min(1, v / 3), T, .45 * gain, pan_x(xx))
    P7 = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.7, 1318.5, 1568.0, 1760.0, 2093.0]
    P8 = [1046.5, 1174.7, 1318.5, 1568.0, 1760.0, 2093.0, 2349.3, 2637.0, 3136.0, 3520.0, 4186.0]
    ball_fx(P['C7'], P7, 1.0)
    if HS:
        ball_fx(P['C8'], P8, .7); L8 = TO + P['C8']['land']
        for k, f in enumerate([1568.0, 2093.0]): add(bell(f, .25), L8 + .1 + k * .07, .12, .5)
    add(load('confirmation_002.wav'), TO + P['C7']['land'] + .12, .7)
    add(load('maximize_006.wav'), P['tend'], .55); add(load('confirmation_004.wav'), P['tend'] + .08, .4)


def bean():
    A = P['A']; G = P['G']
    TCL, TSUN, TG0, TG1, TSH, TDR, TEND, PCT = P['tCloud'], P['tSun'], P['tGrow0'], P['tGrow1'], P['tShake'], P['tDrop'], P['tend'], P['PCT']
    SP = max(P['seedPct'], -1.8)

    def pct(t):
        if t < TCL + .4: return 0
        if t < TG0: q = min(1, (t - TCL - .4) / .8); return SP * (q * q * (3 - 2 * q))
        q = min(1, max(0, (t - TG0) / (TG1 - TG0))); return SP + (PCT - SP) * (1 - (1 - q) ** 2.6)

    def tcross(p):
        if p is None: return None
        for k in range(4000):
            t = TG0 + k * .001
            if pct(t) >= p: return t
        return None
    sx = pan_x(G['SX'])
    n = int(SR * (TSUN - TCL + .3)); r = rng.standard_normal(n); r = lowpass(r - lowpass(r, 1500), 7000) * env(n, .3, .5); add(r * .12, TCL)
    th = rng.standard_normal(int(SR * 1.4)); th = lowpass(lowpass(th, 150), 200) * 9 * env(len(th), .05, 1.0); add(th * .35, TCL + .45)
    add(pop(260, 160, .12), TCL + .5, .3, sx)
    for k, f in enumerate([523.25, 659.25, 783.99, 1046.5, 1318.5]): add(bell(f, .5), TSUN + .1 + k * .06, .16, .4)
    add(tok(900), TG0, .5, sx); add(pop(500, 1400, .1), TG0 + .02, .4, sx)
    n = int(SR * (TG1 - TG0)); tau = np.arange(n) / SR; hh = np.array([pct(TG0 + x) for x in tau[::200]]); hh = np.interp(tau, tau[::200], hh)
    f = 260 + (hh - SP) / max(1e-6, PCT - SP) * 900; ph = 2 * np.pi * np.cumsum(f) / SR; v = np.gradient(hh) * SR
    sw = (np.sin(ph) + .3 * np.sin(2 * ph)) * np.clip(v / max(v.max(), 1e-6), 0, 1) ** .5 * env(n, .05, .2); add(sw * .1, TG0, pan=sx)
    for l in P['leaves']:
        tl = tcross((G['G0'] - l['y0']) / G['S'])
        if tl: w = rng.standard_normal(int(SR * .2)); w = (w - lowpass(w, 1200)) * env(len(w), .02, .15); add(w * .12, tl, pan=pan_x(l['x']))
    seen = set()
    for fr in P['fruits']:
        tf = tcross((G['G0'] - fr['y']) / G['S'])
        if tf and fr['leaf'] not in seen:
            seen.add(fr['leaf'])
            for k in range(3): add(pop(900 + rng.random() * 600, 1800, .05), tf + .08 + k * .05, .18, pan_x(fr['x']))
    th_ = tcross(.3); add(bell(2093, .2), th_, .25, sx); add(load('select_002.wav'), th_, .4, sx)
    tb = tcross(G.get('BELL'))
    if tb:
        for fq, gg in [(1318.5, .55), (2637, .25), (1975.5, .2)]: add(bell(fq, .9), tb, gg, pan_x(284))
    for k, fq in enumerate([1568, 1976, 2349, 2794]): add(bell(fq, .2), TG1 + .02 + k * .04, .13, sx)
    w = rng.standard_normal(int(SR * .6)); w = (lowpass(w, 4000) - lowpass(w, 600)) * env(len(w), .05, .3) * (1 + .5 * np.sin(2 * np.pi * 14 * np.arange(len(w)) / SR)); add(w * .35, TSH, pan=sx)
    last = {}
    for T, rv, kind, xx, yy in A['ev']:
        if T - last.get(kind, -1) < (.012 if kind == 'coin' else .02): continue
        last[kind] = T; g = min(1.0, rv / 6.0)
        if kind == 'coin': add(clink(2600 + rng.random() * 1400), TDR + T, .11 * g, pan_x(xx))
        elif kind == 'leaf': add(tok(700 + rng.random() * 500), TDR + T, .3 * g, pan_x(xx)); add(clink(2200), TDR + T, .06 * g, pan_x(xx))
        elif kind in ('rim', 'bfloor'): add(clink(1700 + rng.random() * 500), TDR + T, .22 * g, pan_x(xx))
        else: add(tok(300 + rng.random() * 100), TDR + T, .18 * g, pan_x(xx))
    if P.get('chain'):
        TC = P['chain']['t']; add(load('question_002.wav'), TC, .4, -.3)
        x = rng.standard_normal(int(SR * .5)); x = lowpass(x, np.geomspace(800, 4000, len(x))) * env(len(x), .05, .3); add(x * .25, TC + .2, pan=-.3)
        t = tt(.8); add(np.sin(2 * np.pi * (90 + 20 * np.sin(2 * np.pi * 9 * t)) * t) * np.exp(-t / .3) * .5, TC + .6, pan=-.3)
        x = rng.standard_normal(int(SR * .8)); x = (x - lowpass(x, 2500)) * np.exp(-np.arange(len(x)) / SR / .22); add(x * .3, TC + 1.4, pan=-.3)
        t = tt(.4); add(np.sin(2 * np.pi * np.cumsum(np.geomspace(300, 120, len(t))) / SR) * np.exp(-t / .15) * .45, TC + 1.45, pan=-.3)
    add(load('maximize_006.wav'), TEND, .55); add(load('confirmation_004.wav'), TEND + .08, .45)


def sink():
    TM = json.loads((W / 'times.json').read_text()); d = json.loads((W / 'sim.json').read_text())
    days = P['days']; adds = P['adds']; ends = [dd[0] for dd in days[1:]] + [DUR - .5]
    for dd, t1 in zip(days, ends):
        t0, w = dd[0], dd[4]; n = int(SR * max(.1, t1 - t0))
        if w in ('rain', 'storm'): r = rng.standard_normal(n); r = lowpass(r - lowpass(r, 1500), 7000) * env(n, .2, .3); add(r * (.16 if w == 'storm' else .09), t0)
        if w == 'storm': th = rng.standard_normal(int(SR * 1.3)); th = lowpass(lowpass(th, 150), 210) * 9 * env(len(th), .02, 1.0); add(th * .45, t0 + .05); add(load('glitch_002.wav')[:int(SR * .12)], t0, .3)
        if w == 'sun':
            for k, f in enumerate([523.25, 659.25, 783.99, 1046.5]): add(bell(f, .4), t0 + .1 + k * .06, .14)
        add(load('tick_002.wav'), t0 + .02, .45)
    for i in range(1, len(days)):
        a, b = days[i - 1][2], days[i][2]
        if days[i - 1][6] is not None: a = adds[days[i - 1][6]]['pct']
        add(sweep(700, 300, .5, .2) if b < a else sweep(300, 750, .5, .18), days[i][0] + .05)
    add(sweep(900, 400, .4, .3), days[0][0])
    for A in adds:
        n = int(SR * 1.2); wt = rng.standard_normal(n); wt = (lowpass(wt, 3500) - lowpass(wt, 700)) * env(n, .1, .4) * (1 + .3 * np.sin(2 * np.pi * 13 * np.arange(n) / SR)); add(wt * .3, A['t'] - .1, pan=.25)
        for k in range(P['nAdd']): add(bell(1800 + rng.random() * 900, .05), A['t'] + k * .03 + .7, .07, .1)
        add(bell(1568, .3), A['t'] + 1.0, .28); add(sweep(300, 700, .45, .18), A['t2'])
    for dd in days:
        if dd[7]: add(bell(1318.5, .5), dd[0] + .55, .25); add(bell(1975.5, .4), dd[0] + .62, .12)
    t = tt(.3); add(np.sin(2 * np.pi * 60 * t) * np.exp(-t / .1), TM['hit'], .9); add(load('scratch_003.wav'), TM['hit'] + .02, .6)
    for j in range(4): add(load('scratch_001.wav')[:int(SR * .08)], TM['hit'] + .1 + j * .07, .3)
    x = rng.standard_normal(int(SR * 1.2)); x = lowpass(x, 900) * env(len(x), .01, .9) * 2.5; add(x * .45, TM['shatter'])
    th = rng.standard_normal(int(SR * 1.6)); th = lowpass(lowpass(th, 140), 200) * 9 * env(len(th), .02, 1.2); add(th * .6, TM['shatter'] + .03)
    last = -1
    for t0, rv, kind, xx in d['shards']['ev']:
        if t0 - last < .02: continue
        last = t0; add(tok(250 + rng.random() * 300), TM['shatter'] + t0, .3 * min(1, rv / 5), float(np.clip((xx - 540) / 400, -.6, .6)))
    t = tt(.35); add(np.sin(2 * np.pi * 50 * t) * np.exp(-t / .12), TM['cut'], .8); add(load('close_002.wav'), TM['cut'], .7)
    add(sweep(600, 120, .7, .3), TM['cut'] + .1)
    add(load('minimize_003.wav'), P['tend'], .5); add(bell(523.25, .6), P['tend'] + .05, .22); add(bell(659.25, .6), P['tend'] + .12, .18)


{'water': water, 'bean': bean, 'sink': sink}[KIND]()
o = out / max(1e-9, np.abs(out).max()) * 10 ** (-2 / 20)
with wave.open(str(W / 'fx.wav'), 'wb') as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes((o * 32767).astype('<i2').tobytes())
print('fx ok', KIND, f"{DUR:.1f}s")
