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
      
      console.log(`⏱️  Procesando archivo ${pageNumber}/${files.length}...`);
      
      const imageBuffer = Buffer.from(file.base64Data, 'base64');
      
      const visionStartTime = Date.now();
      const [response] = await client.documentTextDetection({
        image: { content: imageBuffer },
        imageContext: { languageHints: ["es"] }
      });
      const visionTime = Date.now() - visionStartTime;
      
      const fullTextAnnotation = response.fullTextAnnotation;
      const extractedText = fullTextAnnotation?.text || "";
      
      const fileTime = Date.now() - fileStartTime;
      console.log(`✅ Archivo ${pageNumber} procesado en: ${fileTime}ms (Vision API: ${visionTime}ms)`);
      console.log(`📄 Caracteres extraídos: ${extractedText.length}`);
      
      if (pageNumber > 1) {
        allTexts.push(`--- Página ${pageNumber} ---`);
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
