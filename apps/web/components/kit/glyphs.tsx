import {
  Alert02Icon,
  AlertCircleIcon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  Loading03Icon,
  MinusSignIcon,
  Moon02Icon,
  PlusSignIcon,
  Search01Icon,
  Sun03Icon,
  UnfoldMoreIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type HugeiconsIconProps } from '@hugeicons/react'

/**
 * One icon family across Hashi. The registry components (coss, Magic UI) import lucide icons by name; their imports
 * point here instead, so their close, search, chevron and status glyphs are Hugeicons like the rest of the app.
 * Sizing still comes from each component's own `size-*` classes.
 */

type GlyphProps = Omit<HugeiconsIconProps, 'icon'>

function Glyph({ icon, strokeWidth = 1.75, ...props }: HugeiconsIconProps) {
  return <HugeiconsIcon icon={icon} strokeWidth={strokeWidth} aria-hidden {...props} />
}

export const XIcon = (props: GlyphProps) => <Glyph icon={Cancel01Icon} {...props} />
export const SearchIcon = (props: GlyphProps) => <Glyph icon={Search01Icon} {...props} />
export const ChevronRightIcon = (props: GlyphProps) => <Glyph icon={ArrowRight01Icon} {...props} />
export const ChevronDownIcon = (props: GlyphProps) => <Glyph icon={ArrowDown01Icon} {...props} />
export const ChevronsUpDownIcon = (props: GlyphProps) => <Glyph icon={UnfoldMoreIcon} {...props} />
export const MinusIcon = (props: GlyphProps) => <Glyph icon={MinusSignIcon} {...props} />
export const PlusIcon = (props: GlyphProps) => <Glyph icon={PlusSignIcon} {...props} />
export const Loader2Icon = (props: GlyphProps) => <Glyph icon={Loading03Icon} {...props} />
export const LoaderCircleIcon = (props: GlyphProps) => <Glyph icon={Loading03Icon} {...props} />
export const CircleCheckIcon = (props: GlyphProps) => <Glyph icon={CheckmarkCircle02Icon} {...props} />
export const CircleAlertIcon = (props: GlyphProps) => <Glyph icon={AlertCircleIcon} {...props} />
export const TriangleAlertIcon = (props: GlyphProps) => <Glyph icon={Alert02Icon} {...props} />
export const InfoIcon = (props: GlyphProps) => <Glyph icon={InformationCircleIcon} {...props} />
export const Sun = (props: GlyphProps) => <Glyph icon={Sun03Icon} {...props} />
export const Moon = (props: GlyphProps) => <Glyph icon={Moon02Icon} {...props} />
