
import React, { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import RuleConfigurator from './components/RuleConfigurator';
import { analyzeReportImage, reEvaluateReport } from './services/geminiService';
import { DEFAULT_SCORING_RULES } from './services/scoring-engine';
import { AnalysisReport, AnalysisStatus, ExtractedData, ScoringRule } from './types';
import { Stethoscope, Eye, PanelRightClose, PanelRightOpen, ShieldCheck, FileText, ExternalLink, Settings, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<{data: string, type: string} | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  
  // State for Rules
  const [rules, setRules] = useState<ScoringRule[]>(DEFAULT_SCORING_RULES);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  // Convert Base64 to Blob URL for robust PDF rendering
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
    setStatus('analyzing');
    setError(null);
    setFilePreview({ data: base64Data, type: mimeType });
    
    try {
      const data = await analyzeReportImage(base64Data, mimeType, rules);
      setReport(data);
      setStatus('complete');
    } catch (err) {
      console.error(err);
      setError("Error al procesar el documento. Asegúrate de usar una API Key válida o intenta con una imagen más clara.");
      setStatus('error');
    }
  };

  const handleReevaluate = async (updatedData: ExtractedData) => {
    if (!report) return;
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

  // Render: SPLIT VIEW
  if (status === 'complete' || status === 're-evaluating') {
    return (
      <div className="h-screen flex flex-col bg-slate-50 overflow-hidden font-sans">
        {/* Navbar Compact */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 justify-between shrink-0 z-30 shadow-sm">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-600 to-brand-800 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/30">
                 <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-slate-800 tracking-tight text-sm hidden md:block">Evaluador Médico IA</span>
           </div>
           <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsRulesModalOpen(true)}
                className="text-xs text-brand-700 bg-brand-50 border border-brand-200 hover:bg-brand-100 hover:border-brand-300 font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 shadow-sm"
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
           </div>
        </header>

        {/* Main Split Area */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* LEFT PANE: SOURCE DOCUMENT */}
          <div 
            className={`bg-slate-900 relative transition-all duration-500 ease-in-out flex flex-col shadow-2xl z-10 ${isPanelOpen ? '' : 'w-0 opacity-0'}`}
            style={{ width: isPanelOpen ? '50%' : '0px', flex: 'none' }}
          >
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
               <div className="bg-black/60 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full flex items-center border border-white/10 shadow-lg">
                  <Eye className="w-3.5 h-3.5 mr-2 text-brand-400" /> 
                  <span className="font-medium tracking-wide">Documento Original</span>
               </div>
               {blobUrl && (
                  <a 
                    href={blobUrl} 
                    target="_blank"
                    rel="noreferrer"
                    className="bg-black/60 hover:bg-black/80 backdrop-blur text-white p-1.5 rounded-full flex items-center border border-white/10 shadow-lg transition-all hover:scale-105 cursor-pointer"
                    title="Abrir en nueva pestaña (Recomendado si no carga)"
                  >
                     <ExternalLink className="w-3.5 h-3.5 text-white" />
                  </a>
               )}
            </div>
            
            <div className="flex-1 w-full h-full bg-slate-900 flex items-center justify-center overflow-hidden p-0">
              {blobUrl ? (
                filePreview?.type === 'application/pdf' ? (
                  <object
                    data={blobUrl} // REMOVED query params to prevent chrome blocking
                    type="application/pdf"
                    className="w-full h-full block border-none bg-slate-800"
                  >
                     {/* Fallback content if PDF fails to load or is blocked */}
                     <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-900">
                        <FileText className="w-16 h-16 mb-4 opacity-30" />
                        <h3 className="text-lg font-semibold text-slate-300 mb-2">Vista previa no disponible</h3>
                        <p className="mb-6 max-w-xs text-sm text-slate-500">
                           Tu navegador bloqueó la visualización directa del PDF en este panel.
                        </p>
                        <a 
                          href={blobUrl} 
                          target="_blank"
                          rel="noreferrer"
                          className="px-5 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-lg font-medium text-sm flex items-center"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Abrir PDF en nueva pestaña
                        </a>
                     </div>
                  </object>
                ) : (
                  <div className="w-full h-full overflow-auto flex items-center justify-center p-8 bg-slate-900/50">
                      <img 
                        src={blobUrl} 
                        className="max-w-full max-h-full object-contain shadow-2xl"
                        alt="Medical Report"
                      />
                  </div>
                )
              ) : (
                 <div className="text-slate-500 flex flex-col items-center animate-pulse">
                    <FileText className="w-10 h-10 mb-2 opacity-50" />
                    <span className="text-xs">Cargando documento...</span>
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
        />
      </div>
    );
  }

  // Render: UPLOAD SCREEN (Default)
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col font-sans text-slate-900">
      <main className="flex-grow flex flex-col items-center justify-center p-6 relative overflow-hidden">
        
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-brand-100/50 rounded-full blur-3xl opacity-60"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-accent-100/40 rounded-full blur-3xl opacity-60"></div>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-12 max-w-3xl animate-slide-up relative z-10">
          <div className="inline-flex items-center justify-center p-1.5 bg-white rounded-2xl shadow-xl shadow-slate-200/60 mb-8 ring-1 ring-slate-100">
            <div className="px-4 py-2 bg-slate-50 rounded-xl flex items-center gap-3">
               <div className="p-1.5 bg-brand-600 rounded-lg">
                  <Stethoscope className="h-4 w-4 text-white" />
               </div>
               <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Auditoría Inteligente v2.0</span>
            </div>
          </div>
          
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
            isProcessing={status === 'analyzing'}
          />
        </div>

        {error && (
          <div className="mt-8 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 shadow-sm flex items-center max-w-md animate-fade-in relative z-10">
             <div className="mr-3 bg-red-100 p-2 rounded-full"><ShieldCheck className="w-4 h-4" /></div>
             <p className="text-sm font-medium">{error}</p>
          </div>
        )}
        
        <div className="mt-auto pt-16 flex gap-8 text-slate-300 relative z-10">
             {/* Simulated Logos */}
             <div className="h-6 w-20 bg-current rounded opacity-40"></div>
             <div className="h-6 w-20 bg-current rounded opacity-40"></div>
             <div className="h-6 w-20 bg-current rounded opacity-40"></div>
             <div className="h-6 w-20 bg-current rounded opacity-40"></div>
        </div>
      </main>
    </div>
  );
};

export default App;
