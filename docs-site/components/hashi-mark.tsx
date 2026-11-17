/**
 * Hashi's mark, the same as the app's: a glossy vermilion tile holding an arched bridge over a waterline, the drum
 * bridges of Japanese gardens, which is what 橋 (hashi) draws.
 */
export function HashiMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={`relative inline-flex shrink-0 items-center justify-center text-white ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        backgroundImage: "linear-gradient(225deg, #ff5a2a, #ff2f00)",
        boxShadow:
          "inset 0 2px 1px rgb(255 255 255 / 0.5), inset 0 0.6px 0.6px -1.25px rgb(255 255 255 / 0.72), 0 6px 14px -8px rgb(255 47 0 / 0.55)",
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" style={{ width: "68%", height: "68%" }}>
        <path d="M3 15.5C6 8.5 18 8.5 21 15.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <path
          d="M8 11.2v4.3M12 9.9v5.6M16 11.2v4.3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path d="M2.5 19.5h19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      </svg>
    </span>
  )
}
