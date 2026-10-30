"""Generate the hero visuals: coral light seen through fluted (ribbed) glass.

Owner reference (2026-10-30): a dark field of red light behind vertical glass flutes.
Procedural, so no stock or third-party image is involved: a smooth field of light is
built from anisotropic gaussian blobs and a diagonal ribbon, refracted strip by strip
(each flute magnifies and flips its slice and bends it with a slow wave), shaded at the
flute edges, mapped to a palette from the Devoteam coral tokens, and lightly grained.

Usage: python3 tools/make-hero-visuals.py  (writes src/assets/heroes/*.jpg)
"""
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, map_coordinates
from pathlib import Path

W, H = 1920, 1080
OUT = Path(__file__).resolve().parent.parent / "src" / "assets" / "heroes"
OUT.mkdir(parents=True, exist_ok=True)

# Palette from the brand: ink -> deep coral -> coral 700 (#ea0925) -> coral 500 (#f8485e) -> light
STOPS = [
    (0.00, (8, 4, 5)),
    (0.30, (58, 4, 10)),
    (0.55, (170, 6, 26)),
    (0.75, (234, 9, 37)),
    (0.90, (248, 72, 94)),
    (1.00, (255, 196, 202)),
]


def colormap(v):
    v = np.clip(v, 0, 1)
    out = np.zeros(v.shape + (3,), dtype=np.float32)
    for (a, ca), (b, cb) in zip(STOPS[:-1], STOPS[1:]):
        m = (v >= a) & (v <= b)
        t = ((v - a) / (b - a))[m][:, None]
        out[m] = np.array(ca) * (1 - t) + np.array(cb) * t
    return out


def field(rng, ribbon_angle, blobs, dark_center):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    f = np.zeros((H, W), np.float32)
    for _ in range(blobs):
        cx, cy = rng.uniform(-0.1, 1.1) * W, rng.uniform(-0.1, 1.1) * H
        sx, sy = rng.uniform(0.08, 0.3) * W, rng.uniform(0.2, 0.6) * H
        a = rng.uniform(0.35, 0.9)
        f += a * np.exp(-(((xx - cx) / sx) ** 2 + ((yy - cy) / sy) ** 2))
    # diagonal glowing ribbon (the S-shaped light of the reference)
    th = np.deg2rad(ribbon_angle)
    d = (xx - W * 0.5) * np.sin(th) - (yy - H * 0.5) * np.cos(th)
    d += 90 * np.sin(xx / W * np.pi * 2.2 + rng.uniform(0, 6))
    f += 1.1 * np.exp(-((d / (H * 0.12)) ** 2))
    # a dark pocket, as in the reference
    cx, cy = dark_center
    f *= 1 - 0.75 * np.exp(-(((xx - cx * W) / (0.16 * W)) ** 2 + ((yy - cy * H) / (0.22 * H)) ** 2))
    f = gaussian_filter(f, 18)
    f = (f - f.min()) / (f.max() - f.min() + 1e-6)
    return f


def flute(src, rng, width, mag, wave):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    k = np.floor(xx / width)
    u = (xx - k * width) / width  # 0..1 inside the flute
    centre = (k + 0.5) * width
    sx = centre - (u - 0.5) * width * mag  # flipped and magnified slice
    phase = rng.uniform(0, 6.28, size=int(W / width) + 2)
    sy = yy + wave * np.sin(yy / H * np.pi * 3.4 + phase[k.astype(int)]) * (0.6 + 0.4 * np.cos(u * np.pi * 2))
    out = map_coordinates(src, [np.clip(sy, 0, H - 1), np.clip(sx, 0, W - 1)], order=1, mode="nearest")
    shade = (0.5 + 0.5 * np.sin(np.pi * u)) ** 0.55  # darker at the flute edges
    highlight = np.exp(-((u - 0.12) / 0.035) ** 2) * 0.22 * out  # thin glint on the left edge
    return np.clip(out * shade + highlight, 0, 1)


def make(name, seed, angle=38, blobs=7, dark=(0.55, 0.35), width=86, mag=1.7, wave=85, gamma=1.05):
    rng = np.random.default_rng(seed)
    f = field(rng, angle, blobs, dark) ** gamma
    g = flute(f, rng, width, mag, wave)
    rgb = colormap(g)
    rgb += rng.normal(0, 3.2, rgb.shape)  # grain
    img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8))
    img.save(OUT / f"{name}.jpg", quality=78, optimize=True, progressive=True)
    small = img.resize((640, 360), Image.LANCZOS)
    small.save(OUT / f"{name}-sm.jpg", quality=72, optimize=True)
    print(name, (OUT / f"{name}.jpg").stat().st_size // 1024, "KB")


make("fluted-1", 3, angle=36, dark=(0.42, 0.3))
make("fluted-2", 11, angle=58, dark=(0.7, 0.45), width=66, wave=100)
make("fluted-3", 23, angle=22, dark=(0.3, 0.6), width=100, mag=1.4)
make("fluted-4", 41, angle=70, dark=(0.6, 0.25), width=58, mag=2.0, wave=70)
make("fluted-5", 57, angle=45, dark=(0.5, 0.55), width=92, gamma=1.3)
make("fluted-6", 77, angle=28, dark=(0.75, 0.4), width=80, mag=1.6, wave=120)
