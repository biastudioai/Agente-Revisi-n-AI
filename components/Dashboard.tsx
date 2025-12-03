import React, { useState, useEffect, useRef } from 'react';
import { AnalysisReport, ExtractedData } from '../types';
import ScoreCard from './ScoreCard';
import DateInput from './DateInput';
import { RotateCcw, Activity, User, FileText, Hospital, Sparkles, Users, CheckSquare, PenTool } from 'lucide-react';

interface DashboardProps {
  report: AnalysisReport;
  onReevaluate: (updatedData: ExtractedData) => void;
  isReevaluating: boolean;
}

type TabId = 'identificacion' | 'historia_1' | 'historia_2' | 'hospital' | 'medico' | 'otros_medicos';

const Dashboard: React.FC<DashboardProps> = ({ report, onReevaluate, isReevaluating }) => {
  const [formData, setFormData] = useState<ExtractedData>(report.extracted);
  const [modifiedFields, setModifiedFields] = useState<Record<string, { old: any, new: any }>>({});
  const [activeTab, setActiveTab] = useState<TabId>('identificacion');
  const [highlightedField, setHighlightedField] = useState<string | null>(null);
  
  useEffect(() => {
    setFormData(report.extracted);
    setModifiedFields({});
  }, [report]);

  useEffect(() => {
    if (highlightedField) {
        const timer = setTimeout(() => {
            const element = document.getElementById(`field-${highlightedField}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100); 
        
        const clearTimer = setTimeout(() => {
            setHighlightedField(null);
        }, 3000);
        
        return () => {
            clearTimeout(timer);
            clearTimeout(clearTimer);
        };
    }
  }, [highlightedField, activeTab]);

  const updateNestedState = (obj: any, path: string[], value: any): any => {
    const [head, ...rest] = path;
    if (rest.length === 0) {
      if (Array.isArray(obj)) {
        const index = parseInt(head);
        const newArray = [...obj];
        newArray[index] = value;
        return newArray;
      }
      return { ...obj, [head]: value };
    }
    if (Array.isArray(obj)) {
      const index = parseInt(head);
      const newArray = [...obj];
      if (newArray[index] === undefined) return newArray;
      newArray[index] = updateNestedState(newArray[index], rest, value);
      return newArray;
    }
    const nextObj = obj && typeof obj === 'object' ? obj : {};
    return { ...nextObj, [head]: updateNestedState(nextObj[head], rest, value) };
  };

  const handleInputChange = (pathString: string, value: any) => {
    const path = pathString.split('.');
    let originalValue: any = report.extracted;
    try {
        for (const key of path) {
            if (originalValue) originalValue = originalValue[key];
        }
    } catch (e) {
        originalValue = undefined;
    }

    setFormData(prevData => updateNestedState(prevData, path, value));

    if (originalValue != value) {
      setModifiedFields(prev => ({
        ...prev,
        [pathString]: { old: originalValue, new: value }
      }));
    } else {
      const newModified = { ...modifiedFields };
      delete newModified[pathString];
      setModifiedFields(newModified);
    }
  };

  const getTabForField = (path: string): TabId => {
    if (path.startsWith('tramite.') || path.startsWith('identificacion.') || path.startsWith('firma.')) return 'identificacion';
    if (path.startsWith('antecedentes.') || path.startsWith('padecimiento_actual.') || path.startsWith('diagnostico.')) return 'historia_1';
    if (path.startsWith('hospital.')) return 'hospital';
    if (path.startsWith('medico_tratante.')) return 'medico';
    if (path.startsWith('otros_medicos')) return 'otros_medicos';
    return 'historia_2';
  };

  const handleIssueClick = (fieldPath: string) => {
      const targetTab = getTabForField(fieldPath);
      setActiveTab(targetTab);
      setHighlightedField(fieldPath);
  };

  const hasChanges = Object.keys(modifiedFields).length > 0;

  const renderCheckbox = (label: string, value: boolean | undefined, path: string) => {
    const isModified = modifiedFields[path] !== undefined;
    const isHighlighted = highlightedField === path;
    
    return (
        <div 
          id={`field-${path}`}
          className={`flex items-center p-3 rounded-lg border transition-all duration-300 ${isHighlighted ? 'bg-yellow-50 ring-2 ring-yellow-400 border-yellow-400' : 'bg-white border-slate-200 hover:border-brand-300'}`}
        >
            <div className="relative flex items-center">
                <input
                    type="checkbox"
                    checked={!!value}
                    onChange={(e) => handleInputChange(path, e.target.checked)}
                    className="w-5 h-5 text-brand-600 border-gray-300 rounded focus:ring-brand-500 cursor-pointer"
                />
            </div>
            <div className="ml-3 text-sm">
                <label className="font-medium text-slate-700">{label}</label>
                {isModified && <span className="ml-2 text-[10px] text-accent-600 font-bold bg-accent-50 px-1.5 py-0.5 rounded">Editado</span>}
            </div>
        </div>
    );
  };

  const renderInput = (
    label: string, 
    value: any, 
    path: string, 
    type: string = 'text',
    suffix?: string
  ) => {
    const isModified = modifiedFields[path] !== undefined;
    const isEmpty = value === null || value === undefined || value === '';
    const isHighlighted = highlightedField === path;
    
    let confidenceDot = "bg-emerald-400"; 
    if (isModified) confidenceDot = "bg-accent-500";
    else if (isEmpty) confidenceDot = "bg-gray-300";

    const baseClasses = "block w-full rounded-lg text-sm px-3 py-2.5 transition-all duration-200 font-medium outline-none border shadow-sm";
    
    let stateClasses = "";
    if (isModified) {
        stateClasses = "border-accent-400 bg-accent-50 text-accent-900 ring-2 ring-accent-100 placeholder-accent-300 focus:border-accent-500 focus:ring-accent-200";
    } else if (isHighlighted) {
        stateClasses = "border-yellow-400 bg-white text-slate-800 ring-2 ring-yellow-100";
    } else {
        stateClasses = "border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-400 hover:bg-white hover:border-brand-300 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-200";
    }

    return (
      <div 
        id={`field-${path}`}
        className={`mb-4 group transition-all duration-500 rounded-lg ${isHighlighted ? 'p-3 bg-yellow-50 ring-2 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]' : ''}`}
      >
        <div className="flex justify-between items-center mb-1">
           <label className={`text-[11px] font-bold uppercase tracking-wider flex items-center truncate transition-colors ${isHighlighted ? 'text-yellow-700' : 'text-gray-500'}`} title={label}>
              {label}
              <span className={`ml-2 w-1.5 h-1.5 rounded-full ${confidenceDot} shadow-sm flex-shrink-0`} title={isEmpty ? "Dato faltante" : "Extraído por IA"}></span>
           </label>
           {isModified && (
             <span className="flex items-center text-[10px] font-bold text-accent-700 bg-accent-100 px-2 py-0.5 rounded-full animate-pulse">
               Editado
             </span>
           )}
        </div>
        
        <div className="relative transition-all duration-200 transform origin-left">
          {type === 'textarea' ? (
            <textarea
              value={value || ''}
              onChange={(e) => handleInputChange(path, e.target.value)}
              rows={3}
              autoComplete="off"
              className={`${baseClasses} ${stateClasses}`}
            />
          ) : (
            <input
              type={type}
              value={value || ''}
              onChange={(e) => handleInputChange(path, e.target.value)}
              placeholder="Sin dato"
              autoComplete="off"
              className={`${baseClasses} ${stateClasses}`}
            />
          )}
          {suffix && <span className="absolute right-3 top-2.5 text-gray-400 text-xs font-medium">{suffix}</span>}
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'identificacion', label: '1. Identificación', icon: User },
    { id: 'historia_1', label: '2. Ant. & Dx', icon: FileText },
    { id: 'historia_2', label: '3. Detalle Clínico', icon: Activity },
    { id: 'hospital', label: '4. Hospital', icon: Hospital },
    { id: 'medico', label: '5. Méd. Tratante', icon: Activity },
    { id: 'otros_medicos', label: '6. Otros Médicos', icon: Users },
  ];

  return (
    <div className="h-full flex flex-col bg-white relative overflow-hidden">
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 sticky top-0 z-20 flex justify-between items-center shrink-0">
         <div className="flex items-center">
            <div className="bg-brand-100 p-2 rounded-lg mr-3">
                <Sparkles className="w-5 h-5 text-brand-600" />
            </div>
            <div>
                <h1 className="text-lg font-bold text-slate-900 leading-none">Informe GNP - Extracción</h1>
                <p className="text-xs text-slate-500 mt-1">Datos estructurados según PDF oficial (Verbatim)</p>
            </div>
         </div>
         {hasChanges && (
          <button 
            onClick={() => {
              setFormData(report.extracted);
              setModifiedFields({});
            }}
            className="px-3 py-1.5 border border-slate-200 rounded-md text-slate-500 hover:bg-slate-50 hover:text-slate-800 flex items-center text-xs font-medium transition-colors"
          >
            <RotateCcw className="w-3 h-3 mr-1.5" />
            Restaurar
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pb-20">
         <div className="flex flex-col xl:flex-row gap-8 items-start">
            <div className="flex-1 w-full">
                <div className="flex flex-wrap gap-2 mb-6 bg-slate-50 p-1.5 rounded-xl border border-slate-100 shadow-inner">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabId)}
                            className={`
                                flex items-center px-3 py-2 text-xs font-bold rounded-lg transition-all duration-200
                                ${isActive 
                                ? 'bg-white text-brand-700 shadow-sm ring-1 ring-black/5 scale-100' 
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}
                            `}
                            >
                            <Icon className={`w-3.5 h-3.5 mr-2 ${isActive ? 'text-brand-500' : 'text-slate-400'}`} />
                            {tab.label}
                            </button>
                        );
                    })}
                </div>

                <div className="animate-fade-in min-h-[600px]">
                    {activeTab === 'identificacion' && (
                    <div className="space-y-6">
                         <div className="p-5 bg-blue-50/50 rounded-xl border border-blue-100/50 shadow-sm">
                           <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-4 border-b border-blue-200 pb-2 flex items-center">
                             <CheckSquare className="w-4 h-4 mr-2" /> Selección de Trámite
                           </h3>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                             {renderCheckbox("Reembolso", formData.tramite?.reembolso, 'tramite.reembolso')}
                             {renderCheckbox("Programación Cirugía", formData.tramite?.programacion_cirugia, 'tramite.programacion_cirugia')}
                             {renderCheckbox("Programación Medicamentos", formData.tramite?.programacion_medicamentos, 'tramite.programacion_medicamentos')}
                             {renderCheckbox("Programación Servicios", formData.tramite?.programacion_servicios, 'tramite.programacion_servicios')}
                             {renderCheckbox("Indemnización Diaria", formData.tramite?.indemnizacion, 'tramite.indemnizacion')}
                             {renderCheckbox("Reporte Hospitalario", formData.tramite?.reporte_hospitalario, 'tramite.reporte_hospitalario')}
                           </div>
                           <div className="mt-4">
                             {renderInput("Número de Póliza", formData.tramite?.numero_poliza, 'tramite.numero_poliza')}
                           </div>
                         </div>

                        <h3 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Identificación Asegurado Afectado</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                             {renderInput("Primer Apellido", formData.identificacion?.primer_apellido, 'identificacion.primer_apellido')}
                             {renderInput("Segundo Apellido", formData.identificacion?.segundo_apellido, 'identificacion.segundo_apellido')}
                             <div className="md:col-span-2">{renderInput("Nombre(s)", formData.identificacion?.nombres, 'identificacion.nombres')}</div>
                             {renderInput("Edad", formData.identificacion?.edad, 'identificacion.edad')}
                             {renderInput("Sexo", formData.identificacion?.sexo, 'identificacion.sexo')}
                             <div className="md:col-span-2">{renderInput("Causa de Atención", formData.identificacion?.causa_atencion, 'identificacion.causa_atencion')}</div>
                        </div>

                         <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 mt-6">
                            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2 flex items-center">
                                <PenTool className="w-3.5 h-3.5 mr-2" /> Firma (Validación de Autoría)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {renderInput("Lugar y Fecha", formData.firma?.lugar_fecha, 'firma.lugar_fecha')}
                                {renderInput("Nombre de quien firma", formData.firma?.nombre_firma, 'firma.nombre_firma')}
                            </div>
                        </div>
                    </div>
                    )}

                    {activeTab === 'historia_1' && (
                    <div className="space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-xs font-bold text-brand-600 uppercase mb-3">Antecedentes</h3>
                            <div className="grid grid-cols-1 gap-y-1">
                                {renderInput("Personales Patológicos", formData.antecedentes?.personales_patologicos, 'antecedentes.personales_patologicos', 'textarea')}
                                {renderInput("Personales No Patológicos", formData.antecedentes?.personales_no_patologicos, 'antecedentes.personales_no_patologicos', 'textarea')}
                                {renderInput("Gineco-Obstétricos", formData.antecedentes?.gineco_obstetricos, 'antecedentes.gineco_obstetricos', 'textarea')}
                                {renderInput("Perinatales", formData.antecedentes?.perinatales, 'antecedentes.perinatales', 'textarea')}
                            </div>
                        </div>
                        
                        <div className="space-y-1 pt-4 border-t border-dashed border-slate-200">
                            <h3 className="text-xs font-bold text-brand-600 uppercase mb-3">Padecimiento Actual</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                                <div className="md:col-span-2">{renderInput("Descripción", formData.padecimiento_actual?.descripcion, 'padecimiento_actual.descripcion', 'textarea')}</div>
                                <DateInput 
                                  label="Fecha de Inicio" 
                                  value={formData.padecimiento_actual?.fecha_inicio} 
                                  path="padecimiento_actual.fecha_inicio"
                                  isModified={modifiedFields['padecimiento_actual.fecha_inicio'] !== undefined}
                                  isHighlighted={highlightedField === 'padecimiento_actual.fecha_inicio'}
                                  onChange={handleInputChange}
                                />
                            </div>
                        </div>

                         <div className="space-y-1 pt-4 border-t border-dashed border-slate-200">
                            <h3 className="text-xs font-bold text-brand-600 uppercase mb-3">Diagnóstico</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                                <div className="md:col-span-2">{renderInput("Diagnóstico(s) definitivo(s)", formData.diagnostico?.diagnostico_definitivo, 'diagnostico.diagnostico_definitivo', 'textarea')}</div>
                                <DateInput 
                                  label="Fecha de Diagnóstico" 
                                  value={formData.diagnostico?.fecha_diagnostico} 
                                  path="diagnostico.fecha_diagnostico"
                                  isModified={modifiedFields['diagnostico.fecha_diagnostico'] !== undefined}
                                  isHighlighted={highlightedField === 'diagnostico.fecha_diagnostico'}
                                  onChange={handleInputChange}
                                />
                                {renderInput("Tipo de Padecimiento", formData.diagnostico?.tipo_padecimiento, 'diagnostico.tipo_padecimiento')}
                                <div className="flex items-center h-full pt-2">
                                    {renderCheckbox("Relacionado con otro", formData.diagnostico?.relacionado_con_otro, 'diagnostico.relacionado_con_otro')}
                                </div>
                                <div className="md:col-span-2">{renderInput("Especifique cuál", formData.diagnostico?.especifique_cual, 'diagnostico.especifique_cual')}</div>
                            </div>
                        </div>
                    </div>
                    )}

                     {activeTab === 'historia_2' && (
                    <div className="space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Signos Vitales & Exploración</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                                {renderInput("Pulso", formData.signos_vitales?.pulso, 'signos_vitales.pulso')}
                                {renderInput("Respiración", formData.signos_vitales?.respiracion, 'signos_vitales.respiracion')}
                                {renderInput("Temperatura", formData.signos_vitales?.temperatura, 'signos_vitales.temperatura')}
                                {renderInput("Presión Arterial", formData.signos_vitales?.presion_arterial, 'signos_vitales.presion_arterial')}
                                {renderInput("Peso", formData.signos_vitales?.peso, 'signos_vitales.peso')}
                                {renderInput("Talla", formData.signos_vitales?.altura, 'signos_vitales.altura')}
                            </div>
                            <div className="mt-4">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Exploración Física</h4>
                                {renderInput("Resultados", formData.exploracion_fisica?.resultados, 'exploracion_fisica.resultados', 'textarea')}
                                <DateInput 
                                  label="Fecha" 
                                  value={formData.exploracion_fisica?.fecha} 
                                  path="exploracion_fisica.fecha"
                                  isModified={modifiedFields['exploracion_fisica.fecha'] !== undefined}
                                  isHighlighted={highlightedField === 'exploracion_fisica.fecha'}
                                  onChange={handleInputChange}
                                />
                            </div>
                             <div className="mt-4">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Estudios Realizados</h4>
                                {renderInput("Estudios / Interpretaciones", formData.estudios?.estudios_realizados, 'estudios.estudios_realizados', 'textarea')}
                            </div>
                        </div>

                        <div className="space-y-1 pt-4 border-t border-dashed border-slate-200">
                            <h3 className="text-xs font-bold text-brand-600 uppercase mb-3">Complicaciones</h3>
                            <div className="grid grid-cols-1 gap-y-1">
                                {renderCheckbox("¿Presentó Complicaciones?", formData.complicaciones?.presento_complicaciones, 'complicaciones.presento_complicaciones')}
                                <DateInput 
                                  label="Fecha inicio" 
                                  value={formData.complicaciones?.fecha_inicio} 
                                  path="complicaciones.fecha_inicio"
                                  isModified={modifiedFields['complicaciones.fecha_inicio'] !== undefined}
                                  isHighlighted={highlightedField === 'complicaciones.fecha_inicio'}
                                  onChange={handleInputChange}
                                />
                                {renderInput("Descripción", formData.complicaciones?.descripcion, 'complicaciones.descripcion', 'textarea')}
                            </div>
                        </div>

                        <div className="space-y-1 pt-4 border-t border-dashed border-slate-200">
                             <h3 className="text-xs font-bold text-brand-600 uppercase mb-3">Tratamiento</h3>
                             {renderInput("Descripción / Posología", formData.tratamiento?.descripcion, 'tratamiento.descripcion', 'textarea')}
                             <DateInput 
                                label="Fecha inicio" 
                                value={formData.tratamiento?.fecha_inicio} 
                                path="tratamiento.fecha_inicio"
                                isModified={modifiedFields['tratamiento.fecha_inicio'] !== undefined}
                                isHighlighted={highlightedField === 'tratamiento.fecha_inicio'}
                                onChange={handleInputChange}
                              />
                        </div>

                        <div className="space-y-1 pt-4 border-t border-dashed border-slate-200">
                             <h3 className="text-xs font-bold text-brand-600 uppercase mb-3">Intervención Quirúrgica</h3>
                             {renderInput("Equipo Específico", formData.intervencion_qx?.equipo_especifico, 'intervencion_qx.equipo_especifico')}
                             {renderInput("Fechas", formData.intervencion_qx?.fechas, 'intervencion_qx.fechas')}
                             {renderInput("Técnica (ej. Laparoscopía)", formData.intervencion_qx?.tecnica, 'intervencion_qx.tecnica')}
                        </div>

                         <div className="space-y-1 pt-4 border-t border-dashed border-slate-200">
                             <h3 className="text-xs font-bold text-brand-600 uppercase mb-3">Información Adicional</h3>
                             {renderInput("Info Adicional", formData.info_adicional?.descripcion, 'info_adicional.descripcion', 'textarea')}
                        </div>
                    </div>
                    )}

                    {activeTab === 'hospital' && (
                    <div className="space-y-1">
                         <h3 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Datos del Hospital / Clínica</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                            <div className="md:col-span-2">{renderInput("Nombre Hospital/Clínica", formData.hospital?.nombre_hospital, 'hospital.nombre_hospital')}</div>
                            {renderInput("Ciudad", formData.hospital?.ciudad, 'hospital.ciudad')}
                            {renderInput("Estado", formData.hospital?.estado, 'hospital.estado')}
                            {renderInput("Tipo Estancia", formData.hospital?.tipo_estancia, 'hospital.tipo_estancia')}
                            <DateInput 
                              label="Fecha Ingreso" 
                              value={formData.hospital?.fecha_ingreso} 
                              path="hospital.fecha_ingreso"
                              isModified={modifiedFields['hospital.fecha_ingreso'] !== undefined}
                              isHighlighted={highlightedField === 'hospital.fecha_ingreso'}
                              onChange={handleInputChange}
                            />
                         </div>
                    </div>
                    )}

                    {activeTab === 'medico' && (
                    <div className="space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Médico Tratante</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                                {renderInput("Primer Apellido", formData.medico_tratante?.primer_apellido, 'medico_tratante.primer_apellido')}
                                {renderInput("Segundo Apellido", formData.medico_tratante?.segundo_apellido, 'medico_tratante.segundo_apellido')}
                                <div className="md:col-span-2">{renderInput("Nombre(s)", formData.medico_tratante?.nombres, 'medico_tratante.nombres')}</div>
                                {renderInput("Especialidad", formData.medico_tratante?.especialidad, 'medico_tratante.especialidad')}
                                {renderInput("Cédula Prof.", formData.medico_tratante?.cedula_profesional, 'medico_tratante.cedula_profesional')}
                                {renderInput("Cédula Esp.", formData.medico_tratante?.cedula_especialidad, 'medico_tratante.cedula_especialidad')}
                                
                                <div className="md:col-span-2 grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    {renderCheckbox("Convenio GNP", formData.medico_tratante?.convenio_gnp, 'medico_tratante.convenio_gnp')}
                                    {renderCheckbox("Se ajusta a tabulador", formData.medico_tratante?.se_ajusta_tabulador, 'medico_tratante.se_ajusta_tabulador')}
                                    {renderCheckbox("Hubo Interconsulta", formData.medico_tratante?.hubo_interconsulta, 'medico_tratante.hubo_interconsulta')}
                                </div>

                                {renderInput("Tipo Participación", formData.medico_tratante?.tipo_participacion, 'medico_tratante.tipo_participacion')}
                                {renderInput("Ppto. Honorarios", formData.medico_tratante?.ppto_honorarios, 'medico_tratante.ppto_honorarios')}
                                {renderInput("Tel. Consultorio", formData.medico_tratante?.telefono_consultorio, 'medico_tratante.telefono_consultorio')}
                                {renderInput("Celular", formData.medico_tratante?.celular, 'medico_tratante.celular')}
                                <div className="md:col-span-2">{renderInput("Email", formData.medico_tratante?.correo_electronico, 'medico_tratante.correo_electronico')}</div>
                            </div>
                        </div>
                    </div>
                    )}

                    {activeTab === 'otros_medicos' && (
                    <div className="space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Médicos Interconsultantes / Participantes</h3>
                            {formData.otros_medicos && formData.otros_medicos.length > 0 ? (
                                formData.otros_medicos.map((medico, index) => (
                                    <div key={index} className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg relative">
                                        <span className="absolute top-2 right-2 text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded border border-slate-100">MÉDICO {index + 1}</span>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                                            {renderInput(`Tipo Participación`, medico.tipo_participacion, `otros_medicos.${index}.tipo_participacion`)}
                                            {renderInput(`Ppto. Honorarios`, medico.ppto_honorarios, `otros_medicos.${index}.ppto_honorarios`)}
                                            {renderInput(`Primer Apellido`, medico.primer_apellido, `otros_medicos.${index}.primer_apellido`)}
                                            {renderInput(`Segundo Apellido`, medico.segundo_apellido, `otros_medicos.${index}.segundo_apellido`)}
                                            <div className="md:col-span-2">{renderInput(`Nombre(s)`, medico.nombres, `otros_medicos.${index}.nombres`)}</div>
                                            {renderInput(`Especialidad`, medico.especialidad, `otros_medicos.${index}.especialidad`)}
                                            {renderInput(`Cédula Prof.`, medico.cedula_profesional, `otros_medicos.${index}.cedula_profesional`)}
                                            {renderInput(`Cédula Esp.`, medico.cedula_especialidad, `otros_medicos.${index}.cedula_especialidad`)}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-slate-400 text-sm italic">
                                    No se detectaron médicos adicionales en el reporte.
                                </div>
                            )}
                        </div>
                    </div>
                    )}
                </div>
            </div>

            <div className="w-full xl:w-80 shrink-0 space-y-6">
                <ScoreCard 
                    scoreData={report.score} 
                    flags={report.flags}
                    hasChanges={hasChanges}
                    onReevaluate={() => onReevaluate(formData)}
                    isReevaluating={isReevaluating}
                    onIssueClick={handleIssueClick}
                />
            </div>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;