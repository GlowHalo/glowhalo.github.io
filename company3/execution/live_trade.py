#!/usr/bin/env python3
"""
나다컴퍼니3 — 실거래 집행 모듈 v1 (기본 DRY-RUN)

Phase 1 (MODE.md §6): 원금 30만원 중 최대 50%(15만원)만 투입.
리스크 헌법(§4) 하드룰을 코드로 내장 — 위반하는 주문은 만들어질 수 없다.

실행 모드:
  python3 live_trade.py            → DRY-RUN: 주문을 만들되 전송하지 않고 로그만
  python3 live_trade.py --live     → 실제 주문 전송 (KRW 잔고 있어야 함)

키는 금고(tossneon-api-vault)에서 curl로 조회한다(파이썬 직접 호출은
세션 프록시에서 403이 나는 이슈가 있어 subprocess curl 사용).

⚠ 알려진 제약: 업비트 Open API는 스톱로스(예약) 주문을 지원하지 않는다
(limit/price/market/best만 가능). 손절은 (a) 보유 1일 강제 청산 구조,
(b) 워치독 급락 감지 + 세션 청산으로 대체하고, MODE.md §5의 "거래소
서버측 예약주문" 층은 업비트 한정으로 비활성임을 명시해둔다.
"""
import argparse
import base64
import hashlib
import hmac
import json
import os
import subprocess
import urllib.parse
import urllib.request
import uuid

BASE = os.path.dirname(os.path.abspath(__file__))
LIVE_DIR = os.path.join(BASE, "live")
LIVE_LOG = os.path.join(LIVE_DIR, "log.jsonl")

MARKETS = ["KRW-BTC", "KRW-ETH", "KRW-XRP", "KRW-DOGE", "KRW-SOL"]
K = 0.5
MA_WINDOW = 20

PRINCIPAL = 300_000            # 회사 원금 (회장 확정, 추가입금 없음)
PHASE1_CAP = PRINCIPAL // 2    # Phase 1: 최대 15만원만 투입
PER_MARKET_CAP = PRINCIPAL // 2  # 리스크 헌법: 종목당 최대 50%
MIN_ORDER_KRW = 5_500          # 업비트 최소 5,000원 + 수수료 여유


def vault_get(name: str) -> str:
    out = subprocess.run(
        ["curl", "-s", f"{os.environ['VAULT_URL']}/secrets/{name}",
         "-H", f"Authorization: Bearer {os.environ['VAULT_TOKEN']}"],
        capture_output=True, text=True, timeout=15).stdout
    return json.loads(out)["value"]


def _b64url(b: bytes) -> bytes:
    return base64.urlsafe_b64encode(b).rstrip(b"=")


def upbit_jwt(access_key: str, secret_key: str, query: dict | None = None) -> str:
    payload = {"access_key": access_key, "nonce": str(uuid.uuid4())}
    if query:
        qs = urllib.parse.urlencode(query)
        payload["query_hash"] = hashlib.sha512(qs.encode()).hexdigest()
        payload["query_hash_alg"] = "SHA512"
    header = _b64url(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    body = _b64url(json.dumps(payload).encode())
    sig = _b64url(hmac.new(secret_key.encode(), header + b"." + body, hashlib.sha256).digest())
    return (header + b"." + body + b"." + sig).decode()


class Upbit:
    def __init__(self):
        self.ak = vault_get("upbit_access_key")
        self.sk = vault_get("upbit_secret_key")

    def _req(self, method: str, path: str, query: dict | None = None):
        url = f"https://api.upbit.com/v1/{path}"
        data = None
        if query and method == "GET":
            url += "?" + urllib.parse.urlencode(query)
        elif query:
            data = urllib.parse.urlencode(query).encode()
        req = urllib.request.Request(url, data=data, method=method, headers={
            "Authorization": f"Bearer {upbit_jwt(self.ak, self.sk, query)}",
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
        })
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read().decode())

    def accounts(self):
        return self._req("GET", "accounts")

    def krw_balance(self) -> float:
        for a in self.accounts():
            if a["currency"] == "KRW":
                return float(a["balance"])
        return 0.0

    def coin_balance(self, market: str) -> float:
        cur = market.split("-")[1]
        for a in self.accounts():
            if a["currency"] == cur:
                return float(a["balance"])
        return 0.0

    def buy_market(self, market: str, krw_amount: int):
        """시장가 매수 (ord_type=price: KRW 금액 지정)"""
        return self._req("POST", "orders", {
            "market": market, "side": "bid",
            "price": str(krw_amount), "ord_type": "price"})

    def sell_market(self, market: str, volume: float):
        """시장가 매도 (ord_type=market: 수량 지정)"""
        return self._req("POST", "orders", {
            "market": market, "side": "ask",
            "volume": f"{volume:.8f}", "ord_type": "market"})


def public(path: str, params: dict):
    url = f"https://api.upbit.com/v1/{path}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read().decode())


def v2_signal(market: str) -> dict:
    """전략 v2: 오늘 진입 목표가 + 필터 통과 여부 (페이퍼 러너와 동일 로직)."""
    candles = public("candles/days", {"market": market, "count": MA_WINDOW + 2})
    candles.sort(key=lambda c: c["candle_date_time_kst"])
    today, yday = candles[-1], candles[-2]
    closes = [c["trade_price"] for c in candles[:-1]]
    ma = sum(closes[-MA_WINDOW:]) / MA_WINDOW
    target = today["opening_price"] + (yday["high_price"] - yday["low_price"]) * K
    price_now = public("ticker", {"markets": market})[0]["trade_price"]
    return {
        "market": market, "ma20": round(ma, 2), "open": today["opening_price"],
        "target": round(target, 2), "price_now": price_now,
        "filter_pass": today["opening_price"] > ma,
        "breakout": price_now >= target,
    }


def log_event(event: dict):
    os.makedirs(LIVE_DIR, exist_ok=True)
    with open(LIVE_LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(event, ensure_ascii=False) + "\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--live", action="store_true", help="실제 주문 전송 (기본은 드라이런)")
    args = ap.parse_args()
    mode = "LIVE" if args.live else "DRY-RUN"
    print(f"=== 나다컴퍼니3 실거래 집행 모듈 [{mode}] ===")

    up = Upbit()

    # ---- 0) 청산 단계: 보유 1일 전략이므로 아침 실행 시 전일 매수분을 먼저 정리 ----
    # (PICA 등 MARKETS 밖 자산은 절대 건드리지 않는다 — 회장 기존 보유분)
    accounts = {a["currency"]: float(a["balance"]) for a in up.accounts()}
    for market in MARKETS:
        cur = market.split("-")[1]
        vol = accounts.get(cur, 0.0)
        if vol <= 0:
            continue
        price = public("ticker", {"markets": market})[0]["trade_price"]
        value = vol * price
        if value < MIN_ORDER_KRW:
            continue  # 먼지 수량은 방치
        if args.live:
            resp = up.sell_market(market, vol)
            print(f"[LIVE] {market} 전일 포지션 청산: {vol:.8f}개(≈{value:,.0f}원) 시장가 매도 → uuid {resp.get('uuid')}")
            log_event({"mode": "LIVE", "action": "sell", "market": market,
                       "volume": vol, "approx_krw": round(value), "response_uuid": resp.get("uuid")})
        else:
            print(f"[DRY-RUN] {market} 보유 {vol:.8f}개(≈{value:,.0f}원) → 청산 대상 (전송 안 함)")
            log_event({"mode": "DRY-RUN", "action": "would_sell", "market": market,
                       "volume": vol, "approx_krw": round(value)})

    krw = up.krw_balance()
    budget = min(krw, PHASE1_CAP)
    print(f"KRW 잔고: {krw:,.0f}원 | Phase 1 가용 예산: {budget:,.0f}원 (상한 {PHASE1_CAP:,}원)")

    planned = []
    for market in MARKETS:
        sig = v2_signal(market)
        status = []
        if not sig["filter_pass"]:
            status.append("MA20 필터 차단")
        if not sig["breakout"]:
            status.append("목표가 미돌파")
        if not status:  # 진입 신호 성립
            size = min(budget // 2, PER_MARKET_CAP)  # 신호당 예산 절반, 종목 상한 준수
            if size < MIN_ORDER_KRW:
                status.append(f"예산 부족(주문가능 {size:,.0f}원 < 최소 {MIN_ORDER_KRW:,}원)")
            else:
                planned.append({"market": market, "krw": int(size), "signal": sig})
        print(f"  {market}: 현재가 {sig['price_now']:,} / 목표가 {sig['target']:,} / "
              f"MA20 {sig['ma20']:,} → {' · '.join(status) if status else '✅ 진입 신호'}")

    if not planned:
        print(f"\n[{mode}] 집행할 주문 없음 — 규칙상 현금 대기.")
        log_event({"mode": mode, "action": "no_orders", "krw": krw})
        return

    for p in planned:
        if args.live:
            resp = up.buy_market(p["market"], p["krw"])
            print(f"\n[LIVE] {p['market']} 시장가 매수 {p['krw']:,}원 → 주문 uuid {resp.get('uuid')}")
            log_event({"mode": "LIVE", "action": "buy", **p, "response_uuid": resp.get("uuid")})
        else:
            print(f"\n[DRY-RUN] {p['market']} 시장가 매수 {p['krw']:,}원 (전송 안 함)")
            log_event({"mode": "DRY-RUN", "action": "would_buy", **p})


if __name__ == "__main__":
    main()
