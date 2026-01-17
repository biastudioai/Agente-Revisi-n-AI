import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, Maximize } from 'lucide-react';

interface ImageFile {
  base64: string;
  mimeType: string;
  name: string;
}

interface ImageViewerProps {
  images: ImageFile[];
}

const ImageViewer: React.FC<ImageViewerProps> = ({ images }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [isAutoZoomed, setIsAutoZoomed] = useState(true);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  const pageCount = images.length;
  const currentImage = images[currentIndex];
  
  const imagesKey = useMemo(() => {
    return images.map(img => img.name + img.mimeType).join('|');
  }, [images]);

  const fitToContainer = () => {
    if (!containerRef.current || !imageDimensions.width || !imageDimensions.height) return;
    
    const container = containerRef.current;
    if (container.clientWidth < 100 || container.clientHeight < 100) return;

    const hPadding = 64;
    const vPadding = 64;
    
    const availableWidth = container.clientWidth - hPadding;
    const availableHeight = container.clientHeight - vPadding;

    if (availableWidth <= 0 || availableHeight <= 0) return;

    const scaleW = availableWidth / imageDimensions.width;
    const scaleH = availableHeight / imageDimensions.height;
    
    const optimalScale = Math.min(scaleW, scaleH);
    const finalScale = Math.max(0.2, Math.floor(optimalScale * 100) / 100);
    
    setScale(prev => {
      if (Math.abs(prev - finalScale) < 0.02) return prev;
      return finalScale;
    });
  };

  useEffect(() => {
    setLoading(true);
    setCurrentIndex(0);
    setIsAutoZoomed(true);
  }, [imagesKey]);

  useEffect(() => {
    if (!containerRef.current || !imageDimensions.width) return;

    const initialTimer = setTimeout(() => {
      fitToContainer();
    }, 100);

    let timeoutId: any;
    const observer = new ResizeObserver(() => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (isAutoZoomed) {
          fitToContainer();
        }
      }, 400);
    });

    observer.observe(containerRef.current);

    return () => {
      clearTimeout(initialTimer);
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [imageDimensions, isAutoZoomed]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    setLoading(false);
  };

  const changePage = (offset: number) => {
    setCurrentIndex(prev => Math.min(Math.max(0, prev + offset), pageCount - 1));
    setLoading(true);
    setIsAutoZoomed(true);
  };

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
    fitToContainer();
  };

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-500">
        <span className="text-sm">No hay imágenes para mostrar</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col relative">
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto flex justify-center items-center p-8 custom-scrollbar bg-slate-900/50 relative"
      >
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 z-10 bg-slate-900/80">
            <Loader2 className="w-10 h-10 animate-spin mb-3 text-brand-500" />
            <span className="text-xs font-medium">Cargando imagen...</span>
          </div>
        )}
        
        <div 
          className="relative shadow-2xl transition-transform duration-200"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          <img
            ref={imageRef}
            src={`data:${currentImage.mimeType};base64,${currentImage.base64}`}
            alt={currentImage.name || `Imagen ${currentIndex + 1}`}
            className="max-w-none bg-white rounded-sm shadow-lg block"
            onLoad={handleImageLoad}
            style={{ opacity: loading ? 0 : 1 }}
          />
        </div>
      </div>

      {pageCount > 0 && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-800/90 backdrop-blur border border-slate-700 rounded-full px-4 py-2 flex items-center gap-4 shadow-xl transition-all z-40">
          <div className="flex items-center gap-1">
            <button 
              onClick={() => changePage(-1)}
              disabled={currentIndex <= 0}
              className="p-1.5 rounded-full hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-medium text-slate-300 min-w-[3rem] text-center">
              {currentIndex + 1} / {pageCount}
            </span>
            <button 
              onClick={() => changePage(1)}
              disabled={currentIndex >= pageCount - 1}
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
          </div>

          <div className="w-px h-4 bg-slate-600"></div>

          <button 
            onClick={handleFitToPage}
            className={`p-1.5 rounded-full transition-colors ${isAutoZoomed ? 'bg-brand-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}
            title="Ajustar a pantalla"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageViewer;
