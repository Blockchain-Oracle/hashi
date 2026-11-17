'use client'

import { type MotionValue, motion, useScroll, useTransform } from 'motion/react'
import { type ComponentPropsWithoutRef, type FC, type ReactNode, useRef } from 'react'

import { cn } from '@/lib/utils'

export interface TextRevealProps extends ComponentPropsWithoutRef<'div'> {
  children: string
}

/**
 * Magic UI's text reveal. Hashi pins a block exactly one screen tall (`h-dvh`, upstream used half the section), so the
 * words sit in the middle of the screen and the section's whole scroll lights them, first word to last.
 */
export const TextReveal: FC<TextRevealProps> = ({ children, className }) => {
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
  })

  if (typeof children !== 'string') {
    throw new Error('TextReveal: children must be a string')
  }

  const words = children.split(' ')

  return (
    <div ref={sectionRef} className={cn('relative z-0 h-[200vh]', className)}>
      <div className={'sticky top-0 mx-auto flex h-dvh max-w-4xl items-center bg-transparent px-4 py-20'}>
        <span
          className={
            'flex flex-wrap p-5 font-medium text-[2rem] text-foreground/15 leading-[1.12] tracking-[-0.035em] md:p-8 md:text-[2.75rem] lg:p-10 lg:text-[3.5rem]'
          }
        >
          {words.map((word, i) => {
            const start = i / words.length
            const end = start + 1 / words.length
            return (
              <Word key={i} progress={scrollYProgress} range={[start, end]}>
                {word}
              </Word>
            )
          })}
        </span>
      </div>
    </div>
  )
}

interface WordProps {
  children: ReactNode
  progress: MotionValue<number>
  range: [number, number]
}

const Word: FC<WordProps> = ({ children, progress, range }) => {
  const opacity = useTransform(progress, range, [0, 1])
  return (
    <span className="xl:lg-3 relative mx-1 lg:mx-1.5">
      <span className="absolute">{children}</span>
      <motion.span style={{ opacity: opacity }} className={'text-foreground'}>
        {children}
      </motion.span>
    </span>
  )
}
