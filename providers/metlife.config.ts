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
INSTRUCCIONES DE EXTRACCIÓN PARA METLIFE (ALTA PRIORIDAD):

CABECERA (Lugar y Fecha):
- Extrae "Lugar" del campo de lugar
- Combina las casillas de Día, Mes y Año en formato "DD/MM/AAAA" para "fecha"

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

SECCIÓN 6 - DATOS DEL MÉDICO:
- tipo_atencion: Médico tratante, Cirujano principal, Interconsultante, Equipo quirúrgico, Segunda valoración
- nombres: Nombre completo del médico
- especialidad: Especialidad médica
- domicilio_consultorio: Domicilio del consultorio
- telefono_consultorio: Teléfono del consultorio
- cedula_profesional: Cédula profesional de especialidad
- celular: Número celular del médico
- rfc: RFC del médico
- correo_electronico: Correo electrónico
- convenio_aseguradora: ¿Tiene convenio con la aseguradora? (Sí/No)
- se_ajusta_tabulador: ¿Acepta los tabuladores de pago directo? (Sí/No)

PRESUPUESTO DE HONORARIOS:
- honorarios_cirujano: Presupuesto honorarios cirujano
- honorarios_anestesiologo: Presupuesto honorarios anestesiólogo
- honorarios_ayudante: Presupuesto honorarios primer ayudante
- honorarios_otro_1: Presupuesto honorarios otro 1
- honorarios_otro_2: Presupuesto honorarios otro 2

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
              causa_atencion: { type: Type.STRING, description: "Accidente, Enfermedad, Embarazo o Segunda valoración" },
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
              tipo_padecimiento: { type: Type.STRING, description: "Congénito, Adquirido, Agudo o Crónico" },
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
              tipo_atencion: { type: Type.STRING, description: "Tratante, Cirujano, Interconsultante, Equipo Qx, Segunda valoración" },
              nombres: { type: Type.STRING, description: "Nombre completo del médico" },
              especialidad: { type: Type.STRING, description: "Especialidad médica" },
              domicilio_consultorio: { type: Type.STRING, description: "Domicilio del consultorio" },
              telefono_consultorio: { type: Type.STRING, description: "Teléfono del consultorio" },
              cedula_profesional: { type: Type.STRING, description: "Cédula profesional" },
              cedula_especialidad: { type: Type.STRING, description: "Cédula de especialidad" },
              celular: { type: Type.STRING, description: "Número celular" },
              rfc: { type: Type.STRING, description: "RFC del médico" },
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
