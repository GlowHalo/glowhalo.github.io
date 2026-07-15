import React, { useState, useMemo } from "react";
import { Plus, Trash2, ChevronRight, Wallet, CalendarClock, History, X } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

/* ----------------------------- 기준일 & 환율 (데모용) ----------------------------- */
const TODAY = new Date("2026-07-09");
const FX_USD_KRW = 1380;

/* ----------------------------- 배당 시리즈 생성기 ----------------------------- */
function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}
function fmt(d) {
  return d.toISOString().slice(0, 10);
}
function generateDividends({ startDate, freqMonths, baseAmount, annualGrowth, payLagDays, confirmWindowDays }) {
  const events = [];
  let d = new Date(startDate);
  const startYear = d.getFullYear();
  const endBound = addMonths(TODAY, 6);
  let guard = 0;
  while (d <= endBound && guard < 60) {
    const yearsElapsed = d.getFullYear() - startYear;
    const perShare = +(baseAmount * Math.pow(1 + annualGrowth, yearsElapsed)).toFixed(3);
    const payDate = new Date(d);
    payDate.setDate(payDate.getDate() + payLagDays);
    const daysToEx = (d - TODAY) / (1000 * 60 * 60 * 24);
    let status;
    if (d <= TODAY) status = "paid";
    else if (daysToEx <= confirmWindowDays) status = "confirmed";
    else status = "estimated";
    events.push({ exDate: fmt(d), payDate: fmt(payDate), perShare, status });
    d = addMonths(d, freqMonths);
    guard++;
  }
  return events;
}

/* ----------------------------- 데모 종목 DB ----------------------------- */
const STOCKS = [
  { ticker: "005930", name: "삼성전자", market: "KR", currency: "KRW",
    dividends: generateDividends({ startDate: "2023-12-28", freqMonths: 3, baseAmount: 361, annualGrowth: 0.03, payLagDays: 45, confirmWindowDays: 55 }) },
  { ticker: "033780", name: "KT&G", market: "KR", currency: "KRW",
    dividends: generateDividends({ startDate: "2024-03-28", freqMonths: 6, baseAmount: 1500, annualGrowth: 0.02, payLagDays: 50, confirmWindowDays: 80 }) },
  { ticker: "017670", name: "SK텔레콤", market: "KR", currency: "KRW",
    dividends: generateDividends({ startDate: "2024-03-28", freqMonths: 3, baseAmount: 830, annualGrowth: 0.015, payLagDays: 48, confirmWindowDays: 60 }) },
  { ticker: "086790", name: "하나금융지주", market: "KR", currency: "KRW",
    dividends: generateDividends({ startDate: "2024-02-20", freqMonths: 3, baseAmount: 700, annualGrowth: 0.05, payLagDays: 40, confirmWindowDays: 55 }) },
  { ticker: "088980", name: "맥쿼리인프라", market: "KR", currency: "KRW",
    dividends: generateDividends({ startDate: "2024-01-25", freqMonths: 6, baseAmount: 385, annualGrowth: 0.01, payLagDays: 35, confirmWindowDays: 70 }) },
  { ticker: "AAPL", name: "Apple", market: "US", currency: "USD",
    dividends: generateDividends({ startDate: "2024-02-09", freqMonths: 3, baseAmount: 0.24, annualGrowth: 0.04, payLagDays: 14, confirmWindowDays: 40 }) },
  { ticker: "MSFT", name: "Microsoft", market: "US", currency: "USD",
    dividends: generateDividends({ startDate: "2024-02-15", freqMonths: 3, baseAmount: 0.75, annualGrowth: 0.09, payLagDays: 14, confirmWindowDays: 40 }) },
  { ticker: "KO", name: "Coca-Cola", market: "US", currency: "USD",
    dividends: generateDividends({ startDate: "2024-03-15", freqMonths: 3, baseAmount: 0.485, annualGrowth: 0.03, payLagDays: 14, confirmWindowDays: 40 }) },
  { ticker: "O", name: "Realty Income", market: "US", currency: "USD",
    dividends: generateDividends({ startDate: "2024-01-15", freqMonths: 1, baseAmount: 0.256, annualGrowth: 0.02, payLagDays: 12, confirmWindowDays: 35 }) },
  { ticker: "T", name: "AT&T", market: "US", currency: "USD",
    dividends: generateDividends({ startDate: "2024-01-10", freqMonths: 3, baseAmount: 0.2775, annualGrowth: 0.0, payLagDays: 14, confirmWindowDays: 40 }) },
];
const getStock = (ticker) => STOCKS.find((s) => s.ticker === ticker);

/* ----------------------------- 유틸 ----------------------------- */
const won = (n) => `₩${Math.round(n).toLocaleString("ko-KR")}`;
const monthKey = (dateStr) => dateStr.slice(0, 7);
const thisMonthKey = fmt(TODAY).slice(0, 7);

function grossKRW(event, stock, qty) {
  const gross = event.perShare * qty;
  return stock.currency === "KRW" ? gross : gross * FX_USD_KRW;
}
function netKRW(event, stock, qty) {
  const gross = grossKRW(event, stock, qty);
  const rate = stock.currency === "KRW" ? 0.154 : 0.15;
  return gross * (1 - rate);
}

/* ----------------------------- 계좌유형 ----------------------------- */
const ACCOUNT_TYPES = [
  { key: "general", label: "일반위탁", short: "일반", taxLabel: "세후 즉시과세" },
  { key: "isa", label: "ISA", short: "ISA", taxLabel: "과세이연" },
  { key: "pension", label: "연금저축·IRP", short: "연금", taxLabel: "과세이연" },
];
const getAccountType = (key) => ACCOUNT_TYPES.find((a) => a.key === key) || ACCOUNT_TYPES[0];

// 계좌유형에 따라 "확실히 계산 가능한 값"과 "아직 모르는 값"을 분리한다.
// - 일반위탁: 세율이 법으로 고정(15.4%/15%)돼 있어 세후 금액을 확정적으로 계산 가능 (certain: true)
// - ISA: 최종 세액은 계좌 전체 손익통산 후 만기 시점에 결정 → 지금은 세전 금액만 확실함 (certain: false)
// - 연금저축·IRP: 최종 세액은 인출 시점·방식에 따라 결정 → 지금은 세전 금액만 확실함 (certain: false)
const TAX_NOTE = {
  isa: "만기 시 계좌 손익통산 후 비과세 한도 초과분 9.9% 분리과세",
  pension: "인출 시 연금소득세 3.3~5.5% 또는 기타소득세 16.5% (방식에 따라 다름)",
};
function classifyAmount(event, stock, qty, accountType) {
  const gross = grossKRW(event, stock, qty);
  if (accountType === "general") {
    const rate = stock.currency === "KRW" ? 0.154 : 0.15;
    return { gross, net: gross * (1 - rate), certain: true, taxNote: null };
  }
  return { gross, net: null, certain: false, taxNote: TAX_NOTE[accountType] };
}

/* ----------------------------- 메인 컴포넌트 ----------------------------- */
export default function DividendPassbook() {
  const [holdings, setHoldings] = useState([
    { id: 1, ticker: "005930", quantity: 10, purchaseDate: "2024-01-10", accountType: "general" },
    { id: 2, ticker: "O", quantity: 5, purchaseDate: "2023-11-01", accountType: "isa" },
    { id: 3, ticker: "033780", quantity: 20, purchaseDate: "2024-02-01", accountType: "pension" },
  ]);
  const [tab, setTab] = useState("holdings");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ticker: STOCKS[0].ticker, quantity: "", purchaseDate: "", accountType: "general" });

  const addHolding = () => {
    if (!form.quantity || !form.purchaseDate) return;
    setHoldings((h) => [
      ...h,
      { id: Date.now(), ticker: form.ticker, quantity: Number(form.quantity), purchaseDate: form.purchaseDate, accountType: form.accountType },
    ]);
    setForm({ ticker: STOCKS[0].ticker, quantity: "", purchaseDate: "", accountType: "general" });
    setShowAdd(false);
  };
  const removeHolding = (id) => setHoldings((h) => h.filter((x) => x.id !== id));

  /* 모든 보유분에 대해 이벤트 전개 */
  const allEvents = useMemo(() => {
    const list = [];
    holdings.forEach((h) => {
      const stock = getStock(h.ticker);
      if (!stock) return;
      stock.dividends
        .filter((e) => e.exDate >= h.purchaseDate)
        .forEach((e) => {
          const c = classifyAmount(e, stock, h.quantity, h.accountType);
          list.push({
            ...e,
            holdingId: h.id,
            ticker: h.ticker,
            name: stock.name,
            market: stock.market,
            currency: stock.currency,
            qty: h.quantity,
            accountType: h.accountType,
            gross: c.gross,
            net: c.net,
            certain: c.certain,
            taxNote: c.taxNote,
          });
        });
    });
    return list;
  }, [holdings]);

  const paidEvents = allEvents.filter((e) => e.status === "paid").sort((a, b) => a.exDate.localeCompare(b.exDate));
  const confirmedEvents = allEvents.filter((e) => e.status === "confirmed").sort((a, b) => a.exDate.localeCompare(b.exDate));
  const estimatedEvents = allEvents.filter((e) => e.status === "estimated").sort((a, b) => a.exDate.localeCompare(b.exDate));

  const thisMonthEvents = [...paidEvents, ...confirmedEvents]
    .filter((e) => monthKey(e.exDate) === thisMonthKey || monthKey(e.payDate) === thisMonthKey)
    .sort((a, b) => a.exDate.localeCompare(b.exDate));

  // 종합과세 2천만원 기준은 "일반위탁" 계좌 배당만 합산 (ISA·연금계좌는 과세이연으로 제외)
  const yearGross = paidEvents
    .filter((e) => e.exDate.slice(0, 4) === TODAY.getFullYear().toString() && e.accountType === "general")
    .reduce((s, e) => s + e.gross, 0);

  // 누적 합계는 계좌별로 분리 (확실한 값과 아직 모르는 값을 하나로 섞지 않음)
  const generalNetAllTime = paidEvents.filter((e) => e.accountType === "general").reduce((s, e) => s + e.net, 0);
  const isaGrossAllTime = paidEvents.filter((e) => e.accountType === "isa").reduce((s, e) => s + e.gross, 0);
  const pensionGrossAllTime = paidEvents.filter((e) => e.accountType === "pension").reduce((s, e) => s + e.gross, 0);

  const THRESHOLD = 20000000;
  const pct = Math.min(100, (yearGross / THRESHOLD) * 100);

  // 러닝 합계는 세전(gross) 기준으로 통일 — 계좌 상관없이 비교 가능한 유일한 공통 기준
  const ledgerAsc = [];
  let running = 0;
  paidEvents.forEach((e) => {
    running += e.gross;
    ledgerAsc.push({ ...e, running });
  });
  const ledgerDesc = [...ledgerAsc].reverse();

  // 차트 데이터 (월별 누적)
  const chartData = useMemo(() => {
    const byMonth = {};
    ledgerAsc.forEach((e) => {
      byMonth[monthKey(e.exDate)] = e.running;
    });
    return Object.entries(byMonth).map(([m, v]) => ({ month: m.slice(2), value: Math.round(v) }));
  }, [ledgerAsc]);

  return (
    <div className="min-h-screen w-full flex justify-center" style={{ background: "#EDE9DC" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;700&family=Noto+Sans+KR:wght@400;500;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
        .serif { font-family: 'Noto Serif KR', serif; }
        .sans { font-family: 'Noto Sans KR', sans-serif; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .stamp {
          border: 1.5px solid #9C7A3C;
          color: #9C7A3C;
          transform: rotate(-6deg);
        }
      `}</style>

      <div className="w-full max-w-[430px] min-h-screen sans" style={{ background: "#F5F1E6", boxShadow: "0 0 40px rgba(0,0,0,0.08)" }}>
        {/* 상단 - 통장 표지 느낌 */}
        <div className="relative px-6 pt-8 pb-6" style={{ background: "#1F2A44" }}>
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={18} color="#9C7A3C" />
            <span className="mono text-xs tracking-widest" style={{ color: "#9C7A3C" }}>DIVIDEND PASSBOOK</span>
          </div>
          <h1 className="serif text-2xl font-bold" style={{ color: "#F5F1E6" }}>배당통장</h1>
          <p className="text-xs mt-1" style={{ color: "#8B93A8" }}>이경환님의 배당 기록 · 국내·해외 통합</p>
          {/* 절취선 느낌 */}
          <div className="absolute left-0 right-0 -bottom-[1px] flex" style={{ height: 8 }}>
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="flex-1" style={{ height: 8, borderRadius: "0 0 8px 8px", background: i % 2 === 0 ? "#1F2A44" : "transparent" }} />
            ))}
          </div>
        </div>

        {/* 이번달 확정 배당 */}
        <div className="px-5 pt-6">
          <div className="rounded-2xl p-4" style={{ background: "#FFFDF8", border: "1px solid #E4DCC5" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: "#4B5670" }}>이번 달 확정 배당</span>
              {thisMonthEvents.length > 0 && (
                <span className="stamp text-[10px] px-2 py-0.5 rounded-sm mono font-semibold">확정</span>
              )}
            </div>
            {thisMonthEvents.length === 0 ? (
              <p className="text-sm" style={{ color: "#8B93A8" }}>이번 달 확정된 배당이 아직 없어요.</p>
            ) : (
              <>
                <div className="serif text-3xl font-bold mono" style={{ color: "#1F2A44" }}>
                  {won(thisMonthEvents.reduce((s, e) => s + e.gross, 0))}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: "#8B93A8" }}>세전 합계 (계좌별 실수령은 아래 참고)</div>
                <div className="mt-3 space-y-2">
                  {thisMonthEvents.map((e, i) => (
                    <div key={i} className="text-xs">
                      <div className="flex justify-between">
                        <span style={{ color: "#4B5670" }}>
                          {e.name} · {e.exDate.slice(5)} 배당락
                          <span className="mono ml-1" style={{ color: "#8B93A8" }}>[{getAccountType(e.accountType).short}]</span>
                        </span>
                        <span className="mono font-medium" style={{ color: "#1F2A44" }}>{won(e.gross)}</span>
                      </div>
                      {e.certain ? (
                        <div className="text-right text-[10px] mono" style={{ color: "#9C7A3C" }}>세후 확정 {won(e.net)}</div>
                      ) : (
                        <div className="text-right text-[10px]" style={{ color: "#8B93A8" }}>{e.taxNote}</div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 누적 요약 + 종합과세 게이지 */}
        <div className="px-5 pt-4">
          <div className="rounded-2xl p-4" style={{ background: "#FFFDF8", border: "1px solid #E4DCC5" }}>
            <div className="flex justify-between items-baseline">
              <span className="text-xs" style={{ color: "#4B5670" }}>{TODAY.getFullYear()}년 누적 배당소득 (세전)</span>
              <span className="mono text-xs" style={{ color: "#8B93A8" }}>기준 2,000만원</span>
            </div>
            <div className="serif text-xl font-bold mono mt-1" style={{ color: "#1F2A44" }}>{won(yearGross)}</div>
            <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: "#EDE9DC" }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct > 80 ? "#B23A3A" : "#9C7A3C" }} />
            </div>
            {pct > 70 && (
              <p className="text-[11px] mt-1.5" style={{ color: "#B23A3A" }}>종합과세 기준(2천만원)에 가까워지고 있어요. 정확한 세액은 세무사 확인을 권장해요.</p>
            )}
            <div className="mt-3 pt-3 space-y-1" style={{ borderTop: "1px dashed #E4DCC5" }}>
              <div className="flex justify-between text-[11px]">
                <span style={{ color: "#4B5670" }}>일반위탁 누적 (세후 확정)</span>
                <span className="mono font-medium" style={{ color: "#1F2A44" }}>{won(generalNetAllTime)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span style={{ color: "#4B5670" }}>ISA 누적 (세전, 만기 정산 예정)</span>
                <span className="mono font-medium" style={{ color: "#9C7A3C" }}>{won(isaGrossAllTime)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span style={{ color: "#4B5670" }}>연금계좌 누적 (세전, 인출 시 정산 예정)</span>
                <span className="mono font-medium" style={{ color: "#9C7A3C" }}>{won(pensionGrossAllTime)}</span>
              </div>
            </div>

            {chartData.length > 1 && (
              <div className="mt-3 -mx-1" style={{ height: 90 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillInk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1F2A44" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#1F2A44" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#8B93A8" }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      formatter={(v) => [won(v), "누적(세전)"]}
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E4DCC5" }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#1F2A44" strokeWidth={1.5} fill="url(#fillInk)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* 탭 */}
        <div className="px-5 pt-5 flex gap-1.5">
          {[
            { key: "holdings", label: "보유종목", icon: Wallet },
            { key: "upcoming", label: "예정배당", icon: CalendarClock },
            { key: "ledger", label: "지난기록", icon: History },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
              style={{
                background: tab === t.key ? "#1F2A44" : "#FFFDF8",
                color: tab === t.key ? "#F5F1E6" : "#4B5670",
                border: tab === t.key ? "none" : "1px solid #E4DCC5",
              }}
            >
              <t.icon size={13} />
              {t.label}
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        <div className="px-5 py-4 pb-10">
          {tab === "holdings" && (
            <div className="space-y-2.5">
              {!showAdd ? (
                <button
                  onClick={() => setShowAdd(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5"
                  style={{ background: "#1F2A44", color: "#F5F1E6" }}
                >
                  <Plus size={15} /> 종목 추가
                </button>
              ) : (
                <div className="rounded-xl p-3.5 space-y-2.5" style={{ background: "#FFFDF8", border: "1px solid #E4DCC5" }}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium" style={{ color: "#4B5670" }}>새 종목 추가</span>
                    <button onClick={() => setShowAdd(false)}><X size={15} color="#8B93A8" /></button>
                  </div>
                  <select
                    value={form.ticker}
                    onChange={(e) => setForm({ ...form, ticker: e.target.value })}
                    className="w-full text-sm rounded-lg px-3 py-2 mono"
                    style={{ border: "1px solid #E4DCC5", background: "#F5F1E6", color: "#1F2A44" }}
                  >
                    {STOCKS.map((s) => (
                      <option key={s.ticker} value={s.ticker}>
                        {s.name} ({s.market === "KR" ? "국내" : "해외"} · {s.ticker})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="보유 수량"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full text-sm rounded-lg px-3 py-2"
                    style={{ border: "1px solid #E4DCC5", background: "#F5F1E6", color: "#1F2A44" }}
                  />
                  <input
                    type="date"
                    value={form.purchaseDate}
                    onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                    className="w-full text-sm rounded-lg px-3 py-2"
                    style={{ border: "1px solid #E4DCC5", background: "#F5F1E6", color: "#1F2A44" }}
                  />
                  <div className="flex gap-1.5">
                    {ACCOUNT_TYPES.map((a) => (
                      <button
                        key={a.key}
                        onClick={() => setForm({ ...form, accountType: a.key })}
                        className="flex-1 py-1.5 rounded-lg text-xs font-medium"
                        style={{
                          background: form.accountType === a.key ? "#1F2A44" : "#F5F1E6",
                          color: form.accountType === a.key ? "#F5F1E6" : "#4B5670",
                          border: "1px solid #E4DCC5",
                        }}
                      >
                        {a.short}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={addHolding}
                    className="w-full py-2 rounded-lg text-sm font-medium"
                    style={{ background: "#9C7A3C", color: "#FFFDF8" }}
                  >
                    추가하기
                  </button>
                </div>
              )}

              {holdings.map((h) => {
                const stock = getStock(h.ticker);
                if (!stock) return null;
                const acc = getAccountType(h.accountType);
                const events = paidEvents.filter((e) => e.holdingId === h.id);
                const totalGross = events.reduce((s, e) => s + e.gross, 0);
                const totalNet = events.reduce((s, e) => s + e.net, 0);
                return (
                  <div key={h.id} className="rounded-xl p-3.5 flex items-center justify-between" style={{ background: "#FFFDF8", border: "1px solid #E4DCC5" }}>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium" style={{ color: "#1F2A44" }}>{stock.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded mono" style={{ background: "#EDE9DC", color: "#4B5670" }}>
                          {stock.market === "KR" ? "국내" : "해외"}
                        </span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded mono"
                          style={{ background: h.accountType === "general" ? "#EDE9DC" : "#F0E9D8", color: h.accountType === "general" ? "#4B5670" : "#9C7A3C" }}
                        >
                          {acc.label}
                        </span>
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: "#8B93A8" }}>
                        {h.quantity}주 · {h.purchaseDate} 매입
                      </div>
                      <div className="text-[11px] mono mt-1" style={{ color: "#1F2A44" }}>
                        누적 세전 {won(totalGross)}
                      </div>
                      {h.accountType === "general" ? (
                        <div className="text-[11px] mono" style={{ color: "#9C7A3C" }}>세후 확정 {won(totalNet)}</div>
                      ) : (
                        <div className="text-[10px]" style={{ color: "#8B93A8" }}>{TAX_NOTE[h.accountType]}</div>
                      )}
                    </div>
                    <button onClick={() => removeHolding(h.id)}>
                      <Trash2 size={15} color="#B23A3A" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "upcoming" && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="stamp text-[10px] px-2 py-0.5 rounded-sm mono font-semibold">확정</span>
                  <span className="text-xs" style={{ color: "#4B5670" }}>이사회 결의 등으로 금액·일정이 정해진 배당</span>
                </div>
                {confirmedEvents.length === 0 ? (
                  <p className="text-xs" style={{ color: "#8B93A8" }}>확정된 예정 배당이 없어요.</p>
                ) : (
                  <div className="space-y-1.5">
                    {confirmedEvents.map((e, i) => (
                      <div key={i} className="rounded-lg p-3" style={{ background: "#FFFDF8", border: "1px solid #E4DCC5" }}>
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-sm" style={{ color: "#1F2A44" }}>
                              {e.name}
                              <span className="mono text-[10px] ml-1.5" style={{ color: "#8B93A8" }}>{getAccountType(e.accountType).short}</span>
                            </div>
                            <div className="text-[11px]" style={{ color: "#8B93A8" }}>배당락 {e.exDate} · 지급 {e.payDate}</div>
                          </div>
                          <span className="mono text-sm font-medium" style={{ color: "#1F2A44" }}>{won(e.gross)}</span>
                        </div>
                        <div className="text-right text-[10px] mt-0.5">
                          {e.certain ? (
                            <span className="mono" style={{ color: "#9C7A3C" }}>세후 확정 {won(e.net)}</span>
                          ) : (
                            <span style={{ color: "#8B93A8" }}>{e.taxNote}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-sm mono font-semibold" style={{ border: "1.5px solid #8B93A8", color: "#8B93A8" }}>예상</span>
                  <span className="text-xs" style={{ color: "#4B5670" }}>과거 지급 패턴 기반 추정치</span>
                </div>
                <div className="space-y-1.5">
                  {estimatedEvents.slice(0, 6).map((e, i) => (
                    <div key={i} className="rounded-lg p-3 flex justify-between items-center" style={{ background: "#F5F1E6", border: "1px dashed #C9C0A5" }}>
                      <div>
                        <div className="text-sm" style={{ color: "#4B5670" }}>
                          {e.name}
                          <span className="mono text-[10px] ml-1.5" style={{ color: "#8B93A8" }}>{getAccountType(e.accountType).short}</span>
                        </div>
                        <div className="text-[11px]" style={{ color: "#8B93A8" }}>배당락 예상 {e.exDate}</div>
                      </div>
                      <span className="mono text-sm" style={{ color: "#8B93A8" }}>약 {won(e.gross)} (세전)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "ledger" && (
            <div>
              <div className="flex justify-between text-[11px] mb-2 px-1" style={{ color: "#8B93A8" }}>
                <span>거래일 / 종목·계좌</span>
                <span>세전 수령액 / 누적</span>
              </div>
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #E4DCC5" }}>
                {ledgerDesc.length === 0 && (
                  <div className="p-4 text-xs text-center" style={{ color: "#8B93A8", background: "#FFFDF8" }}>
                    아직 지급된 배당 기록이 없어요.
                  </div>
                )}
                {ledgerDesc.map((e, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center px-3.5 py-2.5"
                    style={{ background: i % 2 === 0 ? "#FFFDF8" : "#F9F6EE", borderBottom: "1px solid #EDE9DC" }}
                  >
                    <div>
                      <div className="text-xs mono" style={{ color: "#8B93A8" }}>{e.exDate}</div>
                      <div className="text-sm" style={{ color: "#1F2A44" }}>
                        {e.name}
                        <span className="mono text-[10px] ml-1.5" style={{ color: "#8B93A8" }}>{getAccountType(e.accountType).short}</span>
                      </div>
                      {e.certain ? (
                        <div className="text-[10px] mono" style={{ color: "#9C7A3C" }}>세후 {won(e.net)}</div>
                      ) : (
                        <div className="text-[10px]" style={{ color: "#8B93A8" }}>{e.taxNote}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="mono text-sm font-medium" style={{ color: "#1F2A44" }}>+{won(e.gross)}</div>
                      <div className="mono text-[10px]" style={{ color: "#8B93A8" }}>{won(e.running)}</div>
                    </div>
                  </div>
                ))}
              </div>
              {ledgerDesc.length > 0 && (
                <div className="rounded-xl p-3.5 mt-3 space-y-1" style={{ background: "#FFFDF8", border: "1px solid #E4DCC5" }}>
                  <div className="flex justify-between text-[11px]">
                    <span style={{ color: "#4B5670" }}>일반위탁 누적 (세후 확정)</span>
                    <span className="mono font-medium" style={{ color: "#1F2A44" }}>{won(generalNetAllTime)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span style={{ color: "#4B5670" }}>ISA 누적 (세전, 만기 정산 예정)</span>
                    <span className="mono font-medium" style={{ color: "#9C7A3C" }}>{won(isaGrossAllTime)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span style={{ color: "#4B5670" }}>연금계좌 누적 (세전, 인출 시 정산 예정)</span>
                    <span className="mono font-medium" style={{ color: "#9C7A3C" }}>{won(pensionGrossAllTime)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 하단 안내 */}
        <div className="px-5 pb-8">
          <div className="rounded-xl p-3.5 text-[11px] leading-relaxed" style={{ background: "#EDE9DC", color: "#4B5670" }}>
            지금은 프로토타입 단계라 예시 종목·배당 데이터로 계산돼요. 실제 서비스에서는 증권사 계좌 연동과 실시간 시세로 자동 반영되고, 배당금·환율은 지급 시점에 따라 달라질 수 있어요. 모든 금액은 계좌와 무관하게 비교 가능하도록 세전 기준으로 표시하고, 세율이 고정된 일반위탁만 세후 확정 금액을 추가로 병기해요. ISA·연금저축·IRP는 최종 세액이 만기·인출 시점에 결정되므로 임의로 순액을 계산하지 않고 예상 세율 구간만 안내해요. 종합과세 여부는 다른 소득과 합산해 정확히 확인해 주세요.
          </div>
        </div>
      </div>
    </div>
  );
}
