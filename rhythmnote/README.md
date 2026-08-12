# 리듬노트 (RhythmNote)

나다컴퍼니9(신사업 서칭) E1 — 웨어러블 헬스데이터 AI 웰니스 인사이트 리포트.
경영 의사결정·진행 상황은 [`company9/execution/E1-웰니스리포트.md`](../company9/execution/E1-웰니스리포트.md)가 정본. 이 문서는 코드/운영 방법만.

라이브: `https://tossneon.github.io/rhythmnote/`

## 지금 상태 — 무료 베타 (2026-08-12)

결제(Gumroad 발행)는 아직 시작하지 않았다. 랜딩페이지에서 무료로 업로드를 받아 파이프라인을 검증하는 중.
실제 유료 전환은 회장 확인 후 진행([E1 실행 로그](../company9/execution/E1-웰니스리포트.md) "다음에 회장에게 확인받을 것" 참고).

## 구조

```
index.html          랜딩페이지 + 업로드 폼 (GitHub Pages, 정적)
worker/              업로드 인테이크 Cloudflare Worker (배포됨: rhythmnote-intake.tossneon.workers.dev)
scripts/             배치 처리 스크립트 (다연이 저녁에 실행)
templates/           리포트 작성 골격
data/                (gitignore) 추출한 고객 파일 — PII, 절대 커밋 금지
```

## 파이프라인 — 신규 제출 처리 순서

```bash
cd rhythmnote

# 0. 최초 1회: .env에 CLOUDFLARE_API_TOKEN 설정 (금고 cloudflare_api_token 값)
echo "CLOUDFLARE_API_TOKEN=..." > .env

# 1. 처리 대기 중인 제출 확인
node scripts/list-submissions.mjs --pending

# 2. 특정 제출의 첨부파일을 data/<id>/ 로 복원 (읽어서 직접 분석)
node scripts/list-submissions.mjs --extract <id>

# 3. templates/report-template.md 골격을 따라 data/<id>/report.md 작성 (다연이 직접 분석·집필)

# 4. 마크다운 → PDF
node scripts/render-report-pdf.mjs data/<id>/report.md data/<id>/report.pdf

# 5. 발송 (기본은 dry-run — 실제로는 안 보내고 미리보기만 출력)
node scripts/send-report.mjs --to <고객이메일> --pdf data/<id>/report.pdf
# 실제 발송(도메인 인증 후에만 임의 고객 이메일 발송 가능):
node scripts/send-report.mjs --to <고객이메일> --pdf data/<id>/report.pdf --send

# 6. 상태 갱신
node scripts/mark-status.mjs <id> delivered
```

## Worker 배포

```bash
cd rhythmnote/worker
CLOUDFLARE_API_TOKEN=$(금고에서 조회) npx wrangler deploy
```

시크릿(`RESEND_API_KEY`, `NOTIFY_EMAIL`)은 이미 배포 시점에 등록됨 — 재배포는 코드만 바뀌면 됨.

## 알려진 제약

- **R2 미사용**: 계정에서 R2 활성화(대시보드 약관 동의)가 안 돼 있어(2026-08-12 확인, Cloudflare API code 10042) 업로드 파일을 R2 대신 KV에 base64로 직접 저장한다. 트래픽이 늘면 R2 활성화를 회장에게 요청하고 전환.
- **고객 이메일 발송 불가(도메인 미인증)**: Resend 발신 도메인이 아직 인증 전이라 계정 소유자 본인 이메일(`tossneon0@gmail.com`)에만 실제 발송이 된다. company4(Reflect Lab)와 공유하는 이슈 — 상세는 E1 실행 로그.
