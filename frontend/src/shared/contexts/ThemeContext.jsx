
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

export const ThemeContext = createContext(null)

const THEME_KEY = 'chitchat-theme'
const DARK_MODE_QUERY = '(prefers-color-scheme: dark)'

const isValidTheme = value =>
  value === 'dark' || value === 'light'

// ======================================================
// THEME HELPERS
// ======================================================

function getSystemTheme() {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return 'light'
  }

  return window.matchMedia(DARK_MODE_QUERY).matches
    ? 'dark'
    : 'light'
}

function getSavedTheme() {
  if (typeof window === 'undefined') {
    return 'light'
  }

  try {
    const savedTheme = window.localStorage.getItem(THEME_KEY)

    if (isValidTheme(savedTheme)) {
      return savedTheme
    }
  } catch {
    // Local storage may be unavailable.
  }

  return getSystemTheme()
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  const isDark = theme === 'dark'

  root.classList.toggle('dark', isDark)
  root.style.colorScheme = theme
}

function saveTheme(theme) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(THEME_KEY, theme)
  } catch {
    // Ignore storage errors.
  }
}

// ======================================================
// THEME PROVIDER
// ======================================================

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getSavedTheme)

  // Apply theme to the document.
  useEffect(() => {
    applyTheme(theme)
    saveTheme(theme)
  }, [theme])

  // Change theme explicitly.
  const setTheme = useCallback(nextTheme => {
    setThemeState(previous => {
      const resolved =
        typeof nextTheme === 'function'
          ? nextTheme(previous)
          : nextTheme

      return isValidTheme(resolved)
        ? resolved
        : previous
    })
  }, [])

  // Toggle between light and dark mode.
  const toggleTheme = useCallback(() => {
    setThemeState(previous =>
      previous === 'dark' ? 'light' : 'dark'
    )
  }, [])

  // Synchronize theme changes across browser tabs.
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorageChange = event => {
      if (event.key !== THEME_KEY) return

      if (isValidTheme(event.newValue)) {
        setThemeState(event.newValue)
      } else {
        setThemeState(getSystemTheme())
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  // ====================================================
  // CONTEXT VALUE
  // ====================================================

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      isDark: theme === 'dark',
      isLight: theme === 'light',
    }),
    [theme, setTheme, toggleTheme]
  )

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
