import type { ChainId } from '@/lib/constants/chains'
import { nearIntentsUrl, txUrl } from '@/lib/constants/explorers'

/**
 * What /demo plays: the demo videos on YouTube (played on the page, nothing hosted here), their chapters, and the
 * mainnet transactions each one made on camera. Times are seconds into the video. A film with no `videoId` yet is
 * left off the page until it is published.
 */
export interface Film {
  key: 'live' | 'film'
  videoId: string | null
  title: string
  length: string
  blurb: string
  chapters: readonly { at: number; label: string }[]
  /** The day it was recorded and what it moved, each a transaction anyone can open. */
  recorded: string
  receipts: readonly { what: string; chain: ChainId | 'near'; id: string }[]
}

export const FILMS: readonly Film[] = [
  {
    key: 'live',
    videoId: 'ZGtYV9u5jW8',
    title: 'Live on mainnet',
    length: '3:10',
    blurb: 'One swap, signed live in our own wallets: 1 USDC on Base in, 0.98 PUSD on Bitcoin Cash out.',
    chapters: [
      { at: 0, label: 'Live on mainnet: 1 USDC on Base to PUSD' },
      { at: 19, label: 'Connect MetaMask on Base mainnet' },
      { at: 41, label: 'Connect Cashonize over WizardConnect' },
      { at: 58, label: 'Two routes: THORChain or NEAR Intents' },
      { at: 81, label: 'Review every fee, then one approval' },
      { at: 101, label: 'Proof on BaseScan' },
      { at: 112, label: 'NEAR Intents carries it across' },
      { at: 122, label: 'PUSD lands in Cashonize' },
      { at: 156, label: 'Live on mainnet, right now' },
      { at: 169, label: 'Swap complete' },
    ],
    recorded: '19 Nov 2026',
    receipts: [
      {
        what: "1 USDC sent on Base to NEAR Intents' deposit address, the swap's one approval",
        chain: 'base',
        id: '0x9dbc929d478c4474d891f3e86955c45daa2aa45dff9553115826d51303f378dd',
      },
      {
        what: "NEAR Intents paid 0.00474881 BCH into the swap's own contract",
        chain: 'bch',
        id: '8c2663a4e5adbafcea4169659aa23f77a45820ffca960797ef8785b69fdfec1f',
      },
      {
        what: 'The contract bought 0.98 PUSD on Cauldron and paid the wallet, with no second prompt',
        chain: 'bch',
        id: '9797a2773881518131b13732d35faca5f70325ea1cc7523025d91b1a98a830c0',
      },
      {
        what: "The whole trip on NEAR Intents' explorer",
        chain: 'near',
        id: '0xeafcea488b0a1994fc4f99bf1625e4eef119c55e',
      },
    ],
  },
  {
    key: 'film',
    videoId: 'bbLQ44UAdBU',
    title: 'The demo film',
    length: '2:40',
    blurb: 'The problem, a swap each way in one approval, swaps on Bitcoin Cash alone, and who touches what.',
    chapters: [
      { at: 0, label: 'Intro' },
      { at: 21, label: 'The old way: four jobs' },
      { at: 38, label: 'USDC on Base to PUSD in one approval' },
      { at: 58, label: 'The swap contract' },
      { at: 83, label: 'The way back, and swaps on Bitcoin Cash' },
      { at: 125, label: 'Who touches what' },
      { at: 143, label: 'Docs, proof and where to try it' },
    ],
    recorded: '18 Nov 2026',
    receipts: [
      {
        what: "2 USDC from Base: NEAR Intents paid 966,878 sats into the swap's contract",
        chain: 'bch',
        id: '92ba9341c9946e09f8d55a8b9d3b3102933a186c043d7d0791d2c2fd89ebca2f',
      },
      {
        what: 'The contract traded them on Cauldron: 1.98 PUSD to the wallet',
        chain: 'bch',
        id: 'dbc55dbc1e5db0213cb5e9a3f26c568bc0e220a0661f3d357e67a70160204eb8',
      },
      {
        what: 'The way back: 1 PUSD sold on Cauldron, paying NEAR Intents in the same transaction',
        chain: 'bch',
        id: '6bd4afb7c67530a910a0e787b83a64d02083d09462d872a8dc90a043b327a3ef',
      },
      {
        what: '0.980986 USDC landed on Base',
        chain: 'base',
        id: '0xfaff342df7ddaa5046b061c6a17737584b254e1bb62961952549222a2f2056ed',
      },
      {
        what: '0.97 PUSD to 0.79 MUSD, one Cauldron transaction on Bitcoin Cash alone',
        chain: 'bch',
        id: 'd65dc33549303afff71ef299b9bfcfdc1b3a4ee1f90633e171b396a2a8ee8ecf',
      },
    ],
  },
]

/** The films that are published, in the order the page shows them. */
export const PUBLISHED = FILMS.filter((f): f is Film & { videoId: string } => f.videoId !== null)

export function receiptUrl(chain: ChainId | 'near', id: string): string {
  return chain === 'near' ? nearIntentsUrl(id) : txUrl(chain, id)
}

export const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
