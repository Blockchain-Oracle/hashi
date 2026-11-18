'use client'

import { Copy01Icon, Link04Icon, Loading03Icon, Wallet01Icon } from '@hugeicons/core-free-icons'
import { AlphanumericQRCode } from '@wizardconnect/react'
import { useState } from 'react'
import { parseUnits } from 'viem'
import { Icon } from '@/components/kit/icon'
import { AssetLogo, ChainLogo } from '@/components/kit/logos'
import { StatusPill } from '@/components/kit/status-pill'
import { Button } from '@/components/ui/button'
import { useBchWallet } from '@/features/wallets/bch-wallet'
import { broadcast } from '@/lib/bch/electrum'
import { pickBchCoins, pickTokenCoins, totals } from '@/lib/bch/funding'
import { signRouterBuild } from '@/lib/bch/sign'
import { outpointKey, type WalletAddress, type WalletUtxo } from '@/lib/bch/wallet'
import { BCH_ASSETS, type BchAssetId } from '@/lib/constants/assets'
import { BCH_EXPLORER_TX_URL } from '@/lib/constants/chains'
import { DEFAULT_SLIPPAGE_BPS } from '@/lib/constants/limits'
import { minerFeeSats, routerFeeSats, TOKEN_OUTPUT_SATS } from '@/lib/engine/cauldron-fees'
import { formatAmount } from '@/lib/format'
import { getRouter, type RouterBuild, routerAsset } from '@/lib/providers/cauldron'
import { cn } from '@/lib/utils'

export interface LogEntry {
  at: string
  step: string
  detail: string
}

function stamp() {
  return new Date().toISOString().slice(11, 23)
}

/** Connect the Bitcoin Cash wallet and see what it holds. */
export function BchWalletCard() {
  const { wc, paired, scan } = useBchWallet()
  const [copied, setCopied] = useState(false)

  if (!paired) {
    const waiting = wc.state === 'connecting' || wc.state === 'reconnecting'
    return (
      <div className="flex flex-col items-start gap-5 rounded-3xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-3">
          <ChainLogo chain="bch" size={32} />
          <div>
            <p className="font-medium">Bitcoin Cash wallet</p>
            <p className="text-muted-foreground text-sm">
              WizardConnect · Selene, Paytaca, Cashonize, Electron Cash
            </p>
          </div>
        </div>
        {waiting && wc.qrUri && wc.uri ? (
          <div className="flex flex-wrap items-center gap-6">
            <div className="rounded-2xl bg-white p-3 shadow-card">
              <AlphanumericQRCode value={wc.qrUri} size={200} foreground="#121111" background="#ffffff" />
            </div>
            <div className="flex flex-col gap-2">
              <p className="max-w-56 text-muted-foreground text-sm">
                Scan with your wallet, or open it on this device.
              </p>
              <a href={wc.uri} className="inline-flex items-center gap-2 font-medium text-primary text-sm">
                <Icon icon={Link04Icon} />
                Open in wallet app
              </a>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(wc.uri as string)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                }}
                className="inline-flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
              >
                <Icon icon={Copy01Icon} />
                {copied ? 'Copied' : 'Copy link'}
              </button>
              <p className="mt-2 flex items-center gap-2 text-muted-foreground text-xs">
                <Icon icon={Loading03Icon} className="animate-spin" />
                Waiting for your wallet…
              </p>
            </div>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => wc.connect()}>
            <Icon icon={Wallet01Icon} />
            Connect a BCH wallet
          </Button>
        )}
        {wc.error ? <p className="text-destructive text-sm">{wc.error}</p> : null}
      </div>
    )
  }

  const sum = scan.data ? totals(scan.data.utxos) : undefined
  const first = scan.data?.addresses.find((a) => a.path === 'receive')
  return (
    <div className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-6 shadow-card">
      <div className="flex items-center gap-3">
        {wc.walletIcon ? (
          // biome-ignore lint/performance/noImgElement: the wallet's own icon, from an address it chooses
          <img src={wc.walletIcon} alt="" className="size-8 rounded-lg" />
        ) : (
          <ChainLogo chain="bch" size={32} />
        )}
        <div className="min-w-0">
          <p className="font-medium">{wc.walletName ?? 'Bitcoin Cash wallet'}</p>
          <p className="truncate font-mono text-muted-foreground text-xs">{first?.token ?? '…'}</p>
        </div>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => void wc.disconnect()}>
          Disconnect
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Balance asset="BCH" value={sum ? formatAmount(sum.sats, 8, 8) : undefined} />
        <Balance
          asset="PUSD"
          value={sum ? formatAmount(sum.tokens.get(BCH_ASSETS.PUSD.category) ?? 0n, 2, 2) : undefined}
        />
        <Balance
          asset="MUSD"
          value={sum ? formatAmount(sum.tokens.get(BCH_ASSETS.MUSD.category) ?? 0n, 2, 2) : undefined}
        />
      </div>
      <p className="font-mono text-muted-foreground text-xs">
        {scan.isFetching
          ? 'Scanning addresses…'
          : scan.data
            ? `${scan.data.addresses.length} addresses · ${scan.data.utxos.length} coins`
            : (scan.error?.message ?? '')}
      </p>
    </div>
  )
}

function Balance({ asset, value }: { asset: BchAssetId; value: string | undefined }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-muted p-3">
      <AssetLogo asset={asset} size={24} />
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">{asset}</p>
        <p className="truncate font-mono text-sm">{value ?? '…'}</p>
      </div>
    </div>
  )
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'building' }
  | { kind: 'built'; build: RouterBuild; owners: Map<string, WalletAddress>; coins: number }
  | { kind: 'signing' }
  | { kind: 'done'; txid: string }
  | { kind: 'failed'; message: string }

/**
 * T3 and T4: buy or sell PUSD/MUSD on Cauldron with the connected wallet. Hashi prices, picks coins, has the
 * Router build the transaction, asks the wallet to sign it, and broadcasts it over Electrum.
 */
export function CauldronTradePanel({ onLog }: { onLog: (entry: LogEntry) => void }) {
  const { wc, paired, scan } = useBchWallet()
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [asset, setAsset] = useState<'PUSD' | 'MUSD'>('PUSD')
  const [text, setText] = useState('1')
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const log = (step: string, detail: string) => onLog({ at: stamp(), step, detail })

  const connected = paired && wc.manager && scan.data
  const receive = scan.data?.addresses.find((a) => a.path === 'receive')

  async function build() {
    if (!scan.data || !receive) return
    setPhase({ kind: 'building' })
    try {
      const category = routerAsset(asset)
      const amount = parseUnits(text || '0', BCH_ASSETS[asset].decimals)
      if (amount <= 0n) throw new Error('Enter an amount')
      const router = getRouter()
      let coins: WalletUtxo[] | undefined
      let minOutput: bigint | undefined
      if (side === 'buy') {
        const quote = await router.quote({ sell: 'bch', buy: category, amount, side: 'buy' })
        const input = BigInt(quote.input_amount ?? '0')
        const need = input + routerFeeSats(input) + minerFeeSats(quote.pools) + TOKEN_OUTPUT_SATS + 2_000n
        log(
          'quote',
          `buy ${text} ${asset}: ${input} sats into ${quote.pools} pools; need ≈ ${need} sats with fees`,
        )
        coins = pickBchCoins(scan.data.utxos, need)
        if (!coins) throw new Error(`Not enough BCH: this needs about ${formatAmount(need, 8, 8)} BCH`)
      } else {
        const quote = await router.quote({ sell: category, buy: 'bch', amount, side: 'sell' })
        const output = BigInt(quote.output_amount ?? '0')
        minOutput = (output * BigInt(10_000 - DEFAULT_SLIPPAGE_BPS)) / 10_000n
        log('quote', `sell ${text} ${asset}: ${output} sats from ${quote.pools} pools; floor ${minOutput}`)
        coins = pickTokenCoins(scan.data.utxos, BCH_ASSETS[asset].category, amount)
        if (!coins) throw new Error(`Not enough ${asset} in this wallet`)
      }
      const owners = new Map(coins.map((c) => [outpointKey(c.txid, c.vout), c.address]))
      const built = await router.build({
        sell: side === 'buy' ? 'bch' : category,
        buy: side === 'buy' ? category : 'bch',
        amount,
        side,
        funding: coins.map((c) => ({
          txid: c.txid,
          vout: c.vout,
          value: c.value,
          scriptHex: c.address.lockingHex,
          ...(c.token ? { token: c.token } : {}),
        })),
        receiveAddress: receive.token,
        changeAddress: receive.plain,
        ...(minOutput === undefined ? {} : { minOutput }),
      })
      log(
        'build',
        `${built.route.pools} pools · ${built.source_outputs.length} inputs · ${built.unsigned_tx_hex.length / 2} bytes · router fee ${built.fee_sats} sats · miner ${built.miner_fee_sats} sats · expected ${built.expected_output}`,
      )
      setPhase({ kind: 'built', build: built, owners, coins: coins.length })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log('error', message)
      setPhase({ kind: 'failed', message })
    }
  }

  async function approve(built: RouterBuild, owners: Map<string, WalletAddress>) {
    if (!wc.manager) return
    setPhase({ kind: 'signing' })
    try {
      const prompt = `${side === 'buy' ? 'Buy' : 'Sell'} ${text} ${asset} on Cauldron`
      log('sign', `sent to ${wc.walletName ?? 'wallet'} (${built.source_outputs.length} inputs)`)
      const signed = await signRouterBuild(wc.manager, built, owners, prompt)
      log('signed', `${signed.length / 2} bytes`)
      const txid = await broadcast(signed)
      log('broadcast', txid)
      setPhase({ kind: 'done', txid })
      void scan.refetch()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log('error', message)
      setPhase({ kind: 'failed', message })
    }
  }

  return (
    <div className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-6 shadow-card">
      <div>
        <p className="label-mono">T3 · T4 — Cauldron trade from your wallet</p>
        <p className="mt-2 text-muted-foreground text-sm">
          Buy or sell PUSD or MUSD. Hashi builds the trade with the Cauldron Router; your wallet shows it and
          you approve it there.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {(['buy', 'sell'] as const).map((s) => (
          <Chip key={s} on={side === s} onClick={() => setSide(s)}>
            {s === 'buy' ? 'Buy' : 'Sell'}
          </Chip>
        ))}
        <span className="mx-1 w-px bg-border" />
        {(['PUSD', 'MUSD'] as const).map((a) => (
          <Chip key={a} on={asset === a} onClick={() => setAsset(a)}>
            <AssetLogo asset={a} size={18} />
            {a}
          </Chip>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <input
          inputMode="decimal"
          aria-label={`Amount of ${asset}`}
          value={text}
          onChange={(e) => setText(e.target.value.replace(/[^0-9.]/g, ''))}
          className="w-40 rounded-2xl bg-muted px-4 py-3 text-2xl text-amount outline-none focus:ring-4 focus:ring-ring"
        />
        <span className="text-muted-foreground">{asset}</span>
        <Button
          className="ml-auto"
          variant="secondary"
          disabled={!connected || phase.kind === 'building' || phase.kind === 'signing'}
          onClick={() => void build()}
        >
          {phase.kind === 'building' ? <Icon icon={Loading03Icon} className="animate-spin" /> : null}
          Build trade
        </Button>
      </div>
      {!connected ? <p className="text-muted-foreground text-sm">Connect a BCH wallet first.</p> : null}

      {phase.kind === 'built' ? (
        <div className="space-y-4 rounded-2xl bg-muted p-4">
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Stat label="Pools" value={String(phase.build.route.pools)} />
            <Stat label="Your coins" value={String(phase.coins)} />
            <Stat label="Router fee" value={`${phase.build.fee_sats} sats`} />
            <Stat label="Miner fee" value={`${phase.build.miner_fee_sats} sats`} />
            <Stat
              label={side === 'buy' ? `You get` : 'You get'}
              value={
                side === 'buy'
                  ? `${formatAmount(BigInt(phase.build.expected_output), 2, 2)} ${asset}`
                  : `${formatAmount(BigInt(phase.build.expected_output), 8, 8)} BCH`
              }
            />
            <Stat
              label="Size"
              value={`${(phase.build.unsigned_tx_hex.length / 2).toLocaleString('en-US')} B`}
            />
          </dl>
          <Button size="lg" onClick={() => void approve(phase.build, phase.owners)}>
            Approve in {wc.walletName ?? 'your wallet'}
          </Button>
        </div>
      ) : null}
      {phase.kind === 'signing' ? (
        <StatusPill tone="pending" icon={<Icon icon={Loading03Icon} className="animate-spin" />}>
          Waiting for your approval in {wc.walletName ?? 'your wallet'}
        </StatusPill>
      ) : null}
      {phase.kind === 'done' ? (
        <a
          href={`${BCH_EXPLORER_TX_URL}${phase.txid}`}
          target="_blank"
          rel="noreferrer"
          className="break-all font-mono text-primary text-sm"
        >
          Broadcast: {phase.txid}
        </a>
      ) : null}
      {phase.kind === 'failed' ? <p className="text-destructive text-sm">{phase.message}</p> : null}
    </div>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-medium text-sm transition-colors',
        on ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-muted',
      )}
    >
      {children}
    </button>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  )
}
