# Third-party notices

Hashi's own code is under the MIT licence ([LICENSE](LICENSE)). This file lists the third-party material it carries
or depends on. It does not change any upstream terms or imply endorsement by the projects named; each package's own
licence still applies.

## Interface components (copied into the repository, then restyled)

| Source                                                                              | Licence | Files                                                                                                                                                                              |
| ----------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [shadcn/ui](https://ui.shadcn.com) (`base-nova`, on [Base UI](https://base-ui.com)) | MIT     | `apps/web/components/ui/`: button, input, label                                                                                                                                    |
| [coss ui](https://coss.com/ui)                                                      | MIT     | `apps/web/components/ui/`: accordion, autocomplete, command, dialog, drawer, number-field, popover, scroll-area, segmented-control, sheet, skeleton, spinner, tabs, toast, tooltip |
| [Magic UI](https://magicui.design)                                                  | MIT     | `apps/web/components/ui/`: animated-beam, animated-list, animated-theme-toggler, border-beam, iphone, marquee, meteors, text-reveal                                                |
| [Motion-Primitives](https://motion-primitives.com)                                  | MIT     | `apps/web/components/ui/`: animated-background, text-effect                                                                                                                        |

## Fonts

| Font       | Terms                                                                  | Where                                                                                                     |
| ---------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Figtree    | Copyright 2022 The Figtree Project Authors. SIL Open Font License 1.1. | the app, through `next/font/google`; the docs' link previews and diagrams, from `docs-site/assets/fonts/` |
| Geist Mono | Copyright 2024 The Geist Project Authors. SIL Open Font License 1.1.   | the same                                                                                                  |

The SIL Open Font License 1.1: https://openfontlicense.org

## Icons and logos

- [Hugeicons](https://hugeicons.com) free set (MIT) for the app's icons; [Lucide](https://lucide.dev) (ISC) in the docs.
- [web3icons](https://github.com/0xa3k5/web3icons) (MIT) for chain and token marks.
- The logos in `apps/web/public/logos/` and `docs-site/public/logos/` (NEAR Intents, THORChain, Cauldron, WizardConnect,
  Reown, ParyonUSD, Moria, the chains and the wallets) are trademarks of their owners, used only to name the services
  and assets Hashi works with.

## Packaged libraries

Installed from npm and used unmodified; their own licences apply. Among them:

| Package                                                                                                                             | Licence                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@wizardconnect/core`, `@wizardconnect/dapp`, `@wizardconnect/react` (Riften Labs)                                                  | LGPL-3.0-or-later (per the source repository, https://gitlab.com/riftenlabs/lib/wizardconnect; the npm packages carry no licence field). Used as libraries, unmodified. |
| `@reown/appkit` and its adapters                                                                                                    | Reown Community License Agreement (`node_modules/@reown/appkit/LICENSE.md`)                                                                                             |
| `@bitauth/libauth`, `@electrum-cash/network`, `@base-ui/react`, `motion`, `@number-flow/react`, `viem`, `wagmi`, `qrcode-generator` | MIT                                                                                                                                                                     |
| `@paper-design/shaders-react`, `idb-keyval`                                                                                         | Apache-2.0                                                                                                                                                              |
| `fumadocs-core`, `fumadocs-mdx`, `@fumadocs/base-ui` (the docs)                                                                     | MIT                                                                                                                                                                     |
