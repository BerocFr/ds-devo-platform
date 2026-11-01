"""Generate the service step visuals: abstract light shapes seen through fluted glass.

Owner request (2026-11-01): one large visual per step, in the vein of the hero visuals
(coral light behind vertical glass flutes) but abstract and tied to each step's subject.
Each step gets a light motif that names its idea without illustrating it literally:

  strategise  concentric rings around a bright point (focus, assessment)
  build       stacked slabs stepping up (layers, foundations)
  deploy      a rising streak with a bright head (launch, acceleration)
  govern      a dome of arcs over a protected core (control, protection)
  run         a continuous orbit loop (operations that keep running)
  people      overlapping soft circles joined by light (people, adoption)

Same pipeline and palette as tools/make-hero-visuals.py: motif field, refraction strip by
strip, edge shading, coral palette from the brand tokens, light grain. No third-party image.

Usage: python3 tools/make-step-visuals.py  (writes src/assets/steps/*.jpg)
"""
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, map_coordinates
from pathlib import Path

W, H = 1600, 1200
OUT = Path(__file__).resolve().parent.parent / "src" / "assets" / "steps"
OUT.mkdir(parents=True, exist_ok=True)

STOPS = [
    (0.00, (8, 4, 5)),
    (0.30, (58, 4, 10)),
    (0.55, (170, 6, 26)),
    (0.75, (234, 9, 37)),
    (0.90, (248, 72, 94)),
    (1.00, (255, 196, 202)),
]

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
X, Y = xx / W, yy / H  # 0..1


def colormap(v):
    v = np.clip(v, 0, 1)
    out = np.zeros(v.shape + (3,), dtype=np.float32)
    for (a, ca), (b, cb) in zip(STOPS[:-1], STOPS[1:]):
        m = (v >= a) & (v <= b)
        t = ((v - a) / (b - a))[m][:, None]
        out[m] = np.array(ca) * (1 - t) + np.array(cb) * t
    return out


def g(cx, cy, sx, sy=None):
    sy = sx if sy is None else sy
    return np.exp(-(((X - cx) / sx) ** 2 + ((Y - cy) / sy) ** 2))


def ring(cx, cy, r, w, aspect=1.0):
    d = np.sqrt(((X - cx) * aspect) ** 2 + (Y - cy) ** 2)
    return np.exp(-(((d - r) / w) ** 2))


def strategise():
    f = 0.25 * g(0.5, 0.55, 0.6, 0.7)
    for i, r in enumerate([0.08, 0.17, 0.27, 0.38]):
        f += (0.9 - i * 0.15) * ring(0.58, 0.48, r, 0.012 + i * 0.004, aspect=W / H)
    f += 1.6 * g(0.58, 0.48, 0.03)
    return f


def build():
    f = 0.2 * g(0.5, 0.7, 0.7, 0.5)
    for i in range(5):
        y = 0.82 - i * 0.13
        x0, x1 = 0.12 + i * 0.07, 0.62 + i * 0.06
        band = np.exp(-(((Y - y) / 0.028) ** 2)) * (1 / (1 + np.exp(-(X - x0) * 60))) * (1 / (1 + np.exp((X - x1) * 60)))
        f += (1.0 - i * 0.12) * band
    return f


def deploy():
    f = 0.2 * g(0.3, 0.8, 0.5, 0.4)
    t = np.clip((X - 0.1) / 0.75, 0, 1)
    path_y = 0.88 - 0.7 * t ** 1.6
    d = (Y - path_y) / (0.02 + 0.05 * (1 - t))
    f += (0.25 + 0.85 * t) * np.exp(-d ** 2) * ((X > 0.08) & (X < 0.86))
    f += 1.8 * g(0.85, 0.18, 0.035)
    f += 0.5 * g(0.85, 0.18, 0.12)
    return f


def govern():
    f = 0.2 * g(0.5, 0.6, 0.6)
    cx, cy = 0.5, 0.78
    a = W / H
    d = np.sqrt(((X - cx) * a) ** 2 + (Y - cy) ** 2)
    upper = Y < cy + 0.02
    for i, r in enumerate([0.3, 0.42, 0.54]):
        f += (1.0 - i * 0.2) * np.exp(-(((d - r) / (0.014 + i * 0.005)) ** 2)) * upper
    f += 1.4 * g(0.5, 0.62, 0.05, 0.07)
    f += 0.35 * np.exp(-(((Y - cy - 0.02) / 0.012) ** 2))
    return f


def run():
    f = 0.2 * g(0.5, 0.5, 0.7)
    tt = np.linspace(0, 2 * np.pi, 900)
    pts_x = 0.5 + 0.32 * np.sin(tt)
    pts_y = 0.5 + 0.22 * np.sin(tt) * np.cos(tt)  # figure of eight (lemniscate)
    img = np.zeros((H, W), np.float32)
    for px, py, k in zip(pts_x, pts_y, tt):
        ix, iy = int(px * W), int(py * H)
        if 0 <= ix < W and 0 <= iy < H:
            img[iy, ix] += 0.6 + 0.4 * np.cos(k)
    f += gaussian_filter(img, 9) * 900
    f += 1.2 * g(0.82, 0.5, 0.03)
    return f


def people():
    f = 0.2 * g(0.5, 0.55, 0.7)
    centres = [(0.3, 0.42), (0.52, 0.62), (0.72, 0.38), (0.45, 0.28), (0.68, 0.72)]
    for (x0, y0), (x1, y1) in zip(centres, centres[1:]):
        t = np.clip(((X - x0) * (x1 - x0) + (Y - y0) * (y1 - y0)) / ((x1 - x0) ** 2 + (y1 - y0) ** 2), 0, 1)
        dx, dy = X - (x0 + t * (x1 - x0)), Y - (y0 + t * (y1 - y0))
        f += 0.45 * np.exp(-((dx ** 2 + dy ** 2) / 0.006 ** 2))
    for i, (cx, cy) in enumerate(centres):
        f += (0.9 - 0.08 * i) * g(cx, cy, 0.075, 0.1)
    return f


def flute(src, rng, width, mag, wave):
    k = np.floor(xx / width)
    u = (xx - k * width) / width
    centre = (k + 0.5) * width
    sx = centre - (u - 0.5) * width * mag
    phase = rng.uniform(0, 6.28, size=int(W / width) + 2)
    sy = yy + wave * np.sin(yy / H * np.pi * 3.0 + phase[k.astype(int)]) * (0.6 + 0.4 * np.cos(u * np.pi * 2))
    out = map_coordinates(src, [np.clip(sy, 0, H - 1), np.clip(sx, 0, W - 1)], order=1, mode="nearest")
    shade = (0.5 + 0.5 * np.sin(np.pi * u)) ** 0.5
    highlight = np.exp(-((u - 0.12) / 0.035) ** 2) * 0.22 * out
    return np.clip(out * shade + highlight, 0, 1)


def ambient(rng):
    """Soft light behind the motif, so the field glows like the hero visuals."""
    a = np.zeros((H, W), np.float32)
    for _ in range(5):
        a += rng.uniform(0.25, 0.55) * g(rng.uniform(0, 1), rng.uniform(0, 1), rng.uniform(0.2, 0.45), rng.uniform(0.3, 0.7))
    return a


def make(name, motif, seed, width=66, mag=1.45, wave=16, blur=15, gamma=0.72):
    rng = np.random.default_rng(seed)
    m = motif()
    m = m / (m.max() + 1e-6)
    f = gaussian_filter(m + 0.42 * ambient(rng), blur)
    f = (f - f.min()) / (f.max() - f.min() + 1e-6)
    f = f ** gamma
    out = flute(f, rng, width, mag, wave)
    rgb = colormap(out * 0.97)
    rgb += rng.normal(0, 3.0, rgb.shape)
    img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8))
    img.save(OUT / f"step-{name}.jpg", quality=78, optimize=True, progressive=True)
    img.resize((800, 600), Image.LANCZOS).save(OUT / f"step-{name}-sm.jpg", quality=72, optimize=True)
    print(name, (OUT / f"step-{name}.jpg").stat().st_size // 1024, "KB")


make("strategise", strategise, 5)
make("build", build, 9)
make("deploy", deploy, 13)
make("govern", govern, 17)
make("run", run, 21)
make("people", people, 25)
