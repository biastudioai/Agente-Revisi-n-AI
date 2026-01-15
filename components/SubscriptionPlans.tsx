import React, { useState, useEffect } from 'react';
import { Check, Loader2, Sparkles, Crown, Building2 } from 'lucide-react';

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
}

interface SubscriptionPlansProps {
  onClose?: () => void;
  currentSubscription?: Subscription | null;
}

const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({ onClose, currentSubscription }) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    setCheckoutLoading(planType);
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
      setCheckoutLoading(null);
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
          window.location.href = data.url;
        }
      }
    } catch (e) {
      console.error('Error opening portal:', e);
    }
  };

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'PLAN_1':
        return <Sparkles className="w-6 h-6" />;
      case 'PLAN_2':
        return <Crown className="w-6 h-6" />;
      case 'PLAN_3':
        return <Building2 className="w-6 h-6" />;
      default:
        return <Sparkles className="w-6 h-6" />;
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'PLAN_1':
        return 'from-blue-500 to-blue-600';
      case 'PLAN_2':
        return 'from-purple-500 to-purple-600';
      case 'PLAN_3':
        return 'from-amber-500 to-amber-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

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
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-center">
          {error}
        </div>
      )}

      {currentSubscription && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="font-medium text-blue-800">
                Plan actual: {currentSubscription.planConfig?.name || currentSubscription.planType}
              </p>
              <p className="text-sm text-blue-600">
                {currentSubscription.isInPromotion 
                  ? `En promoción hasta ${new Date(currentSubscription.promotionEndsAt!).toLocaleDateString()}`
                  : `Renueva el ${new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}`
                }
              </p>
            </div>
            <button
              onClick={handleManageSubscription}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Administrar suscripción
            </button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = currentSubscription?.planType === plan.planType;
          const planColor = getPlanColor(plan.planType);

          return (
            <div
              key={plan.planType}
              className={`relative rounded-xl border-2 overflow-hidden transition-all ${
                isCurrentPlan 
                  ? 'border-green-500 shadow-lg' 
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              {isCurrentPlan && (
                <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  ACTUAL
                </div>
              )}

              <div className={`bg-gradient-to-r ${planColor} text-white p-6`}>
                <div className="flex items-center gap-3 mb-2">
                  {getPlanIcon(plan.planType)}
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">${plan.priceMonthlyMxn.toLocaleString()}</span>
                  <span className="text-white/80">MXN/mes</span>
                </div>
              </div>

              <div className="p-6">
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-gray-800">{plan.reportsIncluded} informes</span>
                      <span className="text-gray-500 text-sm"> incluidos/mes</span>
                    </div>
                  </li>
                  {plan.benefits && plan.benefits.length > 0 ? (
                    plan.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-sm">{benefit}</span>
                      </li>
                    ))
                  ) : null}
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-gray-800">${plan.extraReportPriceMxn} MXN</span>
                      <span className="text-gray-500 text-sm"> por informe extra</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2 bg-green-50 -mx-2 px-2 py-1 rounded">
                    <Sparkles className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-green-700">{plan.reportsIncludedPromotion} informes</span>
                      <span className="text-green-600 text-sm"> por 3 meses</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2 bg-green-50 -mx-2 px-2 py-1 rounded">
                    <Sparkles className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-green-700">${plan.extraReportPricePromotionMxn} MXN</span>
                      <span className="text-green-600 text-sm"> por informe extra (promoción)</span>
                    </div>
                  </li>
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.planType)}
                  disabled={isCurrentPlan || checkoutLoading === plan.planType}
                  className={`w-full py-3 rounded-lg font-medium transition-all ${
                    isCurrentPlan
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : `bg-gradient-to-r ${planColor} text-white hover:opacity-90`
                  }`}
                >
                  {checkoutLoading === plan.planType ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : isCurrentPlan ? (
                    'Plan actual'
                  ) : currentSubscription ? (
                    'Cambiar a este plan'
                  ) : (
                    'Suscribirse'
                  )}
                </button>
              </div>
            </div>
          );
        })}
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
