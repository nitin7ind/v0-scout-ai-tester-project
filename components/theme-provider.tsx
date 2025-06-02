"use client"
import { createContext, useContext, useEffect, useState, ReactNode, Dispatch, SetStateAction } from "react"

type Theme = "light" | "dark" | "system"

interface ThemeContextType {
  theme: Theme
  setTheme: Dispatch<SetStateAction<Theme>>
}

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: Theme
}

const ThemeContext = createContext<ThemeContextType>({ 
  theme: "system", 
  setTheme: () => {} 
})

export function ThemeProvider({ children, defaultTheme = "system" }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)
  const [mounted, setMounted] = useState(false)

  // Handle initial theme setup and persistence
  useEffect(() => {
    setMounted(true)
    
    // Check for saved theme in localStorage
    const savedTheme = localStorage.getItem("theme") as Theme
    if (savedTheme && (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system")) {
      setTheme(savedTheme)
    }
  }, [])

  // Apply theme changes to DOM
  useEffect(() => {
    if (!mounted) return

    const root = window.document.documentElement
    root.classList.remove("light", "dark")

    let effectiveTheme = theme
    if (theme === "system") {
      effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    }

    root.classList.add(effectiveTheme)
    
    // Save theme to localStorage
    localStorage.setItem("theme", theme)
  }, [theme, mounted])

  // Handle system theme changes
  useEffect(() => {
    if (!mounted || theme !== "system") return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => {
      const root = window.document.documentElement
      root.classList.remove("light", "dark")
      root.classList.add(mediaQuery.matches ? "dark" : "light")
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [theme, mounted])

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return <div style={{ visibility: "hidden" }}>{children}</div>
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext)
}
