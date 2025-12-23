"use client"

import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import FarmatodoLogo from "@/components/farmatodo-logo"

export default function LoginPage({ error: externalError }: { error?: string | null }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(externalError || null)

  useEffect(() => {
    if (externalError) {
      setError(externalError)
    }
  }, [externalError])

  const handleGoogleLogin = async () => {
    console.log("🚀 Iniciando login con Google...")
    
    if (!auth) {
      console.error("❌ Auth es null en el login!")
      setError("Error: Firebase Auth no está inicializado")
      return
    }
    
    setLoading(true)
    setError(null)

    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({
        hd: 'farmatodo.com',
        prompt: 'select_account'
      })
      
      console.log("📤 Abriendo popup de Google...")
      const result = await signInWithPopup(auth, provider)
      console.log("✅ Usuario autenticado:", result.user.email)
      
      const emailDomain = result.user.email?.split("@")[1]
      console.log("📧 Dominio:", emailDomain)
      
      if (emailDomain !== "farmatodo.com") {
        console.log("❌ Dominio no válido")
        await signOut(auth)
        setError("Solo se permiten usuarios del dominio @farmatodo.com")
        setLoading(false)
      } else {
        console.log("✅ Login exitoso!")
      }
    } catch (err: any) {
      console.error("❌ Error en login:", err)
      if (err.code === 'auth/popup-closed-by-user') {
        setError("Login cancelado")
      } else {
        setError(err.message || "Error al iniciar sesión")
      }
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <FarmatodoLogo className="w-40" />
            </div>
            <h1 className="text-xl font-bold text-[#003B71] mb-2">Portal de validación de transacciones</h1>
            <p className="text-muted-foreground text-sm">Gestión de cuentas Banco Plaza y Venezuela</p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent"></div>
                  Conectando...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Iniciar sesión con Google
                </div>
              )}
            </Button>

            {error && <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">{error}</div>}
          </div>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Solo usuarios con correo @farmatodo.com pueden acceder
          </p>
        </div>
      </div>
    </div>
  )
}
