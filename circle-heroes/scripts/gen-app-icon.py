#!/usr/bin/env python3
"""
Circle Heroes 앱 아이콘 생성 — 라파엘 카드일러스트(왼쪽/사각형 버전, icon-picker-2.html 아티팩트 확정안).
navy 방사형 그라디언트 배경 + 골드 링 원형 초상 배지(icon-picker-2.html의 drawPortraitBadge와 동일 규칙).
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC_CARD = ROOT / "assets" / "cards" / "raphael_light_001.png"
RES = ROOT / "android" / "app" / "src" / "main" / "res"

NAVY_DEEP = (5, 7, 15)
NAVY_MID = (24, 34, 54)
AMBER = (245, 172, 61)
TOP_BIAS = 0.1  # icon-picker-2.html SUBJECTS: raphael_light_001

# 레거시 아이콘(48dp 기준): mdpi..xxxhdpi
LEGACY_SIZES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
# 어댑티브 아이콘 레이어(108dp 기준)
ADAPTIVE_SIZES = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}


def navy_bg(size: int) -> Image.Image:
    """icon-picker-2.html navyBg()와 동일한 방사형 그라디언트."""
    img = Image.new("RGB", (size, size), NAVY_DEEP)
    px = img.load()
    cx0, cy0, r0 = size * 0.42, size * 0.38, size * 0.05
    r1 = size * 0.72
    for y in range(size):
        for x in range(size):
            d = math.hypot(x - cx0, y - cy0)
            t = min(1.0, max(0.0, (d - r0) / max(1.0, (r1 - r0))))
            px[x, y] = tuple(int(NAVY_MID[i] + (NAVY_DEEP[i] - NAVY_MID[i]) * t) for i in range(3))
    return img


def cropped_portrait(size: int) -> Image.Image:
    """카드 일러스트에서 정사각 크롭(중앙 정렬 + topBias 상단 편향), size 크기로 리샘플."""
    src = Image.open(SRC_CARD).convert("RGB")
    w, h = src.size
    crop_size = min(w, h)
    sx = (w - crop_size) // 2
    sy = int(max(0, min(h - crop_size, (h - crop_size) * TOP_BIAS)))
    portrait = src.crop((sx, sy, sx + crop_size, sy + crop_size))
    return portrait.resize((size, size), Image.LANCZOS)


def portrait_badge(size: int, radius_factor: float, transparent_bg: bool) -> Image.Image:
    """원형 클립 초상 + 하단 비네트 + 골드 링(이중선). transparent_bg=True면 배지 밖은 투명(어댑티브 foreground용)."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cx, cy = size / 2, size / 2
    r = size * radius_factor

    if not transparent_bg:
        bg = navy_bg(size).convert("RGBA")
        canvas.alpha_composite(bg)

    portrait = cropped_portrait(int(r * 2)).convert("RGBA")
    mask = Image.new("L", (int(r * 2), int(r * 2)), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, int(r * 2), int(r * 2)), fill=255)
    canvas.paste(portrait, (int(cx - r), int(cy - r)), mask)

    # 비네트(하단부 어둡게)
    vignette = Image.new("L", (int(r * 2), int(r * 2)), 0)
    vpx = vignette.load()
    for y in range(int(r * 2)):
        for x in range(int(r * 2)):
            d = math.hypot(x - r, y - r)
            t = min(1.0, max(0.0, (d - r * 0.55) / (r * 0.45)))
            vpx[x, y] = int(115 * t)  # 최대 alpha ~0.45*255
    vignette_layer = Image.new("RGBA", (int(r * 2), int(r * 2)), (*NAVY_DEEP, 0))
    vignette_layer.putalpha(vignette)
    vmask = Image.new("L", (int(r * 2), int(r * 2)), 0)
    ImageDraw.Draw(vmask).ellipse((0, 0, int(r * 2), int(r * 2)), fill=255)
    vignette_layer.putalpha(Image.composite(vignette, Image.new("L", vignette.size, 0), vmask))
    canvas.alpha_composite(vignette_layer, (int(cx - r), int(cy - r)))

    draw = ImageDraw.Draw(canvas)
    ring_w = max(1, round(size * 0.02))
    inner_w = max(1, round(size * 0.004))
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=AMBER, width=ring_w)
    r2 = r - size * 0.028
    draw.ellipse((cx - r2, cy - r2, cx + r2, cy + r2), outline=(*AMBER, 128), width=inner_w)
    return canvas


def save(img: Image.Image, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG")
    print("wrote", path.relative_to(ROOT))


def main():
    for density, size in ADAPTIVE_SIZES.items():
        d = RES / f"mipmap-{density}"
        fg = portrait_badge(size, radius_factor=0.30, transparent_bg=True)
        save(fg, d / "ic_launcher_foreground.png")
        bg = navy_bg(size)
        save(bg, d / "ic_launcher_background.png")

    for density, size in LEGACY_SIZES.items():
        d = RES / f"mipmap-{density}"
        square = portrait_badge(size, radius_factor=0.42, transparent_bg=False)
        save(square.convert("RGB"), d / "ic_launcher.png")

        # round: 배지를 원형으로 완전히 마스킹(레거시 런처의 원형 자동마스크 미지원 단말 대비)
        round_icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, size, size), fill=255)
        round_icon.paste(square, (0, 0), mask)
        save(round_icon, d / "ic_launcher_round.png")


if __name__ == "__main__":
    main()
