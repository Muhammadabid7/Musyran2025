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
  { key: "ketuaOrganisasi", label: "Ketua Bidang Perkaderan" },
  { key: "ketuaPerkaderan", label: "Ketua Bidang PIP" },
  { key: "ketuaKDI", label: "Ketua Bidang KDI" },
  { key: "ketuaASBO", label: "Ketua Bidang ASBO" },
]

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
    chartTitleSizeMobile: "1.3",
    chartYAxisLabel: "Jumlah Suara",
    loginLinkText: "LOGIN PANITIA / ADMIN",
    footerMadeBy: "Dibuat dengan 🤍 oleh Muhammad Abid",
    footerCopyright: "© 2025 Musyran IPM",
    analyticsCollection: "LandingViews",
    editHistoryCollection: "LandingEditHistory",
    structureGroupTitleColor: "#0f172a",
    structureGroupTitleSize: "1.05",
    structureBackboneColor: "#e5e7eb",
    structureGroupIntiTitle: "Inti",
    structureGroupBidangTitle: "Ketua Bidang",
    winnerHeadingSizeMobile: "2.2",
    winnerSubSizeMobile: "0.9",
    candidateSectionTitleSizeMobile: "1.3",
    candidateSubtitleSizeMobile: "0.85",
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
  const hasCountedView = useRef(false)
  const roleLabelsRef = useRef(roleLabels)
  const [sheetData, setSheetData] = useState<null | { role: string; name: string; meta: string; photo?: string }>(null)
  const [isMobileView, setIsMobileView] = useState(false)

  useEffect(() => {
    roleLabelsRef.current = roleLabels
  }, [roleLabels])

  useEffect(() => {
    const check = () => setIsMobileView(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  const labelToKey = (label: string) => {
    if (!label) return undefined
    const normalized = label.trim().toLowerCase()
    const custom = Object.entries(roleLabelsRef.current).find(([, val]) => val?.trim().toLowerCase() === normalized)
    if (custom) return custom[0]
    const fallback = ROLE_OPTIONS.find((r) => r.label.toLowerCase() === normalized)
    return fallback?.key
  }

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
        const data = snap.data()
        setLandingStatus((prev) => ({ ...prev, winner: data?.Status === "true" }))
        if (data?.Roles) setRolesMap((prev) => ({ ...prev, ...data.Roles }))
        if (data?.RoleLabels) setRoleLabels((prev) => ({ ...prev, ...data.RoleLabels }))
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
  const roleList = ROLE_OPTIONS.map((role) => ({
    ...role,
    label: roleLabels[role.key] || role.label,
  }))
  const mobileRoleNodes = [
    { key: "ketuaUmum", row: 1, col: 2 },
    { key: "bendaharaUmum", row: 1, col: 1 },
    { key: "sekretarisUmum", row: 1, col: 3 },
    { key: "ketuaOrganisasi", row: 2, col: 1 },
    { key: "ketuaPerkaderan", row: 2, col: 2 },
    { key: "ketuaKDI", row: 2, col: 3 },
    { key: "ketuaASBO", row: 3, col: 2 },
  ]

  const sizeByDevice = (desktopKey: keyof typeof landingContent, mobileKey: keyof typeof landingContent) => {
    const mobileVal = (landingContent as any)[mobileKey]
    const desktopVal = (landingContent as any)[desktopKey]
    if (isMobileView && mobileVal) return Number(mobileVal) || 0
    return Number(desktopVal) || 0
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 px-4 sm:px-6 lg:px-10 max-w-6xl mx-auto">
      {showWinner && (
        <section className="space-y-6 bg-gradient-to-br from-green-50 via-white to-green-100 p-8 rounded-3xl shadow-lg border border-green-100">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">Formatur Terpilih</p>
            <h1
              className="font-extrabold leading-tight"
              style={{
                color: landingContent.winnerHeadingColor,
                fontSize: `${sizeByDevice("winnerHeadingSize", "winnerHeadingSizeMobile") || 0}rem`,
              }}
            >
              {landingContent.winnerTitle}
            </h1>
            <p
              className="leading-relaxed"
              style={{
                color: landingContent.winnerSubColor,
                fontSize: `${sizeByDevice("winnerSubSize", "winnerSubSizeMobile") || 0}rem`,
              }}
            >
              {landingContent.winnerSubtitle}
            </p>
          </div>
          {/* Desktop / Tablet grid */}
          <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

          {/* Mobile vertical stack */}
          <div className="md:hidden relative mx-auto max-w-[560px] overflow-hidden">
            <div
              className="absolute left-1/2 top-6 bottom-6 w-px"
              style={{ backgroundColor: landingContent.structureBackboneColor || "#e5e7eb" }}
              aria-hidden
            />
            <div className="relative space-y-4 px-2">
              {[
                {
                  title: landingContent.structureGroupIntiTitle || "Inti",
                  keys: ["ketuaUmum", "sekretarisUmum", "bendaharaUmum"],
                  meta: "Formatur Inti",
                },
                {
                  title: landingContent.structureGroupBidangTitle || "Ketua Bidang",
                  keys: ["ketuaOrganisasi", "ketuaPerkaderan", "ketuaKDI", "ketuaASBO"],
                  meta: "Formatur Bidang",
                },
              ].map((group) => (
                <div key={group.title} className="space-y-3">
                  <div
                    className="tracking-wide uppercase"
                    style={{
                      color: landingContent.structureGroupTitleColor || "#0f172a",
                      fontWeight: 800,
                      fontSize: `${Number(landingContent.structureGroupTitleSize) || 0.95}rem`,
                    }}
                  >
                    {group.title}
                  </div>
                  <div className="flex flex-col" style={{ gap: "10px" }}>
                    {group.keys.map((key) => {
                      const role = roleList.find((r) => r.key === key)
                      if (!role) return null
                      const selectedId = rolesMap[key]
                      const candidate = selectedId ? candidateById(selectedId) : null
                      const person = {
                        role: role.label,
                        name: candidate ? candidate.NamaCalonFormatur : "Belum diatur",
                        meta: group.meta,
                        photo: candidate?.FotoCalonFormatur,
                      }
                      return (
                        <button
                          key={key}
                          className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm text-left transition active:scale-[0.99]"
                          style={{ minHeight: "clamp(78px,18vw,86px)", borderLeft: "4px solid #16a34a" }}
                          onClick={() => setSheetData(person)}
                        >
                          <div
                            className="flex items-center justify-center rounded-lg bg-gray-100 overflow-hidden shrink-0"
                            style={{
                              width: "clamp(46px,12vw,54px)",
                              height: "clamp(62px,16vw,72px)",
                              aspectRatio: "3 / 4",
                            }}
                          >
                            {person.photo ? (
                              <Image
                                src={person.photo}
                                alt={person.name}
                                width={80}
                                height={106}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="text-[11px] font-semibold text-gray-500 leading-tight text-center">
                                Foto
                                <br />
                                3x4
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[clamp(14.5px,3.8vw,16px)] font-black text-gray-900 leading-tight truncate">
                              {person.role}
                            </div>
                            <div className="text-[clamp(13px,3.4vw,14px)] font-semibold text-gray-800 truncate">
                              {person.name}
                            </div>
                            <div className="text-[clamp(11px,3vw,12px)] font-semibold text-gray-500">{person.meta}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {sheetData && (
            <div className="md:hidden fixed inset-0 z-50">
              <div className="absolute inset-0 bg-black/40" onClick={() => setSheetData(null)} />
              <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white shadow-2xl p-5 space-y-3">
                <div className="w-12 h-1 rounded-full bg-gray-200 mx-auto" aria-hidden />
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center rounded-lg bg-gray-100 overflow-hidden shrink-0"
                    style={{
                      width: "clamp(46px,12vw,54px)",
                      height: "clamp(62px,16vw,72px)",
                      aspectRatio: "3 / 4",
                    }}
                  >
                    {sheetData.photo ? (
                      <Image src={sheetData.photo} alt={sheetData.name} width={80} height={106} className="h-full w-full object-cover" />
                    ) : (
                      <div className="text-[11px] font-semibold text-gray-500 leading-tight text-center">
                        Foto
                        <br />
                        3x4
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[clamp(14.5px,3.8vw,16px)] font-black text-gray-900 leading-tight">{sheetData.role}</div>
                    <div className="text-[clamp(13px,3.4vw,14px)] font-semibold text-gray-800">{sheetData.name}</div>
                    <div className="text-[clamp(11px,3vw,12px)] font-semibold text-gray-500">{sheetData.meta}</div>
                  </div>
                  <button
                    className="p-2 rounded-full text-gray-500 hover:text-gray-700"
                    onClick={() => setSheetData(null)}
                    aria-label="Tutup detail"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )}
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
            fontSize: `${sizeByDevice("candidateSectionTitleSize", "candidateSectionTitleSizeMobile") || 0}rem`,
          }}
        >
          {landingContent.candidateSectionTitle}
        </h2>
        <p
          className="text-center mb-6"
          style={{
            color: landingContent.candidateSubtitleColor,
            fontSize: `${sizeByDevice("candidateSubtitleSize", "candidateSubtitleSizeMobile") || 0}rem`,
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
            fontSize: `${sizeByDevice("chartTitleSize", "chartTitleSizeMobile") || 0}rem`,
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
