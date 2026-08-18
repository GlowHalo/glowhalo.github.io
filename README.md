# 사이드 프로젝트 작업 구조

여러 아이디어를 대화로 나눠보고, 마음에 드는 것만 폴더로 만들어 발전시키고, 나머지는 기록으로 남기기 위한 최소한의 관리 구조.

## 진짜 소스는 이 저장소 자체

**각 프로젝트 폴더 안의 `meta.json`**이 그 프로젝트의 제목·상태·설명 등의 단일 소스다. 상태를 바꾸거나 설명을 고치는 건 그 파일을 고치는 것 — Claude에게 말로 시켜도 되고 직접 편집해도 된다.

`registry.js`는 모든 프로젝트 폴더의 `meta.json`을 스캔해서 만든 **스냅샷**이다 — 직접 손으로 고치지 않는다. `meta.json`을 바꾼 뒤 `node scripts/build-registry.js`를 실행하면(또는 Claude에게 "레지스트리 다시 빌드해줘") 재생성된다. 외부 서비스(Notion 등)를 거치지 않으므로 "정본 따로, 배포본 따로"로 어긋날 일이 없다.

**아직 폴더도 없는 아이디어는 어디에도 기록하지 않는다.** 생각날 때 그냥 대화로 나누고, 실제로 만들기로 하면 그때 폴더 + `meta.json`을 만든다.

## 상태(status) 3단계

| 상태 | 의미 |
|---|---|
| 프로토타입 | 목업을 만들어서 써보는 중. 계속할지 아직 결정 전 |
| 발전중 | 마음에 들어서 계속 키우는 중 (기능 추가, 실사용, 배포 준비 등) |
| 히스토리 | 써봤지만 계속 안 하기로 함. 저장소는 지우지 않고 그대로 두고(라이브 URL도 안 죽음), 허브에는 접힌 기록으로만 표시 |

## 저장소 구조: 저장소 하나(모노레포)

허브와 모든 프로젝트는 **하나의 GitHub 저장소 `glowhalo.github.io`** 안에서 함께 관리·배포된다. 프로젝트는 그 저장소 안의 **하위 폴더 하나**씩이다. GitHub Pages 기준으로:

| 위치(하위 폴더) | 라이브 주소 |
|---|---|
| 저장소 루트 (`index.html`, `registry.js`) | `https://glowhalo.github.io/` (허브) |
| `checknote/` | `https://glowhalo.github.io/checknote/` |
| `dividend-passbook/` | `https://glowhalo.github.io/dividend-passbook/` |
| `baby-place-registry/` | `https://glowhalo.github.io/baby-place-registry/` |
| `kpc-coach-chat/` | `https://glowhalo.github.io/kpc-coach-chat/` |

저장소 이름이 정확히 `glowhalo.github.io`라서 루트 주소로 서빙되고, 그 안의 폴더는 폴더명이 그대로 하위 경로가 된다(GitHub Pages 기본 규칙). 루트의 `.nojekyll` 파일은 모든 폴더의 정적 파일을 가공 없이 그대로 서빙하게 한다.

**관리 지점이 이 저장소 하나뿐이다** — `git push` 한 번이면 전부 백업되고 배포된다. 예전처럼 프로젝트마다 따로 `.git`을 두거나 따로 push할 필요가 없다. 각 폴더의 예전 커밋 이력은 `git subtree`로 합칠 때 그대로 보존됐다.

> **나중에 분리가 필요하면**: 어떤 프로젝트가 자기만의 독립 주소(예: 커스텀 도메인)나 별도 관리가 꼭 필요해지면, 그때 그 폴더 하나만 `git subtree split`으로 떼어내 별도 저장소로 만들면 된다. 기본은 "다 같이, 단순하게"이고 분리는 필요할 때만.

## `meta.json` (프로젝트별 정본) / `registry.js` (스캔 스냅샷)

프로젝트 폴더 안 `meta.json`:

```json
{
  "title": "체크노트",
  "date": "2026.07",
  "status": "발전중",
  "tags": ["React", "PWA", "1:1 공유"],
  "description": "...",
  "note": ""
}
```

허브가 읽는 `registry.js`는 `scripts/build-registry.js`가 저장소의 모든 폴더를 훑어서 `meta.json`이 있는 폴더만 모아 생성한다:

```js
window.REGISTRY = {
  pagesUrl: repo => `https://glowhalo.github.io/${repo}/`,
  statuses: [...],
  projects: [ { id, repo, title, date, status, tags, description, note }, ... ]
};
```

`id`/`repo`는 폴더명에서 자동으로 채워지므로 `meta.json`에는 안 적어도 된다.

## 새 아이디어가 생기면

1. **아직 목업 안 만들 거면** → 그냥 대화로 나눈다. 어디에도 따로 적어두지 않는다.
2. **목업을 만들기로 하면**:
   - 이 저장소 안에 폴더 하나 새로 생성 (`{slug}/`, 영문 slug). 그 안에 `index.html`(게시본) + `{slug}.jsx`(소스) + `meta.json`(상태="프로토타입")을 넣는다.
   - `node scripts/build-registry.js` 실행해서 `registry.js` 재생성
   - 저장소 루트에서 `git add` + `git commit` + `git push` — 그게 끝. 새 저장소를 만들 필요 없음. push되면 `https://glowhalo.github.io/{slug}/` 로 1분 내 자동 배포됨.

## 써보고 난 뒤

- **마음에 들면** → 그 폴더의 `meta.json`에서 `status`를 `"발전중"`으로만 바꾼다. 저장소는 그대로 쓰고, 기능이 늘면 그 저장소에 계속 커밋 쌓으면 된다.
- **접기로 하면** → `status`를 `"히스토리"`로 바꾸기만 하면 된다. 폴더는 지우지 않는다 — 허브의 "히스토리" 섹션에 자동으로 접혀서 들어가고, 라이브 URL도 그대로 살아있다.
- 두 경우 다 `node scripts/build-registry.js`로 재생성 → 커밋 → push 해야 허브 화면에 실제 반영됨(확인 기준은 루트 `CLAUDE.md`의 "자율성과 확인 원칙" 참고).

## 파일 규칙

- 폴더명 = URL slug = 영문 (`baby-place-registry`, `dividend-passbook` 등). 폴더명이 그대로 라이브 주소의 하위 경로가 되므로 영문/하이픈으로 짓는다.
- 각 프로젝트 폴더 안: `index.html`(게시본, Pages가 이 파일을 서빙) + `{slug}.jsx`(React 소스, 참고용) + `meta.json`(허브 카드 메타데이터)

## 배포 워크플로우 (폴더 → git → live)

1. 프로젝트 코드를 수정했다면 이 저장소 안 해당 폴더에서 수정
2. 상태/설명 등을 바꿨다면 그 폴더의 `meta.json` 수정 → `node scripts/build-registry.js`로 `registry.js` 재생성
3. 저장소 루트에서 `git add` + `git commit` + `git push` — 저장소가 하나뿐이라 push 한 번이면 허브·프로젝트가 전부 백업되고 1분 내 배포됨 (확인 기준은 루트 `CLAUDE.md`의 "자율성과 확인 원칙" 참고)
4. 끝. (예전처럼 프로젝트 저장소와 허브 저장소를 따로 push할 필요 없음)

## 왜 이렇게 했는가

기존에는 허브 파일이 두 벌(`maker-journal.jsx`, `maker-journal-hero.jsx`) 있었고 프로젝트 데이터를 양쪽에 손으로 따로 적다 보니 벌써 어긋나 있었다. `registry.js` 하나로 합쳐서 문제를 해결했지만, 그마저도 손으로 JS 파일을 고치는 건 번거로웠다. 한동안은 Notion을 정본으로 두고 "Notion 수정 → 동기화 요청 → registry.js 재생성"하는 방식을 썼는데, 두 시스템이 따로 노는 탓에 실제 폴더는 있는데 Notion엔 없거나 그 반대인 항목이 여러 개 쌓이는 걸 확인했다. 어차피 반영은 매번 Claude를 거쳐야 했으므로, Notion이라는 중간 단계를 없애고 **저장소(각 프로젝트 폴더의 `meta.json`)를 직접 정본으로 삼는 쪽이 한 단계 더 단순**하다고 판단해 전환했다. 폰에서도 Claude에게 말로 시키면 되니 "폰에서 못 고친다"는 문제도 없다. 아직 폴더도 없는 아이디어는 애초에 관리할 실체가 없으므로, 목록으로 쌓아두지 않고 그때그때 대화로만 다룬다.

저장소 구조도 같은 "고칠 곳은 한 곳" 원칙을 따른다. 한때 프로젝트마다 저장소를 나눴지만(`checknote`가 그렇게 시작해서), 비전문가가 관리하기엔 "저장소 6개 = push를 6번 기억해야 함"이 되어 하나라도 잊으면 그 프로젝트만 백업이 빠지는 위험이 있었다. 그래서 저장소 하나(모노레포)로 합쳤다 — push 한 번이면 전부 안전. 독립 주소가 꼭 필요한 프로젝트가 생기면 그때 그것만 떼어낸다.
