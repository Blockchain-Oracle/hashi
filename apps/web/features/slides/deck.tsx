'use client'

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  FullScreenIcon,
} from '@hugeicons/core-free-icons'
import type React from 'react'
import { type CSSProperties, type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/kit/icon'
import { cn } from '@/lib/utils'

/**
 * Hashi's Widget Factory deck as real slides: BCH BLAZE's template artwork (composited from Hashi's Google Slides
 * copy into public/slides) with the text, links and videos on top, at the deck's own positions. Every slide is a
 * 1920x1080 canvas; `u()` turns its pixels into container units, so the slide scales to any screen like a picture.
 */
const u = (px: number) => `${Number((px / 19.2).toFixed(4))}cqw`
/** Points as Google Slides sets them, on the 1920-wide canvas. */
const pt = (p: number) => u(p * 2.6667)
/** A Google Slides text box: positioned in canvas pixels, with its 0.1 in side and 0.05 in top insets. */
function at(x: number, y: number, w: number, h?: number, style?: CSSProperties): CSSProperties {
  return {
    position: 'absolute',
    left: u(x),
    top: u(y),
    width: u(w),
    height: h === undefined ? undefined : u(h),
    padding: `${u(10)} ${u(19)}`,
    ...style,
  }
}

const CRIMSON = '#860620'
const LINK = '#0097a7'
const MONT = 'var(--font-montserrat)'
const ROBOTO = 'var(--font-roboto)'

/** Slide artwork and pictures: already-sized files at fixed canvas positions, so a plain img is the right tool. */
function Pic({ alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { alt: string }) {
  // biome-ignore lint/performance/noImgElement: fixed slide artwork on a scaled canvas; next/image adds nothing here
  return <img decoding="async" alt={alt} {...props} />
}

function Bg({ src }: { src: string }) {
  return <Pic src={`/slides/${src}.webp`} alt="" className="absolute inset-0 size-full" decoding="async" />
}

function A({ href, children, style }: { href: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{ color: LINK, textDecoration: 'underline', ...style }}
    >
      {children}
    </a>
  )
}

function Bullets({ items, style }: { items: readonly (readonly [0 | 1, string])[]; style: CSSProperties }) {
  return (
    <ul
      style={{
        ...style,
        fontFamily: MONT,
        fontWeight: 700,
        fontSize: pt(22),
        lineHeight: 1.15,
        color: '#fff',
      }}
    >
      {items.map(([level, text]) => (
        <li
          key={text}
          className="grid"
          style={{ gridTemplateColumns: `${u(64)} 1fr`, paddingLeft: level ? u(64) : 0, marginBottom: u(8) }}
        >
          <span aria-hidden style={{ fontSize: level ? '0.8em' : '0.7em', lineHeight: level ? 1.45 : 1.65 }}>
            {level ? '○' : '●'}
          </span>
          <span>{text}</span>
        </li>
      ))}
    </ul>
  )
}

function Video({ id, active, title }: { id: string; active: boolean; title: string }) {
  return (
    <div style={{ ...at(288, 184.8, 1343.8, 755.9), padding: 0 }} className="bg-black">
      {active ? (
        <iframe
          className="size-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : null}
    </div>
  )
}

function VideoSlide({
  active,
  title,
  id,
  note,
}: {
  active: boolean
  title: string
  id: string
  note: string
}) {
  return (
    <>
      <Bg src="fire" />
      <h2
        style={at(242.4, 48.3, 1435.3, undefined, {
          fontFamily: MONT,
          fontWeight: 700,
          fontSize: pt(30),
          textAlign: 'center',
          color: '#fff',
        })}
      >
        {title}
      </h2>
      <Video id={id} active={active} title={`Hashi: ${title}`} />
      <p
        style={at(288, 953.3, 1343.8, undefined, {
          fontFamily: MONT,
          fontSize: pt(14),
          textAlign: 'center',
          color: '#fff',
        })}
      >
        <A href={`https://youtu.be/${id}`} style={{ fontWeight: 700 }}>
          youtu.be/{id}
        </A>
        {`  ·  ${note}`}
      </p>
    </>
  )
}

interface Slide {
  name: string
  body: (active: boolean) => ReactNode
}

const SLIDES: readonly Slide[] = [
  {
    name: 'Hashi',
    body: () => (
      <>
        <Bg src="title" />
        <h2
          style={at(161.5, 477, 836, undefined, {
            fontFamily: ROBOTO,
            fontWeight: 700,
            fontSize: pt(33),
            color: '#fff',
          })}
        >
          Hashi
        </h2>
        <p
          style={at(150.6, 635, 836, undefined, {
            fontFamily: ROBOTO,
            fontWeight: 700,
            fontSize: pt(20),
            color: '#fff',
          })}
        >
          Built by Blockchain Oracle
        </p>
        <span
          aria-hidden
          className="absolute rounded-full"
          style={{ left: u(167.5), top: u(945.5), width: u(52.7), height: u(52.7), background: CRIMSON }}
        />
        <Pic
          src="/slides/link.webp"
          alt=""
          className="absolute"
          style={{ left: u(161.7), top: u(941.7), width: u(57.7), height: u(57.7) }}
        />
        <p style={at(206.4, 924.3, 400, undefined, { fontFamily: MONT, fontSize: pt(16) })}>
          <A href="https://hashi.cash">hashi.cash</A>
        </p>
        <span
          aria-hidden
          className="absolute grid place-items-center rounded-full"
          style={{ left: u(500), top: u(945.5), width: u(52.7), height: u(52.7), background: CRIMSON }}
        >
          <svg viewBox="0 0 24 24" style={{ width: u(30), height: u(30) }} fill="#fff" aria-hidden>
            <path d="M21.6 3.2 2.9 10.4c-1.3.5-1.3 1.2-.2 1.6l4.8 1.5 1.8 5.6c.2.6.1.9.8.9.5 0 .7-.2 1-.5l2.3-2.3 4.9 3.6c.9.5 1.5.2 1.8-.8l3.2-15.1c.3-1.3-.5-1.9-1.7-1.5Zm-3.4 3.5-8.9 8.1-.4 3.6-1.6-5.2 10.6-6.7c.5-.3.9-.1.3.2Z" />
          </svg>
        </span>
        <p style={at(538.6, 924.3, 560, undefined, { fontFamily: MONT, fontSize: pt(16) })}>
          <A href="https://t.me/BlockchainOracle_dev">@BlockchainOracle_dev</A>
        </p>
        <Pic
          src="/slides/logo.webp"
          alt="Hashi"
          className="absolute"
          style={{ left: u(1038.6), top: u(110.3), width: u(787.2), height: u(787.2) }}
        />
      </>
    ),
  },
  {
    name: 'Dollars in, dollars out',
    body: () => (
      <>
        <Bg src="fire" />
        <div
          style={at(242.4, 114.7, 1435.3, undefined, {
            fontFamily: MONT,
            color: '#fff',
            textAlign: 'center',
            lineHeight: 1.15,
          })}
        >
          <h2 style={{ fontSize: pt(43), fontWeight: 400 }}>
            Hashi<b>!</b>
          </h2>
          <p style={{ fontSize: pt(35), marginTop: pt(35 * 1.15) }}>
            Dollars in, dollars out: USDC and USDT from eight chains to PUSD, MUSD or BCH on Bitcoin Cash, and
            back.
          </p>
          <p style={{ fontSize: pt(23), fontWeight: 700, marginTop: pt(35 * 1.15) }}>
            <A href="https://github.com/Blockchain-Oracle/hashi">github.com/Blockchain-Oracle/hashi</A>
          </p>
        </div>
      </>
    ),
  },
  {
    name: 'The Story of Hashi',
    body: () => (
      <>
        <Bg src="story" />
        <h2
          style={{
            position: 'absolute',
            left: u(252),
            top: u(89.4),
            height: u(83.5),
            lineHeight: u(83.5),
            fontFamily: ROBOTO,
            fontWeight: 700,
            fontSize: pt(25),
            color: '#fff',
          }}
        >
          The Story of Hashi
        </h2>
        <div
          style={at(167.2, 191, 815.3, 712.7, {
            fontFamily: MONT,
            fontWeight: 700,
            fontSize: pt(17),
            lineHeight: 1.15,
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: pt(17 * 1.15),
          })}
        >
          <p>
            Bitcoin Cash has its own dollars, PUSD and MUSD. The world's dollars are USDC and USDT on other
            chains, and no cross-chain service lists PUSD or MUSD.
          </p>
          <p>
            So we built one screen that prices every route through NEAR Intents, THORChain and Cauldron, and
            takes one approval either way through NEAR Intents.
          </p>
        </div>
        <Pic
          src="/slides/swap-card.webp"
          alt="Hashi's swap card: 50 USDC on Ethereum to 48.95 MUSD, every route priced"
          className="absolute"
          style={{ left: u(1155), top: u(215.3), width: u(529.4), height: u(688.4) }}
        />
      </>
    ),
  },
  {
    name: 'Benefits of Hashi',
    body: () => (
      <>
        <Bg src="list" />
        <h2
          style={at(166.3, 110.3, 438.4, 290.9, {
            fontFamily: ROBOTO,
            fontWeight: 700,
            fontSize: pt(29),
            lineHeight: 1.15,
            color: '#fff',
            paddingTop: u(10 + 29 * 2.6667 * 1.15),
          })}
        >
          Benefits of Hashi
        </h2>
        <Bullets
          style={at(812.9, 110.3, 1004.3, 816.8, { paddingTop: u(36) })}
          items={[
            [0, 'Eight chains in, Bitcoin Cash out'],
            [1, 'USDC or USDT in'],
            [1, 'PUSD, MUSD or BCH out, and back'],
            [0, 'Every fee shown before you sign'],
            [0, 'One approval each way'],
            [1, 'Close the tab: it resumes'],
          ]}
        />
      </>
    ),
  },
  {
    name: 'BCH Usage',
    body: () => (
      <>
        <Bg src="fire" />
        <div
          style={at(101, 40.6, 1718, undefined, {
            fontFamily: MONT,
            color: '#fff',
            textAlign: 'center',
            lineHeight: 1.15,
          })}
        >
          <h2 style={{ fontSize: pt(43) }}>
            BCH <b style={{ color: CRIMSON }}>Usage</b>
          </h2>
          <p style={{ fontSize: pt(25), marginTop: pt(10 * 1.15) }}>
            Swaps in end with a Cauldron trade by a contract that pays you, or sends it back.
          </p>
          <p style={{ fontSize: pt(25) }}>Swaps out: one Cauldron sale that pays the bridge.</p>
        </div>
        <Pic
          src="/slides/into.webp"
          alt="Into PUSD in one approval: your Base wallet pays NEAR Intents, NEAR Intents pays the swap contract, the contract trades on Cauldron and pays your Bitcoin Cash wallet"
          className="absolute"
          style={{ left: u(588.8), top: u(605.4), width: u(742.3), height: u(417) }}
        />
      </>
    ),
  },
  {
    name: 'How Hashi Makes Money',
    body: () => (
      <>
        <Bg src="list" />
        <h2
          style={at(166.3, 110.3, 438.4, 290.9, {
            fontFamily: ROBOTO,
            fontWeight: 700,
            fontSize: pt(29),
            lineHeight: 1.15,
            color: '#fff',
            paddingTop: u(10 + 29 * 2.6667 * 1.15),
          })}
        >
          How Hashi Makes Money
        </h2>
        <Bullets
          style={at(812.9, 110.3, 1004.3, 816.8, { paddingTop: u(36) })}
          items={[
            [0, 'A fee on every route, built into both bridges'],
            [1, 'NEAR Intents: an app fee on each quote'],
            [1, 'THORChain: an affiliate fee in the memo'],
            [0, "Hashi's tag already rides on every NEAR Intents swap"],
            [0, 'Next: inside Bitcoin Cash wallets and merchant checkouts'],
          ]}
        />
      </>
    ),
  },
  {
    name: 'The Vision for Hashi',
    body: () => (
      <>
        <Bg src="list" />
        <h2
          style={at(166.3, 110.3, 438.4, 290.9, {
            fontFamily: ROBOTO,
            fontWeight: 700,
            fontSize: pt(29),
            lineHeight: 1.15,
            color: '#fff',
            paddingTop: u(10 + 29 * 2.6667 * 1.15),
          })}
        >
          The Vision for Hashi
        </h2>
        <Bullets
          style={at(812.9, 110.3, 1004.3, 816.8, { paddingTop: u(36) })}
          items={[
            [0, 'Any dollar into Bitcoin Cash, in a few taps'],
            [1, 'One approval through THORChain too'],
            [1, 'More chains and carriers'],
            [0, 'New Bitcoin Cash dollars as they launch'],
            [0, 'Target: USDC to PUSD in under 5 min'],
          ]}
        />
      </>
    ),
  },
  {
    name: 'Watch the demo',
    body: (active) => (
      <VideoSlide
        active={active}
        title="Watch the demo"
        id="bbLQ44UAdBU"
        note="2:40, real swaps on mainnet"
      />
    ),
  },
  {
    name: 'Live on mainnet',
    body: (active) => (
      <VideoSlide
        active={active}
        title="Signed live on mainnet"
        id="ZGtYV9u5jW8"
        note="3:10, one swap signed in our own wallets"
      />
    ),
  },
  {
    name: 'Thank you',
    body: () => (
      <>
        <Bg src="thanks" />
        <h2
          style={at(310.2, 342.5, 1322.8, 181.6, {
            fontFamily: ROBOTO,
            fontWeight: 700,
            fontSize: pt(77),
            lineHeight: 1,
            color: '#fff',
            whiteSpace: 'nowrap',
          })}
        >
          THANK YOU!
        </h2>
        <Pic src="/slides/thanks-over.webp" alt="" className="absolute inset-0 size-full" decoding="async" />
        <p
          style={at(1422.6, 581.6, 472.4, undefined, {
            fontFamily: MONT,
            fontWeight: 700,
            fontSize: pt(8),
            textAlign: 'center',
            color: '#fff',
          })}
        >
          SCAN TO SEND TO HASHI
        </p>
        <Pic
          src="/slides/cashtokens-qr.webp"
          alt="QR code for Hashi's CashTokens address"
          className="absolute"
          style={{ left: u(1511.8), top: u(634.1), width: u(294), height: u(294) }}
        />
        <p
          style={at(1422.6, 934.4, 472.4, undefined, {
            fontFamily: 'var(--font-roboto-mono)',
            fontSize: pt(6),
            textAlign: 'center',
            color: '#e0e0e0',
            lineHeight: 1.3,
          })}
        >
          bitcoincash:
          <br />
          zrrac20n7tmqwysz2l6aqxyw5w6npqv9pssndrqjnh
        </p>
      </>
    ),
  },
]

const IDLE_MS = 2500

/** The presenter: one slide at a time, fitted to the screen; arrows, space, a click or a swipe move on. */
export function Deck({ googleUrl, fonts }: { googleUrl?: string | undefined; fonts: string }) {
  const [index, setIndex] = useState(0)
  const [chrome, setChrome] = useState(true)
  const idle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const touch = useRef<number | null>(null)
  const last = SLIDES.length - 1

  const go = useCallback(
    (n: number) => {
      const next = Math.max(0, Math.min(last, n))
      setIndex(next)
      history.replaceState(null, '', next === 0 ? location.pathname : `#${next + 1}`)
    },
    [last],
  )

  const wake = useCallback(() => {
    setChrome(true)
    clearTimeout(idle.current)
    idle.current = setTimeout(() => setChrome(false), IDLE_MS)
  }, [])

  useEffect(() => {
    const n = Number(location.hash.slice(1))
    if (Number.isInteger(n) && n >= 1 && n <= SLIDES.length) setIndex(n - 1)
    wake()
    return () => clearTimeout(idle.current)
  }, [wake])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) go(index + 1)
      else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) go(index - 1)
      else if (e.key === 'Home') go(0)
      else if (e.key === 'End') go(last)
      else if (e.key === 'f' || e.key === 'F') fullscreen()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, index, last])

  return (
    <main
      className={cn(
        'fixed inset-0 grid select-none place-items-center overflow-hidden bg-black text-white',
        fonts,
        !chrome && 'cursor-none',
      )}
      onPointerMove={wake}
      onTouchStart={(e) => {
        touch.current = e.touches[0]?.clientX ?? null
      }}
      onTouchEnd={(e) => {
        const start = touch.current
        const end = e.changedTouches[0]?.clientX
        touch.current = null
        if (start === null || end === undefined || Math.abs(end - start) < 40) return
        go(end < start ? index + 1 : index - 1)
      }}
    >
      <h1 className="sr-only">Hashi · Widget Factory deck</h1>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard moves slides from anywhere (arrows, space, Home, End), handled on window */}
      <section
        aria-roledescription="carousel"
        aria-label="Slides"
        className="relative overflow-hidden bg-black"
        style={{
          width: 'min(100vw, calc(100dvh * 16 / 9))',
          aspectRatio: '16 / 9',
          containerType: 'inline-size',
        }}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('a, button, iframe')) return
          const box = e.currentTarget.getBoundingClientRect()
          go(e.clientX - box.left < box.width / 4 ? index - 1 : index + 1)
        }}
      >
        {SLIDES.map((slide, i) => (
          <article
            key={slide.name}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${SLIDES.length}: ${slide.name}`}
            aria-hidden={i !== index}
            inert={i !== index}
            className="absolute inset-0 transition-opacity duration-300 ease-out motion-reduce:transition-none"
            style={{ opacity: i === index ? 1 : 0 }}
          >
            {slide.body(i === index)}
          </article>
        ))}
      </section>

      <div
        className="absolute inset-x-0 bottom-0 h-[3px] bg-white/10"
        aria-hidden
        style={{ opacity: chrome ? 1 : 0.4 }}
      >
        <div
          className="h-full transition-[width] duration-300"
          style={{ width: `${((index + 1) / SLIDES.length) * 100}%`, background: CRIMSON }}
        />
      </div>

      <nav
        aria-label="Slide controls"
        onFocus={wake}
        className={cn(
          'absolute bottom-4 left-4 flex items-center gap-1 rounded-full bg-[#1b1b1b]/90 p-1 text-sm shadow-lg ring-1 ring-white/10 backdrop-blur transition-opacity duration-300',
          chrome ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={index === 0}
          aria-label="Previous slide"
          className="grid size-9 place-items-center rounded-full hover:bg-white/10 disabled:opacity-30"
        >
          <Icon icon={ArrowLeft01Icon} />
        </button>
        <span className="min-w-14 text-center font-mono text-white/80 tabular-nums" aria-live="polite">
          {index + 1} / {SLIDES.length}
        </span>
        <button
          type="button"
          onClick={() => go(index + 1)}
          disabled={index === last}
          aria-label="Next slide"
          className="grid size-9 place-items-center rounded-full hover:bg-white/10 disabled:opacity-30"
        >
          <Icon icon={ArrowRight01Icon} />
        </button>
        <span className="mx-1 h-5 w-px bg-white/15" aria-hidden />
        <button
          type="button"
          onClick={fullscreen}
          aria-label="Full screen (F)"
          className="grid size-9 place-items-center rounded-full hover:bg-white/10"
        >
          <Icon icon={FullScreenIcon} />
        </button>
        {googleUrl ? (
          <a
            href={googleUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-white/80 hover:bg-white/10 hover:text-white max-sm:hidden"
          >
            Google Slides <Icon icon={ArrowUpRight01Icon} size={14} />
          </a>
        ) : null}
        <a href="/" className="rounded-full px-3 py-2 text-white/80 hover:bg-white/10 hover:text-white">
          hashi.cash
        </a>
      </nav>
    </main>
  )
}

function fullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen()
  else void document.documentElement.requestFullscreen?.()
}
