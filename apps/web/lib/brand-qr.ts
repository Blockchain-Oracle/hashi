import qrcode from 'qrcode-generator'

/**
 * Hashi's QR code as a drawing model, shared by the app (components/kit/brand-qr.tsx) and the README and deck
 * image (.github/assets/qr/qr.mts): which modules are dark, where the three finder squares sit, and the square in
 * the middle left clear for the Hashi mark. Error correction H recovers 30% of the code, far more than the mark
 * covers. No path aliases here, so Node can run it directly for the image.
 */
export interface QrModel {
  /** Modules per side, without the quiet zone. */
  size: number
  /** Dark data modules as [column, row]; the finders and the mark's square are left out. */
  dots: [number, number][]
  /** Top-left module of each 7 × 7 finder square. */
  finders: [number, number][]
  /** The square kept clear for the mark: its first module and its side, in modules. */
  mark: { at: number; side: number }
}

export function qrModel(text: string): QrModel {
  const qr = qrcode(0, 'H')
  qr.addData(text, 'Byte')
  qr.make()
  const size = qr.getModuleCount()
  const finders: [number, number][] = [
    [0, 0],
    [size - 7, 0],
    [0, size - 7],
  ]
  // An odd side about a fifth of the code, centred, so the mark sits on whole modules.
  const side = Math.round(size * 0.2) | 1
  const at = (size - side) / 2
  const inFinder = (c: number, r: number) =>
    finders.some(([x, y]) => c >= x && c < x + 7 && r >= y && r < y + 7)
  const inMark = (c: number, r: number) => c >= at && c < at + side && r >= at && r < at + side
  const dots: [number, number][] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (qr.isDark(r, c) && !inFinder(c, r) && !inMark(c, r)) dots.push([c, r])
    }
  }
  return { size, dots, finders, mark: { at, side } }
}
