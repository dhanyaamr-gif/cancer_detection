'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/sidebar/sidebar';
import { Navbar } from '@/components/navbar/navbar';
import { SidebarProvider } from './sidebar-context';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col transition-all duration-300">
          <Navbar />
          <div className="flex-1">{children}</div>
        </div>
      </div>
    </SidebarProvider>
  );
}
