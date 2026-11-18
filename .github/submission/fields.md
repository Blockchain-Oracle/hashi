# DoraHacks BUIDL: fields to paste

BCH BLAZE 2026 on DoraHacks has no custom submission form (`isEnabledSubmissionForm: false`), so the BUIDL uses
DoraHacks' standard form. Its exact fields and character limits are only visible when signed in, so the limits
below are unverified. The tagline is kept under 200 characters. Counts were made with `wc -m`.

## BUIDL name

Hashi

## Logo

`.github/submission/logo.png` (512 × 512, the Hashi mark).

## Tagline / vision (138 characters)

Bring USDC or USDT from eight chains to Bitcoin Cash as PUSD, MUSD or BCH, and back, from one screen: every route priced, every fee shown.

## Track and bounty

- Bounty: **Stablecoin Bridge** (apply from the bounty's page).
- Track: to be chosen by the team (Mainnet Track, or the bounty alone).

## Links

| Field                       | Link                                                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------- |
| Project website / live demo | https://hashi.cash                                                                                   |
| GitHub                      | https://github.com/Blockchain-Oracle/hashi                                                           |
| Docs                        | https://docs.hashi.cash                                                                              |
| Demo video                  | the YouTube link, once recorded                                                                      |
| Widget Factory deck         | https://docs.google.com/presentation/d/1GsuhBp2tMZBT6PexcLFE3e43yriJf5NbqJEEuzlpjQ4/edit?usp=sharing |

## Description (Details)

Paste [story.md](story.md). Upload these images where it says so, in this order:

1. `.github/assets/banner-light.png`: the first image. It shows what the bounty asks for: USDC on Ethereum, routes into MUSD on Bitcoin Cash.
2. `.github/assets/captures/swap-card-light.png`: the worked example (50 USDC on Ethereum → 48.94 MUSD in one approval, 18 Nov 2026, 19:13 UTC).
3. `.github/assets/captures/review-bridge-desktop.png`: the review sheet, with every fee, the least you can receive and the one approval.
4. `.github/assets/figures/system-light.png` (or the animated `system-light.gif`): who touches what.
5. `.github/assets/figures/into-light.png` (or `into-light.gif`): into PUSD in one approval.
6. `.github/assets/figures/out-light.png` (or `out-light.gif`): out to USDC in one approval.

## Deliverables and their status

| Required                                    | Status                                                                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Registered and submitted on DoraHacks       | to do by the team                                                                                                        |
| A live demo anyone can open                 | done: https://hashi.cash, over HTTPS                                                                                     |
| The app can make a BCH mainnet transaction  | done: real swaps both ways on 18 Nov 2026, transactions in the README's "Proof on mainnet"                               |
| WizardConnect integration                   | done                                                                                                                     |
| Banner: Widget Factory deck                 | done                                                                                                                     |
| Banner: repository link                     | done (public)                                                                                                            |
| Banner: CashTokens address                  | done: `bitcoincash:zqnvys4cpkjk9qtsmjwmhysgtlm9vvf6uvms3x8sh9`, with its QR code, in the banner, the README and the deck |
| Confirmed as real in the BCH BLAZE Telegram | to do by the team                                                                                                        |
| Roll call                                   | closed before the team joined (low-priority queue, not disqualification)                                                 |
| Demo video                                  | optional on DoraHacks (`mandatoryVideoLink: false`), recommended; script in `.github/submission/demo-script.md`          |
