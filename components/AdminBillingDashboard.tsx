import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Users, FileText, DollarSign, CreditCard, Calendar, Crown, Loader2, Tag, Plus, Copy, Check, ToggleLeft, ToggleRight } from 'lucide-react';

interface MonthlyRevenue {
  month: number;
  year: number;
  subscriptionRevenueMxn: number;
  extraReportsRevenueMxn: number;
  totalRevenueMxn: number;
  subscriptionsCount: number;
}

interface SubscriptionStats {
  totalActive: number;
  byPlan: {
    planType: string;
    planName: string;
    count: number;
    monthlyRevenueMxn: number;
  }[];
  totalMonthlyRecurringMxn: number;
}

interface SubscriberInfo {
  id: string;
  email: string;
  nombre: string;
  planType: string;
  planName: string;
  status: string;
  isInPromotion: boolean;
  currentPeriodEnd: string;
  createdAt: string;
  reportsUsedThisMonth: number;
  extraReportsThisMonth: number;
}

interface Summary {
  totalRevenueMxn: number;
  subscriptionRevenueMxn: number;
  extraReportsRevenueMxn: number;
  newSubscriptions: number;
  totalReportsProcessed: number;
  extraReportsTotal: number;
  comparisonToPreviousMonth: number;
}

interface DiscountCode {
  id: string;
  code: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  usageType: 'SINGLE_USE' | 'TIME_PERIOD';
  maxRedemptions: number | null;
  timesRedeemed: number;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  createdAt: string;
  usageCount: number;
}

interface AdminBillingDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getPlanColor = (planType: string): string => {
  switch (planType) {
    case 'BASICO':
      return 'bg-blue-100 text-blue-800';
    case 'PROFESIONAL':
      return 'bg-purple-100 text-purple-800';
    case 'EMPRESARIAL':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const AdminBillingDashboard: React.FC<AdminBillingDashboardProps> = ({ isOpen, onClose }) => {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [revenue, setRevenue] = useState<MonthlyRevenue[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [subscribers, setSubscribers] = useState<SubscriberInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [togglingCode, setTogglingCode] = useState<string | null>(null);
  
  const [newCode, setNewCode] = useState({
    code: '',
    description: '',
    discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED_AMOUNT',
    discountValue: 10,
    usageType: 'SINGLE_USE' as 'SINGLE_USE' | 'TIME_PERIOD',
    maxRedemptions: 1,
    validUntil: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [summaryRes, revenueRes, statsRes, subscribersRes, codesRes] = await Promise.all([
        fetch('/api/billing/summary', { credentials: 'include' }),
        fetch('/api/billing/revenue?months=6', { credentials: 'include' }),
        fetch('/api/billing/stats', { credentials: 'include' }),
        fetch('/api/billing/subscribers?limit=50', { credentials: 'include' }),
        fetch('/api/billing/discount-codes', { credentials: 'include' }),
      ]);

      if (!summaryRes.ok || !revenueRes.ok || !statsRes.ok || !subscribersRes.ok) {
        throw new Error('Error al cargar datos de facturación');
      }

      const [summaryData, revenueData, statsData, subscribersData, codesData] = await Promise.all([
        summaryRes.json(),
        revenueRes.json(),
        statsRes.json(),
        subscribersRes.json(),
        codesRes.ok ? codesRes.json() : { codes: [] },
      ]);

      setSummary(summaryData);
      setRevenue(revenueData.revenue.reverse());
      setStats(statsData);
      setSubscribers(subscribersData.subscribers);
      setDiscountCodes(codesData.codes || []);
    } catch (e: any) {
      setError(e.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCode = async () => {
    if (!newCode.code.trim()) {
      setCreateError('Ingresa un código');
      return;
    }

    setCreateLoading(true);
    setCreateError(null);

    try {
      const res = await fetch('/api/billing/discount-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...newCode,
          validUntil: newCode.validUntil || undefined,
          maxRedemptions: newCode.usageType === 'SINGLE_USE' ? newCode.maxRedemptions : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al crear código');
      }

      const data = await res.json();
      setDiscountCodes([data.discountCode, ...discountCodes]);
      setShowCreateForm(false);
      setNewCode({
        code: '',
        description: '',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        usageType: 'SINGLE_USE',
        maxRedemptions: 1,
        validUntil: '',
      });
    } catch (e: any) {
      setCreateError(e.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggleCode = async (id: string, isActive: boolean) => {
    setTogglingCode(id);
    try {
      const res = await fetch(`/api/billing/discount-codes/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive }),
      });

      if (res.ok) {
        setDiscountCodes(discountCodes.map(c => c.id === id ? { ...c, isActive } : c));
      }
    } finally {
      setTogglingCode(null);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!isOpen) return null;

  const maxRevenue = Math.max(...revenue.map(r => r.totalRevenueMxn), 1);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-veryka-dark to-veryka-dark/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Panel de Facturación</h2>
              <p className="text-sm text-white/70">Resumen de ingresos y suscripciones</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-veryka-cyan" />
              <span className="ml-3 text-slate-600">Cargando datos...</span>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadData}
                className="px-4 py-2 bg-veryka-dark text-white rounded-lg hover:bg-veryka-dark/90"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <>
              {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-green-700 font-medium">Ingresos del Mes</span>
                    </div>
                    <p className="text-2xl font-bold text-green-800">{formatCurrency(summary.totalRevenueMxn)}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {summary.comparisonToPreviousMonth >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`text-xs font-medium ${summary.comparisonToPreviousMonth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {summary.comparisonToPreviousMonth >= 0 ? '+' : ''}{summary.comparisonToPreviousMonth}% vs mes anterior
                      </span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                      <span className="text-sm text-blue-700 font-medium">Suscripciones</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-800">{formatCurrency(summary.subscriptionRevenueMxn)}</p>
                    <p className="text-xs text-blue-600 mt-1">Ingresos recurrentes</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-purple-600" />
                      <span className="text-sm text-purple-700 font-medium">Informes Extra</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-800">{formatCurrency(summary.extraReportsRevenueMxn)}</p>
                    <p className="text-xs text-purple-600 mt-1">{summary.extraReportsTotal} informes adicionales</p>
                  </div>

                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-amber-600" />
                      <span className="text-sm text-amber-700 font-medium">Actividad</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-800">{summary.totalReportsProcessed}</p>
                    <p className="text-xs text-amber-600 mt-1">Informes procesados este mes</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
                  <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-veryka-cyan" />
                    Ingresos Mensuales (últimos 6 meses)
                  </h3>
                  <div className="space-y-3">
                    {revenue.map((r) => (
                      <div key={`${r.year}-${r.month}`} className="flex items-center gap-3">
                        <span className="w-16 text-sm text-slate-600 font-medium">
                          {MONTH_NAMES[r.month - 1]} {r.year.toString().slice(-2)}
                        </span>
                        <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden flex">
                          <div
                            className="h-full bg-veryka-cyan transition-all duration-500"
                            style={{ width: `${(r.subscriptionRevenueMxn / maxRevenue) * 100}%` }}
                            title={`Suscripciones: ${formatCurrency(r.subscriptionRevenueMxn)}`}
                          />
                          <div
                            className="h-full bg-purple-400 transition-all duration-500"
                            style={{ width: `${(r.extraReportsRevenueMxn / maxRevenue) * 100}%` }}
                            title={`Extras: ${formatCurrency(r.extraReportsRevenueMxn)}`}
                          />
                        </div>
                        <span className="w-24 text-right text-sm font-semibold text-slate-700">
                          {formatCurrency(r.totalRevenueMxn)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-4 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-veryka-cyan rounded" />
                      <span className="text-slate-600">Suscripciones</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-purple-400 rounded" />
                      <span className="text-slate-600">Informes extra</span>
                    </div>
                  </div>
                </div>

                {stats && (
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <Crown className="w-5 h-5 text-amber-500" />
                      Distribución por Plan
                    </h3>
                    <div className="space-y-4">
                      {stats.byPlan.map((plan) => (
                        <div key={plan.planType} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getPlanColor(plan.planType)}`}>
                              {plan.planName}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-slate-800">{plan.count}</p>
                            <p className="text-xs text-slate-500">{formatCurrency(plan.monthlyRevenueMxn)}/mes</p>
                          </div>
                        </div>
                      ))}
                      <div className="pt-4 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-700">Total Recurrente</span>
                          <span className="text-lg font-bold text-green-600">{formatCurrency(stats.totalMonthlyRecurringMxn)}/mes</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{stats.totalActive} suscripciones activas</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Users className="w-5 h-5 text-veryka-cyan" />
                    Suscriptores Activos ({subscribers.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Usuario</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Plan</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Estado</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Informes</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Próxima Factura</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Desde</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {subscribers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                            No hay suscriptores activos
                          </td>
                        </tr>
                      ) : (
                        subscribers.map((sub) => (
                          <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-slate-800">{sub.nombre || 'Sin nombre'}</p>
                                <p className="text-xs text-slate-500">{sub.email}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getPlanColor(sub.planType)}`}>
                                {sub.planName}
                              </span>
                              {sub.isInPromotion && (
                                <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                  Promo
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                sub.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {sub.status === 'ACTIVE' ? 'Activo' : sub.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-medium text-slate-700">{sub.reportsUsedThisMonth}</span>
                              {sub.extraReportsThisMonth > 0 && (
                                <span className="text-xs text-purple-600 ml-1">(+{sub.extraReportsThisMonth})</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">{formatDate(sub.currentPeriodEnd)}</td>
                            <td className="px-4 py-3 text-sm text-slate-500">{formatDate(sub.createdAt)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-veryka-cyan" />
                    Códigos de Descuento ({discountCodes.length})
                  </h3>
                  <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-veryka-cyan text-white rounded-lg hover:bg-veryka-cyan/90 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Crear Código
                  </button>
                </div>

                {showCreateForm && (
                  <div className="p-5 bg-slate-50 border-b border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Código</label>
                        <input
                          type="text"
                          value={newCode.code}
                          onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                          placeholder="BIENVENIDO20"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-veryka-cyan focus:border-transparent uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                        <input
                          type="text"
                          value={newCode.description}
                          onChange={(e) => setNewCode({ ...newCode, description: e.target.value })}
                          placeholder="Descuento de bienvenida"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-veryka-cyan focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Descuento</label>
                        <select
                          value={newCode.discountType}
                          onChange={(e) => setNewCode({ ...newCode, discountType: e.target.value as 'PERCENTAGE' | 'FIXED_AMOUNT' })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-veryka-cyan focus:border-transparent"
                        >
                          <option value="PERCENTAGE">Porcentaje (%)</option>
                          <option value="FIXED_AMOUNT">Monto Fijo (MXN)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Valor del Descuento {newCode.discountType === 'PERCENTAGE' ? '(%)' : '(MXN)'}
                        </label>
                        <input
                          type="number"
                          value={newCode.discountValue}
                          onChange={(e) => setNewCode({ ...newCode, discountValue: parseInt(e.target.value) || 0 })}
                          min={1}
                          max={newCode.discountType === 'PERCENTAGE' ? 100 : undefined}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-veryka-cyan focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Uso</label>
                        <select
                          value={newCode.usageType}
                          onChange={(e) => setNewCode({ ...newCode, usageType: e.target.value as 'SINGLE_USE' | 'TIME_PERIOD' })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-veryka-cyan focus:border-transparent"
                        >
                          <option value="SINGLE_USE">Uso Único (limitado por cantidad)</option>
                          <option value="TIME_PERIOD">Por Periodo (válido hasta fecha)</option>
                        </select>
                      </div>
                      {newCode.usageType === 'SINGLE_USE' && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Máximo de Usos</label>
                          <input
                            type="number"
                            value={newCode.maxRedemptions}
                            onChange={(e) => setNewCode({ ...newCode, maxRedemptions: parseInt(e.target.value) || 1 })}
                            min={1}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-veryka-cyan focus:border-transparent"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Válido Hasta (opcional)</label>
                        <input
                          type="date"
                          value={newCode.validUntil}
                          onChange={(e) => setNewCode({ ...newCode, validUntil: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-veryka-cyan focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    {createError && (
                      <p className="text-red-600 text-sm mt-3">{createError}</p>
                    )}
                    
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={handleCreateCode}
                        disabled={createLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-veryka-dark text-white rounded-lg hover:bg-veryka-dark/90 disabled:opacity-50 transition-colors"
                      >
                        {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Crear Código
                      </button>
                      <button
                        onClick={() => setShowCreateForm(false)}
                        className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Código</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Descuento</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tipo</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Usos</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Validez</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Estado</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {discountCodes.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                            No hay códigos de descuento creados
                          </td>
                        </tr>
                      ) : (
                        discountCodes.map((code) => (
                          <tr key={code.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded">
                                  {code.code}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(code.code)}
                                  className="p-1 hover:bg-slate-200 rounded transition-colors"
                                  title="Copiar código"
                                >
                                  {copiedCode === code.code ? (
                                    <Check className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <Copy className="w-4 h-4 text-slate-400" />
                                  )}
                                </button>
                              </div>
                              {code.description && (
                                <p className="text-xs text-slate-500 mt-1">{code.description}</p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-semibold text-green-600">
                                {code.discountType === 'PERCENTAGE' 
                                  ? `${code.discountValue}%` 
                                  : formatCurrency(code.discountValue)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                code.usageType === 'SINGLE_USE' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-purple-100 text-purple-700'
                              }`}>
                                {code.usageType === 'SINGLE_USE' ? 'Uso Único' : 'Por Periodo'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-medium text-slate-700">{code.usageCount}</span>
                              {code.maxRedemptions && (
                                <span className="text-xs text-slate-500">/{code.maxRedemptions}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {code.validUntil ? (
                                <span>Hasta {formatDate(code.validUntil)}</span>
                              ) : (
                                <span className="text-slate-400">Sin límite</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                code.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {code.isActive ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleToggleCode(code.id, !code.isActive)}
                                disabled={togglingCode === code.id}
                                className="p-2 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                                title={code.isActive ? 'Desactivar' : 'Activar'}
                              >
                                {togglingCode === code.id ? (
                                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                                ) : code.isActive ? (
                                  <ToggleRight className="w-5 h-5 text-green-600" />
                                ) : (
                                  <ToggleLeft className="w-5 h-5 text-slate-400" />
                                )}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminBillingDashboard;
