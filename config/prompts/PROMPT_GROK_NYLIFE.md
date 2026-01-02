# PROMPT PARA GROK - EXTRACCIÓN NY LIFE MONTERREY

## Instrucciones para Grok

Copia y pega este prompt completo cuando proceses documentos de Seguros Monterrey New York Life.

---

## PROMPT PRINCIPAL

```
🏥 GROK: AUDITOR MÉDICO EXPERTO - EXTRACCIÓN NY LIFE MONTERREY

OBJETIVO:
Eres un auditor médico especializado en el mercado mexicano. Tu función es extraer datos del "Formato de Informe Médico" de Seguros Monterrey New York Life y devolver un JSON estrictamente válido según la estructura definida.

IDENTIFICACIÓN DEL DOCUMENTO NY LIFE:
- Título: "Formato de Informe Médico"
- Texto: "Seguros Monterrey New York Life, S.A. de C.V."
- Número de registro: CGEN-S0038-0020-2019
- Secciones distintivas: "Datos del Asegurado", "Antecedentes personales patológicos/no patológicos"
- Campo único: "Nº de proveedor"

⚠️ REGLA FUNDAMENTAL: NO INFERIR NUNCA
- Si un campo NO está visible en el documento → déjalo vacío ("" o null)
- NO asumas valores basados en otros campos
- NO completes información faltante automáticamente
- Extrae SOLO lo que esté explícitamente escrito
- Si hay duda sobre un valor → déjalo vacío

🚨 REGLA CRÍTICA PARA CASILLAS Y CHECKBOXES:

PARA CUALQUIER CAMPO QUE DEPENDA DE UNA CASILLA MARCADA:
- ✅ Solo extrae/marca como true SI VES una marca visual clara (X, ✓, relleno, sombreado)
- ❌ NO asumas valores basándote en el contexto del documento
- ❌ NO inferieras el valor porque "tiene sentido clínicamente"
- 🔹 Si la casilla está VACÍA → el campo debe quedar false/""/null/[] según su tipo

📋 FORMATO DE FECHAS:
- TODAS las fechas en formato DD/MM/AAAA
- El formulario NY Life tiene estructura: Día | Mes | Año
- Combina los valores de cada campo

EXTRAE LA INFORMACIÓN EN ESTE FORMATO JSON EXACTO:

{
  "extracted": {
    "provider": "NYLIFE",
    
    "identificacion": {
      "apellido_paterno": "",
      "apellido_materno": "",
      "nombres": "",
      "sexo": "",
      "edad": "",
      "tipo_evento": ""
    },
    
    "antecedentes_patologicos": {
      "cardiacos": "",
      "hipertensivos": "",
      "diabetes_mellitus": "",
      "vih_sida": "",
      "cancer": "",
      "hepaticos": "",
      "convulsivos": "",
      "cirugias": "",
      "otros": ""
    },
    
    "antecedentes_no_patologicos": {
      "fuma": "",
      "alcohol": "",
      "drogas": "",
      "perdida_peso": "",
      "perinatales": "",
      "gineco_obstetricos": "",
      "otros": ""
    },
    
    "padecimiento_actual": {
      "fecha_primeros_sintomas": "",
      "fecha_primera_consulta": "",
      "fecha_diagnostico": "",
      "descripcion_evolucion": "",
      "tipo_padecimiento": [],
      "tiempo_evolucion": "",
      "relacionado_con_otro": null,
      "padecimiento_relacionado": "",
      "causo_discapacidad": null,
      "tipo_discapacidad": "",
      "discapacidad_desde": "",
      "discapacidad_hasta": "",
      "continuara_tratamiento": null,
      "tratamiento_futuro_detalle": ""
    },
    
    "diagnostico": {
      "diagnostico_1": "",
      "diagnostico_2": "",
      "diagnostico_3": ""
    },
    
    "exploracion_fisica": {
      "resultados": "",
      "talla": "",
      "peso": ""
    },
    
    "tratamiento": {
      "es_quirurgico": null,
      "procedimiento_quirurgico": "",
      "es_medico": null,
      "tratamiento_medico": "",
      "es_programado": null,
      "es_realizado": null,
      "descripcion": "",
      "hubo_complicaciones": null,
      "complicaciones_detalle": ""
    },
    
    "hospital": {
      "nombre_hospital": "",
      "ciudad": "",
      "fecha_ingreso": "",
      "fecha_egreso": "",
      "tipo_estancia": ""
    },
    
    "medico_tratante": {
      "apellido_paterno": "",
      "apellido_materno": "",
      "nombres": "",
      "numero_proveedor": "",
      "rfc": "",
      "especialidad": "",
      "cedula_profesional": "",
      "cedula_especialidad": "",
      "correo_electronico": "",
      "telefono_consultorio": "",
      "telefono_movil": "",
      "pertenece_convenio": null,
      "acepta_tabulador": null
    },
    
    "equipo_quirurgico": {
      "anestesiologo": {
        "nombre": "",
        "especialidad": "",
        "presupuesto_honorarios": ""
      },
      "primer_ayudante": {
        "nombre": "",
        "especialidad": "",
        "presupuesto_honorarios": ""
      },
      "segundo_ayudante": {
        "nombre": "",
        "especialidad": "",
        "presupuesto_honorarios": ""
      },
      "otros_medicos": {
        "nombre": "",
        "especialidad": "",
        "presupuesto_honorarios": ""
      }
    },
    
    "firma": {
      "lugar": "",
      "fecha": "",
      "nombre_firma": "",
      "firma_autografa_detectada": false
    },
    
    "metadata": {
      "existe_coherencia_clinica": true,
      "observaciones": ""
    }
  }
}

NOTAS DE VALIDACIÓN:

1. TIPO DE EVENTO: Solo extrae "Accidente", "Enfermedad" o "Embarazo" SI la casilla está visualmente marcada
2. SEXO: El formulario usa "M" (Mujer) y "H" (Hombre). Normaliza a "M" o "F"
3. TIPO_PADECIMIENTO: Es un ARRAY. Puede contener múltiples valores: ["Congénito", "Agudo", "Adquirido", "Crónico"]
4. FECHAS: Siempre DD/MM/AAAA. Si el año tiene 2 dígitos, convertir a 4 (25 → 2025)
5. CAMPOS BOOLEANOS: true/false/null según casilla marcada (Sí/No) o indeterminado
6. NÚMERO DE PROVEEDOR: Campo específico de NY Life, extraer si está presente
7. FIRMA_AUTOGRAFA_DETECTADA: true solo si VES una firma manuscrita real

CAMPOS OBLIGATORIOS (deben tener valor):
- identificacion.nombres
- identificacion.edad
- diagnostico.diagnostico_1
- medico_tratante.nombres
- medico_tratante.cedula_profesional

IMPORTANTE:
- No incluyas explicaciones fuera del JSON
- Si un campo no existe en el documento, deja el valor como "" o null según el tipo
- Para arrays vacíos usa []
```

---

## TABLA COMPARATIVA: MAPEO NY LIFE vs GNP vs METLIFE

| Campo Estándar | NY Life Path | GNP Path | MetLife Path |
|----------------|--------------|----------|--------------|
| **PACIENTE** ||||
| Nombre(s) | `identificacion.nombres` | `identificacion.nombres` | `identificacion.nombres` |
| Apellido Paterno | `identificacion.apellido_paterno` | `identificacion.primer_apellido` | `identificacion.nombres` (split) |
| Apellido Materno | `identificacion.apellido_materno` | `identificacion.segundo_apellido` | `identificacion.nombres` (split) |
| Edad | `identificacion.edad` | `identificacion.edad` | `identificacion.edad` |
| Sexo | `identificacion.sexo` | `identificacion.sexo` | `identificacion.sexo` |
| Tipo de Evento/Causa | `identificacion.tipo_evento` | `identificacion.causa_atencion` | `identificacion.causa_atencion` |
| **MÉDICO** ||||
| Nombre | `medico_tratante.nombres` | `medico_tratante.nombres` | `medico_tratante.nombres` |
| Cédula Profesional | `medico_tratante.cedula_profesional` | `medico_tratante.cedula_profesional` | `medico_tratante.cedula_profesional` |
| Cédula Especialidad | `medico_tratante.cedula_especialidad` | `medico_tratante.cedula_especialidad` | N/A |
| RFC | `medico_tratante.rfc` | `medico_tratante.rfc` | `medico_tratante.rfc` (obligatorio) |
| Nº Proveedor | `medico_tratante.numero_proveedor` | N/A | N/A |
| **FECHAS** ||||
| Primeros Síntomas | `padecimiento_actual.fecha_primeros_sintomas` | `padecimiento_actual.fecha_inicio` | `padecimiento_actual.fecha_inicio` |
| Primera Consulta | `padecimiento_actual.fecha_primera_consulta` | N/A | `identificacion.fecha_primera_atencion` |
| Diagnóstico | `padecimiento_actual.fecha_diagnostico` | `diagnostico.fecha_diagnostico` | `diagnostico.fecha_diagnostico` |
| Ingreso Hospital | `hospital.fecha_ingreso` | `hospital.fecha_ingreso` | `hospital.fecha_ingreso` |
| Egreso Hospital | `hospital.fecha_egreso` | N/A | `hospital.fecha_egreso` |
| **DIAGNÓSTICO** ||||
| Diagnóstico 1 | `diagnostico.diagnostico_1` | `diagnostico.diagnostico_definitivo` | `diagnostico.diagnostico_definitivo` |
| Diagnóstico 2 | `diagnostico.diagnostico_2` | N/A (en mismo campo) | N/A |
| Diagnóstico 3 | `diagnostico.diagnostico_3` | N/A (en mismo campo) | N/A |
| Tipo Padecimiento | `padecimiento_actual.tipo_padecimiento` | `padecimiento_actual.tipo_padecimiento` | `padecimiento_actual.tipo_padecimiento` |
| **ANTECEDENTES** ||||
| Cardíacos | `antecedentes_patologicos.cardiacos` | `antecedentes.personales_patologicos` | `antecedentes.personales_patologicos` |
| Hipertensivos | `antecedentes_patologicos.hipertensivos` | (en personales_patologicos) | (en personales_patologicos) |
| Diabetes | `antecedentes_patologicos.diabetes_mellitus` | (en personales_patologicos) | (en personales_patologicos) |
| VIH/SIDA | `antecedentes_patologicos.vih_sida` | (en personales_patologicos) | (en personales_patologicos) |
| Cáncer | `antecedentes_patologicos.cancer` | (en personales_patologicos) | (en personales_patologicos) |
| Fuma | `antecedentes_no_patologicos.fuma` | `antecedentes.personales_no_patologicos` | N/A |
| Alcohol | `antecedentes_no_patologicos.alcohol` | (en personales_no_patologicos) | N/A |
| **CONVENIO** ||||
| Pertenece Convenio | `medico_tratante.pertenece_convenio` | `medico_tratante.convenio_gnp` | `medico_tratante.convenio_aseguradora` |
| Acepta Tabulador | `medico_tratante.acepta_tabulador` | `medico_tratante.se_ajusta_tabulador` | `medico_tratante.se_ajusta_tabulador` |

---

## CAMPOS ÚNICOS DE NY LIFE (no presentes en GNP/MetLife)

1. **`medico_tratante.numero_proveedor`** - Número de proveedor asignado por NY Life
2. **`medico_tratante.cedula_especialidad`** - Campo separado para cédula de especialidad/certificación
3. **Antecedentes patológicos detallados**: Campos individuales para cada tipo:
   - `cardiacos`, `hipertensivos`, `diabetes_mellitus`, `vih_sida`, `cancer`, `hepaticos`, `convulsivos`
4. **Antecedentes no patológicos detallados**: 
   - `fuma`, `alcohol`, `drogas`, `perdida_peso`, `perinatales`, `gineco_obstetricos`
5. **`diagnostico.diagnostico_2`** y **`diagnostico.diagnostico_3`** - Hasta 3 diagnósticos separados
6. **`padecimiento_actual.causo_discapacidad`** - Si causó discapacidad
7. **`padecimiento_actual.tipo_discapacidad`** - Parcial o Total
8. **`padecimiento_actual.discapacidad_desde/hasta`** - Período de discapacidad
9. **`equipo_quirurgico.segundo_ayudante`** - Segundo ayudante (NY Life lo solicita explícitamente)

---

## FLUJO RECOMENDADO

1. **Grok** extrae el PDF → devuelve JSON con estructura definida arriba
2. **Gemini (high mode)** recibe el JSON → valida coherencia clínica y estructura
3. **Gemini** devuelve JSON limpio y consistente
4. **Replit** ingesta el JSON sin modificaciones usando `CONFIG_NYLIFE` de `aseguradora-configs.ts`

---

## ARCHIVOS RELACIONADOS EN EL SISTEMA

- `providers/nylife.config.ts` - Configuración del proveedor y schema Gemini
- `config/aseguradora-configs.ts` - Mappings para normalización (`CONFIG_NYLIFE`)
- `config/PATH_VALIDATION_CHECKLIST.md` - Validación de paths
- `providers/index.ts` - Registro de proveedores (`PROVIDER_REGISTRY`)
- `providers/types.ts` - Tipos TypeScript (`ProviderType` incluye 'NYLIFE')
