// PocketCrew — 데이터 모델 + GitHub API 래퍼
//
// 설계 원칙(README 참고): 직원·데스크·방 배치는 렌더러 코드에 하드코딩하지 않고
// 여기 정의된 데이터 구조로만 표현한다. 나중에 3D 렌더러를 얹을 때도
// 이 파일의 스키마(ROLE_PRESETS, 상태.json 구조)를 그대로 재사용하면 된다.

const STORAGE_KEY = 'pocketcrew_state_v1';

// 역할 프리셋 — S3(직원 고용) 화면에서 고르는 카드. 색상은 디자인 목업 톤 유지.
const ROLE_PRESETS = [
  { id: 'strategist', title: '전략가', desc: '방향을 정하고 우선순위를 판단해요', skin: '#ffd7b0', hair: '#5c3a26', body: '#e8965a', defaultSelected: true },
  { id: 'content', title: '콘텐츠 담당', desc: '글과 자료를 만들고 다듬어요', skin: '#f4c6a0', hair: '#2a2a2a', body: '#7fae6f', defaultSelected: true },
  { id: 'researcher', title: '리서처', desc: '자료를 찾고 근거를 확인해요', skin: '#e3b48a', hair: '#8a5a3a', body: '#6f8fc9', defaultSelected: false },
  { id: 'designer', title: '디자이너', desc: '보기 좋게 다듬고 그려요', skin: '#ffd7b0', hair: '#c9a25a', body: '#e07a6e', defaultSelected: false },
];

const ACCENT_OPTIONS = ['#e8965a', '#7fae6f', '#e07a6e', '#6f8fc9'];

function defaultState() {
  return {
    step: 'S0',           // S0 GitHub 미연결 ~ S7 오피스 뷰어
    demo: false,          // true면 GitHub 없이 목업 데이터로 보기
    githubToken: '',
    githubLogin: '',
    accent: ACCENT_OPTIONS[0],
    teamLabel: '',
    repoOwner: '',
    repoName: '',
    selectedRoleIds: ROLE_PRESETS.filter(r => r.defaultSelected).map(r => r.id),
    lastKnownState: null,  // 저장소에서 마지막으로 읽어온 상태.json 내용
    lastSyncedAt: null,
    instructionDraft: '',
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return Object.assign(defaultState(), JSON.parse(raw));
  } catch (e) {
    return defaultState();
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // localStorage 접근 불가(프라이빗 모드 등) — 세션 안에서만 상태 유지, 조용히 무시
  }
}

function clearState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* noop */ }
}

// ---- GitHub REST API 래퍼 ----
// v1은 정식 OAuth 앱 대신 사용자가 직접 발급한 Personal Access Token(classic, repo 권한)을 쓴다.
// 이유: OAuth 토큰 교환에는 client_secret을 숨길 백엔드(Cloudflare Worker)가 필요한데,
// PAT 방식은 브라우저만으로 완전히 동작해 픽셀 MVP를 지금 바로 검증할 수 있다.
// (README.md "확정된 기술 구조" 참고 — 추후 OAuth로 교체해도 S1 화면 UI만 바뀌고
// 나머지 구조는 그대로 재사용된다.)

const GH_API = 'https://api.github.com';

async function ghRequest(token, path, opts = {}) {
  const res = await fetch(GH_API + path, {
    ...opts,
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `token ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.headers || {}),
    },
  });
  return res;
}

async function ghGetUser(token) {
  const res = await ghRequest(token, '/user');
  if (!res.ok) throw new Error(`GitHub 인증 실패 (${res.status}) — 토큰을 다시 확인해주세요.`);
  return res.json();
}

async function ghCreateRepo(token, name, isPrivate) {
  const res = await ghRequest(token, '/user/repos', {
    method: 'POST',
    body: JSON.stringify({ name, private: isPrivate, auto_init: true, description: 'PocketCrew AI 사무실' }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`저장소 생성 실패 (${res.status}): ${body.message || '알 수 없는 오류'}`);
  }
  return res.json();
}

function b64EncodeUtf8(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function b64DecodeUtf8(str) {
  return decodeURIComponent(escape(atob(str)));
}

async function ghGetFile(token, owner, repo, path) {
  const res = await ghRequest(token, `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`파일 조회 실패 (${res.status}): ${path}`);
  const data = await res.json();
  return { sha: data.sha, content: b64DecodeUtf8(data.content.replace(/\n/g, '')) };
}

async function ghPutFile(token, owner, repo, path, contentStr, message, sha) {
  const res = await ghRequest(token, `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: b64EncodeUtf8(contentStr),
      ...(sha ? { sha } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`저장소에 쓰기 실패 (${res.status}): ${body.message || path}`);
  }
  return res.json();
}

// 지시사항.md에 새 지시를 이어붙인다 (있으면 sha 받아 갱신, 없으면 새로 생성).
async function ghAppendInstruction(token, owner, repo, instructionText) {
  const existing = await ghGetFile(token, owner, repo, '지시사항.md');
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const entry = `\n## ${stamp}\n${instructionText}\n\n- 상태: 대기 중\n`;
  const base = existing ? existing.content.replace(/\(아직 남긴 지시가 없어요\.\)\s*$/, '').trimEnd() : '# 지시사항 로그';
  const nextContent = base + '\n' + entry;
  await ghPutFile(token, owner, repo, '지시사항.md', nextContent, '지시 추가: ' + instructionText.slice(0, 40), existing ? existing.sha : undefined);
}
