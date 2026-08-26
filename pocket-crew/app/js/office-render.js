// PocketCrew — 오피스 씬 렌더러 (데이터 → 화면)
//
// 이 파일은 오직 데이터만 받아 화면을 그린다. 방/데스크 좌표를 하드코딩하지 않고
// employees 배열 순서대로 그리드에 자동 배치한다 — 3D 렌더러를 나중에 붙일 때도
// 이 입력 구조(officeData)만 그대로 넘기면 된다.
//
// officeData 스키마:
// {
//   teamLabel: string,
//   accent: string,           // '#e8965a' 등
//   employees: [{ id, role, status: 'working'|'idle', task, skin, hair, body }],
//   lastSyncedAt: string|null,
//   pendingInstruction: boolean,
// }

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function timeAgoLabel(iso) {
  if (!iso) return '아직 갱신 안 됨';
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.max(0, Math.round(diffMs / 60000));
  if (min < 1) return '방금 갱신됨';
  if (min < 60) return `마지막 갱신 ${min}분 전`;
  const hr = Math.round(min / 60);
  return `마지막 갱신 ${hr}시간 전`;
}

function renderDeskCard(emp) {
  const statusLabel = emp.status === 'working' ? (emp.task || '작업 중') : (emp.task || '대기 중');
  return `
    <div class="desk-card">
      <div class="desk-surface" style="background:${emp.body || '#c98f5c'};"></div>
      <div class="desk-monitor"><div class="screen" style="background:${emp.status === 'working' ? '#7fae6f' : '#c9b48c'};"></div></div>
      <div class="figure" style="background:${emp.skin || '#ffd7b0'};">
        <div class="hair" style="background:${emp.hair || '#5c3a26'};"></div>
      </div>
      <div class="body-block" style="background:${emp.body || '#e8965a'};"></div>
      <div class="desk-name">${escapeHtml(emp.role)}</div>
      <div class="desk-status ${emp.status === 'working' ? 'working' : 'idle'}">${escapeHtml(statusLabel)}</div>
    </div>`;
}

function renderOfficeScene(officeData) {
  const { teamLabel, accent, employees = [], lastSyncedAt, pendingInstruction } = officeData;

  const resumeBanner = pendingInstruction ? `
    <div class="resume-banner">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/></svg>
      <span class="label" style="font-size:13px;">전달한 지시가 아직 처리 대기 중이에요</span>
      <button class="btn btn-accent" id="btn-resume" style="background:${accent};">
        Claude Code에서 이어하기
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M17 7H9M17 7v8"/></svg>
      </button>
    </div>` : '';

  const deskCards = employees.length
    ? employees.map(renderDeskCard).join('')
    : `<div class="muted" style="padding:20px;">아직 고용된 직원이 없어요.</div>`;

  return `
    <div class="glow" style="left:12%; top:8%; width:380px; height:380px; background:radial-gradient(circle, ${accent}22 0%, transparent 70%);"></div>
    <div class="glow" style="right:8%; bottom:20%; width:320px; height:320px; background:radial-gradient(circle, #ffd9a044 0%, transparent 70%);"></div>
    ${resumeBanner}

    <div style="position:absolute; inset:70px 0 130px; overflow-y:auto; padding:0 60px;">
      <div class="room-title">🏠 메인 플로어</div>
      <div class="desk-grid" style="margin-bottom:36px;">${deskCards}</div>

      <div class="room-title">☕ 라운지</div>
      <div class="muted" style="font-size:13px;">${timeAgoLabel(lastSyncedAt)} — 다음 갱신까지 대기 중</div>
    </div>

    <div class="instruction-dock">
      <div class="label muted" style="flex-shrink:0; width:100px; font-size:12px; line-height:1.4;">새 지시<br/>남기기</div>
      <div class="dock-field">
        <input type="text" id="instruction-input" placeholder="예) 내일까지 경쟁사 3곳 비교표 만들어줘" value="">
        <button class="btn btn-accent" id="btn-send-instruction" style="background:${accent};">
          전달
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        </button>
      </div>
      <div class="muted2" style="font-size:11px; width:190px; flex-shrink:0; line-height:1.5;">다음에 세션을 열 때 클로드가 읽고 처리해요</div>
    </div>`;
}
