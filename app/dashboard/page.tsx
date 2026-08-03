"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, X, AlertTriangle, CheckCircle2, LoaderCircle, ImageIcon,
  Activity, Dna, MapPin, Ruler, ScanLine, User, Hash, FileText,
  ShieldAlert, Thermometer, BarChart3, Eye, Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PredictionCard } from "@/components/cards/prediction-card";
import { ImageViewer } from "@/components/viewer/image-viewer";
import { scansAPI, patientsAPI, historyAPI, reportsAPI, analysisAPI } from "@/lib/api";
import { connectSocket, onSocketEvent, SOCKET_EVENTS } from "@/lib/socket";
import { useScan } from "@/lib/scan-context";

type ToastMsg = { text: string; type: "info" | "success" | "error" };

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

function PatientInfoCard({ patientData, scanData }: { patientData: any; scanData: any }) {
  const pid = patientData?.patientId || '';
  const pname = patientData?.name || patientData?.patientName || '';

  if (!pid && !pname) {
    return (
      <Card className="w-full max-w-none border border-white/8 bg-[#0C1324] shadow-soft">
        <CardHeader>
          <p className="text-sm font-medium text-slate-400">Patient Information</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-slate-400">No patient selected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-none border border-white/8 bg-[#0C1324] shadow-soft">
      <CardHeader>
        <p className="text-sm font-medium text-slate-400">Patient Information</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <DetailRow icon={<Hash size={16} />} label="Patient ID" value={pid || 'Not generated'} />
        <DetailRow icon={<User size={16} />} label="Patient Name" value={pname || 'Not generated'} />
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { 
    currentScan, 
    setCurrentScan, 
    isUploading, 
    setIsUploading, 
    uploadProgress, 
    setUploadProgress,
    patients,
    setPatients,
    historyEntries,
    setHistoryEntries,
    reports,
    setReports
  } = useScan();
  
  const [activeIndex, setActiveIndex] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [imageResults, setImageResults] = useState<any[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(-1);
  const [scanData, setScanData] = useState<any>(null);
  const [patientData, setPatientData] = useState<any>(null);
  const [predictionData, setPredictionData] = useState<any>(null);
  const [heatmapUrl, setHeatmapUrl] = useState("");
  const [hasAnalysis, setHasAnalysis] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [phone, setPhone] = useState("");
  const [doctor, setDoctor] = useState("");
  const [scanType, setScanType] = useState("MRI");
  const [bodyPart, setBodyPart] = useState("Brain");
  const [notes, setNotes] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [existingPatient, setExistingPatient] = useState<any>(null);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial data from context (from socket events)
  useEffect(() => {
    connectSocket();
  }, []);

  // Apply scan data from context or direct response
  useEffect(() => {
    if (currentScan) {
      applyScanData(currentScan);
    }
  }, [currentScan]);

  // Socket event handlers
  useEffect(() => {
    return onSocketEvent(SOCKET_EVENTS.ANALYSIS_COMPLETED, (data: any) => {
      if (data) {
        applyScanData(data);
        setCurrentScan(data);
        setIsUploading(false);
        showToast("Analysis completed", "success");
      }
    });
  }, []);

  const applyScanData = useCallback((data: any) => {
    const scan = data.scan || {};
    const patient = data.patient || {};
    const pred = data.prediction || {};
    const results = data.imageResults || scan.imageResults || [];
    const pIdx = data.primaryImageIndex ?? scan.primaryImageIndex ?? 0;
    
    setImages(scan.imageUrls || scan.images || []);
    setImageResults(results);
    setPrimaryImageIndex(pIdx);
    setActiveIndex(pIdx);
    setScanData(scan);
    setPatientData(patient);
    setPredictionData(pred);
    
    // Set heatmap based on active image result
    const activeResult = results[activeIndex] || results[pIdx] || {};
    setHeatmapUrl(activeResult.heatmapUrl || pred.heatmapUrl || "");
    setHasAnalysis(true);
  }, [activeIndex]);

  const handleSelectIndex = useCallback((idx: number) => {
    setActiveIndex(idx);
    const r = imageResults[idx];
    if (r) {
      // If image has no cancer, show "No Heatmap Available"
      if (r.cancerDetected && r.heatmapUrl) {
        setHeatmapUrl(r.heatmapUrl);
      } else {
        setHeatmapUrl("");
      }
    }
  }, [imageResults]);

  const showToast = useCallback((text: string, type: ToastMsg["type"] = "info", duration = 10000) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, type });
    if (duration > 0) toastTimer.current = setTimeout(() => setToast(null), duration);
  }, []);

  const updateProgress = useCallback((phase: string) => {
    setUploadProgress(phase);
    if (phase) showToast(phase, "info", phase === "Completed Successfully" ? 5000 : 10000);
    if (phase === "Completed Successfully") setTimeout(() => {
      setUploadProgress("");
      setIsUploading(false);
    }, 5000);
  }, [showToast, setUploadProgress, setIsUploading]);

  // Check for existing patient when patientId changes
  useEffect(() => {
    const checkPatient = async () => {
      if (patientId && patientId.length >= 3) {
        try {
          const response = await patientsAPI.getById(patientId);
          if (response.success && response.patient) {
            setExistingPatient(response.patient);
            // Auto-fill patient details
            setPatientName(response.patient.name || "");
            setAge(response.patient.age ? String(response.patient.age) : "");
            setGender(response.patient.gender || "Male");
            setPhone(response.patient.phone || "");
            setDoctor(response.patient.doctor || "");
          } else {
            setExistingPatient(null);
          }
        } catch (error) {
          setExistingPatient(null);
        }
      } else {
        setExistingPatient(null);
      }
    };
    const timeoutId = setTimeout(checkPatient, 500);
    return () => clearTimeout(timeoutId);
  }, [patientId]);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setUploadError("Please select at least one scan image.");
      return;
    }
    if (!patientId.trim() || !patientName.trim() || !age.trim() || !gender.trim() || !scanType.trim()) {
      setUploadError("Patient ID, Patient Name, Age, Gender, and Scan Type are required.");
      return;
    }
    setIsUploading(true);
    setUploadError("");
    setHasAnalysis(false);
    
    try {
      // Show loading sequence
      updateProgress("Uploading images...");
      
      const fd = new FormData();
      selectedFiles.forEach(f => fd.append("images", f));
      fd.append("patientId", patientId.trim());
      fd.append("patientName", patientName.trim());
      fd.append("age", age.trim());
      fd.append("gender", gender);
      fd.append("phone", phone.trim());
      fd.append("doctor", doctor.trim());
      fd.append("scanType", scanType);
      fd.append("bodyPart", bodyPart);
      if (notes.trim()) fd.append("notes", notes.trim());
      
      updateProgress("Running AI Detection...");
      const response = await scansAPI.upload(fd);
      
      updateProgress("Generating Heatmap...");
      setTimeout(() => updateProgress("Saving Scan..."), 200);
      setTimeout(() => updateProgress("Updating Patient..."), 700);
      setTimeout(() => updateProgress("Updating Reports..."), 1000);
      setTimeout(() => {
        updateProgress("Updating Dashboard...");
        applyScanData(response);
        setCurrentScan(response);
        setUploadOpen(false);
        setSelectedFiles([]);
      }, 1200);
      setTimeout(() => updateProgress("Completed Successfully"), 2200);
    } catch (err: any) {
      setIsUploading(false);
      setUploadProgress("");
      const msg = err?.message || "Upload failed.";
      setUploadError(msg);
      showToast(msg, "error", 8000);
    }
  };

  // Get current image result for display
  const pr = imageResults[activeIndex] || imageResults[primaryImageIndex] || null;
  const cd = pr?.cancerDetected ?? predictionData?.cancerDetected ?? false;
  const conf = pr?.confidence ?? predictionData?.confidence ?? 0;
  const ct = pr?.cancerType || predictionData?.cancerType || "";
  const ts = pr?.measurements?.tumorSize || predictionData?.measurements?.tumorSize || "";
  const tl = pr?.measurements?.location || predictionData?.measurements?.location || "";
  const rl = pr?.measurements?.riskLevel || predictionData?.measurements?.riskLevel || "";
  const prob = pr?.probability ?? predictionData?.probability ?? 0;
  const infT = pr?.inferenceTime || scanData?.aiMetrics?.inferenceTime || "";
  const mv = scanData?.aiMetrics?.modelVersion || "";
  const pid = patientData?.patientId || patientId || "";
  const pname = patientData?.name || patientName || "";
  const st = scanData?.scanType || scanType || "MRI";

  // Get heatmap for current active image
  const currentHeatmap = imageResults[activeIndex]?.heatmapUrl || "";

  return (
    <main className="space-y-6 p-6">
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[24px] border border-white/10 bg-[#0F1629] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">AI-Powered Cancer Detection</p>
            <h2 className="text-2xl font-semibold text-white">Precision Diagnosis Platform</h2>
          </div>
          <div>
            <motion.button
              whileHover={{ y: -1, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setUploadOpen(true)}
              disabled={isUploading}
              className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white shadow-soft transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload size={16} />
              Upload Scan
            </motion.button>
          </div>
        </div>
      </motion.section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Patient Information Card - Only Patient ID and Name */}
        <div className="lg:col-span-1">
          <PatientInfoCard 
            patientData={patientData}
            scanData={scanData}
          />
        </div>

        {/* Prediction Card */}
        <div className="lg:col-span-1">
          <PredictionCard 
            title={cd ? (ct || "Cancer Detected") : "No Analysis Yet"}
            confidence={conf}
            cancerType={ct}
            scanType={st}
            cancerDetected={cd}
            hasAnalysis={hasAnalysis}
          />
        </div>

        {/* Tumor Details */}
        <div className="lg:col-span-1">
          <Card className="border border-white/8 bg-[#0C1324] shadow-soft">
            <CardHeader>
              <p className="text-sm font-medium text-slate-400">Tumor Details</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {hasAnalysis && cd ? (
                <>
                  <DetailRow icon={<Ruler size={16} />} label="Tumor Size" value={ts || 'Not generated'} />
                  <DetailRow icon={<MapPin size={16} />} label="Location" value={tl || 'Not generated'} />
                  <DetailRow icon={<Thermometer size={16} />} label="Risk Level" value={rl || 'Not generated'} />
                  <DetailRow icon={<BarChart3 size={16} />} label="Probability" value={String(prob)} />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-sm text-slate-400">No tumor detected yet.</p>
                  <p className="mt-1 text-xs text-slate-500">Upload an MRI or CT scan.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Image Viewer (PACS-style: all slices, Original/Heatmap/Detection toggle) */}
      <ImageViewer
        images={images}
        heatmapUrl={currentHeatmap}
        patientName={pname}
        imageResults={imageResults}
        activeIndex={activeIndex}
        primaryImageIndex={primaryImageIndex}
        onSelectIndex={handleSelectIndex}
      />

      {/* Upload Modal */}
      <AnimatePresence>
        {uploadOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
              onClick={() => !isUploading && setUploadOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="flex h-[90vh] w-full max-w-[560px] flex-col overflow-y-auto rounded-[28px] border border-white/10 bg-[#081122] shadow-2xl shadow-black/60">
                <div className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-white/10 bg-[#081122] px-6 py-5">
                  <div>
                    <p className="text-sm text-slate-400">Upload Scan</p>
                    <h3 className="text-2xl font-semibold text-white">New MRI/CT Analysis</h3>
                  </div>
                  {!isUploading && (
                    <button 
                      onClick={() => setUploadOpen(false)} 
                      className="rounded-2xl border border-white/10 p-2 text-slate-300 transition hover:bg-white/5"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                <div className="grid gap-5 px-6 py-6">
                  {/* Patient Information Section */}
                  <div className="space-y-4">
                    <p className="text-sm font-medium text-white">Patient Information</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-white">Patient ID *</label>
                        <input
                          value={patientId}
                          onChange={(e) => setPatientId(e.target.value)}
                          placeholder="e.g., PT-00021"
                          className="w-full rounded-2xl border border-white/10 bg-[#0A1020] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                          disabled={isUploading}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-white">Patient Name *</label>
                        <input
                          value={patientName}
                          onChange={(e) => setPatientName(e.target.value)}
                          placeholder="Full name"
                          className="w-full rounded-2xl border border-white/10 bg-[#0A1020] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                          disabled={isUploading}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-white">Age *</label>
                        <input
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          placeholder="e.g., 45"
                          type="number"
                          min="0"
                          max="150"
                          className="w-full rounded-2xl border border-white/10 bg-[#0A1020] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                          disabled={isUploading}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-white">Gender *</label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-[#0A1020] px-4 py-3 text-sm text-white outline-none"
                          disabled={isUploading}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-white">Phone Number</label>
                        <input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g., +1-555-0123"
                          className="w-full rounded-2xl border border-white/10 bg-[#0A1020] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                          disabled={isUploading}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-white">Doctor Name</label>
                        <input
                          value={doctor}
                          onChange={(e) => setDoctor(e.target.value)}
                          placeholder="Dr. Elena Marquez"
                          className="w-full rounded-2xl border border-white/10 bg-[#0A1020] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                          disabled={isUploading}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-white">Scan Type *</label>
                        <select
                          value={scanType}
                          onChange={(e) => setScanType(e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-[#0A1020] px-4 py-3 text-sm text-white outline-none"
                          disabled={isUploading}
                        >
                          <option value="MRI">MRI</option>
                          <option value="CT">CT</option>
                          <option value="PET">PET</option>
                          <option value="X-Ray">X-Ray</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-white">Body Part</label>
                        <select
                          value={bodyPart}
                          onChange={(e) => setBodyPart(e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-[#0A1020] px-4 py-3 text-sm text-white outline-none"
                          disabled={isUploading}
                        >
                          <option value="Brain">Brain</option>
                          <option value="Lung">Lung</option>
                          <option value="Breast">Breast</option>
                          <option value="Chest">Chest</option>
                          <option value="Abdomen">Abdomen</option>
                          <option value="Prostate">Prostate</option>
                          <option value="Skin">Skin</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-white">Clinical Notes (Optional)</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes..."
                        rows={3}
                        className="w-full rounded-2xl border border-white/10 bg-[#0A1020] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 resize-none"
                        disabled={isUploading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white">Scan Images</label>
                    <div
                      className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/20 bg-[#0A1020] px-6 py-8"
                      onClick={() => !isUploading && fileInputRef.current?.click()}
                    >
                      <Upload size={32} className="text-slate-500" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-white">
                          {selectedFiles.length > 0 
                            ? `${selectedFiles.length} file(s) selected` 
                            : "Click to select images"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          PNG, JPG, JPEG, DICOM (.dcm) supported
                        </p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".png,.jpg,.jpeg,.dcm"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) {
                            setSelectedFiles(Array.from(e.target.files));
                          }
                        }}
                        disabled={isUploading}
                      />
                    </div>
                  </div>

                  {uploadError && (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                      {uploadError}
                    </div>
                  )}
                </div>

                <div className="sticky bottom-0 border-t border-white/10 bg-[#081122] px-6 py-4">
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ y: -1, scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setUploadOpen(false)}
                      disabled={isUploading}
                      className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ y: -1, scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleUpload}
                      disabled={isUploading || selectedFiles.length === 0}
                      className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white shadow-soft transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploading ? (
                        <span className="flex items-center justify-center gap-2">
                          <LoaderCircle size={16} className="animate-spin" />
                          Processing...
                        </span>
                      ) : (
                        "Upload & Analyze"
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Single Notification Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-6 right-6 z-50 rounded-2xl border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white shadow-2xl shadow-black/40"
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
