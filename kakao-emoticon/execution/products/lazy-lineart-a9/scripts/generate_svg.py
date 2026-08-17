"""A9 "말랑이" — 귀차니즘/무기력 유머 32종을 SVG로 직접 생성한다.

A7(변기토리)과 동일 원리(몸통 실루엣 고정 + 표정/팔 프리셋 조합, Leonardo 미사용)를 재사용하되,
캐릭터 색상(복숭아빛 크림)과 표정/아이콘 프리셋을 새 컨셉("만사 귀찮음")에 맞게 확장했다.
몸통 좌표(BODY)·팔 포즈(ARMS)는 A7의 검증된 값을 그대로 재사용 — 캐릭터 정체성은 색상과
표정 문법(늘어진 눈, 반쯤 감긴 눈, 하품 등)으로 차별화한다.

사용법:
    python3 generate_svg.py --phrases phrases.json --out-dir ../svg
"""
import argparse
import json
import os

BODY = (
    'M180,60 C240,60 268,110 262,160 C258,196 240,214 230,230 '
    'C246,238 262,252 262,276 C262,300 232,312 180,312 '
    'C128,312 98,300 98,276 C98,252 114,238 130,230 '
    'C120,214 102,196 98,160 C92,110 120,60 180,60 Z'
)

# A7과 동일 팔 프리셋(검증된 좌표 재사용) + 늘어짐 표현에 어울리는 신규 2종 추가
ARMS = {
    "down": 'M118,230 C86,222 58,206 46,224 C34,242 56,266 92,262 M242,230 C274,222 302,206 314,224 C326,242 304,266 268,262',
    "up_both": 'M120,222 C92,196 66,164 48,176 C30,188 38,222 70,240 C92,252 112,244 120,222 M240,222 C268,196 294,164 312,176 C330,188 322,222 290,240 C268,252 248,244 240,222',
    "crossed": 'M120,226 C90,232 150,250 150,236 M240,226 C270,232 210,250 210,236',
    "hug_belly": 'M128,238 C104,252 96,276 122,282 C142,286 152,268 148,252 M232,238 C256,252 264,276 238,282 C218,286 208,268 212,252',
    "shrug": 'M116,222 C82,208 50,208 44,228 C38,246 66,258 100,244 M244,222 C278,208 310,208 316,228 C322,246 294,258 260,244',
    "prayer": 'M130,224 C110,244 108,266 128,270 C144,273 156,258 152,244 C148,230 138,224 130,224 M230,224 C250,244 252,266 232,270 C216,273 204,258 208,244 C212,230 222,224 230,224',
    "warrior": 'M130,224 C104,232 78,238 70,254 C64,266 78,280 96,270 C108,264 120,244 130,224 M230,224 C256,232 282,238 290,254 C296,266 282,280 264,270 C252,264 240,244 230,224',
    "sprawl_flat": 'M96,236 C60,240 30,238 20,254 C12,268 30,282 62,272 C80,266 92,250 96,236 M264,236 C300,240 330,238 340,254 C348,268 330,282 298,272 C280,266 268,250 264,236',
    "limp_side": 'M120,236 C96,248 84,268 96,278 C106,286 122,278 128,262 M240,236 C264,248 276,268 264,278 C254,286 238,278 232,262',
}

EYEBROWS = {
    "none": "",
    "worried": '<path d="M128,124 Q140,112 154,120" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/><path d="M232,124 Q220,112 206,120" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
    "flat_tired": '<path d="M130,120 L156,124" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/><path d="M230,120 L204,124" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
}

# 늘보/무기력 표정 중심 — 반쯤 감긴 눈, 완전히 감은 눈, 나선형 멍한 눈 등을 새로 추가
EYES = {
    "normal": '<circle cx="152" cy="150" r="7" fill="#2B2B2B"/><circle cx="208" cy="150" r="7" fill="#2B2B2B"/>',
    "half_lidded": '<path d="M142,148 L164,148" stroke="#2B2B2B" stroke-width="7" stroke-linecap="round"/><path d="M196,148 L218,148" stroke="#2B2B2B" stroke-width="7" stroke-linecap="round"/><path d="M148,150 Q152,156 156,150" fill="none" stroke="#2B2B2B" stroke-width="3"/><path d="M204,150 Q208,156 212,150" fill="none" stroke="#2B2B2B" stroke-width="3"/>',
    "fully_closed": '<path d="M140,150 Q152,156 164,150" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/><path d="M196,150 Q208,156 220,150" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
    "wide": '<circle cx="150" cy="148" r="11" fill="#2B2B2B"/><circle cx="210" cy="148" r="11" fill="#2B2B2B"/>',
    "spiral_dazed": '<circle cx="152" cy="150" r="9" fill="none" stroke="#2B2B2B" stroke-width="3"/><path d="M152,150 m-5,0 a5,5 0 1,1 5,5" fill="none" stroke="#2B2B2B" stroke-width="2"/><circle cx="208" cy="150" r="9" fill="none" stroke="#2B2B2B" stroke-width="3"/><path d="M208,150 m-5,0 a5,5 0 1,1 5,5" fill="none" stroke="#2B2B2B" stroke-width="2"/>',
    "squeezed": '<path d="M142,150 Q152,142 162,150" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/><path d="M198,150 Q208,142 218,150" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
    "teary": '<circle cx="152" cy="150" r="7" fill="#2B2B2B"/><circle cx="208" cy="150" r="7" fill="#2B2B2B"/><path d="M148,160 C146,170 150,178 154,172 Z" fill="#7FD1E8"/><path d="M204,160 C202,170 206,178 210,172 Z" fill="#7FD1E8"/>',
}

MOUTHS = {
    "smile": '<path d="M158,176 Q180,192 202,176" fill="none" stroke="#2B2B2B" stroke-width="7" stroke-linecap="round"/>',
    "flat": '<path d="M162,186 L198,186" fill="none" stroke="#2B2B2B" stroke-width="7" stroke-linecap="round"/>',
    "small_o": '<ellipse cx="180" cy="184" rx="9" ry="12" fill="#2B2B2B"/>',
    "yawn": '<ellipse cx="180" cy="186" rx="16" ry="20" fill="#2B2B2B"/><ellipse cx="180" cy="196" rx="9" ry="6" fill="#FF8FA3" opacity="0.7"/>',
    "wavy_worried": '<path d="M158,182 Q168,190 178,182 Q188,190 198,182" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
    "soft_smile": '<path d="M162,180 Q180,190 198,180" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
    "drool": '<path d="M162,184 L198,184" fill="none" stroke="#2B2B2B" stroke-width="7" stroke-linecap="round"/><path d="M196,186 C196,196 204,200 202,208 C200,214 192,210 194,202 C195,196 195,190 196,186 Z" fill="#7FD1E8"/>',
}

ICONS = {
    "none": "",
    "zzz": '<text x="272" y="100" font-size="26" font-family="sans-serif" fill="#8E8AC7" font-weight="bold">Z</text><text x="290" y="80" font-size="20" font-family="sans-serif" fill="#8E8AC7" font-weight="bold">z</text><text x="302" y="66" font-size="14" font-family="sans-serif" fill="#8E8AC7" font-weight="bold">z</text>',
    "battery_low": '<rect x="278" y="90" width="34" height="18" rx="3" fill="none" stroke="#2B2B2B" stroke-width="3"/><rect x="312" y="95" width="4" height="8" fill="#2B2B2B"/><rect x="281" y="93" width="8" height="12" fill="#E8483A"/>',
    "sparkle": '<path d="M300,90 L305,105 L320,110 L305,115 L300,130 L295,115 L280,110 L295,105 Z" fill="#FFD24C"/>',
    "sweat": '<path d="M92,100 C86,114 90,128 100,128 C110,128 112,114 100,100 Z" fill="#7FD1E8" stroke="#3E9BB8" stroke-width="3"/>',
    "puff": '<circle cx="70" cy="200" r="10" fill="#C9B6D8" opacity="0.7"/><circle cx="52" cy="212" r="14" fill="#C9B6D8" opacity="0.6"/><circle cx="40" cy="196" r="8" fill="#C9B6D8" opacity="0.5"/>',
    "exclaim": '<path d="M300,84 L296,120" stroke="#E8483A" stroke-width="10" stroke-linecap="round"/><circle cx="299" cy="134" r="6" fill="#E8483A"/>',
    "heart": '<path d="M300,96 C294,88 282,90 282,100 C282,110 300,122 300,122 C300,122 318,110 318,100 C318,90 306,88 300,96 Z" fill="#FF8FA3"/>',
    "question": '<text x="290" y="120" font-size="42" font-family="sans-serif" fill="#2B2B2B" font-weight="bold">?</text>',
}

BLUSH = '<ellipse cx="134" cy="172" rx="11" ry="7" fill="#FF8FA3" opacity="0.7"/><ellipse cx="226" cy="172" rx="11" ry="7" fill="#FF8FA3" opacity="0.7"/>'


def build_text(text):
    """대사를 몸통 위쪽에 Jua체로 굵게, 흰 테두리를 둘러 어떤 배경에서도 잘 읽히게 배치. (A7과 동일 로직)"""
    if not text:
        return ""
    if len(text) > 7 and " " in text:
        mid = len(text) // 2
        split_at = text.rfind(" ", 0, mid + 3)
        if split_at == -1:
            split_at = text.find(" ")
        line1, line2 = text[:split_at], text[split_at + 1:]
        return (
            f'<text x="180" y="30" text-anchor="middle" font-family="Jua" font-size="30" '
            f'fill="#2B2B2B" stroke="#ffffff" stroke-width="6" paint-order="stroke" stroke-linejoin="round">{line1}</text>'
            f'<text x="180" y="58" text-anchor="middle" font-family="Jua" font-size="30" '
            f'fill="#2B2B2B" stroke="#ffffff" stroke-width="6" paint-order="stroke" stroke-linejoin="round">{line2}</text>'
        )
    return (
        f'<text x="180" y="44" text-anchor="middle" font-family="Jua" font-size="32" '
        f'fill="#2B2B2B" stroke="#ffffff" stroke-width="6" paint-order="stroke" stroke-linejoin="round">{text}</text>'
    )


def build_svg(p):
    arms_markup = f'<path d="{ARMS[p["arms"]]}"/>'
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
  <!-- 몸통·팔: 복숭아빛 크림으로 채워서 카카오톡 다크모드 배경에서도 실루엣이 살아있게 함
       (A7에서 확립한 규칙 — fill:none 금지, 반드시 solid fill + 검정 테두리) -->
  <g filter="url(#dropshadow)">
    <g fill="#FFE3C4" stroke="#2B2B2B" stroke-width="9" stroke-linejoin="round" stroke-linecap="round">
      {arms_markup}
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
