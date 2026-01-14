import { ScoringRule, ProviderType, RuleCondition } from '../types';

interface DbRuleResponse {
  id: string;
  ruleId: string;
  name: string;
  level: 'CRÍTICO' | 'IMPORTANTE' | 'MODERADO' | 'DISCRETO';
  points: number;
  description: string;
  providerTarget: string;
  category: string;
  isCustom: boolean;
  isActive: boolean;
  conditions: RuleCondition[] | null;
  logicOperator: string | null;
  affectedFields: string[];
  hasValidator: boolean;
  validatorKey: string | null;
}

interface ApiResponse {
  success: boolean;
  data: DbRuleResponse[];
  count: number;
  error?: string;
}

const VALIDATORS_REGISTRY: Record<string, (data: any) => boolean> = {
  'gnp_origen_mutuamente_excluyente': (data) => {
    const tipoPad = data.padecimiento_actual?.tipo_padecimiento;
    if (!tipoPad || !Array.isArray(tipoPad)) return false;
    const valores = tipoPad.map((v: string) => v.toLowerCase());
    const tieneCongenito = valores.includes('congénito') || valores.includes('congenito');
    const tieneAdquirido = valores.includes('adquirido');
    return tieneCongenito && tieneAdquirido;
  },
  'gnp_evolucion_mutuamente_excluyente': (data) => {
    const tipoPad = data.padecimiento_actual?.tipo_padecimiento;
    if (!tipoPad || !Array.isArray(tipoPad)) return false;
    const valores = tipoPad.map((v: string) => v.toLowerCase());
    const tieneAgudo = valores.includes('agudo');
    const tieneCronico = valores.includes('crónico') || valores.includes('cronico');
    return tieneAgudo && tieneCronico;
  },
  'gnp_sexo_seleccion_unica': (data) => {
    const sexo = data.identificacion?.sexo;
    if (!sexo) return false;
    if (Array.isArray(sexo)) {
      // Filtrar valores vacíos o solo espacios
      const valoresValidos = sexo.filter((v: string) => v && v.trim().length > 0);
      return valoresValidos.length > 1;
    }
    if (typeof sexo === 'string' && sexo.includes(',')) {
      // Verificar que realmente hay 2 valores separados por coma
      const partes = sexo.split(',').filter(p => p.trim().length > 0);
      return partes.length > 1;
    }
    return false;
  },
  'gnp_causa_atencion_seleccion_unica': (data) => {
    const causa = data.identificacion?.causa_atencion;
    if (!causa) return false;
    if (Array.isArray(causa)) return causa.length > 1;
    if (typeof causa === 'string' && causa.includes(',')) return true;
    return false;
  },
  'gnp_complicaciones_seleccion_unica': (data) => {
    const complicaciones = data.complicaciones?.presento_complicaciones;
    if (!complicaciones) return false;
    if (Array.isArray(complicaciones)) return complicaciones.length > 1;
    return false;
  },
  'gnp_tipo_estancia_seleccion_unica': (data) => {
    const tipoEstancia = data.hospital?.tipo_estancia;
    if (!tipoEstancia) return false;
    if (Array.isArray(tipoEstancia)) return tipoEstancia.length > 1;
    if (typeof tipoEstancia === 'string' && tipoEstancia.includes(',')) return true;
    return false;
  },
  'gnp_medico_tratante_participacion_seleccion_unica': (data) => {
    const tipoParticipacion = data.medico_tratante?.tipo_participacion;
    if (!tipoParticipacion) return false;
    if (Array.isArray(tipoParticipacion)) return tipoParticipacion.length > 1;
    if (typeof tipoParticipacion === 'string' && tipoParticipacion.includes(',')) return true;
    return false;
  },
  'gnp_otros_medicos_participacion_seleccion_unica': (data) => {
    const otrosMedicos = data.otros_medicos;
    if (!otrosMedicos || !Array.isArray(otrosMedicos)) return false;
    for (const medico of otrosMedicos) {
      const tp = medico?.tipo_participacion;
      if (tp) {
        if (Array.isArray(tp) && tp.length > 1) return true;
        if (typeof tp === 'string' && tp.includes(',')) return true;
      }
    }
    return false;
  },
};

function transformDbRuleToScoringRule(dbRule: DbRuleResponse): ScoringRule {
  const rule: ScoringRule = {
    id: dbRule.ruleId,
    name: dbRule.name,
    level: dbRule.level,
    points: dbRule.points,
    description: dbRule.description,
    providerTarget: dbRule.providerTarget as 'ALL' | 'GNP' | 'METLIFE',
    isCustom: dbRule.isCustom,
    conditions: dbRule.conditions || undefined,
    logicOperator: (dbRule.logicOperator as 'AND' | 'OR') || undefined,
    affectedFields: dbRule.affectedFields,
  };

  if (dbRule.hasValidator && dbRule.validatorKey && VALIDATORS_REGISTRY[dbRule.validatorKey]) {
    rule.validator = VALIDATORS_REGISTRY[dbRule.validatorKey];
  }

  return rule;
}

let cachedRules: Map<string, ScoringRule[]> = new Map();
let lastFetchTime: number = 0;
const CACHE_TTL = 5 * 60 * 1000;

function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const host = window.location.host;
    return `${protocol}//${host}`;
  }
  return process.env.API_BASE_URL || 'http://localhost:3001';
}

export async function fetchRulesFromDatabase(provider?: ProviderType): Promise<ScoringRule[]> {
  const cacheKey = provider || 'ALL';
  const now = Date.now();

  if (cachedRules.has(cacheKey) && (now - lastFetchTime) < CACHE_TTL) {
    return cachedRules.get(cacheKey)!;
  }

  try {
    const baseUrl = getApiBaseUrl();
    const url = provider && provider !== 'UNKNOWN'
      ? `${baseUrl}/api/rules/aseguradora/${provider}`
      : `${baseUrl}/api/rules`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const result: ApiResponse = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Invalid response format');
    }

    const rules = result.data.map(transformDbRuleToScoringRule);
    cachedRules.set(cacheKey, rules);
    lastFetchTime = now;

    return rules;
  } catch (error) {
    console.error('Error fetching rules from database:', error);
    throw error;
  }
}

export function clearRulesCache(): void {
  cachedRules.clear();
  lastFetchTime = 0;
}

export async function getRulesForProvider(provider: ProviderType): Promise<ScoringRule[]> {
  if (provider === 'UNKNOWN') {
    return fetchRulesFromDatabase();
  }
  return fetchRulesFromDatabase(provider);
}

export function getValidatorForRule(ruleId: string): ((data: any) => boolean) | undefined {
  return VALIDATORS_REGISTRY[ruleId];
}
