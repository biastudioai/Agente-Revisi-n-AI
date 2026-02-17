import React, { useState } from 'react';
import { Building2, CheckCircle2, AlertCircle, HelpCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { PROVIDER_REGISTRY } from '../providers';

export type ProviderOption = 'METLIFE' | 'GNP' | 'NYLIFE' | 'AXA' | 'AXA_2018' | 'UNKNOWN';

interface ProviderSelectorProps {
  selectedProvider: ProviderOption;
  onProviderChange: (provider: ProviderOption) => void;
  detectedProvider?: ProviderOption;
  confidence?: 'high' | 'medium' | 'low';
  disabled?: boolean;
}

const PROVIDER_COLORS: Record<string, string> = {
  METLIFE: 'bg-emerald-500',
  GNP: 'bg-orange-500',
  NYLIFE: 'bg-teal-500',
  AXA: 'bg-red-500',
  AXA_2018: 'bg-red-400'
};

const MAIN_PROVIDER_IDS = ['METLIFE', 'GNP', 'NYLIFE', 'AXA'];
const LEGACY_PROVIDER_IDS = ['AXA_2018'];

const MAIN_PROVIDERS = MAIN_PROVIDER_IDS
  .filter(id => PROVIDER_REGISTRY[id])
  .map(id => ({
    id: id as ProviderOption,
    name: PROVIDER_REGISTRY[id].displayName,
    color: PROVIDER_COLORS[id] || 'bg-blue-500'
  }));

const LEGACY_PROVIDERS = LEGACY_PROVIDER_IDS
  .filter(id => PROVIDER_REGISTRY[id])
  .map(id => ({
    id: id as ProviderOption,
    name: PROVIDER_REGISTRY[id].displayName,
    color: PROVIDER_COLORS[id] || 'bg-blue-500'
  }));

const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  selectedProvider,
  onProviderChange,
  detectedProvider,
  confidence,
  disabled = false
}) => {
  const [showLegacy, setShowLegacy] = useState(false);

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
      return `Detectado: ${PROVIDER_REGISTRY[detectedProvider]?.displayName || detectedProvider} (alta confianza)`;
    }
    return `Detectado: ${PROVIDER_REGISTRY[detectedProvider]?.displayName || detectedProvider} (confirma si es correcto)`;
  };

  const isLegacySelected = LEGACY_PROVIDER_IDS.includes(selectedProvider);

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
          {MAIN_PROVIDERS.map((provider) => (
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

        {LEGACY_PROVIDERS.length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setShowLegacy(!showLegacy)}
              disabled={disabled}
              className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs transition-all ${
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100'
              } ${isLegacySelected ? 'bg-slate-100 text-slate-700 font-medium' : 'text-slate-500'}`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Acceder a versiones anteriores</span>
              {showLegacy ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showLegacy && (
              <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
                {LEGACY_PROVIDERS.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => !disabled && onProviderChange(provider.id)}
                    disabled={disabled}
                    className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-xs transition-all ${
                      selectedProvider === provider.id
                        ? `${provider.color} text-white shadow-md`
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {provider.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProviderSelector;
