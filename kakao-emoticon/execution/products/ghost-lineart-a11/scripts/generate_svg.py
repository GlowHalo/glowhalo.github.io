"""A11 "쫄보유령" — 소심함/걱정많음 유머 32종을 SVG로 직접 생성한다.

A7(변기토리)·A9(말랑이)와 같은 원리(몸통 실루엣 고정 + 표정 프리셋 조합, Leonardo 미사용)지만,
회장 지시("매번 같은 몸통을 재탕하지 말고 새 실루엣으로 캐릭터 차별화")에 따라
**완전히 새로운 몸통 실루엣(유령 모양 — 둥근 머리 + 물결 밑단, 팔 없이 몸통 옆에서 나온
작은 손 뭉치)**을 새로 설계했다. 팔이 없는 대신 몸통 옆에 붙은 작고 둥근 "손" 뭉치의
위치/방향으로 제스처를 표현한다.

사용법:
    python3 generate_svg.py --phrases phrases.json --out-dir ../svg
"""
import argparse
import json
import os

# 둥근 머리(반원 돔) + 곧은 옆선 + 4단 물결 밑단. 변기토리/말랑이의 알약형 몸통과는
# 완전히 다른 실루엣 — 팔다리가 없는 유령 특유의 형태.
BODY = (
    "M100,150 C100,88 135,48 180,48 C225,48 260,88 260,150 "
    "L260,210 Q240,252 220,210 Q200,252 180,210 Q160,252 140,210 Q120,252 100,210 "
    "L100,150 Z"
)

# 팔 대신 몸통 옆에 붙은 작고 둥근 "손" 뭉치 — 위치/모양으로 제스처 표현.
# 각 값은 <g> 안에 그대로 삽입되는 raw SVG 마크업(경로 대신 타원 조합으로 단순화).
HANDS = {
    "sides": '<ellipse cx="88" cy="175" rx="19" ry="15"/><ellipse cx="272" cy="175" rx="19" ry="15"/>',
    "up_both": '<ellipse cx="70" cy="130" rx="17" ry="14"/><ellipse cx="290" cy="130" rx="17" ry="14"/>',
    "cover_face": '<ellipse cx="150" cy="145" rx="18" ry="15"/><ellipse cx="210" cy="145" rx="18" ry="15"/>',
    "hug_self": '<ellipse cx="150" cy="185" rx="18" ry="14" transform="rotate(-20 150 185)"/><ellipse cx="210" cy="185" rx="18" ry="14" transform="rotate(20 210 185)"/>',
    "one_wave": '<ellipse cx="88" cy="175" rx="19" ry="15"/><ellipse cx="286" cy="120" rx="17" ry="14"/>',
    "peek": '<ellipse cx="160" cy="150" rx="17" ry="14"/><ellipse cx="272" cy="175" rx="19" ry="15"/>',
    "trembling": '<ellipse cx="82" cy="180" rx="17" ry="14"/><ellipse cx="278" cy="180" rx="17" ry="14"/>',
    "point_forward": '<ellipse cx="88" cy="175" rx="19" ry="15"/><ellipse cx="300" cy="160" rx="15" ry="12"/>',
    "clasped": '<ellipse cx="165" cy="195" rx="17" ry="14" transform="rotate(-15 165 195)"/><ellipse cx="195" cy="195" rx="17" ry="14" transform="rotate(15 195 195)"/>',
    "bow": '<ellipse cx="150" cy="200" rx="17" ry="14"/><ellipse cx="210" cy="200" rx="17" ry="14"/>',
}

EYEBROWS = {
    "none": "",
    "worried": '<path d="M128,110 Q140,98 154,106" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/><path d="M232,110 Q220,98 206,106" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
    "raised": '<path d="M130,104 Q142,92 156,102" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/><path d="M230,104 Q218,92 204,102" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
}

EYES = {
    "normal": '<circle cx="152" cy="130" r="7" fill="#2B2B2B"/><circle cx="208" cy="130" r="7" fill="#2B2B2B"/>',
    "wide": '<circle cx="150" cy="128" r="11" fill="#2B2B2B"/><circle cx="210" cy="128" r="11" fill="#2B2B2B"/>',
    "squeezed": '<path d="M142,130 Q152,122 162,130" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/><path d="M198,130 Q208,122 218,130" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
    "closed_happy": '<path d="M140,128 Q152,118 164,128" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/><path d="M196,128 Q208,118 220,128" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
    "teary": '<circle cx="152" cy="130" r="7" fill="#2B2B2B"/><circle cx="208" cy="130" r="7" fill="#2B2B2B"/><path d="M148,140 C146,150 150,158 154,152 Z" fill="#7FD1E8"/><path d="M204,140 C202,150 206,158 210,152 Z" fill="#7FD1E8"/>',
    "shy_side": '<circle cx="158" cy="130" r="7" fill="#2B2B2B"/><circle cx="214" cy="130" r="7" fill="#2B2B2B"/>',
    "one_peek": '<path d="M142,130 Q152,122 162,130" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/><circle cx="208" cy="130" r="8" fill="#2B2B2B"/>',
}

MOUTHS = {
    "small_o": '<ellipse cx="180" cy="160" rx="8" ry="11" fill="#2B2B2B"/>',
    "wavy_worried": '<path d="M158,162 Q168,170 178,162 Q188,170 198,162" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
    "smile": '<path d="M160,156 Q180,170 200,156" fill="none" stroke="#2B2B2B" stroke-width="7" stroke-linecap="round"/>',
    "flat": '<path d="M164,164 L196,164" fill="none" stroke="#2B2B2B" stroke-width="7" stroke-linecap="round"/>',
    "tiny_smile": '<path d="M168,160 Q180,167 192,160" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
    "gasp": '<ellipse cx="180" cy="162" rx="11" ry="14" fill="#2B2B2B"/>',
}

ICONS = {
    "none": "",
    "sweat": '<path d="M92,84 C86,98 90,112 100,112 C110,112 112,98 100,84 Z" fill="#7FD1E8" stroke="#3E9BB8" stroke-width="3"/>',
    "sweat_multi": '<path d="M84,80 C78,94 82,108 92,108 C102,108 104,94 92,80 Z" fill="#7FD1E8" stroke="#3E9BB8" stroke-width="3"/><path d="M290,94 C286,104 289,114 296,114 C303,114 306,104 296,94 Z" fill="#7FD1E8" stroke="#3E9BB8" stroke-width="3"/>',
    "exclaim": '<path d="M300,68 L296,104" stroke="#E8483A" stroke-width="10" stroke-linecap="round"/><circle cx="299" cy="118" r="6" fill="#E8483A"/>',
    "question": '<text x="290" y="104" font-size="42" font-family="sans-serif" fill="#2B2B2B" font-weight="bold">?</text>',
    "sparkle": '<path d="M300,74 L305,89 L320,94 L305,99 L300,114 L295,99 L280,94 L295,89 Z" fill="#FFD24C"/>',
    "heart": '<path d="M300,80 C294,72 282,74 282,84 C282,94 300,106 300,106 C300,106 318,94 318,84 C318,74 306,72 300,80 Z" fill="#FF8FA3"/>',
    "thump": '<circle cx="300" cy="90" r="7" fill="#E8483A" opacity="0.8"/><circle cx="312" cy="104" r="5" fill="#E8483A" opacity="0.6"/>',
}

BLUSH = '<ellipse cx="132" cy="150" rx="10" ry="6" fill="#FF8FA3" opacity="0.6"/><ellipse cx="228" cy="150" rx="10" ry="6" fill="#FF8FA3" opacity="0.6"/>'


def build_text(text):
    """대사를 몸통 위쪽(머리 위)에 Jua체로 굵게, 흰 테두리를 둘러 배치. (A7·A9와 동일 로직)"""
    if not text:
        return ""
    if len(text) > 7 and " " in text:
        mid = len(text) // 2
        split_at = text.rfind(" ", 0, mid + 3)
        if split_at == -1:
            split_at = text.find(" ")
        line1, line2 = text[:split_at], text[split_at + 1:]
        return (
            f'<text x="180" y="26" text-anchor="middle" font-family="Jua" font-size="28" '
            f'fill="#2B2B2B" stroke="#ffffff" stroke-width="6" paint-order="stroke" stroke-linejoin="round">{line1}</text>'
            f'<text x="180" y="52" text-anchor="middle" font-family="Jua" font-size="28" '
            f'fill="#2B2B2B" stroke="#ffffff" stroke-width="6" paint-order="stroke" stroke-linejoin="round">{line2}</text>'
        )
    return (
        f'<text x="180" y="34" text-anchor="middle" font-family="Jua" font-size="30" '
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
  <!-- 몸통·손: 연라벤더빛 화이트로 채워서 다크모드 배경에서도 실루엣이 살아있게 함
       (A7에서 확립한 규칙 — fill:none 금지, 반드시 solid fill) -->
  <g filter="url(#dropshadow)">
    <g fill="#F1ECFF" stroke="#2B2B2B" stroke-width="9" stroke-linejoin="round" stroke-linecap="round">
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
