"""눈밑이(A14) 이모티콘 생성 요청을 Leonardo AI에 제출한다.

기존 파이프라인과 동일 구조. 다크서클/피곤함/커피 유머 타겟 — 밤샘, 수면부족, 카페인 중독 등
누구나 공감하는 "피곤함" 개그. 다크서클이 원래 특징인 라쿤을 마스코트로 채택해 소재와
캐릭터가 자연스럽게 맞아떨어지게 설계했다. 보조 표현 축은 팔 제스처({arms})와 눈썹({brows}).

A8·A10·A12에서 얻은 교훈 반영: 색 순도 관련 최소 지침만 넣고 "완전 평면·그라데이션 금지"
같은 과도한 반복 지시는 넣지 않는다(표정 다양성을 눌러버리는 부작용 발견됨) — postprocess.py가
flood-fill로 색상과 무관하게 안전을 보장하므로 프롬프트는 자연스러운 표현력 위주로 작성.
A12 교훈도 반영: 배경 지시는 "plain solid bright [color] background" 한 줄로 단순하게, "코너"를
명시적으로 언급하지 않는다(카드형 배지 결함 유발).

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
    "cute kawaii mascot sticker character concept sheet, a small chubby round raccoon creature "
    "with two small rounded ears, solid uniform soft warm gray color from head to toe, a "
    "distinctive darker charcoal gray mask marking around both eyes like natural raccoon dark "
    "circles, short stubby arms and legs matching the same soft gray color as the body, a small "
    "fluffy striped tail with alternating gray and darker gray rings curled to one side, big "
    "expressive eyes showing {expr}, {brows}, {arms}, flat vector illustration style, thick "
    "clean black outline, minimalist design, centered composition, single character, plain solid "
    "bright orange background, chibi proportions, smooth rounded shapes, glossy plastic toy "
    "look, Korean kakao talk emoticon sticker style, professional character design, high "
    "quality, dynamic expressive pose clearly different from a plain neutral sitting pose"
)

NEG = (
    "text, watermark, signature, blurry, realistic photo, 3d render, multiple characters, human "
    "face, background scenery, shadow, extra limbs, complex background, low quality, cropped, "
    "cat, dog, bear, rabbit, ghost, panda, koala, fox, human hands, realistic raccoon, scary "
    "raccoon, aggressive raccoon, striped body fur, tabby stripes, green fur, mint fur, purple "
    "fur, blue fur, yellow fur, brown fur, spotted fur, fluffy texture strands, textured fur, "
    "plain neutral expression, identical pose"
)

# 기존 시리즈들(55201983, 71349502, 87008451 등)과 겹치지 않는 새 고정 시드.
SEED = 40128756
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
        brows = p.get("brows", "normal relaxed eyebrows")
        arms = p.get("arms", "arms relaxed at the sides")
        prompt = BASE.format(expr=p["expr"], brows=brows, arms=arms)
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
