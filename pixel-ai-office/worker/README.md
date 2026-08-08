# pixel-ai-office-api

pixel-ai-office(정적 SPA, GitHub Pages)의 "보고 발행" 기능만 담당하는 아주 작은 Cloudflare Worker다.
화면은 그대로 GitHub Pages에 있고, 이 Worker는 브라우저가 크로스오리진으로 호출하는
`/report`, `/integrations` 두 엔드포인트만 제공한다 — Notion/Discord 비밀키는 여기(Cloudflare)에만 있고
브라우저로는 절대 전달되지 않는다.

## 처음 배포하기

### 1. Cloudflare 계정 만들기 (무료)
https://dash.cloudflare.com/sign-up — 이메일로 가입, 신용카드 불필요.

### 2. API 토큰 발급
1. https://dash.cloudflare.com/profile/api-tokens 접속
2. **Create Token** → 템플릿 **"Edit Cloudflare Workers"** 선택 → 계정/영역 그대로 두고 **Continue to summary → Create Token**
3. 발급된 토큰 값을 복사 (이후 딱 한 번만 보여줌)

### 3. 배포
```bash
cd pixel-ai-office/worker
npm install
CLOUDFLARE_API_TOKEN=<위에서 복사한 토큰> npx wrangler deploy
```
성공하면 `https://pixel-ai-office-api.<your-subdomain>.workers.dev` 형태의 주소가 출력된다.
이 주소를 `pixel-ai-office/src/game/report.ts` 상단 `WORKER_URL` 상수에 넣고 다시 빌드해야
화면에서 실제로 이 Worker를 호출한다 (배포 전엔 빈 문자열이라 자동으로 "미설정"으로 표시됨).

### 4. 비밀값 등록 — `tossneon-api-vault`가 유일한 정본
이 저장소 전체가 비밀값을 하나의 금고(`tossneon-api-vault`, `VAULT_URL`/`VAULT_TOKEN`으로
접근하는 작은 Worker+KV)에서만 관리한다 — 값을 회장에게 채팅으로 다시 묻지 않는다.
절차는 [`.claude/rules/cloudflare-vault.md`](../../.claude/rules/cloudflare-vault.md) 참고,
요약하면:
```bash
# 1) 금고에서 값 조회
curl -s "$VAULT_URL/secrets/notion_token" -H "Authorization: Bearer $VAULT_TOKEN"
# 2) 이 Worker에 등록 (Worker 배포에 쓰는 CLOUDFLARE_API_TOKEN 그대로 씀)
CLOUDFLARE_API_TOKEN=<토큰> npx wrangler secret put NOTION_TOKEN
CLOUDFLARE_API_TOKEN=<토큰> npx wrangler secret put NOTION_BRIEFING_DB
CLOUDFLARE_API_TOKEN=<토큰> npx wrangler secret put DISCORD_WEBHOOK_URL   # 선택
```
값 얻는 법은 `.dev.vars.example` 참고. 하나도 안 넣어도 Worker는 정상 동작하고
화면엔 "미설정"으로 뜬다(원본 도구 설계 그대로).

## 로컬 테스트
```bash
cp .dev.vars.example .dev.vars   # 값 채우기
npm run dev                       # http://localhost:8787
```

## 왜 pixel-ai-office 본체와 따로 배포하나
- 화면(정적 파일)은 GitHub Pages, 비밀키가 필요한 기능만 Cloudflare — 두 인프라를 최소로만 섞는다.
- 이 저장소의 다른 프로젝트에 영향이 없다. 이 폴더가 통째로 사라져도 나머지는 그대로 작동한다.
