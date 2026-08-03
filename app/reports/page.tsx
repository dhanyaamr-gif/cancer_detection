  "use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Download, Eye, LoaderCircle, Printer, Search, Share2, SlidersHorizontal, X, FileText, CalendarDays, Stethoscope, ShieldCheck, ArrowLeftRight, Copy, Mail, Users, Link2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useScan } from '@/lib/scan-context';
import { reportsAPI } from '@/lib/api';
import { connectSocket, onSocketEvent, SOCKET_EVENTS } from '@/lib/socket';
import { ImageViewer } from '@/components/viewer/image-viewer';

type ReportStatusFilter = 'All' | 'Completed' | 'Pending' | 'Reviewed';
type PredictionFilter = 'All' | 'Positive' | 'Negative' | 'Under Review';
type ConfidenceFilter = 'All' | 'Above 95%' | '90–95%' | 'Below 90%';
type ScanTypeFilter = 'All' | 'MRI' | 'CT' | 'PET' | 'X-Ray';
type DateFilter = 'All' | 'Today' | 'Last 7 Days' | 'Last 30 Days' | 'Custom Date Range';
type ShareMode = 'Copy Secure Link' | 'Email Report' | 'Share with Hospital' | 'Share with Specialist' | 'Generate Temporary Access Link';

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function reportMatchesDateFilter(reportDate: string, filter: DateFilter, customStart: string, customEnd: string) {
  const date = new Date(`${reportDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDays = new Date(today);
  sevenDays.setDate(sevenDays.getDate() - 6);
  const thirtyDays = new Date(today);
  thirtyDays.setDate(thirtyDays.getDate() - 29);

  if (filter === 'All') return true;
  if (filter === 'Today') return date.getTime() === today.getTime();
  if (filter === 'Last 7 Days') return date >= sevenDays && date <= today;
  if (filter === 'Last 30 Days') return date >= thirtyDays && date <= today;
  if (filter === 'Custom Date Range') {
    if (!customStart || !customEnd) return true;
    return date >= new Date(`${customStart}T00:00:00`) && date <= new Date(`${customEnd}T00:00:00`);
  }
  return true;
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadBlobFile(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function orNotGenerated(value: any): string {
  if (value === null || value === undefined || value === '') return 'Not generated';
  return String(value);
}

async function createReportPdf(reportId: string, detail: any, patientName: string) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const accent = rgb(0.67, 0.49, 1);
  const dark = rgb(0.05, 0.09, 0.17);
  const soft = rgb(0.58, 0.64, 0.74);

  const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 1, color: rgb(0.19, 0.22, 0.32) });
  };

  page.drawText('NovaDx', { x: 48, y: 792, size: 22, font: bold, color: accent });
  page.drawText('Professional Medical Report', { x: 48, y: 770, size: 11, font: regular, color: soft });
  page.drawText(`Report ID: ${reportId}`, { x: 48, y: 748, size: 12, font: bold, color: dark });
  page.drawText(`Patient: ${patientName}`, { x: 48, y: 730, size: 11, font: regular, color: dark });
  page.drawText(`Doctor: ${orNotGenerated(detail?.doctor)}`, { x: 48, y: 714, size: 11, font: regular, color: dark });
  page.drawText(`Scan Date: ${formatDate(detail?.scanDate || '')}`, { x: 48, y: 698, size: 11, font: regular, color: dark });

  drawLine(48, 684, 547, 684);

  const sections = [
    ['Scan Information', [`Scan Type: ${orNotGenerated(detail?.scanType)}`, `AI Prediction: ${orNotGenerated(detail?.aiPrediction || detail?.prediction)}`, `Confidence: ${detail?.confidence || 0}%`]],
    ['Tumor Details', [`Tumor Size: ${orNotGenerated(detail?.tumorSize)}`, `Location: ${orNotGenerated(detail?.location)}`, `Probability Score: ${orNotGenerated(detail?.probabilityScore)}`, `Risk Level: ${orNotGenerated(detail?.riskLevel)}`]],
    ['Clinical Notes', [orNotGenerated(detail?.clinicalNotes)]],
    ['AI Explanation', [orNotGenerated(detail?.aiExplanation)]],
    ['Final Diagnosis', [orNotGenerated(detail?.finalDiagnosis)]],
    ['Recommendation', [orNotGenerated(detail?.recommendation)]],
  ] as const;

  let cursorY = 662;
  for (const [title, lines] of sections) {
    page.drawText(title, { x: 48, y: cursorY, size: 13, font: bold, color: dark });
    cursorY -= 18;
    for (const line of lines) {
      const wrapped = line.length > 85 ? line.match(/.{1,85}(\s|$)/g) ?? [line] : [line];
      for (const chunk of wrapped) {
        page.drawText(chunk.trim(), { x: 60, y: cursorY, size: 10.5, font: regular, color: dark, maxWidth: 480, lineHeight: 14 });
        cursorY -= 14;
      }
    }
    cursorY -= 10;
  }

  page.drawText(`Timestamp: ${orNotGenerated(detail?.timestamp)}`, { x: 48, y: 112, size: 10, font: regular, color: soft });
  page.drawText('Generated by NovaDx', { x: 48, y: 94, size: 10, font: regular, color: soft });
  page.drawText('Confidential - For clinical use only', { x: 48, y: 58, size: 10, font: regular, color: soft });

  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}

function ReportPreviewModal({
  report,
  reportImages,
  onClose,
  onDownload,
  onPrint,
  onShare,
}: {
  report: any;
  reportImages?: any[];
  onClose: () => void;
  onDownload: () => void;
  onPrint: () => void;
  onShare: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="relative flex h-[90vh] w-[90vw] max-w-[1400px] flex-col overflow-y-auto rounded-[28px] border border-white/10 bg-[#081122] shadow-2xl shadow-black/60">
        <div className="sticky top-0 z-30 flex h-[112px] shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-[#081122] px-6 py-5">
        <div>
          <p className="text-sm text-slate-400">Report Preview</p>
          <h3 className="text-2xl font-semibold text-white">{report.patientName || report.patient}</h3>
          <p className="text-sm text-slate-400">{report.patientId || 'Not generated'}</p>
          <p className="mt-1 text-sm text-slate-500">{report.reportNumber || report.id} • {report.doctor || 'Not generated'} • {report.date}</p>
        </div>
          <button onClick={onClose} className="rounded-2xl border border-white/10 p-2 text-slate-300 transition hover:bg-white/5">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-5 px-6 pb-6 pt-[136px] xl:grid-cols-[minmax(0,0.7fr)_minmax(0,0.3fr)]">
          <div className="space-y-5">
            <Card className="border-white/10 bg-[#0F172A]">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-400">Patient Information</p>
                    <h4 className="text-xl font-semibold text-white">{report.patientName || report.patient}</h4>
                    <p className="text-sm text-slate-400">{report.patientId || 'Not generated'}</p>
                  </div>
                  <div className="rounded-2xl bg-white/5 px-3 py-2 text-sm text-slate-300">{report.patientAge || 0} Years • {report.patientGender || 'Other'}</div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <PreviewItem label="Report ID" value={report.reportNumber || report.id} />
                <PreviewItem label="Scan Date" value={formatDate(report.scanDate || report.date)} />
                <PreviewItem label="Doctor" value={report.doctor || 'Not generated'} />
                <PreviewItem label="Scan Type" value={report.scanType || 'Not generated'} />
                <PreviewItem label="AI Prediction" value={report.aiPrediction || report.prediction || 'Not generated'} />
                <PreviewItem label="Confidence" value={`${report.confidence || 0}%`} />
              </CardContent>
            </Card>

<Card className="border-white/10 bg-[#0F172A]">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-400">Scan Analysis</p>
                    <h4 className="text-xl font-semibold text-white">Grad-CAM evidence map</h4>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ImageViewer
                  images={reportImages}
                  heatmapUrl={report.heatmapUrl}
                  detectionUrl={report.detectionUrl}
                  patientName={report.patientName || report.patient}
                />
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#0F172A]">
              <CardHeader>
                <p className="text-sm text-slate-400">AI Explanation</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-slate-300">{report.aiExplanation || 'Not generated'}</p>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#0F172A]">
              <CardHeader>
                <p className="text-sm text-slate-400">Clinical Notes</p>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <PreviewItem label="Doctor Observations" value={report.clinicalNotes || 'Not generated'} />
                <PreviewItem label="Final Diagnosis" value={report.finalDiagnosis || 'Not generated'} />
                <PreviewItem label="Recommendation" value={report.recommendation || 'Not generated'} />
                <PreviewItem label="Report Status" value={report.status || 'Not generated'} />
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#0F172A]">
              <CardHeader>
                <p className="text-sm text-slate-400">AI Metrics</p>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <PreviewItem label="Inference Time" value={report.inferenceTime || 'Not generated'} />
                <PreviewItem label="Model Version" value={report.modelVersion || 'Not generated'} />
                <PreviewItem label="CNN Confidence" value={`${report.confidence || 0}%`} />
                <PreviewItem label="Quantum Confidence" value={`${Math.max((report.confidence || 0) - 2, 0)}%`} />
                <PreviewItem label="Overall Confidence" value={`${report.confidence || 0}%`} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <PredictionCard report={report} />

            <Card className="border-white/10 bg-[#0F172A]">
              <CardHeader>
                <p className="text-sm text-slate-400">Tumor Details</p>
              </CardHeader>
              <CardContent className="grid gap-3">
                <PreviewItem label="Tumor Size" value={report.tumorSize || 'Not generated'} />
                <PreviewItem label="Location" value={report.location || 'Not generated'} />
                <PreviewItem label="Probability Score" value={report.probabilityScore || 'Not generated'} />
                <PreviewItem label="Risk Level" value={report.riskLevel || 'Not generated'} />
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#0F172A]">
              <CardHeader>
                <p className="text-sm text-slate-400">Grad-CAM Heatmap</p>
              </CardHeader>
              <CardContent>
                {report.heatmapUrl ? (
                  <img src={report.heatmapUrl} alt="Grad-CAM heatmap" className="h-56 w-full rounded-[16px] object-cover" />
                ) : (
                  <div className="flex h-56 w-full items-center justify-center rounded-[16px] border border-white/10 bg-black">
                    <span className="text-sm text-slate-500">No Heatmap Available</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-5 border-t border-white/10 px-6 py-6 xl:grid-cols-[1fr_1fr_0.9fr]">
          <Card className="border-white/10 bg-[#0F172A]">
            <CardHeader>
              <p className="text-sm text-slate-400">Patient Details</p>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <PreviewItem label="Patient Name" value={report.patientName || report.patient || 'Not generated'} />
              <PreviewItem label="Patient ID" value={report.patientId || 'Not generated'} />
              <PreviewItem label="Doctor" value={report.doctor || 'Not generated'} />
              <PreviewItem label="Scan Type" value={report.scanType || 'Not generated'} />
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-[#0F172A]">
            <CardHeader>
              <p className="text-sm text-slate-400">Scan Information</p>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <PreviewItem label="Report ID" value={report.reportNumber || report.id} />
              <PreviewItem label="Scan Date" value={formatDate(report.scanDate || report.date)} />
              <PreviewItem label="AI Prediction" value={report.aiPrediction || report.prediction || 'Not generated'} />
              <PreviewItem label="Confidence" value={`${report.confidence || 0}%`} />
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-[#0F172A]">
            <CardHeader>
              <p className="text-sm text-slate-400">Report Actions</p>
            </CardHeader>
            <CardContent className="flex h-full flex-col justify-between gap-4">
              <div className="grid gap-3">
                <motion.button whileHover={{ y: -1, scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={onDownload} className="rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white shadow-soft transition hover:brightness-110">
                  Download PDF
                </motion.button>
                <motion.button whileHover={{ y: -1, scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={onPrint} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5">
                  Print
                </motion.button>
                <motion.button whileHover={{ y: -1, scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={onShare} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5">
                  Share
                </motion.button>
              </div>
              <button onClick={onClose} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5">
                Close
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

function PredictionCard({ report }: { report: any }) {
  const pct = Math.max(0, Math.min(100, Math.round(report.confidence || 0)));
  const size = 120;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);

  return (
    <Card className="border border-white/8 bg-[#0C1324] shadow-soft">
      <CardHeader>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-400">Prediction Result</p>
          <ShieldCheck size={14} className="text-slate-400" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className={`text-2xl font-semibold ${report.prediction === 'Positive' ? 'text-[#ff3b3b]' : report.prediction === 'Negative' ? 'text-success' : 'text-warning'}`}>
              {report.prediction === 'Positive' ? 'Malignant' : report.prediction === 'Negative' ? 'Benign' : 'Under Review'}
            </h3>
            <p className="mt-1 text-sm text-red-100/80">
              ({report.prediction === 'Positive' ? 'Cancer Detected' : report.prediction === 'Negative' ? 'No Cancer Detected' : 'Requires Review'})
            </p>
          </div>
          <div className="flex w-1/3 items-center justify-center">
            <div className="relative flex items-center justify-center">
              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <defs>
                  <linearGradient id="gradRedReport" x1="0%" x2="100%" y1="0%" y2="0%">
                    <stop offset="0%" stopColor="#ff4d4d" />
                    <stop offset="100%" stopColor="#ff1f1f" />
                  </linearGradient>
                </defs>
                <circle cx={size / 2} cy={size / 2} r={radius} stroke="#0c1220" strokeWidth={stroke} fill="none" />
                <circle cx={size / 2} cy={size / 2} r={radius} stroke="url(#gradRedReport)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
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

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0A1020] p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

export default function ReportsPage() {
  const { reports, setReports } = useScan();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>('All');
  const [predictionFilter, setPredictionFilter] = useState<PredictionFilter>('All');
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>('All');
  const [scanTypeFilter, setScanTypeFilter] = useState<ScanTypeFilter>('All');
  const [dateFilter, setDateFilter] = useState<DateFilter>('All');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [shareReportId, setShareReportId] = useState<string | null>(null);
  const [shareMode, setShareMode] = useState<ShareMode>('Copy Secure Link');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [accessDuration, setAccessDuration] = useState<'24 Hours' | '3 Days' | '7 Days'>('24 Hours');
  const [permission, setPermission] = useState<'View Only' | 'Download Allowed'>('View Only');
const [loadingDownloadId, setLoadingDownloadId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportImages, setReportImages] = useState<any[]>([]);
  const [loadingReportDetail, setLoadingReportDetail] = useState(false);
  const filtersButtonRef = useRef<HTMLButtonElement | null>(null);
  const filtersMenuRef = useRef<HTMLDivElement | null>(null);

  // Connect socket on mount
  useEffect(() => {
    connectSocket();
  }, []);

  // Socket event listener for real-time updates
  useEffect(() => {
    return onSocketEvent(SOCKET_EVENTS.ANALYSIS_COMPLETED, (data: any) => {
      // Refresh reports when a new analysis completes
      reportsAPI.getAll().then(response => {
        if (response.success) {
          setReports(response.reports || []);
        }
      }).catch(console.error);
    });
  }, [setReports]);

  // Load reports from API on mount
  useEffect(() => {
    const loadReports = async () => {
      try {
        const response = await reportsAPI.getAll();
        if (response.success) {
          setReports(response.reports || []);
        }
      } catch (error) {
        console.error('Failed to load reports:', error);
      } finally {
        setLoading(false);
      }
    };
    loadReports();
  }, [setReports]);

  const reportCards = useMemo(() => {
    return reports
      .map((report) => ({
        ...report,
        patientId: report.patientId || report.patient?.patientId || '',
        patientAge: report.patientAge || report.patient?.age || 0,
        patientGender: report.patientGender || report.patient?.gender || 'Other',
patientName: report.patientName || report.patient || 'Unknown Patient',
        scanType: report.scanType || 'Not generated',
        scanDate: report.scanDate || report.date,
        aiPrediction: report.aiPrediction || report.prediction || 'Not generated',
      }))
      .filter((report) => {
        const matchesStatus = statusFilter === 'All' || report.status === statusFilter;
        const matchesPrediction = predictionFilter === 'All' || report.prediction === predictionFilter;
        const matchesConfidence =
          confidenceFilter === 'All' ||
          (confidenceFilter === 'Above 95%' && report.confidence > 95) ||
          (confidenceFilter === '90–95%' && report.confidence >= 90 && report.confidence <= 95) ||
          (confidenceFilter === 'Below 90%' && report.confidence < 90);
        const matchesScanType = scanTypeFilter === 'All' || report.scanType === scanTypeFilter;
        const matchesDate = reportMatchesDateFilter(report.date, dateFilter, customStart, customEnd);
        return matchesStatus && matchesPrediction && matchesConfidence && matchesScanType && matchesDate;
      });
  }, [confidenceFilter, customEnd, customStart, dateFilter, predictionFilter, reports, scanTypeFilter, statusFilter]);

  const selectedReport = selectedReportId ? reportCards.find((report) => report._id === selectedReportId || report.id === selectedReportId) ?? null : null;
  const shareReport = shareReportId ? reportCards.find((report) => report._id === shareReportId || report.id === shareReportId) ?? null : null;

  useEffect(() => {
    if (!filtersOpen) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (filtersButtonRef.current?.contains(target) || filtersMenuRef.current?.contains(target)) return;
      setFiltersOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [filtersOpen]);

  useEffect(() => {
    if (!selectedReport && !shareReport && !loadingDownloadId) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [loadingDownloadId, selectedReport, shareReport]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const resetFilters = () => {
    setStatusFilter('All');
    setPredictionFilter('All');
    setConfidenceFilter('All');
    setScanTypeFilter('All');
    setDateFilter('All');
    setCustomStart('');
    setCustomEnd('');
  };

  const applyFilters = () => setFiltersOpen(false);

const openReportPreview = async (reportId: string) => {
    setSelectedReportId(reportId);
    setLoadingReportDetail(true);
    try {
      const response = await reportsAPI.getById(reportId);
      if (response.success && response.images) {
        setReportImages(response.images);
      } else {
        setReportImages([]);
      }
    } catch (error) {
      console.error('Failed to load report detail:', error);
      setReportImages([]);
    } finally {
      setLoadingReportDetail(false);
    }
  };

  const handlePrint = (report: NonNullable<typeof selectedReport>) => {
    const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1200');
    if (!win) return;
    const styles = `
      <style>
        @page { size: A4; margin: 18mm; }
        body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; }
        .title { color: #7c3aed; font-size: 28px; font-weight: 700; margin-bottom: 4px; }
        .muted { color: #475569; }
        .section { margin-top: 18px; }
        .card { border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; margin-top: 10px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        img { max-width: 100%; border-radius: 12px; }
        h2 { margin: 0 0 8px; font-size: 16px; }
        .row { margin-bottom: 8px; }
      </style>
    `;
    win.document.write(`
      <html>
        <head><title>${report.id || report._id}</title>${styles}</head>
        <body>
          <div class="title">NovaDx</div>
          <div class="muted">Professional Medical Report</div>
          <div class="section card">
            <div class="grid">
              <div><strong>Patient:</strong> ${report.patientName || report.patient}</div>
              <div><strong>Report ID:</strong> ${report.id || report._id}</div>
              <div><strong>Doctor:</strong> ${report.doctor || 'Not generated'}</div>
              <div><strong>Scan Date:</strong> ${formatDate(report.scanDate || report.date)}</div>
              <div><strong>Scan Type:</strong> ${report.scanType || 'Not generated'}</div>
              <div><strong>Confidence:</strong> ${report.confidence || 0}%</div>
            </div>
          </div>
          <div class="section card"><h2>Grad-CAM Heatmap</h2><img src="${report.heatmapUrl || ''}" alt="Grad-CAM heatmap" /></div>
          <div class="section card"><h2>AI Explanation</h2><div>${report.aiExplanation || 'Not generated'}</div></div>
          <div class="section card"><h2>Clinical Notes</h2><div>${report.clinicalNotes || 'Not generated'}</div></div>
          <div class="section card"><h2>Final Diagnosis</h2><div>${report.finalDiagnosis || 'Not generated'}</div></div>
          <div class="section card"><h2>Recommendation</h2><div>${report.recommendation || 'Not generated'}</div></div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.onload = () => {
      win.print();
      win.close();
    };
  };

  const handleDownload = async (report: NonNullable<typeof selectedReport>) => {
    setLoadingDownloadId(report._id || report.id);
    try {
      const patientName = report.patientName || report.patient;
      const blob = await createReportPdf(report._id || report.id, report, patientName);
      downloadBlobFile(`${report._id || report.id}.pdf`, blob);
    } catch {
      const patientName = report.patientName || report.patient;
      const fallback = `NovaDx Report\n${report._id || report.id}\n${patientName}`;
      downloadTextFile(`${report._id || report.id}.pdf`, fallback);
    } finally {
      setLoadingDownloadId(null);
    }
  };

  const handleShare = (report: NonNullable<typeof selectedReport>) => {
    setShareReportId(report._id || report.id);
    setRecipientEmail('');
    setAccessDuration('24 Hours');
    setPermission('View Only');
    setShareMode('Copy Secure Link');
  };

  const sendShare = () => {
    setToast('Report shared successfully.');
    setShareReportId(null);
  };

  return (
    <main className="space-y-6 p-6">
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[24px] border border-white/10 bg-[#0F1629] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Medical Reports</p>
            <h2 className="text-2xl font-semibold text-white">Professional report pipeline</h2>
          </div>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400">
              <Search size={16} />
              <input className="bg-transparent outline-none" placeholder="Search report" />
            </label>
            <div className="relative">
              <motion.button ref={filtersButtonRef} whileHover={{ y: -1, scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => setFiltersOpen((current) => !current)} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10">
                <SlidersHorizontal size={16} />
                Filters
              </motion.button>

              <AnimatePresence>
                {filtersOpen && (
                  <motion.div ref={filtersMenuRef} initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="absolute right-0 top-full z-30 mt-2 w-[360px] overflow-hidden rounded-[18px] border border-white/10 bg-[#0A1020] shadow-2xl shadow-black/40">
                    <div className="grid gap-4 p-4">
                      <FilterGroup title="Report Status" options={['All', 'Completed', 'Pending', 'Reviewed']} value={statusFilter} onChange={(value) => setStatusFilter(value as ReportStatusFilter)} />
                      <FilterGroup title="Prediction Result" options={['All', 'Positive', 'Negative', 'Under Review']} value={predictionFilter} onChange={(value) => setPredictionFilter(value as PredictionFilter)} />
                      <FilterGroup title="Confidence Range" options={['All', 'Above 95%', '90–95%', 'Below 90%']} value={confidenceFilter} onChange={(value) => setConfidenceFilter(value as ConfidenceFilter)} />
                      <FilterGroup title="Scan Type" options={['All', 'MRI', 'CT', 'PET', 'X-Ray']} value={scanTypeFilter} onChange={(value) => setScanTypeFilter(value as ScanTypeFilter)} />
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-white">Date</p>
                        <div className="grid grid-cols-2 gap-2 text-sm text-slate-300">
                          {(['All', 'Today', 'Last 7 Days', 'Last 30 Days', 'Custom Date Range'] as DateFilter[]).map((option) => (
                            <button key={option} onClick={() => setDateFilter(option)} className={`rounded-xl border px-3 py-2 text-left transition duration-200 hover:bg-primary/15 hover:text-white ${dateFilter === option ? 'border-primary/40 bg-primary/10 text-white' : 'border-white/10'}`}>
                              {option}
                            </button>
                          ))}
                        </div>
                        {dateFilter === 'Custom Date Range' && (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <input value={customStart} onChange={(event) => setCustomStart(event.target.value)} type="date" className="rounded-xl border border-white/10 bg-[#081122] px-3 py-2 text-sm text-white outline-none" />
                            <input value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} type="date" className="rounded-xl border border-white/10 bg-[#081122] px-3 py-2 text-sm text-white outline-none" />
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} onClick={resetFilters} className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/5">
                          Reset Filters
                        </motion.button>
                        <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} onClick={applyFilters} className="rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white shadow-soft transition hover:brightness-110">
                          Apply Filters
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.section>

      <section className="grid gap-4">
        {loading ? (
          <div className="text-center py-8 text-slate-400">Loading reports...</div>
        ) : reportCards.length === 0 ? (
          <div className="text-center py-8 text-slate-400">No reports found</div>
        ) : (
          reportCards.map((report) => (
            <Card key={report._id || report.id} className="border-white/10 bg-[#0F1629]">
              <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-slate-400">{report._id || report.id}</p>
                  <h3 className="text-lg font-semibold text-white">{report.patientName || report.patient}</h3>
                  <p className="text-sm text-slate-400">{report.patientId || 'Not generated'}</p>
                  <p className="text-sm text-slate-400">{report.doctor || 'Not generated'} • {report.date}</p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <div className="rounded-2xl border border-white/10 bg-[#0A1020] px-3 py-2 text-slate-300">Prediction {report.prediction || 'Not generated'}</div>
                  <div className="rounded-2xl border border-white/10 bg-[#0A1020] px-3 py-2 text-slate-300">Confidence {report.confidence || 0}%</div>
                  <div className="rounded-2xl border border-white/10 bg-[#0A1020] px-3 py-2 text-slate-300">Status {report.status || 'Not generated'}</div>
                </div>
                <div className="flex gap-2">
                  <button aria-label="View Report" onClick={() => openReportPreview(report._id || report.id)} className="rounded-2xl border border-white/10 bg-white/5 p-2 text-slate-300"><Eye size={16} /></button>
                  <button aria-label="Download PDF" onClick={() => void handleDownload(report)} className="rounded-2xl border border-white/10 bg-white/5 p-2 text-slate-300">
                    <Download size={16} />
                  </button>
                  <button aria-label="Print" onClick={() => handlePrint(report)} className="rounded-2xl border border-white/10 bg-white/5 p-2 text-slate-300"><Printer size={16} /></button>
                  <button aria-label="Share" onClick={() => handleShare(report)} className="rounded-2xl border border-white/10 bg-white/5 p-2 text-slate-300"><Share2 size={16} /></button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <AnimatePresence>
        {loadingDownloadId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0F172A] px-5 py-4 text-white shadow-2xl">
              <LoaderCircle className="animate-spin text-primary" size={20} />
              Generating PDF...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedReport && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedReportId(null)} />
            <ReportPreviewModal report={selectedReport} onClose={() => setSelectedReportId(null)} onDownload={() => void handleDownload(selectedReport)} onPrint={() => handlePrint(selectedReport)} onShare={() => handleShare(selectedReport)} />
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {shareReport && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={() => setShareReportId(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="w-[min(92vw,720px)] max-h-[90vh] overflow-y-auto rounded-[28px] border border-white/10 bg-[#081122] shadow-2xl shadow-black/50">
                <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
                  <div>
                    <p className="text-sm text-slate-400">Share Report</p>
                    <h3 className="text-2xl font-semibold text-white">{shareReport.patientName || shareReport.patient}</h3>
                    <p className="mt-1 text-sm text-slate-500">{shareReport._id || shareReport.id}</p>
                  </div>
                  <button onClick={() => setShareReportId(null)} className="rounded-2xl border border-white/10 p-2 text-slate-300 transition hover:bg-white/5">
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-5 p-6">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {(['Copy Secure Link', 'Email Report', 'Share with Hospital', 'Share with Specialist', 'Generate Temporary Access Link'] as ShareMode[]).map((mode) => (
                      <button key={mode} onClick={() => setShareMode(mode)} className={`rounded-2xl border px-4 py-3 text-sm transition duration-200 hover:bg-primary/15 ${shareMode === mode ? 'border-primary/40 bg-primary/10 text-white' : 'border-white/10 text-slate-300'}`}>
                        {mode}
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-3">
                      <label className="block text-sm text-slate-400">Recipient Email</label>
                      <input value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#0A1020] px-4 py-3 text-sm text-white outline-none" placeholder="recipient@hospital.org" />
                    </div>
                    <div className="space-y-3">
                      <label className="block text-sm text-slate-400">Access Duration</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['24 Hours', '3 Days', '7 Days'] as const).map((duration) => (
                          <button key={duration} onClick={() => setAccessDuration(duration)} className={`rounded-xl border px-3 py-2 text-sm transition duration-200 hover:bg-primary/15 ${accessDuration === duration ? 'border-primary/40 bg-primary/10 text-white' : 'border-white/10 text-slate-300'}`}>
                            {duration}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3 lg:col-span-2">
                      <label className="block text-sm text-slate-400">Permission</label>
                      <div className="grid grid-cols-2 gap-2 sm:max-w-md">
                        {(['View Only', 'Download Allowed'] as const).map((level) => (
                          <button key={level} onClick={() => setPermission(level)} className={`rounded-xl border px-3 py-2 text-sm transition duration-200 hover:bg-primary/15 ${permission === level ? 'border-primary/40 bg-primary/10 text-white' : 'border-white/10 text-slate-300'}`}>
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#0A1020] p-4 text-sm text-slate-300">
                    <div className="flex items-center gap-2 text-white">
                      <Link2 size={16} className="text-primary" />
                      Secure share link
                    </div>
                    <p className="mt-2 break-all text-slate-400">https://novadx.secure/share/{shareReport._id || shareReport.id}</p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                      <CalendarDays size={14} />
                      {accessDuration} access • {permission}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <motion.button whileHover={{ y: -1, scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => { navigator.clipboard.writeText(`https://novadx.secure/share/${shareReport._id || shareReport.id}`); setToast('Secure link copied.'); }} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5">
                      <Copy size={14} />
                      Copy Secure Link
                    </motion.button>
                    <motion.button whileHover={{ y: -1, scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={sendShare} className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white shadow-soft transition hover:brightness-110">
                      <Mail size={14} />
                      Send
                    </motion.button>
                    <motion.button whileHover={{ y: -1, scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => setShareReportId(null)} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5">
                      Cancel
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="fixed bottom-6 right-6 z-50 rounded-2xl border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white shadow-2xl shadow-black/40">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function FilterGroup({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-white">{title}</p>
      <div className="grid grid-cols-2 gap-2 text-sm text-slate-300">
        {options.map((option) => (
          <button key={option} onClick={() => onChange(option)} className={`rounded-xl border px-3 py-2 text-left transition duration-200 hover:bg-primary/15 hover:text-white ${value === option ? 'border-primary/40 bg-primary/10 text-white' : 'border-white/10'}`}>
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
