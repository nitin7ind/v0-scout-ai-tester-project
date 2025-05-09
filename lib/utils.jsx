// Simple classname utility
export function cn(...classes) {
  return classes.filter(Boolean).join(" ")
}

// Get current date in YYYY-MM-DD format
export function getCurrentDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
