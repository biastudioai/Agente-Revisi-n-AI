import {
  PatientPolicyRecord,
  CondicionesGeneralesRecord,
  PolicyValidationSummary,
} from '../types/policy-types';

const API_BASE = '/api';

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

// ===== Patient Policy =====

export const uploadPatientPolicy = async (
  files: { base64Data: string; mimeType: string }[],
  aseguradoraCodigo: string,
  medicalFormId?: string
): Promise<PatientPolicyRecord> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/policies/upload`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ files, aseguradoraCodigo, medicalFormId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || error.details || 'Error al subir la póliza');
  }

  return response.json();
};

export const getPatientPolicy = async (id: string): Promise<PatientPolicyRecord> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/policies/${id}`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || 'Error al obtener la póliza');
  }

  return response.json();
};

export const updatePatientPolicy = async (
  id: string,
  data: { policyData?: any; medicalFormId?: string }
): Promise<PatientPolicyRecord> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/policies/${id}`, {
    method: 'PUT',
    headers,
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || 'Error al actualizar la póliza');
  }

  return response.json();
};

export const deletePatientPolicy = async (id: string): Promise<void> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/policies/${id}`, {
    method: 'DELETE',
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || 'Error al eliminar la póliza');
  }
};

// ===== Condiciones Generales =====

export const listCondicionesGenerales = async (
  aseguradoraCodigo?: string
): Promise<CondicionesGeneralesRecord[]> => {
  const headers = await getAuthHeaders();
  const params = aseguradoraCodigo ? `?aseguradora=${aseguradoraCodigo}` : '';
  const response = await fetch(`${API_BASE}/condiciones${params}`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || 'Error al listar condiciones generales');
  }

  return response.json();
};

export const getCondicionesGenerales = async (id: string): Promise<CondicionesGeneralesRecord> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/condiciones/${id}`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || 'Error al obtener condiciones generales');
  }

  return response.json();
};

export const uploadCondicionesGenerales = async (
  files: { base64Data: string; mimeType: string }[],
  aseguradoraCodigo: string,
  productName: string,
  version: string,
  notes?: string
): Promise<CondicionesGeneralesRecord> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/condiciones/upload`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ files, aseguradoraCodigo, productName, version, notes }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || error.details || 'Error al subir condiciones generales');
  }

  return response.json();
};

export const updateCondicionesGenerales = async (
  id: string,
  data: { conditionsData?: any; notes?: string; isActive?: boolean }
): Promise<CondicionesGeneralesRecord> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/condiciones/${id}`, {
    method: 'PUT',
    headers,
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || 'Error al actualizar condiciones generales');
  }

  return response.json();
};

export const deleteCondicionesGenerales = async (id: string): Promise<void> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/condiciones/${id}`, {
    method: 'DELETE',
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || 'Error al eliminar condiciones generales');
  }
};

// ===== Policy Validation =====

export const runPolicyValidation = async (
  medicalFormId: string,
  patientPolicyId: string,
  condicionesGeneralesId?: string
): Promise<PolicyValidationSummary & { id: string }> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/analyze/policy-validate`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ medicalFormId, patientPolicyId, condicionesGeneralesId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || error.details || 'Error al validar póliza');
  }

  return response.json();
};
