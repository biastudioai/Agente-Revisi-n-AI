const API_BASE = '/api/rules';

export interface RuleVersion {
  id: string;
  versionNumber: number;
  rulesHash: string;
  description: string | null;
  createdAt: string;
}

export interface RuleChangeLog {
  id: string;
  ruleId: string;
  ruleName: string;
  changeType: 'CREATED' | 'UPDATED' | 'DELETED' | 'ACTIVATED' | 'DEACTIVATED';
  previousValue: any;
  newValue: any;
  changedBy: string | null;
  changeReason: string | null;
  versionNumber: number;
  createdAt: string;
}

export interface RulesChangedResult {
  changed: boolean;
  currentVersion: RuleVersion | null;
  originalVersion: RuleVersion | null;
  changeCount: number;
}

export async function getCurrentRulesVersion(): Promise<RuleVersion | null> {
  const response = await fetch(`${API_BASE}/versions/current`);
  if (!response.ok) {
    throw new Error('Error al obtener versión actual de reglas');
  }
  const data = await response.json();
  return data.success ? data.data : null;
}

export async function getAllVersions(): Promise<RuleVersion[]> {
  const response = await fetch(`${API_BASE}/versions/all`);
  if (!response.ok) {
    throw new Error('Error al obtener versiones');
  }
  const data = await response.json();
  return data.success ? data.data : [];
}

export async function getVersionById(versionId: string): Promise<RuleVersion | null> {
  const response = await fetch(`${API_BASE}/versions/by-id/${versionId}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Error al obtener versión');
  }
  const data = await response.json();
  return data.success ? data.data : null;
}

export async function checkIfRulesChanged(versionId: string): Promise<RulesChangedResult> {
  const response = await fetch(`${API_BASE}/versions/check-changes/${versionId}`);
  if (!response.ok) {
    throw new Error('Error al verificar cambios en reglas');
  }
  const data = await response.json();
  return data.success ? data.data : { changed: false, currentVersion: null, originalVersion: null, changeCount: 0 };
}

export async function getChangesBetweenVersions(fromVersion: number, toVersion: number): Promise<RuleChangeLog[]> {
  const response = await fetch(`${API_BASE}/versions/changes-between/${fromVersion}/${toVersion}`);
  if (!response.ok) {
    throw new Error('Error al obtener cambios entre versiones');
  }
  const data = await response.json();
  return data.success ? data.data : [];
}

export async function getRecentChangeLogs(limit: number = 50): Promise<RuleChangeLog[]> {
  const response = await fetch(`${API_BASE}/changelog/recent?limit=${limit}`);
  if (!response.ok) {
    throw new Error('Error al obtener historial de cambios');
  }
  const data = await response.json();
  return data.success ? data.data : [];
}

export async function ensureInitialVersion(): Promise<RuleVersion | null> {
  const response = await fetch(`${API_BASE}/versions/current`);
  if (!response.ok) {
    throw new Error('Error al asegurar versión inicial');
  }
  const data = await response.json();
  return data.success ? data.data : null;
}
