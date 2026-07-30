#!/usr/bin/env python3
"""
Circle Heroes — 전투 이펙트 8종 재생성.
기존 assets/effects/*.png는 배경 제거 스크립트가 반대 방향(흰 배경을 어두운 배경으로 착각)으로
돌아가 대부분 픽셀이 불투명 흰색으로 남아있었다(누끼가 네모로 보이는 원인). 소스 렌더가 없어
후처리로 못 살려서, 알파를 처음부터 올바르게 계산하는 절차적 버스트/링으로 대체 생성한다.
"""
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "effects"
SIZE = 256


def make_burst(num_rays, ray_colors, core_color, seed, ray_len=0.52, core_r=0.20, blur=1.0):
    random.seed(seed)
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    rays = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(rays)
    cx = cy = SIZE / 2
    for i in range(num_rays):
        angle = (2 * math.pi / num_rays) * i + random.uniform(-0.18, 0.18)
        length = SIZE * ray_len * random.uniform(0.6, 1.0)
        width = SIZE * 0.045 * random.uniform(0.55, 1.25)
        perp = angle + math.pi / 2
        x1, y1 = cx + math.cos(perp) * width, cy + math.sin(perp) * width
        x2, y2 = cx - math.cos(perp) * width, cy - math.sin(perp) * width
        x3, y3 = cx + math.cos(angle) * length, cy + math.sin(angle) * length
        color = random.choice(ray_colors)
        draw.polygon([(x1, y1), (x2, y2), (x3, y3)], fill=(*color, 220))
    rays = rays.filter(ImageFilter.GaussianBlur(blur))
    img.alpha_composite(rays)

    core = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    cdraw = ImageDraw.Draw(core)
    for mult, a in ((1.0, 90), (0.62, 170), (0.32, 255)):
        r = SIZE * core_r * mult
        cdraw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*core_color, a))
    core = core.filter(ImageFilter.GaussianBlur(SIZE * 0.02))
    img.alpha_composite(core)
    return img


def make_ring(ring_color, spark_color, seed):
    random.seed(seed)
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    cx, cy = SIZE / 2, SIZE / 2
    rx, ry = SIZE * 0.40, SIZE * 0.15

    ring = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    rdraw = ImageDraw.Draw(ring)
    for mult, a, w in ((1.0, 255, 0.05), (0.78, 130, 0.08)):
        r_x, r_y = rx * mult, ry * mult
        rdraw.ellipse(
            [cx - r_x, cy - r_y, cx + r_x, cy + r_y],
            outline=(*ring_color, a),
            width=max(2, int(SIZE * w)),
        )
    ring = ring.filter(ImageFilter.GaussianBlur(2))
    img.alpha_composite(ring)

    sparks = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(sparks)
    for _ in range(14):
        t = random.uniform(0, 2 * math.pi)
        sx = cx + math.cos(t) * rx * random.uniform(0.85, 1.05)
        sy = cy + math.sin(t) * ry * random.uniform(0.85, 1.05)
        h = SIZE * random.uniform(0.05, 0.14)
        sdraw.line([(sx, sy), (sx, sy - h)], fill=(*spark_color, 200), width=2)
    sparks = sparks.filter(ImageFilter.GaussianBlur(0.6))
    img.alpha_composite(sparks)

    core = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    cdraw = ImageDraw.Draw(core)
    r = SIZE * 0.10
    cdraw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*spark_color, 160))
    core = core.filter(ImageFilter.GaussianBlur(SIZE * 0.03))
    img.alpha_composite(core)
    return img


SPECS = {
    "hit-impact.png": lambda: make_burst(
        10, [(255, 255, 255), (225, 232, 250), (200, 212, 235)], (255, 255, 255), seed=1
    ),
    "hit-crit.png": lambda: make_burst(
        14,
        [(255, 214, 60), (255, 120, 60), (255, 255, 255)],
        (255, 255, 255),
        seed=2,
        ray_len=0.62,
        core_r=0.24,
    ),
    "hit-불.png": lambda: make_burst(
        10, [(255, 96, 40), (255, 160, 30), (255, 205, 70)], (255, 236, 190), seed=3
    ),
    "hit-물.png": lambda: make_burst(
        10, [(60, 150, 255), (100, 195, 255), (170, 230, 255)], (222, 246, 255), seed=4
    ),
    "hit-바람.png": lambda: make_burst(
        10, [(96, 214, 140), (150, 232, 168), (206, 248, 200)], (232, 255, 226), seed=5
    ),
    "hit-빛.png": lambda: make_burst(
        11, [(255, 221, 120), (255, 240, 180), (255, 255, 225)], (255, 255, 255), seed=6
    ),
    "hit-어둠.png": lambda: make_burst(
        10, [(150, 80, 205), (190, 110, 230), (110, 55, 165)], (222, 190, 250), seed=7
    ),
    "cast-aura.png": lambda: make_ring((255, 165, 70), (255, 220, 150), seed=8),
}


def main():
    for name, fn in SPECS.items():
        img = fn()
        path = OUT / name
        img.save(path, "PNG")
        print("wrote", path.relative_to(ROOT))


if __name__ == "__main__":
    main()
