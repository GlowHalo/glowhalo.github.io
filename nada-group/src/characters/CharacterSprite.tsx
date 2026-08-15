import type { CSSProperties } from "react";
import { traitsFromSeed } from "./traits";

const HAIR_SYMBOL: Record<string, string> = {
  short: "#px-hair-short",
  long: "#px-hair-long",
  pony: "#px-hair-pony",
  buzz: "#px-hair-buzz",
};
const TOP_SYMBOL: Record<string, string> = {
  tee: "#px-top-tee",
  collar: "#px-top-collar",
};

export default function CharacterSprite({
  seed,
  wearsBadge,
  size = 34,
  flip,
  faded,
}: {
  /** 직원 ID — 항상 같은 조합을 만드는 시드 */
  seed: string;
  /** 사원증 착용 여부 — 대표(사장)만 false, 팀장 포함 나머지는 true */
  wearsBadge: boolean;
  size?: number;
  /** 좌우 반전 — 회의 테이블 건너편 자리에서 마주보게 할 때 */
  flip?: boolean;
  /** 자리 비움(회의 참석 중) 표시 — 흐리게 */
  faded?: boolean;
}) {
  const t = traitsFromSeed(seed);
  const style = {
    "--skin": t.skin,
    "--hair": t.hair,
    "--top": t.top,
    "--acc": "#eef0f4",
    transform: flip ? "scaleX(-1)" : undefined,
    opacity: faded ? 0.4 : undefined,
  } as CSSProperties;

  return (
    <svg
      viewBox="0 0 10 12"
      width={size}
      height={(size * 12) / 10}
      style={{ ...style, imageRendering: "pixelated", display: "block" }}
      role="img"
      aria-label="직원 캐릭터"
    >
      <use href="#px-base" />
      <use href={TOP_SYMBOL[t.topShape]} />
      <use href={HAIR_SYMBOL[t.hairStyle]} />
      {wearsBadge ? <use href="#px-acc-badge" /> : null}
    </svg>
  );
}
