import { Type } from "@google/genai";
import { ProviderConfig } from "./types";

export const NYLIFE_CONFIG: ProviderConfig = {
  id: 'NYLIFE',
  name: 'nylife',
  displayName: 'Seguros Monterrey New York Life',
  
  theme: {
    primary: 'bg-emerald-600',
    secondary: 'text-emerald-600',
    border: 'border-emerald-200',
    light: 'bg-emerald-50',
    accent: 'emerald'
  },

  identificationRules: [
    'Texto "Seguros Monterrey New York Life, S.A. de C.V."',
    'Título "Formato de Informe Médico"',
    'Secciones como "Datos del Asegurado", "Historia clínica", "Antecedentes personales patológicos"',
    'Campos específicos: "Nº de proveedor", "Cédula de especialidad/Certificación"',
    'Número de registro CGEN-S0038-0020-2019'
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

✅ Ejemplos con recuadros visibles:
   - "☑ Masculino    ☐ Femenino" → Masculino está seleccionado
   - "[X] Accidente  [ ] Enfermedad  [ ] Embarazo" → Accidente está seleccionado
   - "□ Congénito    ■ Adquirido" → Adquirido está seleccionado (■ relleno)

⚠️ EJEMPLOS VISUALES DE LO QUE NO DEBES HACER:

🚫 TIPO DE EVENTO - Ejemplos de inferencias PROHIBIDAS:
❌ "El diagnóstico menciona diabetes" → tipo_evento = "Enfermedad" 
❌ "Hay trauma en el texto" → tipo_evento = "Accidente"
❌ "Menciona embarazo en antecedentes" → tipo_evento = "Embarazo"
❌ "Es un informe quirúrgico" → tipo_evento = "Enfermedad"

⚠️ REGLA VISUAL ESTRICTA PARA "TIPO DE EVENTO":

📋 SI VES ESTO (todas vacías):
   ☐ Accidente    ☐ Enfermedad    ☐ Embarazo
   ✅ ENTONCES: tipo_evento = "" (string vacío)

📋 SI VES ESTO:
   ☑ Accidente    ☐ Enfermedad    ☐ Embarazo
   ✅ ENTONCES: tipo_evento = "Accidente"

🚫 NO IMPORTA QUÉ DIGA EL DIAGNÓSTICO O EL CONTEXTO CLÍNICO.
🚫 SI NO VES UNA MARCA VISUAL CLARA (X, ✓, relleno), DEJA EL CAMPO VACÍO.

⚠️ TIPO DE PADECIMIENTO - PERMITE MÚLTIPLES VALORES

Este campo acepta múltiples casillas marcadas:
- Opciones: Congénito, Agudo, Adquirido, Crónico

📋 EJEMPLO VISUAL:
SI VES ESTO en el documento:
   ☑ Congénito    ☐ Adquirido
   ☑ Agudo        ☐ Crónico

✅ ENTONCES extrae: ["Congénito", "Agudo"]

📋 SI NINGUNA ESTÁ MARCADA:
✅ ENTONCES extrae: [] (array vacío)

RECUERDA: tipo_padecimiento es un ARRAY de strings, NO un string separado por comas.

🔴🔴🔴 REGLAS CRÍTICAS PARA EXTRACCIÓN DE FECHAS 🔴🔴🔴

⚠️ PROBLEMA COMÚN DE OCR: Las diagonales "/" pueden confundirse con el número "1"
⚠️ DEBES identificar correctamente los SEPARADORES de fecha vs los DÍGITOS

📋 FORMATO DE SALIDA OBLIGATORIO:
- TODAS las fechas deben normalizarse a formato DD/MM/AAAA
- Si el día tiene 1 dígito → agregar 0 adelante (ej: 5 → 05)
- Si el mes tiene 1 dígito → agregar 0 adelante (ej: 3 → 03)
- Si el año tiene 2 dígitos → convertir a 4 dígitos (ej: 25 → 2025, 99 → 1999)

📋 ESTRUCTURA DEL FORMULARIO NY LIFE PARA FECHAS:
El formulario NY Life tiene campos de fecha con estructura:
   ┌─────────────────────────────────┐
   │  Día    Mes       Año           │
   │  ____ / ____ / ________         │
   └─────────────────────────────────┘

Las "/" están pre-impresas. Los números se escriben en los espacios.

🔴 VALIDACIÓN OBLIGATORIA:
- El día NUNCA puede ser mayor a 31
- El mes NUNCA puede ser mayor a 12
- Si extraes un mes > 12, probablemente confundiste una "/" con "1"

INSTRUCCIONES DE EXTRACCIÓN PARA NY LIFE MONTERREY:

DATOS DEL ASEGURADO (persona que recibe la atención médica):
- apellido_paterno: Apellido paterno del asegurado
- apellido_materno: Apellido materno del asegurado
- nombres: Nombre(s) del asegurado
- sexo: M (Masculino) o H (Hombre) según casilla marcada - extraer "M" o "F"
- edad: Edad del asegurado
- tipo_evento: Accidente, Enfermedad o Embarazo (cuál casilla está marcada)

ANTECEDENTES PERSONALES PATOLÓGICOS:
- cardiacos: Antecedentes cardíacos
- hipertensivos: Antecedentes hipertensivos
- diabetes_mellitus: Antecedentes de diabetes mellitus
- vih_sida: Antecedentes de VIH/SIDA
- cancer: Antecedentes de cáncer
- hepaticos: Antecedentes hepáticos
- convulsivos: Antecedentes convulsivos
- cirugias: Cirugías previas
- otros_patologicos: Otros antecedentes patológicos

ANTECEDENTES PERSONALES NO PATOLÓGICOS:
- fuma: ¿Fuma? (cantidad)
- alcohol: ¿Consume bebidas alcohólicas? (tipo y cantidad)
- drogas: ¿Consume o ha consumido drogas? (tipo y cantidad)
- perdida_peso: ¿Pérdida no intencional de peso? (cantidad)
- perinatales: Antecedentes perinatales (en caso necesario)
- gineco_obstetricos: Antecedentes gineco-obstétricos (cuando aplique)
- otros_no_patologicos: Otros antecedentes no patológicos

PADECIMIENTO ACTUAL:
- fecha_primeros_sintomas: Fecha de primeros síntomas del padecimiento (DD/MM/AAAA)
- fecha_primera_consulta: Fecha de la primera consulta por este padecimiento (DD/MM/AAAA)
- fecha_diagnostico: Fecha de diagnóstico de este padecimiento (DD/MM/AAAA)
- descripcion_evolucion: Especificación de detalles de la evolución y estado actual del padecimiento

DIAGNÓSTICO:
- diagnostico_1: Diagnóstico principal (1)
- diagnostico_2: Diagnóstico secundario (2) - si existe
- diagnostico_3: Diagnóstico terciario (3) - si existe
- tipo_padecimiento: Array de valores marcados: Congénito, Agudo, Adquirido, Crónico
- tiempo_evolucion: ¿Cuánto tiempo? de evolución
- relacionado_con_otro: ¿Tiene relación con otro padecimiento? (Sí/No)
- padecimiento_relacionado: Si sí, ¿cuál?
- causo_discapacidad: ¿El padecimiento ocasionó discapacidad? (Sí/No)
- tipo_discapacidad: Parcial o Total
- discapacidad_desde: Desde cuándo
- discapacidad_hasta: Hasta cuándo
- continuara_tratamiento: ¿Continuará recibiendo tratamiento en el futuro? (Sí/No)
- tratamiento_futuro_detalle: Especificación del tratamiento futuro

EXPLORACIÓN FÍSICA:
- exploracion_resultados: Exploración física y resultados de estudios relevantes realizados
- talla: Talla del paciente
- peso: Peso del paciente

TRATAMIENTO:
- es_quirurgico: ¿Es tratamiento quirúrgico? (Sí/No basado en checkbox)
- procedimiento_quirurgico: Especificación del procedimiento quirúrgico
- es_medico: ¿Es tratamiento médico? (Sí/No basado en checkbox)
- tratamiento_medico: Descripción del tratamiento médico, dosificación y fecha de inicio
- es_programado: ¿Es programación de tratamiento? (checkbox)
- es_realizado: ¿Es descripción de tratamiento ya realizado? (checkbox)
- descripcion_tratamiento: Descripción completa del tratamiento
- hubo_complicaciones: ¿Hubo complicaciones? (Sí/No)
- complicaciones_detalle: Especificación de complicaciones

DATOS DE HOSPITALIZACIÓN:
- nombre_hospital: Nombre del hospital
- ciudad: Ciudad
- fecha_ingreso: Fecha de ingreso (DD/MM/AAAA)
- fecha_egreso: Fecha de egreso (DD/MM/AAAA)
- tipo_estancia: Urgencia, Hospitalización, o Corta estancia / Ambulatoria (cuál está marcada)

DATOS DEL MÉDICO TRATANTE:
- medico_apellido_paterno: Apellido paterno del médico
- medico_apellido_materno: Apellido materno del médico
- medico_nombres: Nombre(s) del médico
- numero_proveedor: Número de proveedor (específico de NY Life)
- rfc: RFC del médico
- especialidad: Especialidad médica
- cedula_profesional: Cédula profesional
- cedula_especialidad: Cédula de especialidad/Certificación
- correo_electronico: Correo electrónico
- telefono_consultorio: Teléfono del consultorio (incluir LADA)
- telefono_movil: Teléfono móvil

EQUIPO QUIRÚRGICO (si aplica):
Para Anestesiólogo, Primer Ayudante, Segundo Ayudante, Otros:
- nombre: Nombre del especialista
- especialidad: Especialidad
- presupuesto_honorarios: Presupuesto de honorarios

CONVENIO Y TABULADOR:
- pertenece_convenio: ¿Pertenece a los prestadores de servicios médicos en convenio con NY Life? (Sí/No)
- acepta_tabulador: ¿Acepta el tabulador para el pago de honorarios? (Sí/No)

FIRMA:
- lugar: Lugar de la firma
- fecha_firma: Fecha de la firma (DD/MM/AAAA)
- nombre_firma: Nombre del médico que firma
- firma_autografa_detectada: true si se ve una firma manuscrita real, false si solo hay nombre impreso
`,

  requiredFields: [
    'identificacion.nombres',
    'identificacion.edad',
    'diagnostico.diagnostico_1',
    'medico_tratante.nombres',
    'medico_tratante.cedula_profesional'
  ],

  geminiSchema: {
    type: Type.OBJECT,
    properties: {
      extracted: {
        type: Type.OBJECT,
        properties: {
          provider: { type: Type.STRING, description: "NYLIFE" },

          identificacion: {
            type: Type.OBJECT,
            properties: {
              apellido_paterno: { type: Type.STRING, description: "Apellido paterno del asegurado" },
              apellido_materno: { type: Type.STRING, description: "Apellido materno del asegurado" },
              nombres: { type: Type.STRING, description: "Nombre(s) del asegurado" },
              sexo: { type: Type.STRING, description: "M o F según casilla marcada (M=Mujer, H=Hombre)" },
              edad: { type: Type.STRING, description: "Edad del asegurado" },
              tipo_evento: { 
                type: Type.STRING, 
                description: "SOLO extrae 'Accidente', 'Enfermedad' o 'Embarazo' SI VES una marca visual clara. Si TODAS las casillas están vacías, devuelve string vacío ''." 
              }
            }
          },

          antecedentes_patologicos: {
            type: Type.OBJECT,
            properties: {
              cardiacos: { type: Type.STRING, description: "Antecedentes cardíacos" },
              hipertensivos: { type: Type.STRING, description: "Antecedentes hipertensivos" },
              diabetes_mellitus: { type: Type.STRING, description: "Antecedentes de diabetes mellitus" },
              vih_sida: { type: Type.STRING, description: "Antecedentes de VIH/SIDA" },
              cancer: { type: Type.STRING, description: "Antecedentes de cáncer" },
              hepaticos: { type: Type.STRING, description: "Antecedentes hepáticos" },
              convulsivos: { type: Type.STRING, description: "Antecedentes convulsivos" },
              cirugias: { type: Type.STRING, description: "Cirugías previas con fechas" },
              otros: { type: Type.STRING, description: "Otros antecedentes patológicos" }
            }
          },

          antecedentes_no_patologicos: {
            type: Type.OBJECT,
            properties: {
              fuma: { type: Type.STRING, description: "¿Fuma? (cantidad)" },
              alcohol: { type: Type.STRING, description: "¿Consume bebidas alcohólicas? (tipo y cantidad)" },
              drogas: { type: Type.STRING, description: "¿Consume o ha consumido drogas? (tipo y cantidad)" },
              perdida_peso: { type: Type.STRING, description: "¿Pérdida no intencional de peso? (cantidad)" },
              perinatales: { type: Type.STRING, description: "Antecedentes perinatales" },
              gineco_obstetricos: { type: Type.STRING, description: "Antecedentes gineco-obstétricos" },
              otros: { type: Type.STRING, description: "Otros antecedentes no patológicos" }
            }
          },

          padecimiento_actual: {
            type: Type.OBJECT,
            properties: {
              fecha_primeros_sintomas: { type: Type.STRING, description: "Fecha de primeros síntomas DD/MM/AAAA" },
              fecha_primera_consulta: { type: Type.STRING, description: "Fecha de primera consulta DD/MM/AAAA" },
              fecha_diagnostico: { type: Type.STRING, description: "Fecha de diagnóstico DD/MM/AAAA" },
              descripcion_evolucion: { type: Type.STRING, description: "Detalles de evolución y estado actual" },
              tipo_padecimiento: { 
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array de valores marcados: ['Congénito', 'Agudo', 'Adquirido', 'Crónico']. SOLO extrae los valores que VES marcados visualmente."
              },
              tiempo_evolucion: { type: Type.STRING, description: "Tiempo de evolución del padecimiento" },
              relacionado_con_otro: { type: Type.BOOLEAN, description: "¿Tiene relación con otro padecimiento?" },
              padecimiento_relacionado: { type: Type.STRING, description: "¿Cuál padecimiento relacionado?" },
              causo_discapacidad: { type: Type.BOOLEAN, description: "¿El padecimiento ocasionó discapacidad?" },
              tipo_discapacidad: { type: Type.STRING, description: "Parcial o Total" },
              discapacidad_desde: { type: Type.STRING, description: "Discapacidad desde" },
              discapacidad_hasta: { type: Type.STRING, description: "Discapacidad hasta" },
              continuara_tratamiento: { type: Type.BOOLEAN, description: "¿Continuará recibiendo tratamiento en el futuro?" },
              tratamiento_futuro_detalle: { type: Type.STRING, description: "Especificación del tratamiento futuro" }
            }
          },

          diagnostico: {
            type: Type.OBJECT,
            properties: {
              diagnostico_1: { type: Type.STRING, description: "Diagnóstico principal (1)" },
              diagnostico_2: { type: Type.STRING, description: "Diagnóstico secundario (2)" },
              diagnostico_3: { type: Type.STRING, description: "Diagnóstico terciario (3)" }
            }
          },

          exploracion_fisica: {
            type: Type.OBJECT,
            properties: {
              resultados: { type: Type.STRING, description: "Exploración física y resultados de estudios relevantes" },
              talla: { type: Type.STRING, description: "Talla del paciente" },
              peso: { type: Type.STRING, description: "Peso del paciente" }
            }
          },

          tratamiento: {
            type: Type.OBJECT,
            properties: {
              es_quirurgico: { type: Type.BOOLEAN, description: "¿Es tratamiento quirúrgico?" },
              procedimiento_quirurgico: { type: Type.STRING, description: "Procedimiento quirúrgico especificado" },
              es_medico: { type: Type.BOOLEAN, description: "¿Es tratamiento médico?" },
              tratamiento_medico: { type: Type.STRING, description: "Tratamiento médico, dosificación y fecha" },
              es_programado: { type: Type.BOOLEAN, description: "¿Es programación de tratamiento?" },
              es_realizado: { type: Type.BOOLEAN, description: "¿Es descripción de tratamiento ya realizado?" },
              descripcion: { type: Type.STRING, description: "Descripción completa del tratamiento" },
              hubo_complicaciones: { type: Type.BOOLEAN, description: "¿Hubo complicaciones?" },
              complicaciones_detalle: { type: Type.STRING, description: "Detalle de complicaciones" }
            }
          },

          hospital: {
            type: Type.OBJECT,
            properties: {
              nombre_hospital: { type: Type.STRING, description: "Nombre del hospital" },
              ciudad: { type: Type.STRING, description: "Ciudad" },
              fecha_ingreso: { type: Type.STRING, description: "Fecha de ingreso DD/MM/AAAA" },
              fecha_egreso: { type: Type.STRING, description: "Fecha de egreso DD/MM/AAAA" },
              tipo_estancia: { type: Type.STRING, description: "Urgencia, Hospitalización, o Corta estancia / Ambulatoria" }
            }
          },

          medico_tratante: {
            type: Type.OBJECT,
            properties: {
              apellido_paterno: { type: Type.STRING, description: "Apellido paterno del médico" },
              apellido_materno: { type: Type.STRING, description: "Apellido materno del médico" },
              nombres: { type: Type.STRING, description: "Nombre(s) del médico" },
              numero_proveedor: { type: Type.STRING, description: "Número de proveedor NY Life" },
              rfc: { type: Type.STRING, description: "RFC del médico" },
              especialidad: { type: Type.STRING, description: "Especialidad médica" },
              cedula_profesional: { type: Type.STRING, description: "Cédula profesional" },
              cedula_especialidad: { type: Type.STRING, description: "Cédula de especialidad/Certificación" },
              correo_electronico: { type: Type.STRING, description: "Correo electrónico" },
              telefono_consultorio: { type: Type.STRING, description: "Teléfono del consultorio con LADA" },
              telefono_movil: { type: Type.STRING, description: "Teléfono móvil" },
              pertenece_convenio: { type: Type.BOOLEAN, description: "¿Pertenece a prestadores en convenio?" },
              acepta_tabulador: { type: Type.BOOLEAN, description: "¿Acepta el tabulador para pago de honorarios?" }
            }
          },

          equipo_quirurgico: {
            type: Type.OBJECT,
            properties: {
              anestesiologo: {
                type: Type.OBJECT,
                properties: {
                  nombre: { type: Type.STRING },
                  especialidad: { type: Type.STRING },
                  presupuesto_honorarios: { type: Type.STRING }
                }
              },
              primer_ayudante: {
                type: Type.OBJECT,
                properties: {
                  nombre: { type: Type.STRING },
                  especialidad: { type: Type.STRING },
                  presupuesto_honorarios: { type: Type.STRING }
                }
              },
              segundo_ayudante: {
                type: Type.OBJECT,
                properties: {
                  nombre: { type: Type.STRING },
                  especialidad: { type: Type.STRING },
                  presupuesto_honorarios: { type: Type.STRING }
                }
              },
              otros_medicos: {
                type: Type.OBJECT,
                properties: {
                  nombre: { type: Type.STRING },
                  especialidad: { type: Type.STRING },
                  presupuesto_honorarios: { type: Type.STRING }
                }
              }
            }
          },

          firma: {
            type: Type.OBJECT,
            properties: {
              lugar: { type: Type.STRING, description: "Lugar de la firma" },
              fecha: { type: Type.STRING, description: "Fecha de la firma DD/MM/AAAA" },
              nombre_firma: { type: Type.STRING, description: "Nombre del médico que firma" },
              firma_autografa_detectada: { type: Type.BOOLEAN, description: "¿Se detectó firma manuscrita?" }
            }
          },

          metadata: {
            type: Type.OBJECT,
            properties: {
              existe_coherencia_clinica: { type: Type.BOOLEAN, description: "¿Existe coherencia clínica en el documento?" },
              observaciones: { type: Type.STRING, description: "Observaciones adicionales sobre la extracción" }
            }
          }
        },
        required: ['provider', 'identificacion', 'diagnostico', 'medico_tratante']
      }
    },
    required: ['extracted']
  }
};
