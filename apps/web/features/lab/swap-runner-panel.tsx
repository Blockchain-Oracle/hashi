'use client'

import { Loading03Icon } from '@hugeicons/core-free-icons'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { parseUnits } from 'viem'
import { Icon } from '@/components/kit/icon'
import { AssetLogo, AssetOnChain, BrandLogo } from '@/components/kit/logos'
import { type PillTone, StatusPill } from '@/components/kit/status-pill'
import { Button } from '@/components/ui/button'
import { useBchWallet } from '@/features/wallets/bch-wallet'
import { useEvmWallet } from '@/features/wallets/evm-wallet'
import { BCH_ASSETS, type BchAssetId, STABLES } from '@/lib/constants/assets'
import { BCH_EXPLORER_TX_URL, CHAINS } from '@/lib/constants/chains'
import { DEFAULT_SLIPPAGE_BPS, STATUS_POLL_MS } from '@/lib/constants/limits'
import { finishArrival } from '@/lib/engine/arrival'
import { tradesOnArrival } from '@/lib/engine/arrival-terms'
import {
  type BchSide,
  checkBridge,
  finishOnCauldron,
  nextStep,
  sendDeposit,
  startSwap,
} from '@/lib/engine/runner'
import { loadSwaps, type SwapRecord, type SwapStatus, saveSwap } from '@/lib/engine/swap'
import { type BridgeDirection, PROVIDERS, type ProviderId } from '@/lib/engine/types'
import { cn } from '@/lib/utils'
import type { LogEntry } from './bch-panel'

const EVM_STABLES = STABLES.filter((s) => CHAINS[s.chain].kind === 'evm')

const TONE: Record<SwapStatus, PillTone> = {
  quoted: 'ink',
  'deposit-sent': 'pending',
  bridging: 'pending',
  'bch-arrived': 'warning',
  swapping: 'pending',
  completed: 'success',
  refunded: 'error',
  failed: 'error',
  expired: 'ink',
}

function stamp() {
  return new Date().toISOString().slice(11, 23)
}

/**
 * T1, T2, T5, T7, T8: a real swap, run step by step on the same engine the app will use. Each approval happens in
 * the person's own wallet; Hashi checks the bridge every 5 s while it waits; every step is saved, so a closed tab
 * resumes from the list below.
 */
export function SwapRunnerPanel({ onLog }: { onLog: (entry: LogEntry) => void }) {
  const { wc, scan } = useBchWallet()
  const evm = useEvmWallet()
  const [provider, setProvider] = useState<ProviderId>('near')
  const [direction, setDirection] = useState<BridgeDirection>('in')
  const [stableIndex, setStableIndex] = useState(0)
  const [bchAsset, setBchAsset] = useState<BchAssetId>('PUSD')
  const [text, setText] = useState('1')
  const [oneApproval, setOneApproval] = useState(true)
  const [gasless, setGasless] = useState(false)
  const [record, setRecord] = useState<SwapRecord | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const swaps = useQuery({ queryKey: ['swaps'], queryFn: loadSwaps })
  const polling = useRef(false)

  const log = (step: string, detail: string) => onLog({ at: stamp(), step, detail })
  const stables = EVM_STABLES.filter((s) => provider === 'near' || s.thorchainAsset)
  const stable = stables[Math.min(stableIndex, stables.length - 1)] ?? stables[0]
  const receive = scan.data?.addresses.find((a) => a.path === 'receive')
  const bch: BchSide | undefined =
    wc.manager && receive
      ? { manager: wc.manager, receive, coins: async () => (await scan.refetch()).data?.utxos ?? [] }
      : undefined
  const ready = Boolean(bch && evm.evmAddress && stable)
  const gaslessAllowed =
    provider === 'near' && direction === 'in' && stable?.chain === 'base' && stable.symbol === 'USDC'

  async function persist(next: SwapRecord) {
    await saveSwap(next)
    setRecord(next)
    void swaps.refetch()
  }

  async function run(label: string, step: () => Promise<SwapRecord>) {
    setBusy(label)
    setError(null)
    try {
      await persist(await step())
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      log('error', message)
      setError(message)
    } finally {
      setBusy(null)
    }
  }

  function start() {
    if (!stable || !receive || !evm.evmAddress) return
    const decimals = direction === 'in' ? stable.decimals : BCH_ASSETS[bchAsset].decimals
    const amount = parseUnits(text || '0', decimals)
    void run('Getting a real quote', () =>
      startSwap(
        {
          provider,
          pair: { direction, stable, bchAsset },
          amount,
          slippageBps: DEFAULT_SLIPPAGE_BPS,
          addresses: {
            stableSide: evm.evmAddress as string,
            bchPlain: receive.plain,
            bchToken: receive.token,
          },
          oneApproval,
          gasless: gaslessAllowed && gasless,
        },
        log,
      ),
    )
  }

  // While the bridge works, check it every 5 s. One check at a time.
  useEffect(() => {
    if (!record || nextStep(record) !== 'wait') return
    const timer = setInterval(async () => {
      if (polling.current) return
      polling.current = true
      try {
        const next = await checkBridge(record, (s, d) => onLog({ at: stamp(), step: s, detail: d }))
        if (next !== record) {
          await saveSwap(next)
          setRecord(next)
        }
      } catch (e) {
        onLog({ at: stamp(), step: 'check', detail: e instanceof Error ? e.message : String(e) })
      } finally {
        polling.current = false
      }
    }, STATUS_POLL_MS)
    return () => clearInterval(timer)
  }, [record, onLog])

  const step = record ? nextStep(record) : undefined
  const paySymbol = direction === 'in' ? stable?.symbol : bchAsset

  return (
    <div className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-6 shadow-card">
      <div>
        <p className="label-mono">T1 · T2 · T5 · T7 · T8 — a real swap, step by step</p>
        <p className="mt-2 text-muted-foreground text-sm">
          A real quote issues a deposit address and moves nothing. Money moves only when you approve the
          deposit in your wallet. Swaps started here pay your wallet, not a swap contract, so a swap into PUSD
          or MUSD takes the two-approval path (the swap screen uses the contract).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['near', 'thorchain'] as const).map((p) => (
          <Chip key={p} on={provider === p} onClick={() => setProvider(p)}>
            <BrandLogo brand={p} size={18} />
            {PROVIDERS[p].short}
          </Chip>
        ))}
        <span className="mx-1 w-px bg-border" />
        {(['in', 'out'] as const).map((d) => (
          <Chip key={d} on={direction === d} onClick={() => setDirection(d)}>
            {d === 'in' ? 'Into BCH' : 'Out of BCH'}
          </Chip>
        ))}
        <span className="mx-1 w-px bg-border" />
        {(['PUSD', 'MUSD', 'BCH'] as const).map((a) => (
          <Chip key={a} on={bchAsset === a} onClick={() => setBchAsset(a)}>
            <AssetLogo asset={a} size={18} />
            {a}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {stables.map((s, i) => (
          <Chip key={`${s.symbol}-${s.chain}`} on={stable === s} onClick={() => setStableIndex(i)}>
            <AssetOnChain asset={s.symbol} chain={s.chain} size={18} />
            {s.symbol} {CHAINS[s.chain].name}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          inputMode="decimal"
          aria-label={`Amount in ${paySymbol}`}
          value={text}
          onChange={(e) => setText(e.target.value.replace(/[^0-9.]/g, ''))}
          className="w-36 rounded-2xl bg-muted px-4 py-3 text-2xl text-amount outline-none focus:ring-4 focus:ring-ring"
        />
        <span className="text-muted-foreground">{paySymbol}</span>
        {direction === 'out' && provider === 'near' && bchAsset !== 'BCH' ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={oneApproval} onChange={(e) => setOneApproval(e.target.checked)} />
            One approval (T5)
          </label>
        ) : null}
        {gaslessAllowed ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={gasless} onChange={(e) => setGasless(e.target.checked)} />
            Gasless (T6)
          </label>
        ) : null}
        <Button className="ml-auto" variant="secondary" disabled={!ready || Boolean(busy)} onClick={start}>
          Get a real quote
        </Button>
      </div>
      {!ready ? (
        <p className="text-muted-foreground text-sm">Connect both wallets above to start a swap.</p>
      ) : null}

      {record ? (
        <div className="space-y-4 rounded-2xl bg-muted p-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={TONE[record.status]}>{record.status}</StatusPill>
            <span className="font-mono text-muted-foreground text-xs">
              {PROVIDERS[record.provider].short} · {record.direction} ·{' '}
              {record.stable ? `${record.stable.symbol} ${CHAINS[record.stable.chain].name}` : record.bchFrom}{' '}
              · {record.bchAsset} · approvals {record.approvals}
            </span>
          </div>
          {record.depositAddress ? (
            <p className="break-all font-mono text-xs">Deposit: {record.depositAddress}</p>
          ) : null}
          <ol className="space-y-1 font-mono text-xs">
            {record.events.map((e) => (
              <li key={`${e.at}-${e.status}`}>
                {new Date(e.at).toISOString().slice(11, 19)}Z · {e.status} · {e.note}
              </li>
            ))}
          </ol>
          <TxLinks record={record} />
          {step === 'deposit' ? (
            <Button
              disabled={Boolean(busy)}
              onClick={() =>
                void run('Waiting for your wallet', () =>
                  sendDeposit(record, { bch, solana: { send: evm.sendSolanaToken } }, log, {
                    checkpoint: persist,
                  }),
                )
              }
            >
              Send the deposit — approve in your wallet
            </Button>
          ) : null}
          {step === 'finish' && tradesOnArrival(record) ? (
            <Button
              disabled={Boolean(busy)}
              onClick={() => void run('Trading from the swap contract', () => finishArrival(record, log))}
            >
              Trade the BCH from the swap contract (no approval)
            </Button>
          ) : step === 'finish' && bch ? (
            <Button
              disabled={Boolean(busy)}
              onClick={() => void run('Waiting for your wallet', () => finishOnCauldron(record, bch, log))}
            >
              Swap the BCH into {record.bchAsset} — approve in your wallet
            </Button>
          ) : null}
          {step === 'wait' ? (
            <StatusPill tone="pending" icon={<Icon icon={Loading03Icon} className="animate-spin" />}>
              Checking the bridge every 5 seconds
            </StatusPill>
          ) : null}
        </div>
      ) : null}
      {busy ? (
        <StatusPill tone="pending" icon={<Icon icon={Loading03Icon} className="animate-spin" />}>
          {busy}
        </StatusPill>
      ) : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      {swaps.data?.length ? (
        <div className="space-y-2">
          <p className="label-mono">Saved swaps (this browser)</p>
          {swaps.data.slice(0, 8).map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-2 text-sm">
              <StatusPill tone={TONE[s.status]}>{s.status}</StatusPill>
              <span className="font-mono text-muted-foreground text-xs">
                {new Date(s.createdAt).toISOString().slice(5, 16).replace('T', ' ')} ·{' '}
                {PROVIDERS[s.provider].short} · {s.direction} · {s.bchAsset}
              </span>
              <Button variant="ghost" size="xs" className="ml-auto" onClick={() => setRecord(s)}>
                Open
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function TxLinks({ record }: { record: SwapRecord }) {
  const links: [string, string][] = []
  if (record.depositTx) links.push(['Deposit', record.depositTx])
  if (record.bchTxid) links.push(['BCH', `${BCH_EXPLORER_TX_URL}${record.bchTxid}`])
  if (record.cauldronTxid) links.push(['Cauldron', `${BCH_EXPLORER_TX_URL}${record.cauldronTxid}`])
  if (record.payoutTx) links.push(['Payout', record.payoutTx])
  if (!links.length) return null
  return (
    <ul className="space-y-1 text-xs">
      {links.map(([label, value]) => (
        <li key={label} className="break-all font-mono">
          {label}:{' '}
          {value.startsWith('http') ? (
            <a href={value} target="_blank" rel="noreferrer" className="text-primary">
              {value.split('/').pop()}
            </a>
          ) : (
            value
          )}
        </li>
      ))}
    </ul>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-medium text-sm transition-colors',
        on ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-background',
      )}
    >
      {children}
    </button>
  )
}
