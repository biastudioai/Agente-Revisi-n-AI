import React, { useState, useEffect, useCallback } from 'react';
import { AnalysisReport, ExtractedData } from './types';
import { RotateCcw, ShieldCheck } from 'lucide-react';
import AnalysisForm from './AnalysisForm';
import AnalysisText from './AnalysisText';

interface DashboardProps {
  report: AnalysisReport;
  onReevaluate: (updatedData: ExtractedData) => void;
  isReevaluating: boolean;
  onSyncChanges: (changes: Record<string, { old: any, new: any }>) => void;
  onSaveChanges?: () => void;
  hasUnsavedChanges?: boolean;
  isAutoSaving?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ report, onReevaluate, isReevaluating, onSyncChanges, onSaveChanges, hasUnsavedChanges, isAutoSaving }) => {
  const [viewMode, setViewMode] = useState<'form' | 'text'>('form');
  const [formData, setFormData] = useState<ExtractedData>(report.extracted);
  const [modifiedFields, setModifiedFields] = useState<Record<string, { old: any, new: any }>>({});

  useEffect(() => {
    setFormData(report.extracted);
    setModifiedFields({});
  }, [report.extracted]);

  const handleFieldChange = useCallback((field: keyof ExtractedData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setModifiedFields(prev => {
      const originalValue = report.extracted[field];
      if (originalValue !== value) {
        return { ...prev, [field]: { old: originalValue, new: value } };
      } else {
        const { [field]: _, ...rest } = prev;
        return rest;
      }
    });
  }, [report.extracted]);

  useEffect(() => {
    onSyncChanges(modifiedFields);
  }, [modifiedFields, onSyncChanges]);

  return (
    <div className="p-6 bg-white rounded-lg shadow-md flex flex-col gap-4">
      <div className="flex justify-between items-center">
         <h2 className="text-xl font-bold text-slate-700">Análisis del Reporte</h2>
         <div className="flex items-center gap-2">
             {isAutoSaving && (
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                   <span className="w-2 h-2 bg-brand-400 rounded-full animate-pulse"></span>
                   Guardando...
                </span>
             )}
             {hasUnsavedChanges && onSaveChanges && !isAutoSaving && (
                <button onClick={onSaveChanges} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-sm flex items-center gap-1.5">
                   <ShieldCheck className="w-3.5 h-3.5" />
                   Guardar cambios
                </button>
             )}
             <button onClick={() => setViewMode(prev => prev === 'form' ? 'text' : 'form')} className="px-3 py-1.5 border rounded-lg text-xs font-bold bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shadow-sm">
                {viewMode === 'form' ? 'Modo Texto' : 'Modo Formulario'}
             </button>
             {Object.keys(modifiedFields).length > 0 && (
                <button onClick={() => { setFormData(report.extracted); setModifiedFields({}); }} className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-500 text-xs font-bold hover:bg-slate-50">
                    <RotateCcw className="w-3 h-3 mr-1.5 inline" />Limpiar
                </button>
             )}
         </div>
      </div>

      {viewMode === 'form' ? (
        <AnalysisForm
          data={formData}
          onFieldChange={handleFieldChange}
          isReevaluating={isReevaluating}
          onReevaluate={() => onReevaluate(formData)}
        />
      ) : (
        <AnalysisText data={formData} />
      )}
    </div>
  );
};

export default Dashboard;