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
    'Secciones como "Causa del Reclamo", "Signos Vitales", "Historia Clínica"',
    'Formato de informe médico GNP estándar'
  ],

  extractionInstructions: `
INSTRUCCIONES DE EXTRACCIÓN PARA GNP:

DATOS DEL TRÁMITE:
- tipo_tramite: Tipo de trámite solicitado
- numero_poliza: Número de póliza

DATOS DEL PACIENTE:
- primer_apellido, segundo_apellido, nombres: Nombre completo del paciente
- edad: Edad del paciente
- sexo: Sexo del paciente
- causa_atencion: Causa de atención médica

ANTECEDENTES:
- personales_patologicos: Antecedentes personales patológicos
- personales_no_patologicos: Antecedentes personales no patológicos
- gineco_obstetricos: Antecedentes gineco-obstétricos
- perinatales: Antecedentes perinatales
- historia_clinica_breve: Resumen de historia clínica

SIGNOS VITALES:
- pulso: Frecuencia de pulso
- respiracion: Frecuencia respiratoria
- temperatura: Temperatura corporal
- presion_arterial: Presión arterial (sistólica/diastólica)
- peso: Peso del paciente
- altura: Altura del paciente

PADECIMIENTO ACTUAL:
- descripcion: Descripción del padecimiento actual
- fecha_inicio: Fecha de inicio del padecimiento
- tipo_padecimiento: Tipo de padecimiento

DIAGNÓSTICO:
- diagnostico_definitivo: Diagnóstico definitivo
- fecha_diagnostico: Fecha del diagnóstico
- codigo_cie: Código CIE-10 si aplica

TRATAMIENTO E INTERVENCIÓN:
- descripcion: Descripción del tratamiento
- fecha_inicio: Fecha de inicio del tratamiento
- equipo_especifico: Equipo utilizado en intervención

HOSPITAL:
- nombre_hospital: Nombre del hospital
- ciudad: Ciudad
- estado: Estado
- fecha_ingreso: Fecha de ingreso

MÉDICO TRATANTE:
- primer_apellido, segundo_apellido, nombres: Nombre del médico
- especialidad: Especialidad médica
- cedula_profesional: Cédula profesional
- convenio_gnp: ¿Tiene convenio con GNP?
- telefono_consultorio: Teléfono del consultorio

FIRMA:
- lugar_fecha: Lugar y fecha de la firma
`,

  requiredFields: [
    'identificacion.nombres',
    'identificacion.edad',
    'diagnostico.diagnostico_definitivo',
    'signos_vitales.presion_arterial',
    'signos_vitales.temperatura',
    'medico_tratante.nombres'
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
              tipo_tramite: { type: Type.STRING },
              numero_poliza: { type: Type.STRING },
              reembolso: { type: Type.BOOLEAN },
              programacion_cirugia: { type: Type.BOOLEAN },
              programacion_medicamentos: { type: Type.BOOLEAN },
              indemnizacion: { type: Type.BOOLEAN }
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
              perinatales: { type: Type.STRING },
              historia_clinica_breve: { type: Type.STRING }
            }
          },

          signos_vitales: {
            type: Type.OBJECT,
            properties: {
              pulso: { type: Type.STRING },
              respiracion: { type: Type.STRING },
              temperatura: { type: Type.STRING },
              presion_arterial: { type: Type.STRING },
              presion_arterial_sistolica: { type: Type.STRING },
              presion_arterial_diastolica: { type: Type.STRING },
              peso: { type: Type.STRING },
              altura: { type: Type.STRING }
            }
          },

          padecimiento_actual: {
            type: Type.OBJECT,
            properties: {
              descripcion: { type: Type.STRING },
              fecha_inicio: { type: Type.STRING },
              tipo_padecimiento: { type: Type.STRING }
            }
          },

          diagnostico: {
            type: Type.OBJECT,
            properties: {
              diagnostico_definitivo: { type: Type.STRING },
              fecha_diagnostico: { type: Type.STRING },
              tipo_padecimiento: { type: Type.STRING },
              codigo_cie: { type: Type.STRING },
              cie_coherente_con_texto: { type: Type.BOOLEAN },
              explicacion_incoherencia_cie: { type: Type.STRING }
            }
          },

          exploracion_fisica: {
            type: Type.OBJECT,
            properties: {
              resultados: { type: Type.STRING },
              fecha: { type: Type.STRING }
            }
          },

          estudios: {
            type: Type.OBJECT,
            properties: {
              estudios_realizados: { type: Type.STRING }
            }
          },

          complicaciones: {
            type: Type.OBJECT,
            properties: {
              presento_complicaciones: { type: Type.BOOLEAN },
              fecha_inicio: { type: Type.STRING },
              descripcion: { type: Type.STRING }
            }
          },

          tratamiento: {
            type: Type.OBJECT,
            properties: {
              descripcion: { type: Type.STRING },
              fecha_inicio: { type: Type.STRING }
            }
          },

          intervencion_qx: {
            type: Type.OBJECT,
            properties: {
              equipo_especifico: { type: Type.STRING },
              fechas: { type: Type.STRING },
              tecnica: { type: Type.STRING }
            }
          },

          hospital: {
            type: Type.OBJECT,
            properties: {
              nombre_hospital: { type: Type.STRING },
              ciudad: { type: Type.STRING },
              estado: { type: Type.STRING },
              fecha_ingreso: { type: Type.STRING }
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
              telefono_consultorio: { type: Type.STRING },
              ppto_honorarios: { type: Type.STRING },
              hubo_interconsulta: { type: Type.BOOLEAN }
            }
          },

          otros_medicos: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                tipo_participacion: { type: Type.STRING },
                primer_apellido: { type: Type.STRING },
                segundo_apellido: { type: Type.STRING },
                nombres: { type: Type.STRING },
                especialidad: { type: Type.STRING },
                cedula_profesional: { type: Type.STRING },
                ppto_honorarios: { type: Type.STRING }
              }
            }
          },

          firma: {
            type: Type.OBJECT,
            properties: {
              lugar_fecha: { type: Type.STRING },
              nombre_firma: { type: Type.STRING }
            }
          },

          metadata: {
            type: Type.OBJECT,
            properties: {
              existe_coherencia_clinica: { type: Type.BOOLEAN },
              observacion_coherencia: { type: Type.STRING }
            }
          }
        },
        required: ["provider"]
      }
    },
    required: ["extracted"]
  }
};
