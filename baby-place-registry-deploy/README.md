# 아기랑 갈곳 — 배포용 사본

`../baby-place-registry/`는 회장이 실제로 매일 쓰는 원본이라 손대지 않는다(2026-08-17 회장 지시). 이 폴더는
그 원본을 복사해서 스토어 배포용 개선(죽은 파일 정리, 하드코딩 주소 → 설정값 전환, PWA manifest/서비스워커/
아이콘 추가)을 적용한 사본이다.

- `meta.json`이 없다 — 루트 허브(`registry.js`)에 별도 카드로 뜨지 않도록 의도적으로 뺐다.
- Microsoft Store 제출(PWABuilder MSIX 패키징)은 이 폴더의 라이브 URL(`https://tossneon.github.io/baby-place-registry-deploy/`)을 대상으로 진행한다.
- 원본에 적용할 만한 개선이 검증되면 그때 다시 원본에 병합할지 판단한다.

상세 변경 내역: `app-portfolio/candidates.md`, 커밋 `672ef16`.
