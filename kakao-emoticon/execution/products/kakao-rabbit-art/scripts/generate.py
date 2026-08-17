"""합격토끼(A8) 이모티콘 생성 요청을 Leonardo AI에 제출한다.

A3~A6 generate.py와 동일 구조 — 몸통 프롬프트와 고정 시드만 새 캐릭터용으로 교체.
보조 표현 축은 귀(처짐/쫑긋)+팔(제스처) 두 개 — phrases.json의 "ears"/"arms" 필드로 넘긴다.

사용법:
    export LEONARDO_API_KEY=...
    python3 generate.py --phrases phrases.json --state gen_ids.json
"""
import argparse
import json
import os
import subprocess
import time

BASE = (
    "cute kawaii mascot sticker character concept sheet, a small chubby round rabbit mascot with two "
    "long rounded ears, solid flat uniform SOLID PERIWINKLE BLUE-VIOLET color (single flat color, "
    "medium-high saturation, like a solid blueberry-violet crayon fill) covering the entire body, ears, "
    "legs and belly with absolutely no pink, no magenta, no pastel-white patches, no gradient shading, "
    "no color blending, no green or mint tint anywhere, short stubby arms and legs matching the exact "
    "same solid periwinkle-violet color as the body, ears are the same solid periwinkle-violet color as "
    "the body with only a thin black outline (no pink or light-colored ear interior), wearing small round "
    "black-rimmed glasses, big round sparkling eyes showing {expr}, {ears}, {arms}, flat vector "
    "illustration with completely flat uniform color fill and no fur texture strands, thick clean black "
    "outline, minimalist flat design, centered composition, single character, plain solid bright yellow "
    "background, chibi proportions, smooth rounded shapes, matte flat sticker look, Korean kakao talk "
    "emoticon sticker style, professional character design, high quality"
)

NEG = (
    "text, watermark, signature, blurry, realistic photo, 3d render, multiple characters, human face, "
    "background scenery, gradient, color gradient, two-tone, duotone, shading, highlight glow, shadow, "
    "extra limbs, complex background, low quality, cropped, cat, robot, bear, dog, tabby stripes, green "
    "fur, mint fur, brown fur, tan fur, pink fur, pink ears, magenta fur, magenta accents, blush, pink "
    "shading, green tint, brown tint, fur texture, textured fur, patterned fur, fluffy texture strands, "
    "glossy highlight, no glasses"
)

# A3(87008451)·A4(51402203)·A6(68302915)와 다른 새 고정 시드. 배경도 마젠타->초록으로 변경
# (캐릭터 색이 보라/파랑 계열이라 마젠타 배경과 색거리가 너무 가까워 크로마키가 몸통까지
#  반투명하게 먹어버리는 문제가 1차 시도에서 발견됨 — 배경을 초록으로 바꿔 색거리 확보)
SEED = 40217603
MODEL_ID = "de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3"  # Phoenix 1.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--phrases", required=True)
    ap.add_argument("--state", required=True)
    ap.add_argument("--sleep", type=float, default=1.5)
    args = ap.parse_args()

    leo_key = os.environ.get("LEONARDO_API_KEY")
    if not leo_key:
        raise SystemExit("LEONARDO_API_KEY 환경변수가 필요합니다 (금고의 leonardo_api_key 값)")

    phrases = json.load(open(args.phrases, encoding="utf-8"))

    results = {}
    if os.path.exists(args.state):
        results = json.load(open(args.state, encoding="utf-8"))

    for p in phrases:
        slug = p["slug"]
        if slug in results:
            print("skip (already submitted):", slug)
            continue
        ears = p.get("ears", "ears standing upright")
        arms = p.get("arms", "arms relaxed at the sides")
        prompt = BASE.format(expr=p["expr"], ears=ears, arms=arms)
        body = {
            "prompt": prompt,
            "negative_prompt": NEG,
            "modelId": MODEL_ID,
            "width": 512,
            "height": 512,
            "num_images": 1,
            "presetStyle": "ILLUSTRATION",
            "guidance_scale": 7,
            "seed": SEED,
        }
        r = subprocess.run(
            [
                "curl", "-s", "-X", "POST", "https://cloud.leonardo.ai/api/rest/v1/generations",
                "-H", f"Authorization: Bearer {leo_key}",
                "-H", "accept: application/json",
                "-H", "content-type: application/json",
                "-d", json.dumps(body),
            ],
            capture_output=True, text=True,
        )
        try:
            resp = json.loads(r.stdout)
            gid = resp["sdGenerationJob"]["generationId"]
            results[slug] = {"n": p["n"], "phrase": p["phrase"], "generationId": gid}
            print(slug, "->", gid)
        except Exception as e:
            print("ERROR", slug, r.stdout, e)
        json.dump(results, open(args.state, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        time.sleep(args.sleep)

    print("done, submitted:", len(results))


if __name__ == "__main__":
    main()
