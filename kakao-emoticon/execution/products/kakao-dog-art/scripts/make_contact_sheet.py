"""32종(또는 phrases.json에 있는 개수) 결과물을 격자로 이어붙여 합본 미리보기를 만든다.

사용법:
    python3 make_contact_sheet.py --phrases phrases.json --art-dir ../ --out ../00-contact-sheet-preview.png
"""
import argparse
import json
import math
import os

from PIL import Image

CELL = 260  # 합본 안에서 캐릭터 한 칸 크기(px), 원본 360x360을 축소해서 배치
PAD = 10
BG = (235, 235, 235, 255)


def checkerboard(size, tile=13):
    img = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    px = img.load()
    for y in range(size):
        for x in range(size):
            if (x // tile + y // tile) % 2 == 0:
                px[x, y] = (222, 222, 222, 255)
            else:
                px[x, y] = (255, 255, 255, 255)
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--phrases", required=True)
    ap.add_argument("--art-dir", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--cols", type=int, default=8)
    args = ap.parse_args()

    phrases = json.load(open(args.phrases, encoding="utf-8"))
    cols = args.cols
    rows = math.ceil(len(phrases) / cols)

    sheet_w = cols * CELL + (cols + 1) * PAD
    sheet_h = rows * CELL + (rows + 1) * PAD
    sheet = Image.new("RGBA", (sheet_w, sheet_h), BG)

    for i, p in enumerate(phrases):
        slug = p["slug"]
        path = os.path.join(args.art_dir, f"{slug}.png")
        if not os.path.exists(path):
            print("missing:", path)
            continue
        art = Image.open(path).convert("RGBA")
        cell_bg = checkerboard(CELL)
        art_resized = art.resize((CELL, CELL), Image.LANCZOS)
        cell_bg.alpha_composite(art_resized)

        r, c = divmod(i, cols)
        x = PAD + c * (CELL + PAD)
        y = PAD + r * (CELL + PAD)
        sheet.alpha_composite(cell_bg, (x, y))

    sheet.convert("RGB").save(args.out, format="PNG", optimize=True)
    print("saved:", args.out, sheet.size)


if __name__ == "__main__":
    main()
