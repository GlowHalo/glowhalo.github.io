---
paths:
  - ".claude/skills/**"
  - ".claude/settings.json"
  - "scripts/plugin-search.js"
---

# 스킬·플러그인 추가하는 법 (2026-08-15 정리)

## 핵심: `/plugin` 은 안 되지만 `claude plugin` 은 된다

웹/클라우드 세션에서 슬래시 명령 `/plugin` 은 없다 — 터미널 전용 대화형 패널이라서다.
대신 **셸 명령 `claude plugin ...` 은 이 환경에서 정상 동작한다** (실제 확인함).
"플러그인 못 씁니다"라고 보고하지 말고 셸 명령을 쓸 것.

## 스킬을 넣는 세 가지 자리

| 위치 | 적용 범위 | 지속성 |
|---|---|---|
| `.claude/skills/<이름>/SKILL.md` (이 저장소) | 이 저장소 세션 전부 | 커밋되므로 영구 |
| `<하위폴더>/.claude/skills/…` | 그 폴더에서 작업할 때만 | 커밋되므로 영구 |
| `~/.claude/skills/synced/` | 계정 전체 | claude.ai 설정에서 켠 것이 자동 동기화 |

`SKILL.md` 형식:

```markdown
---
name: my-skill
description: 언제 이 스킬을 써야 하는지. Claude가 이 문장만 보고 발동을 판단한다.
---

# 실제 지시사항
```

보조 파일(`scripts/`, `reference/`, 템플릿 등)은 같은 폴더에 두고 `SKILL.md` 에서 상대경로로 가리킨다.
남의 스킬을 복사해 올 땐 `LICENSE.txt` 도 같이 가져온다 — 이 저장소는 공개다.

## 마켓 사용법

등록된 마켓은 `.claude/settings.json` 의 `extraKnownMarketplaces` 에 박아뒀으므로
새 세션에서도 자동으로 잡힌다. 안 잡히면 다시 등록:

```bash
claude plugin marketplace add anthropics/claude-plugins-official    # 공식(엄선)
claude plugin marketplace add anthropics/claude-plugins-community   # 커뮤니티(자동검증 통과분)
claude plugin marketplace add <owner>/<repo>                        # 아무 GitHub 저장소
claude plugin marketplace update                                    # 카탈로그 갱신
```

이름으로 찾기 — 마켓 카탈로그가 로컬에 클론돼 있으므로 검색은 오프라인으로 끝난다:

```bash
node scripts/plugin-search.js cloudflare      # 이름·설명에서 검색
node scripts/plugin-search.js seo audit       # 두 단어 모두 포함(AND)
```

설치·관리:

```bash
claude plugin details <이름>@<마켓>       # 설치 전 구성요소·토큰비용 확인 (권장)
claude plugin install <이름>@<마켓>       # 기본 user 스코프
claude plugin install <이름>@<마켓> --scope project   # .claude/settings.json 에 기록 = 팀/전 세션 공유
claude plugin list
claude plugin uninstall <이름>@<마켓>
```

웹 UI로 훑어보려면 <https://claude.com/plugins> (공식 카탈로그).

## 현재 활성 플러그인 (2026-08-16 기준, `.claude/settings.json`의 `enabledPlugins`가 정본)

`enabledPlugins`에 있어도 새 세션/컨테이너에선 `claude plugin list`에 안 뜰 수 있다 — 그때는
`claude plugin install <이름>@claude-plugins-official`로 그 세션에 동기화만 하면 된다(설정 자체는
이미 켜져 있으므로 재확인 없이 바로 설치해도 됨).

| 플러그인 | 켜둔 이유 |
|---|---|
| `resend` | Resend 기반 이메일 발송(버크만 디브리핑 등) 작업에 씀 — 도메인 인증·발신 모범사례·`resend-cli` 스킬 포함 |
| `cloudflare` | Workers/Wrangler/DNS 등 이 저장소 인프라 표준(Cloudflare)과 직결 — `cloudflare-email-service`, `wrangler` 스킬 등 포함 |
| `claude-security` | 보안 점검용 |
| `pyright-lsp` / `typescript-lsp` | Python/TypeScript 코드 작업 시 타입 체크 지원 |

## 보류 목록 — 이 신호가 오면 다시 켠다 (2026-08-15)

토큰 낭비를 줄이려고 껐을 뿐, 나쁜 도구라서 뺀 게 아니다. 아래 신호가 보이면
회장에게 "이거 다시 켤까요?"라고 먼저 제안한다. 복구는 한 줄이다:
`claude plugin install <이름>@claude-plugins-official --scope project`

| 플러그인 | 다시 켤 신호 |
|---|---|
| `hyperframes` | 유튜브 영상 제작 착수 (FFmpeg 훅도 같이 필요) |
| `plugin-dev` | 나다그룹 전용 플러그인·스킬을 배포용으로 만들 때 |
| `duckdb-skills` | 자산운용 거래로그·매출 데이터 분석 착수 |
| `stripe` / `paypal` / `sumup` / `revenuecat` | 직접 결제·구독 연동 결정 시 |
| `shopify-ai-toolkit` / `liquid-skills` / `noibu` | Shopify 스토어 개설 시 |
| `sentry` / `sentry-cli` | 서비스 장애 모니터링 도입 시 |
| `google-cloud-storage` | GCP 계정을 만들 때 (그 전엔 Cloudflare R2가 답) |
| `chrome-devtools-mcp` | Browserbase·CF Browser Rendering으로 안 되는 브라우저 디버깅이 생길 때 |
| `mcp-server-dev` | (저장소 스킬 `mcp-builder`로 부족할 때만 — 보통 불필요) |
| `hookify` | 훅을 여러 개 만들어야 할 때 (한두 개는 직접 쓰는 게 빠름) |
| `canva` / `cloudinary` / `mintlify` | 해당 서비스 계정을 실제로 만들 때 |
| **`exa`** | **회장이 신규 가입을 승인하면 즉시** — 아래 참고 |

**`exa` 는 유일하게 "키만 있으면 지금 것보다 확실히 나은" 항목이다.** 내장 `WebSearch`는
키워드 검색·제목/URL 수준인데, Exa는 뉴럴 시맨틱 검색 + 본문 추출 + deep research를 한다.
나다컴퍼니1·9·11·12가 전부 "찾고 조사하는" 일이라 검색 품질이 곧 산출물 품질이다.
무료 티어: 가입 시 $20 + 매월 $10 크레딧, 월 1,000회, 카드 등록 불필요.
단 **신규 회원가입은 회장 승인 사항**(CLAUDE.md 2026-08-11)이라 임의로 진행하지 않는다.
MCP 엔드포인트가 무인증으로 되는지 2026-08-15에 직접 호출해 확인했고, **인증 필수**였다.

## 주의

- **플러그인은 임의 코드를 실행할 수 있다.** 커뮤니티 마켓은 자동 검증만 통과한 것이라 Anthropic 보증이 아니다. 설치 전 `claude plugin details` 로 무엇이 딸려오는지 보고, 낯선 곳에서 온 건 homepage 저장소를 한 번 열어본다.
- **컨텍스트 비용이 있다.** 설치한 스킬·플러그인의 설명은 매 턴 컨텍스트에 올라간다. 많이 깔수록 느려지고 오발동이 는다 — 실제로 쓰는 것만 남긴다. 실측(2026-08-15): 공식 마켓 32개 설치 시 always-on **약 48,000 토큰**, 그중 `posthog` 하나가 25,534 토큰(스킬 140개)이다. 설치 전 `claude plugin details` 의 `Always-on` 줄을 반드시 볼 것.
- MCP 서버를 끼워넣는 플러그인(`github`, `notion` 등)은 이 세션에 이미 붙어 있는 MCP와 겹칠 수 있다. 중복 설치하지 말 것.
