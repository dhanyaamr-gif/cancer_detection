"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, Download, LoaderCircle, Ruler, MapPin, BarChart3, Thermometer, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { analysisAPI } from '@/lib/api';
import { PredictionCard } from '@/components/cards/prediction-card';
import { ImageViewer } from '@/components/viewer/image-viewer';
import { useScan } from '@/lib/scan-context';

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0A1020] px-4 py-3">
      <div className="shrink-0 text-slate-500">{icon}</div>
      <div className="flex min-w-0 flex-1 items-center justify-between">
        <span className="text-sm text-slate-400">{label}</span>
        <span className="ml-2 truncate text-sm font-medium text-white">{value}</span>
      </div>
    </div>
  );
}

function orNotGenerated(value: any): string {
  if (value === null || value === undefined || value === '') return 'Not generated';
  return String(value);
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

export default function AnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const { historyEntries } = useScan();
  const scanId = (params.scanId as string) || '';
  const [scanData, setScanData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!scanId) return;

    const loadAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await analysisAPI.getById(scanId);
        if (response.success) {
          setScanData(response);
          // Default selected slice to the scan's primary image
          const pIdx = response.scan?.primaryImageIndex ?? 0;
          setActiveIndex(pIdx);
        } else {
          setError('Failed to load analysis data');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load analysis data');
      } finally {
        setLoading(false);
      }
    };

    loadAnalysis();
  }, [scanId]);

  const historyScanIds = useMemo(() => {
    return (historyEntries || [])
      .map((entry: any) => {
        const rawScanId = entry?.scanId ?? entry?._id;
        if (typeof rawScanId === 'object' && rawScanId !== null) {
          return typeof rawScanId._id === 'string' ? rawScanId._id : '';
        }
        return typeof rawScanId === 'string' && rawScanId ? rawScanId : '';
      })
      .filter(Boolean);
  }, [historyEntries]);

  const currentHistoryIndex = useMemo(() => {
    if (!scanId) return -1;
    return historyScanIds.indexOf(scanId);
  }, [historyScanIds, scanId]);

  const analysis = scanData?.analysis || {};
  const scan = scanData?.scan || {};
  const patient = scanData?.patient || {};
  const tumor = analysis?.tumor || {};
  const clinical = analysis?.clinical || {};
  const ai = analysis?.ai || {};
  // Backend now returns a combined per-slice array:
  // [{ original, heatmap, detection, confidence, cancerDetected, ... }, ...]
  const imageSlices = (scanData?.images || []).filter(Boolean) as any[];

  const handleSelectIndex = useCallback((idx: number) => {
    setActiveIndex(idx);
  }, []);

  const handlePrevious = () => {
    if (currentHistoryIndex > 0) {
      const targetId = historyScanIds[currentHistoryIndex - 1];
      if (targetId) router.push(`/analysis/${targetId}`);
    }
  };

  const handleNext = () => {
    if (currentHistoryIndex >= 0 && currentHistoryIndex < historyScanIds.length - 1) {
      const targetId = historyScanIds[currentHistoryIndex + 1];
      if (targetId) router.push(`/analysis/${targetId}`);
    }
  };

  const handleExport = () => {
    const exportContent = [
      `Analysis ID: ${scan?._id || scanId}`,
      `Patient: ${patient?.name || 'Not generated'}`,
      `Patient ID: ${patient?.patientId || 'Not generated'}`,
      `Prediction: ${analysis?.prediction || 'Not generated'}`,
      `Confidence: ${analysis?.confidence || 0}%`,
      `Cancer Type: ${analysis?.cancerType || 'Not generated'}`,
      `Tumor Size: ${orNotGenerated(tumor?.size)}`,
      `Location: ${orNotGenerated(tumor?.location)}`,
      `Probability Score: ${orNotGenerated(tumor?.probability)}`,
      `Risk Level: ${orNotGenerated(tumor?.risk)}`,
      `Recommendation: ${orNotGenerated(clinical?.recommendation)}`,
      `Diagnosis: ${orNotGenerated(clinical?.diagnosis)}`,
    ].join('\n');

    downloadTextFile(`${scan?._id || scanId || 'analysis'}-report.txt`, exportContent);
  };

  if (loading) {
    return (
      <main className="flex h-[80vh] items-center justify-center">
        <LoaderCircle className="animate-spin text-primary" size={32} />
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6">
        <div className="rounded-[24px] border border-red-500/20 bg-red-500/10 p-6 text-center text-red-300">
          {error}
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[24px] border border-white/10 bg-[#0F1629] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="rounded-2xl border border-white/10 p-2 text-slate-300 transition hover:bg-white/5">
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className="text-sm text-slate-400">Open Analysis</p>
              <h3 className="text-2xl font-semibold text-white">{analysis?.prediction || 'No Analysis Yet'}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {patient?.name || 'Not generated'} • {patient?.patientId || 'Not generated'} • {analysis?.cancerType || 'Not generated'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handlePrevious}
              disabled={currentHistoryIndex <= 0}
              className="flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} /> Previous Analysis
            </button>
            <button
              onClick={handleNext}
              disabled={currentHistoryIndex < 0 || currentHistoryIndex >= historyScanIds.length - 1}
              className="flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next Analysis <ChevronRight size={16} />
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded-2xl bg-primary px-3 py-2 text-sm font-medium text-white transition hover:brightness-110"
            >
              <Download size={16} /> Export Report
            </button>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)]">
        <div className="space-y-6">
          <Card className="border-white/10 bg-[#0F172A]">
            <CardHeader>
              <p className="text-sm text-slate-400">Study Viewer</p>
              <h4 className="text-xl font-semibold text-white">MRI/CT Study — All Slices</h4>
            </CardHeader>
            <CardContent>
              <ImageViewer
                images={imageSlices}
                imageResults={scan?.imageResults || []}
                patientName={patient?.name}
                activeIndex={activeIndex}
                primaryImageIndex={scan?.primaryImageIndex ?? 0}
                onSelectIndex={handleSelectIndex}
              />
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-[#0F172A]">
            <CardHeader>
              <p className="text-sm text-slate-400">AI Explanation</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-slate-300">{orNotGenerated(ai?.explanation)}</p>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-[#0F172A]">
            <CardHeader>
              <p className="text-sm text-slate-400">Clinical Notes</p>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <DetailRow icon={<FileText size={16} />} label="Doctor Observation" value={orNotGenerated(clinical?.doctorObservation)} />
              <DetailRow icon={<FileText size={16} />} label="Recommendation" value={orNotGenerated(clinical?.recommendation)} />
              <DetailRow icon={<FileText size={16} />} label="Notes" value={orNotGenerated(clinical?.notes)} />
              <DetailRow icon={<FileText size={16} />} label="Final Diagnosis" value={orNotGenerated(clinical?.diagnosis)} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <PredictionCard
            title={analysis?.cancerDetected ? (analysis?.cancerType || 'Cancer Detected') : 'No Analysis Yet'}
            confidence={analysis?.confidence || 0}
            cancerType={analysis?.cancerType || ''}
            scanType={scan?.scanType || 'MRI'}
            cancerDetected={Boolean(analysis?.cancerDetected)}
            hasAnalysis={Boolean(analysis?.prediction || analysis?.confidence || analysis?.tumor || scanData)}
          />

          <Card className="border-white/10 bg-[#0F172A]">
            <CardHeader>
              <p className="text-sm text-slate-400">Tumor Details</p>
            </CardHeader>
            <CardContent className="grid gap-3">
              <DetailRow icon={<Ruler size={16} />} label="Tumor Size" value={orNotGenerated(tumor?.size)} />
              <DetailRow icon={<MapPin size={16} />} label="Location" value={orNotGenerated(tumor?.location)} />
              <DetailRow icon={<BarChart3 size={16} />} label="Probability Score" value={orNotGenerated(tumor?.probability)} />
              <DetailRow icon={<Thermometer size={16} />} label="Risk Level" value={orNotGenerated(tumor?.risk)} />
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-[#0F172A]">
            <CardHeader>
              <p className="text-sm text-slate-400">Doctor Observation</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-slate-300">{orNotGenerated(clinical?.doctorObservation)}</p>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-[#0F172A]">
            <CardHeader>
              <p className="text-sm text-slate-400">Recommendation</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-slate-300">{orNotGenerated(clinical?.recommendation)}</p>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-[#0F172A]">
            <CardHeader>
              <p className="text-sm text-slate-400">Final Diagnosis</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-slate-300">{orNotGenerated(clinical?.diagnosis)}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
