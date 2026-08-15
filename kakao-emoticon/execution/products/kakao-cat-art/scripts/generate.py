"""새침냥이(A4) 이모티콘 생성 요청을 Leonardo AI에 제출한다.

A3(일잘봇) generate.py와 완전히 동일한 구조 — 몸통 프롬프트와 고정 시드만 새 캐릭터용으로 교체.

사용법:
    export LEONARDO_API_KEY=...
    python3 generate.py --phrases phrases.json --state gen_ids.json

이미 gen_ids.json(state)에 있는 슬러그는 건너뛴다(재실행 안전).
"""
import argparse
import json
import os
import subprocess
import time

BASE = (
    "cute kawaii mascot sticker character concept sheet, a small chubby round cat mascot with two "
    "pointed triangular ears, solid flat uniform cream and light beige warm-toned fur with absolutely "
    "no tabby stripes and no green or olive markings, short stubby tail matching the same solid cream "
    "color, big round eyes showing {expr}, {whiskers}, stubby little paws, flat vector illustration, "
    "thick clean black outline, minimalist flat design, centered composition, single character, plain "
    "solid bright magenta background, chibi proportions, smooth rounded shapes, glossy plastic toy "
    "look, Korean kakao talk emoticon sticker style, professional character design, high quality"
)

NEG = (
    "text, watermark, signature, blurry, realistic photo, 3d render, multiple characters, human face, "
    "background scenery, gradient, shadow, extra limbs, complex background, low quality, cropped, dog, "
    "robot, tabby stripes, green fur, olive fur, striped tail, patterned fur, calico, orange fur"
)

# A3(일잘봇)의 87008451과 다른 새 고정 시드 — 캐릭터를 구분하기 위함
SEED = 51402203
MODEL_ID = "de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3"  # Phoenix 1.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--phrases", required=True)
    ap.add_argument("--state", required=True, help="생성 ID를 누적 저장할 json (재실행 시 스킵용)")
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
        whiskers = p.get("whiskers", "whiskers relaxed and neutral")
        prompt = BASE.format(expr=p["expr"], whiskers=whiskers)
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
