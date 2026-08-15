#!/usr/bin/env bash
# SessionStart 훅 — 컨테이너가 세션마다 새로 만들어지므로, 저장소 작업에 필요한
# 전역 바이너리를 여기서 채운다. 이미 있으면 건너뛰므로 재실행해도 안전하다.
#
# 실패해도 세션은 계속 진행돼야 하므로 어떤 경우에도 0으로 종료한다.
set -u

# typescript-lsp 플러그인이 쓰는 언어서버. 저장소에 .ts/.tsx 45개가 있고
# 이게 있어야 편집 직후 타입 오류가 자동으로 잡힌다. (설치 ~2초)
if ! command -v typescript-language-server >/dev/null 2>&1; then
  npm i -g typescript-language-server typescript >/dev/null 2>&1 \
    && echo "[session-start] typescript-language-server 설치 완료" \
    || echo "[session-start] typescript-language-server 설치 실패 (타입 진단 없이 진행)"
fi

exit 0
