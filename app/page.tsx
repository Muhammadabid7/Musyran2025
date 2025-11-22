"use client"

import { useEffect, useState, useRef } from "react"
import { collection, onSnapshot, doc, setDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import Link from "next/link"
import Image from "next/image"

interface Candidate {
  id: string
  NamaCalonFormatur: string
  FotoCalonFormatur: string
  JumlahVote?: number
}

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

export default function LandingPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [totalSudah, setTotalSudah] = useState(0)
  const [totalBelum, setTotalBelum] = useState(0)
  const [loading, setLoading] = useState(true)
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
    candidateBadgePrefix: "Calon",
    candidateBadgeBgColor: "#16a34a",
    candidateBadgeTextColor: "#ffffff",
    candidateBadgeFontSize: "1.1",
    candidateBadgeShape: "rounded",
    candidateBadgeTextTransform: "none",
    candidateBadgeShadow: true,
    chartTitle: "Perolehan Suara Sementara",
    chartTitleColor: "#1f2937",
    chartTitleSize: "1.5",
    chartYAxisLabel: "Jumlah Suara",
    loginLinkText: "LOGIN PANITIA / ADMIN",
    footerMadeBy: "Dibuat dengan 🤍 oleh Muhammad Abid",
    footerCopyright: "© 2025 Musyran IPM",
    analyticsCollection: "LandingViews",
    editHistoryCollection: "LandingEditHistory",
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
  const hasCountedView = useRef(false)

  useEffect(() => {
    const unsubCandidates = onSnapshot(collection(db, "Data_Calon_Formatur"), (snapshot) => {
      const cands: Candidate[] = []
      snapshot.forEach((doc) => {
        cands.push({ id: doc.id, ...doc.data() } as Candidate)
      })
      cands.sort((a, b) => a.id.localeCompare(b.id))
      setCandidates(cands)
    })

    const unsubLanding = onSnapshot(doc(db, "LandingContent", "main"), (snap) => {
      if (snap.exists()) {
        setLandingContent((prev) => ({ ...prev, ...snap.data() }))
      }
    })
    const unsubStatusUtama = onSnapshot(doc(db, "LandingPage", "Utama"), (snap) => {
      if (snap.exists()) {
        setLandingStatus((prev) => ({ ...prev, utama: snap.data()?.Status !== "false" }))
      }
    })
    const unsubStatusWinner = onSnapshot(doc(db, "LandingPage", "FormaturTerpilih"), (snap) => {
      if (snap.exists()) {
        setLandingStatus((prev) => ({ ...prev, winner: snap.data()?.Status === "true" }))
        const roles = snap.data()?.Roles
        if (roles) setRolesMap((prev) => ({ ...prev, ...roles }))
      }
    })

    const unsubJabatan = onSnapshot(collection(db, "JabatanFormatur"), (snap) => {
      const incoming: Record<string, string> = {}
      snap.forEach((d) => {
        const key = labelToKey(d.data()?.Jabatan || "")
        if (key) incoming[key] = d.id
      })
      if (Object.keys(incoming).length) {
        setRolesMap((prev) => ({ ...prev, ...incoming }))
      }
    })

    // Hitung langsung dari collection Data_Siswa agar total tidak meleset
    const unsubSiswa = onSnapshot(collection(db, "Data_Siswa"), (snap) => {
      let sudah = 0
      let belum = 0
      snap.forEach((d) => {
        const status = (d.data()?.StatusVoting || "").toLowerCase()
        if (status === "sudah") sudah++
        else belum++
      })
      setTotalSudah(sudah)
      setTotalBelum(belum)
    })

    setLoading(false)

    return () => {
      unsubCandidates()
      unsubLanding()
      unsubStatusUtama()
      unsubStatusWinner()
      unsubJabatan()
      unsubSiswa()
    }
  }, [])

  useEffect(() => {
    if (hasCountedView.current) return
    const docRef = doc(db, "LandingPage", "LandingViews")
    setDoc(docRef, { Jumlah: increment(1), lastView: serverTimestamp() }, { merge: true })
    hasCountedView.current = true
  }, [])

  const chartData = candidates.map((c) => ({
    name: `${landingContent.candidateBadgePrefix || "Calon"} ${c.id}`,
    fullName: c.NamaCalonFormatur,
    votes: c.JumlahVote || 0,
  }))

  const COLORS = ["#16a34a", "#15803d", "#14532d", "#22c55e", "#86efac"]

  const totalSiswa = totalSudah + totalBelum
  const percentage = totalSiswa > 0 ? ((totalSudah / totalSiswa) * 100).toFixed(1) : "0"

  const showLanding = landingStatus.utama !== false
  const showWinner = landingStatus.winner === true

  if (!showLanding && !showWinner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-700">
        <Card className="p-6 shadow-lg">
          <CardTitle>Halaman dinonaktifkan</CardTitle>
          <p className="text-sm text-gray-500 mt-2">Landing page dimatikan oleh admin.</p>
        </Card>
      </div>
    )
  }

  const candidateById = (id: string) => candidates.find((c) => c.id === id)
  const roleList = ROLE_OPTIONS

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 px-4 sm:px-6 lg:px-10 max-w-6xl mx-auto">
      {showWinner && (
        <section className="space-y-6 bg-gradient-to-br from-green-50 via-white to-green-100 p-8 rounded-3xl shadow-lg border border-green-100">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">Formatur Terpilih</p>
              <h1
                className="font-extrabold leading-tight"
                style={{
                  color: landingContent.winnerHeadingColor,
                  fontSize: `${Number(landingContent.winnerHeadingSize) || 0}rem`,
                }}
              >
                {landingContent.winnerTitle}
              </h1>
              <p
                className="leading-relaxed"
                style={{
                  color: landingContent.winnerSubColor,
                  fontSize: `${Number(landingContent.winnerSubSize) || 0}rem`,
                }}
              >
                {landingContent.winnerSubtitle}
              </p>
            </div>
            <div className="relative h-full flex justify-center">
              <div className="w-full max-w-md aspect-square relative rounded-3xl overflow-hidden shadow-2xl bg-white">
                <Image
                  src={"/images/logo.png"}
                  alt="Formatur Terpilih"
                  fill
                  className="object-contain p-6"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roleList.map((role) => {
              const selectedId = rolesMap[role.key]
              const candidate = selectedId ? candidateById(selectedId) : null
              return (
                <Card key={role.key} className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-600">{role.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="aspect-[3/4] w-full rounded-lg overflow-hidden bg-gray-100 border">
                      {candidate?.FotoCalonFormatur ? (
                        <Image
                          src={candidate.FotoCalonFormatur}
                          alt={candidate.NamaCalonFormatur}
                          width={300}
                          height={400}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          Tidak ada foto
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-900">
                        {candidate ? candidate.NamaCalonFormatur : "Belum diatur"}
                      </div>
                      <div className="text-xs text-gray-500">ID: {selectedId || "-"}</div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      )}

      {showLanding && (
        <>
      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5 px-0 mx-0 shadow">
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">{landingContent.totalLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{totalSiswa}</div>
            <p className="text-xs text-blue-600 mt-1">{landingContent.totalSub}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">{landingContent.votedLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">{totalSudah}</div>
            <p className="text-xs text-green-600 mt-1">{percentage}% Partisipasi</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600">{landingContent.notVotedLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900">{totalBelum}</div>
            <p className="text-xs text-orange-600 mt-1">{landingContent.notVotedSuffix}</p>
          </CardContent>
        </Card>
      </div>

      {/* Candidates Grid */}
      <section>
        <h2
          className="font-bold text-center mb-2"
          style={{
            color: landingContent.candidateSectionTitleColor,
            fontSize: `${Number(landingContent.candidateSectionTitleSize) || 0}rem`,
          }}
        >
          {landingContent.candidateSectionTitle}
        </h2>
        <p
          className="text-center mb-6"
          style={{
            color: landingContent.candidateSubtitleColor,
            fontSize: `${Number(landingContent.candidateSubtitleSize) || 0}rem`,
          }}
        >
          {landingContent.candidateSubtitle}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {candidates.map((candidate) => (
            <Card
              key={candidate.id}
              className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
            >
              <div className="aspect-[3/4] relative bg-gray-100 overflow-hidden">
                {candidate.FotoCalonFormatur ? (
                  <Image
                    src={candidate.FotoCalonFormatur || "/placeholder.svg"}
                    alt={candidate.NamaCalonFormatur}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">No Image</div>
                )}
                <div
                  className={`absolute top-0 left-0 px-4 py-2 font-bold z-10 ${landingContent.candidateBadgeShadow === false ? "" : "shadow-lg"}`}
                  style={{
                    backgroundColor: landingContent.candidateBadgeBgColor || "#16a34a",
                    color: landingContent.candidateBadgeTextColor || "#ffffff",
                    fontSize: `${Number(landingContent.candidateBadgeFontSize) || 0}rem`,
                    borderRadius:
                      landingContent.candidateBadgeShape === "square"
                        ? "0"
                        : "0 0 0.75rem 0",
                    textTransform: landingContent.candidateBadgeTextTransform || "none",
                  }}
                >
                  {(landingContent.candidateBadgePrefix || "Calon") + " " + candidate.id}
                </div>
              </div>
              <CardContent className="p-4 text-center bg-white relative z-20">
                <h3 className="font-bold text-lg text-gray-900">{candidate.NamaCalonFormatur}</h3>
                <p
                  className="text-sm"
                  style={{
                    color: landingContent.candidateSubtitleColor,
                    fontSize: `${Number(landingContent.candidateSubtitleSize) || 0}rem`,
                  }}
                >
                  {landingContent.candidateSubtitle}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-br from-green-50 to-white p-8 rounded-2xl shadow-lg border border-green-100">
        <h2
          className="text-center font-bold mb-8"
          style={{
            color: landingContent.chartTitleColor,
            fontSize: `${Number(landingContent.chartTitleSize) || 0}rem`,
          }}
        >
          {landingContent.chartTitle}
        </h2>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 30, bottom: 40 }}>
              <defs>
                {COLORS.map((color, index) => (
                  <linearGradient key={index} id={`colorGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.9} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.6} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fill: "#374151", fontWeight: 500 }}
              />
              <YAxis
                tick={{ fill: "#374151", fontWeight: 500 }}
                label={{ value: landingContent.chartYAxisLabel, angle: -90, position: "insideLeft", fill: "#374151" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  border: "2px solid #16a34a",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
                labelStyle={{ fontWeight: "bold", color: "#111827" }}
                cursor={{ fill: "rgba(22, 163, 74, 0.1)" }}
                content={(props) => {
                  if (props.active && props.payload && props.payload.length) {
                    const data = props.payload[0].payload
                    return (
                      <div className="bg-white p-4 rounded-lg border-2 border-green-500 shadow-xl">
                        <p className="font-bold text-gray-800">{data.fullName}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Nomor Urut: <span className="font-semibold">{data.name.replace("Calon ", "")}</span>
                        </p>
                        <p className="text-lg font-bold text-green-600 mt-2">{data.votes} Suara</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              
              <Bar dataKey="votes" name="Jumlah Suara" radius={[8, 8, 0, 0]} animationDuration={1000}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`url(#colorGradient${index % COLORS.length})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="flex justify-center gap-4 pt-8">
        <Link
          href="/login"
          className="text-sm text-gray-500 hover:text-green-600 underline border-background border-solid border-0 font-semibold"
        >
          {landingContent.loginLinkText}
        </Link>
      </div>
      </>
      )}
    </div>
  )
}
