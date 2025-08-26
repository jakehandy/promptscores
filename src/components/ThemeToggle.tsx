import { useTheme } from '../lib/theme'

export default function ThemeToggle() {
  const { mode, theme, toggleMode, systemTheme } = useTheme()

  const currentTheme = mode === 'system' ? systemTheme : theme
  const title = mode === 'system'
    ? `Theme: System (${currentTheme}) — click for opposite`
    : `Theme: ${theme} — click to follow system`

  const Icon = currentTheme === 'dark' ? (
    // moon
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ) : (
    // sun
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )

  return (
    <button className="btn ghost theme-toggle icon-only" onClick={toggleMode} aria-label={title} title={title}>
      <span className="icon" aria-hidden>
        {Icon}
      </span>
    </button>
  )
}
