// Circle Heroes — Firebase 클라이언트 설정.
// 이 값들은 브라우저에 그대로 노출되는 "클라이언트 설정"이라 커밋해도 안전하다
// (Firebase 웹 앱 config는 비밀키가 아님 — 실제 접근 제어는 Firestore 보안 규칙이 담당).
//
// 설정 방법:
//   1. https://console.firebase.google.com 에서 프로젝트 생성
//   2. 프로젝트 설정 → 일반 → "내 앱"에서 웹 앱 추가 → 아래 형태의 config 복사
//   3. Firestore Database 만들기 (프로덕션 모드) → 규칙을 아래처럼 설정:
//        rules_version = '2';
//        service cloud.firestore {
//          match /databases/{database}/documents {
//            match /saves/{code} {
//              allow read, write: if true;
//            }
//          }
//        }
//      (로그인 없는 싱글플레이 게임이라 "복구 코드 자체가 비밀번호" 모델이다.
//       코드를 아는 사람만 그 세이브를 읽고 쓸 수 있다 — 계정 시스템은 아니므로
//       민감한 데이터를 담지 않는 것을 전제로 한다.)
//   4. 아래 PLACEHOLDER 값을 실제 config로 교체
export const firebaseConfig = {
  apiKey: "AIzaSyAflmIwwAdvIgZTZgQbWSME3PEN8SH52F0",
  authDomain: "circleheroes-678a4.firebaseapp.com",
  projectId: "circleheroes-678a4",
  storageBucket: "circleheroes-678a4.firebasestorage.app",
  messagingSenderId: "70973590210",
  appId: "1:70973590210:web:875c03afbfb4c942fa095b",
};

export function isFirebaseConfigured(): boolean {
  return firebaseConfig.apiKey !== "PLACEHOLDER";
}
