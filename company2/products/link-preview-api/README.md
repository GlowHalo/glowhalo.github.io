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
| `github.com` | ✅ (버그 수정 후) title 정상. **최초 배포 때는 title이 "Vodafone"으로 잘못 나왔던 실제 버그가 있었음** — 아래 "발견된 버그" 참고, 원인 규명 후 수정·검증 완료. |

### 발견된 버그 — `title` 셀렉터가 SVG 안의 접근성용 `<title>`까지 잡던 문제 (2026-08-09)

최초 배포판은 github.com에서 `title`만 "Vodafone"으로 반환하고 나머지 필드는 전부 정상이었다. 처음엔 "CDN 캐시 이슈로 추정"이라고 원인 불명인 채 넘겼는데, 회장이 재확인을 요청해서 다시 파봤다.

- 임시 디버그 엔드포인트로 원문 HTML을 그대로 떠보니 `<head><title>`은 처음부터 정확히 "GitHub · Change is constant. GitHub keeps you ahead. · GitHub"였다 — 네트워크/CDN 쪽 문제가 전혀 아니었음.
- 원인은 우리 코드: `HTMLRewriter().on("title", collector)`가 문서 전체에서 태그 이름이 `title`인 요소를 **전부** 잡는데, github.com 홈페이지의 "고객사 로고" 캐러셀이 각 로고를 인라인 `<svg><title>회사명</title></svg>`(스크린리더용 접근성 텍스트)로 그리고 있었다. 문서를 순서대로 훑으면서 매 `<title>`마다 `titleBuffer`를 덮어썼기 때문에, 최종적으로 캐러셀의 **마지막 로고 이름("Vodafone")**이 진짜 페이지 제목을 덮어써버린 것.
- 수정: 셀렉터를 `head > title`로 좁혀서 문서 head의 진짜 title만 잡도록 변경. 캐시에 남아있던 잘못된 값도 삭제하고 재검증 완료(위 표 참고).
- **교훈**: "코드 버그가 아닐 것"이라는 판단을 실제 원문 확인 없이 내렸던 게 실수였다 — 다음부터는 근거 없는 추정으로 덮지 않고 원문/로그를 직접 까본다.

## 다음 단계

1. RapidAPI Hub 계정 생성(자동화 표준 계정 `tossneon0` 시도) — 가입 페이지가 JS SPA라 Browserbase 브라우저 자동화 필요할 가능성 높음.
2. Platform REST API로 OpenAPI 스펙 기반 리스팅 생성 ([문서](https://docs.rapidapi.com/docs/creating-updating-apis)).
3. 리스팅 후 `RAPIDAPI_PROXY_SECRET` 발급받아 시크릿 등록, 게이트웨이 경유 호출만 허용하도록 잠금.
4. 실제 RapidAPI 테스트 콘솔로 종단 검증 + 캡처.
