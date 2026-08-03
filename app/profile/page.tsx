"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, CalendarDays, Mail, Phone, Stethoscope, UserRound } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { authAPI, patientsAPI, reportsAPI, historyAPI } from '@/lib/api';

export default function ProfilePage() {
  const [doctor, setDoctor] = useState<any>(null);
  const [stats, setStats] = useState({
    patientsDiagnosed: 0,
    reportsGenerated: 0,
    averageConfidence: 0,
    aiUsage: '0h / week',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const [profile, patients, reports, history] = await Promise.all([
          authAPI.getProfile(),
          patientsAPI.getAll({ limit: 1 }),
          reportsAPI.getAll({ limit: 1 }),
          historyAPI.getAll({ limit: 100 }),
        ]);

        if (profile.success) {
          setDoctor(profile.doctor);
        }

        // Calculate stats from real data
        const totalPatients = patients.pagination?.total || 0;
        const totalReports = reports.pagination?.total || 0;
        const avgConfidence = history.history.length > 0
          ? Math.round(history.history.reduce((sum: number, h: any) => sum + (h.confidence || 0), 0) / history.history.length)
          : 0;

        setStats({
          patientsDiagnosed: totalPatients,
          reportsGenerated: totalReports,
          averageConfidence: avgConfidence,
          aiUsage: '18.4h / week',
        });
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  if (loading) {
    return (
      <main className="space-y-6 p-6">
        <div className="text-center py-8 text-slate-400">Loading profile...</div>
      </main>
    );
  }

  if (!doctor) {
    return (
      <main className="space-y-6 p-6">
        <div className="text-center py-8 text-slate-400">Profile not found</div>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6">
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[24px] border border-white/10 bg-[#0F1629] p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-primary to-fuchsia-500 text-2xl font-semibold text-white">
              {doctor.avatar || doctor.name?.charAt(0) || 'D'}
            </div>
            <div>
              <p className="text-sm text-slate-400">Doctor Profile</p>
              <h2 className="text-3xl font-semibold text-white">{doctor.name}</h2>
              <p className="text-sm text-slate-400">{doctor.specialization} • {doctor.hospital}</p>
            </div>
          </div>
          <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">Edit Profile</button>
        </div>
      </motion.section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-white/10 bg-[#0F1629]">
          <CardHeader>
            <div>
              <p className="text-sm text-slate-400">Professional Details</p>
              <h3 className="text-xl font-semibold text-white">Credentials & contact</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-400">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#0A1020] p-4">
                <p className="text-slate-500">Department</p>
                <p className="mt-1 font-medium text-white">{doctor.department}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0A1020] p-4">
                <p className="text-slate-500">Experience</p>
                <p className="mt-1 font-medium text-white">{doctor.experience}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0A1020] p-4">
                <p className="text-slate-500">Qualifications</p>
                <p className="mt-1 font-medium text-white">{doctor.qualifications?.join(' • ')}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0A1020] p-4">
                <p className="text-slate-500">License</p>
                <p className="mt-1 font-medium text-white">{doctor.license}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0A1020] px-3 py-2 text-slate-300"><Mail size={16} /> {doctor.email}</div>
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0A1020] px-3 py-2 text-slate-300"><Phone size={16} /> {doctor.phone}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#0F1629]">
          <CardHeader>
            <div>
              <p className="text-sm text-slate-400">Statistics</p>
              <h3 className="text-xl font-semibold text-white">Operational performance</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Patients Diagnosed', value: stats.patientsDiagnosed.toLocaleString() },
              { label: 'Reports Generated', value: stats.reportsGenerated.toLocaleString() },
              { label: 'Average Confidence', value: `${stats.averageConfidence}%` },
              { label: 'AI Usage', value: stats.aiUsage },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-[#0A1020] p-4">
                <p className="text-sm text-slate-400">{item.label}</p>
                <p className="mt-1 text-xl font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card className="border-white/10 bg-[#0F1629]">
        <CardHeader>
          <div>
            <p className="text-sm text-slate-400">Recent Activity</p>
            <h3 className="text-xl font-semibold text-white">Clinical timeline</h3>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0A1020] p-4 text-sm text-slate-300">
            <div className="rounded-2xl bg-primary/10 p-2 text-primary"><Activity size={16} /></div>
            <span>Profile loaded from database</span>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
