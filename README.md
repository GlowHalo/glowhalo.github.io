# 사이드 프로젝트 작업 구조

여러 아이디어를 목업으로 찍어보고, 마음에 드는 것만 발전시키고, 나머지는 기록으로 남기기 위한 최소한의 관리 구조.

## 진짜 소스는 Notion, GitHub는 배포만

**"작업실 허브" > "프로젝트 목록" Notion 데이터베이스**가 프로젝트 목록/상태/아이디어 백로그의 단일 소스다. 상태를 바꾸거나 새 아이디어를 적는 건 전부 Notion에서 한다(폰에서도 바로 가능).

`registry.js`는 그 Notion DB의 **스냅샷**이다 — 직접 손으로 고치지 않는다. Notion에서 내용을 바꾼 뒤 "노션 동기화해줘"라고 요청하면, Claude가 Notion을 읽어서 `registry.js`를 다시 생성하고 커밋한다. 브라우저(정적 페이지)가 Notion API를 직접 호출하지 않는 이유는 API 키가 클라이언트 코드에 노출되기 때문 — 그래서 "동기화 → 정적 파일 커밋 → push" 흐름을 쓴다.

## 상태(status) 4단계 (Notion "상태" select와 동일)

| 상태 | 의미 |
|---|---|
| 아이디어 | 아직 목업도 없음, repo 없음. 허브에는 카드가 아니라 짧은 메모로만 표시 |
| 프로토타입 | 목업을 만들어서 써보는 중. 계속할지 아직 결정 전 |
| 발전중 | 마음에 들어서 계속 키우는 중 (기능 추가, 실사용, 배포 준비 등) |
| 히스토리 | 써봤지만 계속 안 하기로 함. 저장소는 지우지 않고 그대로 두고(라이브 URL도 안 죽음), 허브에는 접힌 기록으로만 표시 |

## 저장소 구조: 저장소 하나(모노레포)

허브와 모든 프로젝트는 **하나의 GitHub 저장소 `tossneon.github.io`** 안에서 함께 관리·배포된다. 프로젝트는 그 저장소 안의 **하위 폴더 하나**씩이다. GitHub Pages 기준으로:

| 위치(하위 폴더) | 라이브 주소 |
|---|---|
| 저장소 루트 (`index.html`, `registry.js`) | `https://tossneon.github.io/` (허브) |
| `checknote/` | `https://tossneon.github.io/checknote/` |
| `dividend-passbook/` | `https://tossneon.github.io/dividend-passbook/` |
| `baby-place-registry/` | `https://tossneon.github.io/baby-place-registry/` |
| `kpc-coach-chat/` | `https://tossneon.github.io/kpc-coach-chat/` |
| `claude-auto-allow/` | `https://tossneon.github.io/claude-auto-allow/` |

저장소 이름이 정확히 `tossneon.github.io`라서 루트 주소로 서빙되고, 그 안의 폴더는 폴더명이 그대로 하위 경로가 된다(GitHub Pages 기본 규칙). 루트의 `.nojekyll` 파일은 모든 폴더의 정적 파일을 가공 없이 그대로 서빙하게 한다.

**관리 지점이 이 저장소 하나뿐이다** — `git push` 한 번이면 전부 백업되고 배포된다. 예전처럼 프로젝트마다 따로 `.git`을 두거나 따로 push할 필요가 없다. 각 폴더의 예전 커밋 이력은 `git subtree`로 합칠 때 그대로 보존됐다.

> **나중에 분리가 필요하면**: 어떤 프로젝트가 자기만의 독립 주소(예: 커스텀 도메인)나 별도 관리가 꼭 필요해지면, 그때 그 폴더 하나만 `git subtree split`으로 떼어내 별도 저장소로 만들면 된다. 기본은 "다 같이, 단순하게"이고 분리는 필요할 때만.

## `registry.js` (Notion에서 생성되는 스냅샷)

```js
window.REGISTRY = {
  pagesUrl: repo => `https://tossneon.github.io/${repo}/`,
  statuses: [...],
  projects: [ { id, title, repo, date, status, tags, description, note }, ... ]  // status:"아이디어"는 repo 없이도 됨
};
```

## 새 아이디어가 생기면

1. **아직 목업 안 만들 거면** → Notion "프로젝트 목록"에 상태="아이디어"로 행 하나 추가. 그게 끝. (다음 동기화 때 허브의 "아이디어 메모"에 자동으로 뜸)
2. **목업을 만들기로 하면**:
   - 이 저장소 안에 폴더 하나 새로 생성 (`{slug}/`, 영문 slug). 그 안에 `index.html`(게시본) + `{slug}.jsx`(소스)를 넣는다.
   - 저장소 루트에서 `git add` + `git commit` + `git push` — 그게 끝. 새 저장소를 만들 필요 없음. push되면 `https://tossneon.github.io/{slug}/` 로 1분 내 자동 배포됨.
   - Notion에서 그 항목의 상태를 "프로토타입"으로, repo 속성에 `{slug}`(= 폴더명) 입력

## 써보고 난 뒤

- **마음에 들면** → Notion에서 그 프로젝트의 상태를 "발전중"으로만 바꾼다. 저장소는 그대로 쓰고, 기능이 늘면 그 저장소에 계속 커밋 쌓으면 된다.
- **접기로 하면** → 상태를 "히스토리"로 바꾸기만 하면 된다. 폴더는 지우지 않는다 — 허브의 "히스토리" 섹션에 자동으로 접혀서 들어가고, 라이브 URL도 그대로 살아있다.
- 두 경우 다 "노션 동기화해줘"라고 해야 허브 화면에 실제 반영됨(동기화 → 커밋 → 승인 후 push).

## 파일 규칙

- 폴더명 = URL slug = 영문 (`baby-place-registry`, `dividend-passbook` 등). 폴더명이 그대로 라이브 주소의 하위 경로가 되므로 영문/하이픈으로 짓는다.
- 각 프로젝트 폴더 안: `index.html`(게시본, Pages가 이 파일을 서빙) + `{slug}.jsx`(React 소스, 참고용)

## 배포 워크플로우 (Notion → git → live)

1. Notion "프로젝트 목록"에서 상태/설명/아이디어 등 수정
2. "노션 동기화해줘" → Claude가 Notion을 읽어 `registry.js` 재생성
3. 프로젝트 코드 자체를 수정했다면 이 저장소 안 해당 폴더에서 수정
4. **승인 후에만** 저장소 루트에서 `git add` + `git commit` + `git push` — 저장소가 하나뿐이라 push 한 번이면 허브·프로젝트가 전부 백업되고 1분 내 배포됨
5. 끝. (예전처럼 프로젝트 저장소와 허브 저장소를 따로 push할 필요 없음)

승인 없이 임의로 push하지 않는다. 로컬 커밋까지는 자유롭게 쌓아도 되지만, 원격(`git push`)은 매번 명시적으로 확인받고 진행한다.

## 왜 이렇게 했는가

기존에는 허브 파일이 두 벌(`maker-journal.jsx`, `maker-journal-hero.jsx`) 있었고 프로젝트 데이터를 양쪽에 손으로 따로 적다 보니 벌써 어긋나 있었다. `registry.js` 하나로 합쳐서 문제를 해결했지만, 그마저도 손으로 JS 파일을 고치는 건 번거롭고 폰에서는 사실상 불가능했다. Notion을 진짜 소스로 두면 폰에서도 상태 하나 드래그로 바꿀 수 있고, 정적 파일(`registry.js`)은 그 스냅샷 역할만 하니 "고칠 곳은 항상 한 곳"이라는 원칙은 그대로 유지된다.

저장소 구조도 같은 "고칠 곳은 한 곳" 원칙을 따른다. 한때 프로젝트마다 저장소를 나눴지만(`checknote`가 그렇게 시작해서), 비전문가가 관리하기엔 "저장소 6개 = push를 6번 기억해야 함"이 되어 하나라도 잊으면 그 프로젝트만 백업이 빠지는 위험이 있었다. 그래서 저장소 하나(모노레포)로 합쳤다 — push 한 번이면 전부 안전. 독립 주소가 꼭 필요한 프로젝트가 생기면 그때 그것만 떼어낸다.
