import React, { useRef, useState } from 'react';
import { Upload, FileText, Loader2, AlertCircle, X, Image as ImageIcon, ChevronRight } from 'lucide-react';

import { SavedReport } from '../types';

export interface FileData {
  base64: string;
  mimeType: string;
  name: string;
  preview?: string;
}

interface FileUploadProps {
  onFilesConfirmed: (files: FileData[]) => void;
  isProcessing: boolean;
  savedReports?: SavedReport[];
  onLoadReport?: (id: string) => void;
}

const MAX_FILES = 5;
const MAX_FILE_SIZE_MB = 8; // 8MB max por archivo
const MAX_TOTAL_SIZE_MB = 25; // 25MB total máximo

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const getFileExtension = (mimeType: string): string => {
  switch (mimeType) {
    case 'application/pdf':
      return '.pdf';
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    default:
      return '';
  }
};

const getFileIcon = (mimeType: string) => {
  if (mimeType === 'application/pdf') {
    return <FileText className="w-4 h-4 text-red-500" />;
  }
  return <ImageIcon className="w-4 h-4 text-blue-500" />;
};

const FileUpload: React.FC<FileUploadProps> = ({ onFilesConfirmed, isProcessing, savedReports = [], onLoadReport }) => {
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

    // Validar tamaño individual de cada archivo
    const maxSizeBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
    const oversizedFiles = files.filter(f => f.size > maxSizeBytes);
    if (oversizedFiles.length > 0) {
      const fileDetails = oversizedFiles.map(f => `${f.name} (${formatFileSize(f.size)})`).join(', ');
      setError(`Los siguientes archivos son muy pesados (máximo ${MAX_FILE_SIZE_MB}MB por archivo): ${fileDetails}. Por favor, reduce el tamaño o usa archivos más ligeros.`);
      return;
    }

    // Validar tamaño total (incluyendo archivos ya seleccionados)
    const existingTotalSize = selectedFiles.reduce((acc, f) => acc + (f.base64.length * 0.75), 0); // Aproximar tamaño desde base64
    const newFilesSize = files.reduce((acc, f) => acc + f.size, 0);
    const totalSize = existingTotalSize + newFilesSize;
    const maxTotalBytes = MAX_TOTAL_SIZE_MB * 1024 * 1024;
    
    if (totalSize > maxTotalBytes) {
      setError(`El tamaño total de los archivos (${formatFileSize(totalSize)}) excede el límite de ${MAX_TOTAL_SIZE_MB}MB. Por favor, reduce el tamaño o elimina algunos archivos.`);
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
    } catch (err: any) {
      setError(err.message || "Error al procesar archivos.");
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const removeFile = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updatedFiles);
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    setError(null);
  };

  const handleConfirm = () => {
    if (selectedFiles.length > 0) {
      onFilesConfirmed(selectedFiles);
    }
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

  const hasFiles = selectedFiles.length > 0;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className={`flex gap-4 ${hasFiles ? 'flex-row' : 'flex-col'}`}>
        {hasFiles && (
          <div className="w-72 flex-shrink-0">
            <div className="bg-white border border-slate-200 rounded-veryka p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-700">
                  Archivos ({selectedFiles.length}/{MAX_FILES})
                </h4>
                <button
                  onClick={clearAllFiles}
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  Limpiar todo
                </button>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg group hover:bg-slate-100 transition-colors"
                  >
                    <span className="w-5 h-5 bg-slate-200 rounded text-xs font-medium flex items-center justify-center text-slate-600">
                      {index + 1}
                    </span>
                    
                    {getFileIcon(file.mimeType)}
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase">
                        {getFileExtension(file.mimeType)}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => removeFile(index)}
                      className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Eliminar archivo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200">
                <button
                  onClick={handleConfirm}
                  disabled={isProcessing || isLoadingFiles}
                  className="w-full py-2.5 bg-veryka-cyan text-white rounded-veryka text-sm font-semibold hover:bg-accent-600 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuar
                  <ChevronRight className="w-4 h-4" />
                </button>
                <p className="text-[10px] text-slate-500 text-center mt-2">
                  Procesar {selectedFiles.length} archivo{selectedFiles.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1">
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
                <h3 className="text-lg font-semibold text-gray-800">
                  {hasFiles ? 'Agregar más archivos' : 'Sube tu Informe Médico'}
                </h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">
                  Arrastra archivos o haz clic para seleccionar (PDF, JPG, PNG)
                  <br />
                  <span className="text-xs text-accent-600 font-medium">Puedes subir hasta {MAX_FILES} archivos</span>
                </p>
                
                {!hasFiles && (
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
                )}

                <button className="px-5 py-2 bg-veryka-dark text-white rounded-veryka text-sm font-medium hover:bg-brand-800 transition-colors shadow-sm">
                  Seleccionar Archivo{hasFiles ? 's' : ''}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
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
