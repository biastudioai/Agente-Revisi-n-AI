import { Type } from "@google/genai";
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

⚠️ REGLA VISUAL ESTRICTA PARA "CAUSA DE ATENCIÓN":

📋 SI VES ESTO (todas vacías):
   ☐ Accidente    ☐ Enfermedad    ☐ Embarazo    ☐ Segunda valoración
   ✅ ENTONCES: causa_atencion = "" (string vacío)

📋 SI VES ESTO:
   ☑ Accidente    ☐ Enfermedad    ☐ Embarazo    ☐ Segunda valoración
   ✅ ENTONCES: causa_atencion = "Accidente"

📋 SI VES ESTO:
   ☐ Accidente    ☑ Enfermedad    ☐ Embarazo    ☐ Segunda valoración
   ✅ ENTONCES: causa_atencion = "Enfermedad"

🚫 NO IMPORTA QUÉ DIGA EL DIAGNÓSTICO O EL CONTEXTO CLÍNICO.
🚫 SI NO VES UNA MARCA VISUAL CLARA (X, ✓, relleno), DEJA EL CAMPO VACÍO.

🚫 OTROS CAMPOS - Ejemplos de inferencias PROHIBIDAS:
❌ "Es cirugía" → utilizo_equipo_especial = true
❌ "Menciona dolor postoperatorio" → presento_complicaciones = true
❌ "Dice 'se realizó laparoscopía'" → utilizo_equipo_especial = true

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

INSTRUCCIONES DE EXTRACCIÓN PARA METLIFE (ALTA PRIORIDAD):

CABECERA (Lugar y Fecha):
- Extrae "Lugar" del campo de lugar SOLO si está escrito
- Combina las casillas de Día, Mes y Año en formato "DD/MM/AAAA" para "fecha" SOLO si las casillas tienen valores

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

🚨 REGLA CRÍTICA PARA CHECKBOXES EN METLIFE:
En los formularios MetLife, el checkbox/casilla está SIEMPRE A LA DERECHA del texto de la opción.
Ejemplo visual real: "Médico tratante ☒" significa que PRIMERO viene el texto, LUEGO la casilla a la derecha.

📋 FILA 1: TIPO DE ATENCIÓN AL PACIENTE (CHECKBOXES A LA DERECHA DEL TEXTO)
Estructura visual REAL del formulario MetLife:
   Médico tratante ☐    Cirujano principal ☐    Interconsultante ☐    Equipo quirúrgico ☐    Segunda valoración ☐
                   ↑                       ↑                    ↑                      ↑                        ↑
            (checkbox)              (checkbox)            (checkbox)            (checkbox)              (checkbox)

🚨 REGLA ANTI-INFERENCIA PARA tipo_atencion:
❌ "El documento menciona cirugía/apendicectomía" → NO marques automáticamente "Interconsultante"
❌ "Es un caso quirúrgico complejo" → NO marques automáticamente todos los roles
❌ "Hay equipo quirúrgico en otra sección" → NO marques "Equipo quirúrgico" a menos que VEA la casilla marcada
✅ SOLO marca un valor si VES físicamente una X, ✓ o casilla rellena EN ESA POSICIÓN ESPECÍFICA

Campo a extraer:
- tipo_atencion: Array de valores marcados. SOLO extrae las casillas con marca visual (X, ✓, relleno). Si todas vacías → []

📋 FILA 2: NOMBRE Y ESPECIALIDAD (DOS COLUMNAS)
┌──────────────────────────────┬──────────────────────────────┐
│ Nombre completo (línea)      │ Especialidad (línea)         │
│ ___________________________  │ ___________________________  │
└──────────────────────────────┴──────────────────────────────┘

Campos a extraer:
- nombres: Nombre completo del médico (columna izquierda)
- especialidad: Especialidad médica (columna derecha)

📋 FILA 3: DOMICILIO Y TELÉFONO CONSULTORIO (DOS COLUMNAS SEPARADAS)
┌─────────────────────────────────────┬──────────────────────────────────────┐
│ Domicilio consultorio               │ Teléfono del consultorio             │
│ (LÍNEA CONTINUA para escribir)      │ (CUADRÍCULAS NUMÉRICAS: 10 dígitos)  │
│ Ej: "Av. Insurgentes"               │ Ej: [5][5][5][1][1][1][2][2][2][2]   │
└─────────────────────────────────────┴──────────────────────────────────────┘

⚠️ IMPORTANTE FILA 3:
- telefono_consultorio: Está en la COLUMNA DERECHA de esta fila. Son cuadrículas individuales para cada dígito.
- El formato esperado es un número de 10 dígitos (teléfono mexicano).
- NO confundir con campos de otras filas.

Campos a extraer:
- domicilio_consultorio: Dirección del consultorio (columna izquierda, línea continua para texto)
- telefono_consultorio: Número de teléfono del consultorio (columna derecha, cuadrículas de 10 dígitos)

📋 FILA 4: CÉDULA PROFESIONAL DE ESPECIALIDAD, NÚMERO CELULAR Y RFC (TRES COLUMNAS SEPARADAS)
┌──────────────────────────┬──────────────────────────┬──────────────────────────┐
│ Cédula profesional       │ Número celular           │ Registro Federal de      │
│ especialidad             │                          │ Contribuyentes           │
│ (LÍNEA CONTINUA:         │ (CUADRÍCULAS NUMÉRICAS:  │ (CUADRÍCULAS             │
│  7-8 dígitos)            │  10 dígitos)             │  ALFANUMÉRICAS: 13 car.) │
│ Ej: "9876543"            │ Ej: [5][5][5][1][1][1]...│ Ej: [G][O][H][M]...      │
└──────────────────────────┴──────────────────────────┴──────────────────────────┘

⚠️ IMPORTANTE FILA 4:
- cedula_profesional: Campo de la COLUMNA IZQUIERDA. Es la cédula de especialidad (7-8 dígitos).
- celular: Campo de la COLUMNA CENTRAL. Cuadrículas para número de 10 dígitos.
- rfc: Campo de la COLUMNA DERECHA. Cuadrículas alfanuméricas (13 caracteres).

🚨 ERROR COMÚN A EVITAR:
❌ NO pongas el valor de cedula_profesional (ej: "9876543") en telefono_consultorio
❌ NO pongas el valor de telefono_consultorio (ej: "5551112222") en cedula_profesional
✅ Respeta la FILA donde está cada campo:
   - FILA 3 = domicilio + teléfono consultorio
   - FILA 4 = cédula profesional especialidad + celular + RFC

Campos a extraer:
- cedula_profesional: Cédula profesional de especialidad (FILA 4, columna izquierda, línea continua, ~7-8 dígitos)
- celular: Número celular (FILA 4, columna centro, cuadrículas individuales, 10 dígitos)
- rfc: RFC del médico (FILA 4, columna derecha, cuadrículas alfanuméricas, 13 caracteres)

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
              sexo: { type: Type.STRING, description: "Masculino, Femenino u Otro" },
              edad: { type: Type.STRING, description: "Edad del paciente" },
              causa_atencion: { 
                type: Type.STRING, 
                description: "SOLO extrae 'Accidente', 'Enfermedad', 'Embarazo' o 'Segunda valoración' SI VES una marca visual clara (X, ✓, checkbox relleno) en la casilla correspondiente. Si TODAS las casillas están vacías, devuelve string vacío ''. NO INFERIR basándote en el diagnóstico o contexto clínico." 
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
              tipo_padecimiento: { 
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array de valores extraídos de casillas marcadas: puede contener ['Congénito', 'Adquirido', 'Agudo', 'Crónico']. SOLO extrae los valores que VES marcados visualmente. Si ninguna casilla está marcada, devuelve array vacío []."
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
              tipo_estancia: { type: Type.STRING, description: "Urgencia, Ingreso hospitalario o Corta estancia" },
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

          medico_tratante: {
            type: Type.OBJECT,
            properties: {
              tipo_atencion: { 
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "FILA 1 - Array de checkboxes marcados. REGLA ESTRICTA: SOLO incluye un valor si VES físicamente una marca (X, ✓, relleno) en el checkbox que está A LA DERECHA de ese texto. NO inferir por contexto clínico. Ej: Si solo 'Médico tratante' y 'Cirujano principal' tienen marca visual → ['Médico tratante', 'Cirujano principal']. Si 'Interconsultante' NO tiene marca visual → NO lo incluyas aunque sea un caso quirúrgico."
              },
              nombres: { type: Type.STRING, description: "FILA 2 izquierda - Nombre completo del médico" },
              especialidad: { type: Type.STRING, description: "FILA 2 derecha - Especialidad médica" },
              domicilio_consultorio: { type: Type.STRING, description: "FILA 3 izquierda - Domicilio del consultorio (línea continua de texto)" },
              telefono_consultorio: { type: Type.STRING, description: "FILA 3 derecha - Teléfono del consultorio (cuadrículas numéricas, 10 dígitos). NO confundir con cédula profesional que está en FILA 4." },
              cedula_profesional: { type: Type.STRING, description: "FILA 4 izquierda - Cédula profesional de especialidad (línea continua, 7-8 dígitos). Este es el campo 'Cédula profesional especialidad' del formulario." },
              cedula_especialidad: { type: Type.STRING, description: "Alias de cedula_profesional - usar el mismo valor que cedula_profesional" },
              celular: { type: Type.STRING, description: "FILA 4 centro - Número celular (cuadrículas numéricas, 10 dígitos)" },
              rfc: { type: Type.STRING, description: "FILA 4 derecha - RFC del médico (cuadrículas alfanuméricas, 13 caracteres)" },
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
