import React from 'react';
import { Building2, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { PROVIDER_REGISTRY } from '../providers';

export type ProviderOption = 'METLIFE' | 'GNP' | 'UNKNOWN';

interface ProviderSelectorProps {
  selectedProvider: ProviderOption;
  onProviderChange: (provider: ProviderOption) => void;
  detectedProvider?: ProviderOption;
  confidence?: 'high' | 'medium' | 'low';
  disabled?: boolean;
}

const PROVIDER_COLORS: Record<string, string> = {
  METLIFE: 'bg-emerald-500',
  GNP: 'bg-orange-500'
};

const PROVIDERS = Object.entries(PROVIDER_REGISTRY).map(([id, config]) => ({
  id: id as ProviderOption,
  name: config.displayName,
  color: PROVIDER_COLORS[id] || 'bg-blue-500'
}));

const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  selectedProvider,
  onProviderChange,
  detectedProvider,
  confidence,
  disabled = false
}) => {
  const getConfidenceIcon = () => {
    if (!detectedProvider || detectedProvider === 'UNKNOWN') {
      return <HelpCircle className="w-4 h-4 text-amber-500" />;
    }
    if (confidence === 'high') {
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
    return <AlertCircle className="w-4 h-4 text-amber-500" />;
  };

  const getConfidenceText = () => {
    if (!detectedProvider || detectedProvider === 'UNKNOWN') {
      return 'No se pudo detectar automáticamente. Por favor selecciona la aseguradora.';
    }
    if (confidence === 'high') {
      return `Detectado: ${detectedProvider} (alta confianza)`;
    }
    return `Detectado: ${detectedProvider} (confirma si es correcto)`;
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="w-5 h-5 text-slate-600" />
          <span className="font-medium text-slate-700">Aseguradora</span>
        </div>

        {detectedProvider !== undefined && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-slate-50 rounded-lg text-sm">
            {getConfidenceIcon()}
            <span className="text-slate-600">{getConfidenceText()}</span>
          </div>
        )}

        <div className="flex gap-2">
          {PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              onClick={() => !disabled && onProviderChange(provider.id)}
              disabled={disabled}
              className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all ${
                selectedProvider === provider.id
                  ? `${provider.color} text-white shadow-md`
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {provider.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProviderSelector;
