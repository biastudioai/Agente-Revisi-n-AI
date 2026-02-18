import { Type } from "./schema-types";
import { ProviderConfig } from "./types";

export const AXA_2025_CONFIG: ProviderConfig = {
  id: 'AXA',
  name: 'axa_2025',
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
    'Referencia "AI-461 • JULIO 2025"',
    'Dirección "Félix Cuevas 366, piso 3, Col. Tlacoquemécatl"',
    'Formato de 6 páginas con secciones numeradas',
    'Tabla de antecedentes patológicos con columnas No., Diagnóstico, Fecha, Tratamiento',
    'Sección "Plan terapéutico a seguir"',
    'Sección "Solicitud de material o rentas de equipo" con tabla de 15 filas',
    'Campo "¿Se ajusta a Tabulador médico?" en datos del médico',
    'Campo "Estadificación TNM" en diagnóstico'
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
- 🔹 Si NINGUNA casilla de un grupo Sí/No está marcada → el array debe quedar VACÍO [] (NO poner ["No"])
- 🔹 Si hay DUDA sobre si está marcada → déjalo VACÍO
- 🔹 La ausencia de una marca en "Sí" NO implica "No". Ambas casillas deben evaluarse independientemente

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

📋 ESTRUCTURA DEL DOCUMENTO AXA 2025 (6 PÁGINAS):
Este formulario de AXA Seguros versión 2025 (AI-461 • JULIO 2025) tiene 6 páginas con las siguientes secciones principales:
- Página 1: Datos del asegurado, motivo de atención, tipo de estancia, antecedentes médicos (tabla de patológicos)
- Página 2: Antecedentes no patológicos, gineco-obstétricos, perinatales, referido, diagnóstico
- Página 3: Tratamiento, tabla de medicamentos
- Página 4: Rehabilitación, enfermería, observaciones, plan terapéutico, solicitud de material
- Página 5: Datos del médico principal, anestesiólogo, ayudantes
- Página 6: Aviso de privacidad y firma del asegurado

🔴🔴🔴 SEXO DEL PACIENTE - AUDITORÍA VISUAL OBLIGATORIA (OBJETO sexo_audit) 🔴🔴🔴

⚠️⚠️⚠️ IMPORTANTE: Este campo tiene 2 opciones de checkbox:
   Masculino ☐   Femenino ☐

DEBES llenar sexo_audit ANTES de construir el array sexo.

CÓMO LLENAR sexo_audit:
1. masculino_marcado: ¿Veo X/✓/relleno en el checkbox de "Masculino"? → true/false
2. femenino_marcado: ¿Veo X/✓/relleno en el checkbox de "Femenino"? → true/false

CÓMO CONSTRUIR sexo A PARTIR DE sexo_audit:
- Si masculino_marcado = true → incluir "Masculino"
- Si femenino_marcado = true → incluir "Femenino"
- Si NINGUNO tiene marca → sexo = []

🔴🔴🔴 MOTIVO DE ATENCIÓN - AUDITORÍA VISUAL OBLIGATORIA (OBJETO motivo_atencion_audit) 🔴🔴🔴

⚠️⚠️⚠️ IMPORTANTE: Este campo tiene 4 opciones de checkbox:
   Enfermedad ☐   Accidente ☐   Maternidad ☐   Segunda opinión médica ☐

DEBES llenar motivo_atencion_audit ANTES de construir el array motivo_atencion.

CÓMO LLENAR motivo_atencion_audit:
1. enfermedad_marcado: ¿Veo X/✓/relleno en el checkbox de "Enfermedad"? → true/false
2. accidente_marcado: ¿Veo X/✓/relleno en el checkbox de "Accidente"? → true/false
3. maternidad_marcado: ¿Veo X/✓/relleno en el checkbox de "Maternidad"? → true/false
4. segunda_opinion_marcado: ¿Veo X/✓/relleno en el checkbox de "Segunda opinión médica"? → true/false

CÓMO CONSTRUIR motivo_atencion A PARTIR DE motivo_atencion_audit:
- Si enfermedad_marcado = true → incluir "Enfermedad"
- Si accidente_marcado = true → incluir "Accidente"
- Si maternidad_marcado = true → incluir "Maternidad"
- Si segunda_opinion_marcado = true → incluir "Segunda opinión médica"
- Si NINGUNO tiene marca → motivo_atencion = []

🚫 ERRORES A EVITAR:
❌ Ver casillas vacías → inferir ["Enfermedad"] porque el diagnóstico es una enfermedad ← INCORRECTO
❌ Ver "diabetes" en texto → marcar enfermedad_marcado = true ← INCORRECTO

🔴🔴🔴 TIPO DE ESTANCIA - AUDITORÍA VISUAL OBLIGATORIA (OBJETO tipo_estancia_audit) 🔴🔴🔴

⚠️⚠️⚠️ IMPORTANTE: Este campo tiene 4 opciones de checkbox:
   Urgencia ☐   Hospitalización ☐   Corta estancia/ambulatoria ☐   Consultorio ☐

DEBES llenar tipo_estancia_audit ANTES de construir el array tipo_estancia.

CÓMO LLENAR tipo_estancia_audit:
1. urgencia_marcado: ¿Veo X/✓/relleno en el checkbox de "Urgencia"? → true/false
2. hospitalizacion_marcado: ¿Veo X/✓/relleno en el checkbox de "Hospitalización"? → true/false
3. corta_estancia_marcado: ¿Veo X/✓/relleno en el checkbox de "Corta estancia/ambulatoria"? → true/false
4. consultorio_marcado: ¿Veo X/✓/relleno en el checkbox de "Consultorio"? → true/false

CÓMO CONSTRUIR tipo_estancia A PARTIR DE tipo_estancia_audit:
- Si urgencia_marcado = true → incluir "Urgencia"
- Si hospitalizacion_marcado = true → incluir "Hospitalización"
- Si corta_estancia_marcado = true → incluir "Corta estancia/ambulatoria"
- Si consultorio_marcado = true → incluir "Consultorio"
- Si NINGUNO tiene marca → tipo_estancia = []

🔴🔴🔴 ANTECEDENTES PATOLÓGICOS - EXTRACCIÓN DE TABLA (FORMATO 2025) 🔴🔴🔴

⚠️ IMPORTANTE: En el formato AXA 2025, los antecedentes patológicos son una TABLA con hasta 10 filas.
Ya NO son checkboxes individuales como en la versión anterior.

La tabla tiene las siguientes columnas:
1. No. - Número de fila (1-10)
2. Diagnóstico - Nombre del diagnóstico/padecimiento
3. Fecha de diagnóstico - En formato DD/MM/AAAA
4. Tratamiento recibido - Descripción del tratamiento

REGLAS DE EXTRACCIÓN:
- Extrae CADA fila como un objeto separado en el array antecedentes_patologicos
- Si una fila está completamente vacía → NO la incluyas en el array
- Si una fila tiene datos parciales → inclúyela con los campos disponibles y vacíos para el resto
- El campo "numero" corresponde al número de fila (1-10)
- Si NO hay ningún antecedente registrado → el array debe quedar vacío []

🔴🔴🔴 ANTECEDENTES NO PATOLÓGICOS - CHECKBOXES CON TEXTO (FORMATO 2025) 🔴🔴🔴

⚠️ Cada antecedente no patológico tiene un checkbox Y un campo de texto libre:
   ☐ ¿Fuma? [texto]
   ☐ ¿consume bebidas alcohólicas? [texto]
   ☐ ¿consume o ha consumido algún tipo de drogas? [texto]
   ☐ otros [texto]

Para CADA antecedente:
- El campo booleano (ej: fuma) = true SOLO si el checkbox tiene marca visual
- El campo texto (ej: fuma_detalle) = texto escrito junto al checkbox (frecuencia, cantidad, desde cuándo)
- Si el checkbox está vacío → booleano = false Y texto = ""

🔴🔴🔴 TIPO DE PADECIMIENTO - AUDITORÍA VISUAL OBLIGATORIA (OBJETO tipo_padecimiento_audit) 🔴🔴🔴

⚠️⚠️⚠️ IMPORTANTE: El tipo de padecimiento tiene 4 checkboxes:
   Congénito ☐   Adquirido ☐   Agudo ☐   Crónico ☐

DEBES llenar tipo_padecimiento_audit ANTES de construir el array tipo_padecimiento.

CÓMO LLENAR tipo_padecimiento_audit:
1. congenito_marcado: ¿Veo X/✓/relleno en el checkbox de "Congénito"? → true/false
2. adquirido_marcado: ¿Veo X/✓/relleno en el checkbox de "Adquirido"? → true/false
3. agudo_marcado: ¿Veo X/✓/relleno en el checkbox de "Agudo"? → true/false
4. cronico_marcado: ¿Veo X/✓/relleno en el checkbox de "Crónico"? → true/false

CÓMO CONSTRUIR tipo_padecimiento A PARTIR DE tipo_padecimiento_audit:
- Si congenito_marcado = true → incluir "Congénito"
- Si adquirido_marcado = true → incluir "Adquirido"
- Si agudo_marcado = true → incluir "Agudo"
- Si cronico_marcado = true → incluir "Crónico"
- Si NINGUNO tiene marca → tipo_padecimiento = []

🔴🔴🔴 INCAPACIDAD - AUDITORÍA VISUAL OBLIGATORIA (OBJETO incapacidad_audit) 🔴🔴🔴

⚠️ Este campo tiene 4 checkboxes:
   Sí ☐   No ☐   Parcial ☐   Total ☐

DEBES llenar incapacidad_audit ANTES de construir el array incapacidad.

🔴🔴🔴 ES CÁNCER - AUDITORÍA VISUAL OBLIGATORIA (OBJETO es_cancer_audit) 🔴🔴🔴

⚠️ Este campo tiene 2 checkboxes:
   Sí ☐   No ☐

DEBES llenar es_cancer_audit ANTES de construir el array es_cancer.

🔴🔴🔴 SITIO DEL PROCEDIMIENTO - AUDITORÍA VISUAL OBLIGATORIA (OBJETO sitio_procedimiento_audit) 🔴🔴🔴

⚠️ Este campo tiene 4 checkboxes:
   Consultorio ☐   Hospital ☐   Gabinete ☐   Otro ☐

DEBES llenar sitio_procedimiento_audit ANTES de construir el array sitio_procedimiento.

🔴🔴🔴 CAMPOS SÍ/NO CON AUDITORÍA 🔴🔴🔴

Los siguientes campos tienen checkboxes Sí ☐ / No ☐ y requieren objetos _audit:
- histopatologico_audit → histopatologico
- complicaciones_audit → complicaciones
- tratamiento_futuro_audit → tratamiento_futuro

Para cada uno: llenar el _audit ANTES de construir el array correspondiente.

🚨 REGLA CRÍTICA PARA CAMPOS SÍ/NO:
- Si el checkbox "Sí" tiene marca visual → array = ["Sí"]
- Si el checkbox "No" tiene marca visual → array = ["No"]
- Si NINGUNO de los dos tiene marca visual → array = [] (VACÍO)
- ❌ NUNCA inferir "No" cuando ninguno está marcado
- ❌ NUNCA asumir que la ausencia de "Sí" significa "No"
- Si ambos están vacíos, el array DEBE quedar vacío []

🔴🔴🔴 TURNO DE ENFERMERÍA - AUDITORÍA VISUAL OBLIGATORIA (OBJETO turno_audit) 🔴🔴🔴

⚠️ Este campo tiene 4 checkboxes:
   Matutino ☐   Vespertino ☐   Nocturno ☐   24 horas ☐

DEBES llenar turno_audit ANTES de construir el array turno.

📋 TABLA DE MEDICAMENTOS (10 FILAS):

El formulario AXA 2025 incluye una tabla con 10 filas de medicamentos.
Cada fila tiene 4 columnas:
1. Nombre y presentación del medicamento (ej: Paracetamol 100 mg)
2. Cantidad (ej: 1 tableta)
3. Cada cuánto (ej: Cada 24 hrs)
4. Durante cuánto tiempo (ej: Por un mes)

Extrae CADA fila como un objeto separado en el array tabla_medicamentos.
- Si una fila está completamente vacía → NO la incluyas en el array
- Si una fila tiene datos parciales → inclúyela con los campos disponibles y vacíos para el resto
- El campo "numero" corresponde al número de fila (1-10)

📋 PLAN TERAPÉUTICO (SECCIÓN NUEVA EN 2025):

Esta sección contiene:
1. Técnica detallada: explicación de en qué consiste la cirugía planeada (texto libre)
2. Tiempo esperado de hospitalización de acuerdo con el procedimiento programado (texto libre)

Extrae ambos campos como texto. Si están vacíos → cadena vacía "".

📋 SOLICITUD DE MATERIAL O RENTAS DE EQUIPO (SECCIÓN NUEVA EN 2025):

Tabla con hasta 15 filas con las siguientes columnas:
1. Cantidad
2. Insumo o equipo
3. Marca
4. Distribuidor (Nombre o razón social)
5. RFC
6. Correo electrónico

Extrae CADA fila como un objeto separado en el array solicitud_material.
- Si una fila está completamente vacía → NO la incluyas en el array
- Si una fila tiene datos parciales → inclúyela con los campos disponibles y vacíos para el resto

📋 DATOS DEL MÉDICO (CAMBIOS 2025):

El médico principal ahora incluye:
- ¿Se ajusta a Tabulador médico?: checkbox Sí ☐ / No ☐ → requiere ajusta_tabulador_audit
- Persona moral: Nombre común y Razón social (campos nuevos)

El anestesiólogo también incluye:
- Persona moral: Nombre común y Razón social (campos nuevos)

🔴🔴🔴 AJUSTA A TABULADOR MÉDICO - AUDITORÍA VISUAL OBLIGATORIA (OBJETO ajusta_tabulador_audit) 🔴🔴🔴

⚠️ Este campo tiene 2 checkboxes:
   Sí ☐   No ☐

DEBES llenar ajusta_tabulador_audit ANTES de construir el array ajusta_tabulador.

📋 SECCIÓN DE AVISO DE PRIVACIDAD (PÁGINA 6):

El documento AXA 2025 tiene una sección simplificada de Aviso de Privacidad al final:
- Texto del aviso de privacidad (no se extrae, solo se verifica presencia)
- Firma del asegurado: 'Detectada' o 'No detectada'
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
              lugar: { type: Type.STRING, description: "Lugar donde se llena el informe" },
              fecha: { type: Type.STRING, description: "Fecha del informe en formato DD/MM/AAAA" }
            }
          },

          identificacion: {
            type: Type.OBJECT,
            properties: {
              apellido_paterno: { type: Type.STRING },
              apellido_materno: { type: Type.STRING },
              nombres: { type: Type.STRING },
              edad: { type: Type.STRING },
              fecha_nacimiento: { type: Type.STRING, description: "Formato DD/MM/AAAA" },
              sexo_audit: {
                type: Type.OBJECT,
                description: "Auditoría visual de los checkboxes de sexo. Llenar ANTES de construir el array sexo.",
                properties: {
                  masculino_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'Masculino' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" },
                  femenino_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'Femenino' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" }
                }
              },
              sexo: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array construido desde sexo_audit. Si masculino_marcado=true → 'Masculino'. Si femenino_marcado=true → 'Femenino'. Si ninguno → []" },
              talla: { type: Type.STRING },
              peso: { type: Type.STRING },
              tension_arterial: { type: Type.STRING }
            }
          },

          motivo_atencion_audit: {
            type: Type.OBJECT,
            description: "Auditoría visual de los 4 checkboxes de motivo de atención. Llenar ANTES de construir el array motivo_atencion.",
            properties: {
              enfermedad_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'Enfermedad' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" },
              accidente_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'Accidente' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" },
              maternidad_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'Maternidad' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" },
              segunda_opinion_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'Segunda opinión médica' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" }
            }
          },

          motivo_atencion: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array construido desde motivo_atencion_audit. Incluir nombre de cada opción cuyo _marcado sea true." },

          tipo_estancia_audit: {
            type: Type.OBJECT,
            description: "Auditoría visual de los 4 checkboxes de tipo de estancia. Llenar ANTES de construir el array tipo_estancia.",
            properties: {
              urgencia_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'Urgencia' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" },
              hospitalizacion_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'Hospitalización' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" },
              corta_estancia_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'Corta estancia/ambulatoria' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" },
              consultorio_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'Consultorio' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" }
            }
          },

          tipo_estancia: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array construido desde tipo_estancia_audit. Incluir nombre de cada opción cuyo _marcado sea true." },

          antecedentes_patologicos: {
            type: Type.ARRAY,
            description: "Tabla de antecedentes patológicos con hasta 10 filas. Solo incluir filas que tengan al menos un dato. Formato 2025: tabla con columnas No., Diagnóstico, Fecha de diagnóstico, Tratamiento recibido.",
            items: {
              type: Type.OBJECT,
              properties: {
                numero: { type: Type.STRING, description: "Número de fila (1-10)" },
                diagnostico: { type: Type.STRING, description: "Diagnóstico o nombre del padecimiento" },
                fecha_diagnostico: { type: Type.STRING, description: "Fecha de diagnóstico en formato DD/MM/AAAA" },
                tratamiento_recibido: { type: Type.STRING, description: "Tratamiento recibido para este antecedente" }
              }
            }
          },

          antecedentes_no_patologicos: {
            type: Type.OBJECT,
            description: "Antecedentes no patológicos con checkbox + texto libre. Solo marcar true si el checkbox tiene marca visual.",
            properties: {
              fuma: { type: Type.BOOLEAN, description: "¿El checkbox de '¿Fuma?' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" },
              fuma_detalle: { type: Type.STRING, description: "Frecuencia, cantidad y desde cuándo fuma" },
              alcohol: { type: Type.BOOLEAN, description: "¿El checkbox de '¿consume bebidas alcohólicas?' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" },
              alcohol_detalle: { type: Type.STRING, description: "Frecuencia, cantidad y desde cuándo consume alcohol" },
              drogas: { type: Type.BOOLEAN, description: "¿El checkbox de '¿consume o ha consumido algún tipo de drogas?' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" },
              drogas_detalle: { type: Type.STRING, description: "Frecuencia, cantidad y desde cuándo consume drogas" },
              otros: { type: Type.BOOLEAN, description: "¿El checkbox de 'otros' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" },
              otros_detalle: { type: Type.STRING, description: "Detalle de otros antecedentes no patológicos" }
            }
          },

          antecedentes_gineco_obstetricos: {
            type: Type.OBJECT,
            properties: {
              gestacion: { type: Type.STRING },
              partos: { type: Type.STRING },
              abortos: { type: Type.STRING },
              cesareas: { type: Type.STRING },
              fecha_ultima_menstruacion: { type: Type.STRING, description: "Formato DD/MM/AAAA" },
              tratamiento_infertilidad: { type: Type.STRING, description: "Especificar si recibió tratamiento para infertilidad" },
              tiempo_evolucion: { type: Type.STRING }
            }
          },

          antecedentes_perinatales: {
            type: Type.OBJECT,
            properties: {
              descripcion: { type: Type.STRING, description: "Evolución, complicaciones, tratamientos perinatales" },
              tiempo_evolucion: { type: Type.STRING }
            }
          },

          referido_otro_medico: {
            type: Type.OBJECT,
            properties: {
              referido: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Checkboxes Sí/No. Array para capturar la marca visual." },
              cual: { type: Type.STRING, description: "Nombre del médico o unidad que refiere" }
            }
          },

          diagnostico: {
            type: Type.OBJECT,
            properties: {
              padecimiento_actual: { type: Type.STRING, description: "Principales signos, síntomas y detalles de evolución" },
              fecha_padecimiento: { type: Type.STRING, description: "Fecha de padecimiento en formato DD/MM/AAAA" },
              fecha_diagnostico: { type: Type.STRING, description: "Fecha de diagnóstico en formato DD/MM/AAAA" },
              tipo_padecimiento_audit: {
                type: Type.OBJECT,
                description: "Auditoría visual de los 4 checkboxes de tipo de padecimiento. Llenar ANTES de construir el array tipo_padecimiento.",
                properties: {
                  congenito_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'Congénito' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" },
                  adquirido_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'Adquirido' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" },
                  agudo_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'Agudo' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" },
                  cronico_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'Crónico' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" }
                }
              },
              tipo_padecimiento: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array construido desde tipo_padecimiento_audit. Incluir nombre de cada opción cuyo _marcado sea true." },
              tiempo_evolucion: { type: Type.STRING },
              causa_etiologia: { type: Type.STRING, description: "Causa o etiología del padecimiento. En caso de accidente, describir tiempo, modo y lugar." },
              relacion_otro_padecimiento: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Checkboxes Sí/No sobre relación con otro padecimiento." },
              relacion_cual: { type: Type.STRING, description: "¿Cuál otro padecimiento?" },
              incapacidad_audit: {
                type: Type.OBJECT,
                description: "Auditoría visual de los 4 checkboxes de incapacidad. Llenar ANTES de construir el array incapacidad.",
                properties: {
                  si_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'Sí' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" },
                  no_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'No' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" },
                  parcial_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'Parcial' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" },
                  total_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'Total' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" }
                }
              },
              incapacidad: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array construido desde incapacidad_audit. Incluir nombre de cada opción cuyo _marcado sea true." },
              incapacidad_desde: { type: Type.STRING, description: "Fecha desde cuándo la incapacidad" },
              incapacidad_hasta: { type: Type.STRING, description: "Fecha hasta cuándo la incapacidad" },
              diagnostico_texto: { type: Type.STRING, description: "Diagnóstico indicando si es unilateral o bilateral, derecho o izquierdo" },
              codigo_icd: { type: Type.STRING, description: "Código ICD" },
              es_cancer_audit: {
                type: Type.OBJECT,
                description: "Auditoría visual de los checkboxes de es cáncer. Llenar ANTES de construir el array es_cancer.",
                properties: {
                  si_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'Sí' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" },
                  no_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'No' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" }
                }
              },
              es_cancer: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array construido desde es_cancer_audit. Sí/No según marca visual." },
              estadificacion_tnm: { type: Type.STRING, description: "Estadificación TNM si aplica" },
              exploracion_fisica: { type: Type.STRING, description: "Datos relevantes de exploración física" },
              estudios_laboratorio: { type: Type.STRING, description: "Estudios de laboratorio y/o gabinete con interpretación" }
            }
          },

          tratamiento: {
            type: Type.OBJECT,
            properties: {
              tratamiento_propuesto: { type: Type.STRING, description: "Tratamiento propuesto (quirúrgico, no quirúrgico)" },
              fecha_cirugia: { type: Type.STRING, description: "Fecha de cirugía en formato DD/MM/AAAA" },
              fecha_hospitalizacion: { type: Type.STRING, description: "Fecha de hospitalización en formato DD/MM/AAAA" },
              fecha_alta: { type: Type.STRING, description: "Fecha de alta en formato DD/MM/AAAA" },
              dias_atencion: { type: Type.STRING, description: "Días que se brindó atención médica" },
              sitio_procedimiento_audit: {
                type: Type.OBJECT,
                description: "Auditoría visual de los 4 checkboxes de sitio del procedimiento. Llenar ANTES de construir el array sitio_procedimiento.",
                properties: {
                  consultorio_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'Consultorio' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" },
                  hospital_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'Hospital' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" },
                  gabinete_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'Gabinete' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" },
                  otro_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'Otro' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" }
                }
              },
              sitio_procedimiento: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array construido desde sitio_procedimiento_audit. Incluir nombre de cada opción cuyo _marcado sea true." },
              sitio_especifique: { type: Type.STRING, description: "Especificación del sitio si se seleccionó 'Otro'" },
              nombre_hospital: { type: Type.STRING, description: "Nombre del hospital si se seleccionó Hospital" },
              histopatologico_audit: {
                type: Type.OBJECT,
                description: "Auditoría visual de los checkboxes de estudio histopatológico. Llenar ANTES de construir el array histopatologico.",
                properties: {
                  si_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'Sí' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" },
                  no_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'No' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" }
                }
              },
              histopatologico: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array construido desde histopatologico_audit. Sí/No según marca visual." },
              histopatologico_resultado: { type: Type.STRING, description: "Resultado del estudio histopatológico" },
              complicaciones_audit: {
                type: Type.OBJECT,
                description: "Auditoría visual de los checkboxes de complicaciones. Llenar ANTES de construir el array complicaciones.",
                properties: {
                  si_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'Sí' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" },
                  no_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'No' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" }
                }
              },
              complicaciones: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array construido desde complicaciones_audit. Sí/No según marca visual." },
              complicaciones_descripcion: { type: Type.STRING, description: "Descripción de las complicaciones" },
              tratamiento_futuro_audit: {
                type: Type.OBJECT,
                description: "Auditoría visual de los checkboxes de tratamiento futuro. Llenar ANTES de construir el array tratamiento_futuro.",
                properties: {
                  si_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'Sí' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" },
                  no_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'No' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" }
                }
              },
              tratamiento_futuro: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array construido desde tratamiento_futuro_audit. Sí/No según marca visual." },
              tratamiento_futuro_descripcion: { type: Type.STRING, description: "Descripción del tratamiento futuro (número de sesiones, cantidad, cada cuánto y durante cuánto tiempo)" }
            }
          },

          tabla_medicamentos: {
            type: Type.ARRAY,
            description: "Tabla de hasta 10 medicamentos (programación de sesiones de quimioterapia o radioterapia). Solo incluir filas que tengan al menos un dato.",
            items: {
              type: Type.OBJECT,
              properties: {
                numero: { type: Type.STRING, description: "Número de fila (1-10)" },
                nombre_presentacion: { type: Type.STRING, description: "Nombre y presentación del medicamento (ej: Paracetamol 100 mg)" },
                cantidad: { type: Type.STRING, description: "Cantidad (ej: 1 tableta)" },
                cada_cuanto: { type: Type.STRING, description: "Cada cuánto (ej: Cada 24 hrs)" },
                durante_cuanto_tiempo: { type: Type.STRING, description: "Durante cuánto tiempo (ej: Por un mes)" }
              }
            }
          },

          rehabilitacion_fisica: {
            type: Type.OBJECT,
            properties: {
              dias: { type: Type.STRING, description: "Días de rehabilitación física" },
              numero_sesiones: { type: Type.STRING, description: "Número de sesiones de rehabilitación" }
            }
          },

          enfermeria: {
            type: Type.OBJECT,
            properties: {
              dias_requeridos: { type: Type.STRING, description: "Días requeridos de servicio de enfermería" },
              turno_audit: {
                type: Type.OBJECT,
                description: "Auditoría visual de los 4 checkboxes de turno de enfermería. Llenar ANTES de construir el array turno.",
                properties: {
                  matutino_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'Matutino' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" },
                  vespertino_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'Vespertino' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" },
                  nocturno_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'Nocturno' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" },
                  veinticuatro_horas_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de '24 horas' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" }
                }
              },
              turno: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array construido desde turno_audit. Incluir nombre de cada turno cuyo _marcado sea true." },
              descripcion_actividades: { type: Type.STRING, description: "Descripción de actividades de enfermería" },
              justificacion_terapia: { type: Type.STRING, description: "En caso de terapia inmunológica, biológica, etc., justifique el tratamiento" },
              detalle_evolucion: { type: Type.STRING, description: "Detalle de evolución" }
            }
          },

          observaciones: {
            type: Type.OBJECT,
            properties: {
              observaciones: { type: Type.STRING, description: "Observaciones adicionales del médico" }
            }
          },

          plan_terapeutico: {
            type: Type.OBJECT,
            description: "Plan terapéutico a seguir. Sección nueva en formato AXA 2025.",
            properties: {
              tecnica_detallada: { type: Type.STRING, description: "Técnica detallada: explique en qué consiste la cirugía planeada" },
              tiempo_esperado_hospitalizacion: { type: Type.STRING, description: "Tiempo esperado de hospitalización de acuerdo con el procedimiento programado" }
            }
          },

          solicitud_material: {
            type: Type.ARRAY,
            description: "Solicitud de material o rentas de equipo. Tabla con hasta 15 filas. Solo incluir filas que tengan al menos un dato. Sección nueva en formato AXA 2025.",
            items: {
              type: Type.OBJECT,
              properties: {
                cantidad: { type: Type.STRING, description: "Cantidad del insumo o equipo" },
                insumo_equipo: { type: Type.STRING, description: "Nombre del insumo o equipo" },
                marca: { type: Type.STRING, description: "Marca del insumo o equipo" },
                distribuidor: { type: Type.STRING, description: "Distribuidor: Nombre o razón social" },
                rfc: { type: Type.STRING, description: "RFC del distribuidor" },
                correo_electronico: { type: Type.STRING, description: "Correo electrónico del distribuidor" }
              }
            }
          },

          medico_principal: {
            type: Type.OBJECT,
            properties: {
              ajusta_tabulador_audit: {
                type: Type.OBJECT,
                description: "Auditoría visual de los checkboxes de ¿Se ajusta a Tabulador médico?. Llenar ANTES de construir el array ajusta_tabulador.",
                properties: {
                  si_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'Sí' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" },
                  no_marcado: { type: Type.BOOLEAN, description: "¿El checkbox de 'No' tiene una marca visual? true = SÍ veo marca, false = casilla vacía" }
                }
              },
              ajusta_tabulador: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array construido desde ajusta_tabulador_audit. Sí/No según marca visual." },
              tipo_participacion: { type: Type.STRING, description: "Tipo de participación del médico" },
              nombre: { type: Type.STRING, description: "Nombre completo del médico principal" },
              especialidad: { type: Type.STRING },
              cedula_profesional: { type: Type.STRING },
              cedula_especialidad: { type: Type.STRING },
              rfc: { type: Type.STRING },
              domicilio: { type: Type.STRING },
              telefono: { type: Type.STRING },
              persona_moral_nombre_comun: { type: Type.STRING, description: "En caso de ser persona moral o pertenecer a un grupo médico: Nombre común" },
              persona_moral_razon_social: { type: Type.STRING, description: "En caso de ser persona moral o pertenecer a un grupo médico: Razón social" }
            }
          },

          anestesiologo: {
            type: Type.OBJECT,
            properties: {
              tipo_participacion: { type: Type.STRING, description: "Médico o especialista (Anestesiólogo)" },
              nombre: { type: Type.STRING, description: "Nombre completo del anestesiólogo" },
              especialidad: { type: Type.STRING },
              cedula_profesional: { type: Type.STRING },
              cedula_especialidad: { type: Type.STRING },
              rfc: { type: Type.STRING },
              domicilio: { type: Type.STRING },
              telefono: { type: Type.STRING },
              persona_moral_nombre_comun: { type: Type.STRING, description: "En caso de ser persona moral o pertenecer a un grupo médico: Nombre común" },
              persona_moral_razon_social: { type: Type.STRING, description: "En caso de ser persona moral o pertenecer a un grupo médico: Razón social" }
            }
          },

          ayudantes: {
            type: Type.OBJECT,
            properties: {
              ayudante_1_tipo: { type: Type.STRING, description: "Tipo de participación del ayudante 1" },
              ayudante_1_nombre: { type: Type.STRING, description: "Nombre del ayudante 1" },
              ayudante_2_tipo: { type: Type.STRING, description: "Tipo de participación del ayudante 2" },
              ayudante_2_nombre: { type: Type.STRING, description: "Nombre del ayudante 2" },
              otros_medicos: { type: Type.STRING, description: "Otros médicos participantes" }
            }
          },

          firma: {
            type: Type.OBJECT,
            properties: {
              firma_medico: { type: Type.STRING, description: "Firma del médico: 'Detectada' o 'No detectada'" },
              lugar_fecha: { type: Type.STRING, description: "Lugar y fecha de la firma" }
            }
          },

          aviso_privacidad: {
            type: Type.OBJECT,
            description: "Aviso de Privacidad simplificado en formato AXA 2025. Ya no hay secciones separadas de datos_personales y transferencia_datos.",
            properties: {
              firma_asegurado: { type: Type.STRING, description: "Firma del asegurado al final del aviso de privacidad: 'Detectada' o 'No detectada'" }
            }
          },

          metadata: {
            type: Type.OBJECT,
            properties: {
              existe_coherencia_clinica: { type: Type.BOOLEAN, description: "¿Existe coherencia clínica entre diagnóstico, tratamiento y medicamentos?" },
              observacion_coherencia: { type: Type.STRING, description: "Observaciones sobre la coherencia clínica" },
              tachaduras_detectadas: { type: Type.BOOLEAN, description: "¿Se detectaron tachaduras o correcciones en el documento?" },
              firma_coincide_con_tratante: { type: Type.BOOLEAN, description: "¿La firma coincide con el médico tratante declarado?" }
            }
          }
        },
        required: ['provider']
      }
    },
    required: ['extracted']
  }
};
