'use client'

import { Wallet01Icon } from '@hugeicons/core-free-icons'
import { type Address, erc20Abi } from 'viem'
import { useReadContracts } from 'wagmi'
import { Icon } from '@/components/kit/icon'
import { AssetOnChain, ChainLogo } from '@/components/kit/logos'
import { Button } from '@/components/ui/button'
import { useEvmWallet } from '@/features/wallets/evm-wallet'
import { STABLES } from '@/lib/constants/assets'
import { CHAINS } from '@/lib/constants/chains'
import { formatAmount } from '@/lib/format'

const EVM_STABLES = STABLES.filter((s) => CHAINS[s.chain].kind === 'evm')

/** The EVM and Solana side: connect through Reown AppKit and see the stablecoins the wallet holds. */
export function EvmWalletCard() {
  const wallet = useEvmWallet()
  return (
    <div className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-6 shadow-card">
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          <ChainLogo chain="base" size={28} className="ring-2 ring-card" />
          <ChainLogo chain="ethereum" size={28} className="ring-2 ring-card" />
          <ChainLogo chain="solana" size={28} className="ring-2 ring-card" />
        </div>
        <div>
          <p className="font-medium">EVM and Solana wallet</p>
          <p className="text-muted-foreground text-sm">WalletConnect (Reown AppKit) · browser wallets</p>
        </div>
      </div>
      {!wallet.enabled ? (
        <p className="rounded-2xl bg-muted p-4 text-sm">
          Waiting for a Reown project ID: set <code className="font-mono">NEXT_PUBLIC_REOWN_PROJECT_ID</code>{' '}
          in <code className="font-mono">apps/web/.env.local</code> and restart the dev server.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {wallet.evmAddress ? (
              <Button variant="soft" size="sm" onClick={() => wallet.disconnect('eip155')}>
                EVM {short(wallet.evmAddress)} · Disconnect
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => wallet.connect('eip155')}>
                <Icon icon={Wallet01Icon} />
                Connect an EVM wallet
              </Button>
            )}
            {wallet.solanaAddress ? (
              <Button variant="soft" size="sm" onClick={() => wallet.disconnect('solana')}>
                Solana {short(wallet.solanaAddress)} · Disconnect
              </Button>
            ) : (
              <Button variant="outline" onClick={() => wallet.connect('solana')}>
                Connect Solana
              </Button>
            )}
          </div>
          {wallet.evmAddress ? <EvmBalances address={wallet.evmAddress as Address} /> : null}
        </>
      )}
    </div>
  )
}

function short(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

/** USDC and USDT on every EVM chain Hashi supports, read in one batch. Only rendered inside AppKit's WagmiProvider. */
function EvmBalances({ address }: { address: Address }) {
  const balances = useReadContracts({
    allowFailure: true,
    contracts: EVM_STABLES.map((s) => ({
      chainId: (CHAINS[s.chain] as { evmChainId: number }).evmChainId,
      address: s.address as Address,
      abi: erc20Abi,
      functionName: 'balanceOf' as const,
      args: [address] as const,
    })),
    query: { refetchInterval: 30_000 },
  })
  const held = EVM_STABLES.map((s, i) => ({
    s,
    value: balances.data?.[i]?.result as bigint | undefined,
  })).filter((h) => h.value && h.value > 0n)
  return (
    <div className="space-y-2">
      <p className="label-mono">
        {balances.isLoading ? 'Reading balances…' : held.length ? 'Holding' : 'No USDC or USDT found'}
      </p>
      <div className="flex flex-wrap gap-2">
        {held.map(({ s, value }) => (
          <span
            key={`${s.symbol}-${s.chain}`}
            className="flex items-center gap-2 rounded-full bg-muted py-1.5 pr-3 pl-1.5 text-sm"
          >
            <AssetOnChain asset={s.symbol} chain={s.chain} size={22} />
            <span className="font-mono">{formatAmount(value ?? 0n, s.decimals, 2)}</span>
            <span className="text-muted-foreground">{CHAINS[s.chain].name}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
