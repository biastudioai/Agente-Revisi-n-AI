import React, { useRef, useState } from 'react';
import { Upload, FileText, Loader2, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onFileSelected: (base64: string, mimeType: string) => void;
  isProcessing: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelected, isProcessing }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    processFile(file);
  };

  const processFile = (file: File) => {
    setError(null);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setError("Formato no soportado. Usa JPG, PNG o PDF.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = result.split(',')[1];
      onFileSelected(base64Data, file.type);
    };
    reader.onerror = () => {
      setError("Error al leer el archivo.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div 
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
          isProcessing ? 'bg-gray-50 border-gray-300 cursor-wait' : 'bg-white border-brand-300 hover:border-brand-500 cursor-pointer'
        }`}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/*,.pdf"
        />
        
        {isProcessing ? (
          <div className="flex flex-col items-center animate-pulse">
            <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
            <h3 className="text-xl font-semibold text-brand-900">Analizando Informe...</h3>
            <p className="text-gray-500 mt-2">Nuestra IA está extrayendo datos y validando reglas.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center group">
            <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-brand-100 transition-colors">
              <Upload className="w-8 h-8 text-brand-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800">Sube tu Informe Médico</h3>
            <p className="text-gray-500 mt-2 mb-6">Arrastra un archivo o haz clic para seleccionar (PDF, JPG, PNG)</p>
            <button className="px-6 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors shadow-sm">
              Seleccionar Archivo
            </button>
          </div>
        )}
      </div>
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
