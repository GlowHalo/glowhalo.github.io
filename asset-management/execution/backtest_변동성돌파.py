#!/usr/bin/env python3
"""
나다컴퍼니3 — 변동성 돌파 전략 백테스트 (Round 1 페이퍼 트레이딩 검증용)

전략 (Larry Williams 변동성 돌파, 데이 스윙형):
  목표가 = 당일 시가 + (전일 고가 - 전일 저가) * k
  당일 고가가 목표가를 돌파하면 목표가에 매수, 익일 시가에 매도(보유기간 1일).
  수수료는 왕복 0.1%(빗썸 쿠폰가 0.04%*2에 여유를 둔 보수적 가정)로 반영.

데이터: 업비트 공개 API(인증 불필요) 일봉, 최근 N일.
실거래 없음 — 순수 과거 시세 기반 시뮬레이션.
"""
import json
import urllib.request
import urllib.parse
from datetime import datetime, timedelta

UPBIT_CANDLE_URL = "https://api.upbit.com/v1/candles/days"
FEE_ROUNDTRIP = 0.001  # 왕복 0.1% (보수적 가정)
K = 0.5  # 변동성 돌파 계수


def fetch_daily_candles(market: str, total_days: int = 365) -> list:
    """업비트 공개 API로 일봉을 최신순으로 모아 시간순으로 반환 (최대 200개/요청, 페이지네이션)."""
    candles = []
    to_ts = None
    remaining = total_days
    while remaining > 0:
        count = min(200, remaining)
        params = {"market": market, "count": count}
        if to_ts:
            params["to"] = to_ts
        url = f"{UPBIT_CANDLE_URL}?{urllib.parse.urlencode(params)}"
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            batch = json.loads(resp.read().decode())
        if not batch:
            break
        candles.extend(batch)
        remaining -= len(batch)
        oldest = batch[-1]["candle_date_time_utc"]
        to_ts = oldest
        if len(batch) < count:
            break
    candles.sort(key=lambda c: c["candle_date_time_utc"])
    return candles


def backtest(market: str, candles: list, k: float = K, fee: float = FEE_ROUNDTRIP) -> dict:
    """변동성 돌파 전략 백테스트. 반환: 거래 로그 + 요약 통계."""
    trades = []
    equity = 1.0  # 원금을 1.0으로 정규화(30만원 = 1.0 기준)
    peak = 1.0
    max_drawdown = 0.0

    for i in range(1, len(candles) - 1):
        prev = candles[i - 1]
        today = candles[i]
        tomorrow = candles[i + 1]

        target = today["opening_price"] + (prev["high_price"] - prev["low_price"]) * k

        if today["high_price"] >= target:
            buy_price = target
            sell_price = tomorrow["opening_price"]
            gross_return = (sell_price - buy_price) / buy_price
            net_return = gross_return - fee
            equity *= (1 + net_return)
            trades.append({
                "date": today["candle_date_time_utc"][:10],
                "buy_price": round(buy_price),
                "sell_price": round(sell_price),
                "gross_return_pct": round(gross_return * 100, 3),
                "net_return_pct": round(net_return * 100, 3),
                "equity_after": round(equity, 4),
            })
            peak = max(peak, equity)
            drawdown = (peak - equity) / peak
            max_drawdown = max(max_drawdown, drawdown)

    n = len(trades)
    wins = [t for t in trades if t["net_return_pct"] > 0]
    win_rate = (len(wins) / n * 100) if n else 0.0
    total_return_pct = (equity - 1) * 100

    return {
        "market": market,
        "period_days": len(candles),
        "num_trades": n,
        "win_rate_pct": round(win_rate, 1),
        "total_return_pct": round(total_return_pct, 2),
        "final_equity": round(equity, 4),
        "max_drawdown_pct": round(max_drawdown * 100, 2),
        "trades": trades,
    }


def main():
    markets = ["KRW-BTC", "KRW-ETH"]
    results = []
    for market in markets:
        candles = fetch_daily_candles(market, total_days=365)
        result = backtest(market, candles)
        results.append(result)
        print(f"\n=== {market} — 변동성 돌파(k={K}) 백테스트 ({result['period_days']}일) ===")
        print(f"거래 횟수: {result['num_trades']}회, 승률: {result['win_rate_pct']}%")
        print(f"누적 수익률: {result['total_return_pct']}% (원금 1.0 -> {result['final_equity']})")
        print(f"최대 낙폭(MDD): {result['max_drawdown_pct']}%")

    out_path = "/home/user/tossneon.github.io/asset-management/execution/backtest_result_변동성돌파.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\n상세 결과 저장: {out_path}")


if __name__ == "__main__":
    main()
