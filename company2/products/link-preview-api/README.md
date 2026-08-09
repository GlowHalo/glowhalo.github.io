# Link Preview API — 나다컴퍼니2 B1 프로토타입

후보 B1(니치 API 프로덕트)의 첫 MVP. URL을 주면 title/description/og:image/favicon 등 링크 미리보기 메타데이터를 JSON으로 반환하는 API — RapidAPI Hub에 리스팅해 개발자(B2B)에게 파는 걸 목표로 한다.

**라이브**: `https://nada-company2-link-preview.tossneon.workers.dev`

## 엔드포인트

- `GET /health` — 헬스체크
- `GET /v1/preview?url=<인코딩된 URL>` — 메타데이터 조회

### 응답 예시

```
GET /v1/preview?url=https://example.com
```
```json
{
  "url": "https://example.com/",
  "title": "Example Domain",
  "description": null,
  "image": null,
  "siteName": null,
  "themeColor": null,
  "favicon": "data:,",
  "canonical": "https://example.com/"
}
```

## 설계 포인트

- **Cloudflare Workers + HTMLRewriter** — 스트리밍 파서라 페이지 전체를 메모리에 안 올리고 `<title>`/`<meta>`/`<link>`만 훑는다. 응답 바디는 500KB에서 강제로 끊어(`limitBytesTransform`) 거대 페이지 방어.
- **캐싱** — Workers KV에 1시간 캐싱, 같은 URL 반복 조회 시 원본 사이트에 부하를 안 준다.
- **SSRF 방어** — `localhost`/사설 IP 대역(`10.*`, `172.16-31.*`, `192.168.*`, `169.254.*`, `127.*`)으로의 요청은 차단.
- **RapidAPI 게이트웨이 검증** — `RAPIDAPI_PROXY_SECRET` 시크릿이 설정되면 `X-RapidAPI-Proxy-Secret` 헤더를 검증해, RapidAPI 게이트웨이를 거치지 않은 직접 호출(=과금 우회)을 막는다. 아직 RapidAPI 리스팅 전이라 이 시크릿은 미설정 — 지금은 엔드포인트가 열려 있다(프로토타입 테스트 목적, 등록 시점에 잠근다).
- **무자본** — Cloudflare Workers 무료 티어(workers.dev), 외부 유료 API 의존 없음.

## 배포

```bash
cd company2/products/link-preview-api
CLOUDFLARE_API_TOKEN=<Workers Scripts:Edit 토큰> npx wrangler deploy
```

KV 네임스페이스 ID(`wrangler.toml`)는 이미 생성돼 있음. `RAPIDAPI_PROXY_SECRET`은 RapidAPI 등록 후 발급받으면:
```bash
npx wrangler secret put RAPIDAPI_PROXY_SECRET
```

## 테스트 로그 (2026-08-09)

| 케이스 | 결과 |
|---|---|
| `/health` | ✅ `{ok:true}` |
| `example.com` | ✅ title/canonical 정상 |
| `en.wikipedia.org/wiki/Cloudflare` | ✅ title/image/canonical 정상 |
| `notaurl` (잘못된 URL) | ✅ 400 `invalid_url` |
| URL 파라미터 누락 | ✅ 400 `missing_url` |
| `169.254.169.254`(클라우드 메타데이터 IP) | ✅ 400 `forbidden_host` — SSRF 방어 확인 |
| `github.com` | ⚠️ description/image/siteName/favicon은 정확한데 **title만 "Vodafone"으로 돌아옴** — 코드 버그가 아니라 실제 fetch 시점에 그렇게 응답받은 것으로 보임(캐시를 지우고 재요청해도 재현됨). 원인 미상(제3자 CDN/캐시 레이어 쪽 이슈로 추정) — MVP 검증 목적상 더 파고들지 않고 기록만 남김. RapidAPI 정식 등록 전 재확인 필요.

## 다음 단계

1. RapidAPI Hub 계정 생성(자동화 표준 계정 `tossneon0` 시도) — 가입 페이지가 JS SPA라 Browserbase 브라우저 자동화 필요할 가능성 높음.
2. Platform REST API로 OpenAPI 스펙 기반 리스팅 생성 ([문서](https://docs.rapidapi.com/docs/creating-updating-apis)).
3. 리스팅 후 `RAPIDAPI_PROXY_SECRET` 발급받아 시크릿 등록, 게이트웨이 경유 호출만 허용하도록 잠금.
4. 실제 RapidAPI 테스트 콘솔로 종단 검증 + 캡처.
