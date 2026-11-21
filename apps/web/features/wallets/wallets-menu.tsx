'use client'

import { Wallet01Icon } from '@hugeicons/core-free-icons'
import type { ReactNode } from 'react'
import { CopyButton } from '@/components/kit/copy-button'
import { Icon } from '@/components/kit/icon'
import { ChainLogo } from '@/components/kit/logos'
import { Button } from '@/components/ui/button'
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover'
import { shortAddress } from '@/lib/format'
import { useBchWallet } from './bch-wallet'
import { useEvmWallet } from './evm-wallet'

/**
 * Both wallets in one place, in the nav pill: EVM and Solana through AppKit, Bitcoin Cash through WizardConnect.
 * Each shows its address with copy, and connects or disconnects on its own.
 */
export function WalletsMenu() {
  const evm = useEvmWallet()
  const { wc, paired, checking, restoring, answering, receive, openConnect } = useBchWallet()
  // Paired includes a session restored after a refresh, whose relay is still reconnecting.
  const bchConnected = paired
  const logos = [
    evm.evmAddress ? 'ethereum' : null,
    evm.solanaAddress ? 'solana' : null,
    bchConnected || restoring ? 'bch' : null,
  ].filter((c): c is 'ethereum' | 'solana' | 'bch' => c !== null)

  return (
    <Popover>
      <PopoverTrigger
        className={`flex h-[2.125rem] items-center gap-2 rounded-full bg-white/10 pl-2 font-medium text-[#fffaf5] text-sm transition-colors hover:bg-white/15 ${logos.length ? 'pr-2 sm:pr-3.5' : 'pr-3.5'}`}
        aria-label={logos.length ? `${logos.length} wallets connected` : 'Connect wallets'}
      >
        {logos.length ? (
          <span className="flex -space-x-1.5">
            {logos.map((chain) => (
              <ChainLogo
                key={chain}
                chain={chain}
                size={20}
                className="ring-2 ring-[#171717] dark:ring-[#211f1e]"
              />
            ))}
          </span>
        ) : (
          <Icon icon={Wallet01Icon} className="ml-0.5" />
        )}
        {/* Connected, a phone shows only the wallets' marks; the label stays for the screen reader. */}
        {/* Before the browser has looked for a stored wallet (first paint), the mark alone: never "Connect" to a returning wallet. */}
        {logos.length ? <span className="hidden sm:inline">Wallets</span> : checking ? null : 'Connect'}
      </PopoverTrigger>
      <PopoverPopup align="end" className="w-[min(22rem,calc(100vw-2rem))]">
        <div className="flex flex-col gap-1 p-1">
          <p className="label-mono px-2 pb-2">/ Your wallets</p>
          <Row
            logo={<ChainLogo chain="ethereum" size={30} />}
            name="EVM wallet"
            hint="Base, Ethereum, Arbitrum, Optimism, Polygon, Avalanche, BNB Chain"
            address={evm.evmAddress}
            disabled={!evm.enabled}
            onConnect={() => evm.connect('eip155')}
            onDisconnect={() => evm.disconnect('eip155')}
          />
          <Row
            logo={<ChainLogo chain="solana" size={30} />}
            name="Solana wallet"
            hint="USDC and USDT on Solana"
            address={evm.solanaAddress}
            disabled={!evm.enabled}
            onConnect={() => evm.connect('solana')}
            onDisconnect={() => evm.disconnect('solana')}
          />
          <Row
            logo={
              wc.walletIcon ? (
                // biome-ignore lint/performance/noImgElement: the wallet's own icon, from an address it chooses
                <img src={wc.walletIcon} alt="" className="size-[30px] rounded-lg" />
              ) : (
                <ChainLogo chain="bch" size={30} />
              )
            }
            name={wc.walletName ?? 'Bitcoin Cash wallet'}
            hint="WizardConnect: Selene, Paytaca, Cashonize"
            address={bchConnected ? receive?.token : undefined}
            pending={restoring || (!paired && (wc.state === 'connecting' || wc.state === 'reconnecting'))}
            pendingLabel={restoring ? 'Reconnecting…' : 'Waiting…'}
            disabled={restoring}
            silent={paired && !answering}
            onConnect={openConnect}
            onDisconnect={() => void wc.disconnect()}
          />
        </div>
      </PopoverPopup>
    </Popover>
  )
}

function Row({
  logo,
  name,
  hint,
  address,
  disabled = false,
  pending = false,
  pendingLabel = 'Waiting…',
  silent = false,
  onConnect,
  onDisconnect,
}: {
  logo: ReactNode
  name: string
  hint: string
  address: string | undefined
  disabled?: boolean
  pending?: boolean
  pendingLabel?: string
  /** Paired, but the wallet has stopped answering (closed, asleep, or it removed the connection). */
  silent?: boolean
  onConnect: () => void
  onDisconnect: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-2 py-2.5">
      {logo}
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-sm">{name}</span>
        {address && silent ? (
          <span className="block text-(--warning) text-xs">Not answering: open it, or pair again</span>
        ) : address ? (
          <span className="flex items-center gap-0.5 font-mono text-muted-foreground text-xs">
            {shortAddress(address, 6, 4)}
            <CopyButton value={address} label={`Copy ${name} address`} className="size-6" />
          </span>
        ) : (
          <span className="block truncate text-muted-foreground text-xs">{hint}</span>
        )}
      </span>
      {address && silent ? (
        <Button variant="soft" size="xs" onClick={onConnect}>
          Pair again
        </Button>
      ) : address ? (
        <Button variant="ghost" size="xs" onClick={onDisconnect}>
          Disconnect
        </Button>
      ) : (
        <Button variant="soft" size="xs" onClick={onConnect} disabled={disabled}>
          {pending ? pendingLabel : 'Connect'}
        </Button>
      )}
    </div>
  )
}
