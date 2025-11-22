"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Monitor, Smartphone } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showModeSelection, setShowModeSelection] = useState(false)
  const [panitiaId, setPanitiaId] = useState("")
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const q = query(collection(db, "Data_Admin"), where("Email", "==", email), where("Password", "==", password))

      const snapshot = await getDocs(q)

      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0]
        const docId = userDoc.id

        if (docId === "Admin" || email.includes("admin")) {
          if (typeof window !== "undefined") {
            localStorage.setItem("adminEmail", email)
            localStorage.setItem("role", "admin")
          }
          router.push("/admin/dashboard")
        } else {
          // Extract panitia ID from email
          const idMatch = email.match(/\d+/)
          const pId = idMatch ? idMatch[0].padStart(2, "0") : "01"

          setPanitiaId(pId)
          localStorage.setItem("panitiaId", pId)
          localStorage.setItem("role", "panitia")

          // Show mode selection dialog instead of direct redirect
          setShowModeSelection(true)
        }
      } else {
        setError("Email atau password salah.")
      }
    } catch (err) {
      console.error(err)
      setError("Terjadi kesalahan saat login.")
    } finally {
      setLoading(false)
    }
  }

  const handleModeSelect = (mode: "monitor" | "hp") => {
    if (mode === "monitor") {
      router.push(`/panitia/${panitiaId}/monitor`)
    } else {
      router.push(`/panitia/${panitiaId}/dashboard`)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-green-700">Login Petugas</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="panitia01@sekolah.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
              {loading ? "Memproses..." : "Masuk"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Dialog open={showModeSelection} onOpenChange={setShowModeSelection}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Pilih Mode Perangkat</DialogTitle>
            <DialogDescription className="text-center">
              Apakah perangkat ini akan digunakan sebagai Monitor Bilik atau HP Panitia (Scanner)?
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button
              variant="outline"
              className="h-32 flex flex-col items-center justify-center gap-3 hover:bg-green-50 hover:border-green-500 transition-all bg-transparent"
              onClick={() => handleModeSelect("monitor")}
            >
              <Monitor className="w-10 h-10 text-green-600" />
              <span className="font-bold text-green-700">Mode Monitor</span>
              <span className="text-xs text-gray-500 text-center">Tampilan untuk Monitor</span>
            </Button>
            <Button
              variant="outline"
              className="h-32 flex flex-col items-center justify-center gap-3 hover:bg-blue-50 hover:border-blue-500 transition-all bg-transparent"
              onClick={() => handleModeSelect("hp")}
            >
              <Smartphone className="w-10 h-10 text-blue-600" />
              <span className="font-bold text-blue-700">Mode HP Panitia</span>
              <span className="text-xs text-gray-500 text-center">Untuk scan QR Code</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
