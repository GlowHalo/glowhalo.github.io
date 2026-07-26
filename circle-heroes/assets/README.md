# circle-heroes/assets — 최종 에셋 (커밋 대상)

이 폴더는 **검수를 통과한 최종 이미지**만 들어간다. `assets-gen/`(생성 후보, gitignore 대상)과 다르다.

## 세션 간 소통 규칙

Claude 세션끼리는 대화를 서로 볼 수 없다. **유일한 소통 창구는 이 git 저장소**다.
이미지 생성을 맡은 세션은 아래 순서로 작업한다:

1. `scripts/gen-assets-leonardo.mjs` 등으로 후보 생성 (→ `assets-gen/`, 커밋 안 됨)
2. 마음에 드는 후보를 골라 이 폴더(`assets/<카테고리>/`)에 **정해진 파일명**으로 복사
3. `PROMPTS.md`의 "접수 현황" 표를 갱신 (상태를 "커밋됨"으로, 파일 경로 기입)
4. `git add circle-heroes/assets circle-heroes/PROMPTS.md && git commit && git push`
   — **브랜치는 `master`에 직접 푸시**한다 (다른 세션이 코드 작업 중인 feature 브랜치와
   충돌 없이, 게임 코드를 만드는 세션이 아무 때나 `git pull origin master`로 받아갈 수 있게)

## 폴더 구조 & 규격 (ASSETS.md Rev.B 참고)

| 폴더 | 용도 | 규격 |
|---|---|---|
| `characters/` | 전투 캐릭터 SD | 512×512 (보스는 768×768), PNG 투명 배경 |
| `cards/` | 소환/도감용 일러스트 | 1024×1536 |
| `backgrounds/` | 전투 배경 | 1080×1920 |
| `icons/` | 골드/보석 등 아이콘 | 128×128, PNG 투명 배경 |

## 파일명 규칙

영웅 id 그대로 사용 (Notion 마스터데이터의 id 컬럼과 동일):
```
characters/succubus_dark_001.png
cards/succubus_dark_001.png
icons/gold.png
icons/gem.png
backgrounds/battle-grassland.png
```

## 게임 코드 쪽에서 하는 일 (참고용 — 이미지 담당 세션은 안 해도 됨)

파일이 여기 들어오면, 게임 코드를 만드는 세션이 `git pull`로 받아서
`src/data/heroes.ts`/Phaser 로더에 연결한다. 지금은 SD 원형(색상 placeholder)만
쓰고 있어서, 이 폴더가 채워지는 대로 순차 교체할 예정.

**주인님이 "반영해" 하시면**: 전체를 다시 훑지 않고 `git diff <마지막 반영 커밋>..master -- circle-heroes/assets/`
로 그 사이 추가·교체·삭제된 파일만 정확히 뽑아서 반영한다.

## 마지막 반영 커밋

`(아직 없음 — 최초 반영 시 이 줄을 커밋 SHA로 갱신)`
