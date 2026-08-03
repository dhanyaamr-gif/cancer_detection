import { Doctor, Patient, Prediction, Report } from '@/types';

export const doctor: Doctor = {
  id: 'DR-1042',
  name: 'Dr. Elena Marquez',
  email: 'elena.marquez@novadx.io',
  specialization: 'Radiologist & Oncologist',
  hospital: 'Northwell Medical Center',
  department: 'Neuro Oncology',
  experience: '14 years',
  qualifications: ['MD, Radiology', 'PhD, Biomedical Imaging', 'Fellowship, Neuro Oncology'],
  license: 'MD-884221',
  phone: '+1 (212) 555-0188',
  avatar: 'EM',
  patientsDiagnosed: 1280,
  reportsGenerated: 842,
  averageConfidence: 94.2,
  aiUsage: '18.4h / week',
};

export const patients: Patient[] = [
  {
    id: 'PT-1001',
    name: 'Ava Thompson',
    age: 47,
    gender: 'Female',
    cancerType: 'Glioblastoma',
    doctor: 'Dr. Marquez',
    appointment: '2026-07-24',
    status: 'Critical',
    scanType: 'MRI',
    confidence: 96,
  },
  {
    id: 'PT-1002',
    name: 'Marcus Bell',
    age: 59,
    gender: 'Male',
    cancerType: 'Lung Nodule',
    doctor: 'Dr. Marquez',
    appointment: '2026-07-25',
    status: 'Under Review',
    scanType: 'CT',
    confidence: 88,
  },
  {
    id: 'PT-1003',
    name: 'Serena Ortiz',
    age: 34,
    gender: 'Female',
    cancerType: 'Breast Lesion',
    doctor: 'Dr. Marquez',
    appointment: '2026-07-26',
    status: 'Normal',
    scanType: 'MRI',
    confidence: 91,
  },
];

export const predictions: Prediction[] = [
  {
    id: 'AN-201',
    patientId: 'PT-1001',
    title: 'High-risk tumor region detected',
    confidence: 96,
    cancerType: 'Glioblastoma',
    scanType: 'MRI',
    date: '2026-07-21',
    doctor: 'Dr. Marquez',
    heatmap: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=700&q=80',
  },
  {
    id: 'AN-202',
    patientId: 'PT-1002',
    title: 'Suspicious pulmonary density',
    confidence: 88,
    cancerType: 'Lung Nodule',
    scanType: 'CT',
    date: '2026-07-19',
    doctor: 'Dr. Marquez',
    heatmap: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=700&q=80',
  },
  {
    id: 'AN-203',
    patientId: 'PT-1003',
    title: 'Benign tissue pattern',
    confidence: 91,
    cancerType: 'Breast Lesion',
    scanType: 'MRI',
    date: '2026-07-18',
    doctor: 'Dr. Marquez',
    heatmap: 'https://images.unsplash.com/photo-1628348072881-53b5d0d6e3fe?auto=format&fit=crop&w=700&q=80',
  },
];

export const reports: Report[] = [
  {
    id: 'RP-001',
    patient: 'Ava Thompson',
    doctor: 'Dr. Marquez',
    prediction: 'Positive',
    confidence: 96,
    date: '2026-07-21',
    status: 'Completed',
  },
  {
    id: 'RP-002',
    patient: 'Marcus Bell',
    doctor: 'Dr. Marquez',
    prediction: 'Under Review',
    confidence: 88,
    date: '2026-07-19',
    status: 'Pending',
  },
  {
    id: 'RP-003',
    patient: 'Serena Ortiz',
    doctor: 'Dr. Marquez',
    prediction: 'Negative',
    confidence: 91,
    date: '2026-07-18',
    status: 'Reviewed',
  },
];

export const hospitals = ['Northwell Medical Center', 'Memorial Sloan Kettering', 'Cedars Sinai'];
export const cancerTypes = ['Glioblastoma', 'Lung Nodule', 'Breast Lesion', 'Prostate Carcinoma'];
