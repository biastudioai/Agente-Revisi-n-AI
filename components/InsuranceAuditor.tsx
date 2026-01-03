import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Building2, FileText, Database, GitBranch, Plus, 
  ChevronDown, ChevronRight, Copy, Check, Pencil, Save,
  AlertCircle, CheckCircle, Trash2, Search
} from 'lucide-react';
import { PROVIDER_REGISTRY, getPathsByProvider } from '../providers';
import { ASEGURADORAS_CONFIG } from '../config/aseguradora-configs';
import { ProviderConfig, ProviderType } from '../providers/types';
import { AseguradoraConfig } from '../types/standardized-schema';

interface MappingConfig {
  path: string;
  opcional?: boolean;
  parser?: (valor: any) => any;
  validador?: (valor: any) => boolean;
}

type MappingsRecord = Record<string, MappingConfig>;

interface InsuranceAuditorProps {
  isOpen: boolean;
  onClose: () => void;
  onProvidersUpdate?: () => void;
}

type TabType = 'prompt' | 'campos' | 'normalizados';

interface CustomProvider {
  id: string;
  config: Partial<ProviderConfig>;
  mappings: MappingsRecord;
  prompt: string;
}

const InsuranceAuditor: React.FC<InsuranceAuditorProps> = ({ isOpen, onClose, onProvidersUpdate }) => {
  const [activeTab, setActiveTab] = useState<TabType>('prompt');
  const [selectedProvider, setSelectedProvider] = useState<string>('GNP');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptContent, setPromptContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNormalizedField, setExpandedNormalizedField] = useState<string | null>(null);
  
  const [newProviderData, setNewProviderData] = useState({
    id: '',
    displayName: '',
    prompt: '',
  });

  const [customProviders, setCustomProviders] = useState<Record<string, CustomProvider>>(() => {
    try {
      const saved = localStorage.getItem('custom-providers');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const allProviders = useMemo(() => {
    const builtIn = Object.keys(PROVIDER_REGISTRY);
    const custom = Object.keys(customProviders);
    return [...builtIn, ...custom];
  }, [customProviders]);

  const currentProviderConfig = useMemo(() => {
    if (customProviders[selectedProvider]) {
      return customProviders[selectedProvider].config;
    }
    return PROVIDER_REGISTRY[selectedProvider as ProviderType];
  }, [selectedProvider, customProviders]);

  const currentMappings = useMemo((): MappingsRecord => {
    if (customProviders[selectedProvider]) {
      return customProviders[selectedProvider].mappings;
    }
    return (ASEGURADORAS_CONFIG[selectedProvider]?.mappings as MappingsRecord) || {};
  }, [selectedProvider, customProviders]);

  const pathsByProvider = useMemo(() => getPathsByProvider(), []);

  const normalizedFields = useMemo(() => {
    const allFields = new Set<string>();
    Object.values(ASEGURADORAS_CONFIG).forEach((config: AseguradoraConfig) => {
      Object.keys(config.mappings).forEach(field => allFields.add(field));
    });
    Object.values(customProviders).forEach((provider: CustomProvider) => {
      Object.keys(provider.mappings).forEach(field => allFields.add(field));
    });
    return Array.from(allFields).sort();
  }, [customProviders]);

  const getFieldMappingsByNormalized = (normalizedField: string) => {
    const mappings: Array<{ provider: string; path: string; optional: boolean }> = [];
    
    Object.entries(ASEGURADORAS_CONFIG).forEach(([providerId, config]: [string, AseguradoraConfig]) => {
      const mapping = config.mappings[normalizedField] as MappingConfig | undefined;
      if (mapping) {
        mappings.push({
          provider: providerId,
          path: mapping.path,
          optional: mapping.opcional || false
        });
      }
    });

    Object.entries(customProviders).forEach(([providerId, provider]: [string, CustomProvider]) => {
      const mapping = provider.mappings[normalizedField];
      if (mapping) {
        mappings.push({
          provider: providerId,
          path: mapping.path,
          optional: mapping.opcional || false
        });
      }
    });

    return mappings;
  };

  const calculateCompleteness = (providerId: string) => {
    const totalFields = normalizedFields.length;
    let mappedFields = 0;

    if (ASEGURADORAS_CONFIG[providerId]) {
      mappedFields = Object.keys(ASEGURADORAS_CONFIG[providerId].mappings).length;
    } else if (customProviders[providerId]) {
      mappedFields = Object.keys(customProviders[providerId].mappings).length;
    }

    return totalFields > 0 ? Math.round((mappedFields / totalFields) * 100) : 0;
  };

  useEffect(() => {
    if (currentProviderConfig && 'extractionInstructions' in currentProviderConfig) {
      setPromptContent(currentProviderConfig.extractionInstructions || '');
    } else if (customProviders[selectedProvider]) {
      setPromptContent(customProviders[selectedProvider].prompt);
    }
  }, [selectedProvider, currentProviderConfig, customProviders]);

  useEffect(() => {
    try {
      localStorage.setItem('custom-providers', JSON.stringify(customProviders));
    } catch (e) {
      console.error('Error saving custom providers:', e);
    }
  }, [customProviders]);

  const handleCopyJson = () => {
    const jsonContent = JSON.stringify(currentMappings, null, 2);
    navigator.clipboard.writeText(jsonContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSavePrompt = () => {
    if (customProviders[selectedProvider]) {
      setCustomProviders(prev => ({
        ...prev,
        [selectedProvider]: {
          ...prev[selectedProvider],
          prompt: promptContent
        }
      }));
    }
    setEditingPrompt(false);
  };

  const handleAddProvider = () => {
    if (!newProviderData.id || !newProviderData.displayName) {
      alert('Por favor completa el ID y nombre de la aseguradora');
      return;
    }

    const newProvider: CustomProvider = {
      id: newProviderData.id.toUpperCase(),
      config: {
        id: newProviderData.id.toUpperCase() as ProviderType,
        name: newProviderData.id.toLowerCase(),
        displayName: newProviderData.displayName,
        theme: {
          primary: 'bg-purple-500',
          secondary: 'text-purple-600',
          border: 'border-purple-200',
          light: 'bg-purple-50',
          accent: 'purple'
        },
        identificationRules: [],
        extractionInstructions: newProviderData.prompt,
        requiredFields: []
      },
      mappings: {},
      prompt: newProviderData.prompt
    };

    setCustomProviders(prev => ({
      ...prev,
      [newProvider.id]: newProvider
    }));

    setSelectedProvider(newProvider.id);
    setIsAddingNew(false);
    setNewProviderData({ id: '', displayName: '', prompt: '' });
    
    if (onProvidersUpdate) {
      onProvidersUpdate();
    }
  };

  const handleDeleteProvider = (providerId: string) => {
    if (!customProviders[providerId]) {
      alert('No puedes eliminar aseguradoras del sistema');
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar la aseguradora "${providerId}"?`)) {
      return;
    }

    setCustomProviders(prev => {
      const updated = { ...prev };
      delete updated[providerId];
      return updated;
    });

    setSelectedProvider('GNP');
  };

  const isCustomProvider = (providerId: string) => !!customProviders[providerId];

  const filteredNormalizedFields = useMemo(() => {
    if (!searchTerm) return normalizedFields;
    return normalizedFields.filter(field => 
      field.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [normalizedFields, searchTerm]);

  if (!isOpen) return null;

  const getProviderColor = (providerId: string) => {
    switch (providerId) {
      case 'GNP': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'METLIFE': return 'bg-green-100 text-green-700 border-green-200';
      case 'NYLIFE': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-purple-100 text-purple-700 border-purple-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex overflow-hidden border border-slate-200">
        
        {/* Sidebar - Lista de Aseguradoras */}
        <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-brand-600 p-1.5 rounded-lg text-white">
                <Building2 className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Aseguradoras</h2>
            </div>
            <button
              onClick={() => setIsAddingNew(true)}
              className="w-full py-2 px-3 border-2 border-dashed border-brand-200 rounded-lg text-brand-600 hover:border-brand-400 hover:bg-brand-50 transition-all flex items-center justify-center gap-2 font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              Nueva Aseguradora
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            {allProviders.map((providerId) => {
              const completeness = calculateCompleteness(providerId);
              const displayName = PROVIDER_REGISTRY[providerId as ProviderType]?.displayName || 
                                  customProviders[providerId]?.config.displayName || 
                                  providerId;
              
              return (
                <button
                  key={providerId}
                  onClick={() => setSelectedProvider(providerId)}
                  className={`w-full text-left p-3 rounded-lg mb-1 transition-all ${
                    selectedProvider === providerId
                      ? 'bg-white shadow-sm border border-brand-200'
                      : 'hover:bg-white/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-slate-800">{displayName}</span>
                    {isCustomProvider(providerId) && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-purple-100 text-purple-600">
                        CUSTOM
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span>Completitud</span>
                      <span className="font-medium">{completeness}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          completeness >= 80 ? 'bg-green-500' :
                          completeness >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${completeness}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-slate-800">
                  {PROVIDER_REGISTRY[selectedProvider as ProviderType]?.displayName || 
                   customProviders[selectedProvider]?.config.displayName || 
                   selectedProvider}
                </h3>
                {isCustomProvider(selectedProvider) && (
                  <button
                    onClick={() => handleDeleteProvider(selectedProvider)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar aseguradora"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Gestiona la configuración de extracción y mapeo de campos
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="px-4 pt-4 bg-slate-50 border-b border-slate-200">
            <div className="flex gap-1 bg-slate-200 p-1 rounded-lg w-fit">
              <button
                onClick={() => setActiveTab('prompt')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                  activeTab === 'prompt'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                Prompt
              </button>
              <button
                onClick={() => setActiveTab('campos')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                  activeTab === 'campos'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <Database className="w-4 h-4" />
                Campos
              </button>
              <button
                onClick={() => setActiveTab('normalizados')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                  activeTab === 'normalizados'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <GitBranch className="w-4 h-4" />
                Normalizados
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/50">
            
            {/* Tab: Prompt */}
            {activeTab === 'prompt' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800">Prompt de Extracción</h4>
                    <p className="text-sm text-slate-500">Instrucciones para Gemini/OCR para extraer información</p>
                  </div>
                  {isCustomProvider(selectedProvider) && (
                    <button
                      onClick={() => editingPrompt ? handleSavePrompt() : setEditingPrompt(true)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
                        editingPrompt
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-brand-600 text-white hover:bg-brand-700'
                      }`}
                    >
                      {editingPrompt ? (
                        <>
                          <Save className="w-4 h-4" />
                          Guardar
                        </>
                      ) : (
                        <>
                          <Pencil className="w-4 h-4" />
                          Editar
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  {editingPrompt && isCustomProvider(selectedProvider) ? (
                    <textarea
                      value={promptContent}
                      onChange={(e) => setPromptContent(e.target.value)}
                      className="w-full h-[500px] p-4 font-mono text-sm text-slate-700 focus:outline-none resize-none"
                      placeholder="Escribe aquí las instrucciones de extracción para esta aseguradora..."
                    />
                  ) : (
                    <pre className="p-4 font-mono text-xs text-slate-700 whitespace-pre-wrap overflow-auto max-h-[500px]">
                      {promptContent || 'No hay prompt configurado para esta aseguradora.'}
                    </pre>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Campos */}
            {activeTab === 'campos' && (
              <div className="space-y-6">
                {/* Campos Mapeados */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-slate-800">Campos Mapeados</h4>
                      <p className="text-sm text-slate-500">
                        {Object.keys(currentMappings).length} campos configurados
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-xs uppercase text-slate-500 tracking-wider">
                      <div className="col-span-4">Campo Normalizado</div>
                      <div className="col-span-5">Path en JSON</div>
                      <div className="col-span-2 text-center">Estado</div>
                      <div className="col-span-1 text-center">Opcional</div>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                      {Object.entries(currentMappings).map(([field, mapping]: [string, MappingConfig]) => {
                        const pathExists = pathsByProvider[selectedProvider]?.includes(mapping.path);
                        
                        return (
                          <div key={field} className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-slate-50 transition-colors">
                            <div className="col-span-4">
                              <span className="font-mono text-sm text-slate-700">{field}</span>
                            </div>
                            <div className="col-span-5">
                              <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                {mapping.path}
                              </span>
                            </div>
                            <div className="col-span-2 flex justify-center">
                              {pathExists ? (
                                <span className="flex items-center gap-1 text-green-600 text-xs">
                                  <CheckCircle className="w-4 h-4" />
                                  Válido
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-amber-600 text-xs">
                                  <AlertCircle className="w-4 h-4" />
                                  Revisar
                                </span>
                              )}
                            </div>
                            <div className="col-span-1 text-center">
                              <span className={`text-xs font-medium ${mapping.opcional ? 'text-slate-400' : 'text-slate-700'}`}>
                                {mapping.opcional ? 'Sí' : 'No'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* JSON de Mapeo */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-slate-800">JSON de Mapeo</h4>
                      <p className="text-sm text-slate-500">Configuración completa en formato JSON</p>
                    </div>
                    <button
                      onClick={handleCopyJson}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium text-sm flex items-center gap-2 transition-all text-slate-700"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-green-600" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copiar JSON
                        </>
                      )}
                    </button>
                  </div>

                  <div className="bg-slate-900 rounded-xl overflow-hidden">
                    <pre className="p-4 font-mono text-xs text-emerald-400 whitespace-pre-wrap overflow-auto max-h-[300px]">
                      {JSON.stringify(currentMappings, (key, value) => {
                        if (typeof value === 'function') return '[Function]';
                        return value;
                      }, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Normalizados */}
            {activeTab === 'normalizados' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800">Campos Normalizados</h4>
                    <p className="text-sm text-slate-500">
                      {normalizedFields.length} campos estándar del sistema
                    </p>
                  </div>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar campo..."
                      className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                    {filteredNormalizedFields.map((field) => {
                      const mappings = getFieldMappingsByNormalized(field);
                      const isExpanded = expandedNormalizedField === field;
                      
                      return (
                        <div key={field}>
                          <button
                            onClick={() => setExpandedNormalizedField(isExpanded ? null : field)}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                              )}
                              <span className="font-mono text-sm text-slate-700">{field}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {mappings.map(m => (
                                <span 
                                  key={m.provider} 
                                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${getProviderColor(m.provider)}`}
                                >
                                  {m.provider}
                                </span>
                              ))}
                              {mappings.length === 0 && (
                                <span className="text-xs text-slate-400">Sin mapear</span>
                              )}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="px-4 pb-4 pt-2 bg-slate-50">
                              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                {mappings.length > 0 ? (
                                  <div className="divide-y divide-slate-100">
                                    {mappings.map((mapping) => (
                                      <div 
                                        key={mapping.provider}
                                        className="flex items-center gap-4 px-4 py-3"
                                      >
                                        <div className="w-24">
                                          <span className={`px-2 py-1 text-xs font-bold rounded border ${getProviderColor(mapping.provider)}`}>
                                            {mapping.provider}
                                          </span>
                                        </div>
                                        <div className="flex-1">
                                          <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                            {mapping.path}
                                          </span>
                                        </div>
                                        <div>
                                          {mapping.optional ? (
                                            <span className="text-xs text-slate-400">Opcional</span>
                                          ) : (
                                            <span className="text-xs text-green-600 font-medium">Requerido</span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="p-4 text-center text-slate-500 text-sm">
                                    Este campo no está mapeado en ninguna aseguradora
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg shadow-lg shadow-brand-500/20 transition-all active:scale-95"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Nueva Aseguradora */}
      {isAddingNew && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <div className="bg-brand-600 p-1.5 rounded-lg text-white">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Nueva Aseguradora</h3>
              </div>
              <p className="text-sm text-slate-500">Configura una nueva aseguradora para el sistema</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ID de la Aseguradora <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newProviderData.id}
                  onChange={(e) => setNewProviderData(prev => ({ ...prev, id: e.target.value.toUpperCase() }))}
                  placeholder="Ej: SEGUROS_XYZ"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500"
                />
                <p className="text-xs text-slate-500 mt-1">Identificador único en mayúsculas sin espacios</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre para Mostrar <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newProviderData.displayName}
                  onChange={(e) => setNewProviderData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Ej: Seguros XYZ México"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Prompt de Extracción Inicial
                </label>
                <textarea
                  value={newProviderData.prompt}
                  onChange={(e) => setNewProviderData(prev => ({ ...prev, prompt: e.target.value }))}
                  placeholder="Instrucciones para extraer información de los documentos de esta aseguradora..."
                  rows={5}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 resize-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsAddingNew(false);
                  setNewProviderData({ id: '', displayName: '', prompt: '' });
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddProvider}
                className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg shadow-lg shadow-brand-500/20 transition-all"
              >
                Crear Aseguradora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InsuranceAuditor;
