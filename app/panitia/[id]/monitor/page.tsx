"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { doc, onSnapshot, updateDoc, increment, collection, query, where, getDocs, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import Image from "next/image"

interface Candidate {
  id: string
  NamaCalonFormatur: string
  FotoCalonFormatur: string
}

interface BilikState {
  status: "idle" | "voting_active"
  activeVoterName?: string
  activeVoterNIS?: number
}

export default function MonitorPage() {
  const params = useParams()
  const bilikId = params.id as string

  const [bilikState, setBilikState] = useState<BilikState>({ status: "idle" })
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        await updateDoc(doc(db, "BilikVoting", bilikId), {
          heartbeat: new Date(),
        })
      } catch (error) {
        console.error("Heartbeat failed:", error)
      }
    }

    const resetStatus = async () => {
      try {
        await updateDoc(doc(db, "BilikVoting", bilikId), {
          status: "idle",
          activeVoterName: "",
          activeVoterNIS: 0,
        })
      } catch (error) {
        console.error("Failed to reset status:", error)
      }
    }
    resetStatus()

    // Send heartbeat every 5 seconds
    sendHeartbeat()
    const interval = setInterval(sendHeartbeat, 5000)

    return () => clearInterval(interval)
  }, [bilikId])

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "BilikVoting", bilikId), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as BilikState
        setBilikState(data)

        // If status changes to idle, reset selection
        if (data.status === "idle") {
          setSelectedCandidate(null)
        }
      }
    })
    return () => unsub()
  }, [bilikId])

  useEffect(() => {
    const fetchCandidates = async () => {
      const q = collection(db, "Data_Calon_Formatur")
      const snapshot = await getDocs(q)
      const cands: Candidate[] = []
      snapshot.forEach((doc) => {
        cands.push({ id: doc.id, ...doc.data() } as Candidate)
      })
      cands.sort((a, b) => a.id.localeCompare(b.id))
      setCandidates(cands)
    }
    fetchCandidates()
  }, [])

  // Log error helper
  const logError = async (title: string, errorMsg: string) => {
    try {
      const now = new Date()
      await addDoc(collection(db, "error"), {
        tanggal: now.toLocaleString("id-ID", { dateStyle: "full", timeStyle: "long" }),
        judul: title,
        IsiError: errorMsg,
        timestamp: now,
      })

      toast({
        variant: "destructive",
        title: title,
        description: errorMsg,
      })
    } catch (e) {
      console.error("Failed to log error", e)
    }
  }

  const handleVote = async () => {
    if (!selectedCandidate || !bilikState.activeVoterNIS) return
    setIsSubmitting(true)

    try {
      const candidateRef = doc(db, "Data_Calon_Formatur", selectedCandidate)
      await updateDoc(candidateRef, {
        JumlahVote: increment(1),
      })

      const q = query(collection(db, "Data_Siswa"), where("NIS", "==", bilikState.activeVoterNIS))
      const studentSnapshot = await getDocs(q)
      if (!studentSnapshot.empty) {
        const studentDocRef = studentSnapshot.docs[0].ref
        await updateDoc(studentDocRef, {
          StatusVoting: "sudah",
        })
      } else {
        throw new Error(`Siswa dengan NIS ${bilikState.activeVoterNIS} tidak ditemukan saat menyimpan vote`)
      }

      const totalSudahRef = doc(db, "TotalSudahVoting", "Total")
      const totalBelumRef = doc(db, "TotalBelumVoting", "Total")
      await updateDoc(totalSudahRef, { TotalSudahVoting: increment(1) })
      await updateDoc(totalBelumRef, { TotalBelumVoting: increment(-1) })

      const bilikRef = doc(db, "BilikVoting", bilikId)
      await updateDoc(bilikRef, {
        status: "idle",
        activeVoterName: "",
        activeVoterNIS: 0,
      })

      setSelectedCandidate(null)

      toast({
        title: "Berhasil!",
        description: "Suara anda telah tersimpan.",
        className: "bg-green-500 text-white border-none",
      })
    } catch (error: any) {
      console.error("Voting failed:", error)
      logError("Gagal Menyimpan Suara", error.message || "Terjadi kesalahan sistem saat menyimpan suara")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (bilikState.status === "idle") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-green-900 to-gray-900 text-white animate-in fade-in duration-700">
        <Toaster />
        <div className="animate-pulse mb-8">
          <div className="h-48 w-48 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 shadow-2xl p-4">
            <Image
              src="/images/logo.png"
              alt="Logo Sekolah"
              width={150}
              height={150}
              className="object-contain drop-shadow-lg"
            />
          </div>
        </div>
        <h1 className="text-5xl font-bold mb-4 text-center">BILIK SUARA {bilikId}</h1>
        <p className="text-2xl text-green-300 animate-pulse">Menunggu Panitia Scan QR Code...</p>
        <div className="mt-8 text-sm text-gray-400">Monitor Aktif • SMK Muhammadiyah 1 Sangatta Utara</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 sm:p-6 animate-in zoom-in-95 duration-500">
      <Toaster />
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center animate-in slide-in-from-top duration-700">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-800 mb-2">Halo, {bilikState.activeVoterName}</h1>
          <p className="text-sm sm:text-lg text-gray-600">Silakan pilih salah satu calon formatur di bawah ini.</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {candidates.map((candidate, idx) => (
            <Card
              key={candidate.id}
              className={`cursor-pointer transition-all duration-300 transform animate-in slide-in-from-bottom-4 ${
                selectedCandidate === candidate.id
                  ? "ring-4 ring-green-500 shadow-2xl scale-105 -translate-y-2 bg-green-50"
                  : "hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02]"
              }`}
              style={{ animationDelay: `${idx * 100}ms` }}
              onClick={() => setSelectedCandidate(candidate.id)}
            >
              <div className="aspect-[3/4] relative bg-gray-200 overflow-hidden rounded-t-lg">
                {candidate.FotoCalonFormatur ? (
                  <Image
                    src={candidate.FotoCalonFormatur || "/placeholder.svg"}
                    alt={candidate.NamaCalonFormatur}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">No Image</div>
                )}
                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur px-4 py-2 rounded-full font-bold text-xl shadow-lg border-2 border-green-500">
                  {candidate.id}
                </div>
                {selectedCandidate === candidate.id && (
                  <div className="absolute inset-0 bg-green-500/20 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-white rounded-full p-4 shadow-xl">
                      <svg className="w-12 h-12 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
              <CardContent className="p-3 sm:p-4 text-center bg-white">
                <h3 className="font-bold text-base sm:text-xl text-gray-900">{candidate.NamaCalonFormatur}</h3>
                <p className="text-xs sm:text-sm text-gray-500">Calon Formatur</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-white/95 backdrop-blur border-t shadow-2xl flex justify-center animate-in slide-in-from-bottom duration-500">
          <Button
            size="lg"
            className="w-full max-w-md text-base sm:text-lg h-12 sm:h-14 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg transition-all duration-300 hover:shadow-xl disabled:opacity-50"
            disabled={!selectedCandidate || isSubmitting}
            onClick={handleVote}
          >
            {isSubmitting ? "Menyimpan Suara..." : "✓ SIMPAN PILIHAN SAYA"}
          </Button>
        </div>

        <div className="h-20 sm:h-24"></div>
      </div>
    </div>
  )
}
