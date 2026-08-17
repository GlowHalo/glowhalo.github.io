"""댕댕이(A10) 이모티콘 생성 요청을 Leonardo AI에 제출한다.

기존 파이프라인과 동일 구조. 새침냥이(고양이, 도도한 성격)와 정반대 축 —
격하게 반갑고 애정표현이 과한 골든리트리버 강아지. 보조 표현 축은
귀(처짐/쫑긋)+꼬리 흔들림 강도를 {ears}로, 팔 제스처는 {arms}로 넘긴다.

A8에서 얻은 교훈 반영: 색 순도 관련 최소 지침만 넣고 "완전 평면·그라데이션
금지" 같은 과도한 반복 지시는 넣지 않는다(표정 다양성을 눌러버리는 부작용
발견됨) — postprocess.py가 flood-fill로 색상과 무관하게 안전을 보장하므로
프롬프트는 자연스러운 표현력 위주로 작성.

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
    "cute kawaii mascot sticker character concept sheet, a small chubby golden retriever puppy mascot "
    "with two floppy rounded ears, solid uniform golden orange fur color from head to toe with "
    "absolutely no purple, no blue, no green or mint tint anywhere on the body, ears, legs, or belly, "
    "short stubby legs and a small wagging tail matching the same solid golden orange color as the "
    "body, big expressive eyes showing {expr}, {ears}, {arms}, flat vector illustration style, thick "
    "clean black outline, minimalist design, centered composition, single character, plain solid bright "
    "blue background, chibi proportions, smooth rounded shapes, glossy plastic toy look, Korean kakao "
    "talk emoticon sticker style, professional character design, high quality, dynamic expressive pose "
    "clearly different from a plain neutral sitting pose"
)

NEG = (
    "text, watermark, signature, blurry, realistic photo, 3d render, multiple characters, human face, "
    "background scenery, shadow, extra limbs, complex background, low quality, cropped, cat, robot, "
    "bear, rabbit, tabby stripes, green fur, mint fur, purple fur, blue fur, gray fur, spotted fur, "
    "fur texture, textured fur, patterned fur, fluffy texture strands, plain neutral expression, "
    "identical pose"
)

# 기존 시리즈들과 다른 새 고정 시드
SEED = 19047368
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
        ears = p.get("ears", "ears perked up")
        arms = p.get("arms", "paws relaxed at the sides")
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
