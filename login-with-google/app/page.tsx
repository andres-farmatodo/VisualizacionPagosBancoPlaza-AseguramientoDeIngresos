"use client"

import { useEffect, useState } from "react"
import { onAuthStateChanged, signOut, type User } from "firebase/auth"
import { auth } from "@/lib/firebase"
import LoginPage from "@/components/login-page"
import SearchPage from "@/components/search-page"

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log("=== COMPONENTE HOME MONTADO ===")
    
    if (!auth) {
      console.error("❌ AUTH ES NULL!")
      setError("Error: Firebase Auth no inicializado")
      setLoading(false)
      return
    }

    console.log("👂 Configurando listener de auth state")
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("🔔 Auth state changed:", currentUser?.email || "No user")
      
      if (currentUser) {
        const emailDomain = currentUser.email?.split("@")[1]
        console.log("📧 Dominio del usuario:", emailDomain)
        
        if (emailDomain === "farmatodo.com") {
          console.log("✅ Usuario autenticado correctamente")
          setUser(currentUser)
        } else {
          console.log("❌ Usuario rechazado por dominio:", emailDomain)
          signOut(auth)
          setUser(null)
          setError(`Solo se permiten usuarios del dominio @farmatodo.com`)
        }
      } else {
        console.log("ℹ️ No hay usuario autenticado")
        setUser(null)
      }
      setLoading(false)
    })

    return () => {
      console.log("🧹 Limpiando listener")
      unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (user) {
    return <SearchPage user={user} />
  }

  return <LoginPage error={error} />
}
