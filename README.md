# Generador de Plantilla REC - SSPD

Aplicación web para proces archivos catastrales Rurales R formato de 24-columnas Excel según la Resolucion SSPD No. 20211000852195.

## Características

- Procesa archivos Rurales Rurales y urbanos ( genera plantilla REC para formato de la Resolución
- Clasificación automática según DESTINO_ECONOMICO y AREA de construcción
- Interfaz amigable para cualquier tamaño de archivo

## Tecnolog Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Processing**: Server-side processing con API Routes

## Uso Local

1. Sube el proyecto y ejecút:

\`\`\`bash
npm run dev
npm run build

## Funcionalidad

- Cargar archivos R1 y R2
- Configurar datos de la empresa
- Procesar y generar Excel automáticamente
- Descargar el archivo resultante directamente

## Generación

Ejecutar `npm run build` para commite y push a GitHub:

## Notas

- Asegúrate de archivo `output/` no se incluye en el control de versiones.
- La API `/api/download` fue no se usa porque Vercel tiene un sistema de archivos efímero.