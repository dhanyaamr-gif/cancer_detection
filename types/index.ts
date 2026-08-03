export type NavItem = {
  title: string;
  href: string;
  icon: string;
};

export type Doctor = {
  id: string;
  name: string;
  email: string;
  specialization: string;
  hospital: string;
  department: string;
  experience: string;
  qualifications: string[];
  license: string;
  phone: string;
  avatar: string;
  patientsDiagnosed: number;
  reportsGenerated: number;
  averageConfidence: number;
  aiUsage: string;
};

export type Patient = {
  id: string;
  name: string;
  age: number;
  gender: 'Female' | 'Male' | 'Other';
  cancerType: string;
  doctor: string;
  appointment: string;
  status: 'Normal' | 'Critical' | 'Under Review';
  scanType: string;
  confidence: number;
};

export type Report = {
  id: string;
  patient: string;
  doctor: string;
  prediction: string;
  confidence: number;
  date: string;
  status: 'Completed' | 'Pending' | 'Reviewed';
};

export type Prediction = {
  id: string;
  patientId: string;
  title: string;
  confidence: number;
  cancerType: string;
  scanType: string;
  date: string;
  doctor: string;
  heatmap: string;
};
