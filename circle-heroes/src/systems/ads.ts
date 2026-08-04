import { persist, addGold, addGems } from "../state/save";

/** §2026-08-03 "웹/APK에 상시 배너 + 선택형 보상형 광고 준비" — 우선 웹 버전에 구조부터 넣는다.
 * §2026-08-03(2차) "일일 캡 없이 계속 시청 가능하게" — 처음엔 아레나 무료도전 5회 같은 반복보상
 * 패턴을 재사용해 캡을 걸었는데, 실제로는 무제한 시청을 원한다는 지시로 캡을 완전히 뺐다.
 * 실제 광고가 붙으면 광고 자체가 "본 만큼만 보상"이라 어차피 무한 반복엔 현실적 한계(사람이
 * 계속 눌러야 함)가 있어서, 이 게임 경제 안에서는 문제 되지 않는다는 판단 */
export const REWARDED_AD_REWARD: { gold: number; gems: number } = { gold: 5000, gems: 500 };

/** §2026-08-03 AdSense H5 Games Ads(Ad Placement API) 연동 자리 — 계정 승인·광고단위 발급
 * 전까지는 빈 문자열로 둬서 아래 watchRewardedAd()가 조용히 스텁(즉시 보상)으로 폴백한다.
 * 실제로 켜는 절차:
 *   1) https://www.google.com/adsense 에서 이 사이트로 계정 개설 → 심사 승인
 *   2) AdSense 대시보드에서 "H5 Games Ads" 활성화 → 게시자 ID(ca-pub-XXXX) 확인
 *   3) index.html 상단의 주석 처리된 adsbygoogle 스크립트 태그 주석 해제 + ca-pub-XXXX를
 *      실제 ID로 교체
 *   4) 아래 ADSENSE_CLIENT_ID에도 같은 ID를 채우면 그 순간부터 watchRewardedAd()가 실제
 *      adBreak() 광고를 호출한다(코드 추가 수정 불필요) */
const ADSENSE_CLIENT_ID = "";
/** 상시 배너 광고 단위 ID — AdSense 대시보드에서 디스플레이 광고 단위를 새로 만들면 발급되는
 * data-ad-slot 값(ADSENSE_CLIENT_ID와는 별개, 광고 "종류"마다 따로 발급받는 슬롯 ID). 이것도
 * 비어있는 동안은 mountBannerAd()가 아무것도 안 해서 shell.ts가 만들어둔 플레이스홀더 텍스트가
 * 그대로 보인다 */
const AD_BANNER_SLOT_ID = "";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
    adBreak?: (opts: {
      type: string;
      name?: string;
      beforeReward?: (showAdFn: () => void) => void;
      adViewed?: () => void;
      adDismissed?: () => void;
      adBreakDone?: (placementInfo: unknown) => void;
    }) => void;
  }
}

/** 상시 배너 광고 자리(#ad-banner)에 실제 AdSense 디스플레이 광고 단위를 그려 넣는다.
 * 계정·슬롯 ID가 둘 다 채워져 있을 때만 동작 — 그 전엔 호출해도 아무 일 없이 조용히 반환돼서
 * shell.ts가 만들어둔 "광고 배너 영역" 플레이스홀더 라벨이 그대로 남는다 */
export function mountBannerAd(container: HTMLElement) {
  if (!ADSENSE_CLIENT_ID || !AD_BANNER_SLOT_ID) return;
  container.textContent = "";
  const ins = document.createElement("ins");
  ins.className = "adsbygoogle";
  ins.style.display = "inline-block";
  ins.style.width = "320px";
  ins.style.height = "50px";
  ins.setAttribute("data-ad-client", ADSENSE_CLIENT_ID);
  ins.setAttribute("data-ad-slot", AD_BANNER_SLOT_ID);
  container.appendChild(ins);
  (window.adsbygoogle = window.adsbygoogle || []).push({});
}

function grantReward() {
  addGold(REWARDED_AD_REWARD.gold);
  addGems(REWARDED_AD_REWARD.gems);
  persist();
}

/** 광고를 실제로 재생하고, 유저가 끝까지 봤을 때만 true를 반환한다. 계정 연동 전(ADSENSE_CLIENT_ID
 * 비어있음)이거나 SDK 스크립트가 아직 로드 안 됐으면 광고 없이 즉시 보상 지급하는 스텁으로 폴백 —
 * 화면·보상지급 배선은 이미 실제로 동작하니 계정만 연동되면 자동으로 진짜 광고를 태운다 */
export async function watchRewardedAd(): Promise<boolean> {
  if (!ADSENSE_CLIENT_ID || typeof window.adBreak !== "function") {
    grantReward();
    return true;
  }
  return new Promise<boolean>((resolve) => {
    window.adBreak!({
      type: "reward",
      name: "shop_currency_reward",
      // 광고가 실제로 준비됐을 때만 호출됨 — showAdFn()을 불러야 재생이 시작된다
      beforeReward: (showAdFn) => showAdFn(),
      // 유저가 광고를 끝까지 봤을 때만 호출 — 여기서만 보상 지급
      adViewed: () => {
        grantReward();
        resolve(true);
      },
      // 중간에 닫았거나(adDismissed) 광고 자체가 없었을 때(adBreakDone만 오고 adViewed는 안 옴)
      // 둘 다 보상 없이 종료
      adDismissed: () => resolve(false),
      adBreakDone: () => resolve(false),
    });
  });
}
