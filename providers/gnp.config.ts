import { Type } from "@google/genai";
import { ProviderConfig } from "./types";

export const GNP_CONFIG: ProviderConfig = {
  id: 'GNP',
  name: 'gnp',
  displayName: 'GNP Seguros',
  
  theme: {
    primary: 'bg-orange-500',
    secondary: 'text-orange-600',
    border: 'border-orange-200',
    light: 'bg-orange-50',
    accent: 'orange'
  },

  identificationRules: [
    'Logotipo naranja/azul de GNP Seguros',
    'Texto "Grupo Nacional Provincial, S.A.B."',
    'Secciones como "Ficha de identificación asegurado afectado", "Historia clínica"',
    'Formato de informe médico GNP de 3 páginas'
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
   - "[ ] Reembolso  [X] Programación de cirugía" → Programación de cirugía

📍 PRIORIDAD 2 - REGLAS VISUALES ALTERNATIVAS (SIN RECUADROS):

Solo aplica estas reglas cuando NO hay recuadros/checkboxes visibles en el documento (formulario sin imprimir o sin cuadros claros):

1️⃣ MARCA A LA IZQUIERDA de la opción:
   ✅ Ejemplos válidos:
   - "X Masculino" → Masculino está seleccionado
   - "● Programación de cirugía" → Programación de cirugía está seleccionada
   - "✓ Enfermedad" → Enfermedad está seleccionada
   - "• Reembolso" → Reembolso está seleccionado

2️⃣ MARCA EN ESPACIO INTERMEDIO entre dos opciones:
   🔹 REGLA: Si la marca está en el espacio ENTRE dos opciones, pertenece a la opción de la DERECHA
   
   ✅ Ejemplos:
   - "Masculino  X  Femenino" → Femenino está seleccionado (X está más cerca de Femenino)
   - "Accidente  ●  Enfermedad  Embarazo" → Enfermedad está seleccionada
   - "Congénito    ✓    Adquirido" → Adquirido está seleccionado

3️⃣ MARCADO DIRECTO SOBRE/ENCIMA de la opción:
   ✅ Ejemplos válidos:
   - "M̶a̶s̶c̶u̶l̶i̶n̶o̶" (texto tachado) → Masculino está seleccionado
   - "⭕Masculino⭕" (texto rodeado/encerrado) → Masculino está seleccionado
   - "**Masculino**" (texto resaltado/marcado) → Masculino está seleccionado
   - Texto con círculo alrededor → está seleccionado
   - Cualquier marcado visual directo sobre las letras

4️⃣ SÍMBOLOS COMUNES de marca (cuando NO hay recuadros):
   - "X" (equis)
   - "●" (punto/círculo relleno)
   - "✓" o "✔" (palomita/check)
   - Cualquier símbolo visual que indique selección

⚠️ CASOS ESPECIALES (solo cuando NO hay recuadros):

📌 Marca MUY PEGADA al texto:
   - Si ves "XM" o "X" casi fusionada con la "M" de "Masculino" → SÍ está marcado Masculino
   - Si ves "●F" o punto pegado a "Femenino" → SÍ está marcado Femenino
   - La marca puede estar VISUALMENTE FUSIONADA con la primera letra de la opción

📌 Múltiples símbolos en la misma línea:
   - Identifica cuál símbolo corresponde a cuál opción según su POSICIÓN RELATIVA
   - Usa las reglas 1, 2 y 3 para determinar a qué opción pertenece cada marca

⚠️ EJEMPLOS VISUALES DE LO QUE NO DEBES HACER:

🚫 CAUSA DE ATENCIÓN - Ejemplos de inferencias PROHIBIDAS:
❌ "El diagnóstico menciona diabetes" → causa_atencion = "Enfermedad" 
❌ "Hay trauma en el texto" → causa_atencion = "Accidente"
❌ "Menciona embarazo en antecedentes" → causa_atencion = "Embarazo"

✅ CORRECTO: Solo marca SI VES esto en el documento:
   ☑ Accidente    ☐ Enfermedad    ☐ Embarazo
   → causa_atencion = "Accidente"

🚫 TRÁMITE - Ejemplos de inferencias PROHIBIDAS:
❌ "Es cirugía" → tramite.programacion_cirugia = true
❌ "Menciona medicamentos" → tramite.programacion_medicamentos = true
❌ "Habla de reembolso en el texto" → tramite.reembolso = true

✅ SOLO extrae lo que VISUALMENTE esté marcado en casillas/checkboxes.

⚠️ EXCEPCIÓN ESPECIAL: TIPO DE PADECIMIENTO (PERMITE MÚLTIPLES VALORES)

Este es el ÚNICO campo que acepta múltiples casillas marcadas:

📋 EJEMPLO VISUAL 1:
SI VES ESTO en el documento:
   ☑ Congénito    ☐ Adquirido
   ☑ Agudo        ☐ Crónico

✅ ENTONCES extrae: ["Congénito", "Agudo"]

📋 EJEMPLO VISUAL 2:
SI VES ESTO:
   ☐ Congénito    ☑ Adquirido
   ☐ Agudo        ☑ Crónico

✅ ENTONCES extrae: ["Adquirido", "Crónico"]

📋 EJEMPLO VISUAL 3:
SI VES ESTO:
   ☑ Congénito    ☐ Adquirido
   ☐ Agudo        ☐ Crónico

✅ ENTONCES extrae: ["Congénito"]

📋 EJEMPLO VISUAL 4:
SI VES ESTO (ninguna marcada):
   ☐ Congénito    ☐ Adquirido
   ☐ Agudo        ☐ Crónico

✅ ENTONCES extrae: [] (array vacío)

🚫 NO HAGAS ESTO:
❌ Ver "Congénito, Agudo" marcados → extraer solo ["Congénito"]
❌ Ver solo "Adquirido" marcado → inferir ["Adquirido", "Crónico"]
❌ Ver ninguna marcada → inferir basándote en el diagnóstico

RECUERDA: tipo_padecimiento es un ARRAY de strings, NO un string separado por comas.

🔴🔴🔴 REGLAS CRÍTICAS PARA EXTRACCIÓN DE FECHAS 🔴🔴🔴

⚠️ PROBLEMA COMÚN DE OCR: Las diagonales "/" pueden confundirse con el número "1"
⚠️ DEBES identificar correctamente los SEPARADORES de fecha vs los DÍGITOS

📋 FORMATO DE SALIDA OBLIGATORIO:
- TODAS las fechas deben normalizarse a formato DD/MM/AAAA
- Si el día tiene 1 dígito → agregar 0 adelante (ej: 5 → 05)
- Si el mes tiene 1 dígito → agregar 0 adelante (ej: 3 → 03)
- Si el año tiene 2 dígitos → convertir a 4 dígitos (ej: 25 → 2025, 99 → 1999)

📋 ESTRUCTURA DEL FORMULARIO GNP PARA FECHAS:
El formulario GNP tiene campos de fecha con formato pre-impreso:
   ┌─────────────────────────────────┐
   │  ____ / ____ / ________        │
   │  (DD)   (MM)   (AAAA)          │
   └─────────────────────────────────┘

Las "/" YA ESTÁN IMPRESAS en el formulario. Los números se escriben EN LOS ESPACIOS entre las diagonales.

⚠️ REGLA CRÍTICA: NO confundas las "/" pre-impresas con el número "1"
- Si ves "05/11/2025" → la fecha es 05/11/2025 (5 de noviembre 2025)
- Si ves "0511/12025" → ESTO ES UN ERROR DE OCR, la fecha real es 05/11/2025
- Si ves algo como "051 1 2025" → probablemente es 05/11/2025 (las "/" se confundieron con 1)

📋 FORMATOS DE ENTRADA QUE PUEDES ENCONTRAR (todos válidos):
- DD/MM/AAAA → 05/11/2025 → extraer como: 05/11/2025
- D/MM/AAAA → 5/11/2025 → extraer como: 05/11/2025
- DD/M/AAAA → 05/1/2025 → extraer como: 05/01/2025
- D/M/AAAA → 5/1/2025 → extraer como: 05/01/2025
- DD/MM/AA → 05/11/25 → extraer como: 05/11/2025
- D/M/AA → 5/1/25 → extraer como: 05/01/2025

📋 CÓMO IDENTIFICAR UNA FECHA CORRECTAMENTE:
1. Busca el PATRÓN de fecha: números separados por "/" o espacios
2. El PRIMER grupo (1-2 dígitos) = DÍA (rango válido: 01-31)
3. El SEGUNDO grupo (1-2 dígitos) = MES (rango válido: 01-12)
4. El TERCER grupo (2-4 dígitos) = AÑO

📋 EJEMPLOS DE CORRECCIÓN DE OCR:
❌ OCR lee: "051 1 2025" → ✅ Fecha real: "05/11/2025"
❌ OCR lee: "0511/12025" → ✅ Fecha real: "05/11/2025"
❌ OCR lee: "5 1 1 2025" → ✅ Fecha real: "05/11/2025"
❌ OCR lee: "05 / 11 / 2025" → ✅ Fecha real: "05/11/2025"

🔴 VALIDACIÓN OBLIGATORIA:
- El día NUNCA puede ser mayor a 31
- El mes NUNCA puede ser mayor a 12
- Si extraes un mes > 12, probablemente confundiste una "/" con "1"

INSTRUCCIONES DE EXTRACCIÓN PARA GNP:

SECCIÓN TRÁMITE:
- Identifica cuáles opciones están marcadas VISIBLEMENTE: Reembolso, Programación de cirugía, Programación de medicamentos, Programación de servicios, Indemnización, Reporte hospitalario
- Pueden estar marcadas múltiples opciones
- Si ninguna está marcada → dejar todos en false/null

FICHA DE IDENTIFICACIÓN DEL ASEGURADO:
- numero_poliza: Número de póliza del asegurado
- primer_apellido: Primer apellido del paciente
- segundo_apellido: Segundo apellido del paciente  
- nombres: Nombre(s) del paciente
- sexo: Extrae EXACTAMENTE la letra que veas marcada: "F" o "M" (NO escribas "Femenino" o "Masculino", solo la letra)
- edad: Edad del paciente
- causa_atencion: Accidente, Enfermedad o Embarazo (cuál está marcada)

HISTORIA CLÍNICA:
- personales_patologicos: Antecedentes personales patológicos (especificar tiempo de evolución, incluir fechas)
- personales_no_patologicos: Antecedentes personales no patológicos
- gineco_obstetricos: Antecedentes gineco-obstétricos (descripción anatómica)
- perinatales: Antecedentes perinatales

PADECIMIENTO ACTUAL:
- descripcion: Descripción del padecimiento actual según historia clínica y evolución
- fecha_inicio: Fecha de inicio del padecimiento (formato dd/mm/aa)

DIAGNÓSTICO:
- diagnostico_definitivo: Diagnóstico(s) definitivo(s)
- fecha_diagnostico: Fecha de diagnóstico (formato dd/mm/aa)
- tipo_padecimiento: Congénito, Adquirido, Agudo o Crónico (cuál está marcada)
- relacionado_con_otro: ¿Se ha relacionado con algún otro padecimiento? (Sí/No)
- especifique_cual: Si sí, especificar cuál padecimiento

SIGNOS VITALES Y MEDIDAS ANTROPOMÉTRICAS:
- pulso: Pulso (x minuto)
- respiracion: Respiración (x minuto)
- temperatura: Temperatura (°C)
- presion_arterial: Presión arterial (mm Hg) - extraer como texto completo
- peso: Peso (kg)
- altura: Altura (m)

EXPLORACIÓN FÍSICA:
- resultados: Resultados de exploración física realizada el día del diagnóstico

ESTUDIOS:
- estudios_realizados: Estudios realizados (indicar si no se realizaron)

COMPLICACIONES:
- presento_complicaciones: Sí o No
- descripcion: Descripción de complicaciones si las hubo
- fecha_inicio: Fecha de inicio de complicaciones

TRATAMIENTO:
- descripcion: Detallar tratamientos, procedimientos y técnica quirúrgica con fechas. Medicamentos con posología completa.
- fecha_inicio: Fecha de inicio del tratamiento

INTERVENCIÓN QUIRÚRGICA:
- equipo_especifico: Equipo específico utilizado (laparoscopía, fluoroscopía, etc.)
- fechas: Fechas de uso del equipo

INFORMACIÓN ADICIONAL:
- descripcion: Cualquier información adicional relevante

DATOS DE HOSPITAL O CLÍNICA:
- nombre_hospital: Nombre del hospital o clínica donde ingresará el paciente
- ciudad: Ciudad
- estado: Estado
- tipo_estancia: Urgencia, Hospitalaria, o Corta estancia / ambulatoria
- fecha_ingreso: Fecha de ingreso (dd/mm/aa)

DATOS DEL MÉDICO TRATANTE:
- primer_apellido, segundo_apellido, nombres: Nombre completo del médico
- especialidad: Especialidad médica
- cedula_profesional: Cédula profesional
- cedula_especialidad: Cédula de especialidad
- convenio_gnp: ¿Está en convenio con GNP? (Sí/No)
- se_ajusta_tabulador: ¿Se ajusta al tabulador? (Sí/No)
- ppto_honorarios: Presupuesto de honorarios
- telefono_consultorio: Teléfono del consultorio
- celular: Celular del médico
- correo_electronico: Correo electrónico
- tipo_participacion: Tratante, Cirujano, u Otra (especificar cuál)
- hubo_interconsulta: ¿Hubo interconsulta? (Sí/No)

MÉDICOS INTERCONSULTANTES O PARTICIPANTES:
⚠️ REGLA CRÍTICA: SOLO extrae médicos que estén EXPLÍCITAMENTE registrados en el documento
- NO inventes médicos basándote en el contexto clínico
- Si NO hay médicos interconsultantes registrados → devuelve array vacío []
- Pueden haber de 0 hasta 3 médicos registrados

Para cada médico que SÍ esté registrado extraer:
- tipo_participacion: Interconsultante, Cirujano, Anestesiólogo, Ayudantía, u Otra (cuál está marcada)
- tipo_participacion_otra: Si es "Otra", especificar cuál tipo
- primer_apellido: Primer apellido del médico
- segundo_apellido: Segundo apellido del médico
- nombres: Nombre(s) del médico
- especialidad: Especialidad médica
- cedula_profesional: Cédula profesional
- cedula_especialidad: Cédula de especialidad (si está disponible)
- ppto_honorarios: Presupuesto de honorarios (ejemplo: "$18,000")

FIRMA:
- lugar: Lugar donde se firma (ejemplo: "Ciudad de México", "Guadalajara", etc.)
- fecha: Fecha de la firma en formato DD/MM/AAAA (extraer SOLO la fecha del campo "Lugar y fecha")
- nombre_firma: Nombre del médico que firma
- firma_autografa_detectada: true si se ve una firma manuscrita real, false si solo hay nombre impreso

⚠️ IMPORTANTE PARA "LUGAR Y FECHA":
Si ves algo como "Ciudad de México 04/12/2025", debes separarlo en:
- lugar: "Ciudad de México"
- fecha: "04/12/2025"
`,

  requiredFields: [
    'identificacion.nombres',
    'identificacion.edad',
    'diagnostico.diagnostico_definitivo',
    'signos_vitales.presion_arterial',
    'signos_vitales.peso',
    'medico_tratante.nombres',
    'hospital.nombre_hospital'
  ],

  geminiSchema: {
    type: Type.OBJECT,
    properties: {
      extracted: {
        type: Type.OBJECT,
        properties: {
          provider: { type: Type.STRING, description: "GNP" },

          tramite: {
            type: Type.OBJECT,
            properties: {
              reembolso: { type: Type.BOOLEAN },
              programacion_cirugia: { type: Type.BOOLEAN },
              programacion_medicamentos: { type: Type.BOOLEAN },
              programacion_servicios: { type: Type.BOOLEAN },
              indemnizacion: { type: Type.BOOLEAN },
              reporte_hospitalario: { type: Type.BOOLEAN },
              numero_poliza: { type: Type.STRING }
            }
          },

          identificacion: {
            type: Type.OBJECT,
            properties: {
              primer_apellido: { type: Type.STRING },
              segundo_apellido: { type: Type.STRING },
              nombres: { type: Type.STRING },
              edad: { type: Type.STRING },
              sexo: { type: Type.STRING },
              causa_atencion: { type: Type.STRING }
            }
          },

          antecedentes: {
            type: Type.OBJECT,
            properties: {
              personales_patologicos: { type: Type.STRING },
              personales_no_patologicos: { type: Type.STRING },
              gineco_obstetricos: { type: Type.STRING },
              perinatales: { type: Type.STRING }
            }
          },

          signos_vitales: {
            type: Type.OBJECT,
            properties: {
              pulso: { type: Type.STRING },
              respiracion: { type: Type.STRING },
              temperatura: { type: Type.STRING },
              presion_arterial: { type: Type.STRING },
              peso: { type: Type.STRING },
              altura: { type: Type.STRING }
            }
          },

          padecimiento_actual: {
            type: Type.OBJECT,
            properties: {
              descripcion: { type: Type.STRING, description: "Descripción del padecimiento actual" },
              fecha_inicio: { type: Type.STRING, description: "Fecha de inicio del padecimiento" },
              tipo_padecimiento: { 
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array de valores extraídos de casillas marcadas: puede contener ['Congénito', 'Adquirido', 'Agudo', 'Crónico']. SOLO extrae los valores que VES marcados visualmente. Si ninguna casilla está marcada, devuelve array vacío []."
              }
            }
          },

          diagnostico: {
            type: Type.OBJECT,
            properties: {
              diagnostico_definitivo: { type: Type.STRING, description: "Diagnóstico(s) definitivo(s)" },
              fecha_diagnostico: { type: Type.STRING, description: "Fecha de diagnóstico" },
              relacionado_con_otro: { type: Type.BOOLEAN, description: "¿Se ha relacionado con otro padecimiento?" },
              especifique_cual: { type: Type.STRING, description: "Especificar cuál padecimiento relacionado" },
              cie_coherente_con_texto: { type: Type.BOOLEAN },
              explicacion_incoherencia_cie: { type: Type.STRING }
            }
          },

          exploracion_fisica: {
            type: Type.OBJECT,
            properties: {
              resultados: { type: Type.STRING, description: "Resultados de exploración física" },
              fecha: { type: Type.STRING, description: "Fecha de la exploración" }
            }
          },

          estudios: {
            type: Type.OBJECT,
            properties: {
              estudios_realizados: { type: Type.STRING, description: "Estudios realizados o indicar que no se realizaron" }
            }
          },

          complicaciones: {
            type: Type.OBJECT,
            properties: {
              presento_complicaciones: { type: Type.BOOLEAN, description: "¿Presentó complicaciones?" },
              descripcion: { type: Type.STRING, description: "Descripción de complicaciones" },
              fecha_inicio: { type: Type.STRING, description: "Fecha de inicio de complicaciones" }
            }
          },

          tratamiento: {
            type: Type.OBJECT,
            properties: {
              descripcion: { type: Type.STRING, description: "Descripción del tratamiento con fechas y posología" },
              fecha_inicio: { type: Type.STRING, description: "Fecha de inicio del tratamiento" }
            }
          },

          intervencion_qx: {
            type: Type.OBJECT,
            properties: {
              equipo_especifico: { type: Type.STRING, description: "Equipo específico utilizado en intervención" },
              fechas: { type: Type.STRING, description: "Fechas de la intervención" },
              tecnica: { type: Type.STRING, description: "Técnica quirúrgica utilizada" }
            }
          },

          info_adicional: {
            type: Type.OBJECT,
            properties: {
              descripcion: { type: Type.STRING, description: "Información adicional" }
            }
          },

          hospital: {
            type: Type.OBJECT,
            properties: {
              nombre_hospital: { type: Type.STRING, description: "Nombre del hospital o clínica" },
              ciudad: { type: Type.STRING, description: "Ciudad" },
              estado: { type: Type.STRING, description: "Estado" },
              tipo_estancia: { type: Type.STRING, description: "Urgencia, Hospitalaria, o Corta estancia / ambulatoria" },
              fecha_ingreso: { type: Type.STRING, description: "Fecha de ingreso" }
            }
          },

          medico_tratante: {
            type: Type.OBJECT,
            properties: {
              primer_apellido: { type: Type.STRING },
              segundo_apellido: { type: Type.STRING },
              nombres: { type: Type.STRING },
              especialidad: { type: Type.STRING },
              cedula_profesional: { type: Type.STRING },
              cedula_especialidad: { type: Type.STRING },
              convenio_gnp: { type: Type.BOOLEAN },
              se_ajusta_tabulador: { type: Type.BOOLEAN },
              ppto_honorarios: { type: Type.STRING },
              telefono_consultorio: { type: Type.STRING },
              celular: { type: Type.STRING },
              correo_electronico: { type: Type.STRING },
              tipo_participacion: { type: Type.STRING },
              tipo_participacion_otra: { type: Type.STRING },
              hubo_interconsulta: { type: Type.BOOLEAN }
            }
          },

          otros_medicos: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                tipo_participacion: { type: Type.STRING, description: "Interconsultante, Cirujano, Anestesiólogo, Ayudantía, u Otra" },
                tipo_participacion_otra: { type: Type.STRING, description: "Si es Otra, especificar cuál" },
                primer_apellido: { type: Type.STRING, description: "Primer apellido del médico" },
                segundo_apellido: { type: Type.STRING, description: "Segundo apellido del médico" },
                nombres: { type: Type.STRING, description: "Nombre(s) del médico" },
                especialidad: { type: Type.STRING, description: "Especialidad médica" },
                cedula_profesional: { type: Type.STRING, description: "Cédula profesional" },
                cedula_especialidad: { type: Type.STRING, description: "Cédula de especialidad" },
                ppto_honorarios: { type: Type.STRING, description: "Presupuesto de honorarios" }
              }
            },
            description: "Array de médicos interconsultantes o participantes (hasta 3). SOLO extrae médicos que estén VISIBLEMENTE registrados en el documento."
          },

          firma: {
            type: Type.OBJECT,
            properties: {
              lugar: { type: Type.STRING, description: "Lugar donde se firma (ciudad, estado)" },
              fecha: { type: Type.STRING, description: "Fecha de la firma en formato DD/MM/AAAA" },
              nombre_firma: { type: Type.STRING, description: "Nombre del médico que firma" },
              firma_autografa_detectada: { type: Type.BOOLEAN, description: "¿Se detectó firma manuscrita real?" }
            }
          },

          metadata: {
            type: Type.OBJECT,
            properties: {
              existe_coherencia_clinica: { type: Type.BOOLEAN, description: "¿Existe coherencia clínica en el documento?" },
              observacion_coherencia: { type: Type.STRING, description: "Observaciones sobre coherencia clínica" }
            }
          }
        },
        required: ["provider"]
      }
    },
    required: ["extracted"]
  }
};
