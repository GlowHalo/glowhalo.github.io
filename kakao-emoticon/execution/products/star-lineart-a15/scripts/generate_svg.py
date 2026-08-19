"""A15 "깜빡이" — 건망증/덜렁이 유머 32종을 SVG로 직접 생성한다.

A7(변기토리)·A9(말랑이)·A11(쫄보유령)·A13(칭얼이)와 같은 원리(몸통 실루엣 고정 + 표정
프리셋 조합, Leonardo 미사용)지만, 회장 지시("매번 같은 몸통을 재탕하지 말고 새 실루엣으로
캐릭터 차별화")에 따라 **완전히 새로운 몸통 실루엣(통통한 4방향 반짝이/별 모양 — 위/오른쪽/
아래/왼쪽 4개의 둥근 뾰족점을 가진 스파클 모양)**을 새로 설계했다. 좌우 뾰족점 끝을 그대로
"손"으로 삼는 대신, 유령(A11)과 같은 방식으로 별도의 작은 손 뭉치를 몸통 옆에 배치해
제스처 표현의 자유도를 확보했다. "반짝(별)"이라는 캐릭터 자체가 "깜빡했다가 번뜩 떠오른다"는
건망증 개그 소재와 자연스럽게 맞아떨어지는 컨셉이다.

사용법:
    python3 generate_svg.py --phrases phrases.json --out-dir ../svg
"""
import argparse
import json
import os

# 통통한 4방향 스파클(반짝이별) 몸통 — 위/오른쪽/아래/왼쪽 4개의 둥근 뾰족점, 대각선
# 방향은 오목하게 들어간 "허리"로 연결. 알약형(A7/A9)·유령형(A11)·주먹밥형(A13)과는
# 완전히 다른 실루엣.
BODY = (
    "M180,42 "
    "C215,95 225,120 318,180 "
    "C225,240 215,265 180,318 "
    "C145,265 135,240 42,180 "
    "C135,120 145,95 180,42 Z"
)

# 몸통 좌/우 허리 부근에 붙은 작고 둥근 "손" 뭉치 — 위치/모양으로 제스처 표현(A11과 동일 기법).
HANDS = {
    "sides": '<ellipse cx="95" cy="185" rx="18" ry="15"/><ellipse cx="265" cy="185" rx="18" ry="15"/>',
    "up_both": '<ellipse cx="78" cy="140" rx="16" ry="14"/><ellipse cx="282" cy="140" rx="16" ry="14"/>',
    "cover_face": '<ellipse cx="152" cy="150" rx="17" ry="14"/><ellipse cx="208" cy="150" rx="17" ry="14"/>',
    "chin_tap": '<ellipse cx="95" cy="185" rx="18" ry="15"/><ellipse cx="192" cy="205" rx="16" ry="13"/>',
    "clasped": '<ellipse cx="166" cy="210" rx="16" ry="13" transform="rotate(-15 166 210)"/><ellipse cx="194" cy="210" rx="16" ry="13" transform="rotate(15 194 210)"/>',
    "write": '<ellipse cx="265" cy="185" rx="18" ry="15"/><ellipse cx="205" cy="230" rx="15" ry="12" transform="rotate(30 205 230)"/>',
    "one_scratch_head": '<ellipse cx="95" cy="185" rx="18" ry="15"/><ellipse cx="205" cy="110" rx="15" ry="12"/>',
    "search_both": '<ellipse cx="70" cy="190" rx="17" ry="14" transform="rotate(-20 70 190)"/><ellipse cx="290" cy="190" rx="17" ry="14" transform="rotate(20 290 190)"/>',
    "thumbs_up": '<ellipse cx="95" cy="185" rx="18" ry="15"/><ellipse cx="278" cy="150" rx="15" ry="13"/>',
}

EYEBROWS = {
    "none": "",
    "puzzled": '<path d="M132,118 Q144,108 156,116" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/><path d="M228,116 Q216,106 204,114" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
    "raised": '<path d="M130,110 Q142,98 156,108" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/><path d="M230,110 Q218,98 204,108" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
    "worried": '<path d="M130,112 Q142,120 154,114" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/><path d="M230,112 Q218,120 206,114" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
    "sheepish": '<path d="M134,116 Q144,110 154,116" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/><path d="M226,116 Q216,110 206,116" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
    "determined": '<path d="M130,116 Q144,106 158,114" fill="none" stroke="#2B2B2B" stroke-width="7" stroke-linecap="round"/><path d="M230,116 Q216,106 202,114" fill="none" stroke="#2B2B2B" stroke-width="7" stroke-linecap="round"/>',
}

EYES = {
    "normal": '<circle cx="152" cy="138" r="7" fill="#2B2B2B"/><circle cx="208" cy="138" r="7" fill="#2B2B2B"/>',
    "wide": '<circle cx="150" cy="136" r="11" fill="#2B2B2B"/><circle cx="210" cy="136" r="11" fill="#2B2B2B"/>',
    "squint_think": '<path d="M142,138 Q152,130 162,138" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/><circle cx="208" cy="138" r="7" fill="#2B2B2B"/>',
    "closed_oops": '<path d="M140,136 Q152,146 164,136" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/><path d="M196,136 Q208,146 220,136" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
    "closed_sheepish": '<path d="M142,136 Q152,128 162,136" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/><path d="M198,136 Q208,128 218,136" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
    "closed_happy": '<path d="M140,134 Q152,124 164,134" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/><path d="M196,134 Q208,124 220,134" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
    "search": '<circle cx="156" cy="138" r="7" fill="#2B2B2B"/><circle cx="212" cy="138" r="7" fill="#2B2B2B"/>',
    "blank": '<circle cx="152" cy="138" r="6" fill="#2B2B2B"/><circle cx="208" cy="138" r="6" fill="#2B2B2B"/>',
    "sparkle": '<path d="M152,130 L156,138 L164,138 L157,143 L160,151 L152,146 L144,151 L147,143 L140,138 L148,138 Z" fill="#2B2B2B"/><path d="M208,130 L212,138 L220,138 L213,143 L216,151 L208,146 L200,151 L203,143 L196,138 L204,138 Z" fill="#2B2B2B"/>',
    "teary": '<circle cx="152" cy="138" r="7" fill="#2B2B2B"/><circle cx="208" cy="138" r="7" fill="#2B2B2B"/><path d="M148,148 C146,158 150,166 154,160 Z" fill="#7FD1E8"/><path d="M204,148 C202,158 206,166 210,160 Z" fill="#7FD1E8"/>',
    "determined": '<ellipse cx="152" cy="138" rx="7" ry="8" fill="#2B2B2B"/><ellipse cx="208" cy="138" rx="7" ry="8" fill="#2B2B2B"/>',
}

MOUTHS = {
    "flat": '<path d="M164,172 L196,172" fill="none" stroke="#2B2B2B" stroke-width="7" stroke-linecap="round"/>',
    "small_o": '<ellipse cx="180" cy="170" rx="8" ry="11" fill="#2B2B2B"/>',
    "gasp": '<ellipse cx="180" cy="170" rx="11" ry="14" fill="#2B2B2B"/>',
    "smile": '<path d="M160,164 Q180,180 200,164" fill="none" stroke="#2B2B2B" stroke-width="7" stroke-linecap="round"/>',
    "tiny_smile": '<path d="M168,168 Q180,175 192,168" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
    "wavy_worried": '<path d="M158,170 Q168,178 178,170 Q188,178 198,170" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
}

ICONS = {
    "none": "",
    "question": '<text x="286" y="112" font-size="44" font-family="sans-serif" fill="#2B2B2B" font-weight="bold">?</text>',
    "spark": '<path d="M300,66 L306,84 L324,90 L306,96 L300,114 L294,96 L276,90 L294,84 Z" fill="#FFD24C" stroke="#E8A800" stroke-width="2"/>',
    "sparkle": '<path d="M298,72 L303,86 L317,90 L303,94 L298,108 L293,94 L279,90 L293,86 Z" fill="#FFD24C"/>',
    "sweat": '<path d="M92,84 C86,98 90,112 100,112 C110,112 112,98 100,84 Z" fill="#7FD1E8" stroke="#3E9BB8" stroke-width="3"/>',
    "sweat_multi": '<path d="M84,80 C78,94 82,108 92,108 C102,108 104,94 92,80 Z" fill="#7FD1E8" stroke="#3E9BB8" stroke-width="3"/><path d="M290,94 C286,104 289,114 296,114 C303,114 306,104 296,94 Z" fill="#7FD1E8" stroke="#3E9BB8" stroke-width="3"/>',
    "heart": '<path d="M300,80 C294,72 282,74 282,84 C282,94 300,106 300,106 C300,106 318,94 318,84 C318,74 306,72 300,80 Z" fill="#FF8FA3"/>',
}

BLUSH = '<ellipse cx="134" cy="158" rx="10" ry="6" fill="#FF8FA3" opacity="0.55"/><ellipse cx="226" cy="158" rx="10" ry="6" fill="#FF8FA3" opacity="0.55"/>'


def build_text(text):
    """대사를 몸통 위쪽(위 뾰족점 아래)에 Jua체로 굵게, 흰 테두리를 둘러 배치."""
    if not text:
        return ""
    if len(text) > 7 and " " in text:
        mid = len(text) // 2
        split_at = text.rfind(" ", 0, mid + 3)
        if split_at == -1:
            split_at = text.find(" ")
        line1, line2 = text[:split_at], text[split_at + 1:]
        return (
            f'<text x="180" y="30" text-anchor="middle" font-family="Jua" font-size="27" '
            f'fill="#2B2B2B" stroke="#ffffff" stroke-width="6" paint-order="stroke" stroke-linejoin="round">{line1}</text>'
            f'<text x="180" y="55" text-anchor="middle" font-family="Jua" font-size="27" '
            f'fill="#2B2B2B" stroke="#ffffff" stroke-width="6" paint-order="stroke" stroke-linejoin="round">{line2}</text>'
        )
    return (
        f'<text x="180" y="38" text-anchor="middle" font-family="Jua" font-size="29" '
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
  <!-- 몸통·손: 따뜻한 노란빛 화이트로 채워서 다크모드 배경에서도 실루엣이 살아있게 함
       (A7에서 확립한 규칙 — fill:none 금지, 반드시 solid fill) -->
  <g filter="url(#dropshadow)">
    <g fill="#FFF4D6" stroke="#2B2B2B" stroke-width="9" stroke-linejoin="round" stroke-linecap="round">
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
