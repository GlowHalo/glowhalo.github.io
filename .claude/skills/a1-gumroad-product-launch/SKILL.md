---
name: a1-gumroad-product-launch
description: Runbook for taking a new "3명의 독립 AI 리뷰어" Notion 템플릿 상품(니치템플릿/A1 라인, niche-templates/)을 기획부터 Gumroad 실제 발행·검증까지 끝내는 절차. niche-templates/ 안에서 신규 상품을 만들거나, 기존 상품을 발행/수정/정비하거나, Gumroad API로 상품·커버·할인코드·리시트를 다루거나, "니치마켓 확장", "노션 템플릿 라인", "3인 페르소나 상품" 같은 말이 나오면 반드시 이 스킬부터 확인할 것 — 이미 4번 배치(11~14번 문서)를 거치며 굳어진 표준이라 처음부터 다시 설계하면 이미 풀린 문제(Gumroad API 함정, Notion 공개상태 확인법 등)를 또 겪게 된다.
---

# A1 — Gumroad 상품 발행 런북

`niche-templates/`(나다컴퍼니1)의 A1 라인은 "3명의 독립 AI 리뷰어가 서로 안 보고 반박하는 Notion 템플릿"을 여러 오디언스로 반복 생산해 Gumroad에 판매하는 상품군이다. 이 스킬은 그 파이프라인을 처음부터 재설계하지 않도록 이미 검증된 절차·API 함정·검증법을 정리한 것이다. 실제 배치 기록(무엇을 왜 그렇게 했는지)은 `niche-templates/execution/products/11~14번` 문서와 `niche-templates/execution/A1-gumroad-대량생산-자동화.md` 진행 로그에 있으니, 이 스킬로 절차를 따라가다 판단이 애매하면 그 문서들을 먼저 찾아본다.

## 언제 자율로 진행해도 되는가

`niche-templates/README.md` 운영원칙 2·7·8번에 따라, **A1은 회장 개입 없이 계속 굴러가는 채널**이다 — 채널(Gumroad)이 이미 연동돼 있고 상품이 아래 "발행 전 체크리스트"를 통과하면, 신규 상품 기획→제작→발행을 승인 없이 바로 진행한다. 예외: (a) Notion 워크스페이스의 웹공개 여부가 확인 안 될 때(아래 "Notion 공개 상태 확인" 참고 — 이건 회장 액션이 필요할 수 있음), (b) 완전히 새로운 결제/유통 채널을 추가할 때, (c) 가격 정책 자체를 바꿀 때.

## 1. 콘텐츠 스펙 — 상품 하나당 이 구조를 그대로 따른다

- **3개의 독립 페르소나**: 서로의 판정을 보지 않고 각자 검토(예: Skeptic/Realist/Specialist류 조합). 페르소나 이름과 이모지는 오디언스에 맞게 새로 짓되, "서로 안 보고 독립적으로 반박한다"는 핵심 메커니즘은 고정.
- **Notion 구조**: 루트 페이지(아이콘 + 한 줄 훅 + 상품 소개) + 추적용 데이터베이스(스키마 + 데모 1행) + Start Here(3단계 사용법) + Prompt Sets(15개 = 페르소나당 5개, 바로 복붙 가능한 형태).
- **데모 콘텐츠**: 템플릿을 복제한 사람이 "빈 템플릿"을 마주하지 않도록, 구체적인 이름/시나리오 하나를 세계관처럼 일관되게 채워 넣는다(예: "Alex의 커피 큐레이션 프리시드 피치"). 사용자가 실제로 지우고 자기 걸 채우기 전에 "이게 어떻게 작동하는지" 바로 보이게 하는 게 목적.
- **민감 영역 가드레일**: 공정주거법(부동산/임대), 대필(에세이/자소서) 등 법적·윤리적으로 민감한 도메인이면 "이건 법률 자문이 아니다"/"이미 쓴 초안을 편집하는 도움이지 대신 써주는 게 아니다" 같은 배너를 루트·Start Here·Prompt Sets 최소 2~3곳에 명시한다. Tenant Screening Board·Real Estate Listing Board·College Essay Board가 이 패턴의 실례다.
- 부모 페이지는 항상 상품 허브(현재 위치는 `niche-templates/candidates.md`의 A1 행 또는 최근 실행 로그에서 확인 — Notion 워크스페이스가 이관될 수 있으니 매번 최신 부모 page_id를 문서에서 재확인할 것, 옛 기억에 의존하지 말 것) 하위에 만든다.

## 2. Notion 공개 상태 확인 — 발행 전 반드시 통과해야 하는 게이트

Gumroad 상품의 "템플릿 복제 링크"가 실제로 열리려면 그 Notion 페이지가 "웹에 공개"(Publish to web) 상태여야 한다. 이 상태는 **Notion MCP의 `fetch`로는 알 수 없고, 워크스페이스를 복제/이관해도 자동으로 안 옮겨진다**(2026-08-16에 실제로 겪은 사고: 콘텐츠는 새 워크스페이스로 옮겨졌지만 공개 토글은 안 옮겨져서, 확인 없이 발행했으면 26개 상품이 깨진 링크로 나갈 뻔했다).

**검증법(2026-08-16 확정)**: 봇 User-Agent로 `https://app.notion.com/p/<page_id>`를 요청하면 —
- 공개된 페이지 → `301` + `Location` 헤더에 실제 `*.notion.site` 주소(서브도메인을 추측할 필요 없이 그대로 드러남)
- 비공개 페이지 → `404`

```bash
curl -s -o /dev/null -w "http_code=%{http_code} redirect=%{redirect_url}\n" \
  -A "facebookexternalhit/1.1" "https://app.notion.com/p/<page_id>"
```

**항상 대조군부터 확인**: 이미 공개로 알려진 페이지(예: 기존에 라이브 중인 다른 상품의 루트 페이지 ID)로 먼저 위 명령을 돌려서 `301`이 나오는지 확인한 뒤에, 새로 만든 페이지의 `404` 결과를 신뢰한다 — 이 확인 없이 "안 되네" 하고 결론 내리지 않는다(과거에 이 검증법을 못 찾아서 4가지 다른 방법을 시도하다 실패한 기록이 `products/14-니치마켓-2차.md`에 있다).

**`404`가 나오면**: 발행을 강행하지 말고, 상위 허브 페이지에 "웹에 공개" 토글이 켜져 있는지 회장에게 확인 요청한다(부모 페이지를 공개하면 하위 전체가 상속되므로 보통 1클릭으로 해결됨) — **이때 반드시 회장이 바로 열 수 있는 직접 링크(`https://app.notion.com/p/<허브 page_id>`)를 같이 준다.**

## 3. Gumroad 발행 절차 + 이미 겪은 API 함정들

표준 스펙: 가격 **$11 런칭가(정가 $18 안내)**, 상시 할인코드 **WELCOME2($2 할인)**, 태그 8개 내외, description은 기존 라이브 상품(`GET /v2/products`로 아무거나 하나 조회) 구조를 그대로 재사용(훅 → 페르소나 소개 → What's inside → How it works 3단계 → vs 비교 → FAQ → Pricing & refunds → WELCOME2 안내 → CTA).

순서와 함정:

1. **먼저 1건만 실제 생성 시도**해서 그날의 "하루 10개 상품 생성" 한도가 살아있는지 확인한다 — 이건 하네스 자동승인 차단과 별개인 **Gumroad 계정 자체의 하드 리밋**이다. 막혀 있으면(`"Sorry, you can only create 10 products per day."`) 억지로 재시도하지 말고 그 사실만 로그에 남기고 다음 기회로 미룬다.
2. `POST /v2/products`로 생성 (name/price/description/tags).
3. **⚠️ `custom_receipt`는 생성 호출에 같이 보내도 저장되지 않는다.** description/tags는 생성 시점에 반영되지만 receipt만 빠진다 — 생성 직후 반드시 `GET`으로 재확인하고, 비어있으면 **별도 `PUT /v2/products/:id`로 `custom_receipt`만 다시 보낸다.** 매번 이 순서(create → 확인 → receipt PUT)로 짠다.
4. **커버 3장(hero/personas/demo)**: HTML/CSS 목업을 Cloudflare Browser Rendering REST 스크린샷 엔드포인트(`POST https://api.cloudflare.com/client/v4/accounts/<account_id>/browser-rendering/screenshot`, 금고의 `cloudflare_api_token`)로 렌더링 → `niche-templates/execution/products/<slug>-exhibits/`에 커밋·push → `raw.githubusercontent.com/.../<파일>` URL로 `POST /v2/products/:id/covers`(직접 멀티파트 업로드가 아니라 **URL 임포트 방식**). 브랜드 톤: hero(보라 그라디언트 `#4c3ce0→#9333ea`, 이모지 아이콘, 흰 볼드 타이틀, 3페르소나 pill) / personas(다크 네이비 `#181229` bg, 카드 `#241a3d`) / demo(라벤더 그라디언트, 흰 카드, 보라 왼쪽 보더 인용구).
5. `POST /v2/products/:id/offer_codes`로 WELCOME2 등록.
6. `PUT /v2/products/:id/enable`로 공개.
7. **발행 후 검증(생략 금지)**: `GET /v2/products/:id`로 가격/커버 3장/태그/description/receipt 재확인 + `curl`로 라이브 HTML(제목/가격/Buy now 버튼/커버 URL) 확인. 뭔가 이상하면 `PUT /v2/products/:id/disable`로 즉시 롤백하고 원인부터 고친다 — 문제 있는 상태로 공개해두지 않는다.

기존 커버/receipt를 교체해야 할 때: `DELETE /v2/products/:id/covers/:cover_id`로 지운 뒤 4번 절차로 새로 올린다.

## 4. 금고(비밀값) 접근

`gumroad_access_token`, `cloudflare_api_token`은 `.claude/rules/cloudflare-vault.md`에 등록돼 있다. 새 값을 채팅으로 다시 묻지 말고 `$VAULT_URL`/`$VAULT_TOKEN`으로 조회한다. 비밀값 자체는 절대 커밋하지 않는다.

## 5. 완료 후 기록

- 그날 실행 로그를 `niche-templates/execution/A1-gumroad-대량생산-자동화.md`의 "진행 로그"에 날짜와 함께 추가.
- 신규 배치면 `niche-templates/execution/products/`에 새 번호로 상세 문서 작성(11~14번 형식 참고).
- `niche-templates/candidates.md`의 A1 행 발행 개수·라이브 링크 갱신.
- 매출(`GET /v2/sales`)은 매번 재확인 — 0건이면 "여전히 0건" 한 줄로 기록, 1건이라도 잡히면 그 즉시 회장에게 최우선 보고(다른 작업 다 제쳐두고).
- `git pull --rebase origin master` 먼저(다른 계열사 세션들이 자주 동시에 push함) → 커밋 → `git push`. 이 저장소는 PR 없이 master 직결이 원칙.
