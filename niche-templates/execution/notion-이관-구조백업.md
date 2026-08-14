# Notion 이관 전 구조 백업 (2026-08-09)

회장 개인 Notion 계정(기존 개인 워크스페이스)에서 나다컴퍼니 전용 워크스페이스로 나다컴퍼니
관련 Notion 콘텐츠를 이관하기 전, Claude의 Notion 연결을 재인증하면 기존 워크스페이스 접근이
끊길 수 있어 페이지 구조만 먼저 기록해둔다. **실제 카피·문구·기획 내용은 이미 아래 문서에
전부 마크다운으로 존재하므로 이 백업은 "구조 지도" 역할만 한다:**

- AI Board of Directors → [`04-gumroad-업로드-준비.md`](products/04-gumroad-업로드-준비.md)
- Investor Panel → [`05-investor-panel.md`](products/05-investor-panel.md)
- Code Review Board → [`06-code-review-board.md`](products/06-code-review-board.md)

## 페이지 트리 (이관 시점 기준)

```
🏢 작업실 컴퍼니 — 상품 허브 (공개 상속 루트)
├── 🎯 Investor Panel — 3 AI VCs Review Your Pitch Before Real Ones Do
│   ├── DB: Pitch Reviews
│   ├── 📄 Prompt Sets
│   └── 📄 Start Here
└── 🔍 Code Review Board
    ├── 📄 Start Here
    ├── 📄 Prompt Sets
    └── DB: Review Log

📋 AI Board of Directors (허브 밖 — 허브보다 먼저 만들어짐, 상속 안 받음)
├── 📄 Company Charter
├── 📄 Execution Plan
├── 📄 Prompt Sets
├── DB: Board Minutes
├── DB: Proposals
├── DB: Candidate Tracker
└── 📄 Start Here

🔐 나다그룹 — 자동화 계정 목록 (비공개, 워크스페이스 최상위 — 상품 허브와 무관)
```

## 이관 시 체크리스트

- [ ] tossneon0 워크스페이스에 "나다컴퍼니" 루트 페이지 생성
- [ ] 위 3개 상품(허브 포함) 트리 그대로 재구성 — 텍스트는 `niche-templates/execution/products/*.md`에서 가져옴
- [ ] "🏢 상품 허브" 하위 공개 상속 구조 유지 (새 상품 만들 때 토글 안 눌러도 되게)
- [ ] "🔐 자동화 계정 목록"은 새 워크스페이스에서도 **비공개 + 워크스페이스 최상위**(공개 페이지 하위 아님) 유지
- [ ] 각 상품 Gumroad 라이브 페이지의 "Notion 템플릿 링크"를 새 워크스페이스 URL로 갱신
- [ ] 이관 완료 후 `.claude/rules/cloudflare-vault.md`의 `notion_login_*` 설명에 "이관 완료" 표시
