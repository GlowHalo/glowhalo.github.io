#!/usr/bin/env python3
"""금고의 실거래 상태 정본을 저장소 파일로 내려 기록으로 남긴다.

왜 필요한가 (2026-08-15):
  루틴이 띄우는 fresh 세션은 실주문은 낼 수 있지만 저장소 push 권한이 없다
  (`not in this session's authorized repository set`, 403). 반대로 대화형/self-bind
  세션은 push는 되지만 `--live` 실행이 권한 분류기에 막힌다. 그래서 상태 정본을
  금고(`company3_live_state`)에 두고, push 권한이 있는 쪽이 이 스크립트로 저장소에
  반영한다 — 어느 쪽도 상대의 제약을 우회하지 않으면서 기록이 남는다.

사용: python3 sync_state.py   (변경이 있으면 파일을 쓰고 종료코드 0, 없으면 그대로)
"""
import json
import os
import sys

from live_trade import LIVE_DIR, STATE_PATH, VAULT_STATE_KEY, vault_get


def main() -> int:
    try:
        raw = vault_get(VAULT_STATE_KEY)
    except Exception as e:
        print(f"금고에 상태가 없거나 조회 실패({type(e).__name__}) — 아직 실거래 기록이 "
              f"없으면 정상이다. 동기화할 것 없음.")
        return 0

    state = json.loads(raw)
    before = None
    if os.path.exists(STATE_PATH):
        with open(STATE_PATH, encoding="utf-8") as f:
            before = json.load(f)

    if before == state:
        print("저장소 상태가 금고와 동일 — 변경 없음.")
        return 0

    os.makedirs(LIVE_DIR, exist_ok=True)
    with open(STATE_PATH, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)

    positions = state.get("positions", {})
    realized = state.get("realized", {})
    print(f"금고 → 저장소 동기화 완료: 보유 {len(positions)}종목 "
          f"{list(positions) or '없음'}, 실현손익 기록 {len(realized)}건"
          f"{', halt=' + str(state['halt']) if state.get('halt') else ''}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
