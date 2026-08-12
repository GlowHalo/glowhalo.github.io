"""generate.py로 제출한 생성 작업이 끝나길 폴링하고, 완료되면 원본(마젠타 배경) 이미지를 받는다.

사용법:
    export LEONARDO_API_KEY=...
    python3 poll_download.py --state gen_ids.json --raw-dir raw
"""
import argparse
import json
import os
import subprocess
import time


def get_status(leo_key, gid):
    r = subprocess.run(
        ["curl", "-s", f"https://cloud.leonardo.ai/api/rest/v1/generations/{gid}",
         "-H", f"Authorization: Bearer {leo_key}"],
        capture_output=True, text=True,
    )
    return json.loads(r.stdout)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--state", required=True)
    ap.add_argument("--raw-dir", required=True)
    ap.add_argument("--max-rounds", type=int, default=20)
    ap.add_argument("--interval", type=float, default=6.0)
    args = ap.parse_args()

    leo_key = os.environ.get("LEONARDO_API_KEY")
    if not leo_key:
        raise SystemExit("LEONARDO_API_KEY 환경변수가 필요합니다")

    results = json.load(open(args.state, encoding="utf-8"))
    os.makedirs(args.raw_dir, exist_ok=True)

    pending = list(results.items())
    for _ in range(args.max_rounds):
        still_pending = []
        for slug, info in pending:
            gid = info["generationId"]
            jpath = os.path.join(args.raw_dir, f"{slug}.json")
            if os.path.exists(jpath):
                continue
            d = get_status(leo_key, gid)
            gen = d.get("generations_by_pk")
            if not gen:
                print(slug, "no gen data:", d)
                still_pending.append((slug, info))
                continue
            status = gen.get("status")
            if status == "COMPLETE":
                json.dump(gen, open(jpath, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
                url = gen["generated_images"][0]["url"]
                imgpath = os.path.join(args.raw_dir, f"{slug}.jpg")
                subprocess.run(["curl", "-s", "-o", imgpath, url])
                print(slug, "COMPLETE, downloaded", imgpath)
            else:
                print(slug, status)
                still_pending.append((slug, info))
        pending = still_pending
        if not pending:
            break
        time.sleep(args.interval)

    print("remaining pending:", [s for s, _ in pending])


if __name__ == "__main__":
    main()
