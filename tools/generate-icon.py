"""Generate the MG Browser icon set (PNG, ICO, ICNS) from a vector-inspired design."""
import os
import struct
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "app", "assets")
DIST = os.path.join(ROOT, "dist", "win")
os.makedirs(ASSETS, exist_ok=True)

BASE = 512
SS = 4
S = BASE * SS

# ---------------------------------------------------------------- gradient
def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))

stops = [
    (0.0, (157, 107, 255)),
    (0.45, (109, 94, 252)),
    (1.0, (32, 199, 224)),
]

def gradient_at(t):
    for i in range(len(stops) - 1):
        t0, c0 = stops[i]
        t1, c1 = stops[i + 1]
        if t0 <= t <= t1:
            return lerp(c0, c1, (t - t0) / (t1 - t0))
    return stops[-1][1]

grad = Image.new("RGB", (S, S))
px = grad.load()
for y in range(S):
    for x in range(S):
        # diagonal gradient (top-left -> bottom-right)
        t = min(1.0, max(0.0, ((x / S) * 0.55 + (y / S) * 0.85)))
        px[x, y] = gradient_at(t)

# ---------------------------------------------------------------- mask
margin = 28 * SS
radius = 118 * SS
mask = Image.new("L", (S, S), 0)
md = ImageDraw.Draw(mask)
md.rounded_rectangle([margin, margin, S - margin, S - margin], radius=radius, fill=255)

# ---------------------------------------------------------------- shadow
shadow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
sd = ImageDraw.Draw(shadow)
sd.rounded_rectangle(
    [margin, margin + 18 * SS, S - margin, S - margin + 18 * SS],
    radius=radius,
    fill=(27, 17, 64, 135),
)
shadow = shadow.filter(ImageFilter.GaussianBlur(24 * SS))

canvas = Image.new("RGBA", (S, S), (0, 0, 0, 0))
canvas = Image.alpha_composite(canvas, shadow)

tile = grad.convert("RGBA")
tile.putalpha(mask)
canvas = Image.alpha_composite(canvas, tile)

# gloss: vertical white gradient clipped to the tile
gloss = Image.new("RGBA", (S, S), (0, 0, 0, 0))
gp = gloss.load()
for y in range(S):
    t = (y - margin) / (S - 2 * margin)
    if t < 0 or t > 1:
        alpha = 0
    elif t < 0.55:
        alpha = int(87 * (1 - t / 0.55))
    else:
        alpha = 0
    for x in range(S):
        gp[x, y] = (255, 255, 255, alpha)
gloss.putalpha(Image.composite(gloss.getchannel("A"), Image.new("L", (S, S), 0), mask))
canvas = Image.alpha_composite(canvas, gloss)

# radial glow in the top-left corner
glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
cx, cy = 120 * SS, 90 * SS
for i in range(140, 0, -1):
    r = i * SS * 2
    a = int(52 * (1 - i / 140) ** 2)
    gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, a))
glow.putalpha(Image.composite(glow.getchannel("A"), Image.new("L", (S, S), 0), mask))
canvas = Image.alpha_composite(canvas, glow)

# inner border
border = Image.new("RGBA", (S, S), (0, 0, 0, 0))
bd = ImageDraw.Draw(border)
bd.rounded_rectangle(
    [margin + 1.5 * SS, margin + 1.5 * SS, S - margin - 1.5 * SS, S - margin - 1.5 * SS],
    radius=radius,
    outline=(255, 255, 255, 58),
    width=int(3 * SS),
)
canvas = Image.alpha_composite(canvas, border)

# ---------------------------------------------------------------- monogram M
stroke = 46 * SS
white = (255, 255, 255, 255)
pts = [
    (148 * SS, 356 * SS),
    (148 * SS, 166 * SS),
    (256 * SS, 280 * SS),
    (364 * SS, 166 * SS),
    (364 * SS, 356 * SS),
]
layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
ld = ImageDraw.Draw(layer)
ld.line(pts, fill=white, width=stroke, joint="curve")
r = stroke // 2
for p in (pts[0], pts[-1]):
    ld.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=white)
canvas = Image.alpha_composite(canvas, layer)

# ---------------------------------------------------------------- sparkle
sp = Image.new("RGBA", (S, S), (0, 0, 0, 0))
spd = ImageDraw.Draw(sp)
cx, cy, size = 392 * SS, 96 * SS, 36 * SS
spd.polygon(
    [(cx, cy - size), (cx + size * 0.28, cy - size * 0.28), (cx + size, cy),
     (cx + size * 0.28, cy + size * 0.28), (cx, cy + size),
     (cx - size * 0.28, cy + size * 0.28), (cx - size, cy),
     (cx - size * 0.28, cy - size * 0.28)],
    fill=(255, 255, 255, 242),
)
canvas = Image.alpha_composite(canvas, sp)

master = canvas.resize((1024, 1024), Image.LANCZOS)
master.save(os.path.join(ASSETS, "icon-1024.png"), "PNG")
master.resize((512, 512), Image.LANCZOS).save(os.path.join(ASSETS, "icon.png"), "PNG")

sizes = [16, 24, 32, 48, 64, 128, 256]
pngs = {}
for s in sizes + [512, 1024]:
    img = canvas.resize((s, s), Image.LANCZOS)
    pngs[s] = img

# ---------------------------------------------------------------- ICO
ico_path = os.path.join(ASSETS, "icon.ico")
pngs[256].save(
    ico_path,
    format="ICO",
    sizes=[(s, s) for s in sizes],
    append_images=[pngs[s] for s in sizes if s != 256],
)

# ---------------------------------------------------------------- ICNS
icns_types = {
    16: b"icp4",
    32: b"icp5",
    64: b"icp6",
    128: b"ic07",
    256: b"ic08",
    512: b"ic09",
    1024: b"ic10",
}
entries = b""
for size, tag in icns_types.items():
    buf = os.path.join(ASSETS, f".tmp-{size}.png")
    pngs[size].save(buf, "PNG")
    with open(buf, "rb") as fh:
        data = fh.read()
    os.remove(buf)
    entries += tag + struct.pack(">I", len(data) + 8) + data

icns = b"icns" + struct.pack(">I", len(entries) + 8) + entries
with open(os.path.join(ASSETS, "icon.icns"), "wb") as fh:
    fh.write(icns)

# copy windows assets next to the executable
os.makedirs(DIST, exist_ok=True)
pngs[256].save(os.path.join(DIST, "MG-Browser.ico"), format="ICO", sizes=[(s, s) for s in sizes])
pngs[512].save(os.path.join(DIST, "MG-Browser.png"), "PNG")

print("icon sizes:", ", ".join(f"{s}px" for s in sizes + [512, 1024]))
print("wrote", os.path.join(ASSETS, "icon.png"), os.path.join(ASSETS, "icon.ico"), os.path.join(ASSETS, "icon.icns"))
