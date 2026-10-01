"""Generates the placeholder (demo) artwork used before real photos are uploaded.
Run: python scripts/gen_demo_images.py   (needs Pillow). Output: public/demo/*"""
import math, random, os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "demo")
os.makedirs(OUT, exist_ok=True)
F = "/usr/share/fonts/truetype/dejavu/"
def font(sz, bold=True, serif=False):
    name = ("DejaVuSerif" if serif else "DejaVuSans") + ("-Bold" if bold else "") + ".ttf"
    return ImageFont.truetype(F + name, sz)

PALETTES = [
    ((139, 92, 246), (34, 211, 238)),
    ((236, 72, 153), (139, 92, 246)),
    ((34, 211, 238), (16, 185, 129)),
    ((251, 146, 60), (236, 72, 153)),
    ((59, 130, 246), (167, 139, 250)),
    ((16, 185, 129), (59, 130, 246)),
    ((244, 63, 94), (251, 191, 36)),
    ((168, 85, 247), (14, 165, 233)),
]

def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def bg(w, h, c1, c2, seed):
    random.seed(seed)
    im = Image.new("RGB", (w, h), (6, 5, 14))
    glow = Image.new("RGB", (w, h), (0, 0, 0))
    d = ImageDraw.Draw(glow)
    for _ in range(5):
        r = random.randint(w // 5, w // 2)
        x, y = random.randint(0, w), random.randint(0, h)
        col = lerp(c1, c2, random.random())
        d.ellipse((x - r, y - r, x + r, y + r), fill=col)
    glow = glow.filter(ImageFilter.GaussianBlur(w // 7))
    im = Image.blend(im, glow, 0.55)
    d = ImageDraw.Draw(im)
    for _ in range(int(w * h / 3000)):  # stars
        x, y = random.randint(0, w), random.randint(0, h)
        v = random.randint(120, 255)
        d.point((x, y), fill=(v, v, v))
    return im

def grid(im, c, step=40, alpha=40):
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    w, h = im.size
    for x in range(0, w, step): d.line((x, 0, x, h), fill=c + (alpha,))
    for y in range(0, h, step): d.line((0, y, w, y), fill=c + (alpha,))
    return Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB")

def save(im, name, q=82):
    im.save(os.path.join(OUT, name), "WEBP", quality=q, method=6)

# ── Portrait placeholders (stylised silhouette) ──
for idx, name in enumerate(["portrait-front.webp", "portrait-back.webp"]):
    w, h = 800, 1000
    c1, c2 = PALETTES[idx]
    im = grid(bg(w, h, c1, c2, 10 + idx), c2, 50, 25)
    ov = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    d.ellipse((w/2-150, 230, w/2+150, 560), fill=(15, 12, 30, 235), outline=c2 + (255,), width=4)
    d.rounded_rectangle((w/2-300, 600, w/2+300, 1100), radius=220, fill=(15, 12, 30, 235), outline=c1 + (255,), width=4)
    im = Image.alpha_composite(im.convert("RGBA"), ov.filter(ImageFilter.GaussianBlur(0.6)))
    d = ImageDraw.Draw(im)
    label = "YOUR PHOTO" if idx == 0 else "BACK SIDE"
    f = font(54); tw = d.textlength(label, font=f)
    d.text(((w - tw) / 2, 120), label, font=f, fill=(255, 255, 255, 230))
    f2 = font(26, False); s = "upload from Admin → Sections → Hero"; tw = d.textlength(s, font=f2)
    d.text(((w - tw) / 2, 190), s, font=f2, fill=(220, 220, 255, 200))
    save(im.convert("RGB"), name)

# ── Project covers ──
titles = ["Neural Notes", "Campus Connect", "StockSense", "PixelForge", "EcoTrack", "Quantum Quiz", "VoiceBridge", "OrbitOS"]
for i, t in enumerate(titles):
    w, h = 1280, 800
    c1, c2 = PALETTES[i % len(PALETTES)]
    im = grid(bg(w, h, c1, c2, 100 + i), c1, 64, 30).convert("RGBA")
    ov = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    # mock browser window
    d.rounded_rectangle((180, 170, 1100, 700), radius=26, fill=(10, 8, 24, 210), outline=c2 + (200,), width=3)
    for k, col in enumerate([(244, 63, 94), (251, 191, 36), (16, 185, 129)]):
        d.ellipse((210 + k * 30, 195, 228 + k * 30, 213), fill=col + (255,))
    for k in range(5):
        d.rounded_rectangle((220, 260 + k * 70, 220 + random.randint(250, 520), 300 + k * 70), radius=10, fill=lerp(c1, c2, k / 5) + (150,))
    # chart
    pts = [(640 + j * 50, 600 - int(120 * abs(math.sin(j * 0.7 + i)) + j * 12)) for j in range(9)]
    d.line(pts, fill=c2 + (255,), width=6, joint="curve")
    for p in pts: d.ellipse((p[0]-7, p[1]-7, p[0]+7, p[1]+7), fill=(255, 255, 255, 255))
    im = Image.alpha_composite(im, ov)
    d = ImageDraw.Draw(im)
    d.text((220, 90), t.upper(), font=font(52), fill=(255, 255, 255, 240))
    d.text((222, 720), "DEMO PROJECT · placeholder artwork", font=font(22, False), fill=(220, 220, 255, 180))
    save(im.convert("RGB"), f"project-{i+1}.webp")

# ── Gallery (synthwave scenes) ──
for i in range(8):
    w, h = 1000, 1250 if i % 3 == 0 else 750
    c1, c2 = PALETTES[(i + 3) % len(PALETTES)]
    im = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(im)
    for y in range(h):
        d.line((0, y, w, y), fill=lerp((8, 6, 22), lerp(c1, (20, 10, 40), 0.3), y / h))
    sun_y = int(h * 0.48); r = int(w * 0.18)
    sun = Image.new("RGBA", (w, h), (0, 0, 0, 0)); sd = ImageDraw.Draw(sun)
    sd.ellipse((w/2-r, sun_y-r, w/2+r, sun_y+r), fill=c2 + (255,))
    for k in range(6): sd.rectangle((0, sun_y + k * 14, w, sun_y + k * 14 + 4 + k), fill=(0, 0, 0, 0))
    glow = sun.filter(ImageFilter.GaussianBlur(40))
    im = Image.alpha_composite(Image.alpha_composite(im.convert("RGBA"), glow), sun)
    d = ImageDraw.Draw(im)
    random.seed(i)
    base = int(h * 0.62)
    pts = [(0, h)] + [(x, base - random.randint(0, int(h * 0.18))) for x in range(0, w + 80, 80)] + [(w, h)]
    d.polygon(pts, fill=(12, 8, 28, 255))
    for x in range(-w, 2 * w, 60): d.line((w / 2, base, x, h), fill=c1 + (110,), width=2)
    for k in range(10):
        yy = base + int((h - base) * (k / 10) ** 1.8); d.line((0, yy, w, yy), fill=c1 + (110,), width=2)
    d.text((30, h - 50), f"Demo photo {i+1}", font=font(24, False), fill=(255, 255, 255, 170))
    save(im.convert("RGB"), f"gallery-{i+1}.webp")

# ── Sample certificates (clearly marked SAMPLE) ──
certs = [("Python for Data Science", "Demo Academy"), ("Machine Learning Foundations", "Sample University"),
         ("Web Development Bootcamp", "Placeholder Institute"), ("Statistics Essentials", "Example Online")]
pdf_pages = []
for i, (t, issuer) in enumerate(certs):
    w, h = 1400, 1000
    c1, c2 = PALETTES[i]
    im = Image.new("RGB", (w, h), (250, 248, 243)); d = ImageDraw.Draw(im)
    d.rectangle((30, 30, w - 30, h - 30), outline=c1, width=10)
    d.rectangle((55, 55, w - 55, h - 55), outline=c2, width=3)
    def ctext(y, s, f, col):
        tw = d.textlength(s, font=f); d.text(((w - tw) / 2, y), s, font=f, fill=col)
    ctext(120, "CERTIFICATE OF COMPLETION", font(54, True, True), (30, 30, 50))
    ctext(230, "This sample certificate is presented to", font(30, False, True), (90, 90, 110))
    ctext(310, "Your Name", font(80, True, True), c1)
    ctext(440, "for successfully completing", font(30, False, True), (90, 90, 110))
    ctext(500, t, font(48, True), (30, 30, 50))
    ctext(580, f"Issued by {issuer}", font(30, False), (90, 90, 110))
    d.ellipse((w/2-80, 680, w/2+80, 840), outline=c2, width=8)
    ctext(735, "★", font(60), c2)
    big = font(120); ov = Image.new("RGBA", (w, h), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
    od.text((260, 380), "SAMPLE", font=big, fill=(200, 30, 60, 45))
    im = Image.alpha_composite(im.convert("RGBA"), ov.rotate(18, center=(w/2, h/2))).convert("RGB")
    save(im, f"cert-{i+1}.webp", 85)
    pdf_pages.append(im)
pdf_pages[0].save(os.path.join(OUT, "sample-certificate.pdf"), "PDF", resolution=110)

# ── Achievements ──
for i, label in enumerate(["1st", "Top 5%", "Finalist", "Gold", "100+"]):
    w, h = 900, 900
    c1, c2 = PALETTES[(i + 1) % len(PALETTES)]
    im = bg(w, h, c1, c2, 300 + i).convert("RGBA"); d = ImageDraw.Draw(im)
    cx, cy = w / 2, h / 2
    for k in range(6, 0, -1):
        r = 80 + k * 45; d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=lerp(c1, c2, k / 6) + (120,), width=3)
    pts = [(cx + 200 * math.cos(a) * (1 if j % 2 == 0 else .45), cy + 200 * math.sin(a) * (1 if j % 2 == 0 else .45)) for j, a in enumerate([-math.pi/2 + k * math.pi/5 for k in range(10)])]
    d.polygon(pts, fill=c2 + (230,))
    f = font(70); tw = d.textlength(label, font=f); d.text((cx - tw / 2, cy - 40), label, font=f, fill=(15, 10, 30, 255))
    save(im.convert("RGB"), f"achievement-{i+1}.webp")

# ── Simple letter logos ──
for i, letters in enumerate(["IIT", "DIP", "SCH", "ORG", "LAB", "CLB"]):
    w = 256
    c1, c2 = PALETTES[i]
    im = Image.new("RGB", (w, w), (12, 10, 26)); d = ImageDraw.Draw(im)
    for y in range(w): d.line((0, y, w, y), fill=lerp(c1, c2, y / w))
    d.rounded_rectangle((14, 14, w - 14, w - 14), radius=40, fill=(12, 10, 26))
    f = font(64); tw = d.textlength(letters, font=f); d.text(((w - tw) / 2, 90), letters, font=f, fill=c2)
    save(im, f"logo-{i+1}.webp", 90)

# ── Avatars for testimonials ──
for i in range(3):
    w = 300; c1, c2 = PALETTES[i + 2]
    im = bg(w, w, c1, c2, 500 + i).convert("RGBA"); d = ImageDraw.Draw(im)
    d.ellipse((100, 60, 200, 160), fill=(240, 240, 255, 220)); d.ellipse((50, 170, 250, 380), fill=(240, 240, 255, 220))
    save(im.convert("RGB"), f"avatar-{i+1}.webp")

# ── Blog covers ──
for i in range(3):
    c1, c2 = PALETTES[(i + 5) % len(PALETTES)]
    im = grid(bg(1200, 675, c1, c2, 700 + i), c2, 45, 25); save(im, f"blog-{i+1}.webp")

# ── OG share image ──
im = grid(bg(1200, 630, *PALETTES[0], 999), PALETTES[0][1], 50, 25); d = ImageDraw.Draw(im)
d.text((80, 230), "Your Name", font=font(96), fill=(255, 255, 255)); d.text((84, 360), "Cinematic Portfolio · Demo", font=font(40, False), fill=(200, 210, 255))
save(im, "og.webp", 85)
im.save(os.path.join(OUT, "og.png"))

# ── Sample résumé PDF ──
im = Image.new("RGB", (1240, 1754), (255, 255, 255)); d = ImageDraw.Draw(im)
d.rectangle((0, 0, 1240, 220), fill=(20, 16, 40)); d.text((80, 70), "YOUR NAME", font=font(70), fill=(255, 255, 255))
d.text((84, 155), "Sample résumé — replace from Admin → Settings → Profile", font=font(28, False), fill=(190, 200, 255))
y = 300
for sec in ["EDUCATION", "PROJECTS", "SKILLS", "CERTIFICATIONS"]:
    d.text((80, y), sec, font=font(36), fill=(90, 60, 200)); y += 60
    for _ in range(4): d.rounded_rectangle((80, y, 80 + random.randint(600, 1080), y + 18), radius=9, fill=(225, 225, 235)); y += 40
    y += 50
im.save(os.path.join(OUT, "sample-resume.pdf"), "PDF", resolution=150)
print("demo assets written to", os.path.abspath(OUT))
