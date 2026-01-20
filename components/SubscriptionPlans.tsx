import React, { useState, useEffect } from 'react';
import { Check, Loader2, Sparkles, Crown, Building2, AlertTriangle, RefreshCw, XCircle, ArrowUp, ArrowDown, User, Users, Star } from 'lucide-react';

interface Plan {
  planType: string;
  name: string;
  priceMonthlyMxn: number;
  reportsIncluded: number;
  reportsIncludedPromotion: number;
  extraReportPriceMxn: number;
  extraReportPricePromotionMxn: number;
  promotionDurationMonths: number;
  maxBrokers: number;
  maxAuditors: number;
  benefits: string[];
}

interface Subscription {
  id: string;
  planType: string;
  status: string;
  currentPeriodEnd: string;
  isInPromotion: boolean;
  promotionEndsAt: string | null;
  reportsLimit: number;
  extraReportPrice: number;
  planConfig: Plan;
  cancelAtPeriodEnd?: boolean;
  scheduledPlanType?: string | null;
  scheduledChangeAt?: string | null;
  scheduledPlanConfig?: Plan | null;
}

interface SubscriptionPlansProps {
  onClose?: () => void;
  currentSubscription?: Subscription | null;
  onSubscriptionChange?: () => void;
}

const PLAN_ORDER: Record<string, number> = {
  'PLAN_1': 1,
  'PLAN_2': 2,
  'PLAN_3': 3,
};

const PLAN_DISPLAY_NAMES: Record<string, string> = {
  'PLAN_1': 'Agente Independiente',
  'PLAN_2': 'Agente Senior',
  'PLAN_3': 'Broker / Agencia',
};

const PLAN_DESCRIPTIONS: Record<string, string> = {
  'PLAN_1': 'Ideal para agentes que manejan su propia cartera',
  'PLAN_2': 'Para agentes en crecimiento con equipo de soporte',
  'PLAN_3': 'Para despachos y brokers con alto volumen',
};

const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({ onClose, currentSubscription, onSubscriptionChange }) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/stripe/plans', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans);
      } else {
        setError('Error al cargar los planes');
      }
    } catch (e) {
      console.error('Error fetching plans:', e);
      setError('Error al cargar los planes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planType: string) => {
    setActionLoading(planType);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planType }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al crear la suscripción');
      }
    } catch (e) {
      console.error('Error creating checkout:', e);
      setError('Error al procesar el pago');
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangePlan = async (planType: string) => {
    setActionLoading(planType);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch('/api/stripe/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planType }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.type === 'checkout' && data.url) {
          window.location.href = data.url;
        } else if (data.type === 'scheduled') {
          setSuccessMessage(data.message);
          onSubscriptionChange?.();
        }
      } else {
        setError(data.error || 'Error al cambiar de plan');
      }
    } catch (e) {
      console.error('Error changing plan:', e);
      setError('Error al cambiar de plan');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('¿Estás seguro de que deseas cancelar tu suscripción? Podrás seguir usando el servicio hasta el final del período actual.')) {
      return;
    }

    setActionLoading('cancel');
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(data.message);
        onSubscriptionChange?.();
      } else {
        setError(data.error || 'Error al cancelar la suscripción');
      }
    } catch (e) {
      console.error('Error canceling subscription:', e);
      setError('Error al cancelar la suscripción');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async () => {
    setActionLoading('reactivate');
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch('/api/stripe/reactivate-subscription', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(data.message);
        onSubscriptionChange?.();
      } else {
        setError(data.error || 'Error al reactivar la suscripción');
      }
    } catch (e) {
      console.error('Error reactivating subscription:', e);
      setError('Error al reactivar la suscripción');
    } finally {
      setActionLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.open(data.url, '_blank');
        }
      }
    } catch (e) {
      console.error('Error opening portal:', e);
    }
  };

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'PLAN_1':
        return <User className="w-6 h-6" />;
      case 'PLAN_2':
        return <Crown className="w-6 h-6" />;
      case 'PLAN_3':
        return <Building2 className="w-6 h-6" />;
      default:
        return <User className="w-6 h-6" />;
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'PLAN_1':
        return {
          gradient: 'from-blue-500 to-blue-600',
          bg: 'bg-blue-500',
          text: 'text-blue-600',
          light: 'bg-blue-50',
          border: 'border-blue-200',
          check: 'text-blue-500',
        };
      case 'PLAN_2':
        return {
          gradient: 'from-purple-500 to-purple-600',
          bg: 'bg-purple-500',
          text: 'text-purple-600',
          light: 'bg-purple-50',
          border: 'border-purple-200',
          check: 'text-purple-500',
        };
      case 'PLAN_3':
        return {
          gradient: 'from-amber-500 to-amber-600',
          bg: 'bg-amber-500',
          text: 'text-amber-600',
          light: 'bg-amber-50',
          border: 'border-amber-200',
          check: 'text-amber-500',
        };
      default:
        return {
          gradient: 'from-gray-500 to-gray-600',
          bg: 'bg-gray-500',
          text: 'text-gray-600',
          light: 'bg-gray-50',
          border: 'border-gray-200',
          check: 'text-gray-500',
        };
    }
  };

  const isUpgrade = (fromPlan: string, toPlan: string) => {
    return (PLAN_ORDER[toPlan] || 0) > (PLAN_ORDER[fromPlan] || 0);
  };

  const isDowngrade = (fromPlan: string, toPlan: string) => {
    return (PLAN_ORDER[toPlan] || 0) < (PLAN_ORDER[fromPlan] || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const hasPendingChange = currentSubscription?.cancelAtPeriodEnd || currentSubscription?.scheduledPlanType;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Planes de Suscripción</h2>
        <p className="text-gray-600 mt-2">
          Elige el plan que mejor se adapte a tus necesidades
        </p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          Promoción: ¡Doble de informes durante 3 meses!
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-center flex items-center justify-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg text-center flex items-center justify-center gap-2">
          <Check className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      {currentSubscription && (
        <div className="mb-6 space-y-3">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="font-medium text-blue-800">
                  Plan actual: {currentSubscription.planConfig?.name || currentSubscription.planType}
                </p>
                <p className="text-sm text-blue-600">
                  {currentSubscription.isInPromotion 
                    ? `En promoción hasta ${new Date(currentSubscription.promotionEndsAt!).toLocaleDateString('es-MX')}`
                    : `Renueva el ${new Date(currentSubscription.currentPeriodEnd).toLocaleDateString('es-MX')}`
                  }
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleManageSubscription}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Administrar suscripción
                </button>
                {!hasPendingChange && (
                  <button
                    onClick={handleCancelSubscription}
                    disabled={actionLoading === 'cancel'}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm flex items-center gap-2"
                  >
                    {actionLoading === 'cancel' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    Cancelar suscripción
                  </button>
                )}
              </div>
            </div>
          </div>

          {currentSubscription.cancelAtPeriodEnd && !currentSubscription.scheduledPlanType && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Cancelación programada</p>
                    <p className="text-sm text-amber-600">
                      Tu suscripción se cancelará el {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString('es-MX')}. 
                      Hasta entonces, tienes acceso completo a tu plan.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReactivate}
                  disabled={actionLoading === 'reactivate'}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
                >
                  {actionLoading === 'reactivate' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Reactivar suscripción
                </button>
              </div>
            </div>
          )}

          {currentSubscription.scheduledPlanType && currentSubscription.scheduledPlanConfig && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-start gap-3">
                  <ArrowDown className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-purple-800">Cambio de plan programado</p>
                    <p className="text-sm text-purple-600">
                      Tu plan cambiará a <strong>{currentSubscription.scheduledPlanConfig.name}</strong> el {new Date(currentSubscription.scheduledChangeAt!).toLocaleDateString('es-MX')}.
                      Hasta entonces, sigues disfrutando de tu plan actual.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReactivate}
                  disabled={actionLoading === 'reactivate'}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-2"
                >
                  {actionLoading === 'reactivate' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  Cancelar cambio
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6 items-stretch">
        {plans.map((plan) => {
          const isCurrentPlan = currentSubscription?.planType === plan.planType;
          const isScheduledPlan = currentSubscription?.scheduledPlanType === plan.planType;
          const colors = getPlanColor(plan.planType);
          const canUpgrade = currentSubscription && isUpgrade(currentSubscription.planType, plan.planType);
          const canDowngrade = currentSubscription && isDowngrade(currentSubscription.planType, plan.planType);
          const isPopular = plan.planType === 'PLAN_2';
          const displayName = PLAN_DISPLAY_NAMES[plan.planType] || plan.name;
          const description = PLAN_DESCRIPTIONS[plan.planType] || '';

          return (
            <div
              key={plan.planType}
              className={`relative rounded-2xl bg-white overflow-hidden transition-all duration-300 flex flex-col ${
                isPopular 
                  ? 'shadow-2xl shadow-purple-200 border-2 border-purple-400 scale-[1.02] z-10' 
                  : 'shadow-lg hover:shadow-xl border border-gray-200'
              } ${
                isCurrentPlan 
                  ? 'ring-2 ring-green-500 ring-offset-2' 
                  : isScheduledPlan
                  ? 'ring-2 ring-purple-500 ring-offset-2'
                  : ''
              }`}
            >
              {isPopular && !isCurrentPlan && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  MÁS POPULAR
                </div>
              )}
              {isCurrentPlan && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl">
                  ACTUAL
                </div>
              )}
              {isScheduledPlan && !isCurrentPlan && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl">
                  PRÓXIMO
                </div>
              )}

              <div className={`bg-gradient-to-br ${colors.gradient} text-white p-6 ${isPopular ? 'py-8' : ''}`}>
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 bg-white/20 rounded-lg">
                    {getPlanIcon(plan.planType)}
                  </div>
                  <h3 className={`font-bold ${isPopular ? 'text-2xl' : 'text-xl'}`}>{displayName}</h3>
                </div>
                <p className="text-white/80 text-sm mb-4 ml-12">{description}</p>
                <div className="flex items-baseline gap-1">
                  <span className={`font-bold ${isPopular ? 'text-5xl' : 'text-4xl'}`}>${plan.priceMonthlyMxn.toLocaleString()}</span>
                  <span className="text-white/80 text-lg">MXN/mes</span>
                </div>
                <p className="text-white/70 text-sm mt-2">+${plan.extraReportPriceMxn} por informe extra</p>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                <ul className="space-y-3 mb-6 flex-1">
                  <li className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full ${colors.light} flex items-center justify-center`}>
                      <Check className={`w-3.5 h-3.5 ${colors.check}`} />
                    </div>
                    <div>
                      <span className="font-semibold text-gray-800">{plan.reportsIncluded} informes</span>
                      <span className="text-gray-500"> incluidos/mes</span>
                    </div>
                  </li>
                  {plan.benefits && plan.benefits.length > 0 ? (
                    plan.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full ${colors.light} flex items-center justify-center`}>
                          <Check className={`w-3.5 h-3.5 ${colors.check}`} />
                        </div>
                        <span className="text-gray-700">{benefit}</span>
                      </li>
                    ))
                  ) : null}
                  
                  <li className="flex items-center gap-3 bg-gradient-to-r from-green-50 to-emerald-50 -mx-2 px-3 py-2 rounded-lg border border-green-100">
                    <Sparkles className="w-5 h-5 text-green-600 shrink-0" />
                    <div>
                      <span className="font-semibold text-green-700">{plan.reportsIncludedPromotion} informes</span>
                      <span className="text-green-600 text-sm"> por 3 meses</span>
                    </div>
                  </li>
                  <li className="flex items-center gap-3 bg-gradient-to-r from-green-50 to-emerald-50 -mx-2 px-3 py-2 rounded-lg border border-green-100">
                    <Sparkles className="w-5 h-5 text-green-600 shrink-0" />
                    <div>
                      <span className="font-semibold text-green-700">${plan.extraReportPricePromotionMxn} MXN</span>
                      <span className="text-green-600 text-sm"> por informe extra (promoción)</span>
                    </div>
                  </li>
                </ul>

                {!currentSubscription ? (
                  <button
                    onClick={() => handleSubscribe(plan.planType)}
                    disabled={actionLoading === plan.planType}
                    className={`w-full py-3.5 rounded-xl font-semibold transition-all bg-gradient-to-r ${colors.gradient} text-white hover:opacity-90 ${
                      isPopular ? 'shadow-lg shadow-purple-200 hover:shadow-xl' : ''
                    }`}
                  >
                    {actionLoading === plan.planType ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : (
                      'Comenzar ahora'
                    )}
                  </button>
                ) : isCurrentPlan ? (
                  <button
                    disabled
                    className="w-full py-3.5 rounded-xl font-semibold bg-gray-100 text-gray-500 cursor-not-allowed border-2 border-gray-200"
                  >
                    Plan actual
                  </button>
                ) : isScheduledPlan ? (
                  <button
                    disabled
                    className="w-full py-3.5 rounded-xl font-semibold bg-purple-100 text-purple-600 cursor-not-allowed border-2 border-purple-200"
                  >
                    Cambio programado
                  </button>
                ) : hasPendingChange ? (
                  <button
                    disabled
                    className="w-full py-3.5 rounded-xl font-semibold bg-gray-100 text-gray-400 cursor-not-allowed text-sm border-2 border-gray-200"
                  >
                    Cancela el cambio pendiente primero
                  </button>
                ) : (
                  <button
                    onClick={() => handleChangePlan(plan.planType)}
                    disabled={actionLoading === plan.planType}
                    className={`w-full py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                      canUpgrade 
                        ? `bg-gradient-to-r ${colors.gradient} text-white hover:opacity-90 ${isPopular ? 'shadow-lg shadow-purple-200' : ''}`
                        : 'bg-amber-100 text-amber-700 border-2 border-amber-200 hover:bg-amber-200'
                    }`}
                  >
                    {actionLoading === plan.planType ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : canUpgrade ? (
                      <>
                        <ArrowUp className="w-4 h-4" />
                        Upgrade ahora
                      </>
                    ) : (
                      <>
                        <ArrowDown className="w-4 h-4" />
                        Cambiar al final del período
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <p className="text-gray-500 text-sm">
          Todos los planes incluyen nuestra tecnología de pre-validación de diagnósticos
        </p>
      </div>

      {onClose && (
        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPlans;
