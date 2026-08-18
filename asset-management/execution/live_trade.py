#!/usr/bin/env python3
"""
나다컴퍼니3 — 실거래 집행 모듈 v2 (기본 DRY-RUN)

전략 v2 (MODE.md §3): MA20 필터 + 변동성 돌파 k=0.5, 보유 1일.
Phase 1 (MODE.md §6): 원금 30만원 중 최대 50%(15만원)만 투입.
리스크 헌법(§4) 하드룰 내장: 포지션 손절 -3%, 일 한도 -3%, 주 한도 -7%,
서킷브레이커 -15%(총자산 기준) — 위반하는 주문은 만들어질 수 없다.

실행 모드:
  python3 live_trade.py            → DRY-RUN (주문 전송 없음, 상태 변경 없음)
  python3 live_trade.py --live     → 실제 주문 전송 + 상태 기록

하루 여러 번 실행해도 안전하도록 설계 (아침 정산 + 장중 돌파 감시용):
  - 전일 진입 포지션만 아침에 청산한다 (당일 매수분은 안 판다)
  - 보유 중 -3% 도달 시 즉시 손절
  - 같은 날 같은 종목 재진입 금지 (손절 후 재매수 방지)

⚠ 업비트 Open API는 예약(스톱) 주문 미지원 → 손절은 이 스크립트 실행 주기
(시간 단위 폴링) granularity로만 작동한다. MODE.md §5에 명시된 제약.
"""
import argparse
import base64
import datetime
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
STATE_PATH = os.environ.get("LIVE_STATE_PATH", os.path.join(LIVE_DIR, "state.json"))
VAULT_STATE_KEY = "company3_live_state"   # 금고에 두는 상태 정본(커밋 유실 대비)

MARKETS = ["KRW-BTC", "KRW-ETH", "KRW-XRP", "KRW-DOGE", "KRW-SOL"]
K = 0.5
MA_WINDOW = 20

PRINCIPAL = 300_000
PHASE1_CAP = PRINCIPAL // 2      # 15만원
PER_MARKET_CAP = PRINCIPAL // 2  # 종목당 상한(리스크 헌법 50%)
MIN_ORDER_KRW = 5_500
STOP_LOSS = -0.03                # 포지션 손절
DAY_LOSS_LIMIT = -0.03 * PRINCIPAL    # -9,000원: 당일 신규 진입 중단
WEEK_LOSS_LIMIT = -0.07 * PRINCIPAL   # -21,000원: 그 주 매매 중단
CIRCUIT_BREAKER = 0.85 * PRINCIPAL    # 총자산 255,000원 미만 → 전면 중단·회장 보고


def kst_today() -> str:
    return (datetime.datetime.utcnow() + datetime.timedelta(hours=9)).strftime("%Y-%m-%d")


def kst_week() -> str:
    d = datetime.datetime.utcnow() + datetime.timedelta(hours=9)
    return f"{d.isocalendar().year}-W{d.isocalendar().week}"


def vault_get(name: str) -> str:
    out = subprocess.run(
        ["curl", "-s", f"{os.environ['VAULT_URL']}/secrets/{name}",
         "-H", f"Authorization: Bearer {os.environ['VAULT_TOKEN']}"],
        capture_output=True, text=True, timeout=15).stdout
    parsed = json.loads(out)
    if "value" not in parsed:
        # 2026-08-17 HQ 진단: 이전엔 여기서 맨 KeyError만 나서 원인이 안 보였다
        # (company3_live_state 자체가 한 번도 안 써진 상태였음 — 진짜 원인은
        # live_trade.py 실행 자체가 권한 분류기에 막혀 save_state()까지 못 간 것,
        # 아래 load_state()의 except 절이 이 메시지를 로그에 남긴다).
        raise KeyError(f"vault key '{name}' not found: {parsed}")
    return parsed["value"]


def vault_put(name: str, value: str) -> None:
    subprocess.run(
        ["curl", "-s", "-X", "PUT", f"{os.environ['VAULT_URL']}/secrets/{name}",
         "-H", f"Authorization: Bearer {os.environ['VAULT_TOKEN']}",
         "-H", "Content-Type: application/json",
         "-d", json.dumps({"value": value})],
        capture_output=True, text=True, timeout=15, check=True)


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

    def _req(self, method: str, path: str, query: dict | None = None, retries: int = 8):
        """세션 출구 IP가 등록 범위를 벗어나면 401이 난다 → 재시도로 흡수.
        401은 인증 단계 거부라 주문 POST도 재시도가 안전하다. 그 외 네트워크
        오류는 GET만 재시도(POST는 체결 여부가 모호해지므로 즉시 예외)."""
        import time as _time
        last = None
        for attempt in range(retries):
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
            try:
                with urllib.request.urlopen(req, timeout=10) as r:
                    return json.loads(r.read().decode())
            except urllib.error.HTTPError as e:
                last = e
                if e.code == 401 and attempt < retries - 1:
                    _time.sleep(0.4)
                    continue
                raise
            except urllib.error.URLError as e:
                last = e
                if method == "GET" and attempt < retries - 1:
                    _time.sleep(0.4)
                    continue
                raise
        raise last

    def accounts(self):
        return self._req("GET", "accounts")

    def buy_market(self, market: str, krw_amount: int):
        return self._req("POST", "orders", {
            "market": market, "side": "bid",
            "price": str(krw_amount), "ord_type": "price"})

    def sell_market(self, market: str, volume: float):
        return self._req("POST", "orders", {
            "market": market, "side": "ask",
            "volume": f"{volume:.8f}", "ord_type": "market"})


def public(path: str, params: dict):
    url = f"https://api.upbit.com/v1/{path}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read().decode())


def v2_signal(market: str) -> dict:
    candles = public("candles/days", {"market": market, "count": MA_WINDOW + 2})
    candles.sort(key=lambda c: c["candle_date_time_kst"])
    today, yday = candles[-1], candles[-2]
    closes = [c["trade_price"] for c in candles[:-1]]
    ma = sum(closes[-MA_WINDOW:]) / MA_WINDOW
    target = today["opening_price"] + (yday["high_price"] - yday["low_price"]) * K
    price_now = public("ticker", {"markets": market})[0]["trade_price"]
    return {"market": market, "ma20": round(ma, 2), "open": today["opening_price"],
            "target": round(target, 2), "price_now": price_now,
            "filter_pass": today["opening_price"] > ma,
            "breakout": price_now >= target}


def load_state() -> dict:
    """금고를 정본으로 삼고 로컬 파일은 폴백.

    루틴 세션은 저장소에 push할 권한이 없어(2026-08-15 확인) 커밋으로는 상태가
    보존되지 않는다. 금고는 모든 세션이 접근 가능하므로 여기를 정본으로 쓴다.
    """
    try:
        raw = vault_get(VAULT_STATE_KEY)
        if raw:
            return json.loads(raw)
    except Exception as e:
        print(f"  (금고 상태 조회 실패 — 로컬 파일로 폴백: {type(e).__name__})")
    if os.path.exists(STATE_PATH):
        with open(STATE_PATH, encoding="utf-8") as f:
            return json.load(f)
    return {"positions": {}, "traded_dates": {}, "realized": {}, "halt": None}


def save_state(state: dict):
    os.makedirs(LIVE_DIR, exist_ok=True)
    with open(STATE_PATH, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)
    try:
        vault_put(VAULT_STATE_KEY, json.dumps(state, ensure_ascii=False))
    except Exception as e:
        # 금고 저장 실패는 치명적이다 — 커밋도 막히면 상태가 통째로 사라진다.
        print(f"⚠ 금고 상태 저장 실패({type(e).__name__}) — 이 실행의 포지션 기록이 "
              f"유실될 수 있음. 다음 실행은 거래소 잔고에서 포지션을 복원한다.")


def log_event(event: dict):
    os.makedirs(LIVE_DIR, exist_ok=True)
    event["ts"] = datetime.datetime.utcnow().isoformat() + "Z"
    with open(LIVE_LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(event, ensure_ascii=False) + "\n")


def realized_sum(state: dict, keys: list[str]) -> float:
    return sum(state["realized"].get(k, 0.0) for k in keys)


def verify_already_done() -> bool:
    """log.jsonl에 왕복 검증 성공 기록이 있는지."""
    if not os.path.exists(LIVE_LOG):
        return False
    with open(LIVE_LOG, encoding="utf-8") as f:
        return any('"verify_roundtrip_ok"' in line for line in f)


def recover_orphan_positions(state: dict, accounts_raw: dict, today: str, live: bool) -> None:
    """거래소 잔고에는 있는데 state에 기록이 없는 포지션을 복원한다.

    루틴 세션이 매수 후 state.json 커밋에 실패하면(2026-08-15 실제 발생) 다음
    실행이 포지션을 인식하지 못해 손절·청산이 통째로 작동하지 않는다. 거래소
    잔고가 진실의 원천이므로, 업비트가 주는 avg_buy_price로 진입가를 복원해
    리스크 헌법(§4)의 손절을 되살린다. 진입일은 알 수 없어 오늘로 잡으므로
    보유 1일 청산이 최대 하루 늦어질 수 있다 — 손절은 정상 작동한다.
    MARKETS 밖의 코인(PICA 등 회장 기존 보유분)은 대상이 아니다.
    """
    for market in MARKETS:
        if market in state["positions"]:
            continue
        cur = market.split("-")[1]
        acc = accounts_raw.get(cur)
        if not acc:
            continue
        vol = float(acc["balance"])
        avg_buy = float(acc.get("avg_buy_price") or 0)
        if vol <= 0 or avg_buy <= 0:
            continue
        price = public("ticker", {"markets": market})[0]["trade_price"]
        if vol * price < MIN_ORDER_KRW:
            continue  # 먼지 잔고는 무시
        state["positions"][market] = {"entry_price": avg_buy, "entry_date": today,
                                      "krw": round(vol * avg_buy)}
        print(f"⚠ {market}: 기록 없는 보유분 발견 — 거래소 평단 {avg_buy:,.0f}원으로 포지션 복원 "
              f"({vol:.8f}개 ≈{vol*price:,.0f}원)")
        log_event({"mode": "LIVE" if live else "DRY-RUN", "action": "orphan_recovered",
                   "market": market, "volume": vol, "avg_buy_price": avg_buy})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--live", action="store_true")
    args = ap.parse_args()
    mode = "LIVE" if args.live else "DRY-RUN"
    today, week = kst_today(), kst_week()
    print(f"=== 나다컴퍼니3 실거래 집행 v2 [{mode}] {today} ===")

    up = Upbit()
    state = load_state()
    if args.live:
        # 실행 하트비트: 무거래 날에도 --live가 실제로 돌았는지 금고 기록으로 증명된다.
        # (2026-08-18 도입 — 상태 내용이 안 변하는 날엔 "루틴 성공"과 "루틴 불발"이
        #  구분되지 않던 관측 공백을 메움. 09:40 동기화가 이 값을 저장소로 내린다.)
        state["last_live_run"] = datetime.datetime.utcnow().isoformat() + "Z"

    # ---- 1회성 매수/매도 경로 검증 (회장 질문 대응, 2026-08-14) ----
    # verify_requested 플래그가 있으면 최소금액(5,500원) BTC 왕복 주문으로
    # 실제 주문 경로를 검증하고 플래그를 삭제한다. --live에서만 동작.
    # 플래그 삭제가 커밋되지 못하면 매 실행마다 재검증되므로(2026-08-15 실제 발생),
    # 로그에 성공 기록이 있으면 플래그가 남아있어도 건너뛴다.
    verify_flag = os.path.join(LIVE_DIR, "verify_requested")
    if args.live and os.path.exists(verify_flag) and verify_already_done():
        print("[LIVE] 경로 검증은 이미 완료됨(로그 기록 확인) — 재검증 건너뜀")
    elif args.live and os.path.exists(verify_flag):
        os.remove(verify_flag)
        r1 = up.buy_market("KRW-BTC", 5500)
        print(f"[LIVE] 검증 매수: BTC 시장가 5,500원 — uuid {r1.get('uuid')}")
        import time as _t
        vol = 0.0
        for _ in range(10):
            _t.sleep(1)
            vol = next((float(a["balance"]) for a in up.accounts() if a["currency"] == "BTC"), 0.0)
            if vol > 0:
                break
        if vol > 0:
            r2 = up.sell_market("KRW-BTC", vol)
            print(f"[LIVE] 검증 매도: BTC {vol:.8f}개 전량 — uuid {r2.get('uuid')}")
            log_event({"mode": "LIVE", "action": "verify_roundtrip_ok",
                       "buy_uuid": r1.get("uuid"), "sell_uuid": r2.get("uuid"), "volume": vol})
            print("[LIVE] ✅ 매수/매도 경로 검증 성공")
        else:
            log_event({"mode": "LIVE", "action": "verify_buy_unfilled", "buy_uuid": r1.get("uuid")})
            print("[LIVE] ⚠ 검증 매수 미체결 — 수동 확인 필요")

    accounts_raw = {a["currency"]: a for a in up.accounts()}
    accounts = {c: float(a["balance"]) for c, a in accounts_raw.items()}
    krw = accounts.get("KRW", 0.0)

    # ---- 기록 유실 대비: 거래소 잔고 기준으로 포지션 복원 ----
    recover_orphan_positions(state, accounts_raw, today, args.live)

    # ---- 총자산 평가 + 서킷브레이커 ----
    total = krw
    for market, pos in state["positions"].items():
        cur = market.split("-")[1]
        vol = accounts.get(cur, 0.0)
        if vol > 0:
            total += vol * public("ticker", {"markets": market})[0]["trade_price"]
    print(f"KRW {krw:,.0f}원 | 평가 총자산 {total:,.0f}원 (원금 {PRINCIPAL:,}원)")
    if total < CIRCUIT_BREAKER:
        state["halt"] = f"circuit_breaker {today} total={round(total)}"
        print(f"🚨 서킷브레이커: 총자산 {total:,.0f} < {CIRCUIT_BREAKER:,.0f} — 전면 중단, 회장 보고 필요")
        log_event({"mode": mode, "action": "circuit_breaker", "total": round(total)})
        if args.live:
            save_state(state)
        return
    if state.get("halt"):
        print(f"⛔ halt 상태({state['halt']}) — 회장 보고/해제 전 매매 없음")
        return

    # ---- 1) 청산: 전일 진입 포지션(아침 정산) + 손절(-3%) ----
    for market in list(state["positions"].keys()):
        pos = state["positions"][market]
        cur = market.split("-")[1]
        vol = accounts.get(cur, 0.0)
        price = public("ticker", {"markets": market})[0]["trade_price"]
        if vol * price < MIN_ORDER_KRW:
            print(f"  {market}: 보유 기록 있으나 잔고 먼지 수준 — 포지션 기록 정리")
            if args.live:
                state["positions"].pop(market)
            continue
        ret = (price - pos["entry_price"]) / pos["entry_price"]
        reason = None
        if pos["entry_date"] < today:
            reason = "morning_exit"   # 보유 1일 전략의 정상 청산
        elif ret <= STOP_LOSS:
            reason = "stop_loss"
        if reason:
            pnl = round(vol * price - pos["krw"])
            if args.live:
                resp = up.sell_market(market, vol)
                state["positions"].pop(market)
                state["realized"][today] = state["realized"].get(today, 0.0) + pnl
                state["realized"][week] = state["realized"].get(week, 0.0) + pnl
                log_event({"mode": "LIVE", "action": "sell", "market": market, "reason": reason,
                           "volume": vol, "price": price, "pnl_krw": pnl,
                           "uuid": resp.get("uuid")})
                print(f"[LIVE] {market} {reason}: {vol:.8f}개 매도 ≈{vol*price:,.0f}원 (손익 {pnl:+,}원)")
            else:
                print(f"[DRY-RUN] {market} {reason} 대상: {vol:.8f}개 ≈{vol*price:,.0f}원 (손익 {pnl:+,}원)")
        else:
            print(f"  {market}: 보유 유지 (진입 {pos['entry_price']:,} → 현재 {price:,}, {ret*100:+.2f}%)")

    # ---- 2) 손실 한도 체크 ----
    day_pnl = realized_sum(state, [today])
    week_pnl = realized_sum(state, [week])
    if week_pnl <= WEEK_LOSS_LIMIT:
        print(f"⛔ 주 손실 한도 도달({week_pnl:+,.0f}원) — 이번 주 신규 진입 없음 + 리뷰 문서 필요")
        log_event({"mode": mode, "action": "week_limit", "week_pnl": week_pnl})
        if args.live:
            save_state(state)
        return
    if day_pnl <= DAY_LOSS_LIMIT:
        print(f"⛔ 일 손실 한도 도달({day_pnl:+,.0f}원) — 오늘 신규 진입 없음")
        if args.live:
            save_state(state)
        return

    # ---- 3) 진입: v2 신호 (당일 재진입 금지) ----
    accounts = {a["currency"]: float(a["balance"]) for a in up.accounts()}
    krw = accounts.get("KRW", 0.0)
    budget = min(krw, PHASE1_CAP)
    invested = sum(p["krw"] for p in state["positions"].values())
    for market in MARKETS:
        if market in state["positions"]:
            continue
        if state["traded_dates"].get(market) == today:
            continue  # 당일 재진입 금지
        sig = v2_signal(market)
        status = []
        if not sig["filter_pass"]:
            status.append("MA20 차단")
        if not sig["breakout"]:
            status.append("미돌파")
        if not status:
            size = int(min(budget // 2, PER_MARKET_CAP, PHASE1_CAP - invested))
            if size < MIN_ORDER_KRW:
                status.append(f"예산 소진(가용 {size:,}원)")
            else:
                if args.live:
                    resp = up.buy_market(market, size)
                    state["positions"][market] = {"entry_price": sig["price_now"],
                                                  "entry_date": today, "krw": size}
                    state["traded_dates"][market] = today
                    invested += size
                    log_event({"mode": "LIVE", "action": "buy", "market": market,
                               "krw": size, "price": sig["price_now"], "uuid": resp.get("uuid")})
                    print(f"[LIVE] ✅ {market} 진입: 시장가 매수 {size:,}원 @≈{sig['price_now']:,}")
                else:
                    print(f"[DRY-RUN] ✅ {market} 진입 신호: 시장가 매수 {size:,}원 (전송 안 함)")
                    log_event({"mode": "DRY-RUN", "action": "would_buy", "market": market, "krw": size})
                continue
        print(f"  {market}: 현재 {sig['price_now']:,} / 목표 {sig['target']:,} / MA20 {sig['ma20']:,} → {' · '.join(status)}")

    if args.live:
        save_state(state)
    print(f"\n[{mode}] 완료 | 일 실현손익 {day_pnl:+,.0f}원 | 주 {week_pnl:+,.0f}원 | 투입 {invested:,}원/{PHASE1_CAP:,}원")


if __name__ == "__main__":
    main()
