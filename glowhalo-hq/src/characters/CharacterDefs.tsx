// 캐릭터 레이어 SVG 심볼 정의 — 페이지에 한 번만 렌더링하면 됨.
// 레이어 3장(베이스·상의·헤어) + 사원증 1종. 하의(바지·신발)는 트레잇 없이 베이스에 고정.
export default function CharacterDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <symbol id="px-base" viewBox="0 0 10 12">
          <rect x="4" y="0" width="2" height="1" fill="var(--skin)" />
          <rect x="3" y="1" width="4" height="3" fill="var(--skin)" />
          <rect x="4" y="4" width="2" height="1" fill="var(--skin)" />
          <rect x="1" y="5" width="1" height="4" fill="var(--skin)" />
          <rect x="8" y="5" width="1" height="4" fill="var(--skin)" />
          <rect x="3" y="9" width="2" height="3" fill="#232838" />
          <rect x="6" y="9" width="2" height="3" fill="#232838" />
          <rect x="2" y="11" width="2" height="1" fill="#12151b" />
          <rect x="6" y="11" width="2" height="1" fill="#12151b" />
          <rect x="4" y="2" width="1" height="1" fill="#1c2029" />
          <rect x="6" y="2" width="1" height="1" fill="#1c2029" />
        </symbol>

        <symbol id="px-top-tee" viewBox="0 0 10 12">
          <rect x="2" y="5" width="6" height="4" fill="var(--top)" />
        </symbol>
        <symbol id="px-top-collar" viewBox="0 0 10 12">
          <rect x="2" y="5" width="6" height="4" fill="var(--top)" />
          <rect x="4" y="5" width="2" height="1" fill="var(--skin)" />
        </symbol>

        <symbol id="px-hair-short" viewBox="0 0 10 12">
          <rect x="2" y="0" width="6" height="2" fill="var(--hair)" />
        </symbol>
        <symbol id="px-hair-long" viewBox="0 0 10 12">
          <rect x="2" y="0" width="6" height="2" fill="var(--hair)" />
          <rect x="2" y="2" width="1" height="4" fill="var(--hair)" />
          <rect x="7" y="2" width="1" height="4" fill="var(--hair)" />
        </symbol>
        <symbol id="px-hair-pony" viewBox="0 0 10 12">
          <rect x="2" y="0" width="6" height="2" fill="var(--hair)" />
          <rect x="8" y="1" width="1" height="3" fill="var(--hair)" />
        </symbol>
        <symbol id="px-hair-buzz" viewBox="0 0 10 12">
          <rect x="3" y="0" width="4" height="1" fill="var(--hair)" />
        </symbol>

        <symbol id="px-acc-badge" viewBox="0 0 10 12">
          <rect x="5" y="7" width="1" height="2" fill="var(--acc, #eef0f4)" />
          <rect x="5" y="6" width="1" height="1" fill="#8992a6" />
        </symbol>
      </defs>
    </svg>
  );
}
