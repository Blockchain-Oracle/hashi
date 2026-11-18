import { qrModel } from '@/lib/brand-qr'

const INK = '#121111'
const VERMILION = '#FF2F00'
/** Modules of white around the code: the four the QR standard asks for. */
const QUIET = 4

/**
 * A QR code in Hashi's look: ink modules with softened corners on white, the three finder squares in vermilion
 * like hanko seal stamps, and the Hashi mark in the middle. Every choice was checked with two decoders (OpenCV and
 * ZXing) down to 15% size: round dots, gaps between modules and rounded finders each broke one of them, so the
 * modules touch and the finders stay square. Drawn as SVG on the server; no script.
 */
export function BrandQr({ value, size = 220, label }: { value: string; size?: number; label: string }) {
  const m = qrModel(value)
  const n = m.size + QUIET * 2
  const tile = m.mark.side - 0.8
  const tileAt = QUIET + m.mark.at + 0.4
  // The mark's glyph is drawn on a 24-unit grid; it fills 68% of the tile, centred.
  const glyph = (tile * 0.68) / 24
  const glyphAt = tileAt + tile * 0.16
  return (
    <svg viewBox={`0 0 ${n} ${n}`} width={size} height={size} role="img" aria-label={label} className="block">
      <rect width={n} height={n} rx={2.4} fill="#FFFFFF" />
      {m.dots.map(([c, r]) => (
        <rect key={`${c}-${r}`} x={QUIET + c} y={QUIET + r} width={1} height={1} rx={0.18} fill={INK} />
      ))}
      {m.finders.map(([c, r]) => {
        const x = QUIET + c
        const y = QUIET + r
        return (
          <g key={`f-${c}-${r}`}>
            <path fillRule="evenodd" fill={VERMILION} d={`M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5z`} />
            <rect x={x + 2} y={y + 2} width={3} height={3} fill={INK} />
          </g>
        )
      })}
      <rect x={tileAt} y={tileAt} width={tile} height={tile} rx={tile * 0.32} fill={VERMILION} />
      <g
        transform={`translate(${glyphAt} ${glyphAt}) scale(${glyph})`}
        fill="none"
        stroke="#FFFFFF"
        strokeLinecap="round"
      >
        <path d="M3 15.5C6 8.5 18 8.5 21 15.5" strokeWidth={2.4} />
        <path d="M8 11.2v4.3M12 9.9v5.6M16 11.2v4.3" strokeWidth={1.6} opacity={0.85} />
        <path d="M2.5 19.5h19" strokeWidth={2} opacity={0.7} />
      </g>
    </svg>
  )
}
