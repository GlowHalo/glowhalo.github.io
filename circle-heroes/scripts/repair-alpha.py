#!/usr/bin/env python3
"""
strip-white-bg.py의 2차 패스("연결 안 된 순백 픽셀은 전부 투명화")가 캐릭터 내부의
정당한 흰색 디테일(갑옷 하이라이트, 슬라임 반점 등)까지 지워 구멍을 냈던 문제를 복구.
RGB는 훼손되지 않고 alpha만 0이 됐으므로, 테두리 연결 흰 배경만 다시 계산해서
알파를 재생성하면 원본 없이도 복구 가능하다.

사용법: python3 scripts/repair-alpha.py <입력.png> <출력.png> [--thresh 235]
"""
import sys
from collections import deque
from pathlib import Path

from PIL import Image
import numpy as np


def repair(in_path, out_path, thresh=235, soft_tol=18):
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

    alpha = np.full((h, w), 255, dtype=np.uint8)
    alpha[visited] = 0

    vis_shift = (
        np.roll(visited, 1, axis=0) | np.roll(visited, -1, axis=0) |
        np.roll(visited, 1, axis=1) | np.roll(visited, -1, axis=1)
    )
    soft_candidates = vis_shift & ~visited & np.all(rgb >= (thresh - soft_tol), axis=2)
    alpha[soft_candidates] = 120

    # 2차 "순백은 무조건 투명화" 패스는 의도적으로 넣지 않는다(원흉이었음).
    arr[:, :, 3] = alpha
    Image.fromarray(arr, "RGBA").save(out_path)
    removed = visited.sum()
    print(f"{in_path} -> {out_path}: bg {removed}/{h*w} ({removed/(h*w)*100:.1f}%)")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    t = 235
    if "--thresh" in sys.argv:
        t = int(sys.argv[sys.argv.index("--thresh") + 1])
    repair(sys.argv[1], sys.argv[2], thresh=t)
