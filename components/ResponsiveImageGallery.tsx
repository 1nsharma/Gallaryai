/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef } from 'react';

// --- Re-using components from PolaroidCard for consistency ---
const LoadingSpinner = () => (
    <div className="flex items-center justify-center h-full">
        <svg className="animate-spin h-8 w-8 text-muted" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

const ErrorDisplay = ({ onRetry, isQuotaError }: { onRetry?: () => void, isQuotaError?: boolean }) => (
    <div className="flex flex-col items-center justify-center h-full text-center p-2 gap-2 bg-surface rounded-lg">
         <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs font-bold text-muted">{isQuotaError ? "Quota Limit Reached" : "Generation Failed"}</p>
        {!isQuotaError && onRetry && (
            <button 
                onClick={(e) => { e.stopPropagation(); onRetry(); }}
                className="text-xs bg-muted text-background rounded px-2 py-0.5 hover:opacity-80 transition-opacity"
            >
                Retry
            </button>
        )}
        {isQuotaError && (
             <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs bg-accent text-white rounded px-2 py-0.5 hover:opacity-80 transition-opacity"
            >
                Check Quota
            </a>
        )}
    </div>
);


// --- Main Component ---
interface GeneratedImage {
    status: 'pending' | 'done' | 'error';
    url?: string;
    error?: string;
    isQuotaError?: boolean;
}

interface ResponsiveImageGalleryProps {
  items: GeneratedImage[];
  styles: string[];
  onRegenerate?: (index: number) => void;
  onRegenerateAll?: () => void;
  onDownload?: (index: number) => void;
}

export default function ResponsiveImageGallery({ items = [], styles = [], onRegenerate, onRegenerateAll, onDownload }: ResponsiveImageGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);

  const openAt = (i: number) => {
    if (items[i].status !== 'done') return;
    setOpenIndex(i);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setOpenIndex(null);
    document.body.style.overflow = '';
  };

  const prev = () => setOpenIndex((i) => (i === null ? null : (i - 1 + items.length) % items.length));
  const next = () => setOpenIndex((i) => (i === null ? null : (i + 1) % items.length));

  let startX = 0;
  const onTouchStart = (e: React.TouchEvent) => (startX = e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    const endX = e.changedTouches[0].clientX;
    const dx = endX - startX;
    if (dx > 50) prev();
    else if (dx < -50) next();
  };

  const downloadAll = () => {
    items.forEach((item, idx) => {
      if (item.status === 'done' && item.url) {
          setTimeout(() => onDownload?.(idx), idx * 300);
      }
    });
  };
  
  const renderThumbnailContent = (item: GeneratedImage, index: number) => {
    switch (item.status) {
        case 'pending':
            return <LoadingSpinner />;
        case 'error':
            return <ErrorDisplay onRetry={() => onRegenerate?.(index)} isQuotaError={item.isQuotaError} />;
        case 'done':
            return (
                <img
                    src={item.url}
                    alt={styles[index] || `Image ${index + 1}`}
                    className="w-full h-full object-cover object-center transform transition-transform duration-200 hover:scale-105"
                    loading="lazy"
                    draggable={false}
                />
            );
        default:
            return null;
    }
  };

  const secondaryButtonClasses = "font-heading text-sm font-semibold text-center text-text bg-glass border border-glass-border py-2 px-4 rounded transform transition-transform duration-200 hover:scale-105 hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-heading text-accent-2">Your Portraits</h3>
        <div className="flex items-center gap-4">
            <button
                onClick={onRegenerateAll}
                className={secondaryButtonClasses}
                aria-label="Regenerate all images"
            >
                Regenerate All
            </button>
            <button
                onClick={downloadAll}
                className={secondaryButtonClasses}
                aria-label="Download all images"
            >
                Download All
            </button>
        </div>
      </div>

      {/* Desktop Grid */}
      <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => openAt(i)}
            className="block w-full aspect-[9/16] overflow-hidden rounded bg-surface border-2 border-transparent focus:outline-none focus:border-accent-2 cursor-pointer disabled:cursor-default"
            disabled={item.status !== 'done'}
          >
           {renderThumbnailContent(item, i)}
          </button>
        ))}
      </div>

      {/* Mobile Scroll */}
      <div className="sm:hidden -mx-4">
        <div className="flex gap-3 overflow-x-auto pb-2 px-4 touch-pan-x" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {items.map((item, i) => (
            <div key={i} className="flex-none w-48 h-64 rounded overflow-hidden bg-surface">
              <button onClick={() => openAt(i)} className="w-full h-full focus:outline-none" disabled={item.status !== 'done'}>
                {renderThumbnailContent(item, i)}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* LIGHTBOX */}
      {openIndex !== null && items[openIndex]?.status === 'done' && (
        <div
          ref={lightboxRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          onClick={(e) => { if (e.target === lightboxRef.current) closeLightbox(); }}
        >
          <style>{`.animate-fade-in { animation: fadeIn 0.3s ease-out; } @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }`}</style>
          <div
            className="relative w-full max-w-4xl max-h-full flex flex-col items-center"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {/* Main image content */}
            <div className="relative">
                <img
                    src={items[openIndex].url}
                    alt={styles[openIndex] || `Image ${openIndex + 1}`}
                    className="max-h-[75vh] w-auto max-w-full rounded shadow-lg object-contain"
                    draggable={false}
                />
            </div>

            {/* Controls */}
             <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-white">
                <span className="font-bold text-lg">{styles[openIndex] || `Image ${openIndex + 1}`}</span>
                 <div className="flex items-center gap-2">
                    {onDownload && (
                        <button
                          onClick={() => onDownload(openIndex)}
                          className="px-4 py-2 rounded bg-accent-2 text-black text-sm font-bold hover:brightness-110 transition-all"
                        >
                          Download
                        </button>
                    )}
                    {onRegenerate && (
                        <button
                          onClick={() => { closeLightbox(); onRegenerate(openIndex); }}
                          className="px-4 py-2 rounded bg-white/20 text-sm font-bold hover:bg-white/30 transition-colors"
                        >
                          Regenerate
                        </button>
                    )}
                    <button
                      onClick={closeLightbox}
                      className="px-4 py-2 rounded bg-white/20 text-sm font-bold hover:bg-white/30 transition-colors"
                    >
                      Close
                    </button>
                 </div>
            </div>


            {/* Prev/Next buttons */}
            <button
              onClick={prev}
              className="absolute left-0 -translate-x-4 sm:translate-x-0 sm:-left-12 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white text-3xl font-thin transition-all"
              aria-label="Previous"
            >
              &#x2039;
            </button>
             <button
              onClick={next}
              className="absolute right-0 translate-x-4 sm:translate-x-0 sm:-right-12 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white text-3xl font-thin transition-all"
              aria-label="Next"
            >
              &#x203A;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
