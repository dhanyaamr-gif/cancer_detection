"use client";

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { authAPI, setToken, setDoctorData } from '@/lib/api';

export default function LoginClient() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    doctorId: 'DR-1042',
    email: 'elena.marquez@novadx.io',
    password: 'password123',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(
        formData.email,
        formData.password,
        formData.doctorId
      );

      setToken(response.token);
      setDoctorData(response.doctor);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-md rounded-[24px] border border-white/10 bg-[#0F1629] p-8 shadow-soft">
            <div className="mb-8">
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-primary">Secure Access</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">Welcome back, Doctor</h2>
              <p className="mt-2 text-sm text-slate-400">Access your imaging workspace with enterprise-grade controls.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="rounded-2xl border border-red-400/30 bg-red-500/15 px-4 py-3 text-sm text-red-50">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm text-slate-400">Doctor ID</label>
                <input
                  value={formData.doctorId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, doctorId: e.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-primary"
                  placeholder="DR-1042"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-400">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-primary"
                  placeholder="doctor@hospital.org"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-400">Password</label>
                <div className="flex items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    className="flex-1 bg-transparent text-white outline-none"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="ml-2 text-slate-400">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-slate-400">
                  <input type="checkbox" className="rounded border-white/10 bg-transparent" />
                  Remember me
                </label>
                <a href="#" className="text-primary">Forgot password?</a>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-fuchsia-500 px-4 py-3 font-semibold text-white disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Sparkles size={18} />
                )}
                {loading ? 'Signing In...' : 'Sign In'}
              </motion.button>
            </form>

            <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-center text-sm text-slate-300">
              Continue with Hospital SSO
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-xs text-slate-500">
              Demo: elena.marquez@novadx.io / password123
            </div>
      </motion.div>
    </main>
  );
}
