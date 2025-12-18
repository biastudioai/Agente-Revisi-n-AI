
import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, PenTool, Type, Stamp, Save, X, MousePointer2, RefreshCw, ArrowRight, Move, Crosshair, Maximize } from 'lucide-react';

// Resolve the correct module object (handle ESM default export wrapping)
const pdfjs: any = (pdfjsLib as any).default || pdfjsLib;

if (pdfjs.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
}

interface PdfViewerProps {
  base64Data: string;
  approvalStatus?: 'APPROVED' | 'REVIEW' | 'REJECTED';
  pendingChanges?: Record<string, { old: any, new: any }>;
}

interface TextAnnotation {
  id: string;
  x: number; // Percentage relative to page width (0-100)
  y: number; // Percentage relative to page height (0-100)
  text: string;
  page: number;
  fontSize: number;
  color: string;
}

// Field mapping dictionary to map technical field paths to visual label text in the PDF
const FIELD_MAPPINGS: Record<string, string[]> = {
  'identificacion.nombres': ['Nombre(s)', 'Nombre', 'Asegurado'],
  'identificacion.primer_apellido': ['Apellido Paterno', 'Primer Apellido'],
  'identificacion.segundo_apellido': ['Apellido Materno', 'Segundo Apellido'],
  'identificacion.edad': ['Edad'],
  'identificacion.sexo': ['Sexo', 'Género'],
  'diagnostico.diagnostico_definitivo': ['Diagnóstico(s) definitivo(s)', 'Diagnostico definitivo', 'Padecimiento'],
  'padecimiento_actual.fecha_inicio': ['Fecha de inicio', 'Fecha inicio'],
  'signos_vitales.pulso': ['Pulso', 'Frecuencia cardiaca'],
  'signos_vitales.temperatura': ['Temperatura', 'Temp'],
  'signos_vitales.presion_arterial': ['Tensión arterial', 'Presión arterial', 'T.A.'],
  'signos_vitales.peso': ['Peso'],
  'signos_vitales.altura': ['Talla', 'Estatura'],
};

const PdfViewer: React.FC<PdfViewerProps> = ({ base64Data, approvalStatus, pendingChanges = {} }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null); // Track active render task to handle cancellations
  
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State to track if we are in "Auto Fit" mode or "Manual Zoom" mode
  const [isAutoZoomed, setIsAutoZoomed] = useState(true);

  // Editing State
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTool, setActiveTool] = useState<'cursor' | 'text' | 'placer'>('cursor');
  const [placerText, setPlacerText] = useState<string>(''); // Text pending to be placed
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);
  const [viewportDimensions, setViewportDimensions] = useState({ width: 0, height: 0 }); // Current displayed size in pixels
  const [pdfViewportInfo, setPdfViewportInfo] = useState<any>(null); // Original PDF dimensions
  const [isSaving, setIsSaving] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 }); // For ghost cursor

  // Panel Dragging State
  const [panelPosition, setPanelPosition] = useState({ x: 16, y: 80 }); // Default left-4 (16px), top-20 (80px)
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        setAnnotations([]); // Reset annotations on new file
        setIsAutoZoomed(true); // Reset auto-zoom state on new file
        
        if (!base64Data) return;

        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const loadingTask = pdfjs.getDocument({ data: bytes });
        const doc = await loadingTask.promise;
        
        setPdfDoc(doc);
        setPageCount(doc.numPages);
        setPageNum(1);
        setLoading(false);
      } catch (err) {
        console.error("Error loading PDF:", err);
        setError("No se pudo renderizar el PDF. El archivo podría estar dañado o encriptado.");
        setLoading(false);
      }
    };

    loadPdf();
  }, [base64Data]);

  // Auto-fit function
  const fitToPage = async () => {
    if (!pdfDoc || !containerRef.current) return;
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const container = containerRef.current;
      
      // Safety check: If container is too small (e.g. during animation or closed), abort
      if (container.clientWidth < 100 || container.clientHeight < 100) return;

      // Account for padding (p-8 = 32px * 2 = 64px)
      const hPadding = 64;
      const vPadding = 64;
      
      const availableWidth = container.clientWidth - hPadding;
      const availableHeight = container.clientHeight - vPadding;

      if (availableWidth <= 0 || availableHeight <= 0) return;

      const scaleW = availableWidth / viewport.width;
      const scaleH = availableHeight / viewport.height;
      
      // Fit fully visible (min of both)
      const optimalScale = Math.min(scaleW, scaleH);
      
      // Floor to 2 decimals, but ensure a reasonable min (e.g. 20%)
      const finalScale = Math.max(0.2, Math.floor(optimalScale * 100) / 100);
      
      // Only update if difference is significant to avoid loop (scrollbar jitter)
      setScale(prev => {
          if (Math.abs(prev - finalScale) < 0.02) return prev;
          return finalScale;
      });

    } catch (e) {
      console.error("Error calculating fit", e);
    }
  };

  useEffect(() => {
    if (!containerRef.current || !pdfDoc) return;

    // 1. Initial Fit with Delay (Wait for Panel Slide Animation 500ms)
    const initialTimer = setTimeout(() => {
        fitToPage();
    }, 600);

    // 2. Resize Observer for Window changes
    // Only fit to page if the user hasn't manually zoomed (isAutoZoomed === true)
    let timeoutId: any;
    const observer = new ResizeObserver(() => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (isAutoZoomed) {
            fitToPage();
        }
      }, 400); 
    });

    observer.observe(containerRef.current);

    return () => {
      clearTimeout(initialTimer);
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [pdfDoc, pageNum, isAutoZoomed]); // Re-bind observer if isAutoZoomed changes

  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;

      // Cancel previous render task if it exists to avoid "Same canvas" error
      if (renderTaskRef.current) {
        try {
            renderTaskRef.current.cancel();
        } catch(e) {
            // Ignore potential errors during cancellation
        }
      }

      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: scale });
        setPdfViewportInfo(viewport); // Store viewport info for save coordinates
        
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        if (!context) return;

        const outputScale = window.devicePixelRatio || 1;
        
        // Visual dimensions (CSS pixels)
        const displayWidth = Math.floor(viewport.width);
        const displayHeight = Math.floor(viewport.height);
        
        setViewportDimensions({ width: displayWidth, height: displayHeight });

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;

        const transform = outputScale !== 1
          ? [outputScale, 0, 0, outputScale, 0, 0]
          : null;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          transform: transform || undefined
        };
        
        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        renderTaskRef.current = null;
      } catch (err: any) {
        if (err.name === 'RenderingCancelledException') {
            // Expected when cancelling previous task
            return;
        }
        console.error("Error rendering page:", err);
      }
    };

    renderPage();

    return () => {
        if (renderTaskRef.current) {
            try {
                renderTaskRef.current.cancel();
            } catch(e) {}
        }
    };
  }, [pdfDoc, pageNum, scale]);

  const changePage = (offset: number) => {
    setPageNum(prev => Math.min(Math.max(1, prev + offset), pageCount));
  };

  // Zoom helpers
  const handleZoomIn = () => {
      setIsAutoZoomed(false);
      setScale(s => Math.min(3.0, s + 0.1));
  };

  const handleZoomOut = () => {
      setIsAutoZoomed(false);
      setScale(s => Math.max(0.1, s - 0.1));
  };

  const handleFitToPage = () => {
      setIsAutoZoomed(true);
      fitToPage();
  };


  // --- PANEL DRAGGING LOGIC ---
  const handlePanelMouseDown = (e: React.MouseEvent) => {
    setIsDraggingPanel(true);
    dragOffset.current = {
        x: e.clientX - panelPosition.x,
        y: e.clientY - panelPosition.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (isDraggingPanel) {
            setPanelPosition({
                x: e.clientX - dragOffset.current.x,
                y: e.clientY - dragOffset.current.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsDraggingPanel(false);
    };

    if (isDraggingPanel) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPanel]);


  // --- SMART PLACEMENT LOGIC ---

  const findAndPlaceText = async (searchTexts: string[], valueToPlace: string) => {
      if (!pdfDoc) return;
      
      try {
          const page = await pdfDoc.getPage(pageNum);
          const textContent = await page.getTextContent();
          const viewport = page.getViewport({ scale: scale }); // Use current scale
          
          let foundItem = null;
          
          // Search for any of the keywords
          for (const item of textContent.items) {
             const str = (item as any).str;
             if (searchTexts.some(keyword => str.toLowerCase().includes(keyword.toLowerCase()))) {
                 foundItem = item;
                 break;
             }
          }

          if (foundItem) {
              // Calculate position
              const tx = (foundItem as any).transform; 
              // tx[4] is x, tx[5] is y (in PDF coordinate space)
              
              const [x, y] = viewport.convertToViewportPoint(tx[4], tx[5]);
              
              const canvasWidth = viewport.width;
              const canvasHeight = viewport.height;
              
              // Convert pixel coordinates to Percentage (0-100) used by our annotation system
              
              const offsetX = 10; // pixels right
              const offsetY = 20; // pixels down (remember Y grows down in HTML canvas/CSS)
              
              const finalX = ((x + offsetX) / canvasWidth) * 100;
              const finalY = ((y - offsetY) / canvasHeight) * 100; // note: y is from top in CSS

              // Add Annotation
              const newAnnotation: TextAnnotation = {
                id: Date.now().toString(),
                x: Math.max(0, Math.min(95, finalX)),
                y: Math.max(0, Math.min(95, finalY)), 
                text: valueToPlace,
                page: pageNum,
                fontSize: 12,
                color: '#000000'
              };
              
              setAnnotations(prev => [...prev, newAnnotation]);
              
              // Visual feedback
              setIsEditMode(true);
              return true;
          }
      } catch (e) {
          console.error("Error searching text in PDF", e);
      }
      return false;
  };

  // --- EDITING LOGIC ---

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      // For ghost cursor, we need viewport (client) coordinates because it uses position: fixed
      if (activeTool === 'placer' && isEditMode) {
           setMousePos({
               x: e.clientX,
               y: e.clientY
           });
      }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditMode || (activeTool !== 'text' && activeTool !== 'placer') || !containerRef.current) return;

    // Get click coordinates relative to the annotation layer (same size as canvas)
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to percentage to be responsive to zoom
    const xPct = (x / rect.width) * 100;
    const yPct = (y / rect.height) * 100;

    const initialText = activeTool === 'placer' ? placerText : "Texto aquí";

    const newAnnotation: TextAnnotation = {
      id: Date.now().toString(),
      x: xPct,
      y: yPct,
      text: initialText,
      page: pageNum,
      fontSize: 12,
      // Always black for placed text as per user request
      color: activeTool === 'placer' ? '#000000' : '#000000' 
    };

    setAnnotations([...annotations, newAnnotation]);
    
    // If we just placed a specific value, switch back to cursor
    if (activeTool === 'placer') {
        setActiveTool('cursor');
        setPlacerText('');
    }
  };

  const updateAnnotation = (id: string, newText: string) => {
    setAnnotations(annotations.map(a => a.id === id ? { ...a, text: newText } : a));
  };

  const deleteAnnotation = (id: string) => {
    setAnnotations(annotations.filter(a => a.id !== id));
  };

  const addStamp = () => {
    if (!isEditMode) setIsEditMode(true);
    
    let text = "REVISADO";
    let color = "#64748b"; // slate

    if (approvalStatus === 'APPROVED') {
        text = "PRE-APROBADO";
        color = "#059669"; // emerald
    } else if (approvalStatus === 'REVIEW') {
        text = "REVISAR";
        color = "#d97706"; // amber
    } else if (approvalStatus === 'REJECTED') {
        text = "RECHAZADO";
        color = "#dc2626"; // red
    }

    const newAnnotation: TextAnnotation = {
        id: Date.now().toString(),
        x: 50, // Center
        y: 10, // Top
        text: text,
        page: pageNum,
        fontSize: 24,
        color: color
    };
    
    setAnnotations([...annotations, newAnnotation]);
  };

  const activatePlacement = async (fieldKey: string, text: string) => {
      setIsEditMode(true);
      
      // Try to auto-place
      let placed = false;
      const keywords = FIELD_MAPPINGS[fieldKey];
      if (keywords) {
          placed = await findAndPlaceText(keywords, text);
      }

      // If not placed automatically, activate manual placer tool
      if (!placed) {
        setActiveTool('placer');
        setPlacerText(text);
      }
  };

  // --- SAVING LOGIC ---

  const handleDownload = async () => {
    if (!pdfDoc) return;
    setIsSaving(true);
    
    try {
        // 1. Load the original PDF into pdf-lib
        const existingPdfBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const pdfDocLib = await PDFDocument.load(existingPdfBytes);
        const pages = pdfDocLib.getPages();
        const helveticaFont = await pdfDocLib.embedFont(StandardFonts.Helvetica);
        const helveticaBold = await pdfDocLib.embedFont(StandardFonts.HelveticaBold);

        // 2. Iterate annotations and draw them
        for (const ann of annotations) {
            // pdf-lib pages are 0-indexed
            const pageIndex = ann.page - 1;
            if (pageIndex < 0 || pageIndex >= pages.length) continue;
            
            const page = pages[pageIndex];
            const { width, height } = page.getSize();

            // Coordinate conversion:
            // Browser (0,0) is Top-Left. PDF (0,0) is usually Bottom-Left.
            // ann.x and ann.y are percentages (0-100) from Top-Left
            
            const x = (ann.x / 100) * width;
            // Invert Y axis for PDF (Height - TopOffset)
            const y = height - ((ann.y / 100) * height);
            
            // Adjust y for font height so baseline matches top-left anchor perception
            // The click Y (ann.y) represents the TOP of the text line.
            // PDF-Lib draws from the BASELINE.
            // So we need to subtract fontSize from the Top Y to get down to baseline.
            const adjustedY = y - (ann.fontSize); 

            // Parse hex color
            const r = parseInt(ann.color.slice(1, 3), 16) / 255;
            const g = parseInt(ann.color.slice(3, 5), 16) / 255;
            const b = parseInt(ann.color.slice(5, 7), 16) / 255;

            page.drawText(ann.text, {
                x: x,
                y: adjustedY,
                size: ann.fontSize,
                font: ann.fontSize > 20 ? helveticaBold : helveticaFont,
                color: rgb(r, g, b),
            });
        }

        // 3. Save and Download
        const pdfBytes = await pdfDocLib.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `reporte_auditado_${Date.now()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setIsEditMode(false);

    } catch (e) {
        console.error("Error saving PDF", e);
        setError("Error al guardar el archivo PDF modificado.");
    } finally {
        setIsSaving(false);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
        <p className="mb-2 text-red-400">{error}</p>
        <p className="text-xs">Intenta descargar el archivo y verlo localmente.</p>
      </div>
    );
  }

  // Determine Stamp Color for UI Button
  let stampColorClass = "text-slate-500 hover:text-slate-700";
  if (approvalStatus === 'APPROVED') stampColorClass = "text-emerald-600 hover:text-emerald-700";
  if (approvalStatus === 'REVIEW') stampColorClass = "text-amber-500 hover:text-amber-600";
  if (approvalStatus === 'REJECTED') stampColorClass = "text-red-500 hover:text-red-600";

  return (
    <div className="flex flex-col h-full bg-slate-900 relative group overflow-hidden">
      
      {/* --- SYNC CHANGES PANEL (Draggable) --- */}
      {Object.keys(pendingChanges).length > 0 && (
         <div 
            className="absolute z-40 w-64 bg-white/95 backdrop-blur shadow-2xl rounded-xl border border-slate-200 overflow-hidden flex flex-col max-h-[60%] animate-slide-up"
            style={{ 
                left: `${panelPosition.x}px`, 
                top: `${panelPosition.y}px`,
                boxShadow: isDraggingPanel ? '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)' : undefined
            }}
         >
            {/* Draggable Header */}
            <div 
                className="p-3 bg-brand-50 border-b border-brand-100 flex justify-between items-center shrink-0 cursor-move select-none active:bg-brand-100 transition-colors"
                onMouseDown={handlePanelMouseDown}
            >
                <span className="text-xs font-bold text-brand-800 flex items-center pointer-events-none">
                    <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin-slow" />
                    Sincronizar ({Object.keys(pendingChanges).length})
                </span>
                {!isEditMode && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsEditMode(true); }} 
                        className="text-[10px] text-brand-600 font-bold underline cursor-pointer"
                    >
                        Activar Edición
                    </button>
                )}
            </div>
            
            <div className="overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {Object.entries(pendingChanges).map(([key, val]) => {
                    const change = val as { old: any, new: any };
                    const label = key.split('.').pop()?.replace(/_/g, ' ') || key;
                    const valueStr = String(change.new === true ? 'Sí' : change.new === false ? 'No' : change.new);
                    return (
                        <div 
                            key={key} 
                            onClick={() => activatePlacement(key, valueStr)}
                            className="group flex flex-col p-2.5 bg-white border border-slate-200 rounded-lg hover:border-brand-400 hover:ring-1 hover:ring-brand-200 shadow-sm transition-all cursor-pointer relative"
                            title="Clic para colocar en el PDF"
                        >
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center">
                                {label}
                                <ArrowRight className="w-2.5 h-2.5 mx-1" />
                            </span>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-slate-800 line-clamp-2 leading-tight">
                                    {valueStr}
                                </span>
                                <div className="bg-brand-50 p-1 rounded-full group-hover:bg-brand-100 transition-colors">
                                    <MousePointer2 className="w-3.5 h-3.5 text-brand-500" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
         </div>
      )}

      {/* --- TOOLBAR --- */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 flex items-center gap-2 bg-white/90 backdrop-blur rounded-full px-2 py-1.5 shadow-xl border border-white/20 transition-all">
          <button 
             onClick={() => setIsEditMode(!isEditMode)}
             className={`flex items-center px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${isEditMode ? 'bg-brand-600 text-white' : 'hover:bg-slate-100 text-slate-700'}`}
          >
             <PenTool className="w-3.5 h-3.5 mr-1.5" />
             {isEditMode ? 'Editando' : 'Editar PDF'}
          </button>
          
          {isEditMode && (
            <>
               <div className="w-px h-4 bg-slate-300 mx-1"></div>
               
               <button 
                 onClick={() => setActiveTool('cursor')}
                 className={`p-1.5 rounded-full ${activeTool === 'cursor' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
                 title="Mover / Seleccionar"
               >
                 <MousePointer2 className="w-4 h-4" />
               </button>

               <button 
                 onClick={() => { setActiveTool('text'); setPlacerText(''); }}
                 className={`p-1.5 rounded-full ${activeTool === 'text' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
                 title="Agregar Texto (Clic en PDF)"
               >
                 <Type className="w-4 h-4" />
               </button>

               <button 
                 onClick={addStamp}
                 className={`p-1.5 rounded-full ${stampColorClass} hover:bg-slate-100`}
                 title="Agregar Sello de Estado"
               >
                 <Stamp className="w-4 h-4" />
               </button>

               <div className="w-px h-4 bg-slate-300 mx-1"></div>

               <button 
                 onClick={handleDownload}
                 disabled={isSaving}
                 className="flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-slate-800 text-white hover:bg-slate-700 transition-colors"
               >
                 {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                 Descargar
               </button>
            </>
          )}
      </div>

      {/* --- VIEWER AREA --- */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto flex justify-center p-8 custom-scrollbar bg-slate-900/50 relative"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center text-slate-400 h-full">
             <Loader2 className="w-10 h-10 animate-spin mb-3 text-brand-500" />
             <span className="text-xs font-medium">Procesando PDF...</span>
          </div>
        ) : (
          <div 
            className={`relative shadow-2xl my-auto transition-cursor ${activeTool === 'placer' ? 'cursor-crosshair' : 'cursor-default'}`}
            onMouseMove={handleCanvasMouseMove}
          >
             {/* PDF Canvas */}
             <canvas ref={canvasRef} className="bg-white rounded-sm shadow-lg max-w-none block relative z-10" />
             
             {/* Annotation Layer (Overlays) */}
             {isEditMode && viewportDimensions.width > 0 && (
                <div 
                    className="absolute inset-0 z-20"
                    style={{ 
                        width: viewportDimensions.width, 
                        height: viewportDimensions.height 
                    }}
                    onClick={handleCanvasClick}
                >
                    {annotations.filter(a => a.page === pageNum).map(ann => (
                        <div
                            key={ann.id}
                            onClick={(e) => e.stopPropagation()} // Prevent creating new text when clicking existing
                            style={{
                                position: 'absolute',
                                left: `${ann.x}%`,
                                top: `${ann.y}%`,
                                // Removed transform translate to anchor Top-Left
                                minWidth: '100px'
                            }}
                        >
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={ann.text}
                                    onChange={(e) => updateAnnotation(ann.id, e.target.value)}
                                    className="bg-transparent border border-transparent hover:border-brand-300 focus:border-brand-500 focus:bg-white/90 outline-none px-1 py-0.5 rounded text-sm font-bold shadow-sm transition-all"
                                    style={{ 
                                        color: ann.color, 
                                        fontSize: `${ann.fontSize * scale}px`, // Scale font size visually
                                        width: `${Math.max(ann.text.length, 5)}ch`
                                    }}
                                    autoFocus={activeTool === 'text'}
                                />
                                <button 
                                    onClick={() => deleteAnnotation(ann.id)}
                                    className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ))}
                    
                    {/* Ghost Cursor for Placer Tool */}
                    {activeTool === 'placer' && (
                        <div 
                            className="fixed pointer-events-none z-50 flex items-center bg-brand-600 text-white text-xs px-3 py-1.5 rounded-lg shadow-xl shadow-brand-500/40 border border-brand-400" 
                            style={{ 
                                left: mousePos.x + 16, // Offset so it doesn't cover the crosshair
                                top: mousePos.y + 16 
                            }}
                        >
                            <MousePointer2 className="w-3 h-3 mr-1.5" />
                            <span>Clic para pegar: <b>{placerText}</b></span>
                        </div>
                    )}
                </div>
             )}
          </div>
        )}
      </div>

      {/* --- PAGINATION CONTROLS --- */}
      {!loading && pageCount > 0 && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-800/90 backdrop-blur border border-slate-700 rounded-full px-4 py-2 flex items-center gap-4 shadow-xl transition-all z-40">
          <div className="flex items-center gap-1">
            <button 
              onClick={() => changePage(-1)}
              disabled={pageNum <= 1}
              className="p-1.5 rounded-full hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-medium text-slate-300 min-w-[3rem] text-center">
              {pageNum} / {pageCount}
            </span>
            <button 
              onClick={() => changePage(1)}
              disabled={pageNum >= pageCount}
              className="p-1.5 rounded-full hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-4 bg-slate-600"></div>

          <div className="flex items-center gap-1">
             <button 
              onClick={handleZoomOut}
              className="p-1.5 rounded-full hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono font-medium text-slate-300 w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
             <button 
              onClick={handleZoomIn}
              className="p-1.5 rounded-full hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-slate-600 mx-1"></div>
            <button 
              onClick={handleFitToPage}
              className={`p-1.5 rounded-full transition-colors ${isAutoZoomed ? 'bg-slate-700 text-white' : 'hover:bg-slate-700 text-slate-300'}`}
              title="Ajustar a Pantalla (Auto)"
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfViewer;
