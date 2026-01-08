import React, { useRef, useState } from 'react';
import { Upload, FileText, Loader2, AlertCircle } from 'lucide-react';

import { SavedReport } from '../types';

interface FileUploadProps {
  onFileSelected: (base64: string, mimeType: string) => void;
  isProcessing: boolean;
  savedReports?: SavedReport[];
  onLoadReport?: (id: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelected, isProcessing, savedReports = [], onLoadReport }) => {
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
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
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
            <Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-3" />
            <h3 className="text-lg font-semibold text-brand-900">Analizando Informe...</h3>
            <p className="text-sm text-gray-500 mt-1">Nuestra IA está extrayendo datos y validando reglas.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center group">
            <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-brand-100 transition-colors">
              <Upload className="w-6 h-6 text-brand-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Sube tu Informe Médico</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">Arrastra un archivo o haz clic para seleccionar (PDF, JPG, PNG)</p>
            
            <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg text-left max-w-md">
              <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Mejores prácticas para subirlo:
              </h4>
              <ul className="text-xs text-blue-700 space-y-1 list-disc ml-4">
                <li>Asegúrate que la imagen sea nítida y legible.</li>
                <li>Intenta que esté en orden de páginas (1, 2, 3, etc.).</li>
                <li>Evita sombras o reflejos sobre el documento.</li>
              </ul>
            </div>

            <button className="px-5 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm">
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

      {/* Lista de reportes guardados */}
      {onLoadReport && (
        <div className="mt-8">
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Últimos Reportes Guardados
          </h3>
          {savedReports.length > 0 ? (
            <div className="max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              <div className="space-y-2">
                {savedReports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => onLoadReport(report.id)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-brand-300 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900 group-hover:text-brand-700">{report.fileName}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {report.provider} • {new Date(report.timestamp).toLocaleDateString('es-MX', { 
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="text-brand-600 group-hover:scale-110 transition-transform">
                        <FileText className="w-5 h-5" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No hay reportes guardados aún</p>
              <p className="text-[10px] text-slate-400 mt-1">Los reportes aparecerán aquí después de guardarlos</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
