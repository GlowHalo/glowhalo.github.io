# glowhalo6-coach-practice

`coach-practice/`(정적 페이지, GitHub Pages)의 "가상 고객 AI" 기능만 담당하는 아주 작은
Cloudflare Worker다. 화면은 그대로 GitHub Pages에 있고, 이 Worker는 브라우저가
크로스오리진으로 호출하는 `/chat`, `/feedback` 엔드포인트 두 개만 제공한다 — Gemini API 키는
여기(Cloudflare)에만 있고 브라우저로는 절대 전달되지 않는다.

`kpc-coach-chat`(AI가 코치)과 정반대: 여기서는 **AI가 가상 고객, 사람이 코치 역할**을
연습한다. 시스템 프롬프트는 AI가 절대 질문·조언하는 코치 역할을 하지 않도록 설계돼 있다.

## API

### `POST /chat`
```json
{
  "grade": "kac",
  "scenarioId": "career-change",
  "personaId": "defensive",
  "history": [ { "role": "client", "text": "..." }, { "role": "coach", "text": "..." } ]
}
```
응답:
```json
{ "text": "가상 고객의 대사" }
```
`grade`는 `kac`/`kpc`/`ksc`, `scenarioId`/`personaId`는 `index.ts` 안 `GRADE_DATA`에 정의된 값.

### `POST /feedback`
세션 종료 후 전체 대화(`history`, 위와 동일 형식)를 보내면, `role: "coach"` 발화만
ICF/KCA 핵심역량 6가지 기준으로 평가한 JSON을 돌려준다(턴별 코멘트 + 종합 강점/개선점 +
역량별 상/중/하 + 총평). 스키마는 `index.ts`의 `FEEDBACK_RESPONSE_SCHEMA` 참고.

## ⚠️ 2026-08-18 세션 인계 메모 — 미완료 검증

Worker는 배포 완료(`https://glowhalo6-coach-practice.tossneon.workers.dev`), `/chat`은 curl로
1회 실제 성공 응답 확인(AI가 코치 역할 안 하고 고객처럼 정상 반응). 그 이후 **우리 공용
`gemini_api_key`(무료 티어)의 일일 한도(모델당 하루 20회, `GenerateRequestsPerDayPerProjectPerModel-FreeTier`)가
Mindmap·kpc-coach-chat 체험 트래픽과 합쳐져 소진**돼서, 아래가 아직 실측 검증 안 됨:

- `/feedback` 엔드포인트 실제 성공 사례 없음(코드·스키마 리뷰만 완료)
- BYOK(브라우저→Google API 직접호출) CORS 실측 없음 — Worker 자체 CORS만 확인됨
- 전체 흐름(등급선택→대화→세션종료→피드백카드) E2E 미완료
- 다양한 등급/페르소나 조합 반복 검증 안 됨(현재 KAC/이직고민/방어적 1개 조합만 샘플 확보)

**다음 세션이 이어받을 때**: 쿼터가 리셋된 뒤(하루 단위) 위 4가지부터 Playwright로 마저 검증하고,
전부 통과하면 `app-portfolio/README.md`의 배포 전 게이트 기준으로 최종 READY 판정할 것. 구조적으로
공용 무료 키 하나로 여러 앱의 "체험" 트래픽을 감당하기 벅차다는 게 이번에 드러났으니, 유료 티어
전환 여부를 회장에게 물어볼 필요가 있음(비용 승인 필요 — `app-portfolio/execution/코칭연습앱-시장조사.md`와
무관하게 인프라 공용 이슈).

## 처음 배포하기

### 1. 배포
```bash
cd coach-practice/worker
npm install
CLOUDFLARE_API_TOKEN=<Workers Scripts:Edit 토큰> npx wrangler deploy
```
성공하면 `https://glowhalo6-coach-practice.<subdomain>.workers.dev` 형태의 주소가 출력된다.

### 2. 비밀값 등록 — `tossneon-api-vault`가 유일한 정본
이 저장소 전체가 비밀값을 하나의 금고(`tossneon-api-vault`)에서만 관리한다. 절차는
[`.claude/rules/cloudflare-vault.md`](../../.claude/rules/cloudflare-vault.md) 참고, 요약하면:
```bash
curl -s "$VAULT_URL/secrets/gemini_api_key" -H "Authorization: Bearer $VAULT_TOKEN"
CLOUDFLARE_API_TOKEN=<토큰> npx wrangler secret put GEMINI_API_KEY
```

## 로컬 테스트
```bash
cp .dev.vars.example .dev.vars   # 값 채우기
npm run dev                       # http://localhost:8787
```

## 왜 coach-practice 본체와 따로 배포하나
- 화면(정적 파일)은 GitHub Pages, 비밀키가 필요한 기능만 Cloudflare — 두 인프라를 최소로만 섞는다.
- 이 저장소의 다른 프로젝트에 영향이 없다. 이 폴더가 통째로 사라져도 나머지는 그대로 작동한다.
