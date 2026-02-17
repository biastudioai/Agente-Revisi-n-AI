import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export type DetectedProvider = 'METLIFE' | 'GNP' | 'NYLIFE' | 'AXA' | 'AXA_2018' | 'UNKNOWN';

interface DetectionResult {
  provider: DetectedProvider;
  confidence: 'high' | 'medium' | 'low';
  matchedKeywords: string[];
}

const PROVIDER_KEYWORDS: Record<string, string[]> = {
  METLIFE: [
    'metlife',
    'metropolitan life',
    'met life',
    'metlife mexico',
    'metlife méxico'
  ],
  GNP: [
    'gnp',
    'grupo nacional provincial',
    'gnp seguros',
    'gnp mexico',
    'gnp méxico'
  ],
  NYLIFE: [
    'seguros monterrey',
    'new york life',
    'monterrey new york',
    'nylife'
  ],
  AXA: [
    'axa seguros',
    'axa',
  ]
};

const AXA_2025_MARKERS = ['ai-461', 'ai - 461', 'julio 2025', 'piso 3'];
const AXA_2018_MARKERS = ['ai-346', 'ai - 346', 'noviembre 2018', 'piso 6'];

function detectAxaVersion(text: string): DetectedProvider {
  const normalizedText = text.toLowerCase();
  for (const marker of AXA_2025_MARKERS) {
    if (normalizedText.includes(marker)) return 'AXA';
  }
  for (const marker of AXA_2018_MARKERS) {
    if (normalizedText.includes(marker)) return 'AXA_2018';
  }
  return 'AXA';
}

export async function extractTextFromPdf(base64Data: string): Promise<string> {
  try {
    const binaryData = atob(base64Data);
    const bytes = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i);
    }

    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    let fullText = '';

    const pagesToCheck = Math.min(pdf.numPages, 2);
    for (let i = 1; i <= pagesToCheck; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + ' ';
    }

    return fullText.toLowerCase();
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    return '';
  }
}

export function detectProviderFromText(text: string): DetectionResult {
  const normalizedText = text.toLowerCase();
  
  for (const [provider, keywords] of Object.entries(PROVIDER_KEYWORDS)) {
    const matchedKeywords: string[] = [];
    
    for (const keyword of keywords) {
      if (normalizedText.includes(keyword)) {
        matchedKeywords.push(keyword);
      }
    }
    
    if (matchedKeywords.length > 0) {
      let detectedProvider = provider as DetectedProvider;
      
      if (provider === 'AXA') {
        detectedProvider = detectAxaVersion(normalizedText);
      }
      
      return {
        provider: detectedProvider,
        confidence: matchedKeywords.length >= 2 ? 'high' : 'medium',
        matchedKeywords
      };
    }
  }

  return {
    provider: 'UNKNOWN',
    confidence: 'low',
    matchedKeywords: []
  };
}

export async function detectProviderFromPdf(base64Data: string): Promise<DetectionResult> {
  const text = await extractTextFromPdf(base64Data);
  if (!text) {
    return {
      provider: 'UNKNOWN',
      confidence: 'low',
      matchedKeywords: []
    };
  }
  return detectProviderFromText(text);
}

export function detectProviderFromFilename(filename: string): DetectionResult {
  const normalizedName = filename.toLowerCase();
  
  for (const [provider, keywords] of Object.entries(PROVIDER_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedName.includes(keyword)) {
        let detectedProvider = provider as DetectedProvider;
        
        if (provider === 'AXA') {
          if (normalizedName.includes('2018')) {
            detectedProvider = 'AXA_2018';
          } else {
            detectedProvider = 'AXA';
          }
        }
        
        return {
          provider: detectedProvider,
          confidence: 'medium',
          matchedKeywords: [keyword]
        };
      }
    }
  }

  return {
    provider: 'UNKNOWN',
    confidence: 'low',
    matchedKeywords: []
  };
}
