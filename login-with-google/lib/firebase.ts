import { initializeApp, getApps } from "firebase/app"
import { getAuth } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyB9tKLeL8HhENcH_YNpKrctsEP_D8p_5KI",
  authDomain: "transformacion-financiera.firebaseapp.com",
  projectId: "transformacion-financiera",
  storageBucket: "transformacion-financiera.firebasestorage.app",
  messagingSenderId: "843945314233",
  appId: "1:843945314233:web:aee3f80f02e35dd04c5868",
}

console.log("Inicializando Firebase con config:", firebaseConfig)

// Initialize Firebase only if it hasn't been initialized yet
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
console.log("Firebase App inicializada:", app.name)

export const auth = getAuth(app)
console.log("Auth inicializado:", auth)
