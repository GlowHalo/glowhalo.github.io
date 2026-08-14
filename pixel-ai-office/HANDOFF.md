# pixel-ai-office 진행 상황 핸드오프

새 세션에서 이어서 작업할 때 이 파일부터 읽으세요. (`git log --oneline -- pixel-ai-office`로
지금까지의 실제 변경 이력도 같이 훑어보면 좋습니다.)

## 지금 상태 (완료됨)

- 구글드라이브 zip("갓생맘 AI OFFICE", 원본 Next.js+Cloudflare Workers 템플릿)을
  GitHub Pages 정적 SPA로 이식 완료. 라이브: **https://tossneon.github.io/pixel-ai-office/play/**
- `src/game/` 안의 시뮬레이션 로직(sim.ts/staff.ts/world.ts/pathfinding.ts/OfficeWorld.tsx)은
  원본 그대로 옮김. `worker/`, `db/`, `.dev.vars` 등 서버 전용 코드는 제외.
- 배경을 세련된 남색으로 변경 (`src/globals.css`의 `--pink-bg`/`--pink-line` 값만 교체,
  변수명은 그대로 — 다른 곳에서 다 참조 중이라 리네임 안 함).
- `company.config.ts`의 `COMPANY`/`CEO_PROFILE`만 커스터마이즈:
  - 회사 이름 "새사업 스튜디오", 대표 캐릭터 이름 "대표님"
  - 이 회사는 **회장님이 직접 CEO로 뛰는, `niche-templates/`(A1 등 AI 사장 정연이 이끄는 사업)와는
    완전히 별개인 신규 탐색형 사업**이라는 게 확정된 맥락. 사업 내용은 아직 미정 —
    "사업기회 발굴부터 시작" 단계.
- Notion/Discord 발행용 소형 Cloudflare Worker(`worker/`) 코드는 작성 완료했지만
  **아직 배포 전** (아래 "미완료 작업 1" 참고).

## 미완료 작업 1 — Cloudflare Worker 배포

- 코드는 `pixel-ai-office/worker/`에 이미 있음. 절차는 `worker/README.md` 참고.
- 이 세션(원격 실행 환경)의 네트워크 정책이 `api.cloudflare.com`을 막고 있어서
  `wrangler deploy`가 여기선 안 됨 (403 policy denial, 프록시 설정 문제 아님).
- 회장님이 API 토큰까지 한 번 주셨었는데(`cfat_...`), 배포에 못 써서 그 자리에서 환경변수만
  지웠음 — **토큰은 저장된 곳 없음, 다시 받아야 함.**
- 진행하려면 둘 중 하나:
  1. 이 원격 환경의 네트워크 정책에 `api.cloudflare.com` 허용 추가 후 새 세션 시작
     (claude.ai/code → 환경 설정 → 네트워크 정책)
  2. 회장님 로컬 PC에서 `cd pixel-ai-office/worker && npm install && npx wrangler deploy` 직접 실행
- 배포 후 나오는 workers.dev 주소를 `src/game/report.ts`의 `WORKER_URL` 상수에 넣고
  `npm run build` 다시 → `play/` 재커밋해야 화면에서 실제로 그 Worker를 호출함.

## 완료됨 — sim.ts 시뮬레이션 서사를 "사업기회 발굴"에 맞게 다시 쓰기 (2026-08-07)

부서 12개 매핑, `sim.ts`(PHASES/BLOCK_REASON/DEPT_KEYWORDS/dayScript/conveneScene/briefScene),
`company.config.ts`(DEPARTMENTS/STAFF_LIST/PENDING_INTEGRATIONS), `report.ts`,
`App.tsx`(승인 카드·대시보드 카피·결과물창고·footer·placeholder), `index.html`(제목/설명),
`worker/report.ts`(라벨·footer)까지 전부 "사업기회 발굴 → 검증 실험(랜딩/인터뷰)" 흐름으로
교체 완료. Playwright로 승인 흐름·CEO 콘솔 질의응답·대시보드·최종 브리핑까지 실제 확인함.

**남은 잔가지**: `public/og.png`(소셜 공유 미리보기 이미지)에 원본 제작자 브랜딩
("GODSENG AI COMPANY")이 픽셀아트로 박혀 있음 — 이미지 파일이라 텍스트 치환이 아니라
재생성이 필요해서 이번 작업 범위에서 제외함. 다음에 손볼 것.

사업이 여러 개로 늘어날 때 조직을 어떻게 키울지는 `GROWTH-STRUCTURE.md`에 별도로 정리함
(스튜디오 체계 / 신사업팀→사업부서 승격 / 관계사 오피스 복제 3단계 로드맵).

## (참고, 아래는 작업 시작 전 남겼던 원래 메모) sim.ts 시뮬레이션 서사를 "사업기회 발굴"에 맞게 다시 쓰기

### 왜 필요한가
`company.config.ts`로 바꿀 수 있는 건 부서 12개의 `name`/`icon`/`short`/`task`/`report`뿐이다.
**실제 하루 시뮬레이션 스토리(타임라인 문구, 회의 대사, 로그 문장)는 `src/game/sim.ts`에
"1인 콘텐츠 크리에이터가 릴스·카드뉴스를 만드는 흐름"으로 하드코딩**되어 있어서,
부서 라벨만 새로 지으면 카드 텍스트와 실제 채팅/로그 문구가 서로 안 맞게 된다.
지금은 그래서 부서 라벨을 원본 그대로(시장조사/브랜드/아이디어/QA/대본/릴스/캐러셀/파트너/
재무/리뷰/운영/비서) 뒀고, "콘텐츠 발행으로 사업기회를 검증한다"는 흐름으로 눈속임 중.

### 부서 id 12개 (이건 코드 전반에서 참조하므로 절대 이름 자체를 바꾸면 안 됨)
`research`, `brand`, `strategy1`, `qa`, `strategy2`, `reels`, `carousel`, `partner`,
`finance`, `review`, `ops`, `secretary`

### 고쳐야 할 위치 (전부 `src/game/sim.ts`)
1. **`PHASES` 배열 (약 128~142행)** — 화면 상단 타임라인 바에 그대로 노출되는 문구.
   지금: `"시장조사" → "브랜드 분석" → "아이디어 10개" → "브랜드 QA" → "TOP 3 선정" →
   "대표 승인 대기" → "대본 작성" → "릴스·캐러셀 제작" → "Notion 저장" → "김비서 브리핑"`.
   `App.tsx`에서도 이 배열을 그대로 import해서 씀.
2. **`BLOCK_REASON` (약 146~149행)** — brand/partner/finance가 "연동 대기"로 멈춰있는 이유
   설명 문구. 지금은 Instagram/Gmail/재무파일 연동 얘기.
3. **`DEPT_KEYWORDS` (약 152~166행)** — CEO 지시창에서 자연어로 부서를 찾을 때 쓰는 키워드+
   기본 직원 이름(김서연/박보라/최아름/한도빈/송리원/이가림/정파랑/오재민/강성아/안도현/
   김세리/윤규아) 목록. `STAFF_LIST`를 새로 지으면 여기 이름도 맞춰 갱신해야 이 기능이 안 깨짐.
4. **`dayScript()` 제너레이터 (약 359~570행, 약 210줄)** — 하루 전체 시나리오 본체.
   `runDept()`/`meeting()`/`deliver()`를 호출하며 회의 제목·대사·로그 문구를 전부
   하드코딩으로 박아넣은 곳. 예: `TOP 3 정리했어요. 1위는 92점!`,
   `릴스 대본 넘길게요. 30초 컷이에요.` 등. **여기가 재작성의 핵심 몸통.**
5. **`conveneScene()`/`briefScene()` (약 890~1000행대)** — 대표 승인 회의, 비서 브리핑 장면의
   대사. 이것도 콘텐츠 제작 맥락 대사가 섞여 있을 가능성 높음, 확인 필요.
6. **`src/App.tsx` 556행 근처** — 지시창 placeholder 문구
   `"예: 캐러셀팀 지금 뭐해? / 왜 늦어져?"`도 콘텐츠 제작 용어라 같이 손볼 대상.

### 진행 방법 제안
1. 먼저 회장님과 함께 "사업기회 발굴" 하루 흐름을 12개 부서 id에 매핑한 구체적인 스토리보드부터
   정한다 (예: research=시장 스캔, strategy1=아이디어 10개 발산, qa=리스크 점검,
   strategy2=최소 실행안 설계, reels/carousel=실행 A/B 트랙, brand=포지셔닝,
   partner=제휴 후보, finance=예산, review=회고, ops=운영 자동화, secretary=비서 브리핑 —
   지난 세션에서 이 매핑안을 한 번 제안했었음, 대화 로그 참고 가능하면 재사용).
2. 위 1~6 순서대로 문자열을 교체한다. `PHASES`부터 하면 전체 흐름이 눈에 보여서 순서 잡기 쉬움.
3. `npm run build` 후 Playwright로 스크린샷 찍어서 "오늘 업무 시작하기" 눌러보고 로그/대사가
   새 서사와 앞뒤가 맞는지 실제로 확인. (이 세션에서 썼던 방법:
   `NODE_PATH=/opt/node22/lib/node_modules node -e "...playwright..."`,
   Chromium 실행파일 경로는 `/opt/pw-browsers/chromium`.)
4. `company.config.ts`의 `STAFF_LIST`/`DEPARTMENTS`도 새 서사에 맞춰 같이 갱신.
5. 커밋 후 `master`에 병합·push (이 저장소는 push하면 GitHub Pages가 자동 재배포,
   보통 1~2분 걸림 — 이 세션 환경은 `tossneon.github.io`로도 아웃바운드가 막혀 있어서
   라이브 확인은 회장님이 직접 브라우저로 해줘야 했음).

## 참고 — 이 세션에서 확인한 환경 제약
- 이 원격 실행 환경은 `api.cloudflare.com`, `tossneon.github.io` 둘 다 아웃바운드 정책상 막혀있음
  (프록시 상태: `curl -sS http://127.0.0.1:35159/__agentproxy/status`로 확인 가능).
  다음 세션이 같은 환경이라면 동일하게 막혀 있을 가능성 높음 — 안 되면 재시도하지 말고
  회장님께 환경 네트워크 정책 변경 또는 로컬 실행을 요청할 것.
