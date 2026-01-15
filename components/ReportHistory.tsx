import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Calendar, Building2, User, TrendingUp, Eye, Loader2, ChevronLeft, RefreshCw, Search, Check, ChevronDown, Filter } from 'lucide-react';

interface Report {
  id: string;
  patientName: string;
  broker: string;
  approvalScore: number;
  processedAt: string;
  status: string;
  pdfUrl: string | null;
  userRole: string;
  creatorName: string | null;
  creatorEmail: string | null;
}

interface ReportHistoryProps {
  onViewReport: (reportId: string) => void;
  onBack: () => void;
}

const ReportHistory: React.FC<ReportHistoryProps> = ({ onViewReport, onBack }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [patientSearch, setPatientSearch] = useState('');
  const [creatorSearch, setCreatorSearch] = useState('');
  const [selectedBrokers, setSelectedBrokers] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<'all' | '7days' | '30days' | '6months' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isBrokerFilterOpen, setIsBrokerFilterOpen] = useState(false);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/forms/reports', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar los informes');
      }
      
      const data = await response.json();
      setReports(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los informes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const uniqueBrokers = useMemo(() => {
    const brokers = new Set(reports.map(r => r.broker).filter(Boolean));
    return Array.from(brokers).sort();
  }, [reports]);

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      // Patient name filter
      if (patientSearch && !report.patientName.toLowerCase().includes(patientSearch.toLowerCase())) {
        return false;
      }

      // Creator filter
      if (creatorSearch) {
        const creatorName = report.creatorName?.toLowerCase() || '';
        const creatorEmail = report.creatorEmail?.toLowerCase() || '';
        if (!creatorName.includes(creatorSearch.toLowerCase()) && !creatorEmail.includes(creatorSearch.toLowerCase())) {
          return false;
        }
      }

      // Broker filter
      if (selectedBrokers.length > 0 && !selectedBrokers.includes(report.broker)) {
        return false;
      }

      // Date filter
      if (dateRange !== 'all') {
        const reportDate = new Date(report.processedAt);
        const now = new Date();
        
        if (dateRange === '7days') {
          const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
          if (reportDate < sevenDaysAgo) return false;
        } else if (dateRange === '30days') {
          const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
          if (reportDate < thirtyDaysAgo) return false;
        } else if (dateRange === '6months') {
          const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6));
          if (reportDate < sixMonthsAgo) return false;
        } else if (dateRange === 'custom') {
          if (customStartDate && reportDate < new Date(customStartDate)) return false;
          if (customEndDate) {
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            if (reportDate > end) return false;
          }
        }
      }

      return true;
    });
  }, [reports, patientSearch, creatorSearch, selectedBrokers, dateRange, customStartDate, customEndDate]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600 bg-emerald-50';
    if (score >= 50) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return 'Aprobado';
    if (score >= 50) return 'En Revisión';
    return 'Crítico';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
          <span className="text-slate-600 font-medium">Cargando historial...</span>
        </div>
      </div>
    );
  }

  const isAdmin = reports[0]?.userRole === 'ADMIN';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="font-medium">Volver</span>
              </button>
              <div className="h-6 w-px bg-slate-200" />
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-600" />
                <h1 className="text-lg font-semibold text-slate-900">Historial de Informes Procesados</h1>
              </div>
            </div>
            <button
              onClick={fetchReports}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters Section */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Patient Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por paciente..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
              />
            </div>

            {/* Creator Search (Admin Only) */}
            {isAdmin && (
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por creador/auditor..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                  value={creatorSearch}
                  onChange={(e) => setCreatorSearch(e.target.value)}
                />
              </div>
            )}

            {/* Broker Checkbox Filter */}
            <div className="relative">
              <button
                onClick={() => setIsBrokerFilterOpen(!isBrokerFilterOpen)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm flex items-center justify-between hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2 text-slate-600">
                  <Building2 className="w-4 h-4" />
                  <span>{selectedBrokers.length === 0 ? 'Todas las Aseguradoras' : `${selectedBrokers.length} seleccionadas`}</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${isBrokerFilterOpen ? 'rotate-180' : ''}`} />
              </button>

              {isBrokerFilterOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-2 max-h-60 overflow-y-auto">
                  <div className="flex items-center justify-between px-2 py-1 mb-2 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Aseguradoras</span>
                    <button 
                      onClick={() => setSelectedBrokers([])}
                      className="text-xs text-cyan-600 hover:text-cyan-700 font-medium"
                    >
                      Limpiar
                    </button>
                  </div>
                  {uniqueBrokers.map(broker => (
                    <label 
                      key={broker}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedBrokers.includes(broker) ? 'bg-cyan-500 border-cyan-500' : 'bg-white border-slate-300'}`}>
                        {selectedBrokers.includes(broker) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={selectedBrokers.includes(broker)}
                        onChange={() => {
                          setSelectedBrokers(prev => 
                            prev.includes(broker) 
                              ? prev.filter(b => b !== broker)
                              : [...prev, broker]
                          );
                        }}
                      />
                      <span className="text-sm text-slate-700">{broker}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Date Range Filter */}
            <div className="relative">
              <button
                onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm flex items-center justify-between hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {dateRange === 'all' ? 'Todas las fechas' :
                     dateRange === '7days' ? 'Últimos 7 días' :
                     dateRange === '30days' ? 'Últimos 30 días' :
                     dateRange === '6months' ? 'Últimos 6 meses' : 'Fecha personalizada'}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${isDateFilterOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDateFilterOpen && (
                <div className="absolute top-full right-0 w-64 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-2">
                  {[
                    { id: 'all', label: 'Todas las fechas' },
                    { id: '7days', label: 'Últimos 7 días' },
                    { id: '30days', label: 'Últimos 30 días' },
                    { id: '6months', label: 'Últimos 6 meses' },
                    { id: 'custom', label: 'Fecha personalizada' },
                  ].map(option => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setDateRange(option.id as any);
                        if (option.id !== 'custom') setIsDateFilterOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${dateRange === option.id ? 'bg-cyan-50 text-cyan-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                  
                  {dateRange === 'custom' && (
                    <div className="mt-2 p-2 border-t border-slate-100 space-y-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Inicio</label>
                        <input
                          type="date"
                          className="w-full mt-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-cyan-500"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Fin</label>
                        <input
                          type="date"
                          className="w-full mt-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-cyan-500"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                        />
                      </div>
                      <button
                        onClick={() => setIsDateFilterOpen(false)}
                        className="w-full mt-2 py-1.5 bg-cyan-600 text-white text-xs font-bold rounded-lg hover:bg-cyan-700 transition-colors"
                      >
                        Aplicar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={fetchReports}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Filter className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No se encontraron resultados</h3>
            <p className="text-slate-500">Prueba ajustando los filtros de búsqueda.</p>
            {(patientSearch || creatorSearch || selectedBrokers.length > 0 || dateRange !== 'all') && (
              <button
                onClick={() => {
                  setPatientSearch('');
                  setCreatorSearch('');
                  setSelectedBrokers([]);
                  setDateRange('all');
                }}
                className="mt-4 text-cyan-600 font-medium hover:text-cyan-700"
              >
                Limpiar todos los filtros
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        ID del Informe
                      </div>
                    </th>
                    {isAdmin && (
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Creador
                        </div>
                      </th>
                    )}
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Nombre del Paciente
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Broker Asignado
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        % Aprobación
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Fecha de Procesamiento
                      </div>
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReports.map((report) => (
                    <tr 
                      key={report.id} 
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                      onClick={() => onViewReport(report.id)}
                    >
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded">
                          {report.id.slice(0, 8)}...
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-900">
                              {report.creatorName}
                            </span>
                            <span className="text-xs text-slate-400">
                              {report.creatorEmail}
                            </span>
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-900">
                          {report.patientName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600 bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">
                          {report.broker}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${getScoreColor(report.approvalScore)}`}>
                            {Math.round(report.approvalScore)}%
                          </span>
                          <span className={`text-xs ${getScoreColor(report.approvalScore).split(' ')[0]}`}>
                            {getScoreLabel(report.approvalScore)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600">
                          {formatDate(report.processedAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewReport(report.id);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-cyan-700 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
              <p className="text-sm text-slate-500">
                Mostrando {filteredReports.length} informe{filteredReports.length !== 1 ? 's' : ''} procesado{filteredReports.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ReportHistory;
