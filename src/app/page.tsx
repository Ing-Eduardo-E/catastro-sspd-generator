'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  FileUp, 
  Download, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  FileSpreadsheet,
  Info,
  Building2,
  Hash
} from 'lucide-react'

export default function Home() {
  const [r1File, setR1File] = useState<File | null>(null)
  const [r2File, setR2File] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<{
    totalRecords: number
    matchedRecords: number
    unmatchedRecords: number
    urbanRecords: number
    ruralRecords: number
  } | null>(null)
  
  // Datos de la empresa urbana
  const [empresa, setEmpresa] = useState({
    nombre: '',
    nit: '',
    dv: '',
    aplicaMetodologia: '7'
  })
  
  // Datos de la empresa veredal (acueducto rural no constituido)
  const [empresaVeredal, setEmpresaVeredal] = useState({
    nombre: ''
  })

  const handleFileChange = useCallback((type: 'r1' | 'r2') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (type === 'r1') {
        setR1File(file)
      } else {
        setR2File(file)
      }
      setError(null)
      setStats(null)
    }
  }, [])

  const handleEmpresaChange = useCallback((field: string, value: string) => {
    setEmpresa(prev => ({ ...prev, [field]: value }))
    setError(null)
  }, [])

  const handleEmpresaVeredalChange = useCallback((field: string, value: string) => {
    setEmpresaVeredal(prev => ({ ...prev, [field]: value }))
    setError(null)
  }, [])

  const processFiles = useCallback(async () => {
    if (!r1File || !r2File) {
      setError('Por favor seleccione ambos archivos (R1 y R2)')
      return
    }

    if (!empresa.nombre.trim()) {
      setError('Por favor ingrese el nombre de la empresa urbana')
      return
    }

    if (!empresa.nit.trim() || empresa.nit.length !== 9) {
      setError('El NIT debe tener 9 dígitos')
      return
    }

    if (!empresa.dv.trim()) {
      setError('Por favor ingrese el dígito de verificación')
      return
    }

    setIsProcessing(true)
    setError(null)
    setProgress(0)
    setStatus('Leyendo archivo R1...')
    setStats(null)

    try {
      const formData = new FormData()
      formData.append('r1File', r1File)
      formData.append('r2File', r2File)
      formData.append('empresaNombre', empresa.nombre)
      formData.append('empresaNit', empresa.nit)
      formData.append('empresaDv', empresa.dv)
      formData.append('aplicaMetodologia', empresa.aplicaMetodologia)
      formData.append('empresaVeredalNombre', empresaVeredal.nombre)

      setProgress(20)
      setStatus('Procesando registros...')

      const response = await fetch('/api/process-catastro', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al procesar los archivos')
      }

      // Obtener estadísticas de los headers
      const totalRecords = parseInt(response.headers.get('X-Total-Records') || '0', 10)
      const matchedRecords = parseInt(response.headers.get('X-Matched-Records') || '0', 10)
      const unmatchedRecords = parseInt(response.headers.get('X-Unmatched-Records') || '0', 10)
      const urbanRecords = parseInt(response.headers.get('X-Urban-Records') || '0', 10)
      const ruralRecords = parseInt(response.headers.get('X-Rural-Records') || '0', 10)
      const filename = response.headers.get('X-Filename') || 'Plantilla_REC_SSPD.xlsx'

      // Descargar archivo directamente
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      setProgress(100)
      setStatus('Proceso completado - Archivo descargado')
      setStats({
        totalRecords,
        matchedRecords,
        unmatchedRecords,
        urbanRecords,
        ruralRecords,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsProcessing(false)
    }
  }, [r1File, r2File, empresa, empresaVeredal])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Generador de Plantilla REC - SSPD
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Convierte archivos catastrales R1 y R2 al formato de Reporte de Estratificación y Coberturas
          </p>
        </div>

        {/* Info Card */}
        <Card className="mb-6 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">Instrucciones:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700 dark:text-blue-300">
                  <li>Cargue el archivo R1 (información predial básica)</li>
                  <li>Cargue el archivo R2 (información de construcciones y estratos)</li>
                  <li>Registre los datos de la empresa de servicios públicos urbana</li>
                  <li>Registre el nombre del acueducto veredal (para zona rural con vivienda)</li>
                  <li>Presione &quot;Procesar Archivos&quot; para generar la plantilla</li>
                  <li>Descargue el archivo Excel y complete manualmente los campos NUIS</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Upload Section */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* R1 Upload */}
          <Card className={`transition-all ${r1File ? 'ring-2 ring-green-500' : ''}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Archivo R1
                {r1File && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              </CardTitle>
              <CardDescription>
                Registro Tipo 1 - Información predial básica
              </CardDescription>
            </CardHeader>
            <CardContent>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                {r1File ? (
                  <div className="text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {r1File.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(r1File.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <FileUp className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">
                      Arrastre o haga clic para seleccionar
                    </p>
                  </div>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept=".txt,.TXT"
                  onChange={handleFileChange('r1')}
                />
              </label>
            </CardContent>
          </Card>

          {/* R2 Upload */}
          <Card className={`transition-all ${r2File ? 'ring-2 ring-green-500' : ''}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Archivo R2
                {r2File && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              </CardTitle>
              <CardDescription>
                Registro Tipo 2 - Información de construcciones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                {r2File ? (
                  <div className="text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {r2File.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(r2File.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <FileUp className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">
                      Arrastre o haga clic para seleccionar
                    </p>
                  </div>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept=".txt,.TXT"
                  onChange={handleFileChange('r2')}
                />
              </label>
            </CardContent>
          </Card>
        </div>

        {/* Empresa Urbana Data Section */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              Datos de la Empresa de Servicios Públicos (Zona Urbana)
            </CardTitle>
            <CardDescription>
              Estos datos se aplicarán automáticamente a todos los predios urbanos para los 3 servicios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Nombre de la empresa */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="empresaNombre">Nombre de la Empresa</Label>
                <Input
                  id="empresaNombre"
                  placeholder="Ej: Empresa de Servicios Públicos de..."
                  value={empresa.nombre}
                  onChange={(e) => handleEmpresaChange('nombre', e.target.value)}
                  maxLength={300}
                />
              </div>
              
              {/* NIT */}
              <div className="space-y-2">
                <Label htmlFor="empresaNit">NIT (9 dígitos)</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="empresaNit"
                    placeholder="123456789"
                    value={empresa.nit}
                    onChange={(e) => handleEmpresaChange('nit', e.target.value.replace(/\D/g, '').slice(0, 9))}
                    className="pl-9"
                    maxLength={9}
                  />
                </div>
              </div>
              
              {/* DV */}
              <div className="space-y-2">
                <Label htmlFor="empresaDv">Dígito de Verificación</Label>
                <Input
                  id="empresaDv"
                  placeholder="0"
                  value={empresa.dv}
                  onChange={(e) => handleEmpresaChange('dv', e.target.value.replace(/\D/g, '').slice(0, 1))}
                  maxLength={1}
                  className="w-20"
                />
              </div>
            </div>

            {/* Metodología de estratificación */}
            <div className="mt-4 space-y-2">
              <Label htmlFor="aplicaMetodologia">Aplicación de Metodología de Estratificación</Label>
              <Select
                value={empresa.aplicaMetodologia}
                onValueChange={(value) => handleEmpresaChange('aplicaMetodologia', value)}
              >
                <SelectTrigger className="w-full md:w-[500px]">
                  <SelectValue placeholder="Seleccione una opción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">
                    <div className="flex flex-col">
                      <span className="font-medium">La alcaldía adoptó metodología y la empresa la aplica</span>
                      <span className="text-xs text-slate-500">Estrato servicio: 71-76 (ej: estrato 2 → 72)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="8">
                    <div className="flex flex-col">
                      <span className="font-medium">La alcaldía adoptó metodología pero la empresa NO la aplica</span>
                      <span className="text-xs text-slate-500">Estrato servicio: 81-86 (usa estratificación propia)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="9">
                    <div className="flex flex-col">
                      <span className="font-medium">La alcaldía NO adoptó metodología</span>
                      <span className="text-xs text-slate-500">Estrato servicio: 91-96 (empresa aplica estratificación propia)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Leyenda de clasificación */}
            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                Clasificación automática según DESTINO_ECONOMICO (campo R1):
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-500">
                <div><span className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">P/N</span> = Oficial (Estrato Alcaldía: 9, Servicio: 14)</div>
                <div><span className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">C</span> = Comercial (Estrato Alcaldía: 9, Servicio: 12)</div>
                <div><span className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">I</span> = Industrial (Estrato Alcaldía: 9, Servicio: 11)</div>
                <div><span className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">D/A</span> = Residencial (Estrato según R2)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Empresa Veredal - Acueducto Rural No Constituido */}
        <Card className="mb-6 border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              Acueducto Veredal (Rural No Constituido)
            </CardTitle>
            <CardDescription>
              Nombre del acueducto veredal para predios rurales con vivienda (AREA_CONSTRUIDA &gt; 0). 
              Estos acueductos no tienen NIT constituido.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Nombre de la empresa veredal */}
              <div className="space-y-2">
                <Label htmlFor="empresaVeredalNombre">Nombre del Acueducto Veredal</Label>
                <Input
                  id="empresaVeredalNombre"
                  placeholder="Ej: Acueducto Veredal El Porvenir"
                  value={empresaVeredal.nombre}
                  onChange={(e) => handleEmpresaVeredalChange('nombre', e.target.value)}
                  maxLength={300}
                />
              </div>
              
              {/* Info de NIT y DV para veredal */}
              <div className="space-y-2">
                <Label>NIT y DV</Label>
                <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <Info className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Se asignará automáticamente: <strong>NIT = NO NUMERO</strong>, <strong>DV = NO NUMERO</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Leyenda de clasificación rural */}
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-2">
                Clasificación para zona rural:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-amber-700 dark:text-amber-300">
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-amber-200 dark:bg-amber-800 px-1 rounded">AREA_CONSTRUIDA &gt; 0</span>
                  = Tiene vivienda → Se asigna acueducto veredal
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-amber-200 dark:bg-amber-800 px-1 rounded">AREA_CONSTRUIDA = 0</span>
                  = Sin vivienda → Sin servicio (Nombre: 8)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Progress Section */}
        {isProcessing && (
          <Card className="mb-6">
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-medium">{status}</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Section */}
        {stats && (
          <Card className="mb-6 border-green-200 dark:border-green-800">
            <CardContent className="pt-4">
              <div className="flex items-center gap-4 flex-wrap">
                <Badge variant="outline" className="text-sm py-1 px-3">
                  Total predios: {stats.totalRecords.toLocaleString()}
                </Badge>
                <Badge variant="outline" className="text-sm py-1 px-3 bg-green-50 dark:bg-green-950">
                  Urbanos: {stats.urbanRecords.toLocaleString()}
                </Badge>
                <Badge variant="outline" className="text-sm py-1 px-3 bg-amber-50 dark:bg-amber-950">
                  Rurales: {stats.ruralRecords.toLocaleString()}
                </Badge>
                <Badge variant="outline" className="text-sm py-1 px-3 bg-blue-50 dark:bg-blue-950">
                  Coincidentes R1-R2: {stats.matchedRecords.toLocaleString()}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                * Los predios se clasificaron según DESTINO_ECONOMICO y AREA_CONSTRUIDA. El NUIS debe completarse manualmente.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Button
            onClick={processFiles}
            disabled={!r1File || !r2File || isProcessing || !empresa.nombre || !empresa.nit || !empresa.dv}
            size="lg"
            className="min-w-[200px]"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Procesar Archivos
              </>
            )}
          </Button>
        </div>

        {/* Output Format Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Formato de Salida - 24 Columnas</CardTitle>
            <CardDescription>
              El archivo Excel generado contendrá las 24 columnas del formato REC según la Resolución SSPD No. 20211000852195
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Columnas 1-9 */}
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Columnas 1-9: Información Catastral (automática desde R1/R2)
                </p>
                <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {[
                    { num: 1, name: 'Código DANE Depto' },
                    { num: 2, name: 'Código DANE Mpio' },
                    { num: 3, name: 'Info Predial' },
                    { num: 4, name: 'NPN (30 chars)' },
                    { num: 5, name: 'Dirección' },
                    { num: 6, name: 'Tipo Asentamiento' },
                    { num: 7, name: 'Tipo Estratificación' },
                    { num: 8, name: 'Estrato Alcaldía' },
                    { num: 9, name: 'Estrato Atípico' },
                  ].map((col) => (
                    <div
                      key={col.num}
                      className="flex items-center gap-2 p-2 rounded bg-slate-50 dark:bg-slate-800"
                    >
                      <Badge variant="secondary" className="text-xs">{col.num}</Badge>
                      <span className="text-xs">{col.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Columnas 10-14 Acueducto */}
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                  Columnas 10-14: Acueducto
                </p>
                <div className="grid sm:grid-cols-5 gap-2">
                  {[
                    { num: 10, name: 'Nombre Empresa', auto: true },
                    { num: 11, name: 'NIT', auto: true },
                    { num: 12, name: 'DV', auto: true },
                    { num: 13, name: 'NUIS', auto: false },
                    { num: 14, name: 'Estrato', auto: true },
                  ].map((col) => (
                    <div
                      key={col.num}
                      className={`flex items-center gap-2 p-2 rounded ${col.auto ? 'bg-blue-50 dark:bg-blue-950' : 'bg-amber-50 dark:bg-amber-950'}`}
                    >
                      <Badge variant="secondary" className="text-xs">{col.num}</Badge>
                      <span className="text-xs">{col.name}</span>
                      {col.auto ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500 ml-auto" />
                      ) : (
                        <span className="text-xs text-amber-600 ml-auto">Manual</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Columnas 15-19 Alcantarillado */}
              <div>
                <p className="text-sm font-medium text-teal-700 dark:text-teal-300 mb-2">
                  Columnas 15-19: Alcantarillado
                </p>
                <div className="grid sm:grid-cols-5 gap-2">
                  {[
                    { num: 15, name: 'Nombre Empresa', auto: true },
                    { num: 16, name: 'NIT', auto: true },
                    { num: 17, name: 'DV', auto: true },
                    { num: 18, name: 'NUIS', auto: false },
                    { num: 19, name: 'Estrato', auto: true },
                  ].map((col) => (
                    <div
                      key={col.num}
                      className={`flex items-center gap-2 p-2 rounded ${col.auto ? 'bg-teal-50 dark:bg-teal-950' : 'bg-amber-50 dark:bg-amber-950'}`}
                    >
                      <Badge variant="secondary" className="text-xs">{col.num}</Badge>
                      <span className="text-xs">{col.name}</span>
                      {col.auto ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500 ml-auto" />
                      ) : (
                        <span className="text-xs text-amber-600 ml-auto">Manual</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Columnas 20-24 Aseo */}
              <div>
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
                  Columnas 20-24: Aseo
                </p>
                <div className="grid sm:grid-cols-5 gap-2">
                  {[
                    { num: 20, name: 'Nombre Empresa', auto: true },
                    { num: 21, name: 'NIT', auto: true },
                    { num: 22, name: 'DV', auto: true },
                    { num: 23, name: 'NUIS', auto: false },
                    { num: 24, name: 'Estrato', auto: true },
                  ].map((col) => (
                    <div
                      key={col.num}
                      className={`flex items-center gap-2 p-2 rounded ${col.auto ? 'bg-purple-50 dark:bg-purple-950' : 'bg-amber-50 dark:bg-amber-950'}`}
                    >
                      <Badge variant="secondary" className="text-xs">{col.num}</Badge>
                      <span className="text-xs">{col.name}</span>
                      {col.auto ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500 ml-auto" />
                      ) : (
                        <span className="text-xs text-amber-600 ml-auto">Manual</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-slate-500 dark:text-slate-400">
          <p>
            Basado en la Resolución SSPD No. 20211000852195 del 22-12-2021
          </p>
          <p className="mt-1">
            La clasificación de estratos se basa en el campo DESTINO_ECONOMICO del archivo R1.
          </p>
        </footer>
      </div>
    </div>
  )
}
