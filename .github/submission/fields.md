# Hashi · DoraHacks BUIDL fields (BCH BLAZE 2026, Mainnet Track + Stablecoin Bridge bounty)

Ready to paste. Character limits on the DoraHacks form are not visible without a login: the tagline below stays under
200 characters. Submit early: the organiser said BUIDLs can be updated until the deadline, Sunday 22 November 2026,
14:00 UTC (15:00 WAT).

**Name:** Hashi

**Logo:** `.github/submission/logo.png` (512 × 512, the Hashi mark)

**Tagline:** Dollars in, dollars out. USDC or USDT from eight chains to PUSD, MUSD or BCH on Bitcoin Cash, and back, in one approval each way.

**Track:** Mainnet Track

**Bounty:** Stablecoin Bridge ($750 PUSD): on the BUIDL form's bounty section, Apply

**Links**
- Live app: https://hashi.cash
- Docs: https://docs.hashi.cash
- Source: https://github.com/Blockchain-Oracle/hashi
- Widget Factory deck: https://docs.google.com/presentation/d/1GsuhBp2tMZBT6PexcLFE3e43yriJf5NbqJEEuzlpjQ4/edit?usp=sharing
- CashTokens address: bitcoincash:zqnvys4cpkjk9qtsmjwmhysgtlm9vvf6uvms3x8sh9
- Demo video: the YouTube link, once uploaded
- Mainnet proof: https://github.com/Blockchain-Oracle/hashi#proof-on-mainnet

**The problem**
Most digital dollars are USDC and USDT on Ethereum, Base, Solana and a few other chains. Bitcoin Cash has its own dollars, PUSD and MUSD, which trade only on Cauldron. Getting from one to the other today is four jobs by hand: find a bridge that pays out BCH, receive it at a plain address, buy PUSD on Cauldron, and add up the fees yourself. No cross-chain service lists PUSD or MUSD, and nothing prices the whole trip.

**What it does**
Hashi joins the two ends on one screen. Pick what you pay (USDC or USDT on Base, Ethereum, Arbitrum, Optimism, Polygon, Avalanche, BNB Chain or Solana) and what you receive (PUSD, MUSD or BCH). Hashi asks NEAR Intents, THORChain and Cauldron at once and ranks every route by what you keep after every fee. One approval in your wallet does the rest: NEAR Intents pays the BCH into a small contract made for your swap, and Hashi trades it on Cauldron with the swap's own key; the contract pays you at least what the review promised, or sends the BCH back. The way out is one approval too: the Cauldron sale of your PUSD pays NEAR Intents in the same transaction. A live tracker counts Bitcoin Cash blocks and shows the bridge's own countdown; swaps on Bitcoin Cash alone (PUSD ⇄ MUSD ⇄ BCH) are one Cauldron trade.

**How BCH is used**
Every swap ends or starts in a Bitcoin Cash mainnet transaction: Cauldron trades of PUSD and MUSD (CashTokens), a CashScript swap contract per swap that NEAR Intents and THORChain pay into, the one-transaction sale that pays NEAR's deposit address, and THORChain deposits built with an OP_RETURN memo. Bitcoin Cash wallets connect over WizardConnect and sign every transaction that spends from them; EVM and Solana wallets connect over WalletConnect (Reown AppKit). Filmed on 18 Nov 2026: 2 USDC → 1.98 PUSD (contract trade dbc55dbc…), 1 PUSD → 0.980986 USDC on Base (sale 6bd4afb7…), 0.97 PUSD → 0.79 MUSD (d65dc335…), all in block 977,933.

**Business model**
Hashi adds no fee today, so a route costs only what the bridges and Cauldron charge. Both rails pay integrators: NEAR Intents' quotes take an app fee (Hashi's swaps already carry its "hashi" referral tag on NEAR's explorer) and THORChain's memos take an affiliate fee. The same engine can sit inside Bitcoin Cash wallets and merchant checkouts that want USDC in and PUSD out.

**Description (Details)**
Paste [story.md](story.md). Upload these images where it says so, in this order:

1. `.github/assets/banner-light.png`: USDC on Ethereum, routes into MUSD on Bitcoin Cash.
2. `.github/assets/captures/swap-card-light.png`: the worked example (50 USDC on Ethereum → 48.94 MUSD in one approval, 18 Nov 2026, 19:13 UTC).
3. `.github/assets/captures/review-bridge-desktop.png`: the review sheet, with every fee, the least you can receive and the one approval.
4. `.github/assets/figures/system-light.png` (or the animated `system-light.gif`): who touches what.
5. `.github/assets/figures/into-light.png` (or `into-light.gif`): into PUSD in one approval.
6. `.github/assets/figures/out-light.png` (or `out-light.gif`): out to USDC in one approval.

## How to submit

1. Sign in on DoraHacks and open https://dorahacks.io/hackathon/bchblaze2026, then **Submit BUIDL**.
2. Fill in the fields above: name, logo, tagline, links (GitHub, website, video), and paste `story.md` as the description with the six images.
3. Pick the **Mainnet Track** and, under bounties, **Apply** to **Stablecoin Bridge**. A BUIDL takes one track; it can apply to as many bounties as it meets.
4. Submit now; add the YouTube link and any edits before Sunday 22 November, 14:00 UTC.
5. Say hello in the BCH BLAZE Telegram (https://t.me/bchblaze) so the organiser knows a real person is behind Hashi.

## Deliverables and their status

| Required | Status |
| --- | --- |
| Registered and submitted on DoraHacks | to do by the team |
| A live demo anyone can open | done: https://hashi.cash |
| The app makes BCH mainnet transactions | done: real swaps both ways, transactions in the README's "Proof on mainnet" |
| WizardConnect integration | done: every transaction from your Bitcoin Cash wallet is signed over WizardConnect |
| Banner: Widget Factory deck | done |
| Banner: repository link | done (public) |
| Banner: CashTokens address | done, with its QR code, in the banner, the README and the deck |
| Confirmed as real in the BCH BLAZE Telegram | to do by the team |
| Roll call | closed before the team joined (judged in the low-priority queue, not disqualified) |
| Demo video | optional on DoraHacks; the cut is ready to upload to YouTube |
