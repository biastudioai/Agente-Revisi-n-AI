
import React, { useState, useEffect } from 'react';
import { AnalysisReport, ExtractedData, ProviderType } from '../types';
import ScoreCard from './ScoreCard';
import DateInput from './DateInput';
import ReviewModal from './ReviewModal';
import { RotateCcw, Activity, User, FileText, Hospital, Sparkles, Users, CheckSquare, PenTool, ShieldCheck, HeartPulse, ClipboardList, CreditCard, BadgeCheck, Building2 } from 'lucide-react';

interface DashboardProps {
  report: AnalysisReport;
  onReevaluate: (updatedData: ExtractedData) => void;
  isReevaluating: boolean;
  onSyncChanges: (changes: Record<string, { old: any, new: any }>) => void;
}

type TabId = 
  | 'identificacion' 
  | 'antecedentes' 
  | 'padecimiento' 
  | 'hospital' 
  | 'observaciones' 
  | 'equipo_qx' 
  | 'medico' 
  | 'validacion';

const Dashboard: React.FC<DashboardProps> = ({ report, onReevaluate, isReevaluating, onSyncChanges }) => {
  const [formData, setFormData] = useState<ExtractedData>(report.extracted);
  const [modifiedFields, setModifiedFields] = useState<Record<string, { old: any, new: any }>>({});
  const [activeTab, setActiveTab] = useState<TabId>('identificacion');
  const [highlightedField, setHighlightedField] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'form' | 'text'>('form');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  
  const provider: ProviderType = formData.provider || 'GNP';

  // Configuración de Identidad Visual por Proveedor
  const theme = {
    primary: provider === 'METLIFE' ? 'bg-blue-600' : 'bg-orange-500',
    secondary: provider === 'METLIFE' ? 'text-blue-600' : 'text-orange-600',
    border: provider === 'METLIFE' ? 'border-blue-200' : 'border-orange-200',
    light: provider === 'METLIFE' ? 'bg-blue-50' : 'bg-orange-50',
    accent: provider === 'METLIFE' ? 'blue' : 'orange'
  };

  useEffect(() => {
    setFormData(report.extracted);
    setModifiedFields({});
  }, [report]);

  useEffect(() => {
    onSyncChanges(modifiedFields);
  }, [modifiedFields, onSyncChanges]);

  useEffect(() => {
    if (highlightedField && viewMode === 'form') {
        const timer = setTimeout(() => {
            const element = document.getElementById(`field-${highlightedField}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100); 
        const clearTimer = setTimeout(() => setHighlightedField(null), 3000);
        return () => { clearTimeout(timer); clearTimeout(clearTimer); };
    }
  }, [highlightedField, activeTab, viewMode]);

  const handleInputChange = (pathString: string, value: any) => {
    const path = pathString.split('.');
    let originalValue: any = report.extracted;
    try {
        for (const key of path) { if (originalValue) originalValue = originalValue[key]; }
    } catch (e) { originalValue = undefined; }

    setFormData(prevData => {
        let newData = { ...prevData };
        let current: any = newData;
        for (let i = 0; i < path.length - 1; i++) {
            current[path[i]] = { ...current[path[i]] };
            current = current[path[i]];
        }
        current[path[path.length - 1]] = value;
        return newData;
    });

    if (String(originalValue) !== String(value)) {
      setModifiedFields(prev => ({ ...prev, [pathString]: { old: originalValue, new: value } }));
    }
  };

  const handleIssueClick = (fieldPath: string) => {
      const targetTab = getTabForField(fieldPath);
      setViewMode('form');
      setActiveTab(targetTab);
      setHighlightedField(fieldPath);
  };

  const getTabForField = (path: string): TabId => {
    if (path.includes('identificacion') || path.includes('tramite') || path.includes('firma')) return 'identificacion';
    if (path.includes('antecedentes')) return 'antecedentes';
    if (path.includes('padecimiento') || path.includes('diagnostico')) return 'padecimiento';
    if (path.includes('hospital')) return 'hospital';
    if (path.includes('info_adicional')) return 'observaciones';
    if (path.includes('medico')) return 'medico';
    if (path.includes('equipo_quirurgico')) return 'equipo_qx';
    return 'identificacion';
  };

  const renderInput = (label: string, value: any, path: string, type: string = 'text', suffix?: string) => {
    const isModified = modifiedFields[path] !== undefined;
    const isHighlighted = highlightedField === path;

    return (
      <div id={`field-${path}`} className={`mb-4 transition-all duration-300 ${isHighlighted ? `p-3 ${theme.light} ring-2 ring-yellow-400 rounded-lg shadow-md` : ''}`}>
        <div className="flex justify-between items-center mb-1">
           <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center">
              {label} {value && <BadgeCheck className="w-3 h-3 ml-1 text-emerald-500" />}
           </label>
           {isModified && <span className="text-[9px] font-bold text-accent-700 bg-accent-100 px-1.5 py-0.5 rounded">Modificado</span>}
        </div>
        <div className="relative">
          {type === 'textarea' ? 
            <textarea value={value || ''} onChange={(e) => handleInputChange(path, e.target.value)} rows={2} className="w-full rounded-lg text-sm px-3 py-2 border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand-500 outline-none" /> : 
            <input type={type} value={value || ''} onChange={(e) => handleInputChange(path, e.target.value)} placeholder="No detectado" className="w-full rounded-lg text-sm px-3 py-2 border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand-500 outline-none" />
          }
          {suffix && <span className="absolute right-3 top-2 text-gray-400 text-xs">{suffix}</span>}
        </div>
      </div>
    );
  };

  const tabs: { id: TabId, label: string, icon: any, metlifeSection?: string }[] = [
     { id: 'identificacion', label: 'Paciente', icon: User, metlifeSection: '1' },
     { id: 'antecedentes', label: 'Antecedentes', icon: FileText, metlifeSection: '2' },
     { id: 'padecimiento', label: 'Padecimiento', icon: HeartPulse, metlifeSection: '3' },
     { id: 'hospital', label: 'Hospital', icon: Hospital, metlifeSection: '4' },
     { id: 'observaciones', label: 'Observaciones', icon: ClipboardList, metlifeSection: '5' },
     { id: 'equipo_qx', label: 'Equipo Qx', icon: Users, metlifeSection: '6' },
     { id: 'medico', label: 'Médico', icon: Activity, metlifeSection: '6' },
     { id: 'validacion', label: 'Firma', icon: PenTool, metlifeSection: '7' },
  ];

  return (
    <div className="h-full flex flex-col bg-white relative overflow-hidden">
      <ReviewModal isOpen={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} report={{ ...report, extracted: formData }} />

      {/* Header Adaptativo */}
      <div className={`border-b px-6 py-4 flex justify-between items-center shrink-0 ${theme.border} ${theme.light}`}>
         <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg shadow-md ${theme.primary}`}>
                <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
                <h1 className="text-lg font-black text-slate-900 leading-none tracking-tight">
                    INFORME <span className={theme.secondary}>{provider}</span>
                </h1>
                <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">
                    {provider === 'METLIFE' ? 'Mapeo por Secciones 1-7' : 'Formato Estándar GNP'}
                </p>
            </div>
         </div>
         <div className="flex items-center gap-2">
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

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
         <div className="flex flex-col xl:flex-row gap-6">
            <div className="flex-1">
                {viewMode === 'form' ? (
                <>
                    {/* Tabs Dinámicos */}
                    <div className="flex flex-wrap gap-1 mb-6 bg-slate-100/50 p-1.5 rounded-xl border border-slate-200 shadow-inner">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            const isMetLife = provider === 'METLIFE';
                            return (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id as TabId)} className={`flex items-center px-4 py-2 text-[10px] font-black rounded-lg transition-all ${isActive ? 'bg-white shadow-md ' + theme.secondary : 'text-slate-400 hover:text-slate-600'}`}>
                                {isMetLife && <span className="mr-1.5 opacity-50">{tab.metlifeSection}.</span>}
                                <Icon className="w-3.5 h-3.5 mr-2" />
                                {tab.label.toUpperCase()}
                                </button>
                            );
                        })}
                    </div>

                    <div className="animate-fade-in space-y-6">
                        {activeTab === 'identificacion' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">{renderInput("Nombre Completo Asegurado", formData.identificacion?.nombres, 'identificacion.nombres')}</div>
                                {renderInput("Edad", formData.identificacion?.edad, 'identificacion.edad')}
                                {renderInput("Sexo", formData.identificacion?.sexo, 'identificacion.sexo')}
                                {renderInput("Peso", formData.identificacion?.peso, 'identificacion.peso', 'text', 'kg')}
                                {renderInput("Talla", formData.identificacion?.talla, 'identificacion.talla', 'text', 'cm')}
                                <div className="md:col-span-2">
                                    <DateInput label="Fecha Primera Atención" value={formData.identificacion?.fecha_primera_atencion} path="identificacion.fecha_primera_atencion" isModified={!!modifiedFields['identificacion.fecha_primera_atencion']} isHighlighted={highlightedField === 'identificacion.fecha_primera_atencion'} onChange={handleInputChange} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'antecedentes' && (
                            <div className="space-y-4">
                                {renderInput("Historia Clínica / Antecedentes", formData.antecedentes?.historia_clinica_breve, 'antecedentes.historia_clinica_breve', 'textarea')}
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-4 gap-4">
                                    <div className="col-span-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Gineco-Obstétricos</div>
                                    {renderInput("G", formData.antecedentes?.gineco_g, 'antecedentes.gineco_g')}
                                    {renderInput("P", formData.antecedentes?.gineco_p, 'antecedentes.gineco_p')}
                                    {renderInput("A", formData.antecedentes?.gineco_a, 'antecedentes.gineco_a')}
                                    {renderInput("C", formData.antecedentes?.gineco_c, 'antecedentes.gineco_c')}
                                </div>
                            </div>
                        )}

                        {activeTab === 'padecimiento' && (
                            <div className="space-y-4">
                                {renderInput("Signos, Síntomas y Evolución", formData.padecimiento_actual?.descripcion, 'padecimiento_actual.descripcion', 'textarea')}
                                <div className="grid grid-cols-2 gap-4">
                                    <DateInput label="Fecha Inicio Síntomas" value={formData.padecimiento_actual?.fecha_inicio} path="padecimiento_actual.fecha_inicio" isModified={!!modifiedFields['padecimiento_actual.fecha_inicio']} isHighlighted={highlightedField === 'padecimiento_actual.fecha_inicio'} onChange={handleInputChange} />
                                    {renderInput("Diagnóstico Definitivo", formData.diagnostico?.diagnostico_definitivo, 'diagnostico.diagnostico_definitivo')}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {renderInput("Código CIE-10", formData.diagnostico?.codigo_cie, 'diagnostico.codigo_cie')}
                                    <DateInput label="Fecha Diagnóstico" value={formData.diagnostico?.fecha_diagnostico} path="diagnostico.fecha_diagnostico" isModified={!!modifiedFields['diagnostico.fecha_diagnostico']} isHighlighted={highlightedField === 'diagnostico.fecha_diagnostico'} onChange={handleInputChange} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'medico' && (
                            <div className="space-y-4">
                                {renderInput("Nombre Médico Tratante", formData.medico_tratante?.nombres, 'medico_tratante.nombres')}
                                <div className="grid grid-cols-2 gap-4">
                                    {renderInput("RFC", formData.medico_tratante?.rfc, 'medico_tratante.rfc')}
                                    {renderInput("Cédula", formData.medico_tratante?.cedula_profesional, 'medico_tratante.cedula_profesional')}
                                </div>
                                <div className={`p-4 ${theme.light} rounded-xl border ${theme.border} mt-4`}>
                                    <h4 className={`text-xs font-black mb-3 flex items-center ${theme.secondary}`}>HONORARIOS SOLICITADOS</h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        {renderInput("Cirujano", formData.medico_tratante?.honorarios_cirujano, 'medico_tratante.honorarios_cirujano', 'text', '$')}
                                        {renderInput("Anestesiólogo", formData.medico_tratante?.honorarios_anestesiologo, 'medico_tratante.honorarios_anestesiologo', 'text', '$')}
                                        {renderInput("Ayudantes", formData.medico_tratante?.honorarios_ayudante, 'medico_tratante.honorarios_ayudante', 'text', '$')}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Secciones Genéricas para Hospital, Observaciones, etc. */}
                        {activeTab === 'hospital' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">{renderInput("Nombre Hospital", formData.hospital?.nombre_hospital, 'hospital.nombre_hospital')}</div>
                                <DateInput label="Fecha Ingreso" value={formData.hospital?.fecha_ingreso} path="hospital.fecha_ingreso" isModified={!!modifiedFields['hospital.fecha_ingreso']} isHighlighted={highlightedField === 'hospital.fecha_ingreso'} onChange={handleInputChange} />
                                <DateInput label="Fecha Egreso" value={formData.hospital?.fecha_egreso} path="hospital.fecha_egreso" isModified={!!modifiedFields['hospital.fecha_egreso']} isHighlighted={highlightedField === 'hospital.fecha_egreso'} onChange={handleInputChange} />
                            </div>
                        )}

                        {activeTab === 'validacion' && (
                            <div className="p-10 border-4 border-dashed border-slate-100 rounded-3xl text-center">
                                <ShieldCheck className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest">Validación de Autorización</h3>
                                {renderInput("Nombre Firma Autógrafa", formData.firma?.nombre_firma, 'firma.nombre_firma')}
                                <div className="mt-4 flex justify-center gap-4">
                                     <div className="px-4 py-2 bg-slate-50 rounded-lg text-[10px] font-bold text-slate-400">Lugar: {formData.firma?.lugar || 'S/D'}</div>
                                     <div className="px-4 py-2 bg-slate-50 rounded-lg text-[10px] font-bold text-slate-400">Fecha: {formData.firma?.fecha || 'S/D'}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </>
                ) : (
                    <div className="bg-slate-900 rounded-2xl p-8 font-mono text-xs text-emerald-400/80 overflow-auto h-[600px] shadow-2xl border border-slate-800">
                        <h2 className="text-sm font-bold mb-4 text-emerald-500 border-b border-emerald-900/50 pb-2 uppercase tracking-widest">Auditoría RAW - {provider}</h2>
                        <pre className="whitespace-pre-wrap leading-loose">
{JSON.stringify(formData, null, 2)}
                        </pre>
                    </div>
                )}
            </div>

            <div className="w-full xl:w-80 shrink-0">
                <ScoreCard scoreData={report.score} flags={report.flags} hasChanges={Object.keys(modifiedFields).length > 0} onReevaluate={() => onReevaluate(formData)} isReevaluating={isReevaluating} onIssueClick={handleIssueClick} onOpenReview={() => setIsReviewModalOpen(true)} />
            </div>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;
