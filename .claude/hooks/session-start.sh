#!/usr/bin/env bash
# SessionStart 훅 — 컨테이너가 세션마다 새로 만들어지므로, 저장소 작업에 필요한
# 전역 바이너리·플러그인을 여기서 채운다. 이미 있으면 건너뛰므로 재실행해도 안전하다.
#
# 실패해도 세션은 계속 진행돼야 하므로 어떤 경우에도 0으로 종료한다.
#
# 2026-08-17 추가 — 이 훅 자체가 지금까지 .claude/settings.json 에 등록이 안 돼 있어
# 한 번도 자동 실행된 적이 없었다(발견: 나다컴퍼니10 세션). settings.json 에 SessionStart
# 등록을 같이 추가했으니 이제부터는 매 세션 시작 시 실행된다.
set -u

# typescript-lsp 플러그인이 쓰는 언어서버. 저장소에 .ts/.tsx 45개가 있고
# 이게 있어야 편집 직후 타입 오류가 자동으로 잡힌다. (설치 ~2초)
if ! command -v typescript-language-server >/dev/null 2>&1; then
  npm i -g typescript-language-server typescript >/dev/null 2>&1 \
    && echo "[session-start] typescript-language-server 설치 완료" \
    || echo "[session-start] typescript-language-server 설치 실패 (타입 진단 없이 진행)"
fi

# 이 저장소가 쓰기로 확정한 공식 플러그인 5종 — 컨테이너가 세션마다 새로 만들어지는
# 이 환경에서는 마켓 등록·설치가 자동으로 이어지지 않아(2026-08-17 나다컴퍼니10 세션에서
# 발견 — `claude plugin list`가 매번 빈 목록) 여기서 명시적으로 설치한다.
# 이미 설치돼 있으면 각 명령이 빠르게 스킵한다.
if command -v claude >/dev/null 2>&1; then
  claude plugin marketplace add anthropics/claude-plugins-official >/dev/null 2>&1
  for plugin in claude-security resend pyright-lsp typescript-lsp cloudflare; do
    claude plugin install "${plugin}@claude-plugins-official" --scope project >/dev/null 2>&1 \
      && echo "[session-start] 플러그인 설치 확인: ${plugin}" \
      || echo "[session-start] 플러그인 설치 실패(건너뜀): ${plugin}"
  done
fi

exit 0
