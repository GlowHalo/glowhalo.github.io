# 일잘봇 이모티콘 제작 파이프라인 (Leonardo AI)

1~32번 전체(2026-08-08, A3)에 쓴 실제 스크립트. 캐릭터 일관성의 핵심은
**같은 시드(87008451) + 같은 몸통 프롬프트 틀 + 표정(눈/입/아이콘) 문구만 교체**다.
새 표정을 추가하고 싶으면 `phrases.json`에 항목을 추가하고 아래 순서대로 실행하면 된다.

## 순서

```bash
export LEONARDO_API_KEY="$(curl -s "$VAULT_URL/secrets/leonardo_api_key" -H "Authorization: Bearer $VAULT_TOKEN" | python3 -c 'import json,sys;print(json.load(sys.stdin)["value"])')"

cd company8/execution/products/kakao-emoticon-art/scripts

# 새로 만들 표정만 담은 phrases 파일을 준비한다(예: phrases.json에서 n>=33만 추린 phrases-new.json).
# --state/--raw-dir는 세션 스크래치패드 등 저장소 밖 임시 경로를 권장(생성 API 원본 캐시라 커밋 대상 아님).

# 1. 생성 요청 제출 (Leonardo generations API, Phoenix 1.0 + 고정 시드)
python3 generate.py --phrases phrases-new.json --state /tmp/.../gen_ids.json

# 2. 완료 폴링 + 원본(마젠타 배경) 다운로드
python3 poll_download.py --state /tmp/.../gen_ids.json --raw-dir /tmp/.../raw

# 3. 크로마키 배경제거 + 360x360 크롭 + 72dpi RGBA PNG 후처리 (결과를 상위 폴더, 즉 저장소에 직접 저장)
python3 postprocess.py --phrases phrases-new.json --raw-dir /tmp/.../raw --out-dir ..

# 4. 합본 컨택시트 갱신 (00-contact-sheet-preview.png) — phrases.json에 전체 항목을 유지해두면
#    새 문구를 추가할 때마다 이 파일에도 이어붙이고 합본을 한 번에 다시 만들 수 있다.
python3 make_contact_sheet.py --phrases phrases.json --art-dir .. --out ../00-contact-sheet-preview.png
```

`generate.py`는 이미 `--state` 파일에 있는 슬러그는 건너뛴다(재실행 안전). `phrases.json`은
1~32번 전체 레시피(문구+시드+표정 프롬프트)를 보존하는 정본이고, `phrases-new.json`은
13~32번 생성 시 실제로 API에 넘긴 부분집합이었다(둘 다 저장소에 남겨 재현 가능하게 함).

## 레시피 고정값

- 모델: Phoenix 1.0 (`de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3`)
- `presetStyle`: `ILLUSTRATION`
- 시드: `87008451` (전 이미지 공통 — 캐릭터 동일성의 핵심)
- 생성 해상도: 512x512 → 후처리에서 360x360으로 정사각 크롭
- 배경: 단색 마젠타(투명배경 파라미터가 Phoenix에서 지원 안 돼서 크로마키로 후처리)
- 몸통 프롬프트 틀은 `generate.py`의 `BASE` 상수, 표정별 `expr`는 `phrases.json`에 있다.
