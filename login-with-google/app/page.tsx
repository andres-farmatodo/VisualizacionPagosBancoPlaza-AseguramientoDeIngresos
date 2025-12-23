"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { onAuthStateChanged, signOut, type User } from "firebase/auth"
import { auth } from "@/lib/firebase"
import LoginPage from "@/components/login-page"
import SearchPage, { type AppUser } from "@/components/search-page"

// Endpoint para validar JWT
const JWT_VALIDATE_ENDPOINT = "https://auth-jwt-843945314233.us-central1.run.app/validate"

export default function Home() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [user, setUser] = useState<User | null>(null)
  const [jwtUser, setJwtUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Función para validar el token JWT
  const validateJwtToken = useCallback(async (token: string) => {
    console.log("🔐 Validando token JWT...")
    try {
      const response = await fetch(JWT_VALIDATE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `${token}`,
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        console.error("❌ Token JWT inválido o expirado:", response.status)
        return null
      }

      const data = await response.json()
      console.log("✅ Token JWT válido:", data)
      
      // Crear usuario a partir de la respuesta del endpoint
      const appUser: AppUser = {
        email: data.email || data.user?.email || data.sub || "Usuario JWT",
        displayName: data.name || data.user?.name || null,
        authType: 'jwt'
      }
      
      return appUser
    } catch (err) {
      console.error("❌ Error validando token JWT:", err)
      return null
    }
  }, [])

  // Función para manejar logout de JWT
  const handleJwtLogout = useCallback(() => {
    console.log("👋 Cerrando sesión JWT...")
    setJwtUser(null)
    // Remover el token de la URL
    router.replace('/')
  }, [router])

  useEffect(() => {
    console.log("=== COMPONENTE HOME MONTADO ===")
    
    // Verificar si hay un token JWT en la URL
    const token = searchParams.get('token')
    
    if (token) {
      console.log("🔑 Token JWT encontrado en la URL")
      validateJwtToken(token).then((validatedUser) => {
        if (validatedUser) {
          setJwtUser(validatedUser)
          setLoading(false)
        } else {
          setError("Token JWT inválido o expirado")
          setLoading(false)
        }
      })
      return
    }
    
    // Si no hay token JWT, continuar con la autenticación de Firebase
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
  }, [searchParams, validateJwtToken])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Si hay usuario autenticado con JWT
  if (jwtUser) {
    return <SearchPage appUser={jwtUser} onLogout={handleJwtLogout} />
  }

  // Si hay usuario autenticado con Firebase
  if (user) {
    return <SearchPage user={user} />
  }

  return <LoginPage error={error} />
}
