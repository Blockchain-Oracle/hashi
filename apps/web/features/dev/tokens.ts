/** The palette as shown on /dev: each role, the CSS variable that carries it, and its value in each theme. */
export interface Swatch {
  name: string
  role: string
  cssVar: string
  light: string
  dark: string
}

export const SWATCHES: readonly Swatch[] = [
  { name: 'Paper', role: 'Page', cssVar: '--background', light: '#FFFAF5', dark: '#0F0E0E' },
  { name: 'Card', role: 'Panels and inputs', cssVar: '--card', light: '#FFFFFF', dark: '#171616' },
  { name: 'Chip', role: 'Muted surfaces', cssVar: '--muted', light: '#F2EFEB', dark: '#211F1E' },
  { name: 'Ink', role: 'Text and strong actions', cssVar: '--foreground', light: '#121111', dark: '#FFFAF5' },
  {
    name: 'Ink 62%',
    role: 'Secondary text',
    cssVar: '--muted-foreground',
    light: 'ink / 62%',
    dark: 'paper / 60%',
  },
  { name: 'Hairline', role: 'Borders', cssVar: '--border', light: 'ink / 8%', dark: 'white / 8%' },
  { name: 'Vermilion', role: 'The one action', cssVar: '--primary', light: '#FF2F00', dark: '#FF4419' },
  { name: 'Success', role: 'Done, received', cssVar: '--success', light: '#3F8C1C', dark: '#6FD23F' },
  { name: 'Pending', role: 'In progress', cssVar: '--pending', light: '#512DA8', dark: '#9B7BF0' },
  { name: 'Warning', role: 'Slow, check this', cssVar: '--warning', light: '#E8650F', dark: '#FDA24A' },
  { name: 'Error', role: 'Failed, refunded', cssVar: '--destructive', light: '#E73827', dark: '#FF6A4D' },
]

export const CANDIES = [
  { candy: 'vermilion', stops: '#FF5A2A → #FF2F00', use: 'Hashi, primary actions' },
  { candy: 'violet', stops: '#673AB7 → #512DA8', use: 'Pending, NEAR Intents' },
  { candy: 'red', stops: '#F85032 → #E73827', use: 'Errors, refunds' },
  { candy: 'amber', stops: '#FDC830 → #F37335', use: 'Warnings, slow steps' },
  { candy: 'green', stops: '#50B224 → #3F8C1C', use: 'Success, Bitcoin Cash side' },
  { candy: 'ink', stops: '#3A3634 → #121111', use: 'Neutral tiles' },
] as const
