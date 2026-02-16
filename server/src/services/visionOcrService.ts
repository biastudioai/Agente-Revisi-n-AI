import { ImageAnnotatorClient } from "@google-cloud/vision";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

let credentialsFilePath: string | null = null;
let credentialsSetup = false;
let visionClient: ImageAnnotatorClient | null = null;

function setupCredentials(): void {
  const credentialsEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (!credentialsEnv) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS no está configurado.");
  }
  
  if (credentialsEnv.startsWith('{')) {
    const tempDir = os.tmpdir();
    credentialsFilePath = path.join(tempDir, 'gcp-vision-credentials.json');
    fs.writeFileSync(credentialsFilePath, credentialsEnv, 'utf8');
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsFilePath;
    console.log("Credenciales de GCP para Vision escritas a archivo temporal");
  }
}

function getVisionClient(): ImageAnnotatorClient {
  if (!credentialsSetup) {
    setupCredentials();
    credentialsSetup = true;
  }
  
  if (!visionClient) {
    visionClient = new ImageAnnotatorClient();
  }
  
  return visionClient;
}

export interface FileInput {
  base64Data: string;
  mimeType: string;
}

const isPdf = (mimeType: string): boolean => mimeType === 'application/pdf';

const extractTextFromImage = async (client: ImageAnnotatorClient, base64Data: string): Promise<string> => {
  const imageBuffer = Buffer.from(base64Data, 'base64');
  const [response] = await client.documentTextDetection({
    image: { content: imageBuffer },
    imageContext: { languageHints: ["es"] }
  });
  return response.fullTextAnnotation?.text || "";
};

const extractTextFromPdf = async (client: ImageAnnotatorClient, base64Data: string): Promise<string> => {
  const pdfBuffer = Buffer.from(base64Data, 'base64');
  
  const [result] = await client.batchAnnotateFiles({
    requests: [{
      inputConfig: {
        content: pdfBuffer,
        mimeType: 'application/pdf',
      },
      features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
      imageContext: { languageHints: ["es"] },
      pages: [1, 2, 3, 4, 5]
    }]
  });

  const fileResponse = result.responses?.[0];
  if (!fileResponse?.responses) return "";

  const pageTexts: string[] = [];
  for (let i = 0; i < fileResponse.responses.length; i++) {
    const pageResponse = fileResponse.responses[i];
    const pageText = pageResponse.fullTextAnnotation?.text || "";
    if (i > 0) {
      pageTexts.push(`--- Página ${i + 1} ---`);
    }
    pageTexts.push(pageText);
  }
  
  return pageTexts.join("\n");
};

export const extractTextWithVisionOcr = async (files: FileInput[]): Promise<string> => {
  const startTime = Date.now();
  try {
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("🔍 INICIO EXTRACCIÓN OCR CON VISION API");
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("Archivos a procesar:", files.length);
    
    const client = getVisionClient();
    const allTexts: string[] = [];
    
    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      const file = files[fileIndex];
      const fileStartTime = Date.now();
      const pageNumber = fileIndex + 1;
      const fileType = isPdf(file.mimeType) ? 'PDF' : 'Imagen';
      
      console.log(`⏱️  Procesando archivo ${pageNumber}/${files.length} (${fileType})...`);
      
      const visionStartTime = Date.now();
      let extractedText: string;

      if (isPdf(file.mimeType)) {
        extractedText = await extractTextFromPdf(client, file.base64Data);
      } else {
        extractedText = await extractTextFromImage(client, file.base64Data);
      }

      const visionTime = Date.now() - visionStartTime;
      
      const fileTime = Date.now() - fileStartTime;
      console.log(`✅ Archivo ${pageNumber} (${fileType}) procesado en: ${fileTime}ms (Vision API: ${visionTime}ms)`);
      console.log(`📄 Caracteres extraídos: ${extractedText.length}`);
      
      if (pageNumber > 1) {
        allTexts.push(`--- Archivo ${pageNumber} ---`);
      }
      allTexts.push(extractedText);
    }
    
    const concatenatedText = allTexts.join("\n");
    
    const totalTime = Date.now() - startTime;
    console.log("═══════════════════════════════════════════════════════════════");
    console.log(`✅ EXTRACCIÓN OCR COMPLETADA`);
    console.log(`⏱️  TIEMPO TOTAL: ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);
    console.log("───────────────────────────────────────────────────────────────");
    console.log(`   📊 Resumen:`);
    console.log(`      - Archivos procesados: ${files.length}`);
    console.log(`      - Total de caracteres extraídos: ${concatenatedText.length}`);
    console.log("═══════════════════════════════════════════════════════════════");
    
    return concatenatedText;
    
  } catch (error: any) {
    const errorTime = Date.now() - startTime;
    console.error("═══════════════════════════════════════════════════════════════");
    console.error(`❌ ERROR EN EXTRACCIÓN OCR (después de ${errorTime}ms)`);
    console.error("═══════════════════════════════════════════════════════════════");
    console.error("Error name:", error?.name);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    if (error?.response) {
      console.error("API Response error:", JSON.stringify(error.response, null, 2));
    }
    throw error;
  }
};
