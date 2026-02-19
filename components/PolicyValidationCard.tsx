import React, { useState } from 'react';
import { Shield, CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronRight, Info, ExternalLink } from 'lucide-react';
import { PolicyValidationSummary, PolicyFinding, PolicyFindingSeverity } from '../types/policy-types';

interface PolicyValidationCardProps {
  validation: PolicyValidationSummary;
  onFindingClick?: (fieldPath: string) => void;
}

const SEVERITY_CONFIG: Record<PolicyFindingSeverity, { color: string; bgColor: string; borderColor: string; icon: React.ElementType; label: string }> = {
  CRITICO: { color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200', icon: XCircle, label: 'Cr\u00edtico' },
  IMPORTANTE: { color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', icon: AlertTriangle, label: 'Importante' },
  MODERADO: { color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', icon: AlertTriangle, label: 'Moderado' },
  INFORMATIVO: { color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', icon: Info, label: 'Informativo' },
};

function getScoreConfig(score: number) {
  if (score >= 85) return { color: 'text-emerald-600', strokeColor: 'stroke-emerald-500', bgGradient: 'from-emerald-50 to-emerald-100/50', label: 'COBERTURA CONFIRMADA', borderColor: 'border-emerald-200' };
  if (score >= 60) return { color: 'text-amber-600', strokeColor: 'stroke-amber-500', bgGradient: 'from-amber-50 to-amber-100/50', label: 'REVISAR COBERTURA', borderColor: 'border-amber-200' };
  return { color: 'text-red-600', strokeColor: 'stroke-red-500', bgGradient: 'from-red-50 to-red-100/50', label: 'COBERTURA RECHAZADA', borderColor: 'border-red-200' };
}

function ScoreGauge({ score, size = 100 }: { score: number; size?: number }) {
  const config = getScoreConfig(score);
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          className="stroke-slate-200" fill="none" strokeWidth="6"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          className={config.strokeColor} fill="none" strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-xl font-black ${config.color}`}>{score}</span>
        <span className="text-[8px] text-slate-400 uppercase">/ 100</span>
      </div>
    </div>
  );
}

function FindingCard({ finding, onFindingClick }: { finding: PolicyFinding; onFindingClick?: (path: string) => void }) {
  const config = SEVERITY_CONFIG[finding.severity];
  const Icon = config.icon;

  return (
    <div className={`p-2.5 rounded-lg border ${config.bgColor} ${config.borderColor} transition-all`}>
      <div className="flex items-start gap-2">
        <Icon className={`w-4 h-4 ${config.color} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold ${config.color}`}>{finding.title}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${config.bgColor} ${config.color} border ${config.borderColor}`}>
              {config.label}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{finding.description}</p>
          {finding.relatedFields && finding.relatedFields.length > 0 && onFindingClick && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {finding.relatedFields.map((field, i) => (
                <button
                  key={i}
                  onClick={() => onFindingClick(field)}
                  className="text-[9px] text-accent-600 hover:text-accent-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 hover:border-accent-300 transition-colors flex items-center gap-0.5"
                >
                  {field} <ExternalLink className="w-2.5 h-2.5" />
                </button>
              ))}
            </div>
          )}
          {finding.calculatedValues && Object.keys(finding.calculatedValues).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1.5">
              {Object.entries(finding.calculatedValues).map(([key, val]) => (
                <span key={key} className="text-[9px] text-slate-500 bg-white px-1.5 py-0.5 rounded">
                  {key.replace(/_/g, ' ')}: <strong>{typeof val === 'number' ? val.toLocaleString() : val}</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PolicyValidationCard({ validation, onFindingClick }: PolicyValidationCardProps) {
  const [showFindings, setShowFindings] = useState(true);
  const scoreConfig = getScoreConfig(validation.policyComplianceScore);

  const criticalCount = validation.findings.filter(f => f.severity === 'CRITICO').length;
  const importantCount = validation.findings.filter(f => f.severity === 'IMPORTANTE').length;

  return (
    <div className={`rounded-2xl shadow-lg border ${scoreConfig.borderColor} overflow-hidden bg-gradient-to-br ${scoreConfig.bgGradient} backdrop-blur-sm transition-all duration-500`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-veryka-dark" />
            <span className="text-sm font-bold text-veryka-dark">Validación de Póliza</span>
          </div>
          <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
            validation.policyComplianceScore >= 85 ? 'bg-emerald-100 text-emerald-700' :
            validation.policyComplianceScore >= 60 ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'
          }`}>
            {scoreConfig.label}
          </span>
        </div>

        {/* Scores */}
        <div className="flex items-center gap-4">
          <ScoreGauge score={validation.policyComplianceScore} size={90} />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Score Póliza</span>
              <span className={`text-sm font-black ${scoreConfig.color}`}>{validation.policyComplianceScore}/100</span>
            </div>
            {validation.combinedScore !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Score General</span>
                <span className="text-sm font-bold text-veryka-dark">{validation.combinedScore}/100</span>
              </div>
            )}
            {validation.medicalReportScore !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Score Informe</span>
                <span className="text-sm font-bold text-slate-600">{validation.medicalReportScore}/100</span>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              {criticalCount > 0 && (
                <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">
                  {criticalCount} crítico{criticalCount > 1 ? 's' : ''}
                </span>
              )}
              {importantCount > 0 && (
                <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">
                  {importantCount} importante{importantCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Deductible/coinsurance summary */}
        {(validation.deducibleEstimado || validation.coaseguroEstimado) && (
          <div className="mt-3 p-2 bg-white/60 rounded-lg">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estimación Paciente</span>
            <div className="flex gap-3 mt-1">
              {validation.deducibleEstimado !== undefined && (
                <span className="text-xs text-slate-600">
                  Deducible: <strong>${validation.deducibleEstimado.toLocaleString()}</strong>
                </span>
              )}
              {validation.coaseguroEstimado !== undefined && (
                <span className="text-xs text-slate-600">
                  Coaseguro: <strong>${validation.coaseguroEstimado.toLocaleString()}</strong>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Findings */}
      {validation.findings.length > 0 && (
        <div className="border-t border-white/40">
          <button
            onClick={() => setShowFindings(!showFindings)}
            className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/30 transition-colors"
          >
            <span className="text-xs font-bold text-slate-600">
              Hallazgos ({validation.findings.length})
            </span>
            {showFindings ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </button>

          {showFindings && (
            <div className="px-4 pb-4 space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar">
              {validation.findings
                .sort((a, b) => {
                  const order: Record<PolicyFindingSeverity, number> = { CRITICO: 0, IMPORTANTE: 1, MODERADO: 2, INFORMATIVO: 3 };
                  return order[a.severity] - order[b.severity];
                })
                .map((finding, i) => (
                  <FindingCard key={i} finding={finding} onFindingClick={onFindingClick} />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
