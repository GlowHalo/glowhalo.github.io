# 오디오 출처 (전부 CC0, 상업적 이용 무료)

일반 웹사이트(opengameart.org, freesound.org, kenney.nl 등)는 이 작업 환경의 네트워크
정책상 접근 불가하여, GitHub에 실파일로 호스팅된 CC0 소스만 사용함. 파일명은
`ASSETS.md`의 "사운드(BGM/SFX) 규격서"와 `src/systems/audio.ts`가 그대로 기대하는
이름(`sfx-<key>.mp3`, `bgm-battle.mp3`)에 맞춰 mp3로 변환해서 넣음.

## 효과음 (SFX, 13종 전부 채움)

원본: Kenney.nl 의 CC0 오디오 팩들, `github.com/Boyquotes/kenney-*-for-godot` 에
Godot용으로 리패키징되어 커밋된 것을 ffmpeg으로 mp3 변환. (라이선스 CC0-1.0, 각 리포의
LICENSE.txt 확인함)

| 파일 | 원본 팩 | 원본 파일명 |
|---|---|---|
| sfx-hit.mp3 | Impact Sounds | impact_punch_medium_002.ogg |
| sfx-hit-crit.mp3 | Impact Sounds | impact_metal_heavy_002.ogg |
| sfx-cast.mp3 | Digital Audio | phaser_up_3.ogg |
| sfx-ultimate.mp3 | Music Jingles (Hit) | jingles_hit_12.ogg |
| sfx-heal.mp3 | Digital Audio | power_up_7.ogg |
| sfx-shield.mp3 | Digital Audio | phase_jump_2.ogg |
| sfx-kill.mp3 | Impact Sounds | impact_bell_heavy_002.ogg |
| sfx-victory.mp3 | Music Jingles (8-Bit) | jingles_nes_5.ogg |
| sfx-defeat.mp3 | Digital Audio | low_three_tone.ogg |
| sfx-reveal.mp3 | Digital Audio | two_tone_1.ogg |
| sfx-reveal-high.mp3 | Music Jingles (Pizzicato) | jingles_pizzi_10.ogg |
| sfx-levelup.mp3 | Digital Audio | power_up_2.ogg |
| sfx-equip.mp3 | RPG Audio | metal_click.ogg |

## BGM

원본: Zane Little Music 작곡, `github.com/gdquest-demos/godot-open-rpg` 의
`assets/music/` 에 실파일로 커밋되어 있음 (리포 CREDITS.md에 CC0 명시). 코믹한 곤충
소재 게임잼용으로 만들어진 곡이라 판타지 가챠풍은 아님 — 스타터/임시 채택.

- `bgm-battle.mp3` — 실제로 코드가 로드하는 파일. 원곡 "Insect Factory" (경쾌하고
  리듬감 있어 세 후보 중 가장 전투 배경음 느낌에 가까움).
- `bgm-battle-alt-applecider.mp3` (원곡 "Apple Cider"), `bgm-battle-alt-funrun.mp3`
  (원곡 "The Fun Run") — 코드가 로드하지 않는 예비 후보. 마음에 들면 `bgm-battle.mp3`로
  바꿔치기.

미채택(스타일 안 맞음, 미다운로드): Squashin' Bugs.
