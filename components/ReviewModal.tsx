
import React, { useState } from 'react';
import { X, Send, Download, CheckCircle2, AlertTriangle, XCircle, Loader2, AlertCircle, FileText, MousePointerClick } from 'lucide-react';
import { AnalysisReport } from '../types';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: AnalysisReport;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ isOpen, onClose, report }) => {
  const [email, setEmail] = useState('');
  const [comments, setComments] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  if (!isOpen) return null;

  const generatePDFBytes = async (): Promise<Uint8Array> => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      return rgb(r, g, b);
    };

    const wrapText = (text: string, maxWidth: number, size: number, font: any) => {
      const words = text.split(' ');
      let lines: string[] = [];
      let currentLine = words[0] || '';
      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const testWidth = font.widthOfTextAtSize(currentLine + " " + word, size);
        if (testWidth < maxWidth) {
          currentLine += " " + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
      lines.push(currentLine);
      return lines;
    };

    const slate50 = hexToRgb('#f8fafc');
    const slate200 = hexToRgb('#e2e8f0');
    const slate400 = hexToRgb('#94a3b8');
    const slate500 = hexToRgb('#64748b');
    const slate700 = hexToRgb('#334155');
    const slate800 = hexToRgb('#1e293b');
    const white = hexToRgb('#ffffff');

    const isApprovedPdf = report.score.finalScore >= 85;
    const isRejectedPdf = report.score.finalScore < 50;
    
    let primaryColor = hexToRgb('#d97706');
    let lightBgColor = hexToRgb('#fffbeb');
    let statusTextPdf = "REVISIÓN REQUERIDA";

    if (isApprovedPdf) {
      primaryColor = hexToRgb('#059669');
      lightBgColor = hexToRgb('#ecfdf5');
      statusTextPdf = "PRE-APROBADO";
    } else if (isRejectedPdf) {
      primaryColor = hexToRgb('#dc2626');
      lightBgColor = hexToRgb('#fef2f2');
      statusTextPdf = "ALTO RIESGO";
    }

    let y = height - 40;
    const margin = 40;
    
    try {
      const logoUrl = '/attached_assets/Veryka_Logo_1767919213039.png';
      const logoImageBytes = await fetch(logoUrl).then(res => res.arrayBuffer());
      const logoImage = await pdfDoc.embedPng(logoImageBytes);
      const logoDims = logoImage.scale(0.15);
      page.drawImage(logoImage, {
        x: margin,
        y: y - (logoDims.height / 2),
        width: logoDims.width,
        height: logoDims.height,
      });
    } catch (e) {
      console.error("Error drawing logo image", e);
      page.drawText("VERYKA.AI", { x: margin, y, size: 20, font: fontBold, color: hexToRgb('#1A2B56') });
    }
    
    page.drawText("REPORTE DE AUDITORÍA", { x: margin, y: y - 50, size: 16, font: fontBold, color: slate800 });
    page.drawText(`Generado: ${new Date().toLocaleDateString()}`, { x: width - margin - 100, y: y - 50, size: 10, font: fontRegular, color: slate500 });
    y -= 80;

    page.drawRectangle({
      x: margin, y: y - 80, width: width - (margin * 2), height: 80,
      color: lightBgColor, borderColor: primaryColor, borderWidth: 1,
    });

    page.drawText(statusTextPdf, { x: margin + 20, y: y - 35, size: 18, font: fontBold, color: primaryColor });
    page.drawText("ESTADO DE VALIDACIÓN", { x: margin + 20, y: y - 55, size: 8, font: fontBold, color: primaryColor });

    const scoreText = report.score.finalScore.toString();
    const scoreWidth = fontBold.widthOfTextAtSize(scoreText, 40);
    page.drawText(scoreText, { x: width - margin - scoreWidth - 40, y: y - 50, size: 40, font: fontBold, color: primaryColor });
    page.drawText("/ 100", { x: width - margin - 35, y: y - 45, size: 12, font: fontBold, color: primaryColor, opacity: 0.6 });
    y -= 100;

    const leftColX = margin;
    const leftColWidth = (width - (margin * 2)) * 0.60;
    const rightColX = leftColX + leftColWidth + 20;
    const rightColWidth = (width - (margin * 2)) * 0.35;
    let leftY = y;
    let rightY = y;

    page.drawRectangle({ x: rightColX - 10, y: 50, width: rightColWidth + 10, height: y - 50, color: slate50 });

    page.drawText("INFORMACIÓN DEL CASO", { x: rightColX, y: rightY, size: 9, font: fontBold, color: slate400 });
    rightY -= 15;

    const infoFields = [
      { label: "Paciente", val: `${report.extracted.identificacion?.nombres || ''} ${report.extracted.identificacion?.primer_apellido || ''}` },
      { label: "Hospital", val: report.extracted.hospital?.nombre_hospital || "N/A" },
      { label: "Médico", val: report.extracted.medico_tratante?.nombres || "N/A" },
      { label: "Póliza", val: report.extracted.tramite?.numero_poliza || "N/A" }
    ];

    infoFields.forEach(field => {
      page.drawText(field.label.toUpperCase(), { x: rightColX, y: rightY, size: 7, font: fontBold, color: slate400 });
      rightY -= 10;
      const lines = wrapText(field.val, rightColWidth, 10, fontRegular);
      lines.forEach(line => {
        page.drawText(line, { x: rightColX, y: rightY, size: 10, font: fontRegular, color: slate700 });
        rightY -= 12;
      });
      rightY -= 5;
    });

    rightY -= 10;
    page.drawLine({ start: { x: rightColX, y: rightY }, end: { x: rightColX + rightColWidth, y: rightY }, thickness: 1, color: slate200 });
    rightY -= 20;

    page.drawText("ENVIADO A", { x: rightColX, y: rightY, size: 9, font: fontBold, color: slate400 });
    rightY -= 15;
    page.drawText(email || "No especificado", { x: rightColX, y: rightY, size: 10, font: fontRegular, color: slate700 });
    rightY -= 30;

    if (comments) {
      page.drawText("COMENTARIOS DEL REVISOR", { x: rightColX, y: rightY, size: 9, font: fontBold, color: slate400 });
      rightY -= 15;
      const commentLines = wrapText(comments, rightColWidth, 9, fontRegular);
      commentLines.forEach(line => {
        page.drawText(line, { x: rightColX, y: rightY, size: 9, font: fontRegular, color: slate700 });
        rightY -= 12;
      });
    }

    page.drawText("HALLAZGOS DETECTADOS", { x: leftColX, y: leftY, size: 10, font: fontBold, color: slate500 });
    leftY -= 20;

    if (report.flags.length === 0) {
      page.drawText("No se detectaron hallazgos negativos.", { x: leftColX, y: leftY, size: 10, font: fontRegular, color: slate500 });
    }

    report.flags.forEach(issue => {
      let badgeColor = hexToRgb('#93c5fd');
      let badgeText = "DISCRETO";
      if (issue.type === 'ERROR_CRÍTICO') { badgeColor = hexToRgb('#ef4444'); badgeText = "CRÍTICO"; }
      else if (issue.type === 'ALERTA') { badgeColor = hexToRgb('#f59e0b'); badgeText = "IMPORTANTE"; }
      else if (issue.type === 'OBSERVACIÓN') { badgeColor = hexToRgb('#fb923c'); badgeText = "MODERADO"; }

      page.drawRectangle({ x: leftColX, y: leftY - 2, width: 50, height: 12, color: badgeColor });
      page.drawText(badgeText, { x: leftColX + 5, y: leftY + 1, size: 7, font: fontBold, color: white });
      page.drawText(issue.rule, { x: leftColX + 60, y: leftY, size: 10, font: fontBold, color: slate700 });
      leftY -= 14;

      const descLines = wrapText(issue.message, leftColWidth, 9, fontRegular);
      descLines.forEach(line => {
        page.drawText(line, { x: leftColX, y: leftY, size: 9, font: fontRegular, color: slate500 });
        leftY -= 11;
      });
      leftY -= 12;
    });

    const footerY = 30;
    page.drawLine({ start: { x: margin, y: footerY + 10 }, end: { x: width - margin, y: footerY + 10 }, thickness: 0.5, color: slate200 });
    page.drawText("VERYKA.AI - Documento Confidencial", { x: margin, y: footerY, size: 8, font: fontRegular, color: slate500 });

    return await pdfDoc.save();
  };

  const handleSend = async () => {
    if (!email) return;
    setIsSending(true);
    setSendError(null);
    
    try {
      const isApprovedStatus = report.score.finalScore >= 85;
      const isRejectedStatus = report.score.finalScore < 50;
      
      let statusText = "REVISIÓN REQUERIDA";
      if (isApprovedStatus) statusText = "PRE-APROBADO";
      else if (isRejectedStatus) statusText = "ALTO RIESGO";

      const pdfBytes = await generatePDFBytes();
      // Convert Uint8Array to base64 in chunks to avoid stack overflow
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < pdfBytes.length; i += chunkSize) {
        const chunk = pdfBytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
      }
      const pdfBase64 = btoa(binary);

      const response = await fetch('/api/reports/send-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientEmail: email,
          patientName: `${report.extracted.identificacion?.nombres || ''} ${report.extracted.identificacion?.primer_apellido || ''}`.trim() || 'No especificado',
          hospital: report.extracted.hospital?.nombre_hospital || 'No especificado',
          doctor: report.extracted.medico_tratante?.nombres || 'No especificado',
          policyNumber: report.extracted.tramite?.numero_poliza || 'No especificado',
          score: report.score.finalScore,
          status: statusText,
          findings: report.flags.map(f => ({
            type: f.type,
            rule: f.rule,
            message: f.message
          })),
          comments: comments || undefined,
          pdfBase64
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIsSending(false);
        setSentSuccess(true);
        
        setTimeout(() => {
          setSentSuccess(false);
          onClose();
          setEmail('');
          setComments('');
        }, 2000);
      } else {
        throw new Error(result.error || 'Error al enviar el reporte');
      }
    } catch (error) {
      setIsSending(false);
      setSendError(error instanceof Error ? error.message : 'Error al enviar el reporte');
    }
  };

  const generateAndDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Helpers
      const hexToRgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return rgb(r, g, b);
      };

      const wrapText = (text: string, maxWidth: number, size: number, font: any) => {
        const words = text.split(' ');
        let lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = font.widthOfTextAtSize(currentLine + " " + word, size);
            if (width < maxWidth) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
      };

      // --- COLORS ---
      const slate50 = hexToRgb('#f8fafc');
      const slate100 = hexToRgb('#f1f5f9');
      const slate200 = hexToRgb('#e2e8f0');
      const slate400 = hexToRgb('#94a3b8');
      const slate500 = hexToRgb('#64748b');
      const slate700 = hexToRgb('#334155');
      const slate800 = hexToRgb('#1e293b');
      const white = hexToRgb('#ffffff');

      // Status Colors
      const isApproved = report.score.finalScore >= 85;
      const isRejected = report.score.finalScore < 50;
      
      let primaryColor = hexToRgb('#d97706'); // Amber
      let lightBgColor = hexToRgb('#fffbeb'); // Amber 50
      let statusText = "REVISIÓN REQUERIDA";

      if (isApproved) {
        primaryColor = hexToRgb('#059669'); // Emerald
        lightBgColor = hexToRgb('#ecfdf5'); // Emerald 50
        statusText = "PRE-APROBADO";
      } else if (isRejected) {
        primaryColor = hexToRgb('#dc2626'); // Red
        lightBgColor = hexToRgb('#fef2f2'); // Red 50
        statusText = "ALTO RIESGO";
      }

      let y = height - 40;
      const margin = 40;
      
      // --- HEADER ---
      // Draw Logo (Veryka.ai)
      try {
        const logoUrl = '/attached_assets/Veryka_Logo_1767919213039.png';
        const logoImageBytes = await fetch(logoUrl).then(res => res.arrayBuffer());
        const logoImage = await pdfDoc.embedPng(logoImageBytes);
        const logoDims = logoImage.scale(0.15); // Adjust scale as needed
        page.drawImage(logoImage, {
          x: margin,
          y: y - (logoDims.height / 2),
          width: logoDims.width,
          height: logoDims.height,
        });
      } catch (e) {
        console.error("Error drawing logo image", e);
        // Fallback to text if image fails
        page.drawText("VERYKA.AI", { x: margin, y, size: 20, font: fontBold, color: hexToRgb('#1A2B56') });
      }

      page.drawText("REPORTE DE AUDITORÍA", { x: margin, y: y - 50, size: 16, font: fontBold, color: slate800 });
      page.drawText(`Generado: ${new Date().toLocaleDateString()}`, { x: width - margin - 100, y: y - 50, size: 10, font: fontRegular, color: slate500 });
      y -= 80;

      // --- SCORE CARD BANNER (Full Width) ---
      // Background Rect
      page.drawRectangle({
          x: margin,
          y: y - 80,
          width: width - (margin * 2),
          height: 80,
          color: lightBgColor,
          borderColor: primaryColor,
          borderWidth: 1,
      });

      // Score Content
      page.drawText(statusText, { x: margin + 20, y: y - 35, size: 18, font: fontBold, color: primaryColor });
      page.drawText("ESTADO DE VALIDACIÓN", { x: margin + 20, y: y - 55, size: 8, font: fontBold, color: primaryColor });

      const scoreText = report.score.finalScore.toString();
      const scoreWidth = fontBold.widthOfTextAtSize(scoreText, 40);
      page.drawText(scoreText, { x: width - margin - scoreWidth - 40, y: y - 50, size: 40, font: fontBold, color: primaryColor });
      page.drawText("/ 100", { x: width - margin - 35, y: y - 45, size: 12, font: fontBold, color: primaryColor, opacity: 0.6 });

      y -= 100;

      // --- LAYOUT COLUMNS ---
      const leftColX = margin;
      const leftColWidth = (width - (margin * 2)) * 0.60; // 60%
      const rightColX = leftColX + leftColWidth + 20;
      const rightColWidth = (width - (margin * 2)) * 0.35; // 35%
      
      let leftY = y;
      let rightY = y;

      // --- RIGHT COLUMN (Sidebar Style) ---
      // Background for Sidebar
      page.drawRectangle({
          x: rightColX - 10,
          y: 50, // extend to bottom
          width: rightColWidth + 10,
          height: y - 50,
          color: slate50,
      });

      // 1. INFO DEL CASO
      page.drawText("INFORMACIÓN DEL CASO", { x: rightColX, y: rightY, size: 9, font: fontBold, color: slate400 });
      rightY -= 15;

      const infoFields = [
        { label: "Paciente", val: `${report.extracted.identificacion?.nombres || ''} ${report.extracted.identificacion?.primer_apellido || ''}` },
        { label: "Hospital", val: report.extracted.hospital?.nombre_hospital || "N/A" },
        { label: "Médico", val: report.extracted.medico_tratante?.nombres || "N/A" },
        { label: "Póliza", val: report.extracted.tramite?.numero_poliza || "N/A" }
      ];

      infoFields.forEach(field => {
          page.drawText(field.label.toUpperCase(), { x: rightColX, y: rightY, size: 7, font: fontBold, color: slate400 });
          rightY -= 10;
          
          const lines = wrapText(field.val, rightColWidth, 10, fontRegular);
          lines.forEach(line => {
             page.drawText(line, { x: rightColX, y: rightY, size: 10, font: fontRegular, color: slate700 });
             rightY -= 12;
          });
          rightY -= 5;
      });

      rightY -= 10;
      // Separator
      page.drawLine({ start: { x: rightColX, y: rightY }, end: { x: rightColX + rightColWidth, y: rightY }, thickness: 1, color: slate200 });
      rightY -= 20;

      // 2. DESTINATARIO
      page.drawText("ENVIADO A", { x: rightColX, y: rightY, size: 9, font: fontBold, color: slate400 });
      rightY -= 15;
      page.drawText(email || "No especificado", { x: rightColX, y: rightY, size: 10, font: fontRegular, color: slate700 });
      rightY -= 30;

      // 3. COMENTARIOS
      if (comments) {
          page.drawText("COMENTARIOS DEL REVISOR", { x: rightColX, y: rightY, size: 9, font: fontBold, color: slate400 });
          rightY -= 15;
          const commentLines = wrapText(comments, rightColWidth, 9, fontRegular);
          commentLines.forEach(line => {
              page.drawText(line, { x: rightColX, y: rightY, size: 9, font: fontRegular, color: slate700 });
              rightY -= 12;
          });
      }

      // --- LEFT COLUMN (Findings) ---
      page.drawText("HALLAZGOS DETECTADOS", { x: leftColX, y: leftY, size: 10, font: fontBold, color: slate500 });
      leftY -= 20;

      const issues = report.flags;

      if (issues.length === 0) {
          page.drawText("No se detectaron hallazgos negativos.", { x: leftColX, y: leftY, size: 10, font: fontRegular, color: slate500 });
      }

      issues.forEach(issue => {
        let badgeColor = hexToRgb('#93c5fd');
        let badgeText = "DISCRETO";
        
        if (issue.type === 'ERROR_CRÍTICO') {
            badgeColor = hexToRgb('#ef4444');
            badgeText = "CRÍTICO";
        } else if (issue.type === 'ALERTA') {
             badgeColor = hexToRgb('#f59e0b');
             badgeText = "IMPORTANTE";
        } else if (issue.type === 'OBSERVACIÓN') {
             badgeColor = hexToRgb('#fb923c');
             badgeText = "MODERADO";
        }

        // Draw Badge (Rect + Text)
        page.drawRectangle({ x: leftColX, y: leftY - 2, width: 50, height: 12, color: badgeColor });
        page.drawText(badgeText, { x: leftColX + 5, y: leftY + 1, size: 7, font: fontBold, color: white });

        // Rule Name
        page.drawText(issue.rule, { x: leftColX + 60, y: leftY, size: 10, font: fontBold, color: slate700 });
        leftY -= 14;

        // Description
        const descLines = wrapText(issue.message, leftColWidth, 9, fontRegular);
        descLines.forEach(line => {
             page.drawText(line, { x: leftColX, y: leftY, size: 9, font: fontRegular, color: slate500 });
             leftY -= 11;
        });

        leftY -= 12; // Spacing between items
      });

      // --- FOOTER ---
      const footerY = 30;
      page.drawLine({ start: { x: margin, y: footerY + 10 }, end: { x: width - margin, y: footerY + 10 }, thickness: 0.5, color: slate200 });
      page.drawText("Evaluador Médico IA - Documento Confidencial", { x: margin, y: footerY, size: 8, font: fontRegular, color: slate500 });


      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Reporte_GNP_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Error generating PDF", e);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Determine status color/icon
  const isApproved = report.score.finalScore >= 85;
  const isRejected = report.score.finalScore < 50;
  
  let statusColor = "text-amber-500";
  let statusBg = "bg-amber-50 border-amber-200";
  let StatusIcon = AlertTriangle;
  let statusText = "REVISIÓN REQUERIDA";

  if (isApproved) {
    statusColor = "text-emerald-600";
    statusBg = "bg-emerald-50 border-emerald-200";
    StatusIcon = CheckCircle2;
    statusText = "PRE-APROBADO";
  } else if (isRejected) {
    statusColor = "text-red-600";
    statusBg = "bg-red-50 border-red-200";
    StatusIcon = XCircle;
    statusText = "ALTO RIESGO";
  }

  // Filter issues for display
  const criticalErrors = report.flags.filter(f => f.type === "ERROR_CRÍTICO");
  const warnings = report.flags.filter(f => f.type === "ALERTA");
  const observations = report.flags.filter(f => f.type === "OBSERVACIÓN");
  const notes = report.flags.filter(f => f.type === "NOTA");
  const allIssues = [...criticalErrors, ...warnings, ...observations, ...notes];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200 flex flex-col h-[90vh]">
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-brand-600 p-2.5 rounded-xl text-white shadow-lg shadow-brand-500/30">
              <Send className="w-5 h-5" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-900 leading-tight">Enviar Revisión</h2>
                <p className="text-sm text-slate-500">Compartir informe completo con el equipo médico</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {sentSuccess ? (
             <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-fade-in bg-slate-50/50">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/20">
                    <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">¡Reporte Enviado con Éxito!</h3>
                <p className="text-slate-500 text-base max-w-md mx-auto">
                    El reporte de auditoría ha sido enviado correctamente a <span className="font-semibold text-slate-700">{email}</span>.
                </p>
             </div>
        ) : (
            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-5 bg-slate-50/50">
                
                {/* LEFT COLUMN: VISUAL REPORT SUMMARY (Similar to Sidebar) */}
                <div className="lg:col-span-3 p-8 overflow-y-auto custom-scrollbar border-r border-slate-200 bg-white">
                    
                    {/* Status Card */}
                    <div className={`p-6 rounded-2xl border mb-8 ${statusBg} relative overflow-hidden`}>
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full bg-white/80 backdrop-blur-sm ${statusColor}`}>
                                    <StatusIcon className="w-8 h-8" />
                                </div>
                                <div>
                                    <p className={`text-xs font-bold uppercase tracking-wider opacity-80 ${statusColor}`}>Estado de Validación</p>
                                    <h3 className={`text-2xl font-black tracking-tight ${statusColor}`}>{statusText}</h3>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`text-5xl font-black ${statusColor} tracking-tighter`}>{report.score.finalScore}</span>
                                <span className={`text-sm font-bold opacity-60 block -mt-1 ${statusColor}`}>/ 100 PTS</span>
                            </div>
                        </div>
                        {/* Decorative background circle */}
                        <div className={`absolute -right-6 -bottom-10 w-40 h-40 rounded-full opacity-10 ${statusColor.replace('text', 'bg')}`}></div>
                    </div>

                    {/* Hospital Info */}
                    <div className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Información del Caso</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="block text-[10px] text-slate-400 font-bold uppercase">Paciente</span>
                                <span className="text-sm font-semibold text-slate-700">{report.extracted.identificacion?.nombres} {report.extracted.identificacion?.primer_apellido}</span>
                            </div>
                            <div>
                                <span className="block text-[10px] text-slate-400 font-bold uppercase">Hospital</span>
                                <span className="text-sm font-semibold text-slate-700">{report.extracted.hospital?.nombre_hospital || "No detectado"}</span>
                            </div>
                             <div>
                                <span className="block text-[10px] text-slate-400 font-bold uppercase">Médico</span>
                                <span className="text-sm font-semibold text-slate-700">{report.extracted.medico_tratante?.nombres || "No detectado"}</span>
                            </div>
                            <div>
                                <span className="block text-[10px] text-slate-400 font-bold uppercase">Póliza</span>
                                <span className="text-sm font-semibold text-slate-700">{report.extracted.tramite?.numero_poliza || "No detectado"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Findings List (Chips) */}
                    <div>
                        <div className="flex items-center mb-4">
                            <AlertCircle className="w-4 h-4 text-slate-400 mr-2" />
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Desglose de Hallazgos ({allIssues.length})</h3>
                        </div>

                        <div className="space-y-3">
                             {allIssues.length === 0 ? (
                                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
                                    <p className="text-slate-400 text-sm font-medium">No se detectaron hallazgos negativos.</p>
                                </div>
                             ) : (
                                allIssues.map((issue, idx) => {
                                    const isCritical = issue.type === "ERROR_CRÍTICO";
                                    const isWarning = issue.type === "ALERTA";
                                    const isObservation = issue.type === "OBSERVACIÓN";
                                    
                                    let bgClass = "bg-blue-50/40 border-blue-100";
                                    let textClass = "text-blue-600";
                                    let badgeClass = "bg-white border-blue-200 text-blue-500";
                                    let label = "DISCRETO";

                                    if (isCritical) {
                                        bgClass = "bg-red-50/60 border-red-100";
                                        textClass = "text-red-700";
                                        badgeClass = "bg-white border-red-200 text-red-600";
                                        label = "CRÍTICO";
                                    } else if (isWarning) {
                                        bgClass = "bg-amber-50/60 border-amber-100";
                                        textClass = "text-amber-700";
                                        badgeClass = "bg-white border-amber-200 text-amber-600";
                                        label = "IMPORTANTE";
                                    } else if (isObservation) {
                                        bgClass = "bg-orange-50/60 border-orange-100";
                                        textClass = "text-orange-700";
                                        badgeClass = "bg-white border-orange-200 text-orange-600";
                                        label = "MODERADO";
                                    }

                                    return (
                                        <div 
                                            key={idx} 
                                            className={`p-4 rounded-xl border flex gap-4 items-start ${bgClass}`}
                                        >
                                            <div className="mt-0.5">
                                                {isCritical ? <XCircle className="w-5 h-5 text-red-500" /> : 
                                                 isWarning ? <AlertTriangle className="w-5 h-5 text-amber-500" /> :
                                                 isObservation ? <AlertCircle className="w-5 h-5 text-orange-500" /> :
                                                 <AlertCircle className="w-5 h-5 text-blue-400" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className={`text-sm font-bold ${textClass}`}>{issue.rule}</span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${badgeClass}`}>
                                                        {label}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-600 leading-relaxed">{issue.message}</p>
                                            </div>
                                        </div>
                                    );
                                })
                             )}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: INPUTS */}
                <div className="lg:col-span-2 p-8 flex flex-col h-full bg-slate-50/30">
                     <div className="mb-6">
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Destinatario</label>
                        <div className="relative">
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="ejemplo@gnp.com.mx"
                                className="w-full pl-4 pr-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none text-slate-700 text-sm transition-all shadow-sm"
                                autoFocus
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 ml-1">Se enviará una copia del PDF adjunto.</p>
                    </div>

                    <div className="flex-1 flex flex-col mb-4">
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-2 flex justify-between items-center">
                            Comentarios Adicionales
                            <span className="text-slate-400 font-normal normal-case text-[10px] bg-slate-100 px-2 py-0.5 rounded-full">Opcional</span>
                        </label>
                        <div className="flex-1 relative">
                            <textarea 
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                placeholder="Escribe aquí tus observaciones, recomendaciones para el ajustador o notas sobre la cobertura..."
                                className="w-full h-full p-4 rounded-xl bg-white border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none text-slate-700 text-sm resize-none transition-all shadow-sm leading-relaxed"
                            />
                        </div>
                    </div>

                    {sendError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                            <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-red-700">Error al enviar</p>
                                <p className="text-xs text-red-600">{sendError}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Footer Actions */}
        {!sentSuccess && (
            <div className="px-8 py-5 bg-white border-t border-slate-200 flex justify-between items-center shrink-0">
                <button 
                    onClick={generateAndDownloadPDF}
                    disabled={isGeneratingPdf}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 transition-all active:scale-95"
                >
                    {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    Vista Previa PDF
                </button>

                <div className="flex gap-3">
                    <button 
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-slate-500 text-sm font-bold hover:bg-slate-100 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSend}
                        disabled={!email || isSending}
                        className={`
                            flex items-center gap-2 px-8 py-2.5 rounded-xl text-white text-sm font-bold shadow-xl shadow-brand-500/20 transition-all
                            ${!email || isSending ? 'bg-slate-400 cursor-not-allowed transform-none' : 'bg-brand-600 hover:bg-brand-700 hover:scale-105 active:scale-95'}
                        `}
                    >
                        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {isSending ? 'Enviando...' : 'Enviar Reporte'}
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default ReviewModal;
