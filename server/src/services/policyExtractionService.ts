import { getAIClient, FileInput } from './geminiService';
import { PatientPolicyData, CondicionesGeneralesData } from '../../../types/policy-types';

const MODEL_NAME = "gemini-3-flash-preview";

const PATIENT_POLICY_SYSTEM_PROMPT = `Eres un analista experto en pólizas de gastos médicos mayores en México.
Extrae los datos estructurados de esta carátula de póliza de seguro de gastos médicos mayores.

INSTRUCCIONES:
- Extrae todos los datos disponibles en el documento.
- Las fechas deben estar en formato DD/MM/YYYY.
- Los montos numéricos deben ser números sin formato (sin comas ni signos de moneda).
- Si un campo no está presente en el documento, déjalo como null o string vacío.
- Para coberturas, indica si están incluidas o no.
- Para exclusiones, lista todas las que aparezcan.
- El estado de la póliza puede ser: "Vigente", "Cancelada", "Vencida", "Suspendida".`;

const CONDICIONES_GENERALES_SYSTEM_PROMPT = `Eres un analista experto en condiciones generales de seguros de gastos médicos mayores en México.
Extrae los datos estructurados de este documento de condiciones generales.

INSTRUCCIONES:
- Extrae todos los periodos de espera mencionados, incluyendo el tipo de padecimiento y los meses de espera.
- Lista todas las exclusiones generales del producto.
- Extrae las reglas de coaseguro (porcentaje que paga la aseguradora vs el asegurado).
- Identifica reglas de preexistencias.
- Lista procedimientos que requieran autorización previa o tengan condiciones especiales.
- Si se mencionan edades máximas de ingreso o renovación, extráelas.
- Los periodos se expresan en meses.
- Si no encuentras información para alguna sección, deja el array vacío.`;

const PATIENT_POLICY_SCHEMA = {
  type: "object",
  properties: {
    numero_poliza: { type: "string", description: "Número de póliza" },
    vigencia_desde: { type: "string", description: "Fecha inicio vigencia DD/MM/YYYY" },
    vigencia_hasta: { type: "string", description: "Fecha fin vigencia DD/MM/YYYY" },
    estado_poliza: { type: "string", description: "Estado: Vigente, Cancelada, Vencida, Suspendida" },
    titular_nombre: { type: "string", description: "Nombre del titular de la póliza" },
    asegurado_nombre: { type: "string", description: "Nombre del asegurado" },
    fecha_nacimiento: { type: "string", description: "Fecha de nacimiento DD/MM/YYYY" },
    fecha_antiguedad: { type: "string", description: "Fecha de antigüedad en el seguro DD/MM/YYYY" },
    suma_asegurada: { type: "number", description: "Suma asegurada en número" },
    moneda: { type: "string", description: "Moneda: MXN, USD" },
    deducible: { type: "number", description: "Monto del deducible" },
    deducible_tipo: { type: "string", description: "Tipo: Por evento, Anual" },
    coaseguro_porcentaje: { type: "number", description: "Porcentaje de coaseguro del asegurado" },
    tope_coaseguro: { type: "number", description: "Tope máximo de coaseguro" },
    coberturas_incluidas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nombre: { type: "string", description: "Nombre de la cobertura" },
          sublimite: { type: "string", description: "Sublímite si aplica" },
          incluida: { type: "boolean", description: "Si está incluida" }
        },
        required: ["nombre", "incluida"]
      }
    },
    endosos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          numero: { type: "string", description: "Número de endoso" },
          descripcion: { type: "string", description: "Descripción" },
          tipo: { type: "string", description: "Tipo de endoso" }
        },
        required: ["numero", "descripcion", "tipo"]
      }
    },
    exclusiones_especificas: {
      type: "array",
      items: { type: "string" },
      description: "Exclusiones específicas de esta póliza"
    }
  },
  required: ["coberturas_incluidas", "endosos", "exclusiones_especificas"]
};

const CONDICIONES_GENERALES_SCHEMA = {
  type: "object",
  properties: {
    periodos_espera: {
      type: "array",
      items: {
        type: "object",
        properties: {
          padecimiento_tipo: { type: "string", description: "Tipo de padecimiento" },
          meses: { type: "number", description: "Meses de espera" },
          codigos_cie_aplicables: {
            type: "array",
            items: { type: "string" },
            description: "Códigos CIE aplicables si se mencionan"
          }
        },
        required: ["padecimiento_tipo", "meses"]
      }
    },
    exclusiones_generales: {
      type: "array",
      items: { type: "string" },
      description: "Lista de exclusiones generales del producto"
    },
    coaseguro_rules: {
      type: "array",
      items: {
        type: "object",
        properties: {
          concepto: { type: "string", description: "Concepto" },
          porcentaje_asegurado: { type: "number", description: "% que paga la aseguradora" },
          tope_maximo: { type: "number", description: "Tope máximo si aplica" }
        },
        required: ["concepto", "porcentaje_asegurado"]
      }
    },
    preexistencias_regla: {
      type: "object",
      properties: {
        periodo_exclusion_meses: { type: "number", description: "Meses de exclusión por preexistencia" },
        condiciones_excluidas_permanente: {
          type: "array",
          items: { type: "string" },
          description: "Condiciones excluidas permanentemente"
        }
      },
      required: ["periodo_exclusion_meses", "condiciones_excluidas_permanente"]
    },
    procedimientos_especiales: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nombre: { type: "string", description: "Nombre del procedimiento" },
          requiere_autorizacion_previa: { type: "boolean" },
          periodo_espera_meses: { type: "number" },
          excluido: { type: "boolean" }
        },
        required: ["nombre", "requiere_autorizacion_previa"]
      }
    },
    edad_maxima_ingreso: { type: "number", description: "Edad máxima de ingreso" },
    edad_maxima_renovacion: { type: "number", description: "Edad máxima de renovación" },
    suma_asegurada_maxima: { type: "number", description: "Suma asegurada máxima del producto" }
  },
  required: ["periodos_espera", "exclusiones_generales", "coaseguro_rules", "procedimientos_especiales"]
};

export async function extractPatientPolicy(files: FileInput[]): Promise<{ data: PatientPolicyData; rawResponse: string }> {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("⏱️  INICIO EXTRACCIÓN DE PÓLIZA DEL PACIENTE");
  console.log(`   📄 Archivos: ${files.length}`);
  console.log("═══════════════════════════════════════════════════════════════");

  const startTime = Date.now();
  const ai = getAIClient();

  const imageParts = files.map((file) => ({
    inlineData: {
      mimeType: file.mimeType,
      data: file.base64Data
    }
  }));

  const contextMessage = files.length > 1
    ? `Extrae toda la información de esta carátula de póliza de ${files.length} páginas. Las imágenes están en orden.`
    : `Extrae toda la información de esta carátula de póliza.`;

  const contents = [
    { text: PATIENT_POLICY_SYSTEM_PROMPT },
    ...imageParts,
    { text: contextMessage }
  ];

  let response;
  try {
    response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: contents as any,
      config: {
        temperature: 0.0,
        responseMimeType: "application/json",
        responseSchema: PATIENT_POLICY_SCHEMA as any
      }
    });
  } catch (schemaError: any) {
    if (schemaError.status === 400) {
      console.log("⚠️  Schema rejected, retrying without responseSchema...");
      const schemaHint = `\n\nResponde ÚNICAMENTE con un JSON válido que siga esta estructura:\n${JSON.stringify(PATIENT_POLICY_SCHEMA)}`;
      const fallbackContents = [
        { text: PATIENT_POLICY_SYSTEM_PROMPT + schemaHint },
        ...imageParts,
        { text: contextMessage }
      ];
      response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: fallbackContents as any,
        config: {
          temperature: 0.0,
          responseMimeType: "application/json"
        }
      });
    } else {
      throw schemaError;
    }
  }

  const text = response.text;
  if (!text) throw new Error("Empty response from AI for policy extraction");

  const jsonData = JSON.parse(text);
  const totalTime = Date.now() - startTime;

  console.log(`✅ EXTRACCIÓN DE PÓLIZA COMPLETADA en ${totalTime}ms`);

  const policyData: PatientPolicyData = {
    numero_poliza: jsonData.numero_poliza || undefined,
    vigencia_desde: jsonData.vigencia_desde || undefined,
    vigencia_hasta: jsonData.vigencia_hasta || undefined,
    estado_poliza: jsonData.estado_poliza || undefined,
    titular_nombre: jsonData.titular_nombre || undefined,
    asegurado_nombre: jsonData.asegurado_nombre || undefined,
    fecha_nacimiento: jsonData.fecha_nacimiento || undefined,
    fecha_antiguedad: jsonData.fecha_antiguedad || undefined,
    suma_asegurada: jsonData.suma_asegurada || undefined,
    moneda: jsonData.moneda || undefined,
    deducible: jsonData.deducible || undefined,
    deducible_tipo: jsonData.deducible_tipo || undefined,
    coaseguro_porcentaje: jsonData.coaseguro_porcentaje || undefined,
    tope_coaseguro: jsonData.tope_coaseguro || undefined,
    coberturas_incluidas: jsonData.coberturas_incluidas || [],
    endosos: jsonData.endosos || [],
    exclusiones_especificas: jsonData.exclusiones_especificas || [],
  };

  return { data: policyData, rawResponse: text };
}

export async function extractCondicionesGenerales(files: FileInput[]): Promise<{ data: CondicionesGeneralesData; rawResponse: string }> {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("⏱️  INICIO EXTRACCIÓN DE CONDICIONES GENERALES");
  console.log(`   📄 Archivos: ${files.length}`);
  console.log("═══════════════════════════════════════════════════════════════");

  const startTime = Date.now();
  const ai = getAIClient();

  const imageParts = files.map((file) => ({
    inlineData: {
      mimeType: file.mimeType,
      data: file.base64Data
    }
  }));

  const contextMessage = `Analiza este documento de condiciones generales de seguro de gastos médicos mayores y extrae toda la información estructurada. El documento tiene ${files.length} página(s).`;

  const contents = [
    { text: CONDICIONES_GENERALES_SYSTEM_PROMPT },
    ...imageParts,
    { text: contextMessage }
  ];

  let response;
  try {
    response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: contents as any,
      config: {
        temperature: 0.0,
        responseMimeType: "application/json",
        responseSchema: CONDICIONES_GENERALES_SCHEMA as any
      }
    });
  } catch (schemaError: any) {
    if (schemaError.status === 400) {
      console.log("⚠️  Schema rejected, retrying without responseSchema...");
      const schemaHint = `\n\nResponde ÚNICAMENTE con un JSON válido que siga esta estructura:\n${JSON.stringify(CONDICIONES_GENERALES_SCHEMA)}`;
      const fallbackContents = [
        { text: CONDICIONES_GENERALES_SYSTEM_PROMPT + schemaHint },
        ...imageParts,
        { text: contextMessage }
      ];
      response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: fallbackContents as any,
        config: {
          temperature: 0.0,
          responseMimeType: "application/json"
        }
      });
    } else {
      throw schemaError;
    }
  }

  const text = response.text;
  if (!text) throw new Error("Empty response from AI for condiciones generales extraction");

  const jsonData = JSON.parse(text);
  const totalTime = Date.now() - startTime;

  console.log(`✅ EXTRACCIÓN DE CONDICIONES GENERALES COMPLETADA en ${totalTime}ms`);

  const conditionsData: CondicionesGeneralesData = {
    periodos_espera: jsonData.periodos_espera || [],
    exclusiones_generales: jsonData.exclusiones_generales || [],
    coaseguro_rules: jsonData.coaseguro_rules || [],
    preexistencias_regla: jsonData.preexistencias_regla || undefined,
    procedimientos_especiales: jsonData.procedimientos_especiales || [],
    edad_maxima_ingreso: jsonData.edad_maxima_ingreso || undefined,
    edad_maxima_renovacion: jsonData.edad_maxima_renovacion || undefined,
    suma_asegurada_maxima: jsonData.suma_asegurada_maxima || undefined,
  };

  return { data: conditionsData, rawResponse: text };
}
