import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from '@/components/ui/accordion'

const QUESTIONS: { q: string; a: string }[] = [
  {
    q: 'What is Hashi?',
    a: 'A bridge for dollars between other chains and Bitcoin Cash. Bring USDC or USDT from Base, Ethereum, Arbitrum, Optimism, Polygon, Avalanche, BNB Chain or Solana and receive PUSD, MUSD or BCH on Bitcoin Cash, or go the other way.',
  },
  {
    q: 'Does Hashi hold my money?',
    a: 'No. Your wallets approve every step. While a swap runs, your deposit is with the bridge you chose (NEAR Intents or THORChain) until it is delivered or refunded, and the Cauldron trade happens straight from your own Bitcoin Cash wallet.',
  },
  {
    q: 'What does it cost?',
    a: 'Hashi adds no fee of its own. You pay the bridge’s fee, Cauldron’s 0.1% router fee and its pools’ 0.3% fee, and the network fee on each chain. Every route shows the total in dollars, gas included, before you approve anything.',
  },
  {
    q: 'How long does a swap take?',
    a: 'Into Bitcoin Cash: usually a few minutes once your deposit confirms, plus seconds for the Cauldron swap. Out of Bitcoin Cash: the bridge waits for one Bitcoin Cash block, about 10 minutes on average, then pays out. Each route shows its own estimate.',
  },
  {
    q: 'Why do I need two wallets?',
    a: 'Your dollars live on one chain and PUSD or MUSD on Bitcoin Cash, so each side has its own wallet. WalletConnect connects the first (MetaMask, Phantom, Rabby, Coinbase Wallet and hundreds more); WizardConnect connects the second (Selene, Paytaca, Cashonize, or Electron Cash with its plugin).',
  },
  {
    q: 'What are PUSD and MUSD?',
    a: 'Dollar stablecoins native to Bitcoin Cash, issued as CashTokens. PUSD (ParyonUSD) is borrowed against BCH and can be redeemed for BCH collateral. MUSD comes from the Moria protocol, which mints it against BCH collateral.',
  },
  {
    q: 'What happens if something goes wrong?',
    a: 'If the price moves past your slippage, or a deposit arrives after its deadline, the bridge refunds it to your own address. Every swap is saved in your browser and can be reopened to see each step and its explorer links.',
  },
  {
    q: 'Is there a minimum amount?',
    a: 'Each bridge sets its own minimum. Hashi shows it live next to the route and fills it in with one click when an amount is too small.',
  },
  {
    q: 'Can the money arrive at a different address?',
    a: 'Yes, for plain BCH and when coming out of Bitcoin Cash: paste the address in settings, and Hashi checks it belongs to the right chain and is not a token contract. PUSD and MUSD arrive in your connected Bitcoin Cash wallet, because that wallet signs the Cauldron swap.',
  },
  {
    q: 'Do I need ETH to pay for gas?',
    a: 'Usually, yes: a small amount of the paying chain’s coin. For USDC on Base through NEAR Intents, Hashi can pay the gas for you when its relayer is funded: you sign an authorisation instead of sending a transaction.',
  },
]

/** Questions people ask before moving money, in plain words (coss ui's accordion, on Base UI). */
export function Faq() {
  return (
    <section id="faq" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 pt-28 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="flex flex-col gap-3 self-start lg:sticky lg:top-28">
          <p className="label-mono">/ FAQ</p>
          <h2 className="text-title text-balance">Questions, answered plainly.</h2>
        </div>
        <Accordion className="flex flex-col">
          {QUESTIONS.map((item) => (
            <AccordionItem key={item.q} value={item.q} className="border-border border-b">
              <AccordionTrigger className="py-5 text-left font-medium text-[1.0625rem] tracking-[-0.01em]">
                {item.q}
              </AccordionTrigger>
              <AccordionPanel className="pb-5 text-[1.0625rem] text-foreground/70 leading-relaxed">
                {item.a}
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
