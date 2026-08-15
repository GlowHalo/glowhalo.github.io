#!/usr/bin/env python3
"""
나다컴퍼니3 — 매수/매도 경로 실검증 (1회성 핑 테스트)

최소 주문(5,500원)으로 BTC 시장가 매수 → 체결 확인 → 전량 시장가 매도.
비용: 왕복 수수료 약 11원 + 스프레드. 회장 위임 범위 내이며,
"매수매도 가능한 상태인가"라는 회장 질문에 실증으로 답하기 위한 것.
"""
import json
import os
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from live_trade import Upbit, public, log_event

BUY_KRW = 5500
MARKET = "KRW-BTC"


def main():
    up = Upbit()
    krw0 = up.krw_balance()
    print(f"[사전] KRW 잔고 {krw0:,.2f}원")
    if krw0 < BUY_KRW:
        print("잔고 부족 — 중단")
        return

    resp = up.buy_market(MARKET, BUY_KRW)
    print(f"[매수] 시장가 {BUY_KRW}원 주문 접수 — uuid {resp.get('uuid')}")
    log_event({"mode": "LIVE", "action": "verify_buy", "market": MARKET,
               "krw": BUY_KRW, "uuid": resp.get("uuid")})

    vol = 0.0
    for _ in range(10):  # 체결 대기 (시장가라 보통 즉시)
        time.sleep(1)
        vol = up.coin_balance(MARKET)
        if vol > 0:
            break
    if vol <= 0:
        print("⚠ 매수 체결이 10초 내 확인 안 됨 — 수동 확인 필요")
        return
    price = public("ticker", {"markets": MARKET})[0]["trade_price"]
    print(f"[체결] BTC {vol:.8f}개 보유 (≈{vol*price:,.1f}원)")

    resp2 = up.sell_market(MARKET, vol)
    print(f"[매도] 전량 시장가 매도 접수 — uuid {resp2.get('uuid')}")
    log_event({"mode": "LIVE", "action": "verify_sell", "market": MARKET,
               "volume": vol, "uuid": resp2.get("uuid")})

    time.sleep(2)
    krw1 = up.krw_balance()
    residual = up.coin_balance(MARKET)
    cost = krw0 - krw1
    print(f"[사후] KRW {krw1:,.2f}원 | BTC 잔여 {residual:.8f} | 왕복 비용 {cost:,.2f}원")
    log_event({"mode": "LIVE", "action": "verify_done", "cost_krw": round(cost, 2)})
    print("✅ 매수/매도 경로 실검증 완료")


if __name__ == "__main__":
    main()
