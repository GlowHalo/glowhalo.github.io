"""A13 "칭얼이" — 육아/신생아 유머 32종을 SVG로 직접 생성한다.

A7·A9·A11과 같은 원리(몸통 실루엣 고정 + 표정 프리셋 조합, Leonardo 미사용)지만,
회장 지시("매번 같은 몸통을 재탕하지 말고 새 실루엣으로 캐릭터 차별화")에 따라
**또 새로운 몸통 실루엣(둥근 삼각형/주먹밥형 — 납작한 바닥 + 위로 둥글게 모이는 돔)**을
설계했다. 포대기에 싸인 아기를 추상화한 모양으로 읽히면서도, 기존 알약형(A7·A9)·유령형(A11)과
확실히 다른 실루엣이다.

사용법:
    python3 generate_svg.py --phrases phrases.json --out-dir ../svg
"""
import argparse
import json
import os

# 납작한 바닥 + 위로 둥글게 모이는 돔(주먹밥/포대기 실루엣) — 기존 알약형·유령형과 다른 새 몸통.
BODY = (
    "M100,278 C72,278 60,222 70,172 "
    "C86,88 132,48 180,48 C228,48 274,88 290,172 "
    "C300,222 288,278 260,278 Z"
)

# 팔 대신 몸통 옆에 붙은 작고 둥근 "손" 뭉치(포대기 밖으로 살짝 나온 손) — A11과 같은 방식.
HANDS = {
    "sides": '<ellipse cx="82" cy="195" rx="18" ry="14"/><ellipse cx="278" cy="195" rx="18" ry="14"/>',
    "up_both": '<ellipse cx="66" cy="150" rx="16" ry="13"/><ellipse cx="294" cy="150" rx="16" ry="13"/>',
    "cover_face": '<ellipse cx="150" cy="160" rx="17" ry="14"/><ellipse cx="210" cy="160" rx="17" ry="14"/>',
    "hug_self": '<ellipse cx="150" cy="205" rx="17" ry="13" transform="rotate(-20 150 205)"/><ellipse cx="210" cy="205" rx="17" ry="13" transform="rotate(20 210 205)"/>',
    "one_wave": '<ellipse cx="82" cy="195" rx="18" ry="14"/><ellipse cx="292" cy="130" rx="16" ry="13"/>',
    "trembling": '<ellipse cx="76" cy="198" rx="16" ry="13"/><ellipse cx="284" cy="198" rx="16" ry="13"/>',
    "clasped": '<ellipse cx="165" cy="215" rx="16" ry="13" transform="rotate(-15 165 215)"/><ellipse cx="195" cy="215" rx="16" ry="13" transform="rotate(15 195 215)"/>',
    "reach": '<ellipse cx="82" cy="195" rx="18" ry="14"/><ellipse cx="300" cy="170" rx="14" ry="11"/>',
    "sleepy_tuck": '<ellipse cx="150" cy="230" rx="16" ry="13"/><ellipse cx="210" cy="230" rx="16" ry="13"/>',
}

EYEBROWS = {
    "none": "",
    "worried": '<path d="M128,130 Q140,118 154,126" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/><path d="M232,130 Q220,118 206,126" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
    "raised": '<path d="M130,124 Q142,112 156,122" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/><path d="M230,124 Q218,112 204,122" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
}

EYES = {
    "normal": '<circle cx="152" cy="150" r="7" fill="#2B2B2B"/><circle cx="208" cy="150" r="7" fill="#2B2B2B"/>',
    "wide": '<circle cx="150" cy="148" r="11" fill="#2B2B2B"/><circle cx="210" cy="148" r="11" fill="#2B2B2B"/>',
    "squeezed": '<path d="M142,150 Q152,142 162,150" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/><path d="M198,150 Q208,142 218,150" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
    "closed_happy": '<path d="M140,148 Q152,138 164,148" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/><path d="M196,148 Q208,138 220,148" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
    "teary": '<circle cx="152" cy="150" r="7" fill="#2B2B2B"/><circle cx="208" cy="150" r="7" fill="#2B2B2B"/><path d="M148,160 C146,172 150,182 154,175 Z" fill="#7FD1E8"/><path d="M204,160 C202,172 206,182 210,175 Z" fill="#7FD1E8"/>',
    "streaming_tears": '<path d="M146,148 L158,148" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/><path d="M202,148 L214,148" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/><path d="M148,158 C144,180 150,198 156,186 Z" fill="#7FD1E8"/><path d="M204,158 C200,180 206,198 212,186 Z" fill="#7FD1E8"/>',
    "sleepy": '<path d="M142,150 L162,150" stroke="#2B2B2B" stroke-width="7" stroke-linecap="round"/><path d="M198,150 L218,150" stroke="#2B2B2B" stroke-width="7" stroke-linecap="round"/>',
}

MOUTHS = {
    "smile": '<path d="M158,178 Q180,194 202,178" fill="none" stroke="#2B2B2B" stroke-width="7" stroke-linecap="round"/>',
    "wail": '<ellipse cx="180" cy="188" rx="16" ry="20" fill="#2B2B2B"/><ellipse cx="180" cy="200" rx="8" ry="6" fill="#FF8FA3" opacity="0.8"/>',
    "small_o": '<ellipse cx="180" cy="184" rx="9" ry="12" fill="#2B2B2B"/>',
    "flat": '<path d="M164,188 L196,188" fill="none" stroke="#2B2B2B" stroke-width="7" stroke-linecap="round"/>',
    "pacifier": '<ellipse cx="180" cy="188" rx="13" ry="10" fill="#B8D8FF" stroke="#2B2B2B" stroke-width="3"/><circle cx="180" cy="188" r="4" fill="#ffffff"/>',
    "giggle": '<path d="M160,180 Q180,196 200,180" fill="none" stroke="#2B2B2B" stroke-width="7" stroke-linecap="round"/>',
    "wavy_fuss": '<path d="M158,184 Q168,192 178,184 Q188,192 198,184" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
}

ICONS = {
    "none": "",
    "sweat": '<path d="M92,104 C86,118 90,132 100,132 C110,132 112,118 100,104 Z" fill="#7FD1E8" stroke="#3E9BB8" stroke-width="3"/>',
    "sweat_multi": '<path d="M84,100 C78,114 82,128 92,128 C102,128 104,114 92,100 Z" fill="#7FD1E8" stroke="#3E9BB8" stroke-width="3"/><path d="M290,114 C286,124 289,134 296,134 C303,134 306,124 296,114 Z" fill="#7FD1E8" stroke="#3E9BB8" stroke-width="3"/>',
    "exclaim": '<path d="M300,88 L296,124" stroke="#E8483A" stroke-width="10" stroke-linecap="round"/><circle cx="299" cy="138" r="6" fill="#E8483A"/>',
    "sparkle": '<path d="M300,94 L305,109 L320,114 L305,119 L300,134 L295,119 L280,114 L295,109 Z" fill="#FFD24C"/>',
    "heart": '<path d="M300,100 C294,92 282,94 282,104 C282,114 300,126 300,126 C300,126 318,114 318,104 C318,94 306,92 300,100 Z" fill="#FF8FA3"/>',
    "zzz": '<text x="272" y="104" font-size="26" font-family="sans-serif" fill="#8E8AC7" font-weight="bold">Z</text><text x="290" y="84" font-size="20" font-family="sans-serif" fill="#8E8AC7" font-weight="bold">z</text>',
    "note": '<path d="M296,100 C296,90 305,86 312,90 L312,110 C310,108 305,107 302,109 C298,111 296,107 296,102 Z" fill="#FF8FA3"/>',
}

BLUSH = '<ellipse cx="132" cy="172" rx="11" ry="7" fill="#FF8FA3" opacity="0.6"/><ellipse cx="228" cy="172" rx="11" ry="7" fill="#FF8FA3" opacity="0.6"/>'


def build_text(text):
    """대사를 몸통 위쪽에 Jua체로 굵게, 흰 테두리를 둘러 배치. (A7·A9·A11과 동일 로직)"""
    if not text:
        return ""
    if len(text) > 7 and " " in text:
        mid = len(text) // 2
        split_at = text.rfind(" ", 0, mid + 3)
        if split_at == -1:
            split_at = text.find(" ")
        line1, line2 = text[:split_at], text[split_at + 1:]
        return (
            f'<text x="180" y="28" text-anchor="middle" font-family="Jua" font-size="28" '
            f'fill="#2B2B2B" stroke="#ffffff" stroke-width="6" paint-order="stroke" stroke-linejoin="round">{line1}</text>'
            f'<text x="180" y="54" text-anchor="middle" font-family="Jua" font-size="28" '
            f'fill="#2B2B2B" stroke="#ffffff" stroke-width="6" paint-order="stroke" stroke-linejoin="round">{line2}</text>'
        )
    return (
        f'<text x="180" y="36" text-anchor="middle" font-family="Jua" font-size="30" '
        f'fill="#2B2B2B" stroke="#ffffff" stroke-width="6" paint-order="stroke" stroke-linejoin="round">{text}</text>'
    )


def build_svg(p):
    hands_markup = HANDS[p["hands"]]
    eyebrows = EYEBROWS[p.get("eyebrows", "none")]
    eyes = EYES[p["eyes"]]
    mouth = MOUTHS[p["mouth"]]
    icon = ICONS.get(p.get("icon", "none"), "")
    blush = BLUSH if p.get("blush", True) else ""
    text = build_text(p.get("text", ""))
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="360" height="360" viewBox="0 0 360 360">
  <defs>
    <filter id="dropshadow" x="-30%" y="-20%" width="160%" height="150%">
      <feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#000000" flood-opacity="0.16"/>
    </filter>
  </defs>
  <!-- 몸통·손: 연한 베이비블루로 채워서 다크모드 배경에서도 실루엣이 살아있게 함
       (A7에서 확립한 규칙 — fill:none 금지, 반드시 solid fill) -->
  <g filter="url(#dropshadow)">
    <g fill="#DCEEFF" stroke="#2B2B2B" stroke-width="9" stroke-linejoin="round" stroke-linecap="round">
      {hands_markup}
      <path d="{BODY}"/>
    </g>
  </g>
  {eyebrows}
  {eyes}
  {mouth}
  {blush}
  {icon}
  {text}
</svg>
'''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--phrases", required=True)
    ap.add_argument("--out-dir", required=True)
    args = ap.parse_args()

    os.makedirs(args.out_dir, exist_ok=True)
    phrases = json.load(open(args.phrases, encoding="utf-8"))
    for p in phrases:
        svg = build_svg(p)
        path = os.path.join(args.out_dir, f'{p["slug"]}.svg')
        open(path, "w", encoding="utf-8").write(svg)
        print("wrote:", path)


if __name__ == "__main__":
    main()
