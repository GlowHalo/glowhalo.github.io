# F. 갤럭시워치 워치페이스 — Facer 채널 착수 로그

`candidates.md` Round 3(2026-08-18)의 대안 ②(Facer)를 실제로 착수한 실행 기록. 회장 지시: "2로 성과를 검증해와. 1(구글 플레이)은 적정 시점에 확장."

## 2026-08-18 — 계정 가입 시도, reCAPTCHA 봇탐지로 차단

**진행**:
1. facer.io는 이 세션의 로컬 Chromium이 프록시를 거치면 TLS 핸드셰이크 단계에서 리셋되는 기존 이슈(`niche-templates/execution/헤드리스브라우저-프록시-이슈.md`)에 그대로 걸림 — `example.com`으로 재현 확인 후 반복 시도하지 않고 곧장 문서화된 해결책(Cloudflare Browser Rendering, 실패 시 Browserbase 폴백)으로 전환.
2. `chromium.connectOverCDP`로 Cloudflare Browser Rendering 연결 성공, `facer.io` 정상 로드 확인.
3. `/signup` 폼(이름·이메일·비밀번호·비밀번호 확인) 확인 — 표준 자동화 계정(`tossneon0@gmail.com`, displayName `nadacompany`, 표준 비밀번호)으로 입력·제출.
4. **결과: "Recaptcha bot error" — 가입 자체가 서버단에서 거부됨.** 계정은 생성되지 않은 것으로 보임(폼이 에러와 함께 그대로 재표시).

**판단**: CLAUDE.md 2026-08-11~12 정책의 예외 사유 (1) "캡차/사람인지 확인 등 실제로 막히는 경우(우회 시도 안 함)"에 정확히 해당 — 우회 시도하지 않고 중단. Cloudflare Browser Rendering의 공유 IP·헤드리스 CDP 연결 자체가 reCAPTCHA v3의 위험 신호로 잡혔을 가능성이 높음(같은 인프라가 다른 사이트에서 Turnstile 풀페이지 챌린지에 걸렸던 기존 패턴과 일치, `헤드리스브라우저-프록시-이슈.md`의 "패턴 1" 참고). 회장이 본인 브라우저로 직접 가입하면 이 신호가 없어 정상 통과할 가능성이 높음(캡차가 invisible v3라 일반적인 사람 사용에는 체감되는 절차 자체가 거의 없음).

**다음 액션(회장 확인 필요)**: [facer.io/signup](https://www.facer.io/signup)에서 직접 1회 가입 요청 — 이메일 `tossneon0@gmail.com`, 표준 비밀번호(금고 `standard_login_password`) 사용 권장(다른 자동화 계정들과 통일). 가입 완료 알려주시면 그 뒤 워치페이스 디자인·게시는 이어서 자동 진행.

**부수 확인 — 재사용 가치 있는 인프라 사실**: 이 세션에서도 로컬 Chromium 프록시 이슈가 재현됐고, Cloudflare Browser Rendering 우회가 여전히 유효함을 재검증. 새로 마주치는 세션은 로컬 Chromium 재시도(전부 실패 확인됨) 대신 바로 `헤드리스브라우저-프록시-이슈.md`의 CDP 연결 스니펫으로 갈 것.
