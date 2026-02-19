import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Edit3, Shield, Calendar, DollarSign, FileCheck } from 'lucide-react';
import { PatientPolicyData, CoberturaIncluida } from '../types/policy-types';

interface PolicyDataEditorProps {
  policyData: PatientPolicyData;
  onUpdate: (data: PatientPolicyData) => void;
  isEditable?: boolean;
}

export default function PolicyDataEditor({ policyData, onUpdate, isEditable = true }: PolicyDataEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());

  const handleFieldChange = (field: keyof PatientPolicyData, value: any) => {
    const updated = { ...policyData, [field]: value };
    setModifiedFields(prev => new Set(prev).add(field));
    onUpdate(updated);
  };

  const handleCoberturaChange = (index: number, field: keyof CoberturaIncluida, value: any) => {
    const updated = [...policyData.coberturas_incluidas];
    updated[index] = { ...updated[index], [field]: value };
    handleFieldChange('coberturas_incluidas', updated);
  };

  const isModified = (field: string) => modifiedFields.has(field);

  const fieldClass = (field: string) =>
    `w-full px-2 py-1.5 text-xs border rounded-lg bg-white transition-colors
     ${isModified(field) ? 'border-amber-400 bg-amber-50' : 'border-slate-200'}
     ${isEditable ? 'focus:border-accent-500 focus:ring-1 focus:ring-accent-200' : 'bg-slate-50 cursor-default'}`;

  const labelClass = "text-[10px] font-semibold text-slate-500 uppercase tracking-wider";

  return (
    <div className="border border-slate-200 rounded-veryka overflow-hidden bg-white">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-white hover:from-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-veryka-dark" />
          <span className="text-sm font-bold text-veryka-dark">Datos de la Póliza</span>
          {policyData.numero_poliza && (
            <span className="text-[10px] bg-accent-50 text-accent-700 px-2 py-0.5 rounded-full font-medium">
              {policyData.numero_poliza}
            </span>
          )}
          {modifiedFields.size > 0 && (
            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <Edit3 className="w-3 h-3" /> {modifiedFields.size} modificado{modifiedFields.size > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4 border-t border-slate-100">
          {/* General Info */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <FileCheck className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-bold text-slate-600">Información General</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>No. Póliza</label>
                <input
                  value={policyData.numero_poliza || ''}
                  onChange={(e) => handleFieldChange('numero_poliza', e.target.value)}
                  className={fieldClass('numero_poliza')}
                  readOnly={!isEditable}
                />
              </div>
              <div>
                <label className={labelClass}>Estado</label>
                <select
                  value={policyData.estado_poliza || ''}
                  onChange={(e) => handleFieldChange('estado_poliza', e.target.value)}
                  className={fieldClass('estado_poliza')}
                  disabled={!isEditable}
                >
                  <option value="">—</option>
                  <option value="Vigente">Vigente</option>
                  <option value="Cancelada">Cancelada</option>
                  <option value="Vencida">Vencida</option>
                  <option value="Suspendida">Suspendida</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Titular</label>
                <input
                  value={policyData.titular_nombre || ''}
                  onChange={(e) => handleFieldChange('titular_nombre', e.target.value)}
                  className={fieldClass('titular_nombre')}
                  readOnly={!isEditable}
                />
              </div>
              <div>
                <label className={labelClass}>Asegurado</label>
                <input
                  value={policyData.asegurado_nombre || ''}
                  onChange={(e) => handleFieldChange('asegurado_nombre', e.target.value)}
                  className={fieldClass('asegurado_nombre')}
                  readOnly={!isEditable}
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-bold text-slate-600">Vigencia y Fechas</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Vigencia Desde</label>
                <input
                  value={policyData.vigencia_desde || ''}
                  onChange={(e) => handleFieldChange('vigencia_desde', e.target.value)}
                  className={fieldClass('vigencia_desde')}
                  readOnly={!isEditable}
                  placeholder="DD/MM/YYYY"
                />
              </div>
              <div>
                <label className={labelClass}>Vigencia Hasta</label>
                <input
                  value={policyData.vigencia_hasta || ''}
                  onChange={(e) => handleFieldChange('vigencia_hasta', e.target.value)}
                  className={fieldClass('vigencia_hasta')}
                  readOnly={!isEditable}
                  placeholder="DD/MM/YYYY"
                />
              </div>
              <div>
                <label className={labelClass}>Fecha Nacimiento</label>
                <input
                  value={policyData.fecha_nacimiento || ''}
                  onChange={(e) => handleFieldChange('fecha_nacimiento', e.target.value)}
                  className={fieldClass('fecha_nacimiento')}
                  readOnly={!isEditable}
                  placeholder="DD/MM/YYYY"
                />
              </div>
              <div>
                <label className={labelClass}>Fecha Antigüedad</label>
                <input
                  value={policyData.fecha_antiguedad || ''}
                  onChange={(e) => handleFieldChange('fecha_antiguedad', e.target.value)}
                  className={fieldClass('fecha_antiguedad')}
                  readOnly={!isEditable}
                  placeholder="DD/MM/YYYY"
                />
              </div>
            </div>
          </div>

          {/* Financial */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <DollarSign className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-bold text-slate-600">Montos y Coaseguro</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Suma Asegurada</label>
                <input
                  type="number"
                  value={policyData.suma_asegurada || ''}
                  onChange={(e) => handleFieldChange('suma_asegurada', e.target.value ? Number(e.target.value) : undefined)}
                  className={fieldClass('suma_asegurada')}
                  readOnly={!isEditable}
                />
              </div>
              <div>
                <label className={labelClass}>Moneda</label>
                <select
                  value={policyData.moneda || 'MXN'}
                  onChange={(e) => handleFieldChange('moneda', e.target.value)}
                  className={fieldClass('moneda')}
                  disabled={!isEditable}
                >
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Deducible</label>
                <input
                  type="number"
                  value={policyData.deducible || ''}
                  onChange={(e) => handleFieldChange('deducible', e.target.value ? Number(e.target.value) : undefined)}
                  className={fieldClass('deducible')}
                  readOnly={!isEditable}
                />
              </div>
              <div>
                <label className={labelClass}>Tipo Deducible</label>
                <input
                  value={policyData.deducible_tipo || ''}
                  onChange={(e) => handleFieldChange('deducible_tipo', e.target.value)}
                  className={fieldClass('deducible_tipo')}
                  readOnly={!isEditable}
                />
              </div>
              <div>
                <label className={labelClass}>Coaseguro %</label>
                <input
                  type="number"
                  value={policyData.coaseguro_porcentaje || ''}
                  onChange={(e) => handleFieldChange('coaseguro_porcentaje', e.target.value ? Number(e.target.value) : undefined)}
                  className={fieldClass('coaseguro_porcentaje')}
                  readOnly={!isEditable}
                />
              </div>
              <div>
                <label className={labelClass}>Tope Coaseguro</label>
                <input
                  type="number"
                  value={policyData.tope_coaseguro || ''}
                  onChange={(e) => handleFieldChange('tope_coaseguro', e.target.value ? Number(e.target.value) : undefined)}
                  className={fieldClass('tope_coaseguro')}
                  readOnly={!isEditable}
                />
              </div>
            </div>
          </div>

          {/* Coverages */}
          {policyData.coberturas_incluidas && policyData.coberturas_incluidas.length > 0 && (
            <div>
              <span className="text-xs font-bold text-slate-600 mb-2 block">Coberturas</span>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar">
                {policyData.coberturas_incluidas.map((cob, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                    <input
                      type="checkbox"
                      checked={cob.incluida}
                      onChange={(e) => handleCoberturaChange(i, 'incluida', e.target.checked)}
                      className="rounded border-slate-300 text-accent-500 focus:ring-accent-500"
                      disabled={!isEditable}
                    />
                    <span className={`text-xs flex-1 ${cob.incluida ? 'text-slate-700' : 'text-slate-400 line-through'}`}>
                      {cob.nombre}
                    </span>
                    {cob.sublimite && (
                      <span className="text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded">
                        Sublímite: {cob.sublimite}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exclusions */}
          {policyData.exclusiones_especificas && policyData.exclusiones_especificas.length > 0 && (
            <div>
              <span className="text-xs font-bold text-slate-600 mb-2 block">Exclusiones Específicas</span>
              <div className="space-y-1 max-h-[150px] overflow-y-auto custom-scrollbar">
                {policyData.exclusiones_especificas.map((excl, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    <span className="text-xs text-red-700">{excl}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Endorsements */}
          {policyData.endosos && policyData.endosos.length > 0 && (
            <div>
              <span className="text-xs font-bold text-slate-600 mb-2 block">Endosos</span>
              <div className="space-y-1 max-h-[150px] overflow-y-auto custom-scrollbar">
                {policyData.endosos.map((endoso, i) => (
                  <div key={i} className="p-2 bg-blue-50 rounded-lg">
                    <span className="text-xs font-medium text-blue-800">#{endoso.numero}</span>
                    <span className="text-xs text-blue-600 ml-2">{endoso.descripcion}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
