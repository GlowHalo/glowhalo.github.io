#!/usr/bin/env bash
# Cloudflare Secrets Store("금고") 동기화 스크립트.
#
# 이 저장소의 모든 Worker가 쓰는 비밀값을 프로젝트마다 따로 등록하지 않고,
# Cloudflare 계정 하나에 있는 공용 Secrets Store 하나에 몰아넣는다.
# 이미 등록된 이름은 건너뛰고, 새로운 이름만 값을 물어서(또는 로컬 .dev.vars에서 읽어서) 등록한다.
# 그래서 몇 번을 다시 실행해도 안전하다 (idempotent) — 이미 있는 걸 또 물어보지 않는다.
#
# 사용법:
#   CLOUDFLARE_API_TOKEN=<Secrets Store Write 권한 토큰> ./scripts/sync-vault.sh
#   ./scripts/sync-vault.sh EXTRA_SECRET_NAME1 EXTRA_SECRET_NAME2   # 새 이름 추가 등록
#
# 필요한 API 토큰 권한: Account > Secrets Store > Edit (Write)
#   발급: https://dash.cloudflare.com/profile/api-tokens → Create Token → Custom
#
# 자세한 배경: .claude/rules/cloudflare-vault.md

set -euo pipefail

VAULT_STORE_NAME="${VAULT_STORE_NAME:-tossneon-vault}"
API="https://api.cloudflare.com/client/v4"

# pixel-ai-office/worker 안에서 실행해도, 저장소 루트에서 실행해도 되게 경로를 스스로 찾는다.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WRANGLER_TOML="$WORKER_DIR/wrangler.toml"
DEV_VARS="$WORKER_DIR/.dev.vars"

# 기본으로 등록할 이름들 — 이 목록이 "금고에 뭐가 들어있어야 하는지"의 정본이다.
# 새 프로젝트가 비밀값이 필요해지면 여기 이름을 추가하고 다시 실행하면 된다.
DEFAULT_SECRETS=(NOTION_TOKEN NOTION_BRIEFING_DB DISCORD_WEBHOOK_URL)
SECRET_NAMES=("${DEFAULT_SECRETS[@]}" "$@")

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "❌ CLOUDFLARE_API_TOKEN 이 없다." >&2
  echo "   Secrets Store Write 권한의 Cloudflare API 토큰을 환경변수로 넣고 다시 실행하세요." >&2
  echo "   (Claude Code 세션이라면 저장소가 아니라 '환경(Environment)' 설정에 넣어야 세션이 바뀌어도 유지됩니다.)" >&2
  exit 1
fi
command -v jq >/dev/null || { echo "❌ jq 가 필요합니다 (brew install jq / apt-get install jq)." >&2; exit 1; }
command -v curl >/dev/null || { echo "❌ curl 이 필요합니다." >&2; exit 1; }

cf() { # cf METHOD PATH [BODY]
  local method="$1" path="$2" body="${3:-}"
  if [ -n "$body" ]; then
    curl -sS -X "$method" "$API$path" \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      -H "Content-Type: application/json" \
      --data "$body"
  else
    curl -sS -X "$method" "$API$path" \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN"
  fi
}

fail_if_error() { # fail_if_error RESPONSE_JSON LABEL
  local resp="$1" label="$2"
  if [ "$(echo "$resp" | jq -r '.success')" != "true" ]; then
    echo "❌ $label 실패:" >&2
    echo "$resp" | jq -r '.errors[]?.message' >&2
    exit 1
  fi
}

# ── 1. 계정 결정 ─────────────────────────────────────────────
if [ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  ACCOUNT_ID="$CLOUDFLARE_ACCOUNT_ID"
else
  accounts_resp="$(cf GET /accounts)"
  fail_if_error "$accounts_resp" "계정 조회"
  count="$(echo "$accounts_resp" | jq '.result | length')"
  if [ "$count" -eq 1 ]; then
    ACCOUNT_ID="$(echo "$accounts_resp" | jq -r '.result[0].id')"
  else
    echo "⚠️  계정이 여러 개(또는 0개) 조회됩니다. CLOUDFLARE_ACCOUNT_ID 를 지정하세요:" >&2
    echo "$accounts_resp" | jq -r '.result[] | "  \(.id)  \(.name)"' >&2
    exit 1
  fi
fi
echo "✅ 계정: $ACCOUNT_ID"

# ── 2. 금고(Store) 확인/생성 ──────────────────────────────────
stores_resp="$(cf GET "/accounts/$ACCOUNT_ID/secrets_store/stores")"
fail_if_error "$stores_resp" "스토어 목록 조회"
STORE_ID="$(echo "$stores_resp" | jq -r --arg name "$VAULT_STORE_NAME" '.result[] | select(.name == $name) | .id' | head -1)"

if [ -z "$STORE_ID" ]; then
  echo "🆕 '$VAULT_STORE_NAME' 스토어가 없어서 새로 만듭니다."
  create_resp="$(cf POST "/accounts/$ACCOUNT_ID/secrets_store/stores" "$(jq -n --arg name "$VAULT_STORE_NAME" '{name:$name}')")"
  fail_if_error "$create_resp" "스토어 생성"
  STORE_ID="$(echo "$create_resp" | jq -r '.result.id')"
fi
echo "✅ 금고: $VAULT_STORE_NAME ($STORE_ID)"

# ── 3. 이미 등록된 이름 조회 ───────────────────────────────────
existing_resp="$(cf GET "/accounts/$ACCOUNT_ID/secrets_store/stores/$STORE_ID/secrets")"
fail_if_error "$existing_resp" "시크릿 목록 조회"
EXISTING_NAMES="$(echo "$existing_resp" | jq -r '.result[].name')"

# ── 4. 없는 이름만 값 받아서 등록 ────────────────────────────
for name in "${SECRET_NAMES[@]}"; do
  if echo "$EXISTING_NAMES" | grep -qx "$name"; then
    echo "↷  $name — 이미 금고에 있어서 건너뜀 (값을 다시 물어보지 않음)"
    continue
  fi

  value=""
  if [ -f "$DEV_VARS" ]; then
    value="$(grep -E "^${name}=" "$DEV_VARS" 2>/dev/null | head -1 | cut -d= -f2-)"
  fi
  if [ -z "$value" ]; then
    read -rsp "🔑 $name 값을 입력하세요 (건너뛰려면 Enter): " value
    echo
  fi
  if [ -z "$value" ]; then
    echo "⏭  $name — 값이 없어 건너뜀. 나중에 값이 생기면 이 스크립트를 다시 실행하세요."
    continue
  fi

  body="$(jq -n --arg name "$name" --arg value "$value" \
    '[{name: $name, value: $value, scopes: ["workers"]}]')"
  create_secret_resp="$(cf POST "/accounts/$ACCOUNT_ID/secrets_store/stores/$STORE_ID/secrets" "$body")"
  fail_if_error "$create_secret_resp" "$name 등록"
  echo "✅ $name — 금고에 등록 완료"
done

# ── 5. wrangler.toml 에 바인딩 추가 (없는 것만) ─────────────────
for name in "${SECRET_NAMES[@]}"; do
  if grep -q "binding = \"$name\"" "$WRANGLER_TOML" 2>/dev/null; then
    continue
  fi
  # 금고에 실제로 존재하는 이름만 바인딩한다 (방금 값 없이 건너뛴 건 안 붙인다)
  current_resp="$(cf GET "/accounts/$ACCOUNT_ID/secrets_store/stores/$STORE_ID/secrets")"
  if ! echo "$current_resp" | jq -r '.result[].name' | grep -qx "$name"; then
    continue
  fi
  {
    echo ""
    echo "[[secrets_store_secrets]]"
    echo "binding = \"$name\""
    echo "store_id = \"$STORE_ID\""
    echo "secret_name = \"$name\""
  } >> "$WRANGLER_TOML"
  echo "📝 wrangler.toml에 $name 바인딩 추가"
done

echo ""
echo "끝. 확인 후 배포하세요:"
echo "  cd $WORKER_DIR && CLOUDFLARE_API_TOKEN=<Workers Scripts:Edit 권한 토큰> npx wrangler deploy"
echo ""
echo "옛 방식(wrangler secret put)으로 개별 등록된 값이 있었다면, 이제 금고 쪽을 쓰므로 지워도 됩니다:"
echo "  npx wrangler secret delete <이름>"
