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

function normalizeString(str: string | undefined | null): string {
  if (!str) return '';
  return str.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

function extractWords(str: string | undefined | null): string[] {
  const normalized = normalizeString(str);
  return normalized.split(/\s+/).filter(w => w.length > 0);
}

function wordsMatch(words1: string[], words2: string[]): boolean {
  if (words1.length === 0 || words2.length === 0) return false;
  let matchCount = 0;
  for (const word of words1) {
    if (words2.some(w2 => w2 === word || w2.includes(word) || word.includes(w2))) {
      matchCount++;
    }
  }
  return matchCount >= 2;
}

const VALIDATORS_REGISTRY: Record<string, (data: any) => boolean> = {
  'gen_medico_firma_coincide_validator': (data) => {
    const nombreFirma = data.firma?.nombre_firma;
    const nombreMedico = data.medico_tratante?.nombres;
    const apellidoPaterno = data.medico_tratante?.primer_apellido;
    const apellidoMaterno = data.medico_tratante?.segundo_apellido;
    
    if (!nombreFirma) return false;
    if (!nombreMedico && !apellidoPaterno) return false;
    
    const palabrasFirma = extractWords(nombreFirma).filter(p => p.length >= 2);
    const palabrasNombre = extractWords(nombreMedico).filter(p => p.length >= 2);
    const palabrasApellidoP = extractWords(apellidoPaterno).filter(p => p.length >= 2);
    const palabrasApellidoM = extractWords(apellidoMaterno).filter(p => p.length >= 2);
    const todasPalabrasApellidos = [...palabrasApellidoP, ...palabrasApellidoM];
    
    if (palabrasFirma.length === 0) return false;
    if (palabrasNombre.length === 0 && todasPalabrasApellidos.length === 0) return false;
    
    const matchPalabra = (p1: string, p2: string) => {
      if (p1.length < 3 || p2.length < 3) return p1 === p2;
      return p1 === p2 || (p1.length >= 4 && p2.includes(p1)) || (p2.length >= 4 && p1.includes(p2));
    };
    
    let nombreMatchIndex = -1;
    let apellidoMatchIndex = -1;
    
    for (let i = 0; i < palabrasFirma.length; i++) {
      const pf = palabrasFirma[i];
      if (nombreMatchIndex === -1 && palabrasNombre.some(pn => matchPalabra(pn, pf))) {
        nombreMatchIndex = i;
      }
      if (apellidoMatchIndex === -1 && todasPalabrasApellidos.some(pa => matchPalabra(pa, pf))) {
        apellidoMatchIndex = i;
      }
    }
    
    const tieneCoincidenciaNombre = palabrasNombre.length === 0 || nombreMatchIndex !== -1;
    const tieneCoincidenciaApellido = todasPalabrasApellidos.length === 0 || apellidoMatchIndex !== -1;
    
    if (palabrasNombre.length > 0 && todasPalabrasApellidos.length > 0) {
      const coincidenciaDistinta = nombreMatchIndex !== -1 && apellidoMatchIndex !== -1 && 
        (nombreMatchIndex !== apellidoMatchIndex || palabrasFirma.length === 1);
      return !coincidenciaDistinta;
    }
    
    return !(tieneCoincidenciaNombre || tieneCoincidenciaApellido);
  },
  
  'gen_otros_medicos_especialidad_validator': (data) => {
    const otrosMedicos = data.otros_medicos;
    if (!otrosMedicos || !Array.isArray(otrosMedicos)) return false;
    
    for (const medico of otrosMedicos) {
      const nombre = medico?.nombres || medico?.nombre;
      const especialidad = medico?.especialidad;
      if (nombre && nombre.trim().length > 0 && (!especialidad || especialidad.trim().length === 0)) {
        return true;
      }
    }
    return false;
  },
  
  'gen_otros_medicos_cedula_validator': (data) => {
    const otrosMedicos = data.otros_medicos;
    if (!otrosMedicos || !Array.isArray(otrosMedicos)) return false;
    
    for (const medico of otrosMedicos) {
      const nombre = medico?.nombres || medico?.nombre;
      const cedula = medico?.cedula_profesional;
      if (nombre && nombre.trim().length > 0 && (!cedula || cedula.trim().length === 0)) {
        return true;
      }
    }
    return false;
  },
  
  'gnp_hospital_tramite_validator': (data) => {
    const tramite = data.tramite;
    if (!tramite) return false;
    
    const requiereHospital = tramite.reembolso === true || 
                             tramite.reembolso === 'true' ||
                             tramite.programacion_cirugia === true ||
                             tramite.programacion_cirugia === 'true' ||
                             tramite.reporte_hospitalario === true ||
                             tramite.reporte_hospitalario === 'true';
    
    if (!requiereHospital) return false;
    
    const hospital = data.hospital;
    if (!hospital) return true;
    
    const nombreHospital = hospital.nombre_hospital || hospital.nombre;
    const ciudad = hospital.ciudad;
    const tipoEstancia = hospital.tipo_estancia;
    const fechaIngreso = hospital.fecha_ingreso;
    
    if (!nombreHospital || (typeof nombreHospital === 'string' && nombreHospital.trim().length === 0)) return true;
    if (!ciudad || (typeof ciudad === 'string' && ciudad.trim().length === 0)) return true;
    if (!tipoEstancia || (Array.isArray(tipoEstancia) ? tipoEstancia.length === 0 : (typeof tipoEstancia === 'string' && tipoEstancia.trim().length === 0))) return true;
    if (!fechaIngreso || (typeof fechaIngreso === 'string' && fechaIngreso.trim().length === 0)) return true;
    
    return false;
  },
  
  'gnp_otros_medicos_cedula_especialidad_validator': (data) => {
    const otrosMedicos = data.otros_medicos;
    if (!otrosMedicos || !Array.isArray(otrosMedicos)) return false;
    
    for (const medico of otrosMedicos) {
      const nombre = medico?.nombres || medico?.nombre;
      const cedulaEsp = medico?.cedula_especialidad;
      if (nombre && nombre.trim().length > 0 && (!cedulaEsp || cedulaEsp.trim().length === 0)) {
        return true;
      }
    }
    return false;
  },
  
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
    providerTarget: dbRule.providerTarget,
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

interface RuleUpdatePayload {
  name?: string;
  level?: string;
  points?: number;
  description?: string;
  providerTarget?: string;
  category?: string;
  isCustom?: boolean;
  conditions?: RuleCondition[];
  logicOperator?: string;
  affectedFields?: string[];
  hasValidator?: boolean;
  validatorKey?: string | null;
}

interface RuleCreatePayload {
  ruleId: string;
  name: string;
  level: string;
  points: number;
  description: string;
  providerTarget: string;
  category: string;
  isCustom: boolean;
  conditions?: RuleCondition[];
  logicOperator?: string;
  affectedFields: string[];
  hasValidator?: boolean;
  validatorKey?: string | null;
}

export async function updateRuleInDatabase(ruleId: string, updates: RuleUpdatePayload): Promise<ScoringRule> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/rules/${ruleId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }

    const result = await response.json();
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Invalid response format');
    }

    clearRulesCache();
    return transformDbRuleToScoringRule(result.data);
  } catch (error) {
    console.error('Error updating rule in database:', error);
    throw error;
  }
}

export async function createRuleInDatabase(rule: RuleCreatePayload): Promise<ScoringRule> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/rules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(rule),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }

    const result = await response.json();
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Invalid response format');
    }

    clearRulesCache();
    return transformDbRuleToScoringRule(result.data);
  } catch (error) {
    console.error('Error creating rule in database:', error);
    throw error;
  }
}

export async function deleteRuleInDatabase(ruleId: string): Promise<boolean> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/rules/${ruleId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete rule');
    }

    clearRulesCache();
    return true;
  } catch (error) {
    console.error('Error deleting rule in database:', error);
    throw error;
  }
}
