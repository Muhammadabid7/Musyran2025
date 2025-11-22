"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, query, where, updateDoc, increment, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Candidate {
  id: string
  NamaCalonFormatur: string
}

export default function EmergencyPage() {
  const [nis, setNis] = useState("")
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    const fetchCandidates = async () => {
      const snapshot = await getDocs(collection(db, "Data_Calon_Formatur"))
      const cands: Candidate[] = []
      snapshot.forEach((doc) => cands.push({ id: doc.id, ...doc.data() } as Candidate))
      cands.sort((a, b) => a.id.localeCompare(b.id))
      setCandidates(cands)
    }
    fetchCandidates()
  }, [])

  const handleEmergencyVote = async () => {
    if (!nis || !selectedCandidate) return
    setLoading(true)
    setMessage("")

    try {
      const q = query(collection(db, "Data_Siswa"), where("NIS", "==", Number(nis)))
      const studentSnapshot = await getDocs(q)

      if (studentSnapshot.empty) {
        setMessage("Error: Siswa tidak ditemukan.")
        setLoading(false)
        return
      }

      const studentDoc = studentSnapshot.docs[0]
      if (studentDoc.data().StatusVoting === "sudah") {
        setMessage("Error: Siswa sudah memilih sebelumnya.")
        setLoading(false)
        return
      }

      await updateDoc(doc(db, "Data_Calon_Formatur", selectedCandidate), {
        JumlahVote: increment(1),
      })

      await updateDoc(studentDoc.ref, { StatusVoting: "sudah" })

      await updateDoc(doc(db, "TotalSudahVoting", "Total"), { TotalSudahVoting: increment(1) })
      await updateDoc(doc(db, "TotalBelumVoting", "Total"), { TotalBelumVoting: increment(-1) })

      setMessage("Sukses: Suara berhasil disimpan (Mode Darurat).")
      setNis("")
      setSelectedCandidate("")
    } catch (error) {
      console.error(error)
      setMessage("Error: Gagal menyimpan suara.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto py-8">
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700 flex items-center gap-2">⚠️ Mode Darurat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-red-600 mb-4">
            Gunakan mode ini hanya jika monitor bilik suara tidak berfungsi atau kondisi darurat lainnya.
          </p>

          <div className="space-y-2">
            <Label>Nomor Induk Siswa (NIS)</Label>
            <Input
              value={nis}
              onChange={(e) => setNis(e.target.value)}
              placeholder="Masukkan NIS Siswa"
              className="bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label>Pilih Calon Formatur</Label>
            <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Pilih Kandidat" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.id} - {c.NamaCalonFormatur}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {message && (
            <div
              className={`p-3 rounded text-sm font-medium ${message.includes("Error") ? "bg-red-200 text-red-800" : "bg-green-200 text-green-800"}`}
            >
              {message}
            </div>
          )}

          <Button
            className="w-full bg-red-600 hover:bg-red-700"
            onClick={handleEmergencyVote}
            disabled={loading || !nis || !selectedCandidate}
          >
            {loading ? "Menyimpan..." : "Simpan Suara Manual"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
