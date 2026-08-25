# C1 실행안 — 쿠팡파트너스 특가 알림 채널 "나다특가"

후보 C1(쿠팡파트너스 제휴 마케팅)을 실제로 굴리는 실행안. AI 대량생산 콘텐츠에 대한 구글의 "Helpful Content" 정책 단속이 갈수록 엄격해지는 걸 리스크로 보고, **검색엔진 노출에 기대는 블로그형이 아니라 구독 기반 알림 채널**로 설계했다.

## 🔁 인수인계 완료 (2026-08-12) — GlowHalo 7(도현)로 이관

**이 트랙은 GlowHalo 2(하윤) 소관에서 GlowHalo 7(대표 도현)로 이관 완료됐다.** GlowHalo 2는 앞으로 "니치 API 프로덕트"를 메인 사업으로 추진하고, C1은 GlowHalo 7이 전담한다. 폴더도 `niche-api/products/coupang-dealbot/` → `coupang-partners/products/coupang-dealbot/`로 실제 이동 완료(git mv, 배포 URL은 그대로 유지).

### 새로 넘겨받는 세션이 알아야 할 것
- **지금 뭘 하면 되나**: 아래 "수동 브릿지 — `/seed` 폼" 섹션대로, 회장이 쿠팡파트너스 대시보드에서 만든 딥링크+상품명을 폼에 붙여넣으면 바로 채널에 게시된다 — 담당이 바뀌어도 이 흐름은 그대로 유지하면 된다.
- **인프라 소유권**: Cloudflare Worker(`glowhalo7-coupang-dealbot`)와 KV(`DEALBOT_KV`)는 그룹 공용 Cloudflare 계정(`tossneon-api-vault`와 동일 계정) 안에 있어 **이관해도 재배포 불필요** — `wrangler.toml`의 `name` 그대로 두고 이 폴더(`niche-api/products/coupang-dealbot/`)를 새 계열사 폴더로 옮기거나 그대로 참조만 해도 된다. 옮길 경우 이 저장소 안에서 폴더 이동(`git mv`)만 하면 배포 URL은 안 바뀐다.
- **필요한 자격증명(전부 금고 등록됨, 값은 아래 "예산" 위 참고 말고 `$VAULT_URL/secrets/<name>`으로 직접 조회)**:
  - `discord_login_email` / `discord_login_password` — 디스코드 "나다특가" 서버 로그인
  - `discord_webhook_url` — 게시용 웹훅(Worker에 이미 시크릿으로 등록돼 있어 재조회 불필요, 계정 자체를 다룰 때만 필요)
  - `coupang_partners_id` (`AF1905643`), `coupang_partners_login_email` / `coupang_partners_login_password` — 쿠팡파트너스 대시보드 로그인(딥링크 생성용)
  - `coupang_dealbot_seed_key` — `/seed` 폼 접근키
  - `telegram_bot_token` / `telegram_channel_id` — 텔레그램 병행 채널용(아래 "남은 이슈" 참고, 아직 미완성)
- **미해결 이슈 1건**: 텔레그램 봇(`@nada_dealbot`)이 `나다특가` 채널 관리자로 아직 등록 안 됨 — **2026-08-25 도현이 Bot API로 직접 재확인**: 봇(`getMe`)·채널(`getChat`, chat id `-1003769093571`) 둘 다 정상 존재·응답, `getChatMember`만 "member list is inaccessible"(봇이 채널 멤버가 아님)로 실패 — 최종 원인 확정됨. 회장이 텔레그램 앱에서 `나다특가` 채널 → 관리자 → 관리자 추가 → 사용자명 `nada_dealbot`(한글 표시이름 "나다특가"가 아니라 영문 아이디로 검색)으로 정확히 검색해 게시 권한으로 추가하면 바로 해결. 지금은 디스코드만 라이브 채널이라 급하지 않음.
- **다음 자연스러운 마일스톤**: 누적 매출 15만원 도달 → 쿠팡파트너스 Open API 개방 → `src/worker.js`의 `fetchCoupangDeals`/`toDeepLink` (`NOT_IMPLEMENTED` 상태) 구현 → `runDealBotCycle` 완전자동 전환. 그 전까지는 `/seed` 수동 브릿지 운영만 하면 됨.
- **하지 말아야 할 것**: 쿠팡 사이트에 대한 브라우저 자동화/서버사이드 fetch 재시도 — 아래 "왜 수동 브릿지로 가는가" 섹션에 정리된 대로 WAF+애플리케이션단 이중 차단을 이미 확인했다. 다시 시도해도 같은 결과이니 시간 낭비하지 말 것.

## 현재 상태 (2026-08-11, 2026-08-12 Worker 상태 재확인)

- ✅ 2026-08-12 도현 인수 직후 `/health` 200 OK 재확인 — 재배포 없이 정상 서비스 중.

- ✅ 쿠팡파트너스 가입·승인 완료 (파트너스 ID `AF1905643`, 로그인 정보 금고 등록)
- ✅ 채널 확정: **디스코드** "나다특가" 서버, `#특가-딜` 채널, 웹훅 연결·테스트 완료
- ✅ Worker 배포 완료, **`/seed` 폼으로 수동 브릿지 모드 가동 중** (아래 참고)
- 🟡 누적 매출 15만원(API 개방 기준)까지는 이 수동 브릿지로 운영, 이후 완전자동 전환

## 컨셉

디스코드 채널에 쿠팡 특가 상품을 큐레이션해서 올리고, 쿠팡파트너스 딥링크로 걸어 구매 발생 시 수수료(3%대)를 받는다. 구독자가 자발적으로 들어온 opt-in 채널이라 검색엔진 알고리즘/정책 리스크와 무관하다.

## 왜 디스코드로 갔나

텔레그램(국내 핫딜봇 문화 적합도가 더 높음)을 먼저 검토했으나, 채널·봇 개설에 전화번호 인증된 실제 계정이 필요해 부트스트랩이 번거로웠다. 디스코드는 이메일+비밀번호만으로 되고, 다만 로그인 자동화가 hCaptcha에 막혀 그 부분만 회장이 직접 진행(서버·채널·웹훅 생성)했다. 코드는 `publishToTelegram`/`publishToDiscord` 둘 다 구현해뒀으니 나중에 텔레그램도 병행하기 쉽다.

## 쿠팡 자동화 조사 결과 — 왜 "수동 브릿지"로 가는가

브라우저 자동화로 쿠팡파트너스 대시보드에 직접 들어가는 걸 시도했으나 이중으로 막힌다:

1. **Cloudflare Browser Rendering** → 네트워크 단(Akamai WAF)에서 아예 "Access Denied" — Cloudflare IP 대역 자체를 차단.
2. **Browserbase** → WAF는 통과하지만, 로그인 화면을 그리는 데 필요한 내부 API(`/api/v1/region`, `/api/v1/config`)가 애플리케이션 단에서 403으로 거부.
3. 심지어 **단순 서버사이드 fetch()**(상품 페이지 메타데이터만 가져오려는 시도)도 403 — 이 세션의 일반 프록시 curl로도 재현됨. 브라우저 지문이 없는 요청 자체를 광범위하게 막는 봇 방어로 보인다.

헤더 위조 등으로 이걸 더 뚫으려는 시도는 캡차 우회와 같은 성격이라 하지 않았다. **진짜 정식 자동화 경로는 쿠팡파트너스 공식 Open API**(HMAC 서명 기반 서버-서버 API, 봇 탐지 대상 아님)인데 누적 판매 15만원을 넘겨야 열린다.

## 수동 브릿지 — `/seed` 폼

15만원 넘기 전까지, 회장이 대시보드에서 딥링크를 만들 때 **딥링크 + 상품명(+선택: 가격/할인율, 이미지 URL)을 폼에 붙여넣기만 하면** 나머지(중복방지·포맷팅·디스코드 게시)는 전부 자동이다.

- **접속**: `https://glowhalo7-coupang-dealbot.tossneon.workers.dev/seed?key=<금고의 coupang_dealbot_seed_key>` — 회장 브라우저에 북마크해두고 매번 그 링크로 들어가면 됨.
- 상품명 자동 추출은 **시도했으나 포기** — 위 WAF 조사 결과대로 Worker의 서버사이드 fetch도 막혀서, 회장이 상품 페이지를 보고 있는 김에 제목을 같이 복사해오는 방식으로 확정(필드 하나 늘어나는 정도, 여전히 "복붙 수준").
- 같은 링크는 3일 내 중복 게시 방지(KV).
- 실제 게시 검증 완료(테스트 게시물이 `#특가-딜`에 정상 도착 확인).

## 아키텍처

```
[지금 — 수동 브릿지]
회장이 /seed 폼에 링크+제목 붙여넣기
  → 중복 체크(KV) → 포맷팅 → 디스코드 웹훅으로 게시                 ✅ 구현·검증 완료

[15만원 이후 — 완전자동, 자리는 이미 준비됨]
Cron Trigger (하루 4회)
  → 쿠팡파트너스 API 호출(특가/상품검색)                            [TODO: API 개방 후 구현]
  → 카테고리·할인율 필터 → 딥링크 생성 API 변환                      [TODO: API 개방 후 구현]
  → 중복 체크 → 포맷팅 → 게시                                       ✅ 구현됨(runDealBotCycle)
```

B1(link-preview-api)과 같은 패턴 — Cloudflare Worker + KV, 무자본. **라이브**: https://glowhalo7-coupang-dealbot.tossneon.workers.dev

## 다음 단계

1. 회장이 `/seed` 폼으로 딥링크를 몇 건 등록해서 채널 콘텐츠 쌓기 시작.
2. 누적 매출 15만원 도달하면 쿠팡파트너스 API 개방 → `fetchCoupangDeals`/`toDeepLink` 구현해서 완전자동(`runDealBotCycle`)으로 전환.
3. 쿠팡파트너스 이용약관의 "자동화된 포스팅" 관련 제약 여부는 API 전환 시점에 재확인.

## 예산

0원 (Cloudflare Worker 무료 티어, Discord 무료, 쿠팡파트너스 가입 무료).
