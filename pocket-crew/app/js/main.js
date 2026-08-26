// PocketCrew — 화면 흐름 S0~S7 라우터 + GitHub 연동
// data.js, office-render.js 이후에 로드된다 (index.html 참고).

const root = document.getElementById('app');
let state = loadState();
let pollTimer = null;

function persist() { saveState(state); }

function slugify() {
  return 'office-' + Math.random().toString(36).slice(2, 8);
}

function topbar(rightHtml) {
  return `
    <div class="topbar">
      <div class="brand">
        <div class="brand-mark" style="background:${state.accent};">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" fill="#fff"/><rect x="14" y="3" width="7" height="7" rx="1.5" fill="#fff" opacity="0.7"/><rect x="3" y="14" width="7" height="7" rx="1.5" fill="#fff" opacity="0.7"/><rect x="14" y="14" width="7" height="7" rx="1.5" fill="#fff"/></svg>
        </div>
        <div class="brand-name">PocketCrew</div>
      </div>
      <div class="topbar-right">${rightHtml || ''}</div>
    </div>`;
}

function stepsHtml(activeIndex) {
  const labels = ['GitHub 연결', '팀 이름 · 직원', '시작'];
  return `<div class="steps">` + labels.map((label, i) => {
    const done = i < activeIndex, active = i === activeIndex;
    const bg = done ? 'var(--good)' : active ? 'var(--dark)' : 'var(--line)';
    const fg = (done || active) ? '#fffaf0' : 'var(--muted2)';
    const num = done ? '✓' : String(i + 1);
    const line = i < labels.length - 1 ? `<div class="step-line"></div>` : '';
    return `<div class="step"><div class="step-num" style="background:${bg}; color:${fg};">${num}</div><div class="label" style="font-size:11px; color:${(done||active) ? 'var(--ink)' : 'var(--muted2)'};">${label}</div>${line}</div>`;
  }).join('') + `</div>`;
}

function characterMark(color) {
  return `
    <div style="width:64px; height:64px; border-radius:50% 50% 48% 48%; background:#ffd7b0; position:relative; box-shadow:0 4px 0 rgba(0,0,0,0.08); margin:0 auto;">
      <div style="position:absolute; top:-20px; left:-6px; width:76px; height:38px; background:#5c3a26; border-radius:32px 32px 8px 8px;"></div>
    </div>
    <div style="width:52px; height:50px; margin:-4px auto 0; background:${color}; border-radius:16px 16px 6px 6px; box-shadow:0 4px 0 rgba(0,0,0,0.1);"></div>`;
}

// ---------------- S0 ----------------
function renderS0() {
  root.innerHTML = `
    ${topbar('')}
    <div class="scene">
      <div class="glow" style="left:10%; top:10%; width:340px; height:340px; background:radial-gradient(circle, ${state.accent}22 0%, transparent 70%);"></div>
      <div class="glow" style="right:8%; bottom:10%; width:300px; height:300px; background:radial-gradient(circle, #ffd9a044 0%, transparent 70%);"></div>
      <div class="centerpane">
        <div class="card" style="width:600px; box-shadow:0 10px 0 var(--shadow), 0 20px 40px rgba(74,56,38,0.15); padding:40px 48px;">
          <div style="margin-bottom:24px;">${stepsHtml(0)}</div>
          <div style="margin-bottom:8px;">${characterMark(state.accent)}</div>
          <h1 class="heading" style="font-size:24px; text-align:center; margin:8px 0 10px;">클로드와 함께 일할<br/>사무실을 만들어볼까요?</h1>
          <p class="muted" style="text-align:center; font-size:14px; line-height:1.6; margin:0 0 22px;">여기서 팀을 꾸리면, 실제 작업은 여러분의 클로드 계정으로 진행돼요. 시작하려면 아래 두 가지가 필요해요.</p>
          <div style="display:flex; gap:12px; justify-content:center; margin-bottom:26px; flex-wrap:wrap;">
            <div class="chip"><span>🐙</span><span>GitHub 계정</span></div>
            <div class="chip"><span>✅</span><span>클로드 구독 (Pro·Max)</span></div>
          </div>
          <button class="btn btn-primary" id="btn-start" style="width:100%;">GitHub로 시작하기</button>
          <div style="text-align:center; margin-top:14px;">
            <a href="#" id="link-demo" class="muted2" style="font-size:12.5px; text-decoration:underline;">GitHub 없이 데모로 미리보기 →</a>
          </div>
        </div>
      </div>
    </div>`;
  document.getElementById('btn-start').onclick = () => { state.step = 'S1'; persist(); render(); };
  document.getElementById('link-demo').onclick = (e) => { e.preventDefault(); enterDemo(); };
}

function enterDemo() {
  state.demo = true;
  state.teamLabel = '하윤의 사무실';
  state.step = 'OFFICE';
  state.lastKnownState = {
    hasPendingInstruction: true,
    employees: [
      { id: 'e1', role: '전략가', status: 'working', task: '리서치 중', skin: '#ffd7b0', hair: '#5c3a26', body: state.accent },
      { id: 'e2', role: '콘텐츠 담당', status: 'working', task: '초안 작성 중', skin: '#f4c6a0', hair: '#2a2a2a', body: '#7fae6f' },
      { id: 'e3', role: '리서처', status: 'idle', task: '다음 지시 대기 중', skin: '#e3b48a', hair: '#8a5a3a', body: '#6f8fc9' },
    ],
  };
  state.lastSyncedAt = new Date(Date.now() - 3 * 60000).toISOString();
  persist();
  render();
}

// ---------------- S1: GitHub PAT 연결 ----------------
function renderS1() {
  const tokenUrl = 'https://github.com/settings/tokens/new?scopes=repo&description=PocketCrew';
  root.innerHTML = `
    ${topbar('')}
    <div class="scene">
      <div class="centerpane">
        <div class="card" style="width:600px; box-shadow:0 10px 0 var(--shadow); padding:40px 48px;">
          <div style="margin-bottom:24px;">${stepsHtml(0)}</div>
          <h2 class="heading" style="font-size:20px; margin:0 0 8px;">GitHub 토큰으로 연결해주세요</h2>
          <p class="muted" style="font-size:13.5px; line-height:1.6; margin:0 0 18px;">
            아래 링크에서 GitHub 토큰(Personal Access Token)을 새로 만들고, 생성된 값을 복사해 붙여넣어주세요.
            <b>repo</b> 권한이 미리 체크된 상태로 링크가 열려요 — 그대로 맨 아래 <b>Generate token</b>만 눌러주시면 됩니다.
          </p>
          <a href="${tokenUrl}" target="_blank" rel="noopener" class="btn btn-primary" style="width:100%; margin-bottom:18px; text-decoration:none;">
            새 토큰 만들러 가기 ↗
          </a>
          <label class="label" style="font-size:12px; color:var(--muted2);">발급받은 토큰 붙여넣기</label>
          <input type="password" id="input-token" placeholder="ghp_로 시작하는 값" style="margin-top:6px;">
          <div id="token-error" class="muted" style="font-size:12px; color:#c0503f; margin-top:8px; min-height:16px;"></div>
          <button class="btn btn-primary" id="btn-connect" style="width:100%; margin-top:14px;">연결하기</button>
          <div style="text-align:center; margin-top:16px;">
            <a href="#" id="link-back" class="muted2" style="font-size:12.5px;">← 뒤로</a>
          </div>
        </div>
      </div>
    </div>`;
  document.getElementById('link-back').onclick = (e) => { e.preventDefault(); state.step = 'S0'; render(); };
  document.getElementById('btn-connect').onclick = async () => {
    const btn = document.getElementById('btn-connect');
    const errBox = document.getElementById('token-error');
    const token = document.getElementById('input-token').value.trim();
    errBox.textContent = '';
    if (!token) { errBox.textContent = '토큰을 붙여넣어주세요.'; return; }
    btn.textContent = '확인 중...'; btn.disabled = true;
    try {
      const user = await ghGetUser(token);
      state.githubToken = token;
      state.githubLogin = user.login;
      state.demo = false;
      state.step = 'S2';
      if (!state.repoName) state.repoName = slugify();
      if (!state.teamLabel) state.teamLabel = `${user.login}의 사무실`;
      persist();
      render();
    } catch (e) {
      errBox.textContent = e.message;
      btn.textContent = '연결하기'; btn.disabled = false;
    }
  };
}

// ---------------- S2: 팀 이름 · 직원 고용 (+ 저장소 생성) ----------------
function renderS2() {
  root.innerHTML = `
    ${topbar(`<span>🐙 ${escapeHtml(state.githubLogin)} 계정으로 연결됨</span>`)}
    <div class="scene">
      <div style="max-width:1000px; margin:0 auto; padding:36px 40px;">
        <div style="margin-bottom:28px;">${stepsHtml(1)}</div>
        <div style="display:flex; gap:36px; flex-wrap:wrap;">
          <div style="width:320px; flex-shrink:0;">
            <h2 class="heading" style="font-size:18px; margin:0 0 6px;">팀 이름을 지어주세요</h2>
            <p class="muted" style="font-size:12.5px; margin:0 0 14px; line-height:1.6;">화면에 표시될 이름이에요.</p>
            <div class="card" style="padding:20px; margin-bottom:16px;">
              <label class="label" style="font-size:11px; color:var(--muted2);">팀 이름</label>
              <input type="text" id="input-team-label" value="${escapeHtml(state.teamLabel)}" style="margin-top:8px;">
              <label class="label" style="font-size:11px; color:var(--muted2); display:block; margin-top:14px;">GitHub 저장소 이름 (영문)</label>
              <input type="text" id="input-repo-name" value="${escapeHtml(state.repoName)}" style="margin-top:8px;">
              <div class="muted2" style="font-size:11px; margin-top:8px;">→ github.com/${escapeHtml(state.githubLogin)}/<b id="repo-preview">${escapeHtml(state.repoName)}</b></div>
            </div>
          </div>
          <div style="flex:1; min-width:320px;">
            <h2 class="heading" style="font-size:18px; margin:0 0 6px;">어떤 직원을 고용할까요?</h2>
            <p class="muted" style="font-size:12.5px; margin:0 0 14px; line-height:1.6;">필요한 역할을 골라주세요 — 나중에 지시로 더 늘릴 수 있어요.</p>
            <div id="role-grid" style="display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:14px;"></div>
            <div id="setup-error" style="font-size:12px; color:#c0503f; margin-top:14px; min-height:16px;"></div>
            <div style="display:flex; justify-content:flex-end; margin-top:20px;">
              <button class="btn btn-primary" id="btn-create-office">사무실 만들기 →</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  const grid = document.getElementById('role-grid');
  function paintRoles() {
    grid.innerHTML = ROLE_PRESETS.map(r => {
      const sel = state.selectedRoleIds.includes(r.id);
      return `
        <div class="role-card ${sel ? 'selected' : ''}" data-role="${r.id}">
          <div class="avatar" style="background:${r.skin};"><div class="hair" style="background:${r.hair};"></div></div>
          <div style="flex:1;">
            <div class="label" style="font-size:14px;">${r.title}</div>
            <div class="muted" style="font-size:11.5px; margin-top:2px; line-height:1.5;">${r.desc}</div>
          </div>
          <div class="check-box ${sel ? 'on' : ''}">${sel ? '✓' : ''}</div>
        </div>`;
    }).join('');
    grid.querySelectorAll('.role-card').forEach(el => {
      el.onclick = () => {
        const id = el.dataset.role;
        const i = state.selectedRoleIds.indexOf(id);
        if (i >= 0) state.selectedRoleIds.splice(i, 1); else state.selectedRoleIds.push(id);
        paintRoles();
      };
    });
  }
  paintRoles();

  document.getElementById('input-team-label').oninput = (e) => { state.teamLabel = e.target.value; };
  document.getElementById('input-repo-name').oninput = (e) => {
    state.repoName = e.target.value.trim();
    document.getElementById('repo-preview').textContent = state.repoName;
  };
  document.getElementById('link-back-s2')?.addEventListener('click', () => {});

  document.getElementById('btn-create-office').onclick = async () => {
    const errBox = document.getElementById('setup-error');
    errBox.textContent = '';
    if (!state.teamLabel.trim()) { errBox.textContent = '팀 이름을 입력해주세요.'; return; }
    if (!/^[a-zA-Z0-9._-]+$/.test(state.repoName)) { errBox.textContent = '저장소 이름은 영문/숫자/- _ . 만 사용할 수 있어요.'; return; }
    if (state.selectedRoleIds.length === 0) { errBox.textContent = '직원을 한 명 이상 골라주세요.'; return; }

    const btn = document.getElementById('btn-create-office');
    btn.disabled = true; btn.textContent = '사무실 만드는 중...';
    try {
      await createOfficeRepo();
      state.step = 'S4';
      persist();
      render();
    } catch (e) {
      errBox.textContent = e.message;
      btn.disabled = false; btn.textContent = '사무실 만들기 →';
    }
  };
}

async function createOfficeRepo() {
  const token = state.githubToken;
  await ghCreateRepo(token, state.repoName, true);
  const owner = state.githubLogin, repo = state.repoName;
  state.repoOwner = owner;

  const employees = ROLE_PRESETS.filter(r => state.selectedRoleIds.includes(r.id)).map(r => ({
    id: r.id, role: r.title, status: 'idle', task: '대기 중',
    skin: r.skin, hair: r.hair, body: r.body, updatedAt: new Date().toISOString(),
  }));

  const [claudeMd, readmeTpl, instructionsMd] = await Promise.all([
    fetch('./templates/CLAUDE.md').then(r => r.text()),
    fetch('./templates/README.md').then(r => r.text()),
    fetch('./templates/지시사항.md').then(r => r.text()),
  ]);
  const readmeMd = readmeTpl.replace('{{TEAM_LABEL}}', state.teamLabel);
  const statusJson = JSON.stringify({
    updatedAt: new Date().toISOString(),
    team: { label: state.teamLabel },
    employees,
    hasPendingInstruction: false,
  }, null, 2);

  // auto_init:true로 만들어졌으니 README.md는 이미 있음 — sha 받아 덮어쓴다.
  const existingReadme = await ghGetFile(token, owner, repo, 'README.md');
  await ghPutFile(token, owner, repo, 'README.md', readmeMd, '초기 설정: README', existingReadme ? existingReadme.sha : undefined);
  await ghPutFile(token, owner, repo, 'CLAUDE.md', claudeMd, '초기 설정: CLAUDE.md');
  await ghPutFile(token, owner, repo, '지시사항.md', instructionsMd, '초기 설정: 지시사항 로그');
  await ghPutFile(token, owner, repo, '상태.json', statusJson, '초기 설정: 상태.json');

  state.lastKnownState = JSON.parse(statusJson);
  state.lastSyncedAt = new Date().toISOString();
}

// ---------------- S4: Claude Code에서 열기 ----------------
function claudeDeepLink(promptText) {
  const repoFull = `${state.repoOwner}/${state.repoName}`;
  return `https://claude.ai/code?repositories=${encodeURIComponent(repoFull)}&prompt=${encodeURIComponent(promptText)}`;
}
const START_PROMPT = '이 저장소의 CLAUDE.md 안내를 읽고 그대로 따라줘. 지시사항.md에 처리할 지시가 있으면 지금 처리해줘.';

function renderS4() {
  const link = claudeDeepLink(START_PROMPT);
  root.innerHTML = `
    ${topbar(`<span>🐙 ${escapeHtml(state.githubLogin)} 계정으로 연결됨</span>`)}
    <div class="scene">
      <div class="centerpane">
        <div style="width:680px; text-align:center;">
          <div style="display:flex; justify-content:center; margin-bottom:30px;">${stepsHtml(2)}</div>
          <h1 class="heading" style="font-size:24px; margin:0 0 12px;">준비됐어요 — 이제 클로드를 깨울 차례예요</h1>
          <p class="muted" style="font-size:14px; line-height:1.7; margin:0 0 30px;">아래 버튼을 누르면 새 탭에서 claude.ai가 열리고, 방금 만든 <b>${escapeHtml(state.repoName)}</b> 저장소를 불러와 작업이 시작돼요.</p>
          <a href="${link}" target="_blank" rel="noopener" class="btn btn-primary" style="text-decoration:none;">
            Claude Code에서 열기
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fffaf0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M17 7H9M17 7v8"/></svg>
          </a>
          <p class="muted2" style="font-size:12px; margin:16px 0 30px;">처음이라면 그 화면에서 클로드 로그인이 한 번 더 뜰 수 있어요 — 그다음부턴 바로 시작돼요</p>
          <a href="#" id="link-to-office" class="muted2" style="font-size:12.5px; text-decoration:underline;">사무실 화면으로 이동 →</a>
        </div>
      </div>
    </div>`;
  document.getElementById('link-to-office').onclick = (e) => { e.preventDefault(); state.step = 'OFFICE'; persist(); render(); };
}

// ---------------- OFFICE: S5/S6/S7 뷰어 ----------------
function officeDataFromState() {
  const s = state.lastKnownState || { employees: [], hasPendingInstruction: false };
  return {
    teamLabel: state.teamLabel,
    accent: state.accent,
    employees: s.employees || [],
    lastSyncedAt: state.lastSyncedAt,
    pendingInstruction: !!s.hasPendingInstruction,
  };
}

function renderOffice() {
  const right = state.demo
    ? `<span class="muted2" style="font-style:italic;">데모 모드</span>`
    : `<a href="https://github.com/${state.repoOwner}/${state.repoName}" target="_blank" rel="noopener" class="muted2">GitHub에서 보기 ↗</a>
       <a href="#" id="btn-refresh" class="muted2">↻ 새로고침</a>`;

  root.innerHTML = `
    ${topbar(`<span>${escapeHtml(state.teamLabel)}</span>${right}`)}
    <div class="scene" style="position:relative;">${renderOfficeScene(officeDataFromState())}</div>`;

  document.getElementById('btn-refresh')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await refreshOfficeStatus();
  });
  document.getElementById('btn-resume')?.addEventListener('click', () => {
    window.open(claudeDeepLink(START_PROMPT), '_blank', 'noopener');
  });
  document.getElementById('btn-send-instruction')?.addEventListener('click', () => sendInstruction());
  document.getElementById('instruction-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendInstruction();
  });
}

async function sendInstruction() {
  const input = document.getElementById('instruction-input');
  const text = input.value.trim();
  if (!text) return;
  input.disabled = true;
  try {
    if (state.demo) {
      state.lastKnownState.hasPendingInstruction = true;
    } else {
      await ghAppendInstruction(state.githubToken, state.repoOwner, state.repoName, text);
      const cur = await ghGetFile(state.githubToken, state.repoOwner, state.repoName, '상태.json');
      const parsed = JSON.parse(cur.content);
      parsed.hasPendingInstruction = true;
      await ghPutFile(state.githubToken, state.repoOwner, state.repoName, '상태.json', JSON.stringify(parsed, null, 2), '지시 대기 표시', cur.sha);
      state.lastKnownState = parsed;
    }
    persist();
    renderOffice();
  } catch (e) {
    alert('지시를 전달하지 못했어요: ' + e.message);
    input.disabled = false;
  }
}

async function refreshOfficeStatus() {
  if (state.demo) return;
  try {
    const file = await ghGetFile(state.githubToken, state.repoOwner, state.repoName, '상태.json');
    if (file) {
      state.lastKnownState = JSON.parse(file.content);
      state.lastSyncedAt = new Date().toISOString();
      persist();
      renderOffice();
    }
  } catch (e) {
    console.warn('상태 갱신 실패', e);
  }
}

function startPolling() {
  stopPolling();
  if (state.step === 'OFFICE' && !state.demo) {
    pollTimer = setInterval(refreshOfficeStatus, 25000);
  }
}
function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

// ---------------- 라우터 ----------------
function render() {
  stopPolling();
  switch (state.step) {
    case 'S1': renderS1(); break;
    case 'S2': renderS2(); break;
    case 'S4': renderS4(); break;
    case 'OFFICE': renderOffice(); startPolling(); break;
    default: renderS0();
  }
}

render();
