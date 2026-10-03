"""
Cuts the City Shield logo out of brand/source/logo.webp (an embossed-paper
render) into flat, transparent PNGs used by the app:
  public/brand/shield.png        the shield mark
  public/brand/wordmark.png      "CITYSHIELD" in brand navy
  public/brand/wordmark-white.png the same, white, for dark backgrounds
  public/brand/logo-full.png     shield + wordmark lockup
  public/icons/*.png, public/favicon.png  app icons
Segmentation: OpenCV GrabCut seeded with the shield / wordmark boxes.
"""
import cv2, numpy as np
from PIL import Image

SRC = 'brand/source/logo.webp'
img = cv2.cvtColor(np.array(Image.open(SRC).convert('RGB')), cv2.COLOR_RGB2BGR)
H, W = img.shape[:2]

def grabcut(rect, iters=8):
    mask = np.zeros((H, W), np.uint8)
    bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(img, mask, rect, bgd, fgd, iters, cv2.GC_INIT_WITH_RECT)
    m = np.where((mask == 1) | (mask == 3), 255, 0).astype(np.uint8)
    # keep the largest connected blobs, fill holes, soften the edge a touch
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m)
    keep = np.zeros_like(m)
    if n > 1:
        areas = stats[1:, cv2.CC_STAT_AREA]
        for i, a in enumerate(areas, 1):
            if a > areas.max() * 0.004: keep[lab == i] = 255
    return keep

def fill_holes(m):
    inv = cv2.bitwise_not(m)
    h, w = m.shape
    ff = inv.copy(); fm = np.zeros((h + 2, w + 2), np.uint8)
    cv2.floodFill(ff, fm, (0, 0), 0)
    return cv2.bitwise_or(m, ff)

def rgba(m, feather=1.2):
    a = cv2.GaussianBlur(m, (0, 0), feather) if feather else m
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    return np.dstack([rgb, a])

def trim(arr, pad=6):
    ys, xs = np.where(arr[..., 3] > 8)
    y0, y1, x0, x1 = max(ys.min() - pad, 0), min(ys.max() + pad, H), max(xs.min() - pad, 0), min(xs.max() + pad, W)
    return arr[y0:y1, x0:x1]

# shield: box around the emblem; holes filled so the whole enamel face is opaque
shield_m = fill_holes(grabcut((352, 258, 322, 382)))
# wordmark: letters only (holes such as the inside of D/O must stay transparent)
word_m = grabcut((150, 638, 724, 104), 10)

shield = trim(rgba(shield_m))
word = trim(rgba(word_m, 0.8))
full = trim(rgba(cv2.bitwise_or(shield_m, word_m)))

Image.fromarray(shield).save('public/brand/shield.png', optimize=True)
Image.fromarray(word).save('public/brand/wordmark.png', optimize=True)
white = word.copy(); white[..., :3] = 255
Image.fromarray(white).save('public/brand/wordmark-white.png', optimize=True)
Image.fromarray(full).save('public/brand/logo-full.png', optimize=True)

# app icons: shield centred on brand navy (maskable keeps a 20% safe zone)
sh = Image.fromarray(shield)
def icon(size, bg, scale):
    c = Image.new('RGBA', (size, size), bg)
    s = sh.copy(); s.thumbnail((int(size * scale), int(size * scale)), Image.LANCZOS)
    c.alpha_composite(s, ((size - s.width) // 2, (size - s.height) // 2))
    return c
icon(192, (255, 255, 255, 0), 0.92).save('public/icons/icon-192.png')
icon(512, (255, 255, 255, 0), 0.92).save('public/icons/icon-512.png')
icon(512, (30, 58, 122, 255), 0.62).save('public/icons/maskable-512.png')
icon(180, (255, 255, 255, 255), 0.82).save('public/icons/apple-touch-icon.png')
icon(64, (255, 255, 255, 0), 0.98).save('public/favicon.png')
print('shield', shield.shape, 'wordmark', word.shape, 'full', full.shape)
