#!/usr/bin/env python3
"""문샷 트랙 — 월 1만원 초고위험 복권 예산 (회장 승인 2026-08-22, 8월분부터 가동)

본운용(live_trade.py)과 완전 분리: 별도 금고 키(company3_moonshot_state), 별도 로그.
문샷 코인은 live_trade의 MARKETS 밖이라 본운용 고아 복원·손절 로직과 충돌하지 않는다.

규칙 (백테스트 B안, execution/2026-08-22-문샷트랙-백테스트.md):
  - 매월 1회 10,000원: 직전 7일 수익률 1위 잡알트(7일 평균 거래대금 1억 이상,
    메이저·스테이블·유의/경보 제외) 시장가 매수.
  - +100% 도달 시 절반 익절 후 잔여분 고점 대비 -30% 트레일링.
  - -50% 손절. 달이 바뀌면 강제 청산.
  - 감시는 본세션 매시 루틴이 --check 호출(시간 단위 폴링 — 복권 예산이라 허용, 문서화됨).

사용: --pick(선정만, 주문 없음) / --buy(월 1회 매수) / --check(보유분 점검·집행)
"""
import argparse
import datetime
import json
import sys
import time
import urllib.request

import live_trade as lt

VAULT_KEY = "company3_moonshot_state"
STATE_FILE = lt.os.path.join(lt.BASE, "live", "moonshot_state.json")
LOG_FILE = lt.os.path.join(lt.BASE, "live", "moonshot_log.jsonl")
BET = 10_000
MIN_TURNOVER = 100_000_000
EXCLUDE = set(lt.MARKETS) | {"KRW-USDT", "KRW-USDC", "KRW-BTC", "KRW-ETH"}


def now_month() -> str:
    return lt.kst_today()[:7]


def load() -> dict:
    try:
        raw = lt.vault_get(VAULT_KEY)
        if raw:
            return json.loads(raw)
    except Exception:
        pass
    try:
        with open(STATE_FILE) as f:
            return json.load(f)
    except Exception:
        return {"position": None, "bet_months": []}


def save(state: dict) -> None:
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)
    try:
        lt.vault_put(VAULT_KEY, json.dumps(state, ensure_ascii=False))
    except Exception as e:
        print(f"  (금고 저장 실패 — 로컬만 기록: {e})")


def log(event: dict) -> None:
    event["ts"] = datetime.datetime.utcnow().isoformat() + "Z"
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(event, ensure_ascii=False) + "\n")


def get_json(url):
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())


def flagged(m: dict) -> bool:
    ev = m.get("market_event") or {}
    caution = ev.get("caution") or {}
    return bool(ev.get("warning")) or (any(caution.values()) if isinstance(caution, dict) else bool(caution))


def pick():
    universe = [m["market"] for m in get_json(f"https://api.upbit.com/v1/market/all?is_details=true")
                if m["market"].startswith("KRW-") and m["market"] not in EXCLUDE and not flagged(m)]
    best, best_ret = None, None
    for i, market in enumerate(universe):
        try:
            days = get_json(f"https://api.upbit.com/v1/candles/days?market={market}&count=8")
        except Exception:
            continue
        if len(days) < 8:
            continue
        days.reverse()  # 과거→현재
        hist = days[:-1]  # 직전 7일 확정 일봉
        turns = sum(c["candle_acc_trade_price"] for c in hist) / len(hist)
        if turns < MIN_TURNOVER:
            continue
        ret7 = hist[-1]["trade_price"] / hist[0]["trade_price"] - 1
        if best_ret is None or ret7 > best_ret:
            best, best_ret = market, ret7
        time.sleep(0.11)
    return best, best_ret


def cmd_pick():
    m, r = pick()
    print(f"이번 달 후보: {m} (직전 7일 {r*100:+.1f}%)" if m else "후보 없음")


def cmd_buy():
    state = load()
    month = now_month()
    if month in state.get("bet_months", []):
        print(f"{month} 베팅은 이미 실행됨 — 중복 매수 안 함")
        return
    if state.get("position"):
        print("보유 중인 문샷 포지션이 있어 신규 매수 안 함")
        return
    market, ret7 = pick()
    if not market:
        print("조건을 만족하는 후보 없음 — 이번 달 베팅 건너뜀")
        return
    up = lt.Upbit()
    krw = {a["currency"]: float(a["balance"]) for a in up.accounts()}.get("KRW", 0.0)
    if krw < BET:
        print(f"현금 부족(KRW {krw:,.0f}원) — 매수 불가")
        return
    tick = get_json(f"https://api.upbit.com/v1/ticker?markets={market}")[0]
    resp = up.buy_market(market, BET)
    state["position"] = {"market": market, "entry_price": tick["trade_price"],
                        "entry_month": month, "krw": BET,
                        "half_sold": False, "peak": tick["trade_price"]}
    state.setdefault("bet_months", []).append(month)
    save(state)
    log({"action": "buy", "market": market, "krw": BET, "price": tick["trade_price"],
         "signal_7d_pct": round(ret7 * 100, 1), "uuid": resp.get("uuid")})
    print(f"[문샷] ✅ {market} 매수 {BET:,}원 @≈{tick['trade_price']:,} (7일 신호 {ret7*100:+.1f}%)")
    print(f"  손절 {tick['trade_price']*0.5:,.4g} / 익절 트리거 {tick['trade_price']*2:,.4g}")


def cmd_check():
    state = load()
    pos = state.get("position")
    if not pos:
        print("[문샷] 보유 없음")
        return
    market = pos["market"]
    cur = get_json(f"https://api.upbit.com/v1/ticker?markets={market}")[0]["trade_price"]
    entry = pos["entry_price"]
    chg = cur / entry - 1
    up = lt.Upbit()
    cc = market.split("-")[1]

    def balance():
        return {a["currency"]: float(a["balance"]) for a in up.accounts()}.get(cc, 0.0)

    def sell(vol, reason):
        resp = up.sell_market(market, vol)
        log({"action": "sell", "market": market, "reason": reason, "volume": vol,
             "price": cur, "uuid": resp.get("uuid")})
        print(f"[문샷] ✅ {market} {reason} 매도 {vol}개 @≈{cur:,}")

    month_changed = now_month() != pos["entry_month"]
    if cur <= entry * 0.5:
        sell(balance(), "stop_-50%")
        state["position"] = None
    elif month_changed:
        sell(balance(), "month_end")
        state["position"] = None
    elif not pos["half_sold"] and cur >= entry * 2:
        sell(round(balance() / 2, 8), "take_half_+100%")
        pos["half_sold"] = True
        pos["peak"] = max(pos["peak"], cur)
    elif pos["half_sold"]:
        pos["peak"] = max(pos["peak"], cur)
        if cur <= pos["peak"] * 0.7:
            sell(balance(), "trailing_-30%")
            state["position"] = None
        else:
            print(f"[문샷] {market} 보유 유지 {chg*100:+.1f}% (트레일링 기준 {pos['peak']*0.7:,.4g})")
    else:
        print(f"[문샷] {market} 보유 유지 (진입 {entry:,} → 현재 {cur:,}, {chg*100:+.1f}%)")
    save(state)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["--pick", "--buy", "--check"], nargs="?")
    args, _ = ap.parse_known_args()
    mode = sys.argv[1] if len(sys.argv) > 1 else "--check"
    {"--pick": cmd_pick, "--buy": cmd_buy, "--check": cmd_check}[mode]()
