import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Plus, Trash2, Edit3, ChevronDown, ChevronRight, Loader2, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  listCondicionesGenerales,
  uploadCondicionesGenerales,
  updateCondicionesGenerales,
  deleteCondicionesGenerales,
} from '../services/policyApi';
import { CondicionesGeneralesRecord, CondicionesGeneralesData } from '../types/policy-types';

interface CondicionesGeneralesManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const ASEGURADORAS = [
  { codigo: 'GNP', nombre: 'GNP' },
  { codigo: 'METLIFE', nombre: 'MetLife' },
  { codigo: 'NYLIFE', nombre: 'NYLife' },
  { codigo: 'AXA', nombre: 'AXA' },
  { codigo: 'AXA_2018', nombre: 'AXA 2018' },
];

export default function CondicionesGeneralesManager({ isOpen, onClose }: CondicionesGeneralesManagerProps) {
  const [records, setRecords] = useState<CondicionesGeneralesRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Upload state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadAseguradora, setUploadAseguradora] = useState('GNP');
  const [uploadProductName, setUploadProductName] = useState('');
  const [uploadVersion, setUploadVersion] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Filter
  const [filterAseguradora, setFilterAseguradora] = useState<string>('');

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listCondicionesGenerales(filterAseguradora || undefined);
      setRecords(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [filterAseguradora]);

  useEffect(() => {
    if (isOpen) {
      loadRecords();
    }
  }, [isOpen, loadRecords]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (!uploadProductName || !uploadVersion || uploadFiles.length === 0) {
      setError('Complete todos los campos y seleccione al menos un archivo');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const files = await Promise.all(
        uploadFiles.map(file => new Promise<{ base64Data: string; mimeType: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve({
              base64Data: result.split(',')[1],
              mimeType: file.type,
            });
          };
          reader.onerror = () => reject(new Error(`Error al leer ${file.name}`));
          reader.readAsDataURL(file);
        }))
      );

      await uploadCondicionesGenerales(files, uploadAseguradora, uploadProductName, uploadVersion, uploadNotes);

      // Reset form and reload
      setShowUploadForm(false);
      setUploadProductName('');
      setUploadVersion('');
      setUploadNotes('');
      setUploadFiles([]);
      await loadRecords();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar estas condiciones generales?')) return;
    try {
      await deleteCondicionesGenerales(id);
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (record: CondicionesGeneralesRecord) => {
    try {
      await updateCondicionesGenerales(record.id, { isActive: !record.isActive });
      setRecords(prev => prev.map(r => r.id === record.id ? { ...r, isActive: !r.isActive } : r));
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-veryka-dark to-veryka-dark/90">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-white" />
            <h2 className="text-sm font-bold text-white">Condiciones Generales por Producto</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 border-b border-slate-200">
          <select
            value={filterAseguradora}
            onChange={(e) => setFilterAseguradora(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
          >
            <option value="">Todas las aseguradoras</option>
            {ASEGURADORAS.map(a => (
              <option key={a.codigo} value={a.codigo}>{a.nombre}</option>
            ))}
          </select>

          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-veryka text-xs font-bold text-white bg-gradient-to-r from-veryka-dark to-veryka-cyan hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Subir Nuevo
          </button>
        </div>

        {/* Upload Form */}
        {showUploadForm && (
          <div className="p-4 bg-accent-50/30 border-b border-slate-200 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Aseguradora</label>
                <select
                  value={uploadAseguradora}
                  onChange={(e) => setUploadAseguradora(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
                >
                  {ASEGURADORAS.map(a => (
                    <option key={a.codigo} value={a.codigo}>{a.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Producto</label>
                <input
                  value={uploadProductName}
                  onChange={(e) => setUploadProductName(e.target.value)}
                  placeholder="Ej: Platino, Flex GMM"
                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Versión</label>
                <input
                  value={uploadVersion}
                  onChange={(e) => setUploadVersion(e.target.value)}
                  placeholder="Ej: 2025"
                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Notas</label>
              <input
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                placeholder="Notas opcionales..."
                className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5"
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*,application/pdf"
                multiple
                onChange={handleFileSelect}
                className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-accent-50 file:text-accent-700 hover:file:bg-accent-100"
              />
              <button
                onClick={handleUpload}
                disabled={isUploading || uploadFiles.length === 0 || !uploadProductName || !uploadVersion}
                className="px-4 py-1.5 rounded-veryka text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              >
                {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {isUploading ? 'Procesando...' : 'Subir y Extraer'}
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mx-4 mt-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-700 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Records List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No hay condiciones generales registradas</p>
            </div>
          ) : (
            records.map(record => {
              const condData = record.conditionsData as CondicionesGeneralesData;
              const isExpanded = expandedId === record.id;

              return (
                <div key={record.id} className={`border rounded-veryka overflow-hidden ${record.isActive ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-70'}`}>
                  <div className="flex items-center gap-3 p-3">
                    <button onClick={() => setExpandedId(isExpanded ? null : record.id)} className="flex-1 flex items-center gap-2 text-left">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                      <span className="text-xs font-bold text-slate-700">{record.aseguradoraCodigo}</span>
                      <span className="text-xs text-slate-600">{record.productName}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">v{record.version}</span>
                      {!record.isActive && (
                        <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Inactivo</span>
                      )}
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleActive(record)}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                          record.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {record.isActive ? 'Activo' : 'Activar'}
                      </button>
                      <button onClick={() => handleDelete(record.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-slate-100">
                      {/* Summary stats */}
                      <div className="flex gap-3 pt-3">
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                          {condData.periodos_espera?.length || 0} periodos espera
                        </span>
                        <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                          {condData.exclusiones_generales?.length || 0} exclusiones
                        </span>
                        <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
                          {condData.procedimientos_especiales?.length || 0} proc. especiales
                        </span>
                      </div>

                      {/* Waiting periods */}
                      {condData.periodos_espera && condData.periodos_espera.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Periodos de Espera</span>
                          <div className="mt-1 space-y-1">
                            {condData.periodos_espera.map((pe, i) => (
                              <div key={i} className="text-xs text-slate-600 flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-blue-400" />
                                {pe.padecimiento_tipo}: <strong>{pe.meses} meses</strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Exclusions */}
                      {condData.exclusiones_generales && condData.exclusiones_generales.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Exclusiones Generales</span>
                          <div className="mt-1 space-y-1 max-h-[120px] overflow-y-auto custom-scrollbar">
                            {condData.exclusiones_generales.map((excl, i) => (
                              <div key={i} className="text-xs text-red-600 flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                                {excl}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {record.notes && (
                        <div className="text-xs text-slate-500 italic">{record.notes}</div>
                      )}

                      <div className="text-[10px] text-slate-400">
                        Creado: {new Date(record.createdAt).toLocaleDateString('es-MX')}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
