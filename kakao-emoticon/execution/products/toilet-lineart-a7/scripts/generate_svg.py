"""A7 "변기토리" — 라인아트 캐릭터(C컨셉)로 화장실 유머 32종을 SVG로 직접 생성한다.

Leonardo AI 등 외부 이미지 생성 API를 전혀 쓰지 않고, 몸통 실루엣 하나를 고정해두고
표정(눈썹·눈·입)과 팔 포즈, 작은 아이콘만 문구별로 바꿔서 파이썬으로 SVG 문자열을
직접 조립한다 — Leonardo 파이프라인의 "고정 시드+표정만 교체" 원칙을 벡터로 재현한 것.

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

ARMS = {
    "down": 'M118,230 C86,222 58,206 46,224 C34,242 56,266 92,262 M242,230 C274,222 302,206 314,224 C326,242 304,266 268,262',
    "up_both": 'M120,222 C92,196 66,164 48,176 C30,188 38,222 70,240 C92,252 112,244 120,222 M240,222 C268,196 294,164 312,176 C330,188 322,222 290,240 C268,252 248,244 240,222',
    "crossed": 'M120,226 C90,232 150,250 150,236 M240,226 C270,232 210,250 210,236',
    "hug_belly": 'M128,238 C104,252 96,276 122,282 C142,286 152,268 148,252 M232,238 C256,252 264,276 238,282 C218,286 208,268 212,252',
    "wash": 'M132,220 C110,214 92,212 90,230 C88,248 112,254 134,246 M228,220 C250,214 268,212 270,230 C272,248 248,254 226,246',
    "shrug": 'M116,222 C82,208 50,208 44,228 C38,246 66,258 100,244 M244,222 C278,208 310,208 316,228 C322,246 294,258 260,244',
    "phone": 'M118,230 C86,222 58,206 46,224 C34,242 56,266 92,262 M238,214 C252,186 244,150 224,148 C210,147 204,164 214,178 C222,190 232,200 238,214',
    "block": 'M118,230 C86,222 58,206 46,224 C34,242 56,266 92,262 M232,198 C264,182 300,176 312,192 C324,208 300,222 268,220 C250,219 236,210 232,198',
    "prayer": 'M130,224 C110,244 108,266 128,270 C144,273 156,258 152,244 C148,230 138,224 130,224 M230,224 C250,244 252,266 232,270 C216,273 204,258 208,244 C212,230 222,224 230,224',
    "wave_hello": 'M118,230 C86,222 58,206 46,224 C34,242 56,266 92,262 M240,222 C268,196 296,166 306,140 C312,124 296,118 288,132 C282,144 268,168 252,190 C246,200 240,210 240,222',
    "warrior": 'M130,224 C104,232 78,238 70,254 C64,266 78,280 96,270 C108,264 120,244 130,224 M230,224 C256,232 282,238 290,254 C296,266 282,280 264,270 C252,264 240,244 230,224',
}

EYEBROWS = {
    "none": "",
    "worried": '<path d="M128,124 Q140,112 154,120" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/><path d="M232,124 Q220,112 206,120" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
    "angry": '<path d="M136,132 L166,142" stroke="#2B2B2B" stroke-width="8" stroke-linecap="round"/><path d="M224,132 L194,142" stroke="#2B2B2B" stroke-width="8" stroke-linecap="round"/>',
    "raised": '<path d="M130,118 Q142,106 156,116" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/><path d="M230,118 Q218,106 204,116" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
}

EYES = {
    "normal": '<circle cx="152" cy="150" r="7" fill="#2B2B2B"/><circle cx="208" cy="150" r="7" fill="#2B2B2B"/>',
    "wide": '<circle cx="150" cy="148" r="11" fill="#2B2B2B"/><circle cx="210" cy="148" r="11" fill="#2B2B2B"/>',
    "squeezed": '<path d="M142,150 Q152,142 162,150" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/><path d="M198,150 Q208,142 218,150" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
    "closed_happy": '<path d="M140,148 Q152,138 164,148" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/><path d="M196,148 Q208,138 220,148" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
    "x_pain": '<path d="M144,142 L160,158 M160,142 L144,158" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/><path d="M200,142 L216,158 M216,142 L200,158" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
}

MOUTHS = {
    "smile": '<path d="M158,176 Q180,192 202,176" fill="none" stroke="#2B2B2B" stroke-width="7" stroke-linecap="round"/>',
    "o": '<ellipse cx="180" cy="184" rx="12" ry="16" fill="#2B2B2B"/>',
    "flat": '<path d="M162,186 L198,186" fill="none" stroke="#2B2B2B" stroke-width="7" stroke-linecap="round"/>',
    "wavy_worried": '<path d="M158,182 Q168,190 178,182 Q188,190 198,182" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
    "zigzag_pain": '<path d="M156,180 L168,190 L180,178 L192,190 L204,180" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
    "smirk": '<path d="M160,180 Q182,190 200,174" fill="none" stroke="#2B2B2B" stroke-width="7" stroke-linecap="round"/>',
    "soft_smile": '<path d="M162,180 Q180,190 198,180" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round"/>',
}

ICONS = {
    "none": "",
    "exclaim": '<path d="M300,84 L296,120" stroke="#E8483A" stroke-width="10" stroke-linecap="round"/><circle cx="299" cy="134" r="6" fill="#E8483A"/>',
    "sweat": '<path d="M92,100 C86,114 90,128 100,128 C110,128 112,114 100,100 Z" fill="#7FD1E8" stroke="#3E9BB8" stroke-width="3"/>',
    "sweat_multi": '<path d="M84,96 C78,110 82,124 92,124 C102,124 104,110 92,96 Z" fill="#7FD1E8" stroke="#3E9BB8" stroke-width="3"/><path d="M290,110 C286,120 289,130 296,130 C303,130 306,120 296,110 Z" fill="#7FD1E8" stroke="#3E9BB8" stroke-width="3"/>',
    "puff": '<circle cx="70" cy="200" r="10" fill="#C9B6D8" opacity="0.7"/><circle cx="52" cy="212" r="14" fill="#C9B6D8" opacity="0.6"/><circle cx="40" cy="196" r="8" fill="#C9B6D8" opacity="0.5"/>',
    "droplet": '<path d="M300,150 C294,164 298,178 308,178 C318,178 322,164 308,150 Z" fill="#7FD1E8" stroke="#3E9BB8" stroke-width="3"/>',
    "droplet_x2": '<path d="M96,150 C90,164 94,178 104,178 C114,178 118,164 104,150 Z" fill="#7FD1E8" stroke="#3E9BB8" stroke-width="3"/><path d="M264,150 C258,164 262,178 272,178 C282,178 286,164 272,150 Z" fill="#7FD1E8" stroke="#3E9BB8" stroke-width="3"/>',
    "sparkle": '<path d="M300,90 L305,105 L320,110 L305,115 L300,130 L295,115 L280,110 L295,105 Z" fill="#FFD24C"/>',
    "question": '<text x="290" y="120" font-size="42" font-family="sans-serif" fill="#2B2B2B" font-weight="bold">?</text>',
    "exclaim_question": '<text x="278" y="120" font-size="38" font-family="sans-serif" fill="#E8483A" font-weight="bold">!?</text>',
}

BLUSH = '<ellipse cx="134" cy="172" rx="11" ry="7" fill="#FF8FA3" opacity="0.7"/><ellipse cx="226" cy="172" rx="11" ry="7" fill="#FF8FA3" opacity="0.7"/>'


def build_text(text):
    """대사를 몸통 위쪽에 Jua체로 굵게, 흰 테두리를 둘러 어떤 배경에서도 잘 읽히게 배치."""
    if not text:
        return ""
    # 글자 수가 많으면 자동으로 두 줄로 나눔(카카오 대사형 이모티콘 관례)
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
  <!-- 몸통·팔: 흰색으로 채워서 카카오톡 다크모드 배경에서도 실루엣이 살아있게 함
       (1차 시도는 fill:none이라 어두운 배경에서 거의 안 보이는 문제가 있었음 — 다듬으며 수정) -->
  <g filter="url(#dropshadow)">
    <g fill="#FFFFFF" stroke="#2B2B2B" stroke-width="9" stroke-linejoin="round" stroke-linecap="round">
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
