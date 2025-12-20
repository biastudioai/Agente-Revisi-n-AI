import React, { useState, useEffect } from 'react';
import { AnalysisReport, ExtractedData, ProviderType, PersonalQuirurgico } from '../types';
import ScoreCard from './ScoreCard';
import DateInput from './DateInput';
import ReviewModal from './ReviewModal';
import { getProviderTheme } from '../providers';
import { RotateCcw, Activity, User, FileText, Hospital, Users, PenTool, ShieldCheck, HeartPulse, ClipboardList, BadgeCheck, Building2, Stethoscope, Syringe } from 'lucide-react';

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
    if (path.includes('padecimiento') || path.includes('diagnostico') || path.includes('intervencion') || path.includes('complicaciones') || path.includes('exploracion')) return 'padecimiento';
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
            type === 'checkbox' ?
            <input type="checkbox" checked={value || false} onChange={(e) => handleInputChange(path, e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" /> :
            <input type={type} value={value || ''} onChange={(e) => handleInputChange(path, e.target.value)} placeholder="No detectado" className="w-full rounded-lg text-sm px-3 py-2 border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand-500 outline-none" />
          }
          {suffix && <span className="absolute right-3 top-2 text-gray-400 text-xs">{suffix}</span>}
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
     { id: 'hospital', label: 'Hospital', icon: Hospital, metlifeSection: '4' },
     { id: 'observaciones', label: 'Observaciones', icon: ClipboardList, metlifeSection: '5' },
     { id: 'equipo_qx', label: 'Equipo Qx', icon: Users, metlifeSection: '6' },
     { id: 'medico', label: 'Médico', icon: Activity, metlifeSection: '6' },
     { id: 'validacion', label: 'Firma', icon: PenTool, metlifeSection: '7' },
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
                                {renderInput("Causa Atención", formData.identificacion?.causa_atencion, 'identificacion.causa_atencion')}
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
                                {renderInput("Antecedentes Personales Patológicos", formData.antecedentes?.personales_patologicos, 'antecedentes.personales_patologicos', 'textarea')}
                                {renderInput("Antecedentes Quirúrgicos", formData.antecedentes?.antecedentes_quirurgicos, 'antecedentes.antecedentes_quirurgicos', 'textarea')}
                                {provider === 'METLIFE' && renderInput("Otras Afecciones (sin relación)", formData.antecedentes?.otras_afecciones, 'antecedentes.otras_afecciones', 'textarea')}
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
                                    {renderInput("Tipo Padecimiento", formData.padecimiento_actual?.tipo_padecimiento, 'padecimiento_actual.tipo_padecimiento')}
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
                                    {provider === 'METLIFE' && (
                                        <div className="mt-4 grid grid-cols-2 gap-4">
                                            <div className="flex items-center gap-2">
                                                <input type="checkbox" checked={formData.diagnostico?.relacionado_con_otro || false} onChange={(e) => handleInputChange('diagnostico.relacionado_con_otro', e.target.checked)} className="w-4 h-4 rounded" />
                                                <label className="text-xs text-slate-600">¿Relacionado con otro padecimiento?</label>
                                            </div>
                                            {formData.diagnostico?.relacionado_con_otro && renderInput("Especifique cuál", formData.diagnostico?.especifique_cual, 'diagnostico.especifique_cual')}
                                        </div>
                                    )}
                                </div>

                                {provider === 'METLIFE' && (
                                    <>
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
                                            {formData.padecimiento_actual?.seguira_tratamiento && (
                                                <>
                                                    {renderInput("Plan de Tratamiento y Duración", formData.padecimiento_actual?.plan_tratamiento, 'padecimiento_actual.plan_tratamiento', 'textarea')}
                                                    <DateInput label="Fecha Probable de Alta" value={formData.padecimiento_actual?.fecha_probable_alta} path="padecimiento_actual.fecha_probable_alta" isModified={!!modifiedFields['padecimiento_actual.fecha_probable_alta']} isHighlighted={highlightedField === 'padecimiento_actual.fecha_probable_alta'} onChange={handleInputChange} />
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {activeTab === 'hospital' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">{renderInput("Nombre Hospital", formData.hospital?.nombre_hospital, 'hospital.nombre_hospital')}</div>
                                {provider === 'METLIFE' && (
                                    <div className="md:col-span-2">{renderInput("Tipo de Estancia", formData.hospital?.tipo_estancia, 'hospital.tipo_estancia')}</div>
                                )}
                                <DateInput label="Fecha Ingreso" value={formData.hospital?.fecha_ingreso} path="hospital.fecha_ingreso" isModified={!!modifiedFields['hospital.fecha_ingreso']} isHighlighted={highlightedField === 'hospital.fecha_ingreso'} onChange={handleInputChange} />
                                {provider === 'METLIFE' && (
                                    <DateInput label="Fecha Intervención" value={formData.hospital?.fecha_intervencion} path="hospital.fecha_intervencion" isModified={!!modifiedFields['hospital.fecha_intervencion']} isHighlighted={highlightedField === 'hospital.fecha_intervencion'} onChange={handleInputChange} />
                                )}
                                <DateInput label="Fecha Egreso" value={formData.hospital?.fecha_egreso} path="hospital.fecha_egreso" isModified={!!modifiedFields['hospital.fecha_egreso']} isHighlighted={highlightedField === 'hospital.fecha_egreso'} onChange={handleInputChange} />
                                {provider === 'GNP' && (
                                    <>
                                        {renderInput("Ciudad", formData.hospital?.ciudad, 'hospital.ciudad')}
                                        {renderInput("Estado", formData.hospital?.estado, 'hospital.estado')}
                                    </>
                                )}
                            </div>
                        )}

                        {activeTab === 'observaciones' && (
                            <div className="space-y-4">
                                {renderInput("Observaciones y Comentarios Adicionales", formData.info_adicional?.descripcion, 'info_adicional.descripcion', 'textarea')}
                            </div>
                        )}

                        {activeTab === 'equipo_qx' && provider === 'METLIFE' && (
                            <div className="space-y-4">
                                <p className="text-xs text-slate-500 mb-4">Profesionales de la salud que participaron en el procedimiento:</p>
                                {renderPersonalQuirurgico("Anestesiólogo", formData.equipo_quirurgico_metlife?.anestesiologo, 'equipo_quirurgico_metlife.anestesiologo')}
                                {renderPersonalQuirurgico("Primer Ayudante", formData.equipo_quirurgico_metlife?.primer_ayudante, 'equipo_quirurgico_metlife.primer_ayudante')}
                                {renderPersonalQuirurgico("Otro Profesional 1", formData.equipo_quirurgico_metlife?.otro_1, 'equipo_quirurgico_metlife.otro_1')}
                                {renderPersonalQuirurgico("Otro Profesional 2", formData.equipo_quirurgico_metlife?.otro_2, 'equipo_quirurgico_metlife.otro_2')}
                            </div>
                        )}

                        {activeTab === 'equipo_qx' && provider === 'GNP' && (
                            <div className="p-10 border-4 border-dashed border-slate-100 rounded-3xl text-center">
                                <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                <p className="text-sm text-slate-400">GNP no tiene una sección estructurada de Equipo Quirúrgico. Los datos de otros médicos se muestran en la pestaña "Médico".</p>
                            </div>
                        )}

                        {activeTab === 'medico' && (
                            <div className="space-y-4">
                                {provider === 'METLIFE' && renderInput("Tipo de Atención", formData.medico_tratante?.tipo_atencion, 'medico_tratante.tipo_atencion')}
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
                                {provider === 'METLIFE' && (
                                    <>
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
                                    </>
                                )}
                                {provider === 'GNP' && (
                                    <div className="flex items-center gap-2 mt-4">
                                        <input type="checkbox" checked={formData.medico_tratante?.convenio_gnp || false} onChange={(e) => handleInputChange('medico_tratante.convenio_gnp', e.target.checked)} className="w-4 h-4 rounded" />
                                        <label className="text-xs text-slate-600">¿Tiene convenio con GNP?</label>
                                    </div>
                                )}
                                <div className={`p-4 ${theme.light} rounded-xl border ${theme.border} mt-4`}>
                                    <h4 className={`text-xs font-black mb-3 flex items-center ${theme.secondary}`}>HONORARIOS SOLICITADOS</h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        {renderInput("Cirujano", formData.medico_tratante?.honorarios_cirujano, 'medico_tratante.honorarios_cirujano', 'text', '$')}
                                        {renderInput("Anestesiólogo", formData.medico_tratante?.honorarios_anestesiologo, 'medico_tratante.honorarios_anestesiologo', 'text', '$')}
                                        {renderInput("Primer Ayudante", formData.medico_tratante?.honorarios_ayudante, 'medico_tratante.honorarios_ayudante', 'text', '$')}
                                    </div>
                                    {provider === 'METLIFE' && (
                                        <div className="grid grid-cols-2 gap-4 mt-4">
                                            {renderInput("Otro 1", formData.medico_tratante?.honorarios_otro_1, 'medico_tratante.honorarios_otro_1', 'text', '$')}
                                            {renderInput("Otro 2", formData.medico_tratante?.honorarios_otro_2, 'medico_tratante.honorarios_otro_2', 'text', '$')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'validacion' && (
                            <div className="p-10 border-4 border-dashed border-slate-100 rounded-3xl text-center">
                                <ShieldCheck className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest">Validación de Autorización</h3>
                                {renderInput("Nombre Firma Autógrafa", formData.firma?.nombre_firma, 'firma.nombre_firma')}
                                <div className="mt-4 flex justify-center gap-4">
                                     <div className="px-4 py-2 bg-slate-50 rounded-lg text-[10px] font-bold text-slate-400">Lugar: {formData.firma?.lugar || formData.firma?.lugar_fecha || 'S/D'}</div>
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
