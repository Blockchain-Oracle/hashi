// Hashi's CashTokens QR as an image for the README and the deck, from the same model as the app's code
// (apps/web/lib/brand-qr.ts). Node runs this TypeScript directly:
//
//   node .github/assets/qr/qr.mts bitcoincash:z…            # writes cashtokens-qr.svg beside this file,
//                                                            # and the same drawing into docs-site/public
//   uv run --with playwright python .github/render_svg.py .github/assets/qr/cashtokens-qr.svg .github/assets/cashtokens-qr.png --scale 24 --transparent
import { writeFileSync } from 'node:fs'
import { qrModel } from '../../../apps/web/lib/brand-qr.ts'

const value = process.argv[2]
if (!value?.startsWith('bitcoincash:z')) throw new Error('Pass the token-aware address, bitcoincash:z…')
const m = qrModel(value)
const QUIET = 4
const n = m.size + QUIET * 2
const tile = m.mark.side - 0.8
const tileAt = QUIET + m.mark.at + 0.4
const glyph = (tile * 0.68) / 24
const glyphAt = tileAt + tile * 0.16
const dots = m.dots.map(([c, r]) => `<rect x="${QUIET + c}" y="${QUIET + r}" width="1" height="1" rx="0.18"/>`).join('')
const finders = m.finders
  .map(
    ([c, r]) =>
      `<path fill-rule="evenodd" fill="#FF2F00" d="M${QUIET + c} ${QUIET + r}h7v7h-7zM${QUIET + c + 1} ${QUIET + r + 1}v5h5v-5z"/>` +
      `<rect x="${QUIET + c + 2}" y="${QUIET + r + 2}" width="3" height="3" fill="#121111"/>`,
  )
  .join('')
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${n}" height="${n}">
<title>QR code for ${value}</title>
<rect width="${n}" height="${n}" rx="2.4" fill="#FFFFFF"/>
<g fill="#121111">${dots}</g>
${finders}
<rect x="${tileAt}" y="${tileAt}" width="${tile}" height="${tile}" rx="${tile * 0.32}" fill="#FF2F00"/>
<g transform="translate(${glyphAt} ${glyphAt}) scale(${glyph})" fill="none" stroke="#FFFFFF" stroke-linecap="round">
<path d="M3 15.5C6 8.5 18 8.5 21 15.5" stroke-width="2.4"/>
<path d="M8 11.2v4.3M12 9.9v5.6M16 11.2v4.3" stroke-width="1.6" opacity="0.85"/>
<path d="M2.5 19.5h19" stroke-width="2" opacity="0.7"/>
</g>
</svg>
`
writeFileSync(new URL('./cashtokens-qr.svg', import.meta.url), svg)
// The docs are their own project (own lockfile, own Docker context), so they show this drawing rather than run the
// encoder; their address lives in docs-site/lib/site.ts.
writeFileSync(new URL('../../../docs-site/public/cashtokens-qr.svg', import.meta.url), svg)
console.log(`cashtokens-qr.svg: ${m.size} modules, ${m.dots.length} dots`)
