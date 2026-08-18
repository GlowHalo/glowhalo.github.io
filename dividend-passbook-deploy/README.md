# 초간단 배당현황 — 배포용 사본

`../dividend-passbook/`는 회장이 실제로 매일 쓰는 원본이라 손대지 않는다(2026-08-17 회장 지시). 이 폴더는
그 원본의 복사본이다 — 원본이 이미 PWA 요건(manifest/서비스워커/아이콘)을 갖추고 있어 지금은 순수 사본
그대로다.

- `meta.json`이 없다 — 루트 허브(`registry.js`)에 별도 카드로 뜨지 않도록 의도적으로 뺐다.
- Microsoft Store 제출(PWABuilder MSIX 패키징)은 이 폴더의 라이브 URL(`https://glowhalo.github.io/dividend-passbook-deploy/`)을 대상으로 진행한다.
- 실데이터 소스(13종목 중 4개만 실측치) 관련 개선이 이뤄지면 원본과 이 사본 중 어디에 먼저 반영할지는 그때 판단한다.
