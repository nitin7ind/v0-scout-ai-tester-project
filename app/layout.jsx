import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "ScoutAI Dashboard",
  description: "Analyze images with AI",
  icons: {
    icon: "/favicon_app.ico",
    shortcut: "/favicon_app.ico",
    apple: "/favicon_app.ico",
  },
    generator: 'v0.dev'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon_app.ico" />
        <link rel="shortcut icon" href="/favicon_app.ico" />
        <link rel="apple-touch-icon" href="/favicon_app.ico" />
      </head>
      <body className={inter.className}>
        <ThemeProvider defaultTheme="system">{children}</ThemeProvider>
      </body>
    </html>
  )
}
