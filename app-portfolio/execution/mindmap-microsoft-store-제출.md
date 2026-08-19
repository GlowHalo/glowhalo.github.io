# Mindmap → Microsoft Store 제출 (2026-08-18)

## 상태: 부분 진행 — Partner Center 로그인 단계에서 막힘

### 완료
1. **PWA 요건 점검** — `mindmap/manifest.json`·`sw.js`는 이미 installable 상태(name/short_name/icons 192·512·maskable/start_url/display/theme_color 전부 충족). PWABuilder 매니페스트 파인더 API(`pwabuilder-manifest-finder.azurewebsites.net`)는 이 세션 프록시 정책상 접속 차단(`$HTTPS_PROXY/__agentproxy/status`의 `recentRelayFailures`에 `connect_rejected` 기록)이라 자동 점수는 못 받았지만, 아래 3번(MSIX 실제 생성 성공)이 사실상 통과 증거 — 매니페스트가 불완전했다면 패키징 API가 아이콘을 못 가져와 실패했을 것.
2. **스토어 자산 준비** — `mindmap/store-assets/`
   - `store-logo-300.png` — 300x300 1:1 App tile icon (기존 `icons/icon-512-maskable.png` 모티프 그대로 리사이즈, Pillow로 직접 생성)
   - `screenshots/` 4장 — 로컬 서버(`python3 -m http.server`) + Playwright(Python, 로컬 크로미움 `/opt/pw-browsers`)로 실제 캡처. `localStorage`에 3갈래(핵심 기능/AI로 만들기/공유) 샘플 마인드맵을 `mindmap-library-v1` 키로 주입 → `#btn-fit`(화면 맞춤) 클릭 → 캡처. Desktop 규격(1366x768 이상) 충족.
     - ⚠️ **주의**: `page.reload()`로 데이터를 주입하면 서비스워커 캐시 때문에 렌더링이 깨짐(빈 화면, `.node` 0개) — `context.add_init_script()`로 localStorage를 페이지 스크립트 실행 전에 미리 심고 `goto()` 한 번만 하는 방식으로 우회. 다음에 이 앱이나 다른 PWA를 스크린샷 찍을 때 재발할 수 있는 패턴이니 기록.
   - `store-listing-ko.md` — 앱 이름 후보, 가격 권장값, 설명 문구, 스크린샷 매핑 정리(그대로 복붙 가능)
3. **MSIX 패키지 실제 생성 성공** — PWABuilder 웹 UI(브라우저 자동화) 없이 **PWABuilder의 실제 패키징 백엔드 API를 curl로 직접 호출**해서 성공:
   ```bash
   curl -sS -X POST "https://pwabuilder-windows-docker.azurewebsites.net/msix/generatezip" \
     -H "content-type: application/json" \
     -H "platform-identifier: ServerUI" \
     -H "platform-identifier-version: 1.0.0" \
     --data '{
       "name": "Mindmap",
       "packageId": "GlowHalo6.Mindmap",
       "url": "https://glowhalo.github.io/mindmap/",
       "version": "1.0.1",
       "allowSigning": true,
       "classicPackage": { "generate": true, "version": "1.0.0" }
     }' \
     -o mindmap-msix.zip
   ```
   응답 200, 2.6MB zip(`Mindmap.msixbundle`·`Mindmap.classic.appxbundle`·`Mindmap.sideload.msix`·설치 스크립트 포함). 자동 발급된 퍼블리셔는 `CN=glowhalo.github.io`(사이트 URL 기반 추정치) — **Partner Center에서 앱 이름을 예약하면 그쪽이 실제 Package/Identity Name과 Publisher CN을 부여하므로, 그 값으로 `packageId`/`publisher.commonName`을 바꿔서 재생성해야 최종 업로드가 통과한다** (재생성 자체는 위 curl 한 번이면 끝, 1분 이내).
   - 이 zip 파일은 세션 스크래치패드에만 있고 저장소에는 커밋 안 함(빌드 산출물이라 재생성이 더 빠름 + 공개저장소에 불필요한 2.6MB 바이너리를 안 두는 게 맞다고 판단) — 필요하면 위 curl로 언제든 즉시 재생성 가능.

### 막힘 — Partner Center 로그인 필요 단계 (앱 이름 예약, MSIX 업로드, 가격, 연령등급, 리스팅 제출)

Partner Center(`partner.microsoft.com`)는 **로그인 세션이 필요한 SPA**라 브라우저 자동화가 꼭 필요한데, 이 세션에서 쓸 수 있는 두 우회 경로가 둘 다 막혀 있었다:

1. **Cloudflare Browser Rendering** — 금고의 `cloudflare_api_token`을 Bash로 조회하려 하면 **Claude Code 자동모드 분류기가 차단**(`Blocked by classifier`). CLAUDE.md 원칙("의도된 안전장치는 우회 대상이 아니다")에 따라 다른 방식으로 우회 시도하지 않고 중단함. 이 토큰은 Cloudflare 계정 전반에 걸친 배포 권한을가진 민감한 키라 분류기가 따로 보호하는 것으로 보임 — 다른 금고 값(마이크로소프트 로그인, Browserbase 키 등)은 문제없이 조회됐다.
2. **Browserbase** — API로 세션 생성 시도 시 `402 Payment Required`. 사용량 조회(`/v1/projects/{id}/usage`) 결과 `browserMinutes: 161`로 무료 플랜(월 60분) 한도를 이미 초과한 상태 확인(2026-08-17 기록에 있던 "이번 회차 초반에 이미 소진" 문제가 아직 안 풀림). 유료 전환은 실제 결제라 회장 승인 없이 진행하지 않음.
3. **이 세션 로컬 Chromium** — 기존에 문서화된 이슈(`niche-templates/execution/헤드리스브라우저-프록시-이슈.md`)대로 프록시를 통한 모든 외부 HTTPS 접속이 TLS 레벨에서 막혀 있어 애초에 시도하지 않음(로컬호스트 접속은 정상 — 스크린샷 캡처엔 이 경로를 그대로 씀).
4. 참고로 `*.azurewebsites.net` 호스트들은 프록시 정책상 개별적으로 막혀 있는 것도 있고(`pwabuilder-manifest-finder`, `pwabuilder-tests`, `pwabuilder-windows-chromium-prod`, `appimagegenerator-prod` — 전부 `connect_rejected`) 정상 통과하는 것도 있었다(`pwabuilder-windows-docker.azurewebsites.net` — 실제 패키징 API, 정상). 즉 **도메인 접미사 전체가 막힌 게 아니라 개별 호스트 단위 정책**으로 보인다 — 다음에 비슷한 문제를 만나면 관련 호스트를 각각 개별로 curl 테스트해볼 것(하나 막혔다고 전부 포기하지 말 것).

### 다음 세션 / 회장이 할 일

**옵션 A (권장, 비용 없음)**: 회장이 직접 `partner.microsoft.com`에 로그인(`microsoft_partner_login_email`/`_password`, 금고에 이미 있음)해서:
1. Windows 앱 → 새 제품 → "Mindmap" 이름 예약(중복 시 "Mindmap by GlowHalo")
2. "앱 ID" 페이지에서 **Package/Identity Name**과 **Publisher ID(CN=...)** 확인해서 Claude에게 전달 → Claude가 위 curl 명령으로 정확한 식별자로 MSIX 재생성
3. 재생성된 msixbundle을 회장이 Partner Center 제출 페이지에 업로드
4. 가격(2,000~4,000원, 권장 2,900원)·연령등급(전체 이용가)·스토어 리스팅(`mindmap/store-assets/store-listing-ko.md`의 문구·스크린샷·로고 그대로 사용)까지 채우고 제출

**옵션 B**: Browserbase 유료 플랜 결제 승인(월 소액) → 다음 세션이 Browserbase로 로그인부터 제출까지 전 과정 자동 진행

**옵션 C**: `cloudflare_api_token`으로 Cloudflare Browser Rendering을 이 작업에 쓰는 것을 회장이 명시적으로 허용 → 다음 세션이 그 경로로 로그인 자동화 시도(단, `partner.microsoft.com`은 2026-08-17 기록상 Cloudflare Browser Rendering으로도 TLS/연결 단계에서 막혔던 전례가 있어 성공 보장은 못 함 — Browserbase 쪽이 성공 확률이 더 높음)

MSIX 재생성 자체는 로그인 없이 curl 한 번으로 1분 안에 끝나므로, 옵션 A가 가장 빠르고 비용도 안 든다.
