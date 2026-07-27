# Circle Heroes — 나노바나나(Gemini) 이미지 생성 프롬프트 (Rev.2)

> **자동화 (Rev.2.2)**: 두 자동화 스크립트가 `scripts/asset-catalog.mjs`(이 문서의 코드화)를 공유한다.
> `node scripts/<파일> --list` 로 에셋키 확인. 생성 결과는 `assets-gen/<키>/` (gitignore 대상)에 쌓이고,
> 검수 통과본만 게임에 배치한다. 아래 수동 프롬프트는 여전히 정본.
>
> - **Leonardo.ai (`gen-assets-leonardo.mjs`, 채택)** — 일일 무료 150토큰으로 시작 가능, 게임아트 특화.
>   키는 환경변수/`.env`의 `LEONARDO_API_KEY` (발급: https://app.leonardo.ai/api-access).
>   `--ref`로 참조 이미지 업로드 시 Style Reference ControlNet 적용, `--list-models`로 실제 계정
>   모델 목록 확인 가능 (기본값은 Phoenix).
>   **기준 이미지 확정됨**: `assets/characters/mage_flame_001.png` — 이후 캐릭터는
>   `--ref assets/characters/mage_flame_001.png` 로 그림체를 통일한다.
>   Leonardo가 배경을 순백색(`pure white background, no shadow`)으로만 뱉어서, 다운로드 후
>   `python3 scripts/strip-white-bg.py <입력.png> <출력.png>` (pip install pillow numpy)로
>   테두리에 붙은 흰 배경만 flood-fill 투명화한다 (내부의 흰색 하이라이트는 보존).
> - **Gemini(`gen-assets.mjs`, 대안)** — 키는 `GEMINI_API_KEY`. **결제 계정 연결 필요**
>   (무료 등급은 이미지 생성 할당량 0 — 429 확인됨). 결제 연결 시 바로 사용 가능.
>
> **키는 절대 커밋되지 않는다** (`.env`, `*.key` 등은 gitignore 대상, 코드에도 하드코딩 없음).
>
> **세션 간 소통(중요)**: 이미지 생성을 다른 세션에서 진행 중이라면, 대화는 서로 안 보이므로
> 반드시 이 저장소를 통해서만 결과를 주고받는다. 후보 생성(`assets-gen/`, gitignore)에서
> 골라낸 최종본은 **`circle-heroes/assets/<카테고리>/<파일명>`에 커밋**하고 **`master`에 직접 푸시**한다
> (규칙·파일명은 `circle-heroes/assets/README.md` 참고). 게임 코드 세션은 수시로
> `git pull origin master`로 받아서 연결한다. 접수 현황 표(아래)도 갱신해줄 것.

> **Rev.2 변경**: 1차 생성에서 그림체가 섞이는 문제 발생 → 원인은 "same art style as previous image" 의존.
> 해결: ① 아래 STYLE BLOCK을 **모든 프롬프트에 통째로 반복** ② 잘 나온 기준 이미지 1장을 **매번 참조로 첨부**하고
> "Match the exact art style of the attached reference image"를 덧붙인다.

## 2026-07-27 (3차): UI 버튼 9-slice 재작업 + 카드 웹 최적화 (완료, 승인 불필요 항목)

이전 세션이 남긴 "제작 필요한 소스" 그루핑 중 4번(버튼 9-slice 설계)·5번(카드 최적화)을
주인님 지시(`4,5번은 승인 없이 네 판단으로 진행`)에 따라 바로 처리함.

**4. `btn-primary-bg.png` / `btn-danger-bg.png` 재작업 — 완료**
- 기존 문제: 캔버스(800×256) 안에 작은 사각형 버튼이 중앙에만 떠 있고, 하이라이트가
  대각선으로 흘러서 9-slice로 가로 스트레치하면 하이라이트가 일그러지는 구조였음.
- 결정: **9-slice 방식 채택**. 가로로 긴 필/캡슐 모양이 캔버스 좌우 끝까지 꽉 차고,
  그라데이션은 위→아래 방향만(대각선 하이라이트 없음), 테두리 두께 균일하게 재작업.
  코드 쪽에서 9-slice 적용 시 좌우 각각 약 130px(캡슐 끝 반원 부분)을 고정폭 캡으로,
  중앙을 스트레치 영역으로 잡으면 됨.
- `assets/icons/btn-primary-bg.png`(금색), `btn-danger-bg.png`(적색) 커밋됨(기존 파일 교체).

**5. 카드 일러스트 웹 최적화 — 완료**
- 기존 `assets/cards/` 66장 PNG 원본(115MB, 미사용 상태)은 그대로 보존.
- 신규 `assets/cards-webp/<캐릭터id>.webp` 66장 추가: 768×1152(원본 1024×1536의 75%),
  WebP quality 85 — 총 용량 **115MB → 6.8MB**(17배 감소), 육안 화질 저하 거의 없음 확인.
  실제 화면(영웅 상세 일러스트 뷰 등)에 붙일 때는 이 webp 폴더를 사용 권장. 원본 PNG가
  필요하면(고해상도 인쇄물 등) `assets/cards/`를 그대로 사용.

## 2026-07-27 (2차): 정면 포즈 캐릭터/몬스터 리스트업 (좌우반전 재작업 대상)

전투 화면에서 아군=오른쪽, 적군=왼쪽을 보도록 좌우반전(`flipX`)을 적용했는데, 일부 소스는
**정면을 보는 대칭 포즈**라 반전해도 티가 안 난다(주인님이 실제 빌드에서 확인). 코드 문제가
아니라(픽셀 단위로 대조해서 반전 자체는 정상 작동 확인함) 소스 자체가 좌우 비대칭 요소가
없어서 생기는 문제. 71장 전체를 훑어서 정리한 목록:

**1군 — 확실한 정면/대칭(반전 효과 거의 없음, 재작업 권장)** — 24종
```
arachne_dark, athena_light, balrog_flame, beast_dark, belle_light, cao_cao_dark,
cerberus_dark, da_qiao_wind, dian_wei_flame, diaochan_dark, guan_yu, hades_dark,
harpy_wind, hong_gildong_wind, hua_tuo_light, incubus_dark, medusa_dark,
michael_light, pang_tong_dark, persephone_dark, pinocchio_wind, raphael_light,
siren_water, snowwhite_light, succubus_dark, xiao_qiao_water, zhu_bajie_water,
zhuge_liang_wind
```
재작업 시 프롬프트에 "body turned to face right, weight on one leg, weapon/prop
held on one side" 처럼 뚜렷한 좌우 비대칭 지시를 넣어주면 반전이 잘 보일 것 같다.

**2군 — 동일 포즈 템플릿이라 약한 비대칭만 있음(애매함, 필요시만)** — 15종 + 개별 11종
```
knight_{dark,flame,light,water,wind}, mage_{dark,flame,light,water,wind},
soldier_{dark,flame,light,water,wind}  (검+지팡이가 한쪽 손에 있어 아주 약하게 비대칭)
ares_flame, artemis_wind, death_knight, hercules_flame, minotaur_flame,
poseidon_water, puss_boots_wind, sun_wukong_flame, uriel_light, xu_chu_flame,
zeus_light
```
이 그룹은 지금도 최소한의 방향성은 있어서 급하지 않음 — 1군부터 재작업 부탁드립니다.

**몬스터도 같은 문제** — `slime_green_001`, `boss_slime_001` 둘 다 정면/대칭 실루엣이라
반전이 잘 안 보임(보스슬라임은 확인해보니 눈 모양 등 미세한 비대칭은 있어서 반전 자체는
되고 있지만 육안으로 알아채기 어려운 수준). 재작업하게 되면 몬스터도 "명확히 한쪽을 보는
자세"로 부탁드려요.

## 2026-07-27 (4차): 좌우반전 재작업 완료 (1군+2군+몬스터 56종 검수 반영)

위 1군(28종)·2군(26종)·몬스터(2종) 좌우반전 재작업을 전부 생성하고 5개씩 검수받아 반영함.
Leonardo API 토큰이 중간에 고갈되어 충전 후 재개(계정 결제 필요, 이미지 세션에서 자체 처리
불가한 유일한 종류의 블로커 — 앞으로도 발생 가능하니 참고).

**재작업 적용됨 (44종)** — `assets/characters/` 또는 `assets/monsters/`에 기존 파일 교체:
```
arachne_dark, athena_light, balrog_flame, beast_dark, belle_light, cao_cao_dark,
da_qiao_wind, diaochan_dark, guan_yu, hades_dark, harpy_wind, hua_tuo_light,
incubus_dark, medusa_dark, michael_light, pang_tong_dark, persephone_dark,
raphael_light, siren_water, snowwhite_light, succubus_dark, xiao_qiao_water,
zhu_bajie_water, knight_flame, mage_light, mage_water, mage_wind, soldier_dark,
soldier_flame, soldier_light, soldier_water, soldier_wind, ares_flame, artemis_wind,
hercules_flame, minotaur_flame, poseidon_water, puss_boots_wind, sun_wukong_flame,
uriel_light, xu_chu_flame, zeus_light, slime_green(몬스터), boss_slime(몬스터)
```

**주인님 검수 후 기존 유지 결정 (12종)** — 재작업 결과가 있었지만 원본이 더 낫다고 판단되어
그대로 둠 (재시도해도 계속 대칭으로 돌아오거나, 디자인 드리프트가 있었던 케이스 포함):
```
cerberus_dark, dian_wei_flame, hong_gildong_wind, pinocchio_wind, zhuge_liang_wind,
knight_dark, knight_light, knight_water, knight_wind, mage_dark(기준이미지 아님),
mage_flame(★그림체 기준이미지★ — 재작업본은 로브 복구까지 잘 됐지만 최종적으로 기존 유지 선택됨),
death_knight
```

**기술 메모**: `--ref` + `--strength Mid` + "3/4 각도로 몸을 틀고 무기를 한쪽에" 식 강한 비대칭
지시문 조합이 대부분 효과적이었음. 일부(arachne_dark, dian_wei_flame)는 5회 안팎 재시도(각도·
strength 변경 포함)에도 계속 대칭으로 수렴 — 이런 케이스는 `--ref` 자체를 버리고 순수 텍스트로
처음부터 다시 그리는 방식을 다음에 시도해볼 것.

## 2026-07-27: 코드 반영 현황 + 리소스 검토의견 + 남은 갭 (게임 코드 세션 기록)

### 이번 반영 내역
`circle-heroes/assets/`에 커밋되어 있던 자산 중 다음을 실제 게임 코드에 연결했다:
캐릭터 초상화(전투 화면 실루엣 + 영웅/편성/소환 화면 얼굴 클로즈업 크롭), 몬스터(슬라임·슬라임킹),
전투 배경(`battle-grassland.png`), 하단 탭 아이콘 5종, 우상단 코너 아이콘 3종(이벤트·우편·설정),
HUD 골드/보석 아이콘, 진영 필터 아이콘 6종(`elem-*.png`).

### 전체 리소스 교체 검토 의견
`assets/README.md`·이 문서의 접수 현황 표를 보면 계획된 그림 자산(캐릭터 71종, 카드 66종,
몬스터, 배경, 이펙트 8종, UI 아이콘 대부분)은 **이미 거의 다 완성되어 커밋까지 끝난 상태**다.
즉 "만들 게 남았냐"보다는 "이미 있는데 코드가 안 쓰고 있었냐"가 이번 피드백의 실체였다.
그래서 결론은 **예, 전체 교체를 계속 진행하는 게 맞다** — 남은 건 순수 코드 작업이고 리소스
낭비가 아니다. 다만 우선순위는 다르게 둘 것을 제안:
- **바로 가능**: `chip-bg.png`(서브메뉴 칩), `icon-close.png`(모달 닫기), `icon-speed.png`
  (전투 배속 토글) — 고정 크기 아이콘이라 왜곡 위험이 없다.
- **작은 설계 필요**: `btn-primary-bg.png` / `btn-danger-bg.png` — 800×256 고정 비율 텍스처라
  버튼마다 글자 길이가 달라지면 그대로 늘렸을 때 찌그러져 보인다. 9-slice(모서리 고정) 방식으로
  잘라 쓰거나, 버튼 폭을 몇 가지 고정 사이즈로 제한하는 결정이 먼저 필요해서 이번엔 보류했다.
- **용량 때문에 보류**: `cards/` 66장(현재 총 116MB, 장당 1.5~2MB PNG)은 현재 어떤 화면에서도
  안 쓰인다. 이걸 실제로 쓸 화면(예: 영웅 상세에 카드 전신 일러스트 보기, 소환 연출 카드 뒷배경 등)이
  정해지면 그때 웹용으로 리사이즈/압축(WebP 전환 등)해서 필요한 만큼만 넣는 걸 추천한다 — 원본
  그대로 앱에 넣으면 APK가 100MB 이상 불어난다.

### 남은 리소스 갭 (신규 요청 — 이번 세션에서 코드 작업 중 발견)
| 항목 | 규격 | 비고 |
|---|---|---|
| 무한의 탑 전용 몬스터 | 512×512, PNG 투명배경 | "탑 병사"/"탑의 수호자"(보스) — 현재 슬라임 아트를 임시로 재사용 중 |
| 요일던전 보스 전용 몬스터 | 512×512(보스급 768×768 권장) | 진영별로 이름이 바뀌는 보스(`raid_boss`) — 현재 슬라임킹 아트를 임시로 재사용 중 |

### 제작 사이클 표준 (다음 요청부터 적용 부탁)
1. `assets/README.md`의 폴더·파일명 규칙(영웅/몬스터 id 그대로, PNG 투명배경) 그대로 유지.
2. 완성되는 대로 `assets/<카테고리>/`에 커밋 + 이 문서 "접수 현황" 표 갱신 + **`master`에 직접 push**
   (기존 규칙 동일 — 코드 세션과 브랜치 충돌 없음).
3. 대량 자산(수십 장 이상, 또는 장당 1MB 넘는 원본)을 새로 추가할 계획이면, 커밋 전에 예상 총
   용량을 이 문서에 한 줄로 남겨줄 것 — 코드 세션이 "이걸 다 앱에 넣을지 말지"를 미리 판단할 수 있게.
4. 코드 반영은 "반영해" 신호가 오면 마지막 반영 커밋 이후 `git diff`로 바뀐 파일만 정확히 반영하는
   기존 방식 유지.

## 사용 순서

1. 한 채팅방에서 진행. 먼저 화염마법사를 만들어 마음에 들 때까지 재생성 → 이것이 **기준 이미지**
2. 이후 모든 캐릭터는 기준 이미지를 첨부하고 아래 프롬프트 사용
3. 투명 배경이 안 되면 "pure white background, no shadow"로 받기 (Claude가 배경 제거)
4. 글자/워터마크가 끼면 그 장만 재생성
5. **개별 파일**로 저장해서 채팅에 첨부 (모음 시트 ❌)

## STYLE BLOCK (모든 프롬프트 맨 앞에 붙여넣기)

```
Vibrant anime-style mobile gacha RPG character art. Clean bold dark outlines,
glossy cel shading with soft gradients, chibi-heroic 3-head proportions,
rich saturated colors, subtle rim lighting from the upper left.
Match the exact art style of the attached reference image: same line weight,
same eye style, same color saturation, same level of detail.
```

## 캐릭터 프롬프트 (STYLE BLOCK 뒤에 이어 붙이기)

### 1. 화염마법사 (512×512) — 기준 이미지 후보
```
A female flame mage in a deep red hooded robe with gold flame-pattern trim,
holding a wooden staff topped with a burning flame orb, confident smile.
Full body, single character only, facing right (3/4 view), feet at bottom center, small margin.
Transparent background (alpha PNG). No text, no letters, no watermark, no frame. Square 1:1.
```

### 2. 서큐버스 (512×512)
```
A playful succubus with dark purple twin-tails fading to pink tips, small curved
crimson horns, bat wings, whip-like tail with a heart tip, dark violet outfit,
mischievous smirk with a tiny fang.
Full body, single character only, facing right (3/4 view), feet at bottom center, small margin.
Transparent background (alpha PNG). No text, no watermark, no frame. Square 1:1.
```

### 3. 데스나이트 (512×512) — 리니지 데스나이트 참고 (은색 갑옷 + 금장 + 해골 + 황금빛 검)
```
A death knight in silver plate armor with ornate gold trim and rivets, a
skeletal skull visible inside the open-faced helmet, tattered dark cloth
wrappings at the waist, holding a large glowing golden greatsword radiating
warm light.
Full body, single character only, facing right (3/4 view), feet at bottom center, small margin.
Transparent background (alpha PNG). No text, no watermark, no frame. Square 1:1.
```

### 3-1. 관우(삼국지) (512×512)
```
Guan Yu, a legendary Chinese general from Romance of the Three Kingdoms,
with a deep reddish-toned face, long flowing black beard, wearing ornate green
robes over golden armor, holding a massive green-bladed guandao (crescent
moon blade polearm), dignified confident expression.
Full body, single character only, facing right (3/4 view), feet at bottom center, small margin.
Transparent background (alpha PNG). No text, no watermark, no frame. Square 1:1.
```

### 4. 슬라임 (512×512)
```
A green slime monster with a classic simple retro game monster design --
short and squat teardrop-shaped blob body, wider than it is tall, flattened
rounded top (not a tall pointed peak), glossy jelly surface with a shine
highlight, small simple dot eyes, a flat neutral or slightly grumpy small
mouth (not smiling, not laughing, not cute), no limbs, no blush cheeks.
Single creature only, facing right, centered, small margin.
Transparent background (alpha PNG). No text, no watermark. Square 1:1.
```

### 5. 보스슬라임 (768×768) — 몬스터(스테이지 보스), 플레이 가능 캐릭터 아님 → `assets/monsters/`
```
A giant menacing purple crystal slime boss, jagged crystal spikes growing from
its jelly body, angry glowing eyes, small green slimes absorbed inside its
translucent body, ominous purple glow.
Single creature only, facing right, centered, small margin.
Transparent background (alpha PNG). No text, no watermark. Square 1:1.
```

## 배경·아이콘

### 6. 전투 배경 (1080×1920 세로)
```
Vertical portrait mobile game battle background, 9:16, painterly anime style.
A peaceful green grassland battlefield with rolling hills, a flat open dirt area
across the middle where characters stand, distant mountains and clouds.
Top quarter is simple open sky (UI covers it). Slightly desaturated so characters pop.
No characters, no text, no watermark, no UI elements.
```

### 7. 골드 아이콘 (128×128)
```
Mobile game currency icon, glossy golden coin with a crown emblem, thick dark
outline, shiny highlight, anime game UI style.
Single icon, centered. Transparent background. No text, no watermark. Square 1:1.
```

### 8. 다이아몬드 아이콘 (128×128)
```
Mobile game currency icon, glossy blue diamond gem with bright facets and
sparkle highlights, thick dark outline, anime game UI style, matching the gold coin.
Single icon, centered. Transparent background. No text, no watermark. Square 1:1.
```

## 카드 일러스트 (1024×1536 세로)

> **Rev.3 결정**: 전투 스프라이트(치비)와 카드는 **의도적으로 다른 화풍**을 쓴다.
> 전투 스프라이트 = 치비/SD 유지, 카드 = "프리미엄 애니메 가챠 일러스트" 톤
> (준-사실적, 정밀한 채색, 은은한 페인터리 셰이딩 — 서큐버스 카드 5종 비교에서
> "C2" 안으로 확정). STYLE BLOCK(치비 비율 문구)은 카드에는 **적용하지 않는다.**
> `--ref`로 해당 캐릭터의 확정 전투 이미지를 강하게(`--strength High`) 걸어서
> 얼굴·의상·색은 유지하고 포즈·배경만 바꾼다.
>
> 주의: "no frame/no border" 같은 부정형 지시를 넣으면 오히려 그 프레임이
> 생기는 경우가 있었음(Phoenix 특성) — 부정형 대신 "full bleed illustration
> filling the entire canvas edge to edge" 같은 긍정형 표현이 더 잘 먹힘.
> `--ref` 영향이 강해서 5가지 화풍 프롬프트를 줘도 결과가 비슷하게 수렴하는
> 경향이 있음 — 캐릭터마다 디테일(무기 발광색 등)은 개별 확인 필요.

```
Vertical 2:3 portrait card illustration of [캐릭터 설명], matching the attached
reference image's face and design. Premium semi-realistic anime mobile gacha
illustration style, soft blended painterly shading, realistic detailed
rendering, polished top-tier gacha game splash art. Dynamic pose, [테마 배경],
dramatic lighting, full bleed illustration filling the entire canvas edge to edge.
```

## 참고 (게임 코드 세션 → 이미지 세션)

- 데스나이트(리니지풍) 확인했습니다 — 실제 결과물은 은색·금색 해골기사라 리니지 특유의
  사슴뿔 투구/어두운 색감과는 다르게 나와서 문제없어 보입니다. 다만 앞으로는 프롬프트에
  **특정 상업 게임명을 직접 참조로 넣지 않는 것**을 추천드려요(관우처럼 역사·설화 원형은
  괜찮지만, 타 게임 캐릭터 디자인을 명시적으로 참고 대상으로 삼는 건 저작권 리스크가 있어서요).
  이미 나온 결과물은 괜찮으니 그대로 유지하시면 됩니다.

## 전투 이펙트 에셋 요청 (신규 — 마이티아레나 참고, 전투가 더 화려했으면 함)

주인님 요청: 전투 이펙트를 화려하게. 데미지 숫자(팝 애니메이션·외곽선·크리티컬 카메라 흔들림)는
코드로 이미 처리했음 — 여기 요청은 **그림 에셋이 필요한 부분만**. 우선순위 순.

### E1. 타격 임팩트(범용, 256×256) — 최우선
```
Mobile game hit-impact VFX sprite, bold white and yellow starburst/slash cross
shape, sharp jagged energy lines radiating from center, anime game style,
high contrast, glowing edges.
Single effect, centered. Transparent background. No text, no watermark. Square 1:1.
```

### E2~E6. 속성별 타격 이펙트 (256×256, 5종 — 진영 색상에 맞춰)
E1과 동일한 구도(중앙에서 방사하는 임팩트)로, 색상만 진영별로:
- **불**: 주황-빨강 화염 폭발
- **물**: 파란 물보라/물결 파열
- **바람**: 청록-연두 회오리 슬래시
- **빛**: 금색-흰색 성스러운 광채 폭발
- **어둠**: 보라-검정 어둠 소용돌이

```
Mobile game elemental hit-impact VFX sprite, [불: orange-red fire burst /
물: blue water splash burst / 바람: teal-green whirlwind slash / 빛: gold-white
holy light burst / 어둠: purple-black dark vortex burst], radiating from center,
anime game style, glowing edges, high contrast.
Single effect, centered. Transparent background. No text, no watermark. Square 1:1.
```

### E7. 크리티컬 특수 임팩트 (256×256)
```
Mobile game critical-hit VFX sprite, dramatic gold and red starburst with
sharp radiating spikes, "impact" energy rings, more intense and larger than
a normal hit effect, anime game style, glowing edges.
Single effect, centered. Transparent background. No text, no watermark. Square 1:1.
```

### E8. 스킬 시전 오라 (256×256, 원형)
```
Mobile game skill-cast aura VFX, glowing circular energy ring on the ground,
soft radial glow, anime game style, magical particle sparkles around the rim.
Single effect, centered, circular, meant to sit under a character's feet.
Transparent background. No text, no watermark. Square 1:1.
```

이 8종은 `assets/effects/`에 `hit-impact.png`, `hit-불.png`, `hit-물.png`, `hit-바람.png`,
`hit-빛.png`, `hit-어둠.png`, `hit-crit.png`, `cast-aura.png` 파일명으로 커밋해주면
게임 코드에서 순차 연결하겠습니다.

## 접수 현황

| 에셋 | 상태 |
|---|---|
| 화염마법사 전투 | **커밋됨** — `assets/characters/mage_flame_001.png` (2.4등신, 순수 텍스트 방식) |
| 관우(삼국지) 전투 | **커밋됨** — `assets/characters/guan_yu_001.png` (1.9등신) |
| 서큐버스 전투 | **커밋됨** — `assets/characters/succubus_dark_001.png` (뿔+박쥐날개+꼬리, 2.0등신) |
| 데스나이트 전투 | **커밋됨** — `assets/characters/death_knight_001.png` (리니지풍 은갑옷+금장+해골+황금검, 2.4등신) |
| 슬라임 (몬스터, 캐릭터 아님) | **커밋됨** — `assets/monsters/slime_green_001.png` (납작한 물방울형, 무표정) — 경로 정정 |
| 보스슬라임 (몬스터, 캐릭터 아님) | **커밋됨** — `assets/monsters/boss_slime_001.png` — 경로 정정 |
| 전투 배경 | **커밋됨** — `assets/backgrounds/battle-grassland.png` (864×1536 생성 후 1080×1920 업스케일) |
| 골드 아이콘 | **커밋됨** — `assets/icons/gold.png` (512 생성 후 128 축소) |
| 다이아몬드 아이콘 | **커밋됨** — `assets/icons/gem.png` (512 생성 후 128 축소) |
| 카드: 화염마법사 | **커밋됨** — `assets/cards/mage_flame_001.png` (프리미엄 애니메 가챠 톤) |
| 카드: 관우 | **커밋됨** — `assets/cards/guan_yu_001.png` |
| 카드: 데스나이트 | **커밋됨** — `assets/cards/death_knight_001.png` (황금빛 대검, 묘지 배경, R3) |
| 카드: 서큐버스 | **커밋됨** — `assets/cards/succubus_dark_001.png` (C2 톤 표준 확정본) |
| 카드: 나머지 62종 | **커밋됨** — 로스터 66명 전원 카드 완료 (`assets/cards/<캐릭터id>.png`, 배틀 스프라이트와 동일 파일명). 성별 드리프트(유비/조조/조운/여포/방통/손오공/포세이돈/장비/전위/장료/화타/곽가/아레스/마초/허저/하후돈) 및 종족 드리프트(저팔계=사람→돼지로 재작업) 전부 수정 완료. 히든 5종은 카드 미제작(미스터리 실루엣 유지, 카드 불필요 판단). |
| UI: 하단탭 5종 | **커밋됨** — `assets/icons/tab-{hero,summon,shop,mission,battle}.png` |
| UI: 코너버튼 3종 | **커밋됨** — `assets/icons/icon-{gift,mail,settings}.png` |
| UI: 공용 버튼 배경 | **커밋됨** — `assets/icons/btn-primary-bg.png` |
| UI: 서브메뉴 칩 배경 | **커밋됨** — `assets/icons/chip-bg.png` (텍스트 없음, HTML 라벨 얹는 용도) |
| UI: 진영 필터 아이콘 6종 | **커밋됨** — `assets/icons/elem-{all,fire,wind,light,dark,water}.png` |
| UI: 배속토글/위험버튼/닫기 | **커밋됨** — `assets/icons/icon-speed.png`, `btn-danger-bg.png`, `icon-close.png` — UI 마무리 완료 |

## 로스터 66+5종 진행 현황 (Notion "로스터 초안 검토" 기준)

`--ref` 없이 순수 텍스트(치비 super-deformed 비율 문구 + 캐릭터 설명)로 1장씩 생성.
등급은 아직 아트에 반영 안 함(주인님 확인 — 등급은 이미지 나온 뒤 재조정 예정이라 무관).

**전종 완료** (66명 + 히든 5 = 71명, 전부 `assets/characters/`에 커밋됨).
히든 5종 이름은 Notion 아티팩트에서 수바크/동그리/쫑알이/벙커/지영문희로 확정됐으나
파일은 기존 `unknown_hidden_001~005` 그대로 사용 (진영/클래스/스킬 배정 시 매핑 예정).

| 등급 | 완료 | 비고 |
|---|---|---|
| UR (4) | **4/4** | `guan_yu_001`, `snowwhite_light_001`, `zhuge_liang_wind_001`, `zeus_light_001` |
| Unknown 히든 (5) | **5/5** | `unknown_hidden_001~005` (빛나는 물음표 실루엣, 동일 디자인 재사용) |
| SSR (13) | **13/13** | `death_knight_001` + 12종 신규 (헤라클레스=금발 머리띠 동화풍으로 재작업, 조조/여포=삼국지 게임 장르풍으로 재작업) |
| SR (29) | **29/29** | `succubus_dark_001`, `mage_flame_001`(불마법사 매칭) + 27종 신규 (벨=금색 드레스 유지, 장비/홍길동/바람마법사=재작업) |
| R (13) | **13/13** | 마초(사자머리 투구)/하르피아(흰날개+인간형)/미노타우로스(배경 제거)/빛기사(얼굴 수정) 재작업 반영 |
| N (7) | **7/7** | |

## 전투 이펙트 8종

**완료** — `assets/effects/`에 `hit-impact.png`, `hit-불.png`, `hit-물.png`, `hit-바람.png`,
`hit-빛.png`, `hit-어둠.png`, `hit-crit.png`, `cast-aura.png` 커밋됨. 검은/회색 배경이라
일반 흰배경 제거 스크립트 대신 어두운 배경 제거 방식(`--thresh` 반전)을 새로 만들어 처리함.
사용자 코멘트: "써봐야 알겠다" — 실제 게임에 붙여보고 재검토 가능성 있음.

## 리뷰 프로세스 규칙 (주인님 지정, 항상 준수)

- 생성(제작)은 미리 몰아서 한다. 리뷰(승인 요청)는 **5장씩 끊어서** 보여주고 승인받은 뒤
  다음 5장으로 넘어간다 — 한 번에 다 던지지 않는다.
- 특정 항목에 코멘트가 없으면(다음 배치로 넘어가라고 하거나 별말 없으면) **승인으로 간주**한다.
- 재작업(수정) 지시가 나와도 **그 자리에서 바로 만들지 않는다** — 피드백을 계속 큐에 모아두고,
  "재작업은 모아서 진행" 같은 명시적 신호가 오거나 리뷰가 다 끝나면 그때 몰아서 한 번에 생성한다.
  (단, 이 대화에서 실제로는 종종 즉석 재작업도 있었음 — 주인님이 "이 리뷰 규칙을 저장"이라고
  명시한 이 시점부터는 원칙대로 큐잉 후 일괄 처리를 기본으로 한다.)
- 카드 일러스트(--ref + 프리미엄 애니메 가챠 톤)에서 반복적으로 발생한 문제: 여성으로 성별이
  바뀌는 현상(유비/조조/조자룡/여포/방통/포세이돈/장비 등에서 발생) — "a mature adult MAN,
  male character, masculine facial features" 같은 명시적 성별 강조 문구를 추가하면 대부분 해결됨.
  --ref만으로는 배틀 스프라이트의 성별이 카드에 안정적으로 전달되지 않으므로, 남성 캐릭터
  카드를 만들 때는 처음부터 이 문구를 기본으로 넣는 것을 고려할 것.
- **재작업 품질을 확실히 올리는 방법 (마초/허저/하후돈에서 검증됨, 주인님 확인)**: 성별
  강조 문구만으로는 부족할 때가 있다. 거기에 더해 **그 캐릭터의 특징적 디자인 요소를
  프롬프트에 다시 완전히 서술**하면(예: 마초="황금 사자머리 투구, 사자 주둥이 가드",
  허저="맨몸 근육질 상반신+가죽 스트랩+대검+우락부락한 미소", 하후돈="안대, 어두운
  적흑색 갑옷, 장검, 험악한 표정") `--ref` 이미지에만 기대지 않고 훨씬 충실하고 정성스러운
  결과가 나온다. **카드 재작업 시 기본 공식으로 채택**: (성별 강조) + (원래 배틀 캐릭터
  설명의 특징적 요소 재서술) + (다이나믹 포즈 + 진영 배경).
