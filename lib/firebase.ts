import { initializeApp, getApps, getApp } from "firebase/app"
import { getFirestore, initializeFirestore } from "firebase/firestore"
import { getAuth } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyA4ZTE0N4ziWQUblwl0ZGnvCMsHXPptUHs",
  authDomain: "musyran2025.firebaseapp.com",
  projectId: "musyran2025",
  storageBucket: "musyran2025.firebasestorage.app",
  messagingSenderId: "262261970938",
  appId: "1:262261970938:web:fe490c68fd35fca0f9f643",
  measurementId: "G-0M5XDGDBGH",
}

// Initialize Firebase (singleton pattern)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
// Use long polling to better handle restricted networks (e.g., dev env without full Internet access).
let db
try {
  db = initializeFirestore(app, { experimentalForceLongPolling: true, useFetchStreams: false })
} catch (error) {
  db = getFirestore(app)
}
const auth = getAuth(app)

export { app, db, auth }
