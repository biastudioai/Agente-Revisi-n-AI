import React, { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import RuleConfigurator from './components/RuleConfigurator';
import InsuranceAuditor from './components/InsuranceAuditor';
import PdfViewer from './components/PdfViewer';
import ProviderSelector, { ProviderOption } from './components/ProviderSelector';
import LoginPage from './components/LoginPage';
import SubscriptionPlans from './components/SubscriptionPlans';
import { analyzeReportImage, reEvaluateReport } from './services/geminiService';
import { getReglasParaAseguradora } from './services/scoring-engine';
import { AnalysisReport, AnalysisStatus, ExtractedData, ScoringRule, SavedReport } from './types';
import { detectProviderFromPdf, DetectedProvider } from './services/providerDetection';
import AdminBillingDashboard from './components/AdminBillingDashboard';
import { Stethoscope, Eye, PanelRightClose, PanelRightOpen, ShieldCheck, FileText, ExternalLink, Settings, RefreshCw, AlignLeft, Image as ImageIcon, Loader2, Building2, LogOut, ChevronDown, User as UserIcon, CreditCard, BarChart3 } from 'lucide-react';

interface User {
  id: string;
  email: string;
  nombre: string;
  rol: string;
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<{data: string, type: string} | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [currentFormId, setCurrentFormId] = useState<string | null>(null);
  
  // State for usage tracking
  const [usage, setUsage] = useState<{
    periodYear: number;
    periodMonth: number;
    reportsUsed: number;
    reportsLimit: number;
    remaining: number;
    extraReportsUsed: number;
    extraChargesMxn: number;
    planType: string | null;
    isInPromotion: boolean;
    extraReportPriceMxn: number;
    hasActiveSubscription: boolean;
    isAdmin?: boolean;
  } | null>(null);
  
  // State for Rules (loaded from database)
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState(true);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isInsuranceAuditorOpen, setIsInsuranceAuditorOpen] = useState(false);

  // Load rules from database on mount
  useEffect(() => {
    const loadRules = async () => {
      try {
        setIsLoadingRules(true);
        setRulesError(null);
        const dbRules = await getReglasParaAseguradora('ALL');
        setRules(dbRules);
      } catch (e) {
        console.error('Error loading rules from database:', e);
        setRulesError('No se pudieron cargar las reglas de validación');
      } finally {
        setIsLoadingRules(false);
      }
    };
    loadRules();
  }, []);

  // State for Provider Selection
  const [selectedProvider, setSelectedProvider] = useState<ProviderOption>('UNKNOWN');
  const [detectedProvider, setDetectedProvider] = useState<DetectedProvider | undefined>();
  const [detectionConfidence, setDetectionConfidence] = useState<'high' | 'medium' | 'low'>('low');
  const [pendingFile, setPendingFile] = useState<{data: string, type: string} | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  // State for Pending Changes (Sync Form -> PDF)
  const [pendingChanges, setPendingChanges] = useState<Record<string, { old: any, new: any }>>({});

  // State for Left Panel View Mode (Visual vs Text)
  const [leftPanelView, setLeftPanelView] = useState<'visual' | 'text'>('visual');

  // State for User Dropdown
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // State for Subscription Modal
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  
  // State for Subscription Success Notification
  const [subscriptionNotification, setSubscriptionNotification] = useState<string | null>(null);
  
  // State for Admin Billing Dashboard
  const [isBillingDashboardOpen, setIsBillingDashboardOpen] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/validate', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          if (data.valid && data.user) {
            setUser(data.user);
          }
        }
      } catch (e) {
        console.error('Error checking auth:', e);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  // Check for subscription result in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subscriptionResult = params.get('subscription');
    
    if (subscriptionResult === 'success') {
      setSubscriptionNotification('Tu suscripción se ha activado correctamente. Ya puedes procesar informes.');
      window.history.replaceState({}, '', window.location.pathname);
      loadUsage();
      loadSubscription();
      setTimeout(() => setSubscriptionNotification(null), 8000);
    } else if (subscriptionResult === 'cancelled') {
      setSubscriptionNotification('El proceso de suscripción fue cancelado.');
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => setSubscriptionNotification(null), 5000);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      console.error('Error logging out:', e);
    }
    setUser(null);
  };

  // Cargar uso mensual y suscripción
  const loadUsage = async () => {
    try {
      const response = await fetch('/api/usage/current', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      }
    } catch (e) {
      console.error('Error loading usage:', e);
    }
  };

  const loadSubscription = async () => {
    try {
      const response = await fetch('/api/stripe/subscription', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
      }
    } catch (e) {
      console.error('Error loading subscription:', e);
    }
  };

  useEffect(() => {
    if (user) {
      loadUsage();
      loadSubscription();
    }
  }, [user]);

  // Cargar reportes guardados desde el backend al montar
  useEffect(() => {
    const loadSavedForms = async () => {
      try {
        const response = await fetch('/api/forms', {
          credentials: 'include',
        });
        if (response.ok) {
          const forms = await response.json();
          const reports: SavedReport[] = forms.map((form: any) => ({
            id: form.id,
            timestamp: new Date(form.createdAt).getTime(),
            fileName: 'Informe Médico',
            provider: form.insuranceCompany,
            extractedData: form.formData,
            score: form.formData?.score || { finalScore: 0, categoryScores: [] },
            flags: form.formData?.flags || [],
            pdfUrl: form.formPdfs?.[0]?.pdfUrl || null,
          }));
          setSavedReports(reports);
        }
      } catch (e) {
        console.error('Error loading saved reports:', e);
      }
    };
    
    if (user) {
      loadSavedForms();
    }
  }, [user]);

  // Convert Base64 to Blob URL for download link
  useEffect(() => {
    if (filePreview) {
      try {
        const byteCharacters = atob(filePreview.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: filePreview.type });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);

        // Cleanup on unmount or change
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (e) {
        console.error("Error creating blob URL", e);
      }
    } else {
      setBlobUrl(null);
    }
  }, [filePreview]);

  const handleFileSelected = async (base64Data: string, mimeType: string) => {
    setError(null);
    setPendingChanges({});
    setLeftPanelView('visual');
    
    // Store the file for later processing
    setPendingFile({ data: base64Data, type: mimeType });
    setFilePreview({ data: base64Data, type: mimeType });
    
    // Reset provider selection for new file
    setSelectedProvider('UNKNOWN');
    
    // Try to detect provider automatically for PDFs
    if (mimeType === 'application/pdf') {
      setIsDetecting(true);
      try {
        const detection = await detectProviderFromPdf(base64Data);
        setDetectedProvider(detection.provider);
        setDetectionConfidence(detection.confidence);
        if (detection.provider !== 'UNKNOWN') {
          setSelectedProvider(detection.provider);
        }
      } catch (err) {
        console.error('Detection failed:', err);
        setDetectedProvider('UNKNOWN');
        setSelectedProvider('UNKNOWN');
      }
      setIsDetecting(false);
    } else {
      // For images, require manual selection
      setDetectedProvider('UNKNOWN');
      setDetectionConfidence('low');
      setSelectedProvider('UNKNOWN');
    }
    
    setStatus('provider_selection');
  };

  const handleStartAnalysis = async () => {
    if (!pendingFile || selectedProvider === 'UNKNOWN') return;
    
    if (isLoadingRules) {
      setError("Cargando reglas de validación, espera un momento...");
      return;
    }
    
    if (rulesError || rules.length === 0) {
      setError("No se pudieron cargar las reglas de validación desde la base de datos. Contacta soporte.");
      setStatus('error');
      return;
    }

    // Verificar suscripción activa
    if (!usage?.hasActiveSubscription) {
      setError("Necesitas una suscripción activa para procesar informes. Haz clic en tu perfil para ver los planes disponibles.");
      setStatus('error');
      return;
    }

    // Verificar límite de uso (ahora permite extras con cobro)
    if (usage && usage.remaining <= 0) {
      const extraPrice = usage.extraReportPriceMxn;
      const confirmExtra = window.confirm(
        `Has alcanzado tu límite de ${usage.reportsLimit} informes. ` +
        `El siguiente informe tendrá un costo adicional de $${extraPrice} MXN. ` +
        `¿Deseas continuar?`
      );
      if (!confirmExtra) {
        return;
      }
    }
    
    setStatus('analyzing');
    setError(null);
    setCurrentFormId(null);
    
    try {
      const data = await analyzeReportImage(pendingFile.data, pendingFile.type, selectedProvider, rules);
      setReport(data);
      setStatus('complete');
      
      // Auto-guardar automáticamente después de procesar
      const savedFormId = await autoSaveReport(data, pendingFile);
      if (savedFormId) {
        setCurrentFormId(savedFormId);
      }
    } catch (err: any) {
      console.error(err);
      const errorMessage = err?.message || '';
      if (errorMessage.includes('404')) {
        setError("Error: Modelo de IA no disponible. Contacta soporte.");
      } else if (errorMessage.includes('400')) {
        setError("Error en la configuración. Intenta con otra aseguradora.");
      } else if (errorMessage.includes('reglas de validación')) {
        setError("Error: No hay reglas de validación disponibles. Contacta soporte.");
      } else {
        setError("Error al procesar el documento. Asegúrate de usar una API Key válida o intenta con una imagen más clara.");
      }
      setStatus('error');
    }
  };

  const handleReevaluate = async (updatedData: ExtractedData) => {
    if (!report) return;
    
    if (rules.length === 0) {
      setError("No hay reglas de validación disponibles para re-evaluar.");
      return;
    }
    
    const previousStatus = status;
    setStatus('re-evaluating');
    try {
      const updatedReport = await reEvaluateReport(report, updatedData, rules);
      setReport(updatedReport);
      setStatus('complete');
    } catch (err) {
      console.error(err);
      setError("Error al re-evaluar. Intenta nuevamente.");
      setStatus(previousStatus);
    }
  };
  
  // When rules update, re-run score calculation against current data if available
  const handleRulesUpdate = async (newRules: ScoringRule[]) => {
      setRules(newRules);
      
      // Save custom rules to localStorage
      const customRules = newRules.filter(r => r.isCustom);
      try {
        localStorage.setItem('custom-rules', JSON.stringify(customRules));
      } catch (e) {
        console.error('Error saving custom rules to localStorage:', e);
      }
      
      if (report && status === 'complete') {
          // Trigger immediate re-calc without "loading" state if it's just local rule change
          try {
             const updatedReport = await reEvaluateReport(report, report.extracted, newRules);
             setReport(updatedReport);
          } catch(e) {
             console.error("Failed to update score with new rules", e);
          }
      }
  };

  const handleSyncChanges = (changes: Record<string, { old: any, new: any }>) => {
      setPendingChanges(changes);
  };

  // Auto-guardar reporte (sin alertas, usado después de procesamiento)
  const autoSaveReport = async (reportData: AnalysisReport, file: {data: string, type: string} | null): Promise<string | null> => {
    try {
      setIsAutoSaving(true);
      
      const formData = {
        ...reportData.extracted,
        score: reportData.score,
        flags: reportData.flags,
      };

      const requestBody: {
        insuranceCompany: string;
        formData: any;
        fileBase64?: string;
        fileMimeType?: string;
      } = {
        insuranceCompany: reportData.extracted.provider || 'UNKNOWN',
        formData: formData,
      };

      if (file) {
        requestBody.fileBase64 = file.data;
        requestBody.fileMimeType = file.type;
      }

      const response = await fetch('/api/forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar');
      }

      const result = await response.json();
      
      const newReport: SavedReport = {
        id: result.formId,
        timestamp: Date.now(),
        fileName: 'Informe Médico',
        provider: reportData.extracted.provider,
        extractedData: reportData.extracted,
        score: reportData.score,
        flags: reportData.flags
      };

      setSavedReports(prev => {
        const existingIndex = prev.findIndex(r => r.id === result.formId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = newReport;
          return updated;
        }
        return [newReport, ...prev];
      });
      
      // Solo incrementar uso si es un nuevo informe (no un update)
      if (result.isNew) {
        await fetch('/api/usage/increment', {
          method: 'POST',
          credentials: 'include',
        });
        await loadUsage();
      }
      
      return result.formId;
    } catch (e: any) {
      console.error('Error auto-saving report:', e);
      setError('Error al guardar automáticamente. Por favor, intenta de nuevo.');
      return null;
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Guardar cambios manuales (cuando el usuario modifica datos)
  const handleSaveChanges = async (updatedFormData: ExtractedData) => {
    if (!report || !currentFormId) return;
    
    try {
      // Recalcular el score con los datos actualizados del formulario
      const updatedReport = await reEvaluateReport(report, updatedFormData, rules);
      setReport(updatedReport);
      
      const formData = {
        ...updatedFormData,
        score: updatedReport.score,
        flags: updatedReport.flags,
      };

      const requestBody: {
        insuranceCompany: string;
        formData: any;
        formId: string;
      } = {
        insuranceCompany: updatedFormData.provider || 'UNKNOWN',
        formData: formData,
        formId: currentFormId,
      };

      const response = await fetch('/api/forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar');
      }

      const result = await response.json();
      
      const savedReportData: SavedReport = {
        id: result.formId,
        timestamp: Date.now(),
        fileName: 'Informe Médico',
        provider: updatedFormData.provider,
        extractedData: updatedFormData,
        score: updatedReport.score,
        flags: updatedReport.flags
      };

      setSavedReports(prev => {
        const existingIndex = prev.findIndex(r => r.id === result.formId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = savedReportData;
          return updated;
        }
        return prev;
      });
      
      setPendingChanges({});
      alert('Cambios guardados exitosamente');
    } catch (e: any) {
      console.error('Error saving changes:', e);
      alert('Error al guardar cambios: ' + (e.message || 'Error desconocido'));
    }
  };

  // Cargar reporte desde historial
  const handleLoadReport = (saved: SavedReport) => {
    const loadedReport: AnalysisReport = {
      extracted: saved.extractedData,
      score: saved.score,
      flags: saved.flags
    };
    
    setReport(loadedReport);
    setFilePreview(null); // No hay PDF/imagen disponible
    setStatus('complete');
    setPendingChanges({});
  };

  // Eliminar reporte del historial
  const handleDeleteReport = async (id: string) => {
    if (!confirm('¿Eliminar este reporte del historial?')) return;
    
    try {
      const response = await fetch(`/api/forms/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (response.ok) {
        setSavedReports(prev => prev.filter(r => r.id !== id));
      } else {
        const error = await response.json();
        alert('Error al eliminar: ' + (error.error || 'Error desconocido'));
      }
    } catch (e) {
      console.error('Error deleting report:', e);
      alert('Error al eliminar el reporte');
    }
  };

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-white to-[#e8f7f8] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#00D1E0] animate-spin" />
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage onLoginSuccess={setUser} />;
  }

  // Determine approval status
  let approvalStatus: 'APPROVED' | 'REVIEW' | 'REJECTED' = 'REVIEW';
  if (report) {
      if (report.score.finalScore >= 85) approvalStatus = 'APPROVED';
      else if (report.score.finalScore < 50) approvalStatus = 'REJECTED';
  }

  // --- Helper to render Narrative Text in Left Panel ---
  const renderLeftPanelNarrative = (data: ExtractedData) => {
    return (
        <div className="max-w-md mx-auto font-mono text-xs text-emerald-400/90 leading-relaxed whitespace-pre-wrap space-y-4">
            <div className="border-b border-emerald-900/50 pb-2 mb-2">
                <p className="font-bold text-emerald-300 uppercase">{data.hospital?.nombre_hospital || "NOTA MÉDICA"}</p>
                <p>DR: {data.medico_tratante?.nombres} {data.medico_tratante?.primer_apellido}</p>
                <p>FECHA: {data.padecimiento_actual?.fecha_inicio || "S/D"}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-[10px] opacity-80">
                <p>PAC: {data.identificacion?.nombres} {data.identificacion?.primer_apellido}</p>
                <p>EDAD: {data.identificacion?.edad}</p>
            </div>

            {data.padecimiento_actual?.descripcion && (
                <div>
                    <span className="font-bold text-emerald-300 block mb-1">PADECIMIENTO:</span>
                    {data.padecimiento_actual.descripcion}
                </div>
            )}
            
            <div className="border-y border-emerald-900/50 py-2 my-2 grid grid-cols-2 gap-2">
                 <p>TA: {data.signos_vitales?.presion_arterial}</p>
                 <p>TEMP: {data.signos_vitales?.temperatura}</p>
            </div>

            {data.diagnostico?.diagnostico_definitivo && (
                <div>
                    <span className="font-bold text-emerald-300 block mb-1">DX:</span>
                    {data.diagnostico.diagnostico_definitivo}
                </div>
            )}

            {data.tratamiento?.descripcion && (
                <div>
                     <span className="font-bold text-emerald-300 block mb-1">TX:</span>
                     {data.tratamiento.descripcion}
                </div>
            )}
        </div>
    );
  };

  // Render: SPLIT VIEW
  if (status === 'complete' || status === 're-evaluating') {
    return (
      <div className="h-screen flex flex-col bg-slate-50 overflow-hidden font-sans">
        {/* Navbar Compact */}
        <header className="h-14 bg-slate-50 flex items-center px-4 justify-between shrink-0 z-30">
           <div className="flex items-center gap-3">
              <img src="/attached_assets/Veryka_Logo_1767919213039.png" alt="Veryka.ai" className="h-12 object-contain" />
           </div>
           <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsInsuranceAuditorOpen(true)}
                className="text-xs text-veryka-dark bg-accent-50 border border-accent-200 hover:bg-accent-100 hover:border-accent-300 font-bold px-3 py-1.5 rounded-veryka transition-all flex items-center gap-2 shadow-sm"
              >
                <Building2 className="w-3.5 h-3.5" />
                Auditoría de aseguradoras
              </button>

              <button 
                onClick={() => setIsRulesModalOpen(true)}
                className="text-xs text-veryka-dark bg-brand-50 border border-brand-200 hover:bg-brand-100 hover:border-brand-300 font-bold px-3 py-1.5 rounded-veryka transition-all flex items-center gap-2 shadow-sm"
              >
                <Settings className="w-3.5 h-3.5" />
                Auditoría de reglas
              </button>

              <button 
                onClick={() => window.location.reload()}
                className="text-xs text-slate-500 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 transition-colors"
                title="Nueva Auditoría (Reiniciar)"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {usage && (
                <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide">Uso mensual</span>
                    <div className="flex items-center gap-1">
                      <span className={`text-xs font-bold ${usage.remaining <= 5 ? 'text-amber-600' : 'text-slate-700'}`}>
                        {usage.reportsUsed}/{usage.reportsLimit}
                      </span>
                      <span className="text-[10px] text-slate-400">informes</span>
                    </div>
                  </div>
                  <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        usage.remaining <= 5 ? 'bg-amber-500' : 
                        usage.remaining <= 10 ? 'bg-brand-400' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min((usage.reportsUsed / usage.reportsLimit) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
                <span className="text-xs text-slate-500">{user.nombre}</span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-slate-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
           </div>
        </header>

        {/* Main Split Area */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* LEFT PANE: SOURCE DOCUMENT */}
          <div 
            className={`bg-slate-900 relative transition-all duration-500 ease-in-out flex flex-col shadow-2xl z-10 ${isPanelOpen ? '' : 'w-0 opacity-0'}`}
            style={{ width: isPanelOpen ? '50%' : '0px', flex: 'none' }}
          >
            {/* Header Controls for Left Panel */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
               <div className="bg-black/60 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full flex items-center border border-white/10 shadow-lg select-none">
                  {leftPanelView === 'visual' ? <Eye className="w-3.5 h-3.5 mr-2 text-brand-400" /> : <AlignLeft className="w-3.5 h-3.5 mr-2 text-brand-400" />}
                  <span className="font-medium tracking-wide">Documento Original</span>
               </div>
               
               {/* View Toggle */}
               <div className="bg-black/60 backdrop-blur rounded-full flex items-center border border-white/10 shadow-lg p-1">
                  <button 
                    onClick={() => setLeftPanelView('visual')}
                    className={`p-1.5 rounded-full transition-all ${leftPanelView === 'visual' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                    title="Vista Visual (PDF/Imagen)"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setLeftPanelView('text')}
                    className={`p-1.5 rounded-full transition-all ${leftPanelView === 'text' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                    title="Vista Texto (Transcripción)"
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
               </div>

               {blobUrl && (
                  <a 
                    href={blobUrl} 
                    target="_blank"
                    rel="noreferrer"
                    className="bg-black/60 hover:bg-black/80 backdrop-blur text-white p-1.5 rounded-full flex items-center border border-white/10 shadow-lg transition-all hover:scale-105 cursor-pointer"
                    title="Abrir en nueva pestaña"
                  >
                     <ExternalLink className="w-3.5 h-3.5 text-white" />
                  </a>
               )}
            </div>
            
            <div className="flex-1 w-full h-full bg-slate-900 flex items-center justify-center overflow-hidden p-0 relative">
              
              {leftPanelView === 'visual' ? (
                // --- VISUAL MODE (PDF/IMAGE) ---
                filePreview ? (
                    filePreview.type === 'application/pdf' ? (
                    <PdfViewer 
                        base64Data={filePreview.data} 
                        approvalStatus={approvalStatus}
                        pendingChanges={pendingChanges}
                    />
                    ) : (
                    <div className="w-full h-full overflow-auto flex items-center justify-center p-8 bg-slate-900/50">
                        <img 
                            src={`data:${filePreview.type};base64,${filePreview.data}`} 
                            className="max-w-full max-h-full object-contain shadow-2xl"
                            alt="Medical Report"
                        />
                    </div>
                    )
                ) : (
                    <div className="text-slate-500 flex flex-col items-center">
                        <FileText className="w-10 h-10 mb-2 opacity-50" />
                        <span className="text-xs">Reporte cargado del historial</span>
                        <span className="text-[10px] text-slate-400 mt-1">Documento original no disponible</span>
                    </div>
                )
              ) : (
                // --- TEXT MODE (TRANSCRIPTION) ---
                <div className="w-full h-full flex flex-col bg-slate-950">
                    <div className="flex-1 overflow-auto custom-scrollbar p-8">
                        <div className="max-w-2xl mx-auto">
                            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-6 pb-2 border-b border-slate-800 flex items-center gap-2">
                                <AlignLeft className="w-4 h-4" /> Transcripción del Sistema (Modo Nota)
                            </h3>
                            {report?.extracted ? (
                                renderLeftPanelNarrative(report.extracted)
                            ) : (
                                <span className="text-slate-600 italic">No hay transcripción disponible.</span>
                            )}
                        </div>
                    </div>
                </div>
              )}

            </div>
          </div>

          {/* TOGGLE BUTTON - FLOATING CENTER */}
          <button 
             onClick={() => setIsPanelOpen(!isPanelOpen)}
             className="absolute top-1/2 -translate-y-1/2 z-50 bg-white border border-slate-200 shadow-[0_0_15px_rgba(0,0,0,0.1)] p-1.5 rounded-full text-slate-500 hover:text-brand-600 hover:scale-110 transition-all duration-200 hidden md:flex items-center justify-center w-8 h-8"
             style={{ left: isPanelOpen ? 'calc(50% - 16px)' : '16px' }}
             title={isPanelOpen ? "Expandir Panel de Datos" : "Ver Documento"}
          >
             {isPanelOpen ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
          </button>

          {/* RIGHT PANE: DASHBOARD (EXTRACTED DATA) */}
          <div 
            className={`bg-white transition-all duration-500 ease-in-out flex flex-col border-l border-slate-200`}
            style={{ width: isPanelOpen ? '50%' : '100%', flex: 'none' }}
          >
             {report && (
                <Dashboard 
                  report={report} 
                  onReevaluate={handleReevaluate} 
                  isReevaluating={status === 're-evaluating'}
                  onSyncChanges={handleSyncChanges}
                  onSaveChanges={handleSaveChanges}
                  hasUnsavedChanges={Object.keys(pendingChanges).length > 0}
                  isAutoSaving={isAutoSaving}
                />
             )}
          </div>
        </div>
        
        {/* Rules Configurator Modal */}
        <RuleConfigurator 
            isOpen={isRulesModalOpen}
            onClose={() => setIsRulesModalOpen(false)}
            rules={rules}
            onUpdateRules={handleRulesUpdate}
            currentReport={report?.extracted}
        />

        {/* Insurance Auditor Modal */}
        <InsuranceAuditor
            isOpen={isInsuranceAuditorOpen}
            onClose={() => setIsInsuranceAuditorOpen(false)}
        />
      </div>
    );
  }

  // Render: PROVIDER SELECTION SCREEN
  if (status === 'provider_selection') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col font-sans text-slate-900">
        <main className="flex-grow flex flex-col items-center justify-center p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-brand-100/50 rounded-full blur-3xl opacity-60"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-accent-100/40 rounded-full blur-3xl opacity-60"></div>
          </div>

          <div className="text-center mb-8 max-w-xl animate-slide-up relative z-10">
            <div className="inline-flex items-center justify-center p-1.5 bg-white rounded-2xl shadow-xl shadow-slate-200/60 mb-6 ring-1 ring-slate-100">
              <div className="px-4 py-2 bg-slate-50 rounded-xl flex items-center gap-3">
                <div className="p-1.5 bg-brand-600 rounded-lg">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Documento Cargado</span>
              </div>
            </div>
            
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Confirma la Aseguradora
            </h2>
            <p className="text-slate-500">
              Selecciona o confirma la aseguradora para procesar el documento correctamente.
            </p>
          </div>

          <div className="w-full max-w-md relative z-10 space-y-6">
            {isDetecting ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
                <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
                <p className="text-slate-600">Detectando aseguradora...</p>
              </div>
            ) : (
              <>
                <ProviderSelector
                  selectedProvider={selectedProvider}
                  onProviderChange={setSelectedProvider}
                  detectedProvider={detectedProvider}
                  confidence={detectionConfidence}
                  disabled={status === 'analyzing'}
                />

                <button
                  onClick={handleStartAnalysis}
                  disabled={selectedProvider === 'UNKNOWN'}
                  className={`w-full py-4 rounded-xl font-semibold text-white transition-all shadow-lg ${
                    selectedProvider === 'UNKNOWN'
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/30 hover:shadow-brand-500/50'
                  }`}
                >
                  Analizar Documento
                </button>

                <button
                  onClick={() => {
                    setStatus('idle');
                    setPendingFile(null);
                    setFilePreview(null);
                    setDetectedProvider(undefined);
                  }}
                  className="w-full py-3 text-slate-500 hover:text-slate-700 text-sm transition-colors"
                >
                  Cancelar y subir otro archivo
                </button>
              </>
            )}
          </div>

          {error && (
            <div className="mt-8 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 shadow-sm flex items-center max-w-md animate-fade-in relative z-10">
              <div className="mr-3 bg-red-100 p-2 rounded-full"><ShieldCheck className="w-4 h-4" /></div>
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Render: ANALYZING SCREEN
  if (status === 'analyzing') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col font-sans text-slate-900">
        <main className="flex-grow flex flex-col items-center justify-center p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-brand-100/50 rounded-full blur-3xl opacity-60"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-accent-100/40 rounded-full blur-3xl opacity-60"></div>
          </div>

          <div className="text-center relative z-10">
            <Loader2 className="w-16 h-16 text-brand-600 animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Analizando Documento</h2>
            <p className="text-slate-500">Extrayendo datos con IA de {selectedProvider}...</p>
          </div>
        </main>
      </div>
    );
  }

  // Render: ERROR SCREEN
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col font-sans text-slate-900">
        <main className="flex-grow flex flex-col items-center justify-center p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-red-100/50 rounded-full blur-3xl opacity-60"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-accent-100/40 rounded-full blur-3xl opacity-60"></div>
          </div>

          <div className="text-center max-w-md relative z-10">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Error al Procesar</h2>
            <p className="text-slate-500 mb-6">{error}</p>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  setStatus('provider_selection');
                  setError(null);
                }}
                className="w-full py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-colors"
              >
                Intentar con otra aseguradora
              </button>
              <button
                onClick={() => {
                  setStatus('idle');
                  setPendingFile(null);
                  setFilePreview(null);
                  setDetectedProvider(undefined);
                  setError(null);
                }}
                className="w-full py-3 text-slate-500 hover:text-slate-700 text-sm transition-colors"
              >
                Subir otro archivo
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Render: UPLOAD SCREEN (Default - idle)
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col font-sans text-slate-900 overflow-auto">
      {/* Subscription Notification Banner */}
      {subscriptionNotification && (
        <div className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 text-center font-medium shadow-lg transition-all ${
          subscriptionNotification.includes('cancelado') 
            ? 'bg-amber-100 text-amber-800 border-b border-amber-200' 
            : 'bg-green-100 text-green-800 border-b border-green-200'
        }`}>
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-3">
            <span>{subscriptionNotification}</span>
            <button 
              onClick={() => setSubscriptionNotification(null)}
              className="text-current opacity-60 hover:opacity-100 font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      {/* Header con logo y botones */}
      <header className={`sticky ${subscriptionNotification ? 'top-12' : 'top-0'} z-30 bg-gradient-to-b from-slate-50 to-transparent backdrop-blur-sm px-6 py-4 flex items-center justify-between`}>
        {/* Logo a la izquierda */}
        <div className="flex flex-col items-start">
          <img src="/attached_assets/Veryka_Logo_1767919213039.png" alt="Veryka.ai" className="h-12 object-contain" />
          <span className="text-[9px] font-bold text-veryka-dark uppercase tracking-widest mt-0.5">Auditoría Inteligente</span>
        </div>
        
        {/* Botones a la derecha */}
        <div className="flex items-center gap-2">
        <button 
          onClick={() => setIsInsuranceAuditorOpen(true)}
          className="text-xs text-purple-700 bg-white/90 backdrop-blur border border-purple-200 hover:bg-purple-50 hover:border-purple-300 font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20"
        >
          <Building2 className="w-4 h-4" />
          Auditoría de aseguradoras
        </button>
        <button 
          onClick={() => setIsRulesModalOpen(true)}
          className="text-xs text-brand-700 bg-white/90 backdrop-blur border border-brand-200 hover:bg-brand-50 hover:border-brand-300 font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-brand-500/10 hover:shadow-brand-500/20"
        >
          <Settings className="w-4 h-4" />
          Auditoría de reglas
        </button>
        
        {/* User Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="text-xs text-slate-700 bg-white/90 backdrop-blur border border-slate-200 hover:bg-slate-50 hover:border-slate-300 font-medium px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-slate-500/10"
          >
            <UserIcon className="w-4 h-4" />
            <span>{user?.nombre || user?.email || 'Usuario'}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isUserMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsUserMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-20">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs text-slate-500">Conectado como</p>
                  <p className="text-sm font-medium text-slate-700 truncate">{user?.email}</p>
                  {subscription ? (
                    <p className="text-xs text-green-600 mt-1">
                      Plan: {subscription.planConfig?.name || subscription.planType}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-600 mt-1">Sin suscripción activa</p>
                  )}
                </div>
                {usage && (
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs text-slate-500">Uso este mes</p>
                    <p className="text-sm font-medium">
                      {usage.reportsUsed} / {usage.isAdmin ? '∞' : usage.reportsLimit} informes
                    </p>
                    {usage.isAdmin ? (
                      <p className="text-xs text-veryka-cyan">Acceso ilimitado (Admin)</p>
                    ) : usage.extraReportsUsed > 0 && (
                      <p className="text-xs text-amber-600">
                        +{usage.extraReportsUsed} extras (${usage.extraChargesMxn} MXN)
                      </p>
                    )}
                  </div>
                )}
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsSubscriptionModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                >
                  <CreditCard className="w-4 h-4" />
                  {subscription ? 'Administrar suscripción' : 'Ver planes'}
                </button>
                {user?.rol === 'ADMIN' && (
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsBillingDashboardOpen(true);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-veryka-dark hover:bg-veryka-cyan/10 flex items-center gap-2 transition-colors"
                  >
                    <BarChart3 className="w-4 h-4" />
                    Panel de Facturación
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-6 pt-12 relative overflow-hidden">
        
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-brand-100/50 rounded-full blur-3xl opacity-60"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-accent-100/40 rounded-full blur-3xl opacity-60"></div>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-12 max-w-3xl animate-slide-up relative z-10">
          
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 mb-6 tracking-tight leading-tight">
            Valida Informes Médicos <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-brand-500 to-accent-600">con Precisión IA</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed font-light">
            Sube tu documento PDF o imagen. Nuestra IA extrae datos, valida reglas de 9 aseguradoras y calcula el riesgo de aprobación en segundos.
          </p>
        </div>
        
        <div className="w-full max-w-xl animate-fade-in delay-100 relative z-10">
          <FileUpload 
            onFileSelected={handleFileSelected} 
            isProcessing={false}
            savedReports={savedReports}
            onLoadReport={(id) => {
              const saved = savedReports.find(r => r.id === id);
              if (saved) handleLoadReport(saved);
            }}
          />
        </div>
        
        <div className="mt-auto pt-16 flex gap-8 text-slate-300 relative z-10">
             {/* Simulated Logos */}
             <div className="h-6 w-20 bg-current rounded opacity-40"></div>
             <div className="h-6 w-20 bg-current rounded opacity-40"></div>
             <div className="h-6 w-20 bg-current rounded opacity-40"></div>
             <div className="h-6 w-20 bg-current rounded opacity-40"></div>
        </div>
      </main>

      {/* Rules Configurator Modal */}
      <RuleConfigurator 
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        rules={rules}
        onUpdateRules={handleRulesUpdate}
        currentReport={null}
      />

      {/* Insurance Auditor Modal */}
      <InsuranceAuditor
        isOpen={isInsuranceAuditorOpen}
        onClose={() => setIsInsuranceAuditorOpen(false)}
      />

      {/* Subscription Plans Modal */}
      {isSubscriptionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative max-h-[90vh] overflow-auto">
            <SubscriptionPlans 
              currentSubscription={subscription}
              onClose={() => {
                setIsSubscriptionModalOpen(false);
                loadSubscription();
                loadUsage();
              }}
            />
          </div>
        </div>
      )}

      {/* Admin Billing Dashboard */}
      <AdminBillingDashboard
        isOpen={isBillingDashboardOpen}
        onClose={() => setIsBillingDashboardOpen(false)}
      />
    </div>
  );
};

export default App;