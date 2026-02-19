import React, { useRef, useState, useCallback } from 'react';
import { Upload, FileText, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export interface PolicyFileData {
  base64: string;
  mimeType: string;
  name: string;
  sizeBytes?: number;
}

interface PolicyUploadProps {
  onFilesConfirmed: (files: PolicyFileData[]) => void;
  isProcessing: boolean;
  label?: string;
  maxFiles?: number;
  error?: string | null;
  extractionComplete?: boolean;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export default function PolicyUpload({
  onFilesConfirmed,
  isProcessing,
  label = 'Subir Póliza del Paciente',
  maxFiles = 3,
  error,
  extractionComplete,
}: PolicyUploadProps) {
  const [files, setFiles] = useState<PolicyFileData[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File): Promise<PolicyFileData> => {
    return new Promise((resolve, reject) => {
      if (file.size > MAX_FILE_SIZE) {
        reject(new Error(`${file.name} excede el límite de 25MB`));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve({
          base64,
          mimeType: file.type,
          name: file.name,
          sizeBytes: file.size,
        });
      };
      reader.onerror = () => reject(new Error(`Error al leer ${file.name}`));
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    setFileError(null);
    const newFiles: PolicyFileData[] = [];

    const incoming = Array.from(fileList).slice(0, maxFiles - files.length);
    if (incoming.length === 0) {
      setFileError(`Máximo ${maxFiles} archivos permitidos`);
      return;
    }

    for (const file of incoming) {
      if (!file.type.match(/^(image\/(jpeg|png|webp)|application\/pdf)$/)) {
        setFileError('Solo se permiten imágenes (JPG, PNG, WebP) y PDFs');
        return;
      }
      try {
        const data = await processFile(file);
        newFiles.push(data);
      } catch (err: any) {
        setFileError(err.message);
        return;
      }
    }

    setFiles(prev => [...prev, ...newFiles]);
  }, [files.length, maxFiles, processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (isProcessing) return;
    handleFiles(e.dataTransfer.files);
  }, [handleFiles, isProcessing]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    if (files.length > 0) {
      onFilesConfirmed(files);
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (extractionComplete) {
    return (
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-veryka flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">Póliza procesada correctamente</p>
          <p className="text-xs text-emerald-600">Los datos de la póliza han sido extraídos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{label}</p>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !isProcessing && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-veryka p-6 text-center transition-all cursor-pointer
          ${dragOver ? 'border-accent-500 bg-accent-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}
          ${isProcessing ? 'opacity-50 cursor-wait' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple={maxFiles > 1}
          onChange={handleInputChange}
          disabled={isProcessing}
        />
        {isProcessing ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-accent-500 animate-spin" />
            <p className="text-xs text-slate-500">Extrayendo datos de la póliza...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-slate-400" />
            <p className="text-xs text-slate-600">
              Arrastra la carátula de póliza o <span className="text-accent-500 font-semibold">selecciona archivos</span>
            </p>
            <p className="text-[10px] text-slate-400">PDF o imágenes, máx. {maxFiles} archivos, 25MB</p>
          </div>
        )}
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg">
              <FileText className={`w-4 h-4 flex-shrink-0 ${file.mimeType === 'application/pdf' ? 'text-red-500' : 'text-blue-500'}`} />
              <span className="text-xs text-slate-700 truncate flex-1">{file.name}</span>
              <span className="text-[10px] text-slate-400">{formatSize(file.sizeBytes)}</span>
              {!isProcessing && (
                <button onClick={() => removeFile(index)} className="text-slate-400 hover:text-red-500 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}

          {!isProcessing && (
            <button
              onClick={handleConfirm}
              className="w-full py-2 rounded-veryka text-xs font-bold text-white bg-gradient-to-r from-veryka-dark to-veryka-cyan hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-accent-500/20"
            >
              Procesar Póliza ({files.length} archivo{files.length > 1 ? 's' : ''})
            </button>
          )}
        </div>
      )}

      {/* Errors */}
      {(fileError || error) && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-700">{fileError || error}</p>
        </div>
      )}
    </div>
  );
}
