'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { Activity, FileText, LayoutDashboard, Settings, UserRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/layout/sidebar-context';

const navItems: Array<{ title: string; href: Route; icon: typeof LayoutDashboard }> = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Patients', href: '/patients', icon: UserRound },
  { title: 'Analysis History', href: '/analysis-history', icon: Activity },
  { title: 'Reports', href: '/reports', icon: FileText },
  { title: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, drawerOpen, setDrawerOpen } = useSidebar();

  const desktopWidth = collapsed ? 80 : 260;

  return (
    <>
      {/* Desktop / large screens */}
      <aside
        style={{ width: desktopWidth }}
        className={cn(
          collapsed ? 'hidden' : 'hidden lg:flex',
          'h-screen flex-col border-r bg-[#0A1020] p-6 transition-all duration-300'
        )}
      >
        <div className="mb-8 flex items-center gap-3">
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-bold', collapsed ? 'mx-auto' : 'bg-gradient-to-br from-primary to-fuchsia-500')}>
            N
          </div>
          {!collapsed && (
            <div>
              <p className="text-lg font-semibold">NovaDx</p>
              <p className="text-sm text-slate-400">AI-Powered Precision Diagnosis</p>
            </div>
          )}
        </div>

        <nav className="flex-1">
          <div className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href as string);
              return (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    title={collapsed ? item.title : undefined}
                    whileHover={{ x: 4, scale: 1.01 }}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors',
                      isActive ? 'bg-primary/20 text-white shadow-soft' : 'text-slate-400 hover:bg-white/5 hover:text-white',
                      collapsed ? 'justify-center' : ''
                    )}
                  >
                    <Icon size={18} />
                    {!collapsed && item.title}
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>

      {/* Mobile / drawer */}
      <div className={cn('lg:hidden')}> 
        <div
          className={cn('fixed inset-0 z-30 transition-opacity', drawerOpen ? 'visible opacity-60' : 'pointer-events-none opacity-0')}
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setDrawerOpen(false)}
        />

        <aside
          className={cn(
            'fixed left-0 top-0 z-40 h-full w-72 transform bg-[#0A1020] p-6 transition-transform duration-300',
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 text-xl font-bold">N</div>
            <div>
              <p className="text-lg font-semibold">NovaDx</p>
              <p className="text-sm text-slate-400">AI-Powered Precision Diagnosis</p>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href as string);
              return (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    whileHover={{ x: 4, scale: 1.01 }}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors',
                      isActive ? 'bg-primary/20 text-white shadow-soft' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <Icon size={18} />
                    {item.title}
                  </motion.div>
                </Link>
              );
            })}
</nav>
        </aside>
      </div>
    </>
  );
}
