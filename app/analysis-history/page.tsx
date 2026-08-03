"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight, CalendarRange, ChevronLeft, ChevronRight, Contrast,
  Download, FileText, Hand, Printer, RefreshCw, Search, Share2,
  SlidersHorizontal, Sun, ZoomIn, X, LoaderCircle, BarChart3, Ruler, MapPin, Thermometer
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useScan } from '@/lib/scan-context';
import { historyAPI, analysisAPI } from '@/lib/api';
import { connectSocket, onSocketEvent, SOCKET_EVENTS } from '@/lib/socket';
import { PredictionCard } from '@/components/cards/prediction-card';

type SortOption =
  | 'newest'
  | 'oldest'
  | 'confidence'
  | 'patient-az'
  | 'patient-za'
  | 'cancer-type'
  | 'scan-type';

type AnalysisRecord = {
  _id: string;
  date: string;
  title: string;
  cancerType: string;
  scanType: string;
  doctor: string;
  confidence: number;
  patientName: string;
  patientId: string;
  patientAge: number;
  patientGender: string;
  imageUrls: string[];
  imageResults: any[];
  primaryImageIndex: number;
  explanation: string;
  tumorSize: string;
  location: string;
  probabilityScore: string;
  riskLevel: string;
  heatmapUrl: string;
  inferenceTime: string;
  modelVersion: string;
  scanId: string;
  analysis: any;
};

const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'confidence', label: 'Highest Confidence' },
  { value: 'patient-az', label: 'Patient Name (A-Z)' },
  { value: 'patient-za', label: 'Patient Name (Z-A)' },
  { value: 'cancer-type', label: 'Cancer Type' },
  { value: 'scan-type', label: 'Scan Type (MRI / CT)' },
];

function toDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function getScanTypeRank(scanType: string) {
  if (scanType === 'MRI') return 0;
  if (scanType === 'CT') return 1;
  return 2;
}

function PredictionSummaryCard({
  resultLabel,
  confidence,
}: {
  resultLabel: 'Malignant' | 'Benign' | 'Under Review';
  confidence: number;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(confidence)));
  const size = 120;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);

  return (
    <Card className="border border-white/8 bg-[#0C1324] shadow-soft">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">Prediction Result</p>
          </div>
          <div className="text-slate-400">
            <FileText size={14} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className={`text-2xl font-semibold ${resultLabel === 'Malignant' ? 'text-[#ff3b3b]' : resultLabel === 'Benign' ? 'text-success' : 'text-warning'}`}>
              {resultLabel}
            </h3>
            <p className="mt-1 text-sm text-red-100/80">({resultLabel === 'Malignant' ? 'Cancer Detected' : resultLabel === 'Benign' ? 'No Cancer Detected' : 'Requires Review'})</p>
          </div>

          <div className="flex w-1/3 items-center justify-center">
            <div className="relative flex items-center justify-center">
              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <defs>
                  <linearGradient id="gradRed" x1="0%" x2="100%" y1="0%" y2="0%">
                    <stop offset="0%" stopColor="#ff4d4d" />
                    <stop offset="100%" stopColor="#ff1f1f" />
                  </linearGradient>
                </defs>
                <circle cx={size / 2} cy={size / 2} r={radius} stroke="#0c1220" strokeWidth={stroke} fill="none" />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="url(#gradRed)"
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
                <circle cx={size / 2} cy={size / 2} r={radius - stroke * 0.6} fill="#071026" />
              </svg>

              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold text-white">{pct}%</span>
                <span className="mt-1 text-xs text-slate-400">Confidence</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-white/10 bg-[#0F172A]">
      <CardHeader>
        <p className="text-sm text-slate-400">{title}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ModalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0A1020] p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function orNotGenerated(value: any): string {
  if (value === null || value === undefined || value === '') return 'Not generated';
  return String(value);
}

export default function AnalysisHistoryPage() {
  const router = useRouter();
  const { historyEntries, setHistoryEntries } = useScan();
  const [sortOpen, setSortOpen] = useState(false);
  const [sortValue, setSortValue] = useState<SortOption>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const sortButtonRef = useRef<HTMLButtonElement | null>(null);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);

  // Connect socket on mount
  useEffect(() => {
    connectSocket();
  }, []);

  // Socket event listener for real-time updates
  useEffect(() => {
    return onSocketEvent(SOCKET_EVENTS.ANALYSIS_COMPLETED, (data: any) => {
      // Refresh history when a new analysis completes
      historyAPI.getAll({ limit: 100, sort: 'newest' }).then(response => {
        if (response.success) {
          setHistoryEntries(response.history || []);
        }
      }).catch(console.error);
    });
  }, [setHistoryEntries]);

  // Load history from API on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await historyAPI.getAll({ limit: 100, sort: 'newest' });
        if (response.success) {
          setHistoryEntries(response.history || []);
        }
      } catch (error) {
        console.error('Failed to load history:', error);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, [setHistoryEntries]);

  const analysisRecords = useMemo<AnalysisRecord[]>(() => {
    const records = historyEntries.map((entry: any) => {
      const analysis = entry.analysis || {};
      const tumor = analysis.tumor || {};
      const clinical = analysis.clinical || {};
      const ai = analysis.ai || {};
      
      return {
        _id: entry._id,
        date: entry.date || entry.createdAt?.split('T')[0] || '',
        title: analysis.prediction || entry.prediction || 'No Cancer Detected',
        cancerType: analysis.cancerType || entry.cancerType || '',
        scanType: entry.scanType || 'MRI',
        doctor: entry.doctorName || entry.doctor || '',
        confidence: analysis.confidence || entry.confidence || 0,
        patientName: entry.patientName || 'No patient selected',
        patientId: entry.patientId || '',
        patientAge: entry.patientAge || 0,
        patientGender: entry.patientGender || 'Other',
        imageUrls: entry.imageUrls || [],
        imageResults: entry.imageResults || [],
        primaryImageIndex: entry.primaryImageIndex ?? 0,
        explanation: ai.explanation || entry.explanation || '',
        tumorSize: tumor.size || entry.tumorSize || '',
        location: tumor.location || entry.location || '',
        probabilityScore: String(tumor.probability || entry.probabilityScore || ''),
        riskLevel: tumor.risk || entry.riskLevel || '',
        heatmapUrl: ai.heatmapUrl || entry.heatmapUrl || '',
        inferenceTime: entry.inferenceTime || '',
        modelVersion: entry.modelVersion || '',
        scanId: typeof entry.scanId === 'object' ? (entry.scanId?._id || entry._id) : (entry.scanId || entry._id),
        analysis: analysis,
      };
    });

    const sorted = [...records].sort((left, right) => {
      switch (sortValue) {
        case 'newest':
          return toDate(right.date).getTime() - toDate(left.date).getTime();
        case 'oldest':
          return toDate(left.date).getTime() - toDate(right.date).getTime();
        case 'confidence':
          return right.confidence - left.confidence;
        case 'patient-az':
          return left.patientName.localeCompare(right.patientName);
        case 'patient-za':
          return right.patientName.localeCompare(left.patientName);
        case 'cancer-type':
          return left.cancerType.localeCompare(right.cancerType);
        case 'scan-type':
          return getScanTypeRank(left.scanType) - getScanTypeRank(right.scanType) || left.scanType.localeCompare(right.scanType);
        default:
          return 0;
      }
    });

    return sorted;
  }, [sortValue, historyEntries]);

  // Filter by search query
  const filteredRecords = useMemo(() => {
    if (!searchQuery) return analysisRecords;
    return analysisRecords.filter((record) =>
      record.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, analysisRecords]);

  const selectedAnalysis = selectedIndex !== null ? filteredRecords[selectedIndex] ?? null : null;

  useEffect(() => {
    if (!sortOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (sortButtonRef.current?.contains(target) || sortMenuRef.current?.contains(target)) return;
      setSortOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [sortOpen]);

  useEffect(() => {
    if (!selectedAnalysis) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedIndex(null);
      }
      if (event.key === 'ArrowLeft') {
        setSelectedIndex((current) => (current === null ? current : (current - 1 + filteredRecords.length) % filteredRecords.length));
      }
      if (event.key === 'ArrowRight') {
        setSelectedIndex((current) => (current === null ? current : (current + 1) % filteredRecords.length));
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [filteredRecords.length, selectedAnalysis]);

  useEffect(() => {
    if (!selectedAnalysis) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedAnalysis]);

  const openAnalysis = (index: number) => {
    const record = filteredRecords[index];
    const objectScanId = typeof record?.scanId === 'object' && record?.scanId !== null
      ? (record.scanId as { _id?: string } | null)?.['_id'] || record._id || ''
      : '';
    const normalizedScanId = objectScanId || (typeof record?.scanId === 'string' && record.scanId ? record.scanId : record?._id || '');

    if (normalizedScanId) {
      router.push(`/analysis/${normalizedScanId}`);
    }
  };

  const closeAnalysis = () => setSelectedIndex(null);

  const exportAnalysis = (analysis: AnalysisRecord) => {
    downloadTextFile(
      `${analysis._id}-analysis.txt`,
      [
        `Analysis ID: ${analysis._id}`,
        `Patient: ${analysis.patientName}`,
        `Patient ID: ${analysis.patientId}`,
        `Date: ${analysis.date}`,
        `Title: ${analysis.title}`,
        `Confidence: ${analysis.confidence}%`,
        `Cancer Type: ${analysis.cancerType}`,
        `Scan Type: ${analysis.scanType}`,
        `Doctor: ${analysis.doctor}`,
        `Tumor Size: ${analysis.tumorSize || 'Not generated'}`,
        `Location: ${analysis.location || 'Not generated'}`,
        `Probability: ${analysis.probabilityScore || 'Not generated'}`,
        `Risk Level: ${analysis.riskLevel || 'Not generated'}`,
        `AI Explanation: ${analysis.explanation || 'Not generated'}`,
      ].join('\n')
    );
  };

  const currentAnalysis = selectedAnalysis;
  const nextIndex = currentAnalysis ? (selectedIndex! + 1) % filteredRecords.length : null;
  const previousIndex = currentAnalysis ? (selectedIndex! - 1 + filteredRecords.length) % filteredRecords.length : null;

  return (
    <main className="space-y-6 p-6">
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[24px] border border-white/10 bg-[#0F1629] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Analysis Timeline</p>
            <h2 className="text-2xl font-semibold text-white">Recent AI predictions</h2>
          </div>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400">
              <Search size={16} />
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent outline-none" 
                placeholder="Search by patient name, ID, or prediction" 
              />
            </label>

            <div className="relative">
              <motion.button
                ref={sortButtonRef}
                whileHover={{ y: -1, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSortOpen((current) => !current)}
                className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10"
              >
                <SlidersHorizontal size={16} />
                Sort
              </motion.button>

              <AnimatePresence>
                {sortOpen && (
                  <motion.div
                    ref={sortMenuRef}
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="absolute right-0 top-full z-30 mt-2 w-[260px] overflow-hidden rounded-[18px] border border-white/10 bg-[#0A1020] shadow-2xl shadow-black/40"
                  >
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortValue(option.value);
                          setSortOpen(false);
                        }}
                        className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm text-slate-300 transition duration-200 hover:bg-primary/15 hover:text-white ${sortValue === option.value ? 'bg-primary/10 text-white' : ''}`}
                      >
                        <span>{option.label}</span>
                        {sortValue === option.value ? <span className="text-primary">•</span> : null}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.section>

      <section className="grid gap-4">
        {loading ? (
          <div className="text-center py-8 text-slate-400">Loading analysis history...</div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-8 text-slate-400">No analysis history found</div>
        ) : (
          filteredRecords.map((prediction, index) => (
            <Card key={prediction._id} className="border-white/10 bg-[#0F1629]">
              <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-slate-400">{prediction.date || 'Not generated'}</p>
                  <h3 className="text-lg font-semibold text-white">{prediction.patientName}</h3>
                  <p className="text-sm text-slate-400">{prediction.patientId || 'Not generated'}</p>
                  <p className="text-sm text-slate-400 mt-1">{prediction.title}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                  <div className="rounded-2xl border border-white/10 bg-[#0A1020] px-3 py-2">{prediction.scanType}</div>
                  <div className="rounded-2xl border border-white/10 bg-[#0A1020] px-3 py-2">{prediction.confidence}%</div>
                  <div className="rounded-2xl border border-white/10 bg-[#0A1020] px-3 py-2">{prediction.doctor || 'Not generated'}</div>
                  <motion.button
                    whileHover={{ y: -1, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openAnalysis(index)}
                    className="flex items-center gap-2 rounded-2xl bg-primary/15 px-3 py-2 font-medium text-primary transition hover:bg-primary/25"
                  >
                    Open Analysis <ArrowRight size={16} />
                  </motion.button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </main>
  );
}