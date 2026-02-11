
import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, Maximize } from 'lucide-react';

const pdfjs: any = (pdfjsLib as any).default || pdfjsLib;

if (pdfjs.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
}

interface PdfViewerProps {
  base64Data: string;
  approvalStatus?: 'APPROVED' | 'REVIEW' | 'REJECTED';
  pendingChanges?: Record<string, { old: any, new: any }>;
  userRole?: string;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ base64Data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isAutoZoomed, setIsAutoZoomed] = useState(true);
  const isAutoZoomedRef = useRef(isAutoZoomed);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        setIsAutoZoomed(true);
        
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

  useEffect(() => {
    isAutoZoomedRef.current = isAutoZoomed;
  }, [isAutoZoomed]);

  const fitToPage = async () => {
    if (!pdfDoc || !containerRef.current) return;
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const container = containerRef.current;
      
      if (container.clientWidth < 100 || container.clientHeight < 100) return;

      const hPadding = 64;
      const vPadding = 64;
      
      const availableWidth = container.clientWidth - hPadding;
      const availableHeight = container.clientHeight - vPadding;

      if (availableWidth <= 0 || availableHeight <= 0) return;

      const scaleW = availableWidth / viewport.width;
      const scaleH = availableHeight / viewport.height;
      
      const optimalScale = Math.min(scaleW, scaleH);
      
      const finalScale = Math.max(0.2, Math.floor(optimalScale * 100) / 100);
      
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

    const initialTimer = setTimeout(() => {
        if (isAutoZoomedRef.current) {
            fitToPage();
        }
    }, 600);

    let timeoutId: any;
    const observer = new ResizeObserver(() => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (isAutoZoomedRef.current) {
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
  }, [pdfDoc, pageNum]);

  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;

      if (renderTaskRef.current) {
        try {
            renderTaskRef.current.cancel();
        } catch(e) {
        }
      }

      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: scale });
        
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        if (!context) return;

        const outputScale = window.devicePixelRatio || 1;
        
        const displayWidth = Math.floor(viewport.width);
        const displayHeight = Math.floor(viewport.height);

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

  const handleZoomIn = () => {
      isAutoZoomedRef.current = false;
      setIsAutoZoomed(false);
      setScale(s => Math.min(3.0, s + 0.1));
  };

  const handleZoomOut = () => {
      isAutoZoomedRef.current = false;
      setIsAutoZoomed(false);
      setScale(s => Math.max(0.1, s - 0.1));
  };

  const handleFitToPage = () => {
      isAutoZoomedRef.current = true;
      setIsAutoZoomed(true);
      fitToPage();
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
        <p className="mb-2 text-red-400">{error}</p>
        <p className="text-xs">Intenta descargar el archivo y verlo localmente.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 relative group overflow-hidden">

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
          <div className="relative shadow-2xl my-auto">
             <canvas ref={canvasRef} className="bg-white rounded-sm shadow-lg max-w-none block relative z-10" />
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
