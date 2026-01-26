import { Type } from "./schema-types";
import { ProviderConfig } from "./types";

export const METLIFE_CONFIG: ProviderConfig = {
  id: 'METLIFE',
  name: 'metlife',
  displayName: 'MetLife México',
  
  theme: {
    primary: 'bg-blue-600',
    secondary: 'text-blue-600',
    border: 'border-blue-200',
    light: 'bg-blue-50',
    accent: 'blue'
  },

  identificationRules: [
    'Logotipo azul/blanco de MetLife',
    'Secciones numeradas del 1 al 7',
    'Campos de fecha fragmentados en casillas (Día/Mes/Año)',
    'Formulario titulado "Informe Médico" con logo MetLife'
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

⚠️ EJEMPLOS VISUALES DE LO QUE NO DEBES HACER:

🚫 CAUSA DE ATENCIÓN - Ejemplos de inferencias PROHIBIDAS:
❌ "El diagnóstico menciona diabetes" → causa_atencion = "Enfermedad" 
❌ "Hay trauma en el texto" → causa_atencion = "Accidente"
❌ "Menciona embarazo en antecedentes" → causa_atencion = "Embarazo"
❌ "Es un informe quirúrgico" → causa_atencion = "Enfermedad"
❌ "Dice 'Apendicitis Aguda'" → causa_atencion = "Enfermedad"
❌ "El paciente tiene una enfermedad" → causa_atencion = "Enfermedad"

🔴🔴🔴 CAUSA DE ATENCIÓN - AUDITORÍA VISUAL OBLIGATORIA (OBJETO causa_atencion_audit) 🔴🔴🔴

⚠️⚠️⚠️ IMPORTANTE: Este campo tiene 4 opciones de checkbox:
   Accidente □   Enfermedad □   Embarazo □   Segunda valoración □

DEBES llenar causa_atencion_audit ANTES de construir el array causa_atencion.

CÓMO LLENAR causa_atencion_audit:
1. accidente_marcado: ¿Veo X/✓/relleno en el checkbox de "Accidente"? → true/false
2. enfermedad_marcado: ¿Veo X/✓/relleno en el checkbox de "Enfermedad"? → true/false
3. embarazo_marcado: ¿Veo X/✓/relleno en el checkbox de "Embarazo"? → true/false
4. segunda_valoracion_marcado: ¿Veo X/✓/relleno en el checkbox de "Segunda valoración"? → true/false

CÓMO CONSTRUIR causa_atencion A PARTIR DE causa_atencion_audit:
- Si accidente_marcado = true → incluir "Accidente"
- Si enfermedad_marcado = true → incluir "Enfermedad"
- Si embarazo_marcado = true → incluir "Embarazo"
- Si segunda_valoracion_marcado = true → incluir "Segunda valoración"

📋 EJEMPLO 1 - NINGUNA MARCADA (TODAS LAS CASILLAS VACÍAS):
Si veo en el documento: Accidente ☐  Enfermedad ☐  Embarazo ☐  Segunda valoración ☐

causa_atencion_audit = {
  accidente_marcado: false,
  enfermedad_marcado: false,   ← NO hay marca
  embarazo_marcado: false,
  segunda_valoracion_marcado: false
}

causa_atencion = []  ← ARRAY VACÍO porque NINGUNA casilla tiene marca

📋 EJEMPLO 2 - UNA CASILLA MARCADA:
Si veo: Accidente ☒  Enfermedad ☐  Embarazo ☐  Segunda valoración ☐

causa_atencion_audit = {
  accidente_marcado: true,   ← tiene marca
  enfermedad_marcado: false,
  embarazo_marcado: false,
  segunda_valoracion_marcado: false
}

causa_atencion = ["Accidente"]

📋 EJEMPLO 3 - ENFERMEDAD MARCADA:
Si veo: Accidente ☐  Enfermedad ☒  Embarazo ☐  Segunda valoración ☐

causa_atencion_audit = {
  accidente_marcado: false,
  enfermedad_marcado: true,   ← tiene marca visible
  embarazo_marcado: false,
  segunda_valoracion_marcado: false
}

causa_atencion = ["Enfermedad"]

🚫 ERRORES CRÍTICOS QUE DEBES EVITAR:
❌ Ver todas las casillas vacías → inferir ["Enfermedad"] porque el diagnóstico es una enfermedad ← INCORRECTO
❌ Ver "diabetes" en el texto → marcar enfermedad_marcado = true ← INCORRECTO, NO INFERIR
❌ Ver "apendicitis aguda" → marcar enfermedad_marcado = true ← INCORRECTO, solo cuenta la marca visual
❌ No hay marca visible pero "tiene sentido" que sea enfermedad → marcar enfermedad_marcado = true ← INCORRECTO

✅ CORRECTO: Si NO VES una marca física (X, ✓, checkbox relleno) → el campo _marcado DEBE ser false

🚫 NO IMPORTA QUÉ DIGA EL DIAGNÓSTICO O EL CONTEXTO CLÍNICO.
🚫 SI NO VES UNA MARCA VISUAL CLARA (X, ✓, relleno), DEJA EL CAMPO VACÍO.

🔴🔴🔴 SEXO DEL PACIENTE - AUDITORÍA VISUAL OBLIGATORIA (OBJETO sexo_audit) 🔴🔴🔴

DEBES llenar sexo_audit ANTES de construir el array sexo.

CÓMO LLENAR sexo_audit:
1. masculino_marcado: ¿Veo X/✓/relleno en el checkbox de "Masculino"? → true/false
2. femenino_marcado: ¿Veo X/✓/relleno en el checkbox de "Femenino"? → true/false
3. otro_marcado: ¿Veo X/✓/relleno en el checkbox de "Otro"? → true/false

CÓMO CONSTRUIR sexo A PARTIR DE sexo_audit:
- Si masculino_marcado = true → incluir "Masculino"
- Si femenino_marcado = true → incluir "Femenino"
- Si otro_marcado = true → incluir "Otro"
- Si NINGUNO tiene marca → sexo = []

📋 EJEMPLO - MASCULINO MARCADO:
sexo_audit = { masculino_marcado: true, femenino_marcado: false, otro_marcado: false }
sexo = ["Masculino"]

📋 EJEMPLO - NINGUNO MARCADO:
sexo_audit = { masculino_marcado: false, femenino_marcado: false, otro_marcado: false }
sexo = []

🔴🔴🔴 TIPO DE ESTANCIA - AUDITORÍA VISUAL OBLIGATORIA (OBJETO tipo_estancia_audit) 🔴🔴🔴

DEBES llenar tipo_estancia_audit ANTES de construir el array tipo_estancia.

CÓMO LLENAR tipo_estancia_audit:
1. urgencia_marcado: ¿Veo X/✓/relleno en el checkbox de "Urgencia"? → true/false
2. ingreso_hospitalario_marcado: ¿Veo X/✓/relleno en el checkbox de "Ingreso hospitalario"? → true/false
3. corta_estancia_marcado: ¿Veo X/✓/relleno en el checkbox de "Corta estancia ambulatoria"? → true/false

CÓMO CONSTRUIR tipo_estancia A PARTIR DE tipo_estancia_audit:
- Si urgencia_marcado = true → incluir "Urgencia"
- Si ingreso_hospitalario_marcado = true → incluir "Ingreso hospitalario"
- Si corta_estancia_marcado = true → incluir "Corta estancia ambulatoria"
- Si NINGUNO tiene marca → tipo_estancia = []

📋 EJEMPLO:
Si veo: Urgencia ☐  Ingreso hospitalario ☒  Corta estancia ambulatoria ☐

tipo_estancia_audit = {
  urgencia_marcado: false,
  ingreso_hospitalario_marcado: true,
  corta_estancia_marcado: false
}

tipo_estancia = ["Ingreso hospitalario"]

🚫 OTROS CAMPOS - Ejemplos de inferencias PROHIBIDAS:
❌ "Es cirugía" → utilizo_equipo_especial = true
❌ "Menciona dolor postoperatorio" → presento_complicaciones = true
❌ "Dice 'se realizó laparoscopía'" → utilizo_equipo_especial = true

✅ SOLO extrae lo que VISUALMENTE esté marcado en casillas/checkboxes.

🔴🔴🔴 TIPO DE PADECIMIENTO - AUDITORÍA VISUAL OBLIGATORIA (OBJETO tipo_padecimiento_audit) 🔴🔴🔴

⚠️⚠️⚠️ IMPORTANTE: El tipo de padecimiento tiene DOS GRUPOS de checkboxes:
   GRUPO 1 (ORIGEN): Congénito □ vs Adquirido □  ← normalmente UNO está marcado
   GRUPO 2 (CURSO):  Agudo □ vs Crónico □        ← normalmente UNO está marcado

Es MUY COMÚN que haya DOS casillas marcadas (una de cada grupo). Por ejemplo: "Adquirido" + "Agudo"

Este campo acepta MÚLTIPLES casillas marcadas. DEBES llenar tipo_padecimiento_audit ANTES de construir el array.

ESTRUCTURA DEL DOCUMENTO METLIFE - CHECKBOXES A LA DERECHA DEL TEXTO:
┌──────────────────────────────────────────────────────────────────┐
│  b) Tipo de padecimiento:  Congénito □   Adquirido ☒   Agudo ☒   Crónico □  │
│                                                ↑           ↑                │
│                                          (marcado)    (marcado)             │
│                                          = AMBOS deben extraerse            │
└──────────────────────────────────────────────────────────────────┘

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

📋 EJEMPLO 1 - DOS CASILLAS MARCADAS:
Si veo en el documento: Congénito ☐  Adquirido ☒  Agudo ☒  Crónico ☐

tipo_padecimiento_audit = {
  congenito_marcado: false,
  adquirido_marcado: true,   ← tiene marca
  agudo_marcado: true,       ← tiene marca
  cronico_marcado: false
}

tipo_padecimiento = ["Adquirido", "Agudo"]  ← AMBOS incluidos

📋 EJEMPLO 2 - UNA CASILLA MARCADA:
Si veo: Congénito ☒  Adquirido ☐  Agudo ☐  Crónico ☐

tipo_padecimiento_audit = {
  congenito_marcado: true,
  adquirido_marcado: false,
  agudo_marcado: false,
  cronico_marcado: false
}

tipo_padecimiento = ["Congénito"]

📋 EJEMPLO 3 - NINGUNA MARCADA:
tipo_padecimiento_audit = { congenito_marcado: false, adquirido_marcado: false, agudo_marcado: false, cronico_marcado: false }
tipo_padecimiento = []

🚫 ERRORES COMUNES A EVITAR:
❌ Ver Adquirido ☒ y Agudo ☒ → extraer solo ["Agudo"] ← INCORRECTO, FALTA "Adquirido"
❌ Ver solo Adquirido ☒ → inferir ["Adquirido", "Crónico"] ← INCORRECTO, NO INFERIR
❌ Ignorar una de las marcas porque "no tiene sentido clínicamente" ← INCORRECTO
❌ Olvidar revisar el PRIMER grupo (Congénito/Adquirido) ← INCORRECTO, HAY QUE REVISAR AMBOS GRUPOS

⚠️ VERIFICACIÓN FINAL OBLIGATORIA:
Antes de finalizar, pregúntate:
1. ¿Revisé el checkbox de Congénito? ¿Tiene marca?
2. ¿Revisé el checkbox de Adquirido? ¿Tiene marca?
3. ¿Revisé el checkbox de Agudo? ¿Tiene marca?
4. ¿Revisé el checkbox de Crónico? ¿Tiene marca?

RECUERDA: tipo_padecimiento es un ARRAY que puede tener 0, 1, 2, 3 o 4 elementos según cuántas casillas estén marcadas. Lo más común es tener 2 elementos (uno de cada grupo).

🔴🔴🔴 REGLAS CRÍTICAS PARA EXTRACCIÓN DE FECHAS 🔴🔴🔴

⚠️ PROBLEMA COMÚN DE OCR: Las diagonales "/" pueden confundirse con el número "1"
⚠️ DEBES identificar correctamente los SEPARADORES de fecha vs los DÍGITOS

📋 FORMATO DE SALIDA OBLIGATORIO:
- TODAS las fechas deben normalizarse a formato DD/MM/AAAA
- Si el día tiene 1 dígito → agregar 0 adelante (ej: 5 → 05)
- Si el mes tiene 1 dígito → agregar 0 adelante (ej: 3 → 03)
- Si el año tiene 2 dígitos → convertir a 4 dígitos (ej: 25 → 2025, 99 → 1999)

📋 ESTRUCTURA DEL FORMULARIO METLIFE PARA FECHAS:
El formulario MetLife tiene campos de fecha con CASILLAS SEPARADAS:
   ┌─────────────────────────────────────────┐
   │    ___  │  ___  │  _______             │
   │    Día  │  Mes  │   Año                │
   └─────────────────────────────────────────┘

⚠️ Las líneas verticales "|" son SEPARADORES DE COLUMNA, NO son parte de la fecha.
⚠️ Debes COMBINAR los valores de las 3 casillas en formato DD/MM/AAAA.

📋 CÓMO EXTRAER FECHAS EN METLIFE:
1. Lee el valor de la casilla "Día" → puede ser 1-2 dígitos
2. Lee el valor de la casilla "Mes" → puede ser 1-2 dígitos
3. Lee el valor de la casilla "Año" → puede ser 2-4 dígitos
4. COMBINA en formato: DD/MM/AAAA (agregando ceros y convirtiendo año si es necesario)

📋 EJEMPLOS DE EXTRACCIÓN METLIFE:
- Día: "5", Mes: "3", Año: "2025" → extraer como: "05/03/2025"
- Día: "15", Mes: "1", Año: "25" → extraer como: "15/01/2025"
- Día: "31", Mes: "12", Año: "2025" → extraer como: "31/12/2025"

⚠️ REGLA CRÍTICA: NO confundas separadores visuales con el número "1"
- Si ves algo que parece "111/2025" cuando el mes debería ser visible → revisa si son "11" con "/" separador
- Los separadores "|" del formulario NO son parte de los números

📋 FORMATOS DE ENTRADA QUE PUEDES ENCONTRAR (todos válidos):
- DD/MM/AAAA → normalizar a DD/MM/AAAA
- D/MM/AAAA → agregar 0 al día
- DD/M/AAAA → agregar 0 al mes
- D/M/AAAA → agregar 0 a día y mes
- DD/MM/AA → convertir año a 4 dígitos (20XX)
- D/M/AA → agregar ceros y convertir año

📋 CÓMO INTERPRETAR FECHAS EN METLIFE:

⚠️ REGLA CRÍTICA: MetLife tiene CASILLAS SEPARADAS para Día, Mes y Año.
Los separadores visuales (líneas verticales) NO son parte de los números.

PROCESO DE INTERPRETACIÓN:
1. Lee el contenido de CADA CASILLA por separado
2. Ignora las líneas divisorias entre casillas
3. Combina los valores: DÍA + "/" + MES + "/" + AÑO

📋 EJEMPLO VISUAL:
Si las casillas muestran: [05] | [12] | [2025]
El OCR puede confundirse con las líneas divisorias.

Para interpretar correctamente:
- Lee cada casilla independientemente
- Casilla Día = 05, Casilla Mes = 12, Casilla Año = 2025
- La fecha es: 05/12/2025 (5 de diciembre de 2025)

⚠️ NO asumas valores. Lee EXACTAMENTE lo que está en cada casilla.

🔴 VALIDACIÓN OBLIGATORIA:
- El día NUNCA puede ser mayor a 31
- El mes NUNCA puede ser mayor a 12
- Si extraes un mes > 12, probablemente confundiste una "/" con "1"

INSTRUCCIONES DE EXTRACCIÓN PARA METLIFE (ALTA PRIORIDAD):

🔴🔴🔴 CABECERA (Lugar y Fecha) - PÁGINA 1, ANTES DE DATOS DEL PACIENTE 🔴🔴🔴
⚠️ UBICACIÓN: Esta sección está JUSTO ANTES de "1. Datos del paciente" en la parte superior de la página 1.
⚠️ Busca el texto "Lugar y fecha:" seguido de espacios para escribir.

ESTRUCTURA VISUAL:
┌─────────────────────────────────────────────────────────────────────────┐
│ Lugar y fecha: ________________  │  ___  │  ___  │  _____              │
│                  (lugar)           (Día)   (Mes)   (Año)               │
└─────────────────────────────────────────────────────────────────────────┘

CAMPOS A EXTRAER EN firma.lugar Y firma.fecha:
- firma.lugar: El texto escrito después de "Lugar y fecha:" (ej: "Cdad de México", "Guadalajara")
- firma.fecha: Combina las casillas de Día, Mes y Año en formato "DD/MM/AAAA" (ej: "18/12/2025")
  - Si las casillas están vacías → dejar firma.fecha vacío

EJEMPLO:
Si ves: "Lugar y fecha: Cdad de México  18 | 12 | 2025"
Entonces: firma.lugar = "Cdad de México", firma.fecha = "18/12/2025"

SECCIÓN 1 - DATOS DEL PACIENTE:
- nombre_completo: Nombre completo del paciente
- sexo: Masculino, Femenino u Otro (busca casillas marcadas)
- edad: Edad del paciente
- causa_atencion: Accidente, Enfermedad, Embarazo o Segunda valoración
- peso: Peso en kg
- talla: Talla/altura
- fecha_primera_atencion: Fecha en que atendió por primera vez al paciente

SECCIÓN 2 - ANTECEDENTES CLÍNICOS:
- historia_clinica_breve: Historia clínica breve
- personales_patologicos: Antecedentes personales patológicos
- antecedentes_quirurgicos: Antecedentes quirúrgicos
- gineco_g, gineco_p, gineco_a, gineco_c: Antecedentes gineco-obstétricos (G=Gestaciones, P=Partos, A=Abortos, C=Cesáreas)
- otras_afecciones: Afecciones que padezca sin relación con la reclamación actual

SECCIÓN 3 - PADECIMIENTO ACTUAL:
- descripcion: Principales signos, síntomas y detalle de evolución
- fecha_inicio: Fecha de inicio de principales signos y síntomas
- tipo_padecimiento: Congénito, Adquirido, Agudo o Crónico
- tiempo_evolucion: Tiempo de evolución del padecimiento
- causa_etiologia: Causa/etiología del padecimiento
- exploracion_fisica_resultados: Resultados de exploración física, estudios de laboratorio y gabinete
- diagnostico_definitivo: Diagnóstico etiológico definitivo
- codigo_cie: Código CIE-10
- fecha_diagnostico: Fecha de diagnóstico
- fecha_inicio_tratamiento: Fecha de inicio de tratamiento
- relacionado_con_otro: ¿Se ha relacionado con otro padecimiento? (Sí/No)
- especifique_cual: Si se relaciona, especificar cuál
- intervencion_descripcion: Tratamiento y/o intervención quirúrgica (CPT)
- tecnica_quirurgica: Descripción de la técnica quirúrgica
- utilizo_equipo_especial: ¿Utilizó equipo especial? (Sí/No)
- detalle_equipo_especial: Detallar equipo especial
- utilizo_insumos: ¿Utilizó insumos y/o materiales? (Sí/No)
- detalle_insumos: Detallar insumos y materiales
- complicaciones_descripcion: Complicaciones presentadas
- estado_actual: Estado actual del paciente
- seguira_tratamiento: ¿El paciente seguirá recibiendo tratamiento? (Sí/No)
- plan_tratamiento: Descripción del tratamiento y duración
- fecha_probable_alta: Fecha probable de alta o prealta

SECCIÓN 4 - HOSPITALIZACIÓN:
- nombre_hospital: Nombre del hospital
- tipo_estancia: Tipo de ingreso (Urgencia, Ingreso hospitalario, Corta estancia/ambulatoria)
- fecha_ingreso: Fecha de ingreso
- fecha_intervencion: Fecha de intervención
- fecha_egreso: Fecha de egreso

SECCIÓN 5 - OBSERVACIONES ADICIONALES:
- observaciones: Comentarios adicionales

SECCIÓN 6 - EQUIPO QUIRÚRGICO:
Para cada miembro del equipo (Anestesiólogo, Primer Ayudante, Otro 1, Otro 2):
- nombre: Nombre completo
- cedula_especialidad: Cédula profesional de especialidad
- celular: Número celular
- rfc: Registro Federal de Contribuyentes
- email: Correo electrónico
- especialidad: Solo para "Otro" - tipo de participación/especialidad

SECCIÓN 6 - DATOS DEL MÉDICO (ESTRUCTURA VISUAL):

⚠️ IMPORTANTE: Esta sección tiene 8 FILAS con distribución específica. Extrae SOLO lo que esté visible.

🔴🔴🔴 PASO OBLIGATORIO: AUDITORÍA VISUAL DE CHECKBOXES (OBJETO tipo_atencion_audit) 🔴🔴🔴

DEBES llenar el objeto tipo_atencion_audit ANTES de construir el array tipo_atencion.

Para CADA checkbox, responde la pregunta: "¿VEO una marca visual en esta casilla específica?"

ESTRUCTURA DEL DOCUMENTO METLIFE - CHECKBOXES A LA DERECHA:
   "Médico tratante" [☐]    "Cirujano principal" [☐]    "Interconsultante" [☐]    "Equipo quirúrgico" [☐]    "Segunda valoración" [☐]
                     ↑                          ↑                         ↑                        ↑                          ↑
               (checkbox)                 (checkbox)                 (checkbox)              (checkbox)                  (checkbox)

CÓMO LLENAR tipo_atencion_audit:
1. medico_tratante_marcado: ¿Veo X/✓/relleno en el checkbox de "Médico tratante"? → true/false
2. cirujano_principal_marcado: ¿Veo X/✓/relleno en el checkbox de "Cirujano principal"? → true/false
3. interconsultante_marcado: ¿Veo X/✓/relleno en el checkbox de "Interconsultante"? → true/false
   🚨 Si la casilla está VACÍA → DEBE ser false. El contexto clínico NO cuenta.
4. equipo_quirurgico_marcado: ¿Veo X/✓/relleno en el checkbox de "Equipo quirúrgico"? → true/false
5. segunda_valoracion_marcado: ¿Veo X/✓/relleno en el checkbox de "Segunda valoración"? → true/false

CÓMO CONSTRUIR tipo_atencion A PARTIR DE tipo_atencion_audit:
- Si medico_tratante_marcado = true → incluir "Médico tratante"
- Si cirujano_principal_marcado = true → incluir "Cirujano principal"
- Si interconsultante_marcado = true → incluir "Interconsultante"
- Si interconsultante_marcado = false → NO incluir "Interconsultante"
- (igual para los demás)

EJEMPLO:
Si veo en el documento: Médico tratante ☒  Cirujano principal ☒  Interconsultante ☐

tipo_atencion_audit = {
  medico_tratante_marcado: true,
  cirujano_principal_marcado: true,
  interconsultante_marcado: false,  ← casilla vacía
  equipo_quirurgico_marcado: false,
  segunda_valoracion_marcado: false
}

tipo_atencion = ["Médico tratante", "Cirujano principal"]  ← SIN Interconsultante

📋 FILA 2: NOMBRE Y ESPECIALIDAD (DOS COLUMNAS)
┌──────────────────────────────┬──────────────────────────────┐
│ Nombre completo (línea)      │ Especialidad (línea)         │
│ ___________________________  │ ___________________________  │
└──────────────────────────────┴──────────────────────────────┘

Campos a extraer:
- nombres: Nombre completo del médico (columna izquierda)
- especialidad: Especialidad médica (columna derecha)

🔴🔴🔴 PASO OBLIGATORIO: EXTRACCIÓN SECUENCIAL POR ETIQUETA 🔴🔴🔴

Para evitar confusión entre campos, DEBES seguir las ETIQUETAS del formulario EN ORDEN:

PASO 1 - Busca la etiqueta "Domicilio consultorio" → extrae el texto de esa línea → domicilio_consultorio
PASO 2 - Busca la etiqueta "Teléfono del consultorio" → extrae las cuadrículas de ESA MISMA FILA → telefono_consultorio
         ⚠️ Si las cuadrículas están vacías o no tienen dígitos → telefono_consultorio = ""
PASO 3 - Busca la etiqueta "Cédula profesional especialidad" → extrae el número → cedula_profesional  
PASO 4 - Busca la etiqueta "Número celular" → extrae las cuadrículas de ESA FILA → celular
PASO 5 - Busca la etiqueta "Registro Federal de Contribuyentes" → extrae las cuadrículas → rfc

📋 FILA 3: DOMICILIO Y TELÉFONO CONSULTORIO
┌─────────────────────────────────────┬──────────────────────────────────────┐
│ ETIQUETA: "Domicilio consultorio"   │ ETIQUETA: "Teléfono del consultorio" │
│ (línea para escribir texto)         │ (cuadrículas - pueden estar VACÍAS)  │
│ Ej: "Av. Insurgentes"               │ Ej: [_][_][_][_][_][_][_][_][_][_]   │
└─────────────────────────────────────┴──────────────────────────────────────┘

Campos de FILA 3:
- domicilio_consultorio: Texto bajo "Domicilio consultorio"
- telefono_consultorio: Dígitos bajo "Teléfono del consultorio". Si cuadrículas vacías → ""

📋 FILA 4: CÉDULA, CELULAR Y RFC (ES UNA FILA DIFERENTE, MÁS ABAJO)
┌────────────────────────────────┬────────────────────────────────┬────────────────────────────────┐
│ ETIQUETA: "Cédula profesional  │ ETIQUETA: "Número celular"     │ ETIQUETA: "Registro Federal    │
│ especialidad"                  │                                │ de Contribuyentes"             │
│ (7-8 dígitos, línea continua)  │ (10 dígitos en cuadrículas)    │ (13 caracteres alfanuméricos)  │
│ Ej: "9876543"                  │ Ej: [5][5][5][1][1][1][2][2]...│ Ej: [G][O][H][M][7][5][0]...   │
└────────────────────────────────┴────────────────────────────────┴────────────────────────────────┘

Campos de FILA 4:
- cedula_profesional: Número bajo "Cédula profesional especialidad" (7-8 dígitos)
- celular: Dígitos bajo "Número celular" (10 dígitos en cuadrículas)
- rfc: Caracteres bajo "Registro Federal de Contribuyentes" (13 caracteres)

🚨🚨🚨 ERROR CRÍTICO QUE DEBES EVITAR 🚨🚨🚨

❌ INCORRECTO: Poner el valor de "Número celular" (5551112222) en telefono_consultorio
❌ INCORRECTO: Dejar celular vacío cuando hay dígitos bajo "Número celular"

✅ CORRECTO: 
- Si "Teléfono del consultorio" (FILA 3) está vacío → telefono_consultorio = ""
- Si "Número celular" (FILA 4) tiene dígitos (5551112222) → celular = "5551112222"

RECUERDA: "Teléfono del consultorio" y "Número celular" son DOS CAMPOS DIFERENTES en FILAS DIFERENTES.
Sigue las ETIQUETAS, no asumas qué valor va en qué campo.

📋 FILA 5: CORREO ELECTRÓNICO (LÍNEA COMPLETA)
┌────────────────────────────────────────────────────────────┐
│ Correo electrónico                                         │
│ _____________________  @  ___________________________      │
└────────────────────────────────────────────────────────────┘

Campo a extraer:
- correo_electronico: Email completo (línea continua separada por @)

📋 FILA 6: CONVENIO CON ASEGURADORA (CHECKBOXES)
¿Tiene convenio con la aseguradora?    ☐ Sí    ☐ No

Campo a extraer:
- convenio_aseguradora: true si "Sí" está marcado, false si "No" está marcado, null si ambos vacíos

📋 FILA 7: ACEPTACIÓN DE TABULADORES (CHECKBOXES)
¿Acepta los tabuladores de pago directo?    ☐ Sí    ☐ No

Campo a extraer:
- se_ajusta_tabulador: true si "Sí" está marcado, false si "No" está marcado, null si ambos vacíos

📋 FILA 8: PRESUPUESTO DE HONORARIOS (CINCO COLUMNAS NUMÉRICAS)
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│ Cirujano │Anestesió.│ Primer   │ Otro 1   │ Otro 2   │
│          │          │ Ayudante │          │          │
│ $_______ │ $_______ │ $_______ │ $_______ │ $_______ │
└──────────┴──────────┴──────────┴──────────┴──────────┘

Campos a extraer:
- honorarios_cirujano: Presupuesto honorarios cirujano
- honorarios_anestesiologo: Presupuesto honorarios anestesiólogo
- honorarios_ayudante: Presupuesto honorarios primer ayudante
- honorarios_otro_1: Presupuesto honorarios otro 1
- honorarios_otro_2: Presupuesto honorarios otro 2

⚠️ REGLAS DE EXTRACCIÓN PARA ESTA SECCIÓN:
1. Respeta la estructura de filas: no mezcles campos de diferentes filas
2. Para campos con cuadrículas: extrae dígito por dígito si están visibles
3. Para campos con líneas continuas: extrae el texto completo
4. Para checkboxes: SOLO marca true si VES una X, ✓ o relleno visual
5. Si un campo está vacío en el documento → déjalo vacío en el JSON

SECCIÓN 7 - FIRMA:
- lugar: Lugar de la firma
- fecha: Fecha de la firma
- nombre_firma: Nombre completo y firma del médico tratante

METADATA (AUDITORÍA VISUAL DEL DOCUMENTO):
- tachaduras_detectadas: ¿Hay tachaduras, corrector, enmendaduras o borraduras visibles en el documento? (true/false)
- uniformidad_tinta: ¿Todo el documento fue llenado con una sola tinta/mismo color de escritura en los espacios que llena el médico? true = uniforme, false = múltiples tintas/colores detectados en los espacios llenados, NO en el formulario como tal, únicamente en los espacios que el médico llenó y que estás extrayendo.
- firma_coincide_con_tratante: ¿El nombre en la firma coincide con el médico tratante declarado en el formulario? (true/false)
`,

  requiredFields: [
    'identificacion.nombres',
    'identificacion.edad',
    'identificacion.sexo',
    'diagnostico.diagnostico_definitivo',
    'medico_tratante.nombres',
    'medico_tratante.rfc',
    'firma.nombre_firma'
  ],

  geminiSchema: {
    type: Type.OBJECT,
    properties: {
      extracted: {
        type: Type.OBJECT,
        properties: {
          provider: { type: Type.STRING, description: "METLIFE" },
          
          firma: {
            type: Type.OBJECT,
            properties: {
              lugar: { type: Type.STRING, description: "Lugar de la firma (cabecera)" },
              fecha: { type: Type.STRING, description: "Fecha en formato DD/MM/AAAA" },
              nombre_firma: { type: Type.STRING, description: "Nombre completo del médico que firma" },
              firma_autografa_detectada: { type: Type.BOOLEAN, description: "¿Se detectó una firma autógrafa (no solo nombre impreso)?" }
            }
          },

          identificacion: {
            type: Type.OBJECT,
            properties: {
              nombres: { type: Type.STRING, description: "Nombre completo del paciente" },
              sexo_audit: {
                type: Type.OBJECT,
                description: "🔴 OBLIGATORIO: Antes de llenar sexo, DEBES verificar CADA checkbox individualmente. Responde true SOLO si VES una marca visual (X, ✓, relleno) EN ESA casilla específica.",
                properties: {
                  masculino_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "¿El checkbox de 'Masculino' tiene una marca visual (X/✓/relleno)? true = SÍ veo marca, false = NO veo marca o casilla vacía" 
                  },
                  femenino_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "¿El checkbox de 'Femenino' tiene una marca visual (X/✓/relleno)? true = SÍ veo marca, false = NO veo marca o casilla vacía" 
                  },
                  otro_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "¿El checkbox de 'Otro' tiene una marca visual (X/✓/relleno)? true = SÍ veo marca, false = NO veo marca o casilla vacía" 
                  }
                }
              },
              sexo: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Array construido a partir de sexo_audit: SOLO incluye los valores donde el campo _marcado correspondiente es true. Si masculino_marcado=true → ['Masculino']. Si NINGUNO tiene marca → []"
              },
              edad: { type: Type.STRING, description: "Edad del paciente" },
              causa_atencion_audit: {
                type: Type.OBJECT,
                description: "🔴 OBLIGATORIO: Antes de llenar causa_atencion, DEBES verificar CADA checkbox individualmente. Responde true SOLO si VES una marca visual (X, ✓, relleno) EN ESA casilla específica. NO inferir basándose en el diagnóstico o contexto clínico.",
                properties: {
                  accidente_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "¿El checkbox de 'Accidente' tiene una marca visual (X/✓/relleno)? true = SÍ veo marca, false = NO veo marca o casilla vacía. NO inferir del texto." 
                  },
                  enfermedad_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "🚨 CRÍTICO: ¿El checkbox de 'Enfermedad' tiene una marca visual (X/✓/relleno)? true = SÍ veo marca física, false = casilla vacía. NO marcar true solo porque el diagnóstico menciona una enfermedad. SOLO cuenta la marca visual." 
                  },
                  embarazo_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "¿El checkbox de 'Embarazo' tiene una marca visual (X/✓/relleno)? true = SÍ veo marca, false = NO veo marca o casilla vacía. NO inferir del texto." 
                  },
                  segunda_valoracion_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "¿El checkbox de 'Segunda valoración' tiene una marca visual (X/✓/relleno)? true = SÍ veo marca, false = NO veo marca o casilla vacía" 
                  }
                }
              },
              causa_atencion: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Array construido a partir de causa_atencion_audit: SOLO incluye los valores donde el campo _marcado correspondiente es true. Si enfermedad_marcado=false → NO incluir 'Enfermedad'. Si TODOS son false → array vacío []" 
              },
              peso: { type: Type.STRING, description: "Peso del paciente en kg" },
              talla: { type: Type.STRING, description: "Talla/altura del paciente" },
              fecha_primera_atencion: { type: Type.STRING, description: "Fecha de primera atención DD/MM/AAAA" }
            }
          },

          antecedentes: {
            type: Type.OBJECT,
            properties: {
              historia_clinica_breve: { type: Type.STRING, description: "Historia clínica breve" },
              personales_patologicos: { type: Type.STRING, description: "Antecedentes personales patológicos" },
              antecedentes_quirurgicos: { type: Type.STRING, description: "Antecedentes quirúrgicos" },
              gineco_g: { type: Type.STRING, description: "Gestaciones" },
              gineco_p: { type: Type.STRING, description: "Partos" },
              gineco_a: { type: Type.STRING, description: "Abortos" },
              gineco_c: { type: Type.STRING, description: "Cesáreas" },
              gineco_descripcion: { type: Type.STRING, description: "Descripción adicional gineco-obstétrica" },
              otras_afecciones: { type: Type.STRING, description: "Otras afecciones sin relación con reclamación" }
            }
          },

          padecimiento_actual: {
            type: Type.OBJECT,
            properties: {
              descripcion: { type: Type.STRING, description: "Signos, síntomas y evolución" },
              fecha_inicio: { type: Type.STRING, description: "Fecha inicio síntomas DD/MM/AAAA" },
              tipo_padecimiento_audit: {
                type: Type.OBJECT,
                description: "🔴 OBLIGATORIO: Antes de llenar tipo_padecimiento, DEBES verificar CADA checkbox individualmente. En MetLife, los checkboxes están A LA DERECHA del texto. Responde true SOLO si VES una marca visual (X, ✓, relleno) EN ESA casilla específica.",
                properties: {
                  congenito_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "¿El checkbox A LA DERECHA de 'Congénito' tiene una marca visual (X/✓/relleno)? true = SÍ veo marca, false = NO veo marca o casilla vacía" 
                  },
                  adquirido_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "¿El checkbox A LA DERECHA de 'Adquirido' tiene una marca visual (X/✓/relleno)? true = SÍ veo marca, false = NO veo marca o casilla vacía" 
                  },
                  agudo_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "¿El checkbox A LA DERECHA de 'Agudo' tiene una marca visual (X/✓/relleno)? true = SÍ veo marca, false = NO veo marca o casilla vacía" 
                  },
                  cronico_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "¿El checkbox A LA DERECHA de 'Crónico' tiene una marca visual (X/✓/relleno)? true = SÍ veo marca, false = NO veo marca o casilla vacía" 
                  }
                }
              },
              tipo_padecimiento: { 
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array construido a partir de tipo_padecimiento_audit: SOLO incluye los valores donde el campo _marcado correspondiente es true. Si adquirido_marcado=true y agudo_marcado=true → ['Adquirido', 'Agudo']"
              },
              tiempo_evolucion: { type: Type.STRING, description: "Tiempo de evolución" },
              causa_etiologia: { type: Type.STRING, description: "Causa/etiología del padecimiento" },
              estado_actual: { type: Type.STRING, description: "Estado actual del paciente" },
              seguira_tratamiento: { type: Type.BOOLEAN, description: "¿Seguirá recibiendo tratamiento?" },
              plan_tratamiento: { type: Type.STRING, description: "Descripción tratamiento y duración" },
              fecha_probable_alta: { type: Type.STRING, description: "Fecha probable de alta DD/MM/AAAA" }
            }
          },

          exploracion_fisica: {
            type: Type.OBJECT,
            properties: {
              resultados: { type: Type.STRING, description: "Resultados exploración física, laboratorio y gabinete" },
              estudios_laboratorio_gabinete: { type: Type.STRING, description: "Estudios de laboratorio y gabinete practicados" }
            }
          },

          diagnostico: {
            type: Type.OBJECT,
            properties: {
              diagnostico_definitivo: { type: Type.STRING, description: "Diagnóstico etiológico definitivo" },
              codigo_cie: { type: Type.STRING, description: "Código CIE-10" },
              fecha_diagnostico: { type: Type.STRING, description: "Fecha de diagnóstico DD/MM/AAAA" },
              fecha_inicio_tratamiento: { type: Type.STRING, description: "Fecha inicio tratamiento DD/MM/AAAA" },
              relacionado_con_otro: { type: Type.BOOLEAN, description: "¿Relacionado con otro padecimiento?" },
              especifique_cual: { type: Type.STRING, description: "Especificar padecimiento relacionado" },
              cie_coherente_con_texto: { type: Type.BOOLEAN, description: "¿CIE-10 coherente con diagnóstico?" },
              explicacion_incoherencia_cie: { type: Type.STRING, description: "Explicación si hay incoherencia" }
            }
          },

          intervencion_qx: {
            type: Type.OBJECT,
            properties: {
              equipo_especifico: { type: Type.STRING, description: "Tratamiento/intervención quirúrgica (CPT)" },
              tecnica: { type: Type.STRING, description: "Descripción de la técnica quirúrgica" },
              utilizo_equipo_especial: { type: Type.BOOLEAN, description: "¿Utilizó equipo especial?" },
              detalle_equipo_especial: { type: Type.STRING, description: "Detalle del equipo especial" },
              utilizo_insumos: { type: Type.BOOLEAN, description: "¿Utilizó insumos/materiales?" },
              detalle_insumos: { type: Type.STRING, description: "Detalle de insumos y materiales" }
            }
          },

          complicaciones: {
            type: Type.OBJECT,
            properties: {
              presento_complicaciones: { type: Type.BOOLEAN, description: "¿Se presentaron complicaciones?" },
              descripcion: { type: Type.STRING, description: "Descripción de complicaciones" }
            }
          },

          hospital: {
            type: Type.OBJECT,
            properties: {
              nombre_hospital: { type: Type.STRING, description: "Nombre del hospital" },
              tipo_estancia_audit: {
                type: Type.OBJECT,
                description: "🔴 OBLIGATORIO: Antes de llenar tipo_estancia, DEBES verificar CADA checkbox individualmente. Responde true SOLO si VES una marca visual (X, ✓, relleno) EN ESA casilla específica.",
                properties: {
                  urgencia_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "¿El checkbox de 'Urgencia' tiene una marca visual (X/✓/relleno)? true = SÍ veo marca, false = NO veo marca o casilla vacía" 
                  },
                  ingreso_hospitalario_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "¿El checkbox de 'Ingreso hospitalario' tiene una marca visual (X/✓/relleno)? true = SÍ veo marca, false = NO veo marca o casilla vacía" 
                  },
                  corta_estancia_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "¿El checkbox de 'Corta estancia ambulatoria' tiene una marca visual (X/✓/relleno)? true = SÍ veo marca, false = NO veo marca o casilla vacía" 
                  }
                }
              },
              tipo_estancia: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Array construido a partir de tipo_estancia_audit: SOLO incluye los valores donde el campo _marcado correspondiente es true. Si NINGUNO tiene marca → []" 
              },
              fecha_ingreso: { type: Type.STRING, description: "Fecha de ingreso DD/MM/AAAA" },
              fecha_intervencion: { type: Type.STRING, description: "Fecha de intervención DD/MM/AAAA" },
              fecha_egreso: { type: Type.STRING, description: "Fecha de egreso DD/MM/AAAA" }
            }
          },

          info_adicional: {
            type: Type.OBJECT,
            properties: {
              descripcion: { type: Type.STRING, description: "Observaciones y comentarios adicionales" }
            }
          },

          equipo_quirurgico_metlife: {
            type: Type.OBJECT,
            properties: {
              anestesiologo: {
                type: Type.OBJECT,
                properties: {
                  nombre: { type: Type.STRING },
                  cedula_especialidad: { type: Type.STRING },
                  celular: { type: Type.STRING },
                  rfc: { type: Type.STRING },
                  email: { type: Type.STRING }
                }
              },
              primer_ayudante: {
                type: Type.OBJECT,
                properties: {
                  nombre: { type: Type.STRING },
                  cedula_especialidad: { type: Type.STRING },
                  celular: { type: Type.STRING },
                  rfc: { type: Type.STRING },
                  email: { type: Type.STRING }
                }
              },
              otro_1: {
                type: Type.OBJECT,
                properties: {
                  nombre: { type: Type.STRING },
                  cedula_especialidad: { type: Type.STRING },
                  celular: { type: Type.STRING },
                  rfc: { type: Type.STRING },
                  email: { type: Type.STRING },
                  especialidad: { type: Type.STRING, description: "Tipo de participación/especialidad" }
                }
              },
              otro_2: {
                type: Type.OBJECT,
                properties: {
                  nombre: { type: Type.STRING },
                  cedula_especialidad: { type: Type.STRING },
                  celular: { type: Type.STRING },
                  rfc: { type: Type.STRING },
                  email: { type: Type.STRING },
                  especialidad: { type: Type.STRING, description: "Tipo de participación/especialidad" }
                }
              }
            }
          },

          metadata: {
            type: Type.OBJECT,
            description: "Información de auditoría visual del documento",
            properties: {
              tachaduras_detectadas: { 
                type: Type.BOOLEAN, 
                description: "¿Se detectaron tachaduras, corrector, enmendaduras o borraduras en el documento?" 
              },
              uniformidad_tinta: { 
                type: Type.BOOLEAN, 
                description: "¿Todo el documento fue llenado con una sola tinta/mismo color de escritura? true = uniforme, false = múltiples tintas detectadas" 
              },
              firma_coincide_con_tratante: {
                type: Type.BOOLEAN,
                description: "¿El nombre en la firma coincide con el médico tratante declarado?"
              }
            }
          },

          medico_tratante: {
            type: Type.OBJECT,
            properties: {
              tipo_atencion_audit: {
                type: Type.OBJECT,
                description: "🔴 OBLIGATORIO: Antes de llenar tipo_atencion, DEBES verificar CADA checkbox individualmente. Para cada uno, responde: ¿VEO una marca visual (X, ✓, relleno) EN EL CHECKBOX que está A LA DERECHA de este texto? Responde true SOLO si la casilla tiene marca visible. En MetLife los checkboxes están A LA DERECHA del texto.",
                properties: {
                  medico_tratante_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "¿El checkbox A LA DERECHA de 'Médico tratante' tiene una marca visual (X/✓/relleno)? true = SÍ veo marca, false = NO veo marca o casilla vacía" 
                  },
                  cirujano_principal_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "¿El checkbox A LA DERECHA de 'Cirujano principal' tiene una marca visual (X/✓/relleno)? true = SÍ veo marca, false = NO veo marca o casilla vacía" 
                  },
                  interconsultante_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "🚨 CRÍTICO: ¿El checkbox A LA DERECHA de 'Interconsultante' tiene una marca visual? Si la casilla está VACÍA → false. El hecho de que sea cirugía NO significa que esté marcado. SOLO true si VES físicamente una X, ✓ o relleno EN ESA casilla específica." 
                  },
                  equipo_quirurgico_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "¿El checkbox A LA DERECHA de 'Equipo quirúrgico' tiene una marca visual (X/✓/relleno)? true = SÍ veo marca, false = NO veo marca o casilla vacía" 
                  },
                  segunda_valoracion_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "¿El checkbox A LA DERECHA de 'Segunda valoración' tiene una marca visual (X/✓/relleno)? true = SÍ veo marca, false = NO veo marca o casilla vacía" 
                  }
                }
              },
              tipo_atencion: { 
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array construido a partir de tipo_atencion_audit: SOLO incluye los valores donde el campo _marcado correspondiente es true. Si interconsultante_marcado es false → NO incluir 'Interconsultante' en este array."
              },
              nombres: { type: Type.STRING, description: "FILA 2 - Buscar etiqueta 'Nombre completo' - Nombre del médico" },
              especialidad: { type: Type.STRING, description: "FILA 2 - Buscar etiqueta 'Especialidad' - Especialidad médica" },
              domicilio_consultorio: { type: Type.STRING, description: "FILA 3 - Buscar etiqueta 'Domicilio consultorio' - Dirección del consultorio" },
              telefono_consultorio: { type: Type.STRING, description: "FILA 3 - Buscar etiqueta 'Teléfono del consultorio' - Cuadrículas en la MISMA fila que domicilio. Si cuadrículas vacías → ''. NO CONFUNDIR con 'Número celular' que está en FILA 4." },
              cedula_profesional: { type: Type.STRING, description: "FILA 4 - Buscar etiqueta 'Cédula profesional especialidad' - Número de 7-8 dígitos" },
              cedula_especialidad: { type: Type.STRING, description: "Mismo valor que cedula_profesional" },
              celular: { type: Type.STRING, description: "FILA 4 - Buscar etiqueta 'Número celular' - Cuadrículas de 10 dígitos (ej: 5551112222). Este es DIFERENTE de 'Teléfono del consultorio'. Si hay dígitos bajo esta etiqueta → extraerlos aquí." },
              rfc: { type: Type.STRING, description: "FILA 4 - Buscar etiqueta 'Registro Federal de Contribuyentes' - 13 caracteres alfanuméricos" },
              correo_electronico: { type: Type.STRING, description: "Correo electrónico" },
              convenio_aseguradora: { type: Type.BOOLEAN, description: "¿Tiene convenio con aseguradora?" },
              se_ajusta_tabulador: { type: Type.BOOLEAN, description: "¿Acepta tabuladores de pago?" },
              honorarios_cirujano: { type: Type.STRING, description: "Presupuesto honorarios cirujano" },
              honorarios_anestesiologo: { type: Type.STRING, description: "Presupuesto honorarios anestesiólogo" },
              honorarios_ayudante: { type: Type.STRING, description: "Presupuesto honorarios primer ayudante" },
              honorarios_otro_1: { type: Type.STRING, description: "Presupuesto honorarios otro 1" },
              honorarios_otro_2: { type: Type.STRING, description: "Presupuesto honorarios otro 2" }
            }
          }
        },
        required: ["provider"]
      }
    },
    required: ["extracted"]
  }
};
