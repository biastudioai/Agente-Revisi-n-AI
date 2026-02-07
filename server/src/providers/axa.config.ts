import { Type } from "./schema-types";
import { ProviderConfig } from "./types";

export const AXA_CONFIG: ProviderConfig = {
  id: 'AXA',
  name: 'axa',
  displayName: 'AXA Seguros',

  theme: {
    primary: 'bg-red-600',
    secondary: 'text-red-600',
    border: 'border-red-200',
    light: 'bg-red-50',
    accent: 'red'
  },

  identificationRules: [
    'Texto "AXA Seguros, S.A. de C.V."',
    'Título "Informe Médico" con subtítulo "Gastos Médicos Mayores"',
    'Referencia "AI - 346 • NOVIEMBRE 2018"',
    'Dirección "Félix Cuevas 366, Piso 6, Col. Tlacoquemécatl"',
    'Formato de 5 páginas con secciones numeradas'
  ],

  extractionInstructions: `
⚠️ REGLA FUNDAMENTAL: NO INFERIR NUNCA
- Si un campo NO está visible en el documento → déjalo vacío ("" o null)
- NO asumas valores basados en otros campos
- NO completes información faltante automáticamente
- Extrae SOLO lo que esté explícitamente escrito
- Si hay duda sobre un valor → déjalo vacío

🚨 REGLA CRÍTICA UNIVERSAL PARA CASILLAS Y CHECKBOXES:

PARA CUALQUIER CAMPO QUE DEPENDA DE UNA CASILLA MARCADA:
- ✅ Solo extrae/marca como true SI VES una marca visual clara (X, ✓, relleno, sombreado)
- ❌ NO asumas valores basándote en el contexto del documento
- ❌ NO inferieras el valor porque "tiene sentido clínicamente"
- ❌ NO completes automáticamente basándote en otros campos
- 🔹 Si la casilla está VACÍA → el campo debe quedar false/""/null/[] según su tipo
- 🔹 Si hay DUDA sobre si está marcada → déjalo VACÍO

📋 JERARQUÍA DE DETECCIÓN - ORDEN DE PRIORIDAD:

🔲 PRIORIDAD 1 - CHECKBOXES/RECUADROS VISIBLES:

Si el documento muestra CLARAMENTE recuadros (☐, ☑, □, ■, [ ], [X]) junto a las opciones:
- Identifica cuál checkbox tiene marca visual dentro
- La opción marcada es la que está MÁS CERCA del checkbox marcado
- Este método es el MÁS CONFIABLE cuando los recuadros son visibles

📍 PRIORIDAD 2 - REGLAS VISUALES ALTERNATIVAS (SIN RECUADROS):

Solo aplica estas reglas cuando NO hay recuadros/checkboxes visibles:

1️⃣ MARCA A LA IZQUIERDA de la opción
2️⃣ MARCA EN ESPACIO INTERMEDIO entre dos opciones → pertenece a la opción de la DERECHA
3️⃣ MARCADO DIRECTO SOBRE/ENCIMA de la opción (texto rodeado, subrayado, tachado)

📅 FORMATO DE FECHAS:
- TODAS las fechas deben extraerse en formato DD/MM/AAAA
- Si el documento muestra casillas separadas para día, mes y año, concatena en DD/MM/AAAA
- Si una fecha está vacía → déjala como cadena vacía ""

📋 ESTRUCTURA DEL DOCUMENTO AXA (5 PÁGINAS):
Este formulario de AXA Seguros tiene 5 páginas con las siguientes secciones principales:
- Página 1: Datos del asegurado, motivo de atención, tipo de estancia, antecedentes médicos
- Página 2: Antecedentes gineco-obstétricos, perinatales, referido, diagnóstico
- Página 3: Tratamiento, otros tratamientos, tabla de medicamentos
- Página 4: Rehabilitación, enfermería, terapia especial, observaciones, datos del médico
- Página 5: Datos personales, transferencia de datos, autorizaciones y firmas

📋 CAMPOS DE CHECKBOX - INSTRUCCIONES DE EXTRACCIÓN:

Para TODOS los campos de tipo array que representan checkboxes, incluye SOLO las opciones que tengan marca visual clara (X, ✓, relleno). Si ninguna tiene marca → array vacío [].

SEXO (identificacion.sexo): Opciones: Masculino, Femenino
MOTIVO DE ATENCIÓN (motivo_atencion): Opciones: Enfermedad, Accidente, Maternidad, Segunda opinión médica
TIPO DE ESTANCIA (tipo_estancia): Opciones: Urgencia, Hospitalización, Corta estancia/ambulatoria, Consultorio
TIPO DE PADECIMIENTO (diagnostico.tipo_padecimiento): Opciones: Congénito, Adquirido, Agudo, Crónico
INCAPACIDAD (diagnostico.incapacidad): Opciones: Sí, No, Parcial, Total
ES CÁNCER (diagnostico.es_cancer): Opciones: Sí, No
SITIO DEL PROCEDIMIENTO (tratamiento.sitio_procedimiento): Opciones: Consultorio, Hospital, Gabinete, Otro
HISTOPATOLÓGICO (tratamiento.histopatologico): Opciones: Sí, No
COMPLICACIONES (tratamiento.complicaciones): Opciones: Sí, No
TRATAMIENTO FUTURO (tratamiento.tratamiento_futuro): Opciones: Sí, No
TURNO ENFERMERÍA (enfermeria.turno): Opciones: Matutino, Vespertino, Nocturno, 24 horas

🚫 ERRORES A EVITAR EN CHECKBOXES:
❌ Ver casillas vacías → inferir ["Enfermedad"] porque el diagnóstico es una enfermedad
❌ Ver "diabetes" en texto → marcar Enfermedad como seleccionado
❌ Asumir que una opción está marcada por contexto clínico

📋 ANTECEDENTES PATOLÓGICOS - EXTRACCIÓN CON CHECKBOX + FECHA:

Cada antecedente tiene un checkbox booleano y un campo de fecha:
cardiacos, diabetes_mellitus, cancer, convulsivos, hipertensivos, vih_sida, hepaticos, otros
- Booleano = true SOLO si el checkbox tiene marca visual
- Fecha (_fecha) = fecha escrita junto al checkbox, DD/MM/AAAA
- Si checkbox vacío → false Y fecha = ""

📋 TABLA DE MEDICAMENTOS (10 FILAS):

El formulario AXA incluye una tabla con 10 filas de medicamentos.
Cada fila tiene 4 columnas:
1. Nombre y presentación del medicamento (ej: Paracetamol 100 mg)
2. Cantidad (ej: 1 tableta)
3. Cada cuánto (ej: Cada 24 hrs)
4. Durante cuánto tiempo (ej: Por un mes)

Extrae CADA fila como un objeto separado en el array tabla_medicamentos.
- Si una fila está completamente vacía → NO la incluyas en el array
- Si una fila tiene datos parciales → inclúyela con los campos disponibles y vacíos para el resto
- El campo "numero" corresponde al número de fila (1-10)

📋 SECCIONES DE AUTORIZACIÓN (PÁGINA 5):

El documento AXA tiene DOS secciones de autorización separadas al final:

1. DATOS PERSONALES:
   - Checkbox de autorización de tratamiento de datos personales
   - Extrae como booleano (true si marcado, false si vacío)

2. TRANSFERENCIA DE DATOS A TERCEROS:
   - Primera autorización: "Sí acepto ☐ / No acepto ☐" + firma del asegurado
   - Segunda autorización (programas de póliza): "Sí acepto ☐ / No acepto ☐" + firma del asegurado
   - Cada autorización es independiente, extrae por separado
`,

  requiredFields: [
    'identificacion.nombres',
    'identificacion.edad',
    'diagnostico.padecimiento_actual',
    'diagnostico.diagnostico_texto',
    'medico_principal.nombre',
    'medico_principal.cedula_profesional'
  ],

  geminiSchema: {
    type: Type.OBJECT,
    properties: {
      extracted: {
        type: Type.OBJECT,
        properties: {
          provider: { type: Type.STRING, description: "AXA" },

          lugar_fecha: {
            type: Type.OBJECT,
            properties: {
              lugar: { type: Type.STRING },
              fecha: { type: Type.STRING, description: "DD/MM/AAAA" }
            }
          },

          identificacion: {
            type: Type.OBJECT,
            properties: {
              apellido_paterno: { type: Type.STRING },
              apellido_materno: { type: Type.STRING },
              nombres: { type: Type.STRING },
              edad: { type: Type.STRING },
              fecha_nacimiento: { type: Type.STRING, description: "DD/MM/AAAA" },
              sexo: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Masculino/Femenino segun checkbox marcado" },
              talla: { type: Type.STRING },
              peso: { type: Type.STRING },
              tension_arterial: { type: Type.STRING }
            }
          },

          motivo_atencion: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Opciones marcadas: Enfermedad, Accidente, Maternidad, Segunda opinion medica" },

          tipo_estancia: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Opciones marcadas: Urgencia, Hospitalizacion, Corta estancia/ambulatoria, Consultorio" },

          antecedentes_patologicos: {
            type: Type.OBJECT,
            description: "Solo true si checkbox tiene marca visual",
            properties: {
              cardiacos: { type: Type.BOOLEAN },
              cardiacos_fecha: { type: Type.STRING, description: "DD/MM/AAAA" },
              diabetes_mellitus: { type: Type.BOOLEAN },
              diabetes_mellitus_fecha: { type: Type.STRING, description: "DD/MM/AAAA" },
              cancer: { type: Type.BOOLEAN },
              cancer_fecha: { type: Type.STRING, description: "DD/MM/AAAA" },
              convulsivos: { type: Type.BOOLEAN },
              convulsivos_fecha: { type: Type.STRING, description: "DD/MM/AAAA" },
              hipertensivos: { type: Type.BOOLEAN },
              hipertensivos_fecha: { type: Type.STRING, description: "DD/MM/AAAA" },
              vih_sida: { type: Type.BOOLEAN },
              vih_sida_fecha: { type: Type.STRING, description: "DD/MM/AAAA" },
              hepaticos: { type: Type.BOOLEAN },
              hepaticos_fecha: { type: Type.STRING, description: "DD/MM/AAAA" },
              otros: { type: Type.BOOLEAN },
              otros_detalle: { type: Type.STRING }
            }
          },

          antecedentes_no_patologicos: {
            type: Type.OBJECT,
            description: "Solo true si checkbox tiene marca visual",
            properties: {
              fuma: { type: Type.BOOLEAN },
              fuma_detalle: { type: Type.STRING },
              alcohol: { type: Type.BOOLEAN },
              alcohol_detalle: { type: Type.STRING },
              drogas: { type: Type.BOOLEAN },
              drogas_detalle: { type: Type.STRING },
              otros: { type: Type.BOOLEAN },
              otros_detalle: { type: Type.STRING }
            }
          },

          antecedentes_gineco_obstetricos: {
            type: Type.OBJECT,
            properties: {
              gestacion: { type: Type.STRING },
              partos: { type: Type.STRING },
              abortos: { type: Type.STRING },
              cesareas: { type: Type.STRING },
              fecha_ultima_menstruacion: { type: Type.STRING, description: "DD/MM/AAAA" },
              tratamiento_infertilidad: { type: Type.STRING },
              tiempo_evolucion: { type: Type.STRING }
            }
          },

          antecedentes_perinatales: {
            type: Type.OBJECT,
            properties: {
              descripcion: { type: Type.STRING },
              tiempo_evolucion: { type: Type.STRING }
            }
          },

          referido_otro_medico: {
            type: Type.OBJECT,
            properties: {
              referido: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Si/No segun checkbox" },
              cual: { type: Type.STRING }
            }
          },

          diagnostico: {
            type: Type.OBJECT,
            properties: {
              padecimiento_actual: { type: Type.STRING },
              fecha_padecimiento: { type: Type.STRING, description: "DD/MM/AAAA" },
              fecha_diagnostico: { type: Type.STRING, description: "DD/MM/AAAA" },
              tipo_padecimiento: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Opciones marcadas: Congenito, Adquirido, Agudo, Cronico" },
              tiempo_evolucion: { type: Type.STRING },
              causa_etiologia: { type: Type.STRING },
              relacion_otro_padecimiento: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Si/No segun checkbox" },
              relacion_cual: { type: Type.STRING },
              incapacidad: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Opciones marcadas: Si, No, Parcial, Total" },
              incapacidad_desde: { type: Type.STRING, description: "DD/MM/AAAA" },
              incapacidad_hasta: { type: Type.STRING, description: "DD/MM/AAAA" },
              diagnostico_texto: { type: Type.STRING },
              codigo_icd: { type: Type.STRING, description: "CIE-10" },
              es_cancer: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Si/No segun checkbox" },
              escala_tnm: { type: Type.STRING },
              exploracion_fisica: { type: Type.STRING },
              estudios_laboratorio: { type: Type.STRING }
            }
          },

          tratamiento: {
            type: Type.OBJECT,
            properties: {
              tratamiento_propuesto: { type: Type.STRING },
              fecha_cirugia: { type: Type.STRING, description: "DD/MM/AAAA" },
              fecha_hospitalizacion: { type: Type.STRING, description: "DD/MM/AAAA" },
              fecha_alta: { type: Type.STRING, description: "DD/MM/AAAA" },
              dias_atencion: { type: Type.STRING },
              sitio_procedimiento: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Opciones marcadas: Consultorio, Hospital, Gabinete, Otro" },
              sitio_especifique: { type: Type.STRING },
              nombre_hospital: { type: Type.STRING },
              histopatologico: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Si/No segun checkbox" },
              histopatologico_resultado: { type: Type.STRING },
              complicaciones: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Si/No segun checkbox" },
              complicaciones_descripcion: { type: Type.STRING },
              tratamiento_futuro: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Si/No segun checkbox" },
              tratamiento_futuro_descripcion: { type: Type.STRING }
            }
          },

          otros_tratamientos: {
            type: Type.OBJECT,
            properties: {
              especificar_tratamiento: { type: Type.STRING }
            }
          },

          tabla_medicamentos: {
            type: Type.ARRAY,
            description: "Hasta 10 medicamentos, solo filas con datos",
            items: {
              type: Type.OBJECT,
              properties: {
                numero: { type: Type.STRING },
                nombre_presentacion: { type: Type.STRING },
                cantidad: { type: Type.STRING },
                cada_cuanto: { type: Type.STRING },
                durante_cuanto_tiempo: { type: Type.STRING }
              }
            }
          },

          rehabilitacion_fisica: {
            type: Type.OBJECT,
            properties: {
              dias: { type: Type.STRING },
              numero_sesiones: { type: Type.STRING }
            }
          },

          enfermeria: {
            type: Type.OBJECT,
            properties: {
              dias_requeridos: { type: Type.STRING },
              turno: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Opciones marcadas: Matutino, Vespertino, Nocturno, 24 horas" },
              nombre_medicamentos: { type: Type.STRING }
            }
          },

          terapia_especial: {
            type: Type.OBJECT,
            properties: {
              justificacion_terapia: { type: Type.STRING },
              materiales_cirugia: { type: Type.STRING },
              tipo_terapia: { type: Type.STRING },
              cedula_especialidad: { type: Type.STRING },
              detalle_evolucion: { type: Type.STRING }
            }
          },

          observaciones: {
            type: Type.OBJECT,
            properties: {
              observaciones: { type: Type.STRING }
            }
          },

          medico_principal: {
            type: Type.OBJECT,
            properties: {
              tipo_participacion: { type: Type.STRING },
              nombre: { type: Type.STRING },
              especialidad: { type: Type.STRING },
              cedula_profesional: { type: Type.STRING },
              cedula_especialidad: { type: Type.STRING },
              rfc: { type: Type.STRING },
              domicilio: { type: Type.STRING },
              telefono: { type: Type.STRING }
            }
          },

          anestesiologo: {
            type: Type.OBJECT,
            properties: {
              tipo_participacion: { type: Type.STRING },
              nombre: { type: Type.STRING },
              especialidad: { type: Type.STRING },
              cedula_profesional: { type: Type.STRING },
              cedula_especialidad: { type: Type.STRING },
              rfc: { type: Type.STRING },
              domicilio: { type: Type.STRING },
              telefono: { type: Type.STRING }
            }
          },

          ayudantes: {
            type: Type.OBJECT,
            properties: {
              ayudante_1_tipo: { type: Type.STRING },
              ayudante_1_nombre: { type: Type.STRING },
              ayudante_2_tipo: { type: Type.STRING },
              ayudante_2_nombre: { type: Type.STRING },
              otros_medicos: { type: Type.STRING }
            }
          },

          firma: {
            type: Type.OBJECT,
            properties: {
              firma_medico: { type: Type.STRING, description: "Detectada o No detectada" },
              lugar_fecha: { type: Type.STRING }
            }
          },

          datos_personales: {
            type: Type.OBJECT,
            properties: {
              autorizacion_datos: { type: Type.BOOLEAN }
            }
          },

          transferencia_datos: {
            type: Type.OBJECT,
            properties: {
              autorizacion_transferencia: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Si acepto/No acepto segun checkbox" },
              firma_asegurado_1: { type: Type.STRING, description: "Detectada o No detectada" },
              autorizacion_programas: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Si acepto/No acepto segun checkbox" },
              firma_asegurado_2: { type: Type.STRING, description: "Detectada o No detectada" }
            }
          },

          metadata: {
            type: Type.OBJECT,
            properties: {
              existe_coherencia_clinica: { type: Type.BOOLEAN },
              observacion_coherencia: { type: Type.STRING },
              tachaduras_detectadas: { type: Type.BOOLEAN },
              firma_coincide_con_tratante: { type: Type.BOOLEAN }
            }
          }
        },
        required: ['provider']
      }
    },
    required: ['extracted']
  }
};
