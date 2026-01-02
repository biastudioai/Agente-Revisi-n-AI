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
    'Secciones como "Datos del Asegurado", "Historia clínica"',
    'Número de registro CGEN-S0038-0020-2019'
  ],

  extractionInstructions: `
⚠️ REGLA DE ORO: EXTRACCIÓN TOTAL (RAW)
- Tu objetivo es capturar CUALQUIER marca o texto visible. 
- Si un campo tiene varias casillas marcadas, extrae todas en el array.
- NO infieras. Si no hay marca, deja el array vacío [].

1. NORMALIZACIÓN DE GÉNERO (CRÍTICO):
   - En este formulario: M = Mujer, H = Hombre.
   - Si está marcada la casilla "M" -> Extrae "Femenino".
   - Si está marcada la casilla "H" -> Extrae "Masculino".
   - Si ambas están marcadas o tachadas, extrae ["Femenino", "Masculino"].

2. TRATAMIENTO DE FECHAS:
   - Extrae "dia", "mes" y "año" de las casillas individuales.
   - En el campo "formatted", genera el string DD/MM/AAAA. Si el mes viene en nombre (ej. "Ene"), conviértelo a número (01).

3. CHECKBOXES Y SELECCIONES:
   - Captura todas las marcas en campos como 'tipo_evento', 'antecedentes', 'tipo_padecimiento' y 'modalidad_tratamiento'.
   - Los campos que antes eran Sí/No ahora son ARRAYS para permitir capturar errores del llenado manual.

4. MODELO HÍBRIDO PARA ANTECEDENTES PATOLÓGICOS:
   - En el array 'captura_raw_marcas', incluye el nombre de TODAS las opciones que tengan una marca (X, ✓, etc).
   - En los campos individuales (cardiacos, diabetes, etc.), coloca "Sí" si la casilla está marcada, y déjalo vacío "" si no hay marca.
   - Si el médico escribió texto adicional junto a una casilla (ej. "Diabetes - Controlada"), pon "Sí" en el campo individual y captura el texto completo en el array y en detalle_narrativo.

5. EQUIPO QUIRÚRGICO:
   - Extrae cada fila (Anestesiólogo, Ayudantes, Otros) como un objeto dentro del array. No omitas los presupuestos de honorarios.
`,

  requiredFields: [
    'identificacion.nombres',
    'identificacion.edad',
    'padecimiento_actual.diagnosticos',
    'medico_tratante.nombre_completo',
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
              apellido_paterno: { type: Type.STRING },
              apellido_materno: { type: Type.STRING },
              nombres: { type: Type.STRING },
              sexo: { type: Type.ARRAY, items: { type: Type.STRING }, description: "M=Femenino, H=Masculino. Array para capturar ambigüedades." },
              edad: { type: Type.STRING },
              tipo_evento: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Accidente, Enfermedad, Embarazo. Array para capturar múltiples marcas." }
            }
          },

          antecedentes_patologicos: {
            type: Type.OBJECT,
            properties: {
              captura_raw_marcas: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Lista de todos los nombres de casillas que tengan una marca visual (X, ✓, etc)"
              },
              cardiacos: { type: Type.STRING, description: "Sí si marcado, vacío si no" },
              hipertensivos: { type: Type.STRING, description: "Sí si marcado, vacío si no" },
              diabetes_mellitus: { type: Type.STRING, description: "Sí si marcado, vacío si no" },
              vih_sida: { type: Type.STRING, description: "Sí si marcado, vacío si no" },
              cancer: { type: Type.STRING, description: "Sí si marcado, vacío si no" },
              hepaticos: { type: Type.STRING, description: "Sí si marcado, vacío si no" },
              convulsivos: { type: Type.STRING, description: "Sí si marcado, vacío si no" },
              cirugias: { type: Type.STRING, description: "Sí si marcado, vacío si no" },
              otros: { type: Type.STRING, description: "Otros antecedentes patológicos" },
              detalle_narrativo: { type: Type.STRING, description: "Texto libre donde el médico detalla la evolución de patologías" }
            }
          },

          antecedentes_no_patologicos: {
            type: Type.OBJECT,
            properties: {
              captura_raw_marcas: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Lista de todos los nombres de casillas marcadas"
              },
              fuma: { type: Type.STRING, description: "Contenido del campo ¿Fuma?" },
              alcohol: { type: Type.STRING, description: "Contenido del campo ¿Alcohol?" },
              drogas: { type: Type.STRING, description: "Contenido del campo ¿Drogas?" },
              perdida_peso: { type: Type.STRING, description: "Contenido del campo ¿Pérdida de peso?" },
              perinatales: { type: Type.STRING, description: "Antecedentes perinatales" },
              gineco_obstetricos: { type: Type.STRING, description: "Antecedentes gineco-obstétricos" },
              otros: { type: Type.STRING }
            }
          },

          padecimiento_actual: {
            type: Type.OBJECT,
            properties: {
              fecha_primeros_sintomas: { 
                type: Type.OBJECT, 
                properties: { 
                  dia: { type: Type.STRING }, 
                  mes: { type: Type.STRING }, 
                  año: { type: Type.STRING }, 
                  formatted: { type: Type.STRING, description: "DD/MM/AAAA" } 
                } 
              },
              fecha_primera_consulta: { 
                type: Type.OBJECT, 
                properties: { 
                  dia: { type: Type.STRING }, 
                  mes: { type: Type.STRING }, 
                  año: { type: Type.STRING }, 
                  formatted: { type: Type.STRING } 
                } 
              },
              fecha_diagnostico: { 
                type: Type.OBJECT, 
                properties: { 
                  dia: { type: Type.STRING }, 
                  mes: { type: Type.STRING }, 
                  año: { type: Type.STRING }, 
                  formatted: { type: Type.STRING } 
                } 
              },
              descripcion_evolucion: { type: Type.STRING },
              diagnosticos: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array de hasta 3 diagnósticos" },
              tipo_padecimiento: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Congénito, Agudo, Adquirido, Crónico" },
              tiempo_evolucion: { type: Type.STRING },
              relacion_otro_padecimiento: {
                type: Type.OBJECT,
                properties: { 
                  marcada: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Sí/No como array" }, 
                  cual: { type: Type.STRING } 
                }
              },
              discapacidad: {
                type: Type.OBJECT,
                properties: { 
                  marcada: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Sí/No como array" }, 
                  tipo: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Parcial/Total como array" },
                  desde: { type: Type.STRING },
                  hasta: { type: Type.STRING }
                }
              },
              continuara_tratamiento: {
                type: Type.OBJECT,
                properties: {
                  marcada: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Sí/No como array" },
                  detalle: { type: Type.STRING }
                }
              }
            }
          },

          exploracion_fisica: {
            type: Type.OBJECT,
            properties: {
              resultados: { type: Type.STRING, description: "Exploración física y resultados de estudios" },
              talla: { type: Type.STRING },
              peso: { type: Type.STRING }
            }
          },

          tratamiento_y_hospital: {
            type: Type.OBJECT,
            properties: {
              modalidad: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Quirúrgico, Médico" },
              detalle_tratamiento: { type: Type.STRING },
              estatus_tratamiento: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Programación o Realizado" },
              complicaciones: {
                type: Type.OBJECT,
                properties: { 
                  marcada: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Sí/No como array" }, 
                  detalle: { type: Type.STRING } 
                }
              },
              hospital: {
                type: Type.OBJECT,
                properties: {
                  nombre: { type: Type.STRING },
                  ciudad: { type: Type.STRING },
                  ingreso: { 
                    type: Type.OBJECT, 
                    properties: { 
                      dia: { type: Type.STRING }, 
                      mes: { type: Type.STRING }, 
                      año: { type: Type.STRING }, 
                      formatted: { type: Type.STRING } 
                    } 
                  },
                  egreso: { 
                    type: Type.OBJECT, 
                    properties: { 
                      dia: { type: Type.STRING }, 
                      mes: { type: Type.STRING }, 
                      año: { type: Type.STRING }, 
                      formatted: { type: Type.STRING } 
                    } 
                  },
                  tipo_estancia: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Urgencia, Hospitalización, Corta estancia" }
                }
              }
            }
          },

          medico_tratante: {
            type: Type.OBJECT,
            properties: {
              nombre_completo: { type: Type.STRING, description: "Nombre completo del médico" },
              apellido_paterno: { type: Type.STRING },
              apellido_materno: { type: Type.STRING },
              nombres: { type: Type.STRING },
              numero_proveedor: { type: Type.STRING },
              rfc: { type: Type.STRING },
              especialidad: { type: Type.STRING },
              cedula_profesional: { type: Type.STRING },
              cedula_especialidad: { type: Type.STRING },
              correo_electronico: { type: Type.STRING },
              telefono_consultorio: { type: Type.STRING },
              telefono_movil: { type: Type.STRING },
              convenio_red: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Sí/No como array" },
              acepta_tabulador: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Sí/No como array" }
            }
          },

          equipo_quirurgico: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                rol: { type: Type.STRING, description: "Anestesiólogo, Primer Ayudante, Segundo Ayudante, Otros" },
                nombre: { type: Type.STRING },
                especialidad: { type: Type.STRING },
                presupuesto: { type: Type.STRING }
              }
            }
          },

          firma_cierre: {
            type: Type.OBJECT,
            properties: {
              lugar: { type: Type.STRING },
              fecha: { 
                type: Type.OBJECT, 
                properties: { 
                  dia: { type: Type.STRING }, 
                  mes: { type: Type.STRING }, 
                  año: { type: Type.STRING }, 
                  formatted: { type: Type.STRING } 
                } 
              },
              nombre_firma: { type: Type.STRING },
              firma_autografa_detectada: { type: Type.STRING, description: "Detectada / No detectada" }
            }
          },

          metadata: {
            type: Type.OBJECT,
            properties: {
              existe_coherencia_clinica: { type: Type.STRING, description: "Sí / No" },
              observaciones: { type: Type.STRING }
            }
          }
        },
        required: ['provider', 'identificacion', 'padecimiento_actual', 'medico_tratante']
      }
    },
    required: ['extracted']
  }
};
