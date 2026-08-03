/**
 * NovaDx API Service Layer
 * 
 * Centralized API client for all backend communication.
 * Handles authentication, request/response formatting, and error handling.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Token management
const TOKEN_KEY = 'novadx_auth_token';
const DOCTOR_KEY = 'novadx_doctor_data';

/**
 * Get stored auth token
 */
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

/**
 * Store auth token
 */
export const setToken = (token: string): void => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
};

/**
 * Clear stored auth data
 */
export const clearAuth = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(DOCTOR_KEY);
  } catch {
    // ignore
  }
};

/**
 * Store doctor profile data
 */
export const setDoctorData = (data: any): void => {
  try {
    localStorage.setItem(DOCTOR_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
};

/**
 * Get stored doctor data
 */
export const getDoctorData = (): any | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DOCTOR_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Base fetch wrapper with authentication and error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      clearAuth();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please login again.');
    }

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error(data?.message || `API Error: ${response.status}`);
    }

    return data as T;
  } catch (error: any) {
    if (typeof error?.message === 'string' && error.message.includes('Failed to fetch')) {
      throw new Error('Unable to reach the backend server. Please make sure the API is running on port 5000.');
    }
    throw error;
  }
}

// ============================================================
// AUTH API
// ============================================================

export const authAPI = {
  login: (email: string, password: string, doctorId?: string) =>
    apiFetch<{
      success: boolean;
      token: string;
      doctor: any;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, doctorId }),
    }),

  logout: () =>
    apiFetch<{ success: boolean; message: string }>('/auth/logout', {
      method: 'POST',
    }),

  getProfile: () =>
    apiFetch<{ success: boolean; doctor: any }>('/auth/profile'),

  updateProfile: (data: any) =>
    apiFetch<{ success: boolean; doctor: any }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ============================================================
// PATIENTS API
// ============================================================

export const patientsAPI = {
  getAll: (params?: {
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return apiFetch<{ success: boolean; patients: any[]; pagination: any }>(
      `/patients${qs ? `?${qs}` : ''}`
    );
  },

  getById: (id: string) =>
    apiFetch<{ success: boolean; patient: any; scans: any[] }>(
      `/patients/${id}`
    ),

  create: (data: any) =>
    apiFetch<{ success: boolean; patient: any }>('/patients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    apiFetch<{ success: boolean; patient: any }>(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/patients/${id}`, {
      method: 'DELETE',
    }),
};

// ============================================================
// SCANS API
// ============================================================

export const scansAPI = {
  upload: (formData: FormData) =>
    apiFetch<{
      success: boolean;
      scan: any;
      patient: any;
      analysis: any;
      report: any;
      prediction: any;
      imageResults: any[];
      primaryImageIndex: number;
    }>('/scans/upload', {
      method: 'POST',
      body: formData,
    }),

  getById: (id: string) =>
    apiFetch<{ success: boolean; scan: any }>(`/scans/${id}`),

  getPatientScans: (patientId: string) =>
    apiFetch<{ success: boolean; scans: any[] }>(
      `/scans/patient/${patientId}`
    ),
};

// ============================================================
// ANALYSIS API
// ============================================================

export const analysisAPI = {
  analyze: (data: { scanId?: string; imagePath?: string; patientInfo?: any }) =>
    apiFetch<{
      success: boolean;
      cancerDetected: boolean;
      confidence: number;
      prediction: string;
      probability: number;
      tumor: any;
      measurements: any;
      heatmapUrl?: string;
      inferenceTime: string;
      modelVersion: string;
    }>('/analyze', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getById: (scanId: string) =>
    apiFetch<{
      success: boolean;
      scan: any;
      patient: any;
      analysis: any;
      images: any[];
      heatmap: string;
      tumorDetails: any;
      clinicalNotes: any;
    }>(`/analysis/${scanId}`),
};

// ============================================================
// REPORTS API
// ============================================================

export const reportsAPI = {
  getAll: (params?: {
    search?: string;
    status?: string;
    prediction?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.prediction) query.set('prediction', params.prediction);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return apiFetch<{ success: boolean; reports: any[]; pagination: any }>(
      `/reports${qs ? `?${qs}` : ''}`
    );
  },

  getById: (id: string) =>
    apiFetch<{ success: boolean; report: any }>(`/reports/${id}`),

  create: (data: any) =>
    apiFetch<{ success: boolean; report: any }>('/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  downloadPDF: (id: string) => {
    const token = getToken();
    // Direct download via window.open (for PDF binary)
    window.open(
      `${API_BASE_URL}/reports/${id}/download-pdf?token=${token}`,
      '_blank'
    );
  },

  downloadDICOM: (id: string) => {
    const token = getToken();
    window.open(
      `${API_BASE_URL}/reports/${id}/download-dicom?token=${token}`,
      '_blank'
    );
  },
};

// ============================================================
// HISTORY API
// ============================================================

export const historyAPI = {
  getAll: (params?: {
    search?: string;
    sort?: string;
    resultLabel?: string;
    scanType?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.sort) query.set('sort', params.sort);
    if (params?.resultLabel) query.set('resultLabel', params.resultLabel);
    if (params?.scanType) query.set('scanType', params.scanType);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return apiFetch<{ success: boolean; history: any[]; pagination: any }>(
      `/history${qs ? `?${qs}` : ''}`
    );
  },
};

// ============================================================
// NOTIFICATIONS API
// ============================================================

export const notificationsAPI = {
  getAll: (params?: { unreadOnly?: boolean; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.unreadOnly) query.set('unreadOnly', 'true');
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return apiFetch<{
      success: boolean;
      notifications: any[];
      unreadCount: number;
      pagination: any;
    }>(`/notifications${qs ? `?${qs}` : ''}`);
  },

  markAsRead: (id: string) =>
    apiFetch<{ success: boolean; notification: any }>(
      `/notifications/${id}/read`,
      { method: 'PUT' }
    ),

  markAllAsRead: () =>
    apiFetch<{ success: boolean; message: string }>(
      '/notifications/read-all',
      { method: 'PUT' }
    ),
};

// ============================================================
// SETTINGS API
// ============================================================

export const settingsAPI = {
  get: () =>
    apiFetch<{ success: boolean; settings: any }>('/settings'),

  update: (data: any) =>
    apiFetch<{ success: boolean; settings: any }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ============================================================
// DASHBOARD / AGGREGATE DATA
// ============================================================

export const dashboardAPI = {
  getStats: async () => {
    try {
      const [patientsRes, reportsRes, historyRes, notificationsRes] =
        await Promise.all([
          patientsAPI.getAll({ limit: 1 }),
          reportsAPI.getAll({ limit: 1 }),
          historyAPI.getAll({ limit: 5, sort: 'newest' }),
          notificationsAPI.getAll({ unreadOnly: true }),
        ]);

      return {
        patientCount: patientsRes.pagination.total,
        reportCount: reportsRes.pagination.total,
        recentAnalyses: historyRes.history,
        unreadNotifications: notificationsRes.unreadCount,
        notifications: notificationsRes.notifications,
      };
    } catch (error) {
      console.error('Dashboard stats error:', error);
      return {
        patientCount: 0,
        reportCount: 0,
        recentAnalyses: [],
        unreadNotifications: 0,
        notifications: [],
      };
    }
  },
};

