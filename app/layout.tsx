import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import Image from "next/image"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "E-Voting SMK Muhammadiyah 1 Sangatta Utara",
  description: "Sistem Voting IPM Musyran 2025",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <body className={`font-sans antialiased min-h-screen flex flex-col bg-gray-50`}>
        <header className="bg-white shadow-sm border-b sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 flex items-center gap-4">
            <div className="relative h-12 w-12 shrink-0">
              <Image
                src="/images/logo.png"
                alt="Logo SMK Muhammadiyah 1 Sangatta Utara"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-green-700 leading-tight">PR IPM SMK Muhammadiyah 1</h1>
              <p className="text-sm text-gray-600 font-medium">Sangatta Utara</p>
            </div>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 py-6">{children}</main>

        <footer className="bg-white border-t py-6 mt-auto">
          <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
            <p>Dibuat dengan 🤍 oleh Muhammad Abid</p>
            <p className="mt-1 text-xs">© 2025 Musyran IPM</p>
          </div>
        </footer>

        <Analytics />
      </body>
    </html>
  )
}
