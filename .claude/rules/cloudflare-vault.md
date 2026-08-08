---
paths:
  - "**/wrangler.toml"
  - "**/worker/**"
  - "**/.dev.vars*"
---

# Cloudflare 금고 — 토큰을 매번 묻지 않는다

이 저장소 안 어떤 프로젝트든 비밀값(API 토큰, 웹훅 URL 등)이 필요해지면,
**Cloudflare 계정 안의 Secrets Store 하나**(`tossneon-vault`)가 유일한 금고다.
프로젝트마다 따로 `.env`를 만들거나 회장에게 채팅으로 값을 다시 물어보지 않는다.

## 지금 등록된 값 (이름만 — 값은 절대 여기 적지 않는다)

| 이름 | 쓰는 곳 | 용도 |
|---|---|---|
| `NOTION_TOKEN` | `pixel-ai-office/worker` | Notion 내부 통합 토큰, 브리핑 저장 |
| `NOTION_BRIEFING_DB` | `pixel-ai-office/worker` | 브리핑을 저장할 Notion DB ID |
| `DISCORD_WEBHOOK_URL` | `pixel-ai-office/worker` | 완료 보고를 보낼 Discord 웹훅 |

새 프로젝트가 비밀값이 필요해지면 이 표에 이름·용도 한 줄을 추가하고,
`pixel-ai-office/worker/scripts/sync-vault.sh <새이름>` 으로 등록한다.
(나다그룹 HQ가 Phase 2에서 자체 Worker를 갖게 되면, 같은 스크립트로 이 금고에 합류시킨다 —
`nada-group/HANDOFF.md` 참고.)

## 세션에 `CLOUDFLARE_API_TOKEN` 이 있을 때 — 이 경로를 먼저 쓴다

1. 필요한 값이 위 표에 이미 있다면: 회장에게 값을 묻지 말고, 그 프로젝트의 `wrangler.toml`에
   `[[secrets_store_secrets]]` 바인딩(같은 store_id, `secret_name`만 그 이름)만 추가하면 된다.
   값 자체를 다시 받을 필요가 없다 — 이게 금고를 쓰는 이유다.
2. 새 이름이 필요하다면: `sync-vault.sh`에 이름을 인자로 추가해서 실행한다. 로컬에 `.dev.vars`가
   있으면 거기서 값을 읽고, 없으면 딱 한 번만 값을 물어본 뒤 금고에 등록한다. 그다음부터는
   1번처럼 값을 다시 묻지 않는다.
3. 이미 등록된 이름을 또 등록하려 하지 않는다 — `sync-vault.sh`는 멱등이라 다시 돌려도 안전하지만,
   같은 값을 다시 채팅으로 요청하는 건 이 규칙의 목적에 반한다.

## 세션에 `CLOUDFLARE_API_TOKEN` 이 없을 때

Cloudflare API를 직접 호출할 수 없으므로, 회장에게 아래를 안내하고 끝낸다 (직접 대신 처리할 수 없음):

1. https://dash.cloudflare.com/profile/api-tokens 에서 **Secrets Store: Edit** 권한(배포까지 필요하면
   **Workers Scripts: Edit** 도 함께)의 토큰을 만든다.
2. 이 값을 **저장소 코드가 아니라** Claude Code 환경(Environment)의 환경변수
   `CLOUDFLARE_API_TOKEN` 으로 등록한다 — 세션이 새로 시작돼도 유지된다.
   (Claude Code on the web 환경 설정: https://code.claude.com/docs/en/claude-code-on-the-web)
3. 다음 세션부터는 위 "있을 때" 절차를 그대로 따른다.

## 지켜야 할 것

- 비밀값 **자체**는 절대 이 저장소에 커밋하지 않는다 (이름만 등록/문서화 대상).
- `CLOUDFLARE_API_TOKEN` 자체도 커밋 금지 — 환경변수로만 존재해야 한다.
- 이미 금고에 있는 이름의 값을 다시 채팅에 붙여넣게 하지 않는다. 그게 이 문서의 존재 이유다.
