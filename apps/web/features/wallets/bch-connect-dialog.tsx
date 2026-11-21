'use client'

import { Copy01Icon, Link04Icon, QrCodeIcon, Refresh01Icon } from '@hugeicons/core-free-icons'
import { AlphanumericQRCode, type UseWizardConnectResult } from '@wizardconnect/react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/kit/icon'
import { ChainLogo } from '@/components/kit/logos'
import { Button } from '@/components/ui/button'
import { Dialog, DialogDescription, DialogPopup, DialogTitle } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { toastManager } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

/**
 * Wallets that speak WizardConnect today (Riften Labs' wallet table and each wallet's own release notes, read
 * 2026-11-16). Icons are the ones each wallet's website serves.
 */
const WALLETS = [
  { name: 'Selene', icon: '/wallets/selene.png', where: 'iPhone, Android' },
  { name: 'Paytaca', icon: '/wallets/paytaca.png', where: 'Phones, browser' },
  { name: 'Cashonize', icon: '/wallets/cashonize.png', where: 'Web, desktop' },
  { name: 'Electron Cash', icon: '/wallets/electron-cash.png', where: 'Desktop plugin' },
] as const

/**
 * Connect a Bitcoin Cash wallet over WizardConnect. On a computer: scan the code with a phone wallet (the steps
 * sit beside the code). On a phone: open the wallet app straight from the `wiz:` link,
 * or show the code to scan from another device. The dialog closes itself once the wallet says yes.
 */
export function BchConnectDialog({
  wc,
  paired,
  open,
  onOpenChange,
}: {
  wc: UseWizardConnectResult
  /** A wallet is paired, including a stored session restored after a refresh (see bch-wallet.tsx). */
  paired: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [copied, setCopied] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const started = useRef(false)
  const clearing = useRef(false)
  const wasOpenWhileConnecting = useRef(false)

  // Start one session per opening; a failed attempt waits for "Try again" instead of looping.
  useEffect(() => {
    if (!open) {
      started.current = false
      return
    }
    if (paired) return
    // A pairing that ends while the dialog is open (the wallet refused or dropped it) starts again at once: the code
    // on screen would otherwise be dead. A failed start lands on "idle" with an error and waits for "Try again".
    if (started.current && wc.state !== 'disconnected') return
    if (wc.state === 'idle' || wc.state === 'disconnected') {
      started.current = true
      wc.connect()
    } else if (!wc.uri && !clearing.current) {
      // A stored session that came back without the wallet's keys: no code would ever show. Drop it; once the
      // hook is idle this effect runs again and pairs afresh (a connect() made now would still see the old state).
      clearing.current = true
      void wc.disconnect().finally(() => {
        clearing.current = false
      })
    }
  }, [open, paired, wc])

  useEffect(() => {
    if (open && !paired && (wc.state === 'connecting' || wc.state === 'reconnecting'))
      wasOpenWhileConnecting.current = true
    if (open && paired) {
      onOpenChange(false)
      if (wasOpenWhileConnecting.current) {
        toastManager.add({
          type: 'success',
          title: 'Bitcoin Cash wallet connected',
          description: wc.walletName ? `${wc.walletName} is ready.` : undefined,
        })
      }
      wasOpenWhileConnecting.current = false
    }
  }, [open, paired, wc.state, wc.walletName, onOpenChange])

  const copy = () => {
    if (!wc.uri) return
    void navigator.clipboard.writeText(wc.uri)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  const retry = async () => {
    await wc.disconnect()
    wc.connect()
  }

  const ready = Boolean(wc.qrUri && wc.uri)
  const qr = (
    <div className="flex flex-col items-center gap-3">
      <div className="flex size-[15.5rem] items-center justify-center rounded-3xl bg-white p-3 shadow-card ring-1 ring-black/5">
        {ready ? (
          <AlphanumericQRCode
            value={wc.qrUri as string}
            size={224}
            foreground="#121111"
            background="#ffffff"
          />
        ) : (
          <Spinner className="size-6 text-[#121111]/50" />
        )}
      </div>
      <p className="flex h-5 items-center gap-2 text-muted-foreground text-sm">
        {wc.error ? (
          <span className="text-destructive">{wc.error}</span>
        ) : (
          <>
            <Spinner className="size-3.5" />
            Waiting for your wallet…
          </>
        )}
      </p>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-sm:rounded-t-[1.75rem] sm:max-w-[46rem] sm:rounded-[2rem]">
        <div className="grid gap-8 p-6 pt-7 sm:grid-cols-[1fr_auto] sm:p-9">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <span className="flex items-center gap-2">
                <ChainLogo chain="bch" size={22} />
                <span className="label-mono">WizardConnect</span>
              </span>
              <DialogTitle className="font-medium text-[1.75rem] leading-[1.1] tracking-[-0.04em]">
                Connect a Bitcoin Cash wallet
              </DialogTitle>
              <DialogDescription>
                Your wallet holds the keys and approves every transaction. Hashi never holds your coins.
              </DialogDescription>
            </div>

            <ol className="flex flex-col gap-3 text-[0.9375rem]">
              {[
                { id: 'open', text: 'Open your Bitcoin Cash wallet' },
                {
                  id: 'scan',
                  text: (
                    <>
                      <span className="max-sm:hidden">Scan this code, or paste the link</span>
                      <span className="sm:hidden">Tap “Open wallet app”, or paste the link</span>
                    </>
                  ),
                },
                { id: 'approve', text: 'Approve Hashi in the wallet' },
              ].map((step, i) => (
                <li key={step.id} className="flex items-center gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs">
                    {i + 1}
                  </span>
                  {step.text}
                </li>
              ))}
            </ol>

            <div className="grid grid-cols-2 gap-2">
              {WALLETS.map((w) => (
                <div key={w.name} className="flex items-center gap-2.5 rounded-2xl bg-muted p-2.5">
                  <Image src={w.icon} alt="" width={32} height={32} className="rounded-[0.6rem] bg-white" />
                  <span className="min-w-0">
                    <span className="block font-medium text-sm leading-tight">{w.name}</span>
                    <span className="block truncate text-muted-foreground text-xs">{w.where}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="max-sm:hidden">{qr}</div>

          <div className="flex flex-col gap-2 sm:hidden">
            {wc.error ? (
              <Button size="xl" onClick={() => void retry()}>
                <Icon icon={Refresh01Icon} />
                Try again
              </Button>
            ) : (
              <Button
                size="xl"
                disabled={!ready}
                nativeButton={false}
                render={<a href={wc.uri ?? undefined} />}
              >
                <Icon icon={Link04Icon} />
                Open wallet app
              </Button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="soft" size="lg" disabled={!ready} onClick={copy}>
                <Icon icon={Copy01Icon} />
                {copied ? 'Copied' : 'Copy link'}
              </Button>
              <Button variant="soft" size="lg" disabled={!ready} onClick={() => setShowQr((v) => !v)}>
                <Icon icon={QrCodeIcon} />
                {showQr ? 'Hide code' : 'Show code'}
              </Button>
            </div>
            <div className={cn('pt-4', !showQr && 'hidden')}>{qr}</div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-border border-t px-6 py-4 max-sm:hidden sm:px-9">
          <p className="text-muted-foreground text-xs">
            HD wallets only. The session stays until you disconnect.
          </p>
          <div className="flex gap-2">
            {wc.error ? (
              <Button variant="soft" size="sm" onClick={() => void retry()}>
                <Icon icon={Refresh01Icon} />
                Try again
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" disabled={!ready} onClick={copy}>
              <Icon icon={Copy01Icon} />
              {copied ? 'Copied' : 'Copy link'}
            </Button>
          </div>
        </div>
      </DialogPopup>
    </Dialog>
  )
}
