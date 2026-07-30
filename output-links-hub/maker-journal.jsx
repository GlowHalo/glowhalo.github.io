import React from "react";
import { ExternalLink, Github, Heart, Tag } from "lucide-react";

/* ----------------------------- 프로젝트 데이터 -----------------------------
   새 프로젝트가 생기면 이 배열에 객체 하나만 추가하면 카드가 자동으로 쌓여요. */
const PROJECTS = [
  {
    id: "dividend-passbook",
    title: "배당통장",
    date: "2026.07",
    status: "프로토타입",
    tags: ["React", "투자", "세금계산"],
    description:
      "국내·해외 배당주를 계좌유형(일반위탁/ISA/연금)별로 나눠서, 세전 기준으로 정직하게 보여주는 배당 관리 앱. 이사회 결의 여부에 따라 확정/예상 배당을 구분해요.",
    links: [{ label: "데모 보기", href: "#", icon: "external" }],
  },
  {
    id: "checknote",
    title: "체크노트",
    date: "2026.07",
    status: "베타",
    tags: ["React", "PWA", "1:1 공유"],
    description:
      "리스트·공유·완료 3탭으로만 이루어진 초단순 할일 메모 앱. 완료한 항목은 사라지지 않고 완료함으로 이동해요. 링크 하나로 배우자와 실시간 공유 예정.",
    links: [{ label: "데모 보기", href: "#", icon: "external" }],
  },
];

const STATUS_STYLE = {
  "프로토타입": { bg: "#F1ECE0", color: "#8A6D3B" },
  "베타": { bg: "#EAF0E9", color: "#4F7A5C" },
  "운영중": { bg: "#EAEFF5", color: "#3D5A80" },
};

export default function MakerJournal() {
  return (
    <div className="min-h-screen w-full flex justify-center" style={{ background: "#E9E5D8" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=Noto+Sans+KR:wght@400;500;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
        .serif { font-family: 'Gowun Batang', serif; }
        .sans { font-family: 'Noto Sans KR', sans-serif; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
      `}</style>

      <div className="w-full max-w-[480px] min-h-screen sans" style={{ background: "#F6F3EC", boxShadow: "0 0 40px rgba(0,0,0,0.06)" }}>
        {/* 헤더 */}
        <div className="px-6 pt-12 pb-8">
          <p className="mono text-[11px] tracking-widest" style={{ color: "#C97F2F" }}>MAKER'S JOURNAL</p>
          <h1 className="serif text-3xl font-bold mt-2" style={{ color: "#2A2A2E" }}>이경환의 작업실</h1>
          <p className="text-sm mt-3 leading-relaxed" style={{ color: "#6B6A62" }}>
            본업 병행하며 틈틈이 만든 것들을 이 자리에 계속 쌓아둡니다.
            아이디어부터 프로토타입, 그리고 언젠가는 실제로 쓰이는 것까지.
          </p>
        </div>

        {/* 타임라인 */}
        <div className="px-6 pb-10">
          {PROJECTS.map((p, i) => {
            const statusStyle = STATUS_STYLE[p.status] || STATUS_STYLE["프로토타입"];
            return (
              <div key={p.id} className="relative pl-6" style={{ borderLeft: i === PROJECTS.length - 1 ? "none" : "1px solid #E1DCCC" }}>
                <div
                  className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full"
                  style={{ background: "#C97F2F", transform: "translateX(-5.5px)" }}
                />
                <div className="pb-8">
                  <div className="flex items-center gap-2">
                    <span className="mono text-[11px]" style={{ color: "#9A988C" }}>{p.date}</span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: statusStyle.bg, color: statusStyle.color }}
                    >
                      {p.status}
                    </span>
                  </div>

                  <h2 className="serif text-xl font-bold mt-1.5" style={{ color: "#2A2A2E" }}>{p.title}</h2>

                  <p className="text-sm leading-relaxed mt-2" style={{ color: "#5B5A52" }}>{p.description}</p>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {p.tags.map((t) => (
                      <span
                        key={t}
                        className="mono text-[10px] px-2 py-1 rounded-md flex items-center gap-1"
                        style={{ background: "#EFEBE0", color: "#8A8878" }}
                      >
                        <Tag size={9} /> {t}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-4">
                    {p.links.map((l) => (
                      <a
                        key={l.label}
                        href={l.href}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1"
                        style={{ background: "#2A2A2E", color: "#F6F3EC" }}
                      >
                        {l.icon === "external" && <ExternalLink size={12} />}
                        {l.icon === "github" && <Github size={12} />}
                        {l.icon === "support" && <Heart size={12} />}
                        {l.label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {/* 다음 항목이 쌓일 자리 */}
          <div className="relative pl-6">
            <div
              className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full"
              style={{ border: "1.5px dashed #C9C5B6", transform: "translateX(-5.5px)", background: "#F6F3EC" }}
            />
            <div
              className="rounded-xl px-4 py-3"
              style={{ border: "1px dashed #D9D4C4", color: "#B5B2A3" }}
            >
              <p className="text-xs">다음 프로젝트도 여기 계속 쌓일 예정이에요.</p>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-6 pb-10 pt-2" style={{ borderTop: "1px solid #E9E5D8" }}>
          <p className="text-[11px]" style={{ color: "#9A988C" }}>
            © {new Date().getFullYear()} 이경환 · 문의는 카카오톡으로
          </p>
        </div>
      </div>
    </div>
  );
}
