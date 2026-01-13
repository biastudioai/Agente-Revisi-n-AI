
import React from 'react';
import { ScoringResult, Flag } from '../types';
import { TrendingUp, TrendingDown, RefreshCw, Save, AlertCircle, AlertTriangle, CheckCircle2, XCircle, MousePointerClick, Send } from 'lucide-react';

interface ScoreCardProps {
  scoreData: ScoringResult;
  flags: Flag[];
  hasChanges: boolean;
  isReevaluating: boolean;
  onReevaluate: () => void;
  onIssueClick: (fieldPath: string) => void;
  onOpenReview: () => void;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ scoreData, flags, hasChanges, isReevaluating, onReevaluate, onIssueClick, onOpenReview }) => {
  const { finalScore, delta } = scoreData;
  
  // Determine Visual Status
  let colorBase = "text-red-600";
  let strokeColor = "#ef4444"; // red-500
  let statusText = "CRÍTICO";
  let bgGradient = "from-red-50 to-white";
  let statusIcon = <XCircle className="w-5 h-5 text-red-600" />;

  if (finalScore >= 85) {
    colorBase = "text-emerald-600";
    strokeColor = "#10b981"; // emerald-500
    statusText = "PRE-APROBADO";
    bgGradient = "from-emerald-50 to-white";
    statusIcon = <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
  } else if (finalScore >= 70) {
    colorBase = "text-amber-500";
    strokeColor = "#f59e0b"; // amber-500
    statusText = "REVISAR";
    bgGradient = "from-amber-50 to-white";
    statusIcon = <AlertTriangle className="w-5 h-5 text-amber-500" />;
  } else if (finalScore >= 50) {
    colorBase = "text-orange-600";
    strokeColor = "#f97316"; // orange-500
    statusText = "ALTO RIESGO";
    bgGradient = "from-orange-50 to-white";
    statusIcon = <AlertTriangle className="w-5 h-5 text-orange-600" />;
  }

  // Filter errors
  const criticalErrors = flags.filter(f => f.type === "ERROR_CRÍTICO");
  const warnings = flags.filter(f => f.type === "ALERTA");
  const observations = flags.filter(f => f.type === "OBSERVACIÓN");
  const notes = flags.filter(f => f.type === "NOTA");
  const allIssues = [...criticalErrors, ...warnings, ...observations, ...notes];

  // Gauge Calculation
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - ((Math.max(0, Math.min(100, finalScore)) / 100) * circumference);

  return (
    <div className={`rounded-2xl shadow-lg border border-white/60 overflow-hidden bg-gradient-to-br ${bgGradient} backdrop-blur-sm transition-all duration-500 relative`}>
      
      {/* HEADER: GAUGE & SCORE */}
      <div className="p-6 flex flex-col items-center relative">
        
        {/* Send Review Button (Top Left) */}
        <div className="absolute top-4 left-4 z-10">
           <button
              onClick={onOpenReview}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-white/80 hover:bg-accent-50 border border-white/50 hover:border-accent-200 shadow-sm text-veryka-dark transition-all transform hover:scale-110"
              title="Enviar Revisión"
           >
              <Send className="w-4 h-4" />
           </button>
        </div>

        {/* Re-evaluate Button (Top Right) */}
        {hasChanges && (
            <div className="absolute top-4 right-4 z-10">
                 <button
                    onClick={onReevaluate}
                    disabled={isReevaluating}
                    className={`
                        flex items-center px-3 py-2 rounded-veryka text-xs font-bold text-white shadow-lg shadow-accent-500/30 transition-all transform
                        ${isReevaluating ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-veryka-dark to-veryka-cyan hover:scale-105 active:scale-95'}
                    `}
                    >
                    {isReevaluating ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <>
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                        Actualizar
                        </>
                    )}
                </button>
            </div>
        )}

        {/* Gauge Chart */}
        <div className="relative w-40 h-40">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                {/* Background Circle */}
                <circle
                    className="text-gray-200"
                    strokeWidth="6"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="40"
                    cy="40"
                />
                {/* Progress Circle */}
                <circle
                    className="transition-all duration-1000 ease-out"
                    strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke={strokeColor}
                    fill="transparent"
                    r={radius}
                    cx="40"
                    cy="40"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${colorBase} tracking-tighter`}>{finalScore}%</span>
                <span className="text-[10px] text-gray-400 uppercase font-medium tracking-widest mt-1">Score</span>
            </div>
        </div>

        {/* Status & Delta */}
        <div className="mt-2 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
                {statusIcon}
                <span className={`text-sm font-bold tracking-wider ${colorBase}`}>{statusText}</span>
            </div>
            
            {delta !== undefined && delta !== 0 && (
            <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${delta > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {delta > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {delta > 0 ? '+' : ''}{delta} pts
            </div>
            )}
        </div>
      </div>

      {/* ISSUES LIST (CHIPS STYLE) */}
      {allIssues.length > 0 && (
        <div className="px-5 pb-5">
          <div className="flex items-center mb-3">
            <AlertCircle className="w-4 h-4 text-gray-500 mr-2" />
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Hallazgos Detectados</h3>
          </div>

          <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
            {allIssues.map((issue, idx) => {
              const isCritical = issue.type === "ERROR_CRÍTICO";
              const isWarning = issue.type === "ALERTA";
              const isObservation = issue.type === "OBSERVACIÓN";
              const hasLink = !!issue.fieldPath;
              
              let bgClass = "bg-slate-50/50 border-slate-100";
              let textClass = "text-slate-600";
              let badgeClass = "bg-white border-slate-200 text-slate-500";
              let label = "Info";

              if (isCritical) {
                  bgClass = "bg-red-50/50 border-red-100";
                  textClass = "text-red-700";
                  badgeClass = "bg-white border-red-200 text-red-600";
                  label = "Crit";
              } else if (isWarning) {
                  bgClass = "bg-amber-50/50 border-amber-100";
                  textClass = "text-amber-700";
                  badgeClass = "bg-white border-amber-200 text-amber-600";
                  label = "Alert";
              } else if (isObservation) {
                  bgClass = "bg-blue-50/50 border-blue-100";
                  textClass = "text-blue-700";
                  badgeClass = "bg-white border-blue-200 text-blue-600";
                  label = "Nota";
              }

              return (
                <div 
                    key={idx} 
                    onClick={() => hasLink && issue.fieldPath && onIssueClick(issue.fieldPath)}
                    className={`
                        group p-3 rounded-xl border text-left transition-all hover:shadow-md 
                        ${bgClass}
                        ${hasLink ? 'cursor-pointer hover:ring-1 hover:ring-brand-300 relative overflow-hidden' : ''}
                    `}
                >
                   {hasLink && (
                        <div className="absolute inset-0 bg-brand-500/0 group-hover:bg-brand-500/5 transition-colors pointer-events-none" />
                   )}
                  <div className="flex justify-between items-start mb-1 relative z-10">
                    <span className={`text-xs font-bold ${textClass} flex items-center`}>
                      {issue.rule}
                      {hasLink && <MousePointerClick className="w-3 h-3 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-brand-500" />}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${badgeClass}`}>
                      {label}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-snug relative z-10">
                    {issue.message}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      <div className="p-4 text-center border-t border-gray-100/50 bg-white/40">
        <p className="text-[10px] text-gray-500 font-medium mb-1.5">
          Scoring Híbrido impulsado por IA
        </p>
        <p className="text-[9px] text-gray-400 leading-relaxed italic">
          Este análisis debe ser validado por un auditor(a). Se recomienda contrastar con el documento original para garantizar la precisión de la extracción.
        </p>
      </div>
    </div>
  );
};

export default ScoreCard;
