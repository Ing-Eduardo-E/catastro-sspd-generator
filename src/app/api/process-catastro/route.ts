import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

// Definición de la estructura de campos R1 (posiciones base 1)
const R1_FIELDS = [
  { name: 'DEPARTAMENTO', start: 1, end: 2 },
  { name: 'MUNICIPIO', start: 3, end: 5 },
  { name: 'NUMERO_DEL_PREDIO', start: 6, end: 30 },
  { name: 'TIPO_DE_REGISTRO', start: 31, end: 31 },
  { name: 'NUMERO_DE_ORDEN', start: 32, end: 34 },
  { name: 'TOTAL_REGISTROS', start: 35, end: 37 },
  { name: 'NOMBRE', start: 38, end: 137 },
  { name: 'ESTADO_CIVIL', start: 138, end: 138 },
  { name: 'TIPO_DOCUMENTO', start: 139, end: 139 },
  { name: 'NUMERO_DOCUMENTO', start: 140, end: 151 },
  { name: 'DIRECCION', start: 152, end: 251 },
  { name: 'COMUNA', start: 252, end: 252 },
  { name: 'DESTINO_ECONOMICO', start: 253, end: 253 },
  { name: 'AREA_TERRENO', start: 254, end: 268 },
  { name: 'AREA_CONSTRUIDA', start: 269, end: 274 },
  { name: 'AVALUO', start: 275, end: 289 },
  { name: 'VIGENCIA', start: 290, end: 297 },
  { name: 'NUMERO_PREDIAL_ANTERIOR', start: 298, end: 312 },
]

// Definición de la estructura de campos R2 (posiciones base 1)
const R2_FIELDS = [
  { name: 'DEPARTAMENTO', start: 1, end: 2 },
  { name: 'MUNICIPIO', start: 3, end: 5 },
  { name: 'NUMERO_DEL_PREDIO', start: 6, end: 30 },
  { name: 'TIPO_DE_REGISTRO', start: 31, end: 31 },
  { name: 'NUMERO_DE_ORDEN', start: 32, end: 34 },
  { name: 'TOTAL_REGISTROS', start: 35, end: 37 },
  { name: 'MATRICULA_INMOBILIARIA', start: 38, end: 55 },
  { name: 'ESPACIO_1', start: 56, end: 77 },
  { name: 'ZONA_FISICA_1', start: 78, end: 80 },
  { name: 'ZONA_ECONOMICA_1', start: 81, end: 83 },
  { name: 'AREA_TERRENO_1', start: 84, end: 98 },
  { name: 'ESPACIO_2', start: 99, end: 120 },
  { name: 'ZONA_FISICA_2', start: 121, end: 123 },
  { name: 'ZONA_ECONOMICA_2', start: 124, end: 126 },
  { name: 'AREA_TERRENO_2', start: 127, end: 141 },
  { name: 'ESPACIO_3', start: 142, end: 163 },
  { name: 'HABITACIONES_1', start: 164, end: 167 },
  { name: 'BANOS_1', start: 168, end: 171 },
  { name: 'LOCALES_1', start: 172, end: 175 },
  { name: 'PISOS_1', start: 176, end: 177 },
  { name: 'ESTRATO_1', start: 178, end: 178 },
  { name: 'USO_1', start: 179, end: 181 },
  { name: 'PUNTAJE_1', start: 182, end: 183 },
  { name: 'AREA_CONSTRUIDA_1', start: 184, end: 189 },
  { name: 'ESPACIO_4', start: 190, end: 211 },
  { name: 'HABITACIONES_2', start: 212, end: 215 },
  { name: 'BANOS_2', start: 216, end: 219 },
  { name: 'LOCALES_2', start: 220, end: 223 },
  { name: 'PISOS_2', start: 224, end: 225 },
  { name: 'ESTRATO_2', start: 226, end: 226 },
  { name: 'USO_2', start: 227, end: 229 },
  { name: 'PUNTAJE_2', start: 230, end: 231 },
  { name: 'AREA_CONSTRUIDA_2', start: 232, end: 237 },
  { name: 'ESPACIO_5', start: 238, end: 259 },
  { name: 'HABITACIONES_3', start: 260, end: 263 },
  { name: 'BANOS_3', start: 264, end: 267 },
  { name: 'LOCALES_3', start: 268, end: 271 },
  { name: 'PISOS_3', start: 272, end: 273 },
  { name: 'ESTRATO_3', start: 274, end: 274 },
  { name: 'USO_3', start: 275, end: 277 },
  { name: 'PUNTAJE_3', start: 278, end: 279 },
  { name: 'AREA_CONSTRUIDA_3', start: 280, end: 285 },
  { name: 'ESPACIO_6', start: 286, end: 307 },
  { name: 'VIGENCIA', start: 308, end: 315 },
  { name: 'NUMERO_PREDIAL_ANTERIOR', start: 316, end: 330 },
]

// Función para parsear una línea de ancho fijo
function parseFixedWidthLine(line: string, fields: typeof R1_FIELDS): Record<string, string> {
  const result: Record<string, string> = {}
  for (const field of fields) {
    const value = line.substring(field.start - 1, field.end).trim()
    result[field.name] = value
  }
  return result
}

// Función para extraer la zona del Número Predial Nacional
function getZonaNPN(npn: string): string {
  if (npn.length < 7) return '00'
  return npn.substring(5, 7)
}

// Función para determinar el tipo de asentamiento según la zona del NPN
function getTipoAsentamiento(npn: string): string {
  const zona = getZonaNPN(npn)
  if (zona === '01') return '000' // Cabecera municipal
  if (zona === '00') return '999' // Rural dispersa
  return parseInt(zona, 10).toString().padStart(3, '0') // Centros poblados
}

// Función para verificar si el predio es urbano (cabecera o centros poblados)
function esZonaUrbana(npn: string): boolean {
  const zona = getZonaNPN(npn)
  return zona !== '00' // Todo lo que no sea rural (00) es urbano/centro poblado
}

// Tipo para clasificación de predio
type TipoPredio = 'OFICIAL' | 'COMERCIAL' | 'INDUSTRIAL' | 'SERVICIOS' | 'RESIDENCIAL' | 'OTRO_NO_RESIDENCIAL'

// Función para obtener tipo de predio según DESTINO_ECONOMICO
function getTipoPredio(destinoEconomico: string): TipoPredio {
  const destino = destinoEconomico.toUpperCase()
  switch (destino) {
    case 'P': // Público
    case 'N': // Institucional/Oficial
      return 'OFICIAL'
    case 'C': // Comercio
      return 'COMERCIAL'
    case 'I': // Industria
      return 'INDUSTRIAL'
    case 'S': // Servicios/Salud
    case 'H': // Hotelero/Hospitalario
      return 'SERVICIOS'
    case 'D': // Vivienda/Dotacional
    case 'A': // Agrícola (puede ser residencial rural)
      return 'RESIDENCIAL'
    default:
      return 'OTRO_NO_RESIDENCIAL'
  }
}

// Función para determinar el Estrato Alcaldía (Columna 8)
function getEstratoAlcaldia(estratoR2: string, destinoEconomico: string): string {
  const tipoPredio = getTipoPredio(destinoEconomico)
  
  // Si es no residencial (P, N, C, I, S, H, otros) → 9
  if (tipoPredio !== 'RESIDENCIAL') {
    return '9'
  }
  
  // Si es residencial y tiene estrato válido en R2 → ese estrato
  if (['1', '2', '3', '4', '5', '6'].includes(estratoR2)) {
    return estratoR2
  }
  
  // Si es residencial sin estrato → 8
  return '8'
}

// Función para determinar el código de Estrato de Servicio (Columnas 14, 19, 24)
function getEstratoServicio(
  estratoAlcaldia: string,
  destinoEconomico: string,
  aplicaMetodologia: string,
  esUrbano: boolean,
  tieneVivienda: boolean = false
): string {
  const tipoPredio = getTipoPredio(destinoEconomico)
  
  // Si es zona rural
  if (!esUrbano) {
    // Rural con vivienda (tiene acueducto veredal) → tarifa única
    if (tieneVivienda) {
      return '04'
    }
    // Rural sin vivienda → sin servicio
    return '99'
  }
  
  // Clasificación por tipo de predio para no residenciales
  switch (tipoPredio) {
    case 'INDUSTRIAL':
      return '11'
    case 'COMERCIAL':
      return '12'
    case 'SERVICIOS':
      return '13'
    case 'OFICIAL':
      return '14'
    case 'OTRO_NO_RESIDENCIAL':
      return '20'
    case 'RESIDENCIAL':
      // Si tiene estrato 1-6 → usar código según metodología
      if (['1', '2', '3', '4', '5', '6'].includes(estratoAlcaldia)) {
        return aplicaMetodologia + estratoAlcaldia
      }
      // Residencial sin estrato → tarifa única
      return '04'
    default:
      return '99'
  }
}

// Definición de las 24 columnas del formato SSPD
const OUTPUT_COLUMNS = [
  { header: 'Código DANE Departamento', width: 20 },
  { header: 'Código DANE Municipio', width: 20 },
  { header: 'Información Predial Utilizada', width: 15 },
  { header: 'Número Predial Nacional', width: 35 },
  { header: 'Dirección Catastral del Predio', width: 40 },
  { header: 'Tipo de Asentamiento', width: 20 },
  { header: 'Tipo de Estratificación', width: 20 },
  { header: 'Estrato Alcaldía', width: 15 },
  { header: 'Estrato Atípico', width: 15 },
  // Acueducto
  { header: 'Acueducto - Nombre de la Empresa', width: 30 },
  { header: 'Acueducto - NIT', width: 15 },
  { header: 'Acueducto - DV', width: 10 },
  { header: 'Acueducto - NUIS', width: 20 },
  { header: 'Acueducto - Estrato', width: 15 },
  // Alcantarillado
  { header: 'Alcantarillado - Nombre de la Empresa', width: 30 },
  { header: 'Alcantarillado - NIT', width: 15 },
  { header: 'Alcantarillado - DV', width: 10 },
  { header: 'Alcantarillado - NUIS', width: 20 },
  { header: 'Alcantarillado - Estrato', width: 15 },
  // Aseo
  { header: 'Aseo - Nombre de la Empresa', width: 30 },
  { header: 'Aseo - NIT', width: 15 },
  { header: 'Aseo - DV', width: 10 },
  { header: 'Aseo - NUIS', width: 20 },
  { header: 'Aseo - Estrato', width: 15 },
]

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const r1File = formData.get('r1File') as File
    const r2File = formData.get('r2File') as File
    
    // Datos de la empresa urbana
    const empresaNombre = formData.get('empresaNombre') as string || ''
    const empresaNit = formData.get('empresaNit') as string || ''
    const empresaDv = formData.get('empresaDv') as string || ''
    const aplicaMetodologia = formData.get('aplicaMetodologia') as string || '7'
    // Datos de la empresa veredal (acueducto rural no constituido)
    const empresaVeredalNombre = formData.get('empresaVeredalNombre') as string || ''

    if (!r1File || !r2File) {
      return NextResponse.json(
        { error: 'Se requieren ambos archivos R1 y R2' },
        { status: 400 }
      )
    }

    // Leer archivos como texto
    const r1Text = await r1File.text()
    const r2Text = await r2File.text()

    // Parsear líneas
    const r1Lines = r1Text.split('\n').filter(line => line.trim().length > 0)
    const r2Lines = r2Text.split('\n').filter(line => line.trim().length > 0)

    // Crear mapa de R2 usando NUMERO_DEL_PREDIO como clave
    const r2Map = new Map<string, Record<string, string>>()
    for (const line of r2Lines) {
      const parsed = parseFixedWidthLine(line, R2_FIELDS)
      const predialKey = parsed.NUMERO_DEL_PREDIO
      if (predialKey && !r2Map.has(predialKey)) {
        r2Map.set(predialKey, parsed)
      }
    }

    // Procesar registros
    const outputData: Record<string, string>[] = []
    let matchedRecords = 0
    let unmatchedRecords = 0
    let urbanRecords = 0
    let ruralRecords = 0

    for (const line of r1Lines) {
      const r1Data = parseFixedWidthLine(line, R1_FIELDS)
      const predialKey = r1Data.NUMERO_DEL_PREDIO
      const r2Data = r2Map.get(predialKey)

      if (r2Data) {
        matchedRecords++
      } else {
        unmatchedRecords++
      }

      const estratoR2 = r2Data?.ESTRATO_1 || ''
      const destinoEconomico = r1Data.DESTINO_ECONOMICO || ''
      const areaConstruida = r1Data.AREA_CONSTRUIDA || ''
      
      // Construir Número Predial Nacional
      const numeroPredialNacional = r1Data.DEPARTAMENTO + r1Data.MUNICIPIO + r1Data.NUMERO_DEL_PREDIO
      
      // Determinar zona
      const esUrbano = esZonaUrbana(numeroPredialNacional)
      if (esUrbano) {
        urbanRecords++
      } else {
        ruralRecords++
      }

      // Determinar estrato alcaldía (Columna 8)
      const estratoAlcaldia = getEstratoAlcaldia(estratoR2, destinoEconomico)
      
      // Para zona rural: verificar si tiene vivienda (AREA_CONSTRUIDA > 0)
      const tieneVivienda = !esUrbano && areaConstruida.trim() !== '' && parseInt(areaConstruida, 10) > 0
      
      // Determinar estrato de servicio (pasar tieneVivienda para rurales con servicio)
      const estratoServicio = getEstratoServicio(estratoAlcaldia, destinoEconomico, aplicaMetodologia, esUrbano, tieneVivienda)

      // Determinar datos de la empresa según zona
      // Lógica:
      // - Urbano: usar empresa urbana (con NIT)
      // - Rural con vivienda (AREA_CONSTRUIDA > 0): acueducto veredal no constituido
      // - Rural sin vivienda (AREA_CONSTRUIDA = 0): sin servicio
      
      let nombreEmpresa: string, nitEmpresa: string, dvEmpresa: string, nuis: string
      
      if (esUrbano) {
        // Zona urbana: usar empresa urbana
        nombreEmpresa = empresaNombre
        nitEmpresa = empresaNit
        dvEmpresa = empresaDv
        nuis = '' // Para completar manualmente
      } else if (tieneVivienda) {
        // Zona rural con vivienda: acueducto veredal no constituido
        nombreEmpresa = empresaVeredalNombre || 'ACUEDUCTO VEREDAL'
        nitEmpresa = 'NO NUMERO'
        dvEmpresa = 'NO NUMERO'
        nuis = '' // Para completar manualmente
      } else {
        // Zona rural sin vivienda: sin servicio
        nombreEmpresa = '8'
        nitEmpresa = 'NO APLICA'
        dvEmpresa = 'NO APLICA'
        nuis = 'NO APLICA'
      }
      
      // Determinar tipo de estratificación
      // Para rural con vivienda: tipo 6 (fincas y viviendas dispersas)
      // Para rural sin vivienda: tipo 8 (sin estratificar)
      let tipoEstratificacion: string
      if (esUrbano) {
        // Urbano - Tipo 3 (metodología Tipo 3)
        if (estratoAlcaldia === '9') {
          tipoEstratificacion = '9' // No residencial
        } else if (estratoAlcaldia === '8') {
          tipoEstratificacion = '8' // Sin estratificar
        } else {
          tipoEstratificacion = '3' // Urbano Tipo 3
        }
      } else if (tieneVivienda) {
        tipoEstratificacion = '6' // Rural con metodología de fincas
      } else {
        tipoEstratificacion = '8' // Sin estratificar
      }

      // Construir registro de salida
      const outputRow: Record<string, string> = {
        'Código DANE Departamento': r1Data.DEPARTAMENTO,
        'Código DANE Municipio': r1Data.MUNICIPIO,
        'Información Predial Utilizada': '1',
        'Número Predial Nacional': numeroPredialNacional,
        'Dirección Catastral del Predio': (r1Data.DIRECCION || '').substring(0, 60),
        'Tipo de Asentamiento': getTipoAsentamiento(numeroPredialNacional),
        'Tipo de Estratificación': tipoEstratificacion,
        'Estrato Alcaldía': estratoAlcaldia,
        'Estrato Atípico': '',
        // Acueducto
        'Acueducto - Nombre de la Empresa': nombreEmpresa,
        'Acueducto - NIT': nitEmpresa,
        'Acueducto - DV': dvEmpresa,
        'Acueducto - NUIS': nuis,
        'Acueducto - Estrato': estratoServicio,
        // Alcantarillado
        'Alcantarillado - Nombre de la Empresa': nombreEmpresa,
        'Alcantarillado - NIT': nitEmpresa,
        'Alcantarillado - DV': dvEmpresa,
        'Alcantarillado - NUIS': nuis,
        'Alcantarillado - Estrato': estratoServicio,
        // Aseo
        'Aseo - Nombre de la Empresa': nombreEmpresa,
        'Aseo - NIT': nitEmpresa,
        'Aseo - DV': dvEmpresa,
        'Aseo - NUIS': nuis,
        'Aseo - Estrato': estratoServicio,
      }

      outputData.push(outputRow)
    }

    // Crear workbook
    const workbook = XLSX.utils.book_new()

    // Crear hoja de datos
    const worksheetData = [
      OUTPUT_COLUMNS.map(col => col.header),
      ...outputData.map(row => OUTPUT_COLUMNS.map(col => row[col.header] || ''))
    ]

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
    worksheet['!cols'] = OUTPUT_COLUMNS.map(col => ({ wch: col.width }))

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla REC')

    // Crear hoja de instrucciones
    const notesData = [
      ['NOTAS EXPLICATORIAS - Formato REC SSPD'],
      [''],
      ['Resolución SSPD No. 20211000852195 del 22-12-2021'],
      [''],
      ['=== COLUMNAS 1-9: INFORMACIÓN CATASTRAL ==='],
      ['Columna', 'Descripción'],
      ['1', 'Código DANE Departamento (2 caracteres)'],
      ['2', 'Código DANE Municipio (3 caracteres)'],
      ['3', 'Información Predial Utilizada (1 = NPN)'],
      ['4', 'Número Predial Nacional (30 caracteres)'],
      ['5', 'Dirección Catastral del Predio'],
      ['6', 'Tipo de Asentamiento (000=Cabecera, 001-998=Centros poblados, 999=Rural)'],
      ['7', 'Tipo de Estratificación (3=Urbana Tipo 3, 6=Rural, 8=Sin estratificar, 9=No residencial)'],
      ['8', 'Estrato Alcaldía (1-6=estratos, 8=Sin estrato, 9=No residencial)'],
      ['9', 'Estrato Atípico (vacío si no aplica)'],
      [''],
      ['=== COLUMNAS 10-24: SERVICIOS PÚBLICOS ==='],
      [''],
      ['-- ACUEDUCTO (Columnas 10-14) --'],
      ['10', 'Nombre de la Empresa (8=Ninguna si sin servicio)'],
      ['11', 'NIT (NO APLICA si sin servicio)'],
      ['12', 'Dígito de Verificación (NO APLICA si sin servicio)'],
      ['13', 'NUIS (NO APLICA si sin servicio)'],
      ['14', 'Estrato de facturación (99 si sin servicio)'],
      [''],
      ['-- ALCANTARILLADO (Columnas 15-19) --'],
      ['15', 'Nombre de la Empresa (8=Ninguna si sin servicio)'],
      ['16', 'NIT (NO APLICA si sin servicio)'],
      ['17', 'Dígito de Verificación (NO APLICA si sin servicio)'],
      ['18', 'NUIS (NO APLICA si sin servicio)'],
      ['19', 'Estrato de facturación (99 si sin servicio)'],
      [''],
      ['-- ASEO (Columnas 20-24) --'],
      ['20', 'Nombre de la Empresa (8=Ninguna si sin servicio)'],
      ['21', 'NIT (NO APLICA si sin servicio)'],
      ['22', 'Dígito de Verificación (NO APLICA si sin servicio)'],
      ['23', 'NUIS (NO APLICA si sin servicio)'],
      ['24', 'Estrato de facturación (99 si sin servicio)'],
      [''],
      ['=== CÓDIGOS DE ESTRATO DE SERVICIO ==='],
      [''],
      ['RESIDENCIAL CON ESTRATO:'],
      ['71-76', 'Alcaldía adoptó metodología y empresa la aplica (ej: estrato 2 → 72)'],
      ['81-86', 'Alcaldía adoptó metodología pero empresa NO la aplica'],
      ['91-96', 'Alcaldía NO adoptó metodología, empresa aplica propia'],
      [''],
      ['NO RESIDENCIAL (según DESTINO_ECONOMICO):'],
      ['11', 'Industrial (DESTINO_ECONOMICO = I)'],
      ['12', 'Comercial (DESTINO_ECONOMICO = C)'],
      ['13', 'Establecimiento de servicios (DESTINO_ECONOMICO = S, H)'],
      ['14', 'Oficial/Público (DESTINO_ECONOMICO = P, N)'],
      ['20', 'Otro no residencial'],
      [''],
      ['OTROS:'],
      ['04', 'Tarifa única (residencial sin estrato)'],
      ['99', 'Sin servicio (zona rural)'],
      [''],
      ['=== CLASIFICACIÓN POR DESTINO_ECONOMICO ==='],
      [''],
      ['Código R1', 'Descripción', 'Estrato Alcaldía', 'Estrato Servicio'],
      ['P, N', 'Oficial/Público', '9', '14'],
      ['C', 'Comercial', '9', '12'],
      ['I', 'Industrial', '9', '11'],
      ['S, H', 'Servicios', '9', '13'],
      ['D, A', 'Residencial', '1-6 o 8', '71-76, 81-86, 91-96 o 04'],
      ['Otros', 'No clasificado', '9', '20'],
      [''],
      ['=== NOTAS IMPORTANTES ==='],
      ['- La clasificación se basa en el campo DESTINO_ECONOMICO del archivo R1'],
      [''],
      ['-- ZONA URBANA --'],
      ['- Se asigna la empresa urbana con NIT y DV proporcionados'],
      ['- NUIS queda vacío para completar manualmente'],
      [''],
      ['-- ZONA RURAL CON VIVIENDA (AREA_CONSTRUIDA > 0) --'],
      ['- Se asigna acueducto veredal no constituido'],
      ['- Nombre: Nombre del acueducto veredal proporcionado'],
      ['- NIT: NO NUMERO, DV: NO NUMERO'],
      ['- NUIS: vacío para completar manualmente'],
      ['- Tipo de Estratificación: 6 (fincas y viviendas dispersas)'],
      [''],
      ['-- ZONA RURAL SIN VIVIENDA (AREA_CONSTRUIDA = 0) --'],
      ['- Sin servicio: Nombre=8, NIT=NO APLICA, DV=NO APLICA, NUIS=NO APLICA'],
      ['- Tipo de Estratificación: 8 (sin estratificar)'],
      ['- Estrato de servicio: 99'],
    ]

    const notesSheet = XLSX.utils.aoa_to_sheet(notesData)
    notesSheet['!cols'] = [{ wch: 15 }, { wch: 40 }, { wch: 20 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(workbook, notesSheet, 'Instrucciones')

    // Generar buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Devolver archivo directamente (compatible con Vercel)
    const timestamp = Date.now()
    const filename = `Plantilla_REC_${timestamp}.xlsx`

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Filename': filename,
        'X-Total-Records': outputData.length.toString(),
        'X-Matched-Records': matchedRecords.toString(),
        'X-Unmatched-Records': unmatchedRecords.toString(),
        'X-Urban-Records': urbanRecords.toString(),
        'X-Rural-Records': ruralRecords.toString(),
      },
    })

  } catch (error) {
    console.error('Error processing files:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al procesar los archivos' },
      { status: 500 }
    )
  }
}
