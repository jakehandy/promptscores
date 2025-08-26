import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type Theme = 'light' | 'dark'
export type ThemeMode = 'system' | Theme

type ThemeContextValue = {
  mode: ThemeMode
  theme: Theme
  systemTheme: Theme
  toggleMode: () => void // system <-> opposite-of-system
  setMode: (m: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)
const STORAGE_KEY = 'theme-mode'

function getSystemTheme(): Theme {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => (localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'system')
  const [systemTheme, setSystemTheme] = useState<Theme>(typeof window !== 'undefined' ? getSystemTheme() : 'dark')

  useEffect(() => {
    if (!window.matchMedia) return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemTheme(mql.matches ? 'dark' : 'light')
    mql.addEventListener?.('change', onChange)
    return () => mql.removeEventListener?.('change', onChange)
  }, [])

  const theme: Theme = mode === 'system' ? systemTheme : mode

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    // also update meta theme-color for better mobile UI
    const lightMeta = document.querySelector('meta[name="theme-color"][media*="light"]') as HTMLMetaElement | null
    const darkMeta = document.querySelector('meta[name="theme-color"][media*="dark"]') as HTMLMetaElement | null
    if (lightMeta && darkMeta) {
      // leave as-is; browser chooses based on media query
    } else {
      const meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null
      if (meta) meta.content = theme === 'dark' ? '#0c1410' : '#f4fbf7'
    }
  }, [theme])

  const value = useMemo<ThemeContextValue>(() => ({
    mode,
    theme,
    systemTheme,
    toggleMode: () => {
      if (mode === 'system') {
        const opposite = systemTheme === 'dark' ? 'light' : 'dark'
        setMode(opposite)
        localStorage.setItem(STORAGE_KEY, opposite)
      } else {
        setMode('system')
        localStorage.setItem(STORAGE_KEY, 'system')
      }
    },
    setMode: (m) => {
      setMode(m)
      localStorage.setItem(STORAGE_KEY, m)
    },
  }), [mode, theme, systemTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
