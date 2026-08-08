# 나다그룹 (Nada Group HQ)

AI 직원들이 출근하고, 자리에 앉아 일하고, 회의실에 모이고, 사장실로 보고하러 오는 **픽셀 사무실**입니다.
진입하면 먼저 나다그룹 HQ 화면이 뜨고, 관계사 카드를 클릭하면 그 회사의 오피스로 들어갑니다
(지금은 나다컴퍼니1(신사업) 하나 — `src/HqApp.tsx` 참고).

원본은 **갓생맘 🎀**([@godseng.mom](https://www.instagram.com/godseng.mom/))이 만든 다운로드형 템플릿(Next.js + Cloudflare Workers)이고,
이 폴더는 그걸 이 모노레포의 배포 방식(GitHub Pages 정적 서빙)에 맞게 **순수 Vite + React SPA로 옮겨 심은 버전**입니다.
게임 로직(`src/game/`)은 원본 그대로이고, 서버가 있어야 하는 부분(Notion/Discord 발행)만 "정적 배포에는 없는 기능"으로
얌전히 비활성화되어 있습니다 — 화면은 원래 도구 철학대로 "미설정"으로 정상 표시됩니다.

라이브 주소: **https://tossneon.github.io/nada-group/play/**

Notion/Discord 발행 기능을 실제로 쓰려면 `worker/` 폴더의 Cloudflare Worker를 별도로 배포해야
합니다 — 자세한 건 [`worker/README.md`](worker/README.md) 참고. 배포 전에는 화면에
"미설정"으로 정상 표시됩니다.

---

## 로컬에서 돌려보기

```bash
cd nada-group
npm install
npm run dev
```

`http://localhost:5173`에서 열립니다.

## 내 회사로 바꾸기

**`src/company.config.ts` 파일 하나만 고치면 됩니다.** 다른 파일은 안 건드려도 돼요.

| 고칠 것 | 어디 |
|---|---|
| 회사 이름, 로고 글자, 화면 제목 | `COMPANY` |
| 대표(나) 이름·성격·머리색 | `CEO_PROFILE` |
| 부서 12개 이름·아이콘·하는 일 | `DEPARTMENTS` |
| 직원 이름·직책·색·혼잣말 | `STAFF_LIST` |
| "연동 대기"로 표시할 팀 | `PENDING_INTEGRATIONS` |
| 결과물 보관함 링크 | `STORAGE_LINK` |

### ⚠️ 딱 2가지만 지키세요

1. **부서 `id`는 바꾸지 마세요** (`research`, `brand`, `strategy1` …) — 시뮬레이션 엔진이 이 id로 캐릭터를 움직입니다.
   바꿔도 되는 건 `name`(부서 이름) · `icon` · `short` 입니다.
2. **부서는 12개를 유지하세요.** 사무실 배치가 4열 3행 = 12칸 고정입니다. 안 쓰는 부서는 지우지 말고 이름만 바꿔서 쓰세요.

직원 수는 자유입니다. 늘려도 줄여도 되고, 한 팀에 팀장(`lead`) 1명만 두면 됩니다.

## 배포하기 (수정 후 반영)

이 저장소는 정적 파일을 그대로 서빙합니다. `company.config.ts`나 게임 로직을 고쳤으면
빌드 산출물(`play/`)도 같이 커밋해야 라이브 사이트에 반영됩니다.

```bash
npm run build   # play/ 에 정적 산출물 생성 (base: './', circle-heroes와 동일 패턴)
```

그 다음 `nada-group/` 전체(소스 + `play/`)를 커밋하고 저장소 루트에서 push하면 끝입니다.

## 원본과 달라진 점

- Next.js(App Router) + Cloudflare Workers(wrangler, D1) → **순수 Vite + React SPA**로 재구성.
  `app/` 디렉토리·서버 컴포넌트·`worker/`·`db/`·`drizzle`·`.dev.vars` 등 서버 전용 코드는 제외했습니다.
- `/api/report`, `/api/integrations`(Notion·Discord 발행)는 서버가 없어서 로컬에서 바로
  "연동 미설정" 결과를 돌려주도록 `src/game/report.ts`만 손봤습니다. 나머지 게임 로직
  (`sim.ts`, `staff.ts`, `world.ts`, `pathfinding.ts`, `OfficeWorld.tsx`, `App.tsx`)은 원본과 동일합니다.
- Tailwind는 원본 스타터의 보일러플레이트였고 실제로 쓰이지 않아 뺐습니다 — 스타일은 전부
  `src/globals.css` / `src/office.css`의 손으로 짠 CSS입니다.
- Notion·Discord 발행은 `worker/`(별도의 초소형 Cloudflare Worker)로 다시 살렸습니다.
  화면(GitHub Pages)과 발행 서버(Cloudflare)를 분리해서, 기존 정적 배포 구조는 그대로 두고
  비밀키가 필요한 기능만 최소 범위로 얹었습니다.

자유롭게 쓰고 고치되, 무단 재판매는 하지 말아주세요. (원본 제작자 안내 그대로)
