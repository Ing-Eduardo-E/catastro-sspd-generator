'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  FileUp, 
  Download, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  FileSpreadsheet,
  Info
} from 'lucide-react'

export default function Home() {
  const [r1File, setR1File] = useState<File | null>(null)
  const [r2File, setR2File] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [stats, setStats] = useState<{
    totalRecords: number
    matchedRecords: number
    unmatchedRecords: number
  } | null>(null)

  const handleFileChange = useCallback((type: 'r1' | 'r2') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (type === 'r1') {
        setR1File(file)
      } else {
        setR2File(file)
      }
      setError(null)
      setDownloadUrl(null)
      setStats(null)
    }
  }, [])

  const processFiles = useCallback(async () => {
    if (!r1File || !r2File) {
      setError('Por favor seleccione ambos archivos (R1 y R2)')
      return
    }

    setIsProcessing(true)
    setError(null)
    setProgress(0)
    setStatus('Leyendo archivo R1...')
    setDownloadUrl(null)
    setStats(null)

    try {
      const formData = new FormData()
      formData.append('r1File', r1File)
      formData.append('r2File', r2File)

      const response = await fetch('/api/process-catastro', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al procesar los archivos')
      }

      const result = await response.json()
      
      setProgress(100)
      setStatus('Proceso completado')
      setDownloadUrl(result.downloadUrl)
      setStats({
        totalRecords: result.totalRecords,
        matchedRecords: result.matchedRecords,
        unmatchedRecords: result.unmatchedRecords,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsProcessing(false)
    }
  }, [r1File, r2File])

  const handleDownload = useCallback(async () => {
    if (!downloadUrl) return
    
    try {
      const response = await fetch(downloadUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'Plantilla_REC_SSPD.xlsx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError('Error al descargar el archivo')
    }
  }, [downloadUrl])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
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
                  <li>Presione &quot;Procesar Archivos&quot; para generar la plantilla</li>
                  <li>Descargue el archivo Excel generado con las primeras 9 columnas</li>
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
                  Total registros: {stats.totalRecords.toLocaleString()}
                </Badge>
                <Badge variant="outline" className="text-sm py-1 px-3 bg-green-50 dark:bg-green-950">
                  Coincidentes: {stats.matchedRecords.toLocaleString()}
                </Badge>
                <Badge variant="outline" className="text-sm py-1 px-3 bg-amber-50 dark:bg-amber-950">
                  Sin coincidencia: {stats.unmatchedRecords.toLocaleString()}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Button
            onClick={processFiles}
            disabled={!r1File || !r2File || isProcessing}
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

          {downloadUrl && (
            <Button
              onClick={handleDownload}
              variant="default"
              size="lg"
              className="min-w-[200px] bg-green-600 hover:bg-green-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar Excel
            </Button>
          )}
        </div>

        {/* Output Format Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Formato de Salida</CardTitle>
            <CardDescription>
              El archivo Excel generado contendrá las siguientes 9 columnas según la Resolución SSPD No. 20211000852195:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { num: 1, name: 'Código DANE Departamento', desc: '2 caracteres' },
                { num: 2, name: 'Código DANE Municipio', desc: '3 caracteres' },
                { num: 3, name: 'Información Predial Utilizada', desc: '1 = Número Predial Nacional' },
                { num: 4, name: 'Número Predial Nacional', desc: '25 caracteres' },
                { num: 5, name: 'Dirección Catastral del Predio', desc: 'Hasta 60 caracteres' },
                { num: 6, name: 'Tipo de Asentamiento', desc: '000=Cabecera, 999=Rural' },
                { num: 7, name: 'Tipo de Estratificación', desc: 'Según metodología DANE' },
                { num: 8, name: 'Estrato Alcaldía', desc: 'Estrato asignado' },
                { num: 9, name: 'Estrato Atípico', desc: 'Código de excepción' },
              ].map((col) => (
                <div
                  key={col.num}
                  className="flex items-start gap-2 p-2 rounded bg-slate-50 dark:bg-slate-800"
                >
                  <Badge variant="secondary" className="mt-0.5">
                    {col.num}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">{col.name}</p>
                    <p className="text-xs text-slate-500">{col.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-slate-500 dark:text-slate-400">
          <p>
            Basado en la Resolución SSPD No. 20211000852195 del 22-12-2021
          </p>
          <p className="mt-1">
            Las columnas 10-24 deben ser completadas por la empresa de servicios públicos correspondiente
          </p>
        </footer>
      </div>
    </div>
  )
}
