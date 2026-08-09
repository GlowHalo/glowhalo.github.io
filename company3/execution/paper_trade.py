#!/usr/bin/env python3
"""
나다컴퍼니3 — 페이퍼 트레이딩 일일 러너 (Phase 0, 실거래 아님)

전략 v2 (MODE.md §3): MA20 추세필터 + 변동성 돌파 k=0.5, 보유 1일.
매일 09:05 KST 이후 실행 —
  1) 전일 페이퍼 주문을 실제 시세로 정산해 log.jsonl에 기록
  2) 당일 페이퍼 주문(목표가·필터 통과 여부)을 등록/출력

일봉 기준 시뮬레이션이므로 장중 체결 순서는 알 수 없다 → 전일 저가가 손절선
아래로 내려갔으면 보수적으로 손절(-3%) 처리한다(수익이었어도 손절로 간주).
"""
import json
import os
import urllib.request
import urllib.parse

BASE = os.path.dirname(os.path.abspath(__file__))
PAPER_DIR = os.path.join(BASE, "paper")
STATE_PATH = os.path.join(PAPER_DIR, "state.json")
LOG_PATH = os.path.join(PAPER_DIR, "log.jsonl")

# 2026-08-09 확대: 백테스트 성적으로 종목을 고르는 체리피킹을 피하기 위해
# 시총 상위 5종목 전부를 페이퍼로 추적하고, 실거래 배분은 전진 성과로 정한다.
MARKETS = ["KRW-BTC", "KRW-ETH", "KRW-XRP", "KRW-DOGE", "KRW-SOL"]
K = 0.5
MA_WINDOW = 20
FEE_ROUNDTRIP = 0.001   # 왕복 0.1% (보수적)
STOP_LOSS = -0.03       # 리스크 헌법: 포지션당 -3%
CAPITAL_START = 300_000  # 원금(가상), 종목당 50%


def fetch_candles(market: str, count: int = 40) -> list:
    url = f"https://api.upbit.com/v1/candles/days?{urllib.parse.urlencode({'market': market, 'count': count})}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        candles = json.loads(resp.read().decode())
    candles.sort(key=lambda c: c["candle_date_time_kst"])  # 과거→최신
    return candles


def load_state() -> dict:
    if os.path.exists(STATE_PATH):
        with open(STATE_PATH, encoding="utf-8") as f:
            return json.load(f)
    return {
        "capital_start": CAPITAL_START,
        "strategy": f"v2: MA{MA_WINDOW} filter + vol-breakout k={K}, stop {STOP_LOSS:.0%}",
        "markets": {m: {"equity": 1.0, "trades": 0, "wins": 0} for m in MARKETS},
        "last_settled": None,
    }


def save_state(state: dict):
    os.makedirs(PAPER_DIR, exist_ok=True)
    with open(STATE_PATH, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def append_log(entry: dict):
    os.makedirs(PAPER_DIR, exist_ok=True)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def settle_and_plan(market: str, state: dict) -> None:
    candles = fetch_candles(market)
    today = candles[-1]           # 진행 중(시가 확정)
    yday = candles[-2]            # 전일(확정 캔들) — 정산 대상
    before = candles[-3]          # 전전일 — 전일 목표가 산출용
    yday_date = yday["candle_date_time_kst"][:10]
    today_date = today["candle_date_time_kst"][:10]
    closes = [c["trade_price"] for c in candles]

    # ---- 1) 전일 페이퍼 주문 정산 (중복 정산 방지) ----
    already = state["markets"][market].get("settled_until")
    if already != yday_date:
        ma_yday = sum(closes[-2 - MA_WINDOW:-2]) / MA_WINDOW  # 전일 이전 20일
        target = yday["opening_price"] + (before["high_price"] - before["low_price"]) * K
        entry = {"date": yday_date, "market": market, "target": round(target),
                 "ma20": round(ma_yday), "action": "no_trade"}
        if yday["opening_price"] <= ma_yday:
            entry["action"] = "filtered"  # 추세필터로 진입 안 함
        elif yday["high_price"] >= target:
            stop_price = target * (1 + STOP_LOSS)
            if yday["low_price"] <= stop_price:
                net = STOP_LOSS - FEE_ROUNDTRIP  # 보수적: 손절 우선 가정
                entry["action"] = "stopped_out"
                exit_price = stop_price
            else:
                exit_price = today["opening_price"]
                net = (exit_price - target) / target - FEE_ROUNDTRIP
                entry["action"] = "closed"
            m = state["markets"][market]
            m["equity"] = round(m["equity"] * (1 + net), 6)
            m["trades"] += 1
            if net > 0:
                m["wins"] += 1
            entry.update({"exit": round(exit_price), "net_return_pct": round(net * 100, 3),
                          "equity": m["equity"]})
        state["markets"][market]["settled_until"] = yday_date
        append_log(entry)
        print(f"[정산 {yday_date}] {market}: {entry['action']}"
              + (f" net {entry['net_return_pct']}% → equity {entry['equity']}" if "net_return_pct" in entry else ""))

    # ---- 2) 당일 페이퍼 주문 등록 ----
    ma_today = sum(closes[-1 - MA_WINDOW:-1]) / MA_WINDOW
    today_target = today["opening_price"] + (yday["high_price"] - yday["low_price"]) * K
    allowed = today["opening_price"] > ma_today
    print(f"[주문 {today_date}] {market}: 시가 {round(today['opening_price'])}, MA20 {round(ma_today)}, "
          f"목표가 {round(today_target)}, 필터 {'통과 — 돌파 시 진입' if allowed else '차단(하락추세) — 오늘 진입 없음'}")


def main():
    state = load_state()
    for m in MARKETS:  # 기존 state에 없는 신규 종목 초기화
        state["markets"].setdefault(m, {"equity": 1.0, "trades": 0, "wins": 0})
    for market in MARKETS:
        settle_and_plan(market, state)
    save_state(state)
    total = sum(state["markets"][m]["equity"] for m in MARKETS) / len(MARKETS)
    won = round(CAPITAL_START * total)
    print(f"\n[포트폴리오] 가상 원금 {CAPITAL_START:,}원 → 현재 {won:,}원 "
          f"(누적 {round((total - 1) * 100, 2)}%)")
    for m in MARKETS:
        s = state["markets"][m]
        wr = round(s["wins"] / s["trades"] * 100, 1) if s["trades"] else 0
        print(f"  {m}: equity {s['equity']} | {s['trades']}회 거래, 승률 {wr}%")


if __name__ == "__main__":
    main()
