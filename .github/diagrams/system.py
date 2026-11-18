"""Hashi's system map, drawn by hand as SVG in light and dark (Mermaid cannot hold this layout).

    python3 .github/diagrams/system.py            # writes .github/diagrams/system-{light,dark}.svg
    then render to PNG at 2x (see README.md).

Three bands: Hashi in the browser on top; your dollars' path across the middle, numbered; the helpers below, each
under the step it serves. Into PUSD or MUSD the bridge pays a contract made for the swap, which Hashi trades with the
swap's own key; the way back is one Cauldron sale that pays the bridge.
"""
from pathlib import Path

W, H = 1600, 840
# Relative to the SVGs written beside this file, so the render works from any checkout.
FONTS = "../../docs-site/assets/fonts"

THEMES = {
    "light": dict(bg="#FFFAF5", panel="#FBF6F0", box="#FFFFFF", text="#121111", muted="#6B6563", line="#121111",
                  dash="#9A938F", rim="#E4DDD6", accent="#FF2F00", accent_text="#FFFFFF"),
    "dark": dict(bg="#0F0E0E", panel="#141313", box="#1B1A19", text="#FFFAF5", muted="#A29C97", line="#FFFAF5",
                 dash="#6E6864", rim="#2E2B2A", accent="#FF4419", accent_text="#FFFFFF"),
}


def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def box(x, y, w, h, title, sub, t, strong=False, pill=False):
    r = h / 2 if pill else 16
    stroke = t["accent"] if strong else t["rim"]
    sw = 2 if strong else 1.5
    lines = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{t["box"]}" stroke="{stroke}" stroke-width="{sw}"/>']
    cy = y + h / 2
    if sub:
        lines.append(f'<text x="{x + w / 2}" y="{cy - 6}" text-anchor="middle" class="t">{esc(title)}</text>')
        lines.append(f'<text x="{x + w / 2}" y="{cy + 19}" text-anchor="middle" class="s">{esc(sub)}</text>')
    else:
        lines.append(f'<text x="{x + w / 2}" y="{cy + 6}" text-anchor="middle" class="t">{esc(title)}</text>')
    return "\n".join(lines)


def label(x, y, text, anchor="start", bg=None):
    patch = f'<rect x="{x - 8}" y="{y - 16}" width="{len(text) * 9.4 + 16}" height="22" fill="{bg}"/>' if bg else ""
    return patch + f'<text x="{x}" y="{y}" text-anchor="{anchor}" class="l">{esc(text)}</text>'


def svg(t):
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">']
    out.append(f"""<style>
@font-face {{ font-family: Figtree; font-weight: 400; src: url("{FONTS}/Figtree-Regular.ttf"); }}
@font-face {{ font-family: Figtree; font-weight: 500; src: url("{FONTS}/Figtree-Medium.ttf"); }}
@font-face {{ font-family: GeistMono; src: url("{FONTS}/GeistMono-Medium.ttf"); }}
.t {{ font: 500 19px Figtree; fill: {t["text"]}; letter-spacing: -0.3px; }}
.s {{ font: 400 16px Figtree; fill: {t["muted"]}; }}
.l {{ font: 500 13px GeistMono; fill: {t["muted"]}; letter-spacing: 1.4px; }}
.e {{ font: 500 15px Figtree; fill: {t["text"]}; }}
.n {{ font: 500 15px GeistMono; fill: {t["accent_text"]}; }}
</style>
<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
    <path d="M0 0 L10 5 L0 10 z" fill="{t["line"]}"/>
  </marker>
  <marker id="dot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
    <path d="M0 0 L10 5 L0 10 z" fill="{t["dash"]}"/>
  </marker>
</defs>
<rect width="{W}" height="{H}" fill="{t["bg"]}"/>""")

    # Band A: Hashi, in your browser.
    ax, ay, aw, ah = 40, 40, W - 80, 176
    out.append(f'<rect x="{ax}" y="{ay}" width="{aw}" height="{ah}" rx="22" fill="{t["panel"]}" stroke="{t["rim"]}" stroke-width="1.5"/>')
    out.append(label(ax + 26, ay + 34, "/ HASHI, IN YOUR BROWSER"))
    bw, bh, by = 400, 92, ay + 58
    xs = [ax + 40, ax + (aw - bw) / 2, ax + aw - 40 - bw]
    out.append(box(xs[0], by, bw, bh, "Swap screen", "pair · amount · live routes · review", t))
    out.append(box(xs[1], by, bw, bh, "Route engine", "prices every route · ranks by what you keep", t))
    out.append(box(xs[2], by, bw, bh, "Swap runner", "one step at a time · saved in this browser", t))
    for a, b in ((xs[0] + bw, xs[1]), (xs[1] + bw, xs[2])):
        out.append(f'<line x1="{a + 6}" y1="{by + bh / 2}" x2="{b - 8}" y2="{by + bh / 2}" stroke="{t["line"]}" stroke-width="2" marker-end="url(#arrow)"/>')

    # Band B: your dollars, numbered.
    my, mh, mw = 352, 112, 254
    gap = (W - 80 - 5 * mw) / 4
    mx = [40 + i * (mw + gap) for i in range(5)]
    nodes = [
        ("Your EVM or Solana wallet", "USDC · USDT · eight chains"),
        ("NEAR Intents or THORChain", "carries them as BCH"),
        ("Your swap contract", "pays you at least the floor"),
        ("Cauldron", "for PUSD or MUSD"),
    ]
    for i, (title, sub) in enumerate(nodes):
        out.append(box(mx[i], my, mw, mh, title, sub, t, strong=True))
    out.append(box(mx[4], my + 10, mw, mh - 20, "PUSD · MUSD", "in your own wallet", t, strong=True, pill=True))
    steps = ["deposit", "BCH", "swap", "tokens"]
    for i, word in enumerate(steps):
        x1, x2, y = mx[i] + mw + 6, mx[i + 1] - 8, my + mh / 2
        out.append(f'<line x1="{x1}" y1="{y}" x2="{x2}" y2="{y}" stroke="{t["line"]}" stroke-width="3" marker-end="url(#arrow)"/>')
        cx = (x1 + x2) / 2
        out.append(f'<circle cx="{cx}" cy="{y - 26}" r="13" fill="{t["accent"]}"/>')
        out.append(f'<text x="{cx}" y="{y - 21}" text-anchor="middle" class="n">{i + 1}</text>')
        out.append(f'<text x="{cx}" y="{y + 30}" text-anchor="middle" class="e">{word}</text>')

    # Band A → B: what Hashi does at each step (dashed, down from the panel).
    drops = [(0, "your one approval"), (1, "quote · status"), (2, "signs with the swap's key"), (3, "quote · build")]
    for i, word in drops:
        x = mx[i] + mw / 2
        out.append(f'<line x1="{x}" y1="{ay + ah}" x2="{x}" y2="{my - 6}" stroke="{t["dash"]}" stroke-width="1.6" stroke-dasharray="5 6" marker-end="url(#dot)"/>')
        out.append(f'<rect x="{x - 92}" y="{ay + ah + 26}" width="184" height="28" rx="14" fill="{t["bg"]}"/>')
        out.append(f'<text x="{x}" y="{ay + ah + 45}" text-anchor="middle" class="s">{word}</text>')

    # Band C: the helpers, each under what it serves.
    cy0 = 610
    helpers = [
        (0, "Reown AppKit", "connects EVM and Solana wallets"),
        (1, "Hashi relayer", "Base gas for USDC to NEAR"),
        (2, "Hashi keeper", "sends unfinished BCH back"),
        (3, "Electrum servers", "read coins · broadcast trades"),
        (4, "WizardConnect", "your wallet · signs the way back"),
    ]
    for i, title, sub in helpers:
        x = mx[i]
        out.append(box(x, cy0, mw, 92, title, sub, t))
        target = mx[i] + mw / 2
        if i == 3:
            # Electrum serves the Bitcoin Cash wallet's coins and the Cauldron trade's broadcast.
            out.append(f'<path d="M{x + mw / 2} {cy0} L{x + mw / 2} {my + mh + 8}" stroke="{t["dash"]}" stroke-width="1.6" stroke-dasharray="5 6" fill="none" marker-end="url(#dot)"/>')
            continue
        out.append(f'<line x1="{x + mw / 2}" y1="{cy0}" x2="{target}" y2="{my + mh + 8}" stroke="{t["dash"]}" stroke-width="1.6" stroke-dasharray="5 6" marker-end="url(#dot)"/>')

    out.append(label(40, my - 30, "/ YOUR DOLLARS, INTO BITCOIN CASH (BACK: ONE SALE THAT PAYS THE BRIDGE)", bg=t["bg"]))
    out.append(label(40, cy0 - 26, "/ ALSO USED", bg=t["bg"]))

    # Footer line.
    out.append(f'<text x="40" y="{H - 40}" class="s">Hashi never holds the money: you approve what leaves your wallets, and the swap contract pays you at least the floor or sends the BCH back.</text>')
    out.append("</svg>")
    return "\n".join(out)


if __name__ == "__main__":
    here = Path(__file__).parent
    for name, theme in THEMES.items():
        (here / f"system-{name}.svg").write_text(svg(theme))
    print("wrote system-light.svg, system-dark.svg")
