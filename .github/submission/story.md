# Hashi · 橋

**Dollars in, dollars out.** Bring USDC or USDT from eight chains to Bitcoin Cash as PUSD, MUSD or BCH, and back, from one screen.

[image 1: banner]

Hashi is a bridge between the stablecoins of the big chains and Bitcoin Cash's own dollars. You pick what you pay (USDC or USDT on Base, Ethereum, Arbitrum, Optimism, Polygon, Avalanche, BNB Chain or Solana) and what you receive (PUSD, MUSD or BCH). Hashi prices every route that can carry the swap, with NEAR Intents or THORChain crossing the chains and Cauldron trading on Bitcoin Cash. It shows every fee and ranks the routes by what you keep. Then it walks your two wallets through each approval: WalletConnect (Reown AppKit) on the other chain and WizardConnect on Bitcoin Cash. The same screen does the way back, and swaps between PUSD, MUSD and BCH that stay on Bitcoin Cash.

Built for the BCH BLAZE 2026 Stablecoin Bridge bounty. _Hashi_ (橋) is Japanese for bridge.

**Try it:** https://hashi.cash · **Docs:** https://docs.hashi.cash · **Code:** https://github.com/Blockchain-Oracle/hashi

**Widget Factory deck:** https://docs.google.com/presentation/d/1GsuhBp2tMZBT6PexcLFE3e43yriJf5NbqJEEuzlpjQ4/edit?usp=sharing · **CashTokens address** (prizes and EMBER2026 votes): `bitcoincash:zqnvys4cpkjk9qtsmjwmhysgtlm9vvf6uvms3x8sh9`

## The problem

Most of the world's digital dollars are USDC and USDT on Ethereum, Base, Solana and a few other chains. Bitcoin Cash has dollars of its own: PUSD and MUSD, tokens that trade on Cauldron, a market on Bitcoin Cash. Today, someone holding USDC on Base who wants PUSD has to:

1. find a cross-chain swap that takes USDC and pays out BCH, Bitcoin Cash's own coin;
2. receive that BCH at a plain Bitcoin Cash address (NEAR Intents refuses the token-aware kind PUSD needs);
3. open Cauldron, connect a Bitcoin Cash wallet and swap the BCH for PUSD;
4. add up every hop's fees by hand to learn what the trip cost.

Going back is the same list in reverse, with a different wallet and address to get right at each step.

The cross-chain services (NEAR Intents, THORChain and the apps built on them) stop at plain BCH: none of them lists PUSD or MUSD. Cauldron stops at the edge of Bitcoin Cash. Nothing prices the whole trip, so nobody can tell which way is cheapest before they start.

## The idea

Hashi joins the two ends. You pick an amount, see every route priced end to end with its fees, and approve each step in your own wallets. Hashi builds each transaction, sends it, watches the bridge and asks for the next approval. It never holds the money and adds no fee of its own.

**A real quote.** Asking for 50 USDC on Ethereum → MUSD on 17 November 2026 at 00:21 UTC gave two routes:

- **NEAR Intents → Cauldron, Best return:** 48.89 MUSD, about 3 minutes, $0.50 in fees, 1 approval (the USDC transfer; the Cauldron trade runs by itself).
- **THORChain → Cauldron, Fastest:** 48.69 MUSD, about 45 seconds, $0.70 in fees, 2 approvals (allow, then deposit).

[image 2: the swap card]

With the NEAR Intents route, you approve one USDC transfer, and that is all. NEAR Intents pays the BCH to a Bitcoin Cash contract made for your swap, and Hashi trades it for MUSD on Cauldron with that swap's own key. The contract pays only your wallet, never less than the review's "you get at least"; if prices move past that floor, the BCH goes back to your wallet instead, and Hashi's server keeps the contract's public terms so unfinished BCH always goes back to you.

[image 3: the review sheet]

## How it works

1. **Price.** For each route, Hashi asks the bridge for a quote and Cauldron's Router for the Bitcoin Cash leg. It then adds every fee: the bridge's, Cauldron's 0.1%, the Bitcoin Cash network fee, and the gas on the paying chain. Routes are ranked by what you keep.
2. **Start.** The bridge issues a real deposit address (NEAR Intents) or names its vault and memo (THORChain). The swap is saved in your browser before anything moves.
3. **Deposit.** One transfer from your EVM or Solana wallet. THORChain also needs an "allow" first. USDC on Base can go gasless: you sign, and Hashi's relayer pays the gas.
4. **Bridge.** Hashi checks the bridge every 5 seconds. You can close the tab: the BCH arrives on its own.
5. **Finish on Bitcoin Cash, with no approval.** For PUSD or MUSD the bridge paid this swap's contract; Hashi signs the Cauldron trade with the swap's own key, after checking it in the Bitcoin Cash VM. The contract can pay only you, at least the floor.
6. **The way back** sells PUSD or MUSD on Cauldron first. The sale is saved the moment it is out, then the bridge is quoted for exactly the BCH it produced.

[image 4: the system map] [image 5: a swap into Bitcoin Cash, step by step]

## How Hashi meets the bounty

- _"convert stablecoins on other chains to BCH stablecoins (eg USDC on ETH into PUSD on BCH)"_: USDC or USDT on eight chains → PUSD, MUSD or BCH.
- _"And vice-versa, BCH stables to other-chain stables (eg PUSD on BCH into USDC on ETH)"_: PUSD, MUSD or BCH → USDC or USDT on any of the eight chains.
- _"from BCH stables to multiple/any other ecosystems would be even better"_: eight chains, seven EVM chains and Solana, 14 stablecoins.
- _"The faster, cheaper, and easier to use the bridge is - the better."_: routes ranked by what you keep after every fee, the fastest marked, one screen, gasless USDC on Base, and a closed tab resumes where it stopped.
- _"On the BCH side, WizardConnect is highly recommended."_: every Bitcoin Cash transaction is signed over WizardConnect.
- _"On the other chain side, WalletConnect is probably essential"_: Reown AppKit for EVM chains and Solana.
- Stretch, _"supporting multiple would be better"_: PUSD and MUSD, plus BCH itself.
- Stretch, _"route through large popular and existing multicoin providers like ShapeShift, ThorChain etc."_: THORChain and NEAR Intents side by side, priced against each other.
- _"ParyonUSD ... first priority integration & demo purposes"_: PUSD is the default destination.

The docs walk through the bounty line by line: https://docs.hashi.cash/docs/build/bounty

## Also in Hashi

- Swaps that stay on Bitcoin Cash: PUSD ⇄ MUSD ⇄ BCH on Cauldron, one approval, about 15 seconds.
- A tracker and an Activity list: every swap step by step across both chains, with explorer links, saved in your browser.
- Services checked live: NEAR Intents, THORChain's pauses per chain, the Cauldron Router and the Bitcoin Cash network.
- Settings for slippage and for a different recipient, with guards against token contracts and the wrong chain.
- Docs: 32 pages with real captures, diagrams, `llms.txt` and every page as Markdown.

## Honest limits

- No swap has been completed end to end on mainnet yet. The quotes, deposit addresses and unsigned Cauldron builds are live. Every wallet step is built and checked in code, but waits for its first funded run.
- Selling PUSD or MUSD takes two approvals (sell, then send).
- Gasless deposits are off until the relayer holds a little Base ETH.
- Each bridge holds the money while it carries it, for seconds to minutes.
- Swaps are saved only in the browser that started them.

Hashi was started on 16 November 2026, during BCH BLAZE 2026. Its code is MIT-licensed.
