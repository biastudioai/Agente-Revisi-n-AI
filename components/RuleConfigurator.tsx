import React, { useState, useMemo } from 'react';
import { ScoringRule, ProviderType, ExtractedData } from '../types';
import { Settings, AlertTriangle, ShieldAlert, AlertCircle, Info, X, ChevronDown, Plus, Pencil, Trash2 } from 'lucide-react';
import RuleEditor from './RuleEditor';

interface RuleConfiguratorProps {
  isOpen: boolean;
  onClose: () => void;
  rules: ScoringRule[];
  onUpdateRules: (newRules: ScoringRule[]) => void;
  currentReport?: ExtractedData | null;
}

type TabType = 'generales' | 'especificas';

const RuleConfigurator: React.FC<RuleConfiguratorProps> = ({ isOpen, onClose, rules, onUpdateRules, currentReport }) => {
  const [activeTab, setActiveTab] = useState<TabType>('generales');
  const [selectedProvider, setSelectedProvider] = useState<ProviderType>('GNP');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ScoringRule | undefined>(undefined);

  const filteredRules = useMemo(() => {
    if (activeTab === 'generales') {
      return rules.filter(r => r.providerTarget === 'ALL');
    } else {
      return rules.filter(r => r.providerTarget === selectedProvider);
    }
  }, [rules, activeTab, selectedProvider]);

  if (!isOpen) return null;

  const handleLevelChange = (ruleId: string, newLevel: ScoringRule['level']) => {
    const updatedRules = rules.map(r => 
      r.id === ruleId ? { ...r, level: newLevel } : r
    );
    onUpdateRules(updatedRules);
  };

  const handlePointsChange = (ruleId: string, newPoints: string) => {
    const points = parseInt(newPoints) || 0;
    const updatedRules = rules.map(r => 
      r.id === ruleId ? { ...r, points: points } : r
    );
    onUpdateRules(updatedRules);
  };

  const handleDeleteRule = (ruleId: string) => {
    if (confirm('¿Estás seguro de eliminar esta regla personalizada?')) {
      const updatedRules = rules.filter(r => r.id !== ruleId);
      onUpdateRules(updatedRules);
    }
  };

  const handleSaveRule = (newRule: ScoringRule) => {
    if (editingRule) {
      const updatedRules = rules.map(r => r.id === editingRule.id ? newRule : r);
      onUpdateRules(updatedRules);
    } else {
      onUpdateRules([...rules, newRule]);
    }
    setIsEditorOpen(false);
    setEditingRule(undefined);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'CRÍTICO': return 'bg-red-100 text-red-700 border-red-200';
      case 'IMPORTANTE': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'MODERADO': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getLevelIcon = (level: string) => {
     switch (level) {
      case 'CRÍTICO': return <ShieldAlert className="w-4 h-4" />;
      case 'IMPORTANTE': return <AlertTriangle className="w-4 h-4" />;
      case 'MODERADO': return <AlertCircle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getProviderBadge = (target: ScoringRule['providerTarget']) => {
    switch (target) {
      case 'ALL':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-purple-700 border border-purple-200">GENERAL</span>;
      case 'GNP':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700 border border-blue-200">GNP</span>;
      case 'METLIFE':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-100 text-green-700 border border-green-200">METLIFE</span>;
      default:
        return null;
    }
  };

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <div className="flex items-center gap-2 mb-1">
                <div className="bg-brand-600 p-1.5 rounded-lg text-white">
                    <Settings className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Auditoría de Reglas</h2>
            </div>
            <p className="text-sm text-slate-500 pl-1">Personaliza la severidad y el peso de cada regla de validación.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex gap-1 bg-slate-200 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('generales')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    activeTab === 'generales'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Generales
                </button>
                <button
                  onClick={() => setActiveTab('especificas')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    activeTab === 'especificas'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Específicas
                </button>
              </div>

              {activeTab === 'especificas' && (
                <div className="relative">
                  <select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value as ProviderType)}
                    className="appearance-none pl-4 pr-10 py-2 text-sm font-medium bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-200 focus:border-brand-500 outline-none cursor-pointer"
                  >
                    <option value="GNP">GNP</option>
                    <option value="METLIFE">METLIFE</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              )}
            </div>

            {/* Botón Crear Nueva Regla - Alineado a la derecha */}
            <button
              onClick={() => {
                setEditingRule(undefined);
                setIsEditorOpen(true);
              }}
              className="py-2 px-4 border-2 border-dashed border-brand-200 rounded-xl text-brand-600 hover:border-brand-400 hover:bg-brand-50 transition-all flex items-center gap-2 font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              Crear Nueva Regla
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/50">
           <div className="grid grid-cols-12 gap-4 px-4 py-2 mb-4 font-bold text-xs uppercase text-slate-400 tracking-wider">
             <div className="col-span-4">Regla y Criterio</div>
             <div className="col-span-2">Nivel de Impacto</div>
             <div className="col-span-2 text-center">Peso (Puntos)</div>
             <div className="col-span-2 text-center">Categoría</div>
             <div className="col-span-2 text-center">Acciones</div>
           </div>

           {filteredRules.length === 0 ? (
             <div className="text-center py-12 text-slate-500">
               <p>No hay reglas para esta categoría.</p>
             </div>
           ) : (
             <div className="space-y-3">
               {filteredRules.map((rule) => (
                  <div key={rule.id} className="grid grid-cols-12 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm items-center hover:shadow-md transition-shadow">
                      
                      {/* Description */}
                      <div className="col-span-4">
                          <div className="flex items-start gap-2">
                            <div className="flex-1">
                              <h4 className="font-bold text-sm text-slate-800">{rule.name}</h4>
                              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{rule.description}</p>
                            </div>
                            {rule.isCustom && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-brand-100 text-brand-600 shrink-0">
                                CUSTOM
                              </span>
                            )}
                          </div>
                      </div>

                      {/* Level Selector */}
                      <div className="col-span-2">
                           <div className="relative">
                              <select 
                                  value={rule.level}
                                  onChange={(e) => handleLevelChange(rule.id, e.target.value as ScoringRule['level'])}
                                  className={`w-full appearance-none pl-7 pr-6 py-2 text-xs font-bold rounded-lg border focus:ring-2 focus:ring-brand-200 outline-none cursor-pointer transition-colors ${getLevelColor(rule.level)}`}
                              >
                                  <option value="CRÍTICO">CRÍTICO</option>
                                  <option value="IMPORTANTE">IMPORTANTE</option>
                                  <option value="MODERADO">MODERADO</option>
                                  <option value="DISCRETO">DISCRETO</option>
                              </select>
                              <div className={`absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none ${rule.level === 'CRÍTICO' ? 'text-red-700' : rule.level === 'IMPORTANTE' ? 'text-amber-700' : 'text-slate-700'}`}>
                                  {getLevelIcon(rule.level)}
                              </div>
                          </div>
                      </div>

                      {/* Points Input */}
                      <div className="col-span-2 flex justify-center">
                          <div className="relative w-16">
                               <input 
                                  type="number" 
                                  min="0" 
                                  max="100"
                                  value={rule.points}
                                  onChange={(e) => handlePointsChange(rule.id, e.target.value)}
                                  className="w-full text-center font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg py-2 text-xs focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none"
                              />
                          </div>
                      </div>

                       {/* Provider Badge */}
                       <div className="col-span-2 flex justify-center">
                          {getProviderBadge(rule.providerTarget)}
                       </div>
                       
                       {/* Actions */}
                       <div className="col-span-2 flex justify-center gap-1">
                          <button
                            onClick={() => {
                              setEditingRule(rule);
                              setIsEditorOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="Editar regla"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {rule.isCustom && (
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar regla"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                       </div>
                  </div>
               ))}
             </div>
           )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3">
             <button 
                onClick={onClose}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg shadow-lg shadow-brand-500/20 transition-all active:scale-95"
            >
                Aplicar Cambios y Cerrar
            </button>
        </div>

      </div>
    </div>
    
    {isEditorOpen && (
      <RuleEditor
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingRule(undefined);
        }}
        rule={editingRule}
        onSave={handleSaveRule}
        currentReport={currentReport}
      />
    )}
    </>
  );
};

export default RuleConfigurator;
