import React, { useRef, useState } from 'react';
import { Upload, FileText, Loader2, AlertCircle, X, Image as ImageIcon } from 'lucide-react';

import { SavedReport } from '../types';

export interface FileData {
  base64: string;
  mimeType: string;
  name: string;
  preview?: string;
}

interface FileUploadProps {
  onFilesSelected: (files: FileData[]) => void;
  isProcessing: boolean;
  savedReports?: SavedReport[];
  onLoadReport?: (id: string) => void;
}

const MAX_FILES = 5;

const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelected, isProcessing, savedReports = [], onLoadReport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileData[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    processFiles(Array.from(files));
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFiles = async (files: File[]) => {
    setError(null);
    
    const totalFiles = selectedFiles.length + files.length;
    if (totalFiles > MAX_FILES) {
      setError(`Máximo ${MAX_FILES} archivos permitidos. Tienes ${selectedFiles.length} y estás intentando agregar ${files.length}.`);
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const invalidFiles = files.filter(f => !validTypes.includes(f.type));
    if (invalidFiles.length > 0) {
      setError(`Formato no soportado: ${invalidFiles.map(f => f.name).join(', ')}. Usa JPG, PNG o PDF.`);
      return;
    }

    setIsLoadingFiles(true);

    try {
      const newFilesData: FileData[] = await Promise.all(
        files.map(async (file) => {
          return new Promise<FileData>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              const base64Data = result.split(',')[1];
              resolve({
                base64: base64Data,
                mimeType: file.type,
                name: file.name,
                preview: file.type.startsWith('image/') ? result : undefined
              });
            };
            reader.onerror = () => reject(new Error(`Error al leer ${file.name}`));
            reader.readAsDataURL(file);
          });
        })
      );

      const updatedFiles = [...selectedFiles, ...newFilesData];
      setSelectedFiles(updatedFiles);
      onFilesSelected(updatedFiles);
    } catch (err: any) {
      setError(err.message || "Error al procesar archivos.");
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const removeFile = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updatedFiles);
    onFilesSelected(updatedFiles);
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    onFilesSelected([]);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isProcessing || isLoadingFiles) return;
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(Array.from(files));
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div 
        className={`border-2 border-dashed rounded-veryka p-6 text-center transition-colors ${
          isProcessing || isLoadingFiles ? 'bg-gray-50 border-gray-300 cursor-wait' : 'bg-white border-accent-300 hover:border-accent-500 cursor-pointer'
        }`}
        onClick={() => !isProcessing && !isLoadingFiles && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/*,.pdf"
          multiple
        />
        
        {isProcessing ? (
          <div className="flex flex-col items-center animate-pulse">
            <Loader2 className="w-10 h-10 text-veryka-cyan animate-spin mb-3" />
            <h3 className="text-lg font-semibold text-veryka-dark">Analizando Informe...</h3>
            <p className="text-sm text-gray-500 mt-1">Nuestra IA está extrayendo datos y validando reglas.</p>
          </div>
        ) : isLoadingFiles ? (
          <div className="flex flex-col items-center animate-pulse">
            <Loader2 className="w-10 h-10 text-veryka-cyan animate-spin mb-3" />
            <h3 className="text-lg font-semibold text-veryka-dark">Cargando archivos...</h3>
          </div>
        ) : (
          <div className="flex flex-col items-center group">
            <div className="w-12 h-12 bg-accent-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-accent-100 transition-colors">
              <Upload className="w-6 h-6 text-veryka-cyan" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Sube tu Informe Médico</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Arrastra archivos o haz clic para seleccionar (PDF, JPG, PNG)
              <br />
              <span className="text-xs text-accent-600 font-medium">Puedes subir hasta {MAX_FILES} archivos</span>
            </p>
            
            <div className="mb-6 p-4 bg-accent-50 border border-accent-100 rounded-veryka text-left max-w-md">
              <h4 className="text-xs font-bold text-veryka-dark uppercase tracking-wider mb-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Mejores prácticas para subirlo:
              </h4>
              <ul className="text-xs text-veryka-dark/80 space-y-1 list-disc ml-4">
                <li>Asegúrate que las imágenes sean nítidas y legibles.</li>
                <li>Si subes varias fotos, ordénalas (1, 2, 3, etc.).</li>
                <li>Evita sombras o reflejos sobre el documento.</li>
                <li>Puedes mezclar imágenes y PDFs si es necesario.</li>
              </ul>
            </div>

            <button className="px-5 py-2 bg-veryka-dark text-white rounded-veryka text-sm font-medium hover:bg-brand-800 transition-colors shadow-sm">
              Seleccionar Archivo{selectedFiles.length > 0 ? 's' : ''}
            </button>
          </div>
        )}
      </div>

      {selectedFiles.length > 0 && !isProcessing && (
        <div className="mt-4 p-4 bg-white border border-slate-200 rounded-veryka">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-700">
              Archivos seleccionados ({selectedFiles.length}/{MAX_FILES})
            </h4>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearAllFiles();
              }}
              className="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              Limpiar todo
            </button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="relative group bg-slate-50 border border-slate-200 rounded-lg overflow-hidden aspect-square"
              >
                {file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-2">
                    <FileText className="w-8 h-8 text-red-500 mb-1" />
                    <span className="text-[10px] text-slate-500 text-center truncate w-full">
                      {file.name}
                    </span>
                  </div>
                )}
                
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/50 to-transparent p-1">
                  <span className="text-[10px] text-white font-medium">
                    {index + 1}
                  </span>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            
            {selectedFiles.length < MAX_FILES && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="border-2 border-dashed border-slate-300 rounded-lg aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-accent-400 hover:bg-accent-50 transition-colors"
              >
                <Upload className="w-6 h-6 text-slate-400 mb-1" />
                <span className="text-[10px] text-slate-500">Agregar</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

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
                        <p className="text-sm font-medium text-slate-900 group-hover:text-brand-700">
                          {report.fileName}
                          {report.extractedData?.identificacion?.nombres && (
                            <span className="text-slate-500 font-normal"> - {report.extractedData.identificacion.nombres} {report.extractedData.identificacion.primer_apellido || ''}</span>
                          )}
                        </p>
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
