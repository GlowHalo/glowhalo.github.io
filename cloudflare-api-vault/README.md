# tossneon-api-vault

이 저장소 전체가 쓰는 **유일한 비밀값 저장소**. Cloudflare Workers + KV로 만든 아주 작은
개인용 시크릿 볼트다. 라이브: `https://tossneon-api-vault.tossneon.workers.dev`

API는 [`src/worker.js`](src/worker.js) 상단 주석 참고 — 요약하면:

```
GET    /secrets            → { names: string[] }   (이름만, 값 아님)
GET    /secrets/:name      → { name, value }
PUT    /secrets/:name      → body {value} → 저장/덮어쓰기
DELETE /secrets/:name      → 삭제
```

모든 요청에 `Authorization: Bearer <VAULT_TOKEN>` 필요. 사용법·규칙은
[`.claude/rules/cloudflare-vault.md`](../.claude/rules/cloudflare-vault.md) 참고 —
값 채팅으로 다시 안 묻기, 새 이름 등록 절차 등이 거기 있다.

## 배포/재배포

```bash
cd cloudflare-api-vault
CLOUDFLARE_API_TOKEN=<Workers Scripts:Edit 권한 토큰> npx wrangler deploy
npx wrangler secret put VAULT_TOKEN   # 최초 1회, 이후 재배포해도 유지됨
```

`wrangler.toml`의 KV 네임스페이스 ID는 비밀이 아니라(계정 API 토큰 없이는 무용지물) 커밋해도 안전하다.
