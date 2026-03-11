import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const filename = searchParams.get('file')

    if (!filename) {
      return NextResponse.json(
        { error: 'Nombre de archivo no proporcionado' },
        { status: 400 }
      )
    }

    // Validar que el archivo no contenga caracteres peligrosos
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json(
        { error: 'Nombre de archivo inválido' },
        { status: 400 }
      )
    }

    const filepath = path.join(process.cwd(), 'output', filename)

    if (!existsSync(filepath)) {
      return NextResponse.json(
        { error: 'Archivo no encontrado' },
        { status: 404 }
      )
    }

    const fileBuffer = await readFile(filepath)

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Plantilla_REC_SSPD.xlsx"`,
      },
    })

  } catch (error) {
    console.error('Error downloading file:', error)
    return NextResponse.json(
      { error: 'Error al descargar el archivo' },
      { status: 500 }
    )
  }
}
