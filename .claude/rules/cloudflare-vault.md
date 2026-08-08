---
paths:
  - "**/wrangler.toml"
  - "**/worker/**"
  - "**/.dev.vars*"
  - "cloudflare-api-vault/**"
---

# Cloudflare 금고 — `tossneon-api-vault` 하나로 정착 (2026-08-08)

이 저장소 안 어떤 프로젝트든 비밀값(API 토큰, 웹훅 URL 등)이 필요해지면,
**`cloudflare-api-vault/`가 유일한 금고**다. 프로젝트마다 따로 `.env`를 만들거나
회장에게 채팅으로 값을 다시 물어보지 않는다.

라이브: `https://tossneon-api-vault.tossneon.workers.dev` (소스: `cloudflare-api-vault/`)
접근에 필요한 `VAULT_URL`/`VAULT_TOKEN`은 Claude Code 환경(Environment) 변수로 등록돼 있다.

## API

```
GET    /secrets            → { names: string[] }   (이름만, 값 아님)
GET    /secrets/:name      → { name, value }
PUT    /secrets/:name      → body {value: string} → 저장/덮어쓰기
DELETE /secrets/:name      → 삭제
```
모든 요청에 `Authorization: Bearer $VAULT_TOKEN` 필요.

```bash
# 이름 목록 확인 (값 노출 없음)
curl -s "$VAULT_URL/secrets" -H "Authorization: Bearer $VAULT_TOKEN"

# 값 조회
curl -s "$VAULT_URL/secrets/notion_token" -H "Authorization: Bearer $VAULT_TOKEN"

# 새 값 등록/갱신
curl -s -X PUT "$VAULT_URL/secrets/새이름" -H "Authorization: Bearer $VAULT_TOKEN" \
  -H "Content-Type: application/json" -d '{"value":"실제값"}'
```

## 지금 등록된 값 (이름만 — 값은 절대 여기 적지 않는다)

| 이름 | 쓰는 곳 |
|---|---|
| `notion_token` | pixel-ai-office/worker (Notion 저장) |
| `gmail_app_password` | 버크만 디브리핑 발송 스크립트 등 |
| `gumroad_access_token` | Gumroad 상품 등록/조회 |
| `leonardo_api_key` | 이미지 생성 |
| `gemini_api_key` | KPC 코칭챗봇 등 |
| `kakao_maps_js_key` | 아기랑 갈곳 |
| `adsense_circleheroes_banner_slot` | circle-heroes 광고 |
| `firebase_circleheroes_web_config` | circle-heroes |
| `nada_group_dashboard_write_token` | nada-group/worker — 승인/지시/실행로그 상태 쓰기(PUT /state) 인증 |

**아직 금고에 없는 것**: pixel-ai-office/worker가 필요로 하는 `NOTION_BRIEFING_DB`,
`DISCORD_WEBHOOK_URL`은 아직 금고에 등록 안 됨 — 실제로 그 Worker를 배포해 쓰려면
먼저 이 두 값을 금고에 `PUT`으로 등록해야 한다. 이름 표기는 금고 쪽이 `snake_case`
(`notion_token`), Worker 환경변수 쪽이 `UPPER_SNAKE`(`NOTION_TOKEN`)라 서로 다르니
등록·조회할 때 헷갈리지 않게 주의.

## 세션에 `VAULT_URL`/`VAULT_TOKEN`이 있을 때 — 이 경로를 먼저 쓴다

1. 필요한 값이 위 표에 이미 있다면: 회장에게 값을 묻지 말고 `GET /secrets/:name`으로 바로 조회한다.
2. 그 값을 실제 Worker에 쓰려면 (예: pixel-ai-office/worker), 조회한 값을
   `CLOUDFLARE_API_TOKEN=<Workers Scripts:Edit 토큰> npx wrangler secret put <이름>`으로
   그 Worker에 등록한다 — 이건 Worker 배포에 쓰는 것과 같은 `CLOUDFLARE_API_TOKEN`이면 된다,
   금고 접근용 `VAULT_TOKEN`과는 별개.
3. 새 값이 필요하면: `PUT /secrets/:name`으로 금고에 먼저 등록하고, 위 표에 이름·용도 한 줄을 추가한다.
4. 이미 등록된 이름의 값을 다시 채팅으로 요청하지 않는다 — 그게 이 문서의 존재 이유다.

## 세션에 `VAULT_URL`/`VAULT_TOKEN`이 없을 때

금고에 접근할 수 없으므로, 회장에게 아래를 안내하고 끝낸다 (직접 대신 처리할 수 없음):
Claude Code 환경(Environment) 설정의 환경변수에 `VAULT_URL`/`VAULT_TOKEN`이 등록돼 있는지
확인 요청 — 세션이 새로 시작돼야 반영된다(이미 떠있는 세션은 못 받아감).

## 지켜야 할 것

- 비밀값 **자체**는 절대 이 저장소에 커밋하지 않는다 (이름만 등록/문서화 대상).
- `VAULT_TOKEN`/`CLOUDFLARE_API_TOKEN` 자체도 커밋 금지 — 환경변수로만 존재해야 한다.
- 값을 조회하는 API 호출은 정말 필요할 때만 — 시행착오로 여러 엔드포인트를 반복 탐색하지 않는다
  (안전장치에 걸릴 수 있고, 애초에 API가 이 문서에 이미 다 적혀있다).
- 이미 금고에 있는 이름의 값을 다시 채팅에 붙여넣게 하지 않는다.

## 지난 시도 — Cloudflare 계정 Secrets Store 직접 사용 (폐기됨)

한때 `pixel-ai-office/worker/scripts/sync-vault.sh` + Cloudflare 계정의 네이티브 Secrets
Store를 쓰는 방식도 시도됐었다. 이미 `tossneon-api-vault`(이 문서의 본체)가 살아서 8개 값을
관리 중인 게 확인되어, **"금고는 한 군데"** 원칙에 따라 그 방식은 걷어내고 폐기했다
(2026-08-08). 혹시 옛 기록에서 그 흔적을 보더라도 참고하지 말 것 — 여기 적힌 방식이 유일한 정본이다.
