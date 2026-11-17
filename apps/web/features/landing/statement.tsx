import Image from 'next/image'
import { TextReveal } from '@/components/ui/text-reveal'
import { BridgeDiagram } from './bridge-diagram'

/**
 * A scroll-lit statement (Magic UI text reveal: each word lights up as you scroll), then the bridge in one
 * picture on a soft pastel field (a Paper Shaders frame).
 */
export function Statement() {
  return (
    <section aria-label="What Hashi does">
      <TextReveal className="h-[230vh]">
        Most of the world’s dollars live on Ethereum, Base and Solana. Bitcoin Cash has dollars of its own,
        PUSD and MUSD. Hashi is the bridge between them.
      </TextReveal>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="relative isolate overflow-hidden rounded-[2.75rem] px-5 py-14 shadow-float ring-1 ring-border sm:px-12 sm:py-16">
          <Image
            src="/landing/pastel-field.webp"
            alt=""
            fill
            sizes="(min-width: 1152px) 1152px, 100vw"
            className="-z-10 object-cover dark:opacity-[0.08]"
          />
          <div className="mx-auto mb-10 flex max-w-xl flex-col items-center gap-3 text-center">
            <p className="label-mono">/ Eight chains, one bridge</p>
            <h2 className="text-balance font-normal text-[2.25rem] leading-[1.1] tracking-[-0.04em] sm:text-[2.75rem]">
              From wherever your dollars are, to Bitcoin Cash.
            </h2>
          </div>
          <BridgeDiagram />
        </div>
      </div>
    </section>
  )
}
