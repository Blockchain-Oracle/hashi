/**
 * The completion moment (feature 8): a short two-note chime made in the browser (no audio file), and a buzz on
 * phones that support it. Browsers only allow sound after a person has interacted with the page, so the audio is
 * unlocked on the click that starts a swap and played when it finishes.
 */

let audio: AudioContext | undefined

/** Call from a click handler (for example "Start swap") so a later chime is allowed to play. */
export function unlockSound(): void {
  if (typeof window === 'undefined') return
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
  } catch {
    // No Web Audio: the swap simply finishes silently.
  }
}

function tone(context: AudioContext, frequency: number, start: number, length: number) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(0.16, start + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length)
  oscillator.connect(gain).connect(context.destination)
  oscillator.start(start)
  oscillator.stop(start + length + 0.05)
}

export type Moment = 'success' | 'attention'

/** A rising fifth for success (E5 → B5); a single soft low note when something needs the person. */
export function celebrate(moment: Moment = 'success'): void {
  if (typeof window === 'undefined') return
  if (audio && audio.state === 'running') {
    const t = audio.currentTime + 0.02
    if (moment === 'success') {
      tone(audio, 659.25, t, 0.32)
      tone(audio, 987.77, t + 0.11, 0.5)
    } else {
      tone(audio, 440, t, 0.4)
    }
  }
  if ('vibrate' in navigator) navigator.vibrate(moment === 'success' ? [18, 60, 28] : [40])
}
