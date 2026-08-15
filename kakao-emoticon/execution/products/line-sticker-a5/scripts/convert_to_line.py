"""카카오용 360x360 정사각 아트워크를 LINE Creators Market 규격으로 변환한다.

- 스티커: 370x320px 투명 PNG, 아트워크를 최대 300x300 안에 비율유지 축소 후 중앙 배치(여백 확보)
- 메인 이미지: 240x240px, 아트워크를 최대 220x220 안에 비율유지 축소 후 중앙 배치
- 탭 이미지: 96x74px, 대표 이미지의 얼굴 영역만 크롭해서 축소(작은 아이콘이라 몸통 생략)

사용법:
    python3 convert_to_line.py --src ../../kakao-emoticon-art --out .. --main 01-annyeonghaseyo --n 32
"""
import argparse
import os

from PIL import Image


def fit_center(im, canvas_w, canvas_h, max_w, max_h):
    """im(RGBA)을 max_w x max_h 안에 비율유지로 축소한 뒤 canvas_w x canvas_h 캔버스 중앙에 배치."""
    w, h = im.size
    scale = min(max_w / w, max_h / h)
    new_w, new_h = int(w * scale), int(h * scale)
    resized = im.resize((new_w, new_h), Image.LANCZOS)
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    x = (canvas_w - new_w) // 2
    y = (canvas_h - new_h) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True, help="원본 360x360 PNG들이 있는 폴더")
    ap.add_argument("--out", required=True, help="결과물을 저장할 폴더")
    ap.add_argument("--main", required=True, help="메인 이미지·탭 이미지로 쓸 대표 파일의 slug(확장자 제외)")
    ap.add_argument("--n", type=int, default=32)
    args = ap.parse_args()

    sticker_dir = os.path.join(args.out, "stickers")
    os.makedirs(sticker_dir, exist_ok=True)

    files = sorted(f for f in os.listdir(args.src) if f.endswith(".png") and not f.startswith("00-") and not f.startswith("33-"))
    if len(files) != args.n:
        print(f"경고: 예상 {args.n}개인데 실제 {len(files)}개 발견 — {files}")

    over_limit = []
    for i, fname in enumerate(files, start=1):
        im = Image.open(os.path.join(args.src, fname)).convert("RGBA")
        sticker = fit_center(im, 370, 320, 300, 300)
        # LINE 요구사항: 가로세로 짝수 (370x320은 이미 짝수)
        out_path = os.path.join(sticker_dir, f"{i:02d}.png")
        sticker.save(out_path, format="PNG", optimize=True)
        size_kb = os.path.getsize(out_path) / 1024
        if size_kb > 1024:  # LINE 용량 제한은 별도 확인 필요하지만 1MB 넘으면 일단 표시
            over_limit.append(fname)
        print(f"{fname} -> {out_path} ({sticker.size}, {size_kb:.1f}KB)")

    # 메인 이미지 (240x240)
    main_src_path = os.path.join(args.src, f"{args.main}.png")
    main_im = Image.open(main_src_path).convert("RGBA")
    main_img = fit_center(main_im, 240, 240, 220, 220)
    main_out = os.path.join(args.out, "main.png")
    main_img.save(main_out, format="PNG", optimize=True)
    print(f"main image -> {main_out} ({main_img.size}, {os.path.getsize(main_out)/1024:.1f}KB)")

    # 탭 이미지 (96x74) — 대표 이미지 상단(얼굴 위주)만 크롭해서 축소
    w, h = main_im.size
    # 정사각 아트워크의 위쪽 65%를 얼굴 영역으로 간주하고 크롭
    face_crop = main_im.crop((0, 0, w, int(h * 0.72)))
    tab_img = fit_center(face_crop, 96, 74, 88, 66)
    tab_out = os.path.join(args.out, "tab.png")
    tab_img.save(tab_out, format="PNG", optimize=True)
    print(f"tab image -> {tab_out} ({tab_img.size}, {os.path.getsize(tab_out)/1024:.1f}KB)")

    if over_limit:
        print("용량 주의 필요:", over_limit)


if __name__ == "__main__":
    main()
