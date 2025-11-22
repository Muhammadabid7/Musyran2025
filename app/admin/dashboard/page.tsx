"use client"

import { DialogDescription } from "@/components/ui/dialog"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pencil, Trash2, Download, Plus, FileSpreadsheet, Eye, Globe, UserPlus } from "lucide-react"
import QRCode from "qrcode"

const JURUSAN_OPTIONS = ["RPL", "TKJ", "TKR INDUSTRI", "TKR REGULER", "TAB INDUSTRI", "TAB REGULER", "TITL"]
const KELAS_OPTIONS = ["X", "XI", "XII"]
const ROLE_OPTIONS = [
  { key: "ketuaUmum", label: "Ketua Umum" },
  { key: "sekretarisUmum", label: "Sekretaris Umum" },
  { key: "bendaharaUmum", label: "Bendahara Umum" },
  { key: "ketuaOrganisasi", label: "Ketua Bidang Organisasi" },
  { key: "ketuaPerkaderan", label: "Ketua Bidang Perkaderan" },
  { key: "ketuaKDI", label: "Ketua Bidang KDI" },
  { key: "ketuaASBO", label: "Ketua Bidang ASBO" },
]

const labelToKey = (label: string) => {
  const found = ROLE_OPTIONS.find((r) => r.label.toLowerCase() === label.toLowerCase())
  return found?.key
}

export default function AdminDashboard() {
  const [panitiaList, setPanitiaList] = useState<any[]>([])
  const [siswaList, setSiswaList] = useState<any[]>([])
  const [candidateList, setCandidateList] = useState<any[]>([])
  const [candidateForm, setCandidateForm] = useState({ id: "", name: "", photo: "" })
  const [editingCandidate, setEditingCandidate] = useState<any>(null)
  const [viewQrSiswa, setViewQrSiswa] = useState<any>(null)
  const [editingSiswa, setEditingSiswa] = useState<any>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [editingPanitia, setEditingPanitia] = useState<any>(null)
  const [newSiswa, setNewSiswa] = useState({ Nama: "", Kelas: "", Jurusan: "", NIS: "" })
  const [landingContent, setLandingContent] = useState({
    winnerTitle: "Struktur Inti",
    winnerSubtitle: "Terima kasih atas partisipasi Anda",
    winnerHeadingColor: "#14532d",
    winnerHeadingSize: "2.5",
    winnerSubColor: "#166534",
    winnerSubSize: "1",
    totalLabel: "Total Siswa",
    totalSub: "Terdaftar dalam DPT",
    votedLabel: "Sudah Memilih",
    notVotedLabel: "Belum Memilih",
    notVotedSuffix: "Siswa",
    candidateSectionTitle: "Calon Formatur IPM 2025",
    candidateSectionTitleColor: "#1f2937",
    candidateSectionTitleSize: "1.5",
    candidateSubtitle: "Calon Kandidat Formatur",
    candidateSubtitleColor: "#6b7280",
    candidateSubtitleSize: "0.9",
    chartTitle: "Perolehan Suara Sementara",
    chartTitleColor: "#1f2937",
    chartTitleSize: "1.5",
    chartYAxisLabel: "Jumlah Suara",
    loginLinkText: "LOGIN PANITIA / ADMIN",
    footerMadeBy: "Dibuat dengan 🤍 oleh Muhammad Abid",
    footerCopyright: "© 2025 Musyran IPM",
  })
  const [landingStatus, setLandingStatus] = useState({ utama: true, winner: false })
  const [rolesMap, setRolesMap] = useState<Record<string, string>>({
    ketuaUmum: "",
    sekretarisUmum: "",
    bendaharaUmum: "",
    ketuaOrganisasi: "",
    ketuaPerkaderan: "",
    ketuaKDI: "",
    ketuaASBO: "",
  })
  const [roleLabels, setRoleLabels] = useState<Record<string, string>>(
    ROLE_OPTIONS.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.label }), {}),
  )
  const [viewStats, setViewStats] = useState<{ Jumlah: number; lastView?: any }>({ Jumlah: 0 })
  const [editHistory, setEditHistory] = useState<{ akun?: string; ApaYangDiEdit?: string; timestamp?: any }>({})
  const [adminEmail, setAdminEmail] = useState("admin")
  const [savingLanding, setSavingLanding] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const savedAdmin = typeof window !== "undefined" ? localStorage.getItem("adminEmail") : null
    if (savedAdmin) setAdminEmail(savedAdmin)

    fetchPanitia()
    fetchSiswa()
    fetchCandidates()
    fetchLandingContent()
    fetchJabatanFormatur()
    fetchLandingStatus()
  }, [])

  const fetchPanitia = async () => {
    const snapshot = await getDocs(collection(db, "Data_Admin"))
    const list: any[] = []
    snapshot.forEach((doc) => {
      if (doc.id !== "Admin") {
        list.push({ id: doc.id, ...doc.data() })
      }
    })
    setPanitiaList(list)
  }

  const fetchSiswa = async () => {
    const snapshot = await getDocs(collection(db, "Data_Siswa"))
    const list: any[] = []
    snapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() })
    })
    setSiswaList(list)
  }

  const fetchCandidates = async () => {
    const snapshot = await getDocs(collection(db, "Data_Calon_Formatur"))
    const list: any[] = []
    snapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() })
    })
    list.sort((a, b) => a.id.localeCompare(b.id))
    setCandidateList(list)
    setRolesMap((prev) => {
      const isEmpty = Object.values(prev).every((v) => !v)
      if (isEmpty && list.length) {
        const sorted = [...list].sort((a, b) => (b.JumlahVote || 0) - (a.JumlahVote || 0))
        const defaults: Record<string, string> = {
          ketuaUmum: sorted[0]?.id || "",
          sekretarisUmum: sorted[1]?.id || "",
          bendaharaUmum: sorted[2]?.id || "",
          ketuaOrganisasi: sorted[3]?.id || "",
          ketuaPerkaderan: sorted[4]?.id || "",
          ketuaKDI: sorted[5]?.id || "",
          ketuaASBO: sorted[6]?.id || "",
        }
        return { ...prev, ...defaults }
      }
      return prev
    })
  }

  const fetchLandingContent = async () => {
    const snap = await getDoc(doc(db, "LandingContent", "main"))
    if (snap.exists()) {
      const data = snap.data()
      setLandingContent((prev) => ({
        ...prev,
        ...data,
      }))
    }
  }

  const fetchLandingStatus = async () => {
    const utamaSnap = await getDoc(doc(db, "LandingPage", "Utama"))
    const winnerSnap = await getDoc(doc(db, "LandingPage", "FormaturTerpilih"))
    const viewsSnap = await getDoc(doc(db, "LandingPage", "LandingViews"))
    const editSnap = await getDoc(doc(db, "LandingPage", "LandingEditHistory"))

    setLandingStatus({
      utama: utamaSnap.exists() ? utamaSnap.data()?.Status !== "false" : true,
      winner: winnerSnap.exists() ? winnerSnap.data()?.Status === "true" : false,
    })

    const rolesData = winnerSnap.exists() ? winnerSnap.data()?.Roles : null
    const labelsData = winnerSnap.exists() ? winnerSnap.data()?.RoleLabels : null
    if (rolesData) {
      setRolesMap((prev) => ({ ...prev, ...rolesData }))
    }
    if (labelsData) {
      setRoleLabels((prev) => ({ ...prev, ...labelsData }))
    }
    if (viewsSnap.exists()) {
      setViewStats(viewsSnap.data() as any)
    }
    if (editSnap.exists()) {
      setEditHistory(editSnap.data() as any)
    }
  }

  const fetchJabatanFormatur = async () => {
    const snap = await getDocs(collection(db, "JabatanFormatur"))
    const incoming: Record<string, string> = {}
    snap.forEach((d) => {
      const key = labelToKey(d.data()?.Jabatan || "")
      if (key) incoming[key] = d.id
    })
    if (Object.keys(incoming).length) {
      setRolesMap((prev) => ({ ...prev, ...incoming }))
    }
  }

  // --- Panitia Logic ---

  const handleAddPanitia = async () => {
    try {
      await addDoc(collection(db, "Data_Admin"), {
        Email: newEmail,
        Password: newPassword,
        Role: "Panitia",
      })
      alert("Panitia berhasil ditambahkan")
      setNewEmail("")
      setNewPassword("")
      fetchPanitia()
    } catch (e) {
      alert("Gagal menambahkan panitia")
    }
  }

  const handleEditPanitia = async (id: string, email: string, password: string) => {
    try {
      await updateDoc(doc(db, "Data_Admin", id), {
        Email: email,
        Password: password,
      })
      setEditingPanitia(null)
      fetchPanitia()
      alert("Data panitia diperbarui")
    } catch (e) {
      alert("Gagal update data")
    }
  }

  const handleDeletePanitia = async (id: string) => {
    if (!confirm("Yakin hapus panitia ini?")) return
    try {
      await deleteDoc(doc(db, "Data_Admin", id))
      fetchPanitia()
    } catch (e) {
      alert("Gagal hapus data")
    }
  }

  // --- Siswa Logic ---

  const handleAddSiswa = async () => {
    try {
      await addDoc(collection(db, "Data_Siswa"), {
        NamaSiswa: newSiswa.Nama,
        Kelas: newSiswa.Kelas,
        Jurusan: newSiswa.Jurusan,
        NIS: Number(newSiswa.NIS),
        StatusVoting: "belum",
      })
      alert("Siswa berhasil ditambahkan")
      setNewSiswa({ Nama: "", Kelas: "", Jurusan: "", NIS: "" })
      fetchSiswa()
    } catch (e) {
      alert("Gagal tambah siswa")
    }
  }

  const handleEditSiswa = async () => {
    if (!editingSiswa) return
    try {
      await updateDoc(doc(db, "Data_Siswa", editingSiswa.id), {
        NamaSiswa: editingSiswa.NamaSiswa,
        Kelas: editingSiswa.Kelas,
        Jurusan: editingSiswa.Jurusan,
        NIS: Number(editingSiswa.NIS),
      })
      alert("Data siswa berhasil diperbarui")
      setEditingSiswa(null)
      fetchSiswa()
    } catch (e) {
      alert("Gagal update data siswa")
    }
  }

  const handleDeleteSiswa = async (id: string) => {
    if (!confirm("Yakin hapus data siswa ini?")) return
    try {
      await deleteDoc(doc(db, "Data_Siswa", id))
      fetchSiswa()
    } catch (e) {
      alert("Gagal hapus data siswa")
    }
  }

  // --- Calon Formatur Logic ---

  const handleAddCandidate = async () => {
    if (!candidateForm.id || !candidateForm.name) {
      alert("Nomor urut dan nama wajib diisi")
      return
    }
    try {
      await setDoc(
        doc(db, "Data_Calon_Formatur", candidateForm.id),
        {
          NamaCalonFormatur: candidateForm.name,
          FotoCalonFormatur: candidateForm.photo,
          JumlahVote: 0,
        },
        { merge: true },
      )
      alert("Calon formatur berhasil disimpan")
      setCandidateForm({ id: "", name: "", photo: "" })
      fetchCandidates()
    } catch (error) {
      console.error(error)
      alert("Gagal menyimpan calon formatur")
    }
  }

  const handleUpdateCandidate = async () => {
    if (!editingCandidate) return
    try {
      await updateDoc(doc(db, "Data_Calon_Formatur", editingCandidate.id), {
        NamaCalonFormatur: editingCandidate.NamaCalonFormatur,
        FotoCalonFormatur: editingCandidate.FotoCalonFormatur,
      })
      alert("Data calon diperbarui")
      setEditingCandidate(null)
      fetchCandidates()
    } catch (error) {
      console.error(error)
      alert("Gagal memperbarui calon")
    }
  }

  const handleDeleteCandidate = async (id: string) => {
    if (!confirm("Hapus calon ini?")) return
    try {
      await deleteDoc(doc(db, "Data_Calon_Formatur", id))
      fetchCandidates()
    } catch (error) {
      alert("Gagal hapus calon")
    }
  }

  // --- Landing Page Content ---

  const handleSaveLandingContent = async () => {
    setSavingLanding(true)
    try {
      await setDoc(doc(db, "LandingContent", "main"), landingContent, { merge: true })
      alert("Konten landing page diperbarui")
    } catch (error) {
      alert("Gagal menyimpan konten landing")
    } finally {
      setSavingLanding(false)
    }
  }

  const handleSaveLandingStatus = async () => {
    setSavingLanding(true)
    try {
      await setDoc(doc(db, "LandingPage", "Utama"), { Status: landingStatus.utama ? "true" : "false" }, { merge: true })
      await setDoc(
        doc(db, "LandingPage", "FormaturTerpilih"),
        { Status: landingStatus.winner ? "true" : "false", Roles: rolesMap, RoleLabels: roleLabels },
        { merge: true },
      )
      const batch = writeBatch(db)
      ROLE_OPTIONS.forEach((role) => {
        const candidateId = rolesMap[role.key]
        if (candidateId) {
          const label = roleLabels[role.key] || role.label
          batch.set(doc(db, "JabatanFormatur", candidateId), { Jabatan: label }, { merge: true })
        }
      })
      await batch.commit()
      alert("Status landing & formatur terpilih tersimpan")
    } catch (error) {
      alert("Gagal menyimpan status")
    } finally {
      setSavingLanding(false)
    }
  }

  const handleSaveAllLanding = async () => {
    setSavingLanding(true)
    try {
      await setDoc(doc(db, "LandingPage", "Utama"), { Status: landingStatus.utama ? "true" : "false" }, { merge: true })
      await setDoc(
        doc(db, "LandingPage", "FormaturTerpilih"),
        { Status: landingStatus.winner ? "true" : "false", Roles: rolesMap, RoleLabels: roleLabels },
        { merge: true },
      )

      const batch = writeBatch(db)
      ROLE_OPTIONS.forEach((role) => {
        const candidateId = rolesMap[role.key]
        if (candidateId) {
          const label = roleLabels[role.key] || role.label
          batch.set(doc(db, "JabatanFormatur", candidateId), { Jabatan: label }, { merge: true })
        }
      })
      await batch.commit()

      await setDoc(doc(db, "LandingContent", "main"), { ...landingContent }, { merge: true })

      const apaYangDiEdit = [
        landingStatus.utama ? "Landing utama: ON" : "Landing utama: OFF",
        landingStatus.winner ? "Formatur terpilih: ON" : "Formatur terpilih: OFF",
        `Roles: ${Object.values(rolesMap)
          .filter(Boolean)
          .join(", ")}`,
        "Konten teks/warna/ukuran diperbarui",
      ].join(" | ")

      await setDoc(
        doc(db, "LandingPage", "LandingEditHistory"),
        {
          akun: adminEmail || "admin",
          ApaYangDiEdit: apaYangDiEdit,
          timestamp: serverTimestamp(),
        },
        { merge: true },
      )

      alert("Status, formatur terpilih, dan konten landing tersimpan + dicatat")
    } catch (error) {
      alert("Gagal menyimpan status/konten landing")
    } finally {
      setSavingLanding(false)
    }
  }

  const downloadTemplate = () => {
    const headers = "Nama,Kelas,Jurusan,NIS\n"
    const sample = "Ahmad Dahlan,XII,TKJ,12345\nSiti Walidah,XI,RPL,67890\nMuhammad Yusuf,X,TKR INDUSTRI,11111"
    const blob = new Blob([headers + sample], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "template_siswa.csv"
    a.click()
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.split("\n")
        const batch = writeBatch(db)
        let count = 0

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line) continue

          const [Nama, Kelas, Jurusan, NIS] = line.split(",")
          if (Nama && NIS) {
            const newRef = doc(collection(db, "Data_Siswa"))
            batch.set(newRef, {
              NamaSiswa: Nama.trim(),
              Kelas: Kelas?.trim() || "",
              Jurusan: Jurusan?.trim() || "",
              NIS: Number(NIS.trim()),
              StatusVoting: "belum",
            })
            count++
          }
        }

        await batch.commit()
        alert(`Berhasil import ${count} data siswa!`)
        fetchSiswa()
      } catch (error) {
        console.error(error)
        alert("Gagal import file. Pastikan format CSV benar.")
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    }
    reader.readAsText(file)
  }

  const generateQRCode = async (siswa: any, action: "download" | "view") => {
    try {
      const qrData = String(siswa.NIS)
      const url = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })

      if (action === "download") {
        const link = document.createElement("a")
        link.href = url
        link.download = `QR_${siswa.NamaSiswa}_${siswa.NIS}.png`
        link.click()
      } else {
        setQrCodeUrl(url)
        setViewQrSiswa(siswa)
      }
    } catch (error) {
      alert("Gagal membuat QR Code")
      console.error(error)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
      </div>

      <Tabs defaultValue="panitia" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="panitia">Manajemen Panitia</TabsTrigger>
          <TabsTrigger value="siswa">Manajemen Siswa</TabsTrigger>
          <TabsTrigger value="calon">Calon Formatur</TabsTrigger>
          <TabsTrigger value="landing">Landing Page</TabsTrigger>
        </TabsList>

        {/* --- TAB PANITIA --- */}
        <TabsContent value="panitia" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-gradient-to-r from-green-50 to-white">
              <CardHeader className="pb-2">
                <CardTitle>Statistik Kunjungan</CardTitle>
                <CardDescription>Total view landing page</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-green-700">{viewStats.Jumlah || 0}</div>
                  <p className="text-xs text-gray-500">LandingPage / LandingViews</p>
                </div>
                <div className="text-xs text-gray-600 text-right">
                  {viewStats.lastView
                    ? new Date(viewStats.lastView.seconds ? viewStats.lastView.seconds * 1000 : viewStats.lastView).toLocaleString("id-ID")
                    : "Belum ada data"}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-blue-50 to-white">
              <CardHeader className="pb-2">
                <CardTitle>Riwayat Edit Terakhir</CardTitle>
                <CardDescription>LandingPage / LandingEditHistory</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="font-semibold text-gray-800">Akun: {editHistory.akun || "-"}</div>
                <div className="text-gray-700">{editHistory.ApaYangDiEdit || "Belum ada catatan"}</div>
                <div className="text-xs text-gray-500">
                  {editHistory.timestamp
                    ? new Date(
                        editHistory.timestamp.seconds ? editHistory.timestamp.seconds * 1000 : editHistory.timestamp,
                      ).toLocaleString("id-ID")
                    : ""}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Form Tambah */}
            <Card className="md:col-span-1 h-fit">
              <CardHeader>
                <CardTitle>Tambah Panitia</CardTitle>
                <CardDescription>Buat akun untuk panitia baru</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email / Username</Label>
                  <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="panitia01" />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="******"
                  />
                </div>
                <Button onClick={handleAddPanitia} className="w-full bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" /> Tambah Akun
                </Button>
              </CardContent>
            </Card>

            {/* List Panitia */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Daftar Panitia Aktif</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Username</TableHead>
                        <TableHead>Password</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {panitiaList.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.Email}</TableCell>
                          <TableCell>••••••</TableCell>
                          <TableCell className="text-right flex justify-end gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="icon" onClick={() => setViewQrSiswa(p)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit Panitia</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input
                                      defaultValue={p.Email}
                                      onChange={(e) => setViewQrSiswa({ ...viewQrSiswa, Email: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Password Baru</Label>
                                    <Input
                                      type="password"
                                      placeholder="Isi jika ingin mengganti"
                                      onChange={(e) => setViewQrSiswa({ ...viewQrSiswa, Password: e.target.value })}
                                    />
                                  </div>
                                  <Button
                                    onClick={() =>
                                      handleEditPanitia(p.id, viewQrSiswa.Email, viewQrSiswa.Password || p.Password)
                                    }
                                  >
                                    Simpan Perubahan
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Button variant="destructive" size="icon" onClick={() => handleDeletePanitia(p.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="siswa" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-6 md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Import Data</CardTitle>
                  <CardDescription>Upload file Excel (.csv)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full bg-transparent" onClick={downloadTemplate}>
                    <Download className="w-4 h-4 mr-2" /> Download Template
                  </Button>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".csv"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <Label
                      htmlFor="file-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <FileSpreadsheet className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">Klik untuk Upload CSV</span>
                    </Label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Input Manual</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Nama Lengkap"
                    value={newSiswa.Nama}
                    onChange={(e) => setNewSiswa({ ...newSiswa, Nama: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={newSiswa.Kelas} onValueChange={(val) => setNewSiswa({ ...newSiswa, Kelas: val })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Kelas" />
                      </SelectTrigger>
                      <SelectContent>
                        {KELAS_OPTIONS.map((k) => (
                          <SelectItem key={k} value={k}>
                            {k}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={newSiswa.Jurusan}
                      onValueChange={(val) => setNewSiswa({ ...newSiswa, Jurusan: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Jurusan" />
                      </SelectTrigger>
                      <SelectContent>
                        {JURUSAN_OPTIONS.map((j) => (
                          <SelectItem key={j} value={j}>
                            {j}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    placeholder="NIS"
                    type="number"
                    value={newSiswa.NIS}
                    onChange={(e) => setNewSiswa({ ...newSiswa, NIS: e.target.value })}
                  />
                  <Button onClick={handleAddSiswa} className="w-full bg-blue-600 hover:bg-blue-700">
                    Simpan Siswa
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Data Siswa ({siswaList.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>NIS</TableHead>
                        <TableHead>Nama</TableHead>
                        <TableHead>Kelas</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {siswaList.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-mono">{s.NIS}</TableCell>
                          <TableCell>{s.NamaSiswa}</TableCell>
                          <TableCell>
                            {s.Kelas} {s.Jurusan}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${s.StatusVoting === "sudah" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
                            >
                              {s.StatusVoting}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => generateQRCode(s, "view")}
                                title="Lihat QR Code"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => generateQRCode(s, "download")}
                                title="Download QR Code"
                              >
                                <Download className="h-4 w-4" />
                              </Button>

                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="icon" onClick={() => setEditingSiswa(s)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                {editingSiswa && (
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Edit Data Siswa</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                      <div className="space-y-2">
                                        <Label>Nama Siswa</Label>
                                        <Input
                                          value={editingSiswa.NamaSiswa}
                                          onChange={(e) =>
                                            setEditingSiswa({ ...editingSiswa, NamaSiswa: e.target.value })
                                          }
                                        />
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label>Kelas</Label>
                                          <Select
                                            value={editingSiswa.Kelas}
                                            onValueChange={(val) => setEditingSiswa({ ...editingSiswa, Kelas: val })}
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Kelas" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {KELAS_OPTIONS.map((k) => (
                                                <SelectItem key={k} value={k}>
                                                  {k}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Jurusan</Label>
                                          <Select
                                            value={editingSiswa.Jurusan}
                                            onValueChange={(val) => setEditingSiswa({ ...editingSiswa, Jurusan: val })}
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Jurusan" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {JURUSAN_OPTIONS.map((j) => (
                                                <SelectItem key={j} value={j}>
                                                  {j}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <Label>NIS</Label>
                                        <Input
                                          value={editingSiswa.NIS}
                                          onChange={(e) => setEditingSiswa({ ...editingSiswa, NIS: e.target.value })}
                                        />
                                      </div>
                                      <Button onClick={handleEditSiswa}>Simpan Perubahan</Button>
                                    </div>
                                  </DialogContent>
                                )}
                              </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --- TAB CALON FORMATUR --- */}
        <TabsContent value="calon" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1 h-fit">
              <CardHeader>
                <CardTitle>Tambah Calon Formatur</CardTitle>
                <CardDescription>Input nomor urut, nama, dan foto</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nomor Urut / ID</Label>
                  <Input
                    value={candidateForm.id}
                    onChange={(e) => setCandidateForm({ ...candidateForm, id: e.target.value })}
                    placeholder="01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nama Calon</Label>
                  <Input
                    value={candidateForm.name}
                    onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
                    placeholder="Nama lengkap"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Link Foto</Label>
                  <Input
                    value={candidateForm.photo}
                    onChange={(e) => setCandidateForm({ ...candidateForm, photo: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <Button onClick={handleAddCandidate} className="w-full bg-green-600 hover:bg-green-700">
                  <UserPlus className="w-4 h-4 mr-2" /> Simpan Calon
                </Button>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Daftar Calon Formatur</CardTitle>
                <CardDescription>Edit nama, foto, atau hapus calon</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No</TableHead>
                        <TableHead>Nama</TableHead>
                        <TableHead>Foto</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {candidateList.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-semibold">{c.id}</TableCell>
                          <TableCell>{c.NamaCalonFormatur}</TableCell>
                          <TableCell>
                            <span className="text-xs text-gray-500">{c.FotoCalonFormatur ? "✓" : "-"}</span>
                          </TableCell>
                          <TableCell className="text-right flex justify-end gap-2">
                            <Dialog open={editingCandidate?.id === c.id} onOpenChange={(open) => !open && setEditingCandidate(null)}>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="icon" onClick={() => setEditingCandidate(c)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit Calon {c.id}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3 py-2">
                                  <div className="space-y-2">
                                    <Label>Nama</Label>
                                    <Input
                                      value={editingCandidate?.NamaCalonFormatur || ""}
                                      onChange={(e) =>
                                        setEditingCandidate({ ...editingCandidate, NamaCalonFormatur: e.target.value })
                                      }
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Link Foto</Label>
                                    <Input
                                      value={editingCandidate?.FotoCalonFormatur || ""}
                                      onChange={(e) =>
                                        setEditingCandidate({ ...editingCandidate, FotoCalonFormatur: e.target.value })
                                      }
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Button onClick={handleUpdateCandidate}>Simpan Perubahan</Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Button variant="destructive" size="icon" onClick={() => handleDeleteCandidate(c.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --- TAB LANDING PAGE --- */}
        <TabsContent value="landing" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Aktifkan / Nonaktifkan</CardTitle>
                <CardDescription>Kontrol visibilitas landing & halaman formatur terpilih</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={landingStatus.utama}
                    onChange={(e) => setLandingStatus({ ...landingStatus, utama: e.target.checked })}
                  />
                  Tampilkan landing page utama
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={landingStatus.winner}
                    onChange={(e) => setLandingStatus({ ...landingStatus, winner: e.target.checked })}
                  />
                  Tampilkan halaman formatur terpilih
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Halaman Formatur Terpilih</CardTitle>
                <CardDescription>Ditampilkan jika toggle diaktifkan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {ROLE_OPTIONS.map((role) => (
                  <div className="space-y-3" key={role.key}>
                    <div className="space-y-1">
                      <Label>Label Jabatan</Label>
                      <Input
                        value={roleLabels[role.key] || role.label}
                        onChange={(e) => setRoleLabels((prev) => ({ ...prev, [role.key]: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Pilih Calon</Label>
                      <Select
                        value={rolesMap[role.key] || ""}
                        onValueChange={(val) => setRolesMap((prev) => ({ ...prev, [role.key]: val }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih calon (ID nomor urut)" />
                        </SelectTrigger>
                        <SelectContent>
                          {candidateList.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.id} - {c.NamaCalonFormatur}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Label Statistik</CardTitle>
                <CardDescription>Edit teks di kartu statistik</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  value={landingContent.totalLabel}
                  onChange={(e) => setLandingContent({ ...landingContent, totalLabel: e.target.value })}
                  placeholder="Total Siswa"
                />
                <Input
                  value={landingContent.totalSub}
                  onChange={(e) => setLandingContent({ ...landingContent, totalSub: e.target.value })}
                  placeholder="Terdaftar dalam DPT"
                />
                <Input
                  value={landingContent.votedLabel}
                  onChange={(e) => setLandingContent({ ...landingContent, votedLabel: e.target.value })}
                  placeholder="Sudah Memilih"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    value={landingContent.notVotedLabel}
                    onChange={(e) => setLandingContent({ ...landingContent, notVotedLabel: e.target.value })}
                    placeholder="Belum Memilih"
                  />
                  <Input
                    value={landingContent.notVotedSuffix}
                    onChange={(e) => setLandingContent({ ...landingContent, notVotedSuffix: e.target.value })}
                    placeholder="Siswa"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Label Bagian</CardTitle>
                <CardDescription>Judul section dan chart</CardDescription>
              </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={landingContent.candidateSectionTitle}
              onChange={(e) => setLandingContent({ ...landingContent, candidateSectionTitle: e.target.value })}
              placeholder="Calon Formatur IPM 2025"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="color"
                value={landingContent.candidateSectionTitleColor}
                onChange={(e) => setLandingContent({ ...landingContent, candidateSectionTitleColor: e.target.value })}
              />
              <Input
                type="number"
                step="0.1"
                min="0"
                value={landingContent.candidateSectionTitleSize}
                onChange={(e) => setLandingContent({ ...landingContent, candidateSectionTitleSize: e.target.value })}
                placeholder="Ukuran (rem)"
              />
            </div>
            <Input
              value={landingContent.candidateSubtitle}
              onChange={(e) => setLandingContent({ ...landingContent, candidateSubtitle: e.target.value })}
              placeholder="Calon Kandidat Formatur"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="color"
                value={landingContent.candidateSubtitleColor}
                onChange={(e) => setLandingContent({ ...landingContent, candidateSubtitleColor: e.target.value })}
              />
              <Input
                type="number"
                step="0.1"
                min="0"
                value={landingContent.candidateSubtitleSize}
                onChange={(e) => setLandingContent({ ...landingContent, candidateSubtitleSize: e.target.value })}
                placeholder="Ukuran (rem)"
              />
            </div>
            <Input
              value={landingContent.chartTitle}
              onChange={(e) => setLandingContent({ ...landingContent, chartTitle: e.target.value })}
              placeholder="Perolehan Suara Sementara"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="color"
                value={landingContent.chartTitleColor}
                onChange={(e) => setLandingContent({ ...landingContent, chartTitleColor: e.target.value })}
              />
              <Input
                type="number"
                step="0.1"
                min="0"
                value={landingContent.chartTitleSize}
                onChange={(e) => setLandingContent({ ...landingContent, chartTitleSize: e.target.value })}
                placeholder="Ukuran judul chart (rem)"
              />
            </div>
            <Input
              value={landingContent.chartYAxisLabel}
              onChange={(e) => setLandingContent({ ...landingContent, chartYAxisLabel: e.target.value })}
              placeholder="Jumlah Suara"
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Struktur Inti (Formatur)</CardTitle>
                <CardDescription>Judul, subjudul, dan gaya teks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  value={landingContent.winnerTitle}
                  onChange={(e) => setLandingContent({ ...landingContent, winnerTitle: e.target.value })}
                  placeholder="Struktur Inti"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="color"
                    value={landingContent.winnerHeadingColor}
                    onChange={(e) => setLandingContent({ ...landingContent, winnerHeadingColor: e.target.value })}
                  />
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={landingContent.winnerHeadingSize}
                    onChange={(e) => setLandingContent({ ...landingContent, winnerHeadingSize: e.target.value })}
                    placeholder="Ukuran judul (rem)"
                  />
                </div>
                <Input
                  value={landingContent.winnerSubtitle}
                  onChange={(e) => setLandingContent({ ...landingContent, winnerSubtitle: e.target.value })}
                  placeholder="Terima kasih atas partisipasi Anda"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="color"
                    value={landingContent.winnerSubColor}
                    onChange={(e) => setLandingContent({ ...landingContent, winnerSubColor: e.target.value })}
                  />
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={landingContent.winnerSubSize}
                    onChange={(e) => setLandingContent({ ...landingContent, winnerSubSize: e.target.value })}
                    placeholder="Ukuran subjudul (rem)"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>CTA & Footer</CardTitle>
                <CardDescription>Teks login dan footer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  value={landingContent.loginLinkText}
                  onChange={(e) => setLandingContent({ ...landingContent, loginLinkText: e.target.value })}
                  placeholder="LOGIN PANITIA / ADMIN"
                />
                <Input
                  value={landingContent.footerMadeBy}
                  onChange={(e) => setLandingContent({ ...landingContent, footerMadeBy: e.target.value })}
                  placeholder="Dibuat dengan 🤍 oleh Muhammad Abid"
                />
                <Input
                  value={landingContent.footerCopyright}
                  onChange={(e) => setLandingContent({ ...landingContent, footerCopyright: e.target.value })}
                  placeholder="© 2025 Musyran IPM"
                />
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
          <div className="flex flex-wrap gap-2 justify-end">
              <Button onClick={handleSaveAllLanding} disabled={savingLanding} className="bg-blue-600 hover:bg-blue-700">
                {savingLanding ? "Menyimpan..." : "Simpan Status & Konten Landing"}
                <Globe className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!viewQrSiswa} onOpenChange={(open) => !open && setViewQrSiswa(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code Siswa</DialogTitle>
            <DialogDescription>
              {viewQrSiswa?.NamaSiswa} - {viewQrSiswa?.NIS}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-4">
            {qrCodeUrl && (
              <img src={qrCodeUrl || "/placeholder.svg"} alt="QR Code" className="w-64 h-64 border rounded-lg" />
            )}
            <Button onClick={() => generateQRCode(viewQrSiswa, "download")} className="w-full">
              <Download className="w-4 h-4 mr-2" /> Download QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
