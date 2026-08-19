# glowhalo6-kpc-coach-chat

`kpc-coach-chat/`(정적 페이지, GitHub Pages)의 "AI 코치 응답" 기능만 담당하는 아주 작은
Cloudflare Worker다. 화면은 그대로 GitHub Pages에 있고, 이 Worker는 브라우저가
크로스오리진으로 호출하는 `/chat` 엔드포인트 하나만 제공한다 — Gemini API 키는
여기(Cloudflare)에만 있고 브라우저로는 절대 전달되지 않는다.

## API

`POST /chat`
```json
{ "history": [ { "role": "bot", "text": "..." }, { "role": "user", "text": "..." } ] }
```
응답:
```json
{ "text": "...", "isQuestion": true, "stage": 1, "end": false, "summary": null }
```
`end:true`일 때 `summary: { topic, awareness, action }`가 채워진다.

## 처음 배포하기

### 1. 배포
```bash
cd kpc-coach-chat/worker
npm install
CLOUDFLARE_API_TOKEN=<Workers Scripts:Edit 토큰> npx wrangler deploy
```
성공하면 `https://glowhalo6-kpc-coach-chat.<subdomain>.workers.dev` 형태의 주소가 출력된다.

### 2. 비밀값 등록 — `tossneon-api-vault`가 유일한 정본
이 저장소 전체가 비밀값을 하나의 금고(`tossneon-api-vault`)에서만 관리한다. 절차는
[`.claude/rules/cloudflare-vault.md`](../../.claude/rules/cloudflare-vault.md) 참고, 요약하면:
```bash
curl -s "$VAULT_URL/secrets/gemini_api_key" -H "Authorization: Bearer $VAULT_TOKEN"
CLOUDFLARE_API_TOKEN=<토큰> npx wrangler secret put GEMINI_API_KEY
```

## 로컬 테스트
```bash
cp .dev.vars.example .dev.vars   # 값 채우기
npm run dev                       # http://localhost:8787
```

## 왜 kpc-coach-chat 본체와 따로 배포하나
- 화면(정적 파일)은 GitHub Pages, 비밀키가 필요한 기능만 Cloudflare — 두 인프라를 최소로만 섞는다.
- 이 저장소의 다른 프로젝트에 영향이 없다. 이 폴더가 통째로 사라져도 나머지는 그대로 작동한다.
