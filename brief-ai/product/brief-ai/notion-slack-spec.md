# Notion/Slack 자동 전송 — 기능 스펙 (2026-08-17 초안, 결제 연동 전 사전 설계)

결제 연동이 회장 판단으로 보류 중인 동안, 실제 결제 없이도 설계·의존관계 파악까지는 지금 끝내둔다. 결제가 풀리는 즉시 아래 순서대로 바로 착수 가능하도록 남긴 문서.

## 왜 지금 설계만 해두는가

- 결제(Stripe/Paddle/PayPal) 자체는 `hq/가입대기.md`에서 회장 판단 대기 — 코드 작업이 필요 없다.
- 하지만 이 기능은 결제와 무관하게 **"사용자 계정/인증"이라는 선행 인프라**가 필요하다는 게 이번 설계에서 드러난 핵심 발견이다. 지금 MVP(`/v1/summarize`)는 완전 익명 — 로그인도, 사용자 구분도 없다. 결제 연동이 풀리자마자 "구독자만 자동전송" 기능을 만들려면 사용자 식별 수단이 먼저 있어야 하므로, 이 설계를 먼저 끝내두면 결제 연동 착수와 동시에 바로 구현에 들어갈 수 있다.

## 트리거 조건

- **무료 사용자**: 지금처럼 화면에 결과만 표시(자동 전송 없음).
- **유료 구독자**: `/v1/summarize` 처리 후 결과를 사용자가 미리 연결해둔 Notion 데이터베이스 및/또는 Slack 채널로 자동 전송.

## V1 — 간소화 방식 (권장, 결제 연동 직후 바로 구현 가능)

정식 OAuth 앱(Notion 퍼블릭 통합, Slack 앱 배포)은 각각 심사·리뷰 절차가 있어 "무자본·최소개입" 원칙에 안 맞는다. 대신 **사용자가 자기 쪽에서 직접 발급한 토큰/웹훅 URL을 설정 화면에 붙여넣는 방식**으로 시작한다 — Zapier 초기 버전이나 IFTTT 웹훅 연동과 같은 패턴, 개발 비용이 훨씬 낮다.

- **Slack**: 사용자가 자기 워크스페이스에서 [Incoming Webhook](https://api.slack.com/messaging/webhooks) URL을 발급해 설정 화면에 붙여넣기만 하면 끝. Slack 앱 심사 불필요.
- **Notion**: 사용자가 자기 워크스페이스에서 [내부 통합(Internal Integration) 토큰](https://www.notion.so/my-integrations)을 발급하고, 결과를 받을 데이터베이스를 그 통합과 공유(Share) 한 뒤, 토큰+데이터베이스 ID를 설정 화면에 붙여넣는다. Notion 퍼블릭 OAuth 심사 불필요.

이 방식의 트레이드오프: 사용자가 "통합 만들기 → 토큰 복사 → 데이터베이스 공유"를 손으로 해야 해서 진입장벽이 약간 있다(정식 OAuth의 "버튼 한 번" UX보다 못함). 초기 구독자 수가 적을 때는 감수 가능한 수준으로 판단 — 구독자가 늘고 이 마찰이 실제 이탈 원인으로 확인되면 V2(OAuth)로 승격한다.

## V2 — 정식 OAuth (구독자 수가 늘어나면 확장)

- Notion Public Integration (OAuth 2.0) — 심사 필요, "Notion에 연결" 버튼 한 번으로 워크스페이스+데이터베이스 선택까지 가능.
- Slack App(OAuth, `chat:write` 스코프) — 심사까지는 불필요하지만(단일 워크스페이스 설치 앱은 무배포 상태로도 동작), 여러 워크스페이스에 배포하려면 앱 디렉토리 등록 검토 필요.

## 데이터 모델

현재 `WAITLIST_KV` 하나뿐이라 신규 네임스페이스가 필요하다. `wrangler.toml`에 `[ai]` 테이블보다 반드시 앞에 추가할 것(TOML 순서 함정, 기존 `README.md` "배포" 절 참고).

```toml
kv_namespaces = [
  { binding = "WAITLIST_KV", id = "..." },
  { binding = "USERS_KV", id = "<신규 발급>" }
]
```

키 설계(V1 기준):
```
user:<email>            → { plan: "free"|"pro", createdAt, paidUntil }
integration:<email>     → {
  notion: { token: "secret_...", databaseId: "..." } | null,
  slack: { webhookUrl: "https://hooks.slack.com/..." } | null
}
```
- 토큰류는 Workers KV에 저장(사용자별 자기 자신의 통합 토큰이라 저장소 커밋 대상이 아님 — `cloudflare-vault.md`의 "회장 리소스 금고"와는 별개 개념, 저 문서는 **나다그룹 자체 운영 비밀값**용이고 이건 **브리프AI 고객의 개인 토큰**이라 성격이 다르다. 다만 평문 저장 대신 Workers KV 값 자체를 최소한 애플리케이션 레벨에서 암호화(예: `AES-GCM`, 키는 `wrangler secret put ENCRYPTION_KEY`)해서 저장하는 걸 V1 구현 시 같이 반영한다).

## API 엔드포인트 설계 (V1)

| 엔드포인트 | 메서드 | 설명 |
|---|---|---|
| `/v1/auth/request` | POST | 이메일로 매직링크 발급(결제 완료 이메일과 동일 주소 검증) — Resend API 재사용(이미 저장소에 있는 패턴) |
| `/v1/auth/verify` | GET | 매직링크 클릭 → 세션 토큰(JWT or KV 세션ID) 발급 |
| `/v1/settings/integrations` | GET/PUT | Notion 토큰+DB ID, Slack 웹훅 URL 조회/저장 (인증 필요) |
| `/v1/summarize` | POST | **기존과 동일하되**, 인증 세션이 있고 `plan=pro`면 처리 후 아래 전송 로직 추가 실행 |

## 전송 로직 (요약 완료 후)

```
if (user && user.plan === "pro" && integration.notion) {
  POST https://api.notion.com/v1/pages
  Authorization: Bearer <integration.notion.token>
  parent: { database_id: integration.notion.databaseId }
  properties: { 제목: meetingTitle, 요약: summary, ... }
}
if (user && user.plan === "pro" && integration.slack) {
  POST integration.slack.webhookUrl
  { text: "📝 " + meetingTitle + "\n" + summary + "\n\n✅ 결정사항: ...\n📌 액션아이템: ..." }
}
```
두 전송 다 실패해도 `/v1/summarize` 응답 자체(요약 결과)는 사용자에게 정상 반환 — 전송 실패는 별도 필드(`_deliveryErrors`)로만 표시, 핵심 기능(요약)을 부가기능(전송) 실패로 막지 않는다.

## 결제 연동과의 의존관계 정리

1. 결제 웹훅(Stripe/Paddle/PayPal 중 확정되는 쪽) 수신 → `user:<email>.plan = "pro"` 갱신.
2. 위 인증(V1은 매직링크로 충분, 소셜로그인 불필요)은 결제 확정 이메일과 별개로 지금 바로 구현 가능 — **결제 자체가 안 풀려도 "이메일 인증 → 설정화면 → 통합 연결" 골격은 미리 만들어둘 수 있다.** 다음 세션에서 여유가 있으면 이 골격(로그인 없는 `plan=free` 상태의 설정화면 UI, 실제 저장/전송 로직)까지 먼저 구현해두는 것을 제안 — 결제 훅만 나중에 꽂으면 끝나는 상태로 만들어두는 것.

## 결정 필요 사항 (구현 착수 시 회장 확인)

- V1(수동 토큰 붙여넣기) vs 바로 V2(OAuth)로 갈지 — 위 권장은 V1이지만, 첫 고객 경험을 더 매끄럽게 하고 싶다면 Slack Incoming Webhook만이라도 OAuth로 시작하는 절충안도 가능(Notion만 V1 방식 유지).
