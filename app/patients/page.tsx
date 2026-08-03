"use client";

import { useMemo, useState, type ReactNode, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpDown, CalendarDays, Dna, Download, FileText, LoaderCircle, Mail, MapPin, Phone, Search, ShieldAlert, SlidersHorizontal, X, Eye, BarChart3, Ruler, Thermometer } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useScan } from '@/lib/scan-context';
import { patientsAPI, analysisAPI, historyAPI, reportsAPI } from '@/lib/api';
import { connectSocket, onSocketEvent, SOCKET_EVENTS } from '@/lib/socket';
import { PredictionCard } from '@/components/cards/prediction-card';

type FilterStatus = 'All' | 'Critical' | 'Under Review' | 'Normal';
type FilterGender = 'All' | 'Male' | 'Female' | 'Other';
type FilterCancerType = 'All' | 'Lung Cancer' | 'Brain Tumor' | 'Breast Cancer' | 'Liver Cancer' | 'Colon Cancer' | 'Other';
type AppointmentFilter = 'All' | 'Today' | 'Tomorrow' | 'This Week' | 'Custom Date';
type HistorySort = 'date-desc' | 'date-asc' | 'confidence-desc' | 'confidence-asc';

function formatDateForFilter(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isWithinThisWeek(target: Date, reference: Date) {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return target >= start && target <= end;
}

function parseHistoryDate(value: string | undefined | null): Date {
  if (!value) return new Date(0);
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) return parsed;
  const parts = value.trim().split(/\s+/);
  if (parts.length >= 3) {
    const [day, month, year] = parts;
    const reconstructed = new Date(`${month} ${day}, ${year}`);
    if (!isNaN(reconstructed.getTime())) return reconstructed;
  }
  return new Date(0);
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

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0A1020] p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 flex items-center gap-2 text-white">
        {icon}
        <span className="text-sm font-medium">{value}</span>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0A1020] px-4 py-3">
      <div className="text-slate-500 shrink-0">{icon}</div>
      <div className="flex items-center justify-between flex-1 min-w-0">
        <span className="text-sm text-slate-400">{label}</span>
        <span className="text-sm font-medium text-white truncate ml-2">{value}</span>
      </div>
    </div>
  );
}

export default function PatientsPage() {
  const router = useRouter();
  const { patients, setPatients } = useScan();
  const [searchTerm, setSearchTerm] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('All');
  const [cancerFilter, setCancerFilter] = useState<FilterCancerType>('All');
  const [genderFilter, setGenderFilter] = useState<FilterGender>('All');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [appointmentFilter, setAppointmentFilter] = useState<AppointmentFilter>('All');
  const [customAppointmentDate, setCustomAppointmentDate] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatientFull, setSelectedPatientFull] = useState<any>(null);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [historyPatientId, setHistoryPatientId] = useState<string | null>(null);
  const [historySearch, setHistorySearch] = useState('');
  const [historySort, setHistorySort] = useState<HistorySort>('date-desc');
  const [previewReport, setPreviewReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { connectSocket(); }, []);

  useEffect(() => {
    return onSocketEvent(SOCKET_EVENTS.ANALYSIS_COMPLETED, (data: any) => {
      patientsAPI.getAll().then(response => {
        if (response.success) setPatients(response.patients || []);
      }).catch(console.error);
    });
  }, [setPatients]);

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const response = await patientsAPI.getAll();
        if (response.success) setPatients(response.patients || []);
      } catch (error) {
        console.error('Failed to load patients:', error);
      } finally { setLoading(false); }
    };
    loadPatients();
  }, [setPatients]);

  useEffect(() => {
    if (selectedPatientId) {
      setLoadingPatient(true);
      patientsAPI.getById(selectedPatientId).then(response => {
        if (response.success) {
          setSelectedPatientFull({ ...response.patient, scans: response.scans || [] });
        }
      }).catch(console.error).finally(() => setLoadingPatient(false));
    } else {
      setSelectedPatientFull(null);
    }
  }, [selectedPatientId]);

  const selectedPatient = selectedPatientId ? patients.find((p) => p._id === selectedPatientId || p.patientId === selectedPatientId) ?? null : null;
  const historyPatient = historyPatientId ? patients.find((p) => p._id === historyPatientId || p.patientId === historyPatientId) ?? null : null;

  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const search = searchTerm.trim().toLowerCase();
      const matchesSearch = !search || [patient.patientId || patient._id, patient.name, patient.cancerType, patient.gender, patient.status, patient.assignedDoctor].filter(Boolean).join(' ').toLowerCase().includes(search);
      const matchesStatus = statusFilter === 'All' || patient.status === statusFilter;
      const matchesGender = genderFilter === 'All' || patient.gender === genderFilter;
      const matchesAge = (!ageMin || (patient.age && patient.age >= Number(ageMin))) && (!ageMax || (patient.age && patient.age <= Number(ageMax)));
      const appointmentDate = formatDateForFilter(patient.appointment);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      const matchesAppointment = (() => {
        if (appointmentFilter === 'All') return true;
        if (!appointmentDate) return false;
        if (appointmentFilter === 'Today') return appointmentDate.getTime() === today.getTime();
        if (appointmentFilter === 'Tomorrow') return appointmentDate.getTime() === tomorrow.getTime();
        if (appointmentFilter === 'This Week') return isWithinThisWeek(appointmentDate, today);
        if (appointmentFilter === 'Custom Date') return customAppointmentDate ? patient.appointment === customAppointmentDate : true;
        return true;
      })();
      const cancerMatches = (() => {
        if (cancerFilter === 'All') return true;
        const n = (patient.cancerType || '').toLowerCase();
        if (cancerFilter === 'Other') return !['lung', 'brain', 'breast', 'liver', 'colon'].some((i) => n.includes(i));
        if (cancerFilter === 'Lung Cancer') return n.includes('lung');
        if (cancerFilter === 'Brain Tumor') return n.includes('brain');
        if (cancerFilter === 'Breast Cancer') return n.includes('breast');
        if (cancerFilter === 'Liver Cancer') return n.includes('liver');
        if (cancerFilter === 'Colon Cancer') return n.includes('colon');
        return true;
      })();
      return matchesSearch && matchesStatus && matchesGender && matchesAge && matchesAppointment && cancerMatches;
    });
  }, [ageMax, ageMin, cancerFilter, customAppointmentDate, genderFilter, appointmentFilter, searchTerm, statusFilter, patients]);

  const historyRows = selectedPatientFull?.scans || [];
  const filteredHistory = useMemo(() => {
    const query = historySearch.trim().toLowerCase();
    const rows = historyRows.filter((row: any) => !query || [row.date, row.scanType, row.aiResult, row.doctor, row.report, `${row.confidence}%`].join(' ').toLowerCase().includes(query));
    return [...rows].sort((left: any, right: any) => {
      const leftDate = parseHistoryDate(left.date);
      const rightDate = parseHistoryDate(right.date);
      if (historySort === 'date-asc') return leftDate.getTime() - rightDate.getTime();
      if (historySort === 'date-desc') return rightDate.getTime() - leftDate.getTime();
      if (historySort === 'confidence-asc') return left.confidence - right.confidence;
      return right.confidence - left.confidence;
    });
  }, [historyRows, historySearch, historySort]);

  const openHistoryForPatient = (patientId: string, row?: any) => {
    setSelectedPatientId(null);
    setHistoryPatientId(patientId);
    setPreviewReport(row ?? null);
  };

  const exportPatientReport = (patientId: string) => {
    const patient = patients.find((item) => item._id === patientId || item.patientId === patientId);
    if (!patient) return;
    downloadTextFile(`${patient.patientId || patient._id}-report.txt`, [
      'Patient Report', `Patient ID: ${patient.patientId || patient._id}`, `Full Name: ${patient.name}`,
      `Status: ${patient.status}`, `Cancer Type: ${patient.cancerType || 'Not generated'}`,
      `Assigned Doctor: ${patient.assignedDoctor || 'Not generated'}`,
      `Latest Scan Date: ${patient.latestScan?.date || 'Not generated'}`,
      `AI Prediction: ${patient.latestScan?.cancerType || 'Not generated'}`,
      `Last Updated: ${patient.updatedAt || 'Not generated'}`,
    ].join('\n'));
  };

  const exportHistoryRow = (patientId: string, row: any) => {
    downloadTextFile(`${patientId}-${row.date.replace(/\s+/g, '-')}.txt`, [
      'Scan Report', `Patient ID: ${patientId}`, `Date: ${row.date}`, `Scan Type: ${row.scanType}`,
      `AI Result: ${row.aiResult}`, `Confidence: ${row.confidence}%`, `Doctor: ${row.doctor}`,
    ].join('\n'));
  };

  const resetFilters = () => {
    setStatusFilter('All'); setCancerFilter('All'); setGenderFilter('All');
    setAgeMin(''); setAgeMax(''); setAppointmentFilter('All'); setCustomAppointmentDate('');
  };

  const openAnalysis = async (scanId: string | { _id?: string }) => {
    const normalizedScanId = typeof scanId === 'string'
      ? scanId
      : (scanId?._id ? String(scanId._id) : '');

    if (normalizedScanId) router.push(`/analysis/${normalizedScanId}`);
  };

  return (
    <main className="space-y-6 p-6">
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-[24px] border border-white/10 bg-[#0F1629] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Patient Management</p>
            <h2 className="text-2xl font-semibold text-white">Clinical patient overview</h2>
          </div>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400">
              <Search size={16} />
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent outline-none" placeholder="Search patient" />
            </label>
            <motion.button whileHover={{ y: -1, scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => setFiltersOpen((c) => !c)} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10">
              <SlidersHorizontal size={16} /> Filters
            </motion.button>
          </div>
        </div>
        <AnimatePresence>
          {filtersOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-20 bg-black/10" onClick={() => setFiltersOpen(false)} />}
        </AnimatePresence>
        <AnimatePresence>
          {filtersOpen && (
            <motion.div initial={{ opacity: 0, y: -16, scaleY: 0.98 }} animate={{ opacity: 1, y: 0, scaleY: 1 }} exit={{ opacity: 0, y: -16, scaleY: 0.98 }} transition={{ duration: 0.22, ease: 'easeOut' }} className="absolute left-6 right-6 top-full z-30 mt-3 origin-top rounded-[24px] border border-white/10 bg-[#0B1122] p-5 shadow-2xl shadow-black/40">
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-medium text-white">Status</p>
                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-300">
                    {(['All', 'Critical', 'Under Review', 'Normal'] as FilterStatus[]).map((item) => (
                      <button key={item} onClick={() => setStatusFilter(item)} className={`rounded-xl border px-3 py-2 text-left transition hover:bg-white/5 ${statusFilter === item ? 'border-primary/40 bg-primary/15 text-white' : 'border-white/10'}`}>{item}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-medium text-white">Cancer Type</p>
                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-300">
                    {(['All', 'Lung Cancer', 'Brain Tumor', 'Breast Cancer', 'Liver Cancer', 'Colon Cancer', 'Other'] as FilterCancerType[]).map((item) => (
                      <button key={item} onClick={() => setCancerFilter(item)} className={`rounded-xl border px-3 py-2 text-left transition hover:bg-white/5 ${cancerFilter === item ? 'border-primary/40 bg-primary/15 text-white' : 'border-white/10'}`}>{item}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-medium text-white">Gender</p>
                  <div className="grid grid-cols-3 gap-2 text-sm text-slate-300">
                    {(['All', 'Male', 'Female', 'Other'] as FilterGender[]).map((item) => (
                      <button key={item} onClick={() => setGenderFilter(item)} className={`rounded-xl border px-3 py-2 transition hover:bg-white/5 ${genderFilter === item ? 'border-primary/40 bg-primary/15 text-white' : 'border-white/10'}`}>{item}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-medium text-white">Age</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={ageMin} onChange={(e) => setAgeMin(e.target.value)} type="number" min="0" placeholder="Min Age" className="rounded-xl border border-white/10 bg-[#08101F] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500" />
                    <input value={ageMax} onChange={(e) => setAgeMax(e.target.value)} type="number" min="0" placeholder="Max Age" className="rounded-xl border border-white/10 bg-[#08101F] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500" />
                  </div>
                </div>
                <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 lg:col-span-2 xl:col-span-4">
                  <p className="text-sm font-medium text-white">Appointment Date</p>
                  <div className="flex flex-wrap gap-2 text-sm text-slate-300">
                    {(['All', 'Today', 'Tomorrow', 'This Week', 'Custom Date'] as AppointmentFilter[]).map((item) => (
                      <button key={item} onClick={() => setAppointmentFilter(item)} className={`rounded-xl border px-3 py-2 transition hover:bg-primary/15 ${appointmentFilter === item ? 'border-primary/40 bg-primary/10 text-white' : 'border-white/10'}`}>{item}</button>
                    ))}
                  </div>
                  {appointmentFilter === 'Custom Date' && <input value={customAppointmentDate} onChange={(e) => setCustomAppointmentDate(e.target.value)} type="date" className="mt-2 w-full max-w-xs rounded-xl border border-white/10 bg-[#08101F] px-3 py-2 text-sm text-white outline-none" />}
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
                <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} onClick={resetFilters} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/5">Reset Filters</motion.button>
                <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} onClick={() => setFiltersOpen(false)} className="rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white shadow-soft transition hover:brightness-110">Apply Filters</motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      <section className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full text-center py-8 text-slate-400">Loading patients...</div>
          ) : filteredPatients.length === 0 ? (
            <div className="col-span-full text-center py-8 text-slate-400">No patients found</div>
          ) : (
            filteredPatients.map((patient) => (
              <motion.div key={patient._id || patient.patientId} whileHover={{ y: -4 }} transition={{ duration: 0.18 }}>
                <Card className="border-white/10 bg-[#0F1629] transition-shadow hover:shadow-2xl hover:shadow-black/30">
                  <CardContent className="space-y-6 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm text-slate-400">{patient.patientId || patient._id}</p>
                        <h3 className="truncate text-2xl font-semibold tracking-tight text-white">{patient.name}</h3>
                        <p className="text-sm text-slate-400">{patient.gender || 'Unknown'} • {patient.age || 'Not generated'} Years</p>
                      </div>
                      <div className={`rounded-full px-3 py-1 text-xs font-medium ${patient.status === 'Critical' ? 'bg-danger/10 text-danger' : patient.status === 'Under Review' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>{patient.status || 'Normal'}</div>
                    </div>
                    <div className="space-y-3 pt-1 text-sm text-slate-400">
                      <div className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-2xl border border-white/10 bg-[#0A1020] px-4 py-3">
                        <Dna size={16} className="text-slate-400" />
                        <div className="flex items-center justify-between gap-4"><span>Cancer Type</span><span className="font-medium text-white">{patient.cancerType || 'Not generated'}</span></div>
                      </div>
                      <div className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-2xl border border-white/10 bg-[#0A1020] px-4 py-3">
                        <CalendarDays size={16} className="text-slate-400" />
                        <div className="flex items-center justify-between gap-4"><span>Next Appointment</span><span className="font-medium text-white">{patient.appointment || 'Not generated'}</span></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="rounded-2xl border border-white/10 bg-[#0A1020] px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Last Scan</p>
                        <p className="mt-1 text-sm font-semibold text-white">{patient.latestScan?.date ? new Date(patient.latestScan.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not generated'}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-[#0A1020] px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500">AI Confidence</p>
                        <p className="mt-1 text-sm font-semibold text-white">{patient.latestScan?.confidence || 0}%</p>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-1">
                      <motion.button whileHover={{ y: -1, scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => setSelectedPatientId(patient._id || patient.patientId)} className="flex-1 rounded-2xl bg-primary/15 px-4 py-3 text-sm font-medium text-primary transition hover:bg-primary/25">View</motion.button>
                      <motion.button whileHover={{ y: -1, scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => openHistoryForPatient(patient._id || patient.patientId)} className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/5">Scan History</motion.button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </section>

      <AnimatePresence>
        {(selectedPatient || selectedPatientFull) && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm" onClick={() => setSelectedPatientId(null)} />
            <motion.aside initial={{ x: '100%', opacity: 0.75 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0.75 }} transition={{ type: 'spring', stiffness: 280, damping: 32 }} className="fixed right-0 top-0 z-50 h-full w-full max-w-[560px] overflow-y-auto border-l border-white/10 bg-[#081122] p-6 shadow-2xl shadow-black/50">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-400">Patient Profile</p>
                  <h3 className="text-2xl font-semibold text-white">{(selectedPatientFull || selectedPatient).name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{(selectedPatientFull || selectedPatient).patientId || (selectedPatientFull || selectedPatient)._id}</p>
                </div>
                <button onClick={() => setSelectedPatientId(null)} className="rounded-2xl border border-white/10 p-2 text-slate-300 transition hover:bg-white/5"><X size={18} /></button>
              </div>
              {loadingPatient ? (
                <div className="flex items-center justify-center py-12"><LoaderCircle className="animate-spin text-primary" size={24} /></div>
              ) : (
              <div className="mt-6 grid gap-6">
                <Card className="border-white/10 bg-[#0F1629]">
                  <CardHeader><p className="text-sm font-medium text-slate-400">Patient Information</p></CardHeader>
                  <CardContent className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                    <InfoRow label="Patient ID" value={(selectedPatientFull || selectedPatient).patientId || (selectedPatientFull || selectedPatient)._id || 'Not generated'} />
                    <InfoRow label="Patient Name" value={(selectedPatientFull || selectedPatient).name || 'Not generated'} />
                    <InfoRow label="Age" value={(selectedPatientFull || selectedPatient).age ? String((selectedPatientFull || selectedPatient).age) : 'Not generated'} />
                    <InfoRow label="Gender" value={(selectedPatientFull || selectedPatient).gender || 'Not generated'} />
                    <InfoRow label="Scan Type" value={(selectedPatientFull || selectedPatient).scanType || 'Not generated'} />
                    <InfoRow label="Body Part" value={(selectedPatientFull || selectedPatient).bodyPart || 'Not generated'} />
                    <InfoRow label="Doctor" value={(selectedPatientFull || selectedPatient).doctor || 'Not generated'} />
                    <InfoRow label="Date" value={(selectedPatientFull || selectedPatient).createdAt ? new Date((selectedPatientFull || selectedPatient).createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not generated'} />
                    <div className="sm:col-span-2"><InfoRow label="Notes" value={(selectedPatientFull || selectedPatient).notes || 'Not generated'} /></div>
                  </CardContent>
                </Card>
                <Card className="border-white/10 bg-[#0F1629]">
                  <CardHeader><p className="text-sm font-medium text-slate-400">Scan History</p></CardHeader>
                  <CardContent>
                    {selectedPatientFull?.scans && selectedPatientFull.scans.length > 0 ? (
                      <div className="space-y-4">
                        {selectedPatientFull.scans.map((scan: any, idx: number) => (
                          <div key={scan._id || idx} className="rounded-2xl border border-white/10 bg-[#0A1020] p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-white">{scan.scanType || 'Not generated'} - {scan.bodyPart || 'Not generated'}</p>
                                <p className="text-xs text-slate-500">{scan.createdAt ? new Date(scan.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not generated'}</p>
                              </div>
                              <div className="flex gap-2">
                                <motion.button whileHover={{ y: -1, scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => { setSelectedPatientId(null); openAnalysis(scan._id); }} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/10">Open Analysis</motion.button>
                              </div>
                            </div>
                            {scan.analysis?.prediction && <div className="mt-2 text-xs text-slate-400">Prediction: {scan.analysis.prediction} | Confidence: {scan.analysis.confidence}%</div>}
                          </div>
                        ))}
                      </div>
                    ) : <div className="text-center py-6 text-slate-400">No scan history available</div>}
                  </CardContent>
                </Card>
<Card className="border-white/10 bg-[#0F1629]">
                  <CardHeader><p className="text-sm font-medium text-slate-400">Uploaded Images</p></CardHeader>
                  <CardContent>
                    {(() => {
                      // Collect all image URLs from all scans, then deduplicate by URL
                      const allUrls: string[] = (selectedPatientFull?.scans || []).flatMap((s: any) => s.imageUrls || []);
                      const uniqueUrls = allUrls.filter((url, idx, self) => self.indexOf(url) === idx);
                      return uniqueUrls.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {uniqueUrls.map((imgUrl: string, imgIdx: number) => (
                            <div key={imgUrl} className="overflow-hidden rounded-[12px] border border-white/10 bg-black">
                              <img src={imgUrl} alt={`Image ${imgIdx + 1}`} className="h-24 w-full object-cover" />
                            </div>
                          ))}
                        </div>
                      ) : <div className="text-center py-6 text-slate-400">No images available</div>;
                    })()}
                  </CardContent>
                </Card>
                <Card className="border-white/10 bg-[#0F1629]">
                  <CardHeader><p className="text-sm font-medium text-slate-400">Reports</p></CardHeader>
                  <CardContent>
                    {selectedPatientFull?.scans && selectedPatientFull.scans.some((s: any) => s.report) ? (
                      <div className="space-y-3">
                        {selectedPatientFull.scans.map((scan: any, idx: number) => scan.report ? (
                          <div key={scan._id || idx} className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0A1020] px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-white">{scan.report.reportNumber || 'Not generated'}</p>
                              <p className="text-xs text-slate-500">{scan.report.createdAt ? new Date(scan.report.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not generated'}</p>
                            </div>
                            <div className="flex gap-2">
                              <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/10">View</button>
                              <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/10">Download</button>
                            </div>
                          </div>
                        ) : null)}
                      </div>
                    ) : <div className="text-center py-6 text-slate-400">No reports available</div>}
                  </CardContent>
                </Card>
                <div className="flex flex-wrap gap-3">
                  <motion.button whileHover={{ y: -1, scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => { setSelectedPatientId(null); openAnalysis(selectedPatientFull?.scans?.[0]?._id); }} className="rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white transition hover:brightness-110">Open Full Analysis</motion.button>
                  <motion.button whileHover={{ y: -1, scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => exportPatientReport((selectedPatientFull || selectedPatient)._id || (selectedPatientFull || selectedPatient).patientId)} className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/5">Export Report</motion.button>
                  <motion.button whileHover={{ y: -1, scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => setSelectedPatientId(null)} className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/5">Close</motion.button>
                </div>
              </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {historyPatient && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={() => { setHistoryPatientId(null); setPreviewReport(null); }} />
            <motion.div initial={{ opacity: 0, scale: 0.98, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 12 }} transition={{ duration: 0.22, ease: 'easeOut' }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="flex h-[calc(100vh-2rem)] w-full max-w-[1400px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#081122] shadow-2xl shadow-black/50">
                <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
                  <div>
                    <p className="text-sm text-slate-400">Scan History</p>
                    <h3 className="text-2xl font-semibold text-white">{historyPatient.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{historyPatient.patientId || historyPatient._id}</p>
                  </div>
                  <button onClick={() => { setHistoryPatientId(null); setPreviewReport(null); }} className="rounded-2xl border border-white/10 p-2 text-slate-300 transition hover:bg-white/5"><X size={18} /></button>
                </div>
                <div className="grid flex-1 gap-5 overflow-y-auto px-6 py-5 lg:grid-cols-[1fr_320px]">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400">
                        <Search size={16} />
                        <input value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} className="bg-transparent outline-none" placeholder="Search scans" />
                      </label>
                      <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
                        <ArrowUpDown size={16} />
                        <select value={historySort} onChange={(e) => setHistorySort(e.target.value as HistorySort)} className="bg-transparent outline-none">
                          <option value="date-desc">Newest first</option>
                          <option value="date-asc">Oldest first</option>
                          <option value="confidence-desc">Highest confidence</option>
                          <option value="confidence-asc">Lowest confidence</option>
                        </select>
                      </label>
                    </div>
                    <div className="overflow-hidden rounded-[24px] border border-white/10">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[820px] text-left text-sm">
                          <thead className="bg-white/5 text-slate-400">
                            <tr>
                              <th className="px-4 py-3 font-medium">Date</th>
                              <th className="px-4 py-3 font-medium">Scan Type</th>
                              <th className="px-4 py-3 font-medium">AI Result</th>
                              <th className="px-4 py-3 font-medium">Confidence</th>
                              <th className="px-4 py-3 font-medium">Doctor</th>
                              <th className="px-4 py-3 font-medium">Report</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredHistory.length === 0 ? (
                              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No scan history found</td></tr>
                            ) : (
                              filteredHistory.map((row: any) => (
                                <tr key={`${row.date}-${row.scanType}`} className="border-t border-white/8 text-slate-300 transition hover:bg-white/5">
                                  <td className="px-4 py-4">{row.date || 'Not generated'}</td>
                                  <td className="px-4 py-4">{row.scanType || 'Not generated'}</td>
                                  <td className="px-4 py-4">{row.aiResult || 'Not generated'}</td>
                                  <td className="px-4 py-4">{row.confidence || 0}%</td>
                                  <td className="px-4 py-4">{row.doctor || 'Not generated'}</td>
                                  <td className="px-4 py-4">
                                    <div className="flex flex-wrap gap-2">
                                      <motion.button whileHover={{ y: -1, scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => setPreviewReport(row)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/5"><FileText size={12} /> View Report</motion.button>
                                      <motion.button whileHover={{ y: -1, scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => exportHistoryRow(historyPatient.patientId || historyPatient._id, row)} className="inline-flex items-center gap-2 rounded-xl bg-primary/15 px-3 py-2 text-xs font-medium text-primary transition hover:bg-primary/25"><Download size={12} /> Download PDF</motion.button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 rounded-[24px] border border-white/10 bg-[#0F1629] p-4">
                    <div>
                      <p className="text-sm font-medium text-slate-400">Report Preview</p>
                      <h4 className="mt-1 text-lg font-semibold text-white">{previewReport ? previewReport.scanType : 'Select a report'}</h4>
                    </div>
                    {previewReport ? (
                      <div className="space-y-3 text-sm text-slate-300">
                        <div className="rounded-2xl border border-white/10 bg-[#0A1020] p-3"><p className="text-xs uppercase tracking-wide text-slate-500">Date</p><p className="mt-1 text-white">{previewReport.date || 'Not generated'}</p></div>
                        <div className="rounded-2xl border border-white/10 bg-[#0A1020] p-3"><p className="text-xs uppercase tracking-wide text-slate-500">AI Result</p><p className="mt-1 text-white">{previewReport.aiResult || 'Not generated'}</p></div>
                        <div className="rounded-2xl border border-white/10 bg-[#0A1020] p-3"><p className="text-xs uppercase tracking-wide text-slate-500">Confidence</p><p className="mt-1 text-white">{previewReport.confidence || 0}%</p></div>
                        <div className="rounded-2xl border border-white/10 bg-[#0A1020] p-3"><p className="text-xs uppercase tracking-wide text-slate-500">Doctor</p><p className="mt-1 text-white">{previewReport.doctor || 'Not generated'}</p></div>
                        <div className="flex gap-2">
                          <motion.button whileHover={{ y: -1, scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => exportHistoryRow(historyPatient.patientId || historyPatient._id, previewReport)} className="flex-1 rounded-2xl border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/5">View Report</motion.button>
                          <motion.button whileHover={{ y: -1, scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => exportHistoryRow(historyPatient.patientId || historyPatient._id, previewReport)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary/15 px-3 py-2 text-sm text-primary transition hover:bg-primary/25"><Download size={14} /> Download PDF</motion.button>
                        </div>
                      </div>
                    ) : <p className="text-sm text-slate-500">Use the table to inspect a specific scan report.</p>}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
