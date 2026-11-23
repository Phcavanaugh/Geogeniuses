"""Cut a ChatGPT sticker sheet (transparent PNG) into word pictures for art/words/.

  python3 palabras/tools/stickers.py SHEET.png name1 name2 ... [--rim]

Stickers are taken in reading order (rows top to bottom, left to right) and saved as
art/words/<name>.png, 256x256. --rim adds a white die-cut border and a dark plum outline,
for sheets that came back without them, so every sticker matches.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

OUT = Path(__file__).resolve().parent.parent / 'art' / 'words'
PLUM = (51, 38, 59)


def disk(r):
    y, x = np.ogrid[-r:r + 1, -r:r + 1]
    return x * x + y * y <= r * r


def add_rim(rgba, white=9, line=4):
    pad = white + line + 4
    rgba = np.pad(rgba, ((pad, pad), (pad, pad), (0, 0)))
    solid = ndimage.binary_fill_holes(rgba[..., 3] > 60)
    w = ndimage.binary_dilation(solid, disk(white))
    o = ndimage.binary_dilation(w, disk(line))
    out = np.zeros_like(rgba)
    out[o] = (*PLUM, 255)
    out[w] = (255, 255, 255, 255)
    a = rgba[..., 3:4].astype(float) / 255   # put the drawing back on top of its new border
    out[..., :3] = (rgba[..., :3] * a + out[..., :3] * (1 - a)).astype(np.uint8)
    out[..., 3] = np.maximum(out[..., 3], rgba[..., 3])
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    rim = '--rim' in sys.argv
    sheet, names = args[0], args[1:]
    a = np.asarray(Image.open(sheet).convert('RGBA'))
    alpha = a[..., 3]
    # find one seed per sticker; stickers whose borders touch are pulled apart by shrinking first
    for t, shrink in ((40, 0), (128, 0), (200, 4), (250, 4), (250, 10), (250, 16), (250, 24)):
        m = alpha > t
        if shrink:
            m = ndimage.binary_erosion(m, disk(shrink))
        seeds, n = ndimage.label(m)
        sizes = ndimage.sum(m, seeds, range(1, n + 1))
        keep = [i + 1 for i, s in enumerate(sizes) if s > 0.15 * sizes.max()]
        if len(keep) >= len(names):
            break
    seeds = np.where(np.isin(seeds, keep), seeds, 0)
    # every visible pixel belongs to the nearest seed
    _, (iy, ix) = ndimage.distance_transform_edt(seeds == 0, return_indices=True)
    lab = np.where(alpha > 24, seeds[iy, ix], 0)
    objs = ndimage.find_objects(lab)
    cy = {k: (objs[k - 1][0].start + objs[k - 1][0].stop) / 2 for k in keep}
    rows, row0 = [], None          # group into rows: a new row starts when the middle drops a lot
    for k in sorted(keep, key=cy.get):
        if row0 is None or cy[k] - row0 > 0.2 * a.shape[0]:
            rows.append([]); row0 = cy[k]
        rows[-1].append(k)
    items = [k for r in rows for k in sorted(r, key=lambda k: objs[k - 1][1].start)]
    if len(items) != len(names):
        sys.exit(f'found {len(items)} stickers but got {len(names)} names')
    OUT.mkdir(parents=True, exist_ok=True)
    for name, k in zip(names, items):
        sl = objs[k - 1]
        crop = a[sl].copy()
        crop[..., 3] = np.where(lab[sl] == k, crop[..., 3], 0)
        if rim:
            crop = add_rim(crop)
        im = Image.fromarray(crop, 'RGBA')
        w, h = im.size
        s = max(w, h) + 8
        sq = Image.new('RGBA', (s, s))
        sq.paste(im, ((s - w) // 2, (s - h) // 2))
        sq.resize((256, 256), Image.LANCZOS).save(OUT / f'{name}.png', optimize=True)
        print(name, w, h)


if __name__ == '__main__':
    main()
