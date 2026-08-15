"""몽글곰(A6) 이모티콘 생성 요청을 Leonardo AI에 제출한다.

A3(일잘봇)/A4(새침냥이) generate.py와 동일 구조 — 몸통 프롬프트와 고정 시드만 새 캐릭터용으로 교체.
보조 표현 축은 팔(포옹·팔짱 등 제스처) — phrases.json의 "arms" 필드로 넘긴다.

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
    "cute kawaii mascot sticker character concept sheet, a small chubby round bear mascot with two "
    "small rounded ears, solid flat uniform caramel and honey brown warm-toned color from head to "
    "toe with absolutely no green or mint tint anywhere on the body, legs, or belly, short stubby "
    "arms and legs matching the same solid caramel color, big round sparkling eyes showing {expr}, "
    "{arms}, flat vector illustration with smooth flat color fill and no fur texture strands, thick "
    "clean black outline, minimalist flat design, centered composition, single character, plain solid "
    "bright magenta background, chibi proportions, smooth rounded shapes, glossy plastic toy look, "
    "Korean kakao talk emoticon sticker style, professional character design, high quality"
)

NEG = (
    "text, watermark, signature, blurry, realistic photo, 3d render, multiple characters, human face, "
    "background scenery, gradient, shadow, extra limbs, complex background, low quality, cropped, cat, "
    "robot, dog, tabby stripes, green fur, mint fur, green tint, green legs, fur texture, textured fur, "
    "patterned fur, fluffy texture strands"
)

# A3(87008451)·A4(51402203)와 다른 새 고정 시드
SEED = 68302915
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
        arms = p.get("arms", "arms relaxed at the sides")
        prompt = BASE.format(expr=p["expr"], arms=arms)
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
