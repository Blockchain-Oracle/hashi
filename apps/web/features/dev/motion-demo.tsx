'use client'

import { RepeatIcon } from '@hugeicons/core-free-icons'
import { useState } from 'react'
import { Icon } from '@/components/kit/icon'
import { Button } from '@/components/ui/button'
import { TextEffect } from '@/components/ui/text-effect'

/** Motion-Primitives' text effect (blur preset, per word): headlines sharpen into place. Replays on demand. */
export function MotionDemo() {
  const [run, setRun] = useState(0)
  return (
    <div className="flex flex-col items-start gap-6 rounded-3xl border border-border bg-card p-8 shadow-card">
      <TextEffect key={run} as="p" per="word" preset="blur" className="text-display">
        Dollars in, dollars out.
      </TextEffect>
      <Button variant="soft" size="sm" onClick={() => setRun((n) => n + 1)}>
        <Icon icon={RepeatIcon} />
        Replay reveal
      </Button>
    </div>
  )
}
