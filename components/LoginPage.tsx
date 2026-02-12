import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, Check, Sparkles, Crown, Building2, AlertTriangle, CreditCard } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: { id: string; email: string; nombre: string; rol: string }) => void;
  blockedMessage?: string | null;
}

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

type View = 'login' | 'forgot-password' | 'reset-password' | 'select-plan';

const API_URL = '/api';

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, blockedMessage }) => {
  const [view, setView] = useState<View>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(blockedMessage || null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isRegister, setIsRegister] = useState(false);
  
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [planActionLoading, setPlanActionLoading] = useState<string | null>(null);
  const [pendingUser, setPendingUser] = useState<{ id: string; email: string; nombre: string; rol: string } | null>(null);
  const [noSubscriptionMode, setNoSubscriptionMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setResetToken(token);
      setView('reset-password');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const fetchPlans = async () => {
    setPlansLoading(true);
    try {
      const response = await fetch(`${API_URL}/stripe/plans`);
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans);
      }
    } catch (e) {
      console.error('Error fetching plans:', e);
    } finally {
      setPlansLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'NO_SUBSCRIPTION' && data.user) {
          setPendingUser(data.user);
          setNoSubscriptionMode(true);
          setView('select-plan');
          fetchPlans();
          return;
        }
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      onLoginSuccess(data.user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, nombre }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al registrarse');
      }

      onLoginSuccess(data.user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/password-reset/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar correo');
      }

      setSuccessMessage('Si el correo existe, recibirás un enlace para restablecer tu contraseña.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/password-reset/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al restablecer contraseña');
      }

      setSuccessMessage('¡Contraseña restablecida con éxito! Ahora puedes iniciar sesión.');
      setView('login');
      setNewPassword('');
      setConfirmPassword('');
      setResetToken('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async (planType: string) => {
    setPlanActionLoading(planType);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/stripe/create-checkout`, {
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
      setPlanActionLoading(null);
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

  const renderPlanSelection = () => (
    <div className="w-full max-w-5xl">
      <div className="text-center mb-8">
        <img src="/attached_assets/Veryka_Logo_1767919213039.png" alt="Veryka.ai" className="h-16 mx-auto mb-4" />
        
        {noSubscriptionMode ? (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-amber-700 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Tu suscripción ha expirado</span>
              </div>
              <p className="text-amber-600 text-sm">
                Hola {pendingUser?.nombre || pendingUser?.email}, para continuar usando Veryka.ai necesitas elegir un plan.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-green-700 mb-2">
                <Check className="w-5 h-5" />
                <span className="font-medium">¡Cuenta creada exitosamente!</span>
              </div>
              <p className="text-green-600 text-sm">
                Bienvenido {pendingUser?.nombre || pendingUser?.email}, elige un plan para comenzar a usar Veryka.ai
              </p>
            </div>
          </>
        )}
        
        <h2 className="text-2xl font-bold text-gray-800">Elige tu Plan</h2>
        <p className="text-gray-600 mt-2">
          Selecciona el plan que mejor se adapte a tus necesidades
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

      {plansLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-[#00D1E0]" />
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const planColor = getPlanColor(plan.planType);

            return (
              <div
                key={plan.planType}
                className="relative rounded-xl border-2 border-gray-200 overflow-hidden transition-all hover:border-[#00D1E0] hover:shadow-lg bg-white"
              >
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
                    {plan.maxAuditors > 0 && (
                      <li className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium text-gray-800">{plan.maxAuditors} auditores</span>
                          <span className="text-gray-500 text-sm"> incluidos</span>
                        </div>
                      </li>
                    )}
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
                  </ul>

                  <button
                    onClick={() => handleSubscribe(plan.planType)}
                    disabled={planActionLoading === plan.planType}
                    className={`w-full py-3 rounded-[14px] font-medium transition-all bg-gradient-to-r ${planColor} text-white hover:opacity-90 flex items-center justify-center gap-2`}
                  >
                    {planActionLoading === plan.planType ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        Suscribirse
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 text-center">
        <button
          onClick={() => {
            setView('login');
            setPendingUser(null);
            setNoSubscriptionMode(false);
            setError(null);
          }}
          className="text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-2 mx-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio de sesión
        </button>
      </div>

      <p className="text-center text-gray-500 text-sm mt-6">
        © {new Date().getFullYear()} Veryka.ai
      </p>
    </div>
  );

  if (view === 'select-plan') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-white to-[#e8f7f8] flex items-center justify-center p-4">
        {renderPlanSelection()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-white to-[#e8f7f8] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/attached_assets/Veryka_Logo_1767919213039.png" alt="Veryka.ai" className="h-16 mx-auto mb-4" />
          <p className="text-gray-600 mt-1">Sistema de evaluación de informes médicos</p>
        </div>

        <div className="bg-white rounded-[14px] shadow-xl p-8">
          {view === 'login' && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
              </h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                  {successMessage}
                </div>
              )}

              <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4">
                {isRegister && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00D1E0] focus:border-[#00D1E0] transition-colors"
                      placeholder="Tu nombre"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00D1E0] focus:border-[#00D1E0] transition-colors"
                      placeholder="correo@ejemplo.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00D1E0] focus:border-[#00D1E0] transition-colors"
                      placeholder="••••••••"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {!isRegister && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setView('forgot-password');
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="text-sm text-[#00D1E0] hover:text-[#1A2B56]"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#1A2B56] text-white py-3 rounded-[14px] font-medium hover:bg-[#141f3d] focus:ring-4 focus:ring-[#00D1E0]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {isRegister ? 'Creando cuenta...' : 'Iniciando sesión...'}
                    </>
                  ) : (
                    isRegister ? 'Crear cuenta' : 'Iniciar sesión'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  {isRegister ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}{' '}
                  <button
                    onClick={() => {
                      setIsRegister(!isRegister);
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[#00D1E0] hover:text-[#1A2B56] font-medium"
                  >
                    {isRegister ? 'Inicia sesión' : 'Regístrate'}
                  </button>
                </p>
              </div>
            </>
          )}

          {view === 'forgot-password' && (
            <>
              <button
                onClick={() => {
                  setView('login');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver
              </button>

              <h2 className="text-xl font-semibold text-gray-900 mb-2">Recuperar contraseña</h2>
              <p className="text-gray-600 text-sm mb-6">
                Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                  {successMessage}
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00D1E0] focus:border-[#00D1E0] transition-colors"
                      placeholder="correo@ejemplo.com"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#1A2B56] text-white py-3 rounded-[14px] font-medium hover:bg-[#141f3d] focus:ring-4 focus:ring-[#00D1E0]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar enlace de recuperación'
                  )}
                </button>
              </form>
            </>
          )}

          {view === 'reset-password' && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Nueva contraseña</h2>
              <p className="text-gray-600 text-sm mb-6">
                Ingresa tu nueva contraseña. Debe tener al menos 8 caracteres.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00D1E0] focus:border-[#00D1E0] transition-colors"
                      placeholder="••••••••"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00D1E0] focus:border-[#00D1E0] transition-colors"
                      placeholder="••••••••"
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#1A2B56] text-white py-3 rounded-[14px] font-medium hover:bg-[#141f3d] focus:ring-4 focus:ring-[#00D1E0]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Restableciendo...
                    </>
                  ) : (
                    'Restablecer contraseña'
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          © {new Date().getFullYear()} Veryka.ai
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
