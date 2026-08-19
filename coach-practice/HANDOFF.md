# coach-practice — 세션 인계 메모 (2026-08-18)

이번 세션에서 구현·배포는 끝났지만, **Gemini API 무료 티어 일일 한도(모델당 하루 20회) 소진** 때문에
실제 호출 기반 최종 검증(E2E, `/feedback`, BYOK 실측)을 못 끝내고 넘긴다. 아래는 다음 세션이
쿼터가 리셋된 뒤(내일, UTC 기준 자정) 바로 이어받을 수 있게 남기는 상태 요약이다.

## 이미 끝난 것 (재작업 불필요)

- **코드/화면 전부 완성**: `index.html`(등급선택→시나리오/페르소나 선택→대화→세션종료→피드백
  카드 전체 SPA), `manifest.json`, `sw.js`, `icons/`(192/512/512-maskable/apple-touch),
  `worker/index.ts`(`/chat`, `/feedback` 두 엔드포인트, 등급별 시나리오·페르소나 데이터,
  시스템 프롬프트) — TypeScript 컴파일 에러 없음(`npx tsc --noEmit` 통과).
- **Worker 배포 완료**: `https://glowhalo6-coach-practice.tossneon.workers.dev`
  (`wrangler deploy` 성공, `GEMINI_API_KEY` 시크릿도 금고 값으로 등록 완료).
- **`/chat` 엔드포인트 최소 1회 실제 성공 확인**(curl, 쿼터 소진 전): KAC/이직고민/"방어적"
  페르소나 조합에서 AI가 질문·조언 없이 실제 고객처럼 반응했고, 시스템 프롬프트에 숨겨둔
  hiddenIssue를 스스로 안 드러냄 — 설계 의도(AI=고객, 코치 역할 절대 안 함)대로 동작하는
  것을 확인함. 다만 표본 1개뿐이라 다른 등급/페르소나 조합에서도 일관되는지는 추가 확인 필요.
- **Worker CORS 설정 정상**: `http://127.0.0.1:8000`, `https://glowhalo.github.io` 오리진에 대해
  `access-control-allow-origin` 헤더가 정상 응답되는 것을 curl로 확인.
- **`meta.json` 작성 완료**, `registry.js` 재생성 필요(아래 "남은 작업" 참고).
- **`store-assets/` 준비 완료**: `store-logo-300.png`(300x300), 등급별 리스팅 문구 3종
  (`store-listing-kac.md` 2,900원 / `store-listing-kpc.md` 3,400원 / `store-listing-ksc.md` 3,900원).
  **스크린샷은 아직 없음**(아래 "남은 작업" 참고 — Playwright E2E가 막혀서 실제 화면 캡처를
  못 했다).

## 왜 막혔나 — 정확한 원인

- 처음엔 Gemini가 503("high demand")을 반복 반환해 "일시적 과부하"로 판단하고 폴링(25초 간격,
  최대 20회)했다.
- **회장이 직접 확인해준 정확한 원인: 일시 장애가 아니라 `gemini_api_key`(금고에 등록된 공용
  무료 티어 키)의 하루 20회 한도 소진.** 이 키는 `kpc-coach-chat`·`mindmap`·`coach-practice`가
  전부 같이 쓰는 공용 키라, 이번 세션에서 curl 테스트를 여러 번 반복한 것 + 다른 프로젝트가
  같은 날 같이 쓴 것이 겹쳐 하루 한도를 다 썼을 가능성이 높다.
- Gemini 응답의 `RetryInfo`(예: "50초 후 재시도")는 **분당 레이트리밋용 기본 안내 문구**라
  일일 쿼터 소진 상황엔 의미가 없다 — 실제로는 하루 단위(UTC 자정?) 리셋이라 그 안에는 아무리
  기다리거나 재시도해도 안 풀린다. 이 사실을 몰랐다면 다음에도 똑같이 헛폴링할 수 있으니 꼭
  기억할 것.

## 다음 세션이 할 일 (쿼터 리셋 후)

1. **curl로 `/chat`, `/feedback` 각 1회 스모크 테스트** — 정상 200 응답 확인.
   ```bash
   curl -s -X POST "https://glowhalo6-coach-practice.tossneon.workers.dev/chat" \
     -H "Content-Type: application/json" -H "Origin: https://glowhalo.github.io" \
     -d '{"grade":"kac","scenarioId":"career-change","personaId":"defensive",
          "history":[{"role":"client","text":"..."},{"role":"coach","text":"..."}]}'
   ```
2. **Playwright E2E 전체 흐름** — 테스트 스크립트는 이번 세션에서 이미 작성해둠(아래 참고).
   등급선택→시나리오/페르소나 선택→대화 여러 턴→세션 종료→피드백 카드까지 실제로 통과하는지
   확인. 재시도 로직(Gemini 일시 오류 대응)이 스크립트에 이미 들어있음.
3. **BYOK 실측** — 브라우저에서 실제 Gemini 키를 설정 모달에 입력하고, 워커를 거치지 않고
   Google API를 직접 호출하는 경로가 CORS 없이 성공하는지 확인(mindmap·kpc-coach-chat에서는
   이미 검증된 패턴이라 구조적으로는 될 가능성이 높지만 이 앱에서 실측은 아직 안 함).
4. **여러 등급/페르소나 조합으로 AI 응답 샘플 추가 확보** — 특히 KSC(강한 저항형)가 실제로
   저항감 있게 반응하는지, KAC은 상대적으로 협조적인지 등급별 난이도 차이가 실제로 체감되는지
   확인.
5. **store-assets 스크린샷 4장 촬영**(Playwright로 각 화면 캡처 후 `screenshots/`에 저장):
   `desktop-1366x768-grade-select.png`, `desktop-1366x768-chat.png`,
   `desktop-1366x768-feedback.png`, `desktop-1366x768-byok.png`
   (`store-listing-*.md` 세 파일에 이미 이 파일명으로 참조돼 있음 — 파일명 바꾸지 말 것).
6. **`node scripts/build-registry.js` 실행** — `meta.json`은 이미 있지만 `registry.js`
   재생성을 아직 안 했음(이번 세션에서 Gemini 검증에 막혀 후순위로 미룸).
7. 전부 통과하면 **git add + commit** (push는 회장 검토 후 지시에 따름 — 이번 세션은 커밋도
   안 하고 워킹트리 변경만 남겼음).

## 테스트 스크립트 위치 (재사용 가능)

이번 세션에서 쓴 Playwright 테스트 스크립트는 세션 스크래치패드에 있어 다음 세션엔 안 남아있을
수 있다 — 아래 요지를 참고해서 다시 짜면 된다:
- `webapp-testing` 스킬의 `scripts/with_server.py`로 `python3 -m http.server 8000 --bind 127.0.0.1`
  띄우고 그 위에서 테스트(반드시 `127.0.0.1:8000`을 쓸 것 — `localhost:8000`은 Worker
  `ALLOWED_ORIGINS`에 없어서 CORS로 막힘, 필요하면 `worker/index.ts`의 `ALLOWED_ORIGINS`에
  `http://localhost:8000`을 추가해도 됨).
- 등급 카드: `.grade-card[data-grade="kac|kpc|ksc"]`
- 시나리오 카드: `.scenario-card[data-scenario="..."]`, 페르소나 칩: `.persona-chip[data-persona="..."]`
- 시작 버튼: `#btn-start`(선택 조건) / `#btn-random`(무작위)
- 대화: `#msg-input` + `#send-btn`, 로딩 표시는 `.typing`(사라질 때까지 대기)
- 실패 시 재시도 버튼: `#retry-btn`(일반 오류) / `#key-fix-btn`(BYOK 키 오류)
- 세션 종료: `#btn-end-session`(최소 1턴 이상 보내야 보임)
- 피드백 로딩 완료: `.fb-overall` 셀렉터 등장 대기, 실패 시 `#retry-feedback-btn`
- BYOK 설정 모달 열기: `.gearbtn` 클릭 → `#ai-key-input`에 키 입력 → `#ai-key-save`

## 참고 — 이 공용 Gemini 키의 하루 한도 이슈

`gemini_api_key`(금고)가 무료 티어라 **모델당 하루 20회** 제한이 있고 여러 프로젝트가 공유한다.
비슷한 검증 작업을 할 때는 curl로 반복 확인하는 걸 최소화하고(특히 같은 날 여러 프로젝트를
동시에 테스트하지 않기), 가능하면 Playwright E2E 한 번으로 여러 걸 한꺼번에 확인하는 게 낫다.
유료 티어로 올리는 걸 검토할 가치가 있는지는 회장 판단 필요(비용 발생하므로 이 세션에서
임의로 진행하지 않음).
