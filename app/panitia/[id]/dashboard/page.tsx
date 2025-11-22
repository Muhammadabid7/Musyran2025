"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, updateDoc, getDocs, query, collection, where, onSnapshot, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Camera, AlertCircle, CheckCircle2, Monitor, StopCircle } from "lucide-react"
import { Html5Qrcode } from "html5-qrcode"

export default function PanitiaDashboard() {
  const params = useParams()
  const router = useRouter()
  const panitiaId = params.id as string

  const [scanResult, setScanResult] = useState("")
  const [status, setStatus] = useState("idle")
  const [message, setMessage] = useState("")
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null)
  const [monitorConnected, setMonitorConnected] = useState(false)
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null)
  const [isScanning, setIsScanning] = useState(false)

  const scannerRef = useRef<Html5Qrcode | null>(null)

  useEffect(() => {
    checkCameraPermission()
    const unsubscribe = onSnapshot(doc(db, "BilikVoting", panitiaId), (doc) => {
      if (doc.exists()) {
        const data = doc.data()
        const heartbeat = data.heartbeat?.toDate()
        setLastHeartbeat(heartbeat || null)

        if (heartbeat) {
          const now = new Date()
          const diff = now.getTime() - heartbeat.getTime()
          setMonitorConnected(diff < 10000)
        } else {
          setMonitorConnected(false)
        }
      }
    })

    return () => unsubscribe()
  }, [panitiaId])

  useEffect(() => {
    if (isScanning && !scannerRef.current) {
      const initScanner = async () => {
        // Wait a brief moment for the DOM to update
        await new Promise((resolve) => setTimeout(resolve, 100))

        const element = document.getElementById("reader")
        if (!element) {
          console.error("Reader element not found")
          setIsScanning(false)
          return
        }

        try {
          const html5QrCode = new Html5Qrcode("reader")
          scannerRef.current = html5QrCode

          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            (decodedText) => {
              setScanResult(decodedText)
              handleProcessStudent(decodedText)
              // Don't stop immediately, let the user see it worked or handle the flow
              html5QrCode
                .stop()
                .then(() => {
                  html5QrCode.clear()
                  setIsScanning(false)
                  scannerRef.current = null
                })
                .catch(console.error)
            },
            (errorMessage) => {
              // ignore errors
            },
          )
        } catch (err) {
          console.error("Error starting scanner:", err)
          setIsScanning(false)
          setStatus("error")
          setMessage("Gagal membuka kamera. Pastikan izin diberikan.")
          scannerRef.current = null
        }
      }

      initScanner()
    }

    // Cleanup function
    return () => {
      if (scannerRef.current && !isScanning) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current?.clear())
          .catch(console.error)
          .finally(() => {
            scannerRef.current = null
          })
      }
    }
  }, [isScanning])

  const getMedia = async () => {
    if (typeof navigator === "undefined") throw new Error("Navigator tidak tersedia")
    if (navigator.mediaDevices?.getUserMedia) {
      return navigator.mediaDevices.getUserMedia({ video: true })
    }
    // Fallback untuk browser lama (Safari lama)
    // @ts-ignore
    const legacy = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia
    if (legacy) {
      return new Promise<MediaStream>((resolve, reject) => {
        legacy.call(navigator, { video: true }, resolve, reject)
      })
    }
    throw new Error("getUserMedia tidak didukung")
  }

  const startScanner = () => {
    if (cameraPermission === false) {
      setStatus("error")
      setMessage("Akses kamera ditolak. Izinkan kamera untuk mulai scan.")
      checkCameraPermission()
      return
    }
    if (isScanning) return
    setIsScanning(true)
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        await scannerRef.current.clear()
        scannerRef.current = null
      } catch (err) {
        console.error("Failed to stop scanner", err)
      }
    }
    setIsScanning(false)
  }

  const checkCameraPermission = async () => {
    try {
      const stream = await getMedia()
      setCameraPermission(true)
      stream.getTracks().forEach((track) => track.stop())
    } catch (err) {
      console.error("Camera permission denied:", err)
      setCameraPermission(false)
      setStatus("error")
      setMessage(
        typeof window !== "undefined" && window.location.protocol !== "https:"
          ? "Kamera tidak tersedia atau ditolak. Pastikan akses lewat HTTPS dan izinkan kamera."
          : "Kamera tidak tersedia atau ditolak. Coba izinkan kamera di browser.",
      )
    }
  }

  const logError = async (title: string, errorMsg: string) => {
    try {
      const now = new Date()
      const dateId = now.toISOString() // Unique ID based on timestamp
      await addDoc(collection(db, "error"), {
        tanggal: now.toLocaleString("id-ID", { dateStyle: "full", timeStyle: "long" }),
        judul: title,
        IsiError: errorMsg,
        timestamp: now,
      })
    } catch (e) {
      console.error("Failed to log error", e)
    }
  }

  const handleProcessStudent = async (nis: string) => {
    if (!monitorConnected) {
      setStatus("error")
      setMessage("Monitor belum terhubung! Pastikan monitor sudah dibuka.")
      logError("Monitor Disconnected", `Percobaan scan NIS ${nis} saat monitor mati di Bilik ${panitiaId}`)
      return
    }

    setStatus("processing")
    setMessage("Mencari data siswa...")

    try {
      const q = query(collection(db, "Data_Siswa"), where("NIS", "==", Number(nis)))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        setStatus("error")
        setMessage("Siswa tidak ditemukan!")
        logError("Siswa Tidak Ditemukan", `NIS ${nis} tidak ditemukan di database saat scan di Bilik ${panitiaId}`)
        return
      }

      const studentDoc = querySnapshot.docs[0]
      const studentData = studentDoc.data()

      if (studentData.StatusVoting === "sudah") {
        setStatus("error")
        setMessage(`Siswa ${studentData.NamaSiswa} SUDAH memilih!`)
        logError(
          "Double Voting Attempt",
          `Siswa ${studentData.NamaSiswa} (${nis}) mencoba memilih lagi di Bilik ${panitiaId}`,
        )
        return
      }

      const bilikRef = doc(db, "BilikVoting", panitiaId)

      await updateDoc(bilikRef, {
        activeVoterNIS: Number(nis),
        activeVoterName: studentData.NamaSiswa,
        status: "voting_active",
        timestamp: new Date(),
      })

      setStatus("success")
      setMessage(`Silakan arahkan ${studentData.NamaSiswa} ke Bilik ${panitiaId}`)
      setScanResult("")
    } catch (error: any) {
      console.error(error)
      setStatus("error")
      setMessage("Terjadi kesalahan sistem.")
      logError("System Error", `Error saat memproses siswa ${nis}: ${error.message}`)
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Panitia {panitiaId}</h1>
        <Button
          variant="outline"
          onClick={() => router.push("/darurat")}
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          Mode Darurat
        </Button>
      </div>

      <div
        className={`p-3 rounded-lg flex items-center gap-3 text-sm transition-all ${cameraPermission ? "bg-green-50 text-green-700 border border-green-200" : "bg-yellow-50 text-yellow-700 border border-yellow-200"}`}
      >
        {cameraPermission ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
        <span className="flex-1">{cameraPermission ? "✓ Akses kamera diizinkan" : "⚠ Mohon izinkan akses kamera"}</span>
        {!cameraPermission && (
          <Button size="sm" variant="ghost" onClick={checkCameraPermission} className="text-xs underline">
            Coba Lagi
          </Button>
        )}
      </div>

      <Card
        className={`transition-all duration-300 ${status === "success" ? "border-green-500 bg-green-50 shadow-lg scale-[1.02]" : "shadow-md"}`}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Scan Kartu Siswa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Scanner Area */}
          <div className="overflow-hidden rounded-lg bg-black">
            {isScanning ? (
              <div id="reader" className="w-full"></div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center bg-gray-100 text-gray-500 border-2 border-dashed border-gray-300 m-2 rounded-lg">
                <Camera className="w-12 h-12 mb-2 opacity-50" />
                <p>Kamera tidak aktif</p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {!isScanning ? (
              <Button onClick={startScanner} className="flex-1 bg-blue-600 hover:bg-blue-700">
                <Camera className="w-4 h-4 mr-2" /> Buka Kamera
              </Button>
            ) : (
              <Button onClick={stopScanner} variant="destructive" className="flex-1">
                <StopCircle className="w-4 h-4 mr-2" /> Stop Kamera
              </Button>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Atau Input Manual</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Input NIS Manual"
              value={scanResult}
              onChange={(e) => setScanResult(e.target.value)}
              className="text-center font-mono"
            />
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => handleProcessStudent(scanResult)}
              disabled={!scanResult || status === "processing" || !monitorConnected}
            >
              Proses
            </Button>
          </div>

          {status === "success" && (
            <div className="p-4 bg-green-100 text-green-800 rounded-md text-center font-medium animate-in slide-in-from-top duration-300">
              {message}
            </div>
          )}

          {status === "error" && (
            <div className="p-4 bg-red-100 text-red-800 rounded-md text-center font-medium animate-in shake duration-300">
              {message}
            </div>
          )}
        </CardContent>
      </Card>

      <Card
        className={`transition-all duration-300 ${monitorConnected ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}
      >
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Status Monitor Bilik {panitiaId}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${monitorConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
              ></div>
              <span className={`text-sm font-medium ${monitorConnected ? "text-green-700" : "text-red-700"}`}>
                {monitorConnected ? "Monitor Terhubung & Aktif" : "Monitor Tidak Terhubung"}
              </span>
            </div>
            {lastHeartbeat && (
              <span className="text-xs text-gray-500">{new Date(lastHeartbeat).toLocaleTimeString("id-ID")}</span>
            )}
          </div>
          {!monitorConnected && (
            <p className="text-xs text-red-600 mt-2">Pastikan halaman monitor sudah dibuka di perangkat lain</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
