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
INSTRUCCIONES DE EXTRACCIÓN PARA GNP:

SECCIÓN TRÁMITE:
- Identifica cuáles opciones están marcadas: Reembolso, Programación de cirugía, Programación de medicamentos, Programación de servicios, Indemnización, Reporte hospitalario
- Pueden estar marcadas múltiples opciones

FICHA DE IDENTIFICACIÓN DEL ASEGURADO:
- numero_poliza: Número de póliza del asegurado
- primer_apellido: Primer apellido del paciente
- segundo_apellido: Segundo apellido del paciente  
- nombres: Nombre(s) del paciente
- sexo: F (Femenino) o M (Masculino)
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

MÉDICOS INTERCONSULTANTES O PARTICIPANTES (hasta 3):
Para cada médico extraer:
- tipo_participacion: Interconsultante, Cirujano, Anestesiólogo, Ayudantía, u Otra
- primer_apellido, segundo_apellido, nombres
- especialidad
- cedula_profesional, cedula_especialidad
- ppto_honorarios: Presupuesto de honorarios

FIRMA:
- lugar_fecha: Lugar y fecha de la firma
- nombre_firma: Nombre del médico que firma
- firma_autografa_detectada: true si se ve una firma manuscrita real, false si solo hay nombre impreso
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
              reembolso: { type: Type.BOOLEAN, description: "Casilla Reembolso marcada" },
              programacion_cirugia: { type: Type.BOOLEAN, description: "Casilla Programación de cirugía marcada" },
              programacion_medicamentos: { type: Type.BOOLEAN, description: "Casilla Programación de medicamentos marcada" },
              programacion_servicios: { type: Type.BOOLEAN, description: "Casilla Programación de servicios marcada" },
              indemnizacion: { type: Type.BOOLEAN, description: "Casilla Indemnización marcada" },
              reporte_hospitalario: { type: Type.BOOLEAN, description: "Casilla Reporte hospitalario marcada" },
              numero_poliza: { type: Type.STRING, description: "Número de póliza" }
            }
          },

          identificacion: {
            type: Type.OBJECT,
            properties: {
              primer_apellido: { type: Type.STRING, description: "Primer apellido del paciente" },
              segundo_apellido: { type: Type.STRING, description: "Segundo apellido del paciente" },
              nombres: { type: Type.STRING, description: "Nombre(s) del paciente" },
              edad: { type: Type.STRING, description: "Edad del paciente" },
              sexo: { type: Type.STRING, description: "Sexo: F o M" },
              causa_atencion: { type: Type.STRING, description: "Accidente, Enfermedad o Embarazo" }
            }
          },

          antecedentes: {
            type: Type.OBJECT,
            properties: {
              personales_patologicos: { type: Type.STRING, description: "Antecedentes personales patológicos con fechas" },
              personales_no_patologicos: { type: Type.STRING, description: "Antecedentes personales no patológicos" },
              gineco_obstetricos: { type: Type.STRING, description: "Antecedentes gineco-obstétricos (descripción anatómica)" },
              perinatales: { type: Type.STRING, description: "Antecedentes perinatales" }
            }
          },

          signos_vitales: {
            type: Type.OBJECT,
            properties: {
              pulso: { type: Type.STRING, description: "Pulso (x minuto)" },
              respiracion: { type: Type.STRING, description: "Respiración (x minuto)" },
              temperatura: { type: Type.STRING, description: "Temperatura (°C)" },
              presion_arterial: { type: Type.STRING, description: "Presión arterial (mm Hg)" },
              peso: { type: Type.STRING, description: "Peso (kg)" },
              altura: { type: Type.STRING, description: "Altura (m)" }
            }
          },

          padecimiento_actual: {
            type: Type.OBJECT,
            properties: {
              descripcion: { type: Type.STRING, description: "Descripción del padecimiento actual" },
              fecha_inicio: { type: Type.STRING, description: "Fecha de inicio del padecimiento" },
              tipo_padecimiento: { type: Type.STRING, description: "Congénito, Adquirido, Agudo o Crónico" }
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
              primer_apellido: { type: Type.STRING, description: "Primer apellido del médico" },
              segundo_apellido: { type: Type.STRING, description: "Segundo apellido del médico" },
              nombres: { type: Type.STRING, description: "Nombre(s) del médico" },
              especialidad: { type: Type.STRING, description: "Especialidad médica" },
              cedula_profesional: { type: Type.STRING, description: "Cédula profesional" },
              cedula_especialidad: { type: Type.STRING, description: "Cédula de especialidad" },
              convenio_gnp: { type: Type.BOOLEAN, description: "¿Está en convenio con GNP?" },
              se_ajusta_tabulador: { type: Type.BOOLEAN, description: "¿Se ajusta al tabulador?" },
              ppto_honorarios: { type: Type.STRING, description: "Presupuesto de honorarios" },
              telefono_consultorio: { type: Type.STRING, description: "Teléfono del consultorio" },
              celular: { type: Type.STRING, description: "Celular del médico" },
              correo_electronico: { type: Type.STRING, description: "Correo electrónico" },
              tipo_participacion: { type: Type.STRING, description: "Tratante, Cirujano, u Otra" },
              tipo_participacion_otra: { type: Type.STRING, description: "Si es Otra, especificar cuál" },
              hubo_interconsulta: { type: Type.BOOLEAN, description: "¿Hubo interconsulta?" }
            }
          },

          otros_medicos: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                tipo_participacion: { type: Type.STRING, description: "Interconsultante, Cirujano, Anestesiólogo, Ayudantía, u Otra" },
                tipo_participacion_otra: { type: Type.STRING, description: "Si es Otra, especificar cuál" },
                primer_apellido: { type: Type.STRING },
                segundo_apellido: { type: Type.STRING },
                nombres: { type: Type.STRING },
                especialidad: { type: Type.STRING },
                cedula_profesional: { type: Type.STRING },
                cedula_especialidad: { type: Type.STRING },
                ppto_honorarios: { type: Type.STRING, description: "Presupuesto de honorarios" }
              }
            },
            description: "Lista de hasta 3 médicos interconsultantes o participantes"
          },

          firma: {
            type: Type.OBJECT,
            properties: {
              lugar_fecha: { type: Type.STRING, description: "Lugar y fecha de la firma" },
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
