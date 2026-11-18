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
| Project website / live demo | http://hashi.84.46.247.92.sslip.io (becomes https://hashi.cash)                                      |
| GitHub                      | https://github.com/Blockchain-Oracle/hashi                                                           |
| Docs                        | http://docs.hashi.84.46.247.92.sslip.io (becomes https://docs.hashi.cash)                            |
| Demo video                  | the YouTube link, once recorded                                                                      |
| Widget Factory deck         | https://docs.google.com/presentation/d/1GsuhBp2tMZBT6PexcLFE3e43yriJf5NbqJEEuzlpjQ4/edit?usp=sharing |

## Description (Details)

Paste [story.md](story.md). Upload these images where it says so, in this order:

1. `.github/assets/banner-light.png`: the first image. It shows what the bounty asks for: USDC on Ethereum, routes into MUSD on Bitcoin Cash.
2. `.github/assets/captures/swap-card-light.png`: the worked example (50 USDC on Ethereum → 48.89 MUSD, 17 Nov 2026, 00:21 UTC).
3. `.github/assets/captures/review-bridge-desktop.png`: the review sheet, with every fee and the least you can receive.
4. `.github/assets/system-light.png`: the system map.
5. `.github/assets/into-bch-light.png`: a swap into Bitcoin Cash, step by step.

## Deliverables and their status

| Required                                    | Status                                                                                                          |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Registered and submitted on DoraHacks       | to do by the team                                                                                               |
| A live demo anyone can open                 | live at a temporary HTTP address; wallets connect once https://hashi.cash is registered                         |
| The app can make a BCH mainnet transaction  | built; no swap recorded on mainnet yet                                                                          |
| WizardConnect integration                   | done                                                                                                            |
| Banner: Widget Factory deck                 | done                                                                                                            |
| Banner: repository link                     | done (public once the repository goes public)                                                                   |
| Banner: CashTokens address                  | done: `bitcoincash:zqnvys4cpkjk9qtsmjwmhysgtlm9vvf6uvms3x8sh9`, with its QR code, in the banner and the README  |
| Confirmed as real in the BCH BLAZE Telegram | to do by the team                                                                                               |
| Roll call                                   | closed before the team joined (low-priority queue, not disqualification)                                        |
| Demo video                                  | optional on DoraHacks (`mandatoryVideoLink: false`), recommended; script in `.github/submission/demo-script.md` |
