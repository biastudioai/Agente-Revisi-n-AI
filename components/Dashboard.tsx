import React, { useState, useEffect } from 'react';
import { AnalysisReport, ExtractedData, ProviderType, PersonalQuirurgico } from '../types';
import ScoreCard from './ScoreCard';
import DateInput from './DateInput';
import ReviewModal from './ReviewModal';
import { getProviderTheme } from '../providers';
import { RotateCcw, Activity, User, FileText, Hospital, Users, PenTool, ShieldCheck, HeartPulse, ClipboardList, BadgeCheck, Building2, Stethoscope, Syringe, Save } from 'lucide-react';

interface DashboardProps {
  report: AnalysisReport;
  onReevaluate: (updatedData: ExtractedData) => void;
  isReevaluating: boolean;
  onSyncChanges: (changes: Record<string, { old: any, new: any }>) => void;
  onSaveReport?: () => void;
}

type TabId = 
  | 'identificacion' 
  | 'antecedentes' 
  | 'padecimiento' 
  | 'tratamiento'
  | 'hospital' 
  | 'observaciones' 
  | 'equipo_qx' 
  | 'medico' 
  | 'validacion';

const Dashboard: React.FC<DashboardProps> = ({ report, onReevaluate, isReevaluating, onSyncChanges, onSaveReport }) => {
  const [formData, setFormData] = useState<ExtractedData>(report.extracted);
  const [modifiedFields, setModifiedFields] = useState<Record<string, { old: any, new: any }>>({});
  const [highlightedField, setHighlightedField] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'form' | 'text'>('form');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  
  const provider: ProviderType = formData.provider || 'GNP';
  const theme = getProviderTheme(provider);

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
  }, [highlightedField, viewMode]);

  const handleInputChange = (pathString: string, value: any) => {
    const path = pathString.split('.');
    let originalValue: any = report.extracted;
    try {
        for (const key of path) { if (originalValue) originalValue = originalValue[key]; }
    } catch (e) { originalValue = undefined; }

    // Convertir "Sí"/"No" a booleano para campos específicos
    let processedValue = value;
    if (pathString === 'complicaciones.presento_complicaciones') {
      processedValue = value === 'Sí' ? true : value === 'No' ? false : value;
    }

    setFormData(prevData => {
        let newData = { ...prevData };
        let current: any = newData;
        for (let i = 0; i < path.length - 1; i++) {
            current[path[i]] = { ...current[path[i]] };
            current = current[path[i]];
        }
        current[path[path.length - 1]] = processedValue;
        return newData;
    });

    if (String(originalValue) !== String(processedValue)) {
      setModifiedFields(prev => ({ ...prev, [pathString]: { old: originalValue, new: processedValue } }));
    }
  };

  const scrollToSection = (sectionId: TabId) => {
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleIssueClick = (fieldPath: string) => {
      const targetTab = getTabForField(fieldPath, provider);
      setViewMode('form');
      setHighlightedField(fieldPath);
      setTimeout(() => scrollToSection(targetTab), 100);
  };

  const getTabForField = (path: string, currentProvider: ProviderType): TabId => {
    if (path.includes('identificacion') || path.includes('tramite') || path.includes('firma')) return 'identificacion';
    if (path.includes('antecedentes')) return 'antecedentes';
    if (path.includes('padecimiento') || path.includes('diagnostico') || path.includes('intervencion') || path.includes('complicaciones') || path.includes('exploracion')) return 'padecimiento';
    if (path.includes('hospital')) return 'hospital';
    if (path.includes('info_adicional')) {
      return currentProvider === 'METLIFE' ? 'observaciones' : 'padecimiento';
    }
    if (path.includes('medico')) return 'medico';
    if (path.includes('equipo_quirurgico')) {
      return currentProvider === 'NYLIFE' ? 'medico' : 'equipo_qx';
    }
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
            type === 'checkbox' ?
            <input type="checkbox" checked={value || false} onChange={(e) => handleInputChange(path, e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" /> :
            <input type={type} value={value || ''} onChange={(e) => handleInputChange(path, e.target.value)} placeholder="No detectado" className="w-full rounded-lg text-sm px-3 py-2 border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand-500 outline-none" />
          }
          {suffix && <span className="absolute right-3 top-2 text-gray-400 text-xs">{suffix}</span>}
        </div>
      </div>
    );
  };

  const renderRadioGroup = (label: string, value: string | undefined, path: string, options: string[]) => {
    const isModified = modifiedFields[path] !== undefined;
    const isHighlighted = highlightedField === path;
    
    // Normalizar valores abreviados (F/M) a formato completo
    const normalizeValue = (val: string | undefined): string => {
      if (!val) return '';
      const lower = val.toLowerCase().trim();
      if (lower === 'f') return 'femenino';
      if (lower === 'm') return 'masculino';
      return lower;
    };
    
    const currentValue = normalizeValue(value);

    return (
      <div id={`field-${path}`} className={`mb-4 transition-all duration-300 ${isHighlighted ? `p-3 ${theme.light} ring-2 ring-yellow-400 rounded-lg shadow-md` : ''}`}>
        <div className="flex justify-between items-center mb-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center">
            {label} {value && <BadgeCheck className="w-3 h-3 ml-1 text-emerald-500" />}
          </label>
          {isModified && <span className="text-[9px] font-bold text-accent-700 bg-accent-100 px-1.5 py-0.5 rounded">Modificado</span>}
        </div>
        <div className="flex flex-wrap gap-3">
          {options.map((option) => (
            <label key={option} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${currentValue === option.toLowerCase() ? `${theme.light} ${theme.border} ring-1 ${theme.border}` : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
              <input 
                type="radio" 
                name={path} 
                checked={currentValue === option.toLowerCase()} 
                onChange={() => handleInputChange(path, option)} 
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-xs font-medium text-slate-700">{option}</span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  const renderCheckboxGroup = (label: string, value: string | string[] | undefined, path: string, options: string[]) => {
    const isModified = modifiedFields[path] !== undefined;
    const isHighlighted = highlightedField === path;
    
    // Manejar tanto arrays como strings separados por comas (backward compatibility)
    let selectedValues: string[];
    if (Array.isArray(value)) {
      selectedValues = value.map(v => v.toLowerCase());
    } else if (typeof value === 'string' && value) {
      selectedValues = value.split(',').map(v => v.trim().toLowerCase());
    } else {
      selectedValues = [];
    }

    const handleToggle = (option: string) => {
      const optionLower = option.toLowerCase();
      let newValues: string[];
      if (selectedValues.includes(optionLower)) {
        newValues = selectedValues.filter(v => v !== optionLower);
      } else {
        newValues = [...selectedValues, option];
      }
      // Guardar como array de strings
      handleInputChange(path, newValues);
    };

    return (
      <div id={`field-${path}`} className={`mb-4 transition-all duration-300 ${isHighlighted ? `p-3 ${theme.light} ring-2 ring-yellow-400 rounded-lg shadow-md` : ''}`}>
        <div className="flex justify-between items-center mb-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center">
            {label} {value && <BadgeCheck className="w-3 h-3 ml-1 text-emerald-500" />}
          </label>
          {isModified && <span className="text-[9px] font-bold text-accent-700 bg-accent-100 px-1.5 py-0.5 rounded">Modificado</span>}
        </div>
        <div className="flex flex-wrap gap-3">
          {options.map((option) => {
            const isSelected = selectedValues.includes(option.toLowerCase());
            return (
              <label key={option} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${isSelected ? `${theme.light} ${theme.border} ring-1 ${theme.border}` : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                <input 
                  type="checkbox" 
                  checked={isSelected} 
                  onChange={() => handleToggle(option)} 
                  className="w-4 h-4 rounded text-blue-600"
                />
                <span className="text-xs font-medium text-slate-700">{option}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPersonalQuirurgico = (title: string, data: PersonalQuirurgico | undefined, basePath: string) => {
    return (
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4">
        <h4 className="text-xs font-black text-slate-600 mb-3 uppercase tracking-wider flex items-center">
          <Stethoscope className="w-4 h-4 mr-2" />
          {title}
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {renderInput("Nombre", data?.nombre, `${basePath}.nombre`)}
          {renderInput("Cédula Especialidad", data?.cedula_especialidad, `${basePath}.cedula_especialidad`)}
          {renderInput("RFC", data?.rfc, `${basePath}.rfc`)}
          {renderInput("Celular", data?.celular, `${basePath}.celular`)}
          {renderInput("Email", data?.email, `${basePath}.email`)}
          {basePath.includes('otro') && renderInput("Especialidad/Participación", data?.especialidad, `${basePath}.especialidad`)}
        </div>
      </div>
    );
  };

  const tabs: { id: TabId, label: string, icon: any, metlifeSection?: string }[] = [
     { id: 'identificacion', label: 'Paciente', icon: User, metlifeSection: '1' },
     { id: 'antecedentes', label: 'Antecedentes', icon: FileText, metlifeSection: '2' },
     { id: 'padecimiento', label: 'Padecimiento', icon: HeartPulse, metlifeSection: '3' },
     { id: 'tratamiento', label: 'Tratamiento', icon: Syringe, metlifeSection: '' },
     { id: 'hospital', label: 'Hospital', icon: Hospital, metlifeSection: '4' },
     { id: 'observaciones', label: 'Observaciones', icon: ClipboardList, metlifeSection: '5' },
     { id: 'equipo_qx', label: 'Otros Médicos', icon: Users, metlifeSection: '6' },
     { id: 'medico', label: 'Médico', icon: Activity, metlifeSection: '7' },
     { id: 'validacion', label: 'Firma', icon: PenTool, metlifeSection: '8' },
  ];

  return (
    <div className="h-full flex flex-col bg-white relative overflow-hidden">
      <ReviewModal isOpen={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} report={{ ...report, extracted: formData }} />

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
                    {provider === 'METLIFE' ? 'Mapeo por Secciones 1-7' : provider === 'NYLIFE' ? 'Formato NY Life Monterrey' : 'Formato Estándar GNP'}
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
             {onSaveReport && (
                <button onClick={onSaveReport} className="px-3 py-1.5 border rounded-lg text-xs font-bold bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-sm flex items-center gap-1.5">
                    <Save className="w-3 h-3" />Guardar
                </button>
             )}
         </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
         <div className="flex flex-col xl:flex-row gap-6">
            <div className="flex-1">
                {viewMode === 'form' ? (
                <>
                    <div className="sticky top-0 z-10 flex flex-wrap gap-1 mb-6 bg-slate-100/50 p-1.5 rounded-xl border border-slate-200 shadow-inner backdrop-blur-sm">
                        {tabs.map((tab) => {
                            // Ocultar pestañas según el proveedor
                            if (tab.id === 'observaciones' && (provider === 'GNP' || provider === 'NYLIFE')) {
                                return null;
                            }
                            if (tab.id === 'equipo_qx' && provider === 'NYLIFE') {
                                return null; // Para NYLIFE el equipo qx está en la pestaña Médico
                            }
                            if (tab.id === 'tratamiento' && provider !== 'NYLIFE') {
                                return null; // La pestaña Tratamiento solo es para NYLIFE
                            }
                            
                            const Icon = tab.icon;
                            const isMetLife = provider === 'METLIFE';
                            return (
                                <button key={tab.id} onClick={() => scrollToSection(tab.id as TabId)} className={`flex items-center px-4 py-2 text-[10px] font-black rounded-lg transition-all bg-white shadow-md hover:shadow-lg ${theme.secondary} hover:opacity-80`}>
                                {isMetLife && <span className="mr-1.5 opacity-50">{tab.metlifeSection}.</span>}
                                <Icon className="w-3.5 h-3.5 mr-2" />
                                {tab.label.toUpperCase()}
                                </button>
                            );
                        })}
                    </div>

                    <div className="animate-fade-in space-y-6">
                        {/* SECCIÓN: IDENTIFICACIÓN / PACIENTE */}
                        <div id="section-identificacion" className="scroll-mt-20">
                        {provider === 'METLIFE' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">{renderInput("Nombre Completo Asegurado", formData.identificacion?.nombres, 'identificacion.nombres')}</div>
                                {renderInput("Edad", formData.identificacion?.edad, 'identificacion.edad')}
                                <div className="md:col-span-2">
                                    {renderRadioGroup("Sexo", formData.identificacion?.sexo, 'identificacion.sexo', ['Masculino', 'Femenino', 'Otro'])}
                                </div>
                                <div className="md:col-span-2">
                                    {renderRadioGroup("Causa Atención", formData.identificacion?.causa_atencion, 'identificacion.causa_atencion', ['Accidente', 'Enfermedad', 'Embarazo', 'Segunda valoración'])}
                                </div>
                                {renderInput("Peso", formData.identificacion?.peso, 'identificacion.peso', 'text', 'kg')}
                                {renderInput("Talla", formData.identificacion?.talla, 'identificacion.talla', 'text', 'cm')}
                                <div className="md:col-span-2">
                                    <DateInput label="Fecha Primera Atención" value={formData.identificacion?.fecha_primera_atencion} path="identificacion.fecha_primera_atencion" isModified={!!modifiedFields['identificacion.fecha_primera_atencion']} isHighlighted={highlightedField === 'identificacion.fecha_primera_atencion'} onChange={handleInputChange} />
                                </div>
                            </div>
                        )}

                        {provider === 'NYLIFE' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {renderInput("Apellido Paterno", (formData as any).identificacion?.apellido_paterno, 'identificacion.apellido_paterno')}
                                    {renderInput("Apellido Materno", (formData as any).identificacion?.apellido_materno, 'identificacion.apellido_materno')}
                                    {renderInput("Nombre(s)", (formData as any).identificacion?.nombres, 'identificacion.nombres')}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {renderInput("Edad", (formData as any).identificacion?.edad, 'identificacion.edad')}
                                    <div>
                                        {renderCheckboxGroup("Sexo", (formData as any).identificacion?.sexo, 'identificacion.sexo', ['Femenino', 'Masculino'])}
                                    </div>
                                </div>
                                <div>
                                    {renderCheckboxGroup("Tipo de Evento", (formData as any).identificacion?.tipo_evento, 'identificacion.tipo_evento', ['Accidente', 'Enfermedad', 'Embarazo'])}
                                </div>
                            </div>
                        )}

                        {provider === 'GNP' && (
                            <div className="space-y-6">
                                <div className={`p-4 ${theme.light} rounded-xl border ${theme.border}`}>
                                    <h4 className={`text-xs font-black mb-3 ${theme.secondary}`}>TIPO DE TRÁMITE</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${formData.tramite?.reembolso ? `${theme.light} ${theme.border} ring-1 ${theme.border}` : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                            <input type="checkbox" checked={formData.tramite?.reembolso || false} onChange={(e) => handleInputChange('tramite.reembolso', e.target.checked)} className="w-4 h-4 rounded text-orange-600" />
                                            <span className="text-xs font-medium text-slate-700">Reembolso</span>
                                        </label>
                                        <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${formData.tramite?.programacion_cirugia ? `${theme.light} ${theme.border} ring-1 ${theme.border}` : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                            <input type="checkbox" checked={formData.tramite?.programacion_cirugia || false} onChange={(e) => handleInputChange('tramite.programacion_cirugia', e.target.checked)} className="w-4 h-4 rounded text-orange-600" />
                                            <span className="text-xs font-medium text-slate-700">Prog. Cirugía</span>
                                        </label>
                                        <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${formData.tramite?.programacion_medicamentos ? `${theme.light} ${theme.border} ring-1 ${theme.border}` : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                            <input type="checkbox" checked={formData.tramite?.programacion_medicamentos || false} onChange={(e) => handleInputChange('tramite.programacion_medicamentos', e.target.checked)} className="w-4 h-4 rounded text-orange-600" />
                                            <span className="text-xs font-medium text-slate-700">Prog. Medicamentos</span>
                                        </label>
                                        <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${formData.tramite?.programacion_servicios ? `${theme.light} ${theme.border} ring-1 ${theme.border}` : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                            <input type="checkbox" checked={formData.tramite?.programacion_servicios || false} onChange={(e) => handleInputChange('tramite.programacion_servicios', e.target.checked)} className="w-4 h-4 rounded text-orange-600" />
                                            <span className="text-xs font-medium text-slate-700">Prog. Servicios</span>
                                        </label>
                                        <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${formData.tramite?.indemnizacion ? `${theme.light} ${theme.border} ring-1 ${theme.border}` : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                            <input type="checkbox" checked={formData.tramite?.indemnizacion || false} onChange={(e) => handleInputChange('tramite.indemnizacion', e.target.checked)} className="w-4 h-4 rounded text-orange-600" />
                                            <span className="text-xs font-medium text-slate-700">Indemnización</span>
                                        </label>
                                        <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${formData.tramite?.reporte_hospitalario ? `${theme.light} ${theme.border} ring-1 ${theme.border}` : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                            <input type="checkbox" checked={formData.tramite?.reporte_hospitalario || false} onChange={(e) => handleInputChange('tramite.reporte_hospitalario', e.target.checked)} className="w-4 h-4 rounded text-orange-600" />
                                            <span className="text-xs font-medium text-slate-700">Reporte Hospitalario</span>
                                        </label>
                                    </div>
                                    <div className="mt-4">
                                        {renderInput("Número de Póliza", formData.tramite?.numero_poliza, 'tramite.numero_poliza')}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {renderInput("Primer Apellido", formData.identificacion?.primer_apellido, 'identificacion.primer_apellido')}
                                    {renderInput("Segundo Apellido", formData.identificacion?.segundo_apellido, 'identificacion.segundo_apellido')}
                                    {renderInput("Nombre(s)", formData.identificacion?.nombres, 'identificacion.nombres')}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {renderInput("Edad", formData.identificacion?.edad, 'identificacion.edad')}
                                    <div>
                                        {renderRadioGroup("Sexo", formData.identificacion?.sexo, 'identificacion.sexo', ['Femenino', 'Masculino'])}
                                    </div>
                                </div>
                                <div>
                                    {renderRadioGroup("Causa de Atención", formData.identificacion?.causa_atencion, 'identificacion.causa_atencion', ['Accidente', 'Enfermedad', 'Embarazo'])}
                                </div>
                            </div>
                        )}
                        </div>

                        {/* SECCIÓN: ANTECEDENTES */}
                        <div id="section-antecedentes" className="scroll-mt-20">
                        {provider === 'METLIFE' && (
                            <div className="space-y-4">
                                {renderInput("Historia Clínica / Antecedentes", formData.antecedentes?.historia_clinica_breve, 'antecedentes.historia_clinica_breve', 'textarea')}
                                {renderInput("Antecedentes Personales Patológicos", formData.antecedentes?.personales_patologicos, 'antecedentes.personales_patologicos', 'textarea')}
                                {renderInput("Antecedentes Quirúrgicos", formData.antecedentes?.antecedentes_quirurgicos, 'antecedentes.antecedentes_quirurgicos', 'textarea')}
                                <div className="p-4 bg-pink-50 rounded-xl border border-pink-200">
                                    <div className="text-[9px] font-black text-pink-500 uppercase tracking-widest mb-3">Gineco-Obstétricos</div>
                                    <div className="grid grid-cols-4 gap-4 mb-3">
                                        {renderInput("G", formData.antecedentes?.gineco_g, 'antecedentes.gineco_g')}
                                        {renderInput("P", formData.antecedentes?.gineco_p, 'antecedentes.gineco_p')}
                                        {renderInput("A", formData.antecedentes?.gineco_a, 'antecedentes.gineco_a')}
                                        {renderInput("C", formData.antecedentes?.gineco_c, 'antecedentes.gineco_c')}
                                    </div>
                                    {renderInput("Descripción Adicional", formData.antecedentes?.gineco_descripcion, 'antecedentes.gineco_descripcion', 'textarea')}
                                </div>
                                {renderInput("Otras Afecciones (sin relación)", formData.antecedentes?.otras_afecciones, 'antecedentes.otras_afecciones', 'textarea')}
                            </div>
                        )}

                        {provider === 'GNP' && (
                            <div className="space-y-4">
                                {renderInput("Antecedentes Personales Patológicos", formData.antecedentes?.personales_patologicos, 'antecedentes.personales_patologicos', 'textarea')}
                                {renderInput("Antecedentes Personales NO Patológicos", formData.antecedentes?.personales_no_patologicos, 'antecedentes.personales_no_patologicos', 'textarea')}
                                <div className="p-4 bg-pink-50 rounded-xl border border-pink-200">
                                    <div className="text-[9px] font-black text-pink-500 uppercase tracking-widest mb-3">Gineco-Obstétricos (Descripción Anatómica)</div>
                                    {renderInput("Descripción", formData.antecedentes?.gineco_obstetricos, 'antecedentes.gineco_obstetricos', 'textarea')}
                                </div>
                                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                                    <div className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-3">Antecedentes Perinatales</div>
                                    {renderInput("Descripción", formData.antecedentes?.perinatales, 'antecedentes.perinatales', 'textarea')}
                                </div>
                            </div>
                        )}

                        {provider === 'NYLIFE' && (
                            <div className="space-y-4">
                                <div className={`p-4 ${theme.light} rounded-xl border ${theme.border}`}>
                                    <h4 className={`text-xs font-black mb-3 ${theme.secondary}`}>ANTECEDENTES PATOLÓGICOS</h4>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200">
                                            <label className="flex items-center gap-2 min-w-[140px]">
                                                <input type="checkbox" checked={(formData as any).antecedentes_patologicos?.cardiacos === 'Sí'} onChange={(e) => handleInputChange('antecedentes_patologicos.cardiacos', e.target.checked ? 'Sí' : '')} className="w-4 h-4 rounded" />
                                                <span className="text-xs font-medium text-slate-700">Cardíacos</span>
                                            </label>
                                            <input type="text" value={(formData as any).antecedentes_patologicos?.cardiacos_detalle || ''} onChange={(e) => handleInputChange('antecedentes_patologicos.cardiacos_detalle', e.target.value)} placeholder="Detalle..." className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded" />
                                        </div>
                                        <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200">
                                            <label className="flex items-center gap-2 min-w-[140px]">
                                                <input type="checkbox" checked={(formData as any).antecedentes_patologicos?.hipertensivos === 'Sí'} onChange={(e) => handleInputChange('antecedentes_patologicos.hipertensivos', e.target.checked ? 'Sí' : '')} className="w-4 h-4 rounded" />
                                                <span className="text-xs font-medium text-slate-700">Hipertensivos</span>
                                            </label>
                                            <input type="text" value={(formData as any).antecedentes_patologicos?.hipertensivos_detalle || ''} onChange={(e) => handleInputChange('antecedentes_patologicos.hipertensivos_detalle', e.target.value)} placeholder="Detalle..." className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded" />
                                        </div>
                                        <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200">
                                            <label className="flex items-center gap-2 min-w-[140px]">
                                                <input type="checkbox" checked={(formData as any).antecedentes_patologicos?.diabetes_mellitus === 'Sí'} onChange={(e) => handleInputChange('antecedentes_patologicos.diabetes_mellitus', e.target.checked ? 'Sí' : '')} className="w-4 h-4 rounded" />
                                                <span className="text-xs font-medium text-slate-700">Diabetes Mellitus</span>
                                            </label>
                                            <input type="text" value={(formData as any).antecedentes_patologicos?.diabetes_mellitus_detalle || ''} onChange={(e) => handleInputChange('antecedentes_patologicos.diabetes_mellitus_detalle', e.target.value)} placeholder="Detalle..." className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded" />
                                        </div>
                                        <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200">
                                            <label className="flex items-center gap-2 min-w-[140px]">
                                                <input type="checkbox" checked={(formData as any).antecedentes_patologicos?.vih_sida === 'Sí'} onChange={(e) => handleInputChange('antecedentes_patologicos.vih_sida', e.target.checked ? 'Sí' : '')} className="w-4 h-4 rounded" />
                                                <span className="text-xs font-medium text-slate-700">VIH/SIDA</span>
                                            </label>
                                            <input type="text" value={(formData as any).antecedentes_patologicos?.vih_sida_detalle || ''} onChange={(e) => handleInputChange('antecedentes_patologicos.vih_sida_detalle', e.target.value)} placeholder="Detalle..." className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded" />
                                        </div>
                                        <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200">
                                            <label className="flex items-center gap-2 min-w-[140px]">
                                                <input type="checkbox" checked={(formData as any).antecedentes_patologicos?.cancer === 'Sí'} onChange={(e) => handleInputChange('antecedentes_patologicos.cancer', e.target.checked ? 'Sí' : '')} className="w-4 h-4 rounded" />
                                                <span className="text-xs font-medium text-slate-700">Cáncer</span>
                                            </label>
                                            <input type="text" value={(formData as any).antecedentes_patologicos?.cancer_detalle || ''} onChange={(e) => handleInputChange('antecedentes_patologicos.cancer_detalle', e.target.value)} placeholder="Detalle..." className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded" />
                                        </div>
                                        <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200">
                                            <label className="flex items-center gap-2 min-w-[140px]">
                                                <input type="checkbox" checked={(formData as any).antecedentes_patologicos?.hepaticos === 'Sí'} onChange={(e) => handleInputChange('antecedentes_patologicos.hepaticos', e.target.checked ? 'Sí' : '')} className="w-4 h-4 rounded" />
                                                <span className="text-xs font-medium text-slate-700">Hepáticos</span>
                                            </label>
                                            <input type="text" value={(formData as any).antecedentes_patologicos?.hepaticos_detalle || ''} onChange={(e) => handleInputChange('antecedentes_patologicos.hepaticos_detalle', e.target.value)} placeholder="Detalle..." className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded" />
                                        </div>
                                        <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200">
                                            <label className="flex items-center gap-2 min-w-[140px]">
                                                <input type="checkbox" checked={(formData as any).antecedentes_patologicos?.convulsivos === 'Sí'} onChange={(e) => handleInputChange('antecedentes_patologicos.convulsivos', e.target.checked ? 'Sí' : '')} className="w-4 h-4 rounded" />
                                                <span className="text-xs font-medium text-slate-700">Convulsivos</span>
                                            </label>
                                            <input type="text" value={(formData as any).antecedentes_patologicos?.convulsivos_detalle || ''} onChange={(e) => handleInputChange('antecedentes_patologicos.convulsivos_detalle', e.target.value)} placeholder="Detalle..." className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded" />
                                        </div>
                                        <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200">
                                            <label className="flex items-center gap-2 min-w-[140px]">
                                                <input type="checkbox" checked={(formData as any).antecedentes_patologicos?.cirugias === 'Sí'} onChange={(e) => handleInputChange('antecedentes_patologicos.cirugias', e.target.checked ? 'Sí' : '')} className="w-4 h-4 rounded" />
                                                <span className="text-xs font-medium text-slate-700">Cirugías Previas</span>
                                            </label>
                                            <input type="text" value={(formData as any).antecedentes_patologicos?.cirugias_detalle || ''} onChange={(e) => handleInputChange('antecedentes_patologicos.cirugias_detalle', e.target.value)} placeholder="Detalle..." className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded" />
                                        </div>
                                        <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200">
                                            <label className="flex items-center gap-2 min-w-[140px]">
                                                <input type="checkbox" checked={(formData as any).antecedentes_patologicos?.otros === 'Sí'} onChange={(e) => handleInputChange('antecedentes_patologicos.otros', e.target.checked ? 'Sí' : '')} className="w-4 h-4 rounded" />
                                                <span className="text-xs font-medium text-slate-700">Otros</span>
                                            </label>
                                            <input type="text" value={(formData as any).antecedentes_patologicos?.otros_detalle || ''} onChange={(e) => handleInputChange('antecedentes_patologicos.otros_detalle', e.target.value)} placeholder="Detalle..." className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded" />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                                    <h4 className="text-xs font-black mb-3 text-blue-600">ANTECEDENTES NO PATOLÓGICOS</h4>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-blue-100">
                                            <label className="flex items-center gap-2 min-w-[180px]">
                                                <input type="checkbox" checked={!!(formData as any).antecedentes_no_patologicos?.fuma} onChange={(e) => handleInputChange('antecedentes_no_patologicos.fuma', e.target.checked ? 'Sí' : '')} className="w-4 h-4 rounded" />
                                                <span className="text-xs font-medium text-slate-700">¿Fuma? (cantidad)</span>
                                            </label>
                                            <input type="text" value={(formData as any).antecedentes_no_patologicos?.fuma || ''} onChange={(e) => handleInputChange('antecedentes_no_patologicos.fuma', e.target.value)} placeholder="Cantidad..." className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded" />
                                        </div>
                                        <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-blue-100">
                                            <label className="flex items-center gap-2 min-w-[180px]">
                                                <input type="checkbox" checked={!!(formData as any).antecedentes_no_patologicos?.alcohol} onChange={(e) => handleInputChange('antecedentes_no_patologicos.alcohol', e.target.checked ? 'Sí' : '')} className="w-4 h-4 rounded" />
                                                <span className="text-xs font-medium text-slate-700">¿Bebidas alcohólicas?</span>
                                            </label>
                                            <input type="text" value={(formData as any).antecedentes_no_patologicos?.alcohol || ''} onChange={(e) => handleInputChange('antecedentes_no_patologicos.alcohol', e.target.value)} placeholder="Tipo y cantidad..." className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded" />
                                        </div>
                                        <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-blue-100">
                                            <label className="flex items-center gap-2 min-w-[180px]">
                                                <input type="checkbox" checked={!!(formData as any).antecedentes_no_patologicos?.drogas} onChange={(e) => handleInputChange('antecedentes_no_patologicos.drogas', e.target.checked ? 'Sí' : '')} className="w-4 h-4 rounded" />
                                                <span className="text-xs font-medium text-slate-700">¿Consume drogas?</span>
                                            </label>
                                            <input type="text" value={(formData as any).antecedentes_no_patologicos?.drogas || ''} onChange={(e) => handleInputChange('antecedentes_no_patologicos.drogas', e.target.value)} placeholder="Tipo y cantidad..." className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded" />
                                        </div>
                                        <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-blue-100">
                                            <label className="flex items-center gap-2 min-w-[180px]">
                                                <input type="checkbox" checked={!!(formData as any).antecedentes_no_patologicos?.perdida_peso} onChange={(e) => handleInputChange('antecedentes_no_patologicos.perdida_peso', e.target.checked ? 'Sí' : '')} className="w-4 h-4 rounded" />
                                                <span className="text-xs font-medium text-slate-700">¿Pérdida de peso?</span>
                                            </label>
                                            <input type="text" value={(formData as any).antecedentes_no_patologicos?.perdida_peso || ''} onChange={(e) => handleInputChange('antecedentes_no_patologicos.perdida_peso', e.target.value)} placeholder="Cantidad..." className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded" />
                                        </div>
                                        <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-blue-100">
                                            <label className="flex items-center gap-2 min-w-[180px]">
                                                <input type="checkbox" checked={!!(formData as any).antecedentes_no_patologicos?.perinatales} onChange={(e) => handleInputChange('antecedentes_no_patologicos.perinatales', e.target.checked ? 'Sí' : '')} className="w-4 h-4 rounded" />
                                                <span className="text-xs font-medium text-slate-700">Perinatales</span>
                                            </label>
                                            <input type="text" value={(formData as any).antecedentes_no_patologicos?.perinatales || ''} onChange={(e) => handleInputChange('antecedentes_no_patologicos.perinatales', e.target.value)} placeholder="Detalle..." className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded" />
                                        </div>
                                        <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-blue-100">
                                            <label className="flex items-center gap-2 min-w-[180px]">
                                                <input type="checkbox" checked={!!(formData as any).antecedentes_no_patologicos?.gineco_obstetricos} onChange={(e) => handleInputChange('antecedentes_no_patologicos.gineco_obstetricos', e.target.checked ? 'Sí' : '')} className="w-4 h-4 rounded" />
                                                <span className="text-xs font-medium text-slate-700">Gineco-Obstétricos</span>
                                            </label>
                                            <input type="text" value={(formData as any).antecedentes_no_patologicos?.gineco_obstetricos || ''} onChange={(e) => handleInputChange('antecedentes_no_patologicos.gineco_obstetricos', e.target.value)} placeholder="Detalle..." className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded" />
                                        </div>
                                        <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-blue-100">
                                            <label className="flex items-center gap-2 min-w-[180px]">
                                                <input type="checkbox" checked={!!(formData as any).antecedentes_no_patologicos?.otros} onChange={(e) => handleInputChange('antecedentes_no_patologicos.otros', e.target.checked ? 'Sí' : '')} className="w-4 h-4 rounded" />
                                                <span className="text-xs font-medium text-slate-700">Otros</span>
                                            </label>
                                            <input type="text" value={(formData as any).antecedentes_no_patologicos?.otros || ''} onChange={(e) => handleInputChange('antecedentes_no_patologicos.otros', e.target.value)} placeholder="Detalle..." className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        </div>

                        {/* SECCIÓN: PADECIMIENTO */}
                        <div id="section-padecimiento" className="scroll-mt-20">
                        {provider === 'METLIFE' && (
                            <div className="space-y-4">
                                {renderInput("Signos, Síntomas y Evolución", formData.padecimiento_actual?.descripcion, 'padecimiento_actual.descripcion', 'textarea')}
                                <div className="grid grid-cols-1 gap-4">
                                    <DateInput label="Fecha Inicio Síntomas" value={formData.padecimiento_actual?.fecha_inicio} path="padecimiento_actual.fecha_inicio" isModified={!!modifiedFields['padecimiento_actual.fecha_inicio']} isHighlighted={highlightedField === 'padecimiento_actual.fecha_inicio'} onChange={handleInputChange} />
                                    {renderCheckboxGroup("Tipo Padecimiento", formData.padecimiento_actual?.tipo_padecimiento, 'padecimiento_actual.tipo_padecimiento', ['Congénito', 'Adquirido', 'Agudo', 'Crónico'])}
                                </div>
                                {renderInput("Causa / Etiología", formData.padecimiento_actual?.causa_etiologia, 'padecimiento_actual.causa_etiologia', 'textarea')}
                                {renderInput("Exploración Física y Estudios", formData.exploracion_fisica?.resultados, 'exploracion_fisica.resultados', 'textarea')}
                                
                                <div className={`p-4 ${theme.light} rounded-xl border ${theme.border}`}>
                                    <h4 className={`text-xs font-black mb-3 ${theme.secondary}`}>DIAGNÓSTICO</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        {renderInput("Diagnóstico Definitivo", formData.diagnostico?.diagnostico_definitivo, 'diagnostico.diagnostico_definitivo')}
                                        {renderInput("Código CIE-10", formData.diagnostico?.codigo_cie, 'diagnostico.codigo_cie')}
                                        <DateInput label="Fecha Diagnóstico" value={formData.diagnostico?.fecha_diagnostico} path="diagnostico.fecha_diagnostico" isModified={!!modifiedFields['diagnostico.fecha_diagnostico']} isHighlighted={highlightedField === 'diagnostico.fecha_diagnostico'} onChange={handleInputChange} />
                                        <DateInput label="Fecha Inicio Tratamiento" value={formData.diagnostico?.fecha_inicio_tratamiento} path="diagnostico.fecha_inicio_tratamiento" isModified={!!modifiedFields['diagnostico.fecha_inicio_tratamiento']} isHighlighted={highlightedField === 'diagnostico.fecha_inicio_tratamiento'} onChange={handleInputChange} />
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={formData.diagnostico?.relacionado_con_otro || false} onChange={(e) => handleInputChange('diagnostico.relacionado_con_otro', e.target.checked)} className="w-4 h-4 rounded" />
                                            <label className="text-xs text-slate-600">¿Relacionado con otro padecimiento?</label>
                                        </div>
                                        {formData.diagnostico?.relacionado_con_otro && renderInput("Especifique cuál", formData.diagnostico?.especifique_cual, 'diagnostico.especifique_cual')}
                                    </div>
                                </div>

                                <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                                    <h4 className="text-xs font-black mb-3 text-purple-600 flex items-center">
                                        <Syringe className="w-4 h-4 mr-2" />
                                        INTERVENCIÓN QUIRÚRGICA
                                    </h4>
                                    {renderInput("Tratamiento / Intervención (CPT)", formData.intervencion_qx?.equipo_especifico, 'intervencion_qx.equipo_especifico', 'textarea')}
                                    {renderInput("Técnica Quirúrgica", formData.intervencion_qx?.tecnica, 'intervencion_qx.tecnica', 'textarea')}
                                    <div className="grid grid-cols-2 gap-4 mt-3">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <input type="checkbox" checked={formData.intervencion_qx?.utilizo_equipo_especial || false} onChange={(e) => handleInputChange('intervencion_qx.utilizo_equipo_especial', e.target.checked)} className="w-4 h-4 rounded" />
                                                <label className="text-xs text-slate-600">¿Utilizó equipo especial?</label>
                                            </div>
                                            {formData.intervencion_qx?.utilizo_equipo_especial && renderInput("Detalle equipo", formData.intervencion_qx?.detalle_equipo_especial, 'intervencion_qx.detalle_equipo_especial')}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <input type="checkbox" checked={formData.intervencion_qx?.utilizo_insumos || false} onChange={(e) => handleInputChange('intervencion_qx.utilizo_insumos', e.target.checked)} className="w-4 h-4 rounded" />
                                                <label className="text-xs text-slate-600">¿Utilizó insumos/materiales?</label>
                                            </div>
                                            {formData.intervencion_qx?.utilizo_insumos && renderInput("Detalle insumos", formData.intervencion_qx?.detalle_insumos, 'intervencion_qx.detalle_insumos')}
                                        </div>
                                    </div>
                                </div>

                                {renderInput("Complicaciones", formData.complicaciones?.descripcion, 'complicaciones.descripcion', 'textarea')}
                                {renderInput("Estado Actual del Paciente", formData.padecimiento_actual?.estado_actual, 'padecimiento_actual.estado_actual', 'textarea')}
                                
                                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                                    <h4 className="text-xs font-black mb-3 text-emerald-600">SEGUIMIENTO</h4>
                                    <div className="flex items-center gap-2 mb-3">
                                        <input type="checkbox" checked={formData.padecimiento_actual?.seguira_tratamiento || false} onChange={(e) => handleInputChange('padecimiento_actual.seguira_tratamiento', e.target.checked)} className="w-4 h-4 rounded" />
                                        <label className="text-xs text-slate-600">¿El paciente seguirá recibiendo tratamiento?</label>
                                    </div>
                                    {(formData.padecimiento_actual?.seguira_tratamiento || formData.padecimiento_actual?.plan_tratamiento || formData.padecimiento_actual?.fecha_probable_alta) && (
                                        <>
                                            {renderInput("Plan de Tratamiento y Duración", formData.padecimiento_actual?.plan_tratamiento, 'padecimiento_actual.plan_tratamiento', 'textarea')}
                                            <DateInput label="Fecha Probable de Alta" value={formData.padecimiento_actual?.fecha_probable_alta} path="padecimiento_actual.fecha_probable_alta" isModified={!!modifiedFields['padecimiento_actual.fecha_probable_alta']} isHighlighted={highlightedField === 'padecimiento_actual.fecha_probable_alta'} onChange={handleInputChange} />
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {provider === 'NYLIFE' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <DateInput label="Fecha Primeros Síntomas" value={(formData as any).padecimiento_actual?.fecha_primeros_sintomas?.formatted} path="padecimiento_actual.fecha_primeros_sintomas.formatted" isModified={!!modifiedFields['padecimiento_actual.fecha_primeros_sintomas.formatted']} isHighlighted={highlightedField === 'padecimiento_actual.fecha_primeros_sintomas.formatted'} onChange={handleInputChange} />
                                    <DateInput label="Fecha Primera Consulta" value={(formData as any).padecimiento_actual?.fecha_primera_consulta?.formatted} path="padecimiento_actual.fecha_primera_consulta.formatted" isModified={!!modifiedFields['padecimiento_actual.fecha_primera_consulta.formatted']} isHighlighted={highlightedField === 'padecimiento_actual.fecha_primera_consulta.formatted'} onChange={handleInputChange} />
                                    <DateInput label="Fecha Diagnóstico" value={(formData as any).padecimiento_actual?.fecha_diagnostico?.formatted} path="padecimiento_actual.fecha_diagnostico.formatted" isModified={!!modifiedFields['padecimiento_actual.fecha_diagnostico.formatted']} isHighlighted={highlightedField === 'padecimiento_actual.fecha_diagnostico.formatted'} onChange={handleInputChange} />
                                </div>
                                
                                {renderInput("Evolución del Padecimiento", (formData as any).padecimiento_actual?.descripcion_evolucion, 'padecimiento_actual.descripcion_evolucion', 'textarea')}
                                
                                <div className={`p-4 ${theme.light} rounded-xl border ${theme.border}`}>
                                    <h4 className={`text-xs font-black mb-3 ${theme.secondary}`}>DIAGNÓSTICOS</h4>
                                    <div className="space-y-3">
                                        {renderInput("Diagnóstico 1", (formData as any).padecimiento_actual?.diagnosticos?.[0], 'padecimiento_actual.diagnosticos.0')}
                                        {renderInput("Diagnóstico 2", (formData as any).padecimiento_actual?.diagnosticos?.[1], 'padecimiento_actual.diagnosticos.1')}
                                        {renderInput("Diagnóstico 3", (formData as any).padecimiento_actual?.diagnosticos?.[2], 'padecimiento_actual.diagnosticos.2')}
                                    </div>
                                    <div className="mt-4">
                                        {renderCheckboxGroup("Tipo de Padecimiento", (formData as any).padecimiento_actual?.tipo_padecimiento, 'padecimiento_actual.tipo_padecimiento', ['Congénito', 'Agudo', 'Adquirido', 'Crónico'])}
                                    </div>
                                    {renderInput("Tiempo de Evolución", (formData as any).padecimiento_actual?.tiempo_evolucion, 'padecimiento_actual.tiempo_evolucion')}
                                    
                                    <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200">
                                        <div className="flex items-center gap-4 mb-2">
                                            <span className="text-xs font-medium text-slate-700">¿Tiene relación con otro padecimiento?</span>
                                            <div className="flex gap-3">
                                                <label className="flex items-center gap-1">
                                                    <input type="checkbox" checked={(formData as any).padecimiento_actual?.relacion_otro_padecimiento?.marcada?.includes('Sí')} onChange={(e) => { const arr = (formData as any).padecimiento_actual?.relacion_otro_padecimiento?.marcada || []; handleInputChange('padecimiento_actual.relacion_otro_padecimiento.marcada', e.target.checked ? [...arr.filter((v:string) => v !== 'Sí'), 'Sí'] : arr.filter((v:string) => v !== 'Sí')); }} className="w-4 h-4 rounded" />
                                                    <span className="text-xs text-slate-600">Sí</span>
                                                </label>
                                                <label className="flex items-center gap-1">
                                                    <input type="checkbox" checked={(formData as any).padecimiento_actual?.relacion_otro_padecimiento?.marcada?.includes('No')} onChange={(e) => { const arr = (formData as any).padecimiento_actual?.relacion_otro_padecimiento?.marcada || []; handleInputChange('padecimiento_actual.relacion_otro_padecimiento.marcada', e.target.checked ? [...arr.filter((v:string) => v !== 'No'), 'No'] : arr.filter((v:string) => v !== 'No')); }} className="w-4 h-4 rounded" />
                                                    <span className="text-xs text-slate-600">No</span>
                                                </label>
                                            </div>
                                        </div>
                                        {renderInput("¿Cuál?", (formData as any).padecimiento_actual?.relacion_otro_padecimiento?.cual, 'padecimiento_actual.relacion_otro_padecimiento.cual')}
                                    </div>
                                </div>

                                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                                    <h4 className="text-xs font-black mb-3 text-amber-600">DISCAPACIDAD</h4>
                                    <div className="flex items-center gap-4 mb-3">
                                        <span className="text-xs font-medium text-slate-700">¿El padecimiento ocasionó discapacidad?</span>
                                        <div className="flex gap-3">
                                            <label className="flex items-center gap-1">
                                                <input type="checkbox" checked={(formData as any).padecimiento_actual?.discapacidad?.marcada?.includes('Sí')} onChange={(e) => { const arr = (formData as any).padecimiento_actual?.discapacidad?.marcada || []; handleInputChange('padecimiento_actual.discapacidad.marcada', e.target.checked ? [...arr.filter((v:string) => v !== 'Sí'), 'Sí'] : arr.filter((v:string) => v !== 'Sí')); }} className="w-4 h-4 rounded" />
                                                <span className="text-xs text-slate-600">Sí</span>
                                            </label>
                                            <label className="flex items-center gap-1">
                                                <input type="checkbox" checked={(formData as any).padecimiento_actual?.discapacidad?.marcada?.includes('No')} onChange={(e) => { const arr = (formData as any).padecimiento_actual?.discapacidad?.marcada || []; handleInputChange('padecimiento_actual.discapacidad.marcada', e.target.checked ? [...arr.filter((v:string) => v !== 'No'), 'No'] : arr.filter((v:string) => v !== 'No')); }} className="w-4 h-4 rounded" />
                                                <span className="text-xs text-slate-600">No</span>
                                            </label>
                                        </div>
                                        <div className="flex gap-3 ml-4">
                                            <label className="flex items-center gap-1">
                                                <input type="checkbox" checked={(formData as any).padecimiento_actual?.discapacidad?.tipo?.includes('Parcial')} onChange={(e) => { const arr = (formData as any).padecimiento_actual?.discapacidad?.tipo || []; handleInputChange('padecimiento_actual.discapacidad.tipo', e.target.checked ? [...arr.filter((v:string) => v !== 'Parcial'), 'Parcial'] : arr.filter((v:string) => v !== 'Parcial')); }} className="w-4 h-4 rounded" />
                                                <span className="text-xs text-slate-600">Parcial</span>
                                            </label>
                                            <label className="flex items-center gap-1">
                                                <input type="checkbox" checked={(formData as any).padecimiento_actual?.discapacidad?.tipo?.includes('Total')} onChange={(e) => { const arr = (formData as any).padecimiento_actual?.discapacidad?.tipo || []; handleInputChange('padecimiento_actual.discapacidad.tipo', e.target.checked ? [...arr.filter((v:string) => v !== 'Total'), 'Total'] : arr.filter((v:string) => v !== 'Total')); }} className="w-4 h-4 rounded" />
                                                <span className="text-xs text-slate-600">Total</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <DateInput label="Desde" value={(formData as any).padecimiento_actual?.discapacidad?.desde?.formatted || (formData as any).padecimiento_actual?.discapacidad?.desde} path="padecimiento_actual.discapacidad.desde" isModified={!!modifiedFields['padecimiento_actual.discapacidad.desde']} isHighlighted={highlightedField === 'padecimiento_actual.discapacidad.desde'} onChange={handleInputChange} />
                                        <DateInput label="Hasta" value={(formData as any).padecimiento_actual?.discapacidad?.hasta?.formatted || (formData as any).padecimiento_actual?.discapacidad?.hasta} path="padecimiento_actual.discapacidad.hasta" isModified={!!modifiedFields['padecimiento_actual.discapacidad.hasta']} isHighlighted={highlightedField === 'padecimiento_actual.discapacidad.hasta'} onChange={handleInputChange} />
                                    </div>
                                </div>

                                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                                    <h4 className="text-xs font-black mb-3 text-emerald-600">TRATAMIENTO FUTURO</h4>
                                    <div className="flex items-center gap-4 mb-3">
                                        <span className="text-xs font-medium text-slate-700">¿Continuará recibiendo tratamiento en el futuro?</span>
                                        <div className="flex gap-3">
                                            <label className="flex items-center gap-1">
                                                <input type="checkbox" checked={(formData as any).padecimiento_actual?.tratamiento_futuro?.marcada?.includes('Sí')} onChange={(e) => { const arr = (formData as any).padecimiento_actual?.tratamiento_futuro?.marcada || []; handleInputChange('padecimiento_actual.tratamiento_futuro.marcada', e.target.checked ? [...arr.filter((v:string) => v !== 'Sí'), 'Sí'] : arr.filter((v:string) => v !== 'Sí')); }} className="w-4 h-4 rounded" />
                                                <span className="text-xs text-slate-600">Sí</span>
                                            </label>
                                            <label className="flex items-center gap-1">
                                                <input type="checkbox" checked={(formData as any).padecimiento_actual?.tratamiento_futuro?.marcada?.includes('No')} onChange={(e) => { const arr = (formData as any).padecimiento_actual?.tratamiento_futuro?.marcada || []; handleInputChange('padecimiento_actual.tratamiento_futuro.marcada', e.target.checked ? [...arr.filter((v:string) => v !== 'No'), 'No'] : arr.filter((v:string) => v !== 'No')); }} className="w-4 h-4 rounded" />
                                                <span className="text-xs text-slate-600">No</span>
                                            </label>
                                        </div>
                                    </div>
                                    {renderInput("Favor de especificar", (formData as any).padecimiento_actual?.tratamiento_futuro?.especificar, 'padecimiento_actual.tratamiento_futuro.especificar', 'textarea')}
                                </div>

                                <div className="p-4 bg-cyan-50 rounded-xl border border-cyan-200">
                                    <h4 className="text-xs font-black mb-3 text-cyan-600">EXPLORACIÓN FÍSICA</h4>
                                    <div className="grid grid-cols-2 gap-4 mb-3">
                                        {renderInput("Talla", (formData as any).exploracion_fisica?.talla, 'exploracion_fisica.talla', 'text', 'cm')}
                                        {renderInput("Peso", (formData as any).exploracion_fisica?.peso, 'exploracion_fisica.peso', 'text', 'kg')}
                                    </div>
                                    {renderInput("Resultados de Exploración y Estudios", (formData as any).exploracion_fisica?.resultados, 'exploracion_fisica.resultados', 'textarea')}
                                </div>
                            </div>
                        )}

                        {provider === 'GNP' && (
                            <div className="space-y-4">
                                {renderInput("Padecimiento Actual", formData.padecimiento_actual?.descripcion, 'padecimiento_actual.descripcion', 'textarea')}
                                <DateInput label="Fecha de Inicio del Padecimiento" value={formData.padecimiento_actual?.fecha_inicio} path="padecimiento_actual.fecha_inicio" isModified={!!modifiedFields['padecimiento_actual.fecha_inicio']} isHighlighted={highlightedField === 'padecimiento_actual.fecha_inicio'} onChange={handleInputChange} />
                                
                                <div className={`p-4 ${theme.light} rounded-xl border ${theme.border}`}>
                                    <h4 className={`text-xs font-black mb-3 ${theme.secondary}`}>DIAGNÓSTICO</h4>
                                    {renderInput("Diagnóstico(s) Definitivo(s)", formData.diagnostico?.diagnostico_definitivo, 'diagnostico.diagnostico_definitivo', 'textarea')}
                                    <div className="grid grid-cols-2 gap-4 mt-3">
                                        <DateInput label="Fecha de Diagnóstico" value={formData.diagnostico?.fecha_diagnostico} path="diagnostico.fecha_diagnostico" isModified={!!modifiedFields['diagnostico.fecha_diagnostico']} isHighlighted={highlightedField === 'diagnostico.fecha_diagnostico'} onChange={handleInputChange} />
                                    </div>
                                    <div className="mt-4">
                                        {renderCheckboxGroup("Tipo de Padecimiento", formData.padecimiento_actual?.tipo_padecimiento, 'padecimiento_actual.tipo_padecimiento', ['Congénito', 'Adquirido', 'Agudo', 'Crónico'])}
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={formData.diagnostico?.relacionado_con_otro || false} onChange={(e) => handleInputChange('diagnostico.relacionado_con_otro', e.target.checked)} className="w-4 h-4 rounded" />
                                            <label className="text-xs text-slate-600">¿Se ha relacionado con algún otro padecimiento?</label>
                                        </div>
                                        {(formData.diagnostico?.relacionado_con_otro || formData.diagnostico?.especifique_cual) && renderInput("Especifique cuál padecimiento", formData.diagnostico?.especifique_cual, 'diagnostico.especifique_cual')}
                                    </div>
                                </div>

                                <div className="p-4 bg-cyan-50 rounded-xl border border-cyan-200">
                                    <h4 className="text-xs font-black mb-3 text-cyan-600">SIGNOS VITALES Y MEDIDAS ANTROPOMÉTRICAS</h4>
                                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                                        {renderInput("Pulso", formData.signos_vitales?.pulso, 'signos_vitales.pulso', 'text', 'x min')}
                                        {renderInput("Respiración", formData.signos_vitales?.respiracion, 'signos_vitales.respiracion', 'text', 'x min')}
                                        {renderInput("Temperatura", formData.signos_vitales?.temperatura, 'signos_vitales.temperatura', 'text', '°C')}
                                        {renderInput("Presión Arterial", formData.signos_vitales?.presion_arterial, 'signos_vitales.presion_arterial', 'text', 'mmHg')}
                                        {renderInput("Peso", formData.signos_vitales?.peso, 'signos_vitales.peso', 'text', 'kg')}
                                        {renderInput("Altura", formData.signos_vitales?.altura, 'signos_vitales.altura', 'text', 'm')}
                                    </div>
                                </div>

                                {renderInput("Exploración Física (Resultados del día del diagnóstico)", formData.exploracion_fisica?.resultados, 'exploracion_fisica.resultados', 'textarea')}
                                {renderInput("Estudios Realizados", formData.estudios?.estudios_realizados, 'estudios.estudios_realizados', 'textarea')}

                                <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                                    <h4 className="text-xs font-black mb-3 text-red-600">COMPLICACIONES</h4>
                                    <div className="mb-3">
                                        {renderRadioGroup(
                                            "¿Se presentaron complicaciones?", 
                                            formData.complicaciones?.presento_complicaciones === true ? 'Sí' : 
                                            formData.complicaciones?.presento_complicaciones === false ? 'No' : 
                                            undefined, 
                                            'complicaciones.presento_complicaciones', 
                                            ['Sí', 'No']
                                        )}
                                    </div>
                                    {formData.complicaciones?.presento_complicaciones === true && (
                                        <>
                                            {renderInput("Descripción de Complicaciones", formData.complicaciones?.descripcion, 'complicaciones.descripcion', 'textarea')}
                                            <DateInput label="Fecha de Inicio de Complicaciones" value={formData.complicaciones?.fecha_inicio} path="complicaciones.fecha_inicio" isModified={!!modifiedFields['complicaciones.fecha_inicio']} isHighlighted={highlightedField === 'complicaciones.fecha_inicio'} onChange={handleInputChange} />
                                        </>
                                    )}
                                </div>

                                <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                                    <h4 className="text-xs font-black mb-3 text-purple-600 flex items-center">
                                        <Syringe className="w-4 h-4 mr-2" />
                                        TRATAMIENTO
                                    </h4>
                                    {renderInput("Tratamientos, Procedimientos y Técnica Quirúrgica", formData.tratamiento?.descripcion, 'tratamiento.descripcion', 'textarea')}
                                    <DateInput label="Fecha de Inicio del Tratamiento" value={formData.tratamiento?.fecha_inicio} path="tratamiento.fecha_inicio" isModified={!!modifiedFields['tratamiento.fecha_inicio']} isHighlighted={highlightedField === 'tratamiento.fecha_inicio'} onChange={handleInputChange} />
                                    {renderInput("Equipo Específico Utilizado (Intervención Qx)", formData.intervencion_qx?.equipo_especifico, 'intervencion_qx.equipo_especifico', 'textarea')}
                                </div>

                                {renderInput("Información Adicional", formData.info_adicional?.descripcion, 'info_adicional.descripcion', 'textarea')}
                            </div>
                        )}
                        </div>

                        {/* SECCIÓN: TRATAMIENTO (solo NYLIFE) */}
                        {provider === 'NYLIFE' && (
                            <div id="section-tratamiento" className="scroll-mt-20">
                                <div className="space-y-4">
                                    <div className={`p-4 ${theme.light} rounded-xl border ${theme.border}`}>
                                        <h4 className={`text-xs font-black mb-3 ${theme.secondary}`}>TRATAMIENTO</h4>
                                        {renderCheckboxGroup("Modalidad", (formData as any).tratamiento_y_hospital?.modalidad, 'tratamiento_y_hospital.modalidad', ['Quirúrgico', 'Médico'])}
                                        {renderInput("Detalle del Tratamiento", (formData as any).tratamiento_y_hospital?.detalle_tratamiento, 'tratamiento_y_hospital.detalle_tratamiento', 'textarea')}
                                        {renderCheckboxGroup("Estatus", (formData as any).tratamiento_y_hospital?.estatus_tratamiento, 'tratamiento_y_hospital.estatus_tratamiento', ['Programación', 'Realizado'])}
                                        <div className="mt-4">
                                            {renderCheckboxGroup("¿Hubo Complicaciones?", (formData as any).tratamiento_y_hospital?.complicaciones?.marcada, 'tratamiento_y_hospital.complicaciones.marcada', ['Sí', 'No'])}
                                            {renderInput("Detalle de Complicaciones", (formData as any).tratamiento_y_hospital?.complicaciones?.detalle, 'tratamiento_y_hospital.complicaciones.detalle', 'textarea')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SECCIÓN: HOSPITAL */}
                        <div id="section-hospital" className="scroll-mt-20">
                        {provider === 'METLIFE' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">{renderInput("Nombre Hospital", formData.hospital?.nombre_hospital, 'hospital.nombre_hospital')}</div>
                                <div className="md:col-span-2">
                                    {renderRadioGroup("Tipo de Estancia", formData.hospital?.tipo_estancia, 'hospital.tipo_estancia', ['Urgencia', 'Ingreso hospitalario', 'Corta estancia ambulatoria'])}
                                </div>
                                <DateInput label="Fecha Ingreso" value={formData.hospital?.fecha_ingreso} path="hospital.fecha_ingreso" isModified={!!modifiedFields['hospital.fecha_ingreso']} isHighlighted={highlightedField === 'hospital.fecha_ingreso'} onChange={handleInputChange} />
                                <DateInput label="Fecha Intervención" value={formData.hospital?.fecha_intervencion} path="hospital.fecha_intervencion" isModified={!!modifiedFields['hospital.fecha_intervencion']} isHighlighted={highlightedField === 'hospital.fecha_intervencion'} onChange={handleInputChange} />
                                <DateInput label="Fecha Egreso" value={formData.hospital?.fecha_egreso} path="hospital.fecha_egreso" isModified={!!modifiedFields['hospital.fecha_egreso']} isHighlighted={highlightedField === 'hospital.fecha_egreso'} onChange={handleInputChange} />
                            </div>
                        )}

                        {provider === 'GNP' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">{renderInput("Nombre del Hospital o Clínica", formData.hospital?.nombre_hospital, 'hospital.nombre_hospital')}</div>
                                    {renderInput("Ciudad", formData.hospital?.ciudad, 'hospital.ciudad')}
                                    {renderInput("Estado", formData.hospital?.estado, 'hospital.estado')}
                                </div>
                                <div>
                                    {renderRadioGroup("Tipo de Estancia", formData.hospital?.tipo_estancia, 'hospital.tipo_estancia', ['Urgencia', 'Hospitalaria', 'Corta estancia / ambulatoria'])}
                                </div>
                                <DateInput label="Fecha de Ingreso" value={formData.hospital?.fecha_ingreso} path="hospital.fecha_ingreso" isModified={!!modifiedFields['hospital.fecha_ingreso']} isHighlighted={highlightedField === 'hospital.fecha_ingreso'} onChange={handleInputChange} />
                            </div>
                        )}

                        {provider === 'NYLIFE' && (
                            <div className="space-y-4">
                                <div className={`p-4 ${theme.light} rounded-xl border ${theme.border}`}>
                                    <h4 className={`text-xs font-black mb-3 ${theme.secondary}`}>HOSPITAL</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {renderInput("Nombre del Hospital", (formData as any).tratamiento_y_hospital?.hospital?.nombre, 'tratamiento_y_hospital.hospital.nombre')}
                                        {renderInput("Ciudad", (formData as any).tratamiento_y_hospital?.hospital?.ciudad, 'tratamiento_y_hospital.hospital.ciudad')}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                        <DateInput label="Fecha Ingreso" value={(formData as any).tratamiento_y_hospital?.hospital?.ingreso?.formatted} path="tratamiento_y_hospital.hospital.ingreso.formatted" isModified={!!modifiedFields['tratamiento_y_hospital.hospital.ingreso.formatted']} isHighlighted={highlightedField === 'tratamiento_y_hospital.hospital.ingreso.formatted'} onChange={handleInputChange} />
                                        <DateInput label="Fecha Egreso" value={(formData as any).tratamiento_y_hospital?.hospital?.egreso?.formatted} path="tratamiento_y_hospital.hospital.egreso.formatted" isModified={!!modifiedFields['tratamiento_y_hospital.hospital.egreso.formatted']} isHighlighted={highlightedField === 'tratamiento_y_hospital.hospital.egreso.formatted'} onChange={handleInputChange} />
                                    </div>
                                    <div className="mt-4 flex items-center gap-4">
                                        <span className="text-xs font-medium text-slate-700">Tipo de Estancia:</span>
                                        <div className="flex gap-3">
                                            <label className="flex items-center gap-1">
                                                <input type="checkbox" checked={(formData as any).tratamiento_y_hospital?.hospital?.tipo_estancia?.includes('Urgencia')} onChange={(e) => { const arr = (formData as any).tratamiento_y_hospital?.hospital?.tipo_estancia || []; handleInputChange('tratamiento_y_hospital.hospital.tipo_estancia', e.target.checked ? [...arr.filter((v:string) => v !== 'Urgencia'), 'Urgencia'] : arr.filter((v:string) => v !== 'Urgencia')); }} className="w-4 h-4 rounded" />
                                                <span className="text-xs text-slate-600">Urgencia</span>
                                            </label>
                                            <label className="flex items-center gap-1">
                                                <input type="checkbox" checked={(formData as any).tratamiento_y_hospital?.hospital?.tipo_estancia?.includes('Hospitalización')} onChange={(e) => { const arr = (formData as any).tratamiento_y_hospital?.hospital?.tipo_estancia || []; handleInputChange('tratamiento_y_hospital.hospital.tipo_estancia', e.target.checked ? [...arr.filter((v:string) => v !== 'Hospitalización'), 'Hospitalización'] : arr.filter((v:string) => v !== 'Hospitalización')); }} className="w-4 h-4 rounded" />
                                                <span className="text-xs text-slate-600">Hospitalización</span>
                                            </label>
                                            <label className="flex items-center gap-1">
                                                <input type="checkbox" checked={(formData as any).tratamiento_y_hospital?.hospital?.tipo_estancia?.includes('Corta estancia / Ambulatoria')} onChange={(e) => { const arr = (formData as any).tratamiento_y_hospital?.hospital?.tipo_estancia || []; handleInputChange('tratamiento_y_hospital.hospital.tipo_estancia', e.target.checked ? [...arr.filter((v:string) => v !== 'Corta estancia / Ambulatoria'), 'Corta estancia / Ambulatoria'] : arr.filter((v:string) => v !== 'Corta estancia / Ambulatoria')); }} className="w-4 h-4 rounded" />
                                                <span className="text-xs text-slate-600">Corta estancia / Ambulatoria</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        </div>

                        {/* SECCIÓN: OBSERVACIONES (solo METLIFE) */}
                        {provider === 'METLIFE' && (
                            <div id="section-observaciones" className="scroll-mt-20">
                                <div className="space-y-4">
                                    {renderInput("Observaciones y Comentarios Adicionales", formData.info_adicional?.descripcion, 'info_adicional.descripcion', 'textarea')}
                                </div>
                            </div>
                        )}

                        {/* SECCIÓN: EQUIPO QUIRÚRGICO / OTROS MÉDICOS (METLIFE y GNP, no NYLIFE) */}
                        {provider !== 'NYLIFE' && (
                            <div id="section-equipo_qx" className="scroll-mt-20">
                            {provider === 'METLIFE' && (
                                <div className="space-y-4">
                                    <p className="text-xs text-slate-500 mb-4">Profesionales de la salud que participaron en el procedimiento:</p>
                                    {renderPersonalQuirurgico("Anestesiólogo", formData.equipo_quirurgico_metlife?.anestesiologo, 'equipo_quirurgico_metlife.anestesiologo')}
                                    {renderPersonalQuirurgico("Primer Ayudante", formData.equipo_quirurgico_metlife?.primer_ayudante, 'equipo_quirurgico_metlife.primer_ayudante')}
                                    {renderPersonalQuirurgico("Otro Profesional 1", formData.equipo_quirurgico_metlife?.otro_1, 'equipo_quirurgico_metlife.otro_1')}
                                    {renderPersonalQuirurgico("Otro Profesional 2", formData.equipo_quirurgico_metlife?.otro_2, 'equipo_quirurgico_metlife.otro_2')}
                                </div>
                            )}

                            {provider === 'GNP' && (
                            <div className="space-y-6">
                                <p className="text-xs text-slate-500 mb-4">Médicos interconsultantes o participantes en la intervención:</p>
                                
                                {[0, 1, 2].map((index) => {
                                    const medico = formData.otros_medicos?.[index];
                                    return (
                                        <div key={index} className={`p-4 ${theme.light} rounded-xl border ${theme.border}`}>
                                            <h4 className={`text-xs font-black mb-3 ${theme.secondary}`}>MÉDICO {index + 1}</h4>
                                            <div className="mb-3">
                                                {renderRadioGroup("Tipo de Participación", medico?.tipo_participacion, `otros_medicos.${index}.tipo_participacion`, ['Interconsultante', 'Cirujano', 'Anestesiólogo', 'Ayudantía', 'Otra'])}
                                            </div>
                                            {medico?.tipo_participacion === 'Otra' && renderInput("Especifique cuál", medico?.tipo_participacion_otra, `otros_medicos.${index}.tipo_participacion_otra`)}
                                            <div className="grid grid-cols-3 gap-3 mt-3">
                                                {renderInput("Primer Apellido", medico?.primer_apellido, `otros_medicos.${index}.primer_apellido`)}
                                                {renderInput("Segundo Apellido", medico?.segundo_apellido, `otros_medicos.${index}.segundo_apellido`)}
                                                {renderInput("Nombre(s)", medico?.nombres, `otros_medicos.${index}.nombres`)}
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 mt-3">
                                                {renderInput("Especialidad", medico?.especialidad, `otros_medicos.${index}.especialidad`)}
                                                {renderInput("Cédula Profesional", medico?.cedula_profesional, `otros_medicos.${index}.cedula_profesional`)}
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 mt-3">
                                                {renderInput("Cédula de Especialidad", medico?.cedula_especialidad, `otros_medicos.${index}.cedula_especialidad`)}
                                                {renderInput("Presupuesto de Honorarios", medico?.ppto_honorarios, `otros_medicos.${index}.ppto_honorarios`, 'text', '$')}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            )}
                            </div>
                        )}

                        {/* SECCIÓN: MÉDICO TRATANTE */}
                        <div id="section-medico" className="scroll-mt-20">
                        {provider === 'METLIFE' && (
                            <div className="space-y-4">
                                {renderCheckboxGroup("Tipo de Atención", formData.medico_tratante?.tipo_atencion, 'medico_tratante.tipo_atencion', ['Médico tratante', 'Cirujano principal', 'Interconsultante', 'Equipo quirúrgico', 'Segunda valoración'])}
                                {renderInput("Nombre Médico Tratante", formData.medico_tratante?.nombres, 'medico_tratante.nombres')}
                                {renderInput("Especialidad", formData.medico_tratante?.especialidad, 'medico_tratante.especialidad')}
                                <div className="grid grid-cols-2 gap-4">
                                    {renderInput("RFC", formData.medico_tratante?.rfc, 'medico_tratante.rfc')}
                                    {renderInput("Cédula Profesional", formData.medico_tratante?.cedula_profesional, 'medico_tratante.cedula_profesional')}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {renderInput("Teléfono Consultorio", formData.medico_tratante?.telefono_consultorio, 'medico_tratante.telefono_consultorio')}
                                    {renderInput("Celular", formData.medico_tratante?.celular, 'medico_tratante.celular')}
                                </div>
                                {renderInput("Domicilio Consultorio", formData.medico_tratante?.domicilio_consultorio, 'medico_tratante.domicilio_consultorio')}
                                {renderInput("Correo Electrónico", formData.medico_tratante?.correo_electronico, 'medico_tratante.correo_electronico')}
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" checked={formData.medico_tratante?.convenio_aseguradora || false} onChange={(e) => handleInputChange('medico_tratante.convenio_aseguradora', e.target.checked)} className="w-4 h-4 rounded" />
                                        <label className="text-xs text-slate-600">¿Tiene convenio con aseguradora?</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" checked={formData.medico_tratante?.se_ajusta_tabulador || false} onChange={(e) => handleInputChange('medico_tratante.se_ajusta_tabulador', e.target.checked)} className="w-4 h-4 rounded" />
                                        <label className="text-xs text-slate-600">¿Acepta tabuladores de pago?</label>
                                    </div>
                                </div>
                                <div className={`p-4 ${theme.light} rounded-xl border ${theme.border} mt-4`}>
                                    <h4 className={`text-xs font-black mb-3 flex items-center ${theme.secondary}`}>HONORARIOS SOLICITADOS</h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        {renderInput("Cirujano", formData.medico_tratante?.honorarios_cirujano, 'medico_tratante.honorarios_cirujano', 'text', '$')}
                                        {renderInput("Anestesiólogo", formData.medico_tratante?.honorarios_anestesiologo, 'medico_tratante.honorarios_anestesiologo', 'text', '$')}
                                        {renderInput("Primer Ayudante", formData.medico_tratante?.honorarios_ayudante, 'medico_tratante.honorarios_ayudante', 'text', '$')}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        {renderInput("Otro 1", formData.medico_tratante?.honorarios_otro_1, 'medico_tratante.honorarios_otro_1', 'text', '$')}
                                        {renderInput("Otro 2", formData.medico_tratante?.honorarios_otro_2, 'medico_tratante.honorarios_otro_2', 'text', '$')}
                                    </div>
                                </div>
                            </div>
                        )}

                        {provider === 'NYLIFE' && (
                            <div className="space-y-4">
                                <div className={`p-4 ${theme.light} rounded-xl border ${theme.border}`}>
                                    <h4 className={`text-xs font-black mb-3 ${theme.secondary}`}>MÉDICO TRATANTE</h4>
                                    <div className="md:col-span-2 mb-4">
                                        {renderInput("Nombre Completo", (formData as any).medico_tratante?.nombre_completo, 'medico_tratante.nombre_completo')}
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        {renderInput("Apellido Paterno", (formData as any).medico_tratante?.apellido_paterno, 'medico_tratante.apellido_paterno')}
                                        {renderInput("Apellido Materno", (formData as any).medico_tratante?.apellido_materno, 'medico_tratante.apellido_materno')}
                                        {renderInput("Nombre(s)", (formData as any).medico_tratante?.nombres, 'medico_tratante.nombres')}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        {renderInput("Especialidad", (formData as any).medico_tratante?.especialidad, 'medico_tratante.especialidad')}
                                        {renderInput("Nº Proveedor", (formData as any).medico_tratante?.numero_proveedor, 'medico_tratante.numero_proveedor')}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        {renderInput("Cédula Profesional", (formData as any).medico_tratante?.cedula_profesional, 'medico_tratante.cedula_profesional')}
                                        {renderInput("Cédula Especialidad", (formData as any).medico_tratante?.cedula_especialidad, 'medico_tratante.cedula_especialidad')}
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 mt-4">
                                        {renderInput("Teléfono Consultorio", (formData as any).medico_tratante?.telefono_consultorio, 'medico_tratante.telefono_consultorio')}
                                        {renderInput("Celular", (formData as any).medico_tratante?.telefono_movil, 'medico_tratante.telefono_movil')}
                                        {renderInput("Correo Electrónico", (formData as any).medico_tratante?.correo_electronico, 'medico_tratante.correo_electronico')}
                                    </div>
                                    {renderInput("RFC", (formData as any).medico_tratante?.rfc, 'medico_tratante.rfc')}
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs font-medium text-slate-700">¿En Convenio/Red?</span>
                                            <div className="flex gap-3">
                                                <label className="flex items-center gap-1">
                                                    <input type="checkbox" checked={(formData as any).medico_tratante?.convenio_red?.includes('Sí')} onChange={(e) => { const arr = (formData as any).medico_tratante?.convenio_red || []; handleInputChange('medico_tratante.convenio_red', e.target.checked ? [...arr.filter((v:string) => v !== 'Sí'), 'Sí'] : arr.filter((v:string) => v !== 'Sí')); }} className="w-4 h-4 rounded" />
                                                    <span className="text-xs text-slate-600">Sí</span>
                                                </label>
                                                <label className="flex items-center gap-1">
                                                    <input type="checkbox" checked={(formData as any).medico_tratante?.convenio_red?.includes('No')} onChange={(e) => { const arr = (formData as any).medico_tratante?.convenio_red || []; handleInputChange('medico_tratante.convenio_red', e.target.checked ? [...arr.filter((v:string) => v !== 'No'), 'No'] : arr.filter((v:string) => v !== 'No')); }} className="w-4 h-4 rounded" />
                                                    <span className="text-xs text-slate-600">No</span>
                                                </label>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs font-medium text-slate-700">¿Acepta Tabulador?</span>
                                            <div className="flex gap-3">
                                                <label className="flex items-center gap-1">
                                                    <input type="checkbox" checked={(formData as any).medico_tratante?.acepta_tabulador?.includes('Sí')} onChange={(e) => { const arr = (formData as any).medico_tratante?.acepta_tabulador || []; handleInputChange('medico_tratante.acepta_tabulador', e.target.checked ? [...arr.filter((v:string) => v !== 'Sí'), 'Sí'] : arr.filter((v:string) => v !== 'Sí')); }} className="w-4 h-4 rounded" />
                                                    <span className="text-xs text-slate-600">Sí</span>
                                                </label>
                                                <label className="flex items-center gap-1">
                                                    <input type="checkbox" checked={(formData as any).medico_tratante?.acepta_tabulador?.includes('No')} onChange={(e) => { const arr = (formData as any).medico_tratante?.acepta_tabulador || []; handleInputChange('medico_tratante.acepta_tabulador', e.target.checked ? [...arr.filter((v:string) => v !== 'No'), 'No'] : arr.filter((v:string) => v !== 'No')); }} className="w-4 h-4 rounded" />
                                                    <span className="text-xs text-slate-600">No</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                                    <h4 className="text-xs font-black mb-3 text-purple-600 flex items-center">
                                        <Stethoscope className="w-4 h-4 mr-2" />
                                        EQUIPO QUIRÚRGICO
                                    </h4>
                                    <p className="text-xs text-slate-500 mb-4">Profesionales que participan en el procedimiento</p>
                                    
                                    <div className="p-3 bg-white rounded-lg border border-purple-100 mb-3">
                                        <div className="text-xs font-semibold text-purple-700 mb-2">Anestesiólogo</div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {renderInput("Nombre", (formData as any).equipo_quirurgico_nylife?.anestesiologo?.nombre, 'equipo_quirurgico_nylife.anestesiologo.nombre')}
                                            {renderInput("Especialidad", (formData as any).equipo_quirurgico_nylife?.anestesiologo?.especialidad, 'equipo_quirurgico_nylife.anestesiologo.especialidad')}
                                            {renderInput("Presupuesto", (formData as any).equipo_quirurgico_nylife?.anestesiologo?.presupuesto, 'equipo_quirurgico_nylife.anestesiologo.presupuesto', 'text', '$')}
                                        </div>
                                    </div>

                                    <div className="p-3 bg-white rounded-lg border border-purple-100 mb-3">
                                        <div className="text-xs font-semibold text-purple-700 mb-2">Primer Ayudante</div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {renderInput("Nombre", (formData as any).equipo_quirurgico_nylife?.primer_ayudante?.nombre, 'equipo_quirurgico_nylife.primer_ayudante.nombre')}
                                            {renderInput("Especialidad", (formData as any).equipo_quirurgico_nylife?.primer_ayudante?.especialidad, 'equipo_quirurgico_nylife.primer_ayudante.especialidad')}
                                            {renderInput("Presupuesto", (formData as any).equipo_quirurgico_nylife?.primer_ayudante?.presupuesto, 'equipo_quirurgico_nylife.primer_ayudante.presupuesto', 'text', '$')}
                                        </div>
                                    </div>

                                    <div className="p-3 bg-white rounded-lg border border-purple-100 mb-3">
                                        <div className="text-xs font-semibold text-purple-700 mb-2">Segundo Ayudante</div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {renderInput("Nombre", (formData as any).equipo_quirurgico_nylife?.segundo_ayudante?.nombre, 'equipo_quirurgico_nylife.segundo_ayudante.nombre')}
                                            {renderInput("Especialidad", (formData as any).equipo_quirurgico_nylife?.segundo_ayudante?.especialidad, 'equipo_quirurgico_nylife.segundo_ayudante.especialidad')}
                                            {renderInput("Presupuesto", (formData as any).equipo_quirurgico_nylife?.segundo_ayudante?.presupuesto, 'equipo_quirurgico_nylife.segundo_ayudante.presupuesto', 'text', '$')}
                                        </div>
                                    </div>

                                    <div className="p-3 bg-white rounded-lg border border-purple-100 mb-3">
                                        <div className="text-xs font-semibold text-purple-700 mb-2">Otros Médicos</div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {renderInput("Nombre", (formData as any).equipo_quirurgico_nylife?.otros_medicos?.nombre, 'equipo_quirurgico_nylife.otros_medicos.nombre')}
                                            {renderInput("Especialidad", (formData as any).equipo_quirurgico_nylife?.otros_medicos?.especialidad, 'equipo_quirurgico_nylife.otros_medicos.especialidad')}
                                            {renderInput("Presupuesto", (formData as any).equipo_quirurgico_nylife?.otros_medicos?.presupuesto, 'equipo_quirurgico_nylife.otros_medicos.presupuesto', 'text', '$')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {provider === 'GNP' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    {renderInput("Primer Apellido", formData.medico_tratante?.primer_apellido, 'medico_tratante.primer_apellido')}
                                    {renderInput("Segundo Apellido", formData.medico_tratante?.segundo_apellido, 'medico_tratante.segundo_apellido')}
                                    {renderInput("Nombre(s)", formData.medico_tratante?.nombres, 'medico_tratante.nombres')}
                                </div>
                                {renderInput("Especialidad", formData.medico_tratante?.especialidad, 'medico_tratante.especialidad')}
                                <div className="grid grid-cols-2 gap-4">
                                    {renderInput("Cédula Profesional", formData.medico_tratante?.cedula_profesional, 'medico_tratante.cedula_profesional')}
                                    {renderInput("Cédula de Especialidad", formData.medico_tratante?.cedula_especialidad, 'medico_tratante.cedula_especialidad')}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                                        <input type="checkbox" checked={formData.medico_tratante?.convenio_gnp || false} onChange={(e) => handleInputChange('medico_tratante.convenio_gnp', e.target.checked)} className="w-4 h-4 rounded text-orange-600" />
                                        <label className="text-xs text-slate-600">¿Está en convenio con GNP?</label>
                                    </div>
                                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                                        <input type="checkbox" checked={formData.medico_tratante?.se_ajusta_tabulador || false} onChange={(e) => handleInputChange('medico_tratante.se_ajusta_tabulador', e.target.checked)} className="w-4 h-4 rounded text-orange-600" />
                                        <label className="text-xs text-slate-600">¿Se ajusta al tabulador?</label>
                                    </div>
                                </div>

                                {renderInput("Presupuesto de Honorarios", formData.medico_tratante?.ppto_honorarios, 'medico_tratante.ppto_honorarios', 'text', '$')}
                                
                                <div className="grid grid-cols-3 gap-4">
                                    {renderInput("Teléfono Consultorio", formData.medico_tratante?.telefono_consultorio, 'medico_tratante.telefono_consultorio')}
                                    {renderInput("Celular", formData.medico_tratante?.celular, 'medico_tratante.celular')}
                                    {renderInput("Correo Electrónico", formData.medico_tratante?.correo_electronico, 'medico_tratante.correo_electronico')}
                                </div>

                                <div>
                                    {renderRadioGroup("Tipo de Participación", formData.medico_tratante?.tipo_participacion, 'medico_tratante.tipo_participacion', ['Tratante', 'Cirujano', 'Otra'])}
                                </div>
                                {formData.medico_tratante?.tipo_participacion === 'Otra' && renderInput("Especifique cuál", formData.medico_tratante?.tipo_participacion_otra, 'medico_tratante.tipo_participacion_otra')}

                                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                                    <input type="checkbox" checked={formData.medico_tratante?.hubo_interconsulta || false} onChange={(e) => handleInputChange('medico_tratante.hubo_interconsulta', e.target.checked)} className="w-4 h-4 rounded text-orange-600" />
                                    <label className="text-xs text-slate-600">¿Hubo interconsulta? (Los datos se capturan en la sección "Equipo Qx")</label>
                                </div>
                            </div>
                        )}
                        </div>

                        {/* SECCIÓN: FIRMA / VALIDACIÓN */}
                        <div id="section-validacion" className="scroll-mt-20">
                        {provider !== 'NYLIFE' && (
                            <div className="p-10 border-4 border-dashed border-slate-100 rounded-3xl text-center">
                                <ShieldCheck className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest">Validación de Autorización</h3>
                                
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    {renderInput("Lugar de Firma", formData.firma?.lugar, 'firma.lugar')}
                                    <DateInput 
                                        label="Fecha de Firma" 
                                        value={formData.firma?.fecha} 
                                        path="firma.fecha" 
                                        isModified={!!modifiedFields['firma.fecha']} 
                                        isHighlighted={highlightedField === 'firma.fecha'} 
                                        onChange={handleInputChange} 
                                    />
                                </div>
                                
                                {renderInput("Nombre Firma Autógrafa", formData.firma?.nombre_firma, 'firma.nombre_firma')}
                                
                                <div className="mt-4 flex items-center justify-center gap-2 p-3 bg-slate-50 rounded-lg">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.firma?.firma_autografa_detectada || false} 
                                        onChange={(e) => handleInputChange('firma.firma_autografa_detectada', e.target.checked)} 
                                        className="w-5 h-5 rounded text-emerald-600"
                                    />
                                    <label className="text-xs font-medium text-slate-600">Se detectó firma autógrafa (no solo nombre impreso)</label>
                                </div>
                            </div>
                        )}

                        {provider === 'NYLIFE' && (
                            <div className="space-y-6">
                                <div className={`p-6 ${theme.light} rounded-xl border ${theme.border}`}>
                                    <h4 className={`text-xs font-black mb-4 ${theme.secondary} flex items-center`}>
                                        <ShieldCheck className="w-4 h-4 mr-2" />
                                        FIRMA DEL MÉDICO - PÁGINA 1
                                    </h4>
                                    <div className="grid grid-cols-1 gap-4">
                                        {renderInput("Nombre en Firma", (formData as any).firma_pagina_1?.nombre_firma, 'firma_pagina_1.nombre_firma')}
                                        <DateInput 
                                            label="Fecha de Firma" 
                                            value={(formData as any).firma_pagina_1?.fecha?.formatted} 
                                            path="firma_pagina_1.fecha.formatted" 
                                            isModified={!!modifiedFields['firma_pagina_1.fecha.formatted']} 
                                            isHighlighted={highlightedField === 'firma_pagina_1.fecha.formatted'} 
                                            onChange={handleInputChange} 
                                        />
                                        <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-slate-200">
                                            <input 
                                                type="checkbox" 
                                                checked={(formData as any).firma_pagina_1?.firma_autografa_detectada === 'Detectada'} 
                                                onChange={(e) => handleInputChange('firma_pagina_1.firma_autografa_detectada', e.target.checked ? 'Detectada' : 'No detectada')} 
                                                className="w-4 h-4 rounded text-emerald-600"
                                            />
                                            <label className="text-xs font-medium text-slate-600">Se detectó firma autógrafa (no solo nombre impreso)</label>
                                        </div>
                                    </div>
                                </div>

                                <div className={`p-6 ${theme.light} rounded-xl border ${theme.border}`}>
                                    <h4 className={`text-xs font-black mb-4 ${theme.secondary} flex items-center`}>
                                        <ShieldCheck className="w-4 h-4 mr-2" />
                                        FIRMA DEL MÉDICO - PÁGINA 2
                                    </h4>
                                    <div className="grid grid-cols-1 gap-4">
                                        {renderInput("Nombre en Firma", (formData as any).firma_pagina_2?.nombre_firma, 'firma_pagina_2.nombre_firma')}
                                        <DateInput 
                                            label="Fecha de Firma" 
                                            value={(formData as any).firma_pagina_2?.fecha?.formatted} 
                                            path="firma_pagina_2.fecha.formatted" 
                                            isModified={!!modifiedFields['firma_pagina_2.fecha.formatted']} 
                                            isHighlighted={highlightedField === 'firma_pagina_2.fecha.formatted'} 
                                            onChange={handleInputChange} 
                                        />
                                        <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-slate-200">
                                            <input 
                                                type="checkbox" 
                                                checked={(formData as any).firma_pagina_2?.firma_autografa_detectada === 'Detectada'} 
                                                onChange={(e) => handleInputChange('firma_pagina_2.firma_autografa_detectada', e.target.checked ? 'Detectada' : 'No detectada')} 
                                                className="w-4 h-4 rounded text-emerald-600"
                                            />
                                            <label className="text-xs font-medium text-slate-600">Se detectó firma autógrafa (no solo nombre impreso)</label>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left">
                                    <h4 className="text-xs font-black mb-3 text-slate-600">OBSERVACIONES DEL INFORME</h4>
                                    {renderInput("Coherencia Clínica", (formData as any).metadata?.existe_coherencia_clinica, 'metadata.existe_coherencia_clinica')}
                                    {renderInput("Observaciones", (formData as any).metadata?.observaciones, 'metadata.observaciones', 'textarea')}
                                </div>
                            </div>
                        )}
                        </div>
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
