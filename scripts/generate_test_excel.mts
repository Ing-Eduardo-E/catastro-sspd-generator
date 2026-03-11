import * as XLSX from 'xlsx';
import * as fs from 'fs';

// Definición de campos R1 (posiciones base 1)
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
];

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
  { name: 'ESTRATO_1', start: 178, end: 178 },
  { name: 'VIGENCIA', start: 308, end: 315 },
];

function parseLine(line, fields) {
  const result = {};
  for (const field of fields) {
    const value = line.substring(field.start - 1, field.end).trim();
    result[field.name] = value;
  }
  return result;
}

function getTipoAsentamiento(zonaFisica) {
  const zona = zonaFisica.padStart(3, '0');
  if (zona === '000') return '000';
  if (zona === '003') return '000';
  if (zona.startsWith('0') && zona !== '000') return zona;
  return '999';
}

function getTipoEstratificacion(zonaFisica, estrato) {
  const zona = zonaFisica.padStart(3, '0');
  if (zona === '003' || (zona === '000' && estrato === '0')) return '6';
  if (estrato && estrato !== '0') return '1';
  return '8';
}

// Leer archivos
const r1Text = fs.readFileSync('upload/52378-La_Cruz_R1.TXT', 'latin1');
const r2Text = fs.readFileSync('upload/52378-La_Cruz_R2.TXT', 'latin1');

const r1Lines = r1Text.split('\n').filter(l => l.trim());
const r2Lines = r2Text.split('\n').filter(l => l.trim());

// Crear mapa R2
const r2Map = new Map();
for (const line of r2Lines) {
  const parsed = parseLine(line, R2_FIELDS);
  const key = parsed.NUMERO_DEL_PREDIO;
  if (key && !r2Map.has(key)) {
    r2Map.set(key, parsed);
  }
}

// Procesar
const output = [];
let matched = 0, unmatched = 0;

for (const line of r1Lines) {
  const r1 = parseLine(line, R1_FIELDS);
  const key = r1.NUMERO_DEL_PREDIO;
  const r2 = r2Map.get(key);

  if (r2) matched++;
  else unmatched++;

  const zonaFisica = r2?.ZONA_FISICA_1 || '';
  const estrato = r2?.ESTRATO_1 || '';

  // Construir el Número Predial Nacional completo (30 caracteres)
  // Según PDF: "incluye los códigos de departamento y municipio"
  // Estructura: Dept(2) + Mpio(3) + NumPredial(25) = 30 caracteres
  const numeroPredialNacional = r1.DEPARTAMENTO + r1.MUNICIPIO + r1.NUMERO_DEL_PREDIO;

  output.push({
    'Código DANE Departamento': r1.DEPARTAMENTO,
    'Código DANE Municipio': r1.MUNICIPIO,
    'Información Predial Utilizada': '1',
    'Número Predial Nacional': numeroPredialNacional,
    'Dirección Catastral del Predio': (r1.DIRECCION || '').substring(0, 60),
    'Tipo de Asentamiento': getTipoAsentamiento(zonaFisica),
    'Tipo de Estratificación': getTipoEstratificacion(zonaFisica, estrato),
    'Estrato Alcaldía': estrato || '9',
    'Estrato Atípico': '',
  });
}

// Crear Excel
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(output);

// Configurar anchos
ws['!cols'] = [
  { wch: 25 }, { wch: 25 }, { wch: 30 }, { wch: 30 }, { wch: 40 },
  { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 20 }
];

XLSX.utils.book_append_sheet(wb, ws, 'Plantilla REC');

// Agregar hoja de instrucciones
const instructions = [
  ['NOTAS EXPLICATORIAS PARA CADA COLUMNA'],
  [''],
  ['Esta plantilla sigue el formato establecido en la Resolución SSPD No. 20211000852195 del 22-12-2021'],
  [''],
  ['Columna', 'Descripción'],
  ['Código DANE Departamento', 'Código de 2 caracteres asignado por el DANE al departamento.'],
  ['Código DANE Municipio', 'Código de 3 caracteres asignado por el DANE al municipio.'],
  ['Información Predial Utilizada', '1 = Número Predial Nacional según Resolución IGAC 070 de 2011.'],
  ['Número Predial Nacional', 'Código único de 30 caracteres que identifica cada predio. INCLUYE códigos de Dept(2)+Mpio(3)+NumPredial(25) según Resolución IGAC 070 de 2011.'],
  ['Dirección Catastral del Predio', 'Nomenclatura alfanumérica. Máximo 60 caracteres.'],
  ['Tipo de Asentamiento', '000=Cabecera, 001-998=Centros poblados, 999=Rural dispersa.'],
  ['Tipo de Estratificación', '0=Especial, 1-3=Urbano, 4=Revisada, 5=Centro especial, 6=Rural, 8=Sin estrato, 9=No residencial.'],
  ['Estrato Alcaldía', 'Estrato asignado por la alcaldía (1-6). 9=No residencial.'],
  ['Estrato Atípico', 'Código para casos especiales.'],
  [''],
  ['INFORMACIÓN IMPORTANTE:'],
  ['- Las columnas 10 a 24 deben ser diligenciadas por la empresa de servicios públicos'],
  ['- Las columnas 1-5 son suministradas por el IGAC, gestores catastrales y catastros descentralizados'],
];

const wsInst = XLSX.utils.aoa_to_sheet(instructions);
wsInst['!cols'] = [{ wch: 35 }, { wch: 80 }];
XLSX.utils.book_append_sheet(wb, wsInst, 'Instrucciones');

// Guardar
XLSX.writeFile(wb, 'output/Plantilla_REC_Prueba.xlsx');

console.log('Archivo generado exitosamente!');
console.log('Total registros:', output.length);
console.log('Coincidentes:', matched);
console.log('Sin coincidencia:', unmatched);
