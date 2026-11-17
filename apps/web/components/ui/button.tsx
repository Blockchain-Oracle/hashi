import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Hashi's button: 14px radius, a glossy face from layered white inner highlights.
 * Vermilion is the one action per screen; ink is the strong secondary; the rest stay quiet.
 */
const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-transparent font-medium outline-none transition-[filter,background-color,color,box-shadow,transform] duration-200 ease-(--ease-out-soft) focus-visible:ring-4 focus-visible:ring-ring active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive [&_svg:not([class*='size-'])]:size-[1.15em] [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-gloss hover:brightness-[1.07]',
        secondary: 'bg-secondary text-secondary-foreground shadow-gloss-ink hover:brightness-[1.15]',
        outline: 'border-border bg-card text-foreground shadow-card hover:bg-muted',
        soft: 'bg-muted text-foreground hover:bg-accent',
        ghost: 'text-foreground hover:bg-muted',
        destructive: 'bg-destructive/10 text-destructive hover:bg-destructive/15',
        link: 'h-auto px-0 text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-5 text-[0.9375rem]',
        sm: 'h-9 rounded-md px-3.5 text-sm',
        xs: 'h-7 rounded-sm px-2.5 text-xs',
        lg: 'h-12 rounded-xl px-6 text-base',
        xl: 'h-14 w-full rounded-2xl px-6 text-[1.0625rem]',
        icon: 'size-10 rounded-full',
        'icon-sm': 'size-8 rounded-full',
        'icon-lg': 'size-12 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
