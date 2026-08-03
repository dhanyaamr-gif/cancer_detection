"use client";

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCircle2, ChevronRight, KeyRound, PencilLine, Settings2, ShieldCheck, Sparkles, UserRound, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ProfileState = {
  doctorName: string;
  email: string;
  hospital: string;
  specialization: string;
};

type SettingsState = {
  profile: ProfileState;
  emailNotifications: boolean;
  criticalAlerts: boolean;
  reportReadyNotifications: boolean;
autoSaveReports: boolean;
  showExplainableAi: boolean;
};

type ProfileFieldKey = keyof ProfileState;

type ProfileFormState = ProfileState;

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type ToastTone = 'success' | 'error' | 'info';

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

const STORAGE_KEY = 'novadx-settings-state-v1';

const defaultSettings: SettingsState = {
  profile: {
    doctorName: 'Dr. Elena Marquez',
    email: 'elena.marquez@novadx.health',
    hospital: 'NovaDx Medical Center',
    specialization: 'Radiology Oncology',
  },
  emailNotifications: true,
  criticalAlerts: true,
  reportReadyNotifications: true,
autoSaveReports: true,
  showExplainableAi: true,
};

function loadSavedSettings(): SettingsState {
  if (typeof window === 'undefined') {
    return defaultSettings;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultSettings;
    }

    const parsed = JSON.parse(raw) as Partial<SettingsState>;
    return {
      profile: {
        ...defaultSettings.profile,
        ...(parsed.profile ?? {}),
      },
      emailNotifications: parsed.emailNotifications ?? defaultSettings.emailNotifications,
      criticalAlerts: parsed.criticalAlerts ?? defaultSettings.criticalAlerts,
      reportReadyNotifications: parsed.reportReadyNotifications ?? defaultSettings.reportReadyNotifications,
autoSaveReports: parsed.autoSaveReports ?? defaultSettings.autoSaveReports,
      showExplainableAi: parsed.showExplainableAi ?? defaultSettings.showExplainableAi,
    };
  } catch {
    return defaultSettings;
  }
}

function ToggleItem({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={cn(
        'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition duration-300 hover:-translate-y-0.5 hover:shadow-soft',
        active ? 'border-fuchsia-400/30 bg-fuchsia-500/10' : 'border-white/10 bg-white/5 hover:bg-white/[0.08]'
      )}
    >
      <span className="text-sm font-medium text-slate-100">{label}</span>
      <span className={cn('relative h-7 w-12 rounded-full border transition-all duration-300', active ? 'border-fuchsia-400/40 bg-fuchsia-500/25' : 'border-white/10 bg-slate-800/80')}>
        <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300', active ? 'translate-x-6 bg-fuchsia-200' : 'translate-x-1')} />
      </span>
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [savedSettings, setSavedSettings] = useState<SettingsState>(defaultSettings);
  const [draftSettings, setDraftSettings] = useState<SettingsState>(defaultSettings);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState<ProfileFormState>(defaultSettings.profile);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const initial = loadSavedSettings();
    setSavedSettings(initial);
    setDraftSettings(initial);
    setProfileDraft(initial.profile);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.dataset.theme = 'dark';
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedSettings));
    } catch {
      // Ignore storage failures and keep the page functional.
    }
  }, [savedSettings, hydrated]);

  const hasUnsavedChanges = useMemo(() => JSON.stringify(draftSettings) !== JSON.stringify(savedSettings), [draftSettings, savedSettings]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = 'You have unsaved changes. Do you want to save before leaving?';
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (!hasUnsavedChanges) return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;

      const nextHref = anchor.getAttribute('href');
      if (!nextHref) return;

      const shouldLeave = window.confirm('You have unsaved changes. Do you want to save before leaving?');
      if (!shouldLeave) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      window.location.href = nextHref;
    };

    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', handleDocumentClick, true);

    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [hasUnsavedChanges, router]);

  const notify = (message: string, tone: ToastTone = 'success') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 2600);
  };

  const updateProfileField = () => {
    setProfileDraft(draftSettings.profile);
    setProfileModalOpen(true);
  };

  const openProfileModal = () => {
    setProfileDraft(draftSettings.profile);
    setProfileModalOpen(true);
  };

  const updateToggle = (key: 'emailNotifications' | 'criticalAlerts' | 'reportReadyNotifications' | 'autoSaveReports' | 'showExplainableAi') => {
    const next = { ...draftSettings, [key]: !draftSettings[key] };
    setDraftSettings(next);

    if (key === 'emailNotifications') {
      notify(next.emailNotifications ? 'Email notifications enabled.' : 'Email notifications disabled.');
    } else if (key === 'criticalAlerts') {
      notify(next.criticalAlerts ? 'Critical alerts enabled.' : 'Critical alerts disabled.');
    } else if (key === 'reportReadyNotifications') {
      notify(next.reportReadyNotifications ? 'Report ready notifications enabled.' : 'Report ready notifications disabled.');
    } else if (key === 'autoSaveReports') {
      notify(next.autoSaveReports ? 'Auto save reports enabled.' : 'Auto save reports disabled.');
    } else if (key === 'showExplainableAi') {
      notify(next.showExplainableAi ? 'Explainable AI enabled.' : 'Explainable AI hidden.');
    }
  };

  const saveProfile = () => {
    setDraftSettings((current) => ({ ...current, profile: profileDraft }));
    setProfileModalOpen(false);
    notify('Profile updated successfully.');
  };

  const saveChanges = () => {
    if (!hasUnsavedChanges || saving) return;

    setSaving(true);
    window.setTimeout(() => {
      setSavedSettings(draftSettings);
      setSaving(false);
      notify('Settings saved successfully.');
    }, 1000);
  };

  const cancelChanges = () => {
    setDraftSettings(savedSettings);
    setProfileDraft(savedSettings.profile);
    notify('Changes discarded.');
  };

  const updatePassword = () => {
    if (!passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword) {
      notify('New password and confirm password must match.', 'error');
      return;
    }

    setPasswordModalOpen(false);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    notify('Password updated successfully.');
  };

  const confirmLogout = () => {
    setLogoutDialogOpen(false);
    router.push('/login');
  };

const pageTheme = 'bg-[#070B16] text-slate-100';

  const surface = 'bg-[#0F1629] border-white/10';
  const innerSurface = 'bg-[#0A1020] border-white/10';
  const titleText = 'text-white';
  const mutedText = 'text-slate-400';
  const cardHover = 'transition duration-300 hover:-translate-y-0.5 hover:border-fuchsia-400/30 hover:shadow-[0_24px_60px_-24px_rgba(168,85,247,0.28)]';
  const pillButton = 'border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/[0.08]';
  const actionButton = 'rounded-2xl px-5 py-3 text-sm font-semibold transition duration-300 hover:brightness-110';

  return (
    <main className={cn('space-y-8 p-6 transition-colors duration-500', pageTheme)}>
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={cn('text-sm', mutedText)}>Clinical Operations</p>
            <h2 className={cn('text-2xl font-semibold tracking-tight', titleText)}>Settings</h2>
          </div>
          
        </div>

        <div className="grid gap-6 xl:grid-cols-2 xl:items-stretch">
          <Card className={cn('h-full border transition-colors duration-500', surface, cardHover)}>
            <CardHeader className="flex items-center gap-3 pb-4">
              <div className={cn('rounded-2xl p-2.5', 'bg-primary/10 text-primary')}>
                <UserRound size={18} />
              </div>
              <div>
                <h3 className={cn('text-lg font-semibold', titleText)}>Profile</h3>
              </div>
            </CardHeader>
            <CardContent className="flex h-full flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { key: 'doctorName', label: 'Doctor Name', value: draftSettings.profile.doctorName },
                  { key: 'email', label: 'Email', value: draftSettings.profile.email },
                  { key: 'hospital', label: 'Hospital', value: draftSettings.profile.hospital },
                  { key: 'specialization', label: 'Specialization', value: draftSettings.profile.specialization },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={updateProfileField}
                    className={cn('group rounded-2xl border px-4 py-3 text-left transition duration-300 hover:-translate-y-0.5 hover:border-fuchsia-400/30', innerSurface)}
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className={cn('text-sm font-medium', 'text-white')}>{item.value}</p>
                      <ChevronRight size={14} className={cn('transition group-hover:translate-x-0.5', mutedText)} />
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-auto flex justify-end">
                <button type="button" onClick={openProfileModal} className={cn('inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition duration-300 hover:-translate-y-0.5', pillButton)}>
                  <PencilLine size={16} />
                  Edit Profile
                </button>
              </div>
            </CardContent>
          </Card>

          <Card className={cn('h-full border transition-colors duration-500', surface, cardHover)}>
            <CardHeader className="flex items-center gap-3 pb-4">
              <div className={cn('rounded-2xl p-2.5', 'bg-primary/10 text-primary')}>
                <Bell size={18} />
              </div>
              <div>
                <h3 className={cn('text-lg font-semibold', titleText)}>Notifications</h3>
              </div>
            </CardHeader>
            <CardContent className="flex h-full flex-col gap-4">
              <ToggleItem label="Email Notifications" active={draftSettings.emailNotifications} onToggle={() => updateToggle('emailNotifications')} />
              <ToggleItem label="Critical Alert Notifications" active={draftSettings.criticalAlerts} onToggle={() => updateToggle('criticalAlerts')} />
              <ToggleItem label="Report Ready Notifications" active={draftSettings.reportReadyNotifications} onToggle={() => updateToggle('reportReadyNotifications')} />
            </CardContent>
          </Card>

          <Card className={cn('h-full border transition-colors duration-500', surface, cardHover)}>
            <CardHeader className="flex items-center gap-3 pb-4">
              <div className={cn('rounded-2xl p-2.5', 'bg-primary/10 text-primary')}>
                <Settings2 size={18} />
              </div>
              <div>
                <h3 className={cn('text-lg font-semibold', titleText)}>Application Settings</h3>
              </div>
            </CardHeader>
            <CardContent className="flex h-full flex-col gap-4">
<ToggleItem label="Auto Save Reports" active={draftSettings.autoSaveReports} onToggle={() => updateToggle('autoSaveReports')} />
              <ToggleItem label="Show Explainable AI" active={draftSettings.showExplainableAi} onToggle={() => updateToggle('showExplainableAi')} />
            </CardContent>
          </Card>

          <Card className={cn('h-full border transition-colors duration-500', surface, cardHover)}>
            <CardHeader className="flex items-center gap-3 pb-4">
              <div className={cn('rounded-2xl p-2.5', 'bg-primary/10 text-primary')}>
                <KeyRound size={18} />
              </div>
              <div>
                <h3 className={cn('text-lg font-semibold', titleText)}>Account</h3>
              </div>
            </CardHeader>
            <CardContent className="flex h-full flex-col gap-4">
              <button type="button" onClick={() => setPasswordModalOpen(true)} className={cn('flex items-center justify-between rounded-2xl border px-4 py-3 transition duration-300 hover:-translate-y-0.5', innerSurface, 'hover:border-fuchsia-400/30')}>
                <span className={cn('text-sm font-medium', 'text-white')}>Change Password</span>
                <Sparkles size={16} className="text-fuchsia-300" />
              </button>
              <button type="button" onClick={() => setLogoutDialogOpen(true)} className={cn('flex items-center justify-between rounded-2xl border px-4 py-3 transition duration-300 hover:-translate-y-0.5', innerSurface, 'hover:border-primary/30')}>
                <span className={cn('text-sm font-medium', 'text-white')}>Logout</span>
                <ShieldCheck size={16} className="text-primary" />
              </button>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={cancelChanges} className={cn('rounded-2xl border px-5 py-3 text-sm font-medium transition duration-300 hover:-translate-y-0.5', pillButton)}>
            Cancel
          </button>
          <button type="button" onClick={saveChanges} disabled={!hasUnsavedChanges || saving} className={cn(actionButton, 'bg-gradient-to-r from-primary to-fuchsia-500 text-white shadow-soft disabled:cursor-not-allowed disabled:opacity-50')}>
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </motion.section>

      <AnimatePresence>
        {profileModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ duration: 0.22 }}
              className={cn('w-full max-w-2xl rounded-[28px] border shadow-2xl shadow-black/40', surface)}
            >
              <div className={cn('flex items-start justify-between border-b px-6 py-5', 'border-white/10')}>
                <div>
                  <p className={cn('text-sm', mutedText)}>Edit Profile</p>
                  <h3 className={cn('text-xl font-semibold', titleText)}>Doctor Profile</h3>
                </div>
                <button type="button" onClick={() => setProfileModalOpen(false)} className={cn('rounded-2xl border p-2 transition duration-300 hover:-translate-y-0.5', pillButton)}>
                  <X size={16} />
                </button>
              </div>

              <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
                {([
                  ['doctorName', 'Doctor Name'],
                  ['email', 'Email'],
                  ['hospital', 'Hospital'],
                  ['specialization', 'Specialization'],
                ] as Array<[ProfileFieldKey, string]>).map(([field, label]) => (
                  <label key={field} className="space-y-2">
                    <span className={cn('text-xs uppercase tracking-[0.2em]', mutedText)}>{label}</span>
                    <input
                      value={profileDraft[field]}
                      onChange={(event) => setProfileDraft((current) => ({ ...current, [field]: event.target.value }))}
                      className={cn('w-full rounded-2xl border px-4 py-3 text-sm outline-none transition duration-300 focus:border-fuchsia-400/50', innerSurface, 'text-white placeholder:text-slate-500')}
                    />
                  </label>
                ))}
              </div>

              <div className={cn('flex justify-end gap-3 border-t px-6 py-5', 'border-white/10')}>
                <button type="button" onClick={() => setProfileModalOpen(false)} className={cn('rounded-2xl border px-5 py-3 text-sm font-medium transition duration-300 hover:-translate-y-0.5', pillButton)}>
                  Cancel
                </button>
                <button type="button" onClick={saveProfile} className="rounded-2xl bg-gradient-to-r from-primary to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:brightness-110">
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {passwordModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ duration: 0.22 }}
              className={cn('w-full max-w-xl rounded-[28px] border shadow-2xl shadow-black/40', surface)}
            >
              <div className={cn('flex items-start justify-between border-b px-6 py-5', 'border-white/10')}>
                <div>
                  <p className={cn('text-sm', mutedText)}>Account Security</p>
                  <h3 className={cn('text-xl font-semibold', titleText)}>Change Password</h3>
                </div>
                <button type="button" onClick={() => setPasswordModalOpen(false)} className={cn('rounded-2xl border p-2 transition duration-300 hover:-translate-y-0.5', pillButton)}>
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4 px-6 py-5">
                {([
                  ['currentPassword', 'Current Password'],
                  ['newPassword', 'New Password'],
                  ['confirmPassword', 'Confirm Password'],
                ] as Array<[keyof PasswordFormState, string]>).map(([field, label]) => (
                  <label key={field} className="space-y-2">
                    <span className={cn('text-xs uppercase tracking-[0.2em]', mutedText)}>{label}</span>
                    <input
                      type="password"
                      value={passwordForm[field]}
                      onChange={(event) => setPasswordForm((current) => ({ ...current, [field]: event.target.value }))}
                      className={cn('w-full rounded-2xl border px-4 py-3 text-sm outline-none transition duration-300 focus:border-fuchsia-400/50', innerSurface, 'text-white placeholder:text-slate-500')}
                    />
                  </label>
                ))}
              </div>

              <div className={cn('flex justify-end gap-3 border-t px-6 py-5', 'border-white/10')}>
                <button type="button" onClick={() => setPasswordModalOpen(false)} className={cn('rounded-2xl border px-5 py-3 text-sm font-medium transition duration-300 hover:-translate-y-0.5', pillButton)}>
                  Cancel
                </button>
                <button type="button" onClick={updatePassword} className="rounded-2xl bg-gradient-to-r from-primary to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:brightness-110">
                  Update Password
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {logoutDialogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.22 }}
              className={cn('w-full max-w-md rounded-[28px] border shadow-2xl shadow-black/40', surface)}
            >
              <div className={cn('border-b px-6 py-5', 'border-white/10')}>
                <h3 className={cn('text-xl font-semibold', titleText)}>Logout</h3>
                <p className={cn('mt-2 text-sm', mutedText)}>Are you sure you want to log out of NovaDx?</p>
              </div>
              <div className="flex justify-end gap-3 px-6 py-5">
                <button type="button" onClick={() => setLogoutDialogOpen(false)} className={cn('rounded-2xl border px-5 py-3 text-sm font-medium transition duration-300 hover:-translate-y-0.5', pillButton)}>
                  Cancel
                </button>
                <button type="button" onClick={confirmLogout} className="rounded-2xl bg-gradient-to-r from-primary to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:brightness-110">
                  Logout
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed right-5 top-5 z-[60] space-y-3">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 30, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur-xl',
                toast.tone === 'success' && 'border-emerald-400/30 bg-emerald-500/15 text-emerald-50',
                toast.tone === 'error' && 'border-red-400/30 bg-red-500/15 text-red-50',
                toast.tone === 'info' && 'border-white/10 bg-white/10 text-white'
              )}
            >
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <p className="text-sm font-medium">{toast.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </main>
  );
}

