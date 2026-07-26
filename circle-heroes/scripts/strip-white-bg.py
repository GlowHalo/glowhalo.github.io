#!/usr/bin/env python3
"""Circle Heroes — Leonardo가 뱉는 순백색 배경(pure white, no shadow)을 투명 PNG로 변환.

PROMPTS.md "사용 순서" 3번: 투명 배경이 안 되면 pure white로 받아서 Claude가 배경을 제거한다.
테두리에서부터 연결된 흰 영역만 flood-fill로 지우기 때문에, 캐릭터 내부의 흰색 하이라이트
(눈동자 반사광 등)는 보존된다. 발밑 접촉 그림자처럼 테두리와 분리된 잔여 흰 얼룩은 순수 흰색
(RGB >= 248)일 때만 2차로 제거한다.

의존성: pip install pillow numpy

사용법:
  python3 scripts/strip-white-bg.py <입력.png> <출력.png> [--thresh 235]
"""
import sys
from collections import deque
from PIL import Image
import numpy as np


def strip_white_bg(in_path, out_path, thresh=235, soft_tol=18):
    img = Image.open(in_path).convert("RGBA")
    arr = np.array(img)
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3].astype(np.int16)

    is_bgish = np.all(rgb >= thresh, axis=2)

    visited = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_bgish[y, x] and not visited[y, x]:
                visited[y, x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_bgish[y, x] and not visited[y, x]:
                visited[y, x] = True
                q.append((x, y))

    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[ny, nx] and is_bgish[ny, nx]:
                visited[ny, nx] = True
                q.append((nx, ny))

    alpha = arr[:, :, 3].copy()
    alpha[visited] = 0

    vis_shift = (
        np.roll(visited, 1, axis=0) | np.roll(visited, -1, axis=0) |
        np.roll(visited, 1, axis=1) | np.roll(visited, -1, axis=1)
    )
    soft_candidates = vis_shift & ~visited & np.all(rgb >= (thresh - soft_tol), axis=2)
    alpha[soft_candidates] = 120

    # disconnected near-pure-white blobs (e.g. feet contact shadow) — kill those too
    pure_white = np.all(rgb >= 248, axis=2) & (alpha == 255)
    alpha[pure_white] = 0

    arr[:, :, 3] = alpha
    Image.fromarray(arr, "RGBA").save(out_path)
    removed = visited.sum()
    print(f"{in_path} -> {out_path}: removed {removed}/{h * w} px ({removed / (h * w) * 100:.1f}%)")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    t = 235
    if "--thresh" in sys.argv:
        t = int(sys.argv[sys.argv.index("--thresh") + 1])
    strip_white_bg(sys.argv[1], sys.argv[2], thresh=t)
