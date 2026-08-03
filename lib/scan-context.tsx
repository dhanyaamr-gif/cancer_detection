"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { connectSocket, onSocketEvent, SOCKET_EVENTS } from './socket';

export type ScanData = {
  scan: any;
  patient: any;
  analysis: any;
  report: any;
  prediction: any;
  imageResults: any[];
  primaryImageIndex: number;
};

type ScanContextType = {
  currentScan: ScanData | null;
  setCurrentScan: (data: ScanData | null) => void;
  isUploading: boolean;
  setIsUploading: (v: boolean) => void;
  uploadProgress: string;
  setUploadProgress: (v: string) => void;
  patients: any[];
  setPatients: (v: any[]) => void;
  historyEntries: any[];
  setHistoryEntries: (v: any[]) => void;
  reports: any[];
  setReports: (v: any[]) => void;
};

const ScanContext = createContext<ScanContextType | undefined>(undefined);

export function ScanProvider({ children }: { children: React.ReactNode }) {
  const [currentScan, setCurrentScan] = useState<ScanData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [historyEntries, setHistoryEntries] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    connectSocket();

    const unsubAnalysis = onSocketEvent(SOCKET_EVENTS.ANALYSIS_COMPLETED, (data: ScanData) => {
      setCurrentScan(data);
      setIsUploading(false);
      setUploadProgress('Completed Successfully');
    });

    const unsubPatients = onSocketEvent(SOCKET_EVENTS.PATIENTS_UPDATE, (data: any) => {
      if (data?.patient) {
        setPatients(prev => {
          const exists = prev.findIndex(p => p._id === data.patient._id || p.patientId === data.patient.patientId);
          if (exists >= 0) {
            const updated = [...prev];
            updated[exists] = { ...updated[exists], ...data.patient };
            return updated;
          }
          return [data.patient, ...prev];
        });
      }
    });

    const unsubHistory = onSocketEvent(SOCKET_EVENTS.HISTORY_UPDATE, (entry: any) => {
      if (entry) {
        setHistoryEntries(prev => [entry, ...prev]);
      }
    });

    const unsubReports = onSocketEvent(SOCKET_EVENTS.REPORTS_UPDATE, (report: any) => {
      if (report) {
        setReports(prev => [report, ...prev]);
      }
    });

    const unsubDashboard = onSocketEvent(SOCKET_EVENTS.DASHBOARD_UPDATE, (data: any) => {
      // Dashboard stats update if needed
    });

    return () => {
      unsubAnalysis();
      unsubPatients();
      unsubHistory();
      unsubReports();
      unsubDashboard();
    };
  }, []);

  return (
    <ScanContext.Provider
      value={{
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
        setReports,
      }}
    >
      {children}
    </ScanContext.Provider>
  );
}

export function useScan() {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error('useScan must be used within ScanProvider');
  return ctx;
}
