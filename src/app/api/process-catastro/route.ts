import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

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
    // Ajustar índices a base 0
    const value = line.substring(field.start - 1, field.end).trim()
    result[field.name] = value
  }
  return result
}

// Función para determinar el tipo de asentamiento según la zona
function getTipoAsentamiento(zonaFisica: string): string {
  const zona = zonaFisica.padStart(3, '0')
  if (zona === '000') return '000' // Cabecera municipal
  if (zona === '003') return '000' // Urbano
  if (zona.startsWith('0') && zona !== '000') return zona // Centros poblados
  return '999' // Rural disperso
}

// Función para determinar el tipo de estratificación
function getTipoEstratificacion(zonaFisica: string, estrato: string): string {
  const zona = zonaFisica.padStart(3, '0')
  
  // Si es zona rural (003 o rural disperso)
  if (zona === '003' || zona === '000' && estrato === '0') {
    return '6' // Rural
  }
  
  // Si tiene estrato, es urbano
  if (estrato && estrato !== '0' && estrato !== '') {
    return '1' // Urbano tipo 1 (por defecto)
  }
  
  // Sin estratificación
  return '8'
}

// Definición de las columnas del formato SSPD con notas explicatorias
const OUTPUT_COLUMNS = [
  {
    header: 'Código DANE Departamento',
    note: 'Código de 2 caracteres asignado por el DANE al departamento. Se extrae del archivo R1.',
    width: 25
  },
  {
    header: 'Código DANE Municipio',
    note: 'Código de 3 caracteres asignado por el DANE al municipio. Se extrae del archivo R1.',
    width: 25
  },
  {
    header: 'Información Predial Utilizada',
    note: 'Se diligencia con "1" indicando que se usa el Número Predial Nacional según Resolución IGAC 070 de 2011.',
    width: 30
  },
  {
    header: 'Número Predial Nacional',
    note: 'Código único de 30 caracteres que identifica cada predio en Colombia. Según Resolución IGAC 070 de 2011, INCLUYE los códigos de departamento y municipio. Estructura: Dept (2) + Mpio (3) + Zona (2) + Sector (2) + Comuna (2) + Barrio (2) + Manzana/Vereda (4) + Terreno (4) + Condición (1) + Edificio (2) + Piso (2) + Unidad (4).',
    width: 35
  },
  {
    header: 'Dirección Catastral del Predio',
    note: 'Nomenclatura alfanumérica que permite individualizar cada predio. Máximo 60 caracteres. Se extrae del archivo R1.',
    width: 40
  },
  {
    header: 'Tipo de Asentamiento',
    note: '000 = Cabecera municipal/distrital, 001-998 = Centros poblados, 999 = Rural dispersa. Se deriva de la zona física del archivo R2.',
    width: 25
  },
  {
    header: 'Tipo de Estratificación',
    note: '0=Especial(Bogotá), 1=Urbana Tipo 1, 2=Tipo 2, 3=Tipo 3, 4=Revisada, 5=Centro poblado especial, 6=Rural, 8=Sin estratificar, 9=No residencial.',
    width: 25
  },
  {
    header: 'Estrato Alcaldía',
    note: 'Estrato asignado por la alcaldía (1-6). Para no residenciales: 9. Se extrae del archivo R2.',
    width: 20
  },
  {
    header: 'Estrato Atípico',
    note: 'Código para casos especiales. Dejar vacío si no aplica. Columna 10-24 deben ser diligenciadas por la empresa de servicios públicos.',
    width: 20
  },
]

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const r1File = formData.get('r1File') as File
    const r2File = formData.get('r2File') as File

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
      if (predialKey) {
        // Si hay múltiples registros R2 para el mismo predio, tomar el primero
        if (!r2Map.has(predialKey)) {
          r2Map.set(predialKey, parsed)
        }
      }
    }

    // Procesar registros R1 y combinar con R2
    const outputData: Record<string, string>[] = []
    let matchedRecords = 0
    let unmatchedRecords = 0

    for (const line of r1Lines) {
      const r1Data = parseFixedWidthLine(line, R1_FIELDS)
      const predialKey = r1Data.NUMERO_DEL_PREDIO
      const r2Data = r2Map.get(predialKey)

      if (r2Data) {
        matchedRecords++
      } else {
        unmatchedRecords++
      }

      // Obtener valores de R2 o valores por defecto
      const zonaFisica = r2Data?.ZONA_FISICA_1 || ''
      const estrato = r2Data?.ESTRATO_1 || ''

      // Construir el Número Predial Nacional completo (30 caracteres)
      // Según PDF: "incluye los códigos de departamento y municipio"
      // Estructura: Dept(2) + Mpio(3) + NumPredial(25) = 30 caracteres
      const numeroPredialNacional = r1Data.DEPARTAMENTO + r1Data.MUNICIPIO + r1Data.NUMERO_DEL_PREDIO

      // Construir registro de salida
      const outputRow: Record<string, string> = {
        'Código DANE Departamento': r1Data.DEPARTAMENTO,
        'Código DANE Municipio': r1Data.MUNICIPIO,
        'Información Predial Utilizada': '1',
        'Número Predial Nacional': numeroPredialNacional,
        'Dirección Catastral del Predio': (r1Data.DIRECCION || '').substring(0, 60),
        'Tipo de Asentamiento': getTipoAsentamiento(zonaFisica),
        'Tipo de Estratificación': getTipoEstratificacion(zonaFisica, estrato),
        'Estrato Alcaldía': estrato || '9',
        'Estrato Atípico': '',
      }

      outputData.push(outputRow)
    }

    // Crear workbook de Excel
    const workbook = XLSX.utils.book_new()

    // Crear hoja de datos
    const worksheetData = [
      OUTPUT_COLUMNS.map(col => col.header),
      ...outputData.map(row => OUTPUT_COLUMNS.map(col => row[col.header]))
    ]

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

    // Configurar anchos de columna
    worksheet['!cols'] = OUTPUT_COLUMNS.map(col => ({ wch: col.width }))

    // Agregar hoja al workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla REC')

    // Crear hoja de notas explicatorias
    const notesData = [
      ['NOTAS EXPLICATORIAS PARA CADA COLUMNA'],
      [''],
      ['Esta plantilla sigue el formato establecido en la Resolución SSPD No. 20211000852195 del 22-12-2021'],
      [''],
      ['Columna', 'Descripción', 'Nota'],
      ...OUTPUT_COLUMNS.map(col => [col.header, col.note, '']),
      [''],
      ['INFORMACIÓN IMPORTANTE:'],
      ['- Las columnas 10 a 24 deben ser diligenciadas por la empresa de servicios públicos correspondiente'],
      ['- Las columnas 1-5 son suministradas por el IGAC, gestores catastrales y catastros descentralizados'],
      ['- El Número Predial Nacional incluye los códigos de departamento y municipio'],
      [''],
      ['CÓDIGOS DE TIPO DE ASENTAMIENTO:'],
      ['000 = Cabecera municipal o distrital'],
      ['001-998 = Centros poblados (código del centro poblado)'],
      ['999 = Zona rural dispersa (fincas y viviendas dispersas)'],
      [''],
      ['CÓDIGOS DE TIPO DE ESTRATIFICACIÓN:'],
      ['0 = Cabecera del Distrito Capital (Bogotá) - Metodología especial'],
      ['1 = Cabeceras distritales y municipales - Metodología urbana Tipo 1'],
      ['2 = Cabeceras municipales y centros poblados - Metodología Tipo 2'],
      ['3 = Cabeceras municipales y centros poblados - Metodología Tipo 3'],
      ['4 = Municipios con revisión general de estratificación'],
      ['5 = Centros poblados especiales'],
      ['6 = Áreas rurales (fincas y viviendas dispersas)'],
      ['8 = Predios sin estratificación'],
      ['9 = Predios no residenciales'],
      [''],
      ['CÓDIGOS DE ESTRATO ALCALDÍA:'],
      ['1-6 = Estratos socioeconómicos'],
      ['9 = No residencial o sin estrato'],
      [''],
      ['COLUMNAS ADICIONALES (A DILIGENCIAR POR LA EMPRESA DE SERVICIOS PÚBLICOS):'],
      ['10. Acueducto - Nombre de la empresa'],
      ['11. Acueducto - NIT'],
      ['12. Acueducto - DV'],
      ['13. Acueducto - NUIS'],
      ['14. Acueducto - Estrato'],
      ['15. Alcantarillado - Nombre de la empresa'],
      ['16. Alcantarillado - NIT'],
      ['17. Alcantarillado - DV'],
      ['18. Alcantarillado - NUIS'],
      ['19. Alcantarillado - Estrato'],
      ['20. Aseo - Nombre de la empresa'],
      ['21. Aseo - NIT'],
      ['22. Aseo - DV'],
      ['23. Aseo - NUIS'],
      ['24. Aseo - Estrato'],
    ]

    const notesSheet = XLSX.utils.aoa_to_sheet(notesData)
    notesSheet['!cols'] = [{ wch: 35 }, { wch: 80 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(workbook, notesSheet, 'Instrucciones')

    // Generar buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Crear directorio de salida si no existe
    const outputDir = path.join(process.cwd(), 'output')
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true })
    }

    // Guardar archivo
    const timestamp = Date.now()
    const filename = `Plantilla_REC_${timestamp}.xlsx`
    const filepath = path.join(outputDir, filename)
    await writeFile(filepath, excelBuffer)

    return NextResponse.json({
      success: true,
      downloadUrl: `/api/download?file=${filename}`,
      filename,
      totalRecords: outputData.length,
      matchedRecords,
      unmatchedRecords,
    })

  } catch (error) {
    console.error('Error processing files:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al procesar los archivos' },
      { status: 500 }
    )
  }
}
