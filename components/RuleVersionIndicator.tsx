import React from 'react';
import { AlertTriangle, RefreshCw, Clock, CheckCircle, History } from 'lucide-react';

export interface RuleVersionInfo {
  hasChanges: boolean;
  originalVersionNumber: number | null;
  currentVersionNumber: number | null;
  changeCount: number;
  originalDate: Date | null;
}

interface RuleVersionIndicatorProps {
  versionInfo: RuleVersionInfo | null;
  isRecalculating: boolean;
  onRecalculateWithCurrentRules: () => void;
  onViewChanges?: () => void;
}

const RuleVersionIndicator: React.FC<RuleVersionIndicatorProps> = ({
  versionInfo,
  isRecalculating,
  onRecalculateWithCurrentRules,
  onViewChanges,
}) => {
  if (!versionInfo) return null;

  if (!versionInfo.hasChanges) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
        <CheckCircle className="w-4 h-4 text-emerald-600" />
        <span className="text-xs text-emerald-700 font-medium">
          Evaluado con reglas actuales (v{versionInfo.currentVersionNumber})
        </span>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg overflow-hidden">
      <div className="flex items-start gap-3 p-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-800">
            Las reglas han cambiado
          </p>
          <p className="text-xs text-amber-600 mt-1">
            Este formulario fue evaluado con la versión {versionInfo.originalVersionNumber} de las reglas.
            {versionInfo.changeCount > 0 && (
              <> Se han realizado <strong>{versionInfo.changeCount}</strong> cambios desde entonces.</>
            )}
          </p>
          {versionInfo.originalDate && (
            <div className="flex items-center gap-1 mt-2 text-xs text-amber-500">
              <Clock className="w-3 h-3" />
              <span>
                Evaluado el {new Date(versionInfo.originalDate).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex border-t border-amber-200 divide-x divide-amber-200">
        <button
          onClick={onRecalculateWithCurrentRules}
          disabled={isRecalculating}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
        >
          {isRecalculating ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Recalculando...
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              Recalcular con reglas actuales
            </>
          )}
        </button>
        
        {onViewChanges && (
          <button
            onClick={onViewChanges}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            Ver cambios
          </button>
        )}
      </div>
    </div>
  );
};

export default RuleVersionIndicator;
