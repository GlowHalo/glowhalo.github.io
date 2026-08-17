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
    "long rounded ears, solid uniform periwinkle blue-violet color from head to toe with absolutely no "
    "pink, no tan, no green or mint tint anywhere on the body, ears, legs, or belly, short stubby arms "
    "and legs matching the same solid periwinkle-violet color as the body, wearing small round "
    "black-rimmed glasses, big expressive eyes showing {expr}, {ears}, {arms}, flat vector illustration "
    "style, thick clean black outline, minimalist design, centered composition, single character, plain "
    "solid bright yellow background, chibi proportions, smooth rounded shapes, glossy plastic toy look, "
    "Korean kakao talk emoticon sticker style, professional character design, high quality, dynamic "
    "expressive pose clearly different from a plain neutral sitting pose"
)

NEG = (
    "text, watermark, signature, blurry, realistic photo, 3d render, multiple characters, human face, "
    "background scenery, shadow, extra limbs, complex background, low quality, cropped, cat, robot, "
    "bear, dog, tabby stripes, green fur, mint fur, brown fur, tan fur, pink fur, pink ears, magenta "
    "fur, magenta accents, green tint, brown tint, fur texture, textured fur, patterned fur, fluffy "
    "texture strands, no glasses, plain neutral expression, identical pose"
)

# A3(87008451)·A4(51402203)·A6(68302915)와 다른 새 고정 시드. 배경은 마젠타->노란색 유지
# (캐릭터가 보라/파랑 계열이라 마젠타와 색거리가 가까워 안전마진 확보 차원 — 다만 이제
# postprocess.py가 flood-fill로 몸통 내부를 색거리와 무관하게 보호하므로 필수는 아님).
# 2026-08-17 2차 수정: 1차 프롬프트가 "완전 평면·그라데이션·하이라이트 금지"를 과하게
# 반복해서 넣었더니 32종 전부 표정·포즈가 거의 동일하게 나오는 문제가 발견됨(회장 피드백:
# "보라토끼 다 너무 똑같은것같은데??") — 색 순도 관련 최소 지침만 남기고 나머지는 곰(A6)
# 원본 스타일 수준으로 되돌려 표현 다양성을 회복.
SEED = 88451207  # 표정 고착 문제로 시드도 함께 교체(기존 40217603은 폐기)
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
