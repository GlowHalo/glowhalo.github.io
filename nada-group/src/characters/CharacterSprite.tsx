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
}: {
  /** 직원 ID — 항상 같은 조합을 만드는 시드 */
  seed: string;
  /** 사원증 착용 여부 — 대표(사장)만 false, 팀장 포함 나머지는 true */
  wearsBadge: boolean;
  size?: number;
}) {
  const t = traitsFromSeed(seed);
  const style = {
    "--skin": t.skin,
    "--hair": t.hair,
    "--top": t.top,
    "--acc": "#eef0f4",
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
