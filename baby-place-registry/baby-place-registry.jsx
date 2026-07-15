import React, { useState } from "react";
import { Link2, MapPin, Star, X, Plus, Baby, Users } from "lucide-react";

const TYPES = [
  { key: "놀곳", label: "놀곳", color: "#3AAFA9" },
  { key: "먹을곳", label: "먹을곳", color: "#FF7B54" },
  { key: "카페", label: "카페", color: "#B98B4E" },
  { key: "기타", label: "기타", color: "#8C8378" },
];
const AUDIENCES = [
  { key: "아기전용", label: "아기전용", icon: Baby, color: "#FF7B54" },
  { key: "전연령", label: "전연령", icon: Users, color: "#3AAFA9" },
  { key: "어른동반", label: "어른동반 가능", icon: Users, color: "#8C8378" },
];

function detectSource(raw) {
  return /^https?:\/\//i.test(raw.trim()) ? "link" : "text";
}
function guessName(raw) {
  if (detectSource(raw) === "link") {
    try {
      const u = new URL(raw.trim());
      return u.hostname.replace("www.", "") + " 링크";
    } catch {
      return "붙여넣은 링크";
    }
  }
  return raw.trim();
}

let idSeq = 10;

export default function PlaceRegistry() {
  const [places, setPlaces] = useState([
    { id: 1, raw: "https://map.kakao.com/xxxxx", source: "link", name: "몽실놀이터", type: "놀곳", audience: "전연령", memo: "실내라 비 와도 좋음, 주차 넉넉", favorite: true },
    { id: 2, raw: "우리동네 국수집", source: "text", name: "우리동네 국수집", type: "먹을곳", audience: "아기전용", memo: "유아의자 있음, 이유식 데워줌", favorite: false },
    { id: 3, raw: "https://place.map.naver.com/yyyyy", source: "link", name: "라운드어바웃 카페", type: "카페", audience: "어른동반", memo: "아기의자는 없고 유모차 자리 넓음", favorite: false },
  ]);
  const [draft, setDraft] = useState(null); // 등록 중인 초안
  const [rawInput, setRawInput] = useState("");
  const [filterType, setFilterType] = useState("전체");
  const [favOnly, setFavOnly] = useState(false);

  const startRegister = () => {
    const raw = rawInput.trim();
    if (!raw) return;
    setDraft({
      raw,
      source: detectSource(raw),
      name: guessName(raw),
      type: "놀곳",
      audience: "전연령",
      memo: "",
    });
    setRawInput("");
  };
  const confirmRegister = () => {
    if (!draft || !draft.name.trim()) return;
    setPlaces((prev) => [{ id: idSeq++, favorite: false, ...draft }, ...prev]);
    setDraft(null);
  };
  const toggleFav = (id) => setPlaces((prev) => prev.map((p) => (p.id === id ? { ...p, favorite: !p.favorite } : p)));
  const remove = (id) => setPlaces((prev) => prev.filter((p) => p.id !== id));

  const visible = places
    .filter((p) => (filterType === "전체" ? true : p.type === filterType))
    .filter((p) => (favOnly ? p.favorite : true));

  return (
    <div className="min-h-screen w-full flex justify-center" style={{ background: "#EFE4D8" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Noto+Sans+KR:wght@400;500;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
        .display { font-family: 'Gowun Dodum', sans-serif; }
        .sans { font-family: 'Noto Sans KR', sans-serif; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
      `}</style>

      <div className="w-full max-w-[420px] min-h-screen sans" style={{ background: "#FDF4EC", boxShadow: "0 0 40px rgba(0,0,0,0.06)" }}>
        {/* 헤더 */}
        <div className="px-5 pt-8 pb-4">
          <div className="flex items-center gap-1.5">
            <MapPin size={16} color="#FF7B54" />
            <p className="mono text-[10px] tracking-widest" style={{ color: "#FF7B54" }}>PLACE REGISTRY</p>
          </div>
          <h1 className="display text-2xl mt-1" style={{ color: "#3B2E2A" }}>아기랑 갈 곳</h1>
          <p className="text-xs mt-1" style={{ color: "#A8998C" }}>링크나 상호명을 붙여넣으면 바로 등록돼요</p>
        </div>

        {/* 등록 입력 */}
        <div className="px-5">
          {!draft ? (
            <div className="flex items-center gap-2 rounded-full px-2 py-1.5" style={{ background: "#FFFFFF", border: "1px solid #EDE0D2" }}>
              <input
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && startRegister()}
                placeholder="링크, 주소, 상호명 붙여넣기"
                className="flex-1 text-sm px-3 py-2 bg-transparent outline-none"
                style={{ color: "#3B2E2A" }}
              />
              <button
                onClick={startRegister}
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: rawInput.trim() ? "#FF7B54" : "#EDE0D2" }}
              >
                <Plus size={16} color="#FFFFFF" />
              </button>
            </div>
          ) : (
            <div className="rounded-2xl p-4" style={{ background: "#FFFFFF", border: "1px solid #EDE0D2" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  {draft.source === "link" ? <Link2 size={13} color="#A8998C" /> : <MapPin size={13} color="#A8998C" />}
                  <span className="text-[11px]" style={{ color: "#A8998C" }}>{draft.source === "link" ? "링크에서 등록" : "직접 입력"}</span>
                </div>
                <button onClick={() => setDraft(null)}><X size={15} color="#A8998C" /></button>
              </div>

              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="장소 이름"
                className="w-full text-sm font-medium rounded-lg px-3 py-2 mb-2.5"
                style={{ border: "1px solid #EDE0D2", background: "#FDF9F4", color: "#3B2E2A" }}
              />

              <p className="text-[11px] mb-1.5" style={{ color: "#A8998C" }}>유형</p>
              <div className="flex gap-1.5 mb-3">
                {TYPES.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setDraft({ ...draft, type: t.key })}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium"
                    style={{
                      background: draft.type === t.key ? t.color : "#FDF9F4",
                      color: draft.type === t.key ? "#FFFFFF" : "#8C8378",
                      border: "1px solid #EDE0D2",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <p className="text-[11px] mb-1.5" style={{ color: "#A8998C" }}>대상</p>
              <div className="flex gap-1.5 mb-3">
                {AUDIENCES.map((a) => (
                  <button
                    key={a.key}
                    onClick={() => setDraft({ ...draft, audience: a.key })}
                    className="flex-1 py-1.5 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1"
                    style={{
                      background: draft.audience === a.key ? a.color : "#FDF9F4",
                      color: draft.audience === a.key ? "#FFFFFF" : "#8C8378",
                      border: "1px solid #EDE0D2",
                    }}
                  >
                    <a.icon size={11} /> {a.label}
                  </button>
                ))}
              </div>

              <textarea
                value={draft.memo}
                onChange={(e) => setDraft({ ...draft, memo: e.target.value })}
                placeholder="메모 (유아의자 있는지, 주차 등)"
                rows={2}
                className="w-full text-sm rounded-lg px-3 py-2 mb-3 resize-none"
                style={{ border: "1px solid #EDE0D2", background: "#FDF9F4", color: "#3B2E2A" }}
              />

              <button
                onClick={confirmRegister}
                className="w-full py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "#3B2E2A", color: "#FDF4EC" }}
              >
                등록하기
              </button>
            </div>
          )}
        </div>

        {/* 필터 */}
        <div className="px-5 pt-5 flex items-center gap-1.5 overflow-x-auto">
          {["전체", ...TYPES.map((t) => t.key)].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: filterType === t ? "#3B2E2A" : "#FFFFFF",
                color: filterType === t ? "#FDF4EC" : "#8C8378",
                border: "1px solid #EDE0D2",
              }}
            >
              {t}
            </button>
          ))}
          <button
            onClick={() => setFavOnly((v) => !v)}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: favOnly ? "#FFD966" : "#FFFFFF", border: "1px solid #EDE0D2" }}
          >
            <Star size={13} color={favOnly ? "#8A6D1B" : "#C9BEAE"} fill={favOnly ? "#8A6D1B" : "none"} />
          </button>
        </div>

        {/* 리스트 */}
        <div className="px-5 py-4 space-y-2.5 pb-10">
          {visible.length === 0 && (
            <p className="text-center text-xs py-10" style={{ color: "#C9BEAE" }}>등록된 장소가 없어요.</p>
          )}
          {visible.map((p) => {
            const typeInfo = TYPES.find((t) => t.key === p.type);
            const audInfo = AUDIENCES.find((a) => a.key === p.audience);
            return (
              <div key={p.id} className="rounded-2xl p-4" style={{ background: "#FFFFFF", border: "1px solid #EDE0D2" }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: typeInfo?.color, color: "#FFFFFF" }}
                      >
                        {p.type}
                      </span>
                      {audInfo && (
                        <span className="text-[10px] font-medium flex items-center gap-0.5" style={{ color: audInfo.color }}>
                          <audInfo.icon size={10} /> {audInfo.label}
                        </span>
                      )}
                      {p.source === "link" && <Link2 size={10} color="#C9BEAE" />}
                    </div>
                    <p className="text-sm font-medium mt-1.5" style={{ color: "#3B2E2A" }}>{p.name}</p>
                    {p.memo && <p className="text-xs mt-1 leading-relaxed" style={{ color: "#A8998C" }}>{p.memo}</p>}
                  </div>
                  <button onClick={() => toggleFav(p.id)} className="shrink-0 ml-2">
                    <Star size={16} color={p.favorite ? "#F2B705" : "#E3D9C8"} fill={p.favorite ? "#F2B705" : "none"} />
                  </button>
                </div>
                <div className="flex justify-end mt-2">
                  <button onClick={() => remove(p.id)} className="text-[10px]" style={{ color: "#C9BEAE" }}>삭제</button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 pb-8">
          <div className="rounded-xl p-3.5 text-[11px] leading-relaxed" style={{ background: "#F3E7D9", color: "#8C8378" }}>
            지금은 등록·분류·메모·즐겨찾기까지만 되는 단계예요. 실제 지도 위에 핀으로 표시하는 건 다음 단계에서 카카오맵 API로 연동할게요.
          </div>
        </div>
      </div>
    </div>
  );
}
