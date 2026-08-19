---
name: app-store-deploy
description: GlowHalo 6(앱 개발·배포) 앱을 준비된 유통채널(Amazon Appstore, Microsoft Store PWA, itch.io, 추후 Google Play)에 실제로 제출·갱신할 때 쓰는 런북. "앱 배포", "스토어 제출", "APK 서명/키스토어", "PWA MSIX 패키징", "itch.io butler push", "Amazon 앱스토어 API" 같은 말이 나오면 발동.
---

# 앱 배포 런북 (GlowHalo 6)

`app-portfolio/` 아래 앱을 실제 채널에 올릴 때 쓴다. 채널별 계정은 전부 `.claude/rules/cloudflare-vault.md`
금고에 등록돼 있음 — 회장에게 다시 묻지 말고 `GET $VAULT_URL/secrets/<name>`으로 조회한다.

## 실사용 중인 앱은 원본 대신 `-deploy` 사본에서 작업 (2026-08-17 회장 지시)

회장이 매일 실제로 쓰는 앱(`app-portfolio/README.md`의 "실사용 여부 확인" 표에서 실사용으로 표시된 것)은
배포 전 개선 작업이라도 **원본 폴더를 절대 건드리지 않는다.** 대신:

1. 원본을 `<앱폴더>-deploy/`로 복사한다.
2. `<앱폴더>-deploy/meta.json`은 **만들지/두지 않는다** — `build-registry.js`가 meta.json 있는 폴더를 전부
   루트 허브에 카드로 노출시키므로, 사본이 원본과 나란히 중복 노출되는 걸 막기 위함이다.
3. 개선 작업(죽은 코드 정리, PWA 요건 추가, 설정값 일반화 등)은 이 `-deploy` 사본에서만 진행한다.
4. PWABuilder MSIX 패키징·스토어 제출은 `-deploy` 사본의 라이브 URL(`https://glowhalo.github.io/<앱폴더>-deploy/`)을 대상으로 한다.
5. 사본 폴더 안에 `README.md`로 "원본은 `../앱폴더/`, 이건 배포용 사본" 한 줄을 남겨 헷갈리지 않게 한다.

실사용 여부가 불확실하면 먼저 회장에게 확인 — 실사용 중인 앱에 이 절차 없이 바로 손대면 안 된다.

## 배포 전 게이트 — 반드시 먼저 통과

**완성도 기준 미달 앱은 채널에 올리지 않는다** (2026-08-17 회장 지시). 아래 중 하나라도 해당하면 배포 보류하고 먼저 고친다:
- 버튼/기능이 실제로 동작 안 하는데 동작하는 척하는 목업이 있다 (예: 가짜 "공유됨" 애니메이션만 있고 실제 동기화 없음)
- 회장 개인 전용으로 쓰던 흔적(하드코딩된 개인 데이터·주소·계좌 등)이 남아있다
- 디버깅/스캐폴딩 상태에서 멈춘 핵심 기능이 있다 (예: API 연동 자리만 있고 실제 호출 코드가 없음)
- 죽은 코드·안 쓰는 파일이 배포 대상에 섞여 있다

통과 여부가 애매하면(예: 데이터가 일부만 실측치고 나머지는 추정치인데 앱이 그걸 정직하게 고지하는 경우처럼)
"거짓으로 완성된 척하는가"를 기준으로 판단 — 정직하게 한계를 고지한 프로토타입은 통과, 몰래 목업을 실제인
척하는 건 불통과. 판단이 갈리면 회장에게 짧게 확인한다.

## 채널별 배포 절차

### itch.io — Butler CLI (완전 자동, 계정 이미 있음)

이미 A2(PromptDeck)에서 검증된 패턴. `itchio_api_key` 금고 값으로 바로 동작.

```bash
# butler 없으면 설치
curl -L -o butler.zip https://broth.itch.zone/butler/linux-amd64/LATEST/archive/default
unzip butler.zip -d butler && chmod +x butler/butler

# 로그인 (API 키를 환경변수로)
# itch.io 사용자명은 nadacompany(2026-08-15 변경, 2026-08-22까지 재변경 불가 — GlowHalo 개명 후 glowhalo로 재변경 예정)
BUTLER_API_KEY=<vault: itchio_api_key> ./butler/butler push <빌드경로> nadacompany/<프로젝트슬러그>:<채널명>
# 예: ./butler/butler push circle-heroes.apk nadacompany/circle-heroes:android
```

**주의**: 프로젝트 페이지 자체(예: `itch.io/game/new`)는 API로 못 만든다 — 회장이 웹폼으로 1회 생성해야
그 이후부터 butler push가 먹힌다. 페이지 존재 여부는 `hq/가입대기.md`에서 추적.

### Amazon Appstore — App Submission API

계정+신원확인(IDV) 완료(`amazon_developer_login_*`, 2026-08-17). **API 호출 전 1회 필요한 것**:
Amazon Developer Console(`developer.amazon.com`)에서 Security Profile을 만들어 `client_id`/`client_secret`을
발급받아야 한다 — 로그인 계정은 이미 있으므로 이 절차 자체는 Claude가 로그인해서 진행 가능(신규 가입이
아니라 이미 있는 계정의 설정 작업). 발급되면 금고에 `amazon_appstore_client_id`/`amazon_appstore_client_secret`
으로 등록.

```bash
# OAuth 토큰 발급
curl -X POST https://api.amazon.com/auth/o2/token \
  -d "grant_type=client_credentials&client_id=<id>&client_secret=<secret>&scope=appstore::apps:readwrite"

# 앱 목록/제출 — App Submission API 문서: https://developer.amazon.com/docs/app-submission-api/
```

### Microsoft Store (PWA) — PWABuilder → MSIX → Partner Center

계정 가입 완료(`microsoft_partner_login_*`, 2026-08-17). 웹앱을 그대로 못 올리고 **MSIX 패키지로 변환**해야
한다.

1. https://www.pwabuilder.com/ 에 라이브 URL(`https://glowhalo.github.io/<앱>/`) 입력 → 매니페스트 점수 확인
   (installable PWA가 아니면 먼저 `manifest.json` + 서비스워커부터 붙여야 함 — 이게 안 된 앱이 여럿 있음,
   아래 "배포 전 게이트" 참고)
2. "Package for Stores" → Windows 탭에서 MSIX 다운로드 (Partner Center 신규 앱이면 예약된 앱 이름 필요 —
   `microsoft_partner_login_*`로 로그인해 Partner Center에서 앱 이름 예약 1회)
3. 최초 제출은 Partner Center 웹 UI에서 수동(1회, 로그인 자동화 가능). 이후 갱신은 Microsoft Store
   Submission API(Azure AD 앱 등록 필요, tenant/client id/secret 발급 후 금고에
   `microsoft_store_api_client_id`/`_secret`/`_tenant_id`로 등록) — 아직 발급 전이면 이 절차부터 먼저 진행.

### Google Play Console — 후순위 (유료, 보류 중)

`hq/가입대기.md`에서 "후순위 — 유료 플랫폼"으로 관리. 재개 시 `google_login_*`(자동화 전용 계정, 용도란에
이미 "구글 플레이 콘솔 등"으로 지정돼 있음) 사용. 가입 자체(신분증·전화·기기인증)는 회장 물리적 개입 필수 —
`app-portfolio/execution/유통채널-리서치.md` 참고.

### Circle Heroes 릴리스 서명 (Android APK)

정식 스토어(Amazon/itch.io Android)에 올리려면 디버그 APK가 아니라 릴리스 서명 APK가 필요.

```bash
keytool -genkey -v -keystore circleheroes-release.keystore -alias circleheroes \
  -keyalg RSA -keysize 2048 -validity 10000
```

**키스토어 파일과 비밀번호는 절대 커밋 금지** — 저장소가 공개다. 키스토어는 base64 인코딩해서 금고에
`circleheroes_release_keystore_base64`로, alias/비밀번호는 `circleheroes_keystore_password`로 등록하고,
GitHub Actions 빌드에서는 금고에서 조회해 빌드 시점에만 파일로 복원한다. **키스토어를 잃어버리면 같은
패키지 ID로 다시는 업데이트를 못 올리니(스토어가 서명 불일치를 거부) 절대 로컬에만 두지 않는다.**

## 참고

- 각 앱의 완성도 재점검 상세: [`../../app-portfolio/candidates.md`](../../app-portfolio/candidates.md)
- 채널 리서치 원본: [`../../app-portfolio/execution/유통채널-리서치.md`](../../app-portfolio/execution/유통채널-리서치.md)
- 계정/가입 현황 정본: [`../../hq/가입대기.md`](../../hq/가입대기.md)
