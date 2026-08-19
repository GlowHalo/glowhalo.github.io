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
| `plugin-dev` | GlowHalo Group 전용 플러그인·스킬을 배포용으로 만들 때 |
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
GlowHalo 1·9·11·12가 전부 "찾고 조사하는" 일이라 검색 품질이 곧 산출물 품질이다.
무료 티어: 가입 시 $20 + 매월 $10 크레딧, 월 1,000회, 카드 등록 불필요.
단 **신규 회원가입은 회장 승인 사항**(CLAUDE.md 2026-08-11)이라 임의로 진행하지 않는다.
MCP 엔드포인트가 무인증으로 되는지 2026-08-15에 직접 호출해 확인했고, **인증 필수**였다.

## 주의

- **플러그인은 임의 코드를 실행할 수 있다.** 커뮤니티 마켓은 자동 검증만 통과한 것이라 Anthropic 보증이 아니다. 설치 전 `claude plugin details` 로 무엇이 딸려오는지 보고, 낯선 곳에서 온 건 homepage 저장소를 한 번 열어본다.
- **컨텍스트 비용이 있다.** 설치한 스킬·플러그인의 설명은 매 턴 컨텍스트에 올라간다. 많이 깔수록 느려지고 오발동이 는다 — 실제로 쓰는 것만 남긴다. 옛 실측(2026-08-15, 지금은 틀림): 공식 마켓 32개 설치 시 약 48,000 토큰, `posthog` 하나가 25,534 토큰. **재실측(2026-08-18)**: 지금 켜진 5개(`claude-security` 642 + `cloudflare` 2,135 + `pyright-lsp` 0 + `resend` 757 + `typescript-lsp` 0) 합계 **약 3,530 토큰** — 이미 충분히 가벼워서 추가로 껐다 켰다 할 실익이 크지 않다. 설치 전 `claude plugin details` 의 `Always-on` 줄을 반드시 볼 것.
- MCP 서버를 끼워넣는 플러그인(`github`, `notion` 등)은 이 세션에 이미 붙어 있는 MCP와 겹칠 수 있다. 중복 설치하지 말 것.

## 세션별로만 켜고 끄기 / 계열사별로 나눠 관리하기 — 기술적으로는 되지만 지금은 안 하는 게 낫다 (2026-08-18 조사, 같은 날 재검증으로 1차 결론 정정)

회장 질문: "상시로 필요없는 건 꺼뒀다가 필요할 때만 켜면 어떨까? 공통은 HQ가 관리, 계열사별로 자주 쓰는 건 그 폴더에서만 켜는 방법은?" 조사 결과:

- **1차 결론(GitHub 이슈 #62174 근거)이 틀렸다 — 하위폴더 `.claude/settings.json`로 플러그인을 다르게 설정하는 건 이 환경에서 실제로 동작한다.** `newsletter-automation/.claude/settings.json`에 `enabledPlugins`를 따로 넣고 그 폴더에서 `claude plugin list`를 돌려 직접 확인함: 그 폴더 안에서는 루트 설정이 아니라 하위폴더 설정만 적용됐다.
- **다만 "병합"이 아니라 "완전 대체"라 실익보다 위험이 크다.** 하위폴더 설정은 루트 설정 위에 얹히는 게 아니라 통째로 갈아치운다 — 실측: 하위폴더에 `cloudflare: false`만 적었는데 언급조차 안 한 `claude-security`·`pyright-lsp`·`resend`·`typescript-lsp`까지 전부 disabled로 나옴(반대로 `resend: true`만 적으면 나머지 전부 disabled). 즉 "공통은 HQ, 개별은 개별로"를 실제로 하려면 **각 계열사 폴더 설정에 공통 목록까지 매번 통째로 복사해 넣어야** 한다 — HQ가 공통 목록에 하나 추가할 때마다 계열사 폴더 12곳을 전부 손으로 고쳐야 해서 "한곳에서 관리"라는 취지와 어긋난다.
  - 같은 이유로 **`permissions.allow`/`autoMode.allow` 같은 다른 설정도 같이 갈아치워질 가능성이 높다**(같은 파일이 통째로 대체되는 구조라서) — 이건 실제로 검증하지 않았지만, 만약 그렇다면 계열사 폴더에 설정파일 하나 실수로 만드는 순간 그 폴더에서 작업하는 세션이 루트에 애써 정리해둔 승인 규칙을 조용히 잃는 사고로 이어질 수 있다. "이슈없는 선에서"라는 전제에 어긋나는 지점이라 신중해야 함.
  - **더 큰 미확인 변수**: GlowHalo 계열사 세션들이 실제로 자기 폴더를 cwd로 두고 시작하는지, 아니면 이 세션처럼 항상 저장소 루트를 cwd로 두는지 확인 못 했다. 후자라면(가능성 높음 — 모노레포 특성상 세션 하나가 저장소 하나를 통째로 열고 그 안에서 폴더를 오가는 구조) 하위폴더 설정파일은 세션 시작 시점엔 아예 적용되지 않는다. 이건 실제 계열사 세션 하나로 직접 확인해봐야 확실해진다.
  - 다행히 위 재실측처럼 지금 켜진 5개 합계가 ~3,530 토큰이라 토글/분리의 실익 자체가 작다. **결론: 지금은 안 하는 걸 권함.** 나중에 정말 무거운 플러그인(옛 `posthog` 25,534토큰급)을 특정 계열사 하나만 써야 하는 상황이 생기면, 그때 그 폴더 하나에만 "루트 목록 + 그 플러그인" 전체를 명시한 설정파일을 조심스럽게 얹는 식으로 국소적으로 검토.
- **스킬은 이미 하위폴더 단위로 나뉜다** — 위 표(`.claude/skills/` 저장소 전체 vs `<하위폴더>/.claude/skills/`)가 그 답. `product-idea-mining`·`lead-magnet-pdf`는 여러 계열사(정연·채원·지호)가 같이 쓰므로 저장소 루트에 둔 게 맞고, 특정 계열사 전용 스킬이 생기면 그 폴더 밑에 두면 된다. (스킬은 병합/대체 이슈 없이 폴더별로 자연스럽게 추가되는 방식이라 플러그인보다 훨씬 안전한 분리 수단이다.)
- **커넥터(Gmail/Drive/Notion/GitHub 등)는 세션이 아니라 claude.ai 계정 단위**라 저장소·세션별로 나눠 켜는 방법이 없다. `disableClaudeAiConnectors` 설정(project/user 어디든 가능)이 있긴 한데 **커넥터 전부를 한꺼번에 끄는 전체 스위치**이지, Gmail만 끄고 Notion은 켜두는 선택적 토글이 아니다 — 이 저장소는 계열사 여러 곳이 Gmail/Notion을 상시 쓰므로 켜봤자 실익보다 손해가 크다(관련 이슈 #26625도 아직 미해결).
- **다만 실측해보니 커넥터는 원래도 걱정만큼 무겁지 않다.** 이 세션 자체에서 확인된 사실: Gmail/Notion/GitHub/Google Drive MCP 도구들은 대화 시작 시 이름+한 줄 설명만 올라오는 "deferred" 상태로 있다가, 실제로 그 도구를 처음 쓸 때(`ToolSearch`)만 전체 스키마가 로드된다. 즉 "커넥터 하나당 ~2K토큰"이라는 옛 블로그 수치는 스키마 전체를 매턴 올리던 옛 방식 기준이고, 지금은 안 쓰는 커넥터는 이미 거의 공짜에 가깝다 — 별도로 끌 이유가 약하다.

**최종 결론**: 지금 구조(플러그인 5개 project 스코프 + 스킬 2단계 스코프 + 커넥터 계정단위·지연로딩)가 이미 이 저장소가 낼 수 있는 최적에 가깝다. 하위폴더별 플러그인 분리는 기술적으로 가능하다는 걸 확인했지만 "대체(병합 아님)" 특성 때문에 관리 부담·권한 유실 위험이 절감폭보다 커서 지금은 보류. 무거운 플러그인이 계열사 하나에만 필요해지는 구체적 상황이 오면 그때 국소적으로 재검토.
