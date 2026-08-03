'use client';

import { useState, useCallback, useMemo } from 'react';
import { Hand, ZoomIn, Sun, Contrast, RefreshCw, ImageIcon, AlertTriangle, CheckCircle2, Upload } from 'lucide-react';

interface ImageSlice {
  original: string;
  heatmap?: string;
  detection?: string;
  confidence?: number;
  cancerDetected?: boolean;
  prediction?: string;
  cancerType?: string;
  probability?: number;
  tumor?: any;
  measurements?: any;
  inferenceTime?: string;
}

interface ImageViewerProps {
  images?: string[] | ImageSlice[];
  heatmapUrl?: string;
  detectionUrl?: string;
  patientName?: string;
  imageResults?: any[];
  activeIndex?: number;
  primaryImageIndex?: number;
  onSelectIndex?: (index: number) => void;
}

type ViewMode = 'original' | 'detected' | 'heatmap';

function Skeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#0a1020] animate-pulse">
      <ImageIcon size={40} className="text-slate-600" />
    </div>
  );
}

function SafeImage({ src, alt, className, lazy }: { src: string; alt: string; className?: string; lazy?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[#0a1020] gap-2">
        <AlertTriangle size={28} className="text-slate-500" />
        <span className="text-xs text-slate-500">Image unavailable</span>
      </div>
    );
  }

  return (
    <>
      {!loaded && <Skeleton />}
      <img
        src={src}
        alt={alt}
        loading={lazy ? 'lazy' : undefined}
        className={`${className || ''} ${loaded ? 'opacity-100' : 'opacity-0 absolute'}`}
        style={{ transition: 'opacity 0.3s ease' }}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </>
  );
}

/**
 * Normalize input images into a uniform slice array.
 * Supports legacy `string[]` (merged with `imageResults`) and the
 * PACS object format `{ original, heatmap, detection, ... }[]`.
 */
function normalizeSlices(
  images: string[] | ImageSlice[] = [],
  imageResults: any[] = [],
  topLevelDetectionUrl?: string
): ImageSlice[] {
  const first = images[0];
  if (typeof first === 'string' || images.length === 0) {
    // Legacy string[] format — combine with per-image results
    return (images as string[]).map((url, idx) => {
      const r = imageResults[idx] || {};
      return {
        original: url,
        heatmap: r.heatmapUrl || '',
        detection: r.detectionUrl || topLevelDetectionUrl || '',
        confidence: r.confidence || 0,
        cancerDetected: r.cancerDetected || false,
        prediction: r.prediction || '',
        cancerType: r.cancerType || '',
        probability: r.probability || 0,
        tumor: r.tumor || {},
        measurements: r.measurements || {},
        inferenceTime: r.inferenceTime || '',
      };
    });
  }
  // Object format — use directly
  return (images as ImageSlice[]).map((s) => ({
    original: s.original || '',
    heatmap: s.heatmap || '',
    detection: s.detection || '',
    confidence: s.confidence || 0,
    cancerDetected: s.cancerDetected || false,
    prediction: s.prediction || '',
    cancerType: s.cancerType || '',
    probability: s.probability || 0,
    tumor: s.tumor || {},
    measurements: s.measurements || {},
    inferenceTime: s.inferenceTime || '',
  }));
}

export function ImageViewer({
  images = [],
  heatmapUrl,
  detectionUrl,
  patientName,
  imageResults = [],
  activeIndex = 0,
  primaryImageIndex = -1,
  onSelectIndex,
}: ImageViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('original');

  const slices = useMemo(
    () => normalizeSlices(images as any, imageResults, detectionUrl),
    [images, imageResults, detectionUrl]
  );

  const handleThumbnailClick = useCallback(
    (index: number) => {
      // Preserve current view mode — only the displayed image changes (PACS behavior)
      if (onSelectIndex) {
        onSelectIndex(index);
      }
    },
    [onSelectIndex]
  );

  const hasNoImages = slices.length === 0;

  // Per-slice URLs for the currently active image
  const currentSlice = slices[activeIndex] || {};
  const effectiveOriginal = currentSlice.original || '';
  const effectiveHeatmapUrl = currentSlice.heatmap || heatmapUrl || '';
  const effectiveDetectionUrl = currentSlice.detection || detectionUrl || '';

  // Empty state: no images uploaded yet
  if (hasNoImages) {
    return (
      <div className="overflow-hidden rounded-[20px] border border-white/10 bg-[#071027] p-4">
        <div className="flex h-[520px] w-full items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <Upload size={48} className="text-slate-600" />
            <p className="text-lg font-medium text-slate-400">Upload MRI/CT Scan</p>
            <p className="text-sm text-slate-600">Drag and drop or click Upload Scan to begin</p>
          </div>
        </div>
      </div>
    );
  }

  // Determine which image to show in the main viewer based on view mode
  const getCurrentImage = (): string | null => {
    switch (viewMode) {
      case 'heatmap':
        return effectiveHeatmapUrl || effectiveOriginal || null;
      case 'detected':
        return effectiveDetectionUrl || effectiveOriginal || null;
      case 'original':
      default:
        return effectiveOriginal || null;
    }
  };

  const currentImage = getCurrentImage();

  // Build thumbnails: one per uploaded slice
  const imageThumbnails = slices.map((slice, idx) => ({
    key: `img-${idx}`,
    src: slice.original,
    label: `Image ${idx + 1}`,
    index: idx,
    isPrimary: idx === primaryImageIndex,
    result: slice,
  }));

  // Show view-mode toggles if ANY slice has a heatmap/detection
  const hasAnyHeatmap = slices.some((s) => !!s.heatmap);
  const hasAnyDetection = slices.some((s) => !!s.detection);

  return (
    <div className="overflow-hidden rounded-[20px] border border-white/10 bg-[#071027] p-4">
      <div className="relative flex h-[520px] w-full items-stretch gap-4">
        {/* Left toolbar */}
        <div className="flex w-16 flex-col items-center gap-3">
          {[
            { icon: Hand, label: 'Pan' },
            { icon: ZoomIn, label: 'Zoom' },
            { icon: Sun, label: 'Window' },
            { icon: Contrast, label: 'Level' },
            { icon: RefreshCw, label: 'Reset' },
          ].map((item) => {
            const Icon = item.icon as any;
            return (
              <button key={item.label} className="flex h-12 w-12 flex-col items-center justify-center gap-1 rounded-xl border border-white/6 bg-[#050615]/40 text-slate-300 hover:bg-[#1f1530] focus:outline-none">
                <div className="flex items-center justify-center rounded-md p-1 text-white">
                  <Icon size={18} />
                </div>
                <div className="text-[10px] text-slate-400">{item.label}</div>
              </button>
            );
          })}
        </div>

        {/* Main viewer */}
        <div className="relative flex-1 overflow-hidden rounded-[12px] border border-white/8 bg-black p-3">
          <div className="relative h-full w-full rounded-[8px] bg-black">
            <SafeImage
              src={currentImage || ''}
              alt={patientName ? `Scan for ${patientName}` : 'CT scan'}
              className="h-full w-full object-contain"
            />

            {/* R / L markers */}
            <div className="absolute left-4 top-6 text-sm font-semibold text-white/90">R</div>
            <div className="absolute right-4 top-6 text-sm font-semibold text-white/90">L</div>

            {/* Overlay indicator */}
            {viewMode === 'heatmap' && effectiveHeatmapUrl && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-slate-800/80 px-3 py-1 text-xs text-white">
                Grad-CAM Heatmap Overlay
              </div>
            )}
            {viewMode === 'detected' && effectiveDetectionUrl && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-red-500/80 px-3 py-1 text-xs text-white">
                AI Detection View
              </div>
            )}

            {/* Image index overlay */}
            {slices.length > 1 && (
              <div className="absolute top-4 right-4 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white/80">
                {activeIndex + 1} / {slices.length}
              </div>
            )}
          </div>
        </div>

        {/* Right spacer */}
        <div className="w-2" />
      </div>

      {/* Bottom: Image thumbnails + View mode switcher */}
      <div className="mt-4 space-y-3">
        {/* Image thumbnails strip */}
        {imageThumbnails.length > 0 && (
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 overflow-x-auto rounded-[12px] bg-[#071027] p-2 max-w-full">
              {imageThumbnails.map((thumb) => {
                const isPrimary = thumb.isPrimary;
                const isCancer = thumb.result?.cancerDetected;
                const confidence = thumb.result?.confidence || 0;
                return (
                  <button
                    key={thumb.key}
                    onClick={() => handleThumbnailClick(thumb.index)}
                    className={`relative flex-shrink-0 h-20 w-28 overflow-hidden rounded-[8px] border transition ${
                      activeIndex === thumb.index
                        ? 'border-primary ring-2 ring-primary/40'
                        : isPrimary
                        ? 'border-amber-400/60 ring-2 ring-amber-400/30'
                        : 'border-white/8 hover:border-white/20'
                    }`}
                    title={`${thumb.label}${isCancer ? ` - Cancer ${confidence}%` : ''}${isPrimary ? ' (Primary)' : ''}`}
                  >
                    <SafeImage src={thumb.src} alt={thumb.label} className="h-full w-full object-cover" lazy />
                    {/* Badges */}
                    <div className="absolute top-0.5 left-0.5 flex gap-0.5">
                      {isPrimary && (
                        <span className="bg-amber-500 text-white text-[7px] px-1 py-0.5 rounded font-bold">★</span>
                      )}
                      {isCancer && (
                        <span className="bg-red-500 text-white text-[7px] px-1 py-0.5 rounded">{confidence}%</span>
                      )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[9px] text-white text-center leading-tight py-0.5">
                      {thumb.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* View mode switcher */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setViewMode('original')}
            className={`rounded-lg px-3 py-1.5 text-xs transition ${
              viewMode === 'original'
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            Original
          </button>
          {hasAnyDetection && (
            <button
              onClick={() => setViewMode('detected')}
              className={`rounded-lg px-3 py-1.5 text-xs transition ${
                viewMode === 'detected'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              Detection
            </button>
          )}
          {hasAnyHeatmap && (
            <button
              onClick={() => setViewMode('heatmap')}
              className={`rounded-lg px-3 py-1.5 text-xs transition ${
                viewMode === 'heatmap'
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              Heatmap
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

