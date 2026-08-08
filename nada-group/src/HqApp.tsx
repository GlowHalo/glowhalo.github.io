import { useState } from "react";
import App from "./App";
import { COMPANY } from "./company.config";

/**
 * 나다그룹 HQ — 관계사 목록 진입점.
 * 지금은 나다컴퍼니1(신사업) 하나뿐이지만, 계열사가 늘어나면 이 배열에 추가하면 된다.
 * office: 클릭했을 때 보여줄 화면. 지금은 전부 <App />(기존 오피스 시뮬레이션)이지만,
 * 계열사마다 다른 화면이 필요해지면 여기서 분기하면 된다.
 */
const SUBSIDIARIES = [
  {
    id: "nada-company-1",
    name: COMPANY.name,
    tag: "신사업 · 탐색 전담",
    desc: COMPANY.description,
    office: () => <App />,
  },
];

export default function HqApp() {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = SUBSIDIARIES.find((s) => s.id === openId);

  if (open) {
    return (
      <div className="hq-office-wrap">
        <button className="hq-back-btn" onClick={() => setOpenId(null)}>
          ← 나다그룹 HQ
        </button>
        {open.office()}
      </div>
    );
  }

  return (
    <div className="hq-landing">
      <header className="hq-hero">
        <p className="hq-eyebrow">NADA GROUP · HQ</p>
        <h1>나다그룹</h1>
        <p className="hq-desc">탐색부터 계열사 독립까지 — 모든 관계사 현황을 한눈에.</p>
      </header>
      <div className="hq-companies">
        {SUBSIDIARIES.map((s) => (
          <button key={s.id} className="hq-card" onClick={() => setOpenId(s.id)}>
            <span className="hq-card-tag">{s.tag}</span>
            <h2>{s.name}</h2>
            <p>{s.desc}</p>
            <span className="hq-card-cta">오피스 열기 →</span>
          </button>
        ))}
      </div>
    </div>
  );
}
