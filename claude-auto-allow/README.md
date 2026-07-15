# Claude Desktop 자동 허용 매크로

Claude Desktop에 권한 팝업이 뜨면 **"항상 허용"** 을, 그게 없으면 **"한 번만 허용"** 을 자동으로 클릭합니다.
좌표가 아니라 **버튼 텍스트**로 찾기 때문에 창 위치·해상도가 바뀌어도 동작합니다. (Windows 내장 PowerShell만 사용, AutoHotkey 불필요)

## ⚠️ 주의
이 매크로는 MCP 도구 실행 확인 절차를 사람 대신 눌러 자동 승인합니다.
신뢰할 수 없는 MCP 서버가 붙어 있으면 위험한 동작(파일 삭제, 외부 전송 등)도 그냥 통과되니,
**믿을 수 있는 환경에서만** 켜두세요.

## 📥 다운로드해서 처음 쓸 때 (중요)
인터넷에서 받은 zip은 Windows가 "차단" 표시를 붙여서 실행 시 SmartScreen 경고가 뜰 수 있습니다.
**압축을 풀기 전에** 처리하면 깔끔합니다:
1. 받은 `claude-auto-allow.zip` **우클릭 → 속성**
2. 아래쪽 **"차단 해제(Unblock)"** 체크 → 확인
3. 그 다음 압축 풀기

(이미 풀었다면, 푼 폴더 안의 `.vbs`/`.ps1` 파일마다 같은 방식으로 차단 해제하면 됩니다.)

## 파일
| 파일 | 용도 |
|------|------|
| **`control-panel.vbs`** | **조작 화면 실행 (현황 표시 + 시작/정지 버튼) — 권장** |
| `control-panel.ps1` | 조작 화면 본체 |
| `auto-allow.ps1` | 창 없이 도는 순수 매크로 (조작 화면 없이 쓰고 싶을 때) |
| `inspect-buttons.ps1` | 실제 버튼 레이블 확인용 (팝업 뜬 상태에서 실행) |
| `start-hidden.vbs` | auto-allow.ps1 을 백그라운드로 실행 |

## ⭐ 조작 화면 (권장)
`control-panel.vbs` 더블클릭 → 작은 창이 뜹니다.
- **● 감시 중 / ■ 정지됨** : 현재 상태 표시
- **▶ 시작 / ■ 정지** : 감시 켜기·끄기
- **자동 클릭 N회** + 클릭 기록(시각·버튼명) 실시간 표시
- 창을 **닫으면 완전히 종료**됩니다. 실행 시 백그라운드 auto-allow 인스턴스는 자동 정리(중복 클릭 방지).

## 사용법

### 1) (권장) 먼저 버튼 이름 확인
Claude에서 권한 팝업이 **떠 있는 상태**로 두고:
```
powershell -ExecutionPolicy Bypass -File inspect-buttons.ps1
```
출력된 목록에서 "항상 허용" / "한 번만 허용" 실제 텍스트를 확인하세요.
다르면 `auto-allow.ps1` 상단의 `$alwaysPatterns`, `$oncePatterns` 값을 수정하면 됩니다.

### 2) 매크로 실행
```
powershell -ExecutionPolicy Bypass -File auto-allow.ps1
```
- 중지: 그 창에서 `Ctrl + C`

### 3) 백그라운드로 조용히 실행
`start-hidden.vbs` 더블클릭 → 창 없이 감시 시작.
- 중지: 작업 관리자에서 `powershell.exe` 종료.

## 동작 방식
- 0.7초마다 Claude 프로세스의 모든 창을 검사
- 창 안의 버튼 중 "항상 허용" 계열을 먼저 찾고, 없으면 "한 번만 허용" 계열을 클릭
- UI Automation `Invoke`로 클릭, 실패 시 마우스 좌표 클릭으로 폴백
