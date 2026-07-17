# 작업실 허브 (모노레포)

이 폴더 하나가 GitHub 저장소 `tossneon/tossneon.github.io` (**public**, user-site repo) 이다.
하위 폴더 하나 = 프로젝트 하나이고, `https://tossneon.github.io/<폴더>/` 로 배포된다. push 한 번 = 백업 + 배포.

- 새 프로젝트 = 루트에 **영문 slug 폴더**를 추가하고 루트에서 push. **별도 저장소를 만들지 말 것.**
- 어떤 프로젝트가 독립 주소가 꼭 필요해지면 그것만 `git subtree split` 으로 분리한다.
- 구조/워크플로우 상세는 `README.md` 참고.
- 프로젝트 목록의 정본은 **Notion "작업실 허브"**. `registry.js` 는 Notion 스냅샷이므로 **직접 수정하지 말고** Notion 에서 동기화한다.

## 공개 저장소 주의

- 이 저장소는 **공개**다. 비밀키·로그인 세션·고객 개인정보·진단 결과 PDF 는 **커밋 금지** — `data/` 등 gitignore 대상 폴더에 둔다.
- `.gitignore` 는 **인라인 주석을 지원하지 않는다.** 주석은 별도 줄에 쓴다.
- 브라우저에서 실행되는 코드에 API 키를 넣지 않는다. Notion/Drive 같은 서버용 키는 노출된다.

## 자동 백업

Windows 작업 스케줄러 `SideProjects-Weekly-Backup` 이 **매주 일요일 09:00** 에 `~/.claude/scripts/backup-side-projects.ps1` 실행 → 변경분 자동 커밋 후 push. 로그는 `~/.claude/scripts/backup.log`.
