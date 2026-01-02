import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Plus, Trash2, Save, CheckCircle2, XCircle, 
  AlertCircle, ChevronDown, Info
} from 'lucide-react';
import { 
  ScoringRule, RuleCondition, RuleOperator, LogicOperator, 
  ExtractedData, ProviderType, FieldMappings 
} from '../types';
import {
  AVAILABLE_FIELDS,
  OPERATOR_LABELS,
  OPERATOR_GROUPS,
  operatorNeedsValue,
  operatorNeedsCompareField,
  operatorNeedsAdditionalFields,
  getPreviewResult
} from '../services/rule-validator';
import { getPathsByProvider } from '../providers';

interface RuleEditorProps {
  isOpen: boolean;
  onClose: () => void;
  rule?: ScoringRule;
  onSave: (rule: ScoringRule) => void;
  currentReport?: ExtractedData | null;
}

const generateId = () => `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generateConditionId = () => `cond_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const RuleEditor: React.FC<RuleEditorProps> = ({ 
  isOpen, 
  onClose, 
  rule, 
  onSave, 
  currentReport 
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<ScoringRule['level']>('MODERADO');
  const [points, setPoints] = useState(10);
  const [providerTargets, setProviderTargets] = useState<string[]>(['ALL']);
  const [fieldMappings, setFieldMappings] = useState<FieldMappings>({});
  const [conditions, setConditions] = useState<RuleCondition[]>([]);
  const [logicOperator, setLogicOperator] = useState<LogicOperator>('AND');
  const [fieldSearch, setFieldSearch] = useState<Record<string, string>>({});
  const [pathSearch, setPathSearch] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Extraer paths disponibles por aseguradora (desde los geminiSchema reales)
  const pathsByProvider = useMemo(() => getPathsByProvider(), []);

  useEffect(() => {
    if (isOpen) {
      if (rule) {
        setName(rule.name);
        setDescription(rule.description);
        setLevel(rule.level);
        setPoints(rule.points);
        const targets = rule.providerTargets || (rule.providerTarget ? [rule.providerTarget] : ['ALL']);
        setProviderTargets(targets);
        setFieldMappings(rule.fieldMappings || {});
        setConditions(rule.conditions || []);
        setLogicOperator(rule.logicOperator || 'AND');
      } else {
        setName('');
        setDescription('');
        setLevel('MODERADO');
        setPoints(10);
        setProviderTargets(['ALL']);
        setFieldMappings({});
        setConditions([{
          id: generateConditionId(),
          field: '',
          operator: 'IS_EMPTY'
        }]);
        setLogicOperator('AND');
      }
      setFieldSearch({});
      setPathSearch({});
      setErrors({});
    }
  }, [isOpen, rule]);

  const preview = useMemo(() => {
    const partialRule: Partial<ScoringRule> = {
      conditions,
      logicOperator,
      fieldMappings: Object.keys(fieldMappings).length > 0 ? fieldMappings : undefined
    };
    return getPreviewResult(partialRule, currentReport || null);
  }, [conditions, logicOperator, currentReport, fieldMappings]);

  const addCondition = () => {
    setConditions([...conditions, {
      id: generateConditionId(),
      field: '',
      operator: 'IS_EMPTY'
    }]);
  };

  const removeCondition = (id: string) => {
    if (conditions.length > 1) {
      setConditions(conditions.filter(c => c.id !== id));
    }
  };

  const updateCondition = (id: string, updates: Partial<RuleCondition>) => {
    setConditions(conditions.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ));
  };

  const filteredFields = (searchTerm: string) => {
    if (!searchTerm) return AVAILABLE_FIELDS.slice(0, 15);
    return AVAILABLE_FIELDS.filter(f => 
      f.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 15);
  };

  const filteredPaths = (provider: string, searchTerm: string) => {
    const paths = pathsByProvider[provider as 'GNP' | 'METLIFE'] || [];
    if (!searchTerm) return paths;
    return paths.filter(p => 
      p.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }
    if (!description.trim()) {
      newErrors.description = 'La descripción es requerida';
    }
    if (conditions.length === 0) {
      newErrors.conditions = 'Agrega al menos una condición';
    }
    conditions.forEach((cond, idx) => {
      if (!cond.field) {
        newErrors[`cond_${idx}_field`] = 'Selecciona un campo';
      }
      if (operatorNeedsValue(cond.operator) && !cond.value && cond.value !== 0) {
        newErrors[`cond_${idx}_value`] = 'El valor es requerido';
      }
      if (operatorNeedsCompareField(cond.operator) && !cond.compareField) {
        newErrors[`cond_${idx}_compare`] = 'Selecciona un campo de comparación';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    
    const affectedFields: string[] = conditions
      .map(c => c.field)
      .filter((f): f is string => !!f)
      .concat(conditions.filter(c => c.compareField).map(c => c.compareField as string))
      .concat(conditions.flatMap(c => c.additionalFields || []));
    
    Object.values(fieldMappings).forEach((paths: string[]) => {
      paths.forEach((path: string) => {
        if (path && !affectedFields.includes(path)) {
          affectedFields.push(path);
        }
      });
    });
    
    const finalTargets = providerTargets.length === 0 ? ['ALL'] : providerTargets;
    const hasMultipleProviders = finalTargets.length > 1 && !finalTargets.includes('ALL');
    const singleTarget = finalTargets.length === 1 ? finalTargets[0] : undefined;
    
    const hasMappings = Object.keys(fieldMappings).some(k => 
      fieldMappings[k] && fieldMappings[k].length > 0 && fieldMappings[k][0]
    );
    
    const newRule: ScoringRule = {
      id: rule?.id || generateId(),
      name: name.trim(),
      description: description.trim(),
      level,
      points,
      providerTargets: finalTargets,
      providerTarget: singleTarget as 'ALL' | 'GNP' | 'METLIFE' | undefined,
      fieldMappings: (hasMultipleProviders && hasMappings) ? fieldMappings : undefined,
      conditions,
      logicOperator,
      affectedFields: [...new Set(affectedFields)],
      isCustom: true
    };
    
    onSave(newRule);
    onClose();
  };

  const getLevelColor = (lvl: string) => {
    switch (lvl) {
      case 'CRÍTICO': return 'bg-red-100 text-red-700 border-red-200';
      case 'IMPORTANTE': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'MODERADO': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {rule ? 'Editar Regla' : 'Nueva Regla de Validación'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {rule ? 'Modifica los criterios de esta regla' : 'Define una nueva regla para validar informes médicos'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Nombre de la Regla *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Diagnóstico faltante"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-200 outline-none ${
                  errors.name ? 'border-red-300 bg-red-50' : 'border-slate-200'
                }`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Descripción *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe qué valida esta regla y por qué es importante"
                rows={2}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-200 outline-none resize-none ${
                  errors.description ? 'border-red-300 bg-red-50' : 'border-slate-200'
                }`}
              />
              {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Nivel de Severidad
              </label>
              <div className="relative">
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as ScoringRule['level'])}
                  className={`w-full appearance-none px-3 py-2 pr-8 border rounded-lg text-sm font-medium cursor-pointer ${getLevelColor(level)}`}
                >
                  <option value="CRÍTICO">CRÍTICO</option>
                  <option value="IMPORTANTE">IMPORTANTE</option>
                  <option value="MODERADO">MODERADO</option>
                  <option value="DISCRETO">DISCRETO</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-60" />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Puntos a Deducir
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={points}
                onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-brand-200 outline-none"
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Aplica a Aseguradoras (selecciona múltiples)
              </label>
              <div className="flex flex-wrap gap-2">
                {(['ALL', 'GNP', 'METLIFE'] as const).map((target) => {
                  const isSelected = providerTargets.includes(target);
                  const handleToggle = () => {
                    if (target === 'ALL') {
                      setProviderTargets(['ALL']);
                      setFieldMappings({});
                    } else {
                      if (isSelected) {
                        const newTargets = providerTargets.filter(p => p !== target);
                        setProviderTargets(newTargets.length > 0 ? newTargets : ['ALL']);
                        const newMappings = { ...fieldMappings };
                        delete newMappings[target];
                        setFieldMappings(newMappings);
                      } else {
                        const newTargets = providerTargets.filter(p => p !== 'ALL');
                        setProviderTargets([...newTargets, target]);
                      }
                    }
                  };
                  
                  return (
                    <label
                      key={target}
                      className={`flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? target === 'ALL' 
                            ? 'bg-purple-100 text-purple-700 border-purple-300'
                            : target === 'GNP'
                            ? 'bg-blue-100 text-blue-700 border-blue-300'
                            : 'bg-green-100 text-green-700 border-green-300'
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={handleToggle}
                        className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-xs font-bold">
                        {target === 'ALL' ? 'TODAS' : target}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {providerTargets.length > 1 && !providerTargets.includes('ALL') && (
              <div className="col-span-2 border border-slate-200 rounded-xl p-4 bg-slate-50">
                <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4 text-brand-600" />
                  Paths por Aseguradora
                </h4>
                <p className="text-xs text-slate-500 mb-3">
                  Define dónde buscar el campo en cada aseguradora. Si el path es diferente por aseguradora, configúralo aquí.
                </p>
                
                <div className="space-y-3">
                  {providerTargets.map(provider => (
                    <div key={provider} className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
                        provider === 'GNP' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {provider}
                      </span>
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          id={`path_${provider}`}
                          value={pathSearch[provider] !== undefined ? pathSearch[provider] : (fieldMappings[provider]?.[0] || '')}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setPathSearch({ ...pathSearch, [provider]: newValue });
                            
                            // Si el valor coincide exactamente con un path válido, guardarlo
                            const paths = pathsByProvider[provider as 'GNP' | 'METLIFE'] || [];
                            if (paths.includes(newValue)) {
                              setFieldMappings({
                                ...fieldMappings,
                                [provider]: [newValue]
                              });
                            }
                          }}
                          onFocus={() => {
                            // Mostrar dropdown al hacer foco
                            if (pathSearch[provider] === undefined) {
                              setPathSearch({ ...pathSearch, [provider]: '' });
                            }
                          }}
                          onBlur={() => {
                            // Ocultar dropdown después de un delay (para permitir clicks)
                            setTimeout(() => {
                              const currentSearch = pathSearch[provider];
                              if (currentSearch !== undefined) {
                                // Limpiar el search state
                                const newPathSearch = { ...pathSearch };
                                delete newPathSearch[provider];
                                setPathSearch(newPathSearch);
                              }
                            }, 200);
                          }}
                          placeholder={`ej: signos_vitales.peso`}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-200 outline-none font-mono"
                        />
                        
                        {/* Dropdown de autocomplete */}
                        {pathSearch[provider] !== undefined && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto custom-scrollbar">
                            {filteredPaths(provider, pathSearch[provider] || '').length > 0 ? (
                              filteredPaths(provider, pathSearch[provider] || '').map(p => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => {
                                    setFieldMappings({
                                      ...fieldMappings,
                                      [provider]: [p]
                                    });
                                    // Limpiar el search state
                                    const newPathSearch = { ...pathSearch };
                                    delete newPathSearch[provider];
                                    setPathSearch(newPathSearch);
                                  }}
                                  className="w-full px-3 py-2 text-left text-xs hover:bg-brand-50 border-b border-slate-100 last:border-0 font-mono transition-colors"
                                >
                                  {p}
                                </button>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-xs text-slate-400 italic">
                                {pathSearch[provider] ? 'No se encontraron paths' : `Paths disponibles para ${provider}`}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Mostrar path seleccionado cuando no hay búsqueda activa */}
                        {fieldMappings[provider]?.[0] && pathSearch[provider] === undefined && (
                          <span className="text-[10px] text-slate-500 mt-0.5 block truncate font-mono">
                            ✓ {fieldMappings[provider][0]}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Condiciones</h3>
                <p className="text-xs text-slate-500">Define cuándo esta regla genera una deducción</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-slate-500">Combinar con:</span>
                  <button
                    type="button"
                    onClick={() => setLogicOperator('AND')}
                    className={`px-2 py-1 rounded font-bold transition-all ${
                      logicOperator === 'AND' 
                        ? 'bg-brand-100 text-brand-700' 
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    Y (AND)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogicOperator('OR')}
                    className={`px-2 py-1 rounded font-bold transition-all ${
                      logicOperator === 'OR' 
                        ? 'bg-brand-100 text-brand-700' 
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    O (OR)
                  </button>
                </div>
              </div>
            </div>
            
            {errors.conditions && (
              <p className="text-xs text-red-500 mb-2">{errors.conditions}</p>
            )}
            
            <div className="space-y-3">
              {conditions.map((cond, idx) => (
                <div key={cond.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0 mt-1">
                      {idx + 1}
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Campo</label>
                          <input
                            type="text"
                            value={fieldSearch[cond.id] ?? cond.field}
                            onChange={(e) => {
                              setFieldSearch({ ...fieldSearch, [cond.id]: e.target.value });
                              if (AVAILABLE_FIELDS.includes(e.target.value)) {
                                updateCondition(cond.id, { field: e.target.value });
                              }
                            }}
                            onBlur={() => {
                              setTimeout(() => {
                                setFieldSearch({ ...fieldSearch, [cond.id]: '' });
                              }, 200);
                            }}
                            placeholder="Buscar campo..."
                            className={`w-full px-2 py-1.5 border rounded text-xs focus:ring-2 focus:ring-brand-200 outline-none ${
                              errors[`cond_${idx}_field`] ? 'border-red-300 bg-red-50' : 'border-slate-200'
                            }`}
                          />
                          {(fieldSearch[cond.id] || (!cond.field && document.activeElement?.id === `field_${cond.id}`)) && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                              {filteredFields(fieldSearch[cond.id] || '').map(f => (
                                <button
                                  key={f}
                                  type="button"
                                  onClick={() => {
                                    updateCondition(cond.id, { field: f });
                                    setFieldSearch({ ...fieldSearch, [cond.id]: '' });
                                  }}
                                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50 border-b border-slate-100 last:border-0"
                                >
                                  {f}
                                </button>
                              ))}
                            </div>
                          )}
                          {cond.field && (
                            <span className="text-[10px] text-slate-400 mt-0.5 block truncate">{cond.field}</span>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Operador</label>
                          <select
                            value={cond.operator}
                            onChange={(e) => updateCondition(cond.id, { 
                              operator: e.target.value as RuleOperator,
                              value: undefined,
                              compareField: undefined,
                              additionalFields: undefined
                            })}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-brand-200 outline-none cursor-pointer"
                          >
                            {OPERATOR_GROUPS.map(group => (
                              <optgroup key={group.name} label={group.name}>
                                {group.operators.map(op => (
                                  <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      {operatorNeedsValue(cond.operator) && (
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Valor {cond.operator === 'REGEX' && '(expresión regular)'}
                          </label>
                          <input
                            type={['GREATER_THAN', 'LESS_THAN'].includes(cond.operator) ? 'number' : 'text'}
                            value={cond.value ?? ''}
                            onChange={(e) => updateCondition(cond.id, { 
                              value: ['GREATER_THAN', 'LESS_THAN'].includes(cond.operator) 
                                ? Number(e.target.value) 
                                : e.target.value 
                            })}
                            placeholder={cond.operator === 'REGEX' ? '^[A-Z]{3,4}\\d{6}.*$' : 'Ingresa el valor'}
                            className={`w-full px-2 py-1.5 border rounded text-xs focus:ring-2 focus:ring-brand-200 outline-none ${
                              errors[`cond_${idx}_value`] ? 'border-red-300 bg-red-50' : 'border-slate-200'
                            }`}
                          />
                        </div>
                      )}
                      
                      {operatorNeedsCompareField(cond.operator) && (
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Campo de Comparación
                          </label>
                          <select
                            value={cond.compareField || ''}
                            onChange={(e) => updateCondition(cond.id, { compareField: e.target.value })}
                            className={`w-full px-2 py-1.5 border rounded text-xs focus:ring-2 focus:ring-brand-200 outline-none cursor-pointer ${
                              errors[`cond_${idx}_compare`] ? 'border-red-300 bg-red-50' : 'border-slate-200'
                            }`}
                          >
                            <option value="">Selecciona un campo...</option>
                            {AVAILABLE_FIELDS.map(f => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      
                      {operatorNeedsAdditionalFields(cond.operator) && (
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Campos Adicionales (separados por coma)
                          </label>
                          <input
                            type="text"
                            value={(cond.additionalFields || []).join(', ')}
                            onChange={(e) => updateCondition(cond.id, { 
                              additionalFields: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                            })}
                            placeholder="campo1, campo2, campo3"
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-brand-200 outline-none"
                          />
                        </div>
                      )}
                    </div>
                    
                    {conditions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCondition(cond.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <button
              type="button"
              onClick={addCondition}
              className="mt-3 w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Agregar Condición
            </button>
          </div>

          <div className="border-t pt-5">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Preview en Tiempo Real
            </h3>
            <div className={`p-4 rounded-xl border ${
              !currentReport 
                ? 'bg-slate-50 border-slate-200' 
                : preview.passes 
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {!currentReport ? (
                  <AlertCircle className="w-5 h-5 text-slate-400" />
                ) : preview.passes ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span className={`font-bold text-sm ${
                  !currentReport ? 'text-slate-500' : preview.passes ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  {preview.message}
                </span>
              </div>
              {preview.details && preview.details.length > 0 && (
                <div className="mt-2 space-y-1">
                  {preview.details.map((detail, i) => (
                    <div key={i} className="text-xs text-slate-600 font-mono bg-white/50 px-2 py-1 rounded">
                      {detail}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2 text-slate-600 hover:bg-slate-100 font-medium rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg shadow-lg shadow-brand-500/20 transition-all active:scale-95 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {rule ? 'Guardar Cambios' : 'Crear Regla'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default RuleEditor;
