'use client'

import { Copy01Icon } from '@hugeicons/core-free-icons'
import { useCallback, useState } from 'react'
import { Icon } from '@/components/kit/icon'
import { Button } from '@/components/ui/button'
import { BchWalletCard, CauldronTradePanel, type LogEntry } from './bch-panel'
import { EvmWalletCard } from './evm-panel'
import { SwapRunnerPanel } from './swap-runner-panel'

/** The wallet side of the bench: connect, trade, and a timestamped log of every step (UTC) to paste into the record. */
export function WalletTests() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const onLog = useCallback((entry: LogEntry) => setEntries((all) => [...all, entry]), [])
  const text = entries.map((e) => `${e.at}Z  ${e.step.padEnd(9)} ${e.detail}`).join('\n')

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <BchWalletCard />
        <EvmWalletCard />
        <SwapRunnerPanel onLog={onLog} />
        <CauldronTradePanel onLog={onLog} />
      </div>
      <div className="flex max-h-[calc(100dvh-7rem)] min-h-64 flex-col self-start rounded-3xl border border-border bg-[#121111] p-5 text-[#fffaf5] shadow-card lg:sticky lg:top-24">
        <div className="flex items-center">
          <p className="font-mono text-white/60 text-xs uppercase tracking-[0.08em]">Run log (UTC)</p>
          <Button
            variant="ghost"
            size="xs"
            className="ml-auto text-white/70 hover:bg-white/10 hover:text-white"
            disabled={!entries.length}
            onClick={() => void navigator.clipboard.writeText(text)}
          >
            <Icon icon={Copy01Icon} />
            Copy
          </Button>
        </div>
        <pre className="mt-3 flex-1 overflow-auto whitespace-pre-wrap break-all font-mono text-[0.75rem] text-white/85 leading-relaxed">
          {text || 'Nothing run yet.'}
        </pre>
      </div>
    </div>
  )
}
