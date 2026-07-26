// birkmankorea.co.kr 셀렉터 맵.
// `npm run map -- <URL>` 로 정찰한 뒤, 값을 확인해서 채워 넣는다.
// 값이 null 인 항목은 아직 확정 전 — 해당 단계는 cli.js 가 에러로 막는다.
// (틀린 셀렉터로 결제/등록 버튼을 잘못 누르는 사고를 방지하기 위한 안전장치)
export const selectors = {
  // 로그인 감지 (login.js 와 동일한 기준)
  loggedInIndicator:
    'a:has-text("로그아웃"), a[href*="logout" i], a[href*="logoff" i]',

  // 마이페이지 진입 시 비번 재확인 게이트를 피하기 위한 내부 JS 메뉴 함수명
  // (window.goToMypageAssessment() 형태로 호출됨 — birkman.md 참고)
  mypageAssessmentMenuFn: 'goToMypageAssessment',
  mypageAssessmentUrl: 'https://www.birkmankorea.co.kr/mypage/assessment',

  // 진단내역 목록 (주문 테이블) — map.js 로 재확인 필요
  orderRow: null, // TODO
  orderCodeCell: null, // TODO
  orderStatusCell: null, // TODO
  orderQuantityLink: null, // TODO: 수량 숫자 클릭 → 대상자 리스트 모달

  // 결과 PDF 다운로드 (확인됨)
  downloadLink: 'a.download_file[data-member][data-file]',
  downloadUrlTemplate: '/mypage/download/assessment/each?num={memberId}',

  // 진단지 구매 (실결제 — map.js 로 해당 페이지 정찰 후 확정할 것)
  purchase: {
    pageUrlTemplate: null, // TODO: '/assessment/view?code=...' 확인 후 채움
    submitButton: null, // TODO
  },

  // 대상자(피검사자) 등록 — 전송 모달
  registerTarget: {
    triggerButton: null, // TODO: 주문 행의 "전송" 버튼
    nameInput: null, // TODO
    emailInput: null, // TODO
    submitButton: null, // TODO
  },
};

// 아직 채워지지 않은(null) 항목이 있으면 사용을 막기 위한 헬퍼.
export function requireSelector(value, hint) {
  if (value === null || value === undefined) {
    throw new Error(
      `[selectors.js] 아직 확정되지 않은 셀렉터입니다: ${hint}\n` +
        `→ 로그인 상태에서 'npm run map <해당 URL>' 로 정찰한 뒤 src/selectors.js 를 채워 넣으세요.`
    );
  }
  return value;
}
