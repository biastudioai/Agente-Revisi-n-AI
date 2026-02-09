import { Type } from "./schema-types";
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

🔴🔴🔴 REGLAS PARA TEXTO MANUSCRITO - CAPTURA LITERAL 🔴🔴🔴

⚠️ REGLA: EXTRAE EL TEXTO MANUSCRITO TAL COMO LO VES
- Transcribe LITERALMENTE lo que está escrito a mano
- NO omitas palabras
- NO modifiques ni "corrijas" las palabras
- Extrae exactamente lo que ves, letra por letra

📋 CAMPOS DE TEXTO LIBRE MANUSCRITO:
- Antecedentes personales patológicos
- Especifique cuál padecimiento
- Descripción del padecimiento actual
- Diagnóstico definitivo
- Descripción de tratamiento
- Cualquier campo con texto escrito a mano

📋 EJEMPLO:
Si ves escrito a mano: "Cirugía Catarata FACO + LIO Ambos ojos"
✅ CORRECTO: "Cirugía Catarata FACO + LIO Ambos ojos" (literal)
❌ INCORRECTO: Omitir "Cirugía" o modificar cualquier palabra

⚠️ IMPORTANTE: Lee de izquierda a derecha, desde el inicio del campo.

🚨 REGLA CRÍTICA UNIVERSAL PARA CASILLAS Y CHECKBOXES:

PARA CUALQUIER CAMPO QUE DEPENDA DE UNA CASILLA MARCADA:
- ✅ Solo extrae/marca como true SI VES una marca visual clara (X, ✓, relleno, sombreado)
- ❌ NO asumas valores basándote en el contexto del documento
- ❌ NO inferieras el valor porque "tiene sentido clínicamente"
- ❌ NO completes automáticamente basándote en otros campos
- 🔹 Si la casilla está VACÍA → el campo debe quedar false/""/null/[] según su tipo
- 🔹 Si hay DUDA sobre si está marcada → déjalo VACÍO

📋 JERARQUÍA DE DETECCIÓN - ORDEN DE PRIORIDAD:

🔲 PRIORIDAD 1 - CHECKBOXES/RECUADROS CON MARCA INTERNA:

Si el documento muestra recuadros (☐, ☑, □, ■, [ ], [X]) CON MARCA VISIBLE DENTRO:
- Identifica cuál checkbox tiene marca visual dentro (X, ✓, relleno, sombreado, punto)
- La opción marcada es la que está MÁS CERCA del checkbox marcado
- Este método es el MÁS CONFIABLE

✅ Ejemplos con recuadros marcados:
   - "☑ Masculino    ☐ Femenino" → Masculino está seleccionado
   - "[X] Accidente  [ ] Enfermedad  [ ] Embarazo" → Accidente está seleccionado
   - "□ Congénito    ■ Adquirido" → Adquirido está seleccionado (■ relleno)
   - "[ ] Reembolso  [X] Programación de cirugía" → Programación de cirugía

📍 PRIORIDAD 2 - ALTERNATIVAS CUANDO CHECKBOXES ESTÁN VACÍOS:

⚠️ Si TODOS los checkboxes están VACÍOS, busca estas marcas alternativas:

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

4️⃣ TEXTO SUBRAYADO (cuando checkboxes están vacíos):
   🔴 REGLA: Si una opción o PARTE de una opción está SUBRAYADA (línea debajo), esa opción está SELECCIONADA.
   
   ✅ Ejemplos de subrayado TOTAL:
   - "Accidente  E̲n̲f̲e̲r̲m̲e̲d̲a̲d̲  Embarazo" → Enfermedad está seleccionada (tiene línea debajo)
   
   ✅ Ejemplos de subrayado PARCIAL (IGUAL DE VÁLIDO):
   - "Corta estancia / a̲m̲b̲u̲l̲a̲t̲o̲r̲i̲a̲" → "Corta estancia / ambulatoria" está seleccionada
     (aunque solo "ambulatoria" esté subrayada, TODA la opción se considera seleccionada)
   
   📋 CÓMO IDENTIFICAR SUBRAYADO:
   - Una línea horizontal DEBAJO del texto (no cruzando las letras)
   - Puede ser trazo manuscrito o línea impresa
   - NO confundir con texto tachado (línea que CRUZA las letras)

5️⃣ SÍMBOLOS COMUNES de marca:
   - "X" (equis)
   - "●" (punto/círculo relleno)
   - "✓" o "✔" (palomita/check)
   - Cualquier símbolo visual que indique selección

⚠️ CASOS ESPECIALES:

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

🔴🔴🔴 CAUSA DE ATENCIÓN - AUDITORÍA VISUAL OBLIGATORIA (OBJETO causa_atencion_audit) 🔴🔴🔴

⚠️⚠️⚠️ IMPORTANTE: Este campo tiene 3 opciones de checkbox:
   Accidente □   Enfermedad □   Embarazo □

DEBES llenar causa_atencion_audit ANTES de construir el array causa_atencion.

CÓMO LLENAR causa_atencion_audit:
1. PRIMERO revisa si el checkbox tiene marca (X, ✓, relleno, punto)
2. Si el checkbox está VACÍO, entonces revisa si el texto tiene una línea debajo (subrayado)
3. Si hay marca en checkbox O texto subrayado → true
4. Si NO hay marca NI subrayado → false

📋 EJEMPLOS:
- Checkbox ☑ marcado en "Accidente" → accidente_marcado = true
- Checkbox vacío pero "Enfermedad" tiene línea debajo → enfermedad_marcado = true
- Checkbox vacío y sin subrayado → false

CÓMO CONSTRUIR causa_atencion A PARTIR DE causa_atencion_audit:
- Si accidente_marcado = true → incluir "Accidente"
- Si enfermedad_marcado = true → incluir "Enfermedad"
- Si embarazo_marcado = true → incluir "Embarazo"
- Si NINGUNO tiene marca → causa_atencion = []

📋 EJEMPLO 1 - NINGUNA MARCADA:
causa_atencion_audit = { accidente_marcado: false, enfermedad_marcado: false, embarazo_marcado: false }
causa_atencion = []

📋 EJEMPLO 2 - ACCIDENTE MARCADO:
causa_atencion_audit = { accidente_marcado: true, enfermedad_marcado: false, embarazo_marcado: false }
causa_atencion = ["Accidente"]

🚫 ERRORES A EVITAR:
❌ Ver casillas vacías → inferir ["Enfermedad"] porque el diagnóstico es una enfermedad ← INCORRECTO
❌ Ver "diabetes" en texto → marcar enfermedad_marcado = true ← INCORRECTO

🔴🔴🔴 SEXO DEL PACIENTE - AUDITORÍA VISUAL OBLIGATORIA (OBJETO sexo_audit) 🔴🔴🔴

DEBES llenar sexo_audit ANTES de construir el array sexo.

CÓMO LLENAR sexo_audit:
1. masculino_marcado: ¿Veo X/✓/punto cerca de "M" o "Masculino"? → true/false
2. femenino_marcado: ¿Veo X/✓/punto cerca de "F" o "Femenino"? → true/false

CÓMO CONSTRUIR sexo A PARTIR DE sexo_audit:
- Si masculino_marcado = true → sexo = ["M"]
- Si femenino_marcado = true → sexo = ["F"]
- Si NINGUNO tiene marca → sexo = []

🔴🔴🔴 TIPO DE PADECIMIENTO - AUDITORÍA VISUAL OBLIGATORIA (OBJETO tipo_padecimiento_audit) 🔴🔴🔴

⚠️⚠️⚠️ IMPORTANTE: El tipo de padecimiento tiene DOS GRUPOS de checkboxes:
   GRUPO 1 (ORIGEN): Congénito □ vs Adquirido □
   GRUPO 2 (CURSO):  Agudo □ vs Crónico □

DEBES llenar tipo_padecimiento_audit ANTES de construir el array tipo_padecimiento.

CÓMO LLENAR tipo_padecimiento_audit:
1. congenito_marcado: ¿Veo X/✓/relleno/subrayado en el checkbox o texto de "Congénito"? → true/false
2. adquirido_marcado: ¿Veo X/✓/relleno/subrayado en el checkbox o texto de "Adquirido"? → true/false
3. agudo_marcado: ¿Veo X/✓/relleno/subrayado en el checkbox o texto de "Agudo"? → true/false
4. cronico_marcado: ¿Veo X/✓/relleno/subrayado en el checkbox o texto de "Crónico"? → true/false

CÓMO CONSTRUIR tipo_padecimiento A PARTIR DE tipo_padecimiento_audit:
- Si congenito_marcado = true → incluir "Congénito"
- Si adquirido_marcado = true → incluir "Adquirido"
- Si agudo_marcado = true → incluir "Agudo"
- Si cronico_marcado = true → incluir "Crónico"

📋 EJEMPLO - DOS CASILLAS MARCADAS:
tipo_padecimiento_audit = { congenito_marcado: false, adquirido_marcado: true, agudo_marcado: true, cronico_marcado: false }
tipo_padecimiento = ["Adquirido", "Agudo"]

📋 EJEMPLO - NINGUNA MARCADA:
tipo_padecimiento_audit = { congenito_marcado: false, adquirido_marcado: false, agudo_marcado: false, cronico_marcado: false }
tipo_padecimiento = []

🔴🔴🔴 TIPO DE ESTANCIA - AUDITORÍA VISUAL OBLIGATORIA (OBJETO tipo_estancia_audit) 🔴🔴🔴

DEBES llenar tipo_estancia_audit ANTES de construir el array tipo_estancia.

CÓMO LLENAR tipo_estancia_audit:
1. PRIMERO revisa si el checkbox tiene marca (X, ✓, relleno, punto)
2. Si el checkbox está VACÍO, entonces revisa si el texto (o parte de él) tiene una línea debajo (subrayado)
3. Si hay marca en checkbox O texto subrayado → true
4. Si NO hay marca NI subrayado → false

⚠️ REGLA DE SUBRAYADO PARCIAL:
   - Si solo "ambulatoria" tiene línea debajo → corta_estancia_marcado = TRUE (toda la opción seleccionada)
   - El subrayado de CUALQUIER parte de la opción = opción seleccionada

CÓMO CONSTRUIR tipo_estancia A PARTIR DE tipo_estancia_audit:
- Si urgencia_marcado = true → incluir "Urgencia"
- Si hospitalaria_marcado = true → incluir "Hospitalaria"
- Si corta_estancia_marcado = true → incluir "Corta estancia / ambulatoria"
- Si NINGUNO tiene marca → tipo_estancia = []

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
Las "/" son separadores, NO son dígitos. Analiza el contexto visual para identificar los números reales.

📋 FORMATOS DE ENTRADA QUE PUEDES ENCONTRAR (todos válidos):
- DD/MM/AAAA → normalizar a DD/MM/AAAA
- D/MM/AAAA → agregar 0 al día
- DD/M/AAAA → agregar 0 al mes
- D/M/AAAA → agregar 0 a día y mes
- DD/MM/AA → convertir año a 4 dígitos (20XX)
- D/M/AA → agregar ceros y convertir año

📋 CÓMO IDENTIFICAR UNA FECHA CORRECTAMENTE:
1. Busca el PATRÓN de fecha: números separados por "/" o espacios
2. El PRIMER grupo (1-2 dígitos) = DÍA (rango válido: 01-31)
3. El SEGUNDO grupo (1-2 dígitos) = MES (rango válido: 01-12)
4. El TERCER grupo (2-4 dígitos) = AÑO

📋 CÓMO INTERPRETAR FECHAS ESCRITAS A MANO EN GNP:

⚠️ REGLA CRÍTICA: Las "/" del formulario GNP están PRE-IMPRESAS.
Los números escritos a mano están ENTRE las diagonales, NO incluyen las diagonales.

PROCESO DE INTERPRETACIÓN:
1. Ignora cualquier carácter que parezca "/" o "1" en posición de separador
2. Identifica los GRUPOS DE DÍGITOS escritos a mano:
   - Primer grupo (antes del primer separador) = DÍA
   - Segundo grupo (entre separadores) = MES
   - Tercer grupo (después del segundo separador) = AÑO
3. Lee cada grupo de dígitos independientemente

📋 EJEMPLO VISUAL:
Si ves escrito a mano: "05  12  2025" (con las "/" pre-impresas del formulario)
El OCR puede leerlo como: "05 1 21 2025" o "051 21 2025" (confundiendo "/" con "1")

Para interpretar correctamente:
- Identifica que hay 3 grupos de números: [05] [12] [2025]
- Las "/" son los separadores pre-impresos, NO son dígitos
- La fecha es: 05/12/2025 (5 de diciembre de 2025)

⚠️ NO asumas que un "1" es parte del mes. Analiza el CONTEXTO VISUAL:
- Si ves "1" en posición de separador → es una "/" mal leída
- Si ves "1" como parte de un grupo de dígitos → es el dígito 1

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
- numero_poliza: Número de póliza del asegurado: Si notas algún espacio en blanco o guiones, extrae el número completo sin espacios ni guiones. Ejemplo: Si el número de póliza es "123 456 789" o "123-456-789", extrae "123456789"
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
- tipo_participacion: Interconsultante, Cirujano, Médico o especialista (anestesiólogo), Ayudantía, u Otra (cuál está marcada)
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

🔴🔴🔴 VALIDACIÓN DE INTEGRIDAD DOCUMENTAL 🔴🔴🔴

DETECCIÓN DE TACHADURAS Y ENMENDADURAS:
Analiza VISUALMENTE todo el documento buscando cualquier evidencia de:
1. Líneas tachadas sobre texto (───, ╳, o cualquier trazo que cruce texto)
2. Texto sobrepuesto o escrito encima de otro
3. Corrector líquido (manchas blancas que cubren texto)
4. Borrones o intentos de eliminar escritura
5. Raspado del papel
6. Cualquier modificación visible al contenido original

metadata.tachaduras_detectadas = true si encuentras CUALQUIERA de estos indicadores
metadata.tachaduras_detectadas = false si el documento está limpio y sin alteraciones

VERIFICACIÓN DE COINCIDENCIA MÉDICO-FIRMA:
Compara el nombre del médico declarado en la sección "Datos del Médico Tratante" con el nombre que aparece en la firma del documento.
- Si coinciden (mismo nombre completo o iniciales coherentes) → firma_coincide_con_tratante = true
- Si NO coinciden o hay discrepancia → firma_coincide_con_tratante = false

EVALUACIÓN DE SEVERIDAD DEL DIAGNÓSTICO:
Basándote en el diagnóstico definitivo, clasifica la severidad como:
- "leve": Condiciones menores, tratamiento ambulatorio simple
- "moderado": Requiere seguimiento médico, posible hospitalización corta
- "grave": Condiciones serias, hospitalización prolongada, cirugía mayor, riesgo vital
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
              sexo_audit: {
                type: Type.OBJECT,
                description: "🔴 OBLIGATORIO: Antes de llenar sexo, DEBES verificar CADA opción individualmente.",
                properties: {
                  masculino_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "¿Hay una marca visual (X/✓/punto) cerca de 'M' o 'Masculino'? true = SÍ veo marca, false = NO veo marca" 
                  },
                  femenino_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "¿Hay una marca visual (X/✓/punto) cerca de 'F' o 'Femenino'? true = SÍ veo marca, false = NO veo marca" 
                  }
                }
              },
              sexo: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Array construido a partir de sexo_audit: Si masculino_marcado=true → ['M']. Si femenino_marcado=true → ['F']. Si NINGUNO tiene marca → []"
              },
              causa_atencion_audit: {
                type: Type.OBJECT,
                description: "🔴 OBLIGATORIO: Primero verificar si hay marca en checkbox. Si checkbox está vacío, buscar si el texto está SUBRAYADO (línea debajo).",
                properties: {
                  accidente_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "¿Hay marca en checkbox de 'Accidente'? Si checkbox vacío: ¿texto 'Accidente' tiene línea debajo (subrayado)? true = SÍ. NO inferir del diagnóstico." 
                  },
                  enfermedad_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "¿Hay marca en checkbox de 'Enfermedad'? Si checkbox vacío: ¿texto 'Enfermedad' tiene línea debajo (subrayado)? true = SÍ. NO inferir del diagnóstico." 
                  },
                  embarazo_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "¿Hay marca en checkbox de 'Embarazo'? Si checkbox vacío: ¿texto 'Embarazo' tiene línea debajo (subrayado)? true = SÍ. NO inferir del diagnóstico." 
                  }
                }
              },
              causa_atencion: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Array construido a partir de causa_atencion_audit: SOLO incluye valores donde _marcado=true. Si TODOS son false → []"
              }
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
              tipo_padecimiento_audit: {
                type: Type.OBJECT,
                description: "🔴 OBLIGATORIO: Antes de llenar tipo_padecimiento, DEBES verificar CADA checkbox individualmente.",
                properties: {
                  congenito_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "¿El checkbox de 'Congénito' tiene una marca visual (X/✓/relleno)? true = SÍ veo marca, false = casilla vacía" 
                  },
                  adquirido_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "¿El checkbox de 'Adquirido' tiene una marca visual (X/✓/relleno)? true = SÍ veo marca, false = casilla vacía" 
                  },
                  agudo_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "¿El checkbox de 'Agudo' tiene una marca visual (X/✓/relleno)? true = SÍ veo marca, false = casilla vacía" 
                  },
                  cronico_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "¿El checkbox de 'Crónico' tiene una marca visual (X/✓/relleno)? true = SÍ veo marca, false = casilla vacía" 
                  }
                }
              },
              tipo_padecimiento: { 
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array construido a partir de tipo_padecimiento_audit: SOLO incluye valores donde _marcado=true. Ejemplo: si adquirido_marcado=true y agudo_marcado=true → ['Adquirido', 'Agudo']"
              },
              tipo_padecimiento_congenito_adquirido: { type: Type.STRING, description: "Valor de la primera pareja de casillas: 'Congénito' o 'Adquirido'. SOLO extrae si VES una casilla marcada. Si ninguna está marcada, dejar vacío." },
              tipo_padecimiento_agudo_cronico: { type: Type.STRING, description: "Valor de la segunda pareja de casillas: 'Agudo' o 'Crónico'. SOLO extrae si VES una casilla marcada. Si ninguna está marcada, dejar vacío." }
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
              presento_complicaciones: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Array con la opción marcada: ['Sí'] o ['No']. SOLO extrae lo que VES marcado visualmente."
              },
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
              tipo_estancia_audit: {
                type: Type.OBJECT,
                description: "🔴 OBLIGATORIO: Primero verificar si hay marca en checkbox. Si checkbox está vacío, buscar si el texto está SUBRAYADO.",
                properties: {
                  urgencia_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "¿Hay marca en checkbox de 'Urgencia'? Si checkbox vacío: ¿texto 'Urgencia' tiene línea debajo? true = SÍ" 
                  },
                  hospitalaria_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "¿Hay marca en checkbox de 'Hospitalaria'? Si checkbox vacío: ¿texto 'Hospitalaria' tiene línea debajo? true = SÍ" 
                  },
                  corta_estancia_marcado: { 
                    type: Type.BOOLEAN, 
                    description: "¿Hay marca en checkbox? Si checkbox vacío: ¿CUALQUIER parte de 'Corta estancia / ambulatoria' tiene línea debajo (subrayado)? Si solo 'ambulatoria' está subrayada → TRUE (toda la opción seleccionada)." 
                  }
                }
              },
              tipo_estancia: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Array construido a partir de tipo_estancia_audit: SOLO incluye valores donde _marcado=true. Si NINGUNO tiene marca → []"
              },
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
              tipo_participacion: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Array con el tipo de participación marcado: puede contener 'Tratante', 'Cirujano', 'Otra'. SOLO extrae lo que VES marcado visualmente."
              },
              tipo_participacion_otra: { type: Type.STRING },
              hubo_interconsulta: { type: Type.BOOLEAN }
            }
          },

          otros_medicos: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                tipo_participacion: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "Array con el tipo de participación marcado: puede contener 'Interconsultante', 'Cirujano', 'Médico o especialista (anestesiólogo)', 'Ayudantía', 'Otra'. SOLO extrae lo que VES marcado visualmente."
                },
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
              observacion_coherencia: { type: Type.STRING, description: "Observaciones sobre coherencia clínica" },
              tachaduras_detectadas: { type: Type.BOOLEAN, description: "¿Se detectaron tachaduras, enmendaduras o correcciones visibles en el documento? Analiza visualmente el documento buscando: líneas tachadas, texto sobrepuesto, corrector líquido, borrones, o cualquier intento de modificar el texto original." },
              firma_coincide_con_tratante: { type: Type.BOOLEAN, description: "¿El nombre en la firma coincide con el médico tratante declarado? Compara el nombre escrito/impreso en la firma con el médico tratante registrado en el formulario." },
              diagnostico_severidad: { type: Type.STRING, description: "Evalúa la severidad del diagnóstico: 'leve', 'moderado' o 'grave'. Basado en el diagnóstico definitivo y la descripción clínica." }
            }
          }
        },
        required: ["provider"]
      }
    },
    required: ["extracted"]
  }
};
