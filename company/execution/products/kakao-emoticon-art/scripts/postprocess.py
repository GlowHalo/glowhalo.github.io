"""마젠타 배경 원본 -> 크로마키 배경제거 -> 정사각 오토크롭 -> 360x360 72dpi RGB PNG.

배경색을 고정값으로 안 쓰고 이미지마다 모서리 픽셀에서 자동 샘플링한다
(이미지별로 마젠타 톤이 미묘하게 달라서).

사용법:
    python3 postprocess.py --phrases phrases.json --raw-dir raw --out-dir ../
"""
import argparse
import json
import os

import numpy as np
from PIL import Image

LOW_T = 55.0    # 배경색과의 거리, 이보다 작으면 완전 투명
HIGH_T = 105.0  # 이보다 크면 완전 불투명


def chroma_key(im_rgb):
    arr = np.asarray(im_rgb, dtype=np.float64)
    h, w, _ = arr.shape
    corners = np.array([arr[2, 2], arr[2, w - 3], arr[h - 3, 2], arr[h - 3, w - 3]])
    bg = corners.mean(axis=0)

    diff = arr - bg
    dist = np.sqrt((diff ** 2).sum(axis=2))

    alpha = np.clip((dist - LOW_T) / (HIGH_T - LOW_T), 0, 1)

    # 엣지 디컨탐: 반투명 경계 픽셀에서 배경색 번짐 제거
    alpha_safe = np.clip(alpha, 0.08, 1.0)[..., None]
    fg = (arr - (1 - alpha_safe) * bg) / alpha_safe
    fg = np.clip(fg, 0, 255)

    out = np.dstack([fg, (alpha * 255)]).astype(np.uint8)
    return Image.fromarray(out, mode="RGBA"), bg, alpha


def autocrop_square(rgba_img, alpha, pad_frac=0.08):
    ys, xs = np.where(alpha > 0.15)
    if len(xs) == 0:
        return rgba_img
    x0, x1 = xs.min(), xs.max()
    y0, y1 = ys.min(), ys.max()
    bw, bh = x1 - x0, y1 - y0
    side = max(bw, bh)
    pad = int(side * pad_frac)
    side_p = side + pad * 2
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    half = side_p // 2
    left = cx - half
    top = cy - half
    W, H = rgba_img.size
    canvas = Image.new("RGBA", (side_p, side_p), (0, 0, 0, 0))
    src_left = max(left, 0)
    src_top = max(top, 0)
    src_right = min(left + side_p, W)
    src_bottom = min(top + side_p, H)
    crop = rgba_img.crop((src_left, src_top, src_right, src_bottom))
    paste_x = src_left - left
    paste_y = src_top - top
    canvas.paste(crop, (paste_x, paste_y))
    return canvas


def process(raw_dir, out_dir, slug):
    im = Image.open(os.path.join(raw_dir, f"{slug}.jpg")).convert("RGB")
    rgba, bg, alpha = chroma_key(im)
    square = autocrop_square(rgba, alpha)
    final = square.resize((360, 360), Image.LANCZOS)
    out_path = os.path.join(out_dir, f"{slug}.png")
    final.save(out_path, format="PNG", optimize=True, dpi=(72, 72))
    size_kb = os.path.getsize(out_path) / 1024
    return out_path, size_kb, tuple(bg.round(1))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--phrases", required=True)
    ap.add_argument("--raw-dir", required=True)
    ap.add_argument("--out-dir", required=True)
    args = ap.parse_args()

    os.makedirs(args.out_dir, exist_ok=True)
    phrases = json.load(open(args.phrases, encoding="utf-8"))
    over_limit = []
    for p in phrases:
        slug = p["slug"]
        raw_path = os.path.join(args.raw_dir, f"{slug}.jpg")
        if not os.path.exists(raw_path):
            print(f"{slug}: raw 파일 없음, 스킵")
            continue
        path, size_kb, bg = process(args.raw_dir, args.out_dir, slug)
        flag = " !!OVER150KB" if size_kb > 150 else ""
        if size_kb > 150:
            over_limit.append(slug)
        print(f"{slug}: bg={bg} size={size_kb:.1f}KB -> {path}{flag}")
    if over_limit:
        print("150KB 초과:", over_limit)


if __name__ == "__main__":
    main()
