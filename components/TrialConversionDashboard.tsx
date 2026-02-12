import React, { useState, useEffect } from 'react';
import { X, Users, TrendingUp, Clock, CheckCircle, AlertCircle, BarChart3, Loader2, RefreshCw } from 'lucide-react';

interface TrialUser {
  id: string;
  email: string;
  nombre: string;
  freeReportsUsed: number;
  freeReportsLimit: number;
  trialExpiresAt: string | null;
  trialConvertedAt: string | null;
  createdAt: string;
  status: 'active' | 'expired' | 'converted';
  convertedPlan: string | null;
}

interface TrialMetrics {
  totalTrialUsers: number;
  activeTrials: number;
  expiredTrials: number;
  convertedTrials: number;
  conversionRate: number;
  avgReportsUsed: number;
}

interface TrialConversionDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const TrialConversionDashboard: React.FC<TrialConversionDashboardProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<TrialUser[]>([]);
  const [metrics, setMetrics] = useState<TrialMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'converted'>('all');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/trial/dashboard', { credentials: 'include' });
      if (!res.ok) throw new Error('Error al cargar datos');
      const data = await res.json();
      setUsers(data.users);
      setMetrics(data.metrics);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredUsers = filter === 'all' ? users : users.filter(u => u.status === filter);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const daysRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const statusBadge = (status: TrialUser['status']) => {
    const styles = {
      active: 'bg-blue-100 text-blue-700',
      expired: 'bg-red-100 text-red-700',
      converted: 'bg-green-100 text-green-700',
    };
    const labels = {
      active: 'Activo',
      expired: 'Expirado',
      converted: 'Convertido',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Conversión de Pruebas Gratuitas</h2>
              <p className="text-xs text-slate-500">Métricas y seguimiento de usuarios en prueba</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              title="Actualizar"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-red-500">
              <AlertCircle className="w-8 h-8 mb-2" />
              <p>{error}</p>
              <button onClick={fetchData} className="mt-4 text-sm text-blue-600 hover:underline">
                Reintentar
              </button>
            </div>
          ) : (
            <>
              {metrics && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-slate-500" />
                      <span className="text-xs text-slate-500">Total Pruebas</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{metrics.totalTrialUsers}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-blue-600">Activos</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-700">{metrics.activeTrials}</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-xs text-red-600">Expirados</span>
                    </div>
                    <p className="text-2xl font-bold text-red-700">{metrics.expiredTrials}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-green-600">Convertidos</span>
                    </div>
                    <p className="text-2xl font-bold text-green-700">{metrics.convertedTrials}</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-purple-500" />
                      <span className="text-xs text-purple-600">Tasa Conversión</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-700">{metrics.conversionRate}%</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 className="w-4 h-4 text-amber-500" />
                      <span className="text-xs text-amber-600">Prom. Informes</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-700">{metrics.avgReportsUsed}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-slate-500">Filtrar:</span>
                {(['all', 'active', 'expired', 'converted'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      filter === f
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : f === 'expired' ? 'Expirados' : 'Convertidos'}
                  </button>
                ))}
              </div>

              {filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay usuarios en esta categoría</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-3 text-xs font-medium text-slate-500 uppercase">Usuario</th>
                        <th className="text-left py-3 px-3 text-xs font-medium text-slate-500 uppercase">Estado</th>
                        <th className="text-center py-3 px-3 text-xs font-medium text-slate-500 uppercase">Informes</th>
                        <th className="text-left py-3 px-3 text-xs font-medium text-slate-500 uppercase">Registro</th>
                        <th className="text-left py-3 px-3 text-xs font-medium text-slate-500 uppercase">Expira</th>
                        <th className="text-left py-3 px-3 text-xs font-medium text-slate-500 uppercase">Plan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => {
                        const days = daysRemaining(u.trialExpiresAt);
                        return (
                          <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-3">
                              <p className="font-medium text-slate-700">{u.nombre}</p>
                              <p className="text-xs text-slate-400">{u.email}</p>
                            </td>
                            <td className="py-3 px-3">{statusBadge(u.status)}</td>
                            <td className="py-3 px-3 text-center">
                              <span className="font-medium">{u.freeReportsUsed}</span>
                              <span className="text-slate-400"> / {u.freeReportsLimit}</span>
                            </td>
                            <td className="py-3 px-3 text-slate-600">{formatDate(u.createdAt)}</td>
                            <td className="py-3 px-3">
                              {u.status === 'active' && days !== null ? (
                                <span className={`text-xs font-medium ${days <= 7 ? 'text-amber-600' : 'text-slate-600'}`}>
                                  {days} días
                                </span>
                              ) : u.trialExpiresAt ? (
                                <span className="text-xs text-slate-400">{formatDate(u.trialExpiresAt)}</span>
                              ) : (
                                <span className="text-xs text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {u.convertedPlan ? (
                                <span className="text-xs font-medium text-green-600">{u.convertedPlan}</span>
                              ) : (
                                <span className="text-xs text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrialConversionDashboard;
