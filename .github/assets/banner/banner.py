"""The README banner, drawn as SVG in light and dark from Hashi's own type, mark, colours and a real capture of the
swap card (.github/assets/captures/swap-card-{light,dark}.png, a live quote of 17 Nov 2026, 00:21 UTC).

    python3 .github/assets/banner/banner.py           # writes banner-{light,dark}.svg beside this file
    uv run --with playwright python .github/render_svg.py .github/assets/banner/banner-light.svg .github/assets/banner-light.png
    uv run --with playwright python .github/render_svg.py .github/assets/banner/banner-dark.svg .github/assets/banner-dark.png
"""
from pathlib import Path

HERE = Path(__file__).resolve().parent
FONTS = HERE.parents[2] / "docs-site" / "assets" / "fonts"
W, H = 1280, 640

THEMES = {
    "light": dict(bg="#FFFAF5", text="#121111", muted="#6B6563", rim="#E4DDD6", accent="#FF2F00", shadow="#7A2A10", shadow_a=0.22),
    "dark": dict(bg="#0F0E0E", text="#FFFAF5", muted="#A29C97", rim="#2E2B2A", accent="#FF4419", shadow="#000000", shadow_a=0.6),
}


def svg(theme: str) -> str:
    t = THEMES[theme]
    font = lambda name: (FONTS / name).as_uri()  # noqa: E731
    # The card: 1072 x 1394 px at 2x, shown 430 px wide on the right, bleeding off the bottom edge.
    card_w = 430
    card_h = card_w * 1394 / 1072
    card_x, card_y = W - card_w - 96, 64
    # The capture carries its page background; only the card itself is shown: 28 px of page around a 480 x 641 card
    # (2x), corners 2rem.
    k = card_w / 1072
    cx, cy, cw, ch, cr = card_x + 56 * k, card_y + 56 * k, 960 * k, 1282 * k, 64 * k
    # The drum bridge of the mark, drawn wide under the words: the one vermilion line.
    arch = f'M 80 {H - 38} C 270 {H - 128}, 560 {H - 128}, 750 {H - 38}'
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
  <style>
    @font-face {{ font-family: "Figtree"; font-weight: 400; src: url("{font('Figtree-Regular.ttf')}"); }}
    @font-face {{ font-family: "Figtree"; font-weight: 500; src: url("{font('Figtree-Medium.ttf')}"); }}
    @font-face {{ font-family: "Geist Mono"; font-weight: 500; src: url("{font('GeistMono-Medium.ttf')}"); }}
    .label {{ font: 500 15px "Geist Mono"; letter-spacing: 0.08em; fill: {t['muted']}; }}
    .hero {{ font: 500 78px "Figtree"; letter-spacing: -3.4px; fill: {t['text']}; }}
    .sub {{ font: 400 25px "Figtree"; fill: {t['muted']}; }}
  </style>
  <defs>
    <clipPath id="card"><rect x="{cx:.1f}" y="{cy:.1f}" width="{cw:.1f}" height="{ch:.1f}" rx="{cr:.1f}"/></clipPath>
    <filter id="lift" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="{t['shadow']}" flood-opacity="{t['shadow_a']}"/>
    </filter>
  </defs>
  <rect width="{W}" height="{H}" fill="{t['bg']}"/>
  <path d="M 48 {H - 26} H 782" stroke="{t['rim']}" stroke-width="4" stroke-linecap="round"/>
  <path d="{arch}" fill="none" stroke="{t['accent']}" stroke-width="9" stroke-linecap="round"/>

  <g transform="translate(96 108)">
    <rect width="56" height="56" rx="18" fill="{t['accent']}"/>
    <g transform="translate(9 9) scale(1.6)" fill="none" stroke="#FFFFFF" stroke-linecap="round">
      <path d="M3 15.5C6 8.5 18 8.5 21 15.5" stroke-width="2.4"/>
      <path d="M8 11.2v4.3M12 9.9v5.6M16 11.2v4.3" stroke-width="1.6" opacity="0.85"/>
      <path d="M2.5 19.5h19" stroke-width="2" opacity="0.7"/>
    </g>
    <text x="76" y="38" class="label">HASHI · 橋 · THE BRIDGE</text>
  </g>
  <text x="96" y="262" class="hero">Dollars in,</text>
  <text x="96" y="346" class="hero">dollars out.</text>
  <text x="98" y="402" class="sub">USDC and USDT from eight chains to PUSD, MUSD</text>
  <text x="98" y="436" class="sub">or BCH on Bitcoin Cash, and back.</text>
  <text x="98" y="490" class="label">NEAR INTENTS · THORCHAIN · CAULDRON · WIZARDCONNECT</text>

  <rect x="{cx:.1f}" y="{cy:.1f}" width="{cw:.1f}" height="{ch:.1f}" rx="{cr:.1f}" fill="{t['bg']}" filter="url(#lift)"/>
  <image href="../captures/swap-card-{theme}.png" x="{card_x}" y="{card_y}" width="{card_w}" height="{card_h:.0f}" clip-path="url(#card)"/>
</svg>
"""


for name in THEMES:
    (HERE / f"banner-{name}.svg").write_text(svg(name))
    print(f"banner-{name}.svg")
