#!/usr/bin/env python3
"""
GlowHalo 3 — 장중 상주 감시 루프 (기본 DRY-RUN)

배경 (2026-08-17 회장 지시): 손절·돌파 집행이 시간당 1회 폴링이라 최대 1시간
지연되는 것이 최대 리스크로 지목됨. CCR 트리거 최소 주기가 1시간이라 트리거를
늘리는 대신, 매시 감시 세션이 이 스크립트로 다음 세션 직전까지 상주하며
30초 간격으로 가격을 감시한다 → 반응 지연이 최대 1시간에서 약 30초~1분으로 준다.

역할 분리 — 이 스크립트는 "탐지기"이고 주문·리스크 판단은 하지 않는다:
  - 손절/돌파 조건이 감지되면 검증된 단일 실행기 live_trade.py를 1회 호출한다.
  - 리스크 헌법(손절 -3%, 일/주 한도, 서킷브레이커, 당일 재진입 금지, 예산 상한)은
    전부 live_trade.py 안에 있으므로 여기서 중복 구현하지 않는다 (이중화 금지).

실행 모드:
  python3 watch_loop.py                → DRY-RUN (live_trade도 DRY-RUN으로 호출)
  python3 watch_loop.py --live         → 실거래 (live_trade --live 호출)
  python3 watch_loop.py --selftest     → 네트워크 주문 없이 판정 로직 자체 검증

감시 대상이 없으면(무포지션 + 전 종목 MA20 차단/당일 소진) 즉시 종료하므로
신호 없는 날의 상주 비용은 0에 가깝다.

업비트 일봉은 09:00 KST에 갱신되므로 루프가 그 경계를 넘으면 목표가·MA20이
낡은 값이 된다 → 경계 도달 시 즉시 종료(09:10 일일 루틴이 이어받는다).
"""
import argparse
import datetime
import subprocess
import sys
import time

import live_trade as lt

BASE_INTERVAL = 30          # 초 — 가격 폴링 간격
DEFAULT_MINUTES = 50        # 상주 시간(다음 정시 트리거와 겹치지 않게 55분 미만)
COOLDOWN_SEC = 300          # 같은 종목·같은 사유로 실행기 재호출 최소 간격
MAX_PASSES = 12             # 한 상주 세션의 실행기 호출 상한(폭주 방지)
MAX_CONSEC_ERRORS = 40      # 연속 API 오류 한도(약 20분) — 초과 시 보고 후 종료


def kst_now() -> datetime.datetime:
    return datetime.datetime.utcnow() + datetime.timedelta(hours=9)


def candle_day(now_kst: datetime.datetime) -> str:
    """업비트 일봉 기준 '거래일' — 09:00 KST에 날이 바뀐다."""
    return (now_kst - datetime.timedelta(hours=9)).strftime("%Y-%m-%d")


def decide(state: dict, sigs: dict, prices: dict, today: str) -> list[tuple[str, str]]:
    """감시 1회분 판정. (market, reason) 목록 반환 — 순수 함수, 셀프테스트 대상.

    reason: "stop_loss"(보유분 -3% 도달) | "breakout"(필터 통과 종목 목표가 돌파)
    실제 주문 가능 여부(예산·한도·halt)는 실행기(live_trade)가 다시 판단한다.
    """
    hits = []
    positions = state.get("positions", {})
    for market, pos in positions.items():
        p = prices.get(market)
        if p is None or pos.get("entry_price", 0) <= 0:
            continue
        if (p - pos["entry_price"]) / pos["entry_price"] <= lt.STOP_LOSS:
            hits.append((market, "stop_loss"))
    for market, sig in sigs.items():
        if market in positions:
            continue
        if state.get("traded_dates", {}).get(market) == today:
            continue
        p = prices.get(market)
        if sig["filter_pass"] and p is not None and p >= sig["target"]:
            hits.append((market, "breakout"))
    return hits


def watch_set(state: dict, sigs: dict, today: str) -> list[str]:
    """지금 감시할 가치가 있는 종목 목록. 비면 상주할 이유가 없다."""
    markets = set(state.get("positions", {}).keys())
    for market, sig in sigs.items():
        if market in markets:
            continue
        if state.get("traded_dates", {}).get(market) == today:
            continue
        if sig["filter_pass"]:
            markets.add(market)
    return sorted(markets)


def run_executor(live: bool) -> None:
    """검증된 단일 실행기 live_trade.py 1회 호출 — 주문·상태 갱신은 전부 저쪽."""
    cmd = [sys.executable, lt.os.path.join(lt.BASE, "live_trade.py")]
    if live:
        cmd.append("--live")
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    print(r.stdout, end="")
    if r.returncode != 0:
        print(f"⚠ 실행기 비정상 종료(code {r.returncode}): {r.stderr[-500:]}")


def selftest() -> None:
    today = "2026-08-17"
    sigs = {
        "KRW-BTC": {"filter_pass": True, "target": 100.0},
        "KRW-ETH": {"filter_pass": False, "target": 100.0},
        "KRW-XRP": {"filter_pass": True, "target": 100.0},
    }
    state = {
        "positions": {"KRW-SOL": {"entry_price": 100.0, "entry_date": today, "krw": 50000}},
        "traded_dates": {"KRW-XRP": today},
        "realized": {}, "halt": None,
    }
    # 1) 손절: SOL -3% 도달 → 발동, -2.9%는 미발동
    assert ("KRW-SOL", "stop_loss") in decide(state, sigs, {"KRW-SOL": 97.0}, today)
    assert decide(state, sigs, {"KRW-SOL": 97.2}, today) == []
    # 2) 돌파: BTC 목표가 도달 → 발동 / 미달 → 미발동
    assert ("KRW-BTC", "breakout") in decide(state, sigs, {"KRW-BTC": 100.0}, today)
    assert decide(state, sigs, {"KRW-BTC": 99.9}, today) == []
    # 3) 필터 차단(ETH)·당일 기거래(XRP)는 돌파가도 미발동
    assert decide(state, sigs, {"KRW-ETH": 150.0, "KRW-XRP": 150.0}, today) == []
    # 4) 감시 대상 산출: 포지션(SOL) + 필터통과 미거래(BTC), XRP는 제외
    assert watch_set(state, sigs, today) == ["KRW-BTC", "KRW-SOL"]
    assert watch_set({"positions": {}, "traded_dates": {}},
                     {"KRW-ETH": sigs["KRW-ETH"]}, today) == []
    print("셀프테스트 4종 통과 — 판정 로직 정상")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--live", action="store_true")
    ap.add_argument("--minutes", type=float, default=DEFAULT_MINUTES)
    ap.add_argument("--interval", type=float, default=BASE_INTERVAL)
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()
    if args.selftest:
        selftest()
        return
    mode = "LIVE" if args.live else "DRY-RUN"
    start = kst_now()
    start_day = candle_day(start)
    deadline = start + datetime.timedelta(minutes=args.minutes)
    print(f"=== 장중 상주 감시 [{mode}] {start.strftime('%Y-%m-%d %H:%M KST')} "
          f"(~{args.minutes:.0f}분, {args.interval:.0f}초 간격) ===")

    # 시작 시 실행기 1회 — 밀린 아침 청산·고아 복원·즉시 신호를 기존 방식대로 처리
    run_executor(args.live)

    state = lt.load_state()
    sigs = {m: lt.v2_signal(m) for m in lt.MARKETS}
    targets = watch_set(state, sigs, lt.kst_today())
    if not targets:
        print("감시 대상 없음(무포지션 + 진입 가능 종목 없음) — 즉시 종료")
        return
    print(f"감시 대상: {', '.join(targets)}")

    cooldown: dict[tuple[str, str], datetime.datetime] = {}
    passes = 0
    consec_errors = 0
    while True:
        now = kst_now()
        if now >= deadline:
            print(f"상주 시간 종료({args.minutes:.0f}분) — 다음 정시 세션이 이어받음")
            break
        if candle_day(now) != start_day:
            print("일봉 경계(09:00 KST) 도달 — 종료, 일일 루틴이 이어받음")
            break
        try:
            state = lt.load_state()
            targets = watch_set(state, sigs, lt.kst_today())
            if not targets:
                print("감시 대상 소진 — 종료")
                break
            tick = lt.public("ticker", {"markets": ",".join(targets)})
            prices = {t["market"]: t["trade_price"] for t in tick}
            consec_errors = 0
        except Exception as e:
            consec_errors += 1
            if consec_errors >= MAX_CONSEC_ERRORS:
                print(f"⚠ API 연속 오류 {consec_errors}회({type(e).__name__}) — 감시 불능, 종료·보고")
                lt.log_event({"mode": mode, "action": "watch_api_down",
                              "error": f"{type(e).__name__}: {e}"})
                break
            time.sleep(args.interval)
            continue

        hits = [(m, r) for m, r in decide(state, sigs, prices, lt.kst_today())
                if cooldown.get((m, r), datetime.datetime.min) <= now]
        if hits:
            for m, r in hits:
                print(f"[{now.strftime('%H:%M:%S')}] 조건 감지: {m} {r} @ {prices.get(m):,}")
                cooldown[(m, r)] = now + datetime.timedelta(seconds=COOLDOWN_SEC)
            passes += 1
            if passes > MAX_PASSES:
                print("⚠ 실행기 호출 상한 도달 — 종료·보고")
                lt.log_event({"mode": mode, "action": "watch_max_passes"})
                break
            run_executor(args.live)
        time.sleep(args.interval)

    print(f"[{mode}] 상주 감시 종료 | 실행기 호출 {passes + 1}회(시작 1회 포함)")


if __name__ == "__main__":
    main()
