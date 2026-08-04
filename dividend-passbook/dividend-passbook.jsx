import React, { useState, useMemo, useEffect } from "react";
import { Plus, Trash2, Wallet, X, TrendingUp, Percent, LineChart, PieChart, Settings } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, Cell, PieChart as RePieChart, Pie, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

/* ----------------------------- 기준일 & 환율 (데모용) ----------------------------- */
const TODAY = new Date(new Date().toISOString().slice(0, 10));
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

// 실제 계좌에서 확인한 분배금(real)에 이어서, 그 평균 단가로 향후 몇 달치를
// "estimated"로 이어붙인다 — 커버드콜류처럼 금액이 매달 변동해서 공식으로
// 못 만드는 종목은 이 방식으로 "실제 확정분 + 추정 이어붙이기"만 가능하다.
function generateRealDividends({ real, freqMonths, payLagDays, projectMonths }) {
  const known = real.map((r) => ({ ...r, status: "paid" }));
  const avg = real.reduce((s, r) => s + r.perShare, 0) / real.length;
  const events = [...known];
  let d = addMonths(new Date(real[real.length - 1].exDate), freqMonths);
  const endBound = addMonths(TODAY, projectMonths || 6);
  let guard = 0;
  while (d <= endBound && guard < 24) {
    const payDate = new Date(d);
    payDate.setDate(payDate.getDate() + payLagDays);
    events.push({ exDate: fmt(d), payDate: fmt(payDate), perShare: +avg.toFixed(4), status: "estimated" });
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

  // ----- 실제 보유종목 (N2 HTS 입출금내역에서 확인한 실제 분배금 + 그 평균으로 이어붙인 추정치) -----
  { ticker: "491620", name: "RISE 미국테크100데일리고정커버드콜", market: "KR", currency: "KRW",
    dividends: generateRealDividends({
      real: [
        { exDate: "2026-03-31", payDate: "2026-04-02", perShare: 160 },
        { exDate: "2026-04-30", payDate: "2026-05-06", perShare: 276 },
        { exDate: "2026-05-31", payDate: "2026-06-02", perShare: 240 },
        { exDate: "2026-06-30", payDate: "2026-07-02", perShare: 271 },
      ],
      freqMonths: 1, payLagDays: 2,
    }) },
  { ticker: "0138T0", name: "RISE 미국S&P500데일리고정커버드콜", market: "KR", currency: "KRW",
    dividends: generateRealDividends({
      real: [
        { exDate: "2026-04-15", payDate: "2026-04-17", perShare: 118 },
        { exDate: "2026-05-15", payDate: "2026-05-19", perShare: 163 },
        { exDate: "2026-06-15", payDate: "2026-06-17", perShare: 109 },
        { exDate: "2026-07-15", payDate: "2026-07-20", perShare: 144 },
      ],
      freqMonths: 1, payLagDays: 3,
    }) },
  { ticker: "441640", name: "KODEX 미국배당커버드콜액티브", market: "KR", currency: "KRW",
    dividends: generateRealDividends({
      real: [
        { exDate: "2026-04-15", payDate: "2026-04-17", perShare: 99 },
        { exDate: "2026-05-15", payDate: "2026-05-19", perShare: 100 },
        { exDate: "2026-06-15", payDate: "2026-06-17", perShare: 101 },
        { exDate: "2026-07-15", payDate: "2026-07-20", perShare: 103 },
      ],
      freqMonths: 1, payLagDays: 3,
    }) },
  { ticker: "QQQI", name: "네오스 나스닥100 고배당 ETF (NEOS QQQI)", market: "US", currency: "USD",
    dividends: generateRealDividends({
      real: [
        { exDate: "2026-05-01", payDate: "2026-05-25", perShare: 0.573 },
        { exDate: "2026-06-15", payDate: "2026-06-19", perShare: 0.5587 },
      ],
      freqMonths: 1, payLagDays: 20,
    }) },
];
/* ----------------------------- 커스텀 종목 (데모 목록에 없는 실제 보유종목) ----------------------------- */
// 데모 10종목은 배당을 공식으로 생성하지만, 커스텀 종목은 배당 데이터가 없어서
// 사용자가 실제 입금받은 금액을 하나씩 기록해야만 배당 이력이 쌓인다.
// customStocks는 React state가 아니라 vanilla(index.html)와 동일하게 모듈 전역
// 배열로 두고, 컴포넌트 쪽 customStocksVersion을 bump해서 재계산을 트리거한다.
const CUSTOM_STOCKS_KEY = "dividend-passbook:customStocks:v1";
function loadCustomStocks() {
  try {
    const raw = localStorage.getItem(CUSTOM_STOCKS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
let customStocks = loadCustomStocks() || [];
function saveCustomStocks() {
  try {
    localStorage.setItem(CUSTOM_STOCKS_KEY, JSON.stringify(customStocks));
  } catch {}
}
function getStock(tickerOrName) {
  return STOCKS.find((s) => s.ticker === tickerOrName)
    || customStocks.find((s) => s.ticker === tickerOrName || s.name === tickerOrName);
}
function isCustomStock(ticker) {
  return !STOCKS.find((s) => s.ticker === ticker) && !!customStocks.find((s) => s.ticker === ticker);
}
function getOrCreateCustomStock(ticker, name, currency) {
  let stock = getStock(ticker) || getStock(name);
  if (stock) return stock;
  stock = { ticker: ticker || name, name: name || ticker, market: currency === "KRW" ? "KR" : "US", currency: currency || "KRW", dividends: [] };
  customStocks.push(stock);
  saveCustomStocks();
  return stock;
}
function addCustomDividendRecord(ticker, exDate, perShare) {
  const stock = getStock(ticker);
  if (!stock) return;
  stock.dividends.push({ exDate, payDate: exDate, perShare, status: "paid" });
  stock.dividends.sort((a, b) => a.exDate.localeCompare(b.exDate));
  saveCustomStocks();
}

/* ----------------------------- 유틸 ----------------------------- */
const won = (n) => `₩${Math.round(n).toLocaleString("ko-KR")}`;
const monthKey = (dateStr) => dateStr.slice(0, 7);
const thisMonthKey = fmt(TODAY).slice(0, 7);

function grossKRW(event, stock, qty) {
  const gross = event.perShare * qty;
  return stock.currency === "KRW" ? gross : gross * FX_USD_KRW;
}

// 매입금액(원금, 원화 환산) — 매입단가(price)를 입력한 보유분만 계산 가능
function costBasisKRW(h) {
  const stock = getStock(h.ticker);
  if (!stock || !h.price) return 0;
  const cost = h.price * h.quantity;
  return stock.currency === "KRW" ? cost : cost * FX_USD_KRW;
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

/* ----------------------------- 배당 탭: 최근 12개월(실제) + 다음달(추정) 13개월 분해 ----------------------------- */
// 연도 단위로 끊으면 올해 하반기처럼 아직 안 일어난 "추정" 달까지 연간 합계에 섞여
// 허무맹랑해지므로, 오늘 기준 과거로 굴러가는 실제 12개월 + 다음달 추정 1개월만 보여준다.
function trailing13Months(allEvents) {
  const months = [];
  for (let i = -11; i <= 1; i++) {
    const mKey = monthKey(fmt(addMonths(TODAY, i)));
    const events = allEvents.filter((e) => monthKey(e.exDate) === mKey);
    months.push({ month: mKey, value: events.reduce((s, e) => s + e.gross, 0), events, isFuture: i > 0 });
  }
  return months;
}

// 같은 종목의 매수 배치(구매기록)별로 흩어진 이벤트를 종목+배당락일 기준 한 줄로 합친다
// (배당락일 기준 보유수량만 반영되므로 그 시점에 실제로 들고 있던 주수의 합이 된다)
function mergeEventsByTicker(events) {
  const map = {};
  events.forEach((e) => {
    const key = `${e.ticker}__${e.exDate}`;
    if (!map[key]) {
      map[key] = { ticker: e.ticker, name: e.name, currency: e.currency, perShare: e.perShare,
        exDate: e.exDate, payDate: e.payDate, status: e.status, qty: 0, gross: 0, net: 0, allCertain: true, accountTypes: new Set(), taxNote: e.taxNote };
    }
    const m = map[key];
    m.qty += e.qty;
    m.gross += e.gross;
    if (e.certain) m.net += e.net; else m.allCertain = false;
    m.accountTypes.add(e.accountType);
  });
  return Object.values(map).map((m) => ({ ...m, accountTypes: Array.from(m.accountTypes) }));
}

/* ----------------------------- 수익 탭: 기간별 배당 합계 ----------------------------- */
function periodDividendTotal(period, paidEvents) {
  if (period === "total") return paidEvents.reduce((s, e) => s + e.gross, 0);
  if (period === "today") return paidEvents.filter((e) => e.exDate === fmt(TODAY)).reduce((s, e) => s + e.gross, 0);
  if (period === "week") {
    const start = new Date(TODAY);
    start.setDate(TODAY.getDate() - TODAY.getDay());
    return paidEvents.filter((e) => new Date(e.exDate) >= start).reduce((s, e) => s + e.gross, 0);
  }
  if (period === "month") return paidEvents.filter((e) => monthKey(e.exDate) === thisMonthKey).reduce((s, e) => s + e.gross, 0);
  if (period === "quarter") {
    const q = Math.floor(TODAY.getMonth() / 3);
    return paidEvents.filter((e) => {
      const d = new Date(e.exDate);
      return d.getFullYear() === TODAY.getFullYear() && Math.floor(d.getMonth() / 3) === q;
    }).reduce((s, e) => s + e.gross, 0);
  }
  if (period === "year") return paidEvents.filter((e) => e.exDate.slice(0, 4) === String(TODAY.getFullYear())).reduce((s, e) => s + e.gross, 0);
  return 0;
}

/* ----------------------------- 비중 탭: 매입금액(원금) 기준 그룹 ----------------------------- */
function costBasisGroups(holdingsList) {
  const byTicker = {}, byMarket = {}, byAccount = {};
  let total = 0;
  holdingsList.forEach((h) => {
    if (h.sellDate) return;
    const cost = costBasisKRW(h);
    if (!cost) return;
    const stock = getStock(h.ticker);
    if (!stock) return;
    if (!byTicker[h.ticker]) byTicker[h.ticker] = { key: h.ticker, label: stock.name, value: 0 };
    byTicker[h.ticker].value += cost;
    const marketLabel = stock.market === "KR" ? "국내" : "해외";
    byMarket[marketLabel] = (byMarket[marketLabel] || 0) + cost;
    const accLabel = getAccountType(h.accountType).label;
    byAccount[accLabel] = (byAccount[accLabel] || 0) + cost;
    total += cost;
  });
  const toList = (obj) => Object.entries(obj).map(([label, value]) => ({ key: label, label, value })).sort((a, b) => b.value - a.value);
  return {
    total,
    ticker: Object.values(byTicker).sort((a, b) => b.value - a.value),
    market: toList(byMarket),
    account: toList(byAccount),
    uncosted: holdingsList.filter((h) => !h.sellDate && !h.price).length,
  };
}

/* ----------------------------- 추이 탭: 원금(매입금액) 누적 추이 ----------------------------- */
function costBasisTrend(holdingsList) {
  const withCost = holdingsList.filter((h) => h.price).slice().sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate));
  const byMonth = {};
  let running = 0;
  withCost.forEach((h) => {
    running += costBasisKRW(h);
    byMonth[monthKey(h.purchaseDate)] = Math.round(running);
  });
  return Object.entries(byMonth).map(([m, v]) => ({ month: m, value: v }));
}

const DONUT_COLORS = ["#1F2A44", "#9C7A3C", "#8B93A8", "#B23A3A", "#4B5670", "#C9C0A5"];

/* ----------------------------- 보유종목 영속화 (localStorage) ----------------------------- */
// v3: 매입단가(price) 필드 추가 — 비중/원금추이 계산용
const HOLDINGS_STORAGE_KEY = "dividend-passbook:holdings:v3";
function loadHoldings() {
  try {
    const raw = localStorage.getItem(HOLDINGS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
const DEFAULT_HOLDINGS = [
  // 일반위탁 (203-02-227281) — QQQI (매입단가는 실제 체결단가, USD)
  { id: 1, ticker: "QQQI", quantity: 10, price: 53.55, purchaseDate: "2026-04-28", sellDate: null, accountType: "general" },
  { id: 2, ticker: "QQQI", quantity: 33, price: 53.56, purchaseDate: "2026-04-28", sellDate: null, accountType: "general" },
  { id: 3, ticker: "QQQI", quantity: 1, price: 56.47, purchaseDate: "2026-05-19", sellDate: null, accountType: "general" },
  { id: 4, ticker: "QQQI", quantity: 16, price: 56.10, purchaseDate: "2026-06-11", sellDate: null, accountType: "general" },
  { id: 5, ticker: "QQQI", quantity: 13, price: 54.47, purchaseDate: "2026-07-22", sellDate: null, accountType: "general" },
  // 중개형ISA (211-02-404170) — RISE 491620 (매입단가는 실제 체결단가, KRW)
  { id: 6, ticker: "491620", quantity: 20, price: 10505, purchaseDate: "2026-03-12", sellDate: null, accountType: "isa" },
  { id: 7, ticker: "491620", quantity: 491, price: 10140, purchaseDate: "2026-04-03", sellDate: null, accountType: "isa" },
  { id: 8, ticker: "491620", quantity: 500, price: 11105, purchaseDate: "2026-04-23", sellDate: null, accountType: "isa" },
  { id: 9, ticker: "491620", quantity: 64, price: 11660, purchaseDate: "2026-06-30", sellDate: null, accountType: "isa" },
  { id: 10, ticker: "491620", quantity: 36, price: 11295, purchaseDate: "2026-07-22", sellDate: null, accountType: "isa" },
  // 중개형ISA — RISE 0138T0
  { id: 11, ticker: "0138T0", quantity: 317, price: 9475, purchaseDate: "2026-04-03", sellDate: null, accountType: "isa" },
  { id: 12, ticker: "0138T0", quantity: 300, price: 9875, purchaseDate: "2026-04-23", sellDate: null, accountType: "isa" },
  // 중개형ISA — KODEX 441640
  { id: 13, ticker: "441640", quantity: 156, price: 12845, purchaseDate: "2026-04-03", sellDate: null, accountType: "isa" },
  { id: 14, ticker: "441640", quantity: 5, price: 12970, purchaseDate: "2026-04-23", sellDate: null, accountType: "isa" },
  { id: 15, ticker: "441640", quantity: 95, price: 12975, purchaseDate: "2026-04-23", sellDate: null, accountType: "isa" },
];

/* ----------------------------- CSV 일괄 가져오기 (매수 배치·매도 이력 지원) ----------------------------- */
const CSV_HEADER_ALIASES = {
  ticker: ["ticker", "종목코드", "티커", "코드"],
  name: ["name", "종목명", "상품명"],
  currency: ["currency", "통화"],
  quantity: ["quantity", "수량", "주식수"],
  price: ["price", "매입단가", "가격", "체결단가"],
  purchaseDate: ["purchasedate", "매입일", "매수일"],
  accountType: ["accounttype", "계좌유형", "계좌"],
  sellDate: ["selldate", "매도일"],
};
const CSV_ACCOUNT_TYPE_ALIASES = {
  general: ["general", "일반", "일반위탁"],
  isa: ["isa"],
  pension: ["pension", "연금", "연금저축", "irp", "연금저축·irp"],
};

function parseCSV(text) {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
  const parseLine = (line) => {
    const cells = [];
    let cur = "", inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false; }
        else cur += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ",") { cells.push(cur); cur = ""; }
        else cur += ch;
      }
    }
    cells.push(cur);
    return cells.map((c) => c.trim());
  };
  if (lines.length === 0) return { headers: [], rows: [] };
  return { headers: parseLine(lines[0]), rows: lines.slice(1).map(parseLine) };
}

function resolveHeaderIndex(headers) {
  const norm = headers.map((h) => h.toLowerCase().replace(/\s/g, ""));
  const idx = {};
  Object.entries(CSV_HEADER_ALIASES).forEach(([key, aliases]) => {
    idx[key] = norm.findIndex((h) => aliases.some((a) => a.toLowerCase() === h));
  });
  return idx;
}

function resolveAccountType(raw) {
  const norm = (raw || "").toLowerCase().replace(/\s/g, "");
  for (const [key, aliases] of Object.entries(CSV_ACCOUNT_TYPE_ALIASES)) {
    if (aliases.some((a) => a.toLowerCase() === norm)) return key;
  }
  return null;
}

function isValidDateStr(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s).getTime());
}

function validateCsvRow(cols, idx, rowNum) {
  const get = (key) => (idx[key] >= 0 ? (cols[idx[key]] || "").trim() : "");
  const tickerRaw = get("ticker");
  const nameRaw = get("name");
  const currencyRaw = get("currency").toUpperCase();
  const qtyRaw = get("quantity");
  const priceRaw = get("price");
  const dateRaw = get("purchaseDate");
  const accRaw = get("accountType");
  const sellRaw = get("sellDate");

  if (!tickerRaw && !nameRaw) return { ok: false, error: "종목코드와 종목명이 둘 다 비어있어요 (최소 하나는 필요)" };
  let resolvedTicker = tickerRaw && (getStock(tickerRaw.toUpperCase()) || getStock(tickerRaw)) ? (getStock(tickerRaw.toUpperCase()) || getStock(tickerRaw)).ticker : null;
  if (!resolvedTicker && nameRaw && getStock(nameRaw)) resolvedTicker = getStock(nameRaw).ticker;
  // 데모 10종목·기존 커스텀 종목에도 없으면, 종목명이 있는 한 새 커스텀 종목으로 등록 예정
  // (실제 생성은 확정(가져오기) 시점에만 — 미리보기 단계에서 취소해도 흔적이 안 남도록)
  let pendingCustomStock = null;
  if (!resolvedTicker) {
    if (!nameRaw) return { ok: false, error: `"${tickerRaw}"는 지원하지 않는 종목이에요 (종목명을 같이 적어주면 커스텀 종목으로 등록돼요)` };
    resolvedTicker = tickerRaw || nameRaw;
    pendingCustomStock = { ticker: resolvedTicker, name: nameRaw, currency: currencyRaw === "USD" ? "USD" : "KRW" };
  }

  const qty = Number(qtyRaw);
  if (!qtyRaw || !Number.isFinite(qty) || qty <= 0) return { ok: false, error: `수량이 올바르지 않아요 (${qtyRaw})` };

  let price = null;
  if (priceRaw) {
    price = Number(priceRaw);
    if (!Number.isFinite(price) || price <= 0) return { ok: false, error: `매입단가가 올바르지 않아요 (${priceRaw})` };
  }

  if (!isValidDateStr(dateRaw)) return { ok: false, error: `매입일 형식이 올바르지 않아요 (YYYY-MM-DD, "${dateRaw}")` };

  const accountType = accRaw ? resolveAccountType(accRaw) : "general";
  if (!accountType) return { ok: false, error: `계좌유형을 알 수 없어요 ("${accRaw}")` };

  let sellDate = null;
  if (sellRaw) {
    if (!isValidDateStr(sellRaw)) return { ok: false, error: `매도일 형식이 올바르지 않아요 (YYYY-MM-DD, "${sellRaw}")` };
    if (sellRaw < dateRaw) return { ok: false, error: "매도일이 매입일보다 빨라요" };
    sellDate = sellRaw;
  }

  return {
    ok: true,
    pendingCustomStock,
    holding: { id: Date.now() * 1000 + rowNum, ticker: resolvedTicker, quantity: qty, price, purchaseDate: dateRaw, sellDate, accountType },
  };
}

function downloadSampleCsv() {
  const sample = "종목코드,종목명,통화,수량,매입단가,매입일,계좌유형,매도일\n"
    + "005930,,,10,71500,2024-01-10,일반,\n"
    + "005930,,,5,74200,2024-06-01,일반,\n"
    + "O,,,5,54.2,2023-11-01,ISA,\n"
    + "033780,,,10,95000,2024-02-01,연금,2026-03-02\n"
    + ",네오스 나스닥100 고배당 ETF,USD,10,53.55,2026-04-28,일반,\n";
  const blob = new Blob(["﻿" + sample], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "배당통장_샘플.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ----------------------------- 메인 컴포넌트 ----------------------------- */
export default function DividendPassbook() {
  const [holdings, setHoldings] = useState(() => loadHoldings() || DEFAULT_HOLDINGS);
  useEffect(() => {
    try {
      localStorage.setItem(HOLDINGS_STORAGE_KEY, JSON.stringify(holdings));
    } catch {}
  }, [holdings]);
  const [tab, setTab] = useState("dividend");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ticker: STOCKS[0].ticker, quantity: "", price: "", purchaseDate: "", sellDate: "", accountType: "general" });
  const [csvImport, setCsvImport] = useState({ open: false, fileName: "", headerError: null, results: [] });

  // 도미노 벤치마킹 탭들의 UI 상태
  const [selectedMonthKey, setSelectedMonthKey] = useState(thisMonthKey);
  const [profitPeriod, setProfitPeriod] = useState("total");
  const [allocationView, setAllocationView] = useState("ticker");
  const [dividendShowNet, setDividendShowNet] = useState(true);
  const [dividendShowForeign, setDividendShowForeign] = useState(true);

  const addHolding = () => {
    if (!form.quantity || !form.purchaseDate) return;
    if (form.sellDate && form.sellDate < form.purchaseDate) { alert("매도일은 매입일보다 빠를 수 없어요."); return; }
    setHoldings((h) => [
      ...h,
      { id: Date.now(), ticker: form.ticker, quantity: Number(form.quantity), price: form.price ? Number(form.price) : null, purchaseDate: form.purchaseDate, sellDate: form.sellDate || null, accountType: form.accountType },
    ]);
    setForm({ ticker: STOCKS[0].ticker, quantity: "", price: "", purchaseDate: "", sellDate: "", accountType: "general" });
    setShowAdd(false);
  };
  const removeHolding = (id) => setHoldings((h) => h.filter((x) => x.id !== id));

  // customStocks는 모듈 전역 배열이라 React state 변화 감지 대상이 아님 —
  // 이 카운터를 bump해서 useMemo/렌더가 다시 돌게 만든다.
  const [customStocksVersion, setCustomStocksVersion] = useState(0);
  const [addDividendForHoldingId, setAddDividendForHoldingId] = useState(null);
  const [divDraft, setDivDraft] = useState({ date: "", amount: "" });

  const toggleAddDividendForm = (holdingId) => {
    setAddDividendForHoldingId((cur) => (cur === holdingId ? null : holdingId));
    setDivDraft({ date: "", amount: "" });
  };
  const submitCustomDividend = (holdingId) => {
    const h = holdings.find((x) => x.id === holdingId);
    const amt = Number(divDraft.amount);
    if (!h || !divDraft.date || !amt || amt <= 0) return;
    addCustomDividendRecord(h.ticker, divDraft.date, amt);
    setAddDividendForHoldingId(null);
    setCustomStocksVersion((v) => v + 1);
  };

  const handleCsvFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const { headers, rows } = parseCSV(String(reader.result || ""));
      const idx = resolveHeaderIndex(headers);
      if ((idx.ticker < 0 && idx.name < 0) || idx.quantity < 0 || idx.purchaseDate < 0) {
        setCsvImport({ open: true, fileName: file.name, headerError: "필수 컬럼(종목코드 또는 종목명 / 수량 / 매입일)을 찾을 수 없어요. 헤더명을 확인해주세요.", results: [] });
        return;
      }
      const results = rows.map((cols, i) => {
        const rowNum = i + 2;
        return { rowNum, raw: cols.join(", "), ...validateCsvRow(cols, idx, rowNum) };
      });
      setCsvImport({ open: true, fileName: file.name, headerError: null, results });
    };
    reader.readAsText(file, "UTF-8");
  };

  const confirmCsvImport = () => {
    const okResults = csvImport.results.filter((r) => r.ok);
    if (okResults.length === 0) return;
    okResults.forEach((r) => {
      if (r.pendingCustomStock) getOrCreateCustomStock(r.pendingCustomStock.ticker, r.pendingCustomStock.name, r.pendingCustomStock.currency);
    });
    setHoldings((h) => h.concat(okResults.map((r) => r.holding)));
    setCustomStocksVersion((v) => v + 1);
    setCsvImport({ open: false, fileName: "", headerError: null, results: [] });
  };

  /* 모든 보유분에 대해 이벤트 전개 */
  const allEvents = useMemo(() => {
    const list = [];
    holdings.forEach((h) => {
      const stock = getStock(h.ticker);
      if (!stock) return;
      // 매도일 당일까지는 배당락일 기준 소유로 보고 배당 자격 유지, 그 다음날부터 제외
      stock.dividends
        .filter((e) => e.exDate >= h.purchaseDate && (!h.sellDate || e.exDate <= h.sellDate))
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
  }, [holdings, customStocksVersion]);

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

  // 배당 탭: 최근 12개월(실제) + 다음달(추정) 13개월 분해 + 선택된 월 상세
  const trailingMonths = useMemo(() => trailing13Months(allEvents), [allEvents]);
  const validMonthKey = trailingMonths.some((m) => m.month === selectedMonthKey) ? selectedMonthKey : thisMonthKey;
  const selectedMonthData = trailingMonths.find((m) => m.month === validMonthKey);
  const monthGroups = useMemo(() => mergeEventsByTicker(selectedMonthData.events), [selectedMonthData]);
  const confirmedGroups = useMemo(() => mergeEventsByTicker(confirmedEvents), [confirmedEvents]);
  const estimatedGroups = useMemo(() => mergeEventsByTicker(estimatedEvents).slice(0, 6), [estimatedEvents]);
  // "실제 데이터로만" — 추정월(다음달)을 뺀 최근 12개월의 실제 지급분만 합산
  const realTrailingEvents = trailingMonths.filter((m) => !m.isFuture).flatMap((m) => m.events).filter((e) => e.status === "paid");
  const trailing12Total = realTrailingEvents.reduce((s, e) => s + e.gross, 0);
  const headlineAmount = dividendShowNet
    ? realTrailingEvents.reduce((s, e) => s + (e.certain ? e.net : e.gross), 0)
    : trailing12Total;
  const rangeLabel = `${trailingMonths[0].month} ~ ${trailingMonths[11].month} 실제 · ${trailingMonths[12].month} 예정`;

  // 수익 탭
  const profitDividend = periodDividendTotal(profitPeriod, paidEvents);

  // 세금 탭
  const allAccountsYearGross = paidEvents.filter((e) => e.exDate.slice(0, 4) === String(TODAY.getFullYear()))
    .reduce((s, e) => s + e.gross, 0);

  // 비중·추이 탭: 매입단가(price) 기반 원금 계산
  const costGroups = useMemo(() => costBasisGroups(holdings), [holdings]);
  const costTrendData = useMemo(() => costBasisTrend(holdings), [holdings]);

  // 배당 탭: 전체 기간 누적 — 지금까지 넣은 원금 대비 지금까지 실제 받은 배당 총액 (둘 다 세전 기준)
  const totalDividendsAllTime = paidEvents.reduce((s, e) => s + e.gross, 0);
  const overallYieldPct = costGroups.total > 0 ? (totalDividendsAllTime / costGroups.total) * 100 : null;
  const ALLOCATION_VIEWS = [
    { key: "ticker", label: "종목별", data: costGroups.ticker },
    { key: "market", label: "시장별", data: costGroups.market },
    { key: "account", label: "계좌별", data: costGroups.account },
  ];
  const currentAllocData = (ALLOCATION_VIEWS.find((v) => v.key === allocationView) || ALLOCATION_VIEWS[0]).data;

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

        {/* 탭 (도미노 벤치마킹: 수익/세금/배당/추이/비중 + 관리) */}
        <div className="px-5 pt-6 flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {[
            { key: "dividend", label: "배당", icon: Wallet },
            { key: "profit", label: "수익", icon: TrendingUp },
            { key: "tax", label: "세금", icon: Percent },
            { key: "trend", label: "추이", icon: LineChart },
            { key: "allocation", label: "비중", icon: PieChart },
            { key: "manage", label: "관리", icon: Settings },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors flex-shrink-0"
              style={{
                background: tab === t.key ? "#1F2A44" : "#FFFDF8",
                color: tab === t.key ? "#F5F1E6" : "#4B5670",
                border: tab === t.key ? "none" : "1px solid #E4DCC5",
                whiteSpace: "nowrap",
              }}
            >
              <t.icon size={13} />
              {t.label}
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        <div className="px-5 py-4 pb-10">
          {tab === "manage" && (
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
                    type="number"
                    step="0.01"
                    placeholder="매입단가 (선택, 비중·원금 계산에 사용)"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full text-sm rounded-lg px-3 py-2"
                    style={{ border: "1px solid #E4DCC5", background: "#F5F1E6", color: "#1F2A44" }}
                  />
                  <div className="text-[10px]" style={{ color: "#8B93A8" }}>매입일</div>
                  <input
                    type="date"
                    value={form.purchaseDate}
                    onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                    className="w-full text-sm rounded-lg px-3 py-2"
                    style={{ border: "1px solid #E4DCC5", background: "#F5F1E6", color: "#1F2A44" }}
                  />
                  <div className="text-[10px]" style={{ color: "#8B93A8" }}>매도일 (선택, 계속 보유 중이면 비워두기)</div>
                  <input
                    type="date"
                    value={form.sellDate}
                    onChange={(e) => setForm({ ...form, sellDate: e.target.value })}
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

              {!csvImport.open ? (
                <button
                  onClick={() => setCsvImport({ open: true, fileName: "", headerError: null, results: [] })}
                  className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5"
                  style={{ background: "#4B5670", color: "#F5F1E6" }}
                >
                  ⇪ CSV로 여러 종목 가져오기
                </button>
              ) : (
                <div className="rounded-xl p-3.5 space-y-2.5" style={{ background: "#FFFDF8", border: "1px solid #E4DCC5" }}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium" style={{ color: "#4B5670" }}>CSV로 여러 종목 가져오기</span>
                    <button onClick={() => setCsvImport({ open: false, fileName: "", headerError: null, results: [] })}>
                      <X size={15} color="#8B93A8" />
                    </button>
                  </div>
                  <div className="text-[11px] leading-relaxed" style={{ color: "#8B93A8" }}>
                    컬럼: 종목코드, 종목명, 통화(KRW/USD), 수량, 매입단가(선택), 매입일(YYYY-MM-DD), 계좌유형(일반/ISA/연금), 매도일(선택)
                    <br />종목코드가 없어도 종목명만 있으면 커스텀 종목으로 등록돼요 (배당은 직접 기록 필요). 매입단가를 넣으면 비중·원금추이에 반영돼요. 매수 배치마다 한 행씩 적고, 매도한 배치는 매도일도 채워주세요.
                  </div>
                  <button
                    onClick={downloadSampleCsv}
                    className="w-full py-2 rounded-lg text-sm font-medium"
                    style={{ background: "#8B93A8", color: "#FFFDF8" }}
                  >
                    샘플 CSV 받기
                  </button>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => handleCsvFile(e.target.files && e.target.files[0])}
                    className="w-full text-sm rounded-lg px-3 py-2"
                    style={{ border: "1px solid #E4DCC5", background: "#F5F1E6", color: "#1F2A44" }}
                  />
                  {csvImport.fileName && (
                    <div className="text-[11px]" style={{ color: "#8B93A8" }}>파일: {csvImport.fileName}</div>
                  )}
                  {csvImport.headerError && (
                    <div className="text-[11px]" style={{ color: "#B23A3A" }}>{csvImport.headerError}</div>
                  )}
                  {csvImport.results.length > 0 && (
                    <>
                      <div className="rounded-lg overflow-y-auto" style={{ maxHeight: 220, border: "1px solid #E4DCC5" }}>
                        {csvImport.results.map((r, i) => (
                          <div key={i} className="px-2.5 py-2 text-[11px]" style={{ borderBottom: "1px solid #EDE9DC" }}>
                            <div style={{ color: r.ok ? "#1F2A44" : "#B23A3A" }}>{r.ok ? "✅" : "❌"} {r.rowNum}행 · {r.raw}</div>
                            {!r.ok && <div style={{ color: "#B23A3A", marginTop: 2 }}>{r.error}</div>}
                          </div>
                        ))}
                      </div>
                      <div className="text-[11px]" style={{ color: "#8B93A8" }}>
                        확인됨 {csvImport.results.filter((r) => r.ok).length}건 · 오류 {csvImport.results.filter((r) => !r.ok).length}건
                      </div>
                      <button
                        onClick={confirmCsvImport}
                        disabled={csvImport.results.filter((r) => r.ok).length === 0}
                        className="w-full py-2 rounded-lg text-sm font-medium"
                        style={{ background: "#9C7A3C", color: "#FFFDF8" }}
                      >
                        가져오기 ({csvImport.results.filter((r) => r.ok).length}건)
                      </button>
                    </>
                  )}
                </div>
              )}

              {holdings.map((h) => {
                const stock = getStock(h.ticker);
                if (!stock) return null;
                const acc = getAccountType(h.accountType);
                const events = paidEvents.filter((e) => e.holdingId === h.id);
                const totalGross = events.reduce((s, e) => s + e.gross, 0);
                const totalNet = events.reduce((s, e) => s + e.net, 0);
                const custom = isCustomStock(h.ticker);
                return (
                  <div key={h.id} className="rounded-xl p-3.5" style={{ background: "#FFFDF8", border: "1px solid #E4DCC5" }}>
                    <div className="flex items-center justify-between">
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
                          {custom && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded mono" style={{ background: "#E4E9F0", color: "#4B5670" }}>커스텀</span>
                          )}
                          {h.sellDate && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded mono" style={{ background: "#F3E3E3", color: "#B23A3A" }}>
                              매도 {h.sellDate}
                            </span>
                          )}
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
                        {custom && stock.dividends.length === 0 && (
                          <div className="text-[10px] mt-0.5" style={{ color: "#8B93A8" }}>아직 기록된 배당이 없어요. 입금 알림 받으면 직접 추가해주세요.</div>
                        )}
                      </div>
                      <button onClick={() => removeHolding(h.id)}>
                        <Trash2 size={15} color="#B23A3A" />
                      </button>
                    </div>
                    {custom && (
                      <button
                        onClick={() => toggleAddDividendForm(h.id)}
                        className="w-full mt-2 py-1.5 rounded-lg text-[11px] font-medium"
                        style={{ background: "#4B5670", color: "#F5F1E6" }}
                      >
                        {addDividendForHoldingId === h.id ? "닫기" : "+ 배당 기록 추가"}
                      </button>
                    )}
                    {custom && addDividendForHoldingId === h.id && (
                      <div className="mt-2 pt-2" style={{ borderTop: "1px dashed #E4DCC5" }}>
                        <div className="text-[10px]" style={{ color: "#8B93A8" }}>배당(분배금) 지급일</div>
                        <input
                          type="date"
                          value={divDraft.date}
                          onChange={(e) => setDivDraft({ ...divDraft, date: e.target.value })}
                          className="w-full text-sm rounded-lg px-3 py-2 mt-1"
                          style={{ border: "1px solid #E4DCC5", background: "#F5F1E6", color: "#1F2A44" }}
                        />
                        <div className="text-[10px] mt-1.5" style={{ color: "#8B93A8" }}>주당 지급액 ({stock.currency})</div>
                        <input
                          type="number"
                          step="0.0001"
                          value={divDraft.amount}
                          onChange={(e) => setDivDraft({ ...divDraft, amount: e.target.value })}
                          className="w-full text-sm rounded-lg px-3 py-2 mt-1"
                          style={{ border: "1px solid #E4DCC5", background: "#F5F1E6", color: "#1F2A44" }}
                        />
                        <button
                          onClick={() => submitCustomDividend(h.id)}
                          className="w-full py-2 rounded-lg text-sm font-medium mt-2"
                          style={{ background: "#9C7A3C", color: "#FFFDF8" }}
                        >
                          기록 추가
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab === "profit" && (
            <div>
              <div className="rounded-2xl p-4" style={{ background: "#FFFDF8", border: "1px solid #E4DCC5" }}>
                <span className="text-xs font-medium" style={{ color: "#4B5670" }}>수익 현황</span>
                <div className="flex gap-1.5 mt-2">
                  {[
                    { key: "today", label: "오늘" }, { key: "total", label: "총" }, { key: "week", label: "이번주" },
                    { key: "month", label: "이번달" }, { key: "quarter", label: "이번분기" }, { key: "year", label: "올해" },
                  ].map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setProfitPeriod(p.key)}
                      className="flex-1 py-1.5 rounded-lg text-[11px] font-medium"
                      style={{
                        background: profitPeriod === p.key ? "#1F2A44" : "#F5F1E6",
                        color: profitPeriod === p.key ? "#F5F1E6" : "#4B5670",
                        border: "1px solid #E4DCC5",
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px dashed #E4DCC5" }}>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: "#4B5670" }}>평가수익</span>
                    <span className="mono" style={{ color: "#8B93A8" }}>현재가 연동 준비중</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: "#4B5670" }}>실현수익</span>
                    <span className="mono" style={{ color: "#8B93A8" }}>매도 체결가 기록 준비중</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: "#4B5670" }}>배당금</span>
                    <span className="mono font-bold" style={{ fontSize: 15, color: "#9C7A3C" }}>+{won(profitDividend)}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3" style={{ borderTop: "1px solid #EDE9DC" }}>
                  <div className="text-[10px]" style={{ color: "#8B93A8" }}>합계 (지금은 배당금만 반영)</div>
                  <div className="mono font-bold" style={{ fontSize: 22, color: "#1F2A44" }}>+{won(profitDividend)}</div>
                </div>
              </div>
              <p className="text-[11px] mt-3 leading-relaxed" style={{ color: "#4B5670", background: "#EDE9DC", borderRadius: 12, padding: 14 }}>
                "평가수익"과 "실현수익"은 종목 현재가·매도 체결가 데이터가 있어야 계산돼요. 지금은 실시간 시세 연동이 안 돼 있어서 확실한 배당금만 정확하게 보여드리고 있어요.
              </p>
            </div>
          )}

          {tab === "tax" && (
            <div>
              <div className="rounded-2xl p-4" style={{ background: "#FFFDF8", border: "1px solid #E4DCC5" }}>
                <span className="text-xs font-medium" style={{ color: "#4B5670" }}>{TODAY.getFullYear()}년 전체 배당소득 (세전, 전계좌 합산)</span>
                <div className="serif text-xl font-bold mono mt-1" style={{ color: "#1F2A44" }}>{won(allAccountsYearGross)}</div>
              </div>
              <div className="rounded-2xl p-4 mt-3" style={{ background: "#FFFDF8", border: "1px solid #E4DCC5" }}>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs" style={{ color: "#4B5670" }}>일반위탁 종합과세 대상 (세전)</span>
                  <span className="mono text-xs" style={{ color: "#8B93A8" }}>기준 2,000만원</span>
                </div>
                <div className="serif text-xl font-bold mono mt-1" style={{ color: "#1F2A44" }}>{won(yearGross)}</div>
                <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: "#EDE9DC" }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct > 80 ? "#B23A3A" : "#9C7A3C" }} />
                </div>
                {pct > 70 && (
                  <p className="text-[11px] mt-1.5" style={{ color: "#B23A3A" }}>종합과세 기준(2천만원)에 가까워지고 있어요. 정확한 세액은 세무사 확인을 권장해요.</p>
                )}
              </div>
              <div className="rounded-2xl p-4 mt-3" style={{ background: "#FFFDF8", border: "1px solid #E4DCC5" }}>
                <span className="text-xs font-medium" style={{ color: "#4B5670" }}>계좌유형별 세후/세전 구분</span>
                <div className="mt-2 space-y-1">
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
                <p className="text-[10px] mt-2 leading-relaxed" style={{ color: "#8B93A8" }}>일반위탁은 세율이 고정(15.4%/15%)돼 있어 세후 금액을 확정적으로 계산해요. ISA·연금저축·IRP는 최종 세액이 만기·인출 시점에 결정되므로 세전 금액만 보여드려요.</p>
              </div>
            </div>
          )}

          {tab === "dividend" && (
            <div>
              <div className="rounded-2xl p-4" style={{ background: "#FFFDF8", border: "1px solid #E4DCC5" }}>
                <div className="text-center">
                  <div className="text-[11px]" style={{ color: "#8B93A8" }}>배당금 (최근 12개월)</div>
                  <div className="serif text-2xl font-bold mono mt-1" style={{ color: "#1F2A44" }}>{won(headlineAmount)}</div>
                  <div className="text-[9px] mt-1" style={{ color: "#8B93A8" }}>{rangeLabel}</div>
                  {costGroups.total > 0 && trailing12Total > 0 && (
                    <div className="text-[10px] mt-1" style={{ color: "#8B93A8" }}>최근 12개월 배당률 {((trailing12Total / costGroups.total) * 100).toFixed(2)}%</div>
                  )}
                </div>
                <div className="flex justify-between mt-2">
                  <button onClick={() => setDividendShowNet((v) => !v)} className="px-2.5 py-1 rounded-lg text-[11px] font-medium" style={{ background: dividendShowNet ? "#1F2A44" : "#F5F1E6", color: dividendShowNet ? "#F5F1E6" : "#4B5670", border: "1px solid #E4DCC5" }}>실수령액 {dividendShowNet ? "✓" : ""}</button>
                  <button onClick={() => setDividendShowForeign((v) => !v)} className="px-2.5 py-1 rounded-lg text-[11px] font-medium" style={{ background: dividendShowForeign ? "#1F2A44" : "#F5F1E6", color: dividendShowForeign ? "#F5F1E6" : "#4B5670", border: "1px solid #E4DCC5" }}>외화보기 {dividendShowForeign ? "✓" : ""}</button>
                </div>
                <div className="mt-3" style={{ height: 130 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trailingMonths} margin={{ top: 14, right: 4, left: 4, bottom: 0 }}>
                      <XAxis dataKey="month" tickFormatter={(m) => m.slice(5)} tick={{ fontSize: 9, fill: "#8B93A8" }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip
                        formatter={(v, n, p) => [won(v), p.payload.isFuture ? "추정(향후)" : "지급완료"]}
                        labelFormatter={(l) => l}
                        contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E4DCC5" }}
                      />
                      <Bar dataKey="value" radius={[2, 2, 0, 0]} onClick={(d) => setSelectedMonthKey(d.month)} style={{ cursor: "pointer" }}>
                        {trailingMonths.map((d, i) => (
                          <Cell
                            key={i}
                            fill={d.month === validMonthKey ? "#9C7A3C" : d.isFuture ? "#EDE9DC" : "#1F2A44"}
                            stroke={d.isFuture ? "#C9C0A5" : "none"}
                            strokeDasharray={d.isFuture ? "3 2" : undefined}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl p-4 mt-3" style={{ background: "#FFFDF8", border: "1px solid #E4DCC5" }}>
                <span className="text-xs font-medium" style={{ color: "#4B5670" }}>누적 투자 대비 배당 (전체 기간, 세전 기준)</span>
                <div className="flex justify-between text-center mt-2">
                  <div className="flex-1">
                    <div className="text-[10px]" style={{ color: "#8B93A8" }}>총 투자원금</div>
                    <div className="mono font-bold mt-1" style={{ fontSize: 15, color: "#1F2A44" }}>{won(costGroups.total)}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px]" style={{ color: "#8B93A8" }}>누적 배당 수령액</div>
                    <div className="mono font-bold mt-1" style={{ fontSize: 15, color: "#9C7A3C" }}>{won(totalDividendsAllTime)}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px]" style={{ color: "#8B93A8" }}>배당수익률</div>
                    <div className="mono font-bold mt-1" style={{ fontSize: 15, color: "#1F2A44" }}>{overallYieldPct === null ? "—" : overallYieldPct.toFixed(2) + "%"}</div>
                  </div>
                </div>
                {costGroups.uncosted > 0 && (
                  <p className="text-[10px] mt-2" style={{ color: "#8B93A8" }}>매입단가 미입력 {costGroups.uncosted}건은 투자원금·수익률 계산에서 제외됐어요.</p>
                )}
              </div>

              <div className="rounded-2xl p-4 mt-3" style={{ background: "#FFFDF8", border: "1px solid #E4DCC5" }}>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold" style={{ color: "#1F2A44" }}>{selectedMonthData.month}{selectedMonthData.isFuture ? " (예정)" : ""}</span>
                  <span className="mono text-sm font-semibold" style={{ color: "#1F2A44" }}>{won(selectedMonthData.value)}</span>
                </div>
                <div className="mt-1">
                  {monthGroups.length === 0 ? (
                    <p className="text-xs mt-2" style={{ color: "#8B93A8" }}>이 달은 배당 내역이 없어요.</p>
                  ) : (
                    monthGroups.slice().sort((a, b) => a.exDate.localeCompare(b.exDate)).map((g, i) => {
                      const nativeAmount = g.perShare * g.qty;
                      return (
                        <div key={i} className="flex justify-between items-center py-2.5" style={{ borderBottom: "1px solid #EDE9DC" }}>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center flex-shrink-0" style={{ width: 28, height: 28, borderRadius: "50%", background: "#EDE9DC", fontSize: 11, fontWeight: 700, color: "#4B5670" }}>{g.name.slice(0, 1)}</div>
                            <div>
                              <div className="text-sm font-medium" style={{ color: "#1F2A44" }}>{g.name}</div>
                              <div className="text-[10px]" style={{ color: "#8B93A8" }}>
                                {g.qty.toLocaleString("ko-KR")}주 · 1주당 {g.currency === "USD" ? "$" : "₩"}{g.perShare}
                                {g.accountTypes.map((a) => (
                                  <span key={a} className="mono ml-1" style={{ padding: "1px 5px", borderRadius: 4, background: "#EDE9DC", color: "#4B5670" }}>{getAccountType(a).short}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="mono text-sm font-semibold" style={{ color: "#1F2A44" }}>{won(dividendShowNet && g.allCertain ? g.net : g.gross)}</div>
                            {dividendShowForeign && g.currency !== "KRW" && (
                              <div className="mono text-[10px]" style={{ color: "#8B93A8" }}>${nativeAmount.toFixed(2)}</div>
                            )}
                            <div className="text-[9px]" style={{ color: "#8B93A8" }}>{g.exDate.slice(8)}일 · {g.status === "estimated" ? "추정" : g.status === "confirmed" ? "확정예정" : "지급완료"}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-2xl p-4 mt-3" style={{ background: "#FFFDF8", border: "1px solid #E4DCC5" }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="stamp text-[10px] px-2 py-0.5 rounded-sm mono font-semibold">확정</span>
                  <span className="text-xs" style={{ color: "#4B5670" }}>이사회 결의 등으로 금액·일정이 정해진 배당</span>
                </div>
                {confirmedGroups.length === 0 ? (
                  <p className="text-xs" style={{ color: "#8B93A8" }}>확정된 예정 배당이 없어요.</p>
                ) : (
                  <div className="space-y-1.5">
                    {confirmedGroups.map((g, i) => (
                      <div key={i} className="rounded-lg p-3" style={{ background: "#F5F1E6", border: "1px solid #E4DCC5" }}>
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-sm" style={{ color: "#1F2A44" }}>
                              {g.name} · {g.qty.toLocaleString("ko-KR")}주
                              {g.accountTypes.map((a) => (
                                <span key={a} className="mono text-[10px] ml-1.5" style={{ color: "#8B93A8" }}>{getAccountType(a).short}</span>
                              ))}
                            </div>
                            <div className="text-[11px]" style={{ color: "#8B93A8" }}>배당락 {g.exDate} · 지급 {g.payDate}</div>
                          </div>
                          <span className="mono text-sm font-medium" style={{ color: "#1F2A44" }}>{won(g.gross)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1.5 mb-2 mt-4">
                  <span className="text-[10px] px-2 py-0.5 rounded-sm mono font-semibold" style={{ border: "1.5px solid #8B93A8", color: "#8B93A8" }}>예상</span>
                  <span className="text-xs" style={{ color: "#4B5670" }}>과거 지급 패턴 기반 추정치</span>
                </div>
                <div className="space-y-1.5">
                  {estimatedGroups.map((g, i) => (
                    <div key={i} className="rounded-lg p-3 flex justify-between items-center" style={{ background: "#F5F1E6", border: "1px dashed #C9C0A5" }}>
                      <div>
                        <div className="text-sm" style={{ color: "#4B5670" }}>
                          {g.name} · {g.qty.toLocaleString("ko-KR")}주
                          {g.accountTypes.map((a) => (
                            <span key={a} className="mono text-[10px] ml-1.5" style={{ color: "#8B93A8" }}>{getAccountType(a).short}</span>
                          ))}
                        </div>
                        <div className="text-[11px]" style={{ color: "#8B93A8" }}>배당락 예상 {g.exDate}</div>
                      </div>
                      <span className="mono text-sm" style={{ color: "#8B93A8" }}>약 {won(g.gross)} (세전)</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl p-4 mt-3" style={{ background: "#FFFDF8", border: "1px solid #E4DCC5" }}>
                <span className="text-xs font-medium" style={{ color: "#4B5670" }}>전체 지급 기록 (누적)</span>
                <div className="flex justify-between text-[11px] mt-2 mb-2 px-1" style={{ color: "#8B93A8" }}>
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
              </div>
            </div>
          )}

          {tab === "trend" && (
            <div>
              <div className="rounded-2xl p-4" style={{ background: "#FFFDF8", border: "1px solid #E4DCC5" }}>
                <span className="text-xs font-medium" style={{ color: "#4B5670" }}>투자 원금 추이</span>
                {costTrendData.length > 1 ? (
                  <>
                    <div className="mt-3 -mx-1" style={{ height: 90 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={costTrendData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                          <defs>
                            <linearGradient id="fillTrend" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#1F2A44" stopOpacity={0.35} />
                              <stop offset="100%" stopColor="#1F2A44" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#8B93A8" }} axisLine={false} tickLine={false} />
                          <YAxis hide />
                          <Tooltip formatter={(v) => [won(v), "누적 원금"]} contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E4DCC5" }} />
                          <Area type="monotone" dataKey="value" stroke="#1F2A44" strokeWidth={1.5} fill="url(#fillTrend)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[11px]" style={{ color: "#8B93A8" }}>누적 매입원금</span>
                      <span className="mono text-sm font-semibold" style={{ color: "#1F2A44" }}>{won(costTrendData[costTrendData.length - 1].value)}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm mt-2" style={{ color: "#8B93A8" }}>매입단가가 입력된 종목이 없어서 원금 추이를 계산할 수 없어요.</p>
                )}
              </div>
              <p className="text-[11px] mt-3 leading-relaxed" style={{ color: "#4B5670", background: "#EDE9DC", borderRadius: 12, padding: 14 }}>
                "자산"(현재 평가금액) 라인은 종목 현재가가 있어야 계산되는데, 아직 실시간 시세 연동이 안 돼 있어요. 지금은 "원금"(매입금액 누적)만 보여드려요.
              </p>
            </div>
          )}

          {tab === "allocation" && (
            <div className="rounded-2xl p-4" style={{ background: "#FFFDF8", border: "1px solid #E4DCC5" }}>
              <div className="flex gap-1.5">
                {ALLOCATION_VIEWS.map((v) => (
                  <button
                    key={v.key}
                    onClick={() => setAllocationView(v.key)}
                    className="flex-1 py-1.5 rounded-lg text-[11px] font-medium"
                    style={{
                      background: allocationView === v.key ? "#1F2A44" : "#F5F1E6",
                      color: allocationView === v.key ? "#F5F1E6" : "#4B5670",
                      border: "1px solid #E4DCC5",
                    }}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
              {costGroups.total === 0 ? (
                <p className="text-sm mt-3" style={{ color: "#8B93A8" }}>매입단가가 입력된 종목이 없어서 비중을 계산할 수 없어요.</p>
              ) : (
                <>
                  <div className="mt-3" style={{ height: 160 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie data={currentAllocData} dataKey="value" nameKey="label" innerRadius={45} outerRadius={70} paddingAngle={1}>
                          {currentAllocData.map((seg, i) => (
                            <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => [won(v), "매입금액"]} contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E4DCC5" }} />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2">
                    {currentAllocData.map((seg, i) => (
                      <div key={seg.key} className="flex justify-between items-center py-2" style={{ borderBottom: "1px solid #EDE9DC" }}>
                        <div className="flex items-center gap-2">
                          <span style={{ width: 9, height: 9, borderRadius: "50%", background: DONUT_COLORS[i % DONUT_COLORS.length], display: "inline-block", flexShrink: 0 }} />
                          <span className="text-sm font-medium" style={{ color: "#1F2A44" }}>{seg.label}</span>
                        </div>
                        <div className="text-right">
                          <div className="mono text-sm font-semibold" style={{ color: "#1F2A44" }}>{((seg.value / costGroups.total) * 100).toFixed(1)}%</div>
                          <div className="mono text-[10px]" style={{ color: "#8B93A8" }}>{won(seg.value)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2" style={{ borderTop: "1px solid #EDE9DC" }}>
                    <span className="text-[11px]" style={{ color: "#8B93A8" }}>총 매입원금</span>
                    <span className="mono text-sm font-semibold" style={{ color: "#1F2A44" }}>{won(costGroups.total)}</span>
                  </div>
                  {costGroups.uncosted > 0 && (
                    <p className="text-[10px] mt-2" style={{ color: "#8B93A8" }}>매입단가 미입력 {costGroups.uncosted}건은 비중 계산에서 제외됐어요.</p>
                  )}
                </>
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
