# Efeitos sonoros do trailer, sintetizados do zero (sem amostra de terceiros). Saída: tools/remotion/public/trailer/sfx/*.wav
import numpy as np, sys, os
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile
SR = 48000
OUT = sys.argv[1]
rng = np.random.default_rng(7)
def t(d): return np.arange(int(SR * d)) / SR
def lp(x, f, o=4): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=4): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, a, b, o=4): return sosfilt(butter(o, [a, b], 'band', fs=SR, output='sos'), x)
def saw(f, tt): return 2 * ((f * tt) % 1) - 1
def verb(x, dur=2.5, mix=0.35, dk=3.0):
    n = int(SR * dur); ir = rng.standard_normal(n) * np.exp(-dk * np.arange(n) / SR * (6 / dur))
    ir = lp(ir, 6000); ir /= np.sqrt((ir ** 2).sum())
    w = fftconvolve(x, ir)[: len(x) + n]
    y = np.zeros(len(w)); y[: len(x)] += x * (1 - mix); y += w * mix
    return y
def st(x, w=0.0):
    # estéreo largo: atraso curto no lado direito
    d = int(SR * 0.012); r = np.concatenate([np.zeros(d), x])[: len(x)]
    return np.stack([x * (1 - w) + r * w, r * (1 - w) + x * w], 1)
def save(name, x):
    if x.ndim == 1: x = st(x, 0.0)
    x = x / (np.abs(x).max() + 1e-9) * 0.89
    wavfile.write(os.path.join(OUT, name + '.wav'), SR, (x * 32767).astype(np.int16)); print(name, round(len(x) / SR, 2))
def env(n, a, d):
    e = np.ones(n); A = int(SR * a); e[:A] = np.linspace(0, 1, A) if A else 1
    e[A:] = np.exp(-np.arange(n - A) / SR / d); return e

# braam: metais graves distorcidos (55 Hz) que abrem o filtro e fecham
def braam(f0=55, dur=4.5):
    tt = t(dur); x = sum(saw(f0 * m * (1 + dt), tt) for m, dt in [(1, 0), (1, .006), (1, -.005), (2, .003), (0.5, 0), (1.5, -.004)])
    cut = 200 + 2600 * np.exp(-tt * 1.6) * (1 - np.exp(-tt * 30))
    y = np.zeros_like(x); blk = 480
    for i in range(0, len(x), blk):
        y[i:i + blk] = lp(x[max(0, i - 4000):i + blk], max(80, cut[i]))[-len(x[i:i + blk]):]
    y = np.tanh(y * 2.2) * env(len(y), 0.03, 1.6)
    sub = np.sin(2 * np.pi * f0 * tt) * env(len(tt), 0.01, 2.0) * 0.9
    return verb(y + sub, 3.5, 0.3)
save('braam', braam())
save('braam_low', braam(41.2, 5.5))

# impacto: queda de seno grave + estalo de ruído
def impact(dur=3.0):
    tt = t(dur); f = 30 + 110 * np.exp(-tt * 9)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(tt), 0.002, 0.9)
    nz = lp(rng.standard_normal(len(tt)), 3000) * env(len(tt), 0.001, 0.07) * 1.4
    body = bp(rng.standard_normal(len(tt)), 60, 400) * env(len(tt), 0.001, 0.35) * 1.2
    return verb(np.tanh((sub * 1.6 + nz + body) * 1.5), 3.0, 0.28)
save('impact', impact())

# whoosh: ruído filtrado que cresce e passa
tt = t(0.9); e = np.sin(np.pi * np.clip(tt / 0.9, 0, 1)) ** 2
x = rng.standard_normal(len(tt)); y = np.zeros_like(x)
for i in range(0, len(x), 480):
    fc = 400 + 3800 * e[i]; y[i:i + 480] = bp(x[max(0, i - 4000):i + 480], fc * 0.6, fc * 1.4, 2)[-len(x[i:i + 480]):]
save('whoosh', st(y * e, 0.6))

# riser: ruído e tom subindo 4 s, corta seco
tt = t(4.0); u = tt / 4.0
tone = sum(np.sin(2 * np.pi * np.cumsum(f0 * (1 + 3 * u ** 2)) / SR) for f0 in (110, 165.5, 220.7))
x = rng.standard_normal(len(tt)); y = np.zeros_like(x)
for i in range(0, len(x), 480):
    fc = 300 + 7000 * u[i] ** 2; y[i:i + 480] = bp(x[max(0, i - 4000):i + 480], fc * 0.7, min(fc * 1.3, 20000), 2)[-len(x[i:i + 480]):]
save('riser', st((y * 1.2 + tone * 0.25) * u ** 2.2, 0.5))

# reverso: ruído com cauda invertida (sugada antes do impacto)
r = verb(np.concatenate([rng.standard_normal(1200) * np.linspace(1, 0, 1200), np.zeros(SR)]), 1.6, 0.95)[: int(SR * 1.6)]
save('reverse', st(lp(r[::-1], 5000), 0.5))

# chiado de rádio: ruído de banda estreita + estalos + zumbido de 60 Hz
tt = t(6.0); x = bp(rng.standard_normal(len(tt)), 900, 3800) * (0.55 + 0.45 * np.abs(np.sin(2 * np.pi * 0.7 * tt)))
cr = (rng.random(len(tt)) > 0.9993) * rng.standard_normal(len(tt)) * 6; cr = lp(cr, 6000)
hum = 0.08 * np.sign(np.sin(2 * np.pi * 60 * tt))
save('radio', x + cr + lp(hum, 400))

# glitch digital curto
tt = t(0.35); x = np.sign(np.sin(2 * np.pi * (300 + 2400 * (rng.random(len(tt)) > 0.5)) * tt)) * (rng.random(len(tt)) > 0.3)
save('glitch', st(bp(x, 200, 7000) * env(len(tt), 0.001, 0.12), 0.7))

# drone escuro de fundo (20 s), ondulando
tt = t(20.0); d = sum(np.sin(2 * np.pi * f * tt + 0.6 * np.sin(2 * np.pi * 0.07 * tt * k)) for k, f in enumerate([36.7, 55.0, 55.4, 73.4, 110.1]))
d = lp(np.tanh(d * 0.6), 700) + bp(rng.standard_normal(len(tt)), 200, 900) * 0.08
fade = np.minimum(1, np.minimum(tt / 3, (20 - tt) / 3))
save('drone', st(d * fade, 0.8))

# batida de coração grave
tt = t(1.0); hb = np.zeros(len(tt))
for o, a in [(0, 1), (0.22, 0.7)]:
    i = int(o * SR); n = len(tt) - i; tk = np.arange(n) / SR
    hb[i:] += a * np.sin(2 * np.pi * (45 + 40 * np.exp(-tk * 30)) * tk) * np.exp(-tk * 14)
save('heart', np.tanh(hb * 1.5))

# tic de máquina de escrever (para o texto que digita)
tt = t(0.06); save('tick', hp(rng.standard_normal(len(tt)), 2000) * env(len(tt), 0.0005, 0.008))
