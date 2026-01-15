import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Users, FileText, Eye, EyeOff, AlertCircle, CheckCircle, Loader2, TrendingUp } from 'lucide-react';

interface Auditor {
  id: string;
  email: string;
  nombre: string;
  createdAt: string;
}

interface AuditorUsage {
  userId: string;
  nombre: string;
  email: string;
  reportsUsed: number;
  reportsFromForms: number;
}

interface AuditorLimits {
  maxAuditors: number;
  currentAuditors: number;
  canAddMore: boolean;
  planName: string;
  isAdmin: boolean;
}

interface AuditorManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPlans?: () => void;
}

const AuditorManager: React.FC<AuditorManagerProps> = ({ isOpen, onClose, onOpenPlans }) => {
  const [auditors, setAuditors] = useState<Auditor[]>([]);
  const [auditorUsage, setAuditorUsage] = useState<AuditorUsage[]>([]);
  const [limits, setLimits] = useState<AuditorLimits | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [isAddingAuditor, setIsAddingAuditor] = useState(false);
  const [editingAuditor, setEditingAuditor] = useState<Auditor | null>(null);
  const [deletingAuditor, setDeletingAuditor] = useState<Auditor | null>(null);
  
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [periodInfo, setPeriodInfo] = useState<{ year: number; month: number } | null>(null);

  const loadAuditors = async () => {
    try {
      const response = await fetch('/api/auditors', { credentials: 'include' });
      if (response.status === 403) {
        setError('No tienes permisos para administrar auditores');
        return;
      }
      if (response.status === 401) {
        setError('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
        return;
      }
      if (!response.ok) throw new Error('Error al cargar auditores');
      const data = await response.json();
      setAuditors(data.auditors);
    } catch (err) {
      setError('Error al cargar la lista de auditores');
    }
  };

  const loadUsage = async () => {
    try {
      const response = await fetch('/api/auditors/usage', { credentials: 'include' });
      if (response.status === 403 || response.status === 401) {
        return;
      }
      if (!response.ok) throw new Error('Error al cargar uso');
      const data = await response.json();
      setAuditorUsage(data.auditorUsage);
      setPeriodInfo({ year: data.periodYear, month: data.periodMonth });
    } catch (err) {
      console.error('Error loading usage:', err);
    }
  };

  const loadLimits = async () => {
    try {
      const response = await fetch('/api/auditors/limits', { credentials: 'include' });
      if (response.status === 403 || response.status === 401) {
        return;
      }
      if (!response.ok) throw new Error('Error al cargar límites');
      const data = await response.json();
      setLimits(data);
    } catch (err) {
      console.error('Error loading limits:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      Promise.all([loadAuditors(), loadUsage(), loadLimits()]).finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({ nombre: '', email: '', password: '' });
    setShowPassword(false);
    setIsAddingAuditor(false);
    setEditingAuditor(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      if (editingAuditor) {
        const updateData: any = {};
        if (formData.nombre !== editingAuditor.nombre) updateData.nombre = formData.nombre;
        if (formData.email !== editingAuditor.email) updateData.email = formData.email;
        if (formData.password) updateData.password = formData.password;

        const response = await fetch(`/api/auditors/${editingAuditor.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Error al actualizar');
        }

        setSuccess('Auditor actualizado correctamente');
      } else {
        const response = await fetch('/api/auditors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Error al crear auditor');
        }

        setSuccess('Auditor creado correctamente');
      }

      resetForm();
      await loadAuditors();
      await loadUsage();
      await loadLimits();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingAuditor) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/auditors/${deletingAuditor.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al eliminar');
      }

      setSuccess('Auditor eliminado correctamente');
      setDeletingAuditor(null);
      await loadAuditors();
      await loadUsage();
      await loadLimits();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (auditor: Auditor) => {
    setEditingAuditor(auditor);
    setFormData({
      nombre: auditor.nombre,
      email: auditor.email,
      password: '',
    });
    setIsAddingAuditor(false);
  };

  const getUsageForAuditor = (auditorId: string) => {
    return auditorUsage.find(u => u.userId === auditorId);
  };

  const getMonthName = (month: number) => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[month - 1];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Administrar Usuarios</h2>
              <p className="text-xs text-slate-500">Gestiona tus auditores y su uso de informes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          {periodInfo && (
            <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <p className="text-sm text-indigo-700">
                <FileText className="w-4 h-4 inline mr-2" />
                Período de facturación actual: <strong>{getMonthName(periodInfo.month)} {periodInfo.year}</strong>
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : (
            <>
              {limits && !limits.isAdmin && (
                <div className="mb-4 p-3 bg-slate-100 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-600" />
                      <span className="text-sm text-slate-700">
                        <strong>{limits.currentAuditors}</strong> de <strong>{limits.maxAuditors}</strong> auditores utilizados
                      </span>
                      <span className="text-xs text-slate-500">({limits.planName})</span>
                    </div>
                    {!limits.canAddMore && limits.maxAuditors > 0 && onOpenPlans && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenPlans();
                        }}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        <TrendingUp className="w-3 h-3" />
                        Mejorar plan
                      </button>
                    )}
                  </div>
                </div>
              )}

              {limits && limits.maxAuditors === 0 && !limits.isAdmin && (
                <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-amber-800 font-medium">Tu plan no incluye auditores</p>
                      <p className="text-xs text-amber-700 mt-1">
                        Para agregar auditores que generen informes bajo tu cuenta, actualiza a Plan Profesional (3 auditores) o Empresarial (10 auditores).
                      </p>
                      {onOpenPlans && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenPlans();
                          }}
                          className="mt-2 flex items-center gap-1 text-sm text-amber-700 hover:text-amber-800 font-medium underline"
                        >
                          <TrendingUp className="w-4 h-4" />
                          Ver planes disponibles
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!isAddingAuditor && !editingAuditor && (limits?.canAddMore || limits?.isAdmin) && (
                <button
                  onClick={() => {
                    setIsAddingAuditor(true);
                    setFormData({ nombre: '', email: '', password: '' });
                  }}
                  className="mb-6 flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Agregar Auditor
                </button>
              )}

              {!isAddingAuditor && !editingAuditor && limits && !limits.canAddMore && limits.maxAuditors > 0 && !limits.isAdmin && (
                <div className="mb-6 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-700">
                    <strong>Límite alcanzado:</strong> Has llegado al máximo de {limits.maxAuditors} auditores de tu plan.
                    {onOpenPlans && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenPlans();
                        }}
                        className="ml-2 text-orange-800 underline font-medium"
                      >
                        Actualiza tu plan
                      </button>
                    )}
                  </p>
                </div>
              )}

              {(isAddingAuditor || editingAuditor) && (
                <form onSubmit={handleSubmit} className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">
                    {editingAuditor ? 'Editar Auditor' : 'Nuevo Auditor'}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Nombre</label>
                      <input
                        type="text"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Nombre completo"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="correo@ejemplo.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        {editingAuditor ? 'Nueva Contraseña (opcional)' : 'Contraseña'}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder={editingAuditor ? 'Dejar vacío para mantener' : 'Mínimo 8 caracteres'}
                          required={!editingAuditor}
                          minLength={editingAuditor ? undefined : 8}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm disabled:opacity-50"
                    >
                      {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      {editingAuditor ? 'Guardar Cambios' : 'Crear Auditor'}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              {deletingAuditor && (
                <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-200">
                  <h3 className="text-sm font-semibold text-red-700 mb-2">Confirmar eliminación</h3>
                  <p className="text-sm text-red-600 mb-4">
                    ¿Estás seguro de eliminar al auditor <strong>{deletingAuditor.nombre}</strong> ({deletingAuditor.email})? 
                    Esta acción no se puede deshacer.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm disabled:opacity-50"
                    >
                      {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      Sí, Eliminar
                    </button>
                    <button
                      onClick={() => setDeletingAuditor(null)}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {auditors.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">No tienes auditores registrados</p>
                    <p className="text-slate-400 text-xs mt-1">Agrega auditores para que puedan generar informes bajo tu cuenta</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600">
                          <th className="text-left px-4 py-3 rounded-tl-lg font-semibold">Auditor</th>
                          <th className="text-left px-4 py-3 font-semibold">Email</th>
                          <th className="text-center px-4 py-3 font-semibold">Informes este mes</th>
                          <th className="text-left px-4 py-3 font-semibold">Fecha de registro</th>
                          <th className="text-center px-4 py-3 rounded-tr-lg font-semibold">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {auditors.map((auditor) => {
                          const usage = getUsageForAuditor(auditor.id);
                          return (
                            <tr key={auditor.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 font-medium text-slate-800">{auditor.nombre}</td>
                              <td className="px-4 py-3 text-slate-600">{auditor.email}</td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full font-semibold text-xs">
                                  <FileText className="w-3 h-3" />
                                  {usage?.reportsFromForms || 0}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-500 text-xs">
                                {new Date(auditor.createdAt).toLocaleDateString('es-MX', { 
                                  day: 'numeric', 
                                  month: 'short', 
                                  year: 'numeric' 
                                })}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => startEdit(auditor)}
                                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title="Editar"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setDeletingAuditor(auditor)}
                                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {auditors.length > 0 && (
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-700">
                    <strong>Nota:</strong> Los informes generados por tus auditores se descuentan de tu límite de informes mensual. 
                    Mantén un control del uso para optimizar tu plan.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditorManager;
