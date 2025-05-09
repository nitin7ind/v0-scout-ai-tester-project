import Image from "next/image"
import Link from "next/link"

export function Header() {
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-4 px-6">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center">
          <Image
            src="/images/wobot-logo.png"
            alt="Wobot.ai Logo"
            width={120}
            height={40}
            priority
            style={{
              maxWidth: "100%",
              height: "auto",
            }}
          />
        </Link>
      </div>
    </header>
  )
}
