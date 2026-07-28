# circle-heroes/reference — 경쟁작 원본 스크린샷

`BENCHMARK.md`에서 다룬 두 레퍼런스의 **실제 원본 이미지**. 좌표·버튼 크기·영웅 스프라이트 비율처럼
글로는 전달하기 어려운 걸 직접 픽셀 단위로 재보려면 여기 파일을 열어서 보면 된다.

## 해상도

전부 **1080×2340 (세로, 9:19.5)** 고정. 이미지 뷰어/에디터에서 좌표를 읽으면 그대로 원본 픽셀 기준이다
(리사이즈나 크롭 없이 영상 프레임을 그대로 뽑은 것). Circle Heroes 논리 해상도(420×740)로 환산하려면
`x / 1080 * 420`, `y / 2340 * 740` 비율로 나누면 된다.

## afk-arena-companions/ (AFK Arena: Companions, 게임 영상에서 프레임 추출)

| 파일 | 내용 |
|---|---|
| `00-main-campaign-bottomnav.jpg` | 메인 화면 — 상단바(레벨·재화)+하단 5탭 좌표 확인용 |
| `01-pre-battle-formation.jpg` | 전투 진입 직전 — 스킬 아이콘 9종 퀵바, "전투" CTA |
| `02-party-formation-rental.jpg` | 파티 편성 — 참전 슬롯 5개, 대여영웅 뱃지 |
| `03-hero-detail-equipment.jpg` | 영웅 상세 — 장비 슬롯 6개(좌3+우3), 스탯 5종, 레벨업 버튼 |
| `04-hero-detail-typematchup.jpg` | 영웅 상세 — 상성 관계 삼각형 팝업(롱프레스 시) |
| `05-hero-codex-grid.jpg` | 도감 — 희귀도별 섹션 구분, 태그형 카드 그리드 |
| `06-inventory.jpg` | 인벤토리 — 아이템 그리드, 탭(아이템/장비/전체) |
| `07-friends.jpg` | 친구 화면 — 우정포인트, 인원 상한 표시 |
| `08-levelup-stat-compare.jpg` | 레벨업 결과 — 전/후 스탯 비교 스크롤(전투력/HP/공격/방어) |
| `09-party-formation-2.jpg` | 파티 편성 — 실제 레벨 반영된 버전(비율 대조용) |
| `10-realtime-combat-hpbars.jpg` | 실전투 — 유닛 머리 위 HP바, 데미지 숫자, AUTO/x2 버튼 위치 |
| `11-summon-cardflip.jpg` | 소환 — 카드 뒤집기 화면 레이아웃 |
| `12-summon-result-grid.jpg` | 소환 결과 — 카드 앞면 공개 후 상태 |
| `13-town-hub-isometric.jpg` | "영지" 탭 — 등각 허브타운 전체 배치 |

## hoc-legends/ (주인님이 직접 캡처한 스크린샷)

| 파일 | 내용 |
|---|---|
| `00-hero-roster-grid.jpg` | 영웅 목록 — 카드 크기·간격, 소환 천장 카운터 위치 |
| `01-hero-detail-main.jpg` | 영웅 상세 메인 — 3D 모델+스탯+스킬 아이콘 배치 |
| `02-hero-detail-equipment.jpg` | 영웅 상세 — 장비 탭(다이아몬드형 6슬롯) |
| `03-summon-result-grid.jpg` | 소환 결과 — 계층 그리드(대형3·중형4·소형3) |
| `04-hero-detail-promotion.jpg` | 영웅 상세 — 승급 탭(전/후 수치 프리뷰, 재료 슬롯) |
| `05-hero-detail-skin-alchemist.jpg` | 다른 영웅(알케미스트) 상세 — 감상모드/전기 버튼 위치 대조용 |

## 사용법 (좌표 재는 법)

1. 파일을 그대로 열어서(대부분의 이미지 뷰어가 마우스 커서 위치의 픽셀 좌표를 상태표시줄에 보여줌) 버튼 모서리 좌표를 읽는다.
2. 또는 Photoshop/Figma 등에 원본 크기 그대로 불러와서 도형 툴로 겹쳐보고 크기를 잰다.
3. Circle Heroes 코드에 적용할 땐 위 "해상도" 절의 비율 변환식으로 420×740 논리좌표로 옮긴다.

`BENCHMARK.md`의 대조 매트릭스와 같이 보면 어느 화면이 어떤 항목과 연결되는지 알 수 있다.
