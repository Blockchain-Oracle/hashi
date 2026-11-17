import Image from 'next/image'
import Link from 'next/link'
import { BlurInWords } from '@/components/kit/blur-in-words'
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from '@/components/ui/accordion'
import { Iphone } from '@/components/ui/iphone'
import { Meteors } from '@/components/ui/meteors'
import { TextReveal } from '@/components/ui/text-reveal'
import { BridgeDiagram } from '@/features/landing/bridge-diagram'

/**
 * The landing page's own parts: the CSS blur-in headline, the bridge beams, the phone frame with the swap screen
 * (Magic UI iPhone), the scroll-lit statement (Magic UI text reveal), meteors, the FAQ accordion. The artwork itself
 * (sky, dawn, pastel field, swap screen) is made on /dev/art.
 */
export function LandingDemo() {
  return (
    <div className="grid gap-4">
      <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
        <BlurInWords as="p" text="Dollars in, dollars out." className="text-display" />
      </div>
      <div className="rounded-3xl border border-border bg-card px-4 py-10 shadow-card">
        <BridgeDiagram />
      </div>
      <div className="grid gap-4 md:grid-cols-[18rem_1fr]">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <Iphone
            className="[mask-image:linear-gradient(to_bottom,black_76%,transparent_93%)]"
            screen={
              <>
                <Image
                  src="/landing/swap-screen.webp"
                  alt=""
                  fill
                  sizes="240px"
                  className="object-cover object-top dark:hidden"
                />
                <Image
                  src="/landing/swap-screen-dark.webp"
                  alt=""
                  fill
                  sizes="240px"
                  className="hidden object-cover object-top dark:block"
                />
              </>
            }
          />
        </div>
        <div className="flex flex-col justify-between gap-6 rounded-3xl border border-border bg-card p-6 shadow-card">
          <p className="text-muted-foreground text-sm">
            Phone frame (Magic UI iPhone, recoloured to ink) with the live swap screen captured on /dev/art in
            both themes, fading into the page below the card.
          </p>
          <Link href="/dev/art" className="text-sm underline underline-offset-4">
            Landing artwork sources (/dev/art)
          </Link>
        </div>
      </div>
      <div className="rounded-3xl border border-border bg-card shadow-card">
        <p className="label-mono px-6 pt-6">
          Text reveal (Magic UI): lights word by word as the page scrolls
        </p>
        <TextReveal className="h-[160vh]">
          Most of the world’s dollars live on Ethereum, Base and Solana. Hashi is the bridge.
        </TextReveal>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="dark relative h-56 overflow-hidden rounded-3xl bg-[#121111] text-foreground">
          <Meteors number={10} className="bg-white/60 [&>div]:from-white/40" />
          <p className="absolute inset-x-0 bottom-6 text-center text-sm">Meteors (Magic UI, CSS only)</p>
        </div>
        <Accordion className="rounded-3xl border border-border bg-card px-5">
          {['What does it cost?', 'How long does a swap take?'].map((q) => (
            <AccordionItem key={q} value={q} className="border-border border-b last:border-b-0">
              <AccordionTrigger className="py-4 font-medium">{q}</AccordionTrigger>
              <AccordionPanel className="pb-4 text-muted-foreground">
                Specimen answer (the real ones are on the landing page).
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  )
}
