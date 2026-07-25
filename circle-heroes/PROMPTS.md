# Circle Heroes — 나노바나나(Gemini) 이미지 생성 프롬프트 (Rev.2)

> **자동화 (Rev.2.1)**: `scripts/gen-assets.mjs` 로 Claude가 Gemini API를 직접 호출해 생성할 수 있다.
> `node scripts/gen-assets.mjs --list` 로 에셋키 확인. 키는 환경변수 `GEMINI_API_KEY` 또는
> `circle-heroes/.env` (gitignore 대상) — **키는 절대 커밋되지 않는다.**
> 생성 결과는 `assets-gen/<키>/` (gitignore 대상)에 쌓이고, 검수 통과본만 게임에 배치한다.
> 아래 수동 프롬프트는 여전히 정본이며, 스크립트 카탈로그는 이 문서를 코드화한 것.

> **Rev.2 변경**: 1차 생성에서 그림체가 섞이는 문제 발생 → 원인은 "same art style as previous image" 의존.
> 해결: ① 아래 STYLE BLOCK을 **모든 프롬프트에 통째로 반복** ② 잘 나온 기준 이미지 1장을 **매번 참조로 첨부**하고
> "Match the exact art style of the attached reference image"를 덧붙인다.

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

### 3. 데스나이트 (512×512)
```
A menacing death knight in heavy black-and-silver plate armor with glowing
ice-blue accents, tattered dark cape, massive glowing blue greatsword over his
shoulder, glowing eyes inside the helmet.
Full body, single character only, facing right (3/4 view), feet at bottom center, small margin.
Transparent background (alpha PNG). No text, no watermark, no frame. Square 1:1.
```

### 4. 슬라임 (512×512)
```
A cute green slime monster with big glossy eyes and a happy open mouth,
jelly-like translucent body with shine highlights.
Single creature only, facing right, centered, small margin.
Transparent background (alpha PNG). No text, no watermark. Square 1:1.
```

### 5. 보스슬라임 (768×768)
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

## 카드 일러스트 (1024×1536 세로) — ⚠ 그림체 섞임 최다 발생 구간

카드도 반드시 **전투 캐릭터와 같은 기준 이미지를 첨부**하고 STYLE BLOCK을 반복한다.
1차 시도에서 카드만 세미리얼로 튀었던 원因이 스타일 블록 생략이었음.

```
[STYLE BLOCK 붙여넣기 + 해당 캐릭터의 전투 이미지 첨부]
Vertical 2:3 portrait card illustration of the SAME character as the attached
image — identical face, outfit, colors, and art style, only the pose and
background change. Dramatic dynamic pose, epic themed background
([flames rising / dark purple mist / frozen graveyard]), cinematic lighting.
IMPORTANT: pure artwork only — no text, no letters, no numbers, no stars,
no stat bars, no frame, no border, no UI elements, no watermark.
```

## 접수 현황

| 에셋 | 상태 |
|---|---|
| 화염마법사 전투 | 1차 수신 (치비 스타일) — 스타일 재통일 예정 |
| 서큐버스 전투 | 1차 수신 (치비 스타일) — 재통일 예정 |
| 데스나이트 전투 | 미수신 |
| 슬라임 | 1차 수신 — 품질 양호 |
| 보스슬라임 | 미수신 |
| 전투 배경 | 미수신 |
| 골드 아이콘 | 미수신 |
| 다이아몬드 아이콘 | 1차 수신 — 품질 양호 |
| 카드 3종 | 서큐버스 1장 수신 — 스타일 불일치(세미리얼), 재생성 대상 |
