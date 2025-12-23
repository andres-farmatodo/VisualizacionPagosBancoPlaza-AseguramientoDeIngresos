"use client"

import { useState } from "react"
import { type User, signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import FarmatodoLogo from "@/components/farmatodo-logo"

const BANCOS = [
  { id: "plaza", name: "Banco Plaza" },
  { id: "venezuela", name: "Banco de Venezuela" },
  { id: "mercantil", name: "Banco Mercantil" }
]

const CUENTAS_PLAZA = [
  { number: "01380033220330017446", description: "Cuenta Pago Movil" },
  { number: "01380010300100290019", description: "Cuenta Débito Inmediato" },
  { number: "01380033260330024345", description: "Cuenta Vuelto" },
  { number: "01380033280330025252", description: "Cuenta Devoluciones" }
]

const CUENTAS_VENEZUELA = [
  { number: "01020762210000117663", description: "Cuenta Pago Movil" },
  { number: "01020762230000117676", description: "Cuenta Vuelto" }
]

const CUENTAS_MERCANTIL = [
  { number: "MERCANTIL_PM", description: "Cuenta Pago Movil Mercantil" }
]

interface Movimiento {
  referencia: string
  monto: number
  fecha: string
  hora: string
  concepto: string
}

interface CuentaResponse {
  numero: string
  fechaApertura: string
  tipoCuenta: string
  estatus: string
  moneda: string
  saldoDisponible: number
  movimientos: Movimiento[]
}

// Interfaces para Banco de Venezuela
interface MovimientoVenezuela {
  referencia: string
  descripcion: string | null
  fecha: string
  hora: string
  mov: string
  saldo: string
  importe: string
  nroMov: string | null
  observacion: string
}

interface VenezuelaResponse {
  success: boolean
  data: {
    code: string
    message: string
    data: {
      totalOfMovements: number
      movs: MovimientoVenezuela[]
    }
  }
}

export default function SearchPage({ user }: { user: User }) {
  const { toast } = useToast()
  const [selectedBank, setSelectedBank] = useState("plaza")
  const [selectedAccount, setSelectedAccount] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  // Campos específicos para Mercantil
  const [referencia, setReferencia] = useState("")
  const [telefonoPagador, setTelefonoPagador] = useState("")
  const [importe, setImporte] = useState("")
  const [cuentaData, setCuentaData] = useState<CuentaResponse | null>(null)
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 100
  
  // Filtro
  const [filterText, setFilterText] = useState("")
  
  // Obtener cuentas según el banco seleccionado
  const cuentas = selectedBank === "plaza" 
    ? CUENTAS_PLAZA 
    : selectedBank === "venezuela" 
    ? CUENTAS_VENEZUELA 
    : CUENTAS_MERCANTIL

  const handleSearch = async () => {
    // Validación según el banco
    if (selectedBank === "mercantil") {
      if (!referencia || !startDate || !telefonoPagador || !importe) {
        toast({
          variant: "destructive",
          title: "Campos incompletos",
          description: "Por favor completa todos los campos: referencia, fecha, teléfono pagador e importe",
        })
        return
      }
    } else {
      if (!selectedAccount || !startDate || !endDate) {
        toast({
          variant: "destructive",
          title: "Campos incompletos",
          description: "Por favor completa todos los campos",
        })
        return
      }

      if (new Date(startDate) > new Date(endDate)) {
        toast({
          variant: "destructive",
          title: "Error en las fechas",
          description: "La fecha de inicio no puede ser mayor que la fecha final",
        })
        return
      }
    }

    setLoading(true)
    setError(null)
    setCurrentPage(1)
    
    try {
      let data: CuentaResponse
      
      if (selectedBank === "plaza") {
        // Banco Plaza - GET con query params
        const url = `https://plaza-movimientos-37254579896.us-central1.run.app?cuentaCliente=${selectedAccount}&fechaInicio=${startDate}&fechaFin=${endDate}`
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          mode: 'cors',
          cache: 'no-cache',
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('Error response:', errorText)
          throw new Error(`Error al consultar Banco Plaza: ${response.status}`)
        }
        
        data = await response.json()
      } else if (selectedBank === "venezuela") {
        // Banco de Venezuela - POST con paginación recursiva
        // Convertir fecha de YYYY-MM-DD a DD/MM/YYYY
        const formatDate = (dateStr: string) => {
          const [year, month, day] = dateStr.split('-')
          return `${day}/${month}/${year}`
        }
        
        const url = 'https://venezuela-movimientos-37254579896.us-central1.run.app'
        const todosLosMovimientos: MovimientoVenezuela[] = []
        let nroMovimiento = ""
        let hasMoreMovements = true
        let pageCount = 0
        const MAX_PAGES = 50 // Límite de seguridad para evitar loops infinitos
        
        console.log('🔄 Iniciando paginación recursiva para Banco de Venezuela...')
        
        // Hacer llamadas recursivas hasta que no haya más movimientos
        while (hasMoreMovements && pageCount < MAX_PAGES) {
          pageCount++
          console.log(`📄 Página ${pageCount} - nroMovimiento: "${nroMovimiento}"`)
          
          const body = {
            cuenta: selectedAccount,
            fechaIni: formatDate(startDate),
            fechaFin: formatDate(endDate),
            tipoMoneda: "VES",
            nroMovimiento: nroMovimiento
          }
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            mode: 'cors',
            cache: 'no-cache',
            body: JSON.stringify(body)
          })
          
          if (!response.ok) {
            const errorText = await response.text()
            console.error('Error response:', errorText)
            throw new Error(`Error al consultar Banco de Venezuela: ${response.status}`)
          }
          
          const venezuelaData: VenezuelaResponse = await response.json()
          
          if (!venezuelaData.success) {
            throw new Error(venezuelaData.data?.message || "Error al consultar movimientos")
          }
          
          const movs = venezuelaData.data.data.movs
          console.log(`✅ Página ${pageCount}: ${movs.length} movimientos obtenidos`)
          
          if (movs.length === 0) {
            // No hay más movimientos
            hasMoreMovements = false
            console.log('🏁 No hay más movimientos')
            break
          }
          
          // Agregar movimientos a la lista total
          todosLosMovimientos.push(...movs)
          
          // Obtener el último nroMov para la siguiente página
          const ultimoMov = movs[movs.length - 1]
          const ultimoNroMov = ultimoMov.nroMov
          
          if (ultimoNroMov && ultimoNroMov !== nroMovimiento) {
            // Hay más movimientos, actualizar el cursor
            nroMovimiento = ultimoNroMov
            console.log(`➡️  Siguiente cursor: ${nroMovimiento}`)
          } else {
            // No hay más movimientos (nroMov es null o se repite)
            hasMoreMovements = false
            console.log('🏁 Última página alcanzada')
          }
        }
        
        if (pageCount >= MAX_PAGES) {
          console.warn('⚠️  Límite de páginas alcanzado')
        }
        
        console.log(`✅ Total de movimientos obtenidos: ${todosLosMovimientos.length}`)
        
        // Transformar todos los movimientos al formato común
        const movimientosTransformados: Movimiento[] = todosLosMovimientos.map((mov) => {
          // Convertir importe de string "520,00" a número
          const montoStr = mov.importe.replace(/\./g, '').replace(',', '.')
          const monto = parseFloat(montoStr)
          
          // Formatear hora de "2304" a "23:04"
          const hora = mov.hora.length === 4 
            ? `${mov.hora.slice(0, 2)}:${mov.hora.slice(2, 4)}`
            : mov.hora
          
          return {
            referencia: mov.referencia,
            monto: monto,
            fecha: mov.fecha,
            hora: hora,
            concepto: mov.observacion.trim()
          }
        })
        
        // Crear respuesta en formato común
        data = {
          numero: selectedAccount,
          fechaApertura: "",
          tipoCuenta: "BDV",
          estatus: "A",
          moneda: "VES",
          saldoDisponible: 0,
          movimientos: movimientosTransformados
        }
      } else if (selectedBank === "mercantil") {
        // Banco Mercantil - POST con body
        const url = 'https://consulta-pm-mercantil-843945314233.us-central1.run.app'
        
        // Convertir fecha de YYYY-MM-DD a DD/MM/YYYY para Mercantil
        const formatDateForMercantil = (dateStr: string) => {
          const [year, month, day] = dateStr.split('-')
          return `${day}/${month}/${year}`
        }
        
        const body = {
          tipoMoneda: "ves",
          fechaPago: formatDateForMercantil(startDate),
          referencia: referencia,
          telefonoPagador: telefonoPagador,
          telefonoDestino: "04141150078",
          importe: importe
        }
        
        console.log('Body enviado a Mercantil:', body)
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          mode: 'cors',
          cache: 'no-cache',
          body: JSON.stringify(body)
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('Error response:', errorText)
          throw new Error(`Error al consultar Banco Mercantil: ${response.status}`)
        }
        
        const mercantilData = await response.json()
        
        console.log('Respuesta de Mercantil:', mercantilData)
        
        if (mercantilData.Estado === "ERROR") {
          throw new Error(mercantilData.Mensaje || "Error al consultar movimientos")
        }
        
        // Para Mercantil, la data viene en transaction_list
        const movimientosMercantil: Movimiento[] = []
        
        if (mercantilData.Estado === "APROBADO" && mercantilData.data?.transaction_list?.length > 0) {
          const transaction = mercantilData.data.transaction_list[0]
          
          movimientosMercantil.push({
            referencia: transaction.payment_reference?.toString() || referencia,
            monto: parseFloat(transaction.amount) || 0,
            fecha: formatDateForMercantil(startDate),
            hora: "-", // Mercantil no proporciona hora
            concepto: `${transaction.invoice_number || 'Pago Móvil Mercantil'} - Auth: ${transaction.authorization_code || 'N/A'}`
          })
        }
        
        data = {
          numero: "Mercantil PM",
          fechaApertura: "",
          tipoCuenta: "Pago Móvil",
          estatus: "A",
          moneda: "VES",
          saldoDisponible: 0,
          movimientos: movimientosMercantil
        }
      } else {
        throw new Error("Banco no soportado")
      }
      
      setCuentaData(data)
      setMovimientos(data.movimientos || [])
      setSearched(true)
    } catch (err: any) {
      console.error('Error completo:', err)
      setError(err.message || "Error al consultar los movimientos. Por favor verifica la conexión.")
      setCuentaData(null)
      setMovimientos([])
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await signOut(auth)
  }
  
  // Filtrar movimientos
  const filteredMovimientos = movimientos.filter((mov) => {
    if (!filterText) return true
    const searchLower = filterText.toLowerCase()
    return (
      mov.referencia.toLowerCase().includes(searchLower) ||
      mov.monto.toString().includes(searchLower) ||
      mov.concepto.toLowerCase().includes(searchLower)
    )
  })
  
  // Paginación
  const totalPages = Math.ceil(filteredMovimientos.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentMovimientos = filteredMovimientos.slice(startIndex, endIndex)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FarmatodoLogo className="w-20" />
          <div>
              <h1 className="text-lg font-bold text-[#003B71]">Portal de Validación de Transacciones</h1>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="text-foreground border-border hover:bg-muted bg-transparent"
          >
            Cerrar sesión
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Card */}
        <Card className="bg-card border-border p-6 shadow-md mb-8">
          <h2 className="text-lg font-semibold text-[#003B71] mb-6">
            {selectedBank === "mercantil" ? "Validar Pago Móvil Mercantil" : "Consultar Movimientos Bancarios"}
          </h2>

          {/* Grid para Mercantil - Todos los campos con mismo ancho */}
          {selectedBank === "mercantil" ? (
            <div className="space-y-6">
              {/* Primera fila - 3 campos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Banco */}
                <div>
                  <label className="block text-sm font-semibold text-[#003B71] mb-2">
                    Banco
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-[#003B71]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <select
                      value={selectedBank}
                      onChange={(e) => {
                        setSelectedBank(e.target.value)
                        setSelectedAccount("")
                      }}
                      className="w-full pl-10 pr-10 py-3 bg-white border-2 border-[#003B71]/20 rounded-lg text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-[#003B71]/30 focus:border-[#003B71] transition-all appearance-none cursor-pointer hover:border-[#003B71]/40"
                    >
                      {BANCOS.map((banco) => (
                        <option key={banco.id} value={banco.id}>
                          {banco.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="h-5 w-5 text-[#003B71]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Fecha de pago */}
                <div>
                  <label className="block text-sm font-semibold text-[#003B71] mb-2">
                    Fecha de pago
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-[#003B71]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border-2 border-[#003B71]/20 rounded-lg text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-[#003B71]/30 focus:border-[#003B71] transition-all cursor-pointer hover:border-[#003B71]/40"
                    />
                  </div>
                </div>

                {/* Referencia */}
                <div>
                  <label className="block text-sm font-semibold text-[#003B71] mb-2">
                    Referencia (últimos 5 dígitos)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-[#003B71]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={referencia}
                      onChange={(e) => setReferencia(e.target.value)}
                      placeholder="Ej: 489842375"
                      className="w-full pl-10 pr-4 py-3 bg-white border-2 border-[#003B71]/20 rounded-lg text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-[#003B71]/30 focus:border-[#003B71] transition-all hover:border-[#003B71]/40"
                    />
                  </div>
                </div>
              </div>

              {/* Segunda fila - 2 campos alineados con los de arriba */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Teléfono Pagador */}
                <div>
                  <label className="block text-sm font-semibold text-[#003B71] mb-2">
                    Teléfono Pagador
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-[#003B71]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={telefonoPagador}
                      onChange={(e) => setTelefonoPagador(e.target.value)}
                      placeholder="Ej: 04120794256"
                      className="w-full pl-10 pr-4 py-3 bg-white border-2 border-[#003B71]/20 rounded-lg text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-[#003B71]/30 focus:border-[#003B71] transition-all hover:border-[#003B71]/40"
                    />
                  </div>
                </div>

                {/* Importe */}
                <div>
                  <label className="block text-sm font-semibold text-[#003B71] mb-2">
                    Importe (VES)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-[#003B71]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={importe}
                      onChange={(e) => setImporte(e.target.value)}
                      placeholder="Ej: 1939,68 o 1939.68"
                      className="w-full pl-10 pr-4 py-3 bg-white border-2 border-[#003B71]/20 rounded-lg text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-[#003B71]/30 focus:border-[#003B71] transition-all hover:border-[#003B71]/40"
                    />
                  </div>
                </div>

                {/* Espacio vacío para mantener alineación */}
                <div></div>
              </div>
            </div>
          ) : (
            /* Grid para Plaza y Venezuela */
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              {/* Bank Select */}
              <div>
                <label className="block text-sm font-semibold text-[#003B71] mb-2">
                  Banco
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-[#003B71]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <select
                    value={selectedBank}
                    onChange={(e) => {
                      setSelectedBank(e.target.value)
                      setSelectedAccount("")
                    }}
                    className="w-full pl-10 pr-10 py-3 bg-white border-2 border-[#003B71]/20 rounded-lg text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-[#003B71]/30 focus:border-[#003B71] transition-all appearance-none cursor-pointer hover:border-[#003B71]/40"
                  >
                    {BANCOS.map((banco) => (
                      <option key={banco.id} value={banco.id}>
                        {banco.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="h-5 w-5 text-[#003B71]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Account Select */}
              <div>
                <label className="block text-sm font-semibold text-[#003B71] mb-2">
                  Cuenta Bancaria
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-[#003B71]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <select
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-white border-2 border-[#003B71]/20 rounded-lg text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-[#003B71]/30 focus:border-[#003B71] transition-all appearance-none cursor-pointer hover:border-[#003B71]/40"
                  >
                    <option value="">Selecciona una cuenta</option>
                    {cuentas.map((cuenta) => (
                      <option key={cuenta.number} value={cuenta.number}>
                        *{cuenta.number.slice(-4)} - {cuenta.description}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="h-5 w-5 text-[#003B71]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-semibold text-[#003B71] mb-2">
                  Fecha de inicio
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-[#003B71]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border-2 border-[#003B71]/20 rounded-lg text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-[#003B71]/30 focus:border-[#003B71] transition-all cursor-pointer hover:border-[#003B71]/40"
                  />
                </div>
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-semibold text-[#003B71] mb-2">
                  Fecha final
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-[#003B71]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border-2 border-[#003B71]/20 rounded-lg text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-[#003B71]/30 focus:border-[#003B71] transition-all cursor-pointer hover:border-[#003B71]/40"
                  />
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleSearch}
            disabled={loading}
            className="w-full bg-[#003B71] hover:bg-[#002855] text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-3 border-white border-t-transparent"></div>
                <span>{selectedBank === "mercantil" ? "Validando pago móvil..." : "Consultando movimientos..."}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>{selectedBank === "mercantil" ? "Validar Pago Móvil" : "Buscar Movimientos"}</span>
              </div>
            )}
          </Button>
          
          {error && (
            <div className="mt-4 bg-red-50 text-red-700 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
        </Card>

        {/* Results */}
        {searched && movimientos.length > 0 && (
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                {selectedBank === "mercantil" 
                  ? `Cuenta Pago Movil Mercantil - ${BANCOS.find(b => b.id === selectedBank)?.name} - Cantidad de movimientos: (${filteredMovimientos.length})`
                  : `${cuentas.find(c => c.number === selectedAccount)?.description} - ${BANCOS.find(b => b.id === selectedBank)?.name} - Cantidad de movimientos: (${filteredMovimientos.length})`
                }
              </h2>
              
              {/* Filtro */}
              <div className="w-full md:w-96">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <Input
                    type="text"
                    placeholder="Buscar por referencia, monto o concepto..."
                    value={filterText}
                    onChange={(e) => {
                      setFilterText(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full pl-10 pr-4 py-2 bg-white border-2 border-[#003B71]/20 focus:border-[#003B71] focus:ring-2 focus:ring-[#003B71]/20 rounded-lg shadow-sm"
                  />
                  {filterText && (
                    <button
                      onClick={() => {
                        setFilterText("")
                        setCurrentPage(1)
                      }}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <Card className="bg-card border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-[#003B71] text-white">
                      <th className="px-4 py-3 text-left text-xs font-semibold">Referencia</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold">Hora</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold">Concepto</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentMovimientos.map((mov, idx) => (
                      <tr key={idx} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-mono">{mov.referencia}</td>
                        <td className="px-4 py-3 text-sm">{mov.fecha}</td>
                        <td className="px-4 py-3 text-sm">{mov.hora}</td>
                        <td className="px-4 py-3 text-sm">{mov.concepto}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-blue-600">
                          {mov.monto.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {startIndex + 1} - {Math.min(endIndex, filteredMovimientos.length)} de {filteredMovimientos.length}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className={currentPage === pageNum ? "bg-[#003B71]" : ""}
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
              </Card>
          </div>
        )}
        
        {searched && movimientos.length === 0 && !error && (
          <Card className="bg-card border-border p-8 text-center">
            <p className="text-muted-foreground">No se encontraron movimientos para el rango de fechas seleccionado</p>
          </Card>
        )}
      </main>
    </div>
  )
}
