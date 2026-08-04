import { save, persist, addGold, addGems } from "../state/save";

/** §2026-08-03 "웹/APK에 상시 배너 + 선택형 보상형 광고 준비" — 우선 APK(Play스토어) 기준으로
 * 검토했지만 당장은 웹 버전에 구조부터 넣는다. 실제 광고 SDK(AdSense H5 Games Ads / AdMob)
 * 계정·광고단위 ID가 아직 없어서, 여기 watchRewardedAd()는 광고 재생 없이 즉시 "시청 완료"로
 * 처리하는 스텁이다 — 버튼·횟수제한·보상지급 배선은 전부 실제로 동작하니, 나중에 SDK가
 * 준비되면 이 함수 내부에서 실제 광고 재생 Promise를 기다리도록 교체하기만 하면 된다.
 * 보상액(골드5000/다이아500)은 사용자가 직접 지정한 값 — 일일 5회 캡은 다른 반복 보상
 * (아레나 무료도전 5회 등)과 같은 패턴을 재사용해 무제한 파밍을 막아둔 것이라 필요하면 조정 가능 */
export const REWARDED_AD_DAILY_CAP = 5;
export const REWARDED_AD_REWARD: { gold: number; gems: number } = { gold: 5000, gems: 500 };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function ensureRewardedAdDay() {
  const t = today();
  if (save.rewardedAdDate !== t) {
    save.rewardedAdDate = t;
    save.rewardedAdCount = 0;
    persist();
  }
}

export function rewardedAdsRemainingToday(): number {
  ensureRewardedAdDay();
  return Math.max(0, REWARDED_AD_DAILY_CAP - save.rewardedAdCount);
}

/** 광고 재생을 "기다렸다가" 보상을 지급한다는 형태를 미리 잡아둔 async 함수 — 지금은 즉시
 * resolve(스텁), 나중에 실제 SDK의 showRewardedAd() 호출로 이 안쪽만 바꾸면 된다.
 * 오늘 횟수를 다 썼으면 광고를 아예 열지 않고 false 반환 */
export async function watchRewardedAd(): Promise<boolean> {
  ensureRewardedAdDay();
  if (rewardedAdsRemainingToday() <= 0) return false;
  // TODO(실제 SDK 연동 시): await admob.showRewardedAd() 등으로 교체.
  // 유저가 광고를 끝까지 안 보고 중간에 닫으면 실제 SDK는 실패를 반환하므로,
  // 그 경우 아래 지급 로직을 타지 않도록 이 자리에서 분기하면 됨.
  save.rewardedAdCount++;
  addGold(REWARDED_AD_REWARD.gold);
  addGems(REWARDED_AD_REWARD.gems);
  persist();
  return true;
}
