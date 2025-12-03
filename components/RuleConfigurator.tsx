
import React from 'react';
import { ScoringRule } from '../types';
import { Settings, AlertTriangle, ShieldAlert, AlertCircle, Info, X } from 'lucide-react';

interface RuleConfiguratorProps {
  isOpen: boolean;
  onClose: () => void;
  rules: ScoringRule[];
  onUpdateRules: (newRules: ScoringRule[]) => void;
}

const RuleConfigurator: React.FC<RuleConfiguratorProps> = ({ isOpen, onClose, rules, onUpdateRules }) => {
  if (!isOpen) return null;

  const handleLevelChange = (index: number, newLevel: ScoringRule['level']) => {
    const updatedRules = [...rules];
    updatedRules[index] = { ...updatedRules[index], level: newLevel };
    onUpdateRules(updatedRules);
  };

  const handlePointsChange = (index: number, newPoints: string) => {
    const points = parseInt(newPoints) || 0;
    const updatedRules = [...rules];
    updatedRules[index] = { ...updatedRules[index], points: points };
    onUpdateRules(updatedRules);
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

  return (
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/50">
           <div className="grid grid-cols-12 gap-4 mb-4 px-4 py-2 font-bold text-xs uppercase text-slate-400 tracking-wider">
               <div className="col-span-5">Regla y Criterio</div>
               <div className="col-span-3">Nivel de Impacto</div>
               <div className="col-span-2 text-center">Peso (Puntos)</div>
               <div className="col-span-2 text-center">ID Sistema</div>
           </div>

           <div className="space-y-3">
             {rules.map((rule, index) => (
                <div key={rule.id} className="grid grid-cols-12 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm items-center hover:shadow-md transition-shadow">
                    
                    {/* Description */}
                    <div className="col-span-5">
                        <h4 className="font-bold text-sm text-slate-800">{rule.name}</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{rule.description}</p>
                    </div>

                    {/* Level Selector */}
                    <div className="col-span-3">
                         <div className="relative">
                            <select 
                                value={rule.level}
                                onChange={(e) => handleLevelChange(index, e.target.value as ScoringRule['level'])}
                                className={`w-full appearance-none pl-9 pr-8 py-2 text-xs font-bold rounded-lg border focus:ring-2 focus:ring-brand-200 outline-none cursor-pointer transition-colors ${getLevelColor(rule.level)}`}
                            >
                                <option value="CRÍTICO">CRÍTICO</option>
                                <option value="IMPORTANTE">IMPORTANTE</option>
                                <option value="MODERADO">MODERADO</option>
                                <option value="DISCRETO">DISCRETO / NOTA</option>
                            </select>
                            <div className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${rule.level === 'CRÍTICO' ? 'text-red-700' : rule.level === 'IMPORTANTE' ? 'text-amber-700' : 'text-slate-700'}`}>
                                {getLevelIcon(rule.level)}
                            </div>
                        </div>
                    </div>

                    {/* Points Input */}
                    <div className="col-span-2 flex justify-center">
                        <div className="relative w-20">
                             <input 
                                type="number" 
                                min="0" 
                                max="100"
                                value={rule.points}
                                onChange={(e) => handlePointsChange(index, e.target.value)}
                                className="w-full text-center font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none"
                            />
                            <span className="absolute right-[-1.5rem] top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">pts</span>
                        </div>
                    </div>

                     {/* ID */}
                     <div className="col-span-2 text-center">
                        <code className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded border border-slate-200">
                            {rule.id}
                        </code>
                     </div>
                </div>
             ))}
           </div>
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
  );
};

export default RuleConfigurator;
