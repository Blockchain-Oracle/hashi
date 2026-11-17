"""Render an SVG (with its fonts and images) to PNG through Chromium, so text uses the real brand fonts.

    uv run --with playwright python .github/render_svg.py <in.svg> <out.png> [--scale 2]

Used for the README banner (.github/assets/banner/) and the system map (.github/diagrams/system.py).
"""
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

src, out = Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve()
scale = float(sys.argv[sys.argv.index("--scale") + 1]) if "--scale" in sys.argv else 2.0
head = src.read_text()[:600]
w, h = (int(float(v)) for v in re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', head).groups())
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=scale)
    page.goto(src.as_uri())
    page.wait_for_timeout(600)
    page.screenshot(path=str(out), clip={"x": 0, "y": 0, "width": w, "height": h})
    browser.close()
print(f"{out.name}: {int(w * scale)}x{int(h * scale)}")
